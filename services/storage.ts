
import { Circuit, WorkoutSession } from '../types';
// Fix: STORAGE_KEYS is exported from constants.ts, not types.ts
import { STORAGE_KEYS } from '../constants';

export const saveCircuits = (circuits: Circuit[]) => {
  localStorage.setItem(STORAGE_KEYS.CIRCUITS, JSON.stringify(circuits));
};

export const getCircuits = (): Circuit[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CIRCUITS);
  return data ? JSON.parse(data) : [];
};

export const saveSession = (session: WorkoutSession) => {
  const history = getHistory();
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([session, ...history]));
};

export const getHistory = (): WorkoutSession[] => {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
};
