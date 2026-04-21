import React, { useMemo, useState } from 'react';
import { Circuit, WorkoutSession } from '../types';
import {
  Play,
  Trash2,
  PlusCircle,
  Pencil,
  Check,
  ChevronDown,
} from 'lucide-react';

interface CircuitsViewProps {
  circuits: Circuit[];
  history: WorkoutSession[];
  onStart: (selectedCircuits: Circuit[]) => void;
  onDelete: (id: string) => void;
  onEdit: (circuit: Circuit) => void;
  onNew: () => void;
}

function relativeDay(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

const CircuitsView: React.FC<CircuitsViewProps> = ({
  circuits,
  history,
  onStart,
  onDelete,
  onEdit,
  onNew,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const circuitLastUsed = useMemo(() => {
    const map: Record<string, string> = {};
    for (const circuit of circuits) {
      const session = history.find(s => s.circuitNames.includes(circuit.name));
      map[circuit.id] = session ? relativeDay(session.date) : 'Never';
    }
    return map;
  }, [circuits, history]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const { categoryGroups, uncategorized } = useMemo(() => {
    const groups = new Map<string, Circuit[]>();
    const unc: Circuit[] = [];
    for (const c of circuits) {
      if (c.category?.trim()) {
        const key = c.category.trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      } else {
        unc.push(c);
      }
    }
    return { categoryGroups: groups, uncategorized: unc };
  }, [circuits]);

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const toggleCat = (cat: string) =>
    setCollapsedCats((prev) => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });

  return (
    <div className="p-4 space-y-5 pb-28">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">My Circuits</h2>
        <button
          type="button"
          onClick={onNew}
          className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Circuit
        </button>
      </div>

      {circuits.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-400 text-sm mb-3">No circuits yet.</p>
          <button
            type="button"
            onClick={onNew}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-xl text-sm font-medium"
          >
            Build First Circuit
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(categoryGroups.entries()).map(([cat, catCircuits]) => {
            const isCollapsed = collapsedCats.has(cat);
            const selectedInCat = catCircuits.filter((c) => selectedIds.includes(c.id)).length;
            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => toggleCat(cat)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{cat}</span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {catCircuits.length}
                    </span>
                    {selectedInCat > 0 && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        {selectedInCat} selected
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {catCircuits.map((circuit) => {
                      const isSelected = selectedIds.includes(circuit.id);
                      const names = circuit.exercises.map((ex) => ex.name);
                      const preview = `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
                      return (
                        <div
                          key={circuit.id}
                          className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                          }`}
                          onClick={() => toggleSelection(circuit.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-slate-900 text-sm truncate">{circuit.name}</h4>
                              <p className="text-slate-400 text-[10px] truncate">{preview}</p>
                              <p className="text-slate-300 text-[10px] mt-0.5">{circuitLastUsed[circuit.id]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 ml-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(circuit);
                              }}
                              className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                              aria-label={`Edit ${circuit.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(circuit.id);
                              }}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                              aria-label={`Delete ${circuit.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {uncategorized.map((circuit) => {
            const isSelected = selectedIds.includes(circuit.id);
            const names = circuit.exercises.map((ex) => ex.name);
            const preview = `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
            return (
              <div
                key={circuit.id}
                className={`bg-white p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleSelection(circuit.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 text-sm truncate">{circuit.name}</h4>
                    <p className="text-slate-400 text-[10px] truncate">{preview}</p>
                    <p className="text-slate-300 text-[10px] mt-0.5">{circuitLastUsed[circuit.id]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(circuit);
                    }}
                    className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                    aria-label={`Edit ${circuit.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(circuit.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                    aria-label={`Delete ${circuit.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4">
          <button
            type="button"
            onClick={() => {
              if (selectedIds.length > 0) onStart(circuits.filter((c) => selectedIds.includes(c.id)));
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-4 rounded-2xl font-semibold shadow-xl flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Workout{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>
      )}
    </div>
  );
};

export default CircuitsView;
