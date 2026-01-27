
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzUwODUsImV4cCI6MjA4NDgxMTA4NX0.JOEgHNtro1H6pk0Hm0j8PBPAR8QOuUEQfBY2mSQ3mVY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpExercises() {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, exercise_name, category, equipment')
    .limit(100);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.table(exercises);
}

dumpExercises();
