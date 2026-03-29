
import React, { useMemo, useState } from 'react';
import { Circuit, WorkoutSession, Program } from '../types';
import { Play, Trash2, PlusCircle, Pencil, Check, Upload, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardProps {
  circuits: Circuit[];
  history: WorkoutSession[];
  programs: Program[];
  onStart: (selectedCircuits: Circuit[]) => void;
  onDelete: (id: string) => void;
  onDeleteProgram: (id: string) => void;
  onEdit: (circuit: Circuit) => void;
  onNew: () => void;
  onImportCSV: () => void;
  onOpenProgram: (program: Program) => void;
}

// ─── Workout Calendar ────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const WorkoutCalendar: React.FC<{ history: WorkoutSession[] }> = ({ history }) => {
  const [viewDate, setViewDate] = useState(() => new Date());

  const workoutDays = useMemo(() => {
    const days = new Set<string>();
    for (const session of history) {
      try {
        const d = new Date(session.date);
        days.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
      } catch { /* skip malformed dates */ }
    }
    return days;
  }, [history]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDow   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Build 7-column grid cells (null = empty leading/trailing cell)
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-800">Workout Calendar</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-600 min-w-[90px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isWorkout = workoutDays.has(dateStr);
          const isToday   = dateStr === todayStr;
          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                isWorkout
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : isToday
                  ? 'ring-2 ring-indigo-300 text-indigo-600'
                  : 'text-slate-500'
              }`}>
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {workoutDays.size > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <span className="text-[10px] text-slate-400 font-medium">Workout completed</span>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ circuits, history, programs, onStart, onDelete, onDeleteProgram, onEdit, onNew, onImportCSV, onOpenProgram }) => {
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
                <div
                  key={program.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between cursor-pointer"
                  onClick={() => onOpenProgram(program)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{program.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {program.totalWeeks} week{program.totalWeeks !== 1 ? 's' : ''}
                        {' · '}
                        {workoutsPerWeek} day{workoutsPerWeek !== 1 ? 's' : ''}/week
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteProgram(program.id); }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${program.name}`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
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

      {/* Workout Calendar */}
      <WorkoutCalendar history={history} />

      {/* Quick Stats Summary */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <span className="block text-emerald-600 text-[10px] font-black uppercase">Workouts</span>
            <span className="text-2xl font-black text-slate-800">{history.length}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="block text-blue-600 text-[10px] font-black uppercase">This Month</span>
            <span className="text-2xl font-black text-slate-800">
              {history.filter(s => {
                const d = new Date(s.date);
                const n = new Date();
                return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
              }).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
