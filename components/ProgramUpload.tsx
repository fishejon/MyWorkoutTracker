import React, { useRef, useState } from 'react';
import { Circuit, CircuitExercise, ExerciseType, Program, ProgramWorkoutDay } from '../types';
import { Upload, FileText, X, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';

interface ProgramUploadProps {
  onImportCircuits: (circuits: Circuit[]) => void;
  onImportProgram: (program: Program) => void;
  onCancel: () => void;
}

// ─── CSV parsing ────────────────────────────────────────────────────────────

interface CsvRow {
  week?: number;
  day?: number;
  circuit_name: string;
  exercise_name: string;
  type: ExerciseType;
  sets: number;
  suggested_weight?: number;
  suggested_reps?: number;
}

function parseCSV(raw: string): { rows: CsvRow[]; error: string | null } {
  // Strip BOM, normalise line endings
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row.' };

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const hasWeekDay = headers.includes('week') && headers.includes('day');

  const idx = (col: string) => headers.indexOf(col);
  const requiredCols = ['circuit_name', 'exercise_name', 'type', 'sets'];
  const missing = requiredCols.filter(c => idx(c) === -1);
  if (missing.length > 0) {
    return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  }

  const validTypes: ExerciseType[] = ['weight', 'reps', 'duration'];
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    const get = (col: string) => cells[idx(col)] ?? '';

    const type = get('type').toLowerCase() as ExerciseType;
    if (!validTypes.includes(type)) {
      errors.push(`Row ${i + 1}: invalid type "${get('type')}" — must be weight, reps, or duration.`);
      continue;
    }

    const sets = parseInt(get('sets'), 10);
    if (isNaN(sets) || sets < 1 || sets > 99) {
      errors.push(`Row ${i + 1}: sets must be a number between 1 and 99.`);
      continue;
    }

    const circuit_name = get('circuit_name');
    const exercise_name = get('exercise_name');
    if (!circuit_name || !exercise_name) {
      errors.push(`Row ${i + 1}: circuit_name and exercise_name are required.`);
      continue;
    }

    // Optional suggested values — silently ignore if missing or non-numeric
    const sugWeight = idx('suggested_weight') !== -1 ? parseFloat(get('suggested_weight')) : NaN;
    const sugReps   = idx('suggested_reps')   !== -1 ? parseFloat(get('suggested_reps'))   : NaN;
    const row: CsvRow = { circuit_name, exercise_name, type, sets };
    if (!isNaN(sugWeight) && sugWeight > 0) row.suggested_weight = sugWeight;
    if (!isNaN(sugReps)   && sugReps   > 0) row.suggested_reps   = sugReps;

    if (hasWeekDay) {
      const week = parseInt(get('week'), 10);
      const day = parseInt(get('day'), 10);
      if (isNaN(week) || isNaN(day) || week < 1 || day < 1) {
        errors.push(`Row ${i + 1}: week and day must be positive integers.`);
        continue;
      }
      row.week = week;
      row.day = day;
    }

    rows.push(row);
  }

  if (errors.length > 0) return { rows, error: errors.slice(0, 3).join(' ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : '') };
  return { rows, error: null };
}

// ─── Build circuits from grouped rows ───────────────────────────────────────

function buildCircuit(circuitName: string, exerciseRows: CsvRow[]): Circuit {
  const exercises: CircuitExercise[] = exerciseRows.map(row => {
    const ex: CircuitExercise = {
      id: `csv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: row.exercise_name,
      type: row.type,
      defaultSets: row.sets,
      sets: row.sets,
    };
    if (row.suggested_weight !== undefined) ex.suggestedWeight = row.suggested_weight;
    if (row.suggested_reps   !== undefined) ex.suggestedValue  = row.suggested_reps;
    return ex;
  });
  return {
    id: `csv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: circuitName,
    exercises,
  };
}

// ─── Preview helpers ─────────────────────────────────────────────────────────

type WeekDayEntry = { week: number; day: number; circuits: Map<string, CsvRow[]> };

interface ParsedPreview {
  isMultiWeek: boolean;
  programName: string;
  totalWeeks: number;
  // multi-week
  weekDayMap: Map<string, WeekDayEntry>;
  // single-day
  circuitMap: Map<string, CsvRow[]>;
  totalExercises: number;
}

function buildPreview(rows: CsvRow[], fileName: string): ParsedPreview {
  const isMultiWeek = rows[0]?.week !== undefined;
  const programName = fileName.replace(/\.csv$/i, '').replace(/[_-]/g, ' ');

  const weekDayMap = new Map<string, WeekDayEntry>();
  const circuitMap = new Map<string, CsvRow[]>();
  let totalExercises = 0;

  for (const row of rows) {
    totalExercises++;
    if (isMultiWeek && row.week !== undefined && row.day !== undefined) {
      const key = `${row.week}-${row.day}`;
      if (!weekDayMap.has(key)) {
        weekDayMap.set(key, { week: row.week, day: row.day, circuits: new Map() });
      }
      const entry = weekDayMap.get(key)!;
      if (!entry.circuits.has(row.circuit_name)) entry.circuits.set(row.circuit_name, []);
      entry.circuits.get(row.circuit_name)!.push(row);
    } else {
      if (!circuitMap.has(row.circuit_name)) circuitMap.set(row.circuit_name, []);
      circuitMap.get(row.circuit_name)!.push(row);
    }
  }

  const totalWeeks = isMultiWeek
    ? Math.max(...Array.from(weekDayMap.values()).map(e => e.week), 0)
    : 1;

  return { isMultiWeek, programName, totalWeeks, weekDayMap, circuitMap, totalExercises };
}

// ─── Component ───────────────────────────────────────────────────────────────

const ProgramUpload: React.FC<ProgramUploadProps> = ({ onImportCircuits, onImportProgram, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [programName, setProgramName] = useState('');

  const handleFile = (file: File) => {
    setFileName(file.name);
    setParseError(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows, error } = parseCSV(text);
      if (rows.length === 0) {
        setParseError(error ?? 'No valid rows found.');
        return;
      }
      if (error) setParseError(error); // partial errors — still show preview
      const p = buildPreview(rows, file.name);
      setPreview(p);
      setProgramName(p.programName);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  };

  const handleConfirm = () => {
    if (!preview) return;

    if (!preview.isMultiWeek) {
      // Single-day: create standalone circuits
      const circuits: Circuit[] = [];
      preview.circuitMap.forEach((rows, name) => {
        circuits.push(buildCircuit(name, rows));
      });
      onImportCircuits(circuits);
      return;
    }

    // Multi-week: create a Program
    const schedule: ProgramWorkoutDay[] = [];
    const sortedEntries = (Array.from(preview.weekDayMap.values()) as WeekDayEntry[]).sort(
      (a, b) => a.week !== b.week ? a.week - b.week : a.day - b.day
    );

    for (const entry of sortedEntries) {
      const circuits: Circuit[] = [];
      entry.circuits.forEach((rows, name) => {
        circuits.push(buildCircuit(name, rows));
      });
      schedule.push({ week: entry.week, day: entry.day, circuits });
    }

    const program: Program = {
      id: `prog-${Date.now()}`,
      name: programName.trim() || preview.programName,
      totalWeeks: preview.totalWeeks,
      schedule,
    };
    onImportProgram(program);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-40 flex items-center gap-3">
        <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Import CSV</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32">
        {/* Format guide */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Supported Formats</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1">Single day</p>
              <code className="block text-[11px] text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-100 leading-5">
                circuit_name, exercise_name, type, sets<br />
                Upper Body, Bench Press, weight, 3<br />
                Upper Body, Pull-ups, reps, 3
              </code>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1">Multi-week program</p>
              <code className="block text-[11px] text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-100 leading-5">
                week, day, circuit_name, exercise_name, type, sets<br />
                1, 1, Upper Body A, Bench Press, weight, 3<br />
                1, 2, Lower Body A, Squat, weight, 4
              </code>
            </div>
          </div>
          <p className="text-[10px] text-indigo-400 font-medium">type must be: weight · reps · duration</p>
          <p className="text-[10px] text-indigo-400 font-medium mt-1">Optional: add <strong>suggested_weight</strong> and/or <strong>suggested_reps</strong> columns to pre-fill values in the workout</p>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {fileName ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-6 h-6 text-indigo-500 flex-shrink-0" />
              <span className="font-semibold text-slate-700 text-sm truncate max-w-[200px]">{fileName}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setFileName(null); setPreview(null); setParseError(null); }}
                className="p-1 text-slate-300 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-sm">Tap to upload or drag & drop</p>
              <p className="text-xs text-slate-400 mt-1">.csv files only</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{parseError}</p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-slate-800 text-sm">
                  {preview.isMultiWeek ? 'Multi-week program detected' : 'Single-day workout detected'}
                </span>
              </div>

              {preview.isMultiWeek && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Program Name</label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-900"
                    placeholder="e.g., 8-Week Strength Block"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {preview.isMultiWeek && (
                  <div className="bg-indigo-50 rounded-xl p-2">
                    <p className="text-xl font-black text-indigo-600">{preview.totalWeeks}</p>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">Weeks</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-xl font-black text-slate-700">
                    {preview.isMultiWeek ? preview.weekDayMap.size : preview.circuitMap.size}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {preview.isMultiWeek ? 'Workouts' : 'Circuits'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-xl font-black text-slate-700">{preview.totalExercises}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Exercises</p>
                </div>
              </div>
            </div>

            {/* Week/day breakdown (multi-week) */}
            {preview.isMultiWeek && (
              <div className="space-y-2">
                {Array.from(
                  new Set((Array.from(preview.weekDayMap.values()) as WeekDayEntry[]).map(e => e.week))
                ).sort((a: number, b: number) => a - b).map(week => {
                  const days = (Array.from(preview.weekDayMap.values()) as WeekDayEntry[])
                    .filter(e => e.week === week)
                    .sort((a, b) => a.day - b.day);
                  return (
                    <div key={week} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Week {week}</p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {days.map(entry => (
                          <div key={entry.day} className="px-4 py-3">
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-1">Day {entry.day}</p>
                            {Array.from(entry.circuits.entries()).map(([name, rows]) => (
                              <div key={name} className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">{name}</span>
                                <span className="text-[10px] text-slate-400 font-bold">{rows.length} exercises</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Circuit breakdown (single-day) */}
            {!preview.isMultiWeek && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                {Array.from(preview.circuitMap.entries()).map(([name, rows]) => (
                  <div key={name} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{rows.length} exercises</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-40 flex flex-col gap-3 shadow-2xl">
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview}
            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {preview?.isMultiWeek ? 'IMPORT PROGRAM' : 'ADD CIRCUITS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramUpload;
