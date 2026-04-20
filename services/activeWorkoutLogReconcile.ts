import { Circuit, CircuitExercise, ExerciseLog, SetLog, WorkoutSession } from '../types';
import { getLastWorkoutDataForExercise } from './storage';

function buildExerciseLog(
  circuit: Circuit,
  ex: CircuitExercise,
  workoutHistory: WorkoutSession[]
): ExerciseLog {
  const lastWorkoutData = getLastWorkoutDataForExercise(ex.id, ex.name, workoutHistory);
  const sets: SetLog[] = Array.from({ length: ex.sets }).map((_, i) => ({
    setIndex: i,
    value: 0,
    weight: ex.type === 'weight' ? 0 : undefined,
  }));
  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    type: ex.type,
    circuitId: circuit.id,
    circuitName: circuit.name,
    sets,
    lastWorkoutSets: lastWorkoutData?.sets,
    suggestedWeight: ex.suggestedWeight,
    suggestedValue: ex.suggestedValue,
  };
}

function resizeSets(sets: SetLog[], targetLen: number, type: CircuitExercise['type']): SetLog[] {
  const next = sets.slice(0, targetLen).map((s, i) => ({ ...s, setIndex: i }));
  while (next.length < targetLen) {
    next.push({
      setIndex: next.length,
      value: 0,
      weight: type === 'weight' ? 0 : undefined,
    });
  }
  return next;
}

/**
 * When the in-session circuit list changes, keep existing log rows where
 * (circuitId, exerciseId) still exists; add defaults for new exercises; drop removed ones.
 */
export function reconcileLogsWithCircuits(
  prevLogs: ExerciseLog[],
  nextCircuits: Circuit[],
  workoutHistory: WorkoutSession[]
): ExerciseLog[] {
  const out: ExerciseLog[] = [];
  for (const c of nextCircuits) {
    for (const ex of c.exercises) {
      const prev = prevLogs.find(l => l.circuitId === c.id && l.exerciseId === ex.id);
      if (prev) {
        out.push({
          ...prev,
          exerciseName: ex.name,
          type: ex.type,
          circuitName: c.name,
          sets: resizeSets(prev.sets, ex.sets, ex.type),
          suggestedWeight: ex.suggestedWeight,
          suggestedValue: ex.suggestedValue,
        });
      } else {
        out.push(buildExerciseLog(c, ex, workoutHistory));
      }
    }
  }
  return out;
}
