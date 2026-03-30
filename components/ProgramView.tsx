import React, { useState } from 'react';
import { Program, ProgramWorkoutDay, Circuit } from '../types';
import { ChevronLeft, Play, Dumbbell, Trash2, CalendarDays, CheckCircle2, RotateCcw } from 'lucide-react';

interface ProgramViewProps {
  program: Program;
  onStartDay: (workoutDay: ProgramWorkoutDay) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const ProgramView: React.FC<ProgramViewProps> = ({ program, onStartDay, onDelete, onBack }) => {
  const weeks = Array.from<number>(new Set(program.schedule.map(d => d.week))).sort((a, b) => a - b);
  const completedDays = program.completedDays ?? [];

  const isDayComplete = (week: number, day: number) =>
    completedDays.some(d => d.week === week && d.day === day);

  // Auto-select the first week that still has at least one incomplete day.
  // Falls back to the first week if everything is done.
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    for (const week of weeks) {
      const hasIncomplete = program.schedule
        .filter(d => d.week === week)
        .some(d => !isDayComplete(d.week, d.day));
      if (hasIncomplete) return week;
    }
    return weeks[0] ?? 1;
  });

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
      {/* Header */}
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

        {/* Progress bar */}
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

        {/* Week tabs */}
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
                  <span className="text-[9px] opacity-70">{done}/{total}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {daysInWeek.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No workouts for Week {selectedWeek}</p>
          </div>
        ) : (
          daysInWeek.map(workoutDay => {
            const done = isDayComplete(workoutDay.week, workoutDay.day);
            const totalExercises = workoutDay.circuits.reduce(
              (sum, c) => sum + c.exercises.length, 0
            );

            return (
              <div
                key={workoutDay.day}
                className={`bg-white rounded-xl border overflow-hidden ${
                  done ? 'border-sky-200' : 'border-zinc-200'
                }`}
              >
                {/* Day header */}
                <div className={`px-5 py-4 flex items-center justify-between ${
                  done ? 'bg-sky-500' : 'bg-zinc-900'
                }`}>
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

                {/* Circuit list */}
                <div className="divide-y divide-zinc-50">
                  {workoutDay.circuits.map(circuit => (
                    <div key={circuit.id} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
                        <p className="text-xs font-semibold text-zinc-600">{circuit.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {circuit.exercises.map(ex => (
                          <div
                            key={ex.id}
                            className="flex items-center gap-1 bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1"
                          >
                            <span className="text-[11px] font-medium text-zinc-700">{ex.name}</span>
                            <span className={`text-[8px] font-medium px-1 py-0.5 rounded ${
                              ex.type === 'weight' ? 'bg-zinc-100 text-sky-500' :
                              ex.type === 'reps'   ? 'bg-zinc-100 text-zinc-500' :
                                                     'bg-amber-100 text-amber-500'
                            }`}>
                              {ex.sets}×{ex.type === 'duration' ? 's' : ex.type === 'reps' ? 'r' : 'wt'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Start / Redo button */}
                <div className="px-5 py-4 border-t border-zinc-100">
                  {done ? (
                    <button
                      onClick={() => onStartDay(workoutDay)}
                      className="w-full py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-zinc-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Redo Day {workoutDay.day}
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartDay(workoutDay)}
                      className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Day {workoutDay.day}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgramView;
