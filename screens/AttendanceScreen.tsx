import React, { useEffect, useState, useMemo } from 'react';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import StatusBar from '../components/StatusBar';

interface AttendanceRecord {
    id: string;
    check_in: string;
    check_out: string | null;
    created_at: string;
}

const AttendanceScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [stats, setStats] = useState({
        planDays: 0,
        overallDays: 0
    });

    useEffect(() => {
        fetchAttendance();
        fetchGlobalStats();
    }, [currentMonth]);

    const fetchGlobalStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get profile for plan dates
            const { data: profile } = await supabase
                .from('profiles')
                .select('plan_start_date, plan_expiry_date')
                .eq('id', user.id)
                .single();

            // Fetch unique check_in dates overall
            const { data: allCheckIns } = await supabase
                .from('attendance')
                .select('check_in')
                .eq('user_id', user.id);

            if (allCheckIns) {
                // Get all unique dates as YYYY-MM-DD
                const allUniqueDates = allCheckIns.map(a => a.check_in.split(/[ T]/)[0]);
                const uniqueDatesSet = new Set(allUniqueDates);
                
                // Overall unique days
                const overallDays = uniqueDatesSet.size;

                // Plan unique days
                let planDays = 0;
                if (profile?.plan_start_date) {
                    // Normalize dates to YYYY-MM-DD for comparison
                    const startDateStr = profile.plan_start_date.split(/[ T]/)[0];
                    // If no expiry, use a far future date
                    const expiryDateStr = profile.plan_expiry_date ? profile.plan_expiry_date.split(/[ T]/)[0] : '9999-12-31';
                    
                    const planUniqueDates = new Set(allUniqueDates.filter(dateStr => {
                        return dateStr >= startDateStr && dateStr <= expiryDateStr;
                    }));
                    planDays = planUniqueDates.size;
                }

                setStats({
                    planDays,
                    overallDays
                });
            }
        } catch (error) {
            console.error('Error fetching global stats:', error);
        }
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_id', user.id)
                .gte('check_in', startOfMonth)
                .lte('check_in', endOfMonth)
                .order('check_in', { ascending: false });

            if (error) throw error;
            setAttendance(data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return 'Ongoing';
        const duration = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const getDurationInMinutes = (start: string, end: string | null) => {
        if (!end) return 0;
        return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mm = String(date.getMinutes()).padStart(2, '0');
        return {
            date: `${d}-${m}-${y}`,
            time: `${hours}:${mm} ${ampm}`
        };
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentMonth);
    const daysArray = Array.from({ length: days }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i); // Start from Monday

    const hasAttendance = (day: number) => {
        const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('en-CA'); // YYYY-MM-DD
        return attendance.some(a => a.check_in.startsWith(dateStr));
    };

    const filteredLogs = useMemo(() => {
        if (!selectedDate) return attendance;
        return attendance.filter(a => a.check_in.startsWith(selectedDate));
    }, [attendance, selectedDate]);

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            <StatusBar />
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
                <button onClick={() => onNavigate('DASHBOARD')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold">Attendance</h1>
                <div className="w-10" />
            </div>

            <div className="flex-1 px-4 py-6 overflow-y-auto pb-32">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-primary/10 border border-primary/20 rounded-3xl p-5 shadow-lg shadow-primary/5">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Plan Cycle</p>
                            <span className="material-symbols-rounded text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                        </div>
                        <h2 className="text-3xl font-black text-white">{stats.planDays}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Days Present</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall</p>
                            <span className="material-symbols-rounded text-slate-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                        </div>
                        <h2 className="text-3xl font-black text-white">{stats.overallDays}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Total Days</p>
                    </div>
                </div>

                {selectedDate && (
                    <div className="mb-6 bg-primary/5 border border-primary/10 p-3 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-rounded text-sm">event_note</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Selected Date</p>
                            <p className="text-xs font-black text-white">
                                {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Month Selector */}
                <div className="flex items-center justify-between mb-8 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                    <button 
                        onClick={() => {
                            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
                            setSelectedDate(null);
                        }}
                        className="material-symbols-rounded text-primary"
                    >
                        chevron_left
                    </button>
                    <h2 className="text-lg font-bold">
                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button 
                        onClick={() => {
                            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
                            setSelectedDate(null);
                        }}
                        className="material-symbols-rounded text-primary"
                    >
                        chevron_right
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 mb-8">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-black text-slate-500 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {emptyDays.map(i => <div key={`empty-${i}`} />)}
                        {daysArray.map(day => {
                            const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('en-CA');
                            const active = attendance.some(a => a.check_in.startsWith(dateStr));
                            const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();
                            const isSelected = selectedDate === dateStr;
                            
                            return (
                                <button 
                                    key={day} 
                                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                        isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-white/20' :
                                        active ? 'bg-primary/20 text-primary border border-primary/30' : 
                                        isToday ? 'border border-primary/50 text-primary' : 'bg-white/5 text-slate-400'
                                    }`}
                                >
                                    {day}
                                    {active && <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-primary'}`} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Detailed Logs */}
                <div className="flex items-center justify-between mb-4 ml-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Attendance Logs</h3>
                    {selectedDate && (
                        <button 
                            onClick={() => setSelectedDate(null)}
                            className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full"
                        >
                            Show All
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Loading records...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-10 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                            <span className="material-symbols-rounded text-4xl text-slate-600 mb-2">event_busy</span>
                            <p className="text-sm text-slate-500">No attendance records found</p>
                        </div>
                    ) : (
                        filteredLogs.map((record) => {
                            const checkIn = formatDateTime(record.check_in);
                            const checkOut = record.check_out ? formatDateTime(record.check_out) : null;
                            const isComplex = typeof checkIn === 'object';

                            return (
                                <div key={record.id} className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-rounded">login</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">
                                                {isComplex ? checkIn.date : record.check_in}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {isComplex ? checkIn.time : ''} - 
                                                {checkOut && typeof checkOut === 'object' ? checkOut.time : ' ...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-primary uppercase">Recorded</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase">Entry</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
        </div>
    );
};

export default AttendanceScreen;
