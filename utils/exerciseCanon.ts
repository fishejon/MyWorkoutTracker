import { EXERCISE_GROUPS } from '../constants';

// ─── Normalization ──────────────────────────────────────────────────────────

/** Strip all non-alphanumeric chars and lowercase. */
export const normalizeExerciseName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

// ─── Alias map ──────────────────────────────────────────────────────────────
// Every key is a normalized name; every value is the normalized canonical form.
// Canonical forms match the built-in library names after normalisation.

export const EXERCISE_ALIASES: Record<string, string> = {
  // ── Compound ────────────────────────────────────────────────────────────
  squat: 'barbellsquat',
  backsquat: 'barbellsquat',
  bbsquat: 'barbellsquat',
  squats: 'barbellsquat',
  benchpress: 'barbellbenchpress',
  flatbenchpress: 'barbellbenchpress',
  barbellbench: 'barbellbenchpress',
  flatbench: 'barbellbenchpress',
  bench: 'barbellbenchpress',
  bbbenchpress: 'barbellbenchpress',
  bbbench: 'barbellbenchpress',
  deadlift: 'conventionaldeadlift',
  barbelldeadlift: 'conventionaldeadlift',
  deadlifts: 'conventionaldeadlift',
  convdeadlift: 'conventionaldeadlift',
  overheadbarbellpress: 'overheadpress',
  ohp: 'overheadpress',
  militarypress: 'overheadpress',
  standingpress: 'overheadpress',
  shoulderpress: 'overheadpress',
  barbelloverheadpress: 'overheadpress',
  bbrow: 'barbellrow',
  bentoverrow: 'barbellrow',
  bentoverbbrow: 'barbellrow',
  barbellbentoverrow: 'barbellrow',
  cleanandpress: 'cleanandpress',
  cleanpress: 'cleanandpress',
  sumo: 'sumodeadlift',
  sumodeadlifts: 'sumodeadlift',
  powercleans: 'powerclean',
  frontsquats: 'frontsquat',

  // ── Chest ───────────────────────────────────────────────────────────────
  inclinedbpress: 'inclinedumbbellpress',
  inclinedbenchpress: 'inclinedumbbellpress',
  inclinedumbellpress: 'inclinedumbbellpress',
  dbinclinepress: 'inclinedumbbellpress',
  dbflyes: 'dumbbellflyes',
  dbflys: 'dumbbellflyes',
  dumbbellflys: 'dumbbellflyes',
  flyes: 'dumbbellflyes',
  flys: 'dumbbellflyes',
  pushup: 'pushups',
  pressups: 'pushups',
  chestdip: 'chestdips',
  cablecross: 'cablecrossover',
  cableflyes: 'cablecrossover',
  cablefly: 'cablecrossover',
  machinechestpress: 'machinechestpress',
  chestpress: 'machinechestpress',
  declinebench: 'declinebenchpress',
  declinebbpress: 'declinebenchpress',
  pecdeck: 'pecdeckfly',
  pecfly: 'pecdeckfly',
  pecdeckflye: 'pecdeckfly',

  // ── Back ─────────────────────────────────────────────────────────────────
  pullup: 'pullups',
  chinup: 'chinups',
  latpulldowns: 'latpulldown',
  latpulldown: 'latpulldown',
  latpull: 'latpulldown',
  seatedrow: 'seatedcablerow',
  cablerow: 'seatedcablerow',
  seatedrows: 'seatedcablerow',
  singlearmdumbbellrow: 'singlearmdumbbellrow',
  singlearmdbrow: 'singlearmdumbbellrow',
  onearmrow: 'singlearmdumbbellrow',
  onearmdbrow: 'singlearmdumbbellrow',
  dumbbellrow: 'singlearmdumbbellrow',
  dbrow: 'singlearmdumbbellrow',
  facepull: 'facepulls',
  facepulls: 'facepulls',
  hyperextension: 'backhyperextensions',
  hyperextensions: 'backhyperextensions',
  backextension: 'backhyperextensions',
  backextensions: 'backhyperextensions',
  tbarrows: 'tbarrow',
  straightarmpulldowns: 'straightarmpulldown',
  straightarmpulldown: 'straightarmpulldown',

  // ── Legs ─────────────────────────────────────────────────────────────────
  legpresses: 'legpress',
  lunge: 'lunges',
  walkinglunges: 'lunges',
  legextensions: 'legextension',
  legcurls: 'legcurl',
  hamstringcurl: 'legcurl',
  hamstringcurls: 'legcurl',
  standingcalfraises: 'calfraisesstanding',
  standingcalfraise: 'calfraisesstanding',
  standingcalves: 'calfraisesstanding',
  calfraise: 'calfraisesstanding',
  calfraises: 'calfraisesstanding',
  bulgariansplitsquat: 'bulgariansplitsquats',
  bss: 'bulgariansplitsquats',
  gobletsquat: 'gobletsquats',
  hacksquats: 'hacksquat',
  seatedcalfraise: 'calfraisesseated',
  seatedcalfraises: 'calfraisesseated',
  seatedcalves: 'calfraisesseated',
  stifflegdeadlifts: 'stifflegdeadlift',
  sldl: 'stifflegdeadlift',
  stifflegged: 'stifflegdeadlift',
  romaniandeadlift: 'rdl',
  rdls: 'rdl',
  romaniandeadlifts: 'rdl',
  hipthrusts: 'hipthrust',
  barbellhipthrust: 'hipthrust',
  glutebridge: 'hipthrust',

  // ── Shoulders ───────────────────────────────────────────────────────────
  lateralraise: 'lateralraises',
  sideraise: 'lateralraises',
  sideraises: 'lateralraises',
  dblateralraise: 'lateralraises',
  arnoldpresses: 'arnoldpress',
  frontraise: 'frontraises',
  dumbbellfrontraise: 'frontraises',
  uprightrows: 'uprightrow',
  reardeltfly: 'reardeltflyes',
  reardeltflye: 'reardeltflyes',
  reversefly: 'reardeltflyes',
  reverseflyes: 'reardeltflyes',
  reverseflys: 'reardeltflyes',
  smithpress: 'smithmachinepress',
  smithmachineohp: 'smithmachinepress',
  cablelateralraise: 'cablelateralraises',
  cablelateralraises: 'cablelateralraises',

  // ── Arms ─────────────────────────────────────────────────────────────────
  bicepcurl: 'bicepcurlsdumbbell',
  bicepcurls: 'bicepcurlsdumbbell',
  dumbbellcurl: 'bicepcurlsdumbbell',
  dumbbellcurls: 'bicepcurlsdumbbell',
  dbcurl: 'bicepcurlsdumbbell',
  dbcurls: 'bicepcurlsdumbbell',
  curlsdumbbell: 'bicepcurlsdumbbell',
  hammercurl: 'hammercurls',
  dbhammercurl: 'hammercurls',
  triceppushdown: 'triceppushdowns',
  ropepushdown: 'triceppushdowns',
  ropepushdowns: 'triceppushdowns',
  cablepushdown: 'triceppushdowns',
  skullcrusher: 'skullcrushers',
  lyingtricepextension: 'skullcrushers',
  lyingtricepextensions: 'skullcrushers',
  preachercurl: 'preachercurls',
  ezbarcurl: 'ezbarcurls',
  ezcurl: 'ezbarcurls',
  ezcurls: 'ezbarcurls',
  concentrationcurl: 'concentrationcurls',
  overheadtricepextension: 'overheadextension',
  overheadextensions: 'overheadextension',
  tricepoverheadextension: 'overheadextension',
  closegripbenchpress: 'closegripbench',
  cgbp: 'closegripbench',
  closegripbp: 'closegripbench',
  tricepkickback: 'tricepkickbacks',
  kickbacks: 'tricepkickbacks',
  kickback: 'tricepkickbacks',

  // ── Core ─────────────────────────────────────────────────────────────────
  planks: 'plank',
  hanginglegraise: 'hanginglegraises',
  legraises: 'hanginglegraises',
  legraise: 'hanginglegraises',
  russiantwist: 'russiantwists',
  crunch: 'crunches',
  situp: 'crunches',
  situps: 'crunches',
  abwheelrollout: 'abwheelrollouts',
  abwheel: 'abwheelrollouts',
  abroller: 'abwheelrollouts',
  deadbugs: 'deadbug',
  mountainclimber: 'mountainclimbers',
  woodchop: 'cablewoodchops',
  cablewoodchop: 'cablewoodchops',
  woodchops: 'cablewoodchops',

  // ── Cardio ──────────────────────────────────────────────────────────────
  run: 'running',
  treadmill: 'running',
  jogging: 'running',
  bike: 'cycling',
  stationarybike: 'cycling',
  row: 'rowing',
  rower: 'rowing',
  ergrowing: 'rowing',
  erg: 'rowing',
  jumprope: 'jumprope',
  skipping: 'jumprope',
  skiprope: 'jumprope',
  stairclimber: 'stairclimber',
  stairmaster: 'stairclimber',
  stairs: 'stairclimber',
  battlerope: 'battleropes',
  battleropes: 'battleropes',
  assaultbike: 'assaultbike',
  airbike: 'assaultbike',
  fanbike: 'assaultbike',
};

// ─── Canonical key ──────────────────────────────────────────────────────────

/** Return a stable canonical key for any exercise name. */
export const canonicalizeExercise = (name: string): string => {
  const normalized = normalizeExerciseName(name);
  return EXERCISE_ALIASES[normalized] ?? normalized;
};

// ─── Display-name resolution ────────────────────────────────────────────────
// Build a map from canonical key → preferred display name (from the built-in library).

const _canonToDisplay = new Map<string, string>();

for (const group of EXERCISE_GROUPS) {
  for (const ex of group.exercises) {
    const key = canonicalizeExercise(ex.name);
    if (!_canonToDisplay.has(key)) {
      _canonToDisplay.set(key, ex.name);
    }
  }
}

/**
 * Resolve a raw exercise name to its canonical display name.
 * Returns the built-in library name when a confident match exists,
 * otherwise returns the input unchanged.
 */
export const resolveDisplayName = (rawName: string): string => {
  const key = canonicalizeExercise(rawName);
  return _canonToDisplay.get(key) ?? rawName;
};

/**
 * Register additional display names at runtime (e.g. from expanded library).
 * Called automatically when constants are loaded, but can also be used for
 * custom exercises the user wants to treat as canonical.
 */
export const registerDisplayName = (canonKey: string, displayName: string): void => {
  if (!_canonToDisplay.has(canonKey)) {
    _canonToDisplay.set(canonKey, displayName);
  }
};
