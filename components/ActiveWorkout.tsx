import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Circuit, WorkoutSession, ExerciseLog } from '../types';
import { CheckCircle2, ChevronLeft, Timer, Weight, Repeat, Zap, LayoutGrid, Play, Square, Bell, Plus, Minus } from 'lucide-react';
import { getHistory, getLastWorkoutDataForExercise } from '../services/storage';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface ActiveWorkoutProps {
  circuits: Circuit[];
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
  history?: WorkoutSession[]; // Optional workout history for showing last workout data
}

const TIMER_PRESETS = [15, 30, 45, 60, 90];

const playAlarmSound = () => {
  try {
    const ContextClass = window.AudioContext || window.webkitAudioContext;
    if (!ContextClass) return;
    const context = new ContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gainNode.gain.setValueAtTime(0.2, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 1.5);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 1.5);
  } catch {
    // Audio Context may be blocked by browser policy; fail silently
  }
};

const SetTimer: React.FC<{
  initialSeconds: number;
  onComplete: () => void;
  onUpdateValue: (val: number) => void;
}> = ({ initialSeconds, onComplete, onUpdateValue }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Sync display when preset changes and timer is not running
  useEffect(() => {
    if (!isRunning) setTimeLeft(initialSeconds);
  }, [initialSeconds, isRunning]);

  // Single interval when running; ref for onComplete avoids effect churn
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onCompleteRef.current?.();
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]); // eslint-disable-line react-hooks/exhaustive-deps -- timeLeft intentionally excluded to avoid recreating interval every second

  const toggleTimer = () => {
    if (timeLeft <= 0) setTimeLeft(initialSeconds);
    setIsRunning(!isRunning);
  };

  const adjustTimer = (amount: number) => {
    const newValue = Math.max(0, initialSeconds + amount);
    onUpdateValue(newValue);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <button 
          onClick={toggleTimer}
          disabled={initialSeconds <= 0 && !isRunning}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${
            isRunning 
              ? 'bg-red-500 text-white animate-pulse' 
              : initialSeconds > 0 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-100 text-slate-400'
          }`}
        >
          {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isRunning ? `${timeLeft}s` : (timeLeft > 0 ? 'START' : 'SET TIMER')}
        </button>
      </div>
      
      {!isRunning && (
        <div className="flex items-center justify-between gap-1">
          <button 
            onClick={() => adjustTimer(-5)}
            className="p-2 bg-slate-100 text-slate-500 rounded-xl active:bg-slate-200 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TIMER_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => onUpdateValue(preset)}
                className={`px-2 py-1 rounded-lg text-[8px] font-black border transition-all ${
                  initialSeconds === preset 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                {preset}s
              </button>
            ))}
          </div>
          <button 
            onClick={() => adjustTimer(5)}
            className="p-2 bg-slate-100 text-slate-500 rounded-xl active:bg-slate-200 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ circuits, onFinish, onCancel, history }) => {
  // Use provided history or fetch from storage if not provided
  const workoutHistory = history ?? getHistory();
  
  const [logs, setLogs] = useState<ExerciseLog[]>(() => {
    const initialLogs: ExerciseLog[] = [];
    circuits.forEach(circuit => {
      circuit.exercises.forEach(ex => {
        // Find last workout data for this exercise
        const lastWorkoutData = getLastWorkoutDataForExercise(ex.id, ex.name, workoutHistory);
        
        // Initialize sets with zeros; last workout values are used only as placeholders (see lastWorkoutSets)
        const sets = Array.from({ length: ex.sets }).map((_, i) => ({
          setIndex: i,
          value: 0,
          weight: ex.type === 'weight' ? 0 : undefined
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

  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
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
    onFinish({
      id: Date.now().toString(),
      circuitNames: circuits.map(c => c.name),
      date: new Date(sessionDate).toISOString(),
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
    <div className="flex flex-col h-screen-dynamic bg-slate-50 relative overflow-hidden">
      {/* Header (Fixed) */}
      <div className="bg-indigo-600 p-4 pb-6 flex items-center justify-between z-50 text-white shadow-xl shrink-0">
        <button onClick={onCancel} className="p-2 active:scale-90 transition-transform bg-white/10 rounded-full"><ChevronLeft /></button>
        <div className="text-center">
          <h2 className="font-black tracking-widest leading-none text-[10px] uppercase opacity-70 mb-1">Workout Session</h2>
          <div className="flex items-center justify-center gap-2 text-xl font-black italic">
            <Timer className="w-5 h-5 text-indigo-200" />
            <span>{formatTime(timer)}</span>
          </div>
        </div>
        <button 
          onClick={handleFinish} 
          className="bg-white text-indigo-600 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          End
        </button>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 pb-40">
        {/* Top Info Section */}
        <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <LayoutGrid className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Routine Overview</p>
              <p className="text-sm font-bold text-slate-800">{circuits.length} Circuits • {logs.length} Exercises</p>
            </div>
          </div>
          <input 
            type="date" 
            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-3 rounded-2xl border border-indigo-100 outline-none"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>

        {groupedLogs.map(({ circuit, logsWithIndices }) => (
          <div key={circuit.id} className="space-y-5">
            <div className="flex items-center gap-4 px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{circuit.name}</h3>
              <div className="h-[2px] w-full bg-slate-100 rounded-full"></div>
            </div>
            
            {logsWithIndices.map(({ log, index: logIdx }) => (
              <div key={`${log.exerciseId}-${logIdx}`} className="bg-white rounded-[2.5rem] shadow-md border border-slate-100 overflow-hidden group">
                <div className="bg-slate-50/40 px-6 py-5 flex justify-between items-center border-b border-slate-100/50">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full shadow-lg shadow-indigo-100"></div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight">{log.exerciseName}</h4>
                  </div>
                  <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    {log.type}
                  </div>
                </div>
                
                <div className="p-4">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr>
                        <th className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">Set</th>
                        {log.type === 'weight' && <th className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">LBS</th>}
                        <th className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          {log.type === 'duration' ? 'SECS' : 'REPS'}
                        </th>
                        {log.type === 'duration' && <th className="w-32"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {log.sets.map((set, setIdx) => {
                        // Get last workout data for this set if available
                        const lastSet = log.lastWorkoutSets?.[setIdx];
                        const hasLastData = lastSet && (lastSet.value > 0 || (lastSet.weight && lastSet.weight > 0));
                        
                        // Format last workout display text
                        const formatLastWorkout = () => {
                          if (!hasLastData) return null;
                          if (log.type === 'weight' && lastSet.weight) {
                            return `Last: ${lastSet.weight} lbs × ${lastSet.value} reps`;
                          } else if (log.type === 'reps') {
                            return `Last: ${lastSet.value} reps`;
                          } else if (log.type === 'duration') {
                            return `Last: ${lastSet.value}s`;
                          }
                          return null;
                        };
                        
                        const lastWorkoutText = formatLastWorkout();
                        const colSpan = log.type === 'duration' ? 4 : (log.type === 'weight' ? 3 : 2);
                        
                        return (
                          <React.Fragment key={setIdx}>
                            <tr>
                              <td className="text-center font-black text-slate-200 text-xl">{setIdx + 1}</td>
                              {log.type === 'weight' && (
                                <td className="px-1">
                                  <input 
                                    type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                                    className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all text-center"
                                    placeholder={lastSet?.weight != null ? String(lastSet.weight) : '0'}
                                    value={set.weight === 0 ? '' : set.weight}
                                    onChange={(e) => updateLog(logIdx, setIdx, 'weight', e.target.value)}
                                  />
                                </td>
                              )}
                              <td className="px-1">
                                <input 
                                  type="text" inputMode="numeric" pattern="[0-9]*"
                                  className={`w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white transition-all text-center ${log.type === 'duration' ? 'focus:border-amber-500' : 'focus:border-emerald-500'}`}
                                  placeholder={lastSet?.value != null ? String(lastSet.value) : '0'}
                                  value={set.value === 0 ? '' : set.value}
                                  onChange={(e) => updateLog(logIdx, setIdx, 'value', e.target.value)}
                                />
                              </td>
                              {log.type === 'duration' && (
                                <td className="px-1 align-middle">
                                  <SetTimer 
                                    initialSeconds={set.value} 
                                    onComplete={() => playAlarmSound()}
                                    onUpdateValue={(newVal) => updateLog(logIdx, setIdx, 'value', newVal)}
                                  />
                                </td>
                              )}
                            </tr>
                            {/* Show "Last: …" row only for duration (timer has no placeholder); weight/reps use input placeholders */}
                            {log.type === 'duration' && lastWorkoutText && (
                              <tr>
                                <td colSpan={colSpan} className="px-2 pb-2">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center">
                                    {lastWorkoutText}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Action Footer (Sticky) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+var(--sab))] glass-nav border-t border-slate-200/50 z-50">
        <button 
          onClick={handleFinish} 
          className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-300 flex items-center justify-center gap-4 active:scale-[0.98] transition-all tracking-widest uppercase text-sm"
        >
          <CheckCircle2 className="w-7 h-7" /> Finish Routine
        </button>
      </div>
    </div>
  );
};

export default ActiveWorkout;
