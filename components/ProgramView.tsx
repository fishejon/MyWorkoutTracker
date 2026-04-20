import React, { useMemo, useState, useEffect } from 'react';
import {
  Program,
  ProgramWorkoutDay,
  Circuit,
  CircuitExercise,
  Exercise,
  ExerciseType,
  CustomExercise,
} from '../types';
import {
  ChevronLeft,
  Play,
  Dumbbell,
  Layers,
  Trash2,
  CalendarDays,
  CheckCircle2,
  RotateCcw,
  Pencil,
  Plus,
  X,
  Search,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { EXERCISE_GROUPS } from '../constants';

interface ProgramViewProps {
  program: Program;
  /** User's saved circuits from Home — used to add a full circuit to a program day. */
  libraryCircuits: Circuit[];
  onAppendCircuitFromLibrary: (week: number, day: number, template: Circuit) => void;
  customExercises: CustomExercise[];
  onSaveCustomExercise: (ex: CustomExercise) => void;
  onPatchCircuit: (week: number, day: number, circuitIdx: number, circuit: Circuit) => void;
  onStartDay: (workoutDay: ProgramWorkoutDay) => void;
  onToggleDayComplete: (week: number, day: number) => void;
  onEditCircuit: (circuit: Circuit, week: number, day: number, circuitIdx: number) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

type PickerTarget = { week: number; day: number; circuitIdx: number };
type EditTarget = { week: number; day: number; circuitIdx: number; exerciseIndex: number };

const ProgramView: React.FC<ProgramViewProps> = ({
  program,
  libraryCircuits,
  onAppendCircuitFromLibrary,
  customExercises,
  onSaveCustomExercise,
  onPatchCircuit,
  onStartDay,
  onToggleDayComplete,
  onEditCircuit,
  onDelete,
  onBack,
}) => {
  const weeks = Array.from<number>(new Set(program.schedule.map(d => d.week))).sort((a, b) => a - b);
  const completedDays = program.completedDays ?? [];

  const isDayComplete = (week: number, day: number) =>
    completedDays.some(d => d.week === week && d.day === day);

  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    for (const week of weeks) {
      const hasIncomplete = program.schedule
        .filter(d => d.week === week)
        .some(d => !isDayComplete(d.week, d.day));
      if (hasIncomplete) return week;
    }
    return weeks[0] ?? 1;
  });

  useEffect(() => {
    if (!weeks.includes(selectedWeek) && weeks.length > 0) {
      setSelectedWeek(weeks[0]);
    }
  }, [weeks, selectedWeek]);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [pickerGroup, setPickerGroup] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<ExerciseType>('weight');
  const [customMuscleGroup, setCustomMuscleGroup] = useState<string | null>(null);
  const [addCircuitTarget, setAddCircuitTarget] = useState<{ week: number; day: number } | null>(null);

  const editExerciseSnapshot = useMemo((): CircuitExercise | null => {
    if (!editTarget) return null;
    const day = program.schedule.find(d => d.week === editTarget.week && d.day === editTarget.day);
    const circuit = day?.circuits[editTarget.circuitIdx];
    const ex = circuit?.exercises[editTarget.exerciseIndex];
    return ex ? { ...ex } : null;
  }, [editTarget, program.schedule]);

  const [editForm, setEditForm] = useState<{
    name: string;
    type: ExerciseType;
    sets: number;
    suggestedWeight: string;
    suggestedValue: string;
  } | null>(null);

  useEffect(() => {
    if (!editExerciseSnapshot) {
      setEditForm(null);
      return;
    }
    setEditForm({
      name: editExerciseSnapshot.name,
      type: editExerciseSnapshot.type,
      sets: editExerciseSnapshot.sets,
      suggestedWeight:
        editExerciseSnapshot.suggestedWeight !== undefined
          ? String(editExerciseSnapshot.suggestedWeight)
          : '',
      suggestedValue:
        editExerciseSnapshot.suggestedValue !== undefined ? String(editExerciseSnapshot.suggestedValue) : '',
    });
  }, [editExerciseSnapshot]);

  const resetPicker = () => {
    setPickerTarget(null);
    setPickerGroup(null);
    setPickerSearch('');
    setIsCustomMode(false);
    setCustomName('');
    setCustomMuscleGroup(null);
    setCustomType('weight');
  };

  const applyCircuitUpdate = (
    week: number,
    day: number,
    circuitIdx: number,
    mutate: (c: Circuit) => Circuit
  ) => {
    const dayEntry = program.schedule.find(d => d.week === week && d.day === day);
    const circuit = dayEntry?.circuits[circuitIdx];
    if (!circuit) return;
    onPatchCircuit(week, day, circuitIdx, mutate(circuit));
  };

  const addExerciseToCircuit = (week: number, day: number, circuitIdx: number, ex: Exercise) => {
    applyCircuitUpdate(week, day, circuitIdx, c => {
      const existing = c.exercises.find(e => e.id === ex.id);
      if (existing) {
        return {
          ...c,
          exercises: c.exercises.map(e =>
            e.id === ex.id
              ? { ...e, sets: e.sets + 1, defaultSets: e.sets + 1 }
              : e
          ),
        };
      }
      const n = ex.defaultSets;
      const ce: CircuitExercise = {
        ...ex,
        sets: n,
        defaultSets: n,
      };
      return { ...c, exercises: [...c.exercises, ce] };
    });
    resetPicker();
  };

  const removeExerciseFromCircuit = (
    week: number,
    day: number,
    circuitIdx: number,
    exerciseIndex: number,
    exerciseName: string
  ) => {
    if (!window.confirm(`Remove "${exerciseName}" from this circuit?`)) return;
    applyCircuitUpdate(week, day, circuitIdx, c => ({
      ...c,
      exercises: c.exercises.filter((_, i) => i !== exerciseIndex),
    }));
  };

  const saveExerciseEdit = () => {
    if (!editTarget || !editExerciseSnapshot || !editForm) return;
    const name = editForm.name.trim();
    if (!name) return;
    const sets = Math.max(1, Math.floor(Number(editForm.sets)) || 1);
    const sw = editForm.suggestedWeight.trim();
    const sv = editForm.suggestedValue.trim();
    const suggestedWeightParsed = sw === '' ? NaN : parseFloat(sw);
    const suggestedValueParsed = sv === '' ? NaN : parseFloat(sv);

    const updated: CircuitExercise = {
      ...editExerciseSnapshot,
      name,
      type: editForm.type,
      sets,
      defaultSets: sets,
    };
    if (!Number.isNaN(suggestedWeightParsed)) updated.suggestedWeight = suggestedWeightParsed;
    else delete updated.suggestedWeight;
    if (!Number.isNaN(suggestedValueParsed)) updated.suggestedValue = suggestedValueParsed;
    else delete updated.suggestedValue;

    applyCircuitUpdate(editTarget.week, editTarget.day, editTarget.circuitIdx, c => ({
      ...c,
      exercises: c.exercises.map((e, i) => (i === editTarget.exerciseIndex ? updated : e)),
    }));
    setEditTarget(null);
  };

  const addCustomFromPicker = () => {
    if (!pickerTarget || !customName.trim() || !customMuscleGroup) return;
    const newEx: CustomExercise = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      type: customType,
      defaultSets: 3,
      muscleGroup: customMuscleGroup,
    };
    onSaveCustomExercise(newEx);
    addExerciseToCircuit(pickerTarget.week, pickerTarget.day, pickerTarget.circuitIdx, newEx);
  };

  const pickerGroupExercises = useMemo(() => {
    if (!pickerGroup) return [];
    const builtIn = EXERCISE_GROUPS.find(g => g.muscleGroup === pickerGroup)?.exercises ?? [];
    const customs = customExercises.filter(c => c.muscleGroup === pickerGroup);
    const merged = [...builtIn, ...customs].sort((a, b) => a.name.localeCompare(b.name));
    const q = pickerSearch.toLowerCase().trim();
    return q ? merged.filter(ex => ex.name.toLowerCase().includes(q)) : merged;
  }, [pickerGroup, customExercises, pickerSearch]);

  const daysInWeek = program.schedule
    .filter(d => d.week === selectedWeek)
    .sort((a, b) => a.day - b.day);

  const completedInWeek = (week: number) =>
    program.schedule.filter(d => d.week === week && isDayComplete(d.week, d.day)).length;

  const totalInWeek = (week: number) =>
    program.schedule.filter(d => d.week === week).length;

  const handleDelete = () => {
    if (window.confirm(`Delete "${program.name}"? This cannot be undone.`)) {
      onDelete(program.id);
    }
  };

  const totalCompleted = completedDays.length;
  const totalDays = program.schedule.length;

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="p-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0 flex-1 mx-3">
            <h2 className="font-bold text-zinc-900 text-base truncate">{program.name}</h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {program.totalWeeks} week{program.totalWeeks !== 1 ? 's' : ''}
              {totalDays > 0 && ` · ${totalCompleted}/${totalDays} done`}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
            aria-label="Delete program"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {totalDays > 0 && (
          <div className="px-4 pb-3">
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${(totalCompleted / totalDays) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex overflow-x-auto no-scrollbar px-4 pb-3 gap-2">
          {weeks.map(week => {
            const done = completedInWeek(week);
            const total = totalInWeek(week);
            const allDone = done === total && total > 0;
            return (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedWeek === week
                    ? 'bg-zinc-900 text-white'
                    : allDone
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {allDone && selectedWeek !== week && <CheckCircle2 className="w-3 h-3" />}
                Week {week}
                {done > 0 && !allDone && (
                  <span className="text-[9px] opacity-70">
                    {done}/{total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {daysInWeek.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No workouts for Week {selectedWeek}</p>
          </div>
        ) : (
          daysInWeek.map(workoutDay => {
            const done = isDayComplete(workoutDay.week, workoutDay.day);
            const totalExercises = workoutDay.circuits.reduce((sum, c) => sum + c.exercises.length, 0);

            return (
              <div
                key={`${workoutDay.week}-${workoutDay.day}`}
                className={`bg-white rounded-xl border overflow-hidden ${
                  done ? 'border-sky-200' : 'border-zinc-200'
                }`}
              >
                <div
                  className={`px-5 py-4 flex items-center justify-between ${
                    done ? 'bg-sky-500' : 'bg-zinc-900'
                  }`}
                >
                  <div>
                    <p className="text-[9px] font-medium text-white/50 mb-0.5">Week {selectedWeek}</p>
                    <h3 className="font-bold text-white text-lg leading-none">Day {workoutDay.day}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[9px] font-medium text-white/50">
                        {workoutDay.circuits.length} circuit{workoutDay.circuits.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-[9px] font-medium text-white/50">
                        {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {done && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>
                </div>

                <div className="divide-y divide-zinc-50">
                  {workoutDay.circuits.map((circuit, circuitIdx) => (
                    <div key={circuit.id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Dumbbell className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                          <p className="text-xs font-semibold text-zinc-600 truncate">{circuit.name}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPickerTarget({
                                week: workoutDay.week,
                                day: workoutDay.day,
                                circuitIdx,
                              })
                            }
                            className="p-1 text-zinc-400 hover:text-sky-600 transition-colors"
                            aria-label={`Add exercise to ${circuit.name}`}
                            title="Add exercise"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onEditCircuit(circuit, workoutDay.week, workoutDay.day, circuitIdx)
                            }
                            className="p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
                            aria-label={`Edit ${circuit.name}`}
                            title="Edit whole circuit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {circuit.exercises.map((ex, exerciseIndex) => (
                          <div
                            key={ex.id + '-' + exerciseIndex}
                            className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1.5"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-medium text-zinc-700 block truncate">
                                {ex.name}
                              </span>
                              <span
                                className={`text-[8px] font-medium px-1 py-0.5 rounded inline-block mt-0.5 ${
                                  ex.type === 'weight'
                                    ? 'bg-zinc-100 text-sky-500'
                                    : ex.type === 'reps'
                                      ? 'bg-zinc-100 text-zinc-500'
                                      : 'bg-amber-100 text-amber-500'
                                }`}
                              >
                                {ex.sets}×
                                {ex.type === 'duration' ? 's' : ex.type === 'reps' ? 'r' : 'wt'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setEditTarget({
                                  week: workoutDay.week,
                                  day: workoutDay.day,
                                  circuitIdx,
                                  exerciseIndex,
                                })
                              }
                              className="p-1.5 text-zinc-300 hover:text-zinc-600 rounded-md hover:bg-zinc-100"
                              aria-label={`Edit ${ex.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeExerciseFromCircuit(
                                  workoutDay.week,
                                  workoutDay.day,
                                  circuitIdx,
                                  exerciseIndex,
                                  ex.name
                                )
                              }
                              className="p-1.5 text-zinc-300 hover:text-red-500 rounded-md hover:bg-red-50"
                              aria-label={`Remove ${ex.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setAddCircuitTarget({ week: workoutDay.week, day: workoutDay.day })}
                      className="w-full py-2.5 rounded-xl border border-dashed border-zinc-200 text-zinc-600 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50/50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add circuit from library
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-zinc-100 space-y-2">
                  {done ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onStartDay(workoutDay)}
                        className="w-full py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-zinc-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Redo Day {workoutDay.day}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Unmark Week ${workoutDay.week} Day ${workoutDay.day} as complete?`
                            )
                          ) {
                            onToggleDayComplete(workoutDay.week, workoutDay.day);
                          }
                        }}
                        className="w-full py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 rounded-xl"
                      >
                        Unmark day (not done)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onStartDay(workoutDay)}
                        disabled={totalExercises === 0}
                        className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Start Day {workoutDay.day}
                      </button>
                      {totalExercises === 0 && (
                        <p className="text-[11px] text-amber-700 text-center font-medium">
                          Add a circuit from your library or exercises to a circuit to start this day.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleDayComplete(workoutDay.week, workoutDay.day)}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors"
                      >
                        Mark day complete (without logging a workout)
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {addCircuitTarget && (
        <div
          className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-circuit-title"
          onClick={e => e.target === e.currentTarget && setAddCircuitTarget(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl border border-zinc-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h3 id="add-circuit-title" className="font-bold text-zinc-900 text-sm">
                Add circuit to Week {addCircuitTarget.week} · Day {addCircuitTarget.day}
              </h3>
              <button
                type="button"
                onClick={() => setAddCircuitTarget(null)}
                className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-2">
              {libraryCircuits.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8 px-2">
                  No saved circuits yet. Create circuits on Home, then add them here.
                </p>
              ) : (
                libraryCircuits.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onAppendCircuitFromLibrary(addCircuitTarget.week, addCircuitTarget.day, c);
                      setAddCircuitTarget(null);
                    }}
                    className="w-full text-left bg-zinc-50 rounded-xl border border-zinc-100 px-4 py-3 flex items-start gap-3 hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-white border border-zinc-100 text-sky-500 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {c.exercises.length} exercise{c.exercises.length !== 1 ? 's' : ''}
                        {c.category ? ` · ${c.category}` : ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exercise library picker */}
      {pickerTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={e => e.target === e.currentTarget && resetPicker()}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl border border-zinc-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-zinc-900 text-sm">Add exercise</h3>
              <button
                type="button"
                onClick={resetPicker}
                className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              {isCustomMode ? (
                <div className="bg-zinc-900 p-4 rounded-2xl text-white space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wide">Custom exercise</span>
                    <button type="button" onClick={() => setIsCustomMode(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Name…"
                    className="w-full px-4 py-3 bg-zinc-700/50 border border-zinc-600/50 rounded-xl outline-none placeholder:text-zinc-400 font-semibold text-sm"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                  />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-2">Muscle group</span>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                      {EXERCISE_GROUPS.map(g => (
                        <button
                          key={g.muscleGroup}
                          type="button"
                          onClick={() => setCustomMuscleGroup(g.muscleGroup)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${
                            customMuscleGroup === g.muscleGroup
                              ? 'bg-white text-zinc-900'
                              : 'bg-zinc-700/60 text-zinc-200'
                          }`}
                        >
                          {g.muscleGroup}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['weight', 'reps', 'duration'] as ExerciseType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCustomType(type)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize ${
                          customType === type ? 'bg-white text-zinc-900' : 'bg-zinc-700/60 text-zinc-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addCustomFromPicker}
                    disabled={!customName.trim() || !customMuscleGroup}
                    className="w-full py-3 bg-white text-zinc-900 rounded-xl font-semibold text-sm disabled:opacity-50"
                  >
                    Add to circuit
                  </button>
                </div>
              ) : !pickerGroup ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-sky-200 text-sky-600 font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New custom exercise
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {EXERCISE_GROUPS.map(group => {
                      const customCount = customExercises.filter(
                        c => c.muscleGroup === group.muscleGroup
                      ).length;
                      const total = group.exercises.length + customCount;
                      return (
                        <button
                          key={group.muscleGroup}
                          type="button"
                          onClick={() => setPickerGroup(group.muscleGroup)}
                          className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-left hover:border-zinc-300 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-sky-500 mb-1" />
                          <span className="text-xs font-semibold text-zinc-800 line-clamp-2">
                            {group.muscleGroup}
                          </span>
                          <span className="text-[10px] text-zinc-400">{total} options</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPickerGroup(null);
                        setPickerSearch('');
                      }}
                      className="p-2 bg-zinc-100 rounded-full text-zinc-600"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-zinc-800 truncate">{pickerGroup}</span>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search…"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-sky-400"
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                    />
                  </div>
                  <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
                    {pickerGroupExercises.map(ex => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() =>
                          addExerciseToCircuit(
                            pickerTarget.week,
                            pickerTarget.day,
                            pickerTarget.circuitIdx,
                            ex
                          )
                        }
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">{ex.name}</p>
                          <p className="text-[10px] text-zinc-400 uppercase">{ex.type}</p>
                        </div>
                        <Plus className="w-4 h-4 text-sky-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editTarget && editForm && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={e => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl border border-zinc-200 p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 text-sm">Edit exercise</h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-400 uppercase">Name</label>
              <input
                type="text"
                className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm font-medium"
                value={editForm.name}
                onChange={e => setEditForm(f => (f ? { ...f, name: e.target.value } : f))}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-400 uppercase">Type</label>
              <div className="flex gap-2 mt-1">
                {(['weight', 'reps', 'duration'] as ExerciseType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditForm(f => (f ? { ...f, type: t } : f))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize ${
                      editForm.type === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-400 uppercase">Sets</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                value={editForm.sets}
                onChange={e =>
                  setEditForm(f => (f ? { ...f, sets: Math.max(1, parseInt(e.target.value, 10) || 1) } : f))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Sugg. weight</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  placeholder="—"
                  value={editForm.suggestedWeight}
                  onChange={e =>
                    setEditForm(f => (f ? { ...f, suggestedWeight: e.target.value } : f))
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Sugg. reps/sec</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  placeholder="—"
                  value={editForm.suggestedValue}
                  onChange={e =>
                    setEditForm(f => (f ? { ...f, suggestedValue: e.target.value } : f))
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveExerciseEdit}
                className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-semibold text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramView;
