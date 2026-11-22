// The rest of the city: civilian traffic on the grid and pedestrians on the
// sidewalks. Traffic cars follow their lane at a cruise speed; pedestrians
// wander. Both keep to the grid so they never cut through buildings.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { createCar, syncCarMesh } from './vehicles.js';

export function createTraffic(random) {
  const cars = [];
  for (let i = 0; i < 10; i += 1) {
    const along = random.chance(0.5) ? 'z' : 'x';
    const lane = random.pick([-288, -224, -160, -96, -32, 32, 96, 160, 224, 288]);
    const dir = random.chance(0.5) ? 1 : -1;
    const car = createCar(random, 0, 0, 0);
    car.along = along;
    car.lane = lane;
    car.dir = dir;
    car.cruise = random.range(10, 18);
    car.speed = car.cruise;
    if (along === 'z') {
      car.x = lane + (dir > 0 ? -3.5 : 3.5);
      car.z = random.range(-280, 280);
      car.heading = dir > 0 ? 0 : Math.PI;
    } else {
      car.x = random.range(-280, 280);
      car.z = lane + (dir > 0 ? 3.5 : -3.5);
      car.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    syncCarMesh(car);
    cars.push(car);
  }
  const peds = [];
  const pedColors = [0xff9ad5, 0x7ad7ff, 0x9dff8a, 0xffb37a, 0xc9a8ff, 0xf2f2f2];
  for (let i = 0; i < 14; i += 1) {
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.35),
      new THREE.MeshLambertMaterial({ color: pedColors[i % pedColors.length] }),
    );
    body.position.y = 0.95;
    mesh.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
    );
    head.position.y = 1.7;
    mesh.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.55, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2c3444 }),
    );
    legs.position.y = 0.28;
    mesh.add(legs);
    const ped = {
      x: random.range(-280, 280),
      z: random.range(-280, 240),
      heading: random.range(0, Math.PI * 2),
      speed: random.range(1, 2),
      wander: random.range(0, 5),
      mesh,
    };
    mesh.position.set(ped.x, 0, ped.z);
    mesh.rotation.y = ped.heading;
    peds.push(ped);
  }
  return { cars, peds };
}

export function stepTraffic(state, stage, dt) {
  for (const car of state.traffic.cars) {
    // Never move the car the player is driving — driveCar owns it.
    if (car === state.car) continue;
    if (car.along === 'z') {
      car.z += car.dir * car.speed * dt;
      if (car.z > 300) car.z = -300;
      if (car.z < -300) car.z = 300;
    } else {
      car.x += car.dir * car.speed * dt;
      if (car.x > 300) car.x = -300;
      if (car.x < -300) car.x = 300;
    }
    syncCarMesh(car);
  }
  for (const ped of state.traffic.peds) {
    ped.wander -= dt;
    if (ped.wander <= 0) {
      ped.heading = state.random.range(0, Math.PI * 2);
      ped.wander = state.random.range(2, 8);
    }
    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
    ped.x = Math.max(-WORLD.HALF, Math.min(WORLD.HALF, ped.x));
    ped.z = Math.max(-WORLD.HALF, Math.min(WORLD.HALF + 30, ped.z));
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }
}
