import React, { useEffect, useState } from 'react';
import { AppScreen, Announcement } from '../types';
import { supabase } from '../lib/supabase';
import { clearAIConfigCache } from '../lib/gemini';

interface ConfigScreenProps {
    onNavigate: (screen: AppScreen) => void;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({ onNavigate }) => {
    const [exerciseCount, setExerciseCount] = useState(0);
    const [foodCount, setFoodCount] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [isActive, setIsActive] = useState(true);

    // AI Config State
    const [aiConfig, setAiConfig] = useState({
        provider: 'openrouter',
        model: 'google/gemini-2.0-flash-exp:free',
        api_key: ''
    });
    const [showAIModal, setShowAIModal] = useState(false);
    const [isSavingAI, setIsSavingAI] = useState(false);

    useEffect(() => {
        fetchCounts();
        fetchAnnouncements();
        fetchAIConfig();
    }, []);

    const fetchAIConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'ai_config')
                .single();
            
            if (data?.value) {
                setAiConfig(data.value);
            }
        } catch (error) {
            console.error('Error fetching AI config:', error);
        }
    };

    const handleSaveAIConfig = async () => {
        try {
            setIsSavingAI(true);
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    id: 'ai_config',
                    value: aiConfig,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            clearAIConfigCache();
            alert('AI Configuration saved successfully');
            setShowAIModal(false);
        } catch (error) {
            console.error('Error saving AI config:', error);
            alert('Failed to save AI configuration');
        } finally {
            setIsSavingAI(false);
        }
    };

    const handleClearAIConfig = async () => {
        if (!window.confirm('Are you sure you want to clear AI configuration?')) return;
        try {
            setIsSavingAI(true);
            await supabase.from('app_settings').delete().eq('id', 'ai_config');
            setAiConfig({
                provider: 'openrouter',
                model: 'google/gemini-2.5-flash',
                api_key: ''
            });
            clearAIConfigCache();
            alert('AI Configuration cleared');
            setShowAIModal(false);
        } catch (error) {
            console.error('Error clearing AI config:', error);
            alert('Failed to clear configuration');
        } finally {
            setIsSavingAI(false);
        }
    };

    const fetchCounts = async () => {
        try {
            setLoading(true);
            const [exerciseRes, foodRes, reviewRes] = await Promise.all([
                supabase.from('exercises').select('id', { count: 'exact' }),
                supabase.from('indian_foods').select('id', { count: 'exact' }),
                supabase.from('pending_food_submissions').select('id', { count: 'exact', head: false }).eq('status', 'pending'),
            ]);

            setExerciseCount(exerciseRes.count || 0);
            setFoodCount(foodRes.count || 0);
            setReviewCount(reviewRes.count || 0);
        } catch (error) {
            console.error('Error fetching counts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        }
    };

    const handleSaveAnnouncement = async () => {
        if (!title || !content) return alert('Title and Content are required');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const announcementData = { 
                title, 
                content, 
                priority, 
                is_active: isActive,
                created_by: user?.id
            };

            if (editingAnnouncement?.id) {
                const { error } = await supabase
                    .from('announcements')
                    .update(announcementData)
                    .eq('id', editingAnnouncement.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('announcements')
                    .insert([announcementData]);
                if (error) throw error;
            }
            
            setEditingAnnouncement(null);
            resetAnnouncementForm();
            fetchAnnouncements();
        } catch (error) {
            console.error('Error saving announcement:', error);
            alert('Failed to save announcement');
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchAnnouncements();
        } catch (error) {
            console.error('Error deleting announcement:', error);
        }
    };

    const resetAnnouncementForm = () => {
        setTitle('');
        setContent('');
        setPriority('medium');
        setIsActive(true);
    };

    const openAnnouncementModal = (announcement?: Announcement) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setTitle(announcement.title);
            setContent(announcement.content);
            setPriority(announcement.priority);
            setIsActive(announcement.is_active);
        } else {
            setEditingAnnouncement({});
            resetAnnouncementForm();
        }
        setShowAnnouncementModal(true);
    };

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            {/* Header */}
            <div className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">Configuration</h1>
                <button
                    onClick={() => onNavigate('ADMIN_DASHBOARD')}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-rounded">close</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-8 pb-32">
                {/* Stats Cards */}
                {!loading && (
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex flex-col items-center text-center">
                                <span className="material-symbols-rounded text-3xl text-primary mb-2">fitness_center</span>
                                <p className="text-sm text-slate-400">Exercise Items</p>
                                <p className="text-2xl font-bold">{exerciseCount}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex flex-col items-center text-center">
                                <span className="material-symbols-rounded text-3xl text-primary mb-2">restaurant</span>
                                <p className="text-sm text-slate-400">Food Items</p>
                                <p className="text-2xl font-bold">{foodCount}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex flex-col items-center text-center">
                                <span className="material-symbols-rounded text-3xl text-orange-400 mb-2">pending_actions</span>
                                <p className="text-sm text-slate-400">In Review</p>
                                <p className="text-2xl font-bold">{reviewCount}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Exercise Database Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_EXERCISES')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-primary group-hover:scale-110 transition-transform">
                                    fitness_center
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Exercise Database</h2>
                                <p className="text-sm text-slate-400">
                                    Manage exercise categories, details, and video links. Upload bulk exercise data via CSV/Excel.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Food Nutrition Data Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_INDIAN_FOODS')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-primary group-hover:scale-110 transition-transform">
                                    restaurant
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Food Nutrition Data</h2>
                                <p className="text-sm text-slate-400">
                                    Manage Indian food items, nutritional information, and calorie data. Upload bulk data via CSV/Excel.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Food Approvals Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_FOOD_APPROVALS')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-primary group-hover:scale-110 transition-transform">
                                    approval
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Food Approvals</h2>
                                <p className="text-sm text-slate-400">
                                    Review and approve user-submitted food items before adding them to the database.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* AI Settings Button */}
                    <button
                        onClick={() => setShowAIModal(true)}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-blue-400/50 bg-white/5 hover:bg-blue-400/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-blue-400 group-hover:scale-110 transition-transform">
                                    smart_toy
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">AI Settings</h2>
                                <p className="text-sm text-slate-400">
                                    Configure AI model, provider, and API keys for food analysis and chat.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-blue-400 transition-colors">
                                    settings
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Announcements Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_ANNOUNCEMENTS')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-orange-500 group-hover:scale-110 transition-transform">
                                    campaign
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Announcements</h2>
                                <p className="text-sm text-slate-400">
                                    Broadcast gym news and updates to all members.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-primary transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* AI Settings Modal */}
            {showAIModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">AI Configuration</h3>
                            <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Provider</label>
                                <select 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                    value={aiConfig.provider}
                                    onChange={(e) => setAiConfig({...aiConfig, provider: e.target.value})}
                                >
                                    <option value="openrouter">OpenRouter (Recommended)</option>
                                    <option value="google">Google Generative AI (Direct)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Model ID</label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                    placeholder="e.g. google/gemini-2.5-flash"
                                    value={aiConfig.model}
                                    onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    For OpenRouter, use format like `google/gemini-2.5-flash`
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                    placeholder="Enter your API key"
                                    value={aiConfig.api_key}
                                    onChange={(e) => setAiConfig({...aiConfig, api_key: e.target.value})}
                                />
                            </div>
                            
                            <div className="pt-4 flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAIModal(false)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveAIConfig}
                                        disabled={isSavingAI}
                                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                    >
                                        {isSavingAI ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </div>
                                <button
                                    onClick={handleClearAIConfig}
                                    disabled={isSavingAI}
                                    className="w-full px-4 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-sm"
                                >
                                    Clear Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <nav className="fixed bottom-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-8 pt-3 px-6 max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
                <div className="flex justify-between items-center">
                    <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">dashboard</span>
                        <span className="text-[10px] font-medium">Dashboard</span>
                    </button>
                    <button onClick={() => onNavigate('ADMIN_USERS')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">people_alt</span>
                        <span className="text-[10px] font-medium">Members</span>
                    </button>
                    <button onClick={() => onNavigate('ADMIN_ORDERS')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">shopping_cart_checkout</span>
                        <span className="text-[10px] font-medium">Orders</span>
                    </button>
                    <button onClick={() => onNavigate('ADMIN_SHOP')} className="flex flex-col items-center gap-1 text-primary">
                        <span className="material-symbols-rounded">storefront</span>
                        <span className="text-[10px] font-medium">Shop</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default ConfigScreen;
