
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminUsers: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'admin') return matchesSearch && u.role === 'admin';
    if (filter === 'pro') return matchesSearch && u.plan === 'pro';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#111827] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">User Management</h1>
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="bg-slate-800 text-white p-2 rounded-full flex items-center justify-center">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
        </div>
        <div className="relative mb-4">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-slate-900 dark:text-slate-100"
            placeholder="Search members..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >All Users</button>
          <button
            onClick={() => setFilter('admin')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${filter === 'admin' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >Admins</button>
          <button
            onClick={() => setFilter('pro')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${filter === 'pro' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >Pro Members</button>
        </div>
      </header>

      <main className="flex-1 px-5 pt-2 pb-24 overflow-y-auto no-scrollbar space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredUsers.map(user => (
          <div key={user.id} className="flex items-center p-4 bg-white dark:bg-[#1f2937] rounded-2xl border border-slate-100 dark:border-slate-800 group active:scale-[0.98] transition-transform shadow-sm">
            <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-primary font-bold overflow-hidden mr-4 border-2 border-primary/20">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl">{(user.full_name || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-dark">{user.full_name || 'No Name'}</h3>
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-bold uppercase tracking-wider rounded">Admin</span>
                )}
                {user.plan === 'pro' && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider rounded">Pro</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Joined {new Date(user.updated_at).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => toggleRole(user.id, user.role)}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${user.role === 'admin' ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'border-primary/50 text-primary hover:bg-primary/10'}`}
            >
              {user.role === 'admin' ? 'Demote' : 'Make Admin'}
            </button>
          </div>
        ))}
      </main>

      <nav className="fixed bottom-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-8 pt-3 px-6 max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
        <div className="flex justify-between items-center">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-rounded">dashboard</span>
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button onClick={() => onNavigate('ADMIN_USERS')} className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-rounded">people_alt</span>
            <span className="text-[10px] font-medium">Members</span>
          </button>
          <button onClick={() => onNavigate('PROFILE')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-rounded">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AdminUsers;
