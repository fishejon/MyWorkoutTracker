
import React, { useMemo, useState } from 'react';
import { Circuit, WorkoutSession, Program } from '../types';
import {
  Play, Trash2, Upload,
  BookOpen, ChevronLeft, ChevronRight, Flame, Clock, Download,
} from 'lucide-react';

export type DashboardTourSection = 'today' | 'calendar' | 'stats' | 'programs';

interface DashboardProps {
  circuits: Circuit[];
  history: WorkoutSession[];
  programs: Program[];
  onStart: (selectedCircuits: Circuit[]) => void;
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
  circuits, history, programs, onStart, onDeleteProgram,
  onEdit, onNew, onImportCSV, onOpenProgram, tourIds, highlightTour,
}) => {
  const streak = useMemo(() => calcStreak(history), [history]);
  const lastSession = history[0] ?? null;

  const lastSessionCircuits = useMemo(() => {
    if (!lastSession) return [];
    return circuits.filter(c => lastSession.circuitNames.includes(c.name));
  }, [lastSession, circuits]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return history.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [history]);

  return (
    <div className="p-4 space-y-5">

      {/* Today Card */}
      <div
        id={tourIds ? 'landing-tour-today' : undefined}
        className={`bg-zinc-900 text-white rounded-2xl p-5 border border-zinc-800 ${tourSectionClass(highlightTour === 'today')}`}
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
            <div className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3 py-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-white tabular-nums">{streak}</span>
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

      <div className="h-4" />
    </div>
  );
};

export default Dashboard;
