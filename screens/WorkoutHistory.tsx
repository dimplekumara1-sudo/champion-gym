
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import StatusBar from '../components/StatusBar';

const WorkoutHistory: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_programs')
        .select(`
          id,
          status,
          week_number,
          day_of_week,
          created_at,
          workouts (
            id,
            name,
            description,
            difficulty
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-10">
      <StatusBar />
      <header className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button onClick={() => onNavigate('PROFILE')} className="p-2 bg-slate-900/60 rounded-full">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Workout History</h1>
      </header>

      <main className="px-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50">
            <span className="material-symbols-rounded text-6xl text-slate-700 mb-4">history</span>
            <p className="text-slate-500 font-bold">No completed workouts yet.</p>
            <button 
              onClick={() => onNavigate('WORKOUT_PROGRAM')}
              className="mt-6 text-primary font-bold uppercase text-[10px] tracking-widest"
            >
              Start Your First Workout
            </button>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 shadow-lg group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-rounded text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div>
                    <h3 className="font-black text-white">{item.workouts?.name}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-800/50 px-2 py-1 rounded text-[9px] font-black text-slate-400 uppercase">
                  {item.workouts?.difficulty || 'General'}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/40 rounded-2xl p-3 text-center border border-slate-800/30">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Week</p>
                  <p className="text-white font-bold text-sm">{item.week_number}</p>
                </div>
                <div className="bg-slate-950/40 rounded-2xl p-3 text-center border border-slate-800/30">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Day</p>
                  <p className="text-white font-bold text-sm">{item.day_of_week}</p>
                </div>
                <div className="bg-slate-950/40 rounded-2xl p-3 text-center border border-slate-800/30">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Feeling</p>
                  <p className="text-primary font-bold text-sm">Good</p>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default WorkoutHistory;
