
import React, { useState, useEffect } from 'react';
import { Layout, Plus, Activity, History as HistoryIcon, BarChart3, Settings, Dumbbell } from 'lucide-react';
import { AppView, Circuit, WorkoutSession } from './types';
import { getCircuits, getHistory, saveCircuits, saveSession } from './services/storage';
import Dashboard from './components/Dashboard';
import CircuitBuilder from './components/CircuitBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [activeCircuits, setActiveCircuits] = useState<Circuit[]>([]);

  useEffect(() => {
    setCircuits(getCircuits());
    setHistory(getHistory());
  }, []);

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
        return <Dashboard circuits={circuits} onStart={handleStartWorkout} onDelete={handleDeleteCircuit} onNew={() => setView('builder')} history={history} />;
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight italic">MyWorkoutTracker</h1>
          </div>
          <button onClick={() => setView('stats')} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90">
            <BarChart3 className="w-5 h-5" />
          </button>
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
