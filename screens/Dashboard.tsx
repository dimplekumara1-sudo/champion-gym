
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { AppScreen, Profile } from '../types';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
import { notificationService, PlanNotification } from '../lib/notifications';

const Dashboard: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [currentProgram, setCurrentProgram] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editData, setEditData] = useState({ height: 0, weight: 0, target_weight: 0 });
  const [notifications, setNotifications] = useState<PlanNotification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    fetchProfile();

    // Set up real-time subscription for profile updates
    const setupSubscription = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const subscription = supabase
          .channel(`profile_${authUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${authUser.id}`
            },
            () => {
              // Invalidate cache and refetch when profile changes
              cache.remove(CACHE_KEYS.PROFILE_DATA);
              cache.remove(`${CACHE_KEYS.PROFILE_DATA}_plan`);
              fetchProfile();
            }
          )
          .subscribe();

        return subscription;
      }
    };

    let subscription: any;
    setupSubscription().then((sub) => {
      subscription = sub;
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      // Always fetch fresh profile data from Supabase for payment status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Fetch notifications
        const userNotifications = await notificationService.getUserNotifications(user.id);
        setNotifications(userNotifications);

        setEditData({
          height: profileData.height || 170,
          weight: profileData.weight || 70,
          target_weight: profileData.target_weight || 65
        });

        if (profileData.plan) {
          // Always fetch fresh plan details to ensure upgrades are reflected
          const { data: planData } = await supabase
            .from('plans')
            .select('*')
            .eq('id', profileData.plan)
            .single();
          if (planData) {
            setPlanDetails(planData);
          }
        }

        // Fetch current program
        let cachedProgram = cache.get(CACHE_KEYS.USER_PROGRAMS);
        if (!cachedProgram) {
          const { data: programData } = await supabase
            .from('user_programs')
            .select('*, workouts(*)')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

          if (programData && programData.length > 0) {
            setCurrentProgram(programData[0]);
            cache.set(CACHE_KEYS.USER_PROGRAMS, programData[0], CACHE_TTL.MEDIUM);
          }
        } else {
          setCurrentProgram(cachedProgram);
        }
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

  const daysUntilExpiry = profile?.plan_expiry_date
    ? Math.ceil((new Date(profile.plan_expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const showExpiryAlert = daysUntilExpiry !== null && daysUntilExpiry <= 5 && daysUntilExpiry >= 0;
  const showPaymentAlert = (profile?.payment_status === 'pending' || profile?.payment_status === 'unpaid') && profile?.due_amount > 0;

  return (
    <div className="min-h-screen bg-[#090E1A] pb-32">
      <StatusBar />
      <Header
        onProfileClick={() => onNavigate('PROFILE')}
        notifications={notifications}
        onNotificationsClick={() => setShowNotificationsModal(true)}
      />

      <main className="px-5">
        <div className="py-3 mb-2">
          <p className="text-slate-400 text-[13px] font-medium">Welcome back,</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
        </div>

        {/* Notifications / Alerts */}
        {(showExpiryAlert || showPaymentAlert) && (
          <div className="flex flex-col gap-3 mb-6">
            {showExpiryAlert && (
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-3xl flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <span className="material-symbols-rounded">warning</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-orange-400">Plan Expiring Soon</h4>
                  <p className="text-[11px] text-orange-500/80 font-medium">Your {planDetails?.name} plan expires in {daysUntilExpiry} days. Renew now!</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {profile?.due_amount > 0 && (
                    <span className="text-[10px] font-black text-orange-500">DUE: ₹{profile.due_amount}</span>
                  )}
                  <button
                    onClick={() => onNavigate('PROFILE')}
                    className="bg-orange-500 text-[#090E1A] text-[10px] font-black px-4 py-2 rounded-xl"
                  >
                    RENEW
                  </button>
                </div>
              </div>
            )}
            {showPaymentAlert && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                  <span className="material-symbols-rounded">payments</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-400">Payment Required</h4>
                  <p className="text-[11px] text-red-500/80 font-medium">Please complete your payment to avoid service interruption.</p>
                </div>
                <button
                  className="bg-red-500 text-white text-[10px] font-black px-4 py-2 rounded-xl"
                >
                  PAY NOW
                </button>
              </div>
            )}
          </div>
        )}

        {/* Membership Status */}
        <button
          onClick={() => setIsPlanModalOpen(true)}
          className="w-full bg-[#151C2C] border border-[#1E293B] p-4 rounded-3xl mb-4 flex items-center justify-between shadow-xl shadow-black/20 text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-rounded text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Membership Status</p>
              <h3 className="text-sm font-bold text-white">
                {profile?.approval_status === 'approved' ? 'Active' : 'Pending'} - {planDetails?.name || 'Basic'}
              </h3>
            </div>
          </div>
          <span className="material-symbols-rounded text-slate-500 text-lg">chevron_right</span>
        </button>

        {/* BMI & Weight Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#151C2C] border border-[#1E293B] p-5 rounded-3xl flex flex-col items-center shadow-lg relative">
            <div className="w-full flex justify-between items-start mb-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BMI Status</span>
              <div className="flex gap-2">
                <span className="material-symbols-rounded text-[16px] text-slate-500">info</span>
                <button onClick={() => setIsEditModalOpen(true)} className="material-symbols-rounded text-[16px] text-primary active:scale-110 transition-transform">edit</button>
              </div>
            </div>
            <div className="relative w-28 h-28 flex items-center justify-center mb-4">
              <svg className="w-full h-full -rotate-90 drop-shadow-lg">
                <circle className="text-slate-800/60" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="7"></circle>
                <circle
                  className="text-primary transition-all duration-500" cx="56" cy="56" fill="transparent" r="48"
                  stroke="currentColor" strokeDasharray="302"
                  strokeDashoffset={302 - (302 * Math.min(100, (bmi / 40) * 100)) / 100}
                  strokeLinecap="round" strokeWidth="7"
                ></circle>
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black block leading-none text-white">{bmi || '0.0'}</span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-primary py-2 px-5 bg-primary/15 rounded-full uppercase tracking-tight border border-primary/30">
              {getBMICategory(bmi)}
            </span>
          </div>

          <div className="bg-[#151C2C] border border-[#1E293B] p-5 rounded-3xl flex flex-col items-center shadow-lg">
            <div className="w-full flex justify-between items-start mb-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight Goal</span>
              <span className="material-symbols-rounded text-[16px] text-slate-500">trending_down</span>
            </div>
            <div className="relative flex items-center justify-center mb-4">
              <svg className="w-28 h-28 -rotate-90 drop-shadow-lg">
                <circle className="text-slate-800/60" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="7"></circle>
                <circle
                  className="text-primary transition-all duration-500" cx="56" cy="56" fill="transparent" r="48"
                  stroke="currentColor" strokeDasharray="302"
                  strokeDashoffset={302 - (302 * goalProgress) / 100}
                  strokeLinecap="round" strokeWidth="7"
                ></circle>
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black block leading-none text-white">{profile?.weight || 0}</span>
                <span className="text-[11px] text-slate-400 font-bold">kg</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center font-medium">{weightToGoal}kg to goal <br />({profile?.target_weight || 0}kg)</p>
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

        {/* Current Workout Card */}
        {currentProgram ? (
          <button
            onClick={() => onNavigate('WORKOUT_PROGRAM')}
            className="w-full text-left bg-primary/10 border border-primary/20 p-5 rounded-[2.5rem] mb-4 shadow-xl active:scale-[0.98] transition-transform group"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="bg-primary text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Current Program</span>
              <span className="material-symbols-rounded text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{currentProgram.workouts?.name}</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-4">Week {currentProgram.week_number} • Day {currentProgram.day_of_week}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-primary shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">33% Done</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('EXPLORE')}
            className="w-full text-left bg-slate-800/40 border border-slate-700/30 p-5 rounded-[2.5rem] mb-4 shadow-xl active:scale-[0.98] transition-transform flex items-center justify-between group"
          >
            <div>
              <h3 className="text-lg font-bold text-white mb-1">No active program</h3>
              <p className="text-xs text-slate-400">Browse the catalog for your next goal</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <span className="material-symbols-rounded">explore</span>
            </div>
          </button>
        )}

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 ml-2">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => onNavigate('GYM_CATALOG')}
              className="bg-[#151C2C] border border-[#1E293B] p-3 rounded-3xl flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <span className="material-symbols-rounded">menu_book</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300">Catalog</span>
            </button>
            <button
              onClick={() => onNavigate('CREATE_WORKOUT')}
              className="bg-[#151C2C] border border-[#1E293B] p-3 rounded-3xl flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-rounded">add_circle</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300">Create</span>
            </button>
            <button
              onClick={() => onNavigate('WORKOUT_HISTORY')}
              className="bg-[#151C2C] border border-[#1E293B] p-3 rounded-3xl flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <span className="material-symbols-rounded">history</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300">History</span>
            </button>
            <button
              onClick={() => onNavigate('ORDER_HISTORY')}
              className="bg-[#151C2C] border border-[#1E293B] p-3 rounded-3xl flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <span className="material-symbols-rounded">package_2</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300">Orders</span>
            </button>
          </div>
        </section>

        {/* PT Session Card */}
        <div className="bg-[#151C2C] border border-[#1E293B] p-4 rounded-3xl shadow-lg mb-6">
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

        {/* Shop Section */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 ml-2">Shop Fitness Gear</h2>
          <button
            onClick={() => onNavigate('STORE')}
            className="w-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 p-5 rounded-3xl flex items-center justify-between shadow-xl shadow-primary/10 active:scale-[0.98] transition-transform mb-3"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-rounded text-primary text-2xl">shopping_bag</span>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-white">Browse Products</h3>
                <p className="text-xs text-slate-400">Supplements, equipment & more</p>
              </div>
            </div>
            <span className="material-symbols-rounded text-slate-500">chevron_right</span>
          </button>
          <button
            onClick={() => onNavigate('CART')}
            className="w-full bg-[#151C2C] border border-[#1E293B] p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-primary text-xl">shopping_cart</span>
              <span className="text-sm font-semibold text-white">View Shopping Cart</span>
            </div>
            <span className="material-symbols-rounded text-slate-500 text-xl">chevron_right</span>
          </button>
        </section>
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
                  onChange={(e) => setEditData({ ...editData, height: parseInt(e.target.value) })}
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
                  onChange={(e) => setEditData({ ...editData, weight: parseInt(e.target.value) })}
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
                  onChange={(e) => setEditData({ ...editData, target_weight: parseInt(e.target.value) })}
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

      {/* Plan Details Modal */}
      {isPlanModalOpen && planDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-[380px] bg-[#151C2C] border border-[#1E293B] rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">{planDetails.name}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Your Membership Details</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {planDetails.description || 'No description available for this plan.'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">What's Included</p>
                <div className="space-y-3">
                  {planDetails.features && planDetails.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-rounded text-primary text-[14px]">check</span>
                      </div>
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[#1E293B]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Price</span>
                  <span className="text-lg font-black text-primary">{planDetails.price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Status</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${profile?.approval_status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {profile?.approval_status?.toUpperCase() || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="w-full bg-slate-800 text-white font-bold py-5 rounded-2xl mt-8 active:scale-[0.98] transition-all"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && notifications.length > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="sticky top-0 p-6 border-b border-slate-800 flex items-center justify-between bg-[#1f2937]">
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar p-4 space-y-3 flex-1">
              {notifications.map((notification, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${notification.type === 'expiring_soon'
                    ? 'bg-orange-500/10 border-orange-500/20'
                    : notification.type === 'expired'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-blue-500/10 border-blue-500/20'
                    }`}
                >
                  <div className="flex gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.type === 'expiring_soon'
                      ? 'bg-orange-500/20 text-orange-500'
                      : notification.type === 'expired'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-blue-500/20 text-blue-500'
                      }`}>
                      <span className="material-symbols-rounded text-sm">
                        {notification.type === 'expiring_soon' ? 'schedule' : notification.type === 'expired' ? 'error' : 'info'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm">{notification.title}</h3>
                      <p className="text-[12px] text-slate-300 mt-1">{notification.message}</p>
                      {notification.dueAmount && (
                        <p className="text-[11px] text-orange-400 font-medium mt-2">Due: ${notification.dueAmount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 p-4 bg-[#1f2937] sticky bottom-0">
              <button
                onClick={() => {
                  setShowNotificationsModal(false);
                  if (notifications[0]?.actionUrl) {
                    onNavigate(notifications[0].actionUrl as AppScreen);
                  }
                }}
                className="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
              >
                Take Action
              </button>
            </div>
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
