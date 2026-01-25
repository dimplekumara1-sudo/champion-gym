
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminUsers: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customExpiry, setCustomExpiry] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser?.plan_expiry_date) {
      setCustomExpiry(new Date(selectedUser.plan_expiry_date).toISOString().split('T')[0]);
    } else {
      setCustomExpiry('');
    }
  }, [selectedUser]);

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

  const handleApproval = async (userId: string, currentStatus: string) => {
    try {
      const user = users.find(u => u.id === userId);
      const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
      const updateData: any = { approval_status: newStatus };
      
      if (newStatus === 'approved') {
        // Fetch plan duration
        const { data: planData } = await supabase
          .from('plans')
          .select('duration_months')
          .eq('id', user?.plan)
          .single();

        const duration = planData?.duration_months || 1;
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + duration);
        
        updateData.plan_start_date = startDate.toISOString();
        updateData.plan_expiry_date = expiryDate.toISOString();
        updateData.payment_status = 'paid';
      } else {
        updateData.plan_start_date = null;
        updateData.plan_expiry_date = null;
        updateData.payment_status = 'pending';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
    } catch (error) {
      console.error('Error updating approval status:', error);
      alert('Failed to update status');
    }
  };

  const handleSetCustomExpiry = async (userId: string, expiryDate: string) => {
    try {
      if (!expiryDate) {
        alert('Please select a date');
        return;
      }
      const isoDate = new Date(expiryDate).toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ plan_expiry_date: isoDate })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, plan_expiry_date: isoDate } : u));
      setSelectedUser({ ...selectedUser, plan_expiry_date: isoDate });
      alert('Expiry date updated successfully');
    } catch (error) {
      console.error('Error updating expiry date:', error);
      alert('Failed to update expiry date');
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const updateData: any = { role: newRole };
      
      // Admins don't need plans and have super access
      if (newRole === 'admin') {
        updateData.approval_status = 'approved';
        updateData.payment_status = 'paid';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
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
          <div 
            key={user.id} 
            onClick={() => setSelectedUser(user)}
            className="flex items-center p-4 bg-white dark:bg-[#1f2937] rounded-2xl border border-slate-100 dark:border-slate-800 group active:scale-[0.98] transition-transform shadow-sm cursor-pointer"
          >
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
                {user.plan && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider rounded">{user.plan}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <p className="text-[10px] text-slate-500">Joined {new Date(user.updated_at).toLocaleDateString()}</p>
                {user.plan_expiry_date && (
                  <p className="text-[10px] text-orange-400 font-medium">Expires {new Date(user.plan_expiry_date).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex gap-2 mt-1.5">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${user.approval_status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {user.approval_status || 'pending'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${user.payment_status === 'paid' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-400'}`}>
                  {user.payment_status || 'unpaid'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(user.id, user.approval_status);
                }}
                className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${user.approval_status === 'approved' ? 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10' : 'border-green-500/50 text-green-500 hover:bg-green-500/10'}`}
              >
                {user.approval_status === 'approved' ? 'Revoke' : 'Approve'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRole(user.id, user.role);
                }}
                className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${user.role === 'admin' ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'border-primary/50 text-primary hover:bg-primary/10'}`}
              >
                {user.role === 'admin' ? 'Demote' : 'Make Admin'}
              </button>
            </div>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="relative h-32 bg-primary/20 flex items-center justify-center">
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-rounded text-sm">close</span>
              </button>
              <div className="h-20 w-20 rounded-full bg-slate-800 border-4 border-[#1f2937] flex items-center justify-center text-primary font-bold overflow-hidden">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">{(selectedUser.full_name || 'U')[0].toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">{selectedUser.full_name || 'No Name'}</h2>
                <p className="text-slate-400 text-sm">@{selectedUser.username || 'username'}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedUser.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedUser.approval_status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                    {selectedUser.approval_status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contact & Bio</h3>
                  <div className="bg-slate-900/50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Phone</span>
                      <span className="text-white font-medium">{selectedUser.phone_number || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Gender</span>
                      <span className="text-white font-medium capitalize">{selectedUser.gender || 'Not specified'}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fitness Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Height</p>
                      <p className="text-lg font-bold text-white">{selectedUser.height || '--'} cm</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Weight</p>
                      <p className="text-lg font-bold text-white">{selectedUser.weight || '--'} kg</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Target</p>
                      <p className="text-lg font-bold text-white">{selectedUser.target_weight || '--'} kg</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Goal</p>
                      <p className="text-sm font-bold text-white capitalize">{selectedUser.goal || 'General'}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Subscription</h3>
                  <div className="bg-slate-900/50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Plan</span>
                      <span className="text-primary font-bold uppercase">{selectedUser.role === 'admin' ? 'SUPER ACCESS' : (selectedUser.plan || 'Free')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Payment</span>
                      <span className={`font-bold ${selectedUser.payment_status === 'paid' ? 'text-blue-400' : 'text-slate-500'}`}>{selectedUser.payment_status?.toUpperCase() || 'PENDING'}</span>
                    </div>
                    {selectedUser.plan_expiry_date && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Expires</span>
                        <span className="text-orange-400 font-medium">{new Date(selectedUser.plan_expiry_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Set Custom Expiry</label>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          className="flex-1 bg-slate-800 border-none rounded-xl text-xs p-2.5 text-white outline-none focus:ring-1 focus:ring-primary shadow-inner"
                          value={customExpiry}
                          onChange={(e) => setCustomExpiry(e.target.value)}
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCustomExpiry(selectedUser.id, customExpiry);
                          }}
                          className="bg-primary hover:bg-primary/90 text-slate-900 text-[10px] font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                          UPDATE
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              
              <button 
                onClick={() => setSelectedUser(null)}
                className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl mt-6 hover:bg-slate-700 transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
