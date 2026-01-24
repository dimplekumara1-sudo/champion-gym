
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';

const ProfileScreen: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('SPLASH');
  };

  return (
    <div className="pb-32 min-h-screen bg-[#090E1A] text-white">
      <StatusBar />
      <header className="px-6 py-4 flex items-center justify-between">
        <button onClick={() => onNavigate('DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6">
        <section className="flex flex-col items-center mb-10 text-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-primary/20 p-1">
              <img alt="Profile" className="w-full h-full rounded-full object-cover shadow-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0kTfbmjWttqs_ihqmdrkzwyGuFol1fPqybfuMYwlPE1rXola21FABzJUGv-FzPbZvAJuiwUzpMZXl-gKr0hqUpFALLPsj0T8ONg9UWBCSftuhnJjkQjBOJBSehk7afH3p2LzXa21GZCFIppOKgKFo9j7XesCxzu_QEuVb08hTQoKUwlSMBgtog_EJ6N63mH6QYzpN_jmbNVdWNkgWgG3cJnD8gLKKPxWzefWDTdFY65fJTeBtKVLvzJgPoH-F7sysqMfcEzFtbgx_" />
            </div>
            <button className="absolute bottom-0 right-0 bg-primary text-slate-900 p-2 rounded-full shadow-lg border-4 border-[#090E1A]">
              <span className="material-symbols-rounded text-sm font-bold block">edit</span>
            </button>
          </div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">{user?.user_metadata?.full_name || 'User'}</h1>
          <p className="text-slate-500 font-bold text-sm mb-5 uppercase tracking-widest">{user?.email}</p>
          <button className="px-8 py-3 bg-[#151C2C] border border-[#1E293B] rounded-2xl text-sm font-black active:scale-95 transition-transform shadow-xl">Edit Profile</button>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-black mb-4 px-1 tracking-tight">Body Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Height', val: '178', unit: 'cm', icon: 'height' },
              { label: 'Weight', val: '72.5', unit: 'kg', icon: 'monitor_weight' },
              { label: 'BMI', val: '22.9', unit: '', icon: 'speed' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#151C2C] border border-[#1E293B] p-5 rounded-3xl flex flex-col items-center text-center shadow-lg">
                <span className="material-symbols-rounded text-primary mb-3 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{stat.label}</span>
                <span className="text-lg font-black">{stat.val}<span className="text-[11px] text-slate-500 ml-0.5">{stat.unit}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 mb-12">
          <button 
            onClick={() => onNavigate('WORKOUT_PROGRAM')}
            className="w-full flex items-center justify-between p-6 bg-primary/10 border-2 border-primary/20 rounded-3xl active:bg-primary/20 transition-all shadow-xl shadow-primary/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-rounded text-slate-950 font-black">fitness_center</span>
              </div>
              <div className="text-left">
                <span className="font-black text-white block text-lg">My Workout Program</span>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Personalised Plan</span>
              </div>
            </div>
            <span className="material-symbols-rounded text-primary font-black">chevron_right</span>
          </button>

          {[
            { label: 'Subscription Details', icon: 'card_membership', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Workout History', icon: 'history', color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: 'Settings', icon: 'settings', color: 'text-slate-400', bg: 'bg-slate-800' },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center justify-between p-5 bg-[#151C2C] rounded-[2rem] border border-[#1E293B] active:bg-[#1E293B] transition-colors shadow-lg">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl ${item.bg} flex items-center justify-center`}>
                  <span className={`material-symbols-rounded ${item.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <span className="font-black text-[15px]">{item.label}</span>
              </div>
              <span className="material-symbols-rounded text-slate-500">chevron_right</span>
            </button>
          ))}

          {profile?.role === 'admin' && (
            <button 
              onClick={() => onNavigate('ADMIN_DASHBOARD')}
              className="w-full flex items-center justify-between p-6 bg-red-500/10 border-2 border-red-500/20 rounded-3xl active:bg-red-500/20 transition-all shadow-xl shadow-red-500/5 mt-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <span className="material-symbols-rounded text-white font-black">admin_panel_settings</span>
                </div>
                <div className="text-left">
                  <span className="font-black text-white block text-lg">Admin Dashboard</span>
                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Management Suite</span>
                </div>
              </div>
              <span className="material-symbols-rounded text-red-500 font-black">chevron_right</span>
            </button>
          )}
        </section>

        <button 
          onClick={handleLogout}
          className="w-full py-5 rounded-3xl bg-red-500/10 text-red-500 font-black flex items-center justify-center gap-2 active:scale-95 transition-transform mb-12"
        >
          <span className="material-symbols-rounded font-black">logout</span>
          Logout
        </button>
      </main>
      
      <BottomNav active="STATS" onNavigate={onNavigate} />
    </div>
  );
};

export default ProfileScreen;
