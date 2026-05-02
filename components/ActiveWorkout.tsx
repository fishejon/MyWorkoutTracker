import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Circuit, WorkoutSession, ExerciseLog, CustomExercise } from '../types';
import { CheckCircle2, ChevronLeft, Timer, LayoutGrid, Clock, ChevronDown, Pencil } from 'lucide-react';
import {
  getHistory,
  getLastWorkoutDataForExercise,
  getActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  activeWorkoutDraftMatches,
  activeWorkoutCircuitKey,
} from '../services/storage';
import { reconcileLogsWithCircuits } from '../services/activeWorkoutLogReconcile';
import ActiveWorkoutRoutineEditor from './ActiveWorkoutRoutineEditor';

interface ActiveWorkoutProps {
  circuits: Circuit[];
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
  history?: WorkoutSession[];
  /** User's saved circuits — for adding to the session mid-workout. */
  libraryCircuits: Circuit[];
  onCircuitsChange: (next: Circuit[]) => void;
  customExercises: CustomExercise[];
  existingCategories: string[];
  onSaveCustomExercise: (ex: CustomExercise) => void;
  /** When true, shows an amber indicator: session expired but local draft saving is still active. */
  isSessionExpired?: boolean;
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
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function safeDateFromISO(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function safeDateToISO(d: Date): string {
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseCountdownTargetSec(minStr: string, secStr: string): number {
  const m = Math.max(0, parseInt(minStr, 10) || 0);
  const s = Math.max(0, Math.min(59, parseInt(secStr, 10) || 0));
  return Math.max(1, m * 60 + s);
}

function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function serializeCircuitsSyncSignature(c: Circuit[]): string {
  return JSON.stringify(
    c.map(x => ({
      id: x.id,
      ex: x.exercises.map(e => ({ id: e.id, sets: e.sets, type: e.type })),
    }))
  );
}

/** Whole pounds with no decimal; fractional only when needed (e.g. 137.5). */
function formatWeightDisplay(w: number): string {
  if (!Number.isFinite(w) || w === 0) return '';
  const r = Math.round(w * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2).replace(/\.?0+$/, '');
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  circuits,
  onFinish,
  onCancel,
  history,
  libraryCircuits,
  onCircuitsChange,
  customExercises,
  existingCategories,
  onSaveCustomExercise,
  isSessionExpired,
}) => {
  const workoutHistory = history ?? getHistory();
  const circuitKey = useMemo(() => activeWorkoutCircuitKey(circuits), [circuits]);

  const initial = useMemo(() => {
    const draft = getActiveWorkoutDraft();
    const draftMatches = Boolean(draft && activeWorkoutDraftMatches(draft, circuits));
    if (draftMatches && draft) {
      const clock = safeDateFromISO(draft.clockISO);
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
        exerciseTimerMode: draft.exerciseTimerMode === 'countdown' ? 'countdown' as const : 'stopwatch' as const,
        countdownInputMin: draft.countdownInputMin ?? '1',
        countdownInputSec: draft.countdownInputSec ?? '0',
        countdownRemainingSec:
          typeof draft.countdownRemainingSec === 'number' ? draft.countdownRemainingSec : null,
        countdownRunning: Boolean(draft.countdownRunning),
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
      exerciseTimerMode: 'stopwatch' as const,
      countdownInputMin: '1',
      countdownInputSec: '0',
      countdownRemainingSec: null as number | null,
      countdownRunning: false,
    };
  }, [circuits, workoutHistory]);

  const workoutStartedAtMsRef = useRef(0);
  if (workoutStartedAtMsRef.current === 0) {
    const start = initial.workoutStartedAtEpoch;
    workoutStartedAtMsRef.current =
      typeof start === 'number' && Number.isFinite(start) && start > 0 ? start : Date.now();
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
  /** Bump-only state so the total-workout clock re-renders every second (value unused on purpose). */
  const [, setWorkoutClockTick] = useState(0);

  const [fabOpen, setFabOpen] = useState(false);
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false);
  const [exerciseTimerMode, setExerciseTimerMode] = useState<'stopwatch' | 'countdown'>(
    () => initial.exerciseTimerMode
  );
  const [cdInputMin, setCdInputMin] = useState(() => initial.countdownInputMin);
  const [cdInputSec, setCdInputSec] = useState(() => initial.countdownInputSec);
  const [cdRemainingSec, setCdRemainingSec] = useState<number | null>(() => initial.countdownRemainingSec);
  const [cdRunning, setCdRunning] = useState(() => initial.countdownRunning);

  /** Lets users type partial decimals (e.g. `137.`) without the controlled input snapping closed. */
  const [weightDraftByKey, setWeightDraftByKey] = useState<Record<string, string>>({});

  const stateRef = useRef({
    circuitKey,
    logs,
    sessionDate,
    sessionClock,
    swAccumMs,
    swRunning,
    swSegmentStart,
    exerciseTimerMode,
    countdownInputMin: cdInputMin,
    countdownInputSec: cdInputSec,
    countdownRemainingSec: cdRemainingSec,
    countdownRunning: cdRunning,
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
      exerciseTimerMode,
      countdownInputMin: cdInputMin,
      countdownInputSec: cdInputSec,
      countdownRemainingSec: cdRemainingSec,
      countdownRunning: cdRunning,
    };
  }, [
    circuitKey,
    logs,
    sessionDate,
    sessionClock,
    swAccumMs,
    swRunning,
    swSegmentStart,
    exerciseTimerMode,
    cdInputMin,
    cdInputSec,
    cdRemainingSec,
    cdRunning,
  ]);

  const flushDraftToStorage = useCallback(() => {
    try {
      const s = stateRef.current;
      saveActiveWorkoutDraft({
        circuitKey: s.circuitKey,
        sessionDate: s.sessionDate,
        clockISO: safeDateToISO(s.sessionClock),
        workoutStartedAtEpoch: workoutStartedAtMsRef.current,
        logs: s.logs,
        stopwatchAccumMs: s.swAccumMs,
        stopwatchRunning: s.swRunning,
        stopwatchSegmentStartEpoch: s.swSegmentStart,
        exerciseTimerMode: s.exerciseTimerMode,
        countdownInputMin: s.countdownInputMin,
        countdownInputSec: s.countdownInputSec,
        countdownRemainingSec: s.countdownRemainingSec,
        countdownRunning: s.countdownRunning,
      });
    } catch {
      // avoid crashing the app if localStorage or date serialization fails
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(flushDraftToStorage, 400);
    return () => window.clearTimeout(t);
  }, [
    logs,
    sessionDate,
    swAccumMs,
    swRunning,
    swSegmentStart,
    circuitKey,
    exerciseTimerMode,
    cdInputMin,
    cdInputSec,
    cdRemainingSec,
    cdRunning,
    flushDraftToStorage,
  ]);

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
    const id = window.setInterval(() => setWorkoutClockTick(n => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const workoutHistoryRef = useRef(workoutHistory);
  workoutHistoryRef.current = workoutHistory;
  const circuitsSyncSigRef = useRef<string>('');
  const isInitialCircuitsSync = useRef(true);

  useEffect(() => {
    const sig = serializeCircuitsSyncSignature(circuits);
    if (isInitialCircuitsSync.current) {
      isInitialCircuitsSync.current = false;
      circuitsSyncSigRef.current = sig;
      return;
    }
    if (sig === circuitsSyncSigRef.current) return;
    circuitsSyncSigRef.current = sig;
    setLogs(prev => reconcileLogsWithCircuits(prev, circuits, workoutHistoryRef.current));
  }, [circuits]);

  const startedAt = workoutStartedAtMsRef.current;
  const totalWorkoutSec =
    Number.isFinite(startedAt) && startedAt > 0
      ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      : 0;

  const stopwatchDisplayMs =
    swRunning && swSegmentStart !== null ? swAccumMs + (Date.now() - swSegmentStart) : swAccumMs;

  const handleStopwatchToggle = () => {
    if (swRunning && swSegmentStart !== null) {
      setSwAccumMs(a => a + (Date.now() - swSegmentStart));
      setSwRunning(false);
      setSwSegmentStart(null);
    } else {
      setSwSegmentStart(Date.now());
      setSwRunning(true);
    }
  };

  const handleStopwatchClear = () => {
    setSwAccumMs(0);
    setSwRunning(false);
    setSwSegmentStart(null);
  };

  useEffect(() => {
    if (!cdRunning) return;
    const id = window.setInterval(() => {
      setCdRemainingSec(r => {
        if (r === null || r <= 1) {
          window.setTimeout(() => setCdRunning(false), 0);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [cdRunning]);

  const handleCountdownToggle = () => {
    if (cdRunning) {
      setCdRunning(false);
      return;
    }
    let next = cdRemainingSec;
    if (next === null || next <= 0) {
      next = parseCountdownTargetSec(cdInputMin, cdInputSec);
    }
    setCdRemainingSec(next);
    setCdRunning(true);
  };

  const handleCountdownClear = () => {
    setCdRunning(false);
    setCdRemainingSec(null);
  };

  const countdownDisplaySec =
    cdRemainingSec !== null ? cdRemainingSec : parseCountdownTargetSec(cdInputMin, cdInputSec);

  const updateLog = useCallback((logIdx: number, setIdx: number, field: 'value' | 'weight', val: string | number) => {
    const numVal =
      typeof val === 'string'
        ? val === '' || val === '.' || val === ','
          ? 0
          : (() => {
              const n = parseFloat(val.replace(',', '.'));
              return Number.isFinite(n) ? n : 0;
            })()
        : val;

    setLogs(prev => {
      const newLogs = [...prev];
      if (!newLogs[logIdx]) return prev;
      const log = { ...newLogs[logIdx] };
      const sets = [...(log.sets ?? [])];
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
    const startMs = workoutStartedAtMsRef.current;
    const durationSeconds =
      Number.isFinite(startMs) && startMs > 0
        ? Math.max(0, Math.floor((Date.now() - startMs) / 1000))
        : 0;
    flushDraftToStorage();
    clearActiveWorkoutDraft();
    const [yr, mo, da] = sessionDate.split('-').map(Number);
    const sc = Number.isNaN(sessionClock.getTime()) ? new Date() : sessionClock;
    const localDate = new Date(
      yr,
      mo - 1,
      da,
      sc.getHours(),
      sc.getMinutes(),
      sc.getSeconds()
    );
    onFinish({
      id: newSessionId(),
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

  const groupedLogs = circuits.map(c => ({
    circuit: c,
    logsWithIndices: logs
      .map((log, index) => ({ log, index }))
      .filter(item => item.log.circuitId === c.id),
  }));

  const exerciseTimerPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {!fabOpen && (
              <button
                type="button"
                aria-label="Open exercise timer"
                onClick={() => setFabOpen(true)}
                className="fixed z-[260] flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl ring-4 ring-white/90 active:scale-95 transition-transform"
                style={{
                  right: 'max(1rem, env(safe-area-inset-right, 0px))',
                  bottom: 'calc(6.75rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                <Timer className="h-6 w-6 text-blue-500" />
              </button>
            )}
            {fabOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close timer"
                  className="fixed inset-0 z-[255] bg-black/40"
                  onClick={() => setFabOpen(false)}
                />
                <div
                  className="fixed left-1/2 z-[260] w-[min(100vw-1rem,24rem)] -translate-x-1/2 rounded-t-3xl border border-zinc-200 bg-white px-4 pt-2 pb-4 shadow-2xl"
                  style={{
                    bottom: 0,
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                  }}
                >
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-200" aria-hidden />
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                      Exercise timer
                    </span>
                    <button
                      type="button"
                      onClick={() => setFabOpen(false)}
                      className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100"
                      aria-label="Minimize timer"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mb-4 flex gap-1 rounded-xl bg-zinc-100 p-1">
                    <button
                      type="button"
                      onClick={() => setExerciseTimerMode('stopwatch')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                        exerciseTimerMode === 'stopwatch'
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500'
                      }`}
                    >
                      Stopwatch
                    </button>
                    <button
                      type="button"
                      onClick={() => setExerciseTimerMode('countdown')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                        exerciseTimerMode === 'countdown'
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500'
                      }`}
                    >
                      Countdown
                    </button>
                  </div>

                  {exerciseTimerMode === 'stopwatch' ? (
                    <div className="space-y-4">
                      <p className="font-numeric text-center text-3xl font-bold tabular-nums text-zinc-900">
                        {formatStopwatch(stopwatchDisplayMs)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleStopwatchToggle}
                          className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white active:scale-[0.98]"
                        >
                          {swRunning ? 'Pause' : 'Start'}
                        </button>
                        <button
                          type="button"
                          onClick={handleStopwatchClear}
                          disabled={!swRunning && swAccumMs === 0}
                          className="rounded-2xl border border-zinc-200 px-5 py-3.5 text-sm font-semibold text-zinc-700 disabled:opacity-35"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-center text-[10px] text-zinc-400">
                        Separate from total workout time at the top of the log.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!cdRunning && cdRemainingSec === null && (
                        <div className="flex flex-wrap items-end justify-center gap-2">
                          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase text-zinc-400">
                            Min
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              className="font-numeric w-16 rounded-xl border border-zinc-200 px-2 py-2 text-center text-lg font-bold text-zinc-900 outline-none focus:border-blue-600"
                              value={cdInputMin}
                              onChange={e => setCdInputMin(e.target.value)}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase text-zinc-400">
                            Sec
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              className="font-numeric w-16 rounded-xl border border-zinc-200 px-2 py-2 text-center text-lg font-bold text-zinc-900 outline-none focus:border-blue-600"
                              value={cdInputSec}
                              onChange={e =>
                                setCdInputSec(e.target.value.replace(/\D/g, '').slice(0, 2))
                              }
                            />
                          </label>
                        </div>
                      )}
                      <p className="font-numeric text-center text-3xl font-bold tabular-nums text-zinc-900">
                        {formatTime(countdownDisplaySec)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCountdownToggle}
                          disabled={
                            !cdRunning &&
                            cdRemainingSec === null &&
                            parseCountdownTargetSec(cdInputMin, cdInputSec) < 1
                          }
                          className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-35"
                        >
                          {cdRunning ? 'Pause' : 'Start'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCountdownClear}
                          disabled={!cdRunning && cdRemainingSec === null}
                          className="rounded-2xl border border-zinc-200 px-5 py-3.5 text-sm font-semibold text-zinc-700 disabled:opacity-35"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-center text-[10px] text-zinc-400">
                        Set any duration (min + sec). Separate from total workout time above.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>,
          document.body
        )
      : null;

  if (circuits.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0 w-full bg-zinc-50 relative overflow-hidden">
        <div className="bg-zinc-900 px-3 py-3 flex items-center justify-between gap-2 shrink-0 text-white">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 active:scale-90 transition-transform bg-white/10 rounded-full"
            aria-label="Back"
          >
            <ChevronLeft />
          </button>
          <span className="text-xs font-medium text-white/45">Session</span>
          <span className="w-14" aria-hidden />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-zinc-800 font-semibold">This workout has no exercises.</p>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs">
            Add exercises to your program or circuit, then start again.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0 w-full bg-zinc-50 relative overflow-hidden">
      <div className="bg-zinc-900 px-3 py-3 flex items-center justify-between gap-2 z-50 text-white shadow-sm shrink-0">
        <button
          onClick={onCancel}
          className="p-2 active:scale-90 transition-transform bg-white/10 rounded-full flex-shrink-0"
          aria-label="Back"
        >
          <ChevronLeft />
        </button>
        <span className="text-xs font-medium text-white/45 truncate text-center flex-1 px-2">Session</span>
        {isSessionExpired && (
          <span className="flex-shrink-0 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg">
            Sync offline
          </span>
        )}
        <button
          onClick={handleFinish}
          className="bg-white text-zinc-900 font-semibold text-xs px-4 py-2 rounded-xl active:scale-95 transition-transform flex-shrink-0"
        >
          End
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-40 space-y-8">
        {/* Total workout wall clock — top of scroll; scrolls away with the log matrix */}
        <div className="bg-zinc-900 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 border border-zinc-800 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-white/45 uppercase tracking-wide">Total workout</p>
              <p className="font-numeric text-2xl font-bold tabular-nums leading-tight">
                {formatTotalWorkoutClock(totalWorkoutSec)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-zinc-100 rounded-xl flex-shrink-0">
              <LayoutGrid className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 font-medium">Routine</p>
              <p className="text-sm font-semibold text-zinc-900">
                {circuits.length} Circuit{circuits.length !== 1 ? 's' : ''} · {logs.length} Exercises
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setRoutineEditorOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit routine
            </button>
            <input
              type="date"
              className="text-xs font-medium text-zinc-600 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-200 outline-none focus:border-blue-600"
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
            />
          </div>
        </div>

        {groupedLogs.map(({ circuit, logsWithIndices }) => {
          const maxSets = Math.max(...logsWithIndices.map(({ log }) => log.sets?.length ?? 0), 1);
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
                            className="px-2 py-2.5 text-[9px] font-medium text-blue-600 uppercase tracking-wide text-center border-l border-zinc-100"
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
                                  ? 'bg-zinc-100 text-blue-600'
                                  : log.type === 'reps'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-amber-100 text-amber-600'
                              }`}
                            >
                              {log.type === 'duration' ? 'secs' : log.type}
                            </span>
                          </td>

                          {setIndices.map(si => {
                            const set = (log.sets ?? [])[si];
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
                                ? formatWeightDisplay(lastSet.weight)
                                : log.suggestedWeight && log.suggestedWeight > 0
                                  ? formatWeightDisplay(log.suggestedWeight)
                                  : '·';
                            const vPh =
                              lastSet?.value && lastSet.value > 0
                                ? String(lastSet.value)
                                : log.suggestedValue && log.suggestedValue > 0
                                  ? String(log.suggestedValue)
                                  : '·';

                            if (log.type === 'weight') {
                              const weightKey = `${logIdx}-${si}`;
                              const weightDraft = weightDraftByKey[weightKey];
                              const weightDisplay =
                                weightDraft !== undefined
                                  ? weightDraft
                                  : set.weight === 0 || set.weight === undefined
                                    ? ''
                                    : formatWeightDisplay(set.weight);
                              return (
                                <React.Fragment key={si}>
                                  <td className="px-1 py-3 border-l border-slate-100">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      autoComplete="off"
                                      pattern="[0-9]*[.,]?[0-9]*"
                                      className="font-numeric min-w-[3.25rem] w-14 h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-blue-600 focus:bg-white transition-all text-center block mx-auto"
                                      placeholder={wPh}
                                      value={weightDisplay}
                                      onChange={(e) => {
                                        let raw = e.target.value.replace(',', '.');
                                        if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                                        setWeightDraftByKey((prev) => ({ ...prev, [weightKey]: raw }));
                                        updateLog(logIdx, si, 'weight', raw);
                                      }}
                                      onBlur={() => {
                                        setWeightDraftByKey((prev) => {
                                          const next = { ...prev };
                                          delete next[weightKey];
                                          return next;
                                        });
                                      }}
                                    />
                                  </td>
                                  <td className="px-1 py-3">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      className="font-numeric w-12 h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none focus:border-blue-600 focus:bg-white transition-all text-center block mx-auto"
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
                                  className={`font-numeric h-11 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 outline-none transition-all text-center block mx-auto ${
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
      {exerciseTimerPortal}
      <ActiveWorkoutRoutineEditor
        open={routineEditorOpen}
        onClose={() => setRoutineEditorOpen(false)}
        circuits={circuits}
        libraryCircuits={libraryCircuits}
        onCommit={next => {
          onCircuitsChange(next);
        }}
        customExercises={customExercises}
        existingCategories={existingCategories}
        onSaveCustomExercise={onSaveCustomExercise}
      />
    </>
  );
};

export default ActiveWorkout;
