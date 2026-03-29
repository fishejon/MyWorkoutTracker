
import React, { useState } from 'react';
import { Circuit, WorkoutSession, Program } from '../types';
import { Play, Trash2, PlusCircle, Pencil, Check, Upload, BookOpen, ChevronRight } from 'lucide-react';

interface DashboardProps {
  circuits: Circuit[];
  history: WorkoutSession[];
  programs: Program[];
  onStart: (selectedCircuits: Circuit[]) => void;
  onDelete: (id: string) => void;
  onEdit: (circuit: Circuit) => void;
  onNew: () => void;
  onImportCSV: () => void;
  onOpenProgram: (program: Program) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ circuits, history, programs, onStart, onDelete, onEdit, onNew, onImportCSV, onOpenProgram }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      {/* Programs Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Programs</h3>
          <button
            onClick={onImportCSV}
            className="text-indigo-600 text-sm font-semibold flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>

        {programs.length === 0 ? (
          <button
            onClick={onImportCSV}
            className="w-full text-center py-8 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all"
          >
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Import a CSV to create a program</p>
            <p className="text-xs mt-1 opacity-60">Single day or multi-week plans</p>
          </button>
        ) : (
          <div className="grid gap-3">
            {programs.map(program => {
              const workoutsPerWeek = program.totalWeeks > 0
                ? Math.round(program.schedule.length / program.totalWeeks)
                : program.schedule.length;
              return (
                <button
                  key={program.id}
                  onClick={() => onOpenProgram(program)}
                  className="w-full text-left bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{program.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {program.totalWeeks} week{program.totalWeeks !== 1 ? 's' : ''}
                        {' · '}
                        {workoutsPerWeek} day{workoutsPerWeek !== 1 ? 's' : ''}/week
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Circuits Section */}
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
            const exerciseNames = circuit.exercises.map(ex => ex.name);
            const exerciseListFull = exerciseNames.join(' • ');
            const exerciseListPreview = `${exerciseNames.slice(0, 4).join(' • ')}${exerciseNames.length > 4 ? ` • +${exerciseNames.length - 4} more` : ''}`;

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
                    <p
                      className="text-slate-500 text-[11px] font-medium mt-1 truncate"
                      title={exerciseListFull}
                    >
                      {exerciseListPreview}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(circuit);
                    }}
                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                    aria-label={`Edit ${circuit.name}`}
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(circuit.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    aria-label={`Delete ${circuit.name}`}
                    title="Delete"
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
