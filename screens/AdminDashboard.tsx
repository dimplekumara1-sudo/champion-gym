
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppScreen } from '../types';

const AdminDashboard: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalRevenue: 42850,
    activeUsers: 0,
    newBookings: 96,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (count !== null) {
      setStats(prev => ({ ...prev, activeUsers: count }));
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#0F172A] text-slate-900 dark:text-white pb-32">
      <header className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Welcome back, Manager</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#1E293B] flex items-center justify-center relative">
          <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background-light dark:border-[#0F172A]"></span>
        </button>
      </header>

      <main className="px-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Revenue</p>
                <h2 className="text-3xl font-bold mt-1">${stats.totalRevenue.toLocaleString()}</h2>
              </div>
              <div className="bg-primary/10 p-2 rounded-lg">
                <span className="material-symbols-rounded text-primary">payments</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary text-sm font-semibold">
              <span className="material-symbols-rounded text-sm mr-1">trending_up</span>
              <span>+12.5% <span className="text-slate-400 font-normal dark:text-slate-500 ml-1 text-xs">vs last month</span></span>
            </div>
          </div>
          
          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Active Users</p>
            <h2 className="text-2xl font-bold mt-1">{stats.activeUsers}</h2>
            <div className="mt-3 flex items-center text-primary text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">trending_up</span>
              <span>4.2%</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">New Bookings</p>
            <h2 className="text-2xl font-bold mt-1">{stats.newBookings}</h2>
            <div className="mt-3 flex items-center text-primary text-xs font-semibold">
              <span className="material-symbols-rounded text-xs mr-0.5">trending_up</span>
              <span>8.1%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-white">Revenue Trend</h3>
            <select className="bg-slate-100 dark:bg-[#0F172A] border-none text-xs rounded-lg py-1 pl-2 pr-8 focus:ring-primary text-slate-600 dark:text-slate-300 outline-none">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="relative h-48 w-full">
            <div className="absolute inset-0 flex flex-col justify-between">
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
              <div className="border-b border-slate-100 dark:border-slate-800 w-full h-0"></div>
            </div>
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path d="M0,180 L40,160 L80,170 L120,130 L160,140 L200,90 L240,110 L280,60 L320,80 L360,40 L400,50 L400,200 L0,200 Z" fill="url(#gradient)"></path>
              <path d="M0,180 L40,160 L80,170 L120,130 L160,140 L200,90 L240,110 L280,60 L320,80 L360,40 L400,50" fill="none" stroke="#22C55E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
              <circle cx="200" cy="90" fill="#22C55E" r="4" stroke="white" strokeWidth="2"></circle>
              <circle cx="360" cy="40" fill="#22C55E" r="4" stroke="white" strokeWidth="2"></circle>
            </svg>
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
            <span>1 Oct</span>
            <span>8 Oct</span>
            <span>15 Oct</span>
            <span>22 Oct</span>
            <span>30 Oct</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-white">Quick Management</h3>
            <button className="text-primary text-sm font-semibold">See All</button>
          </div>
          <div className="space-y-3">
            <div 
              onClick={() => onNavigate('ADMIN_PLANS')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-blue-500 text-xl">event_available</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-white">Manage Plans</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update membership offerings</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>
            
            <div 
              onClick={() => onNavigate('ADMIN_USERS')}
              className="flex items-center p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                <span className="material-symbols-rounded text-primary text-xl">group</span>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-white">User Management</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stats.activeUsers} total members</p>
              </div>
              <span className="material-symbols-rounded text-slate-400">chevron_right</span>
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-8 py-3 pb-8 flex justify-between items-center z-50 max-w-[430px] mx-auto">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="flex flex-col items-center space-y-1 text-primary">
          <span className="material-symbols-rounded">dashboard</span>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-slate-400 dark:text-slate-500">
          <span className="material-symbols-rounded">analytics</span>
          <span className="text-[10px] font-medium">Reports</span>
        </button>
        <button onClick={() => onNavigate('DASHBOARD')} className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 -mt-10 border-4 border-background-light dark:border-[#0F172A]">
          <span className="material-symbols-rounded text-3xl">home</span>
        </button>
        <button onClick={() => onNavigate('ADMIN_USERS')} className="flex flex-col items-center space-y-1 text-slate-400 dark:text-slate-500">
          <span className="material-symbols-rounded">people</span>
          <span className="text-[10px] font-medium">Users</span>
        </button>
        <button onClick={() => onNavigate('PROFILE')} className="flex flex-col items-center space-y-1 text-slate-400 dark:text-slate-500">
          <span className="material-symbols-rounded">settings</span>
          <span className="text-[10px] font-medium">Config</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminDashboard;
