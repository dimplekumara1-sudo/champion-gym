
import React from 'react';
import { AppScreen } from '../types';

const AdminPlans: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const plans = [
    { id: 'basic', name: 'Basic Plan', price: '$0', users: 842, active: true },
    { id: 'pro', name: 'Pro Membership', price: '$14.99', users: 324, active: true, popular: true },
    { id: 'elite', name: 'Elite Performance', price: '$29.99', users: 118, active: true },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#0F172A] text-slate-900 dark:text-white pb-32">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="material-symbols-rounded text-slate-400">arrow_back</button>
          <h1 className="text-xl font-bold tracking-tight">Membership Plans</h1>
        </div>
        <button className="bg-primary text-slate-900 w-8 h-8 rounded-full flex items-center justify-center">
          <span className="material-symbols-rounded text-sm font-bold">add</span>
        </button>
      </header>

      <main className="px-6 py-6 space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary px-3 py-1 rounded-bl-xl">
                <span className="text-[8px] font-black text-slate-900 uppercase">Top Seller</span>
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                <p className="text-primary font-black text-2xl">{plan.price}<span className="text-xs text-slate-500 font-medium">/mo</span></p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subscribers</span>
                <span className="text-lg font-bold text-white">{plan.users}</span>
              </div>
            </div>
            
            <div className="flex gap-2 border-t border-slate-800 pt-4">
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">Edit Plan</button>
              <button className="flex-1 border border-slate-800 text-slate-400 text-xs font-bold py-2.5 rounded-xl">View Details</button>
            </div>
          </div>
        ))}

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

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-8 py-3 pb-8 flex justify-between items-center z-50 max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center space-y-1 text-slate-400">
          <span className="material-symbols-rounded">dashboard</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-slate-400">
          <span className="material-symbols-rounded">analytics</span>
          <span className="text-[10px] font-medium">Reports</span>
        </button>
        <button onClick={() => onNavigate('DASHBOARD')} className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 -mt-10 border-4 border-[#0F172A]">
          <span className="material-symbols-rounded text-3xl">home</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_USERS')} className="flex flex-col items-center space-y-1 text-slate-400">
          <span className="material-symbols-rounded">people</span>
          <span className="text-[10px] font-medium">Users</span>
        </button>
        <button onClick={() => onNavigate('PROFILE')} className="flex flex-col items-center space-y-1 text-slate-400">
          <span className="material-symbols-rounded">settings</span>
          <span className="text-[10px] font-medium">Config</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminPlans;
