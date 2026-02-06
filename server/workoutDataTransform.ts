import { WorkoutSession, ExerciseLog, ExerciseType } from '../types';
import { randomUUID } from 'crypto';

/**
 * Database row types for normalized workout storage
 */
export interface WorkoutRow {
  workout_id: string;
  user_id: string;
  date: Date;
  created_at: Date;
}

export interface RoundRow {
  round_id: string;
  workout_id: string;
  circuit_id: string;
  circuit_name: string;
  round_number: number;
  created_at: Date;
}

export interface ExerciseSetRow {
  set_id: string;
  round_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_type: string;
  set_index: number;
  value: number;
  weight: number | null;
  created_at: Date;
}

/**
 * Normalized data structure for a complete workout
 */
export interface NormalizedWorkout {
  workout: WorkoutRow;
  rounds: Array<{
    round: RoundRow;
    sets: ExerciseSetRow[];
  }>;
}

/**
 * Converts a WorkoutSession to normalized database rows.
 * Groups ExerciseLogs by circuitId and assigns round numbers.
 * Currently, each circuit in a workout is treated as Round 1.
 * If multiple ExerciseLogs share the same circuitId, each represents a separate round.
 * 
 * @param workoutSession - The workout session to normalize
 * @param userId - The user ID (sub) for the workout
 * @returns Normalized workout data ready for database insertion
 */
export function normalizeWorkoutSession(
  workoutSession: WorkoutSession,
  userId: string
): NormalizedWorkout {
  const workout: WorkoutRow = {
    workout_id: workoutSession.id,
    user_id: userId,
    date: new Date(workoutSession.date),
    created_at: new Date(),
  };

  // Group ExerciseLogs by circuitId
  // Each unique circuit gets its own round(s)
  // If same circuit appears multiple times (multiple ExerciseLogs with same circuitId),
  // each occurrence represents a separate round
  const circuitGroups = new Map<string, ExerciseLog[]>();
  
  for (const log of workoutSession.logs) {
    const circuitId = log.circuitId || 'unknown';
    if (!circuitGroups.has(circuitId)) {
      circuitGroups.set(circuitId, []);
    }
    circuitGroups.get(circuitId)!.push(log);
  }

  const rounds: Array<{ round: RoundRow; sets: ExerciseSetRow[] }> = [];

  // Process each circuit group
  // Currently: one round per circuit (round_number = 1)
  // Future: if same circuit appears multiple times, each gets its own round
  for (const [circuitId, logs] of circuitGroups.entries()) {
    // For now, treat all logs from same circuit as one round
    // If we need multiple rounds, we'd group by some criteria (e.g., sequence)
    const roundNumber = 1;
    const roundId = randomUUID();
    
    // Get circuit name from first log (all logs in group have same circuit)
    const circuitName = logs[0]?.circuitName || circuitId;

    const round: RoundRow = {
      round_id: roundId,
      workout_id: workoutSession.id,
      circuit_id: circuitId,
      circuit_name: circuitName,
      round_number: roundNumber,
      created_at: new Date(),
    };

    // Convert all sets from all exercises in this circuit/round
    const sets: ExerciseSetRow[] = [];
    for (const log of logs) {
      for (const set of log.sets) {
        sets.push({
          set_id: randomUUID(),
          round_id: roundId,
          exercise_id: log.exerciseId,
          exercise_name: log.exerciseName,
          exercise_type: log.type,
          set_index: set.setIndex,
          value: set.value,
          weight: set.weight ?? null,
          created_at: new Date(),
        });
      }
    }

    rounds.push({ round, sets });
  }

  return { workout, rounds };
}

/**
 * Converts normalized database rows back to WorkoutSession objects.
 * Reconstructs the original structure by grouping rounds and sets.
 * 
 * @param workouts - Array of normalized workout data from database
 * @returns Array of WorkoutSession objects
 */
export function denormalizeWorkouts(
  workouts: Array<{
    workout: WorkoutRow;
    rounds: Array<{
      round: RoundRow;
      sets: ExerciseSetRow[];
    }>;
  }>
): WorkoutSession[] {
  return workouts.map(({ workout, rounds }) => {
    const exerciseLogs: ExerciseLog[] = [];
    const circuitNames = new Set<string>();

    // Process each round
    for (const { round, sets } of rounds) {
      circuitNames.add(round.circuit_name);

      // Group sets by exercise_id within this round
      const exerciseGroups = new Map<string, ExerciseSetRow[]>();
      for (const set of sets) {
        if (!exerciseGroups.has(set.exercise_id)) {
          exerciseGroups.set(set.exercise_id, []);
        }
        exerciseGroups.get(set.exercise_id)!.push(set);
      }

      // Create ExerciseLog for each exercise in this round
      for (const [exerciseId, exerciseSets] of exerciseGroups.entries()) {
        const firstSet = exerciseSets[0];
        
        // Validate and sanitize exercise_type
        const validExerciseTypes: ExerciseType[] = ['reps', 'weight', 'duration'];
        const exerciseType = validExerciseTypes.includes(firstSet.exercise_type as ExerciseType)
          ? (firstSet.exercise_type as ExerciseType)
          : 'reps'; // fallback to 'reps' if invalid
        
        // Sort sets by set_index and convert to SetLog format
        const sortedSets = exerciseSets
          .sort((a, b) => a.set_index - b.set_index)
          .map((set) => ({
            setIndex: set.set_index,
            value: Number(set.value),
            weight: set.weight ? Number(set.weight) : undefined,
          }));

        exerciseLogs.push({
          exerciseId,
          exerciseName: firstSet.exercise_name,
          type: exerciseType,
          circuitId: round.circuit_id,
          circuitName: round.circuit_name,
          sets: sortedSets,
        });
      }
    }

    return {
      id: workout.workout_id,
      date: workout.date.toISOString(),
      circuitNames: Array.from(circuitNames),
      logs: exerciseLogs,
    };
  });
}
