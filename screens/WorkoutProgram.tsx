
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';

const WorkoutProgram: React.FC<{ onNavigate: (s: AppScreen) => void, onSelectWorkout: (workoutId: string, programId: string) => void }> = ({ onNavigate, onSelectWorkout }) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<string>('male');

  useEffect(() => {
    fetchPrograms();
    fetchUserGender();
  }, []);

  const fetchUserGender = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', user.id)
        .single();

      setUserGender(data?.gender || 'male');
    } catch (error) {
      console.error('Error fetching user gender:', error);
    }
  };

  const openVideoInNewTab = (title: string, videoUrl: string) => {
    let embedUrl = videoUrl;

    // Convert YouTube URLs to embeddable format if needed
    if (videoUrl.includes('youtube.com/watch?v=')) {
      const videoId = videoUrl.split('v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (!videoUrl.includes('embed')) {
      window.open(videoUrl, '_blank');
      return;
    }

    // Create HTML page for video display
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { margin-bottom: 20px; }
          .title { color: #fff; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .video-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 20px; }
          .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
          .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #3f46e1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .back-btn:hover { background: #4f46e1; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="javascript:history.back()" class="back-btn">← Back</a>
          <div class="header">
            <div class="title">${title}</div>
          </div>
          <div class="video-container">
            <iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const loadExerciseVideo = async (workoutId: string) => {
    try {
      // Fetch exercises for this workout
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercise:exercises(
            id,
            exercise_name,
            men_youtube_url,
            women_youtube_url,
            youtube_url
          )
        `)
        .eq('workout_id', workoutId)
        .limit(1)
        .single();

      if (error || !data) {
        alert('No exercises found for this workout');
        return;
      }

      const exercise = data.exercise;
      // Select video based on user gender
      const videoUrl = userGender === 'female'
        ? exercise.women_youtube_url || exercise.youtube_url
        : exercise.men_youtube_url || exercise.youtube_url;

      // Open video in new tab instead of modal
      if (videoUrl) {
        openVideoInNewTab(exercise.exercise_name, videoUrl);
      } else {
        alert('No video available for this exercise');
      }
    } catch (error) {
      console.error('Error loading exercise video:', error);
      alert('Failed to load exercise video');
    }
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_programs')
        .select(`
          *,
          workouts (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('week_number', { ascending: true })
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by week
  const weeks = programs.reduce((acc: any, curr) => {
    const week = curr.week_number || 1;
    if (!acc[week]) acc[week] = [];
    acc[week].push(curr);
    return acc;
  }, {});

  return (
    <div className="pb-32 min-h-screen bg-[#090E1A] text-white">
      <StatusBar />
      <nav className="flex items-center px-4 py-2 mb-4">
        <button onClick={() => onNavigate('DASHBOARD')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold mr-10">Workout Program</h1>
      </nav>

      <section className="px-6 py-4 flex items-center justify-between">
        <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">
          Your personalised workout programme designed by our elite coaching team.
        </p>
        <button
          onClick={() => onNavigate('CREATE_WORKOUT')}
          className="bg-primary text-slate-950 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-rounded text-sm">add</span>
          Create Plan
        </button>
      </section>

      <main className="px-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : Object.keys(weeks).length === 0 ? (
          <div className="text-center py-20 bg-[#151C2C] rounded-[2.5rem] border border-[#1E293B]">
            <span className="material-symbols-rounded text-6xl text-slate-700 mb-4">fitness_center</span>
            <p className="text-slate-500 font-bold">No assigned workouts yet.</p>
          </div>
        ) : Object.entries(weeks).map(([weekNum, dayPrograms]: [string, any]) => (
          <div key={weekNum} className="bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Week {weekNum}</h2>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all duration-500"
                  style={{ width: `${(dayPrograms.filter((p: any) => p.status === 'completed').length / dayPrograms.length) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {dayPrograms.map((p: any, i: number) => (
                <button
                  key={i}
                  onClick={() => loadExerciseVideo(p.workouts.id)}
                  className="flex flex-col items-center min-w-[70px] gap-2 active:scale-95 transition-transform group"
                >
                  <div className="text-xs text-slate-500 font-bold">Day {p.day_of_week}</div>
                  <div className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all ${p.status === 'completed' ? 'bg-primary/20 border-primary/40' : 'bg-slate-800/40 border-slate-700/30'
                    }`}>
                    <span className={`material-symbols-rounded text-xl ${p.status === 'completed' ? 'text-primary' : 'text-slate-500'}`} style={{ fontVariationSettings: p.status === 'completed' ? "'FILL' 1" : "'FILL' 0" }}>
                      {p.status === 'completed' ? 'check_circle' : 'fitness_center'}
                    </span>
                    <span className={`text-[8px] uppercase tracking-wider font-black px-1 text-center w-full line-clamp-2 ${p.status === 'completed' ? 'text-primary' : 'text-slate-500'}`}>
                      {p.workouts?.name || 'Workout'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>

      <BottomNav active="WORKOUTS" onNavigate={onNavigate} />
    </div>
  );
};

export default WorkoutProgram;
