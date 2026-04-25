
import { ActiveWorkoutDraft, Circuit, WorkoutSession, ExerciseLog, Program } from '../types';
// Fix: STORAGE_KEYS is exported from constants.ts, not types.ts
import { STORAGE_KEYS } from '../constants';
import { dedupeWorkoutHistoryByContent } from './workoutSessionFingerprint';

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
    localStorage.removeItem(nsKey(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT));
  } catch {
    // ignore
  }
};

export function activeWorkoutCircuitKey(circuits: Circuit[]): string {
  return [...circuits.map(c => c.id)].sort().join('|');
}

function draftSetLooksValid(s: unknown): boolean {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as { setIndex?: unknown; value?: unknown };
  return typeof o.setIndex === 'number' && typeof o.value === 'number';
}

export function activeWorkoutDraftMatches(draft: ActiveWorkoutDraft, circuits: Circuit[]): boolean {
  if (draft.circuitKey !== activeWorkoutCircuitKey(circuits)) return false;
  const expectedIds: string[] = [];
  for (const c of circuits) {
    for (const ex of c.exercises) expectedIds.push(ex.id);
  }
  if (!Array.isArray(draft.logs) || draft.logs.length !== expectedIds.length) return false;
  return draft.logs.every((log, i) => {
    if (!log || typeof log !== 'object' || log.exerciseId !== expectedIds[i]) return false;
    if (!Array.isArray(log.sets) || log.sets.length === 0) return false;
    return log.sets.every(draftSetLooksValid);
  });
}

export function getActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  try {
    const raw = localStorage.getItem(nsKey(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkoutDraft;
    if (
      typeof parsed.circuitKey !== 'string' ||
      typeof parsed.sessionDate !== 'string' ||
      typeof parsed.clockISO !== 'string' ||
      !Array.isArray(parsed.logs)
    ) {
      return null;
    }
    const fromClock = Date.parse(parsed.clockISO);
    const workoutStartedAtEpoch =
      typeof parsed.workoutStartedAtEpoch === 'number' && parsed.workoutStartedAtEpoch > 0
        ? parsed.workoutStartedAtEpoch
        : Number.isNaN(fromClock)
          ? Date.now()
          : fromClock;
    return {
      ...parsed,
      workoutStartedAtEpoch,
      stopwatchAccumMs: typeof parsed.stopwatchAccumMs === 'number' ? parsed.stopwatchAccumMs : 0,
      stopwatchRunning: Boolean(parsed.stopwatchRunning),
      stopwatchSegmentStartEpoch:
        typeof parsed.stopwatchSegmentStartEpoch === 'number' ? parsed.stopwatchSegmentStartEpoch : null,
      exerciseTimerMode: parsed.exerciseTimerMode === 'countdown' ? 'countdown' : 'stopwatch',
      countdownInputMin: typeof parsed.countdownInputMin === 'string' ? parsed.countdownInputMin : '1',
      countdownInputSec: typeof parsed.countdownInputSec === 'string' ? parsed.countdownInputSec : '0',
      countdownRemainingSec:
        typeof parsed.countdownRemainingSec === 'number' ? parsed.countdownRemainingSec : null,
      countdownRunning: Boolean(parsed.countdownRunning),
    };
  } catch {
    return null;
  }
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): void {
  try {
    localStorage.setItem(nsKey(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearActiveWorkoutDraft(): void {
  try {
    localStorage.removeItem(nsKey(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT));
  } catch {
    // ignore
  }
}

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
  const merged = dedupeWorkoutHistoryByContent([session, ...history]);
  localStorage.setItem(nsKey(STORAGE_KEYS.HISTORY), JSON.stringify(merged));
};

export const getHistory = (): WorkoutSession[] => {
  try {
    const data = localStorage.getItem(nsKey(STORAGE_KEYS.HISTORY));
    const raw = data ? migrateHistory(JSON.parse(data)) : [];
    const deduped = dedupeWorkoutHistoryByContent(raw);
    if (deduped.length !== raw.length) {
      localStorage.setItem(nsKey(STORAGE_KEYS.HISTORY), JSON.stringify(deduped));
    }
    return deduped;
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
