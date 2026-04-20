import { Circuit } from '../types';

function newEntityId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Clone a circuit for insertion into a session or program day (fresh circuit id). */
export function cloneCircuitWithNewId(template: Circuit): Circuit {
  return {
    ...template,
    id: newEntityId(),
    exercises: template.exercises.map(ex => ({ ...ex })),
  };
}
