import { WorkoutSession } from '../types';

/**
 * Stable fingerprint for a workout (ignores session id). Used to merge local + server
 * history when the same workout was stored under a timestamp id locally and a UUID from the DB.
 */
export function workoutSessionFingerprint(s: WorkoutSession): string {
  const t = Date.parse(s.date);
  const timeKey = Number.isNaN(t) ? s.date : String(Math.floor(t / 1000));
  const circuits = [...s.circuitNames].sort().join('\x1e');
  const logs = [...s.logs]
    .map(l => ({
      k: `${l.circuitId ?? ''}\x1e${l.exerciseId}\x1e${l.exerciseName}\x1e${l.type}`,
      sets: [...l.sets]
        .sort((a, b) => a.setIndex - b.setIndex)
        .map(st => `${st.setIndex}:${st.value}:${st.weight ?? ''}`)
        .join(','),
    }))
    .sort((a, b) => a.k.localeCompare(b.k))
    .map(l => `${l.k}\x1f${l.sets}`)
    .join('\x1f');
  return `${timeKey}\x1f${circuits}\x1f${logs}`;
}

/** Assume sessions are newest-first; keep the first (most recent) row per fingerprint. */
export function dedupeWorkoutHistoryByContent(sessions: WorkoutSession[]): WorkoutSession[] {
  const seen = new Set<string>();
  const out: WorkoutSession[] = [];
  for (const sess of sessions) {
    const fp = workoutSessionFingerprint(sess);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(sess);
  }
  return out;
}
