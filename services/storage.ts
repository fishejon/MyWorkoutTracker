
import { Circuit, WorkoutSession } from '../types';
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
  } catch {
    // ignore
  }
};

export const saveCircuits = (circuits: Circuit[]) => {
  localStorage.setItem(nsKey(STORAGE_KEYS.CIRCUITS), JSON.stringify(circuits));
};

export const getCircuits = (): Circuit[] => {
  const data = localStorage.getItem(nsKey(STORAGE_KEYS.CIRCUITS));
  return data ? JSON.parse(data) : [];
};

export const saveSession = (session: WorkoutSession) => {
  const history = getHistory();
  localStorage.setItem(nsKey(STORAGE_KEYS.HISTORY), JSON.stringify([session, ...history]));
};

export const getHistory = (): WorkoutSession[] => {
  const data = localStorage.getItem(nsKey(STORAGE_KEYS.HISTORY));
  return data ? JSON.parse(data) : [];
};
