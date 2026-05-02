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
