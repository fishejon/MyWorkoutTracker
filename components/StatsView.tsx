
import React, { useMemo, useState } from 'react';
import { WorkoutSession } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Award } from 'lucide-react';
import { DebugLogCopyBanner } from './DebugLogCopyBanner';

interface StatsViewProps { history: WorkoutSession[]; }

const StatsView: React.FC<StatsViewProps> = ({ history }) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // All unique exercises across all sessions (ordered by most recent first)
  const allExercises = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const session of history) {
      for (const log of session.logs) {
        if (!seen.has(log.exerciseId)) {
          seen.set(log.exerciseId, { id: log.exerciseId, name: log.exerciseName });
        }
      }
    }
    return Array.from(seen.values());
  }, [history]);

  const selected = selectedExerciseId ?? allExercises[0]?.id ?? null;
  const selectedMeta = allExercises.find(e => e.id === selected);

  // Volume chart data
  const volumeData = useMemo(() =>
    [...history].reverse().map(s => ({
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: s.logs.reduce((acc, log) => {
        if (log.type === 'weight') {
          return acc + log.sets.reduce((s2, set) => s2 + ((set.weight ?? 0) * (set.value ?? 0)), 0);
        }
        return acc;
      }, 0),
    }))
  , [history]);

  // Per-exercise progress data
  const exerciseData = useMemo(() => {
    if (!selected) return [];
    return [...history].reverse().flatMap(session => {
      const log = session.logs.find(l => l.exerciseId === selected);
      if (!log) return [];
      const date = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const peak = Math.max(...log.sets.map(s => log.type === 'weight' ? (s.weight ?? 0) : s.value));
      return [{ date, val: peak }];
    });
  }, [history, selected]);

  // PR for selected exercise
  const pr = useMemo(() => {
    if (!selected || exerciseData.length === 0) return null;
    const log = history.flatMap(s => s.logs).find(l => l.exerciseId === selected);
    if (!log) return null;
    const best = Math.max(...exerciseData.map(d => d.val));
    if (log.type === 'weight') return `${best} lbs`;
    if (log.type === 'duration') return `${best}s`;
    return `${best} reps`;
  }, [exerciseData, selected, history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <TrendingUp className="text-zinc-300 w-10 h-10 mb-4" />
        <h3 className="font-semibold text-zinc-800">No data yet</h3>
        <p className="text-zinc-400 text-sm mt-1">Complete workouts to track your progress.</p>
        <DebugLogCopyBanner />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-base font-semibold text-zinc-800">Progress</h2>

      {/* Volume chart */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Total Volume (lb × reps)</h3>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', boxShadow: 'none', fontSize: 12 }} />
              <Line type="monotone" dataKey="volume" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3, fill: '#0ea5e9' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exercise selector */}
      {allExercises.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Exercise Progress</h3>

          {/* Pill row */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {allExercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => setSelectedExerciseId(ex.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  selected === ex.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>

          {/* PR banner */}
          {pr && selectedMeta && (
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider mb-0.5">Personal Record</p>
                <p className="text-sm font-semibold text-zinc-800">{selectedMeta.name}</p>
              </div>
              <div className="text-2xl font-bold text-zinc-900">{pr}</div>
            </div>
          )}

          {/* Bar chart for selected exercise */}
          {exerciseData.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={exerciseData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', boxShadow: 'none', fontSize: 12 }} cursor={{ fill: '#f9f9f9' }} />
                    <Bar dataKey="val" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
      <DebugLogCopyBanner />
    </div>
  );
};

export default StatsView;
