
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzUwODUsImV4cCI6MjA4NDgxMTA4NX0.JOEgHNtro1H6pk0Hm0j8PBPAR8QOuUEQfBY2mSQ3mVY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeFilters() {
  console.log('--- Filter Analysis ---');
  
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('category, equipment');
    
  if (error) {
    console.error('Error:', error);
    return;
  }

  const catCounts = {};
  const equipCounts = {};

  exercises.forEach(ex => {
    const cat = ex.category;
    const equip = ex.equipment;
    
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    equipCounts[equip] = (equipCounts[equip] || 0) + 1;
  });

  console.log('\nCategories:');
  Object.keys(catCounts).sort().forEach(c => {
    console.log(`- "${c}": ${catCounts[c]}`);
  });

  console.log('\nEquipment:');
  Object.keys(equipCounts).sort().forEach(e => {
    console.log(`- "${e}": ${equipCounts[e]}`);
  });

  const cardioAsCat = exercises.filter(ex => ex.category && ex.category.trim().toLowerCase() === 'cardio');
  const cardioAsEquip = exercises.filter(ex => ex.equipment && ex.equipment.trim().toLowerCase() === 'cardio');

  console.log(`\nCardio specific:`);
  console.log(`- Found ${cardioAsCat.length} exercises with category "Cardio" (case-insensitive, trimmed)`);
  console.log(`- Found ${cardioAsEquip.length} exercises with equipment "Cardio" (case-insensitive, trimmed)`);
}

analyzeFilters();
