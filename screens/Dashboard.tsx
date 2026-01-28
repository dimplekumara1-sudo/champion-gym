
import React, { useEffect, useState } from 'react';
import StatusBar from '../components/StatusBar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { AppScreen, Profile } from '../types';
import { supabase } from '../lib/supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/cache';
import { notificationService, PlanNotification } from '../lib/notifications';

interface DailyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

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
  const [showBMIInfoModal, setShowBMIInfoModal] = useState(false);
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition>({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  });
  const [upcomingSession, setUpcomingSession] = useState<any>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<{ day: string; calories: number; isToday: boolean }[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<any>({
    daily_calories_target: 2000,
    daily_protein_target: 150,
    daily_carbs_target: 250,
    daily_fat_target: 65,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();

    // Set up real-time subscriptions for profile and diet tracking updates
    const setupSubscriptions = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Profile changes subscription
        const profileSubscription = supabase
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

        // Diet tracking changes subscription - updates calories in real-time
        const dietSubscription = supabase
          .channel(`diet_${authUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_daily_diet_tracking',
              filter: `user_id=eq.${authUser.id}`
            },
            () => {
              // Refetch daily nutrition when food is added/removed
              fetchDailyNutrition(authUser.id);
              fetchWeeklyHistory(authUser.id);
            }
          )
          .subscribe();

        // Nutrition goals changes subscription
        const goalsSubscription = supabase
          .channel(`goals_${authUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'nutrition_goals',
              filter: `user_id=eq.${authUser.id}`
            },
            () => {
              // Refetch nutrition goals when they change
              fetchNutritionGoals(authUser.id);
            }
          )
          .subscribe();

        // Announcements subscription
        const announcementsSubscription = supabase
          .channel(`announcements`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'announcements'
            },
            () => {
              fetchAnnouncements();
            }
          )
          .subscribe();

        return { profileSubscription, dietSubscription, goalsSubscription, announcementsSubscription };
      }
    };

    let subscriptions: any;
    setupSubscriptions().then((subs) => {
      subscriptions = subs;
    });

    return () => {
      if (subscriptions) {
        subscriptions.profileSubscription?.unsubscribe();
        subscriptions.dietSubscription?.unsubscribe();
        subscriptions.goalsSubscription?.unsubscribe();
        subscriptions.announcementsSubscription?.unsubscribe();
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

        // Fetch daily nutrition data
        await fetchDailyNutrition(user.id);
        await fetchWeeklyHistory(user.id);

        // Fetch nutrition goals
        await fetchNutritionGoals(user.id);

        // Fetch upcoming session
        await fetchUpcomingSession(user.id);

        // Fetch notifications
        const userNotifications = await notificationService.getUserNotifications(user.id);
        setNotifications(userNotifications);

        // Fetch announcements
        await fetchAnnouncements();

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

  const fetchUpcomingSession = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('pt_sessions')
        .select('*, pt_trainers(*)')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUpcomingSession(data);
    } catch (error) {
      console.error('Error fetching upcoming session:', error);
    }
  };

  const fetchDailyNutrition = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('user_daily_diet_tracking')
        .select('calories, protein, carbs, fats')
        .eq('user_id', userId)
        .eq('date', today);

      if (error) throw error;

      if (data && data.length > 0) {
        const totals = data.reduce(
          (acc, meal) => ({
            totalCalories: acc.totalCalories + (meal.calories || 0),
            totalProtein: acc.totalProtein + (meal.protein || 0),
            totalCarbs: acc.totalCarbs + (meal.carbs || 0),
            totalFat: acc.totalFat + (meal.fats || 0),
          }),
          { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
        );
        setDailyNutrition(totals);
      } else {
        setDailyNutrition({
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching daily nutrition:', error);
    }
  };

  const fetchWeeklyHistory = async (userId: string) => {
    try {
      const today = new Date();
      const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('user_daily_diet_tracking')
        .select('date, calories')
        .eq('user_id', userId)
        .gte('date', monday.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by date
      const dailyTotals = (data || []).reduce((acc: any, item: any) => {
        const date = item.date;
        acc[date] = (acc[date] || 0) + (item.calories || 0);
        return acc;
      }, {});

      // Create array for all 7 days of the week (Mon-Sun)
      const weekData = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const todayStr = new Date().toISOString().split('T')[0];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        weekData.push({
          day: days[i],
          calories: dailyTotals[dateStr] || 0,
          isToday: dateStr === todayStr
        });
      }
      setWeeklyHistory(weekData);
    } catch (error) {
      console.error('Error fetching weekly history:', error);
    }
  };

  const fetchNutritionGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setNutritionGoals(data);
      } else {
        // Default goals if none exist
        setNutritionGoals({
          daily_calories_target: 2000,
          daily_protein_target: 150,
          daily_carbs_target: 250,
          daily_fat_target: 65,
        });
      }
    } catch (error) {
      console.error('Error fetching nutrition goals:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
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
          <p className="text-slate-400 text-[13px] font-medium">{getGreeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
        </div>

        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 ml-2">Gym Announcements</h2>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-3xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-rounded text-primary text-sm">campaign</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm">{announcement.title}</h4>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          announcement.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          announcement.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-300 leading-relaxed line-clamp-2">{announcement.content}</p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <button 
                  onClick={() => setShowBMIInfoModal(true)} 
                  className="material-symbols-rounded text-[16px] text-slate-500 hover:text-primary transition-colors"
                  title="BMI Information"
                >
                  info
                </button>
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
              <p className="text-4xl font-extrabold text-white">{Math.round(dailyNutrition.totalCalories)} <span className="text-xs font-medium text-slate-500">/ {nutritionGoals.daily_calories_target} kcal</span></p>
            </div>
            <div className="flex gap-1.5 items-end h-12 pt-2">
              {weeklyHistory.length > 0 ? (
                weeklyHistory.map((day, idx) => {
                  const height = Math.min(100, Math.max(15, (day.calories / (nutritionGoals.daily_calories_target || 2000)) * 100));
                  return (
                    <div
                      key={idx}
                      className={`w-2 rounded-full transition-all duration-500 ${
                        day.isToday 
                          ? 'bg-primary shadow-[0_0_12px_rgba(34,197,94,0.4)]' 
                          : 'bg-slate-800'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })
              ) : (
                [40, 60, 55, 85, 100, 30, 45].map((h, i) => (
                  <div 
                    key={i} 
                    className={`w-2 rounded-full ${i === 4 ? 'bg-primary' : 'bg-slate-800'}`} 
                    style={{ height: `${h}%` }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Nutrition Pie Chart - REMOVED */}

          <div className="grid grid-cols-3 gap-2 border-t border-[#1E293B] pt-4">
            <div className="text-center bg-slate-800/30 py-2 rounded-xl">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Carbs</p>
              <p className="text-xs font-bold text-amber-400">{Math.round(dailyNutrition.totalCarbs)}g</p>
              <p className="text-[8px] text-slate-500 mt-1">{dailyNutrition.totalCarbs > 0 ? ((dailyNutrition.totalCarbs * 4 / dailyNutrition.totalCalories) * 100).toFixed(0) : 0}%</p>
            </div>
            <div className="text-center bg-slate-800/30 py-2 rounded-xl">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Protein</p>
              <p className="text-xs font-bold text-red-400">{Math.round(dailyNutrition.totalProtein)}g</p>
              <p className="text-[8px] text-slate-500 mt-1">{dailyNutrition.totalProtein > 0 ? ((dailyNutrition.totalProtein * 4 / dailyNutrition.totalCalories) * 100).toFixed(0) : 0}%</p>
            </div>
            <div className="text-center bg-slate-800/30 py-2 rounded-xl">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Fats</p>
              <p className="text-xs font-bold text-purple-400">{Math.round(dailyNutrition.totalFat)}g</p>
              <p className="text-[8px] text-slate-500 mt-1">{dailyNutrition.totalFat > 0 ? ((dailyNutrition.totalFat * 9 / dailyNutrition.totalCalories) * 100).toFixed(0) : 0}%</p>
            </div>
          </div>
        </button>

        {/* Nutrition Goals Card */}
        <button
          onClick={() => onNavigate('NUTRITION_GOALS')}
          className="w-full text-left bg-[#151C2C] border border-[#1E293B] p-5 rounded-3xl mb-4 shadow-xl active:scale-[0.98] transition-transform group hover:bg-[#1a2438]"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-1 uppercase tracking-wider">Nutrition Goals</h3>
              <p className="text-sm text-slate-400">Set your daily targets</p>
            </div>
            <span className="material-symbols-rounded text-primary text-2xl group-hover:scale-110 transition-transform">local_fire_department</span>
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
              onClick={() => onNavigate('TRAINERS')}
              className="bg-[#151C2C] border border-[#1E293B] p-3 rounded-3xl flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                <span className="material-symbols-rounded">person_add</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300">PT Booking</span>
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
            <button 
              onClick={() => onNavigate('TRAINERS')}
              className="text-[11px] font-bold text-primary uppercase tracking-tighter hover:underline"
            >
              View Schedule
            </button>
          </div>
          {upcomingSession ? (
            <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
              <img
                alt="Trainer"
                className="w-11 h-11 rounded-xl object-cover"
                src={upcomingSession.pt_trainers?.photo_url && upcomingSession.pt_trainers.photo_url.startsWith('http') ? upcomingSession.pt_trainers.photo_url : `https://picsum.photos/seed/${upcomingSession.trainer_id}/200`}
              />
              <div className="flex-1">
                <h4 className="font-bold text-sm">{upcomingSession.pt_trainers?.name || 'Trainer'}</h4>
                <p className="text-[11px] text-slate-400 font-medium">{upcomingSession.pt_trainers?.specialty || upcomingSession.exercise_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{upcomingSession.session_time}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{upcomingSession.session_date === new Date().toISOString().split('T')[0] ? 'Today' : upcomingSession.session_date}</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-rounded text-slate-600 mb-2">calendar_today</span>
              <p className="text-[11px] text-slate-500 font-medium">No upcoming sessions scheduled</p>
              <button 
                onClick={() => onNavigate('TRAINERS')}
                className="mt-3 text-[10px] font-bold text-primary uppercase"
              >
                Book a session
              </button>
            </div>
          )}
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

      {/* BMI Info Modal */}
      {showBMIInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#1f2937] w-full max-w-md rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">BMI Categories</h2>
                <button
                  onClick={() => setShowBMIInfoModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-2">Body Mass Index (BMI) ranges for adults</p>
            </div>

            <div className="p-6 space-y-4">
              {/* BMI Ranges */}
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-blue-400">Underweight</h3>
                      <p className="text-xs text-slate-400 mt-1">Below 18.5</p>
                    </div>
                    <span className="material-symbols-rounded text-blue-400 text-2xl">trending_down</span>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-green-400">Healthy Weight</h3>
                      <p className="text-xs text-slate-400 mt-1">18.5 - 24.9</p>
                    </div>
                    <span className="material-symbols-rounded text-green-400 text-2xl">check_circle</span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-amber-400">Overweight</h3>
                      <p className="text-xs text-slate-400 mt-1">25.0 - 29.9</p>
                    </div>
                    <span className="material-symbols-rounded text-amber-400 text-2xl">warning</span>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-red-400">Obese</h3>
                      <p className="text-xs text-slate-400 mt-1">30.0 and above</p>
                    </div>
                    <span className="material-symbols-rounded text-red-400 text-2xl">error</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-slate-800/30 p-4 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">About BMI</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  BMI is calculated as weight (kg) ÷ height² (m²). It's a general guideline and may not account for muscle mass, bone density, or body composition differences.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 p-6">
              <button
                onClick={() => setShowBMIInfoModal(false)}
                className="w-full bg-primary hover:bg-green-600 text-slate-900 font-bold py-3 rounded-xl transition-colors"
              >
                Got it
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
