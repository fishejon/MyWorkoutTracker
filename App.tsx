
import React, { useState, useEffect } from 'react';
import { Activity, History as HistoryIcon, BarChart3, Dumbbell, Plus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { AppView, Circuit, WorkoutSession } from './types';
import {
  getCircuits,
  getHistory,
  saveCircuits,
  saveSession,
  setStorageNamespace,
} from './services/storage';
import Dashboard from './components/Dashboard';
import CircuitBuilder from './components/CircuitBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';

const ID_TOKEN_STORAGE_KEY = 'mwt_google_id_token';

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
  const [activeCircuits, setActiveCircuits] = useState<Circuit[]>([]);
  const [idToken, setIdToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ID_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthedUser | null>(null);

  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const clearSession = () => {
    setIdToken(null);
    setUser(null);
    setAuthStatus('unauth');
    setStorageNamespace(null);
    setCircuits([]);
    setHistory([]);
    setActiveCircuits([]);
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
      return;
    }

    if (!idToken) {
      setAuthStatus('unauth');
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
          if (!cancelled) clearSession();
          return;
        }

        const data = (await resp.json()) as AuthedUser;
        if (cancelled) return;

        setUser(data);
        setStorageNamespace(data.sub);
        setAuthStatus('authed');
      } catch {
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, hasGoogleClientId]);

  useEffect(() => {
    if (authStatus !== 'authed') return;
    setCircuits(getCircuits());
    setHistory(getHistory());
  }, [authStatus]);

  const handleCreateCircuit = (newCircuit: Circuit) => {
    const updated = [...circuits, newCircuit];
    setCircuits(updated);
    saveCircuits(updated);
    setView('dashboard');
  };

  const handleDeleteCircuit = (id: string) => {
    const updated = circuits.filter(c => c.id !== id);
    setCircuits(updated);
    saveCircuits(updated);
  };

  const handleStartWorkout = (selectedCircuits: Circuit[]) => {
    setActiveCircuits(selectedCircuits);
    setView('active');
  };

  const handleFinishWorkout = (session: WorkoutSession) => {
    saveSession(session);
    setHistory(prev => [session, ...prev]);
    setActiveCircuits([]);
    setView('history');
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
            onStart={handleStartWorkout} 
            onDelete={handleDeleteCircuit}
            onNew={() => setView('builder')}
            history={history}
            idToken={idToken}
          />
        );
      case 'builder':
        return <CircuitBuilder onSave={handleCreateCircuit} onCancel={() => setView('dashboard')} />;
      case 'active':
        return activeCircuits.length > 0 ? (
          <ActiveWorkout 
            circuits={activeCircuits} 
            onFinish={handleFinishWorkout} 
            onCancel={() => {
              setActiveCircuits([]);
              setView('dashboard');
            }} 
          />
        ) : null;
      case 'history':
        return <HistoryView history={history} />;
      case 'stats':
        return <StatsView history={history} />;
      default:
        return (
          <Dashboard
            circuits={circuits}
            onStart={handleStartWorkout}
            onDelete={handleDeleteCircuit}
            onNew={() => setView('builder')}
            history={history}
            idToken={idToken}
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

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                const token = credentialResponse.credential;
                if (!token) return;

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
                console.error('Google login failed');
              }}
              useOneTap
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            Your Gemini API key stays server-side. We only send a Google ID token to our backend.
          </p>
        </div>
      </div>
    );
  }

  // Special full-height handling for active workout and builder
  if (view === 'active' || view === 'builder') {
    return (
      <div className="h-screen-dynamic w-full max-w-md mx-auto bg-slate-50 relative border-x border-slate-200 overflow-hidden">
        {renderView()}
      </div>
    );
  }

  return (
    <div className="h-screen-dynamic flex flex-col max-w-md mx-auto bg-slate-50 relative border-x border-slate-200 overflow-hidden">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 sticky top-0 z-10 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight italic truncate">MyWorkoutTracker</h1>
              {user?.email && (
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70 truncate">
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/20 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
              title="Sign out"
            >
              Sign out
            </button>

            <button onClick={() => setView('stats')} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90" title="Stats">
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32">
        {renderView()}
      </main>

      {/* Bottom Navigation (Glassmorphic) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-nav border-t border-slate-200/50 px-8 pt-3 pb-[calc(1.5rem+var(--sab))] flex justify-between items-center z-50">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Activity className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Circuits</span>
        </button>
        
        <button 
          onClick={() => setView('builder')}
          className="relative -top-6"
        >
          <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 ring-8 ring-slate-50 active:scale-90 transition-all">
            <Plus className="w-7 h-7" />
          </div>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-slate-400">New</span>
        </button>

        <button 
          onClick={() => setView('history')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
