
import React, { useMemo, useState } from 'react';
import { Circuit, WorkoutSession, Program } from '../types';
import {
  Play, Trash2, PlusCircle, Pencil, Check, Upload,
  BookOpen, ChevronLeft, ChevronRight, Flame, Clock, ChevronDown, Download,
} from 'lucide-react';

export type DashboardTourSection = 'today' | 'calendar' | 'stats' | 'programs' | 'circuits';

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
  /** When true, sections get stable `id`s for the marketing landing scroll tour. */
  tourIds?: boolean;
  /** Visually emphasize a section (used with `tourIds` on the landing page). */
  highlightTour?: DashboardTourSection | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function relativeDay(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function calcStreak(history: WorkoutSession[]): number {
  if (history.length === 0) return 0;
  const uniqueDays = [...new Set(history.map(s => toDateStr(new Date(s.date))))].sort().reverse();
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1] + 'T12:00:00');
    const curr = new Date(uniqueDays[i] + 'T12:00:00');
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ─── Workout Calendar ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const WorkoutCalendar: React.FC<{ history: WorkoutSession[] }> = ({ history }) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const workoutDays = useMemo(() => {
    const days = new Set<string>();
    for (const session of history) {
      try { days.add(toDateStr(new Date(session.date))); } catch { /* skip */ }
    }
    return days;
  }, [history]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(new Date());

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800">Workout Calendar</h4>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-600 min-w-[88px] text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isWorkout = workoutDays.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium ${
                isWorkout ? 'bg-sky-500 text-white' : isToday ? 'ring-2 ring-sky-300 text-sky-600' : 'text-slate-500'
              }`}>{day}</div>
            </div>
          );
        })}
      </div>
      {workoutDays.size > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span className="text-[10px] text-slate-400 font-medium">Workout completed</span>
        </div>
      )}
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const tourSectionClass = (active: boolean) =>
  `rounded-2xl transition-[box-shadow,ring] duration-500 ${
    active ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-50 shadow-xl relative z-[1]' : ''
  }`;

const Dashboard: React.FC<DashboardProps> = ({
  circuits, history, programs, onStart, onDelete, onDeleteProgram,
  onEdit, onNew, onImportCSV, onOpenProgram, tourIds, highlightTour,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const streak = useMemo(() => calcStreak(history), [history]);
  const lastSession = history[0] ?? null;

  const lastSessionCircuits = useMemo(() => {
    if (!lastSession) return [];
    return circuits.filter(c => lastSession.circuitNames.includes(c.name));
  }, [lastSession, circuits]);

  const circuitLastUsed = useMemo(() => {
    const map: Record<string, string> = {};
    for (const circuit of circuits) {
      const session = history.find(s => s.circuitNames.includes(circuit.name));
      map[circuit.id] = session ? relativeDay(session.date) : 'Never';
    }
    return map;
  }, [circuits, history]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return history.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [history]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Group circuits by category; uncategorized goes last
  const { categoryGroups, uncategorized } = useMemo(() => {
    const groups = new Map<string, Circuit[]>();
    const uncategorized: Circuit[] = [];
    for (const c of circuits) {
      if (c.category?.trim()) {
        const key = c.category.trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      } else {
        uncategorized.push(c);
      }
    }
    return { categoryGroups: groups, uncategorized };
  }, [circuits]);

  // Which category groups are collapsed (default: all expanded)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const toggleCat = (cat: string) =>
    setCollapsedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });

  return (
    <div className="p-4 space-y-5">

      {/* Today Card */}
      <div
        id={tourIds ? 'landing-tour-today' : undefined}
        className={`bg-slate-900 text-white rounded-2xl p-5 ${tourSectionClass(highlightTour === 'today')}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-white/50 font-medium mb-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="text-lg font-bold">
              {history.length === 0 ? "Let's get started" : streak > 0 ? 'Keep the streak going' : 'Time to train'}
            </h2>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          )}
        </div>
        {lastSession ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/50 text-xs min-w-0 pr-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{relativeDay(lastSession.date)} · {lastSession.circuitNames.join(', ')}</span>
            </div>
            {lastSessionCircuits.length > 0 && (
              <button
                onClick={() => onStart(lastSessionCircuits)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors active:scale-95 flex-shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Again
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onNew}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Build your first circuit →
          </button>
        )}
      </div>

      {/* Calendar */}
      <div
        id={tourIds ? 'landing-tour-calendar' : undefined}
        className={tourSectionClass(highlightTour === 'calendar')}
      >
        <WorkoutCalendar history={history} />
      </div>

      {/* Quick Stats */}
      <div
        id={tourIds ? 'landing-tour-stats' : undefined}
        className={`grid grid-cols-2 gap-3 ${tourSectionClass(highlightTour === 'stats')}`}
      >
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <span className="block text-xs text-slate-500 font-medium mb-1">Total workouts</span>
          <span className="text-2xl font-bold text-slate-900">{history.length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <span className="block text-xs text-slate-500 font-medium mb-1">This month</span>
          <span className="text-2xl font-bold text-slate-900">{thisMonthCount}</span>
        </div>
      </div>

      {/* Programs */}
      <div
        id={tourIds ? 'landing-tour-programs' : undefined}
        className={`space-y-3 ${tourSectionClass(highlightTour === 'programs')}`}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800">Programs</h3>
          <div className="flex items-center gap-3">
            <a
              href="/program-template.csv"
              download
              className="text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </a>
            <button onClick={onImportCSV} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
          </div>
        </div>
        {programs.length === 0 ? (
          <button
            onClick={onImportCSV}
            className="w-full text-center py-6 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all"
          >
            <BookOpen className="w-7 h-7 mx-auto mb-1.5 opacity-40" />
            <p className="text-xs font-medium">Import a CSV to create a program</p>
            <p className="text-[10px] mt-0.5 opacity-60">Single day or multi-week plans</p>
          </button>
        ) : (
          <div className="grid gap-2">
            {programs.map(program => {
              const wpw = program.totalWeeks > 0
                ? Math.round(program.schedule.length / program.totalWeeks)
                : program.schedule.length;
              return (
                <div
                  key={program.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer"
                  onClick={() => onOpenProgram(program)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{program.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{program.totalWeeks}w · {wpw}d/week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteProgram(program.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${program.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Circuits */}
      <div
        id={tourIds ? 'landing-tour-circuits' : undefined}
        className={`space-y-3 ${tourSectionClass(highlightTour === 'circuits')}`}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800">My Circuits</h3>
          <button onClick={onNew} className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors">
            <PlusCircle className="w-3.5 h-3.5" />
            New Circuit
          </button>
        </div>

        {circuits.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400 text-sm mb-3">No circuits yet.</p>
            <button onClick={onNew} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-xl text-sm font-medium">
              Build First Circuit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Category groups */}
            {Array.from(categoryGroups.entries()).map(([cat, catCircuits]) => {
              const isCollapsed = collapsedCats.has(cat);
              const selectedInCat = catCircuits.filter(c => selectedIds.includes(c.id)).length;
              return (
                <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Category header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCat(cat)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{cat}</span>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {catCircuits.length}
                      </span>
                      {selectedInCat > 0 && (
                        <span className="text-[10px] font-semibold text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-md">
                          {selectedInCat} selected
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                  {/* Circuit rows */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {catCircuits.map(circuit => {
                        const isSelected = selectedIds.includes(circuit.id);
                        const names = circuit.exercises.map(ex => ex.name);
                        const preview = `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
                        return (
                          <div
                            key={circuit.id}
                            className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                            }`}
                            onClick={() => toggleSelection(circuit.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{circuit.name}</h4>
                                <p className="text-slate-400 text-[10px] truncate">{preview}</p>
                                <p className="text-slate-300 text-[10px] mt-0.5">{circuitLastUsed[circuit.id]}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 ml-2">
                              <button onClick={(e) => { e.stopPropagation(); onEdit(circuit); }} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors" aria-label={`Edit ${circuit.name}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onDelete(circuit.id); }} className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors" aria-label={`Delete ${circuit.name}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized circuits — flat list, no accordion wrapper */}
            {uncategorized.map(circuit => {
              const isSelected = selectedIds.includes(circuit.id);
              const names = circuit.exercises.map(ex => ex.name);
              const preview = `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
              return (
                <div
                  key={circuit.id}
                  className={`bg-white p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => toggleSelection(circuit.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm truncate">{circuit.name}</h4>
                      <p className="text-slate-400 text-[10px] truncate">{preview}</p>
                      <p className="text-slate-300 text-[10px] mt-0.5">{circuitLastUsed[circuit.id]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(circuit); }} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors" aria-label={`Edit ${circuit.name}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(circuit.id); }} className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors" aria-label={`Delete ${circuit.name}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <button
            onClick={() => { if (selectedIds.length > 0) onStart(circuits.filter(c => selectedIds.includes(c.id))); }}
            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-4 rounded-2xl font-semibold shadow-xl flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Workout{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
};

export default Dashboard;
