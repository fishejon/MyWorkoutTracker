
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
  /** Seconds from starting the active workout until Finish (client-only; may be absent after older server sync). */
  durationSeconds?: number;
}

/** In-progress workout persisted to localStorage for refresh / crash recovery. */
export interface ActiveWorkoutDraft {
  circuitKey: string;
  sessionDate: string;
  /** Wall clock when the session started (used with sessionDate when finishing) */
  clockISO: string;
  /** Epoch ms when this workout session began (total elapsed timer, survives refresh) */
  workoutStartedAtEpoch: number;
  logs: ExerciseLog[];
  stopwatchAccumMs: number;
  stopwatchRunning: boolean;
  /** Epoch ms when the current stopwatch segment started, if running */
  stopwatchSegmentStartEpoch: number | null;
  /** Exercise FAB: stopwatch vs custom countdown */
  exerciseTimerMode?: 'stopwatch' | 'countdown';
  countdownInputMin?: string;
  countdownInputSec?: string;
  /** null = show target from inputs; number = paused or live remaining */
  countdownRemainingSec?: number | null;
  countdownRunning?: boolean;
}

export type AppView =
  | 'dashboard'
  | 'circuits'
  | 'builder'
  | 'active'
  | 'history'
  | 'stats'
  | 'upload'
  | 'program';

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
