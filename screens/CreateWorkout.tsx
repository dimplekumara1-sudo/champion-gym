
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import StatusBar from '../components/StatusBar';

const CreateWorkout: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutName, setWorkoutName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  const levels = ['Novice', 'Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('exercise_name', { ascending: true });
      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
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

  const handleSave = async () => {
    if (!workoutName) return alert('Please enter a workout name');
    if (selectedExercises.length === 0) return alert('Please select at least one exercise');

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('You must be logged in');

      const workoutData: any = {
        name: workoutName,
        description: description,
        category: 'Custom',
        difficulty: difficulty
      };

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (workoutError) throw workoutError;

      const exerciseInserts = selectedExercises.map((ex, idx) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        sets_reps: ex.sets_reps,
        sort_order: idx
      }));

      const { error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert(exerciseInserts);

      if (exerciseError) throw exerciseError;

      const { error: programError } = await supabase
        .from('user_programs')
        .insert({
          user_id: user.id,
          workout_id: workout.id,
          week_number: weekNumber,
          day_of_week: dayOfWeek,
          status: 'pending'
        });

      if (programError) throw programError;

      alert('Workout plan created and assigned successfully!');
      onNavigate('WORKOUT_PROGRAM');
    } catch (error) {
      console.error('Error saving workout plan:', error);
      alert('Failed to save workout plan. Please try again.');
    } finally {
      setSaving(false);
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
            </div>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
            {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">No exercises found.</div>
            ) : filteredExercises.map(ex => {
              const isSelected = selectedExercises.find(s => s.id === ex.id);
              return (
                <div key={ex.id} className={`p-4 rounded-3xl border transition-all ${isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-900/40 border-slate-800/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center p-2 overflow-hidden shrink-0">
                      {ex.icon_svg ? <div dangerouslySetInnerHTML={{ __html: ex.icon_svg }} className={`w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full ${isSelected ? 'text-primary' : 'text-slate-500'}`} /> : <span className="material-symbols-rounded text-slate-600">fitness_center</span>}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => toggleExercise(ex)}>
                      <h4 className="font-bold text-sm truncate">{ex.exercise_name}</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-black mt-0.5">{ex.category} • {ex.level || 'Beginner'}</p>
                    </div>
                    <button onClick={() => toggleExercise(ex)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                      <span className="material-symbols-rounded text-lg">{isSelected ? 'check' : 'add'}</span>
                    </button>
                  </div>
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <input 
                        className="w-full bg-slate-950/50 border-none rounded-xl py-2 px-4 text-xs focus:ring-1 focus:ring-primary placeholder:text-slate-600"
                        placeholder="Sets & Reps (e.g. 3x12)"
                        value={isSelected.sets_reps}
                        onChange={e => updateSetsReps(ex.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
