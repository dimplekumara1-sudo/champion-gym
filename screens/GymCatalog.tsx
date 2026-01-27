
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import StatusBar from '../components/StatusBar';

const GymCatalog: React.FC<{ onNavigate: (s: AppScreen) => void, initialCategory?: string | null }> = ({ onNavigate, initialCategory }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory || 'All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  
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
    fetchUserGender();
  }, []);

  useEffect(() => {
    setPage(0);
    fetchExercises(0, true);
  }, [searchTerm, categoryFilter, equipmentFilter, levelFilter, genderFilter]);

  // Update categoryFilter when initialCategory changes
  useEffect(() => {
    if (initialCategory) {
      setCategoryFilter(initialCategory);
    }
  }, [initialCategory]);

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
          levels: ['All', ...Array.from(levels)].sort() // Sorting logic handled in useMemo below
        });
      }
    } catch (e) {
      console.error('Error fetching filter data:', e);
    }
  };

  const fetchUserGender = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', user.id)
          .single();
        setUserGender(data?.gender || 'Men'); // Default to Men if not specified
      }
    } catch (e) {
      console.error('Error fetching gender:', e);
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

      if (genderFilter === 'Men') {
        query = query.not('men_link', 'is', null);
      } else if (genderFilter === 'Women') {
        query = query.not('women_link', 'is', null);
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

  const categories = filterData.categories;
  const equipments = filterData.equipments;

  const sortedLevels = useMemo(() => {
    const order = ['Novice', 'Beginner', 'Intermediate', 'Advanced'];
    return [
      'All',
      ...filterData.levels.filter(l => l !== 'All').sort((a, b) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      })
    ];
  }, [filterData.levels]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-10">
      <StatusBar />
      <header className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button onClick={() => onNavigate('EXPLORE')} className="p-2 bg-slate-900/60 rounded-full">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Gym Catalog</h1>
      </header>

      <div className="px-5 space-y-4">
        <div className="relative">
          <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full bg-slate-900/60 border-none rounded-2xl py-4 pl-12 pr-4 text-[15px] focus:ring-1 focus:ring-primary placeholder:text-slate-500 transition-all"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <select
            className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary min-w-[90px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary min-w-[90px]"
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
          >
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select
            className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary min-w-[90px]"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            {sortedLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            className="bg-slate-900/60 border-none rounded-xl text-[10px] font-bold py-2 px-3 focus:ring-1 focus:ring-primary min-w-[90px]"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="All">Gender</option>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
          </select>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-bold">No exercises found.</div>
          ) : (
            <>
              {exercises.map(ex => (
                <div key={ex.id} className="bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50 flex items-center gap-4 group">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center p-3 overflow-hidden shrink-0">
                    {ex.icon_svg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: ex.icon_svg }}
                        className="w-full h-full text-primary flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                      />
                    ) : (
                      <span className="material-symbols-rounded text-slate-600 text-3xl">fitness_center</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] truncate leading-tight">{ex.exercise_name}</h3>
                    <p className="text-[10px] text-primary uppercase font-black tracking-widest mt-1.5">{ex.category} • {ex.level || 'Novice'}</p>
                    <div className="flex gap-4 mt-3">
                      {((!userGender || userGender.toLowerCase() === 'men' || userGender.toLowerCase() === 'male') && ex.men_link) ? (
                        <button
                          onClick={() => setIframeUrl(ex.men_link)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-rounded text-[14px]">male</span> Men's Form
                        </button>
                      ) : (ex.women_link && (userGender?.toLowerCase() === 'women' || userGender?.toLowerCase() === 'female')) ? (
                        <button
                          onClick={() => setIframeUrl(ex.women_link)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-rounded text-[14px]">female</span> Women's Form
                        </button>
                      ) : null}
                      {!userGender && ex.women_link && !ex.men_link && (
                        <button
                          onClick={() => setIframeUrl(ex.women_link)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-rounded text-[14px]">female</span> Women's Form
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (ex.youtube_url) setIframeUrl(ex.youtube_url);
                      else if (ex.men_youtube_url) setIframeUrl(ex.men_youtube_url);
                      else if (ex.women_youtube_url) setIframeUrl(ex.women_youtube_url);
                    }}
                    className="w-11 h-11 bg-primary/10 text-primary rounded-full flex items-center justify-center transition-transform active:scale-90"
                  >
                    <span className="material-symbols-rounded">play_arrow</span>
                  </button>
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

      {iframeUrl && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
          <header className="px-5 py-4 flex items-center justify-between bg-slate-900 border-b border-slate-800">
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
                  <h3 className="text-xl font-bold mb-2">Browser View Requested</h3>
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

export default GymCatalog;
