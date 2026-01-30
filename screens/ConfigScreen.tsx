import React, { useEffect, useState } from 'react';
import { AppScreen, Announcement, PushNotification } from '../types';
import { supabase } from '../lib/supabase';
import { clearAIConfigCache } from '../lib/gemini';
import { 
    getAllNotifications, 
    createNotification, 
    deleteNotification, 
    getAllUsers,
    CreateNotificationData 
} from '../lib/push-notifications';

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

    // Notifications State
    const [notifications, setNotifications] = useState<PushNotification[]>([]);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationLink, setNotificationLink] = useState('');
    const [targetUser, setTargetUser] = useState<string>('all'); // 'all' for broadcast
    const [users, setUsers] = useState<{ id: string; email?: string; username?: string; full_name?: string; weight?: number; height?: number; target_weight?: number; goal?: string; gender?: string }[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<{ id: string; email?: string; username?: string; full_name?: string; weight?: number; height?: number; target_weight?: number; goal?: string; gender?: string }[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [weightFilter, setWeightFilter] = useState({ min: '', max: '' });
    const [bmiFilter, setBmiFilter] = useState({ min: '', max: '' });
    const [goalFilter, setGoalFilter] = useState('all');
    const [genderFilter, setGenderFilter] = useState('all');
    const [isSavingNotification, setIsSavingNotification] = useState(false);

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
        fetchNotifications();
        fetchUsers();
    }, []);

    const calculateBMI = (weight: number, height: number) => {
        if (!weight || !height) return 0;
        const heightInMeters = height / 100;
        return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
    };

    const filterUsers = () => {
        let filtered = users;

        // Search filter
        if (userSearchTerm.trim() !== '') {
            filtered = filtered.filter(user => 
                (user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()))
            );
        }

        // Weight filter
        if (weightFilter.min || weightFilter.max) {
            filtered = filtered.filter(user => {
                if (!user.weight) return false;
                const weight = Number(user.weight);
                if (weightFilter.min && weight < Number(weightFilter.min)) return false;
                if (weightFilter.max && weight > Number(weightFilter.max)) return false;
                return true;
            });
        }

        // BMI filter
        if (bmiFilter.min || bmiFilter.max) {
            filtered = filtered.filter(user => {
                if (!user.weight || !user.height) return false;
                const bmi = calculateBMI(Number(user.weight), Number(user.height));
                if (bmiFilter.min && bmi < Number(bmiFilter.min)) return false;
                if (bmiFilter.max && bmi > Number(bmiFilter.max)) return false;
                return true;
            });
        }

        // Goal filter
        if (goalFilter !== 'all') {
            filtered = filtered.filter(user => user.goal === goalFilter);
        }

        // Gender filter
        if (genderFilter !== 'all') {
            filtered = filtered.filter(user => user.gender === genderFilter);
        }

        setFilteredUsers(filtered);
    };

    useEffect(() => {
        filterUsers();
    }, [userSearchTerm, weightFilter, bmiFilter, goalFilter, genderFilter, users]);

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
                provider: 'google',
                model: 'gemini-1.5-flash',
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

    const fetchNotifications = async () => {
        try {
            const data = await getAllNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            // Fetch detailed user profiles with fitness data
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, weight, height, target_weight, goal, gender')
                .eq('role', 'user')
                .order('username', { ascending: true });

            if (error) {
                console.error('Error fetching profiles:', error);
                return;
            }

            console.log('Fetched detailed user profiles:', profiles);
            setUsers(profiles || []);
            setFilteredUsers(profiles || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleCreateNotification = async () => {
        if (!notificationTitle || !notificationMessage) {
            return alert('Title and Message are required');
        }

        try {
            setIsSavingNotification(true);
            
            if (targetUser === 'all') {
                // Send to all users
                const notificationData: CreateNotificationData = {
                    title: notificationTitle,
                    message: notificationMessage,
                    link: notificationLink || undefined,
                    target_user: undefined // NULL for broadcast
                };
                await createNotification(notificationData);
            } else if (targetUser === 'selected') {
                // Send to selected users
                if (selectedUsers.length === 0) {
                    alert('Please select at least one user');
                    setIsSavingNotification(false);
                    return;
                }
                
                // Create notifications for each selected user
                for (const userId of selectedUsers) {
                    const notificationData: CreateNotificationData = {
                        title: notificationTitle,
                        message: notificationMessage,
                        link: notificationLink || undefined,
                        target_user: userId
                    };
                    await createNotification(notificationData);
                }
            }

            alert('Notification sent successfully!');
            setNotificationTitle('');
            setNotificationMessage('');
            setNotificationLink('');
            setTargetUser('all');
            setSelectedUsers([]);
            setShowNotificationModal(false);
            fetchNotifications();
        } catch (error) {
            console.error('Error creating notification:', error);
            alert('Failed to send notification');
        } finally {
            setIsSavingNotification(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const selectAllUsers = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(user => user.id));
        }
    };

    const handleDeleteNotification = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;
        try {
            await deleteNotification(id);
            fetchNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
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

                    {/* Push Notifications Button */}
                    <button
                        onClick={() => setShowNotificationModal(true)}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-purple-500/50 bg-white/5 hover:bg-purple-500/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-purple-500 group-hover:scale-110 transition-transform">
                                    notifications
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Push Notifications</h2>
                                <p className="text-sm text-slate-400">
                                    Send targeted notifications to users with optional links and actions.
                                </p>
                                {notifications.length > 0 && (
                                    <p className="text-xs text-purple-400 mt-1">
                                        {notifications.length} active notifications
                                    </p>
                                )}
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-purple-500 transition-colors">
                                    send
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Attendance Management Button */}
                    <button
                        onClick={() => onNavigate('ADMIN_ATTENDANCE')}
                        className="w-full p-6 rounded-lg border border-white/10 hover:border-pink-500/50 bg-white/5 hover:bg-pink-500/10 transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-3xl text-pink-500 group-hover:scale-110 transition-transform">
                                    calendar_month
                                </span>
                            </div>
                            <div className="text-left flex-1">
                                <h2 className="text-lg font-bold mb-2">Attendance Management</h2>
                                <p className="text-sm text-slate-400">
                                    Manage user attendance, check-in/out timings and gym duration.
                                </p>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                                <span className="material-symbols-rounded text-slate-500 group-hover:text-pink-500 transition-colors">
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
                                    onChange={(e) => {
                                        const provider = e.target.value;
                                        let model = aiConfig.model;
                                        let api_key = aiConfig.api_key;
                                        
                                        if (provider === 'puter') {
                                            model = 'gemini-3-flash-preview';
                                            api_key = 'not-required'; // Placeholder for Puter
                                        } else if (provider === 'openrouter') {
                                            model = 'google/gemini-2.0-flash-exp:free';
                                        } else if (provider === 'google') {
                                            model = 'gemini-1.5-flash';
                                        }
                                        
                                        setAiConfig({...aiConfig, provider, model, api_key});
                                    }}
                                >
                                    <option value="openrouter">OpenRouter (Recommended)</option>
                                    <option value="google">Google Generative AI (Direct)</option>
                                    <option value="puter">Puter.js (Free Gemini)</option>
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

            {/* Push Notifications Modal */}
            {showNotificationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Push Notifications</h3>
                            <button onClick={() => setShowNotificationModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Create Notification Form */}
                            <div className="space-y-4 border-b border-white/10 pb-4">
                                <h4 className="font-semibold text-purple-400">Create New Notification</h4>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                                        placeholder="Enter notification title"
                                        value={notificationTitle}
                                        onChange={(e) => setNotificationTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                                    <textarea 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 h-24 resize-none"
                                        placeholder="Enter notification message"
                                        value={notificationMessage}
                                        onChange={(e) => setNotificationMessage(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Link (Optional)</label>
                                    <input 
                                        type="url"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                                        placeholder="https://example.com"
                                        value={notificationLink}
                                        onChange={(e) => setNotificationLink(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Target</label>
                                    <select 
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                                        value={targetUser}
                                        onChange={(e) => setTargetUser(e.target.value)}
                                    >
                                        <option value="all">All Users</option>
                                        <option value="selected">Selected Users</option>
                                    </select>
                                </div>
                                
                                {targetUser === 'selected' && (
                                    <div className="space-y-3 mt-4 p-3 bg-slate-800/50 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <h5 className="text-sm font-medium text-slate-300">Select Users</h5>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={selectAllUsers}
                                                    className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                                                >
                                                    {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                                <span className="text-xs text-slate-400">
                                                    {selectedUsers.length} of {filteredUsers.length} selected
                                                </span>
                                            </div>
                                        </div>

                                        {/* Filters */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Search</label>
                                                <input 
                                                    type="text"
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                    placeholder="Search by name..."
                                                    value={userSearchTerm}
                                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Goal</label>
                                                <select 
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                    value={goalFilter}
                                                    onChange={(e) => setGoalFilter(e.target.value)}
                                                >
                                                    <option value="all">All Goals</option>
                                                    <option value="weight_loss">Weight Loss</option>
                                                    <option value="muscle_gain">Muscle Gain</option>
                                                    <option value="maintenance">Maintenance</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Weight Range (kg)</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                        placeholder="Min"
                                                        value={weightFilter.min}
                                                        onChange={(e) => setWeightFilter({...weightFilter, min: e.target.value})}
                                                    />
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                        placeholder="Max"
                                                        value={weightFilter.max}
                                                        onChange={(e) => setWeightFilter({...weightFilter, max: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">BMI Range</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                        placeholder="Min"
                                                        value={bmiFilter.min}
                                                        onChange={(e) => setBmiFilter({...bmiFilter, min: e.target.value})}
                                                    />
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                        placeholder="Max"
                                                        value={bmiFilter.max}
                                                        onChange={(e) => setBmiFilter({...bmiFilter, max: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                                                <select 
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                                                    value={genderFilter}
                                                    onChange={(e) => setGenderFilter(e.target.value)}
                                                >
                                                    <option value="all">All</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* User List with Checkboxes */}
                                        <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-600 rounded-lg p-2">
                                            {filteredUsers.length === 0 ? (
                                                <p className="text-center text-slate-500 text-sm py-4">No users found matching filters</p>
                                            ) : (
                                                filteredUsers.map(user => {
                                                    const bmi = calculateBMI(Number(user.weight) || 0, Number(user.height) || 0);
                                                    return (
                                                        <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUsers.includes(user.id)}
                                                                onChange={() => toggleUserSelection(user.id)}
                                                                className="w-4 h-4 text-purple-500 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-white truncate">
                                                                        {user.username || user.full_name || 'Unknown User'}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">
                                                                        {user.gender}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-3 text-xs text-slate-500">
                                                                    <span>W: {user.weight || 'N/A'}kg</span>
                                                                    <span>H: {user.height || 'N/A'}cm</span>
                                                                    <span>BMI: {bmi}</span>
                                                                    <span>Goal: {user.goal || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleCreateNotification}
                                    disabled={isSavingNotification || !notificationTitle || !notificationMessage || (targetUser === 'selected' && selectedUsers.length === 0)}
                                    className="w-full px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                    {isSavingNotification ? 'Sending...' : 'Send Notification'}
                                </button>
                            </div>

                            {/* Notifications List */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-purple-400">Recent Notifications</h4>
                                {notifications.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No notifications sent yet</p>
                                ) : (
                                    notifications.slice(0, 5).map(notification => (
                                        <div key={notification.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h5 className="font-medium text-white">{notification.title}</h5>
                                                    <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                                                    {notification.link && (
                                                        <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 mt-1 block truncate">
                                                            {notification.link}
                                                        </a>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(notification.created_at).toLocaleDateString()}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            notification.is_read 
                                                                ? 'bg-green-500/20 text-green-400' 
                                                                : 'bg-orange-500/20 text-orange-400'
                                                        }`}>
                                                            {notification.is_read ? 'Read' : 'Unread'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteNotification(notification.id)}
                                                    className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                                                >
                                                    <span className="material-symbols-rounded text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
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
