
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import StatusBar from '../components/StatusBar';

const WorkoutHistory: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [workoutDetails, setWorkoutDetails] = useState<any>(null);

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

  const fetchWorkoutDetails = async (workoutId: string) => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          description,
          difficulty,
          workout_exercises (
            id,
            set_number,
            reps,
            weight,
            exercises (
              id,
              exercise_name,
              category,
              equipment
            )
          )
        `)
        .eq('id', workoutId)
        .single();

      if (error) throw error;
      setWorkoutDetails(data);
    } catch (error) {
      console.error('Error fetching workout details:', error);
    }
  };

  const handleWorkoutClick = (item: any) => {
    setSelectedWorkout(item);
    if (item.workouts?.id) {
      fetchWorkoutDetails(item.workouts.id);
    }
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
            <div
              key={item.id}
              onClick={() => handleWorkoutClick(item)}
              className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 shadow-lg group cursor-pointer hover:bg-slate-900/60 hover:border-primary/30 transition-all active:scale-[0.98]"
            >
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

      {/* Workout Details Modal */}
      {selectedWorkout && workoutDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 pb-20">
          <div className="bg-slate-900/95 w-full max-w-2xl rounded-3xl overflow-hidden border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b border-slate-800 sticky top-0 z-10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{workoutDetails.name}</h2>
                <p className="text-slate-400 text-sm mt-1">{formatDate(selectedWorkout.created_at)}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedWorkout(null);
                  setWorkoutDetails(null);
                }}
                className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Workout Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Week</p>
                  <p className="text-white font-bold text-lg">{selectedWorkout.week_number}</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Day</p>
                  <p className="text-white font-bold text-lg">{selectedWorkout.day_of_week}</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Difficulty</p>
                  <p className="text-primary font-bold text-lg">{workoutDetails.difficulty || 'General'}</p>
                </div>
              </div>

              {/* Description */}
              {workoutDetails.description && (
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Description</p>
                  <p className="text-slate-300 text-sm">{workoutDetails.description}</p>
                </div>
              )}

              {/* Exercises */}
              <div>
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-primary">fitness_center</span>
                  Exercises ({workoutDetails.workout_exercises?.length || 0})
                </h3>

                {workoutDetails.workout_exercises && workoutDetails.workout_exercises.length > 0 ? (
                  <div className="space-y-3">
                    {workoutDetails.workout_exercises.map((we: any, idx: number) => (
                      <div
                        key={we.id}
                        className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-white">{we.exercises?.exercise_name || 'Unknown Exercise'}</h4>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                              {we.exercises?.category} • {we.exercises?.equipment}
                            </p>
                          </div>
                          <span className="bg-primary/20 text-primary text-[11px] font-black px-2.5 py-1 rounded-lg">
                            Set {we.set_number}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-900/50 rounded-xl p-2.5 text-center border border-slate-700/50">
                            <p className="text-[9px] text-slate-500 uppercase font-black mb-0.5">Reps</p>
                            <p className="text-white font-bold text-sm">{we.reps || '--'}</p>
                          </div>
                          {we.weight && (
                            <div className="bg-slate-900/50 rounded-xl p-2.5 text-center border border-slate-700/50">
                              <p className="text-[9px] text-slate-500 uppercase font-black mb-0.5">Weight</p>
                              <p className="text-white font-bold text-sm">{we.weight} kg</p>
                            </div>
                          )}
                          <div className="bg-slate-900/50 rounded-xl p-2.5 text-center border border-slate-700/50">
                            <p className="text-[9px] text-slate-500 uppercase font-black mb-0.5">Status</p>
                            <p className="text-primary font-bold text-sm">✓</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-700/50">
                    <p className="text-slate-400 text-sm">No exercises recorded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 sticky bottom-0">
              <button
                onClick={() => {
                  setSelectedWorkout(null);
                  setWorkoutDetails(null);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-black uppercase text-sm py-3 rounded-2xl transition-colors shadow-lg shadow-primary/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

      export default WorkoutHistory;
