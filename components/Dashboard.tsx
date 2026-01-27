
import React, { useState, useEffect } from 'react';
import { Circuit, WorkoutSession } from '../types';
import { Play, Trash2, PlusCircle, Sparkles, Check, Square } from 'lucide-react';
import { analyzeWorkoutProgress } from '../services/geminiService';

interface DashboardProps {
  circuits: Circuit[];
  history: WorkoutSession[];
  idToken: string | null;
  onStart: (selectedCircuits: Circuit[]) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ circuits, history, idToken, onStart, onDelete, onNew }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchInsight = async () => {
      if (history.length > 0 && idToken) {
        setIsLoadingInsight(true);
        const insight = await analyzeWorkoutProgress(history, idToken);
        setAiInsight(insight);
        setIsLoadingInsight(false);
      } else {
        // Keep messaging simple; actual sign-in UI lives in the header.
        setAiInsight(null);
      }
    };
    fetchInsight();
  }, [history.length, idToken]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStartWorkout = () => {
    if (selectedIds.length === 0) return;
    const selected = circuits.filter(c => selectedIds.includes(c.id));
    onStart(selected);
  };

  return (
    <div className="p-5 space-y-6">
      {/* AI Insight Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <h2 className="font-semibold">AI Progress Insight</h2>
        </div>
        <p className="text-indigo-50 text-sm leading-relaxed min-h-[40px]">
          {isLoadingInsight
            ? "Analyzing your performance..."
            : aiInsight || (idToken ? "Build circuits and log workouts for personalized AI coaching." : "Sign in to enable AI insights.")}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">My Circuits</h3>
        <button onClick={onNew} className="text-indigo-600 text-sm font-semibold flex items-center gap-1">
          <PlusCircle className="w-4 h-4" />
          New Circuit
        </button>
      </div>

      {circuits.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 mb-4">No circuits yet.</p>
          <button onClick={onNew} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-md">
            Build First Circuit
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {circuits.map((circuit) => {
            const isSelected = selectedIds.includes(circuit.id);
            return (
              <div 
                key={circuit.id} 
                className={`bg-white p-4 rounded-xl shadow-sm border transition-all flex items-center justify-between group cursor-pointer ${isSelected ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-slate-100 hover:border-indigo-200'}`}
                onClick={() => toggleSelection(circuit.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 truncate">{circuit.name}</h4>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                      {circuit.exercises.length} Exercises
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(circuit.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-5">
          <button 
            onClick={handleStartWorkout}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 animate-bounce-in"
          >
            <Play className="w-5 h-5 fill-current" />
            START WORKOUT ({selectedIds.length})
          </button>
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <span className="block text-emerald-600 text-[10px] font-black uppercase">Workouts</span>
            <span className="text-2xl font-black text-slate-800">{history.length}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="block text-blue-600 text-[10px] font-black uppercase">Consistency</span>
            <span className="text-2xl font-black text-slate-800">{history.length > 0 ? "75%" : "0%"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
