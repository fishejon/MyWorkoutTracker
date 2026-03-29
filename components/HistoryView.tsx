
import React, { useState } from 'react';
import { WorkoutSession, ExerciseLog } from '../types';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface HistoryViewProps { history: WorkoutSession[]; }

const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="text-zinc-300 w-7 h-7" />
        </div>
        <h3 className="font-semibold text-zinc-800">No workouts logged yet</h3>
        <p className="text-zinc-400 text-sm mt-1">Finish a workout to see it here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-base font-semibold text-zinc-800 mb-1">History</h2>
      {history.map((session) => {
        const isExpanded = expandedId === session.id;
        // Group logs by circuit
        const byCircuit = session.logs.reduce((acc: Record<string, ExerciseLog[]>, log: ExerciseLog) => {
          const key = log.circuitName ?? log.circuitId ?? 'Circuit';
          if (!acc[key]) acc[key] = [];
          acc[key].push(log);
          return acc;
        }, {});

        return (
          <div
            key={session.id}
            className="bg-white rounded-2xl border border-zinc-200 overflow-hidden"
          >
            {/* Session header — tappable */}
            <button
              className="w-full text-left px-4 py-4 flex items-center justify-between gap-3 active:bg-zinc-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-zinc-900 text-sm truncate">
                  {session.circuitNames.join(' + ') || 'Workout'}
                </h4>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {formatDate(session.date)} · {formatTime(session.date)}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {session.logs.length} exercise{session.logs.length !== 1 ? 's' : ''}
                </p>
              </div>
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              }
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-zinc-100 px-4 py-3 space-y-4">
                {(Object.entries(byCircuit) as [string, ExerciseLog[]][]).map(([circuitName, logs]) => (
                  <div key={circuitName}>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{circuitName}</p>
                    <div className="space-y-2">
                      {logs.map((log, li) => {
                        // Determine max sets
                        const setCount = log.sets.length;
                        return (
                          <div key={li} className="bg-zinc-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-zinc-800">{log.exerciseName}</span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                                log.type === 'weight' ? 'bg-sky-100 text-sky-600' :
                                log.type === 'reps'   ? 'bg-zinc-200 text-zinc-600' :
                                                       'bg-amber-100 text-amber-600'
                              }`}>
                                {log.type === 'duration' ? 'secs' : log.type}
                              </span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {Array.from({ length: setCount }, (_, si) => {
                                const set = log.sets[si];
                                if (!set) return null;
                                const label = log.type === 'weight' && set.weight
                                  ? `${set.weight}lb × ${set.value}`
                                  : log.type === 'duration'
                                  ? `${set.value}s`
                                  : `${set.value}`;
                                return (
                                  <div key={si} className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-400 font-medium">S{si + 1}</span>
                                    <span className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg px-2 py-0.5">
                                      {label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryView;
