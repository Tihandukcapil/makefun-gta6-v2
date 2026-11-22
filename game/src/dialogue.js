// Solano Bay's people: who they are, what they say, and when they say it.
// All names, roles and lines are original to Sunset Keys.
export const CHARACTERS = {
  jax:   { name: 'JAX REYES',   role: 'NEW KID · DRIVER',   color: '#ffd36a', initial: 'J' },
  mira:  { name: 'MIRA VOSS',   role: 'DRIVER · CREW',      color: '#7ad7ff', initial: 'M' },
  lio:   { name: 'LIO FERRAN',  role: 'MECHANIC · CREW',    color: '#9dff8a', initial: 'L' },
  kiki:  { name: 'KIKI SOL',    role: 'LOOKOUT · CREW',     color: '#ff9ad5', initial: 'K' },
  lumen: { name: 'TIA LUMEN',   role: 'DINER OWNER · FAMILY', color: '#ffb37a', initial: 'T' },
  vance: { name: 'CAPT. VANCE', role: 'BAY PATROL DISPATCH', color: '#8ab4ff', initial: 'V' },
  sol:   { name: 'SOL MARIN',   role: 'FIXER · THE KEYS',   color: '#ffe27a', initial: 'S' },
  ren:   { name: 'REN CALIX',   role: 'SMUGGLER · WHEELMAN', color: '#c9a8ff', initial: 'R' },
};

export const DIALOGUE = {
  intro: [
    { who: 'sol',   line: 'Solano Bay runs on keys, Jax. Every car, every door, every deal — somebody holds the keys.' },
    { who: 'jax',   line: 'Then I take the keys. One job at a time, Sol.' },
    { who: 'mira',  line: 'You drive like my grandma, new kid. Prove it on the street and maybe I ride with you.' },
  ],
  jobStart: {
    0: [{ who: 'lio', line: 'Borrow a car, any car. E is your best friend out here. Bring it to my garage.' }],
    1: [{ who: 'kiki', line: 'Package at the Marina. Hotel Mirada wants it before the clock dies. No stops, no selfies.' }],
    2: [{ who: 'vance', line: 'All units, suspect on the run in Solano Bay. Box him in — roadblocks on Marea Blvd.' }],
    3: [{ who: 'lumen', line: 'My diner, my rules, Jax. The bank took my keys once. Tonight we take them back.' }],
    4: [{ who: 'ren', line: 'The lighthouse run is cursed, kid. Three crews tried it. Bring the crew, bring the nerve.' }],
    5: [{ who: 'sol', line: 'The casino skim rides in a Tarpon Coupe. Lift it clean and nobody has to know your name.' }],
    6: [{ who: 'mira', line: 'Swap plates on my mark and the whole city forgets your face. That is the job, Jax.' }],
    7: [{ who: 'sol', line: 'Last key, Jax. The Sunset Keys open every door in Solano Bay. Drive like the sun is chasing you.' }],
    8: [{ who: 'ren', line: 'Grand Prix tonight, Jax. Four checkpoints, one winner, no brakes. The whole Bay is betting against you.' }],
  },
  jobDone: {
    0: [{ who: 'lio', line: 'Clean steal. She purrs already. You are not hopeless, new kid.' }],
    1: [{ who: 'kiki', line: 'Delivered with seconds to spare. The hotel owes us now.' }],
    2: [{ who: 'mira', line: 'They never even saw your plates. That is how you lose a tail.' }],
    3: [{ who: 'lumen', line: 'For the diner. For family. You did good, Jax.' }],
    4: [{ who: 'ren', line: 'Lighthouse run, done. The Bay is talking about you now.' }],
    5: [{ who: 'sol', line: 'The skim is ours. The casino will not miss it till morning.' }],
    6: [{ who: 'mira', line: 'Plates swapped, heat gone. Ghost mode, baby.' }],
    7: [{ who: 'sol', line: 'Every key in Solano Bay is yours now, Sunset King. The city is yours.' }],
    8: [{ who: 'sol', line: 'Grand Prix champion. You outran the whole Bay — the Sunset Keys are yours, kid.' }],
  },
  chase: [
    { who: 'vance', line: 'Air One is over the suspect. Spotlight on him — do not let him reach the bridge!' },
    { who: 'vance', line: 'Units, ram the suspect vehicle. I want him stopped before the beach.' },
  ],
  busted: [{ who: 'vance', line: 'Suspect in custody. Bay Patrol thanks you for your cooperation, Jax.' }],
  wasted: [{ who: 'sol', line: 'Jax! Get up. Solano Bay does not bury its keys that easy.' }],
  idle: [
    { who: 'kiki', line: 'Plaza del Sol is quiet tonight. Too quiet. Something is moving.' },
    { who: 'lio', line: 'Your ride is holding up. Bring her by the garage and I will tune her for free.' },
  ],
};

export function dialogueFor(missionIndex, kind) {
  const table = DIALOGUE[kind];
  if (!table) return DIALOGUE.idle[0];
  if (Array.isArray(table)) return table[missionIndex % table.length];
  return (table[missionIndex] || DIALOGUE.idle)[0];
}

// The dialogue driver main.js holds: intro() and idle() cycle their lines so
// the crew keeps talking instead of repeating one line.
export function createDialogue() {
  let introIdx = 0;
  let idleIdx = 0;
  return {
    intro() { const d = DIALOGUE.intro[introIdx % DIALOGUE.intro.length]; introIdx += 1; return d; },
    idle() { const d = DIALOGUE.idle[idleIdx % DIALOGUE.idle.length]; idleIdx += 1; return d; },
    jobStart(i) { return dialogueFor(i, 'jobStart'); },
    jobDone(i) { return dialogueFor(i, 'jobDone'); },
  };
}
