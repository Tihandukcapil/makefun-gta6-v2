// The HUD: every panel from the winning pattern, all driven by live game state.
// Mission banner, Bay Patrol dispatch, weapon slots, money + stars + clock,
// health/armor/respect bars, dialogue box, speed + vehicle + condition, radio.
// The job total comes from the mission list (9 now, with the Grand Prix), so
// the free-roam text never hardcodes the old count of 8 again.
import { CREW, PLACES, RANKS, RADIO, WEAPONS, WEAPON_UNLOCK } from './config.js';
import { currentMission, currentStep, missionProgress } from './missions.js';
import { CHARACTERS } from './dialogue.js';
import { nearestStreetLabel } from './world.js';

function el(id) { return document.getElementById(id); }

function rankFor(respect) {
  let rank = RANKS[0];
  let next = null;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (respect >= RANKS[i].at) { rank = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  return { rank, next };
}

function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createHud(minimap) {
  let lastDialogue = '';
  let lastBanner = '';

  function update(state) {
    const p = missionProgress(state.missions);
    const mission = currentMission(state.missions);
    const step = currentStep(state.missions);
    // Mission banner (top-left).
    const banner = el('mission-banner');
    if (mission) {
      banner.style.display = 'block';
      el('mission-title').textContent = `JOB ${p.index + 1}/${p.total} · ${mission.name.toUpperCase()}`;
      el('mission-objective').textContent = step ? step.text : '';
      el('mission-stage').textContent = `STAGE ${p.step + 1}/${p.steps}`;
      el('mission-stage-fill').style.width = `${Math.round(((p.step) / Math.max(1, p.steps)) * 100)}%`;
      const timer = el('mission-timer');
      if (step && step.timer !== undefined) {
        timer.style.display = 'inline';
        const left = Math.max(0, Math.ceil(state.missions.timer));
        timer.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
        timer.classList.toggle('urgent', left <= 15);
      } else timer.style.display = 'none';
      const next = mission.steps[p.step + 1];
      el('mission-next').textContent = next ? `NEXT: ${next.text}` : 'NEXT: Job complete — collect your pay';
    } else {
      el('mission-title').textContent = `FREE ROAM · ALL ${p.total} JOBS DONE`;
      el('mission-objective').textContent = 'Solano Bay is yours — Sunset King';
      el('mission-stage').textContent = `STAGE ${p.total}/${p.total}`;
      el('mission-stage-fill').style.width = '100%';
      el('mission-timer').style.display = 'none';
      el('mission-next').textContent = 'NEXT: Cruise the beach, grow your garage';
    }

    // Dispatch panel (left).
    const dispatch = el('dispatch-list');
    const cops = state.police.cops;
    el('dispatch-count').textContent = `${cops.length} UNIT${cops.length === 1 ? '' : 'S'}`;
    let html = '';
    for (const cop of cops.slice(0, 5)) {
      html += `<div class="dispatch-row"><span class="unit">${cop.unitName || 'UNIT'}</span><span class="dist">${Math.round(cop.dist || 0)}m</span><span class="status">${cop.status || 'PURSUIT'}</span></div>`;
    }
    if (cops.length > 5) html += `<div class="dispatch-row more">+${cops.length - 5} more units responding</div>`;
    if (state.police.heli) html += '<div class="dispatch-row air">AIR ONE · SPOTLIGHT ON SUSPECT</div>';
    if (state.police.roadblock) html += '<div class="dispatch-row roadblock">ROADBLOCK · MAREA BLVD</div>';
    if (!html) html = '<div class="dispatch-row calm">No units responding — the Bay is quiet</div>';
    dispatch.innerHTML = html;

    // Weapon slots (top-right).
    const slots = el('weapon-slots');
    let whtml = '';
    WEAPONS.forEach((w, i) => {
      const locked = state.missions.index < WEAPON_UNLOCK[i];
      const ammo = w.ammo === Infinity ? '∞' : String(state.ammo[i]);
      whtml += `<div class="weapon-slot ${i === state.weapon ? 'active' : ''} ${locked ? 'locked' : ''}"><span class="wkey">${i + 1}</span><span class="wname">${locked ? 'LOCKED' : w.name}</span><span class="wammo">${locked ? '—' : ammo}</span></div>`;
    });
    slots.innerHTML = whtml;

    // Money, wanted stars, clock.
    el('money').textContent = `$${state.money.toLocaleString('en-US')}`;
    const stars = el('stars');
    stars.innerHTML = '';
    for (let i = 0; i < 5; i += 1) {
      const s = document.createElement('span');
      s.className = `star ${i < state.police.wanted ? 'lit' : ''}`;
      s.textContent = '★';
      stars.appendChild(s);
    }
    el('clock').textContent = fmtClock(state.clockMinutes);
    el('day').textContent = `DAY ${state.day}`;
    el('heat-flag').textContent = state.police.wanted >= 3 ? 'AIR UNIT DEPLOYED' : state.police.wanted > 0 ? 'IN SIGHT' : '';

    // Crew chips.
    const crew = el('crew-chips');
    let chtml = '';
    CREW.forEach((c, i) => {
      const cd = Math.ceil(state.crewCooldown[i]);
      chtml += `<div class="crew-chip ${cd > 0 ? 'cooling' : ''}"><b>${c.ability}</b> — ${c.name} · ${cd > 0 ? `${cd}s` : 'READY'} <span class="key">[${'ZXC'[i]}]</span></div>`;
    });
    crew.innerHTML = chtml;

    // Bars: health, armor, respect.
    el('health-fill').style.width = `${Math.max(0, state.health)}%`;
    el('armor-fill').style.width = `${Math.max(0, state.armor)}%`;
    const { rank, next } = rankFor(state.respect);
    const base = rank.at;
    const span = next ? next.at - base : 500;
    el('respect-fill').style.width = `${Math.min(100, Math.round(((state.respect - base) / span) * 100))}%`;
    el('respect-label').textContent = `RESPECT · ${rank.name} ${state.respect}/${next ? next.at : state.respect}`;
    el('location-label').textContent = nearestStreetLabel(state.player.x, state.player.z);

    // Dialogue box.
    const d = state.dialogue;
    const key = d ? `${d.who}:${d.line}` : '';
    if (key !== lastDialogue) {
      lastDialogue = key;
      const box = el('dialogue-box');
      if (d) {
        const ch = CHARACTERS[d.who] || CHARACTERS.jax;
        box.style.display = 'flex';
        el('dialogue-portrait').textContent = ch.initial;
        el('dialogue-portrait').style.background = ch.color;
        el('dialogue-name').textContent = ch.name;
        el('dialogue-role').textContent = ch.role;
        el('dialogue-line').textContent = d.line;
      } else box.style.display = 'none';
    }

    // Speed + vehicle + condition.
    const car = state.car;
    el('speed').textContent = car ? String(Math.round(Math.abs(car.speed) * 2.2)) : String(Math.round(state.player.walkSpeed * 2.2));
    el('speed-unit').textContent = 'KM/H';
    el('vehicle-name').textContent = car ? car.name.toUpperCase() : 'ON FOOT · SOLANO BAY';
    el('condition-fill').style.width = `${car ? Math.max(0, car.condition) : 100}%`;
    el('condition-label').textContent = car ? `CONDITION ${Math.round(car.condition)}%` : 'ON FOOT';

    // Radio.
    el('radio-line').textContent = `${state.radioName} — ${state.radioShow}`;

    // Center banner (job complete / busted / wasted).
    const b = state.banners[0];
    const center = el('center-banner');
    if (b) {
      const bkey = `${b.text}:${b.sub}`;
      if (bkey !== lastBanner) {
        lastBanner = bkey;
        center.style.display = 'block';
        el('center-title').textContent = b.text;
        el('center-sub').textContent = b.sub;
      }
    } else {
      lastBanner = '';
      center.style.display = 'none';
    }

    // Minimap.
    minimap.draw(state);
  }

  return { update };
}
