// Headless checks: ?selftest=1 runs a real smoke test of the mission logic
// and reports window.__selftest. The race job is driven through its four
// checkpoints with the same stepMissions() the live game uses — placing the
// player at each checkpoint and stepping — so a pass means the race is
// actually completable, not just defined. Same for story job 0 and for the
// race's timeout failure. No rendering is involved; this tests logic.
import { MISSION_DEFS, createMissions, stepMissions, missionProgress } from './missions.js';
import { PLACES } from './config.js';

function freshTestState(state, money) {
  return {
    ...state,
    missions: createMissions(),
    money: money || 0,
    respect: 0,
    banners: [],
    flags: { ...state.flags },
    stats: { earned: 0, jobsDone: 0, busted: 0, wasted: 0, shotsFired: 0 },
    player: { x: 0, z: 0, heading: 0, onFoot: false, walkSpeed: 0 },
    police: { ...state.police, heat: 0, wanted: 0 },
  };
}

export function spawnTestTraffic(state, stage) {
  return state.traffic.cars.length;
}

export function spawnTestPed(state, stage) {
  return state.traffic.peds.length;
}

export function simulate(state, stage, steps) {
  const log = [];
  for (let i = 0; i < steps; i += 1) {
    log.push({ step: i, x: state.player.x, z: state.player.z, money: state.money });
  }
  return log;
}

export function selfTest(state) {
  const results = { ok: true, checks: [] };
  function check(name, pass) {
    results.checks.push({ name, pass: !!pass });
    if (!pass) results.ok = false;
  }
  check('9 jobs defined', MISSION_DEFS.length === 9);
  check('race job is 9th', MISSION_DEFS[8].name === 'Solano Grand Prix');
  check('race has 4 checkpoints', MISSION_DEFS[8].steps.length === 4);
  check('race checkpoints are timed', MISSION_DEFS[8].steps.every((s) => s.timer !== undefined));
  check('race checkpoints are the city route', MISSION_DEFS[8].steps.map((s) => s.place).join(',') === 'marina,hotel,lighthouse,hideout');
  check('HUD job total is 9', missionProgress(createMissions()).total === 9);
  check('traffic cars exist', state.traffic.cars.length === 10);
  check('peds exist', state.traffic.peds.length === 14);

  // Race job: drive it checkpoint by checkpoint through the real step logic.
  const race = freshTestState(state, 0);
  race.missions.index = 8;
  for (const key of ['marina', 'hotel', 'lighthouse', 'hideout']) {
    race.player.x = PLACES[key].x;
    race.player.z = PLACES[key].z;
    stepMissions(race, 0.1);
  }
  check('race completes at the hideout', race.missions.index === 9);
  check('race pays $1500', race.money === 1500);
  check('race pays 400 respect', race.respect === 400);
  check('race counts as a job done', race.stats.jobsDone === 1);

  // Race timeout: dawdle 200 s on the first checkpoint and the job resets.
  const slow = freshTestState(state, 0);
  slow.missions.index = 8;
  stepMissions(slow, 200);
  check('race timeout resets to step 0', slow.missions.step === 0 && slow.missions.index === 8);

  // Story job 0: steal a car, then reach the garage — the real first job.
  const story = freshTestState(state, 0);
  story.flags.carStolen = true;
  stepMissions(story, 0.1);
  check('job 0 step 1 reached after stealing', story.missions.step === 1);
  story.player.x = PLACES.garage.x;
  story.player.z = PLACES.garage.z;
  stepMissions(story, 0.1);
  check('job 0 completes at the garage', story.missions.index === 1);
  check('job 0 pays $250', story.money === 250);
  return results;
}
