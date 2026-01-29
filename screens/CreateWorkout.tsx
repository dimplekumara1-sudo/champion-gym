
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import StatusBar from '../components/StatusBar';
import { geminiModel } from '../lib/gemini';

const CreateWorkout: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [userGender, setUserGender] = useState<'men' | 'women'>('men');

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterData, setFilterData] = useState<{categories: string[], equipments: string[], levels: string[]}>({
    categories: [],
    equipments: [],
    levels: []
  });

  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    setPage(0);
    fetchExercises(0, true);
  }, [searchTerm, categoryFilter, levelFilter, equipmentFilter]);

  const fetchFilterData = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('category, equipment, level');
      
      if (error) throw error;
      
      if (data) {
        const cats = new Set<string>();
        const equips = new Set<string>();
        const levels = new Set<string>();
        
        data.forEach(ex => {
          if (ex.category) cats.add(ex.category);
          if (ex.equipment) {
            equips.add(ex.equipment);
            if (ex.equipment.toLowerCase() === 'cardio') cats.add('Cardio');
          }
          if (ex.level) levels.add(ex.level);
        });

        setFilterData({
          categories: ['All', ...Array.from(cats)].sort(),
          equipments: ['All', ...Array.from(equips)].sort(),
          levels: Array.from(levels).sort()
        });
      }
    } catch (e) {
      console.error('Error fetching filter data:', e);
    }
  };

  const levels = useMemo(() => {
    const order = ['Novice', 'Beginner', 'Intermediate', 'Advanced'];
    return filterData.levels.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [filterData.levels]);

  const categories = filterData.categories;
  const equipments = filterData.equipments;

  const fetchExercises = async (pageToFetch: number, isNewSearch: boolean = false) => {
    try {
      if (isNewSearch) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('exercises')
        .select('*', { count: 'exact' });

      // Apply Filters Server-side
      if (searchTerm) {
        query = query.or(`exercise_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
      }

      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Cardio') {
          query = query.or(`category.eq.Cardio,equipment.eq.Cardio`);
        } else {
          query = query.eq('category', categoryFilter);
        }
      }

      if (equipmentFilter !== 'All') {
        query = query.eq('equipment', equipmentFilter);
      }

      if (levelFilter !== 'All') {
        query = query.eq('level', levelFilter);
      }

      const { data, error, count } = await query
        .order('exercise_name', { ascending: true })
        .range(pageToFetch * PAGE_SIZE, (pageToFetch + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (isNewSearch) {
        setExercises(data || []);
      } else {
        setExercises(prev => [...prev, ...(data || [])]);
      }

      setHasMore(count ? (pageToFetch + 1) * PAGE_SIZE < count : false);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchExercises(nextPage);
    }
  };

  const toggleExercise = (ex: any) => {
    const exists = selectedExercises.find(s => s.id === ex.id);
    if (exists) {
      setSelectedExercises(selectedExercises.filter(s => s.id !== ex.id));
    } else {
      setSelectedExercises([...selectedExercises, { ...ex, sets_reps: '3x12' }]);
    }
  };

  const updateSetsReps = (id: string, val: string) => {
    setSelectedExercises(selectedExercises.map(ex => ex.id === id ? { ...ex, sets_reps: val } : ex));
  };

  const openExerciseVideo = (videoUrl: string | null) => {
    if (!videoUrl) {
      alert('No video available for this exercise');
      return;
    }

    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch?v=')) {
      const videoId = videoUrl.split('v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exercise Video</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .video-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; }
          .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
          .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #3f46e1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .back-btn:hover { background: #4f46e1; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="javascript:history.back()" class="back-btn">← Back</a>
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

  const handleSave = async () => {
    if (!workoutName) return alert('Please enter a workout name');
    if (selectedExercises.length === 0) return alert('Please select at least one exercise');

    try {
      setSaving(true);
      
      // Get session instead of just user for better auth handling
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.error('Auth session error:', authError);
        return alert('Your session has expired. Please log out and log back in.');
      }

      const user = session.user;

      const workoutData: any = {
        name: workoutName,
        description: description,
        category: 'Custom',
        difficulty: difficulty,
        user_id: user.id // Added user_id in case RLS requires it for inserts
      };

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (workoutError) {
        console.error('Workout insert error:', workoutError);
        throw new Error(`Failed to create workout: ${workoutError.message}`);
      }

      const exerciseInserts = selectedExercises.map((ex, idx) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        sets_reps: ex.sets_reps,
        sort_order: idx
      }));

      const { error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert(exerciseInserts);

      if (exerciseError) {
        console.error('Exercise insert error:', exerciseError);
        throw new Error(`Failed to add exercises: ${exerciseError.message}`);
      }

      const { error: programError } = await supabase
        .from('user_programs')
        .insert({
          user_id: user.id,
          workout_id: workout.id,
          week_number: weekNumber,
          day_of_week: dayOfWeek,
          status: 'pending'
        });

      if (programError) {
        console.error('Program insert error:', programError);
        throw new Error(`Failed to assign program: ${programError.message}`);
      }

      alert('Workout plan created and assigned successfully!');
      onNavigate('WORKOUT_PROGRAM');
    } catch (error: any) {
      console.error('Error saving workout plan:', error);
      alert(error.message || 'Failed to save workout plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!workoutName) return alert('Please enter a workout name first so AI knows what to generate!');
    
    try {
      setIsAiGenerating(true);
      
      // 1. Fetch all available exercises for the AI to choose from
      const { data: allExercises, error } = await supabase
        .from('exercises')
        .select('id, exercise_name, category, level, equipment');
      
      if (error) throw error;
      if (!allExercises || allExercises.length === 0) throw new Error('No exercises found in database');

      // 2. Prepare the prompt
      const prompt = `
        You are a professional fitness coach. Create a workout plan based on these details:
        Workout Name: ${workoutName}
        Description: ${description}
        Difficulty: ${difficulty}

        Available Exercises (ID and Name):
        ${allExercises.map(ex => `${ex.id}: ${ex.exercise_name} (${ex.category}, ${ex.level}, ${ex.equipment})`).join('\n')}

        Select 5-8 most suitable exercises from the list above.
        Return ONLY a JSON array of objects with "id" and "sets_reps" keys.
        Example: [{"id": "uuid-1", "sets_reps": "3x12"}, {"id": "uuid-2", "sets_reps": "4x8"}]
        Do not include any explanation or markdown.
      `;

      // 3. Call Gemini
      const result = await geminiModel.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const suggestedIndices = JSON.parse(cleanJson);

      // 4. Map back to full exercise objects
      const newSelected = suggestedIndices.map((suggestion: any) => {
        const fullEx = allExercises.find(ex => ex.id === suggestion.id);
        if (fullEx) {
          return { ...fullEx, sets_reps: suggestion.sets_reps };
        }
        return null;
      }).filter(Boolean);

      if (newSelected.length > 0) {
        setSelectedExercises(newSelected);
        alert(`AI has suggested ${newSelected.length} exercises for your "${workoutName}" workout!`);
      } else {
        alert('AI could not match any exercises. Please try a different workout name.');
      }

    } catch (error) {
      console.error('AI Generation error:', error);
      alert('Failed to generate workout with AI. Please try again or select manually.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <StatusBar />
      <header className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button onClick={() => onNavigate('WORKOUT_PROGRAM')} className="p-2 bg-slate-900/60 rounded-full">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Create Plan</h1>
      </header>

      <main className="px-5 space-y-8">
        {/* Step 1: Basic Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-primary text-slate-950 rounded-full flex items-center justify-center text-xs font-black">1</span>
            <h2 className="text-lg font-bold">Workout Details</h2>
          </div>
          <div className="space-y-3">
            <input
              className="w-full bg-slate-900/60 border-none rounded-2xl py-4 px-5 text-[15px] focus:ring-1 focus:ring-primary placeholder:text-slate-500"
              placeholder="Workout Name (e.g. My Custom Push)"
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
            />
            <textarea
              className="w-full bg-slate-900/60 border-none rounded-2xl py-4 px-5 text-[15px] focus:ring-1 focus:ring-primary placeholder:text-slate-500 min-h-[100px]"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Level</label>
              <select
                className="w-full bg-slate-900/60 border-none rounded-2xl py-4 px-5 text-[15px] focus:ring-1 focus:ring-primary"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
              >
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            
            {/* AI Generator Button */}
            <button
              onClick={handleAiGenerate}
              disabled={isAiGenerating || !workoutName}
              className="w-full mt-2 py-4 px-5 rounded-2xl border border-primary/30 bg-primary/5 text-primary font-bold text-sm flex items-center justify-center gap-3 hover:bg-primary/10 transition-all disabled:opacity-50"
            >
              {isAiGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              ) : (
                <span className="material-symbols-rounded text-lg">auto_awesome</span>
              )}
              {isAiGenerating ? 'AI is creating your plan...' : 'AI Magic: Suggest Exercises'}
            </button>
          </div>
        </section>

        {/* Step 2: Schedule */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-primary text-slate-950 rounded-full flex items-center justify-center text-xs font-black">2</span>
            <h2 className="text-lg font-bold">Schedule</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Week Number</label>
              <select
                className="w-full bg-slate-900/60 border-none rounded-2xl py-4 px-5 text-[15px] focus:ring-1 focus:ring-primary"
                value={weekNumber}
                onChange={e => setWeekNumber(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(w => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Day of Week</label>
              <select
                className="w-full bg-slate-900/60 border-none rounded-2xl py-4 px-5 text-[15px] focus:ring-1 focus:ring-primary"
                value={dayOfWeek}
                onChange={e => setDayOfWeek(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>Day {d}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Step 3: Exercise Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-primary text-slate-950 rounded-full flex items-center justify-center text-xs font-black">3</span>
            <h2 className="text-lg font-bold">Select Exercises</h2>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Form Guide:</span>
            <button
              onClick={() => setUserGender('men')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${userGender === 'men' ? 'bg-primary text-slate-950' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'}`}
              title="Men's form guides"
            >
              <span className="material-symbols-rounded text-sm">male</span>
              Men
            </button>
            <button
              onClick={() => setUserGender('women')}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${userGender === 'women' ? 'bg-primary text-slate-950' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'}`}
              title="Women's form guides"
            >
              <span className="material-symbols-rounded text-sm">female</span>
              Women
            </button>
          </div>

          <div className="space-y-3">
            <input
              className="w-full bg-slate-900/60 border-none rounded-2xl py-3 px-5 text-[13px] focus:ring-1 focus:ring-primary placeholder:text-slate-500"
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <select
                className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary"
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
              >
                <option value="All">All Levels</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary"
                value={equipmentFilter}
                onChange={e => setEquipmentFilter(e.target.value)}
              >
                {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 pr-1">
            {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">No exercises found.</div>
            ) : (
              <>
                {exercises.map(ex => {
                  const isSelected = selectedExercises.find(s => s.id === ex.id);
                  const genderLink = userGender === 'men' ? ex.men_link : ex.women_link;
                  const genderIcon = userGender === 'men' ? 'male' : 'female';
                  return (
                    <div key={ex.id} className={`p-3 rounded-3xl border transition-all ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-900/40 border-slate-800/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center p-2 overflow-hidden shrink-0">
                          {ex.icon_svg ? <div dangerouslySetInnerHTML={{ __html: ex.icon_svg }} className={`w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full ${isSelected ? 'text-primary' : 'text-slate-500'}`} /> : <span className="material-symbols-rounded text-slate-600">fitness_center</span>}
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => toggleExercise(ex)}>
                          <h4 className="font-bold text-sm leading-5 line-clamp-2">{ex.exercise_name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-500 uppercase font-black">{ex.category} • {ex.level || 'Novice'}</p>
                            {ex.equipment && <p className="text-[9px] text-slate-600">• {ex.equipment}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {genderLink && (
                            <button
                              onClick={() => openExerciseVideo(genderLink)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                              title={`Form guide for ${userGender}`}
                            >
                              <span className="material-symbols-rounded text-[16px]">{genderIcon}</span>
                            </button>
                          )}
                          <button
                            onClick={() => toggleExercise(ex)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400'}`}
                          >
                            <span className="material-symbols-rounded text-xl font-black">{isSelected ? 'check' : 'add'}</span>
                          </button>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-3">
                          <input
                            className="flex-1 bg-slate-950/50 border-none rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-primary text-primary font-bold"
                            placeholder="Sets x Reps (e.g. 3x12)"
                            value={isSelected.sets_reps || ''}
                            onChange={e => updateSetsReps(ex.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="w-full py-4 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      {loadingMore ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <span className="material-symbols-rounded text-sm">expand_more</span>
                      )}
                      {loadingMore ? 'Loading...' : 'Load More Exercises'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-slate-950 py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950"></div> : <><span className="material-symbols-rounded">save</span> Save Workout Plan</>}
        </button>
      </main>
    </div>
  );
};

export default CreateWorkout;
