import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatsView from './StatsView';
import { WorkoutSession } from '../types';

describe('StatsView', () => {
  it('shows unlock message when history is sparse', () => {
    const sparseHistory: WorkoutSession[] = [
      {
        id: '1',
        date: '2026-04-01T10:00:00.000Z',
        circuitNames: ['A'],
        logs: [],
      },
      {
        id: '2',
        date: '2026-04-02T10:00:00.000Z',
        circuitNames: ['A'],
        logs: [],
      },
    ];

    render(<StatsView history={sparseHistory} customExercises={[]} />);
    expect(screen.getByText('Complete 3 sessions to unlock trends.')).toBeInTheDocument();
  });
});
