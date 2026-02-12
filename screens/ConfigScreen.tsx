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
    
    // Gym Settings State
    const [globalGracePeriod, setGlobalGracePeriod] = useState(1);
    const [isSavingGym, setIsSavingGym] = useState(false);

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

    // eSSL Management State
    const [esslCommands, setEsslCommands] = useState<any[]>([]);
    const [isFetchingEssl, setIsFetchingEssl] = useState(false);
    const [isExecutingEssl, setIsExecutingEssl] = useState(false);
    const [customEsslCommand, setCustomEsslCommand] = useState('');
    const [esslTargetId, setEsslTargetId] = useState('CUB7252100258');
    const [showEsslModal, setShowEsslModal] = useState(false);
    const [esslHistoryPage, setEsslHistoryPage] = useState(0);
    const [totalEsslCommands, setTotalEsslCommands] = useState(0);
    const [esslHistory, setEsslHistory] = useState<any[]>([]);
    const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
    const [isCheckingExpiry, setIsCheckingExpiry] = useState(false);
    const esslPageSize = 10;

    useEffect(() => {
        fetchCounts();
        fetchAnnouncements();
        fetchAIConfig();
        fetchGymSettings();
        fetchNotifications();
        fetchUsers();
        fetchEsslCommands();
    }, []);

    const fetchEsslCommands = async () => {
        try {
            setIsFetchingEssl(true);
            const { data, count, error } = await supabase
                .from('essl_commands')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            setEsslCommands(data || []);
            setTotalEsslCommands(count || 0);
        } catch (error) {
            console.error('Error fetching eSSL commands:', error);
        } finally {
            setIsFetchingEssl(false);
        }
    };

    const fetchEsslHistory = async (page: number) => {
        try {
            setIsFetchingEssl(true);
            const from = page * esslPageSize;
            const to = from + esslPageSize - 1;

            const { data, error } = await supabase
                .from('essl_commands')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);
            
            if (error) throw error;
            setEsslHistory(data || []);
            setEsslHistoryPage(page);
        } catch (error) {
            console.error('Error fetching eSSL history:', error);
        } finally {
            setIsFetchingEssl(false);
        }
    };

    const handleEsslAction = async (action: string, payload: any = {}) => {
        try {
            setIsExecutingEssl(true);
            
            const { data, error } = await supabase.functions.invoke('essl-management', {
                body: { action, ...payload }
            });

            if (error) throw error;
            
            alert('Action triggered successfully');
            fetchEsslCommands();
        } catch (error: any) {
            console.error('Error executing eSSL action:', error);
            alert(error.message);
        } finally {
            setIsExecutingEssl(false);
        }
    };

    const handleUpdateAccess = async () => {
        try {
            setIsUpdatingAccess(true);
            const { data, error } = await supabase.functions.invoke('update-access');

            if (error) throw error;
            
            alert(`Access updated: ${data.processed} users processed.`);
        } catch (error: any) {
            console.error('Error updating access:', error);
            alert(error.message);
        } finally {
            setIsUpdatingAccess(false);
        }
    };

    const handleCheckExpiredMembers = async () => {
        try {
            setIsCheckingExpiry(true);
            const { data, error } = await supabase.functions.invoke('check-expired-members');

            if (error) throw error;
            
            alert(`Expiry check complete: ${data.processed} users processed.`);
            fetchEsslCommands();
        } catch (error: any) {
            console.error('Error checking expired members:', error);
            alert(error.message);
        } finally {
            setIsCheckingExpiry(false);
        }
    };

    const handleSendCustomCommand = async () => {
        if (!customEsslCommand) return;
        try {
            setIsExecutingEssl(true);
            const { error } = await supabase
                .from('essl_commands')
                .insert({
                    essl_id: esslTargetId,
                    command: customEsslCommand,
                    status: 'pending'
                });

            if (error) throw error;
            setCustomEsslCommand('');
            alert('Command queued successfully');
            fetchEsslCommands();
        } catch (error: any) {
            console.error('Error sending custom command:', error);
            alert(error.message);
        } finally {
            setIsExecutingEssl(false);
        }
    };

    const fetchGymSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'gym_settings')
                .single();
            
            if (data?.value) {
                setGlobalGracePeriod(data.value.global_grace_period || 0);
            }
        } catch (error) {
            console.error('Error fetching gym settings:', error);
        }
    };

    const handleSaveGymSettings = async () => {
        try {
            setIsSavingGym(true);
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    id: 'gym_settings',
                    value: { global_grace_period: globalGracePeriod },
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            alert('Gym settings saved successfully');
        } catch (error) {
            console.error('Error saving gym settings:', error);
            alert('Failed to save gym settings');
        } finally {
            setIsSavingGym(false);
        }
    };

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

                {/* Gym & eSSL Access Settings */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-rounded">door_front</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Gym & eSSL Access</h2>
                            <p className="text-xs text-slate-400">Manage entry logs and grace periods</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Global Grace Period (Days)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="30"
                                    value={globalGracePeriod}
                                    onChange={(e) => setGlobalGracePeriod(parseInt(e.target.value) || 0)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                    placeholder="Enter days..."
                                />
                                <button
                                    onClick={handleSaveGymSettings}
                                    disabled={isSavingGym}
                                    className="px-6 py-2 bg-primary text-slate-900 font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                                >
                                    {isSavingGym ? '...' : 'Save'}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic">
                                * Users can access the gym for this many days after their subscription expires.
                            </p>
                        </div>
                        
                        <div className="pt-2">
                            <button
                                onClick={() => onNavigate('ADMIN_ATTENDANCE')}
                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-rounded text-primary">analytics</span>
                                View Attendance Logs
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <span className="material-symbols-rounded">developer_board</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">eSSL Device Management</h2>
                            <p className="text-xs text-slate-400">Control and sync biometric devices</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => handleEsslAction('sync-names', { essl_id: esslTargetId })}
                            disabled={isExecutingEssl}
                            className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-primary/50 transition-colors gap-2"
                        >
                            <span className="material-symbols-rounded text-primary">group</span>
                            <span className="text-[10px] font-bold uppercase">Sync Users</span>
                        </button>
                        <button
                            onClick={() => handleEsslAction('sync-attendance', { essl_id: esslTargetId })}
                            disabled={isExecutingEssl}
                            className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-green-500/50 transition-colors gap-2"
                        >
                            <span className="material-symbols-rounded text-green-500">history</span>
                            <span className="text-[10px] font-bold uppercase">Fetch Logs</span>
                        </button>
                        <button
                            onClick={() => handleEsslAction('block-expired')}
                            disabled={isExecutingEssl}
                            className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-red-500/50 transition-colors gap-2"
                        >
                            <span className="material-symbols-rounded text-red-500">block</span>
                            <span className="text-[10px] font-bold uppercase">Block (Local)</span>
                        </button>
                        <button
                            onClick={handleUpdateAccess}
                            disabled={isUpdatingAccess}
                            className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-orange-500/50 transition-colors gap-2"
                        >
                            <span className="material-symbols-rounded text-orange-500">sync_problem</span>
                            <span className="text-[10px] font-bold uppercase text-center">Block (Cloud)</span>
                        </button>
                        <button
                            onClick={() => handleEsslAction('sync-all-expiry')}
                            disabled={isExecutingEssl}
                            className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-colors gap-2"
                        >
                            <span className="material-symbols-rounded text-purple-500">calendar_month</span>
                            <span className="text-[10px] font-bold uppercase">Sync Expiry</span>
                        </button>
                        <button
                            onClick={handleCheckExpiredMembers}
                            disabled={isCheckingExpiry}
                            className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-blue-500/50 transition-colors gap-2"
                        >
                            <span className="material-symbols-rounded text-blue-500">lock_clock</span>
                            <span className="text-[10px] font-bold uppercase text-center">Auto-Expiry Check</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Send Custom Command</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={esslTargetId}
                                        onChange={(e) => setEsslTargetId(e.target.value)}
                                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                        placeholder="Target (SN/PIN)"
                                    />
                                    <input 
                                        type="text" 
                                        value={customEsslCommand}
                                        onChange={(e) => setCustomEsslCommand(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                        placeholder="Command (e.g. REBOOT)"
                                    />
                                </div>
                                <button
                                    onClick={handleSendCustomCommand}
                                    disabled={isExecutingEssl || !customEsslCommand}
                                    className="w-full py-2 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50 text-xs"
                                >
                                    {isExecutingEssl ? 'Executing...' : 'Queue Command'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Recent Commands</label>
                                <button onClick={fetchEsslCommands} className="text-primary text-[10px] uppercase font-bold">Refresh</button>
                            </div>
                            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                                {isFetchingEssl ? (
                                    <div className="p-4 text-center text-xs text-slate-500">Loading commands...</div>
                                ) : esslCommands.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500">No recent commands</div>
                                ) : (
                                    <div className="divide-y divide-slate-700">
                                        {esslCommands.map((cmd) => (
                                            <div key={cmd.id} className="p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-mono text-slate-400">{cmd.command}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                                        cmd.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                                        cmd.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        cmd.status === 'sent' ? 'bg-blue-500/20 text-blue-500' :
                                                        'bg-red-500/20 text-red-500'
                                                    }`}>
                                                        {cmd.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] text-slate-500">Target: {cmd.essl_id}</span>
                                                    <span className="text-[8px] text-slate-500">
                                                        {new Date(cmd.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => {
                                    setShowEsslModal(true);
                                    fetchEsslHistory(0);
                                }}
                                className="w-full mt-3 py-2 text-primary text-xs font-bold uppercase hover:bg-primary/5 rounded-xl transition-colors border border-primary/20"
                            >
                                View All Commands ({totalEsslCommands})
                            </button>
                        </div>
                    </div>
                </div>

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
            {/* eSSL Command History Modal */}
            {showEsslModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">eSSL Command History</h3>
                            <button onClick={() => setShowEsslModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {isFetchingEssl && esslHistory.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">Loading history...</div>
                            ) : (
                                <div className="space-y-4">
                                    {esslHistory.map((cmd) => (
                                        <div key={cmd.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-sm font-mono text-primary">{cmd.command}</p>
                                                    <p className="text-xs text-slate-500 mt-1">Target: {cmd.essl_id}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    cmd.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                                    cmd.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                                    cmd.status === 'sent' ? 'bg-blue-500/20 text-blue-500' :
                                                    'bg-red-500/20 text-red-500'
                                                }`}>
                                                    {cmd.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                                                <span>ID: {cmd.id}</span>
                                                <span>{new Date(cmd.created_at).toLocaleString()}</span>
                                            </div>
                                            {cmd.payload && (
                                                <pre className="mt-2 p-2 bg-black/30 rounded text-[10px] text-slate-400 overflow-x-auto">
                                                    {JSON.stringify(cmd.payload, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-800/50">
                            <span className="text-xs text-slate-400">
                                Showing {esslHistoryPage * esslPageSize + 1} - {Math.min((esslHistoryPage + 1) * esslPageSize, totalEsslCommands)} of {totalEsslCommands}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={esslHistoryPage === 0 || isFetchingEssl}
                                    onClick={() => fetchEsslHistory(esslHistoryPage - 1)}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 disabled:opacity-30"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={((esslHistoryPage + 1) * esslPageSize) >= totalEsslCommands || isFetchingEssl}
                                    onClick={() => fetchEsslHistory(esslHistoryPage + 1)}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 disabled:opacity-30"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigScreen;
