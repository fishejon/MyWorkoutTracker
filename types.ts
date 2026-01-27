
export type ExerciseType = 'reps' | 'weight' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  defaultSets: number;
}

export interface CircuitExercise extends Exercise {
  sets: number;
}

export interface Circuit {
  id: string;
  name: string;
  exercises: CircuitExercise[];
}

export interface SetLog {
  setIndex: number;
  value: number; // reps or duration (seconds)
  weight?: number; // optional weight in kg/lbs
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  sets: SetLog[];
  circuitId?: string; // Track which circuit this log belongs to
  circuitName?: string;
}

export interface WorkoutSession {
  id: string;
  circuitNames: string[]; // List of names of circuits performed in this session
  date: string;
  logs: ExerciseLog[];
}

export type AppView = 'dashboard' | 'builder' | 'active' | 'history' | 'stats';
