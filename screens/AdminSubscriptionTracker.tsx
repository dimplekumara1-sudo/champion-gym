import React, { useEffect, useState, useMemo } from 'react';
import { AppScreen, Profile } from '../types';
import { supabase } from '../lib/supabase';
import StatusBar from '../components/StatusBar';

const AdminSubscriptionTracker: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'nearing' | 'expired'>('all');
    const [globalGracePeriod, setGlobalGracePeriod] = useState(0);

    useEffect(() => {
        fetchUsers();
        fetchGlobalGracePeriod();
    }, []);

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

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'user')
                .eq('approval_status', 'approved')
                .order('plan_expiry_date', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRemainingDays = (expiryDate: string | null, gracePeriod: number | null) => {
        if (!expiryDate) return null;
        const now = new Date();
        const expiry = new Date(expiryDate);
        const grace = (gracePeriod !== null && gracePeriod !== undefined) ? gracePeriod : globalGracePeriod;
        
        const finalExpiry = new Date(expiry);
        finalExpiry.setDate(finalExpiry.getDate() + grace);
        
        const diffTime = finalExpiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const remaining = getRemainingDays(user.plan_expiry_date, user.grace_period);
            
            let matchesStatus = true;
            if (filterStatus === 'nearing') {
                matchesStatus = remaining !== null && remaining >= 0 && remaining <= 7;
            } else if (filterStatus === 'expired') {
                matchesStatus = remaining !== null && remaining < 0;
            }
            
            return matchesSearch && matchesStatus;
        });
    }, [users, searchTerm, filterStatus]);

    return (
        <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">
            <StatusBar />
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
                <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-primary">Subscription Tracker</h1>
                <div className="w-10" />
            </div>

            {/* Filters */}
            <div className="px-4 py-4 space-y-4 bg-slate-900/50 border-b border-white/5">
                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input 
                        type="text"
                        placeholder="Search member..."
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-10 py-2.5 text-sm focus:outline-none focus:border-primary text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2">
                    {(['all', 'nearing', 'expired'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                filterStatus === status 
                                    ? 'bg-primary text-[#090E1A]' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                        >
                            {status === 'all' ? 'All Members' : status === 'nearing' ? 'Nearing End' : 'Expired'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 px-4 py-6 overflow-y-auto pb-32">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                        <span className="material-symbols-rounded text-5xl text-slate-700 mb-4">notifications_off</span>
                        <p className="text-slate-500">No matching subscriptions found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredUsers.map((user) => {
                            const remaining = getRemainingDays(user.plan_expiry_date, user.grace_period);
                            const isExpired = remaining !== null && remaining < 0;
                            const isNearing = remaining !== null && remaining >= 0 && remaining <= 7;

                            return (
                                <div key={user.id} className={`p-4 rounded-2xl border transition-all ${
                                    isExpired ? 'bg-red-500/5 border-red-500/20' : 
                                    isNearing ? 'bg-orange-500/5 border-orange-500/20' : 
                                    'bg-slate-800/40 border-slate-700/50'
                                }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                isExpired ? 'bg-red-500/20 text-red-400' :
                                                isNearing ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-primary/20 text-primary'
                                            }`}>
                                                {(user.full_name || 'U')[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{user.full_name}</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.plan || 'No Active Plan'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black uppercase ${
                                                isExpired ? 'text-red-400' :
                                                isNearing ? 'text-orange-400' :
                                                'text-primary'
                                            }`}>
                                                {remaining === null ? 'N/A' : isExpired ? 'Expired' : `${remaining} Days Left`}
                                            </p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Status</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                        <div>
                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Expiry Date</p>
                                            <p className="text-xs font-medium text-slate-300">
                                                {user.plan_expiry_date ? new Date(user.plan_expiry_date).toLocaleDateString() : 'Not Set'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Grace Period</p>
                                            <p className="text-xs font-medium text-slate-300">
                                                {(user.grace_period !== null && user.grace_period !== undefined) ? user.grace_period : `${globalGracePeriod} (Global)`} Days
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => onNavigate('ADMIN_USERS')}
                                        className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        Renew or Edit
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSubscriptionTracker;
