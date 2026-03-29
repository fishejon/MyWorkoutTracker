import React, { useState } from 'react';
import { Program, Circuit } from '../types';
import { ChevronLeft, Play, Dumbbell, Trash2, CalendarDays } from 'lucide-react';

interface ProgramViewProps {
  program: Program;
  onStartDay: (circuits: Circuit[]) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const ProgramView: React.FC<ProgramViewProps> = ({ program, onStartDay, onDelete, onBack }) => {
  const weeks = Array.from<number>(new Set(program.schedule.map(d => d.week))).sort((a, b) => a - b);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0] ?? 1);

  const daysInWeek = program.schedule
    .filter(d => d.week === selectedWeek)
    .sort((a, b) => a.day - b.day);

  const handleDelete = () => {
    if (window.confirm(`Delete "${program.name}"? This cannot be undone.`)) {
      onDelete(program.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="p-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0 flex-1 mx-3">
            <h2 className="font-black text-slate-800 text-base truncate">{program.name}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {program.totalWeeks} Week{program.totalWeeks !== 1 ? 's' : ''} · {program.schedule.length} Workout{program.schedule.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
            aria-label="Delete program"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Week tabs */}
        <div className="flex overflow-x-auto no-scrollbar px-4 pb-3 gap-2">
          {weeks.map(week => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedWeek === week
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Week {week}
            </button>
          ))}
        </div>
      </div>

      {/* Day cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {daysInWeek.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No workouts for Week {selectedWeek}</p>
          </div>
        ) : (
          daysInWeek.map(workoutDay => {
            const totalExercises = workoutDay.circuits.reduce(
              (sum, c) => sum + c.exercises.length, 0
            );

            return (
              <div
                key={workoutDay.day}
                className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden"
              >
                {/* Day header */}
                <div className="px-5 py-4 bg-indigo-600 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">
                      Week {selectedWeek}
                    </p>
                    <h3 className="font-black text-white text-lg leading-none">Day {workoutDay.day}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">
                      {workoutDay.circuits.length} circuit{workoutDay.circuits.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">
                      {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Circuit list */}
                <div className="divide-y divide-slate-50">
                  {workoutDay.circuits.map(circuit => (
                    <div key={circuit.id} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="w-3.5 h-3.5 text-indigo-400" />
                        <p className="text-xs font-black text-slate-600 uppercase tracking-wider">{circuit.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {circuit.exercises.map(ex => (
                          <div
                            key={ex.id}
                            className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1"
                          >
                            <span className="text-[11px] font-semibold text-slate-700">{ex.name}</span>
                            <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${ 
                              ex.type === 'weight' ? 'bg-indigo-100 text-indigo-500' :
                              ex.type === 'reps'   ? 'bg-emerald-100 text-emerald-500' :
                                                     'bg-amber-100 text-amber-500'
                            }`}>
                              {ex.sets}×{ex.type === 'duration' ? 'secs' : ex.type === 'reps' ? 'reps' : 'wt'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Start button */}
                <div className="px-5 py-4 border-t border-slate-100">
                  <button
                    onClick={() => onStartDay(workoutDay.circuits)}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Day {workoutDay.day}
                  </button>
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
