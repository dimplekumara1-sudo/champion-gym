
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
import { convertToEmbedUrl, isYoutubeUrl } from '../lib/videoUtils';

type VideoType = 'yoga' | 'weight-loss' | 'tips' | 'strength' | 'lesson' | 'training';

interface ExploreVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  type: VideoType;
  duration_minutes?: number;
  difficulty?: string;
  badges: string[];
  is_premium: boolean;
  is_featured: boolean;
}

const ExploreScreen: React.FC<{
  onNavigate: (s: AppScreen) => void,
  onSelectWorkout: (id: string) => void,
  onSelectCategory: (categoryId: string, categoryName: string) => void
}> = ({ onNavigate, onSelectWorkout, onSelectCategory }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryVideos, setCategoryVideos] = useState<any[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<ExploreVideo[]>([]);
  const [selectedVideoType, setSelectedVideoType] = useState<VideoType | 'all'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'duration' | 'difficulty'>('newest');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [filterPremium, setFilterPremium] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ExploreVideo | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedVideo && isYoutubeUrl(selectedVideo.video_url)) {
      const url = convertToEmbedUrl(selectedVideo.video_url, true);
      setEmbedUrl(url);
    } else if (selectedVideo) {
      setEmbedUrl(selectedVideo.video_url);
    } else {
      setEmbedUrl(null);
    }
  }, [selectedVideo]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Check cache first for categories
      let categoriesData = cache.get(CACHE_KEYS.EXPLORE_CATEGORIES);
      if (!categoriesData) {
        const catRes = await supabase.from('workout_categories').select('*').eq('is_active', true);
        if (catRes.error) throw catRes.error;
        categoriesData = catRes.data || [];
        cache.set(CACHE_KEYS.EXPLORE_CATEGORIES, categoriesData, CACHE_TTL.VERY_LONG);
      }
      setCategories(categoriesData);

      // Check cache for featured videos
      let videosData = cache.get<ExploreVideo[]>(CACHE_KEYS.EXPLORE_FEATURED);
      if (!videosData) {
        const videoRes = await supabase
          .from('explore_videos')
          .select('*')
          .eq('is_featured', true)
          .order('created_at', { ascending: false });

        if (videoRes.error) throw videoRes.error;

        videosData = (videoRes.data || []).map(v => ({
          ...v,
          badges: typeof v.badges === 'string' ? v.badges.split(',').filter(Boolean) : v.badges || []
        }));
        cache.set(CACHE_KEYS.EXPLORE_FEATURED, videosData, CACHE_TTL.LONG);
      }
      setFeaturedVideos(videosData);
    } catch (error) {
      console.error('Error fetching explore data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryVideos = async (categoryId: string, categoryName: string) => {
    try {
      setLoading(true);
      setSelectedCategoryId(categoryId);
      onSelectCategory(categoryId, categoryName);

      // Fetch videos for this category
      const { data, error } = await supabase
        .from('explore_videos')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const videosData = (data || []).map((v: any) => ({
        ...v,
        badges: typeof v.badges === 'string' ? v.badges.split(',').filter(Boolean) : v.badges || []
      }));

      setCategoryVideos(videosData);
    } catch (error) {
      console.error('Error fetching category videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'yoga': 'bg-purple-500/20 text-purple-400',
      'weight-loss': 'bg-orange-500/20 text-orange-400',
      'tips': 'bg-blue-500/20 text-blue-400',
      'strength': 'bg-red-500/20 text-red-400',
      'lesson': 'bg-green-500/20 text-green-400',
      'training': 'bg-indigo-500/20 text-indigo-400'
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400';
  };

  const getVideoTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'yoga': '🧘',
      'weight-loss': '📉',
      'tips': '💡',
      'strength': '💪',
      'lesson': '📚',
      'training': '🏋️'
    };
    return icons[type] || '🎬';
  };

  const applySortAndFilter = (videos: ExploreVideo[]) => {
    let filtered = videos;

    // Apply difficulty filter
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(v => v.difficulty === filterDifficulty);
    }

    // Apply premium filter
    if (filterPremium) {
      filtered = filtered.filter(v => !v.is_premium);
    }

    // Apply sorting
    switch (sortBy) {
      case 'duration':
        filtered = [...filtered].sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
        break;
      case 'difficulty':
        const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
        filtered = [...filtered].sort((a, b) =>
          (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) -
          (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0)
        );
        break;
      case 'newest':
      default:
        break;
    }

    return filtered;
  };

  const filteredVideos = selectedVideoType === 'all'
    ? featuredVideos
    : featuredVideos.filter(v => v.type === selectedVideoType);

  return (
    <div className="pb-32 min-h-screen bg-[#020617] text-white">
      <StatusBar />
      <Header onProfileClick={() => onNavigate('PROFILE')} />

      <main className="pt-4">
        {/* Search Header */}
        <div className="px-5 mt-4 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[34px] font-extrabold tracking-tight leading-none">Explore</h1>
            <button
              onClick={() => onNavigate('GYM_CATALOG')}
              className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-primary/20"
            >
              <span className="material-symbols-rounded text-sm">menu_book</span>
              Gym Catalog
            </button>
          </div>
          <div className="relative group">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input
              className="w-full bg-slate-900/60 border-none rounded-2xl py-4 pl-12 pr-4 text-[15px] focus:ring-1 focus:ring-primary placeholder:text-slate-500 transition-all shadow-inner"
              placeholder="Find your next workout..."
              type="text"
            />
          </div>
        </div>

        {/* Featured Videos */}
        <section className="mb-10">
          <div className="flex items-center justify-between px-5 mb-5">
            <h2 className="text-xl font-bold tracking-tight">Premium Content</h2>
          </div>

          {/* Video Type Filter */}
          <div className="px-5 mb-5 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedVideoType('all')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedVideoType === 'all'
                ? 'bg-primary text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
            >
              All
            </button>
            {['yoga', 'weight-loss', 'tips', 'strength', 'lesson', 'training'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedVideoType(type as VideoType)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedVideoType === type
                  ? 'bg-primary text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {getVideoTypeIcon(type)} {type.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Videos Grid */}
          <div className="px-5">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-56 bg-slate-900/40 animate-pulse rounded-[2rem]"></div>
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="material-symbols-rounded text-4xl mb-4 block">video_library</span>
                <p className="font-medium">No videos available in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map(video => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="group relative aspect-video rounded-2xl overflow-hidden shadow-lg cursor-pointer border border-slate-700 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/20"
                  >
                    {/* Thumbnail */}
                    <img
                      src={video.thumbnail_url || 'https://via.placeholder.com/400x225'}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center shadow-xl">
                        <span className="material-symbols-rounded text-3xl text-slate-950">play_arrow</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getVideoTypeBadgeColor(video.type)}`}>
                          {getVideoTypeIcon(video.type)} {video.type.replace('-', ' ')}
                        </span>
                        {video.is_premium && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">
                            ✨ Premium
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">{video.title}</h3>

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-300 font-semibold">
                        {video.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-[14px]">schedule</span>
                            {video.duration_minutes}m
                          </span>
                        )}
                        {video.difficulty && (
                          <span className="flex items-center gap-1 capitalize">
                            <span className="material-symbols-rounded text-[14px]">trending_up</span>
                            {video.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Badges */}
                      {video.badges.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {video.badges.slice(0, 2).map((badge, idx) => (
                            <span key={idx} className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Workout Categories */}
        <section className="px-5 mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold tracking-tight">Workout Categories</h2>
            {selectedCategoryId && (
              <button
                onClick={() => { setSelectedCategoryId(null); setCategoryVideos([]); setSelectedVideoType('all'); }}
                className="text-primary text-xs font-bold flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                <span className="material-symbols-rounded text-sm">close</span>
                Clear Filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {loading && !selectedCategoryId ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square bg-slate-900/40 animate-pulse rounded-[2rem]"></div>
              ))
            ) : categories.map((cat, idx) => (
              <div
                key={idx}
                onClick={() => fetchCategoryVideos(cat.id, cat.name)}
                className={`relative aspect-square rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg border-2 transition-all ${selectedCategoryId === cat.id
                  ? 'border-primary ring-2 ring-primary/50'
                  : 'border-transparent hover:border-primary/50'
                  }`}
              >
                <img
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src={cat.image_url}
                />
                <div className={`absolute inset-0 ${selectedCategoryId === cat.id
                  ? 'bg-slate-950/30'
                  : 'bg-slate-950/40 group-hover:bg-slate-950/20'
                  } transition-colors`}></div>
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950/80 to-transparent">
                  <h3 className={`text-base font-bold text-center tracking-tight ${selectedCategoryId === cat.id
                    ? 'text-primary'
                    : 'text-white group-hover:text-primary'
                    } transition-colors`}>
                    {cat.name}
                  </h3>
                </div>
                {cat.icon && (
                  <div className={`absolute top-4 right-4 backdrop-blur-xl text-white rounded-full p-2.5 shadow-xl transition-all ${selectedCategoryId === cat.id
                    ? 'bg-primary text-slate-950'
                    : 'bg-white/10 group-hover:bg-primary group-hover:text-slate-950'
                    }`}>
                    <span className="material-symbols-rounded text-[18px] font-bold block">{cat.icon}</span>
                  </div>
                )}

                {/* Checkmark for selected */}
                {selectedCategoryId === cat.id && (
                  <div className="absolute top-4 left-4 bg-primary text-slate-950 rounded-full p-1 shadow-lg">
                    <span className="material-symbols-rounded text-xl font-bold">check</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <header className="px-5 py-4 flex items-center justify-between bg-slate-950 border-b border-slate-900 text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
              <div className="flex flex-col">
                <h2 className="font-bold text-sm line-clamp-1">{selectedVideo.title}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedVideo.type.replace('-', ' ')}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 bg-black flex flex-col items-center justify-center p-4">
            <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
              {embedUrl ? (
                <iframe
                  className="w-full h-full"
                  src={embedUrl}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  frameBorder="0"
                ></iframe>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                  <span className="material-symbols-rounded text-4xl mb-2">error_outline</span>
                  <p className="text-xs font-bold uppercase tracking-widest">Video unavailable</p>
                </div>
              )}
            </div>

            {selectedVideo.description && (
              <div className="mt-8 px-4 w-full max-w-2xl overflow-y-auto custom-scrollbar">
                <h3 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-3">Description</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {selectedVideo.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Background visual elements */}
      <div className="fixed top-0 right-0 -z-10 w-80 h-80 bg-primary/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
    </div>
  );
};

export default ExploreScreen;
