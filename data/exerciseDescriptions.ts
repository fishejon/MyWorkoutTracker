/**
 * Short "how-to" descriptions for exercises.
 * Keyed by the normalised canonical name (lowercase, no special chars)
 * so look-ups work regardless of casing or alias used.
 */

export const EXERCISE_DESCRIPTIONS: Record<string, { steps: string[]; tips?: string[] }> = {
  // ── Compound ──────────────────────────────────────────────────────────
  barbellsquat: {
    steps: [
      'Place barbell across upper traps. Feet shoulder-width, toes slightly out.',
      'Brace core, push hips back and bend knees to lower until thighs are at least parallel.',
      'Drive through the whole foot to stand back up.',
    ],
    tips: ['Keep chest up and knees tracking over toes.', 'Inhale on the way down, exhale on the way up.'],
  },
  conventionaldeadlift: {
    steps: [
      'Stand mid-foot under the bar. Hips hinge back, grip just outside knees.',
      'Flatten back, brace core, and push the floor away with your legs.',
      'Lock out hips and knees together at the top.',
    ],
    tips: ['Bar should stay in contact with your legs.', 'Avoid rounding the lower back.'],
  },
  barbellbenchpress: {
    steps: [
      'Lie on bench, eyes under bar. Grip slightly wider than shoulder-width.',
      'Unrack, lower the bar to mid-chest with elbows at ~45°.',
      'Press up until arms are fully extended.',
    ],
    tips: ['Retract shoulder blades and arch slightly.', 'Keep feet flat on the floor.'],
  },
  overheadpress: {
    steps: [
      'Grip barbell at shoulder width, bar resting on front delts.',
      'Brace core, press bar straight overhead until arms lock out.',
      'Lower under control back to the starting position.',
    ],
    tips: ['Squeeze glutes to protect the lower back.', 'Move your head out of the bar path, not the bar around your head.'],
  },
  barbellrow: {
    steps: [
      'Hinge at hips ~45°, grip bar just outside knees.',
      'Pull bar to lower chest / upper abdomen, squeezing shoulder blades.',
      'Lower under control, maintaining hip hinge.',
    ],
    tips: ['Avoid using momentum.', 'Keep the neck neutral.'],
  },
  frontsquat: {
    steps: [
      'Rest barbell on front delts with elbows high (clean grip or cross-arm).',
      'Squat down keeping torso as upright as possible.',
      'Drive up through the whole foot.',
    ],
    tips: ['If wrist mobility is limited, use straps looped around the bar.'],
  },
  sumodeadlift: {
    steps: [
      'Take a wide stance, toes pointed out. Grip bar inside the knees.',
      'Drop hips, chest up, brace core.',
      'Push through feet spreading the floor, lock out at the top.',
    ],
  },
  powerclean: {
    steps: [
      'Start in a deadlift position, bar over mid-foot.',
      'Pull the bar explosively, shrug, then drop under and catch on front delts.',
      'Stand up to finish the lift.',
    ],
    tips: ['Keep the bar close to the body.', 'Speed matters more than weight when learning.'],
  },
  trapbardeadlift: {
    steps: [
      'Step inside the trap bar, grip the handles at your sides.',
      'Hinge hips, brace core, and stand up by driving through the floor.',
      'Lower back down under control.',
    ],
    tips: ['More quad-friendly than conventional deadlift.', 'Great for beginners.'],
  },
  pushpress: {
    steps: [
      'Start with bar on front delts, similar to overhead press setup.',
      'Dip knees slightly, then explosively drive the bar overhead.',
      'Lock out arms, then lower the bar back to shoulders.',
    ],
  },
  hangclean: {
    steps: [
      'Hold barbell at hip height with an overhand grip.',
      'Dip slightly, then explosively shrug and pull, catching on front delts.',
      'Stand to full extension.',
    ],
  },
  thrusters: {
    steps: [
      'Hold barbell in a front squat position.',
      'Squat to full depth, then drive up explosively and press the bar overhead in one fluid motion.',
      'Lower bar back to shoulders and repeat.',
    ],
  },

  // ── Chest ─────────────────────────────────────────────────────────────
  inclinedumbbellpress: {
    steps: [
      'Set bench to 30–45°. Hold dumbbells above chest, palms forward.',
      'Lower dumbbells to chest level with controlled motion.',
      'Press back up to full extension.',
    ],
    tips: ['Targets upper chest. Keep shoulder blades retracted.'],
  },
  dumbbellflyes: {
    steps: [
      'Lie flat, dumbbells above chest with slight elbow bend.',
      'Open arms wide in an arc until you feel a stretch across the chest.',
      'Squeeze chest to bring dumbbells back together.',
    ],
    tips: ['Keep a slight bend in elbows throughout.', 'Don\'t go deeper than shoulder-level.'],
  },
  pushups: {
    steps: [
      'Hands shoulder-width, body in a straight line from head to heels.',
      'Lower chest to the floor, elbows at ~45°.',
      'Push back up to full arm extension.',
    ],
    tips: ['Squeeze glutes and brace core to avoid sagging.'],
  },
  cablecrossover: {
    steps: [
      'Set pulleys high. Step forward into a staggered stance.',
      'Bring handles together in front of your chest in an arc.',
      'Slowly return to the start.',
    ],
  },
  declinebenchpress: {
    steps: [
      'Lie on a decline bench, feet locked in.',
      'Unrack and lower bar to lower chest.',
      'Press back up to full extension.',
    ],
    tips: ['Emphasises lower chest.'],
  },
  inclinebarbellpress: {
    steps: [
      'Set bench to 30–45°. Grip barbell slightly wider than shoulder width.',
      'Unrack, lower to upper chest.',
      'Press up until arms are fully extended.',
    ],
  },
  landminepress: {
    steps: [
      'Wedge one end of the barbell in a corner or landmine attachment.',
      'Hold the other end at shoulder height with one or both hands.',
      'Press upward and slightly forward, then lower under control.',
    ],
  },
  dumbbellbenchpress: {
    steps: [
      'Lie flat, hold dumbbells above chest with palms forward.',
      'Lower to chest level, elbows at ~45°.',
      'Press back up.',
    ],
    tips: ['Greater range of motion than barbell bench.'],
  },
  pecdeckfly: {
    steps: [
      'Sit in the machine, forearms against pads, elbows at chest height.',
      'Bring pads together in front of chest, squeezing pecs.',
      'Slowly return to the start.',
    ],
  },
  machinechestpress: {
    steps: [
      'Adjust seat so handles are at mid-chest height.',
      'Press handles forward to full extension.',
      'Return under control.',
    ],
  },
  chestdips: {
    steps: [
      'Grip parallel bars, lean torso forward ~30°.',
      'Lower until upper arms are roughly parallel to the floor.',
      'Push back up to the top.',
    ],
    tips: ['Leaning forward shifts emphasis to chest vs. triceps.'],
  },

  // ── Back ──────────────────────────────────────────────────────────────
  pullups: {
    steps: [
      'Hang from bar with overhand grip, slightly wider than shoulder-width.',
      'Pull up until chin clears the bar, leading with the chest.',
      'Lower under control to full hang.',
    ],
    tips: ['Avoid kipping. Initiate by depressing shoulder blades.'],
  },
  chinups: {
    steps: [
      'Hang with underhand (supinated) grip, shoulder-width apart.',
      'Pull up until chin is over the bar.',
      'Lower to full extension.',
    ],
    tips: ['More bicep involvement than pull-ups.'],
  },
  latpulldown: {
    steps: [
      'Sit at the machine, grip bar wider than shoulder-width.',
      'Pull bar to upper chest, squeezing lats.',
      'Return under control to full stretch.',
    ],
    tips: ['Lean back slightly — don\'t swing.'],
  },
  seatedcablerow: {
    steps: [
      'Sit upright, feet on platform, slight knee bend.',
      'Pull handle to lower chest, squeezing shoulder blades together.',
      'Return to the start with arms extended.',
    ],
  },
  singlearmdumbbellrow: {
    steps: [
      'Place one knee and hand on a bench for support.',
      'Row dumbbell up to hip, keeping elbow close to body.',
      'Lower under control.',
    ],
  },
  facepulls: {
    steps: [
      'Set cable at upper-chest height with rope attachment.',
      'Pull toward face, separating the rope ends and externally rotating shoulders.',
      'Squeeze rear delts, then return.',
    ],
    tips: ['Keep elbows high.', 'Great for shoulder health.'],
  },
  tbarrow: {
    steps: [
      'Straddle the bar, grip the handle or use a V-grip attachment.',
      'Hinge at hips, pull to chest.',
      'Lower under control.',
    ],
  },
  pendlayrow: {
    steps: [
      'Hinge until torso is nearly parallel to floor. Bar starts on the floor each rep.',
      'Explosively row to lower chest.',
      'Lower bar back to floor (dead stop).',
    ],
  },
  chestsupportedrow: {
    steps: [
      'Lie face-down on an incline bench, dumbbells hanging.',
      'Row both dumbbells up, squeezing shoulder blades.',
      'Lower under control.',
    ],
    tips: ['Eliminates momentum — great for strict form.'],
  },
  rackpulls: {
    steps: [
      'Set bar in a rack at knee height.',
      'Grip and stand up as in the top portion of a deadlift.',
      'Lower back to the pins.',
    ],
    tips: ['Overloads the lockout portion of the deadlift.'],
  },
  backhyperextensions: {
    steps: [
      'Lock feet in the hyperextension pad, upper body hanging.',
      'Raise torso until your body is straight (don\'t hyperextend).',
      'Lower under control.',
    ],
  },
  straightarmpulldown: {
    steps: [
      'Stand facing cable, arms straight, grip bar at shoulder height.',
      'Push bar down to thighs in an arc, squeezing lats.',
      'Return under control.',
    ],
  },

  // ── Legs ──────────────────────────────────────────────────────────────
  legpress: {
    steps: [
      'Sit in machine, feet shoulder-width on platform.',
      'Lower the platform until knees are ~90°.',
      'Press back up without locking knees.',
    ],
  },
  lunges: {
    steps: [
      'Step forward, lower until both knees are at ~90°.',
      'Push through front foot to return to standing.',
      'Alternate legs or do all reps on one side.',
    ],
  },
  legextension: {
    steps: [
      'Sit in the machine, pad against lower shins.',
      'Extend knees to straighten legs.',
      'Lower under control.',
    ],
    tips: ['Don\'t use momentum. Control the negative.'],
  },
  legcurl: {
    steps: [
      'Lie face-down (or sit), pad behind ankles.',
      'Curl heels toward glutes.',
      'Lower under control.',
    ],
  },
  bulgariansplitsquats: {
    steps: [
      'Rear foot elevated on a bench behind you.',
      'Lower until front thigh is parallel or below.',
      'Drive up through front heel.',
    ],
    tips: ['Keep torso upright.', 'Great for single-leg strength.'],
  },
  hacksquat: {
    steps: [
      'Stand on the machine platform, shoulders against pads.',
      'Squat down until thighs are parallel.',
      'Press back up.',
    ],
  },
  hipthrust: {
    steps: [
      'Upper back against a bench, barbell over hips.',
      'Drive hips up until body forms a straight line from knees to shoulders.',
      'Squeeze glutes at the top, lower under control.',
    ],
    tips: ['Tuck chin slightly. Avoid arching the lower back.'],
  },
  rdl: {
    steps: [
      'Hold barbell or dumbbells at hip height.',
      'Hinge at hips, pushing them back while keeping slight knee bend.',
      'Lower until you feel a hamstring stretch, then drive hips forward to stand.',
    ],
    tips: ['Bar stays close to legs.', 'Don\'t round the back.'],
  },
  nordiccurl: {
    steps: [
      'Kneel, have a partner hold your ankles (or use a pad).',
      'Slowly lower your torso forward, resisting with hamstrings.',
      'Catch yourself with hands and push back up, using hamstrings to pull.',
    ],
    tips: ['Extremely effective for hamstring strength and injury prevention.'],
  },
  stifflegdeadlift: {
    steps: [
      'Hold barbell with minimal knee bend (legs nearly straight).',
      'Hinge at hips, lower the bar along legs.',
      'Return to standing by driving hips forward.',
    ],
  },
  gobletsquats: {
    steps: [
      'Hold a dumbbell or kettlebell at chest height.',
      'Squat down between your knees.',
      'Stand back up.',
    ],
    tips: ['Great for learning squat form.'],
  },
  boxsquat: {
    steps: [
      'Set a box behind you at the desired squat depth.',
      'Squat down and sit briefly on the box (don\'t relax fully).',
      'Explode back up.',
    ],
  },
  calfraisesstanding: {
    steps: [
      'Stand on a raised edge (toes on, heels hanging).',
      'Rise onto toes as high as possible.',
      'Lower heels below the platform for a full stretch.',
    ],
  },
  calfraisesseated: {
    steps: [
      'Sit in the machine, pads on lower thighs.',
      'Rise onto toes, then lower for a deep stretch.',
    ],
    tips: ['Targets the soleus (deeper calf muscle).'],
  },
  stepups: {
    steps: [
      'Stand in front of a box or bench, one foot on top.',
      'Drive through the top foot to step up.',
      'Lower back down under control.',
    ],
  },
  walkinglunges: {
    steps: [
      'Take a step forward into a lunge, then step through into the next lunge.',
      'Continue walking forward, alternating legs.',
    ],
  },

  // ── Shoulders ─────────────────────────────────────────────────────────
  lateralraises: {
    steps: [
      'Hold dumbbells at sides. Slight elbow bend.',
      'Raise arms out to the sides until parallel with the floor.',
      'Lower under control.',
    ],
    tips: ['Lead with the elbows, not the wrists.', 'Avoid shrugging.'],
  },
  arnoldpress: {
    steps: [
      'Start with dumbbells at chin height, palms facing you.',
      'As you press up, rotate palms to face forward.',
      'Reverse the motion on the way down.',
    ],
  },
  frontraises: {
    steps: [
      'Hold dumbbells in front of thighs.',
      'Raise one or both arms to shoulder height.',
      'Lower under control.',
    ],
  },
  uprightrow: {
    steps: [
      'Grip barbell or dumbbells with a narrow grip.',
      'Pull up along the body until elbows are at shoulder height.',
      'Lower under control.',
    ],
    tips: ['Use a slightly wider grip to reduce shoulder impingement risk.'],
  },
  reardeltflyes: {
    steps: [
      'Bend forward at hips, dumbbells hanging.',
      'Raise arms out to the sides, squeezing rear delts.',
      'Lower under control.',
    ],
  },
  cablelateralraises: {
    steps: [
      'Stand next to a low cable, handle in the far hand.',
      'Raise arm out to the side to shoulder height.',
      'Lower under control.',
    ],
    tips: ['Constant tension from the cable makes this very effective.'],
  },
  dumbbellshoulderpress: {
    steps: [
      'Sit or stand with dumbbells at shoulder height.',
      'Press overhead until arms are extended.',
      'Lower back to shoulders.',
    ],
  },
  smithmachinepress: {
    steps: [
      'Sit under the Smith machine bar at shoulder height.',
      'Unrack and press overhead.',
      'Lower under control.',
    ],
  },

  // ── Arms ──────────────────────────────────────────────────────────────
  bicepcurlsdumbbell: {
    steps: [
      'Hold dumbbells at sides, palms forward.',
      'Curl up to shoulder height, keeping elbows stationary.',
      'Lower under control.',
    ],
  },
  hammercurls: {
    steps: [
      'Hold dumbbells with palms facing each other (neutral grip).',
      'Curl up, keeping the neutral grip.',
      'Lower under control.',
    ],
    tips: ['Targets brachialis and brachioradialis (forearm).'],
  },
  triceppushdowns: {
    steps: [
      'Attach rope or bar to high cable.',
      'Push down until arms are straight, squeezing triceps.',
      'Return under control.',
    ],
    tips: ['Keep elbows pinned to your sides.'],
  },
  skullcrushers: {
    steps: [
      'Lie on bench, hold EZ bar or dumbbells above chest.',
      'Bend elbows to lower weight toward forehead.',
      'Extend back up.',
    ],
    tips: ['Keep upper arms vertical.'],
  },
  preachercurls: {
    steps: [
      'Rest upper arms on the preacher pad.',
      'Curl the weight up.',
      'Lower slowly for a full stretch.',
    ],
    tips: ['Eliminates momentum for strict bicep isolation.'],
  },
  ezbarcurls: {
    steps: [
      'Grip the angled portions of the EZ bar.',
      'Curl to shoulder height.',
      'Lower under control.',
    ],
    tips: ['Easier on the wrists than a straight bar.'],
  },
  closegripbench: {
    steps: [
      'Lie on bench, grip barbell with hands ~shoulder-width or narrower.',
      'Lower to chest, elbows close to body.',
      'Press up.',
    ],
    tips: ['Primary tricep compound movement.'],
  },
  overheadextension: {
    steps: [
      'Hold dumbbell or cable overhead with both hands.',
      'Lower behind head by bending elbows.',
      'Extend back up.',
    ],
  },
  concentrationcurls: {
    steps: [
      'Sit, brace elbow against inner thigh.',
      'Curl dumbbell up, squeezing bicep at the top.',
      'Lower under control.',
    ],
  },
  tricepkickbacks: {
    steps: [
      'Hinge forward, upper arm parallel to floor.',
      'Extend the dumbbell back until arm is straight.',
      'Return under control.',
    ],
  },
  dipstricepfocus: {
    steps: [
      'Grip parallel bars, torso upright (minimal forward lean).',
      'Lower until upper arms are parallel to the floor.',
      'Push back up, focusing on triceps.',
    ],
  },
  spidercurls: {
    steps: [
      'Lie chest-down on an incline bench, arms hanging straight.',
      'Curl dumbbells up toward shoulders.',
      'Lower under control.',
    ],
    tips: ['Eliminates all momentum for peak bicep contraction.'],
  },
  cablecurls: {
    steps: [
      'Stand facing a low cable with a bar or handles.',
      'Curl up to shoulder height.',
      'Lower under control.',
    ],
  },

  // ── Core ──────────────────────────────────────────────────────────────
  plank: {
    steps: [
      'Forearms on floor, body in a straight line.',
      'Hold the position, bracing your core.',
    ],
    tips: ['Squeeze glutes and avoid letting hips sag.'],
  },
  hanginglegraises: {
    steps: [
      'Hang from a bar with arms straight.',
      'Raise legs until they\'re parallel to the floor (or higher for more difficulty).',
      'Lower under control.',
    ],
    tips: ['Avoid swinging. Curl pelvis at the top for more ab engagement.'],
  },
  russiantwists: {
    steps: [
      'Sit with knees bent, lean back slightly, feet off the floor.',
      'Rotate torso side to side, touching the floor (or weight) on each side.',
    ],
  },
  abwheelrollouts: {
    steps: [
      'Kneel, grip the ab wheel.',
      'Roll forward until body is extended, core braced.',
      'Pull back to the start using your abs.',
    ],
    tips: ['Start with short range of motion and progress.'],
  },
  cablewoodchops: {
    steps: [
      'Set cable high (or low for low-to-high). Stand sideways.',
      'Pull handle diagonally across body, rotating torso.',
      'Return under control.',
    ],
  },
  pallofpress: {
    steps: [
      'Stand sideways to a cable at chest height.',
      'Press handle straight out in front of chest, resisting rotation.',
      'Hold briefly, then return.',
    ],
    tips: ['Anti-rotation core exercise — great for stability.'],
  },
  deadbug: {
    steps: [
      'Lie face-up, arms straight up, knees at 90°.',
      'Lower opposite arm and leg toward the floor while keeping back flat.',
      'Return and switch sides.',
    ],
  },
  mountainclimbers: {
    steps: [
      'Start in push-up position.',
      'Drive one knee toward chest, then quickly switch legs.',
      'Maintain a steady pace.',
    ],
  },
  sideplank: {
    steps: [
      'Lie on your side, prop up on forearm, body in a straight line.',
      'Hold, keeping hips up.',
    ],
  },
  dragonflag: {
    steps: [
      'Lie on a bench, grip behind your head.',
      'Raise entire body (rigid like a flag) until almost vertical.',
      'Lower under control, keeping body straight.',
    ],
    tips: ['Very advanced. Build up with single-leg variations first.'],
  },
  copenhagenplank: {
    steps: [
      'Side plank position with top leg on a bench, bottom leg hanging.',
      'Lift the bottom leg up to meet the top.',
      'Hold or perform reps.',
    ],
    tips: ['Targets adductors and obliques.'],
  },
  crunches: {
    steps: [
      'Lie face-up, knees bent, hands behind head.',
      'Curl shoulders off the floor, squeezing abs.',
      'Lower under control.',
    ],
  },
  suitcasecarry: {
    steps: [
      'Hold a heavy dumbbell or kettlebell in one hand at your side.',
      'Walk while keeping torso upright and resisting the lean.',
    ],
    tips: ['Great anti-lateral-flexion core exercise.'],
  },

  // ── Cardio & Misc ─────────────────────────────────────────────────────
  running: {
    steps: [
      'Maintain an upright posture, slight forward lean.',
      'Land midfoot, keep cadence steady (~170–180 spm).',
    ],
    tips: ['Start with a pace you can hold a conversation at.'],
  },
  rowing: {
    steps: [
      'Legs drive first, then lean back, then pull handle to lower chest.',
      'Reverse the order: arms away, lean forward, then bend knees.',
    ],
    tips: ['Ratio should be ~1:2 (drive:recovery).'],
  },
  jumprope: {
    steps: [
      'Hold handles at hip height. Rotate wrists (not arms) to spin the rope.',
      'Jump just high enough to clear the rope.',
    ],
  },
  boxjumps: {
    steps: [
      'Stand in front of a box, feet shoulder-width.',
      'Swing arms and jump, landing softly on the box with both feet.',
      'Stand up fully, then step down.',
    ],
    tips: ['Step down rather than jumping down to protect joints.'],
  },
  battleropes: {
    steps: [
      'Hold one end of each rope, slight squat stance.',
      'Create waves by alternating arm slams (or simultaneous slams).',
    ],
  },
  sledpush: {
    steps: [
      'Grip sled handles at waist or shoulder height.',
      'Drive through legs, pushing the sled forward.',
    ],
    tips: ['Keep back straight and core braced.'],
  },
};
