import React, { useEffect, useState } from 'react';
import { Circuit, CustomExercise } from '../types';
import { ChevronLeft, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import CircuitBuilder from './CircuitBuilder';
import { cloneCircuitWithNewId } from '../services/circuitClone';

type Panel = 'list' | 'pick' | 'new' | { edit: number };

interface ActiveWorkoutRoutineEditorProps {
  open: boolean;
  onClose: () => void;
  circuits: Circuit[];
  libraryCircuits: Circuit[];
  onCommit: (next: Circuit[]) => void;
  customExercises: CustomExercise[];
  existingCategories: string[];
  onSaveCustomExercise: (ex: CustomExercise) => void;
}

const ActiveWorkoutRoutineEditor: React.FC<ActiveWorkoutRoutineEditorProps> = ({
  open,
  onClose,
  circuits,
  libraryCircuits,
  onCommit,
  customExercises,
  existingCategories,
  onSaveCustomExercise,
}) => {
  const [working, setWorking] = useState<Circuit[]>(circuits);
  const [panel, setPanel] = useState<Panel>('list');

  useEffect(() => {
    if (open) {
      setWorking(circuits.map(c => ({ ...c, exercises: c.exercises.map(e => ({ ...e })) })));
      setPanel('list');
    }
  }, [open, circuits]);

  if (!open) return null;

  const removeAt = (idx: number) => {
    if (!window.confirm('Remove this circuit from the session? Logged sets for it will be cleared when you save.')) {
      return;
    }
    setWorking(w => w.filter((_, i) => i !== idx));
  };

  const handleDone = () => {
    onCommit(working);
    onClose();
  };

  if (panel === 'new') {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col bg-slate-50">
        <CircuitBuilder
          initialCircuit={null}
          customExercises={customExercises}
          existingCategories={existingCategories}
          onSaveCustomExercise={onSaveCustomExercise}
          onSave={c => {
            setWorking(w => [...w, c]);
            setPanel('list');
          }}
          onUpdate={() => {}}
          onCancel={() => setPanel('list')}
        />
      </div>
    );
  }

  if (typeof panel === 'object' && 'edit' in panel) {
    const idx = panel.edit;
    const initial = working[idx];
    if (!initial) {
      return (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-zinc-50 p-6">
          <p className="text-sm text-zinc-600 mb-4">Could not load that circuit.</p>
          <button
            type="button"
            onClick={() => setPanel('list')}
            className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold"
          >
            Back
          </button>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[300] flex flex-col bg-slate-50">
        <CircuitBuilder
          key={initial.id}
          initialCircuit={initial}
          customExercises={customExercises}
          existingCategories={existingCategories}
          onSaveCustomExercise={onSaveCustomExercise}
          onSave={() => {}}
          onUpdate={c => {
            setWorking(w => w.map((x, i) => (i === idx ? c : x)));
            setPanel('list');
          }}
          onCancel={() => setPanel('list')}
        />
      </div>
    );
  }

  if (panel === 'pick') {
    return (
      <div
        className="fixed inset-0 z-[300] flex flex-col bg-zinc-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-circuit-title"
      >
        <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPanel('list')}
            className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-full"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 id="pick-circuit-title" className="font-bold text-zinc-900 text-base flex-1">
            Add circuit from library
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {libraryCircuits.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12 px-4">
              You have no saved circuits yet. Create one from Home, or use &quot;New circuit&quot; here.
            </p>
          ) : (
            libraryCircuits.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setWorking(w => [...w, cloneCircuitWithNewId(c)]);
                  setPanel('list');
                }}
                className="w-full text-left bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-start gap-3 hover:border-sky-300 transition-colors"
              >
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-600 shrink-0">
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
    );
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-zinc-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="routine-editor-title"
    >
      <div className="bg-zinc-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/15"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 id="routine-editor-title" className="font-bold text-base flex-1 truncate">
          Edit routine
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {working.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No circuits in this session. Add one from your library or create new.
          </div>
        ) : (
          working.map((c, idx) => (
            <div
              key={`${c.id}-${idx}`}
              className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900 text-sm truncate">{c.name}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {c.exercises.length} exercise{c.exercises.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setPanel({ edit: idx })}
                  className="p-2 text-zinc-400 hover:text-sky-600 rounded-lg hover:bg-zinc-50"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                  aria-label={`Remove ${c.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPanel('pick')}
            className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-700 font-semibold text-sm flex items-center justify-center gap-2 hover:border-sky-300 hover:text-sky-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add circuit from library
          </button>
          <button
            type="button"
            onClick={() => setPanel('new')}
            className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <Layers className="w-4 h-4" />
            New circuit
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-[max(1rem,var(--sab))] bg-white/95 border-t border-zinc-200 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleDone}
          className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default ActiveWorkoutRoutineEditor;
