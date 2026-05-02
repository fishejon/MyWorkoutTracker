import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, History as HistoryIcon, BarChart3, Dumbbell, Plus, Layers, BookMarked } from 'lucide-react';
import { AppView, Circuit, WorkoutSession, CustomExercise, Program, SavedWorkout } from './types';
import {
  getCircuits,
  getHistory,
  saveCircuits,
  saveSession,
  setStorageNamespace,
  getPrograms,
  savePrograms,
  fixUtcMidnightDate,
  saveHistory,
  getSavedWorkouts,
  saveSavedWorkouts,
  getActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  activeWorkoutCircuitKey,
} from './services/storage';
import {
  dedupeWorkoutHistoryByContent,
  workoutSessionFingerprint,
} from './services/workoutSessionFingerprint';
import Dashboard from './components/Dashboard';
import CircuitsView from './components/CircuitsView';
import CircuitBuilder from './components/CircuitBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';
import ProgramUpload from './components/ProgramUpload';
import ProgramView from './components/ProgramView';
import SavedWorkoutsView from './components/SavedWorkoutsView';
import LandingPage from './components/LandingPage';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { cloneCircuitWithNewId } from './services/circuitClone';

const ID_TOKEN_STORAGE_KEY = 'mwt_google_id_token';

/** Decode a JWT and check whether its `exp` claim is in the past. */
function isTokenExpired(token: string): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return false; // unparseable — treat as valid and let the server reject it
  }
}

type AuthedUser = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type AuthStatus = 'checking' | 'unauth' | 'authed';

const dayCompleteKey = (d: { week: number; day: number }) => `${d.week}:${d.day}`;

/** Merge program day completions from localStorage into server programs (fixes lost checkmarks after refresh). */
function mergeProgramCompletionsFromLocal(
  server: Program[],
  local: Program[]
): { programs: Program[]; hadExtras: boolean } {
  const localById = new Map(local.map(p => [p.id, p]));
  let hadExtras = false;
  const programs = server.map(sp => {
    const lp = localById.get(sp.id);
    if (!lp?.completedDays?.length) return sp;
    const seen = new Set((sp.completedDays ?? []).map(dayCompleteKey));
    const extras = lp.completedDays.filter(d => !seen.has(dayCompleteKey(d)));
    if (extras.length === 0) return sp;
    hadExtras = true;
    return { ...sp, completedDays: [...(sp.completedDays ?? []), ...extras] };
  });
  return { programs, hadExtras };
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [activeCircuits, setActiveCircuits] = useState<Circuit[]>([]);
  /** Bumps on each new active session so ActiveWorkout remounts with fresh state (avoids stale draft/timer refs). */
  const [activeWorkoutMountId, setActiveWorkoutMountId] = useState(0);
  const [editingCircuit, setEditingCircuit] = useState<Circuit | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [viewingProgram, setViewingProgram] = useState<Program | null>(null);
  const [idToken, setIdToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ID_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthedUser | null>(null);
  /** Session that finished while the token was expired; synced on next successful auth. */
  const [pendingSession, setPendingSession] = useState<WorkoutSession | null>(null);
  /** Which program day is currently being worked out, so we can mark it complete on finish. */
  const [activeProgramContext, setActiveProgramContext] = useState<{ programId: string; week: number; day: number } | null>(null);
  /** Circuit being edited within a program (opens CircuitBuilder inline in the 'program' view). */
  const [editingProgramCircuit, setEditingProgramCircuit] = useState<{
    programId: string; week: number; day: number; circuitIdx: number; circuit: Circuit;
  } | null>(null);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>(() => getSavedWorkouts());
  /** Circuits from an in-progress draft detected on load; shown as a resume banner. */
  const [resumableCircuits, setResumableCircuits] = useState<Circuit[] | null>(null);

  /** After saving or canceling CircuitBuilder from Home vs Circuits tab, return here. */
  const postBuilderMainViewRef = useRef<'dashboard' | 'circuits'>('dashboard');

  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const clearSession = (opts?: { error?: string | null }) => {
    setIdToken(null);
    setUser(null);
    setAuthStatus('unauth');
    setAuthError(opts?.error ?? null);
    setStorageNamespace(null);
    setCircuits([]);
    setHistory([]);
    setCustomExercises([]);
    setPrograms([]);
    setDataError(null);
    setActiveCircuits([]);
    setViewingProgram(null);
    setActiveProgramContext(null);
    setEditingProgramCircuit(null);
    setSavedWorkouts([]);
    setResumableCircuits(null);
    setView('dashboard');

    try {
      sessionStorage.removeItem(ID_TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const postAuthEvent = async (event: 'login' | 'logout', token: string) => {
    try {
      await fetch('/api/auth/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event }),
      });
    } catch {
      // best-effort
    }
  };

  useEffect(() => {
    if (!hasGoogleClientId) {
      setAuthStatus('unauth');
      setAuthError(null);
      return;
    }

    if (!idToken) {
      setAuthStatus('unauth');
      // Do not clear authError here; it may contain the reason verification failed.
      setUser(null);
      setStorageNamespace(null);
      return;
    }

    let cancelled = false;
    setAuthStatus('checking');

    (async () => {
      try {
        const resp = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!resp.ok) {
          if (!cancelled) {
            const body = await resp.text().catch(() => '');
            const message = body || resp.statusText || 'Unknown error';
            clearSession({ error: `Sign-in verification failed (${resp.status}): ${message}` });
          }
          return;
        }

        const data = (await resp.json()) as AuthedUser;
        if (cancelled) return;

        setUser(data);
        setStorageNamespace(data.sub);
        setAuthStatus('authed');
      } catch {
        if (!cancelled) {
          clearSession({
            error:
              'Sign-in verification failed: could not reach /api/auth/verify. If you are running locally, use `vercel dev`.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, hasGoogleClientId]);

  const persistUserData = async (
    nextCircuits: Circuit[],
    nextHistory: WorkoutSession[],
    nextCustomExercises?: CustomExercise[],
    nextPrograms?: Program[],
    nextSavedWorkouts?: SavedWorkout[],
  ) => {
    if (authStatus !== 'authed' || !idToken) return;

    try {
      const body: {
        circuits: Circuit[];
        history: WorkoutSession[];
        customExercises?: CustomExercise[];
        programs?: Program[];
        savedWorkouts?: SavedWorkout[];
      } = {
        circuits: nextCircuits,
        history: nextHistory,
      };
      if (nextCustomExercises !== undefined) {
        body.customExercises = nextCustomExercises;
      }
      if (nextPrograms !== undefined) {
        body.programs = nextPrograms;
      }
      if (nextSavedWorkouts !== undefined) {
        body.savedWorkouts = nextSavedWorkouts;
      }
      const resp = await fetch('/api/data/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
      setDataError("Couldn't save. Changes may not sync.");
        console.warn('Failed to persist user data:', resp.status);
        return;
      }
      setDataError(null);
    } catch (e) {
      setDataError("Couldn't save. Changes may not sync.");
      console.warn('Failed to persist user data:', e);
    }
  };

  useEffect(() => {
    if (authStatus !== 'authed' || !idToken) return;

    let cancelled = false;

    (async () => {
      const localCircuits = getCircuits();
      const localHistory = getHistory();

      try {
        const resp = await fetch('/api/data/get', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!resp.ok) {
          if (!cancelled) {
        setDataError("Couldn't load latest data. Showing cached.");
        setCircuits(localCircuits);
        setHistory(localHistory);
        setView('dashboard');
      }
      return;
        }

        if (!cancelled) setDataError(null);

        const data = (await resp.json()) as {
          circuits: Circuit[];
          history: WorkoutSession[];
          customExercises?: CustomExercise[];
          programs?: Program[];
          savedWorkouts?: SavedWorkout[];
        };

        const serverCircuits = Array.isArray(data.circuits) ? data.circuits : [];
        // Apply UTC-midnight migration to server sessions (same fix as localStorage)
        const serverHistory = (Array.isArray(data.history) ? data.history : []).map(
          (s: WorkoutSession) => /T00:00:00\.000Z$/.test(s.date) ? { ...s, date: fixUtcMidnightDate(s.date) } : s
        );
        const serverCustomExercises = Array.isArray(data.customExercises) ? data.customExercises : [];
        const serverPrograms = Array.isArray(data.programs) ? data.programs : [];

        // Prefer server circuits; fall back to local if server has none.
        const nextCircuits = serverCircuits.length > 0 ? serverCircuits : localCircuits;

        // Merge: find local sessions not present on server (e.g. saved during an expired-token finish)
        // and prepend them so they are not lost. Then push the merged set to the server.
        const serverSessionIds = new Set(serverHistory.map((s: WorkoutSession) => s.id));
        const serverFingerprints = new Set(serverHistory.map(workoutSessionFingerprint));
        const missingSessions = localHistory.filter((s: WorkoutSession) => {
          if (serverSessionIds.has(s.id)) return false;
          if (serverFingerprints.has(workoutSessionFingerprint(s))) return false;
          return true;
        });
        let nextHistory =
          missingSessions.length > 0 ? [...missingSessions, ...serverHistory] : serverHistory;
        nextHistory = dedupeWorkoutHistoryByContent(nextHistory);
        saveHistory(nextHistory);
        const nextCustomExercises = serverCustomExercises.length > 0 ? serverCustomExercises : [];
        const localPrograms = getPrograms();
        let nextPrograms: Program[];
        let programsMergedFromLocal = false;
        if (serverPrograms.length > 0) {
          const { programs, hadExtras } = mergeProgramCompletionsFromLocal(serverPrograms, localPrograms);
          nextPrograms = programs;
          programsMergedFromLocal = hadExtras;
          if (hadExtras) savePrograms(nextPrograms);
        } else {
          nextPrograms = localPrograms;
        }

        // Restore saved workouts from server if present
        const serverSavedWorkouts = Array.isArray(data.savedWorkouts) ? data.savedWorkouts as SavedWorkout[] : null;

        if (!cancelled) {
          setCircuits(nextCircuits);
          setHistory(nextHistory);
          setCustomExercises(nextCustomExercises);
          setPrograms(nextPrograms);
          if (serverSavedWorkouts) setSavedWorkouts(serverSavedWorkouts);
          setView('dashboard');

          // Detect in-progress draft and offer resume
          const draft = getActiveWorkoutDraft();
          if (draft) {
            const draftIds = new Set(draft.circuitKey.split('|').filter(Boolean));
            const matching = nextCircuits.filter(c => draftIds.has(c.id));
            if (matching.length > 0 && activeWorkoutCircuitKey(matching) === draft.circuitKey) {
              setResumableCircuits(matching);
            }
          }
        }

        // Upload if server was empty OR if we merged local-only sessions / program completions
        const needsUpload =
          (serverCircuits.length === 0 && localCircuits.length > 0) ||
          missingSessions.length > 0 ||
          (serverPrograms.length === 0 && localPrograms.length > 0) ||
          programsMergedFromLocal;
        if (needsUpload) {
          await persistUserData(nextCircuits, nextHistory, nextCustomExercises, nextPrograms);
        }
      } catch (e) {
        console.warn('Failed to sync user data, falling back to local:', e);
        if (!cancelled) {
          setDataError("Couldn't load latest data. Showing cached.");
          setCircuits(localCircuits);
          setHistory(localHistory);
          setView('dashboard');

          // Still check for draft with local circuits on fallback
          const draft = getActiveWorkoutDraft();
          if (draft) {
            const draftIds = new Set(draft.circuitKey.split('|').filter(Boolean));
            const matching = localCircuits.filter(c => draftIds.has(c.id));
            if (matching.length > 0 && activeWorkoutCircuitKey(matching) === draft.circuitKey) {
              setResumableCircuits(matching);
            }
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, idToken]);

  // Once re-authentication completes, clear the pending session indicator.
  // The on-load merge logic above already handles syncing the localStorage session to the server.
  useEffect(() => {
    if (authStatus === 'authed' && pendingSession) {
      setPendingSession(null);
    }
  }, [authStatus, pendingSession]);

  const handleCreateCircuit = (newCircuit: Circuit) => {
    const updated = [...circuits, newCircuit];
    setCircuits(updated);
    saveCircuits(updated);
    void persistUserData(updated, history, customExercises);
    setEditingCircuit(null);
    setView(postBuilderMainViewRef.current);
  };

  const handleUpdateCircuit = (updatedCircuit: Circuit) => {
    const updated = circuits.map(c => (c.id === updatedCircuit.id ? updatedCircuit : c));
    setCircuits(updated);
    saveCircuits(updated);
    void persistUserData(updated, history, customExercises);
    setEditingCircuit(null);
    setView(postBuilderMainViewRef.current);
  };

  const handleDeleteCircuit = (id: string) => {
    const updated = circuits.filter(c => c.id !== id);
    setCircuits(updated);
    saveCircuits(updated);
    void persistUserData(updated, history, customExercises);

    if (editingCircuit?.id === id) {
      setEditingCircuit(null);
      setView(postBuilderMainViewRef.current);
    }
  };

  const handleStartWorkout = (selectedCircuits: Circuit[]) => {
    if (!selectedCircuits.length) return;
    setActiveProgramContext(null);
    setActiveWorkoutMountId(n => n + 1);
    setActiveCircuits(selectedCircuits);
    setResumableCircuits(null);
    clearActiveWorkoutDraft();
    setView('active');
  };

  const handleResumeWorkout = () => {
    if (!resumableCircuits?.length) return;
    setResumableCircuits(null);
    // Do NOT bump activeWorkoutMountId — we want the draft to be restored on mount
    setActiveCircuits(resumableCircuits);
    setView('active');
  };

  const handleDismissResume = () => {
    clearActiveWorkoutDraft();
    setResumableCircuits(null);
  };

  const handleToggleProgramDayComplete = (programId: string, week: number, day: number) => {
    const updatedPrograms = programs.map(p => {
      if (p.id !== programId) return p;
      const existing = p.completedDays ?? [];
      const already = existing.some(d => d.week === week && d.day === day);
      if (already) {
        return {
          ...p,
          completedDays: existing.filter(d => !(d.week === week && d.day === day)),
        };
      }
      return { ...p, completedDays: [...existing, { week, day }] };
    });
    setPrograms(updatedPrograms);
    if (viewingProgram?.id === programId) {
      setViewingProgram(updatedPrograms.find(p => p.id === programId) ?? null);
    }
    savePrograms(updatedPrograms);
    void persistUserData(circuits, history, customExercises, updatedPrograms);
  };

  const handleSaveCustomExercise = (ex: CustomExercise) => {
    setCustomExercises(prev => {
      const next = [...prev, ex];
      void persistUserData(circuits, history, next);
      return next;
    });
  };

  const handleImportCircuits = (newCircuits: Circuit[]) => {
    const updated = [...circuits, ...newCircuits];
    setCircuits(updated);
    saveCircuits(updated);
    void persistUserData(updated, history, customExercises);
    setView('dashboard');
  };

  const handleImportProgram = (program: Program) => {
    const updated = [...programs, program];
    setPrograms(updated);
    savePrograms(updated);
    void persistUserData(circuits, history, customExercises, updated);
    setView('dashboard');
  };

  const handleDeleteProgram = (id: string) => {
    const updated = programs.filter(p => p.id !== id);
    setPrograms(updated);
    savePrograms(updated);
    void persistUserData(circuits, history, customExercises, updated);
    setViewingProgram(null);
    setView('dashboard');
  };

  const handleFinishWorkout = (session: WorkoutSession) => {
    // Always persist locally first — this guarantees the session survives any network/auth failure.
    saveSession(session);

    // Mark the active program day as completed, if this workout came from a program.
    let updatedPrograms = programs;
    if (activeProgramContext) {
      const { programId, week, day } = activeProgramContext;
      updatedPrograms = programs.map(p => {
        if (p.id !== programId) return p;
        const existing = p.completedDays ?? [];
        if (existing.some(d => d.week === week && d.day === day)) return p; // already marked
        return { ...p, completedDays: [...existing, { week, day }] };
      });
      setPrograms(updatedPrograms);
      savePrograms(updatedPrograms);
      // Keep viewingProgram in sync so ProgramView re-renders with the new checkmark.
      if (viewingProgram?.id === programId) {
        setViewingProgram(updatedPrograms.find(p => p.id === programId) ?? null);
      }
      setActiveProgramContext(null);
    }

    // If the token is missing or expired, skip the server call and store as pending.
    // The improved on-load merge logic will sync it automatically on next login.
    if (!idToken || isTokenExpired(idToken)) {
      setPendingSession(session);
      setHistory(prev => dedupeWorkoutHistoryByContent([session, ...prev]));
      setActiveCircuits([]);
      setView(viewingProgram ? 'program' : 'history');
      setDataError('Session expired — workout saved locally and will sync on next sign-in.');
      return;
    }

    setHistory(prev => {
      const next = dedupeWorkoutHistoryByContent([session, ...prev]);
      void persistUserData(circuits, next, customExercises, updatedPrograms);
      return next;
    });
    setActiveCircuits([]);
    setView(viewingProgram ? 'program' : 'history');
  };

  const handleUpdateProgramCircuit = (updatedCircuit: Circuit) => {
    if (!editingProgramCircuit || !viewingProgram) return;
    const { programId, week, day, circuitIdx } = editingProgramCircuit;
    const updatedProgram: Program = {
      ...viewingProgram,
      schedule: viewingProgram.schedule.map(d =>
        d.week === week && d.day === day
          ? { ...d, circuits: d.circuits.map((c, i) => i === circuitIdx ? updatedCircuit : c) }
          : d
      ),
    };
    const updatedPrograms = programs.map(p => p.id === programId ? updatedProgram : p);
    setPrograms(updatedPrograms);
    setViewingProgram(updatedProgram);
    savePrograms(updatedPrograms);
    void persistUserData(circuits, history, customExercises, updatedPrograms);
    setEditingProgramCircuit(null);
  };

  /** Append a cloned circuit from the user library to a program day. */
  const handleAppendCircuitToProgramDay = (week: number, day: number, template: Circuit) => {
    if (!viewingProgram) return;
    const newC = cloneCircuitWithNewId(template);
    const updatedProgram: Program = {
      ...viewingProgram,
      schedule: viewingProgram.schedule.map(d =>
        d.week === week && d.day === day ? { ...d, circuits: [...d.circuits, newC] } : d
      ),
    };
    const updatedPrograms = programs.map(p => (p.id === viewingProgram.id ? updatedProgram : p));
    setPrograms(updatedPrograms);
    setViewingProgram(updatedProgram);
    savePrograms(updatedPrograms);
    void persistUserData(circuits, history, customExercises, updatedPrograms);
  };

  /** Inline edits from ProgramView: drops circuits with no exercises. */
  const handlePatchProgramCircuit = (week: number, day: number, circuitIdx: number, nextCircuit: Circuit) => {
    if (!viewingProgram) return;
    const programId = viewingProgram.id;
    const updatedProgram: Program = {
      ...viewingProgram,
      schedule: viewingProgram.schedule.map(d => {
        if (d.week !== week || d.day !== day) return d;
        const circuits = d.circuits
          .map((c, i) => (i === circuitIdx ? nextCircuit : c))
          .filter(c => c.exercises.length > 0);
        return { ...d, circuits };
      }),
    };
    const updatedPrograms = programs.map(p => (p.id === programId ? updatedProgram : p));
    setPrograms(updatedPrograms);
    setViewingProgram(updatedProgram);
    savePrograms(updatedPrograms);
    void persistUserData(circuits, history, customExercises, updatedPrograms);
  };

  const handleDeleteSession = (id: string) => {
    const updated = history.filter(s => s.id !== id);
    setHistory(updated);
    saveHistory(updated);
    void persistUserData(circuits, updated, customExercises);
  };

  const handleCreateSavedWorkout = (workout: SavedWorkout) => {
    const updated = [...savedWorkouts, workout];
    setSavedWorkouts(updated);
    saveSavedWorkouts(updated);
    void persistUserData(circuits, history, customExercises, undefined, updated);
  };

  const handleUpdateSavedWorkout = (workout: SavedWorkout) => {
    const updated = savedWorkouts.map(w => (w.id === workout.id ? workout : w));
    setSavedWorkouts(updated);
    saveSavedWorkouts(updated);
    void persistUserData(circuits, history, customExercises, undefined, updated);
  };

  const handleDeleteSavedWorkout = (id: string) => {
    const updated = savedWorkouts.filter(w => w.id !== id);
    setSavedWorkouts(updated);
    saveSavedWorkouts(updated);
    void persistUserData(circuits, history, customExercises, undefined, updated);
  };

  // Unique sorted category list derived from circuits — passed to CircuitBuilder for suggestions.
  const existingCategories = useMemo(
    () => [...new Set(circuits.map(c => c.category).filter((c): c is string => !!c))].sort(),
    [circuits]
  );

  const handleLogout = async () => {
    // Best-effort audit trail.
    if (idToken) {
      void postAuthEvent('logout', idToken);
    }
    clearSession();
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            circuits={circuits}
            history={history}
            programs={programs}
            onStart={handleStartWorkout}
            onDeleteProgram={handleDeleteProgram}
            onEdit={(circuit) => {
              postBuilderMainViewRef.current = 'dashboard';
              setEditingCircuit(circuit);
              setView('builder');
            }}
            onNew={() => {
              postBuilderMainViewRef.current = 'dashboard';
              setEditingCircuit(null);
              setView('builder');
            }}
          onImportCSV={() => setView('upload')}
            onOpenProgram={(program) => {
              setViewingProgram(program);
              setView('program');
            }}
            resumableCircuits={resumableCircuits}
            onResume={handleResumeWorkout}
            onDismissResume={handleDismissResume}
          />
        );
      case 'circuits':
        return (
          <CircuitsView
            circuits={circuits}
            history={history}
            onStart={handleStartWorkout}
            onDelete={handleDeleteCircuit}
            onEdit={(circuit) => {
              postBuilderMainViewRef.current = 'circuits';
              setEditingCircuit(circuit);
              setView('builder');
            }}
            onNew={() => {
              postBuilderMainViewRef.current = 'circuits';
              setEditingCircuit(null);
              setView('builder');
            }}
          />
        );
      case 'builder':
        return (
          <CircuitBuilder
            initialCircuit={editingCircuit}
            customExercises={customExercises}
            existingCategories={existingCategories}
            onSaveCustomExercise={handleSaveCustomExercise}
            onSave={handleCreateCircuit}
            onUpdate={handleUpdateCircuit}
            onCancel={() => {
              setEditingCircuit(null);
              setView(postBuilderMainViewRef.current);
            }}
          />
        );
      case 'active': {
        const exitActiveWorkout = () => {
          setActiveCircuits([]);
          setActiveProgramContext(null);
          setView(viewingProgram ? 'program' : 'dashboard');
        };
        if (activeCircuits.length === 0) {
          return (
            <>
              <div className="flex flex-col h-full bg-zinc-50 items-center justify-center p-8 text-center">
                <p className="text-zinc-600 text-sm font-medium mb-2">No workout could be loaded.</p>
                <p className="text-zinc-400 text-xs mb-6">Try starting again from Home or your program.</p>
                <button
                  type="button"
                  onClick={exitActiveWorkout}
                  className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold"
                >
                  Go back
                </button>
              </div>
            </>
          );
        }
        return (
          <>
            <ActiveWorkout
              key={activeWorkoutMountId}
              circuits={activeCircuits}
              libraryCircuits={circuits}
              onCircuitsChange={setActiveCircuits}
              customExercises={customExercises}
              existingCategories={existingCategories}
              onSaveCustomExercise={handleSaveCustomExercise}
              history={history}
              onFinish={handleFinishWorkout}
              onCancel={exitActiveWorkout}
            />
          </>
        );
      }
      case 'history':
        return <HistoryView history={history} onDelete={handleDeleteSession} />;
      case 'workouts':
        return (
          <SavedWorkoutsView
            savedWorkouts={savedWorkouts}
            circuits={circuits}
            onStart={handleStartWorkout}
            onCreate={handleCreateSavedWorkout}
            onUpdate={handleUpdateSavedWorkout}
            onDelete={handleDeleteSavedWorkout}
          />
        );
      case 'stats':
        return <StatsView history={history} customExercises={customExercises} />;
      case 'upload':
        return (
          <ProgramUpload
            onImportCircuits={handleImportCircuits}
            onImportProgram={handleImportProgram}
            onCancel={() => setView('dashboard')}
          />
        );
      case 'program':
        if (!viewingProgram) return null;
        // If a program circuit is being edited, show CircuitBuilder as a full-screen overlay.
        if (editingProgramCircuit?.programId === viewingProgram.id) {
          return (
            <CircuitBuilder
              initialCircuit={editingProgramCircuit.circuit}
              customExercises={customExercises}
              existingCategories={existingCategories}
              onSaveCustomExercise={handleSaveCustomExercise}
              onSave={() => { /* isEditing=true, so onUpdate is called instead */ }}
              onUpdate={handleUpdateProgramCircuit}
              onCancel={() => setEditingProgramCircuit(null)}
            />
          );
        }
        return (
          <ProgramView
            program={viewingProgram}
            libraryCircuits={circuits}
            onAppendCircuitFromLibrary={handleAppendCircuitToProgramDay}
            customExercises={customExercises}
            onSaveCustomExercise={handleSaveCustomExercise}
            onPatchCircuit={handlePatchProgramCircuit}
            onStartDay={(workoutDay) => {
              if (!workoutDay.circuits.length) return;
              setActiveWorkoutMountId(n => n + 1);
              setActiveCircuits(workoutDay.circuits);
              setActiveProgramContext({ programId: viewingProgram.id, week: workoutDay.week, day: workoutDay.day });
              setView('active');
            }}
            onToggleDayComplete={(week, day) =>
              handleToggleProgramDayComplete(viewingProgram.id, week, day)
            }
            onEditCircuit={(circuit, week, day, circuitIdx) => {
              setEditingProgramCircuit({ programId: viewingProgram.id, week, day, circuitIdx, circuit });
            }}
            onDelete={handleDeleteProgram}
            onBack={() => {
              setViewingProgram(null);
              setView('dashboard');
            }}
          />
        );
      default:
        return (
          <Dashboard
            circuits={circuits}
            history={history}
            programs={programs}
            onStart={handleStartWorkout}
            onDeleteProgram={handleDeleteProgram}
            onEdit={(circuit) => {
              postBuilderMainViewRef.current = 'dashboard';
              setEditingCircuit(circuit);
              setView('builder');
            }}
            onNew={() => {
              postBuilderMainViewRef.current = 'dashboard';
              setEditingCircuit(null);
              setView('builder');
            }}
            onImportCSV={() => setView('upload')}
            onOpenProgram={(program) => {
              setViewingProgram(program);
              setView('program');
            }}
            resumableCircuits={resumableCircuits}
            onResume={handleResumeWorkout}
            onDismissResume={handleDismissResume}
          />
        );
    }
  };

  // Enforce sign-in before allowing access to any app content.
  if (!hasGoogleClientId) {
    return (
      <div className="h-screen-dynamic w-full max-w-md mx-auto bg-slate-50 border-x border-slate-200 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full text-center">
          <h1 className="text-xl font-black text-slate-900">MyWorkoutTracker</h1>
          <p className="text-slate-500 text-sm mt-2">
            Missing <code>VITE_GOOGLE_CLIENT_ID</code>. Configure it in Vercel env vars and redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (authStatus !== 'authed') {
    return (
      <LandingPage
        authStatus={authStatus}
        authError={authError}
        onGoogleCredentialMissing={() =>
          setAuthError('Google did not return a credential. Check your OAuth client settings.')
        }
        onGoogleSuccess={(token) => {
          setAuthError(null);
          setIdToken(token);
          setAuthStatus('checking');

          try {
            sessionStorage.setItem(ID_TOKEN_STORAGE_KEY, token);
          } catch {
            // ignore
          }

          void postAuthEvent('login', token);
        }}
        onGoogleError={() => {
          setAuthError('Google login failed.');
        }}
      />
    );
  }

  const handleFullScreenViewError = () => {
    setActiveCircuits([]);
    setActiveProgramContext(null);
    setEditingCircuit(null);
    setEditingProgramCircuit(null);
    setViewingProgram(null);
    setView('dashboard');
  };

  // Special full-height handling for active workout, builder, upload, and program views
  if (view === 'active' || view === 'builder' || view === 'upload' || view === 'program') {
    return (
      <div className="h-screen-dynamic min-h-0 w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto bg-zinc-50 relative border-x border-zinc-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ViewErrorBoundary key={view} onReset={handleFullScreenViewError}>
            {renderView()}
          </ViewErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen-dynamic flex flex-col w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto bg-zinc-50 relative border-x border-zinc-200 overflow-hidden">
      {/* Header */}
      <header className="bg-zinc-900 text-white px-4 py-3 sticky top-0 z-10 shadow-sm flex-shrink-0 border-b border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-white/10 rounded-lg flex-shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight truncate">MyWorkoutTracker</h1>
              {user?.email && (
                <div className="text-[10px] text-white/50 truncate">
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      {dataError && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm font-medium flex items-center justify-between gap-2">
          <span>{dataError}</span>
          <button type="button" onClick={() => setDataError(null)} className="text-amber-600 hover:text-amber-800 font-bold" aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32">
        {renderView()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto glass-nav border-t border-zinc-200/60 z-50 grid grid-cols-6 items-end pt-2 pb-[calc(0.65rem+var(--sab))] px-1">
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center justify-end gap-1 pb-1 min-h-[52px] transition-colors ${
            view === 'dashboard' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setView('circuits')}
          className={`flex flex-col items-center justify-end gap-1 pb-1 min-h-[52px] transition-colors ${
            view === 'circuits' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] font-medium">Circuits</span>
        </button>

        <div className="flex flex-col items-center justify-end pb-0.5 min-h-[52px]">
          <button
            type="button"
            onClick={() => {
              postBuilderMainViewRef.current = view === 'circuits' ? 'circuits' : 'dashboard';
              setEditingCircuit(null);
              setView('builder');
            }}
            className="flex flex-col items-center gap-1 -translate-y-3 active:scale-95 transition-transform"
            aria-label="New circuit"
          >
            <div className="p-3.5 bg-zinc-900 text-white rounded-2xl shadow-lg ring-8 ring-zinc-50">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium text-zinc-400">New</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setView('history')}
          className={`flex flex-col items-center justify-end gap-1 pb-1 min-h-[52px] transition-colors ${
            view === 'history' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">History</span>
        </button>

        <button
          type="button"
          onClick={() => setView('stats')}
          className={`flex flex-col items-center justify-end gap-1 pb-1 min-h-[52px] transition-colors ${
            view === 'stats' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Stats</span>
        </button>

        <button
          type="button"
          onClick={() => setView('workouts')}
          className={`flex flex-col items-center justify-end gap-1 pb-1 min-h-[52px] transition-colors ${
            view === 'workouts' ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <BookMarked className="w-5 h-5" />
          <span className="text-[10px] font-medium">Workouts</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
