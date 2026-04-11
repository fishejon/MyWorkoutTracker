import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Circuit, WorkoutSession, ExerciseLog } from '../types';
import { CheckCircle2, ChevronLeft, Timer, LayoutGrid, SkipForward, Clock } from 'lucide-react';
import {
  getHistory,
  getLastWorkoutDataForExercise,
  getActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  activeWorkoutDraftMatches,
  activeWorkoutCircuitKey,
} from '../services/storage';

interface ActiveWorkoutProps {
  circuits: Circuit[];
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
  history?: WorkoutSession[];
}

function buildFreshLogs(circuits: Circuit[], workoutHistory: WorkoutSession[]): ExerciseLog[] {
  const initialLogs: ExerciseLog[] = [];
  circuits.forEach(circuit => {
    circuit.exercises.forEach(ex => {
      const lastWorkoutData = getLastWorkoutDataForExercise(ex.id, ex.name, workoutHistory);
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
}

function defaultSessionDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Total workout wall clock (header); h:mm:ss or m:ss */
function formatTotalWorkoutClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ circuits, onFinish, onCancel, history }) => {
  const workoutHistory = history ?? getHistory();
  const circuitKey = useMemo(() => activeWorkoutCircuitKey(circuits), [circuits]);

  const initial = useMemo(() => {
    const draft = getActiveWorkoutDraft();
    if (draft && activeWorkoutDraftMatches(draft, circuits)) {
      const clock = new Date(draft.clockISO);
      const workoutStartedAtEpoch =
        typeof draft.workoutStartedAtEpoch === 'number' && draft.workoutStartedAtEpoch > 0
          ? draft.workoutStartedAtEpoch
          : (() => {
              const t = Date.parse(draft.clockISO);
              return Number.isNaN(t) ? Date.now() : t;
            })();
      return {
        logs: draft.logs,
        sessionDate: draft.sessionDate,
        sessionClock: clock,
        workoutStartedAtEpoch,
        stopwatchAccumMs: draft.stopwatchAccumMs,
        stopwatchRunning: draft.stopwatchRunning,
        stopwatchSegmentStartEpoch: draft.stopwatchSegmentStartEpoch,
      };
    }
    const d = new Date();
    const now = Date.now();
    return {
      logs: buildFreshLogs(circuits, workoutHistory),
      sessionDate: defaultSessionDateStr(),
      sessionClock: d,
      workoutStartedAtEpoch: now,
      stopwatchAccumMs: 0,
      stopwatchRunning: false,
      stopwatchSegmentStartEpoch: null as number | null,
    };
  }, [circuits, workoutHistory]);

  const workoutStartedAtMsRef = useRef(0);
  if (workoutStartedAtMsRef.current === 0) {
    workoutStartedAtMsRef.current = initial.workoutStartedAtEpoch;
  }

  const [logs, setLogs] = useState<ExerciseLog[]>(() => initial.logs);
  const [sessionDate, setSessionDate] = useState(() => initial.sessionDate);
  const [sessionClock] = useState(() => initial.sessionClock);
  const [swAccumMs, setSwAccumMs] = useState(() => initial.stopwatchAccumMs);
  const [swRunning, setSwRunning] = useState(() => initial.stopwatchRunning);
  const [swSegmentStart, setSwSegmentStart] = useState<number | null>(
    () => initial.stopwatchSegmentStartEpoch
  );
  const [, setSwTick] = useState(0);
  const [, setTotalTick] = useState(0);

  const [restRemaining, setRestRemaining] = useState<number | null>(null);

  const stateRef = useRef({
    circuitKey,
    logs,
    sessionDate,
    sessionClock,
    swAccumMs,
    swRunning,
    swSegmentStart,
  });
  useEffect(() => {
    stateRef.current = {
      circuitKey,
      logs,
      sessionDate,
      sessionClock,
      swAccumMs,
      swRunning,
      swSegmentStart,
    };
  }, [circuitKey, logs, sessionDate, sessionClock, swAccumMs, swRunning, swSegmentStart]);

  const flushDraftToStorage = useCallback(() => {
    const s = stateRef.current;
    const draftClock = s.sessionClock.toISOString();
    saveActiveWorkoutDraft({
      circuitKey: s.circuitKey,
      sessionDate: s.sessionDate,
      clockISO: draftClock,
      workoutStartedAtEpoch: workoutStartedAtMsRef.current,
      logs: s.logs,
      stopwatchAccumMs: s.swAccumMs,
      stopwatchRunning: s.swRunning,
      stopwatchSegmentStartEpoch: s.swSegmentStart,
    });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(flushDraftToStorage, 400);
    return () => window.clearTimeout(t);
  }, [logs, sessionDate, swAccumMs, swRunning, swSegmentStart, circuitKey, flushDraftToStorage]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushDraftToStorage();
    };
    const onUnload = () => flushDraftToStorage();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [flushDraftToStorage]);

  useEffect(() => {
    if (!swRunning) return;
    const id = window.setInterval(() => setSwTick(n => n + 1), 100);
    return () => window.clearInterval(id);
  }, [swRunning]);

  useEffect(() => {
    const id = window.setInterval(() => setTotalTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalWorkoutSec =
    totalTick >= 0
      ? Math.max(0, Math.floor((Date.now() - workoutStartedAtMsRef.current) / 1000))
      : 0;

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

  const stopwatchDisplayMs =
    swRunning && swSegmentStart !== null ? swAccumMs + (Date.now() - swSegmentStart) : swAccumMs;

  const handleStopwatchStart = () => {
    if (swRunning) return;
    setSwSegmentStart(Date.now());
    setSwRunning(true);
  };

  const handleStopwatchStop = () => {
    if (!swRunning || swSegmentStart === null) return;
    setSwAccumMs(swAccumMs + (Date.now() - swSegmentStart));
    setSwRunning(false);
    setSwSegmentStart(null);
  };

  const handleStopwatchReset = () => {
    setSwAccumMs(0);
    setSwRunning(false);
    setSwSegmentStart(null);
  };

  const updateLog = useCallback((logIdx: number, setIdx: number, field: 'value' | 'weight', val: string | number) => {
    const numVal = typeof val === 'string' ? (val === '' ? 0 : parseFloat(val) || 0) : val;

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
    if (!window.confirm('Finish workout?')) return;
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - workoutStartedAtMsRef.current) / 1000)
    );
    flushDraftToStorage();
    clearActiveWorkoutDraft();
    const [yr, mo, da] = sessionDate.split('-').map(Number);
    const localDate = new Date(
      yr,
      mo - 1,
      da,
      sessionClock.getHours(),
      sessionClock.getMinutes(),
      sessionClock.getSeconds()
    );
    onFinish({
      id: crypto.randomUUID(),
      circuitNames: circuits.map(c => c.name),
      date: localDate.toISOString(),
      logs,
      durationSeconds,
    });
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStopwatch = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const startRest = (seconds: number) => {
    setRestRemaining(seconds);
  };

  const skipRest = () => setRestRemaining(null);

  const groupedLogs = circuits.map(c => ({
    circuit: c,
    logsWithIndices: logs
      .map((log, index) => ({ log, index }))
      .filter(item => item.log.circuitId === c.id),
  }));

  return (
    <div className="flex flex-col h-screen-dynamic bg-zinc-50 relative overflow-hidden">
      {/* Slim bar: stays put; total duration lives below in scroll so it can scroll away */}
      <div className="bg-zinc-900 px-3 py-3 flex items-center justify-between gap-2 z-50 text-white shadow-sm shrink-0">
        <button
          onClick={onCancel}
          className="p-2 active:scale-90 transition-transform bg-white/10 rounded-full flex-shrink-0"
          aria-label="Back"
        >
          <ChevronLeft />
        </button>
        <span className="text-xs font-medium text-white/45 truncate text-center flex-1 px-2">Session</span>
        <button
          onClick={handleFinish}
          className="bg-white text-zinc-900 font-semibold text-xs px-4 py-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
        >
          End
        </button>
      </div>

      {/* Exercise stopwatch + rest — fixed over content while you scroll */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] w-[min(22rem,calc(100vw-1rem))] pointer-events-none"
        style={{
          top: 'max(5.25rem, calc(env(safe-area-inset-top, 0px) + 4.5rem))',
        }}
      >
        <div className="rounded-2xl bg-zinc-900/95 text-white shadow-lg border border-white/10 backdrop-blur-md px-3 py-2.5 space-y-2.5 pointer-events-auto">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Timer className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <p className="text-[9px] font-medium text-white/45 uppercase tracking-wide">Exercise timer</p>
            </div>
            <p className="text-xl font-bold tabular-nums leading-tight text-center mb-2">
              {formatStopwatch(stopwatchDisplayMs)}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleStopwatchStart}
                disabled={swRunning}
                className="flex-1 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-[11px] font-semibold disabled:opacity-35 disabled:pointer-events-none"
              >
                Start
              </button>
              <button
                type="button"
                onClick={handleStopwatchStop}
                disabled={!swRunning}
                className="flex-1 py-2 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-[11px] font-semibold disabled:opacity-35 disabled:pointer-events-none"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={handleStopwatchReset}
                disabled={!swRunning && swAccumMs === 0}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold disabled:opacity-35 disabled:pointer-events-none"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[9px] font-medium text-white/45 uppercase tracking-wide">Rest</p>
              {restRemaining !== null && restRemaining > 0 && (
                <button
                  type="button"
                  onClick={skipRest}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-[10px] font-semibold"
                >
                  <SkipForward className="w-3 h-3" />
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
                <p className={`text-xl font-black tabular-nums ${restRemaining === 0 ? 'text-sky-300' : ''}`}>
                  {restRemaining === 0 ? 'Done' : formatTime(restRemaining)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-[10.5rem] pb-40 space-y-8">
        {/* Total workout wall clock — top of scroll; scrolls away with the log matrix */}
        <div className="bg-zinc-900 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 border border-zinc-800 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
              <Clock className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-white/45 uppercase tracking-wide">Total workout</p>
              <p className="text-2xl font-bold tabular-nums leading-tight">
                {formatTotalWorkoutClock(totalWorkoutSec)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-100 rounded-xl">
              <LayoutGrid className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Routine</p>
              <p className="text-sm font-semibold text-zinc-900">
                {circuits.length} Circuit{circuits.length !== 1 ? 's' : ''} · {logs.length} Exercises
              </p>
            </div>
          </div>
          <input
            type="date"
            className="text-xs font-medium text-zinc-600 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-200 outline-none focus:border-sky-400"
            value={sessionDate}
            onChange={e => setSessionDate(e.target.value)}
          />
        </div>

        {groupedLogs.map(({ circuit, logsWithIndices }) => {
          const maxSets = Math.max(...logsWithIndices.map(({ log }) => log.sets.length), 1);
          const setIndices = Array.from({ length: maxSets }, (_, i) => i);
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
                          <td
                            className="px-4 py-1 sticky left-0 z-20 bg-zinc-50/90"
                            style={{ boxShadow: '2px 0 6px rgba(0,0,0,0.04)' }}
                          />
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
                          <td
                            className="px-4 py-3 sticky left-0 z-10 bg-white"
                            style={{ boxShadow: '2px 0 6px rgba(0,0,0,0.04)' }}
                          >
                            <p className="font-semibold text-zinc-900 text-sm leading-tight">{log.exerciseName}</p>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium tracking-wide ${
                                log.type === 'weight'
                                  ? 'bg-zinc-100 text-sky-500'
                                  : log.type === 'reps'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-amber-100 text-amber-600'
                              }`}
                            >
                              {log.type === 'duration' ? 'secs' : log.type}
                            </span>
                          </td>

                          {setIndices.map(si => {
                            const set = log.sets[si];
                            const lastSet = log.lastWorkoutSets?.[si];

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
                                <td
                                  key={si}
                                  colSpan={hasWeightEx ? 2 : 1}
                                  className="px-2 py-3 border-l border-slate-100"
                                >
                                  <div className="h-10 w-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 opacity-30 mx-auto" />
                                </td>
                              );
                            }

                            const wPh =
                              lastSet?.weight && lastSet.weight > 0
                                ? String(lastSet.weight)
                                : log.suggestedWeight && log.suggestedWeight > 0
                                  ? String(log.suggestedWeight)
                                  : '·';
                            const vPh =
                              lastSet?.value && lastSet.value > 0
                                ? String(lastSet.value)
                                : log.suggestedValue && log.suggestedValue > 0
                                  ? String(log.suggestedValue)
                                  : '·';

                            if (log.type === 'weight') {
                              return (
                                <React.Fragment key={si}>
                                  <td className="px-1 py-3 border-l border-slate-100">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      pattern="[0-9]*[.,]?[0-9]*"
                                      className="w-12 h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-sky-400 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={wPh}
                                      value={set.weight === 0 ? '' : set.weight}
                                      onChange={e => updateLog(logIdx, si, 'weight', e.target.value)}
                                    />
                                  </td>
                                  <td className="px-1 py-3">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      className="w-12 h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-sky-400 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={vPh}
                                      value={set.value === 0 ? '' : set.value}
                                      onChange={e => updateLog(logIdx, si, 'value', e.target.value)}
                                    />
                                  </td>
                                </React.Fragment>
                              );
                            }

                            return (
                              <td
                                key={si}
                                colSpan={hasWeightEx ? 2 : 1}
                                className="px-2 py-3 border-l border-slate-100"
                              >
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className={`h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none transition-all text-center block mx-auto ${
                                    log.type === 'duration'
                                      ? 'w-16 focus:border-amber-400 focus:bg-white'
                                      : 'w-14 focus:border-emerald-400 focus:bg-white'
                                  }`}
                                  placeholder={vPh}
                                  value={set.value === 0 ? '' : set.value}
                                  onChange={e => updateLog(logIdx, si, 'value', e.target.value)}
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
