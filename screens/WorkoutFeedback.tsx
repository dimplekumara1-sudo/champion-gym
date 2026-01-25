
import React, { useState, useEffect } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

interface WorkoutFeedbackProps {
  programId: string | null;
  duration: number;
  onFinish: () => void;
  onBack: () => void;
}

const feelings = [
  { label: 'Exhausted', icon: 'sentiment_very_dissatisfied' },
  { label: 'Tired', icon: 'sentiment_neutral' },
  { label: 'Good', icon: 'sentiment_satisfied', active: true },
  { label: 'Energized', icon: 'bolt' },
];

const WorkoutFeedback: React.FC<WorkoutFeedbackProps> = ({ programId, duration, onFinish, onBack }) => {
  const [selected, setSelected] = useState('Good');
  const [loading, setLoading] = useState(false);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [weekProgress, setWeekProgress] = useState({ completed: 0, total: 5 });

  useEffect(() => {
    fetchWorkoutStats();
  }, [programId]);

  const fetchWorkoutStats = async () => {
    try {
      // Check cache for exercise count
      const cacheKey = `${CACHE_KEYS.WORKOUT_DETAIL}${programId}`;
      let cachedData = cache.get(cacheKey);

      if (!cachedData) {
        // Fetch exercise count
        const { data: programData, error: programError } = await supabase
          .from('user_programs')
          .select('workouts(workout_exercises(id))')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        if (programData?.workouts?.workout_exercises) {
          const count = programData.workouts.workout_exercises.length;
          setExerciseCount(count);

          // Cache the data
          cache.set(cacheKey, { exerciseCount: count }, CACHE_TTL.MEDIUM);
        }
      } else {
        setExerciseCount(cachedData.exerciseCount || 0);
      }

      // Check cache for week progress
      const weekCacheKey = `${CACHE_KEYS.DASHBOARD_STATS}_week`;
      let cachedWeekData = cache.get(weekCacheKey);

      if (!cachedWeekData) {
        // Fetch weekly progress
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));

        const { data: weekWorkouts, error: weekError } = await supabase
          .from('user_programs')
          .select('id')
          .eq('status', 'completed')
          .gte('updated_at', weekStart.toISOString());

        if (weekError) throw weekError;

        const weekData = {
          completed: weekWorkouts?.length || 0,
          total: 5
        };
        setWeekProgress(weekData);
        cache.set(weekCacheKey, weekData, CACHE_TTL.SHORT);
      } else {
        setWeekProgress(cachedWeekData);
      }
    } catch (error) {
      console.error('Error fetching workout stats:', error);
    }
  };

  const handleFinish = async () => {
    if (programId) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('user_programs')
          .update({ status: 'completed' })
          .eq('id', programId);

        if (error) throw error;

        // Clear related cache entries on status update
        cache.clearPattern(`${CACHE_KEYS.DASHBOARD_STATS}*`);
        cache.clearPattern(`${CACHE_KEYS.USER_PROGRAMS}*`);
      } catch (err) {
        console.error('Error completing workout:', err);
      } finally {
        setLoading(false);
      }
    }
    onFinish();
  };

  return (
    <div className="min-h-screen bg-[#090E1A] flex flex-col font-sans">
      <StatusBar />

      <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-white transition-colors">
          <span className="material-symbols-rounded text-3xl">close</span>
        </button>
        <h2 className="text-white text-xl font-black flex-1 text-center pr-10">Great Work!</h2>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        {/* Hero Image Section */}
        <div className="relative w-full h-56 mt-4 overflow-hidden shadow-2xl">
          <img
            alt="Celebrating"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaE3raLSIkuAKTTcj6NDDGLKX1vt7G8sRyoF2nRN7XNOWOYbEnyWewqmbnG_Z0i3fvDxKePSlOIhpqmGThG_cnm4F2T3om1ng3mWsP4vgA5m-FR6PE6N0KE_9mX77U-sZU5-WVnvuigFQezHVMQsq2WolroJqlh7MvwOG85oXd1MUqXHoqsb7gOyIjtILj_vo8LFrN35CVfREIPmniw10h20tq2jthY9LAb8QcxfZJkA9emi2tZuzbPsyV0g7S98mr4GWAR47WmVIn"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090E1A] via-[#090E1A]/20 to-transparent"></div>
        </div>

        {/* Mini Stats Row */}
        <div className="flex gap-3 px-6 -mt-10 relative z-10">
          {[
            { label: 'Duration', val: `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`, trend: '+5%', pos: true },
            { label: 'Calories', val: `${Math.round(duration * 7.1)} kcal`, trend: '+10%', pos: true },
            { label: 'Exercises', val: exerciseCount.toString(), trend: '-2%', pos: false },
          ].map((stat, i) => (
            <div key={i} className="flex-1 bg-[#151C2C] border border-[#1E293B] rounded-[2rem] p-4 flex flex-col gap-1 shadow-2xl">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-white font-black text-lg truncate leading-tight">{stat.val}</p>
              <div className={`flex items-center gap-0.5 text-[10px] font-black ${stat.pos ? 'text-primary' : 'text-red-500'}`}>
                <span className="material-symbols-rounded text-[12px]">{stat.pos ? 'trending_up' : 'trending_down'}</span>
                {stat.trend}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback Selector */}
        <section className="px-6 pt-10">
          <h3 className="text-white text-xl font-black mb-5 tracking-tight">How do you feel?</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {feelings.map((f, i) => (
              <button
                key={i}
                onClick={() => setSelected(f.label)}
                className={`flex flex-col items-center justify-center gap-3 rounded-3xl p-5 min-w-[95px] border-2 transition-all shadow-lg active:scale-95 ${selected === f.label ? 'bg-primary/10 border-primary shadow-primary/10' : 'bg-[#151C2C] border-[#1E293B] opacity-70'
                  }`}
              >
                <span className={`material-symbols-rounded text-3xl ${selected === f.label ? 'text-primary' : 'text-slate-400'}`}>{f.icon}</span>
                <p className={`text-[11px] font-black uppercase tracking-widest ${selected === f.label ? 'text-white' : 'text-slate-500'}`}>{f.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Weekly Progress Section */}
        <section className="px-6 pt-10">
          <div className="bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-7 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white text-lg font-black tracking-tight">Weekly Goal Progress</h3>
              <span className="text-primary text-sm font-black uppercase tracking-widest">{weekProgress.completed} / {weekProgress.total} days</span>
            </div>
            <div className="flex gap-2.5 w-full h-3.5 mb-6">
              {[...Array(weekProgress.total)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${i < weekProgress.completed
                    ? 'bg-primary shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                    : i === weekProgress.completed
                      ? 'bg-primary relative'
                      : 'bg-slate-800/80'
                    }`}
                >
                  {i === weekProgress.completed && <div className="absolute inset-0 bg-white/40 animate-pulse rounded-full"></div>}
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm font-bold leading-relaxed">
              This workout put you one step closer to your goal! Just {weekProgress.total - weekProgress.completed - 1} more to hit your target.
            </p>
          </div>
        </section>
      </main>

      <div className="p-6 pb-12 bg-[#090E1A]/90 backdrop-blur-md border-t border-white/5 sticky bottom-0 z-20">
        <button
          onClick={handleFinish}
          disabled={loading}
          className="w-full bg-primary hover:bg-green-600 text-slate-950 font-black py-5 rounded-3xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-2 text-xl transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Finish'}
          {!loading && <span className="material-symbols-rounded font-black">chevron_right</span>}
        </button>
      </div>
    </div>
  );
};

export default WorkoutFeedback;
