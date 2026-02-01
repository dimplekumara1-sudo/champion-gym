import React, { useEffect, useState } from 'react';
import { AppScreen, Profile } from '../types';
import { supabase } from '../lib/supabase';
import StatusBar from '../components/StatusBar';

interface AttendanceRecord {
    id: string;
    user_id: string;
    check_in: string;
    device_id: string | null;
    raw_data: any;
    profiles: {
        full_name: string;
        plan: string | null;
        plan_expiry_date: string | null;
        plan_start_date: string | null;
        grace_period: number | null;
    };
}

const AdminAttendance: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [userDaysPresent, setUserDaysPresent] = useState<{ [key: string]: number }>({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'daily' | 'near_expiry'>('daily');
    const [globalGracePeriod, setGlobalGracePeriod] = useState(0);
    const [newRecord, setNewRecord] = useState({
        user_id: '',
        check_in_date: new Date().toISOString().split('T')[0],
        check_in_time: '09:00'
    });

    const [showRawData, setShowRawData] = useState<string | null>(null);

    useEffect(() => {
        fetchAttendance();
        fetchUsers();
        fetchGlobalGracePeriod();
    }, [selectedDate]);

    const fetchGlobalGracePeriod = async () => {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'gym_settings')
                .single();
            if (data?.value) {
                setGlobalGracePeriod(data.value.global_grace_period || 0);
            }
        } catch (error) {
            console.error('Error fetching global grace period:', error);
        }
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            
            // Calculate start and end of selected day
            const startOfDay = `${selectedDate} 00:00:00`;
            const endOfDay = `${selectedDate} 23:59:59`;

            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    id,
                    user_id,
                    check_in,
                    device_id,
                    raw_data,
                    profiles (
                        full_name,
                        plan,
                        plan_expiry_date,
                        plan_start_date,
                        grace_period
                    )
                `)
                .gte('check_in', startOfDay)
                .lte('check_in', endOfDay)
                .order('check_in', { ascending: false });

            if (error) throw error;
            setAttendance(data as any || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'user')
            .eq('approval_status', 'approved')
            .order('full_name');
        setUsers(data || []);
    };

    const fetchUserDaysPresent = async (userId: string, startDate: string | null, groupKey: string) => {
        if (!startDate) return;
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('check_in')
                .eq('user_id', userId)
                .gte('check_in', startDate);

            if (error) throw error;
            
            // Count unique days
            const days = new Set(data.map(r => r.check_in.split('T')[0]));
            setUserDaysPresent(prev => ({ ...prev, [groupKey]: days.size }));
        } catch (error) {
            console.error('Error fetching user days present:', error);
        }
    };

    useEffect(() => {
        if (expandedUser) {
            const records = groupedAttendance[expandedUser];
            if (!records) return;
            const record = records[0];
            
            if (record?.user_id) {
                if (record.profiles?.plan_start_date) {
                    fetchUserDaysPresent(record.user_id, record.profiles.plan_start_date, expandedUser);
                } else {
                    // Default to 30 days ago if no start date
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    fetchUserDaysPresent(record.user_id, thirtyDaysAgo.toISOString(), expandedUser);
                }
            }
        }
    }, [expandedUser]);

    const handleAddAttendance = async () => {
        if (!newRecord.user_id || !newRecord.check_in_date || !newRecord.check_in_time) {
            alert('Please fill all fields');
            return;
        }

        try {
            const checkIn = new Date(`${newRecord.check_in_date}T${newRecord.check_in_time}`).toISOString();

            const { error } = await supabase
                .from('attendance')
                .insert([{
                    user_id: newRecord.user_id,
                    check_in: checkIn
                }]);

            if (error) throw error;
            
            alert('Attendance added successfully');
            setShowAddModal(false);
            fetchAttendance();
        } catch (error: any) {
            console.error('Error adding attendance:', error);
            alert(`Failed to add attendance: ${error.message || 'Unknown error'}`);
        }
    };

    const getRemainingDays = (expiryDate: string | null, gracePeriod: number | null) => {
        if (!expiryDate) return null;
        const now = new Date();
        const expiry = new Date(expiryDate);
        const grace = (gracePeriod !== null && gracePeriod !== undefined) ? gracePeriod : globalGracePeriod;
        
        // Expiry with grace
        const finalExpiry = new Date(expiry);
        finalExpiry.setDate(finalExpiry.getDate() + grace);
        
        const diffTime = finalExpiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${d}-${m}-${y} Time: ${hours}:${mm} ${ampm}`;
    };

    const groupedAttendance = attendance.reduce((acc: { [key: string]: AttendanceRecord[] }, curr) => {
        // Use user_id if available, otherwise use eSSL ID from raw_data or device_id
        const esslId = curr.raw_data?.UserId || curr.raw_data?.EmployeeCode || 'unknown';
        const groupKey = curr.user_id || `essl_${esslId}`;
        
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(curr);
        return acc;
    }, {});

    const filteredUserIds = Object.keys(groupedAttendance).filter(groupKey => {
        const firstRecord = groupedAttendance[groupKey][0];
        const userName = firstRecord.profiles?.full_name || `Unknown User (${firstRecord.raw_data?.UserId || 'ID N/A'})`;
        return userName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const nearExpiryUsers = users.filter(user => {
        const remaining = getRemainingDays(user.plan_expiry_date, user.grace_period);
        const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        // Show if remaining is between -2 and 7 days (including grace)
        return matchesSearch && remaining !== null && remaining <= 7;
    }).sort((a, b) => {
        const remA = getRemainingDays(a.plan_expiry_date, a.grace_period) || 999;
        const remB = getRemainingDays(b.plan_expiry_date, b.grace_period) || 999;
        return remA - remB;
    });

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            <StatusBar />
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
                <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Attendance</h1>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"
                >
                    <span className="material-symbols-rounded">add</span>
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-4 py-2 bg-slate-900/50 border-b border-white/5 flex gap-2">
                <button 
                    onClick={() => setActiveTab('daily')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'daily' ? 'bg-primary text-[#090E1A]' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                    Daily Log
                </button>
                <button 
                    onClick={() => setActiveTab('near_expiry')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'near_expiry' ? 'bg-primary text-[#090E1A]' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                    Near Expiry
                </button>
            </div>

            {/* Search Filter */}
            <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5">
                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input 
                        type="text"
                        placeholder="Search member..."
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-10 py-2 text-sm focus:outline-none focus:border-primary text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {activeTab === 'daily' && (
                /* Date Filter */
                <div className="px-4 py-4 bg-slate-900/50 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input 
                                type="date"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary text-white"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDate(d.toISOString().split('T')[0]);
                                }}
                                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:scale-95"
                            >
                                <span className="material-symbols-rounded">chevron_left</span>
                            </button>
                            <button 
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() + 1);
                                    setSelectedDate(d.toISOString().split('T')[0]);
                                }}
                                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:scale-95"
                            >
                                <span className="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 px-4 py-6 overflow-y-auto pb-32">
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Loading...</div>
                    ) : activeTab === 'daily' ? (
                        filteredUserIds.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">No records found</div>
                        ) : (
                            filteredUserIds.map((groupKey) => {
                            const userRecords = groupedAttendance[groupKey];
                            const isExpanded = expandedUser === groupKey;
                            const entryCount = userRecords.length;
                            const lastRecord = userRecords[0];
                            const isUnknown = !lastRecord.user_id;
                            const userName = lastRecord.profiles?.full_name || `Unknown User (${lastRecord.raw_data?.UserId || 'ID N/A'})`;

                            return (
                                <div key={groupKey} className="space-y-2">
                                    <div 
                                        onClick={() => setExpandedUser(isExpanded ? null : groupKey)}
                                        className={`bg-slate-800/40 border p-4 rounded-2xl transition-all active:scale-[0.98] ${isExpanded ? 'border-primary/50' : 'border-slate-700/50'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isUnknown ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-700 text-primary'}`}>
                                                    {(userName || 'U')[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{userName}</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                        Today's records
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div className="w-14 h-14 rounded-full border-2 border-primary/30 bg-primary/5 flex flex-col items-center justify-center leading-none">
                                                    <span className="text-sm font-black text-primary">{entryCount}</span>
                                                    <span className="text-[7px] font-black text-primary uppercase tracking-tighter">Entries</span>
                                                </div>
                                                <span className="material-symbols-rounded text-slate-500 text-sm">
                                                    {isExpanded ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Logs */}
                                    {isExpanded && (
                                        <div className="ml-4 pl-4 border-l-2 border-slate-700 space-y-3 py-2 animate-in fade-in slide-in-from-left-2">
                                            {/* Subscription Info Card */}
                                            {!isUnknown && (
                                                <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl mb-2">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Current Plan</p>
                                                            <p className="text-sm font-bold text-white">{lastRecord.profiles?.plan || 'No Active Plan'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Status</p>
                                                            {(() => {
                                                                const remaining = getRemainingDays(lastRecord.profiles?.plan_expiry_date, lastRecord.profiles?.grace_period);
                                                                if (remaining === null) return <span className="text-[10px] text-slate-400 font-bold">N/A</span>;
                                                                if (remaining < 0) return <span className="text-[10px] text-red-400 font-bold">EXPIRED</span>;
                                                                if (remaining <= 5) return <span className="text-[10px] text-orange-400 font-bold">ENDING SOON</span>;
                                                                return <span className="text-[10px] text-primary font-bold">ACTIVE</span>;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-primary/10">
                                                        <div>
                                                            <p className="text-[8px] text-slate-500 font-bold uppercase">Expires On</p>
                                                            <p className="text-[11px] font-bold">
                                                                {lastRecord.profiles?.plan_expiry_date ? new Date(lastRecord.profiles.plan_expiry_date).toLocaleDateString() : 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[8px] text-slate-500 font-bold uppercase">Days Present</p>
                                                            <p className="text-[11px] font-bold text-primary">
                                                                {userDaysPresent[groupKey] || '...'} Days
                                                            </p>
                                                            <p className="text-[8px] text-slate-500 font-medium italic mt-0.5">In current plan</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-1">
                                                            <span className="material-symbols-rounded text-[10px] text-orange-400">info</span>
                                                            <p className="text-[9px] text-orange-400/80 italic font-medium">
                                                                {(() => {
                                                                    const rem = getRemainingDays(lastRecord.profiles?.plan_expiry_date, lastRecord.profiles?.grace_period);
                                                                    if (rem === null) return 'No expiry set';
                                                                    if (rem < 0) return `Expired ${Math.abs(rem)} days ago`;
                                                                    return `${rem} days remaining`;
                                                                })()}
                                                            </p>
                                                        </div>
                                                        {lastRecord.profiles?.grace_period && lastRecord.profiles.grace_period > 0 && (
                                                            <p className="text-[8px] text-slate-500 font-bold uppercase">+{lastRecord.profiles.grace_period}d Grace</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Timings</span>
                                            </div>
                                            
                                            {userRecords.map((record) => (
                                                <div key={record.id} className="space-y-2">
                                                    <div className="bg-slate-800/20 border border-slate-700/30 p-3 rounded-xl">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`material-symbols-rounded text-xs ${record.device_id ? 'text-primary' : 'text-slate-500'}`}>
                                                                    {record.device_id ? 'biometrics' : 'person'}
                                                                </span>
                                                                <div>
                                                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                                                        {record.device_id ? `eSSL Device: ${record.device_id}` : 'Manual Entry'}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-white/90">
                                                                        {formatDateTime(record.check_in)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {record.raw_data && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowRawData(showRawData === record.id ? null : record.id);
                                                                    }}
                                                                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-rounded text-sm">terminal</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {showRawData === record.id && record.raw_data && (
                                                        <div className="bg-black/40 border border-white/5 p-3 rounded-xl overflow-hidden animate-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Raw Device Payload</p>
                                                                <button onClick={() => setShowRawData(null)}>
                                                                    <span className="material-symbols-rounded text-xs text-slate-500">close</span>
                                                                </button>
                                                            </div>
                                                            <pre className="text-[10px] text-primary/80 font-mono overflow-x-auto">
                                                                {JSON.stringify(record.raw_data, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )) : (
                        /* Near Expiry Tab Content */
                        nearExpiryUsers.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">No memberships nearing expiry</div>
                        ) : (
                            nearExpiryUsers.map((user) => {
                                const remaining = getRemainingDays(user.plan_expiry_date, user.grace_period);
                                const isExpired = remaining !== null && remaining < 0;
                                
                                return (
                                    <div key={user.id} className={`p-4 rounded-2xl border transition-all ${isExpired ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    {(user.full_name || 'U')[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{user.full_name}</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.plan || 'No Active Plan'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xs font-black uppercase ${isExpired ? 'text-red-400' : 'text-orange-400'}`}>
                                                    {remaining === null ? 'N/A' : isExpired ? 'Expired' : `${remaining} Days Left`}
                                                </p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase">Status</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                            <div>
                                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Expiry Date</p>
                                                <p className="text-xs font-medium text-slate-300">
                                                    {user.plan_expiry_date ? new Date(user.plan_expiry_date).toLocaleDateString() : 'Not Set'}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => onNavigate('ADMIN_USERS')}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                            >
                                                Renew
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    )}
                </div>
            </div>

            {/* Add Record Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Add Attendance</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Select User</label>
                                <select 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                    value={newRecord.user_id}
                                    onChange={(e) => setNewRecord({ ...newRecord, user_id: e.target.value })}
                                >
                                    <option value="">Choose a member</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                    value={newRecord.check_in_date}
                                    onChange={(e) => setNewRecord({ ...newRecord, check_in_date: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Entry Time</label>
                                    <input 
                                        type="time"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                        value={newRecord.check_in_time}
                                        onChange={(e) => setNewRecord({ ...newRecord, check_in_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleAddAttendance}
                                className="w-full bg-primary text-[#090E1A] font-black py-4 rounded-xl mt-4 active:scale-95 transition-transform"
                            >
                                SAVE RECORD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAttendance;
