
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminWorkouts: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assignedPrograms, setAssignedPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Filters for exercise selection
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  // State for Assigning
  const [assigningTo, setAssigningTo] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);

  const levels = ['Novice', 'Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wRes, eRes, uRes, pRes] = await Promise.all([
        supabase.from('workouts').select('*').order('created_at', { ascending: false }),
        supabase.from('exercises').select('*').order('exercise_name', { ascending: true }),
        supabase.from('profiles').select('id, full_name').eq('role', 'user'),
        supabase.from('user_programs').select(`
          *,
          profiles (full_name),
          workouts (name)
        `).order('created_at', { ascending: false })
      ]);

      setWorkouts(wRes.data || []);
      setExercises(eRes.data || []);
      setUsers(uRes.data || []);
      if (uRes.data && uRes.data.length > 0) setSelectedUserId(uRes.data[0].id);
      setAssignedPrograms(pRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(exercises.map(ex => ex.category))];

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.exercise_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || ex.category === categoryFilter;
    const matchesLevel = levelFilter === 'All' || ex.level === levelFilter;
    return matchesSearch && matchesCategory && matchesLevel;
  });

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
              <h3 className="font-bold text-lg">{w.name}</h3>
              <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded-md uppercase tracking-wider">{w.difficulty}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{w.description}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  const { data } = await supabase.from('workout_exercises').select('*, exercises(*)').eq('workout_id', w.id).order('sort_order');
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 overflow-y-auto">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 max-w-md mx-auto border border-slate-700">
            <h2 className="text-2xl font-bold mb-6">Workout Designer</h2>
            <div className="space-y-4 mb-8">
              <input
                placeholder="Workout Name"
                className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                value={workoutName}
                onChange={e => setWorkoutName(e.target.value)}
              />
              <textarea
                placeholder="Description..."
                className="w-full bg-slate-900 border-none rounded-2xl p-4 h-24 text-sm"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                >
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="flex items-center gap-3 bg-slate-900 px-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isFeatured" className="text-xs font-bold text-slate-400">Featured</label>
                </div>
              </div>
              <input
                placeholder="Image URL"
                className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Duration (e.g. 45m)"
                  className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
                <input
                  placeholder="Kcal (e.g. 450 kcal)"
                  className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                  value={kcal}
                  onChange={e => setKcal(e.target.value)}
                />
              </div>
              <input
                placeholder="YouTube URL"
                className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
              />
            </div>

            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Exercises</h3>

            <div className="space-y-3 mb-6">
              <input
                placeholder="Search catalog..."
                className="w-full bg-slate-900 border-none rounded-xl p-3 text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-slate-900 border-none rounded-xl p-2 text-[10px]"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="flex-1 bg-slate-900 border-none rounded-xl p-2 text-[10px]"
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                >
                  <option value="All">All Levels</option>
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredExercises.map(ex => {
                  const isSelected = selectedExercises.find(s => (s.id === ex.id) || (s.exercise_id === ex.id));
                  return (
                    <div key={ex.id} className={`p-3 rounded-2xl border transition-all ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-slate-900/40 border-slate-700/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                          {ex.icon_svg ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: ex.icon_svg }}
                              className="w-full h-full text-slate-400 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                            />
                          ) : (
                            <span className="material-symbols-rounded text-slate-600 text-sm">fitness_center</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => toggleExercise(ex)}>
                          <p className="text-[11px] font-bold truncate">{ex.exercise_name}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-black">{ex.category}</p>
                        </div>
                        <button onClick={() => toggleExercise(ex)} className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                          <span className="material-symbols-rounded text-sm">{isSelected ? 'check' : 'add'}</span>
                        </button>
                      </div>
                      {isSelected && (
                        <input
                          className="w-full bg-slate-950/40 border-none rounded-lg py-1.5 px-3 text-[10px] mt-2 placeholder:text-slate-600"
                          placeholder="Sets & Reps (e.g. 3x12)"
                          value={isSelected.sets_reps}
                          onChange={e => updateSetsReps(ex.id, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditingWorkout(null)} className="flex-1 bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs">Cancel</button>
              <button onClick={handleSaveWorkout} className="flex-1 bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs">Save Workout</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assigningTo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 flex items-center justify-center">
          <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-700">
            <h2 className="text-xl font-bold mb-2">Assign "{assigningTo.workout_name}"</h2>
            <div className="space-y-4 mt-6">
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                <input
                  className="w-full bg-slate-900 border-none rounded-xl py-2.5 pl-9 pr-4 text-xs"
                  placeholder="Search user..."
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
              >
                {users
                  .filter(u => (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()))
                  .map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Week</label>
                  <select
                    className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm"
                    value={weekNumber}
                    onChange={e => setWeekNumber(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(w => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Day</label>
                  <select
                    className="w-full bg-slate-900 border-none rounded-xl p-4 text-sm"
                    value={dayOfWeek}
                    onChange={e => setDayOfWeek(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>Day {d}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => handleAssignWorkout(selectedUserId)}
                className="w-full bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs mt-4"
              >
                Confirm Assignment
              </button>
              <button onClick={() => setAssigningTo(null)} className="w-full text-slate-500 text-xs font-bold py-2">Close</button>
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
