import { DEFAULT_EXERCISES, EXERCISE_GROUPS } from '../constants';
import { CustomExercise, ExerciseLog, WorkoutSession } from '../types';
import {
  canonicalizeExercise,
  normalizeExerciseName,
  resolveDisplayName,
} from './exerciseCanon';

export type StrengthMode = 'bestSet' | 'top3Avg' | 'e1rm';
export type TimeRange = '4w' | '8w' | '12w' | 'all';

export interface StrengthPoint {
  date: string;
  value: number;
  isoDate: string;
}

export interface WorkCapacityPoint {
  muscleGroup: string;
  weeklyVolume: number;
  baselineVolume: number;
  deltaPct: number | null;
}

export interface Recommendation {
  headline: string;
  detail: string;
}

export interface ConsistencyMetrics {
  currentStreakDays: number;
  sessionsThisWeek: number;
  targetSessionsPerWeek: number;
  adherence4Week: Array<{ weekLabel: string; sessions: number; target: number }>;
}

export interface StatsInsights {
  availableLifts: string[];
  consistency: ConsistencyMetrics;
  strengthSeries: StrengthPoint[];
  workCapacity: WorkCapacityPoint[];
  recommendations: Recommendation[];
  confidenceMessage: string | null;
  e1rmHelperText: string;
}

const TARGET_SESSIONS_PER_WEEK = 4;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOWER_BODY_GROUP_HINTS = ['Legs', 'Quads', 'Hams', 'Calves'];

const toDate = (value: string) => new Date(value);

const sortByDateAsc = (sessions: WorkoutSession[]) =>
  [...sessions].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());

const formatShortDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const weekStart = (date: Date) => {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getTimeRangeStart = (now: Date, range: TimeRange): Date | null => {
  if (range === 'all') return null;
  const weeks = range === '4w' ? 4 : range === '8w' ? 8 : 12;
  const start = new Date(now);
  start.setDate(start.getDate() - weeks * 7);
  return start;
};

const getWeightSets = (log: ExerciseLog) =>
  log.type === 'weight'
    ? log.sets.filter(set => typeof set.weight === 'number' && (set.weight ?? 0) > 0 && set.value > 0)
    : [];

const calcStrengthValue = (log: ExerciseLog, mode: StrengthMode): number | null => {
  const sets = getWeightSets(log);
  if (sets.length === 0) return null;

  if (mode === 'bestSet') {
    return Math.max(...sets.map(set => set.weight ?? 0));
  }

  if (mode === 'top3Avg') {
    const top3 = [...sets]
      .map(set => set.weight ?? 0)
      .sort((a, b) => b - a)
      .slice(0, 3);
    const sum = top3.reduce((acc, val) => acc + val, 0);
    return top3.length ? sum / top3.length : null;
  }

  const e1rm = sets.map(set => (set.weight ?? 0) * (1 + set.value / 30));
  return Math.max(...e1rm);
};

const buildExerciseToMuscleMap = (customExercises: CustomExercise[]): Map<string, string> => {
  const map = new Map<string, string>();

  EXERCISE_GROUPS.forEach(group => {
    group.exercises.forEach(ex => {
      map.set(ex.id, group.muscleGroup);
      map.set(canonicalizeExercise(ex.name), group.muscleGroup);
    });
  });

  customExercises.forEach(ex => {
    map.set(ex.id, ex.muscleGroup);
    map.set(canonicalizeExercise(ex.name), ex.muscleGroup);
  });

  DEFAULT_EXERCISES.forEach(ex => {
    if (!map.has(ex.id)) {
      const group = EXERCISE_GROUPS.find(item => item.exercises.some(inner => inner.id === ex.id));
      if (group) map.set(ex.id, group.muscleGroup);
    }
  });

  return map;
};

const getCurrentStreakDays = (sessions: WorkoutSession[]) => {
  if (sessions.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(
      sessions.map(session => {
        const d = toDate(session.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ).sort((a, b) => b - a);

  let streak = 1;
  for (let i = 0; i < uniqueDays.length - 1; i += 1) {
    const diff = uniqueDays[i] - uniqueDays[i + 1];
    if (diff <= MS_PER_DAY + 1000 && diff >= MS_PER_DAY - 1000) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

const getConsistencyMetrics = (sessions: WorkoutSession[], now: Date): ConsistencyMetrics => {
  const thisWeekStart = weekStart(now).getTime();
  const sessionsThisWeek = sessions.filter(session => {
    const date = toDate(session.date);
    return date.getTime() >= thisWeekStart;
  }).length;

  const adherence4Week = Array.from({ length: 4 }).map((_, idx) => {
    const targetWeekStart = new Date(weekStart(now));
    targetWeekStart.setDate(targetWeekStart.getDate() - (3 - idx) * 7);
    const start = targetWeekStart.getTime();
    const end = start + 7 * MS_PER_DAY;
    const count = sessions.filter(session => {
      const date = toDate(session.date).getTime();
      return date >= start && date < end;
    }).length;
    return {
      weekLabel: targetWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sessions: count,
      target: TARGET_SESSIONS_PER_WEEK,
    };
  });

  return {
    currentStreakDays: getCurrentStreakDays(sessions),
    sessionsThisWeek,
    targetSessionsPerWeek: TARGET_SESSIONS_PER_WEEK,
    adherence4Week,
  };
};

const getStrengthSeries = (
  sessions: WorkoutSession[],
  selectedLift: string,
  mode: StrengthMode,
  range: TimeRange,
  now: Date,
) => {
  const filteredStart = getTimeRangeStart(now, range);
  const liftKey = canonicalizeExercise(selectedLift);
  const output: StrengthPoint[] = [];

  sortByDateAsc(sessions).forEach(session => {
    const sessionDate = toDate(session.date);
    if (filteredStart && sessionDate < filteredStart) return;

    const liftVals: number[] = [];
    session.logs.forEach(log => {
      const key = canonicalizeExercise(log.exerciseName);
      if (key !== liftKey) return;
      const val = calcStrengthValue(log, mode);
      if (val !== null) liftVals.push(val);
    });

    if (liftVals.length) {
      output.push({
        isoDate: sessionDate.toISOString(),
        date: formatShortDate(sessionDate),
        value: Number(Math.max(...liftVals).toFixed(1)),
      });
    }
  });

  return output;
};

const getStrengthTrendPct = (series: StrengthPoint[]): number | null => {
  if (series.length < 4) return null;
  const last = series[series.length - 1].value;
  const prior = series[Math.max(0, series.length - 4)].value;
  if (prior <= 0) return null;
  return ((last - prior) / prior) * 100;
};

const getWeeklyVolumeByMuscle = (
  sessions: WorkoutSession[],
  exerciseToMuscle: Map<string, string>,
  now: Date,
) => {
  const currentWeekStart = weekStart(now);
  const baselineStart = new Date(currentWeekStart);
  baselineStart.setDate(baselineStart.getDate() - 4 * 7);

  const currentWeekSessions = sessions.filter(session => toDate(session.date) >= currentWeekStart);
  const baselineSessions = sessions.filter(session => {
    const d = toDate(session.date);
    return d >= baselineStart && d < currentWeekStart;
  });

  const currentMap = new Map<string, number>();
  const baselineMap = new Map<string, number>();

  const accumulate = (targetMap: Map<string, number>, source: WorkoutSession[]) => {
    source.forEach(session => {
      session.logs.forEach(log => {
        if (log.type !== 'weight') return;
        const muscle =
          exerciseToMuscle.get(log.exerciseId) ??
          exerciseToMuscle.get(canonicalizeExercise(log.exerciseName)) ??
          'Other';
        const volume = log.sets.reduce((acc, set) => acc + (set.weight ?? 0) * set.value, 0);
        targetMap.set(muscle, (targetMap.get(muscle) ?? 0) + volume);
      });
    });
  };

  accumulate(currentMap, currentWeekSessions);
  accumulate(baselineMap, baselineSessions);

  const keys = new Set([...currentMap.keys(), ...baselineMap.keys()]);
  const output: WorkCapacityPoint[] = [];

  keys.forEach(key => {
    const current = currentMap.get(key) ?? 0;
    const baselineWeekly = (baselineMap.get(key) ?? 0) / 4;
    const delta = baselineWeekly > 0 ? ((current - baselineWeekly) / baselineWeekly) * 100 : null;
    output.push({
      muscleGroup: key,
      weeklyVolume: Number(current.toFixed(0)),
      baselineVolume: Number(baselineWeekly.toFixed(0)),
      deltaPct: delta === null ? null : Number(delta.toFixed(1)),
    });
  });

  output.sort((a, b) => b.weeklyVolume - a.weeklyVolume);
  return {
    rows: output,
    currentWeekSessions: currentWeekSessions.length,
    baselineSessions: baselineSessions.length,
  };
};

const getDaysSinceLowerBody = (sessions: WorkoutSession[], exerciseToMuscle: Map<string, string>, now: Date) => {
  const lowerSession = sortByDateAsc(sessions)
    .reverse()
    .find(session =>
      session.logs.some(log => {
        const muscle =
          exerciseToMuscle.get(log.exerciseId) ??
          exerciseToMuscle.get(canonicalizeExercise(log.exerciseName)) ??
          '';
        return LOWER_BODY_GROUP_HINTS.some(hint => muscle.includes(hint));
      }),
    );
  if (!lowerSession) return null;
  const diffMs = now.getTime() - toDate(lowerSession.date).getTime();
  return Math.floor(diffMs / MS_PER_DAY);
};

const buildRecommendations = (
  strengthSeries: StrengthPoint[],
  strengthPct: number | null,
  daysSinceLowerBody: number | null,
  consistency: ConsistencyMetrics,
) => {
  const recs: Recommendation[] = [];

  if (strengthPct !== null && strengthPct >= 1) {
    recs.push({
      headline: `Selected lift trend +${strengthPct.toFixed(1)}% over recent sessions`,
      detail: 'Recommendation: increase load by 2.5-5 lb next session if form is stable.',
    });
  } else if (strengthPct !== null && strengthPct <= 0 && consistency.sessionsThisWeek >= consistency.targetSessionsPerWeek - 1) {
    recs.push({
      headline: 'Strength trend is flat/down despite solid consistency',
      detail: 'Recommendation: add one quality set or target +1 rep on top set next session.',
    });
  }

  if (daysSinceLowerBody !== null && daysSinceLowerBody >= 6) {
    recs.push({
      headline: `No lower-body session in ${daysSinceLowerBody} days`,
      detail: 'Recommendation: add one leg-focused day this week.',
    });
  }

  if (consistency.sessionsThisWeek > consistency.targetSessionsPerWeek && strengthSeries.length >= 2) {
    const last = strengthSeries[strengthSeries.length - 1].value;
    const prev = strengthSeries[strengthSeries.length - 2].value;
    if (prev > 0 && (last - prev) / prev < -0.03) {
      recs.push({
        headline: 'Recent top-set performance dipped while frequency is high',
        detail: 'Recommendation: schedule a lighter day or deload session.',
      });
    }
  }

  if (recs.length === 0) {
    recs.push({
      headline: 'Progress signals are stable',
      detail: 'Recommendation: keep your current plan and aim for one small rep or load PR next session.',
    });
  }

  return recs.slice(0, 3);
};

export const getAvailableWeightLifts = (sessions: WorkoutSession[]) => {
  const names = new Map<string, string>();
  sessions.forEach(session => {
    session.logs.forEach(log => {
      if (log.type !== 'weight') return;
      const key = canonicalizeExercise(log.exerciseName);
      if (!names.has(key)) names.set(key, resolveDisplayName(log.exerciseName));
    });
  });
  return [...names.values()].sort((a, b) => a.localeCompare(b));
};

export const buildStatsInsights = (params: {
  sessions: WorkoutSession[];
  customExercises?: CustomExercise[];
  selectedLift: string;
  strengthMode: StrengthMode;
  timeRange: TimeRange;
  now?: Date;
}): StatsInsights => {
  const { sessions, selectedLift, strengthMode, timeRange } = params;
  const now = params.now ?? new Date();
  const customExercises = params.customExercises ?? [];
  const sorted = sortByDateAsc(sessions);
  const consistency = getConsistencyMetrics(sorted, now);
  const availableLifts = getAvailableWeightLifts(sorted);
  const strengthSeries = getStrengthSeries(sorted, selectedLift, strengthMode, timeRange, now);
  const strengthPct = getStrengthTrendPct(strengthSeries);
  const muscleMap = buildExerciseToMuscleMap(customExercises);
  const workCapacityRaw = getWeeklyVolumeByMuscle(sorted, muscleMap, now);
  const daysSinceLowerBody = getDaysSinceLowerBody(sorted, muscleMap, now);
  const recommendations = buildRecommendations(strengthSeries, strengthPct, daysSinceLowerBody, consistency);

  let confidenceMessage: string | null = null;
  if (sorted.length < 6 || strengthSeries.length < 4) {
    confidenceMessage = 'Limited data this month';
  }

  if (workCapacityRaw.currentWeekSessions !== workCapacityRaw.baselineSessions / 4) {
    confidenceMessage = confidenceMessage
      ? `${confidenceMessage}. Weekly comparisons account for different session counts.`
      : 'Weekly comparisons account for different session counts.';
  }

  return {
    availableLifts,
    consistency,
    strengthSeries,
    workCapacity: workCapacityRaw.rows,
    recommendations,
    confidenceMessage,
    e1rmHelperText: 'Estimated 1RM is modeled from submax sets and is not your true max.',
  };
};

export { canonicalizeExercise, normalizeExerciseName, resolveDisplayName };
