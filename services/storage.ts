
import { Circuit, WorkoutSession, ExerciseLog, Program } from '../types';
// Fix: STORAGE_KEYS is exported from constants.ts, not types.ts
import { STORAGE_KEYS } from '../constants';

let storageNamespace: string | null = null;

const nsKey = (key: string) => (storageNamespace ? `${storageNamespace}:${key}` : key);

export const setStorageNamespace = (namespace: string | null) => {
  storageNamespace = namespace;
};

export const clearUserStorage = () => {
  try {
    localStorage.removeItem(nsKey(STORAGE_KEYS.CIRCUITS));
    localStorage.removeItem(nsKey(STORAGE_KEYS.HISTORY));
    localStorage.removeItem(nsKey(STORAGE_KEYS.PROGRAMS));
  } catch {
    // ignore
  }
};

export const saveCircuits = (circuits: Circuit[]) => {
  localStorage.setItem(nsKey(STORAGE_KEYS.CIRCUITS), JSON.stringify(circuits));
};

export const getCircuits = (): Circuit[] => {
  try {
    const data = localStorage.getItem(nsKey(STORAGE_KEYS.CIRCUITS));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Sessions stored before the local-timezone fix have dates like
 * "YYYY-MM-DDT00:00:00.000Z" (UTC midnight), which display as the previous
 * evening for users west of UTC. Shift them to noon UTC — a safe anchor point
 * that lands on the correct calendar day in all US timezones (UTC-12 to UTC+14).
 */
export function fixUtcMidnightDate(dateStr: string): string {
  return /T00:00:00\.000Z$/.test(dateStr)
    ? dateStr.replace('T00:00:00.000Z', 'T12:00:00.000Z')
    : dateStr;
}

function migrateHistory(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.map(s =>
    /T00:00:00\.000Z$/.test(s.date) ? { ...s, date: fixUtcMidnightDate(s.date) } : s
  );
}

export const saveHistory = (history: WorkoutSession[]) => {
  localStorage.setItem(nsKey(STORAGE_KEYS.HISTORY), JSON.stringify(history));
};

export const saveSession = (session: WorkoutSession) => {
  const history = getHistory();
  localStorage.setItem(nsKey(STORAGE_KEYS.HISTORY), JSON.stringify([session, ...history]));
};

export const getHistory = (): WorkoutSession[] => {
  try {
    const data = localStorage.getItem(nsKey(STORAGE_KEYS.HISTORY));
    return data ? migrateHistory(JSON.parse(data)) : [];
  } catch {
    return [];
  }
};

export const savePrograms = (programs: Program[]) => {
  localStorage.setItem(nsKey(STORAGE_KEYS.PROGRAMS), JSON.stringify(programs));
};

export const getPrograms = (): Program[] => {
  try {
    const data = localStorage.getItem(nsKey(STORAGE_KEYS.PROGRAMS));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Finds the most recent workout data for a specific exercise.
 * Searches through workout history (sorted by date, most recent first).
 * Matches by exerciseId first, then falls back to exerciseName.
 * 
 * @param exerciseId - The ID of the exercise to find
 * @param exerciseName - The name of the exercise (used as fallback matching)
 * @param history - Optional workout history array. If not provided, fetches from storage.
 * @returns The most recent ExerciseLog for the exercise, or null if not found
 */
export const getLastWorkoutDataForExercise = (
  exerciseId: string,
  exerciseName: string,
  history?: WorkoutSession[]
): ExerciseLog | null => {
  const workoutHistory = history ?? getHistory();
  
  // Search through history (already sorted most recent first)
  for (const session of workoutHistory) {
    for (const log of session.logs) {
      // Match by exerciseId first (most reliable)
      if (log.exerciseId === exerciseId) {
        return log;
      }
      // Fallback to exerciseName matching
      if (log.exerciseName === exerciseName) {
        return log;
      }
    }
  }
  
  return null;
};
