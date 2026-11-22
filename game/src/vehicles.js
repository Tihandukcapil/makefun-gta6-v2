// Cars: building them from boxes and cylinders, arcade driving physics, and
// stealing. A car is plain data plus a three.js Group the renderer owns.
//
// V2 fidelity pass (G5): the old car was a featureless box + black cabin.
// Now every car gets bumpers, a taillight bar, glass side windows, and — on
// civilian cars — a rear spoiler, so the player's ride reads as a car from
// the chase camera instead of a yellow brick.
import * as THREE from 'three';
import { CAR, VEHICLE_NAMES } from './config.js';

let nextCarId = 1;

const CAR_COLORS = [0xd84a3a, 0x3a7bd8, 0xe8c33a, 0x3f8f4f, 0xf2f2f2, 0x22242a, 0xd87ab8, 0x7a5fd8];

export function makeCarMesh(color, isCop) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isCop ? 0xf2f2f2 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: isCop ? 0x1e5fd6 : 0x22303c }),
  );
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  // Glass side windows on the cabin.
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x8ab4d8 });
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.6), glassMat);
    win.position.set(sx * 0.92, 1.35, -0.2);
    g.add(win);
  }
  // Bumpers front and rear.
  const bumperMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });
  for (const bz of [2.35, -2.35]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.3), bumperMat);
    bumper.position.set(0, 0.35, bz);
    g.add(bumper);
  }
  // Taillight bar at the rear.
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.16, 0.1),
    new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 0.6 }),
  );
  tail.position.set(0, 0.7, -2.32);
  g.add(tail);
  // Rear spoiler on civilian cars (cruisers keep the clean interceptor look).
  if (!isCop) {
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.08, 0.5),
      new THREE.MeshLambertMaterial({ color }),
    );
    spoiler.position.set(0, 1.18, -2.1);
    g.add(spoiler);
    for (const sx of [-0.7, 0.7]) {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.25, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x14161a }),
      );
      strut.position.set(sx, 1.02, -2.1);
      g.add(strut);
    }
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  if (isCop) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 0.7 }),
    );
    bar.position.set(0, 1.75, -0.2);
    g.add(bar);
    g.userData.lightBar = bar;
  }
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.18, 0.1),
    new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xffedb0, emissiveIntensity: 0.6 }),
  );
  head.position.set(0, 0.7, 2.32);
  g.add(head);
  return g;
}

export function createCar(random, x, z, heading, opts = {}) {
  const car = {
    id: nextCarId,
    name: opts.name || random.pick(VEHICLE_NAMES),
    color: opts.color ?? random.pick(CAR_COLORS),
    x, z, heading,
    speed: 0,
    condition: 100,
    parked: !!opts.parked,
    isCop: !!opts.isCop,
    mesh: null,
  };
  nextCarId += 1;
  car.mesh = makeCarMesh(car.color, car.isCop);
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  return car;
}

export function syncCarMesh(car) {
  if (!car.mesh) return;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}

// Arcade drive: W/S throttle, A/D steer (steering bites harder at speed), S brakes.
export function driveCar(car, input, dt) {
  const forward = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  if (forward) car.speed += CAR.ACCEL * dt;
  else if (back) car.speed -= (car.speed > 0.5 ? CAR.BRAKE : CAR.REVERSE) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 5 * dt);
  car.speed = Math.max(-CAR.MAX_REVERSE, Math.min(CAR.MAX_SPEED, car.speed));
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const grip = Math.min(1, Math.abs(car.speed) / 12);
  car.heading += steer * CAR.TURN * grip * dt * Math.sign(car.speed || 1);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  syncCarMesh(car);
}

export function carSpeedKmh(car) {
  return Math.round(Math.abs(car.speed) * 2.2);
}
