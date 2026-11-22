// Sunset Keys — Solano Bay. Boot and the one loop: input is read every frame,
// the world advances in fixed 1/60 s steps, and the stage paints what is
// there. Screens: title, play, paused, busted, wasted — all through the one
// #overlay in index.html. ?seed=N fixes the city; ?shot=chase|street|mission|
// dusk stages a screenshot scene instead of the title screen; ?selftest=1
// runs the mission-logic checks and reports window.__selftest.
//
// All names, places and dialogue here are original. No Rockstar names, art,
// music or map data: Sunset Keys is its own city, its own crew, its own story.
import { ONFOOT, PLACES, RADIO, SAVE_KEY, WEAPONS, WEAPON_UNLOCK, WANTED } from './config.js';
import { createRandom } from './random.js';
import { buildCity, collideCircle } from './world.js';
import { createCar, driveCar, syncCarMesh, carSpeedKmh } from './vehicles.js';
import { createTraffic, stepTraffic } from './traffic.js';
import { createPolice, addHeat, stepPolice } from './police.js';
import { createMissions, currentStep, stepMissions, MISSION_DEFS } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_SHOOT, ACTION_CREW1, ACTION_CREW2, ACTION_CREW3, ACTION_CYCLE_WEAPON, ACTION_RADIO, ACTION_GARAGE } from './input.js';
import { createStage, syncPlayerMesh } from './render.js';
import { stageShot } from './shots.js';
import { dialogueFor, DIALOGUE } from './dialogue.js';
import { selfTest } from './simulate.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261120;

const random = createRandom(seed);
const stage = createStage(document.getElementById('stage'));
const city = buildCity(stage.scene, random);
const audio = createAudio();
const input = createInput();
const minimap = createMinimap(document.getElementById('minimap'));
const hud = createHud(minimap);

const PARKED_SPOTS = [
  { x: 88, z: -40 }, { x: -40, z: 40 }, { x: 216, z: 216 }, { x: 152, z: -152 },
  { x: -152, z: 88 }, { x: 216, z: 88 }, { x: -88, z: -88 }, { x: 88, z: 284 },
];
const CASH_SPOTS = [
  { x: -64, z: -32 }, { x: 64, z: 32 }, { x: -160, z: -160 }, { x: 160, z: 160 },
  { x: 0, z: 224 }, { x: -224, z: 0 },
];

function freshState() {
  return {
    random,
    time: 0, clockMinutes: 17 * 60 + 12, day: 1,
    money: 1250, respect: 120, health: 100, armor: 50,
    weapon: 0, ammo: WEAPONS.map((w) => (w.ammo === Infinity ? Infinity : w.ammo)),
    crewCooldown: [0, 0, 0],
    player: { x: -96, z: -88, heading: Math.PI * 0.75, onFoot: true, walkSpeed: 0 },
    car: null,
    police: createPolice(),
    missions: createMissions(),
    traffic: createTraffic(random),
    parked: [],
    cash: CASH_SPOTS.map((p, i) => ({ ...p, taken: false, amount: 60 + i * 20 })),
    banners: [],
    dialogue: dialogueFor(0, 'intro'),
    dialogueTimer: 7,
    flags: { carStolen: false, copRam: false, missionJingle: false, eyesOut: false, freezeHeat: false },
    stats: { earned: 0, jobsDone: 0, carsStolen: 0, distance: 0, busted: 0, wasted: 0, shotsFired: 0 },
    screen: 'title',
    over: null,
    bustTimer: 0, endTimer: 0,
    radioStation: 0, radioName: RADIO[0].name, radioShow: RADIO[0].show,
    garageCars: 0,
    missionPlace: null,
  };
}

const state = freshState();
for (const spot of PARKED_SPOTS) {
  const car = createCar(random, spot.x, spot.z, random.range(0, Math.PI * 2), { parked: true });
  car.parked = true;
  state.parked.push(car);
  stage.scene.add(car.mesh);
}
for (const car of state.traffic.cars) stage.scene.add(car.mesh);
for (const ped of state.traffic.peds) stage.scene.add(ped.mesh);

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money, respect: state.respect, missionIndex: state.missions.index,
      ammo: state.ammo, day: state.day, garageCars: state.garageCars,
    }));
  } catch { /* storage can be off; the save then lasts this visit only */ }
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.money === 'number') state.money = s.money;
    if (typeof s.respect === 'number') state.respect = s.respect;
    if (typeof s.missionIndex === 'number') state.missions.index = Math.min(s.missionIndex, MISSION_DEFS.length - 1);
    if (Array.isArray(s.ammo)) state.ammo = s.ammo;
    if (typeof s.day === 'number') state.day = s.day;
    if (typeof s.garageCars === 'number') state.garageCars = s.garageCars;
  } catch { /* a corrupt save is ignored */ }
}
loadSave();

function setDialogue(who, line, dur = 6) {
  state.dialogue = { who, line };
  state.dialogueTimer = dur;
}

function showScreen(name) {
  state.screen = name;
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const sub = document.getElementById('overlay-sub');
  const btn = document.getElementById('overlay-btn');
  if (name === 'play') { overlay.style.display = 'none'; return; }
  overlay.style.display = 'flex';
  if (name === 'title') {
    title.textContent = 'SUNSET KEYS';
    sub.textContent = 'Solano Bay · 9 jobs · steal, drive, outrun Bay Patrol. WASD drive & walk · E steal car · F shoot · Q weapons · Z/X/C crew · P pause';
    btn.textContent = 'PLAY — START THE STORY';
  } else if (name === 'paused') {
    title.textContent = 'PAUSED';
    sub.textContent = 'The Bay waits for no one — except right now.';
    btn.textContent = 'RESUME';
  } else if (name === 'busted') {
    title.textContent = 'BUSTED';
    sub.textContent = 'Bay Patrol took you in. $200 bail, and the heat is gone.';
    btn.textContent = 'WALK FREE — TRY AGAIN';
  } else if (name === 'wasted') {
    title.textContent = 'WASTED';
    sub.textContent = 'Sol Marin pulls you out of the gutter. $300 hospital bill.';
    btn.textContent = 'GET UP — TRY AGAIN';
  }
}

function startGame() {
  audio.unlock();
  showScreen('play');
}

function respawn(penalty, screen) {
  state.money = Math.max(0, state.money - penalty);
  state.police.wanted = 0;
  state.police.heat = 0;
  state.health = 100;
  state.armor = 50;
  state.player.x = PLACES.hideout.x;
  state.player.z = PLACES.hideout.z;
  state.player.onFoot = true;
  state.player.heading = Math.PI * 0.75;
  if (state.car) { state.car.speed = 0; state.car = null; }
  state.bustTimer = 0;
  state.over = null;
  showScreen(screen);
  audio.busted();
  saveGame();
}

function enterCar(car, stolen) {
  state.car = car;
  car.parked = false;
  state.player.onFoot = false;
  state.player.x = car.x;
  state.player.z = car.z;
  state.player.heading = car.heading;
  if (stolen) {
    state.flags.carStolen = true;
    state.stats.carsStolen += 1;
    addHeat(state.police, WANTED.STEAL);
    audio.steal();
  }
  state.parked = state.parked.filter((c) => c !== car);
}

function exitCar() {
  const car = state.car;
  if (!car) return;
  car.speed = 0;
  car.parked = true;
  state.parked.push(car);
  state.player.onFoot = true;
  state.player.x = car.x - Math.sin(car.heading) * 3;
  state.player.z = car.z - Math.cos(car.heading) * 3;
  state.player.heading = car.heading;
  state.car = null;
}

function nearestStealable() {
  let best = null;
  let bestD = 7;
  for (const car of [...state.parked, ...state.traffic.cars]) {
    const d = Math.hypot(car.x - state.player.x, car.z - state.player.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function shoot() {
  const w = WEAPONS[state.weapon];
  if (state.missions.index < WEAPON_UNLOCK[state.weapon]) return;
  if (state.ammo[state.weapon] <= 0 && w.ammo !== Infinity) return;
  if (w.ammo !== Infinity) state.ammo[state.weapon] -= 1;
  state.stats.shotsFired += 1;
  audio.shoot();
  addHeat(state.police, 4);
  // Hit the nearest cop in front within 45 m.
  let best = null;
  let bestD = 45;
  for (const cop of state.police.cops) {
    const dx = cop.x - state.player.x;
    const dz = cop.z - state.player.z;
    const d = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    let diff = ang - state.player.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (d < bestD && Math.abs(diff) < 0.5) { bestD = d; best = cop; }
  }
  if (best) {
    best.condition -= w.damage;
    addHeat(state.police, WANTED.SHOOT / 4);
    if (best.condition <= 0) {
      state.police.cops = state.police.cops.filter((c) => c !== best);
      stage.scene.remove(best.mesh);
      state.respect += 40;
      state.money += 80;
    }
  }
}

function useCrew(index) {
  if (state.crewCooldown[index] > 0) return;
  if (index === 0) {
    // Mira swaps plates: drop one wanted star.
    if (state.police.wanted > 0) {
      state.police.heat = Math.max(0, state.police.heat - WANTED.PER_STAR);
      state.police.wanted = Math.floor(state.police.heat / WANTED.PER_STAR);
      state.crewCooldown[0] = 45;
      setDialogue('mira', 'Plates swapped. The whole city just forgot your face.');
    }
  } else if (index === 1) {
    if (state.car && state.car.condition < 100) {
      state.car.condition = 100;
      state.crewCooldown[1] = 40;
      setDialogue('lio', 'Quick fix done — she is factory fresh. Do not scratch her again.');
    }
  } else if (index === 2) {
    state.flags.eyesOut = true;
    state.crewCooldown[2] = 30;
    setDialogue('kiki', 'Eyes out — every cop in the Bay is on your map now. Thirty seconds.');
    window.setTimeout(() => { state.flags.eyesOut = false; }, 30000);
  }
}

// Test/autopilot hook: window.__autoDrive = { x, z } steers the player there.
function autopilotInput() {
  const target = window.__autoDrive;
  if (!target) return null;
  const tx = target.x - state.player.x;
  const tz = target.z - state.player.z;
  const dist = Math.hypot(tx, tz);
  if (dist < 4) { window.__autoDrive = null; return { forward: false, back: false, left: false, right: false, sprint: false }; }
  const want = Math.atan2(tx, tz);
  let diff = want - state.player.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (state.car) {
    return {
      forward: Math.abs(diff) < 1.2,
      back: Math.abs(diff) > 2.4,
      left: diff > 0.12,
      right: diff < -0.12,
      sprint: false,
    };
  }
  return {
    forward: Math.abs(diff) < 0.9, back: false,
    left: diff > 0.12, right: diff < -0.12, sprint: true,
  };
}

let saveTimer = 0;

function stepGame(dt) {
  state.time += dt;
  state.clockMinutes += dt * 0.5; // 1 game minute every 2 real seconds
  if (state.clockMinutes >= 24 * 60) { state.clockMinutes -= 24 * 60; state.day += 1; }
  stage.setTimeOfDay((state.clockMinutes / 60) % 24);

  const actions = input.takeActions();
  const slot = input.takeWeaponSlot();
  if (slot >= 0 && slot < WEAPONS.length && state.missions.index >= WEAPON_UNLOCK[slot]) state.weapon = slot;
  if (actions & ACTION_PAUSE && state.screen === 'play') { showScreen('paused'); return; }
  if (actions & ACTION_CONFIRM && state.screen !== 'play') { startGame(); return; }
  if (state.screen !== 'play') return;

  if (actions & ACTION_RADIO) {
    state.radioStation = audio.setStation(state.radioStation + 1);
    state.radioName = RADIO[state.radioStation].name;
    state.radioShow = RADIO[state.radioStation].show;
  }
  if (actions & ACTION_CYCLE_WEAPON) {
    const next = (state.weapon + 1) % WEAPONS.length;
    if (state.missions.index >= WEAPON_UNLOCK[next]) state.weapon = next;
  }
  if (actions & ACTION_CREW1) useCrew(0);
  if (actions & ACTION_CREW2) useCrew(1);
  if (actions & ACTION_CREW3) useCrew(2);
  if (actions & ACTION_SHOOT) shoot();
  if (actions & ACTION_GARAGE) {
    const g = PLACES.garage;
    if (Math.hypot(state.player.x - g.x, state.player.z - g.z) < 30 && state.car && state.car.condition < 100 && state.money >= 150) {
      state.money -= 150;
      state.car.condition = 100;
      state.garageCars += 1;
      setDialogue('lio', 'Garage special — full repair, $150. She is yours now, parked safe.');
      audio.cash();
    }
  }
  if (actions & ACTION_ENTER) {
    if (state.car) exitCar();
    else {
      const car = nearestStealable();
      if (car) enterCar(car, true);
    }
  }

  const auto = autopilotInput();
  const held = auto || input.held;

  if (state.car) {
    const before = { x: state.car.x, z: state.car.z };
    driveCar(state.car, held, dt);
    const fixed = collideCircle(city, state.car.x, state.car.z, 2.2);
    if (Math.hypot(fixed.x - state.car.x, fixed.z - state.car.z) > 0.4) {
      state.car.speed *= 0.4;
      if (!state.flags.freezeHeat) state.car.condition = Math.max(0, state.car.condition - 0.4);
    }
    state.car.x = fixed.x;
    state.car.z = fixed.z;
    syncCarMesh(state.car);
    state.player.x = state.car.x;
    state.player.z = state.car.z;
    state.player.heading = state.car.heading;
    state.stats.distance += Math.hypot(state.car.x - before.x, state.car.z - before.z);
    // Bump traffic cars out of the way.
    for (const t of state.traffic.cars) {
      const d = Math.hypot(t.x - state.car.x, t.z - state.car.z);
      if (d < 4.5 && d > 0.01) {
        const push = (4.5 - d) / d;
        state.car.x -= (t.x - state.car.x) * push * 0.5;
        state.car.z -= (t.z - state.car.z) * push * 0.5;
        state.car.condition = Math.max(0, state.car.condition - 0.2);
        state.car.speed *= 0.96;
      }
    }
    if (state.car.condition <= 0) {
      state.car.condition = 0;
      state.car.speed = 0;
      setDialogue('lio', 'Engine is dead, Jax. Get out and find another ride.');
      exitCar();
    }
  } else {
    const speed = held.sprint ? ONFOOT.SPRINT : ONFOOT.WALK;
    state.player.walkSpeed = held.forward ? speed : 0;
    if (held.left) state.player.heading += ONFOOT.TURN * dt;
    if (held.right) state.player.heading -= ONFOOT.TURN * dt;
    if (held.forward) {
      state.player.x += Math.sin(state.player.heading) * speed * dt;
      state.player.z += Math.cos(state.player.heading) * speed * dt;
    } else if (held.back) {
      state.player.x -= Math.sin(state.player.heading) * speed * 0.5 * dt;
      state.player.z -= Math.cos(state.player.heading) * speed * 0.5 * dt;
    }
    const fixed = collideCircle(city, state.player.x, state.player.z, 0.9);
    state.player.x = fixed.x;
    state.player.z = fixed.z;
  }

  stepTraffic(state, stage, dt);
  stepPolice(state, stage, dt);
  audio.setSiren(state.police.wanted >= 1);
  audio.setEngine(!!state.car, state.car ? state.car.speed : 0);

  // Cash pickups.
  for (let i = 0; i < state.cash.length; i += 1) {
    const c = state.cash[i];
    const mesh = stage.cashMeshes[i];
    if (c.taken) { mesh.visible = false; continue; }
    mesh.visible = true;
    mesh.position.set(c.x, 1 + Math.sin(state.time * 2 + i) * 0.2, c.z);
    mesh.rotation.y = state.time * 1.5;
    if (Math.hypot(state.player.x - c.x, state.player.z - c.z) < 4) {
      c.taken = true;
      state.money += c.amount;
      state.stats.earned += c.amount;
      audio.cash();
    }
  }

  // Mission beacon.
  const step = currentStep(state.missions);
  if (step && step.place) {
    const p = PLACES[step.place];
    state.missionPlace = p;
    stage.beacon.visible = true;
    stage.beacon.position.set(p.x, 0, p.z);
    stage.beacon.userData.diamond.rotation.y = state.time * 2;
  } else {
    state.missionPlace = null;
    stage.beacon.visible = false;
  }

  const beforeMission = state.missions.index;
  stepMissions(state, dt);
  if (state.missions.index !== beforeMission) {
    const done = state.missions.index - 1;
    if (done >= 0) {
      const d = dialogueFor(done, 'jobDone');
      setDialogue(d.who, d.line, 7);
    }
    if (state.missions.index < MISSION_DEFS.length) {
      const d = dialogueFor(state.missions.index, 'jobStart');
      window.setTimeout(() => setDialogue(d.who, d.line, 7), 1500);
    }
    saveGame();
  }
  if (state.flags.missionJingle) { state.flags.missionJingle = false; audio.missionDone(); }

  // Busted / wasted (never in a staged screenshot scene: freezeHeat blocks it).
  if (state.over === 'busted') {
    const d = dialogueFor(0, 'busted');
    setDialogue(d.who, d.line, 7);
    respawn(200, 'busted');
    return;
  }
  if (state.health <= 0) {
    const d = dialogueFor(0, 'wasted');
    setDialogue(d.who, d.line, 7);
    respawn(300, 'wasted');
    return;
  }
  if (state.police.wanted === 0 && state.health < 100) state.health = Math.min(100, state.health + 2 * dt);

  for (let i = 0; i < 3; i += 1) if (state.crewCooldown[i] > 0) state.crewCooldown[i] -= dt;
  if (state.dialogueTimer > 0) {
    state.dialogueTimer -= dt;
    if (state.dialogueTimer <= 0) state.dialogue = null;
  }
  for (let i = state.banners.length - 1; i >= 0; i -= 1) {
    state.banners[i].t += dt;
    if (state.banners[i].t > state.banners[i].dur) state.banners.splice(i, 1);
  }
  if (state.police.wanted >= 2 && state.time % 20 < dt) {
    const d = DIALOGUE.chase[Math.floor(state.time / 20) % DIALOGUE.chase.length];
    setDialogue(d.who, d.line, 6);
  }

  saveTimer += dt;
  if (saveTimer > 12) { saveTimer = 0; saveGame(); }
}

let accumulator = 0;
let last = performance.now();
let shotFrames = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
  accumulator += frameDt;
  last = now;
  if (state.screen === 'title') {
    // Title screen: Enter/Space (or a click) starts the story.
    if (input.takeActions() & ACTION_CONFIRM) startGame();
    if (state.screen !== 'title') return;
    // Title backdrop: slow orbit over the plaza while traffic moves.
    stepTraffic(state, stage, STEP);
    state.time += STEP;
    stage.camera.position.set(
      PLACES.plaza.x + Math.sin(state.time * 0.08) * 40,
      26,
      PLACES.plaza.z + Math.cos(state.time * 0.08) * 40,
    );
    stage.camera.lookAt(PLACES.plaza.x, 2, PLACES.plaza.z);
    stage.setTimeOfDay(17.4);
  } else {
    while (accumulator >= STEP) { stepGame(STEP); accumulator -= STEP; }
    if (state.screen === 'play' || state.screen === 'paused') {
      stage.updateCamera(state.player, state.car, frameDt);
    }
  }
  syncPlayerMesh(stage.playerMesh, state.player);
  hud.update(state);
  stage.render();
  if (shotName) {
    shotFrames += 1;
    if (shotFrames === 14) window.__shotReady = true;
  }
}

document.getElementById('overlay-btn').addEventListener('click', () => {
  if (state.screen === 'title') startGame();
  else if (state.screen === 'paused') showScreen('play');
  else if (state.screen === 'busted' || state.screen === 'wasted') showScreen('play');
});
document.getElementById('overlay').addEventListener('click', (event) => {
  if (event.target.id === 'overlay' && state.screen === 'title') startGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.screen === 'play') showScreen('paused');
});

if (shotName) {
  stageShot(shotName, state, stage, random);
  showScreen('play');
  audio.unlock = () => {};
} else {
  showScreen('title');
}

// Play-test hooks: state, input and helpers for an automated driver.
window.__sunset = {
  state, input, stage,
  start: startGame,
  driveTo(x, z) { window.__autoDrive = { x, z }; },
  teleport(x, z) { state.player.x = x; state.player.z = z; if (state.car) { state.car.x = x; state.car.z = z; syncCarMesh(state.car); } },
  mission() { return { index: state.missions.index, step: state.missions.step, timer: state.missions.timer }; },
  speedKmh() { return state.car ? carSpeedKmh(state.car) : 0; },
};
window.__sunsetReady = true;
window.__game = state;

if (params.get('selftest') === '1') {
  const results = selfTest(state);
  document.title = results.ok ? 'SELFTEST OK' : 'SELFTEST FAIL';
  window.__selftest = results;
}

requestAnimationFrame(frame);
