
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminWorkouts: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assignedPrograms, setAssignedPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // State for Create/Edit Workout
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [duration, setDuration] = useState('45m');
  const [kcal, setKcal] = useState('450 kcal');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);

  // Assignment states
  const [assigningTo, setAssigningTo] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);

  // Filters for exercise selection
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
    fetchData();
    fetchFilterData();
  }, []);

  useEffect(() => {
    setPage(0);
    fetchExercises(0, true);
  }, [searchTerm, categoryFilter, levelFilter, equipmentFilter]);

  const fetchFilterData = async () => {
    try {
      const { data } = await supabase.from('exercises').select('category, equipment, level');
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
          levels: Array.from(levels)
        });
      }
    } catch (e) { console.error(e); }
  };

  const levels = useMemo(() => {
    const order = ['Novice', 'Beginner', 'Intermediate', 'Advanced'];
    return [
      'All',
      ...filterData.levels.sort((a, b) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      })
    ];
  }, [filterData.levels]);

  const categories = filterData.categories;
  const equipments = filterData.equipments;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wRes, uRes, pRes] = await Promise.all([
        supabase.from('workouts').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('role', 'user'),
        supabase.from('user_programs').select(`
          *,
          profiles (full_name),
          workouts (name)
        `).order('created_at', { ascending: false })
      ]);

      setWorkouts(wRes.data || []);
      setUsers(uRes.data || []);
      if (uRes.data && uRes.data.length > 0) setSelectedUserId(uRes.data[0].id);
      setAssignedPrograms(pRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async (pageToFetch: number, isNewSearch: boolean = false) => {
    try {
      setLoadingExercises(true);
      let query = supabase.from('exercises').select('*', { count: 'exact' });

      if (searchTerm) query = query.or(`exercise_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Cardio') query = query.or(`category.eq.Cardio,equipment.eq.Cardio`);
        else query = query.eq('category', categoryFilter);
      }
      if (equipmentFilter !== 'All') query = query.eq('equipment', equipmentFilter);
      if (levelFilter !== 'All') query = query.eq('level', levelFilter);

      const { data, error, count } = await query
        .order('exercise_name', { ascending: true })
        .range(pageToFetch * PAGE_SIZE, (pageToFetch + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      if (isNewSearch) setExercises(data || []);
      else setExercises(prev => [...prev, ...(data || [])]);
      setHasMore(count ? (pageToFetch + 1) * PAGE_SIZE < count : false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExercises(false);
    }
  };

  const loadMore = () => {
    if (!loadingExercises && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchExercises(nextPage);
    }
  };

  const toggleExercise = (ex: any) => {
    const exId = ex.id || ex.exercise_id;
    const exists = selectedExercises.find(s => (s.id === exId) || (s.exercise_id === exId));
    if (exists) {
      setSelectedExercises(selectedExercises.filter(s => (s.id !== exId) && (s.exercise_id !== exId)));
    } else {
      setSelectedExercises([...selectedExercises, { ...ex, id: exId, sets_reps: '3x12' }]);
    }
  };

  const updateSetsReps = (id: string, val: string) => {
    setSelectedExercises(selectedExercises.map(ex => (ex.id === id || ex.exercise_id === id) ? { ...ex, sets_reps: val } : ex));
  };

  const handleSaveWorkout = async () => {
    if (!workoutName) return alert('Please enter a workout name');
    if (selectedExercises.length === 0) return alert('Please select at least one exercise');

    try {
      let workoutId = editingWorkout?.id;
      const workoutData = {
        name: workoutName,
        description: description,
        difficulty: difficulty,
        category: 'Admin',
        image_url: imageUrl,
        is_featured: isFeatured,
        duration: duration,
        kcal: kcal,
        youtube_url: youtubeUrl
      };

      if (workoutId) {
        await supabase.from('workouts').update(workoutData).eq('id', workoutId);
      } else {
        const { data } = await supabase.from('workouts').insert(workoutData).select().single();
        workoutId = data.id;
      }

      // Update exercises
      await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);
      const toInsert = selectedExercises.map((ex, idx) => ({
        workout_id: workoutId,
        exercise_id: ex.id || ex.exercise_id,
        sets_reps: ex.sets_reps,
        sort_order: idx
      }));
      await supabase.from('workout_exercises').insert(toInsert);

      setEditingWorkout(null);
      resetEditor();
      fetchData();
    } catch (error) {
      console.error('Error saving workout:', error);
    }
  };

  const resetEditor = () => {
    setWorkoutName('');
    setDescription('');
    setDifficulty('Beginner');
    setImageUrl('');
    setIsFeatured(false);
    setDuration('45m');
    setKcal('450 kcal');
    setYoutubeUrl('');
    setSelectedExercises([]);
  };

  const handleAssignWorkout = async (userId: string) => {
    try {
      await supabase.from('user_programs').insert({
        user_id: userId,
        workout_id: assigningTo.workout_id,
        day_of_week: dayOfWeek,
        week_number: weekNumber
      });
      alert('Assigned successfully!');
      setAssigningTo(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning:', error);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await supabase.from('user_programs').delete().eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workout? This will also remove it from any assigned user programs.')) return;
    try {
      // Supabase should handle cascading deletes if foreign keys are set up correctly,
      // but let's be safe and delete related exercises and assignments first if needed
      // or just try to delete the workout directly if cascade is on.
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout. It might be assigned to a user.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded">arrow_back</button>
          <h1 className="text-xl font-bold">Workout Management</h1>
        </div>
        <button
          onClick={() => { resetEditor(); setEditingWorkout({}); }}
          className="bg-primary text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase"
        >
          Create Workout
        </button>
      </header>

      <main className="p-6 space-y-4">
        {workouts.map(w => (
          <div key={w.id} className="bg-slate-800 p-5 rounded-3xl border border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{w.name}</h3>
                <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded-md uppercase tracking-wider">{w.difficulty}</span>
              </div>
              <button
                onClick={() => handleDeleteWorkout(w.id)}
                className="text-slate-500 hover:text-red-500 transition-colors p-2"
              >
                <span className="material-symbols-rounded text-xl">delete</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{w.description}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  const { data } = await supabase.from('workout_exercises').select('*, exercises:exercise_id (*)').eq('workout_id', w.id).order('sort_order');
                  setWorkoutName(w.name);
                  setDescription(w.description || '');
                  setDifficulty(w.difficulty || 'Beginner');
                  setImageUrl(w.image_url || '');
                  setIsFeatured(w.is_featured || false);
                  setDuration(w.duration || '45m');
                  setKcal(w.kcal || '450 kcal');
                  setYoutubeUrl(w.youtube_url || '');
                  setSelectedExercises(data?.map(d => ({ ...d.exercises, sets_reps: d.sets_reps, exercise_id: d.exercise_id })) || []);
                  setEditingWorkout(w);
                }}
                className="flex-1 bg-slate-700 py-2.5 rounded-xl text-[10px] font-bold uppercase"
              >
                Edit Design
              </button>
              <button
                onClick={() => setAssigningTo({ workout_id: w.id, workout_name: w.name })}
                className="flex-1 bg-primary/20 text-primary py-2.5 rounded-xl text-[10px] font-bold uppercase"
              >
                Assign to User
              </button>
            </div>
          </div>
        ))}

        <div className="mt-12">
          <h2 className="text-xl font-black uppercase tracking-widest text-primary mb-6 px-2">Assigned Programs</h2>
          <div className="space-y-3">
            {assignedPrograms.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No workouts assigned yet.</p>
            ) : assignedPrograms.map(p => (
              <div key={p.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{p.profiles?.full_name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {p.workouts?.name} • Week {p.week_number} • Day {p.day_of_week}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${p.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-orange-500/20 text-orange-500'
                    }`}>
                    {p.status}
                  </span>
                  <button
                    onClick={() => handleDeleteAssignment(p.id)}
                    className="text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-rounded text-xl">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Workout Designer Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 max-w-md mx-auto border border-slate-700 my-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Workout Designer</h2>
              <button onClick={() => setEditingWorkout(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-8 mb-10">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 px-1">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Workout Name</label>
                    <input
                      placeholder="e.g. Full Body Blast"
                      className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      value={workoutName}
                      onChange={e => setWorkoutName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Description</label>
                    <textarea
                      placeholder="Enter workout description..."
                      className="w-full bg-slate-900 border-none rounded-2xl p-4 h-24 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Difficulty</label>
                      <select
                        className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                      >
                        {levels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Featured</label>
                      <div className="flex items-center justify-between bg-slate-900 h-[52px] px-4 rounded-xl">
                        <span className="text-xs font-bold text-slate-400">Featured</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            id="isFeatured"
                            className="sr-only peer"
                            checked={isFeatured}
                            onChange={e => setIsFeatured(e.target.checked)}
                          />
                          <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details & Media */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 px-1">Details & Media</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Cover Image URL</label>
                    <input
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">YouTube Trailer URL</label>
                    <input
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      value={youtubeUrl}
                      onChange={e => setYoutubeUrl(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Duration</label>
                      <input
                        placeholder="e.g. 45m"
                        className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Calories</label>
                      <input
                        placeholder="e.g. 450 kcal"
                        className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        value={kcal}
                        onChange={e => setKcal(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Exercise Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50">Exercise Selection</h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">{selectedExercises.length} selected</span>
                </div>
                
                <div className="space-y-4">
                  {/* Currently Selected Exercises Section */}
                  {selectedExercises.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1 mb-2">Current Workout Plan</h4>
                      <div className="space-y-2">
                        {selectedExercises.map((ex, idx) => (
                          <div key={ex.id || ex.exercise_id || idx} className="p-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <span className="material-symbols-rounded text-primary text-sm">check_circle</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{ex.exercise_name || ex.name}</p>
                              <p className="text-[9px] text-primary/60 font-black uppercase">{ex.sets_reps}</p>
                            </div>
                            <button 
                              onClick={() => toggleExercise(ex)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                            >
                              <span className="material-symbols-rounded text-sm">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 items-center p-1 bg-slate-900 rounded-xl">
                    <button
                      onClick={() => setUserGender('men')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${userGender === 'men' ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <span className="material-symbols-rounded text-sm">male</span>
                      Men
                    </button>
                    <button
                      onClick={() => setUserGender('women')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${userGender === 'women' ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <span className="material-symbols-rounded text-sm">female</span>
                      Women
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                      <input
                        placeholder="Search catalog..."
                        className="w-full bg-slate-900 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        className="bg-slate-900 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-400"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select
                        className="bg-slate-900 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-400"
                        value={levelFilter}
                        onChange={e => setLevelFilter(e.target.value)}
                      >
                        <option value="All">All Levels</option>
                        {levels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <select
                        className="bg-slate-900 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-400"
                        value={equipmentFilter}
                        onChange={e => setEquipmentFilter(e.target.value)}
                      >
                        {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                      </select>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                      {exercises.map(ex => {
                        const isSelected = selectedExercises.find(s => (s.id === ex.id) || (s.exercise_id === ex.id));
                        const genderLink = userGender === 'men' ? ex.men_link : ex.women_link;
                        const genderIcon = userGender === 'men' ? 'male' : 'female';
                        return (
                          <div key={ex.id} className={`p-3.5 rounded-2xl border transition-all ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-slate-900/40 border-slate-700/30'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center p-1.5 shrink-0 border border-slate-700/50">
                                {ex.icon_svg ? (
                                  <div
                                    dangerouslySetInnerHTML={{ __html: ex.icon_svg }}
                                    className="w-full h-full text-slate-400 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                                  />
                                ) : (
                                  <span className="material-symbols-rounded text-slate-600">fitness_center</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExercise(ex)}>
                                <p className="text-xs font-bold leading-tight line-clamp-1">{ex.exercise_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[9px] text-primary/60 uppercase font-black tracking-wider">{ex.category}</p>
                                  {ex.equipment && <p className="text-[9px] text-slate-500 font-bold">• {ex.equipment}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {genderLink && (
                                  <button
                                    onClick={() => window.open(genderLink, '_blank')}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 text-slate-500 hover:text-white transition-colors"
                                    title={`Form guide for ${userGender}`}
                                  >
                                    <span className="material-symbols-rounded text-sm">{genderIcon}</span>
                                  </button>
                                )}
                                <button onClick={() => toggleExercise(ex)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'bg-slate-700 text-slate-400'}`}>
                                  <span className="material-symbols-rounded text-base">{isSelected ? 'check' : 'add'}</span>
                                </button>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-primary/10">
                                <label className="text-[9px] font-black uppercase text-primary/40 tracking-widest ml-1 mb-1 block">Sets & Reps</label>
                                <input
                                  className="w-full bg-slate-950/60 border-none rounded-xl py-2 px-3 text-xs placeholder:text-slate-700 text-primary font-bold focus:ring-1 focus:ring-primary/30"
                                  placeholder="e.g. 3x12 or 4 sets of 15"
                                  value={isSelected.sets_reps}
                                  onChange={e => updateSetsReps(ex.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {hasMore && (
                        <button
                          onClick={loadMore}
                          disabled={loadingExercises}
                          className="w-full py-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/30 text-slate-500 hover:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          {loadingExercises ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                          ) : (
                            <span className="material-symbols-rounded text-sm">expand_more</span>
                          )}
                          {loadingExercises ? 'Loading...' : 'Load More Exercises'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 sticky bottom-0 bg-slate-800 pt-4 border-t border-slate-700/50">
              <button onClick={() => setEditingWorkout(null)} className="flex-1 bg-slate-700/50 hover:bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs transition-colors">Cancel</button>
              <button onClick={handleSaveWorkout} className="flex-1 bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Save Workout</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assigningTo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 flex items-center justify-center">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">Assign Workout</h2>
                <p className="text-xs text-primary font-bold mt-1 uppercase tracking-wider">{assigningTo.workout_name}</p>
              </div>
              <button onClick={() => setAssigningTo(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Search & Select User</label>
                  <div className="relative mb-3">
                    <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                    <input
                      className="w-full bg-slate-900 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Type to filter users..."
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                  >
                    {users
                      .filter(u => (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()))
                      .map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Week Number</label>
                    <select
                      className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                      value={weekNumber}
                      onChange={e => setWeekNumber(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(w => <option key={w} value={w}>Week {w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Day of Week</label>
                    <select
                      className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                      value={dayOfWeek}
                      onChange={e => setDayOfWeek(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>Day {d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleAssignWorkout(selectedUserId)}
                  className="w-full bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                >
                  Confirm Assignment
                </button>
                <button 
                  onClick={() => setAssigningTo(null)} 
                  className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest py-4 mt-2 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 px-6 py-3 pb-6 flex justify-between items-center z-40 max-w-[430px] mx-auto">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">dashboard</span>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_EXERCISES')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">fitness_center</span>
          <span className="text-[10px] font-bold">Exercises</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_WORKOUTS')} className="flex flex-col items-center gap-1 text-primary transition-colors">
          <span className="material-symbols-rounded">sports_gymnastics</span>
          <span className="text-[10px] font-bold">Workouts</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_PLANS')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">card_membership</span>
          <span className="text-[10px] font-bold">Plans</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_CATEGORIES')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">category</span>
          <span className="text-[10px] font-bold">Categories</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminWorkouts;
