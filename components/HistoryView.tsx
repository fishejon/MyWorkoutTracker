
import React from 'react';
import { WorkoutSession } from '../types';
import { Calendar, Clock, ChevronRight, LayoutGrid } from 'lucide-react';

interface HistoryViewProps { history: WorkoutSession[]; }

const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit'
    });
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="text-slate-300 w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800">No logs found</h3>
        <p className="text-slate-400 text-sm mt-1">Start a workout routine from the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Workout History</h2>
      {history.map((session) => (
        <div key={session.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-all border-l-4 border-l-indigo-600">
          <div className="space-y-1 flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              <h4 className="font-black text-slate-800 leading-tight truncate">
                {session.circuitNames.join(' + ') || 'Custom Routine'}
              </h4>
            </div>
            <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-3 h-3" /> {formatDate(session.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatTime(session.date)}
              </span>
            </div>
            <div className="pt-3 flex flex-wrap gap-1.5">
              {session.logs.slice(0, 3).map((log, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase border border-slate-100">
                  {log.exerciseName}
                </span>
              ))}
              {session.logs.length > 3 && (
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-400 rounded-lg text-[9px] font-black uppercase border border-indigo-100">
                  +{session.logs.length - 3} More
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
        </div>
      ))}
    </div>
  );
};

export default HistoryView;
