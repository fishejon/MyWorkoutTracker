import { Exercise } from './types';

export interface ExerciseGroup {
  muscleGroup: string;
  exercises: Exercise[];
}

const rawGroups: ExerciseGroup[] = [
  {
    muscleGroup: 'Compound Movements',
    exercises: [
      { id: 'cp1', name: 'Barbell Squat', type: 'weight', defaultSets: 3 },
      { id: 'cp2', name: 'Conventional Deadlift', type: 'weight', defaultSets: 3 },
      { id: 'cp3', name: 'Barbell Bench Press', type: 'weight', defaultSets: 3 },
      { id: 'cp4', name: 'Overhead Press', type: 'weight', defaultSets: 3 },
      { id: 'cp5', name: 'Barbell Row', type: 'weight', defaultSets: 3 },
      { id: 'cp6', name: 'Clean and Press', type: 'weight', defaultSets: 3 },
      { id: 'cp7', name: 'Thrusters', type: 'weight', defaultSets: 3 },
      { id: 'cp8', name: 'Sumo Deadlift', type: 'weight', defaultSets: 3 },
      { id: 'cp9', name: 'Power Clean', type: 'weight', defaultSets: 3 },
      { id: 'cp10', name: 'Front Squat', type: 'weight', defaultSets: 3 },
      { id: 'cp11', name: 'Trap Bar Deadlift', type: 'weight', defaultSets: 3 },
      { id: 'cp12', name: 'Hang Clean', type: 'weight', defaultSets: 3 },
      { id: 'cp13', name: 'Snatch', type: 'weight', defaultSets: 3 },
      { id: 'cp14', name: 'Push Press', type: 'weight', defaultSets: 3 },
      { id: 'cp15', name: 'Zercher Squat', type: 'weight', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Chest (Upper/Lower)',
    exercises: [
      { id: 'c1', name: 'Incline Dumbbell Press', type: 'weight', defaultSets: 3 },
      { id: 'c2', name: 'Dumbbell Flyes', type: 'weight', defaultSets: 3 },
      { id: 'c3', name: 'Pushups', type: 'reps', defaultSets: 3 },
      { id: 'c4', name: 'Chest Dips', type: 'reps', defaultSets: 3 },
      { id: 'c5', name: 'Cable Crossover', type: 'weight', defaultSets: 3 },
      { id: 'c6', name: 'Machine Chest Press', type: 'weight', defaultSets: 3 },
      { id: 'c7', name: 'Decline Bench Press', type: 'weight', defaultSets: 3 },
      { id: 'c8', name: 'Pec Deck Fly', type: 'weight', defaultSets: 3 },
      { id: 'c9', name: 'Incline Barbell Press', type: 'weight', defaultSets: 3 },
      { id: 'c10', name: 'Landmine Press', type: 'weight', defaultSets: 3 },
      { id: 'c11', name: 'Dumbbell Bench Press', type: 'weight', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Back (Width/Thickness)',
    exercises: [
      { id: 'b1', name: 'Pull-ups', type: 'reps', defaultSets: 3 },
      { id: 'b2', name: 'Chin-ups', type: 'reps', defaultSets: 3 },
      { id: 'b3', name: 'Lat Pulldown', type: 'weight', defaultSets: 3 },
      { id: 'b4', name: 'Seated Cable Row', type: 'weight', defaultSets: 3 },
      { id: 'b5', name: 'Single Arm Dumbbell Row', type: 'weight', defaultSets: 3 },
      { id: 'b6', name: 'Face Pulls', type: 'weight', defaultSets: 3 },
      { id: 'b7', name: 'Back Hyperextensions', type: 'reps', defaultSets: 3 },
      { id: 'b8', name: 'T-Bar Row', type: 'weight', defaultSets: 3 },
      { id: 'b9', name: 'Straight Arm Pulldown', type: 'weight', defaultSets: 3 },
      { id: 'b10', name: 'Pendlay Row', type: 'weight', defaultSets: 3 },
      { id: 'b11', name: 'Chest Supported Row', type: 'weight', defaultSets: 3 },
      { id: 'b12', name: 'Rack Pulls', type: 'weight', defaultSets: 3 },
      { id: 'b13', name: 'Close Grip Lat Pulldown', type: 'weight', defaultSets: 3 },
      { id: 'b14', name: 'Meadows Row', type: 'weight', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Legs (Quads/Hams/Calves)',
    exercises: [
      { id: 'l1', name: 'Leg Press', type: 'weight', defaultSets: 3 },
      { id: 'l2', name: 'Lunges', type: 'reps', defaultSets: 3 },
      { id: 'l3', name: 'Leg Extension', type: 'weight', defaultSets: 3 },
      { id: 'l4', name: 'Leg Curl', type: 'weight', defaultSets: 3 },
      { id: 'l5', name: 'Calf Raises (Standing)', type: 'reps', defaultSets: 4 },
      { id: 'l6', name: 'Bulgarian Split Squats', type: 'weight', defaultSets: 3 },
      { id: 'l7', name: 'Goblet Squats', type: 'weight', defaultSets: 3 },
      { id: 'l8', name: 'Hack Squat', type: 'weight', defaultSets: 3 },
      { id: 'l9', name: 'Calf Raises (Seated)', type: 'reps', defaultSets: 4 },
      { id: 'l10', name: 'Stiff Leg Deadlift', type: 'weight', defaultSets: 3 },
      { id: 'l11', name: 'Hip Thrust', type: 'weight', defaultSets: 3 },
      { id: 'l12', name: 'RDL', type: 'weight', defaultSets: 3 },
      { id: 'l13', name: 'Walking Lunges', type: 'reps', defaultSets: 3 },
      { id: 'l14', name: 'Box Squat', type: 'weight', defaultSets: 3 },
      { id: 'l15', name: 'Nordic Curl', type: 'reps', defaultSets: 3 },
      { id: 'l16', name: 'Sissy Squat', type: 'reps', defaultSets: 3 },
      { id: 'l17', name: 'Step Ups', type: 'weight', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Shoulders (Delts)',
    exercises: [
      { id: 's1', name: 'Lateral Raises', type: 'weight', defaultSets: 3 },
      { id: 's2', name: 'Arnold Press', type: 'weight', defaultSets: 3 },
      { id: 's3', name: 'Front Raises', type: 'weight', defaultSets: 3 },
      { id: 's4', name: 'Upright Row', type: 'weight', defaultSets: 3 },
      { id: 's5', name: 'Rear Delt Flyes', type: 'weight', defaultSets: 3 },
      { id: 's6', name: 'Smith Machine Press', type: 'weight', defaultSets: 3 },
      { id: 's7', name: 'Cable Lateral Raises', type: 'weight', defaultSets: 3 },
      { id: 's8', name: 'Lu Raises', type: 'weight', defaultSets: 3 },
      { id: 's9', name: 'Dumbbell Shoulder Press', type: 'weight', defaultSets: 3 },
      { id: 's10', name: 'Reverse Pec Deck', type: 'weight', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Arms (Biceps/Triceps)',
    exercises: [
      { id: 'a1', name: 'Bicep Curls (Dumbbell)', type: 'weight', defaultSets: 3 },
      { id: 'a2', name: 'Hammer Curls', type: 'weight', defaultSets: 3 },
      { id: 'a3', name: 'Tricep Pushdowns', type: 'weight', defaultSets: 3 },
      { id: 'a4', name: 'Skull Crushers', type: 'weight', defaultSets: 3 },
      { id: 'a5', name: 'Preacher Curls', type: 'weight', defaultSets: 3 },
      { id: 'a6', name: 'Dips (Tricep Focus)', type: 'reps', defaultSets: 3 },
      { id: 'a7', name: 'Concentration Curls', type: 'weight', defaultSets: 3 },
      { id: 'a8', name: 'Overhead Extension', type: 'weight', defaultSets: 3 },
      { id: 'a9', name: 'EZ Bar Curls', type: 'weight', defaultSets: 3 },
      { id: 'a10', name: 'Spider Curls', type: 'weight', defaultSets: 3 },
      { id: 'a11', name: 'Cable Curls', type: 'weight', defaultSets: 3 },
      { id: 'a12', name: 'Close Grip Bench', type: 'weight', defaultSets: 3 },
      { id: 'a13', name: 'Tricep Kickbacks', type: 'weight', defaultSets: 3 },
      { id: 'a14', name: 'Incline Dumbbell Curl', type: 'weight', defaultSets: 3 },
      { id: 'a15', name: 'Bayesian Cable Curl', type: 'weight', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Core / Abs',
    exercises: [
      { id: 'cr1', name: 'Plank', type: 'duration', defaultSets: 3 },
      { id: 'cr2', name: 'Hanging Leg Raises', type: 'reps', defaultSets: 3 },
      { id: 'cr3', name: 'Russian Twists', type: 'reps', defaultSets: 3 },
      { id: 'cr4', name: 'Crunches', type: 'reps', defaultSets: 3 },
      { id: 'cr5', name: 'Ab Wheel Rollouts', type: 'reps', defaultSets: 3 },
      { id: 'cr6', name: 'Dead Bug', type: 'reps', defaultSets: 3 },
      { id: 'cr7', name: 'Mountain Climbers', type: 'reps', defaultSets: 3 },
      { id: 'cr8', name: 'Cable Woodchops', type: 'weight', defaultSets: 3 },
      { id: 'cr9', name: 'Pallof Press', type: 'weight', defaultSets: 3 },
      { id: 'cr10', name: 'Suitcase Carry', type: 'duration', defaultSets: 3 },
      { id: 'cr11', name: 'Copenhagen Plank', type: 'duration', defaultSets: 3 },
      { id: 'cr12', name: 'Dragon Flag', type: 'reps', defaultSets: 3 },
      { id: 'cr13', name: 'Side Plank', type: 'duration', defaultSets: 3 },
    ]
  },
  {
    muscleGroup: 'Cardio & Misc',
    exercises: [
      { id: 'cd1', name: 'Running', type: 'duration', defaultSets: 1 },
      { id: 'cd2', name: 'Cycling', type: 'duration', defaultSets: 1 },
      { id: 'cd3', name: 'Rowing', type: 'duration', defaultSets: 1 },
      { id: 'cd4', name: 'Jump Rope', type: 'duration', defaultSets: 3 },
      { id: 'cd5', name: 'Stair Climber', type: 'duration', defaultSets: 1 },
      { id: 'cd6', name: 'Battle Ropes', type: 'duration', defaultSets: 3 },
      { id: 'cd7', name: 'Box Jumps', type: 'reps', defaultSets: 3 },
      { id: 'cd8', name: 'Assault Bike', type: 'duration', defaultSets: 1 },
      { id: 'cd9', name: 'Swimming', type: 'duration', defaultSets: 1 },
      { id: 'cd10', name: 'Elliptical', type: 'duration', defaultSets: 1 },
      { id: 'cd11', name: 'Hiking', type: 'duration', defaultSets: 1 },
      { id: 'cd12', name: 'Sled Push', type: 'duration', defaultSets: 3 },
    ]
  }
];

// Ensure all exercises are sorted alphabetically within their groups
export const EXERCISE_GROUPS: ExerciseGroup[] = rawGroups.map(group => ({
  ...group,
  exercises: [...group.exercises].sort((a, b) => a.name.localeCompare(b.name))
}));

export const DEFAULT_EXERCISES: Exercise[] = EXERCISE_GROUPS.flatMap(group => group.exercises);

export const STORAGE_KEYS = {
  CIRCUITS: 'myworkouttracker_circuits',
  HISTORY: 'myworkouttracker_history',
  SETTINGS: 'myworkouttracker_settings',
  PROGRAMS: 'myworkouttracker_programs',
  ACTIVE_WORKOUT_DRAFT: 'myworkouttracker_active_draft',
  SAVED_WORKOUTS: 'myworkouttracker_saved_workouts',
};
