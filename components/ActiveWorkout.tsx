import React, { useState, useEffect, useCallback } from 'react';
import { Circuit, WorkoutSession, ExerciseLog } from '../types';
import { CheckCircle2, ChevronLeft, Timer, LayoutGrid } from 'lucide-react';
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
        
        // Initialize sets: prefer suggested values from CSV, else start at 0.
        // Last workout data is shown as placeholder text if the field is cleared.
        const sets = Array.from({ length: ex.sets }).map((_, i) => ({
          setIndex: i,
          value: ex.suggestedValue ?? 0,
          weight: ex.type === 'weight' ? (ex.suggestedWeight ?? 0) : undefined,
        }));
        
        initialLogs.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          type: ex.type,
          circuitId: circuit.id,
          circuitName: circuit.name,
          sets,
          // Store last workout sets for display purposes
          lastWorkoutSets: lastWorkoutData?.sets
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

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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
        <div className="text-center">
          <h2 className="text-xs font-medium text-white/50 mb-0.5">Session</h2>
          <div className="flex items-center justify-center gap-1.5 text-lg font-bold">
            <Timer className="w-4 h-4 text-white/40" />
            <span>{formatTime(timer)}</span>
          </div>
        </div>
        <button
          onClick={handleFinish}
          className="bg-white text-zinc-900 font-semibold text-xs px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          End
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 pb-40">
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

              <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      {/* Primary header: Exercise | Set 1 | Set 2 | … */}
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th
                          className="text-left px-4 py-3 text-[9px] font-medium text-zinc-400 uppercase tracking-wide"
                          style={{ minWidth: '130px' }}
                        >
                          Exercise
                        </th>
                        {setIndices.map(si => (
                          <th
                            key={si}
                            colSpan={hasWeightEx ? 2 : 1}
                            className="px-2 py-2.5 text-[9px] font-medium text-sky-400 uppercase tracking-wide text-center border-l border-zinc-100"
                            style={{ minWidth: hasWeightEx ? '84px' : '56px' }}
                          >
                            Set {si + 1}
                          </th>
                        ))}
                      </tr>
                      {hasWeightEx && (
                        <tr className="border-b border-zinc-100 bg-zinc-50/50">
                          <td className="px-4 py-1" />
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
                          {/* Exercise name + type badge */}
                          <td className="px-4 py-3">
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

                            // Weight exercise: two side-by-side inputs (lbs | reps)
                            if (log.type === 'weight') {
                              return (
                                <React.Fragment key={si}>
                                  <td className="px-1 py-3 border-l border-slate-100">
                                    <input
                                      type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                          className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-sky-400 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={lastSet?.weight && lastSet.weight > 0 ? String(lastSet.weight) : '·'}
                                      value={set.weight === 0 ? '' : set.weight}
                                      onChange={(e) => updateLog(logIdx, si, 'weight', e.target.value)}
                                    />
                                  </td>
                                  <td className="px-1 py-3">
                                    <input
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                          className="w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-sky-400 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={lastSet?.value && lastSet.value > 0 ? String(lastSet.value) : '·'}
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
                                  className={`h-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none transition-all text-center block mx-auto ${
                                    log.type === 'duration'
                                      ? 'w-14 focus:border-amber-400 focus:bg-white'
                                      : 'w-12 focus:border-emerald-400 focus:bg-white'
                                  }`}
                                  placeholder={lastSet?.value && lastSet.value > 0 ? String(lastSet.value) : '·'}
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
