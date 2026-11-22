// Solano Bay itself: a procedural low-poly golden-hour coastal city. Street grid,
// box buildings with lit windows (canvas textures), palms, beach, sea, marina,
// lighthouse and street lamps — all geometry made here, no loaded assets.
//
// V2 richness pass (G2): the old city was one brown facade repeated on every
// block. Buildings now draw from several facade colours, vary in height with
// a few towers and low blocks, and carry rooftop props (AC boxes, water
// tanks, antennas), coloured awnings and glowing shop signs. Streets get
// pale sidewalk strips, planters and bins at intersections, and the beach
// gets umbrellas, a boardwalk and more moored boats. Footprints and
// colliders are unchanged — this is all visual, no physics change.
import * as THREE from 'three';
import { PLACES, WORLD, PALETTE } from './config.js';

const FACADE_BASES = ['#b98a5e', '#c9a06a', '#a87f5f', '#8fa3a8', '#c2b49a', '#d08a6a', '#7a8a9a', '#b5a48a'];
const ROOF_COLORS = [0x5a4632, 0x6b4a3a, 0x4a4a55, 0x7a5a42];
const AWNING_COLORS = [0xd84a3a, 0x3a7bd8, 0xe8c33a, 0x3f8f4f, 0xf2f2f2];
const SIGN_COLORS = [0xffd36a, 0xff5a4a, 0x7ad7ff, 0x9dff8a];

function windowTexture(random, lit, base) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 16) {
    for (let x = 6; x < 58; x += 14) {
      const on = random.chance(lit ? 0.55 : 0.15);
      g.fillStyle = on ? '#ffd97a' : '#2c3444';
      g.fillRect(x, y, 9, 11);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function palmMesh() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 5.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a6a45 }),
  );
  trunk.position.y = 2.6;
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 5.4, Math.sin(a) * 1.1);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    g.add(leaf);
  }
  return g;
}

function umbrellaMesh(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
  );
  pole.position.y = 1.5;
  g.add(pole);
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 1.1, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  canopy.position.y = 3.2;
  g.add(canopy);
  return g;
}

export function buildCity(scene, random) {
  const colliders = [];
  const lamps = [];
  const palms = [];

  // Ground: city slab, then sand strip, then sea.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.SIZE * 2.2, WORLD.SIZE * 2.2),
    new THREE.MeshLambertMaterial({ color: 0x6f7d5a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.SIZE * 2.2, 90),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, WORLD.BEACH_Z + 22);
  scene.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.SIZE * 2.4, 260),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.0, WORLD.SEA_Z + 130);
  scene.add(sea);

  // Boardwalk along the beach front, between the city streets and the sand.
  const boardwalk = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.SIZE, 8),
    new THREE.MeshLambertMaterial({ color: 0x8a6a45 }),
  );
  boardwalk.rotation.x = -Math.PI / 2;
  boardwalk.position.set(0, 0.04, 258);
  scene.add(boardwalk);

  // Roads: dark strips along every grid line, with pale centre dashes.
  // NOTE (2026-11-20 screenshot pass): the two entries below were swapped —
  // [SIZE, STREET, v, 0] / [STREET, SIZE, 0, v] draws every road on top of
  // the same two central strips (x=0 and z=0), so the whole city read as
  // flat lawn with the car driving on grass. The grid is [SIZE, STREET, 0, v]
  // (east–west road at z=v) and [STREET, SIZE, v, 0] (north–south at x=v).
  // Same plane count, same cost, no physics change (roads are visual only).
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c98a });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const lines = [];
  for (let v = -288; v <= 288; v += WORLD.BLOCK) lines.push(v);
  for (const v of lines) {
    for (const [w, d, x, z] of [
      [WORLD.SIZE, WORLD.STREET, 0, v],
      [WORLD.STREET, WORLD.SIZE, v, 0],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.06, z);
      scene.add(road);
    }
    // Pale sidewalk strips along both edges of every road, so the asphalt
    // is framed instead of bleeding into the lawn.
    for (const off of [-10, 10]) {
      const walkEW = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.SIZE, 4), walkMat);
      walkEW.rotation.x = -Math.PI / 2;
      walkEW.position.set(0, 0.05, v + off);
      scene.add(walkEW);
      const walkNS = new THREE.Mesh(new THREE.PlaneGeometry(4, WORLD.SIZE), walkMat);
      walkNS.rotation.x = -Math.PI / 2;
      walkNS.position.set(v + off, 0.05, 0);
      scene.add(walkNS);
    }
    for (let t = -300; t <= 300; t += 32) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(v, 0.09, t);
      scene.add(dash);
    }
  }

  // Buildings: one per block, skipped on the beach, the plaza and the marina.
  // Four facade palettes (lit + unlit each) instead of one brown.
  const textures = [];
  for (const base of FACADE_BASES.slice(0, 4)) {
    textures.push(windowTexture(random, true, base));
    textures.push(windowTexture(random, false, base));
  }
  const skip = (cx, cz) => cz > 240 || (Math.abs(cx + 32) < 40 && Math.abs(cz - 32) < 40) || (cx > 190 && cz > 190);
  for (let bx = -288; bx < 288; bx += WORLD.BLOCK) {
    for (let bz = -288; bz < 288; bz += WORLD.BLOCK) {
      const cx = bx + 32;
      const cz = bz + 32;
      if (skip(cx, cz)) continue;
      // Height varies: a few towers, some low blocks, most mid-rise.
      const roll = random.next();
      const h = roll < 0.15 ? random.range(42, 56) : roll < 0.35 ? random.range(6, 10) : random.range(10, 42);
      const w = random.range(26, 40);
      const d = random.range(26, 40);
      const mat = new THREE.MeshLambertMaterial({ map: random.pick(textures) });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(cx, h / 2, cz);
      scene.add(b);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1, 0.8, d + 1),
        new THREE.MeshLambertMaterial({ color: random.pick(ROOF_COLORS) }),
      );
      roof.position.set(cx, h + 0.4, cz);
      scene.add(roof);
      // Rooftop props: AC box, water tank, antenna — rooflines stop being flat.
      if (random.chance(0.4)) {
        const ac = new THREE.Mesh(
          new THREE.BoxGeometry(3, 1.2, 2.4),
          new THREE.MeshLambertMaterial({ color: 0x9aa2ac }),
        );
        ac.position.set(cx + random.range(-w / 4, w / 4), h + 1.4, cz + random.range(-d / 4, d / 4));
        scene.add(ac);
      }
      if (random.chance(0.25)) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8),
          new THREE.MeshLambertMaterial({ color: 0x7a6a55 }),
        );
        tank.position.set(cx - w / 4, h + 2.1, cz - d / 4);
        scene.add(tank);
      }
      if (random.chance(0.2)) {
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 7, 5),
          new THREE.MeshLambertMaterial({ color: 0x2c2f36 }),
        );
        mast.position.set(cx + w / 4, h + 4.2, cz + d / 4);
        scene.add(mast);
      }
      // Shop awning + glowing sign on a random street-facing side.
      if (random.chance(0.5)) {
        const awn = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.6, 0.3, 2.6),
          new THREE.MeshLambertMaterial({ color: random.pick(AWNING_COLORS) }),
        );
        const side = random.int(0, 3);
        if (side === 0) awn.position.set(cx, 3.4, cz + d / 2 + 1.2);
        else if (side === 1) awn.position.set(cx, 3.4, cz - d / 2 - 1.2);
        else if (side === 2) { awn.rotation.y = Math.PI / 2; awn.position.set(cx + w / 2 + 1.2, 3.4, cz); }
        else { awn.rotation.y = Math.PI / 2; awn.position.set(cx - w / 2 - 1.2, 3.4, cz); }
        scene.add(awn);
      }
      if (random.chance(0.35)) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(2, 5, 0.4),
          new THREE.MeshLambertMaterial({ color: random.pick(SIGN_COLORS), emissive: random.pick(SIGN_COLORS), emissiveIntensity: 0.35 }),
        );
        const side = random.int(0, 3);
        if (side === 0) sign.position.set(cx + random.range(-w / 4, w / 4), 6, cz + d / 2 + 0.3);
        else if (side === 1) sign.position.set(cx + random.range(-w / 4, w / 4), 6, cz - d / 2 - 0.3);
        else if (side === 2) { sign.rotation.y = Math.PI / 2; sign.position.set(cx + w / 2 + 0.3, 6, cz); }
        else { sign.rotation.y = Math.PI / 2; sign.position.set(cx - w / 2 - 0.3, 6, cz); }
        scene.add(sign);
      }
      colliders.push({ x0: cx - w / 2 - 1, x1: cx + w / 2 + 1, z0: cz - d / 2 - 1, z1: cz + d / 2 + 1 });
      if (random.chance(0.35)) {
        const palm = palmMesh();
        palm.position.set(cx + w / 2 + 4, 0, cz + d / 2 + 4);
        scene.add(palm);
        palms.push(palm);
      }
    }
  }

  // Street clutter at a few intersections: planters and bins on the sidewalk
  // corners, never on the driving lanes.
  const planterMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const binMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  for (let i = 0; i < 14; i += 1) {
    const ix = random.pick(lines);
    const iz = random.pick(lines);
    if (Math.abs(ix + 32) < 40 && Math.abs(iz - 32) < 40) continue;
    if (iz > 240) continue;
    const planter = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), planterMat);
    planter.position.set(ix + 11, 0.5, iz + 11);
    scene.add(planter);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), binMat);
    bin.position.set(ix - 11, 0.5, iz + 11);
    scene.add(bin);
  }

  // Bus-stop shelter by the plaza.
  const shelterRoof = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.3, 3),
    new THREE.MeshLambertMaterial({ color: 0x3a7bd8 }),
  );
  shelterRoof.position.set(-48, 3.2, 48);
  scene.add(shelterRoof);
  for (const px of [-51, -45]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x2c2f36 }),
    );
    post.position.set(px, 1.6, 48);
    scene.add(post);
  }
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.7, 1),
    new THREE.MeshLambertMaterial({ color: 0x7a6248 }),
  );
  bench.position.set(-48, 0.6, 48.8);
  scene.add(bench);

  // Beach palms in a row along the sand.
  for (let x = -280; x <= 280; x += 40) {
    if (Math.abs(x - WORLD.LIGHTHOUSE.x) < 30) continue;
    const palm = palmMesh();
    palm.position.set(x + random.range(-6, 6), 0, WORLD.BEACH_Z + random.range(4, 26));
    scene.add(palm);
    palms.push(palm);
  }

  // Beach umbrellas on the sand, so the beach is a place, not an empty plane.
  const umbrellaColors = [0xd84a3a, 0x3a7bd8, 0xe8c33a, 0xf2f2f2, 0x3f8f4f];
  for (let i = 0; i < 6; i += 1) {
    const um = umbrellaMesh(umbrellaColors[i % umbrellaColors.length]);
    um.position.set(-240 + i * 80 + random.range(-8, 8), 0, 300 + (i % 2) * 12);
    scene.add(um);
  }

  // Lighthouse at the west end of the beach.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.6, 34, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2ede2 }),
  );
  tower.position.y = 17;
  lh.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.7, 3.9, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0xd84a3a }),
  );
  band.position.y = 22;
  lh.add(band);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffc94a, emissiveIntensity: 0.9 }),
  );
  lampRoom.position.y = 35;
  lh.add(lampRoom);
  lh.position.set(WORLD.LIGHTHOUSE.x, 0, WORLD.LIGHTHOUSE.z);
  scene.add(lh);
  colliders.push({ x0: -273, x1: -263, z0: 283, z1: 293 });

  // Marina piers + moored boats, some with masts and sails.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a6248 });
  for (const px of [200, 232, 264]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 34), pierMat);
    pier.position.set(px, 0.5, 252);
    scene.add(pier);
  }
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  for (let i = 0; i < 8; i += 1) {
    const boat = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 12), boatMat);
    boat.position.set(186 + i * 15, 1, 268 + (i % 2) * 8);
    scene.add(boat);
    if (i % 2 === 0) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 8, 5),
        new THREE.MeshLambertMaterial({ color: 0x2c2f36 }),
      );
      mast.position.set(186 + i * 15, 6, 268 + (i % 2) * 8);
      scene.add(mast);
      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 6, 3),
        new THREE.MeshLambertMaterial({ color: 0xffe9a8 }),
      );
      sail.position.set(186 + i * 15, 5, 268 + (i % 2) * 8 + 1.5);
      scene.add(sail);
    }
  }

  // Street lamps at intersections (glow spheres; light comes from the sun + lamps' emissive).
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffc94a, emissiveIntensity: 0.8 });
  for (let x = -256; x <= 256; x += 64) {
    for (let z = -256; z <= 256; z += 64) {
      if (random.chance(0.5)) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), poleMat);
      pole.position.set(x + 9, 3.5, z + 9);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(x + 9, 7.1, z + 9);
      scene.add(bulb);
      lamps.push(bulb);
    }
  }

  // Plaza fountain + benches at Plaza del Sol.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 1.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x9fb8c8 }),
  );
  fountain.position.set(-32, 0.6, 32);
  scene.add(fountain);
  for (const [bx, bz] of [[-20, 40], [-44, 24]]) {
    const b2 = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.7, 1),
      new THREE.MeshLambertMaterial({ color: 0x7a6248 }),
    );
    b2.position.set(bx, 0.6, bz);
    scene.add(b2);
  }

  return { colliders, lamps, palms, lighthouse: lh };
}

// Push a circle (x, z, radius) out of every building box it overlaps.
export function collideCircle(city, x, z, radius) {
  for (const c of city.colliders) {
    const nx = Math.max(c.x0, Math.min(x, c.x1));
    const nz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 0.0001) { x = c.x1 + radius; continue; }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * radius;
      z = nz + (dz / d) * radius;
    }
  }
  x = Math.max(-WORLD.HALF, Math.min(WORLD.HALF, x));
  z = Math.max(-WORLD.HALF, Math.min(WORLD.HALF + 40, z));
  return { x, z };
}

export function nearestStreetLabel(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const [key, p] of Object.entries(PLACES)) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < bestD) { bestD = d; best = p.label; }
  }
  return bestD < 40 ? best : 'Solano Bay · Open Streets';
}
