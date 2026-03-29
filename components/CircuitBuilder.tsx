
import React, { useEffect, useMemo, useState } from 'react';
import { Circuit, CircuitExercise, ExerciseType, Exercise, CustomExercise } from '../types';
import { EXERCISE_GROUPS } from '../constants';
import { Search, Plus, X, ChevronRight, Layers, ArrowLeft } from 'lucide-react';

interface CircuitBuilderProps {
  initialCircuit?: Circuit | null;
  customExercises: CustomExercise[];
  onSaveCustomExercise: (ex: CustomExercise) => void;
  onSave: (circuit: Circuit) => void;
  onUpdate: (circuit: Circuit) => void;
  onCancel: () => void;
}

const CircuitBuilder: React.FC<CircuitBuilderProps> = ({
  initialCircuit,
  customExercises,
  onSaveCustomExercise,
  onSave,
  onUpdate,
  onCancel,
}) => {
  const [name, setName] = useState(initialCircuit?.name ?? '');
  const [selectedExercises, setSelectedExercises] = useState<CircuitExercise[]>(initialCircuit?.exercises ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const isEditing = Boolean(initialCircuit);

  // Sync state when opening builder for a different circuit
  useEffect(() => {
    setName(initialCircuit?.name ?? '');
    setSelectedExercises(initialCircuit?.exercises ?? []);
    setSelectedGroup(null);
    setSearchQuery('');
    setIsCustomMode(false);
    setCustomName('');
    setCustomType('weight');
    setCustomMuscleGroup(null);
    setSaveValidationError(null);
  }, [initialCircuit]);

  // Clear validation message when form becomes valid
  useEffect(() => {
    if (name.trim() && selectedExercises.length > 0) setSaveValidationError(null);
  }, [name, selectedExercises]);
  
  // Custom Exercise Mode
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<ExerciseType>('weight');
  const [customMuscleGroup, setCustomMuscleGroup] = useState<string | null>(null);
  const [saveValidationError, setSaveValidationError] = useState<string | null>(null);

  const addExercise = (ex: Exercise) => {
    const existing = selectedExercises.find(item => item.id === ex.id);
    if (existing) {
      updateSets(ex.id, existing.sets + 1);
      return;
    }
    setSelectedExercises([...selectedExercises, { ...ex, sets: ex.defaultSets }]);
  };

  const removeExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== id));
  };

  const updateSets = (id: string, sets: number) => {
    setSelectedExercises(selectedExercises.map(ex => 
      ex.id === id ? { ...ex, sets: Math.max(1, sets) } : ex
    ));
  };

  const handleSave = () => {
    if (!name.trim() || selectedExercises.length === 0) {
      setSaveValidationError('Enter a circuit name and add at least one exercise.');
      return;
    }
    setSaveValidationError(null);

    const next: Circuit = {
      id: initialCircuit?.id ?? Date.now().toString(),
      name: name.trim(),
      exercises: selectedExercises,
    };

    if (isEditing) {
      onUpdate(next);
    } else {
      onSave(next);
    }
  };

  const addCustomExercise = () => {
    if (!customName.trim() || !customMuscleGroup) return;
    const newEx: CustomExercise = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      type: customType,
      defaultSets: 3,
      muscleGroup: customMuscleGroup,
    };
    addExercise(newEx);
    onSaveCustomExercise(newEx);
    setCustomName('');
    setCustomMuscleGroup(null);
    setIsCustomMode(false);
  };

  // Merge built-in exercises with user custom exercises for the selected group; filter by search.
  const currentGroupExercises = useMemo(() => {
    if (!selectedGroup) return [];
    const builtIn = EXERCISE_GROUPS.find(g => g.muscleGroup === selectedGroup)?.exercises ?? [];
    const customs = customExercises.filter(c => c.muscleGroup === selectedGroup);
    const merged = [...builtIn, ...customs].sort((a, b) => a.name.localeCompare(b.name));
    const q = searchQuery.toLowerCase().trim();
    return q ? merged.filter(ex => ex.name.toLowerCase().includes(q)) : merged;
  }, [selectedGroup, customExercises, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Circuit' : 'New Circuit'}</h2>
        <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Name Input */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <label className="block text-xs font-medium text-zinc-400 mb-2">Circuit name</label>
          <input 
            type="text" 
            placeholder="e.g., Strength Day"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Selected List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium text-zinc-400">Planned Exercises</h3>
          </div>
          
          {selectedExercises.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Add exercises from the library</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {selectedExercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate text-sm">{ex.name}</p>
                    <p className="text-[10px] text-sky-500 font-bold uppercase tracking-tighter">{ex.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                      <button onClick={() => updateSets(ex.id, ex.sets - 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-md transition-colors">-</button>
                      <div className="w-10 text-center flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-bold leading-none uppercase">Sets</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{ex.sets}</span>
                      </div>
                      <button onClick={() => updateSets(ex.id, ex.sets + 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded-md transition-colors">+</button>
                    </div>
                    <button onClick={() => removeExercise(ex.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Library Section */}
        <div className="space-y-4 pt-4 border-t border-slate-200 pb-24">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium text-zinc-400">Exercise Library</h3>
            <button 
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-xs font-bold text-sky-500 bg-zinc-50 px-2 py-1 rounded-md flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Custom
            </button>
          </div>

          {isCustomMode && (
            <div className="bg-zinc-900 p-4 rounded-2xl shadow-lg text-white space-y-4 animate-in zoom-in-95">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest">New Custom Exercise</span>
                <button onClick={() => setIsCustomMode(false)}><X className="w-4 h-4" /></button>
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Exercise name..."
                className="w-full px-4 py-3 bg-zinc-700/50 border border-zinc-600/50 rounded-xl outline-none placeholder:text-zinc-400 font-semibold"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Muscle group</span>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_GROUPS.map(g => (
                    <button
                      key={g.muscleGroup}
                      type="button"
                      onClick={() => setCustomMuscleGroup(g.muscleGroup)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${customMuscleGroup === g.muscleGroup ? 'bg-white text-zinc-900 shadow-sm' : 'bg-zinc-700/60 text-zinc-200 hover:bg-zinc-600'}`}
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
                    onClick={() => setCustomType(type)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${customType === type ? 'bg-white text-zinc-900 shadow-sm' : 'bg-zinc-700/60 text-zinc-200 hover:bg-zinc-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                onClick={addCustomExercise}
                disabled={!customName.trim() || !customMuscleGroup}
                className="w-full py-3 bg-white text-zinc-900 rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ADD TO CIRCUIT
              </button>
            </div>
          )}

          {!selectedGroup ? (
            <div className="grid grid-cols-2 gap-3">
              {EXERCISE_GROUPS.map(group => {
                const customCount = customExercises.filter(c => c.muscleGroup === group.muscleGroup).length;
                const total = group.exercises.length + customCount;
                return (
                  <button
                    key={group.muscleGroup}
                    onClick={() => setSelectedGroup(group.muscleGroup)}
                    className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2 hover:border-zinc-300 hover:bg-zinc-50 transition-all group active:scale-95"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                      <ChevronRight className="w-5 h-5 text-sky-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{group.muscleGroup}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{total} Options</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-semibold text-zinc-800">{selectedGroup}</h3>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={`Filter ${selectedGroup}...`}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm text-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
                {currentGroupExercises.map(ex => {
                  const isSelected = !!selectedExercises.find(s => s.id === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors group active:bg-zinc-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{ex.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{ex.type}</p>
                      </div>
                      <div className={`p-1.5 rounded-full transition-colors ${isSelected ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-zinc-100 group-hover:text-sky-500'}`}>
                        <Plus className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-40 flex flex-col gap-3 shadow-2xl">
        {saveValidationError && (
          <p className="text-sm text-amber-700 font-medium" role="alert">{saveValidationError}</p>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 bg-zinc-100 text-zinc-600 rounded-2xl font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || selectedExercises.length === 0} className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-2xl font-semibold shadow-sm disabled:opacity-50 transition-all active:scale-[0.98]">
            {isEditing ? 'Save Changes' : 'Create Circuit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircuitBuilder;
