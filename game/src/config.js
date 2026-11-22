// Sunset Keys — Solano Bay tuning, rebuilt for the v2 replay. Every number
// the rest of the game shares lives here so a tweak lands in one place.
// 9 jobs now: 8 story jobs plus the Solano Grand Prix street race (job 9).
export const WORLD = {
  SIZE: 640,
  HALF: 320,
  BLOCK: 64,
  STREET: 16,
  BEACH_Z: 268,
  SEA_Z: 300,
  LIGHTHOUSE: { x: -268, z: 288 },
};

export const PLACES = {
  hideout:   { x: -96,  z: -96,  label: 'Hideout · Coral Row' },
  garage:    { x: 96,   z: -32,  label: 'Vela Garage · Harbor Rd' },
  marina:    { x: 224,  z: 224,  label: 'Solano Marina' },
  plaza:     { x: -32,  z: 32,   label: 'Plaza del Sol' },
  hotel:     { x: 160,  z: -160, label: 'Hotel Mirada' },
  diner:     { x: -160, z: 96,   label: 'Tia Lumen Diner' },
  lighthouse:{ x: -268, z: 288,  label: 'Solano Lighthouse' },
  policeHq:  { x: 224,  z: -224, label: 'Bay Patrol HQ' },
  bank:      { x: 32,   z: -224, label: 'Solano Trust Bank' },
  bridge:    { x: 0,    z: 268,  label: 'Tarpon Bridge' },
  casino:    { x: 224,  z: 96,   label: 'Casino Marea' },
  beach:     { x: 96,   z: 292,  label: 'Solano Beach' },
};

export const STREETS = [
  'Coral Row', 'Harbor Rd', 'Plaza del Sol', 'Mirada Ave', 'Tarpon Bridge',
  'Lumen St', 'Marea Blvd', 'Palma Way', 'Solano Strand', 'Cayo Lane',
];

export const CAR = {
  ACCEL: 34,
  BRAKE: 55,
  REVERSE: 16,
  MAX_SPEED: 52,
  MAX_REVERSE: 14,
  TURN: 2.1,
  GRIP: 0.92,
};

export const ONFOOT = { WALK: 7, SPRINT: 11, TURN: 7 };

export const WANTED = { MAX: 5, PER_STAR: 40, DECAY: 1.6, STEAL: 65, HIT_PED: 30, SHOOT: 55, RAM_COP: 25 };

export const WEAPONS = [
  { id: 'fists',   name: 'FISTS',       ammo: Infinity, damage: 12 },
  { id: 'pistol',  name: 'K-9 PISTOL',  ammo: 48,  damage: 25 },
  { id: 'smg',     name: 'TIDE SMG',    ammo: 120, damage: 16 },
  { id: 'shotgun', name: 'REEF-12',     ammo: 24,  damage: 55 },
  { id: 'rifle',   name: 'SOL-9 RIFLE', ammo: 90,  damage: 34 },
  { id: 'molotov', name: 'EMBER BOTTLE',ammo: 6,   damage: 60 },
  { id: 'launcher',name: 'SKYBREAK',    ammo: 3,   damage: 120 },
];
export const WEAPON_UNLOCK = [0, 0, 1, 2, 3, 5, 7];

export const RANKS = [
  { at: 0,    name: 'DOCK HAND' },
  { at: 250,  name: 'FIXER' },
  { at: 700,  name: 'SHOT CALLER' },
  { at: 1500, name: 'BAY BOSS' },
  { at: 3000, name: 'SUNSET KING' },
];

export const CREW = [
  { id: 'mira', name: 'MIRA VOSS', role: 'DRIVER',   ability: 'SWAP PLATES', desc: 'Drops 1 wanted star', cooldown: 45 },
  { id: 'lio',  name: 'LIO FERRAN',role: 'MECHANIC', ability: 'QUICK FIX',   desc: 'Repairs car to full', cooldown: 40 },
  { id: 'kiki', name: 'KIKI SOL',  role: 'LOOKOUT',  ability: 'EYES OUT',    desc: 'Marks all police on map', cooldown: 30 },
];

export const RADIO = [
  { name: 'SOLANO FM 98.6', show: 'Golden Hour Drive' },
  { name: 'MAREA FM 101.2', show: 'Neon Tideline' },
  { name: 'PALMA FM 88.4',  show: 'Sunset Static' },
];

export const VEHICLE_NAMES = [
  'Veloz Comet RS', 'Calyx Sprint GT', 'Rukan Pelo GT', 'Marea Cruiser',
  'Solano Sunrunner', 'Cayo Pickup', 'Lumen Taxi', 'Harbor Van', 'Tarpon Coupe',
];

// The Grand Prix route: the four checkpoints of the street-race job, in order.
export const RACE_ROUTE = ['marina', 'hotel', 'lighthouse', 'hideout'];

export const PALETTE = {
  sky: 0xff9a56, sun: 0xffd27a, sea: 0x2e6f8e, sand: 0xe8c98a,
  road: 0x3a3f4a, sidewalk: 0x8d8578, building: 0xcaa27e, glass: 0xffe9a8,
  cop: 0x1e5fd6, copWhite: 0xf2f2f2, heli: 0x22303c,
};

export const SAVE_KEY = 'sunset-keys.save.v1';
