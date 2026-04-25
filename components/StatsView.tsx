
import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, CalendarDays, Dumbbell, RefreshCw, TrendingUp } from 'lucide-react';
import { CustomExercise, WorkoutSession } from '../types';
import { buildStatsInsights, getAvailableWeightLifts, StrengthMode, TimeRange } from '../utils/statsInsights';

interface StatsViewProps {
  history: WorkoutSession[];
  customExercises: CustomExercise[];
}

const PREFS_KEY = 'myworkouttracker_stats_prefs';

const MODE_OPTIONS: Array<{ value: StrengthMode; label: string }> = [
  { value: 'bestSet', label: 'Best Set' },
  { value: 'top3Avg', label: 'Top 3 Avg' },
  { value: 'e1rm', label: 'e1RM' },
];

const RANGE_OPTIONS: TimeRange[] = ['4w', '8w', '12w', 'all'];

const StatsView: React.FC<StatsViewProps> = ({ history, customExercises }) => {
  const [strengthMode, setStrengthMode] = useState<StrengthMode>('e1rm');
  const [timeRange, setTimeRange] = useState<TimeRange>('8w');
  const [selectedLift, setSelectedLift] = useState<string>('');
  const [chartFocus, setChartFocus] = useState<'strength' | 'capacity'>('strength');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const availableLifts = useMemo(() => getAvailableWeightLifts(history), [history]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        selectedLift?: string;
        strengthMode?: StrengthMode;
        timeRange?: TimeRange;
        chartFocus?: 'strength' | 'capacity';
      };
      if (parsed.selectedLift) setSelectedLift(parsed.selectedLift);
      if (parsed.strengthMode) setStrengthMode(parsed.strengthMode);
      if (parsed.timeRange) setTimeRange(parsed.timeRange);
      if (parsed.chartFocus) setChartFocus(parsed.chartFocus);
    } catch {
      // ignore malformed preferences
    }
  }, []);

  useEffect(() => {
    if (!selectedLift && availableLifts.length > 0) {
      setSelectedLift(availableLifts[0]);
    }
  }, [selectedLift, availableLifts]);

  useEffect(() => {
    if (!selectedLift) return;
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ selectedLift, strengthMode, timeRange, chartFocus }),
    );
  }, [selectedLift, strengthMode, timeRange, chartFocus]);

  useEffect(() => {
    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), 240);
    return () => window.clearTimeout(timer);
  }, [selectedLift, strengthMode, timeRange, history, refreshNonce]);

  const { insights, computeError } = useMemo(() => {
    try {
      if (!selectedLift) return { insights: null, computeError: null };
      const built = buildStatsInsights({
        sessions: history,
        customExercises,
        selectedLift,
        strengthMode,
        timeRange,
      });
      return { insights: built, computeError: null };
    } catch (err) {
      console.warn('Stats insight error', err);
      return { insights: null, computeError: 'Could not load trends. Please retry.' };
    }
  }, [history, customExercises, selectedLift, strengthMode, timeRange, refreshNonce]);

  if (history.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
        <TrendingUp className="text-slate-300 w-12 h-12 mb-4" />
        <h3 className="font-bold text-slate-800">Trends locked</h3>
        <p className="text-slate-400 text-sm mt-1">Complete 3 sessions to unlock trends.</p>
      </div>
    );
  }

  if (computeError || !insights) {
    return (
      <div className="p-5">
        <div className="bg-white rounded-2xl border border-rose-100 p-5 text-center space-y-3">
          <AlertTriangle className="mx-auto text-rose-500 w-8 h-8" />
          <p className="text-sm font-semibold text-slate-800">{computeError ?? 'Could not load trends.'}</p>
          <button
            type="button"
            onClick={() => setRefreshNonce(v => v + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const weekSummaryLabel =
    insights.consistency.sessionsThisWeek >= insights.consistency.targetSessionsPerWeek
      ? 'On track this week'
      : `${insights.consistency.targetSessionsPerWeek - insights.consistency.sessionsThisWeek} more to hit target`;

  return (
    <div className="p-5 space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Progress Dashboard</h2>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Consistency</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-indigo-50 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest font-black text-indigo-600">Current streak</div>
            <div className="text-2xl font-black text-slate-900">{insights.consistency.currentStreakDays}d</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest font-black text-emerald-600">This week</div>
            <div className="text-2xl font-black text-slate-900">
              {insights.consistency.sessionsThisWeek}/{insights.consistency.targetSessionsPerWeek}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">{weekSummaryLabel}</p>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={insights.consistency.adherence4Week}>
              <XAxis dataKey="weekLabel" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => [`${val} sessions`, 'Week total']}
              />
              <Line type="monotone" dataKey="sessions" stroke="#6366f1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Performance Signals</h3>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setChartFocus('strength')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                chartFocus === 'strength' ? 'bg-white text-slate-900' : 'text-slate-500'
              }`}
            >
              Strength
            </button>
            <button
              type="button"
              onClick={() => setChartFocus('capacity')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                chartFocus === 'capacity' ? 'bg-white text-slate-900' : 'text-slate-500'
              }`}
            >
              Capacity
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedLift}
            onChange={e => setSelectedLift(e.target.value)}
            className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {availableLifts.map(lift => (
              <option key={lift} value={lift}>
                {lift}
              </option>
            ))}
          </select>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as TimeRange)}
            className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {RANGE_OPTIONS.map(range => (
              <option key={range} value={range}>
                {range.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {MODE_OPTIONS.map(mode => (
            <button
              type="button"
              key={mode.value}
              onClick={() => setStrengthMode(mode.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                strengthMode === mode.value ? 'bg-white text-slate-900' : 'text-slate-500'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
          </div>
        ) : chartFocus === 'strength' ? (
          <div className="space-y-2">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.strengthSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: number) => [`${value.toFixed(1)}`, strengthMode === 'e1rm' ? 'e1RM' : 'Load']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500">{insights.e1rmHelperText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.workCapacity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="muscleGroup" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [Math.round(value), name === 'weeklyVolume' ? 'Current week' : '4-week baseline']}
                  />
                  <Bar dataKey="weeklyVolume" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500">
              Capacity compares this week vs your rolling 4-week baseline and accounts for uneven session counts.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">What to do next</h3>
        <div className="space-y-2">
          {insights.recommendations.map(rec => (
            <div key={rec.headline} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">{rec.headline}</p>
              <p className="text-xs text-slate-600 mt-1">{rec.detail}</p>
            </div>
          ))}
        </div>
        {insights.confidenceMessage && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            {insights.confidenceMessage}
          </p>
        )}
        <button
          type="button"
          onClick={() => setRefreshNonce(v => v + 1)}
          className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh insights
        </button>
      </div>
    </div>
  );
};

export default StatsView;
