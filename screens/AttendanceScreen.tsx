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

    useEffect(() => {
        fetchAttendance();
    }, [currentMonth]);

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

    const uniqueDaysCount = useMemo(() => {
        // Since check_in is now a TIMESTAMP without timezone, it comes as 'YYYY-MM-DD HH:mm:ss'
        const filtered = selectedDate 
            ? attendance.filter(a => a.check_in.startsWith(selectedDate))
            : attendance;
        
        // Count unique dates
        const days = new Set(filtered.map(a => a.check_in.split(' ')[0]));
        return days.size;
    }, [attendance, selectedDate]);

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
                <div className="bg-primary/10 border border-primary/20 rounded-3xl p-5 mb-6 flex justify-between items-center shadow-lg shadow-primary/5">
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Days Present</p>
                        <h2 className="text-3xl font-black text-white">{uniqueDaysCount} {uniqueDaysCount === 1 ? 'Day' : 'Days'}</h2>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">
                            {selectedDate ? `Records for ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : 'For this month'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-rounded text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                    </div>
                </div>

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
                        filteredLogs.map((record) => (
                            <div key={record.id} className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-rounded">login</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">
                                            {record.check_in.split(' ')[0]}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {record.check_in.split(' ')[1].substring(0, 5)} - 
                                            {record.check_out ? record.check_out.split(' ')[1].substring(0, 5) : ' ...'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-primary uppercase">Recorded</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Entry</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
        </div>
    );
};

export default AttendanceScreen;
