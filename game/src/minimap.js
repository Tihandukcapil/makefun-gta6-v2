// The circular minimap: a 2D canvas that draws the street grid, the beach and
// sea, the mission beacon, police blips, traffic dots and the player arrow —
// all from live game state, never a static picture.
import { PLACES, WORLD } from './config.js';
import { currentStep } from './missions.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const R = 320; // world half-size maps to the canvas radius

  function draw(state) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (w / 2 - 6) / R;
    const px = (x) => cx + x * scale;
    const py = (z) => cy + z * scale;
    ctx.clearRect(0, 0, w, h);
    // Disc background.
    ctx.fillStyle = '#1c2430';
    ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.clip();
    // Sea + sand at the south edge.
    ctx.fillStyle = '#2e6f8e';
    ctx.fillRect(0, py(268), w, h - py(268));
    ctx.fillStyle = '#e8c98a';
    ctx.fillRect(0, py(262), w, py(300) - py(262));
    // Streets.
    ctx.strokeStyle = '#4a5262';
    ctx.lineWidth = 4;
    for (let v = -288; v <= 288; v += 64) {
      ctx.beginPath(); ctx.moveTo(px(v), py(-320)); ctx.lineTo(px(v), py(320)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(-320), py(v)); ctx.lineTo(px(320), py(v)); ctx.stroke();
    }
    // Mission beacon.
    const step = currentStep(state.missions);
    if (step && step.place) {
      const p = PLACES[step.place];
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath(); ctx.arc(px(p.x), py(p.z), 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px(p.x), py(p.z), 11, 0, Math.PI * 2); ctx.stroke();
    }
    // Police blips (blue) — always shown when Eyes Out is active, else only close ones.
    for (const cop of state.police.cops) {
      const d = Math.hypot(cop.x - state.player.x, cop.z - state.player.z);
      if (!state.flags.eyesOut && d > 120) continue;
      ctx.fillStyle = '#3a8cff';
      ctx.beginPath(); ctx.arc(px(cop.x), py(cop.z), 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // Traffic dots.
    ctx.fillStyle = '#c8cdd6';
    for (const car of state.traffic.cars) {
      ctx.fillRect(px(car.x) - 1.5, py(car.z) - 1.5, 3, 3);
    }
    // Player arrow.
    ctx.save();
    ctx.translate(px(state.player.x), py(state.player.z));
    ctx.rotate(state.player.heading);
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Ring.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  }

  return { draw };
}
