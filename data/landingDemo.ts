import { Circuit, Program, ProgramWorkoutDay, WorkoutSession } from '../types';

const ex = (
  id: string,
  name: string,
  type: 'reps' | 'weight' | 'duration',
  sets: number,
  defaults = 3
) => ({
  id,
  name,
  type,
  defaultSets: defaults,
  sets,
});

export const LANDING_DEMO_CIRCUITS: Circuit[] = [
  {
    id: 'demo-c-upper',
    name: 'Upper — strength',
    category: 'Strength',
    exercises: [
      ex('d1', 'Bench press', 'weight', 4),
      ex('d2', 'Barbell row', 'weight', 4),
      ex('d3', 'Overhead press', 'weight', 3),
    ],
  },
  {
    id: 'demo-c-core',
    name: 'Core finisher',
    category: 'Conditioning',
    exercises: [
      ex('d4', 'Plank', 'duration', 3),
      ex('d5', 'Cable crunch', 'weight', 3),
    ],
  },
  {
    id: 'demo-c-legs',
    name: 'Leg day A',
    exercises: [
      ex('d6', 'Back squat', 'weight', 5),
      ex('d7', 'Romanian deadlift', 'weight', 4),
      ex('d8', 'Walking lunge', 'reps', 3),
    ],
  },
];

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const LANDING_DEMO_HISTORY: WorkoutSession[] = [
  {
    id: 'demo-s1',
    circuitNames: ['Upper — strength'],
    date: isoDaysAgo(0),
    logs: [],
  },
  {
    id: 'demo-s2',
    circuitNames: ['Leg day A'],
    date: isoDaysAgo(2),
    logs: [],
  },
  {
    id: 'demo-s3',
    circuitNames: ['Core finisher', 'Upper — strength'],
    date: isoDaysAgo(5),
    logs: [],
  },
  {
    id: 'demo-s4',
    circuitNames: ['Upper — strength'],
    date: isoDaysAgo(9),
    logs: [],
  },
];

const dayCircuit = (week: number, day: number, circuits: Circuit[]): ProgramWorkoutDay => ({
  week,
  day,
  circuits,
});

export const LANDING_DEMO_PROGRAM: Program = {
  id: 'demo-program',
  name: 'Hypertrophy block',
  totalWeeks: 4,
  completedDays: [{ week: 1, day: 1 }],
  schedule: [
    dayCircuit(1, 1, [LANDING_DEMO_CIRCUITS[0]]),
    dayCircuit(1, 2, [LANDING_DEMO_CIRCUITS[2]]),
    dayCircuit(1, 3, [LANDING_DEMO_CIRCUITS[1]]),
    dayCircuit(2, 1, [LANDING_DEMO_CIRCUITS[0]]),
    dayCircuit(2, 2, [LANDING_DEMO_CIRCUITS[2]]),
    dayCircuit(2, 3, [LANDING_DEMO_CIRCUITS[1]]),
  ],
};
