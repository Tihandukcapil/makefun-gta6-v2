// Bay Patrol: heat builds from thefts and shootings, decays when the player
// is clean, and spawns cruisers that chase and ram. Wanted stars come from
// heat / 30. Three stars brings the helicopter and its spotlight; four stars
// puts a roadblock on Marea Blvd. The player is busted on contact while
// wanted, and wasted when health hits zero.
import * as THREE from 'three';
import { WANTED } from './config.js';
import { createCar, syncCarMesh } from './vehicles.js';

export function createPolice() {
  return { heat: 0, wanted: 0, cops: [], heli: null, heliTimer: 0, roadblock: false, bustedTimer: 0 };
}

export function addHeat(police, amount) {
  police.heat = Math.min(200, police.heat + amount);
}

export function wantedFromHeat(heat) {
  return Math.min(5, Math.floor(heat / WANTED.PER_STAR));
}

export function stepPolice(state, stage, dt) {
  const police = state.police;
  if (!state.flags.freezeHeat) {
    if (police.heat > 0) police.heat = Math.max(0, police.heat - WANTED.DECAY * dt);
  }
  police.wanted = wantedFromHeat(police.heat);
  police.roadblock = police.wanted >= 4;

  const targetCops = police.wanted > 0 ? police.wanted + 1 : 0;
  while (police.cops.length < targetCops) {
    const cop = createCar(state.random, 0, 0, 0, { isCop: true, name: 'Bay Patrol Interceptor', color: 0xf2f2f2 });
    const angle = state.random.range(0, Math.PI * 2);
    cop.x = state.player.x + Math.sin(angle) * 120;
    cop.z = state.player.z + Math.cos(angle) * 120;
    cop.speed = 0;
    cop.ramCooldown = 0;
    cop.condition = 100;
    cop.maxSpeed = 34;
    syncCarMesh(cop);
    police.cops.push(cop);
    stage.scene.add(cop.mesh);
  }
  while (police.cops.length > targetCops) {
    const cop = police.cops.pop();
    stage.scene.remove(cop.mesh);
  }

  const player = state.player;
  for (const cop of police.cops) {
    const dx = player.x - cop.x;
    const dz = player.z - cop.z;
    const dist = Math.hypot(dx, dz);
    cop.dist = dist;
    const want = Math.atan2(dx, dz);
    let diff = want - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const targetSpeed = dist > 8 ? (cop.maxSpeed || 34) : 20;
    cop.speed = Math.min(targetSpeed, cop.speed + 12 * dt);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    cop.status = dist < 20 ? 'RAMMING' : dist < 60 ? 'CLOSING IN' : 'PURSUIT';
    cop.ramCooldown = Math.max(0, (cop.ramCooldown || 0) - dt);
    if (dist < 4 && cop.ramCooldown <= 0) {
      cop.ramCooldown = 1.2;
      state.health -= 8;
      if (state.car) state.car.condition -= 6;
      if (state.car) state.car.speed *= 0.5;
    }
    syncCarMesh(cop);
  }

  if (police.wanted >= 3 && !police.heli) {
    const heli = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x2c3444 }),
    );
    heli.add(body);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.12, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x14161a }),
    );
    rotor.position.y = 1;
    heli.add(rotor);
    heli.userData.rotor = rotor;
    const spot = new THREE.SpotLight(0xfff2b0, 3, 60, 0.4, 0.5);
    spot.position.set(0, 0, 0);
    heli.add(spot);
    heli.add(spot.target);
    spot.target.position.set(0, -30, 0);
    stage.scene.add(heli);
    police.heli = heli;
  }
  if (police.heli) {
    if (police.wanted < 3) {
      stage.scene.remove(police.heli);
      police.heli = null;
    } else {
      const heli = police.heli;
      heli.position.set(player.x + 20, 34, player.z - 20);
      heli.userData.rotor.rotation.y += dt * 12;
    }
  }

  // Busted on contact while wanted — never during a staged screenshot scene.
  if (police.wanted > 0 && !state.flags.freezeHeat) {
    let nearest = Infinity;
    for (const cop of police.cops) nearest = Math.min(nearest, cop.dist || Infinity);
    if (nearest < 3.5) {
      police.bustedTimer += dt;
      if (police.bustedTimer > 1.2) {
        state.over = 'busted';
        state.stats.busted += 1;
      }
    } else police.bustedTimer = 0;
  }
}
