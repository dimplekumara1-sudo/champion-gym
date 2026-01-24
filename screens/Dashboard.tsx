
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';

const Dashboard: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ height: 0, weight: 0, target_weight: 0 });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      if (data) {
        setEditData({
          height: data.height || 170,
          weight: data.weight || 70,
          target_weight: data.target_weight || 65
        });
      }
    }
  };

  const calculateBMI = (w: number, h: number) => {
    if (!w || !h) return 0;
    const heightInMeters = h / 100;
    return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi === 0) return 'Unknown';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Healthy';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          height: editData.height,
          weight: editData.weight,
          target_weight: editData.target_weight,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setProfile({ ...profile, ...editData });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const bmi = calculateBMI(profile?.weight, profile?.height);
  const weightToGoal = profile?.target_weight ? (profile.weight - profile.target_weight).toFixed(1) : '0';
  const goalProgress = profile?.target_weight ? Math.min(100, Math.max(0, (1 - (Math.abs(profile.weight - profile.target_weight) / 10)) * 100)) : 0;

  const firstName = (profile?.full_name || user?.user_metadata?.full_name || 'User').split(' ')[0];

  return (
    <div className="min-h-screen bg-[#090E1A] pb-32">
      <StatusBar />
      
      <main className="px-5">
        <header className="flex items-center justify-between py-4 mb-2">
          <div>
            <p className="text-slate-400 text-[13px] font-medium">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-11 h-11 rounded-full bg-slate-800/60 flex items-center justify-center text-primary active:scale-95 transition-transform">
              <span className="material-symbols-rounded font-bold">qr_code_scanner</span>
            </button>
            <button 
              onClick={() => onNavigate('PROFILE')}
              className="relative active:scale-95 transition-transform"
            >
              <img 
                alt="Profile" 
                className="w-11 h-11 rounded-full border-2 border-primary/20 object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0kTfbmjWttqs_ihqmdrkzwyGuFol1fPqybfuMYwlPE1rXola21FABzJUGv-FzPbZvAJuiwUzpMZXl-gKr0hqUpFALLPsj0T8ONg9UWBCSftuhnJjkQjBOJBSehk7afH3p2LzXa21GZCFIppOKgKFo9j7XesCxzu_QEuVb08hTQoKUwlSMBgtog_EJ6N63mH6QYzpN_jmbNVdWNkgWgG3cJnD8gLKKPxWzefWDTdFY65fJTeBtKVLvzJgPoH-F7sysqMfcEzFtbgx_"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-[#090E1A] rounded-full"></div>
            </button>
          </div>
        </header>

        {/* Membership Status */}
        <div className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-3xl mb-4 flex items-center justify-between shadow-xl shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-rounded text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Membership Status</p>
              <h3 className="text-sm font-bold text-white">Active - Pro Plan</h3>
            </div>
          </div>
          <span className="material-symbols-rounded text-slate-500 text-lg">chevron_right</span>
        </div>

        {/* BMI & Weight Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-3xl flex flex-col items-center shadow-lg relative">
            <div className="w-full flex justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BMI Status</span>
              <div className="flex flex-col gap-1">
                <span className="material-symbols-rounded text-[16px] text-slate-500">info</span>
                <button onClick={() => setIsEditModalOpen(true)} className="material-symbols-rounded text-[16px] text-primary active:scale-110 transition-transform">edit</button>
              </div>
            </div>
            <div className="relative w-24 h-14 flex items-end justify-center overflow-hidden">
              <div className="absolute w-20 h-20 border-[6px] border-slate-800 rounded-full top-0"></div>
              <div 
                className="absolute w-20 h-20 border-[6px] border-primary rounded-full top-0" 
                style={{ 
                  clipPath: `inset(0 ${100 - Math.min(100, (bmi / 40) * 100)}% 0 0)`,
                  transform: 'rotate(-45deg)'
                }}
              ></div>
              <span className="text-xl font-bold z-10 pb-0.5">{bmi || '0.0'}</span>
            </div>
            <span className="mt-2 text-[10px] font-bold text-primary py-1 px-4 bg-primary/10 rounded-full uppercase tracking-tight">
              {getBMICategory(bmi)}
            </span>
          </div>

          <div className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-3xl flex flex-col items-center shadow-lg">
            <div className="w-full flex justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight Goal</span>
              <span className="material-symbols-rounded text-[16px] text-slate-500">trending_down</span>
            </div>
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90">
                <circle className="text-slate-800" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" strokeWidth="5"></circle>
                <circle 
                  className="text-primary" cx="32" cy="32" fill="transparent" r="28" 
                  stroke="currentColor" strokeDasharray="176" 
                  strokeDashoffset={176 - (176 * goalProgress) / 100} 
                  strokeLinecap="round" strokeWidth="5"
                ></circle>
              </svg>
              <div className="absolute text-center">
                <span className="text-sm font-bold block leading-none">{profile?.weight || 0}</span>
                <span className="text-[9px] text-slate-500 font-medium">kg</span>
              </div>
            </div>
            <p className="mt-1.5 text-[9px] text-slate-400 text-center font-medium">{weightToGoal}kg to goal ({profile?.target_weight || 0}kg)</p>
          </div>
        </div>

        {/* Calorie Tracker Card */}
        <button 
          onClick={() => onNavigate('DAILY_TRACKER')}
          className="w-full text-left bg-[#151C2C] border border-[#1E293B] p-5 rounded-3xl mb-4 shadow-xl active:scale-[0.98] transition-transform"
        >
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-1 uppercase tracking-wider">Today's Calories</h3>
              <p className="text-4xl font-extrabold text-white">1,840 <span className="text-xs font-medium text-slate-500">/ 2200 kcal</span></p>
            </div>
            <div className="flex gap-1 items-end h-12 pt-2">
              <div className="w-2.5 bg-slate-800 rounded-full h-[40%]"></div>
              <div className="w-2.5 bg-slate-800 rounded-full h-[60%]"></div>
              <div className="w-2.5 bg-slate-800 rounded-full h-[55%]"></div>
              <div className="w-2.5 bg-slate-800 rounded-full h-[85%]"></div>
              <div className="w-2.5 bg-primary rounded-full h-full shadow-[0_0_12px_rgba(34,197,94,0.4)]"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[#1E293B] pt-4">
            <div className="text-center bg-slate-800/30 py-2 rounded-xl">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Carbs</p>
              <p className="text-xs font-bold text-primary">142g</p>
            </div>
            <div className="text-center bg-slate-800/30 py-2 rounded-xl">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Protein</p>
              <p className="text-xs font-bold text-primary">110g</p>
            </div>
            <div className="text-center bg-slate-800/30 py-2 rounded-xl">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Fats</p>
              <p className="text-xs font-bold text-primary">58g</p>
            </div>
          </div>
        </button>

        {/* PT Session Card */}
        <div className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider">Upcoming PT Session</h3>
            <button className="text-[11px] font-bold text-primary uppercase tracking-tighter hover:underline">View Schedule</button>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
            <img 
              alt="Trainer" 
              className="w-11 h-11 rounded-xl object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxKi-8oL81giM-Bx-bk8rF5_93Jn3vYePYQpcFGPRCKgFT3wQutvrmvzQbq3VJufEpdILPZz-iannbJVMUQR-r-korKOaIoWf2gE2Q_il-skxN6ESzgI-987MyqQZdg7sMkRJ6MCBU1g_18k30OtyhLRhv4IgkfjhjD5nyDvwIZyPw-2e1ITVF0AtqjgOT2HzNsvgJKIZvJyKij7jYm5bpz-aHn_ruREy2nxIbq_ek6K3k5FqyItcIWbhx2vGrDhcfKHZ8CmHSyLwJ"
            />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Sarah Williams</h4>
              <p className="text-[11px] text-slate-400 font-medium">Strength & Conditioning</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">14:30</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Today</p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav active="HOME" onNavigate={onNavigate} />
      
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-[380px] bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold">Update Stats</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time health tracking</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Height (cm)</label>
                  <span className="text-lg font-black text-primary">{editData.height}</span>
                </div>
                <input 
                  type="range" min="120" max="230" 
                  value={editData.height} 
                  onChange={(e) => setEditData({...editData, height: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Weight (kg)</label>
                  <span className="text-lg font-black text-primary">{editData.weight}</span>
                </div>
                <input 
                  type="range" min="30" max="200" 
                  value={editData.weight} 
                  onChange={(e) => setEditData({...editData, weight: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Weight (kg)</label>
                  <span className="text-lg font-black text-primary">{editData.target_weight}</span>
                </div>
                <input 
                  type="range" min="30" max="200" 
                  value={editData.target_weight} 
                  onChange={(e) => setEditData({...editData, target_weight: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <button 
              onClick={handleUpdateProfile}
              className="w-full bg-primary text-slate-900 font-bold py-5 rounded-2xl mt-10 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Save Changes</span>
              <span className="material-symbols-rounded">check</span>
            </button>
          </div>
        </div>
      )}

      {/* Visual background glows */}
      <div className="fixed top-0 right-0 -z-10 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
    </div>
  );
};

export default Dashboard;
