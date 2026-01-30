
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';
import { planService } from '../lib/planService';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';

const AdminUsers: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customExpiry, setCustomExpiry] = useState('');
  const [customDueDate, setCustomDueDate] = useState('');
  const [approvalModal, setApprovalModal] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', dueDate: '', method: 'cash' });
  const [showExpiredFilter, setShowExpiredFilter] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [collectionModal, setCollectionModal] = useState<any>(null);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('cash');
  const [userPaymentHistory, setUserPaymentHistory] = useState<any[]>([]);
  const [exportModal, setExportModal] = useState(false);
  const [esslId, setEsslId] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedUser?.plan_expiry_date) {
      setCustomExpiry(new Date(selectedUser.plan_expiry_date).toISOString().split('T')[0]);
      setSelectedPlan(selectedUser.plan || '');
    } else {
      setCustomExpiry('');
      setSelectedPlan('');
    }

    if (selectedUser?.payment_due_date) {
      setCustomDueDate(new Date(selectedUser.payment_due_date).toISOString().split('T')[0]);
    } else {
      setCustomDueDate('');
    }

    if (selectedUser?.id) {
      fetchUserPaymentHistory(selectedUser.id);
      setEsslId(selectedUser.essl_id || '');
    } else {
      setUserPaymentHistory([]);
      setEsslId('');
    }
  }, [selectedUser]);

  const fetchUserPaymentHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setUserPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

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

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleApproval = async (userId: string, currentStatus: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (currentStatus === 'pending') {
        // Open approval modal for confirmation
        setApprovalModal(user);
        setSelectedPlan(user.plan || '');
        setPaymentDetails({ amount: '', dueDate: '', method: 'cash' });
        return;
      }

      // Revoke approval
      const updateData: any = {
        approval_status: 'pending',
        plan_start_date: null,
        plan_expiry_date: null,
        payment_status: 'pending',
        plan_status: 'pending'
      };

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

  const handleConfirmApproval = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);

      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      const planPrice = parseFloat(selectedPlanData?.price?.toString().replace(/[^0-9.]/g, '') || '0');
      const paidAmount = parseFloat(paymentDetails.amount || '0');
      const dueAmount = planPrice > paidAmount ? planPrice - paidAmount : 0;

      if (paymentDetails.amount === '') {
        alert('Please fill in payment amount');
        return;
      }

      if (dueAmount > 0 && !paymentDetails.dueDate) {
        alert('Please set a due date for the remaining payment');
        return;
      }

      if (!paymentDetails.method) {
        alert('Please select a payment method');
        return;
      }

      const duration = selectedPlanData?.duration_months || 1;

      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + duration);

      const updateData: any = {
        plan: selectedPlan,
        approval_status: 'approved',
        payment_status: paidAmount >= planPrice ? 'paid' : 'pending',
        paid_amount: paidAmount,
        due_amount: dueAmount,
        payment_due_date: dueAmount > 0 ? paymentDetails.dueDate : null,
        payment_method: paymentDetails.method,
        plan_start_date: startDate.toISOString(),
        plan_expiry_date: expiryDate.toISOString(),
        plan_status: 'active'
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Record payment history
      if (paidAmount > 0) {
        await supabase.from('payment_history').insert({
          user_id: userId,
          amount: paidAmount,
          plan_id: selectedPlan,
          payment_method: paymentDetails.method,
          notes: 'Initial plan payment'
        });
      }

      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
      // Invalidate cache
      cache.remove(`${CACHE_KEYS.PROFILE_DATA}_expiring_notifications`);
      cache.remove(`${CACHE_KEYS.PROFILE_DATA}_expired_notifications`);

      setApprovalModal(null);
      alert('User approved successfully!');
    } catch (error) {
      console.error('Error confirming approval:', error);
      alert('Failed to approve user');
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

  const handleSetCustomDueDate = async (userId: string, dueDate: string) => {
    try {
      if (!dueDate) {
        alert('Please select a date');
        return;
      }
      const isoDate = new Date(dueDate).toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ payment_due_date: isoDate })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, payment_due_date: isoDate } : u));
      setSelectedUser({ ...selectedUser, payment_due_date: isoDate });
      alert('Payment due date updated successfully');
    } catch (error) {
      console.error('Error updating payment due date:', error);
      alert('Failed to update payment due date');
    }
  };

  const handleSetPaymentMode = async (userId: string, paymentMode: string) => {
    try {
      if (!paymentMode) {
        alert('Please select a payment mode');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ payment_method: paymentMode })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, payment_method: paymentMode } : u));
      setSelectedUser({ ...selectedUser, payment_method: paymentMode });
      alert('Payment mode updated successfully');
    } catch (error) {
      console.error('Error updating payment mode:', error);
      alert('Failed to update payment mode');
    }
  };

  const handleChangePlan = async (userId: string, newPlanId: string) => {
    try {
      if (!newPlanId) {
        alert('Please select a plan');
        return;
      }

      // Fetch the new plan details
      const selectedPlanData = plans.find(p => p.id === newPlanId);
      if (!selectedPlanData) {
        alert('Plan not found');
        return;
      }

      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Block plan change if there's a pending due amount
      if (user.due_amount > 0) {
        alert(`User has a pending due of ₹${user.due_amount}. Please collect the due amount first.`);
        return;
      }

      // Find current plan data
      const currentPlanData = plans.find(p => p.id === user.plan);

      // Calculate upgrade/renewal
      const calculation = planService.calculateUpgrade(user, currentPlanData || selectedPlanData, selectedPlanData);

      const updateData: any = {
        plan: selectedPlanData.id,
        plan_start_date: calculation.new_plan_start_date,
        plan_expiry_date: calculation.new_plan_end_date,
        due_amount: calculation.payable_amount,
        payment_status: calculation.payable_amount > 0 ? 'pending' : 'paid',
        paid_amount: 0, // Reset paid amount for new plan
        plan_status: 'active',
        approval_status: 'approved'
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Record plan change in history
      await supabase.from('payment_history').insert({
        user_id: userId,
        amount: 0,
        plan_id: selectedPlanData.id,
        payment_method: 'system',
        notes: `Plan ${calculation.upgrade_type === 'active_upgrade' ? 'upgraded' : 'renewed'} to ${selectedPlanData.name}`
      });

      // Update users list
      const updatedUsers = users.map(u =>
        u.id === userId
          ? { ...u, ...updateData }
          : u
      );
      setUsers(updatedUsers);

      // Update selected user
      const updatedSelectedUser = updatedUsers.find(u => u.id === userId);
      setSelectedUser(updatedSelectedUser);
      setSelectedPlan(newPlanId);

      alert(`Plan ${calculation.upgrade_type === 'active_upgrade' ? 'upgraded' : 'renewed'} to ${selectedPlanData.name} successfully! Due amount: ₹${calculation.payable_amount}`);
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Failed to change plan');
    }
  };

  const handleCollectPayment = async (userId: string) => {
    try {
      const amount = parseFloat(collectionAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newPaidAmount = user.paid_amount + amount;
      const newDueAmount = Math.max(0, user.due_amount - amount);

      // If due amount is now 0, status is paid
      const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'pending';

      const updateData: any = {
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        payment_status: newPaymentStatus,
        payment_due_date: newDueAmount === 0 ? null : user.payment_due_date
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Record payment history
      await supabase.from('payment_history').insert({
        user_id: userId,
        amount: amount,
        plan_id: user.plan,
        payment_method: collectionMethod,
        notes: 'Balance payment collection'
      });

      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, ...updateData });
      }

      setCollectionModal(null);
      setCollectionAmount('');
      setCollectionMethod('cash');
      alert('Payment collected successfully!');
    } catch (error) {
      console.error('Error collecting payment:', error);
      alert('Failed to collect payment');
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

  const handleUpdateEsslId = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ essl_id: esslId || null })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, essl_id: esslId || null } : u));
      setSelectedUser({ ...selectedUser, essl_id: esslId || null });
      alert('eSSL ID updated successfully');
    } catch (error) {
      console.error('Error updating eSSL ID:', error);
      alert('Failed to update eSSL ID');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Check if user is expiring soon (5 days) or expired
    const isExpiringSoon = u.plan_expiry_date &&
      new Date(u.plan_expiry_date) > new Date() &&
      new Date(u.plan_expiry_date) <= new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const isExpired = u.plan_expiry_date && new Date(u.plan_expiry_date) <= new Date();

    if (showExpiredFilter && !isExpired && !isExpiringSoon) return false;

    if (filter === 'all') return matchesSearch;
    if (filter === 'admin') return matchesSearch && u.role === 'admin';
    if (filter === 'pro') return matchesSearch && u.plan === 'pro';
    if (filter === 'pending_payment') return matchesSearch && u.payment_status === 'pending';
    return matchesSearch;
  });

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const exportToCSV = () => {
    try {
      const headers = ['Full Name', 'Email', 'Phone', 'Plan', 'Status', 'Payment Status', 'Paid Amount', 'Due Amount', 'Expiry Date', 'Role'];
      const data = filteredUsers.map(user => [
        user.full_name || '',
        user.email || '',
        user.phone_number || '',
        user.plan || 'Free',
        user.approval_status || 'pending',
        user.payment_status || 'unpaid',
        user.paid_amount || 0,
        user.due_amount || 0,
        user.plan_expiry_date ? new Date(user.plan_expiry_date).toLocaleDateString() : 'N/A',
        user.role || 'user'
      ]);

      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Data exported to CSV successfully!');
      setExportModal(false);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export data');
    }
  };

  const exportToXLSX = async () => {
    try {
      // Dynamic import for xlsx library
      const XLSX = await import('xlsx');

      const data = filteredUsers.map(user => ({
        'Full Name': user.full_name || '',
        'Email': user.email || '',
        'Phone': user.phone_number || '',
        'Plan': user.plan || 'Free',
        'Status': user.approval_status || 'pending',
        'Payment Status': user.payment_status || 'unpaid',
        'Paid Amount': user.paid_amount || 0,
        'Due Amount': user.due_amount || 0,
        'Expiry Date': user.plan_expiry_date ? new Date(user.plan_expiry_date).toLocaleDateString() : 'N/A',
        'Role': user.role || 'user'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `users_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert('Data exported to XLSX successfully!');
      setExportModal(false);
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      alert('Failed to export data. Make sure xlsx library is installed (npm install xlsx)');
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    return days > 0 && days <= 5;
  };

  const isExpired = (expiryDate: string) => {
    return getDaysUntilExpiry(expiryDate) <= 0;
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#111827] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">User Management</h1>
          <div className="flex gap-2">
            <button onClick={() => setExportModal(true)} className="bg-slate-800 text-white p-2 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors" title="Export data">
              <span className="material-symbols-rounded">download</span>
            </button>
            <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="bg-slate-800 text-white p-2 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
          </div>
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
          <button
            onClick={() => setFilter('pending_payment')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${filter === 'pending_payment' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >Pending Payment</button>
          <button
            onClick={() => setShowExpiredFilter(!showExpiredFilter)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${showExpiredFilter ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >Expiring/Expired</button>
        </div>
      </header>

      <main className="flex-1 px-5 pt-2 pb-24 overflow-y-auto no-scrollbar space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredUsers.map(user => {
          const expirySoon = user.plan_expiry_date && isExpiringSoon(user.plan_expiry_date);
          const expired = user.plan_expiry_date && isExpired(user.plan_expiry_date);
          const daysLeft = user.plan_expiry_date ? getDaysUntilExpiry(user.plan_expiry_date) : null;

          return (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`flex items-center p-4 rounded-2xl border group active:scale-[0.98] transition-transform shadow-sm cursor-pointer ${expired ? 'bg-red-500/5 border-red-500/20' : expirySoon ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white dark:bg-[#1f2937] border-slate-100 dark:border-slate-800'
                }`}
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
                  <h3 className="font-semibold text-sm text-dark dark:text-white">{user.full_name || 'No Name'}</h3>
                  {user.role === 'admin' && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-bold uppercase tracking-wider rounded">Admin</span>
                  )}
                  {user.plan && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider rounded">{user.plan}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1 items-center">
                  <p className="text-[10px] text-slate-500">Joined {new Date(user.updated_at).toLocaleDateString()}</p>
                  {user.phone_number && (
                    <a href={`tel:${user.phone_number}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-1">
                      <span className="material-symbols-rounded text-[12px]">call</span>
                      {user.phone_number}
                    </a>
                  )}
                  {user.plan_expiry_date && (
                    <p className={`text-[10px] font-medium ${expired ? 'text-red-500' : expirySoon ? 'text-orange-500' : 'text-slate-500'}`}>
                      {expired ? 'EXPIRED' : expirySoon ? `Expires in ${daysLeft} days` : `Expires ${new Date(user.plan_expiry_date).toLocaleDateString()}`}
                    </p>
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
          )
        })}
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

      {/* Approval Confirmation Modal */}
      {approvalModal && (() => {
        const selectedPlanData = plans.find(p => p.id === selectedPlan);
        const planPrice = parseFloat(selectedPlanData?.price?.toString().replace(/[^0-9.]/g, '') || '0');
        const paidAmount = parseFloat(paymentDetails.amount) || 0;
        const dueAmount = planPrice - paidAmount;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[101] flex items-center justify-center p-6">
            <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
              <div className="p-6 max-h-[90vh] overflow-y-auto no-scrollbar">
                <h2 className="text-xl font-bold text-white mb-4">Approve User: {approvalModal.full_name}</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Plan</label>
                      {approvalModal.plan && (
                        <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">
                          User's Choice: {approvalModal.plan}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlan(plan.id);
                            // Default paid amount to total price for convenience
                            const priceStr = plan.price.toString().replace(/[^0-9.]/g, '');
                            setPaymentDetails({ ...paymentDetails, amount: priceStr });
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold transition-all text-center border ${selectedPlan === plan.id
                            ? 'bg-primary text-slate-900 border-primary shadow-lg shadow-primary/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                        >
                          <p className="font-bold">{plan.name}</p>
                          <p className="text-[9px] opacity-75">{plan.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Amount</label>
                      <p className="text-lg font-black text-white">
                        {selectedPlanData?.price || '0'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Due Amount</label>
                      <p className={`text-lg font-black ${dueAmount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                        {dueAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {['cash', 'upi', 'card'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentDetails({ ...paymentDetails, method })}
                          className={`p-3 rounded-xl font-semibold text-sm transition-all ${paymentDetails.method === method
                            ? 'bg-primary text-slate-900 shadow-lg shadow-primary/50'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="material-symbols-rounded text-base">
                              {method === 'cash' ? 'payments' : method === 'upi' ? 'phone_android' : 'credit_card'}
                            </span>
                            <span className="text-xs uppercase capitalize">{method === 'upi' ? 'UPI' : method}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid</label>
                      <input
                        type="number"
                        placeholder="Amount"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl text-sm p-2.5 text-white outline-none focus:ring-2 focus:ring-primary mt-1"
                        value={paymentDetails.amount}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: e.target.value })}
                      />
                    </div>

                    {dueAmount > 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                        <input
                          type="date"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl text-sm p-2.5 text-white outline-none focus:ring-2 focus:ring-primary mt-1"
                          value={paymentDetails.dueDate}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, dueDate: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Plan expires: {new Date(Date.now() + (selectedPlanData?.duration_months || 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setApprovalModal(null)}
                    className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmApproval(approvalModal.id)}
                    className="flex-1 bg-primary text-slate-900 font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{selectedUser.phone_number || 'Not provided'}</span>
                        {selectedUser.phone_number && (
                          <a
                            href={`tel:${selectedUser.phone_number}`}
                            className="text-primary hover:text-green-600 transition-colors"
                          >
                            <span className="material-symbols-rounded text-sm">call</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Gender</span>
                      <span className="text-white font-medium capitalize">{selectedUser.gender || 'Not specified'}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">eSSL Biometric</h3>
                  <div className="bg-slate-900/50 rounded-2xl p-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Device User ID</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl text-sm p-2.5 text-white outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter eSSL ID"
                          value={esslId}
                          onChange={(e) => setEsslId(e.target.value)}
                        />
                        <button
                          onClick={() => handleUpdateEsslId(selectedUser.id)}
                          className="bg-primary text-slate-900 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-transform"
                        >
                          SAVE
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 italic">Mapping ID from biometric device to this member.</p>
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

                    {selectedUser.role !== 'admin' && (
                      <div className="border-t border-slate-800 pt-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Change Plan</label>
                        <div className="grid grid-cols-2 gap-2">
                          {plans.map((plan) => (
                            <button
                              key={plan.id}
                              onClick={() => handleChangePlan(selectedUser.id, plan.id)}
                              className={`p-3 rounded-xl text-xs font-semibold transition-all text-center ${selectedPlan === plan.id
                                ? 'bg-primary text-slate-900 shadow-lg shadow-primary/50'
                                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                                }`}
                            >
                              <p className="font-bold">{plan.name}</p>
                              <p className="text-[9px] opacity-75">{plan.price}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Status</span>
                      <span className={`font-bold uppercase text-[10px] ${selectedUser.plan_status === 'expired' ? 'text-red-500' :
                        selectedUser.plan_status === 'active' ? 'text-green-500' :
                          selectedUser.plan_status === 'upcoming' ? 'text-blue-500' :
                            'text-slate-400'
                        }`}>{selectedUser.plan_status || 'Free'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Payment</span>
                      <span className={`font-bold ${selectedUser.payment_status === 'paid' ? 'text-blue-400' : 'text-slate-500'}`}>{selectedUser.payment_status?.toUpperCase() || 'PENDING'}</span>
                    </div>

                    <div className="border-t border-slate-800 my-2 pt-2 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Total Plan Amount</span>
                        <span className="text-white font-bold">{(selectedUser.paid_amount + selectedUser.due_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Amount Paid</span>
                        <span className="text-green-400 font-medium">{selectedUser.paid_amount.toFixed(2)}</span>
                      </div>
                      {selectedUser.due_amount > 0 && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Due Amount</span>
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 font-medium">{selectedUser.due_amount.toFixed(2)}</span>
                              <button
                                onClick={() => {
                                  setCollectionModal(selectedUser);
                                  setCollectionAmount(selectedUser.due_amount.toString());
                                }}
                                className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded hover:bg-primary/30 transition-colors"
                              >
                                PAY
                              </button>
                            </div>
                          </div>
                          {selectedUser.payment_due_date && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-400">Payment Due Date</span>
                              <span className="text-orange-400 font-medium">{new Date(selectedUser.payment_due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedUser.due_amount === 0 && selectedUser.plan_expiry_date && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Plan Expiry Date</span>
                          <span className="text-blue-400 font-medium">{new Date(selectedUser.plan_expiry_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

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

                    {selectedUser.due_amount > 0 && (
                      <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Edit Payment Due Date</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="flex-1 bg-slate-800 border-none rounded-xl text-xs p-2.5 text-white outline-none focus:ring-1 focus:ring-primary shadow-inner"
                            value={customDueDate}
                            onChange={(e) => setCustomDueDate(e.target.value)}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetCustomDueDate(selectedUser.id, customDueDate);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                          >
                            EXTEND
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Payment History</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                    {userPaymentHistory.length > 0 ? (
                      userPaymentHistory.map((history) => (
                        <div key={history.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-white">{history.notes || 'Payment'}</p>
                            <p className="text-[9px] text-slate-500 uppercase">{new Date(history.payment_date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-primary">₹{history.amount}</p>
                            <p className="text-[8px] text-slate-400 uppercase">{history.payment_method}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500 italic text-center py-2">No payment history found</p>
                    )}
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

      {/* Collect Payment Modal */}
      {collectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">Collect Payment</h2>
              <p className="text-slate-400 text-sm mb-6">Enter the amount collected from {collectionModal.full_name}</p>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount to Collect</label>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Due: {collectionModal.due_amount.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold p-4 text-white outline-none focus:ring-2 focus:ring-primary"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cash', 'upi', 'card'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setCollectionMethod(mode)}
                        className={`p-3 rounded-xl font-semibold text-sm transition-all ${collectionMethod === mode
                          ? 'bg-primary text-slate-900 shadow-lg shadow-primary/50'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="material-symbols-rounded text-base">
                            {mode === 'cash' ? 'payments' : mode === 'upi' ? 'phone_android' : 'credit_card'}
                          </span>
                          <span className="text-xs uppercase">{mode === 'upi' ? 'UPI' : mode}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCollectionModal(null);
                    setCollectionAmount('');
                  }}
                  className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCollectPayment(collectionModal.id)}
                  className="flex-1 bg-primary text-slate-900 font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">Export Data</h2>
              <p className="text-slate-400 text-sm mb-6">Select format to export {filteredUsers.length} users</p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={exportToCSV}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-3 border border-slate-700"
                >
                  <span className="material-symbols-rounded">description</span>
                  <div className="text-left">
                    <p className="text-sm font-bold">Export as CSV</p>
                    <p className="text-xs text-slate-400">Compatible with Excel & spreadsheets</p>
                  </div>
                </button>
                <button
                  onClick={exportToXLSX}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-3 border border-slate-700"
                >
                  <span className="material-symbols-rounded">table_chart</span>
                  <div className="text-left">
                    <p className="text-sm font-bold">Export as XLSX</p>
                    <p className="text-xs text-slate-400">Formatted Excel spreadsheet</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setExportModal(false)}
                className="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
