import React, { useEffect, useState } from 'react';
import { AppScreen, Profile } from '../types';
import { supabase } from '../lib/supabase';
import StatusBar from '../components/StatusBar';

interface AttendanceRecord {
    id: string;
    user_id: string;
    check_in: string;
    check_out: string | null;
    profiles: {
        full_name: string;
    };
}

const AdminAttendance: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRecord, setNewRecord] = useState({
        user_id: '',
        check_in_date: new Date().toISOString().split('T')[0],
        check_in_time: '09:00',
        check_out_time: '11:00'
    });

    useEffect(() => {
        fetchAttendance();
        fetchUsers();
    }, [selectedDate]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            
            // Calculate start and end of selected day
            const startOfDay = `${selectedDate}T00:00:00.000Z`;
            const endOfDay = `${selectedDate}T23:59:59.999Z`;

            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    *,
                    profiles!inner (full_name)
                `)
                .gte('check_in', startOfDay)
                .lte('check_in', endOfDay)
                .order('check_in', { ascending: false });

            if (error) throw error;
            setAttendance(data || []);
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

    const handleAddAttendance = async () => {
        if (!newRecord.user_id || !newRecord.check_in_date || !newRecord.check_in_time) {
            alert('Please fill all fields');
            return;
        }

        try {
            const checkIn = new Date(`${newRecord.check_in_date}T${newRecord.check_in_time}`).toISOString();
            const checkOut = newRecord.check_out_time ? new Date(`${newRecord.check_in_date}T${newRecord.check_out_time}`).toISOString() : null;

            const { error } = await supabase
                .from('attendance')
                .insert([{
                    user_id: newRecord.user_id,
                    check_in: checkIn,
                    check_out: checkOut
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

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return 'Ongoing';
        const duration = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const calculateTotalTime = (records: AttendanceRecord[]) => {
        const totalMs = records.reduce((acc, curr) => {
            if (!curr.check_out) return acc;
            return acc + (new Date(curr.check_out).getTime() - new Date(curr.check_in).getTime());
        }, 0);
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const groupedAttendance = attendance.reduce((acc: { [key: string]: AttendanceRecord[] }, curr) => {
        const userId = curr.user_id;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(curr);
        return acc;
    }, {});

    const filteredUserIds = Object.keys(groupedAttendance).filter(userId => {
        const userName = groupedAttendance[userId][0].profiles?.full_name || '';
        return userName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            <StatusBar />
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
                <button onClick={() => onNavigate('CONFIG')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
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

            {/* Date Filter */}
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

            <div className="flex-1 px-4 py-6 overflow-y-auto pb-32">
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Loading...</div>
                    ) : filteredUserIds.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No records found</div>
                    ) : (
                        filteredUserIds.map((userId) => {
                            const userRecords = groupedAttendance[userId];
                            const isExpanded = expandedUser === userId;
                            const totalTime = calculateTotalTime(userRecords);
                            const lastRecord = userRecords[0];

                            return (
                                <div key={userId} className="space-y-2">
                                    <div 
                                        onClick={() => setExpandedUser(isExpanded ? null : userId)}
                                        className={`bg-slate-800/40 border p-4 rounded-2xl transition-all active:scale-[0.98] ${isExpanded ? 'border-primary/50' : 'border-slate-700/50'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-primary font-bold">
                                                    {(lastRecord.profiles?.full_name || 'U')[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{lastRecord.profiles?.full_name || 'Unknown User'}</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                        {userRecords.length} {userRecords.length === 1 ? 'Session' : 'Sessions'} today
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-1">
                                                    <span className="text-[10px] font-black text-primary uppercase">
                                                        {totalTime}
                                                    </span>
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
                                            {userRecords.map((record) => (
                                                <div key={record.id} className="bg-slate-800/20 border border-slate-700/30 p-3 rounded-xl">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                            Duration: {formatDuration(record.check_in, record.check_out)}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-rounded text-green-500 text-xs">login</span>
                                                            <div>
                                                                <p className="text-[8px] text-slate-500 font-bold uppercase">In</p>
                                                                <p className="text-[11px] font-bold">{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-rounded text-red-500 text-xs">logout</span>
                                                            <div>
                                                                <p className="text-[8px] text-slate-500 font-bold uppercase">Out</p>
                                                                <p className="text-[11px] font-bold">
                                                                    {record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Check In</label>
                                    <input 
                                        type="time"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                        value={newRecord.check_in_time}
                                        onChange={(e) => setNewRecord({ ...newRecord, check_in_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Check Out</label>
                                    <input 
                                        type="time"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                        value={newRecord.check_out_time}
                                        onChange={(e) => setNewRecord({ ...newRecord, check_out_time: e.target.value })}
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
                    <button onClick={() => onNavigate('ADMIN_SHOP')} className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-rounded">storefront</span>
                        <span className="text-[10px] font-medium">Shop</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default AdminAttendance;
