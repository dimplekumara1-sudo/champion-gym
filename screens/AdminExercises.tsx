
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import * as XLSX from 'xlsx';

const AdminExercises: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

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
  }, [searchTerm, selectedCategories, selectedEquipment, selectedLevels]);

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
          categories: Array.from(cats).sort(),
          equipments: Array.from(equips).sort(),
          levels: Array.from(levels).sort()
        });
      }
    } catch (e) {
      console.error('Error fetching filter data:', e);
    }
  };

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

      if (selectedCategories.length > 0) {
        const cat = selectedCategories[0];
        if (cat === 'Cardio') {
          query = query.or(`category.eq.Cardio,equipment.eq.Cardio`);
        } else {
          query = query.eq('category', cat);
        }
      }

      if (selectedEquipment.length > 0) {
        query = query.eq('equipment', selectedEquipment[0]);
      }

      if (selectedLevels.length > 0) {
        query = query.eq('level', selectedLevels[0]);
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
        fetchExercises(0, true);
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
      fetchExercises(0, true);
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
      fetchExercises(0, true);
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to delete exercise');
    }
  };

  const uniqueLevels = useMemo(() => {
    const order = ['Novice', 'Beginner', 'Intermediate', 'Advanced'];
    return [...filterData.levels].sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [filterData.levels]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const openVideoInNewTab = (videoUrl: string, title: string) => {
    let finalUrl = videoUrl;

    if (finalUrl.includes('youtube.com/watch?v=')) {
      const videoId = finalUrl.split('v=')[1].split('&')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (finalUrl.includes('youtu.be/')) {
      const videoId = finalUrl.split('youtu.be/')[1].split('?')[0];
      finalUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (!finalUrl.includes('embed') && isYoutube(finalUrl)) {
      // Fallback for other youtube formats
    }

    if (!isYoutube(finalUrl)) {
      window.open(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`, '_blank');
      return;
    }

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
          .header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
          .title { color: #fff; font-size: 20px; font-weight: bold; }
          .video-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
          .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
          .back-btn { display: inline-block; padding: 8px 16px; background: #334155; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; }
          .back-btn:hover { background: #475569; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">${title}</div>
            <a href="javascript:history.back()" class="back-btn">Close</a>
          </div>
          <div class="video-container">
            <iframe src="${finalUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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
              {filterData.categories.map(category => (
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
              {filterData.equipments.map(equipment => (
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
              {uniqueLevels.map(level => (
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
          ) : (
            <>
              {exercises.map(ex => (
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
                        onClick={() => openVideoInNewTab(ex.men_youtube_url || ex.women_youtube_url || ex.youtube_url || ex.men_link || ex.women_link, ex.exercise_name)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-primary"
                      >
                        <span className="material-symbols-rounded text-lg">play_circle</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <span className="material-symbols-rounded">expand_more</span>
                    )}
                    {loadingMore ? 'Loading...' : 'Load More Exercises'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editingExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-800 w-full max-w-lg rounded-3xl p-6 border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-6">{editingExercise.id ? 'Edit Exercise' : 'Add Exercise'}</h2>
            
            <div className="space-y-6">
              {/* Basic Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <span className="material-symbols-rounded text-sm">info</span>
                  <h4 className="text-xs font-black uppercase tracking-widest">Basic Details</h4>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Exercise Name</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                    value={editingExercise.exercise_name}
                    onChange={e => setEditingExercise({ ...editingExercise, exercise_name: e.target.value })}
                    placeholder="e.g. Bench Press"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Category</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                      value={editingExercise.category}
                      onChange={e => setEditingExercise({ ...editingExercise, category: e.target.value })}
                      placeholder="e.g. Chest"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Equipment</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                      value={editingExercise.equipment}
                      onChange={e => setEditingExercise({ ...editingExercise, equipment: e.target.value })}
                      placeholder="e.g. Barbell"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Difficulty Level</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors appearance-none"
                    value={editingExercise.level || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, level: e.target.value })}
                  >
                    <option value="">Select Level</option>
                    <option value="Novice">Novice</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Media & Guides */}
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <span className="material-symbols-rounded text-sm">movie</span>
                  <h4 className="text-xs font-black uppercase tracking-widest">Media & Guides</h4>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">YouTube URL (General)</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                    value={editingExercise.youtube_url || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Men YouTube URL</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                      value={editingExercise.men_youtube_url || ''}
                      onChange={e => setEditingExercise({ ...editingExercise, men_youtube_url: e.target.value })}
                      placeholder="YouTube URL..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Women YouTube URL</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                      value={editingExercise.women_youtube_url || ''}
                      onChange={e => setEditingExercise({ ...editingExercise, women_youtube_url: e.target.value })}
                      placeholder="YouTube URL..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Men Form Link</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                      value={editingExercise.men_link || ''}
                      onChange={e => setEditingExercise({ ...editingExercise, men_link: e.target.value })}
                      placeholder="URL..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Women Form Link</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 focus:border-primary outline-none transition-colors"
                      value={editingExercise.women_link || ''}
                      onChange={e => setEditingExercise({ ...editingExercise, women_link: e.target.value })}
                      placeholder="URL..."
                    />
                  </div>
                </div>
              </div>

              {/* Assets */}
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <span className="material-symbols-rounded text-sm">token</span>
                  <h4 className="text-xs font-black uppercase tracking-widest">Assets</h4>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Icon SVG Code</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 h-24 font-mono focus:border-primary outline-none transition-colors"
                    value={editingExercise.icon_svg || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, icon_svg: e.target.value })}
                    placeholder="<svg>...</svg>"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Instructions</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-sm p-3 h-24 focus:border-primary outline-none transition-colors"
                    value={editingExercise.instructions || ''}
                    onChange={e => setEditingExercise({ ...editingExercise, instructions: e.target.value })}
                    placeholder="Step by step instructions..."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingExercise(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-2xl font-bold transition-colors">Cancel</button>
              <button onClick={handleSaveExercise} className="flex-1 bg-primary hover:bg-primary/90 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-primary/20">Save Exercise</button>
            </div>
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
