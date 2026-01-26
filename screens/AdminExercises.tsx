
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import * as XLSX from 'xlsx';

const AdminExercises: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map columns to match our database (case-insensitive search for headers)
        const mappedData = data.map((row: any) => ({
          category: row.Category || row.category || '',
          exercise_name: row.Exercise || row.exercise_name || row.Name || '',
          men_link: row.Men || row.men_link || '',
          women_link: row.Women || row.women_link || '',
          equipment: row.Equipment || row.equipment || '',
          level: row.Level || row.level || '',
          icon_svg: row.Icon || row.icon_svg || '',
          youtube_url: row.Youtube || row.youtube_url || '',
          men_youtube_url: row.MenYoutube || row.men_youtube_url || '',
          women_youtube_url: row.WomenYoutube || row.women_youtube_url || '',
          instructions: row.Instructions || row.instructions || '',
        }));

        const { error } = await supabase.from('exercises').insert(mappedData);
        if (error) throw error;
        alert('Import successful!');
        fetchExercises();
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import data');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveExercise = async () => {
    try {
      if (editingExercise.id) {
        const { error } = await supabase
          .from('exercises')
          .update(editingExercise)
          .eq('id', editingExercise.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert([editingExercise]);
        if (error) throw error;
      }
      setEditingExercise(null);
      fetchExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Failed to save exercise');
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exercise?')) return;
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to delete exercise');
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.exercise_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(ex.category || '');
    const matchesEquipment = selectedEquipment.length === 0 || selectedEquipment.includes(ex.equipment || '');
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(ex.level || '');

    return matchesSearch && matchesCategory && matchesEquipment && matchesLevel;
  });

  const getUniqueCategories = () => {
    const categories = new Set(exercises.map(ex => ex.category).filter(Boolean));
    return Array.from(categories).sort();
  };

  const getUniqueEquipment = () => {
    const equipment = new Set(exercises.map(ex => ex.equipment).filter(Boolean));
    return Array.from(equipment).sort();
  };

  const getUniqueLevels = () => {
    const levels = new Set(exercises.map(ex => ex.level).filter(Boolean));
    return Array.from(levels).sort();
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded">arrow_back</button>
          <h1 className="text-xl font-bold">Exercise Database</h1>
        </div>
        <div className="flex gap-2">
          <label className="bg-slate-800 p-2 rounded-full cursor-pointer hover:bg-slate-700">
            <span className="material-symbols-rounded text-sm">upload_file</span>
            <input type="file" className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => setEditingExercise({ category: '', exercise_name: '', equipment: '', level: '', icon_svg: '', youtube_url: '', men_youtube_url: '', women_youtube_url: '', instructions: '' })}
            className="bg-primary text-slate-900 w-8 h-8 rounded-full flex items-center justify-center"
          >
            <span className="material-symbols-rounded text-sm font-bold">add</span>
          </button>
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="relative mb-4">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="mb-4 flex gap-3 flex-wrap">
          {/* Category Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedCategories.length === 0 ? '' : selectedCategories[0]}
              onChange={(e) => setSelectedCategories(e.target.value ? [e.target.value] : [])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="">All Categories</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Equipment Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedEquipment.length === 0 ? '' : selectedEquipment[0]}
              onChange={(e) => setSelectedEquipment(e.target.value ? [e.target.value] : [])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="">All Equipment</option>
              {getUniqueEquipment().map(equipment => (
                <option key={equipment} value={equipment}>{equipment}</option>
              ))}
            </select>
          </div>

          {/* Level Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedLevels.length === 0 ? '' : selectedLevels[0]}
              onChange={(e) => setSelectedLevels(e.target.value ? [e.target.value] : [])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="">All Levels</option>
              {getUniqueLevels().map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(selectedCategories.length + selectedEquipment.length + selectedLevels.length) > 0 && (
            <button
              onClick={() => {
                setSelectedCategories([]);
                setSelectedEquipment([]);
                setSelectedLevels([]);
              }}
              className="px-4 py-2 text-sm font-medium bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredExercises.map(ex => (
            <div key={ex.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center p-2 overflow-hidden flex-shrink-0">
                {ex.icon_svg ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: ex.icon_svg }}
                    className="w-full h-full text-primary flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                  />
                ) : (
                  <span className="material-symbols-rounded text-slate-500 text-2xl">fitness_center</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm">{ex.exercise_name}</h3>
                  <div className="flex gap-1">
                    {ex.men_link && (
                      <span className="material-symbols-rounded text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-sm">male</span>
                    )}
                    {ex.women_link && (
                      <span className="material-symbols-rounded text-xs bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded text-sm">female</span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{ex.category} • {ex.equipment} • {ex.level || 'All Levels'}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditingExercise(ex)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
                >
                  <span className="material-symbols-rounded text-lg">edit</span>
                </button>
                <button
                  onClick={() => handleDeleteExercise(ex.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"
                >
                  <span className="material-symbols-rounded text-lg">delete</span>
                </button>
                {(ex.men_link || ex.women_link || ex.youtube_url || ex.men_youtube_url || ex.women_youtube_url) && (
                  <button
                    onClick={() => setIframeUrl(ex.men_youtube_url || ex.women_youtube_url || ex.youtube_url || ex.men_link || ex.women_link)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-primary"
                  >
                    <span className="material-symbols-rounded text-lg">play_circle</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl p-6 border border-slate-700 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">{editingExercise.id ? 'Edit Exercise' : 'Add Exercise'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exercise Name</label>
                <input
                  className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                  value={editingExercise.exercise_name}
                  onChange={e => setEditingExercise({ ...editingExercise, exercise_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                    value={editingExercise.category}
                    onChange={e => setEditingExercise({ ...editingExercise, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipment</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                    value={editingExercise.equipment}
                    onChange={e => setEditingExercise({ ...editingExercise, equipment: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Men Form Link</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                    value={editingExercise.men_link || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, men_link: e.target.value })}
                    placeholder="URL..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Women Form Link</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                    value={editingExercise.women_link || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, women_link: e.target.value })}
                    placeholder="URL..."
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">YouTube URL (General)</label>
                <input
                  className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                  value={editingExercise.youtube_url || ''}
                  onChange={e => setEditingExercise({ ...editingExercise, youtube_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Men YouTube URL</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                    value={editingExercise.men_youtube_url || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, men_youtube_url: e.target.value })}
                    placeholder="YouTube URL..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Women YouTube URL</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3"
                    value={editingExercise.women_youtube_url || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, women_youtube_url: e.target.value })}
                    placeholder="YouTube URL..."
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Icon SVG Code</label>
                <textarea
                  className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 h-20 font-mono"
                  value={editingExercise.icon_svg || ''}
                  onChange={e => setEditingExercise({ ...editingExercise, icon_svg: e.target.value })}
                  placeholder="<svg>...</svg>"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingExercise(null)} className="flex-1 bg-slate-700 py-3 rounded-xl font-bold">Cancel</button>
              <button onClick={handleSaveExercise} className="flex-1 bg-primary text-slate-900 py-3 rounded-xl font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

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

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 px-6 py-3 pb-6 flex justify-between items-center z-40 max-w-[430px] mx-auto">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-rounded">dashboard</span>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_EXERCISES')} className="flex flex-col items-center gap-1 text-primary transition-colors">
          <span className="material-symbols-rounded">fitness_center</span>
          <span className="text-[10px] font-bold">Exercises</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_WORKOUTS')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
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

export default AdminExercises;
