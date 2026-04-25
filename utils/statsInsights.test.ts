import { describe, expect, it } from 'vitest';
import { buildStatsInsights, canonicalizeExercise, normalizeExerciseName } from './statsInsights';
import { WorkoutSession } from '../types';

const sampleHistory: WorkoutSession[] = [
  {
    id: 's1',
    date: '2026-03-25T10:00:00.000Z',
    circuitNames: ['Push'],
    logs: [
      {
        exerciseId: 'cp3',
        exerciseName: 'Barbell Bench Press',
        type: 'weight',
        sets: [
          { setIndex: 1, value: 8, weight: 150 },
          { setIndex: 2, value: 6, weight: 160 },
        ],
      },
    ],
  },
  {
    id: 's2',
    date: '2026-03-31T10:00:00.000Z',
    circuitNames: ['Push'],
    logs: [
      {
        exerciseId: 'x1',
        exerciseName: 'Bench Press',
        type: 'weight',
        sets: [
          { setIndex: 1, value: 8, weight: 155 },
          { setIndex: 2, value: 6, weight: 165 },
        ],
      },
    ],
  },
  {
    id: 's3',
    date: '2026-04-03T10:00:00.000Z',
    circuitNames: ['Lower'],
    logs: [
      {
        exerciseId: 'cp1',
        exerciseName: 'Barbell Squat',
        type: 'weight',
        sets: [{ setIndex: 1, value: 5, weight: 205 }],
      },
    ],
  },
  {
    id: 's4',
    date: '2026-04-07T10:00:00.000Z',
    circuitNames: ['Push'],
    logs: [
      {
        exerciseId: 'x1',
        exerciseName: 'Bench Press',
        type: 'weight',
        sets: [{ setIndex: 1, value: 5, weight: 175 }],
      },
    ],
  },
  {
    id: 's5',
    date: '2026-04-10T10:00:00.000Z',
    circuitNames: ['Push'],
    logs: [
      {
        exerciseId: 'cp3',
        exerciseName: 'Barbell Bench Press',
        type: 'weight',
        sets: [{ setIndex: 1, value: 5, weight: 180 }],
      },
    ],
  },
];

describe('statsInsights helpers', () => {
  it('normalizes and canonicalizes exercise aliases', () => {
    expect(normalizeExerciseName('Barbell Bench Press')).toBe('barbellbenchpress');
    expect(canonicalizeExercise('Bench Press')).toBe('barbellbenchpress');
    expect(canonicalizeExercise('BARBELL BENCH PRESS')).toBe('barbellbenchpress');
  });

  it('builds e1RM trends and recommendations from history', () => {
    const insights = buildStatsInsights({
      sessions: sampleHistory,
      selectedLift: 'Barbell Bench Press',
      strengthMode: 'e1rm',
      timeRange: 'all',
      now: new Date('2026-04-12T10:00:00.000Z'),
    });

    expect(insights.strengthSeries.length).toBeGreaterThanOrEqual(4);
    expect(insights.recommendations.length).toBeGreaterThan(0);
    expect(insights.e1rmHelperText).toContain('Estimated 1RM');
  });

  it('produces work-capacity deltas by muscle group', () => {
    const insights = buildStatsInsights({
      sessions: sampleHistory,
      selectedLift: 'Barbell Bench Press',
      strengthMode: 'bestSet',
      timeRange: '12w',
      now: new Date('2026-04-12T10:00:00.000Z'),
    });

    const hasCapacityRows = insights.workCapacity.length > 0;
    const hasComparisonData = insights.workCapacity.some(row => row.baselineVolume >= 0);
    expect(hasCapacityRows).toBe(true);
    expect(hasComparisonData).toBe(true);
  });
});
