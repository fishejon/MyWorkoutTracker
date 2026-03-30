
import React, { useState, useEffect } from 'react';
import { Home, History as HistoryIcon, BarChart3, Dumbbell, Plus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { AppView, Circuit, WorkoutSession, CustomExercise, Program } from './types';
import {
  getCircuits,
  getHistory,
  saveCircuits,
  saveSession,
  setStorageNamespace,
  getPrograms,
  savePrograms,
  fixUtcMidnightDate,
} from './services/storage';
import Dashboard from './components/Dashboard';
import CircuitBuilder from './components/CircuitBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';
import ProgramUpload from './components/ProgramUpload';
import ProgramView from './components/ProgramView';

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

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [activeCircuits, setActiveCircuits] = useState<Circuit[]>([]);
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
  ) => {
    if (authStatus !== 'authed' || !idToken) return;

    try {
      const body: {
        circuits: Circuit[];
        history: WorkoutSession[];
        customExercises?: CustomExercise[];
        programs?: Program[];
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
      const resp = await fetch('/api/data/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        setDataError('Couldn’t save. Changes may not sync.');
        console.warn('Failed to persist user data:', resp.status);
        return;
      }
      setDataError(null);
    } catch (e) {
      setDataError('Couldn’t save. Changes may not sync.');
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
            setDataError('Couldn’t load latest data. Showing cached.');
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
        const missingSessions = localHistory.filter((s: WorkoutSession) => !serverSessionIds.has(s.id));
        const nextHistory = missingSessions.length > 0
          ? [...missingSessions, ...serverHistory]
          : serverHistory;
        const nextCustomExercises = serverCustomExercises.length > 0 ? serverCustomExercises : [];
        const localPrograms = getPrograms();
        const nextPrograms = serverPrograms.length > 0 ? serverPrograms : localPrograms;

        if (!cancelled) {
          setCircuits(nextCircuits);
          setHistory(nextHistory);
          setCustomExercises(nextCustomExercises);
          setPrograms(nextPrograms);
          setView('dashboard');
        }

        // Upload if server was empty OR if we merged local-only sessions
        const needsUpload =
          (serverCircuits.length === 0 && localCircuits.length > 0) ||
          missingSessions.length > 0 ||
          (serverPrograms.length === 0 && localPrograms.length > 0);
        if (needsUpload) {
          await persistUserData(nextCircuits, nextHistory, nextCustomExercises, nextPrograms);
        }
      } catch (e) {
        console.warn('Failed to sync user data, falling back to local:', e);
        if (!cancelled) {
          setDataError('Couldn’t load latest data. Showing cached.');
          setCircuits(localCircuits);
          setHistory(localHistory);
          setView('dashboard');
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
    setView('dashboard');
  };

  const handleUpdateCircuit = (updatedCircuit: Circuit) => {
    const updated = circuits.map(c => (c.id === updatedCircuit.id ? updatedCircuit : c));
    setCircuits(updated);
    saveCircuits(updated);
    void persistUserData(updated, history, customExercises);
    setEditingCircuit(null);
    setView('dashboard');
  };

  const handleDeleteCircuit = (id: string) => {
    const updated = circuits.filter(c => c.id !== id);
    setCircuits(updated);
    saveCircuits(updated);
    void persistUserData(updated, history, customExercises);

    if (editingCircuit?.id === id) {
      setEditingCircuit(null);
      setView('dashboard');
    }
  };

  const handleStartWorkout = (selectedCircuits: Circuit[]) => {
    setActiveCircuits(selectedCircuits);
    setView('active');
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
      setHistory(prev => [session, ...prev]);
      setActiveCircuits([]);
      setView(viewingProgram ? 'program' : 'history');
      setDataError('Session expired — workout saved locally and will sync on next sign-in.');
      return;
    }

    setHistory(prev => {
      const next = [session, ...prev];
      void persistUserData(circuits, next, customExercises, updatedPrograms);
      return next;
    });
    setActiveCircuits([]);
    setView(viewingProgram ? 'program' : 'history');
  };

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
            onDelete={handleDeleteCircuit}
            onDeleteProgram={handleDeleteProgram}
            onEdit={(circuit) => {
              setEditingCircuit(circuit);
              setView('builder');
            }}
            onNew={() => {
              setEditingCircuit(null);
              setView('builder');
            }}
            onImportCSV={() => setView('upload')}
            onOpenProgram={(program) => {
              setViewingProgram(program);
              setView('program');
            }}
          />
        );
      case 'builder':
        return (
          <CircuitBuilder
            initialCircuit={editingCircuit}
            customExercises={customExercises}
            onSaveCustomExercise={handleSaveCustomExercise}
            onSave={handleCreateCircuit}
            onUpdate={handleUpdateCircuit}
            onCancel={() => {
              setEditingCircuit(null);
              setView('dashboard');
            }}
          />
        );
      case 'active':
        return activeCircuits.length > 0 ? (
          <ActiveWorkout
            circuits={activeCircuits}
            history={history}
            onFinish={handleFinishWorkout}
            onCancel={() => {
              setActiveCircuits([]);
              setActiveProgramContext(null);
              setView(viewingProgram ? 'program' : 'dashboard');
            }}
          />
        ) : null;
      case 'history':
        return <HistoryView history={history} />;
      case 'stats':
        return <StatsView history={history} />;
      case 'upload':
        return (
          <ProgramUpload
            onImportCircuits={handleImportCircuits}
            onImportProgram={handleImportProgram}
            onCancel={() => setView('dashboard')}
          />
        );
      case 'program':
        return viewingProgram ? (
          <ProgramView
            program={viewingProgram}
            onStartDay={(workoutDay) => {
              setActiveCircuits(workoutDay.circuits);
              setActiveProgramContext({ programId: viewingProgram.id, week: workoutDay.week, day: workoutDay.day });
              setView('active');
            }}
            onDelete={handleDeleteProgram}
            onBack={() => {
              setViewingProgram(null);
              setView('dashboard');
            }}
          />
        ) : null;
      default:
        return (
          <Dashboard
            circuits={circuits}
            history={history}
            programs={programs}
            onStart={handleStartWorkout}
            onDelete={handleDeleteCircuit}
            onDeleteProgram={handleDeleteProgram}
            onEdit={(circuit) => {
              setEditingCircuit(circuit);
              setView('builder');
            }}
            onNew={() => {
              setEditingCircuit(null);
              setView('builder');
            }}
            onImportCSV={() => setView('upload')}
            onOpenProgram={(program) => {
              setViewingProgram(program);
              setView('program');
            }}
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
      <div className="h-screen-dynamic w-full max-w-md mx-auto bg-slate-50 border-x border-slate-200 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight italic text-slate-900">MyWorkoutTracker</h1>
          </div>

          <p className="text-slate-500 text-sm mb-4">
            {authStatus === 'checking' ? 'Checking your session…' : 'Sign in to continue.'}
          </p>

          {authError && (
            <div className="text-left text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 mb-4 whitespace-pre-wrap">
              {authError}
            </div>
          )}

          <div className="flex justify-center">
            {authStatus === 'checking' ? (
              <div className="text-xs text-slate-500 font-semibold">Verifying…</div>
            ) : (
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  const token = credentialResponse.credential;
                  if (!token) {
                    setAuthError('Google did not return a credential. Check your OAuth client settings.');
                    return;
                  }

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
                onError={() => {
                  setAuthError('Google login failed.');
                }}
                useOneTap
              />
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            Your Gemini API key stays server-side. We only send a Google ID token to our backend.
          </p>
        </div>
      </div>
    );
  }

  // Special full-height handling for active workout, builder, upload, and program views
  if (view === 'active' || view === 'builder' || view === 'upload' || view === 'program') {
    return (
      <div className="h-screen-dynamic w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto bg-zinc-50 relative border-x border-zinc-200 overflow-hidden">
        {renderView()}
      </div>
    );
  }

  return (
    <div className="h-screen-dynamic flex flex-col w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto bg-zinc-50 relative border-x border-zinc-200 overflow-hidden">
      {/* Header */}
      <header className="bg-zinc-900 text-white px-4 py-3 sticky top-0 z-10 shadow-sm flex-shrink-0">
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
      <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md md:max-w-3xl lg:max-w-6xl mx-auto glass-nav border-t border-zinc-200/60 px-4 pt-3 pb-[calc(1.25rem+var(--sab))] flex justify-between items-center z-50">
        <button
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[48px] ${view === 'dashboard' ? 'text-sky-500' : 'text-zinc-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => {
            setEditingCircuit(null);
            setView('builder');
          }}
          className="relative -top-5"
        >
          <div className="p-4 bg-zinc-900 text-white rounded-2xl shadow-lg ring-8 ring-zinc-50 active:scale-90 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-zinc-400">New</span>
        </button>

        <button
          onClick={() => setView('history')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[48px] ${view === 'history' ? 'text-sky-500' : 'text-zinc-400'}`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">History</span>
        </button>

        <button
          onClick={() => setView('stats')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[48px] ${view === 'stats' ? 'text-sky-500' : 'text-zinc-400'}`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Stats</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
