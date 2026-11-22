// The screenshot scenes behind ?shot=chase|street|mission|dusk. Each one stages
// the real game — real state, real HUD, real traffic — at a chosen moment, so
// the frame is what a short game really looks like and the same seed always
// gives the same frame. main.js sets window.__shotReady after 45 frames.
//
// V2 restage (G3/G4/G7): the four shots are four DIFFERENT scenes now — the
// old chase and mission shots were the same street, same car, same angle.
// Chase is a 4-star roadblock pursuit southbound; mission is the Vela Garage
// run eastbound on Harbor Rd; street is on foot at the plaza; dusk is a
// coastal DRIVE westbound on the beach road with the sea at the frame's left
// edge and the lighthouse ahead. Every shot seeds traffic cars AND
// pedestrians near the camera, and all four shoot from ONE save state —
// $18,450, FIXER 690/700, day 3 — so the HUD never contradicts itself.
import { PLACES, WANTED } from './config.js';
import { addHeat } from './police.js';
import { dialogueFor } from './dialogue.js';
import { createCar, syncCarMesh } from './vehicles.js';

const COP_UNITS = ['UNIT 12', 'UNIT 27', 'UNIT 31'];
const COP_STATUS = ['RAMMING', 'PURSUIT', 'CLOSING IN'];

// Place a Bay Patrol cruiser ahead of the player car for the chase cover.
function placeCop(state, stage, x, z, i) {
  const cop = createCar(null, x, z, 0, { isCop: true, name: 'Bay Patrol Interceptor', color: 0xf2f2f2 });
  cop.id = 1000 + i;
  cop.unitName = COP_UNITS[i];
  cop.status = COP_STATUS[i];
  cop.dist = 18 + i * 12;
  cop.speed = 40;
  cop.ramCooldown = 0;
  cop.condition = 100;
  syncCarMesh(cop);
  state.police.cops.push(cop);
  stage.scene.add(cop.mesh);
  return cop;
}

function putPlayerInCar(state, stage, x, z, heading, speed) {
  const car = state.parked[0];
  state.parked = state.parked.filter((c) => c !== car);
  car.parked = false;
  car.x = x; car.z = z; car.heading = heading; car.speed = speed;
  car.name = 'Veloz Comet RS';
  car.condition = 82;
  syncCarMesh(car);
  state.car = car;
  state.player.onFoot = false;
  state.player.x = x; state.player.z = z; state.player.heading = heading;
}

function putPlayerOnFoot(state, x, z, heading) {
  state.player.onFoot = true;
  state.player.x = x; state.player.z = z; state.player.heading = heading;
  state.car = null;
}

// Reposition an existing traffic car onto a chosen street so the shot's
// street is busy. along 'z' drives north/south on lane x; along 'x' drives
// east/west on lane z. dir 1 drives +axis, dir -1 drives -axis. x/z are the
// car's starting spot; stepTraffic keeps it on its lane from there.
function placeTrafficCar(state, i, lane, along, dir, cruise, x, z) {
  const car = state.traffic.cars[i % state.traffic.cars.length];
  car.along = along; car.lane = lane; car.dir = dir; car.cruise = cruise;
  car.x = x; car.z = z; car.speed = cruise;
  car.heading = along === 'z' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  syncCarMesh(car);
  return car;
}

// Stand a pedestrian at a chosen spot (sidewalk / beach). wander = 30 keeps
// them facing the same way through the settle frames.
function placePed(state, i, x, z, heading) {
  const ped = state.traffic.peds[i % state.traffic.peds.length];
  ped.x = x; ped.z = z; ped.heading = heading; ped.wander = 30;
  ped.mesh.position.set(x, 0, z);
  ped.mesh.rotation.y = heading;
  return ped;
}

// Park a parked car at a chosen spot (e.g. the crew's car on the beach).
function placeParkedCar(state, i, x, z, heading) {
  const car = state.parked[i % state.parked.length];
  car.x = x; car.z = z; car.heading = heading;
  syncCarMesh(car);
  return car;
}

export function stageShot(name, state, stage, random) {
  // One save state for all four shots (G7): same money, same respect rank,
  // same day. No shot overrides these below.
  state.money = 18450;
  state.respect = 690;
  state.health = 86;
  state.armor = 62;
  state.clockMinutes = 17 * 60 + 19;
  state.day = 3;

  if (name === 'street') {
    // On foot at Plaza del Sol, facing the fountain: four pedestrians and a
    // traffic car close to the camera, fountain and bus stop in frame, no heat.
    // The camera looks southwest (heading -PI/4), so the peds and the car
    // are staged southwest of the player, around the fountain.
    putPlayerOnFoot(state, -24, 24, -Math.PI / 4);
    state.missions.index = 0;
    state.missions.step = 0;
    state.dialogue = dialogueFor(0, 'intro');
    state.dialogueTimer = 30;
    state.clockMinutes = 16 * 60 + 48;
    placeTrafficCar(state, 0, -32, 'z', 1, 10, -28.5, -10);
    placeTrafficCar(state, 1, 32, 'x', 1, 12, -60, 32);
    placePed(state, 0, -38, 28, 0.5);
    placePed(state, 1, -30, 38, -1.2);
    placePed(state, 2, -40, 38, 2.0);
    placePed(state, 3, -28, 38, 1.0);
    placeParkedCar(state, 0, -44, 40, 2.2);
  } else if (name === 'mission') {
    // Vela Garage run, eastbound on Harbor Rd (z=-32) — a different street,
    // direction and subject from the chase cover. The player starts 128 m
    // west of the garage at speed 30, so at capture the garage and its
    // beacon are 25–70 m ahead and the delivery step cannot complete
    // mid-shot. One wanted star, two traffic cars and two sidewalk peds.
    putPlayerInCar(state, stage, -32, -32, Math.PI / 2, 30);
    state.missions.index = 0;
    state.missions.step = 1;
    addHeat(state.police, WANTED.PER_STAR);
    state.flags.freezeHeat = true;
    placeTrafficCar(state, 0, -32, 'x', 1, 26, 40, -32);
    placeTrafficCar(state, 1, 96, 'z', -1, 12, 99.5, 40);
    placePed(state, 0, 80, -22, 0.5);
    placePed(state, 1, 110, -42, -1.0);
    state.dialogue = dialogueFor(0, 'jobStart');
    state.dialogueTimer = 30;
    state.clockMinutes = 17 * 60 + 41;
  } else if (name === 'dusk') {
    // Coastal DRIVE westbound on the beach road (z=288) at dusk: the
    // lighthouse stands ahead down the road, the sea fills the frame's left
    // edge, beach umbrellas and palms line the sand. The player is IN the
    // car at 40 m/s, not standing on the sand. Mission 5 step 2 points the
    // beacon at the lighthouse ahead.
    putPlayerInCar(state, stage, 32, 288, -Math.PI / 2, 40);
    state.missions.index = 4;
    state.missions.step = 1;
    state.dialogue = dialogueFor(4, 'jobStart');
    state.dialogueTimer = 30;
    state.clockMinutes = 18 * 60 + 38;
    placeTrafficCar(state, 0, 288, 'x', -1, 20, -130, 284.5);
    placeTrafficCar(state, 1, 288, 'x', 1, 12, -180, 291.5);
    placePed(state, 0, -140, 300, 2.2);
    placePed(state, 1, -160, 296, -0.8);
    placeParkedCar(state, 0, -180, 306, -0.5);
  } else {
    // chase (cover): 4-star pursuit southbound on x=32, deep in the city so
    // buildings flank both sides. Two cruisers abreast ahead read as the
    // roadblock (wanted 4 lights the ROADBLOCK dispatch row) with a third
    // further up the road, Air One's spotlight overhead, two fast traffic
    // cars ahead and peds on the sidewalks.
    putPlayerInCar(state, stage, 32, -160, 0, 40);
    state.missions.index = 2;
    state.missions.step = 1;
    state.missions.timer = 41;
    state.missions.stepTimerFor = 1;
    addHeat(state.police, WANTED.PER_STAR * 4 + 30);
    state.flags.freezeHeat = true;
    // Cruisers ahead up the road, forming a pursuit column. They MUST start
    // far ahead (180–260 m) and slow (maxSpeed 12): a cop steers toward the
    // player at 2.4 rad/s, so one placed just ahead turns, passes the player
    // head-on within ~1 s and ends up chasing from behind the camera —
    // invisible. Far ahead, the player (closing ~40 m/s) still has not
    // reached them at capture, so all three stay in frame down the road.
    placeCop(state, stage, 28, 20, 0);
    placeCop(state, stage, 36, 20, 1);
    placeCop(state, stage, 32, 60, 2);
    state.police.cops[0].maxSpeed = 12;
    state.police.cops[1].maxSpeed = 12;
    state.police.cops[2].maxSpeed = 12;
    placeTrafficCar(state, 0, 32, 'z', 1, 30, 35.5, -130);
    placeTrafficCar(state, 1, 32, 'z', 1, 34, 28.5, -150);
    placePed(state, 0, 22.5, -120, 1.5);
    placePed(state, 1, 41.5, -95, -1);
    state.dialogue = dialogueFor(0, 'chase');
    state.dialogueTimer = 30;
    state.clockMinutes = 17 * 60 + 19;
  }
  // Settle the police + helicopter one step so the dispatch panel is populated,
  // and snap the camera behind the player so the first frame is already framed.
  stage.setTimeOfDay((state.clockMinutes / 60) % 24);
  for (let i = 0; i < 3; i += 1) stage.updateCamera(state.player, state.car, 1);
}
