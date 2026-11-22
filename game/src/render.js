// three.js stage: renderer, golden-hour sun + fog, the player figure on foot,
// the mission beacon, and the third-person camera that follows car or walker.
import * as THREE from 'three';
import { WORLD } from './config.js';

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xff9a56);
  scene.fog = new THREE.Fog(0xff9a56, 120, 620);

  // Wider 68° field of view: a third-person action camera needs the street
  // (and, at dusk, lighthouse + sun together) in frame. Was 62° — the
  // beach shot could not fit the lighthouse and the low sun in one frame.
  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 1200);
  camera.position.set(0, 12, -18);

  const sun = new THREE.DirectionalLight(0xffd27a, 2.4);
  sun.position.set(-120, 90, 160);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffc9a0, 0.85));
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x3a4a5a, 0.7);
  scene.add(hemi);

  // The sun disc low over the sea, and a warm sky dome gradient behind it.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false, side: THREE.DoubleSide }),
  );
  sunDisc.position.set(-40, 42, 560);
  scene.add(sunDisc);
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb37a, side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);

  // Player on foot: jacket body, head, legs, and now arms (G5) — the old
  // figure was a sphere head on a box with no limbs, plainly visible in the
  // on-foot shots.
  const playerMesh = new THREE.Group();
  const jacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.05, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xffd36a }),
  );
  jacket.position.y = 1.05;
  playerMesh.add(jacket);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
  );
  head.position.y = 1.85;
  playerMesh.add(head);
  const armMat = new THREE.MeshLambertMaterial({ color: 0xe8a34a });
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.16), armMat);
    arm.position.set(sx * 0.46, 1.05, 0);
    playerMesh.add(arm);
  }
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.6, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2c3444 }),
  );
  legs.position.y = 0.3;
  playerMesh.add(legs);
  scene.add(playerMesh);

  // Mission beacon: a glowing column + a spinning diamond over the target.
  const beacon = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  );
  column.position.y = 15;
  beacon.add(column);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6),
    new THREE.MeshBasicMaterial({ color: 0xffd36a }),
  );
  diamond.position.y = 8;
  beacon.add(diamond);
  beacon.userData.diamond = diamond;
  beacon.visible = false;
  scene.add(beacon);

  // Cash pickups: small green-gold spinning boxes on the street.
  const cashMeshes = [];
  for (let i = 0; i < 6; i += 1) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x7ad77a, emissive: 0x2a6a2a, emissiveIntensity: 0.5 }),
    );
    m.position.y = 1;
    scene.add(m);
    cashMeshes.push(m);
  }

  function setTimeOfDay(hour) {
    // 16:00 bright gold, 18:45 deep dusk — sun drops, sky reddens, fog thickens.
    const t = Math.max(0, Math.min(1, (hour - 16) / 3));
    const sky = new THREE.Color(0xff9a56).lerp(new THREE.Color(0x8a4a7a), t);
    scene.background = sky;
    scene.fog.color.copy(sky);
    sun.position.set(-120 + t * 60, 90 - t * 55, 160);
    sun.intensity = 2.4 - t * 0.9;
    sunDisc.position.y = 42 - t * 26;
    sunDisc.material.color.setHex(t > 0.6 ? 0xff7a5a : 0xffe9a8);
    skyDome.material.color.copy(sky);
  }

  const camPos = new THREE.Vector3(0, 12, -18);
  function updateCamera(player, car, dt) {
    const target = car || player;
    // Low third-person chase cam: close behind the car (or walker) so the
    // vehicle fills the lower frame and the street fills the rest. This is
    // the real gameplay camera the player drives with, not a screenshot-only
    // angle — the staged shots use the same view a player sees.
    const back = car ? 8 + Math.abs(car.speed) * 0.06 : 7.5;
    const height = car ? 3.6 : 3.0;
    const heading = target.heading;
    const want = new THREE.Vector3(
      target.x - Math.sin(heading) * back,
      height,
      target.z - Math.cos(heading) * back,
    );
    camPos.lerp(want, Math.min(1, dt * 4.5));
    camera.position.copy(camPos);
    // On foot the camera looks near-level (3.4) instead of down at the
    // player's chest (1.4): tall landmarks — the 37 m lighthouse — then fit
    // inside the frame instead of having their tops clipped off. Driving
    // keeps the slight downward look (1.3) so the road ahead stays in view.
    camera.lookAt(target.x + Math.sin(heading) * 9, car ? 1.3 : 3.4, target.z + Math.cos(heading) * 9);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return {
    scene, camera, renderer, sun, playerMesh, beacon, cashMeshes,
    setTimeOfDay, updateCamera,
    render() { renderer.render(scene, camera); },
  };
}

export function syncPlayerMesh(mesh, player) {
  mesh.position.set(player.x, 0, player.z);
  mesh.rotation.y = player.heading;
  mesh.visible = player.onFoot;
}
