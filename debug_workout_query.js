// Debug script to check workout exercise loading
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzUwODUsImV4cCI6MjA4NDgxMTA4NX0.JOEgHNtro1H6pk0Hm0j8PBPAR8QOuUEQfBY2mSQ3mVY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugWorkoutExercises() {
  try {
    console.log('=== DEBUG WORKOUT EXERCISES ===');
    
    // 1. Check if tables exist and have data
    console.log('\n1. Checking tables...');
    
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id, name')
      .limit(5);
    
    console.log('Workouts:', workouts?.length || 0, workoutError);
    if (workouts && workouts.length > 0) {
      console.log('Sample workout:', workouts[0]);
    }
    
    const { data: exercises, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, exercise_name')
      .limit(5);
    
    console.log('Exercises:', exercises?.length || 0, exerciseError);
    if (exercises && exercises.length > 0) {
      console.log('Sample exercise:', exercises[0]);
    }
    
    const { data: workoutExercises, error: weError } = await supabase
      .from('workout_exercises')
      .select('*')
      .limit(5);
    
    console.log('Workout Exercises:', workoutExercises?.length || 0, weError);
    if (workoutExercises && workoutExercises.length > 0) {
      console.log('Sample workout_exercise:', workoutExercises[0]);
    }
    
    // 2. Test the exact query from WorkoutDetail.tsx
    if (workouts && workouts.length > 0) {
      const workoutId = workouts[0].id;
      console.log('\n2. Testing exact query with workoutId:', workoutId);
      
      const { data: workoutData, error: wError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();
      
      console.log('Workout query result:', workoutData, wError);
      
      const { data: exercisesData, error: eError } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercises (*)
        `)
        .eq('workout_id', workoutId)
        .order('sort_order');
      
      console.log('Exercises query result:', exercisesData?.length || 0, eError);
      if (exercisesData && exercisesData.length > 0) {
        console.log('Sample exercise data:', exercisesData[0]);
      }
    }
    
    // 3. Check user_programs
    console.log('\n3. Checking user_programs...');
    const { data: userPrograms, error: upError } = await supabase
      .from('user_programs')
      .select('*')
      .limit(5);
    
    console.log('User Programs:', userPrograms?.length || 0, upError);
    if (userPrograms && userPrograms.length > 0) {
      console.log('Sample user_program:', userPrograms[0]);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugWorkoutExercises();
