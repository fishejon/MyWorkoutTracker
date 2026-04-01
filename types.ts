
export type ExerciseType = 'reps' | 'weight' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  defaultSets: number;
}

/** User-created exercise persisted per user; includes muscle group for library grouping. */
export interface CustomExercise extends Exercise {
  muscleGroup: string;
}

export interface CircuitExercise extends Exercise {
  sets: number;
  /** Optional suggested values from a CSV import; pre-filled in the active workout. */
  suggestedWeight?: number;
  suggestedValue?: number;
}

export interface Circuit {
  id: string;
  name: string;
  exercises: CircuitExercise[];
  /** Optional user-defined category for grouping on the dashboard. */
  category?: string;
}

export interface SetLog {
  setIndex: number;
  value: number; // reps or duration (seconds)
  weight?: number; // optional weight in lbs
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  sets: SetLog[];
  circuitId?: string;
  circuitName?: string;
  lastWorkoutSets?: SetLog[]; // Previous workout's sets data for display/reference
  /** CSV-suggested values — shown as placeholder when no history exists. */
  suggestedWeight?: number;
  suggestedValue?: number;
}

export interface WorkoutSession {
  id: string;
  circuitNames: string[]; // List of names of circuits performed in this session
  date: string;
  logs: ExerciseLog[];
}

export type AppView = 'dashboard' | 'builder' | 'active' | 'history' | 'stats' | 'upload' | 'program';

/** One day in a multi-week program: contains all circuits for that day. */
export interface ProgramWorkoutDay {
  week: number;
  day: number;
  circuits: Circuit[];
}

/**
 * A structured training program created from a CSV upload.
 * Circuits inside the program are self-contained and not added to the global circuit library.
 */
export interface Program {
  id: string;
  name: string;
  totalWeeks: number;
  schedule: ProgramWorkoutDay[];
  /** Days the user has finished at least once. Populated by the app; not part of the CSV. */
  completedDays?: { week: number; day: number }[];
}
