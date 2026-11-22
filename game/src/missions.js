// The story: nine jobs across Solano Bay — eight staged story jobs plus the
// Solano Grand Prix, a street race run as timed checkpoints (G6: the one
// feature the #1 entry had that we did not). Each job is a list of stages; a
// stage is done when its check passes, or when its timer runs out (a survive
// stage completes on timeout, a delivery stage fails back to the job's first
// stage). Rewards land the moment the last stage completes. All names are
// original. The race reuses the same waypoint + timer machinery as the story
// jobs, so it needs no separate mode: its checkpoints are the city's own
// landmarks, and the beacon points at the next one.
import { PLACES, RACE_ROUTE } from './config.js';

function nearPlace(state, key, radius) {
  const p = PLACES[key];
  const px = state.player.x;
  const pz = state.player.z;
  const dx = px - p.x;
  const dz = pz - p.z;
  return dx * dx + dz * dz < radius * radius;
}

// Timed checkpoint steps for the Grand Prix, built from the race route.
function raceSteps() {
  const labels = {
    marina: 'RACE: Marina checkpoint — flat out, no brakes',
    hotel: 'RACE: Hotel Mirada checkpoint — thread the traffic',
    lighthouse: 'RACE: Lighthouse checkpoint — the crowd is watching',
    hideout: 'RACE: final sprint — Hideout finish line',
  };
  const timers = { marina: 120, hotel: 90, lighthouse: 120, hideout: 100 };
  const radii = { marina: 30, hotel: 26, lighthouse: 30, hideout: 26 };
  return RACE_ROUTE.map((key) => ({
    text: labels[key],
    place: key,
    timer: timers[key],
    onTimeout: 'fail',
    done: (s) => nearPlace(s, key, radii[key]),
  }));
}

export const MISSION_DEFS = [
  {
    name: 'Borrowed Keys', reward: 250, respect: 120,
    steps: [
      { text: 'Steal a car — press E near a parked car', done: (s) => s.flags.carStolen },
      { text: "Drive to Vela Garage on Harbor Rd", place: 'garage', done: (s) => nearPlace(s, 'garage', 26) },
    ],
  },
  {
    name: 'Sunset Delivery', reward: 400, respect: 140,
    steps: [
      { text: 'Pick up the package at Solano Marina', place: 'marina', done: (s) => nearPlace(s, 'marina', 26) },
      { text: 'Deliver to Hotel Mirada before the clock runs out', place: 'hotel', timer: 90, onTimeout: 'fail',
        done: (s) => nearPlace(s, 'hotel', 26) },
    ],
  },
  {
    name: 'Heat Wave', reward: 500, respect: 180,
    steps: [
      { text: 'Get the cops on you — steal a car or hit one', done: (s) => s.police.wanted >= 1 },
      { text: 'Outrun the heat — survive 60 seconds', timer: 60, survive: true, done: () => false },
    ],
  },
  {
    name: 'Diner Debt', reward: 650, respect: 200,
    steps: [
      { text: 'Meet Tia Lumen at the diner', place: 'diner', done: (s) => nearPlace(s, 'diner', 26) },
      { text: 'Hit Solano Trust Bank — reach the vault door', place: 'bank', done: (s) => nearPlace(s, 'bank', 26) },
      { text: 'Lose the tail — reach the Hideout', place: 'hideout', done: (s) => nearPlace(s, 'hideout', 26) },
    ],
  },
  {
    name: 'Lighthouse Run', reward: 800, respect: 240,
    steps: [
      { text: 'Pick up the crew at Plaza del Sol', place: 'plaza', done: (s) => nearPlace(s, 'plaza', 26) },
      { text: 'Drive the crew to the Lighthouse', place: 'lighthouse', done: (s) => nearPlace(s, 'lighthouse', 30) },
      { text: 'Race back to the Hideout before dawn', place: 'hideout', timer: 100, onTimeout: 'fail',
        done: (s) => nearPlace(s, 'hideout', 26) },
    ],
  },
  {
    name: 'Casino Skim', reward: 1000, respect: 280,
    steps: [
      { text: 'Lift the Tarpon Coupe outside Casino Marea', place: 'casino', done: (s) => s.flags.carStolen && nearPlace(s, 'casino', 30) },
      { text: 'Deliver the coupe to Vela Garage', place: 'garage', timer: 90, onTimeout: 'fail',
        done: (s) => nearPlace(s, 'garage', 26) },
    ],
  },
  {
    name: 'Ghost Plates', reward: 1200, respect: 320,
    steps: [
      { text: 'Get 2 stars of heat, then call Mira (Z) to swap plates', done: (s) => s.police.wanted >= 2 },
      { text: 'With plates swapped, reach the Marina unseen', place: 'marina', done: (s) => nearPlace(s, 'marina', 26) && s.police.wanted === 0 },
    ],
  },
  {
    name: 'Golden Hour', reward: 2500, respect: 500,
    steps: [
      { text: 'Meet Sol Marin at the Lighthouse', place: 'lighthouse', done: (s) => nearPlace(s, 'lighthouse', 30) },
      { text: 'Cross Tarpon Bridge with the keys', place: 'bridge', timer: 75, onTimeout: 'fail',
        done: (s) => nearPlace(s, 'bridge', 26) },
      { text: 'Bring the keys home — Hideout', place: 'hideout', done: (s) => nearPlace(s, 'hideout', 26) },
    ],
  },
  {
    name: 'Solano Grand Prix', reward: 1500, respect: 400,
    steps: raceSteps(),
  },
];

export function createMissions() {
  return { index: 0, step: 0, timer: 0, stepTimerFor: -1 };
}

export function currentMission(missions) {
  return MISSION_DEFS[missions.index] || null;
}

export function currentStep(missions) {
  const mission = currentMission(missions);
  return mission ? mission.steps[missions.step] : null;
}

export function currentObjective(missions) {
  const mission = currentMission(missions);
  if (!mission) return 'Free roam — Solano Bay is yours';
  const step = mission.steps[missions.step];
  return step ? step.text : mission.name;
}

export function missionProgress(missions) {
  const mission = currentMission(missions);
  if (!mission) return { index: MISSION_DEFS.length, total: MISSION_DEFS.length, step: 0, steps: 0 };
  return { index: missions.index, total: MISSION_DEFS.length, step: missions.step, steps: mission.steps.length };
}

function banner(state, text, sub) {
  state.banners.push({ text, sub: sub || '', t: 0, dur: 3.5 });
}

export function stepMissions(state, dt) {
  const missions = state.missions;
  const mission = currentMission(missions);
  if (!mission) return;
  const step = mission.steps[missions.step];
  if (!step) return;
  if (step.timer !== undefined && missions.timer <= 0 && missions.stepTimerFor !== missions.step) {
    missions.timer = step.timer;
    missions.stepTimerFor = missions.step;
  }
  if (step.timer !== undefined) {
    const ticking = step.tick ? step.tick(state) : true;
    if (ticking) missions.timer -= dt;
    if (missions.timer <= 0) {
      if (step.survive) { completeStep(state, mission); return; }
      if (step.onTimeout === 'fail') {
        missions.step = 0;
        missions.timer = 0;
        missions.stepTimerFor = -1;
        banner(state, 'TOO SLOW', 'The job fell through — try again from the start');
        return;
      }
    }
  }
  if (step.done(state)) completeStep(state, mission);
}

function completeStep(state, mission) {
  const missions = state.missions;
  missions.step += 1;
  missions.timer = 0;
  missions.stepTimerFor = -1;
  state.flags.missionJingle = true;
  if (missions.step >= mission.steps.length) {
    state.money += mission.reward;
    state.respect += mission.respect;
    state.stats.earned += mission.reward;
    state.stats.jobsDone += 1;
    banner(state, `${mission.name.toUpperCase()} COMPLETE`, `+$${mission.reward} · +${mission.respect} respect`);
    missions.index += 1;
    missions.step = 0;
    if (missions.index >= MISSION_DEFS.length) {
      banner(state, 'SOLANO BAY IS YOURS', 'All 9 jobs done — free roam, Sunset King');
    }
  }
}
