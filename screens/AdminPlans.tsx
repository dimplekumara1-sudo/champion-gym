
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminPlans: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [viewingPlan, setViewingPlan] = useState<any>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          name: editingPlan.name,
          price: editingPlan.price.startsWith('₹') ? editingPlan.price : `₹${editingPlan.price}`,
          popular: editingPlan.popular,
          duration_months: parseInt(editingPlan.duration_months) || 1,
          description: editingPlan.description,
          features: typeof editingPlan.features === 'string' ? editingPlan.features.split('\n').filter((f: string) => f.trim() !== '') : editingPlan.features
        })
        .eq('id', editingPlan.id);

      if (error) throw error;
      setPlans(plans.map(p => p.id === editingPlan.id ? {
        ...editingPlan,
        price: editingPlan.price.startsWith('₹') ? editingPlan.price : `₹${editingPlan.price}`,
        features: typeof editingPlan.features === 'string' ? editingPlan.features.split('\n').filter((f: string) => f.trim() !== '') : editingPlan.features
      } : p));
      setEditingPlan(null);
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update plan');
    }
  };

  const handleCreatePlan = async () => {
    try {
      if (!editingPlan.id) {
        alert('Plan ID is required');
        return;
      }
      const { error } = await supabase
        .from('plans')
        .insert([{
          id: editingPlan.id.toLowerCase().replace(/\s+/g, '-'),
          name: editingPlan.name,
          price: editingPlan.price.startsWith('₹') ? editingPlan.price : `₹${editingPlan.price}`,
          popular: editingPlan.popular,
          duration_months: parseInt(editingPlan.duration_months) || 1,
          description: editingPlan.description,
          features: typeof editingPlan.features === 'string' ? editingPlan.features.split('\n').filter((f: string) => f.trim() !== '') : []
        }]);

      if (error) throw error;
      fetchPlans();
      setEditingPlan(null);
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Failed to create plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setPlans(plans.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan');
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#0F172A] text-slate-900 dark:text-white pb-20">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded text-slate-400">arrow_back</button>
          <h1 className="text-xl font-bold tracking-tight">Membership Plans</h1>
        </div>
        <button
          onClick={() => setEditingPlan({ isNew: true, id: '', name: '', price: '', popular: false, duration_months: 1, description: '', features: '' })}
          className="bg-primary text-slate-900 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="material-symbols-rounded text-sm font-bold">add</span>
        </button>
      </header>

      <main className="px-6 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : plans.map(plan => (
          <div key={plan.id} className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary px-3 py-1 rounded-bl-xl">
                <span className="text-[8px] font-black text-slate-900 uppercase">Top Seller</span>
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                <p className="text-primary font-black text-2xl">{plan.price}<span className="text-xs text-slate-500 font-medium">/{plan.duration_months === 1 ? 'mo' : `${plan.duration_months}m`}</span></p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ID</span>
                <span className="text-lg font-bold text-white capitalize">{plan.id}</span>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setEditingPlan({ ...plan, features: plan.features ? plan.features.join('\n') : '' })}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Edit Plan
              </button>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <span className="material-symbols-rounded text-sm">delete</span>
              </button>
              <button className="flex-1 border border-slate-800 text-slate-400 text-xs font-bold py-2.5 rounded-xl">View Details</button>
            </div>
          </div>
        ))}

        {/* Edit Modal */}
        {editingPlan && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-[#1E293B] w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl font-bold mb-4">{editingPlan.isNew ? 'Create New Plan' : `Edit ${editingPlan.name}`}</h2>
              <div className="space-y-4">
                {editingPlan.isNew && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Plan ID (unique-slug)</label>
                    <input
                      className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 focus:ring-1 focus:ring-primary text-white"
                      value={editingPlan.id}
                      onChange={e => setEditingPlan({ ...editingPlan, id: e.target.value })}
                      placeholder="e.g. pro-yearly"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Plan Name</label>
                  <input
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 focus:ring-1 focus:ring-primary text-white"
                    value={editingPlan.name}
                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Price (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 pl-7 focus:ring-1 focus:ring-primary text-white"
                      value={editingPlan.price.replace('₹', '')}
                      onChange={e => setEditingPlan({ ...editingPlan, price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Duration (Months)</label>
                  <select
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 focus:ring-1 focus:ring-primary text-white"
                    value={editingPlan.duration_months}
                    onChange={e => setEditingPlan({ ...editingPlan, duration_months: parseInt(e.target.value) })}
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 focus:ring-1 focus:ring-primary text-white h-20"
                    value={editingPlan.description || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    placeholder="Plan description..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Features (One per line)</label>
                  <textarea
                    className="w-full bg-slate-900 border-none rounded-xl mt-1 text-sm p-3 focus:ring-1 focus:ring-primary text-white h-32"
                    value={editingPlan.features || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, features: e.target.value })}
                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="popular"
                    checked={editingPlan.popular}
                    onChange={e => setEditingPlan({ ...editingPlan, popular: e.target.checked })}
                    className="rounded text-primary focus:ring-primary bg-slate-900 border-none"
                  />
                  <label htmlFor="popular" className="text-sm font-bold text-slate-300">Mark as Popular</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={editingPlan.isNew ? handleCreatePlan : handleUpdatePlan}
                  className="flex-1 bg-primary text-slate-900 font-bold py-3 rounded-xl text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-rounded text-primary">analytics</span>
            </div>
            <h4 className="font-bold">Subscription Insights</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Pro Membership has seen a <span className="text-primary font-bold">+15% growth</span> in the last 30 days. Consider offering a yearly discount to maintain momentum.
          </p>
          <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">View Analytics</button>
        </div>
      </main>
    </div>
  );
};

export default AdminPlans;
