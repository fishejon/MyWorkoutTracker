
import React, { useMemo } from 'react';
import { WorkoutSession } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Award, Target } from 'lucide-react';

interface StatsViewProps {
  history: WorkoutSession[];
}

const StatsView: React.FC<StatsViewProps> = ({ history }) => {
  const chartData = useMemo(() => {
    return [...history].reverse().map(s => ({
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalSets: s.logs.reduce((acc, log) => acc + log.sets.length, 0),
      totalVolume: s.logs.reduce((acc, log) => {
        if (log.type === 'weight') {
          return acc + log.sets.reduce((sAcc, set) => sAcc + ((set.weight || 0) * (set.value || 0)), 0);
        }
        return acc;
      }, 0)
    }));
  }, [history]);

  const exerciseProgress = useMemo(() => {
    const progress: Record<string, { name: string, data: { date: string, val: number }[] }> = {};
    
    [...history].reverse().forEach(session => {
      const date = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      session.logs.forEach(log => {
        if (!progress[log.exerciseId]) {
          progress[log.exerciseId] = { name: log.exerciseName, data: [] };
        }
        // Calculate max weight or max reps/duration
        const maxVal = Math.max(...log.sets.map(s => log.type === 'weight' ? (s.weight || 0) : s.value));
        progress[log.exerciseId].data.push({ date, val: maxVal });
      });
    });
    
    return Object.values(progress).slice(0, 3); // Top 3 exercises
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
        <TrendingUp className="text-slate-300 w-12 h-12 mb-4" />
        <h3 className="font-bold text-slate-800">No stats yet</h3>
        <p className="text-slate-400 text-sm mt-1">Complete more workouts to visualize your progress over time.</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Progression</h2>
        
        {/* Overall Volume Chart */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Volume (Weight x Reps)</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="totalVolume" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exercise Specific Charts */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Exercise Peak Performance</h3>
          </div>
          
          {exerciseProgress.map((ex) => (
            <div key={ex.name} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-3">{ex.name}</h4>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ex.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="val" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsView;
