import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

type TabType = 'categories' | 'videos' | 'featured';
type VideoType = 'yoga' | 'weight-loss' | 'tips' | 'strength' | 'lesson' | 'training';

interface Category {
    id: string;
    name: string;
    icon: string;
    image_url: string;
    is_active: boolean;
}

interface ExploreVideo {
    id: string;
    title: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    type: VideoType;
    category_id?: string;
    duration_minutes?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    badges: string[];
    is_featured: boolean;
    is_premium: boolean;
    created_at: string;
    updated_at: string;
}

const AdminExplore: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('categories');
    const [loading, setLoading] = useState(true);

    // Category state
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [catName, setCatName] = useState('');
    const [catIcon, setCatIcon] = useState('');
    const [catImageUrl, setCatImageUrl] = useState('');
    const [catIsActive, setCatIsActive] = useState(true);

    // Video state
    const [videos, setVideos] = useState<ExploreVideo[]>([]);
    const [editingVideo, setEditingVideo] = useState<any>(null);
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [videoThumbnail, setVideoThumbnail] = useState('');
    const [videoType, setVideoType] = useState<VideoType>('yoga');
    const [videoDuration, setVideoDuration] = useState('');
    const [videoDifficulty, setVideoDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
    const [videoCategory, setVideoCategory] = useState('');
    const [videoBadges, setVideoBadges] = useState('');
    const [videoIsPremium, setVideoIsPremium] = useState(false);
    const [videoIsFeatured, setVideoIsFeatured] = useState(false);

    // Featured state
    const [featuredVideos, setFeaturedVideos] = useState<ExploreVideo[]>([]);

    useEffect(() => {
        fetchCategories();
        fetchVideos();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('workout_categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVideos = async () => {
        try {
            const { data, error } = await supabase
                .from('explore_videos')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const videosData = (data || []).map(v => ({
                ...v,
                badges: typeof v.badges === 'string' ? v.badges.split(',').filter(Boolean) : v.badges || []
            }));
            setVideos(videosData);
            setFeaturedVideos(videosData.filter(v => v.is_featured));
        } catch (error) {
            console.error('Error fetching videos:', error);
        }
    };

    // Category functions
    const handleSaveCategory = async () => {
        if (!catName) return alert('Category name is required');
        try {
            const catData = { name: catName, icon: catIcon, image_url: catImageUrl, is_active: catIsActive };
            if (editingCategory?.id) {
                await supabase.from('workout_categories').update(catData).eq('id', editingCategory.id);
            } else {
                await supabase.from('workout_categories').insert(catData);
            }
            resetCategoryForm();
            fetchCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Failed to save category');
        }
    };

    const resetCategoryForm = () => {
        setCatName('');
        setCatIcon('');
        setCatImageUrl('');
        setCatIsActive(true);
        setEditingCategory(null);
    };

    // Video functions
    const extractYouTubeId = (url: string): string | null => {
        // Handle various YouTube URL formats
        const regexPatterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of regexPatterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    };

    const generateYouTubeThumbnail = (url: string): string => {
        const videoId = extractYouTubeId(url);
        if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
        return '';
    };

    const handleVideoUrlChange = (url: string) => {
        setVideoUrl(url);
        // Auto-generate thumbnail if it's a YouTube URL and thumbnail is empty
        if (!videoThumbnail) {
            const thumbnail = generateYouTubeThumbnail(url);
            if (thumbnail) {
                setVideoThumbnail(thumbnail);
            }
        }
    };

    const handleSaveVideo = async () => {
        if (!videoTitle || !videoUrl) return alert('Title and video URL are required');
        try {
            const videoData = {
                title: videoTitle,
                description: videoDescription,
                video_url: videoUrl,
                thumbnail_url: videoThumbnail || generateYouTubeThumbnail(videoUrl),
                type: videoType,
                category_id: videoCategory || null,
                duration_minutes: videoDuration ? parseInt(videoDuration) : null,
                difficulty: videoDifficulty,
                badges: videoBadges ? videoBadges.split(',').map(b => b.trim()).filter(Boolean) : [],
                is_premium: videoIsPremium,
                is_featured: videoIsFeatured,
                updated_at: new Date().toISOString()
            };

            if (editingVideo?.id) {
                await supabase.from('explore_videos').update(videoData).eq('id', editingVideo.id);
            } else {
                await supabase.from('explore_videos').insert({
                    ...videoData,
                    created_at: new Date().toISOString()
                });
            }
            resetVideoForm();
            fetchVideos();
        } catch (error) {
            console.error('Error saving video:', error);
            alert('Failed to save video');
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!window.confirm('Delete this video?')) return;
        try {
            await supabase.from('explore_videos').delete().eq('id', id);
            fetchVideos();
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Failed to delete video');
        }
    };

    const toggleFeatured = async (video: ExploreVideo) => {
        try {
            await supabase
                .from('explore_videos')
                .update({ is_featured: !video.is_featured, updated_at: new Date().toISOString() })
                .eq('id', video.id);
            fetchVideos();
        } catch (error) {
            console.error('Error updating featured status:', error);
        }
    };

    const resetVideoForm = () => {
        setVideoTitle('');
        setVideoDescription('');
        setVideoUrl('');
        setVideoThumbnail('');
        setVideoType('yoga');
        setVideoDuration('');
        setVideoDifficulty('beginner');
        setVideoCategory('');
        setVideoBadges('');
        setVideoIsPremium(false);
        setVideoIsFeatured(false);
        setEditingVideo(null);
    };

    const getVideoTypeBadgeColor = (type: VideoType) => {
        const colors = {
            'yoga': 'bg-purple-500/20 text-purple-400',
            'weight-loss': 'bg-orange-500/20 text-orange-400',
            'tips': 'bg-blue-500/20 text-blue-400',
            'strength': 'bg-red-500/20 text-red-400',
            'lesson': 'bg-green-500/20 text-green-400',
            'training': 'bg-indigo-500/20 text-indigo-400'
        };
        return colors[type] || 'bg-slate-500/20 text-slate-400';
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40 bg-slate-900">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded hover:text-primary">arrow_back</button>
                    <h1 className="text-xl font-bold">Explore Management</h1>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="sticky top-16 z-30 bg-slate-900 border-b border-slate-800">
                <div className="px-6 flex gap-4 py-4 overflow-x-auto">
                    {['categories', 'videos', 'featured'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as TabType)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${activeTab === tab
                                ? 'bg-primary text-slate-900'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            {tab === 'categories' && 'Categories'}
                            {tab === 'videos' && 'Video Lessons'}
                            {tab === 'featured' && `Featured (${featuredVideos.length})`}
                        </button>
                    ))}
                </div>
            </div>

            <main className="p-6">
                {/* Categories Tab */}
                {activeTab === 'categories' && (
                    <div>
                        <div className="mb-6">
                            <button
                                onClick={() => { resetCategoryForm(); setEditingCategory({}); }}
                                className="bg-primary text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase"
                            >
                                + Add Category
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                </div>
                            ) : categories.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No categories found</p>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat.id} className="bg-slate-800 p-4 rounded-3xl border border-slate-700 flex items-center gap-4">
                                        <img src={cat.image_url} className="w-16 h-16 rounded-2xl object-cover" alt={cat.name} />
                                        <div className="flex-1">
                                            <h3 className="font-bold">{cat.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <span className="material-symbols-rounded text-sm">{cat.icon}</span>
                                                {cat.icon}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded text-center ${cat.is_active ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-500'}`}>
                                                {cat.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setEditingCategory(cat);
                                                    setCatName(cat.name);
                                                    setCatIcon(cat.icon || '');
                                                    setCatImageUrl(cat.image_url || '');
                                                    setCatIsActive(cat.is_active);
                                                }}
                                                className="bg-slate-700 p-2 rounded-xl hover:bg-slate-600"
                                            >
                                                <span className="material-symbols-rounded text-sm">edit</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Videos Tab */}
                {activeTab === 'videos' && (
                    <div>
                        <div className="mb-6">
                            <button
                                onClick={() => { resetVideoForm(); setEditingVideo({}); }}
                                className="bg-primary text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase"
                            >
                                + Add Video Lesson
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                </div>
                            ) : videos.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No videos found</p>
                            ) : (
                                videos.map(video => (
                                    <div key={video.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
                                        <div className="flex gap-4 p-4">
                                            <img src={video.thumbnail_url} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" alt={video.title} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <h3 className="font-bold text-sm leading-tight">{video.title}</h3>
                                                    {video.is_featured && <span className="bg-primary/20 text-primary text-[8px] font-black px-2 py-1 rounded whitespace-nowrap">★ FEATURED</span>}
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{video.description}</p>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    <span className={`text-[8px] font-bold px-2 py-1 rounded uppercase ${getVideoTypeBadgeColor(video.type)}`}>
                                                        {video.type}
                                                    </span>
                                                    {video.difficulty && <span className="text-[8px] font-bold px-2 py-1 rounded bg-slate-700 text-slate-300">{video.difficulty}</span>}
                                                    {video.is_premium && <span className="text-[8px] font-bold px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">Premium</span>}
                                                    {video.badges.map(badge => (
                                                        <span key={badge} className="text-[8px] font-bold px-2 py-1 rounded bg-slate-700 text-slate-300">{badge}</span>
                                                    ))}
                                                </div>
                                                {video.duration_minutes && <p className="text-[10px] text-slate-500">{video.duration_minutes}m</p>}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => toggleFeatured(video)}
                                                    className={`p-2 rounded-xl transition-colors ${video.is_featured ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                                >
                                                    <span className="material-symbols-rounded text-sm">star</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingVideo(video);
                                                        setVideoTitle(video.title);
                                                        setVideoDescription(video.description);
                                                        setVideoUrl(video.video_url);
                                                        setVideoThumbnail(video.thumbnail_url);
                                                        setVideoType(video.type);
                                                        setVideoDuration(video.duration_minutes?.toString() || '');
                                                        setVideoDifficulty(video.difficulty || 'beginner');
                                                        setVideoCategory(video.category_id || '');
                                                        setVideoBadges(video.badges.join(', '));
                                                        setVideoIsPremium(video.is_premium);
                                                        setVideoIsFeatured(video.is_featured);
                                                    }}
                                                    className="bg-slate-700 p-2 rounded-xl hover:bg-slate-600"
                                                >
                                                    <span className="material-symbols-rounded text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteVideo(video.id)}
                                                    className="bg-red-500/20 text-red-400 p-2 rounded-xl hover:bg-red-500/30"
                                                >
                                                    <span className="material-symbols-rounded text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Featured Tab */}
                {activeTab === 'featured' && (
                    <div>
                        {featuredVideos.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No featured videos yet. Mark videos as featured from the Videos tab.</p>
                        ) : (
                            <div className="grid gap-4">
                                {featuredVideos.map(video => (
                                    <div key={video.id} className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl border border-primary/30 overflow-hidden p-4">
                                        <div className="flex gap-4">
                                            <img src={video.thumbnail_url} className="w-32 h-32 rounded-xl object-cover flex-shrink-0" alt={video.title} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-rounded text-primary text-lg">star</span>
                                                    <h3 className="font-bold text-lg">{video.title}</h3>
                                                </div>
                                                <p className="text-sm text-slate-300 mb-3">{video.description}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getVideoTypeBadgeColor(video.type)}`}>
                                                        {video.type}
                                                    </span>
                                                    {video.difficulty && <span className="text-xs font-bold px-2 py-1 rounded bg-slate-700 text-slate-300">{video.difficulty}</span>}
                                                    {video.is_premium && <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">✨ Premium</span>}
                                                    {video.badges.map(badge => (
                                                        <span key={badge} className="text-xs font-bold px-2 py-1 rounded bg-primary/20 text-primary">{badge}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => toggleFeatured(video)}
                                                    className="bg-primary/20 text-primary p-2 rounded-xl hover:bg-primary/30"
                                                >
                                                    <span className="material-symbols-rounded text-sm">star</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 flex items-center justify-center">
                    <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-700">
                        <h2 className="text-xl font-bold mb-6">Category Editor</h2>
                        <div className="space-y-4 mb-8">
                            <input
                                placeholder="Category Name"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={catName}
                                onChange={e => setCatName(e.target.value)}
                            />
                            <input
                                placeholder="Icon Name (Material Symbol)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={catIcon}
                                onChange={e => setCatIcon(e.target.value)}
                            />
                            <input
                                placeholder="Image URL"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={catImageUrl}
                                onChange={e => setCatImageUrl(e.target.value)}
                            />
                            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="catActive"
                                    checked={catIsActive}
                                    onChange={e => setCatIsActive(e.target.checked)}
                                />
                                <label htmlFor="catActive" className="text-sm font-bold text-slate-400">Active</label>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={resetCategoryForm} className="flex-1 bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-600">Cancel</button>
                            <button onClick={handleSaveCategory} className="flex-1 bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary/90">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {editingVideo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-6 flex items-center justify-center overflow-y-auto">
                    <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-700 my-8">
                        <h2 className="text-xl font-bold mb-6">Video Lesson Editor</h2>
                        <div className="space-y-4 mb-8 max-h-96 overflow-y-auto">
                            <input
                                placeholder="Video Title"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={videoTitle}
                                onChange={e => setVideoTitle(e.target.value)}
                            />
                            <textarea
                                placeholder="Description"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 resize-none h-20"
                                value={videoDescription}
                                onChange={e => setVideoDescription(e.target.value)}
                            />
                            <input
                                placeholder="Video URL (YouTube or other)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={videoUrl}
                                onChange={e => handleVideoUrlChange(e.target.value)}
                            />
                            <input
                                placeholder="Thumbnail URL"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={videoThumbnail}
                                onChange={e => setVideoThumbnail(e.target.value)}
                            />
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white"
                                value={videoType}
                                onChange={e => setVideoType(e.target.value as VideoType)}
                            >
                                <option value="yoga">Yoga</option>
                                <option value="weight-loss">Weight Loss</option>
                                <option value="tips">Tips</option>
                                <option value="strength">Strength</option>
                                <option value="lesson">Lesson</option>
                                <option value="training">Training</option>
                            </select>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white"
                                value={videoDifficulty}
                                onChange={e => setVideoDifficulty(e.target.value as any)}
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Duration (minutes)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={videoDuration}
                                onChange={e => setVideoDuration(e.target.value)}
                            />
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white"
                                value={videoCategory}
                                onChange={e => setVideoCategory(e.target.value)}
                            >
                                <option value="">Select Category (Optional)</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <input
                                placeholder="Badges (comma separated: New, Popular, Trending, etc.)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500"
                                value={videoBadges}
                                onChange={e => setVideoBadges(e.target.value)}
                            />
                            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="videoPremium"
                                    checked={videoIsPremium}
                                    onChange={e => setVideoIsPremium(e.target.checked)}
                                />
                                <label htmlFor="videoPremium" className="text-sm font-bold text-slate-400">Premium Content</label>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="videoFeatured"
                                    checked={videoIsFeatured}
                                    onChange={e => setVideoIsFeatured(e.target.checked)}
                                />
                                <label htmlFor="videoFeatured" className="text-sm font-bold text-slate-400">Featured</label>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={resetVideoForm} className="flex-1 bg-slate-700 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-600">Cancel</button>
                            <button onClick={handleSaveVideo} className="flex-1 bg-primary text-slate-900 py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary/90">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 px-6 py-3 pb-6 flex justify-between items-center z-40 max-w-[430px] mx-auto">
                <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">dashboard</span>
                    <span className="text-[10px] font-bold">Dashboard</span>
                </button>
                <button onClick={() => onNavigate('ADMIN_EXERCISES')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">fitness_center</span>
                    <span className="text-[10px] font-bold">Exercises</span>
                </button>
                <button onClick={() => onNavigate('ADMIN_EXPLORE')} className="flex flex-col items-center gap-1 text-primary transition-colors">
                    <span className="material-symbols-rounded">explore</span>
                    <span className="text-[10px] font-bold">Explore</span>
                </button>
                <button onClick={() => onNavigate('ADMIN_WORKOUTS')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">sports_gymnastics</span>
                    <span className="text-[10px] font-bold">Workouts</span>
                </button>
                <button onClick={() => onNavigate('ADMIN_PLANS')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">card_membership</span>
                    <span className="text-[10px] font-bold">Plans</span>
                </button>
            </nav>
        </div>
    );
};

export default AdminExplore;
