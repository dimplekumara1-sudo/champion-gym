
import React, { useState, useEffect } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

interface WorkoutSummaryProps {
  programId: string | null;
  duration: number;
  onNext: () => void;
  onHome: () => void;
}

const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({ programId, duration, onNext, onHome }) => {
  const [exerciseCount, setExerciseCount] = useState(0);
  const [workoutName, setWorkoutName] = useState('');
  const [gymLocation, setGymLocation] = useState('Your Gym');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkoutData();
  }, [programId]);

  const fetchWorkoutData = async () => {
    try {
      setLoading(true);

      // Check cache for workout data
      const cacheKey = `${CACHE_KEYS.WORKOUT_DETAIL}${programId}`;
      let cachedData = cache.get<any>(cacheKey);

      if (!cachedData) {
        const { data: programData, error: programError } = await supabase
          .from('user_programs')
          .select('workouts(id, name, workout_exercises(id))')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        const workouts = programData?.workouts as any;
        if (workouts) {
          const w = Array.isArray(workouts) ? workouts[0] : workouts;
          setWorkoutName(w.name || '');
          const exercises = w.workout_exercises || [];
          setExerciseCount(exercises.length);

          // Cache workout data for medium TTL
          cache.set(cacheKey, {
            name: w.name,
            exerciseCount: exercises.length
          }, CACHE_TTL.MEDIUM);
        }
      } else {
        // Use cached data
        setWorkoutName(cachedData.name || '');
        setExerciseCount(cachedData.exerciseCount || 0);
      }

      // Check cache for profile gym location
      let profileData = cache.get<any>(CACHE_KEYS.PROFILE_DATA);
      if (!profileData) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gym_name, gym_location')
          .single();

        if (profileError) {
          console.log('Profile fetch note:', profileError);
        } else if (profile?.gym_name) {
          setGymLocation(profile.gym_name);
          cache.set(CACHE_KEYS.PROFILE_DATA, profile, CACHE_TTL.LONG);
        }
      } else if (profileData?.gym_name) {
        setGymLocation(profileData.gym_name);
      }
    } catch (error) {
      console.error('Error fetching workout data:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#090E1A] flex flex-col relative overflow-hidden">
      {/* Subtle Confetti/Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #22C55E 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <StatusBar />

      <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onHome} className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-primary transition-colors">
          <span className="material-symbols-rounded text-3xl font-bold">close</span>
        </button>
        <h2 className="text-white text-lg font-bold flex-1 text-center pr-10">Session Summary</h2>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <div className="flex flex-col items-center justify-center pt-8 pb-8">
          <div className="bg-primary/20 p-8 rounded-full mb-6 relative">
            <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full animate-pulse"></div>
            <span className="material-symbols-rounded text-primary text-8xl font-black relative" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h1 className="text-white tracking-tight text-4xl font-black leading-tight text-center mb-3">
            Workout Completed!
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-[300px] text-center">
            Consistency is key. You're one step closer to your fitness goals!
          </p>
        </div>

        {/* Badge Card */}
        <div className="flex justify-center mb-8">
          <div className="bg-primary/10 border border-primary/20 rounded-3xl p-5 flex items-center gap-4 w-full">
            <div className="bg-primary size-14 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.4)] shrink-0">
              <span className="material-symbols-rounded text-slate-950 text-3xl font-black" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            </div>
            <div>
              <h3 className="text-primary font-black text-xl">Great Job!</h3>
              <p className="text-slate-400 text-sm font-bold">Personal best for daily duration</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="flex flex-col gap-2 rounded-3xl p-7 bg-[#151C2C] border border-[#1E293B] shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-rounded text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Duration</p>
            </div>
            <p className="text-white tracking-tight text-4xl font-black">{duration} <span className="text-xl font-bold text-slate-500">min</span></p>
          </div>

          <div className="flex flex-col gap-2 rounded-3xl p-7 bg-[#151C2C] border border-[#1E293B] shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-rounded text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Calories</p>
            </div>
            <p className="text-white tracking-tight text-4xl font-black">{Math.round(duration * 7.1)} <span className="text-xl font-bold text-slate-500">kcal</span></p>
          </div>

          <div className="flex flex-col gap-2 rounded-3xl p-7 bg-[#151C2C] border border-[#1E293B] shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-rounded text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Exercises</p>
            </div>
            <p className="text-white tracking-tight text-4xl font-black">{loading ? '-' : exerciseCount}</p>
          </div>
        </div>

        {/* Location Card */}
        <div className="w-full h-44 overflow-hidden rounded-[2.5rem] relative mb-8 shadow-2xl">
          <img
            alt="Gym"
            className="absolute inset-0 w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyVhBEn0NKRgyZvMVHIwwBanukE-DxtuUq3T44r_UZ-WACedbwPRixC9WdHB6V6dFedcqL0U8rlvmT6i9644zW_UnnS2N36blA2TxdjlaKo1wUuMjA2TVUDF6TcJvmhJoHwUm2iDEalZMkkZUt8pCtafylI3NaiBgniEHmHSILhaR-o6r3c-xjGJFAYdoYKSptcEpAy8X2fK1OYtN6BoapdbvL83UYv1lR3zkmJ63-P1oocVHRdQuiDmgIYP86hlTHFNa9b_gNNLbL"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090E1A]/90 to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Location</span>
            <p className="text-white text-lg font-bold">{loading ? 'Loading...' : gymLocation}</p>
          </div>
        </div>
      </main>

      {/* Actions */}
      <div className="p-6 pb-12 bg-[#090E1A]/80 backdrop-blur-md border-t border-white/5 flex flex-col gap-3 sticky bottom-0 z-20">
        <button
          onClick={onNext}
          className="flex items-center justify-center gap-3 w-full h-16 bg-primary hover:bg-green-600 text-slate-950 font-black rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 text-lg"
        >
          <span className="material-symbols-rounded font-black">share</span>
          Share Progress
        </button>
        <button
          onClick={onHome}
          className="flex items-center justify-center w-full h-16 bg-slate-800/40 hover:bg-slate-800/60 text-white font-black rounded-2xl transition-all border border-slate-700/30 active:scale-95 text-lg"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default WorkoutSummary;
