import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';

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

const CategoryVideosScreen: React.FC<{
    categoryId: string;
    categoryName: string;
    onNavigate: (s: AppScreen) => void;
}> = ({ categoryId, categoryName, onNavigate }) => {
    const [videos, setVideos] = useState<ExploreVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'newest' | 'duration' | 'difficulty'>('newest');
    const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
    const [filterPremium, setFilterPremium] = useState(false);

    useEffect(() => {
        fetchCategoryVideos();
    }, [categoryId]);

    const fetchCategoryVideos = async () => {
        try {
            setLoading(true);
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

            setVideos(videosData);
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

    const openVideoInNewTab = (video: ExploreVideo) => {
        let videoUrl = video.video_url;

        if (videoUrl.includes('youtube.com/watch?v=')) {
            const videoId = videoUrl.split('v=')[1].split('&')[0];
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes('youtu.be/')) {
            const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (!videoUrl.includes('embed')) {
            window.open(videoUrl, '_blank');
            return;
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${video.title}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { margin-bottom: 20px; }
          .title { color: #fff; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .meta { color: #888; font-size: 14px; display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 12px; background: #1e293b; color: #cbd5e1; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .video-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 20px; }
          .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
          .description { color: #cbd5e1; line-height: 1.6; font-size: 14px; }
          .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #3f46e1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .back-btn:hover { background: #4f46e1; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="javascript:history.back()" class="back-btn">← Back</a>
          <div class="header">
            <div class="title">${video.title}</div>
            <div class="meta">
              <span class="badge">${video.type.replace('-', ' ')}</span>
              ${video.difficulty ? `<span class="badge">${video.difficulty}</span>` : ''}
              ${video.duration_minutes ? `<span class="badge">⏱️ ${video.duration_minutes}m</span>` : ''}
              ${video.is_premium ? `<span class="badge">✨ Premium</span>` : ''}
            </div>
          </div>
          <div class="video-container">
            <iframe src="${videoUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          ${video.description ? `<div class="description"><p>${video.description}</p></div>` : ''}
        </div>
      </body>
      </html>
    `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const applySortAndFilter = (videosToFilter: ExploreVideo[]) => {
        let filtered = videosToFilter;

        if (filterDifficulty !== 'all') {
            filtered = filtered.filter(v => v.difficulty === filterDifficulty);
        }

        if (filterPremium) {
            filtered = filtered.filter(v => !v.is_premium);
        }

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

    const filteredAndSortedVideos = applySortAndFilter(videos);

    return (
        <div className="pb-32 min-h-screen bg-[#020617] text-white">
            <StatusBar />
            <Header onProfileClick={() => onNavigate('PROFILE')} />

            <main className="pt-4">
                {/* Header */}
                <div className="px-5 mt-4 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => onNavigate('EXPLORE')}
                            className="p-2 bg-slate-900/60 rounded-full hover:bg-slate-800 transition"
                        >
                            <span className="material-symbols-rounded">arrow_back</span>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-[34px] font-extrabold tracking-tight leading-none">{categoryName}</h1>
                            <p className="text-slate-400 text-sm mt-1">{filteredAndSortedVideos.length} videos</p>
                        </div>
                    </div>
                </div>

                {/* Filters and Sort */}
                <div className="px-5 mb-6 flex gap-2 overflow-x-auto pb-2 flex-wrap">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'duration' | 'difficulty')}
                        className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold hover:border-primary/50 transition-colors"
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="duration">Sort: Duration</option>
                        <option value="difficulty">Sort: Difficulty</option>
                    </select>

                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced')}
                        className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold hover:border-primary/50 transition-colors"
                    >
                        <option value="all">Difficulty: All</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>

                    <button
                        onClick={() => setFilterPremium(!filterPremium)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${filterPremium ? 'bg-primary text-slate-900' : 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-primary/50'}`}
                    >
                        {filterPremium ? '✓ Free Only' : 'Free Only'}
                    </button>
                </div>

                {/* Videos Grid */}
                <section className="px-5 mb-10">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-56 bg-slate-900/40 animate-pulse rounded-[2rem]"></div>
                            ))}
                        </div>
                    ) : filteredAndSortedVideos.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <span className="material-symbols-rounded text-4xl mb-4 block">video_library</span>
                            <p className="font-medium">No videos available with selected filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAndSortedVideos.map(video => (
                                <div
                                    key={video.id}
                                    onClick={() => openVideoInNewTab(video)}
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
                </section>
            </main>

            <BottomNav active="EXPLORE" onNavigate={onNavigate} />

            {/* Background visual elements */}
            <div className="fixed top-0 right-0 -z-10 w-80 h-80 bg-primary/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 left-0 -z-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
        </div>
    );
};

export default CategoryVideosScreen;
