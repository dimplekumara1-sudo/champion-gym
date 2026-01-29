
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import { supabase } from '../lib/supabase';
import { convertToEmbedUrl, isYoutubeUrl } from '../lib/videoUtils';

const WorkoutDetail: React.FC<{ workoutId: string | null, programId: string | null, onBack: () => void, onStart: (duration: number) => void }> = ({ workoutId, programId, onBack, onStart }) => {
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (workoutId) {
      fetchWorkoutData();
      fetchUserGender();
    }
  }, [workoutId]);

  useEffect(() => {
    if (currentVideo && isYoutubeUrl(currentVideo)) {
      const url = convertToEmbedUrl(currentVideo, true);
      setEmbedUrl(url);
    } else if (currentVideo) {
      setEmbedUrl(currentVideo);
    } else {
      setEmbedUrl(null);
    }
  }, [currentVideo]);

  const fetchUserGender = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
        setUserGender(data?.gender || 'Men');
      }
    } catch (e) { }
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

  const fetchWorkoutData = async () => {
    try {
      setLoading(true);

      // Get gender first to ensure we use it for video selection
      let gender = userGender;
      if (!gender) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
          gender = data?.gender || 'Men';
          setUserGender(gender);
        }
      }

      const [wRes, eRes] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', workoutId).single(),
        supabase.from('workout_exercises').select(`
          *,
          exercises:exercise_id (*)
        `).eq('workout_id', workoutId).order('sort_order')
      ]);

      if (wRes.error) {
        console.error('Error fetching workout:', wRes.error);
        throw new Error(`Failed to fetch workout: ${wRes.error.message}`);
      }

      setWorkout(wRes.data);
      const exerciseData = (eRes.data || []).map(ex => ({
        ...ex,
        done: false
      }));
      setExercises(exerciseData);

      // Prioritize workout video, then first exercise video (gender-specific)
      if (wRes.data?.youtube_url) {
        setCurrentVideo(wRes.data.youtube_url);
      } else if (exerciseData.length > 0) {
        const firstEx = exerciseData[0].exercises;
        const g = gender?.toLowerCase();
        const genderVideo = (g === 'men' || g === 'male') ? firstEx.men_youtube_url :
          (g === 'women' || g === 'female') ? firstEx.women_youtube_url : null;
        setCurrentVideo(genderVideo || firstEx.youtube_url);
      }
    } catch (error) {
      console.error('Error fetching workout detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = (index: number) => {
    const next = [...exercises];
    next[index].done = !next[index].done;
    setExercises(next);
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  if (loading) return <div className="min-h-screen bg-[#090E1A] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-[#090E1A] pb-32">
      <StatusBar />
      <header className="px-6 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-rounded text-white">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-white">{workout?.name || 'Workout Detail'}</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-5 space-y-6">
        <div className="relative aspect-video w-full bg-slate-900 rounded-[2.5rem] overflow-hidden group shadow-2xl border border-slate-800">
          {embedUrl ? (
            <iframe
              className="w-full h-full"
              src={embedUrl}
              title="Exercise Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
              <span className="material-symbols-rounded text-6xl mb-2">videocam_off</span>
              <p className="text-xs font-bold uppercase tracking-widest">No video available</p>
            </div>
          )}
        </div>

        <div className="bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-6 shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-white">Exercises</h2>
            <div className="w-1/2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all duration-500"
                style={{ width: `${(exercises.filter(ex => ex.done).length / exercises.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-7">
            {exercises.map((ex, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 group cursor-pointer transition-opacity ${ex.done ? 'opacity-50' : 'opacity-100'}`}
                onClick={() => {
                  toggleDone(i);
                  const g = userGender?.toLowerCase();
                  const genderVideo = (g === 'men' || g === 'male') ? ex.exercises.men_youtube_url :
                    (g === 'women' || g === 'female') ? ex.exercises.women_youtube_url : null;
                  const videoToSet = genderVideo || ex.exercises.youtube_url;
                  if (videoToSet) setCurrentVideo(videoToSet);
                }}
              >
                <div className="w-14 h-14 bg-slate-800 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-700/30 flex items-center justify-center p-2">
                  {ex.exercises.icon_svg ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: ex.exercises.icon_svg }}
                      className="w-full h-full text-primary flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                    />
                  ) : (
                    <span className="material-symbols-rounded text-slate-600">fitness_center</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[15px] text-white">{ex.exercises.exercise_name}</h3>
                  <p className="text-[13px] text-primary font-bold opacity-80">{ex.sets_reps} {ex.weight_info && `• ${ex.weight_info}`}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const g = userGender?.toLowerCase();
                      const genderVideo = (g === 'men' || g === 'male') ? ex.exercises.men_youtube_url :
                        (g === 'women' || g === 'female') ? ex.exercises.women_youtube_url : null;
                      const videoToSet = genderVideo || ex.exercises.youtube_url;
                      if (videoToSet) {
                        setCurrentVideo(videoToSet);
                      } else {
                        alert('No video available for this exercise');
                      }
                    }}
                    className="flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/20 transition-colors active:scale-90"
                  >
                    <span className="material-symbols-rounded text-sm text-primary">play_circle</span>
                    <span className="text-[10px] font-black uppercase text-primary">Video</span>
                  </button>

                  {((!userGender || userGender.toLowerCase() === 'men' || userGender.toLowerCase() === 'male') && ex.exercises.men_link) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIframeUrl(ex.exercises.men_link);
                      }}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"
                    >
                      <span className="material-symbols-rounded text-lg">male</span>
                    </button>
                  ) : (ex.exercises.women_link && (userGender?.toLowerCase() === 'women' || userGender?.toLowerCase() === 'female')) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIframeUrl(ex.exercises.women_link);
                      }}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"
                    >
                      <span className="material-symbols-rounded text-lg">female</span>
                    </button>
                  ) : null}
                  {!userGender && ex.exercises.women_link && !ex.exercises.men_link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIframeUrl(ex.exercises.women_link);
                      }}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"
                    >
                      <span className="material-symbols-rounded text-lg">female</span>
                    </button>
                  )}
                  <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${ex.done ? 'bg-primary text-slate-950' : 'border-2 border-slate-700/50 text-transparent hover:border-primary'
                    }`}>
                    <span className="material-symbols-rounded text-xl font-black">check</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-6">
          <button
            onClick={() => {
              const finalDuration = Math.max(1, Math.round((Date.now() - startTime) / 60000));
              onStart(finalDuration);
            }}
            className="w-full bg-primary text-slate-950 font-black py-4.5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2 text-lg"
          >
            <span className="material-symbols-rounded font-black">check_circle</span>
            FINISH WORKOUT
          </button>
        </div>
      </main>

      {iframeUrl && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
          <header className="px-5 py-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIframeUrl(null)}
                className="p-2 bg-slate-800 rounded-full"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
              <h2 className="font-bold">{isYoutube(iframeUrl) ? 'Exercise Video' : 'Form View'}</h2>
            </div>
            <button
              onClick={() => {
                if (iframeUrl) {
                  const url = iframeUrl.startsWith('http') ? iframeUrl : `https://${iframeUrl}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                  alert('No URL to open');
                }
              }}
              className="px-4 py-2 bg-primary text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-sm">open_in_new</span>
              {isYoutube(iframeUrl) ? 'Watch on YouTube' : 'Open in Browser'}
            </button>
          </header>
          <div className="flex-1 bg-slate-950 relative flex flex-col">
            {isYoutube(iframeUrl) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(iframeUrl)}?autoplay=1`}
                className="w-full h-full border-none relative z-10"
                title="YouTube Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="bg-slate-900 px-4 py-2 flex items-center gap-2 border-b border-slate-800">
                  <div className="flex-1 bg-slate-950 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[10px] text-slate-500 font-mono truncate">
                    <span className="material-symbols-rounded text-sm">lock</span>
                    {iframeUrl}
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-rounded text-primary text-4xl">travel_explore</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Browser View Requested</h3>
                  <p className="text-slate-400 text-sm mb-8 max-w-[280px]">
                    To view this content securely and bypass frame restrictions, please open it in the built-in browser view.
                  </p>
                  <button
                    onClick={() => {
                      if (iframeUrl) {
                        const url = iframeUrl.startsWith('http') ? iframeUrl : `https://${iframeUrl}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                        alert('No URL to open');
                      }
                    }}
                    className="w-full max-w-[240px] bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-rounded font-black">open_in_new</span>
                    Launch Browser
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutDetail;
