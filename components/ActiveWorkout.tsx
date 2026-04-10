import React, { useState, useEffect, useCallback } from 'react';
import { Circuit, WorkoutSession, ExerciseLog } from '../types';
import { CheckCircle2, ChevronLeft, Timer, LayoutGrid, SkipForward } from 'lucide-react';
import { getHistory, getLastWorkoutDataForExercise } from '../services/storage';

interface ActiveWorkoutProps {
  circuits: Circuit[];
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
  history?: WorkoutSession[];
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ circuits, onFinish, onCancel, history }) => {
  // Use provided history or fetch from storage if not provided
  const workoutHistory = history ?? getHistory();
  
  const [logs, setLogs] = useState<ExerciseLog[]>(() => {
    const initialLogs: ExerciseLog[] = [];
    circuits.forEach(circuit => {
      circuit.exercises.forEach(ex => {
        // Find last workout data for this exercise
        const lastWorkoutData = getLastWorkoutDataForExercise(ex.id, ex.name, workoutHistory);
        
        // Always start empty — placeholders show history first, then CSV suggestion.
        const sets = Array.from({ length: ex.sets }).map((_, i) => ({
          setIndex: i,
          value: 0,
          weight: ex.type === 'weight' ? 0 : undefined,
        }));
        
        initialLogs.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          type: ex.type,
          circuitId: circuit.id,
          circuitName: circuit.name,
          sets,
          lastWorkoutSets: lastWorkoutData?.sets,
          suggestedWeight: ex.suggestedWeight,
          suggestedValue: ex.suggestedValue,
        });
      });
    });
    return initialLogs;
  });

  // Use local date components to avoid UTC-midnight timezone issues.
  const [sessionDate, setSessionDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [startTime] = useState(new Date());
  const [timer, setTimer] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const restActive = restRemaining !== null && restRemaining > 0;
  useEffect(() => {
    if (!restActive) return;
    const id = window.setInterval(() => {
      setRestRemaining(r => {
        if (r === null || r <= 1) return 0;
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [restActive]);

  useEffect(() => {
    if (restRemaining !== 0) return;
    const t = window.setTimeout(() => setRestRemaining(null), 2500);
    return () => window.clearTimeout(t);
  }, [restRemaining]);

  const updateLog = useCallback((logIdx: number, setIdx: number, field: 'value' | 'weight', val: string | number) => {
    const numVal = typeof val === 'string' 
      ? (val === '' ? 0 : (parseFloat(val) || 0))
      : val;
      
    setLogs(prev => {
      const newLogs = [...prev];
      if (!newLogs[logIdx]) return prev;
      const log = { ...newLogs[logIdx] };
      const sets = [...log.sets];
      const set = { ...sets[setIdx] };
      if (field === 'value') set.value = numVal;
      if (field === 'weight') set.weight = numVal;
      sets[setIdx] = set;
      log.sets = sets;
      newLogs[logIdx] = log;
      return newLogs;
    });
  }, []);

  const handleFinish = () => {
    if (!window.confirm("Finish workout?")) return;
    // Build a local-timezone Date from the user-selected date + actual start time,
    // so the ISO string is anchored to local time (not UTC midnight).
    const [yr, mo, da] = sessionDate.split('-').map(Number);
    const localDate = new Date(yr, mo - 1, da, startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
    onFinish({
      id: Date.now().toString(),
      circuitNames: circuits.map(c => c.name),
      date: localDate.toISOString(),
      logs
    });
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRest = (seconds: number) => {
    setRestRemaining(seconds);
  };

  const skipRest = () => setRestRemaining(null);

  const groupedLogs = circuits.map(c => ({
    circuit: c,
    logsWithIndices: logs
      .map((log, index) => ({ log, index }))
      .filter(item => item.log.circuitId === c.id)
  }));

  return (
    <div className="flex flex-col h-screen-dynamic bg-zinc-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 p-4 flex items-center justify-between z-50 text-white shadow-sm shrink-0">
        <button onClick={onCancel} className="p-2 active:scale-90 transition-transform bg-white/10 rounded-full"><ChevronLeft /></button>
        <h2 className="text-xs font-medium text-white/50">Session</h2>
        <button
          onClick={handleFinish}
          className="bg-white text-zinc-900 font-semibold text-xs px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          End
        </button>
      </div>

      {/* Floats above scroll area (absolute in column): session clock + rest — stays visible while scrolling */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[100] w-[min(22rem,calc(100%-1rem))] pointer-events-auto"
        style={{
          top: 'max(4.75rem, calc(env(safe-area-inset-top, 0px) + 4rem))',
        }}
      >
        <div className="rounded-2xl bg-zinc-900/95 text-white shadow-lg border border-white/10 backdrop-blur-md px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Timer className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-medium text-white/45 uppercase tracking-wide">Elapsed</p>
                <p className="text-lg font-bold tabular-nums leading-tight">{formatTime(timer)}</p>
              </div>
            </div>
            {restRemaining !== null && restRemaining > 0 && (
              <button
                type="button"
                onClick={skipRest}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold flex-shrink-0"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </button>
            )}
          </div>
          {restRemaining === null || restRemaining === 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[45, 60, 90, 120].map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => startRest(sec)}
                  className="flex-1 min-w-[3.25rem] py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-semibold tabular-nums"
                >
                  {sec}s
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-0.5">
              <p className="text-[9px] font-medium text-white/45 uppercase tracking-wide">Rest</p>
              <p className={`text-2xl font-black tabular-nums ${restRemaining === 0 ? 'text-sky-300' : ''}`}>
                {restRemaining === 0 ? 'Done' : formatTime(restRemaining)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-32 pb-40 space-y-8">
        {/* Info Row */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-100 rounded-xl">
              <LayoutGrid className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Routine</p>
              <p className="text-sm font-semibold text-zinc-900">{circuits.length} Circuit{circuits.length !== 1 ? 's' : ''} · {logs.length} Exercises</p>
            </div>
          </div>
          <input
            type="date"
            className="text-xs font-medium text-zinc-600 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-200 outline-none focus:border-sky-400"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>

        {/* Circuit matrices */}
        {groupedLogs.map(({ circuit, logsWithIndices }) => {
          const maxSets = Math.max(...logsWithIndices.map(({ log }) => log.sets.length), 1);
          const setIndices = Array.from({ length: maxSets }, (_, i) => i);
          // When any exercise in the circuit tracks weight, use 2-column set cells (lbs + reps)
          const hasWeightEx = logsWithIndices.some(({ log }) => log.type === 'weight');

          return (
            <div key={circuit.id} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-xs font-semibold text-zinc-500 whitespace-nowrap">{circuit.name}</h3>
                <div className="h-px w-full bg-zinc-200" />
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="border-collapse" style={{ minWidth: '100%' }}>
                    <thead>
                      {/* Primary header: Exercise | Set 1 | Set 2 | … */}
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th
                          className="text-left px-4 py-3 text-[9px] font-medium text-zinc-400 uppercase tracking-wide sticky left-0 z-20 bg-zinc-50"
                          style={{ minWidth: '140px', boxShadow: '2px 0 6px rgba(0,0,0,0.04)' }}
                        >
                          Exercise
                        </th>
                        {setIndices.map(si => (
                          <th
                            key={si}
                            colSpan={hasWeightEx ? 2 : 1}
                            className="px-2 py-2.5 text-[9px] font-medium text-sky-400 uppercase tracking-wide text-center border-l border-zinc-100"
                            style={{ minWidth: hasWeightEx ? '108px' : '72px' }}
                          >
                            Set {si + 1}
                          </th>
                        ))}
                      </tr>
                      {hasWeightEx && (
                        <tr className="border-b border-zinc-100 bg-zinc-50/50">
                          <td className="px-4 py-1 sticky left-0 z-20 bg-zinc-50/90" style={{ boxShadow: '2px 0 6px rgba(0,0,0,0.04)' }} />
                          {setIndices.map(si => (
                            <React.Fragment key={si}>
                              <td className="py-1 text-center border-l border-zinc-100">
                                <span className="text-[8px] font-medium text-zinc-300">lbs</span>
                              </td>
                              <td className="py-1 text-center">
                                <span className="text-[8px] font-medium text-zinc-300">reps</span>
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {logsWithIndices.map(({ log, index: logIdx }) => (
                        <tr key={`${log.exerciseId}-${logIdx}`}>
                          {/* Exercise name + type badge — sticky frozen column */}
                          <td className="px-4 py-3 sticky left-0 z-10 bg-white" style={{ boxShadow: '2px 0 6px rgba(0,0,0,0.04)' }}>
                            <p className="font-semibold text-zinc-900 text-sm leading-tight">{log.exerciseName}</p>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium tracking-wide ${
                              log.type === 'weight' ? 'bg-zinc-100 text-sky-500' :
                              log.type === 'reps'   ? 'bg-emerald-100 text-emerald-600' :
                                                     'bg-amber-100 text-amber-600'
                            }`}>
                              {log.type === 'duration' ? 'secs' : log.type}
                            </span>
                          </td>

                          {/* Set cells */}
                          {setIndices.map(si => {
                            const set = log.sets[si];
                            const lastSet = log.lastWorkoutSets?.[si];

                            // Exercise has fewer sets than the circuit max — render empty placeholder(s)
                            if (!set) {
                              if (log.type === 'weight') {
                                return (
                                  <React.Fragment key={si}>
                                    <td className="px-1 py-3 border-l border-slate-100">
                                      <div className="w-10 h-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 opacity-30 mx-auto" />
                                    </td>
                                    <td className="px-1 py-3">
                                      <div className="w-10 h-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 opacity-30 mx-auto" />
                                    </td>
                                  </React.Fragment>
                                );
                              }
                              return (
                                <td key={si} colSpan={hasWeightEx ? 2 : 1} className="px-2 py-3 border-l border-slate-100">
                                  <div className="h-10 w-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 opacity-30 mx-auto" />
                                </td>
                              );
                            }

                            // Placeholder priority: last workout → CSV suggestion → ·
                            const wPh = (lastSet?.weight && lastSet.weight > 0)
                              ? String(lastSet.weight)
                              : (log.suggestedWeight && log.suggestedWeight > 0)
                                ? String(log.suggestedWeight)
                                : '·';
                            const vPh = (lastSet?.value && lastSet.value > 0)
                              ? String(lastSet.value)
                              : (log.suggestedValue && log.suggestedValue > 0)
                                ? String(log.suggestedValue)
                                : '·';

                            // Weight exercise: two side-by-side inputs (lbs | reps)
                            if (log.type === 'weight') {
                              return (
                                <React.Fragment key={si}>
                                  <td className="px-1 py-3 border-l border-slate-100">
                                    <input
                                      type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                          className="w-12 h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-sky-400 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={wPh}
                                      value={set.weight === 0 ? '' : set.weight}
                                      onChange={(e) => updateLog(logIdx, si, 'weight', e.target.value)}
                                    />
                                  </td>
                                  <td className="px-1 py-3">
                                    <input
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                          className="w-12 h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-sky-400 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={vPh}
                                      value={set.value === 0 ? '' : set.value}
                                      onChange={(e) => updateLog(logIdx, si, 'value', e.target.value)}
                                    />
                                  </td>
                                </React.Fragment>
                              );
                            }

                            // Reps or duration — single input, spans 2 cols when circuit has weight exercises
                            return (
                              <td key={si} colSpan={hasWeightEx ? 2 : 1} className="px-2 py-3 border-l border-slate-100">
                                <input
                                  type="text" inputMode="numeric" pattern="[0-9]*"
                                  className={`h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none transition-all text-center block mx-auto ${
                                    log.type === 'duration'
                                      ? 'w-16 focus:border-amber-400 focus:bg-white'
                                      : 'w-14 focus:border-emerald-400 focus:bg-white'
                                  }`}
                                  placeholder={vPh}
                                  value={set.value === 0 ? '' : set.value}
                                  onChange={(e) => updateLog(logIdx, si, 'value', e.target.value)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+var(--sab))] glass-nav border-t border-slate-200/50 z-50">
        <button
          onClick={handleFinish}
        className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-semibold shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
        >
          <CheckCircle2 className="w-7 h-7" /> Finish Routine
        </button>
      </div>
    </div>
  );
};

export default ActiveWorkout;
