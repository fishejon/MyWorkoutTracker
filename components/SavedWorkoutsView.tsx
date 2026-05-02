import React, { useState, useRef, useEffect } from 'react';
import { Circuit, SavedWorkout } from '../types';
import { Play, Trash2, Plus, BookMarked, Check, Pencil, X } from 'lucide-react';

interface SavedWorkoutsViewProps {
  savedWorkouts: SavedWorkout[];
  circuits: Circuit[];
  onStart: (circuits: Circuit[]) => void;
  onCreate: (workout: SavedWorkout) => void;
  onUpdate: (workout: SavedWorkout) => void;
  onDelete: (id: string) => void;
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface WorkoutModalProps {
  circuits: Circuit[];
  initial?: SavedWorkout;
  onSave: (name: string, circuitIds: string[]) => void;
  onClose: () => void;
}

const WorkoutModal: React.FC<WorkoutModalProps> = ({ circuits, initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initial?.circuitIds ?? [])
  );
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Give this workout a name.'); return; }
    if (selectedIds.size === 0) { setError('Select at least one circuit.'); return; }
    onSave(trimmed, [...selectedIds]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            {initial ? 'Edit workout' : 'New saved workout'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="workout-name">
              Workout name
            </label>
            <input
              ref={nameRef}
              id="workout-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Push Day, Full Body A…"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Circuit picker */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Circuits{' '}
              <span className="font-normal text-slate-400">
                ({selectedIds.size} selected)
              </span>
            </p>
            {circuits.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No circuits in your library yet. Build one first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {circuits.map(circuit => {
                  const selected = selectedIds.has(circuit.id);
                  return (
                    <button
                      key={circuit.id}
                      type="button"
                      onClick={() => toggle(circuit.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{circuit.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {circuit.exercises.length} exercise{circuit.exercises.length !== 1 ? 's' : ''}
                          {circuit.category ? ` · ${circuit.category}` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-colors active:scale-95"
            >
              {initial ? 'Save changes' : 'Save workout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main View ─────────────────────────────────────────────────────────────────

const SavedWorkoutsView: React.FC<SavedWorkoutsViewProps> = ({
  savedWorkouts,
  circuits,
  onStart,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<SavedWorkout | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openCreate = () => { setEditingWorkout(null); setModalMode('create'); };
  const openEdit = (w: SavedWorkout) => { setEditingWorkout(w); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditingWorkout(null); };

  const handleSave = (name: string, circuitIds: string[]) => {
    if (modalMode === 'edit' && editingWorkout) {
      onUpdate({ ...editingWorkout, name, circuitIds });
    } else {
      onCreate({
        id: `sw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        circuitIds,
        createdAt: new Date().toISOString(),
      });
    }
    closeModal();
  };

  const handleStart = (w: SavedWorkout) => {
    const resolved = w.circuitIds
      .map(id => circuits.find(c => c.id === id))
      .filter((c): c is Circuit => !!c);
    if (resolved.length > 0) onStart(resolved);
  };

  const resolveCircuits = (w: SavedWorkout) =>
    w.circuitIds.map(id => circuits.find(c => c.id === id)).filter((c): c is Circuit => !!c);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Saved Workouts</h2>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          New Workout
        </button>
      </div>

      {/* List */}
      {savedWorkouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-slate-100 rounded-2xl mb-4">
            <BookMarked className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No saved workouts yet</h3>
          <p className="text-xs text-slate-400 max-w-[220px] mb-5">
            Save a combination of circuits so you can start them with one tap next time.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first workout
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {savedWorkouts.map(w => {
            const resolved = resolveCircuits(w);
            const totalExercises = resolved.reduce((sum, c) => sum + c.exercises.length, 0);
            const hasStale = resolved.length < w.circuitIds.length;
            const canStart = resolved.length > 0;

            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-sm truncate">{w.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {resolved.length} circuit{resolved.length !== 1 ? 's' : ''} · {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                      {hasStale && (
                        <span className="ml-1 text-amber-500">(some circuits deleted)</span>
                      )}
                    </p>
                    {/* Circuit pills */}
                    {resolved.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resolved.map(c => (
                          <span
                            key={c.id}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(w)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                      aria-label={`Edit ${w.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(w.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                      aria-label={`Delete ${w.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Start button */}
                <button
                  type="button"
                  onClick={() => handleStart(w)}
                  disabled={!canStart}
                  className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    canStart
                      ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Workout
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <WorkoutModal
          circuits={circuits}
          initial={modalMode === 'edit' ? editingWorkout ?? undefined : undefined}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (() => {
        const w = savedWorkouts.find(x => x.id === confirmDeleteId);
        if (!w) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
              <p className="text-sm font-semibold text-slate-900 mb-1">Delete "{w.name}"?</p>
              <p className="text-xs text-slate-500 mb-5">This can't be undone.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { onDelete(w.id); setConfirmDeleteId(null); }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="h-4" />
    </div>
  );
};

export default SavedWorkoutsView;
