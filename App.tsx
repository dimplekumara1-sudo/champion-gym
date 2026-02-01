
import React, { useState, useEffect } from 'react';
import { AppScreen } from './types';
import SplashScreen from './screens/SplashScreen';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OnboardingGoal from './screens/OnboardingGoal';
import OnboardingGender from './screens/OnboardingGender';
import OnboardingHeight from './screens/OnboardingHeight';
import OnboardingWeight from './screens/OnboardingWeight';
import OnboardingPlan from './screens/OnboardingPlan';
import Dashboard from './screens/Dashboard';
import DailyTracker from './screens/DailyTracker';
import NutritionGoals from './screens/NutritionGoals';
import ExploreScreen from './screens/ExploreScreen';
import CategoryVideosScreen from './screens/CategoryVideosScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import GooglePasswordSetup from './screens/GooglePasswordSetup';
import TrainersScreen from './screens/TrainersScreen';
import ProfileScreen from './screens/ProfileScreen';
import SubscriptionDetails from './screens/SubscriptionDetails';
import WorkoutHistory from './screens/WorkoutHistory';
import GymCatalog from './screens/GymCatalog';
import CreateWorkout from './screens/CreateWorkout';
import WorkoutProgram from './screens/WorkoutProgram';
import WorkoutDetail from './screens/WorkoutDetail';
import WorkoutSummary from './screens/WorkoutSummary';
import WorkoutFeedback from './screens/WorkoutFeedback';
import SuccessScreen from './screens/SuccessScreen';
import ApplicationStatus from './screens/ApplicationStatus';
import AdminDashboard from './screens/AdminDashboard';
import AdminUsers from './screens/AdminUsers';
import AdminPlans from './screens/AdminPlans';
import AdminExercises from './screens/AdminExercises';
import AdminWorkouts from './screens/AdminWorkouts';
import AdminCategories from './screens/AdminCategories';
import AdminShop from './screens/AdminShop';
import StoreScreen from './screens/StoreScreen';
import CartScreen from './screens/CartScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import AdminOrders from './screens/AdminOrders';
import AdminExplore from './screens/AdminExplore';
import AdminIndianFoods from './screens/AdminIndianFoods';
import AdminFoodApprovals from './screens/AdminFoodApprovals';
import AdminPT from './screens/AdminPT';
import AdminAnnouncements from './screens/AdminAnnouncements';
import AdminSubscriptionTracker from './screens/AdminSubscriptionTracker';
import AttendanceScreen from './screens/AttendanceScreen';
import AdminAttendance from './screens/AdminAttendance';
import ConfigScreen from './screens/ConfigScreen';
import PullToRefresh from './components/PullToRefresh';
import BottomNav from './components/BottomNav';
import AdminBottomNav from './components/AdminBottomNav';
import { supabase } from './lib/supabase';
import { startSessionMonitoring, stopSessionMonitoring, clearSessionState } from './lib/sessionService';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('SPLASH');
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showGooglePasswordSetup, setShowGooglePasswordSetup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    goal: '',
    gender: '',
    height: 178,
    weight: 75,
    target_weight: 70,
    plan: ''
  });
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedUserProgramId, setSelectedUserProgramId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState<number>(0);

  const updateOnboardingData = (data: Partial<typeof onboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  useEffect(() => {
    // Start session monitoring on app load
    startSessionMonitoring();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Always check status on initial load to properly redirect approved users
        checkOnboardingStatus(session.user.id, true);
      } else {
        // No session found, show splash screen
        setCurrentScreen('SPLASH');
      }
      setIsInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id, false);
      } else {
        clearSessionState();
        setCurrentScreen('SPLASH');
      }
    });

    return () => {
      subscription.unsubscribe();
      stopSessionMonitoring();
    };
  }, []);

  const checkOnboardingStatus = async (userId: string, isInitialLoad: boolean) => {
    try {
      console.log(`[Navigation] Checking onboarding status for user ${userId}, isInitialLoad=${isInitialLoad}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, role, plan, approval_status, plan_expiry_date, has_password, grace_period')
        .eq('id', userId)
        .single();

      if (error) throw error;

      console.log(`[Navigation] User profile:`, {
        onboarding_completed: data?.onboarding_completed,
        role: data?.role,
        approval_status: data?.approval_status
      });

      setUserRole(data?.role || 'user');

      // Check if user signed in with Google and doesn't have password
      const { data: { user } } = await supabase.auth.getUser();
      const isGoogleAuth = user?.app_metadata?.provider === 'google';

      if (isGoogleAuth && !data?.has_password) {
        console.log('[Navigation] Google auth without password, showing password setup');
        setShowGooglePasswordSetup(true);
        return;
      }

      // Only redirect to ADMIN_DASHBOARD on initial load, not on auth state changes
      // This prevents redirecting when switching browser tabs
      if (data?.role === 'admin') {
        if (isInitialLoad) {
          console.log('[Navigation] Admin user - navigating to ADMIN_DASHBOARD');
          setCurrentScreen('ADMIN_DASHBOARD');
        }
        return;
      }

      // Check if plan has expired with grace period
      const now = new Date();
      const expiryDate = data?.plan_expiry_date ? new Date(data.plan_expiry_date) : null;
      
      let isExpired = false;
      if (expiryDate) {
        // Fetch global grace period from app_settings
        const { data: gymSettings } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'gym_settings')
          .single();
        
        const globalGracePeriod = gymSettings?.value?.global_grace_period || 0;
        
        // Use individual grace period if set, otherwise use global
        const graceDays = (data?.grace_period !== null && data?.grace_period !== undefined) 
          ? data.grace_period 
          : globalGracePeriod;

        const totalExpiryDate = new Date(expiryDate);
        totalExpiryDate.setDate(totalExpiryDate.getDate() + graceDays);
        isExpired = now > totalExpiryDate;
      }

      if (isExpired) {
        console.log('[Navigation] Plan expired - navigating to ONBOARDING_PLAN');
        setCurrentScreen('ONBOARDING_PLAN');
        return;
      }

      // FIXED: Direct users who are already approved and completed onboarding straight to dashboard
      // Skip ApplicationStatus page for existing approved users
      if (data?.onboarding_completed && data?.approval_status === 'approved') {
        console.log('[Navigation] User approved and onboarding completed - DIRECT TO DASHBOARD');
        setCurrentScreen('DASHBOARD');
        return;
      }

      // For users still in onboarding process or waiting for approval
      if (data?.onboarding_completed) {
        // Onboarding completed but waiting for approval
        console.log('[Navigation] Onboarding completed, waiting for approval - navigating to APPLICATION_STATUS');
        setCurrentScreen('APPLICATION_STATUS');
      } else if (data?.plan) {
        // Has selected a plan but hasn't completed onboarding
        console.log('[Navigation] Plan selected, onboarding pending - navigating to APPLICATION_STATUS');
        setCurrentScreen('APPLICATION_STATUS');
      } else {
        // New user, start onboarding
        console.log('[Navigation] New user - navigating to ONBOARDING_GOAL');
        setCurrentScreen('ONBOARDING_GOAL');
      }
    } catch (error) {
      console.error('[Navigation] Error checking onboarding status:', error);
      // For new users, the profile might not exist yet if trigger hasn't finished
      // or if it's their first time. Let's default to onboarding.
      setCurrentScreen('ONBOARDING_GOAL');
    }
  };

  const navigate = (screen: AppScreen) => {
    setCurrentScreen(screen);
    window.scrollTo(0, 0);
  };

  const renderScreen = () => {
    // Show Google password setup modal if needed
    if (showGooglePasswordSetup && session?.user) {
      return (
        <GooglePasswordSetup
          onComplete={() => {
            setShowGooglePasswordSetup(false);
            // Mark that user has password in profile
            supabase.from('profiles').update({ has_password: true }).eq('id', session.user.id).then(() => {
              if (session?.user) checkOnboardingStatus(session.user.id, false);
            });
          }}
          onSkip={() => {
            setShowGooglePasswordSetup(false);
            if (session?.user) checkOnboardingStatus(session.user.id, false);
          }}
        />
      );
    }

    switch (currentScreen) {
      case 'SPLASH': return <SplashScreen onGetStarted={() => navigate('SIGNUP')} onSignIn={() => navigate('LOGIN')} />;
      case 'LOGIN': return <LoginScreen onLogin={() => {
        if (session?.user) {
          // Ensure we check status immediately after successful login
          // This ensures approved users go directly to dashboard
          checkOnboardingStatus(session.user.id, true);
        }
      }} onSignUp={() => navigate('SIGNUP')} />;
      case 'SIGNUP': return <SignupScreen onSignup={() => {
        // After signup, check status to see if user should go to onboarding or dashboard
        if (session?.user) {
          checkOnboardingStatus(session.user.id, true);
        } else {
          navigate('ONBOARDING_GOAL');
        }
      }} onSignIn={() => navigate('LOGIN')} />;
      case 'GOOGLE_PASSWORD_SETUP': return <GooglePasswordSetup onComplete={() => navigate('ONBOARDING_GOAL')} onSkip={() => navigate('ONBOARDING_GOAL')} />;
      case 'ONBOARDING_GOAL': return <OnboardingGoal onNext={(goal) => { updateOnboardingData({ goal }); navigate('ONBOARDING_GENDER'); }} onBack={() => navigate('SIGNUP')} />;
      case 'ONBOARDING_GENDER': return <OnboardingGender onNext={(gender) => { updateOnboardingData({ gender }); navigate('ONBOARDING_HEIGHT'); }} onBack={() => navigate('ONBOARDING_GOAL')} />;
      case 'ONBOARDING_HEIGHT': return <OnboardingHeight onNext={(height) => { updateOnboardingData({ height }); navigate('ONBOARDING_WEIGHT'); }} onBack={() => navigate('ONBOARDING_GENDER')} />;
      case 'ONBOARDING_WEIGHT': return <OnboardingWeight onNext={(data) => { updateOnboardingData(data); navigate('ONBOARDING_PLAN'); }} onBack={() => navigate('ONBOARDING_HEIGHT')} />;
      case 'ONBOARDING_PLAN': return <OnboardingPlan onboardingData={onboardingData} onNext={() => navigate('APPLICATION_STATUS')} onBack={() => navigate('ONBOARDING_WEIGHT')} />;
      case 'APPLICATION_STATUS': return <ApplicationStatus onBack={() => navigate('SPLASH')} onHome={() => navigate('DASHBOARD')} />;
      case 'SUCCESS': return <SuccessScreen onNext={() => navigate('DASHBOARD')} />;
      case 'DASHBOARD': return <Dashboard onNavigate={navigate} />;
      case 'DAILY_TRACKER': return <DailyTracker onNavigate={navigate} />;
      case 'NUTRITION_GOALS': return <NutritionGoals onNavigate={navigate} />;
      case 'EXPLORE': return <ExploreScreen onNavigate={navigate} onSelectWorkout={(id) => { setSelectedWorkoutId(id); setSelectedUserProgramId(null); navigate('WORKOUT_DETAIL'); }} onSelectCategory={(categoryId, categoryName) => { setSelectedCategory({ id: categoryId, name: categoryName }); navigate('CATEGORY_VIDEOS'); }} />;
      case 'CATEGORY_VIDEOS': return selectedCategory ? <CategoryVideosScreen categoryId={selectedCategory.id} categoryName={selectedCategory.name} onNavigate={navigate} /> : <ExploreScreen onNavigate={navigate} onSelectWorkout={(id) => { setSelectedWorkoutId(id); setSelectedUserProgramId(null); navigate('WORKOUT_DETAIL'); }} onSelectCategory={(categoryId, categoryName) => { setSelectedCategory({ id: categoryId, name: categoryName }); navigate('CATEGORY_VIDEOS'); }} />;
      case 'STATS': return <DailyTracker onNavigate={navigate} />;
      case 'TRAINERS': return <TrainersScreen onNavigate={navigate} />;
      case 'PROFILE': return <ProfileScreen onNavigate={navigate} />;
      case 'CONFIG': return <ConfigScreen onNavigate={navigate} />;
      case 'GYM_CATALOG': return <GymCatalog onNavigate={navigate} initialCategory={selectedCategory ? selectedCategory.name : null} />;
      case 'CREATE_WORKOUT': return <CreateWorkout onNavigate={navigate} />;
      case 'SUBSCRIPTION_DETAILS': return <SubscriptionDetails onNavigate={navigate} />;
      case 'WORKOUT_HISTORY': return <WorkoutHistory onNavigate={navigate} />;
      case 'WORKOUT_PROGRAM': return <WorkoutProgram onNavigate={navigate} onSelectWorkout={(workoutId, programId) => { setSelectedWorkoutId(workoutId); setSelectedUserProgramId(programId); navigate('WORKOUT_DETAIL'); }} />;
      case 'WORKOUT_DETAIL': return <WorkoutDetail workoutId={selectedWorkoutId} programId={selectedUserProgramId} onBack={() => navigate('WORKOUT_PROGRAM')} onStart={(duration) => { setWorkoutDuration(duration); navigate('WORKOUT_SUMMARY'); }} />;
      case 'WORKOUT_SUMMARY': return <WorkoutSummary programId={selectedUserProgramId} duration={workoutDuration} onNext={() => navigate('WORKOUT_FEEDBACK')} onHome={() => navigate('DASHBOARD')} />;
      case 'WORKOUT_FEEDBACK': return <WorkoutFeedback programId={selectedUserProgramId} duration={workoutDuration} onFinish={() => navigate('DASHBOARD')} onBack={() => navigate('WORKOUT_SUMMARY')} />;
      case 'ADMIN_DASHBOARD': return <AdminDashboard onNavigate={navigate} />;
      case 'ADMIN_USERS': return <AdminUsers onNavigate={navigate} />;
      case 'ADMIN_PLANS': return <AdminPlans onNavigate={navigate} />;
      case 'ADMIN_EXERCISES': return <AdminExercises onNavigate={navigate} />;
      case 'ADMIN_WORKOUTS': return <AdminWorkouts onNavigate={navigate} />;
      case 'ADMIN_CATEGORIES': return <AdminCategories onNavigate={navigate} />;
      case 'ADMIN_SHOP': return <AdminShop onNavigate={navigate} />;
      case 'ADMIN_ORDERS': return <AdminOrders onNavigate={navigate} />;
      case 'ADMIN_EXPLORE': return <AdminExplore onNavigate={navigate} />;
      case 'ADMIN_INDIAN_FOODS': return <AdminIndianFoods onNavigate={navigate} />;
      case 'ADMIN_FOOD_APPROVALS': return <AdminFoodApprovals onNavigate={navigate} />;
      case 'ADMIN_PT': return <AdminPT onNavigate={navigate} />;
      case 'ADMIN_ANNOUNCEMENTS': return <AdminAnnouncements onNavigate={navigate} />;
      case 'ADMIN_SUBSCRIPTION_TRACKER': return <AdminSubscriptionTracker onNavigate={navigate} />;
      case 'ATTENDANCE': return <AttendanceScreen onNavigate={navigate} />;
      case 'ADMIN_ATTENDANCE': return <AdminAttendance onNavigate={navigate} />;
      case 'STORE': return <StoreScreen onNavigate={navigate} />;
      case 'CART': return <CartScreen onNavigate={navigate} />;
      case 'ORDER_HISTORY': return <OrderHistoryScreen onNavigate={navigate} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  const handleRefresh = async () => {
    // Refresh the page
    window.location.reload();
  };

  const renderNavigation = () => {
    const userScreens: AppScreen[] = [
      'DASHBOARD', 'EXPLORE', 'DAILY_TRACKER', 'NUTRITION_GOALS', 
      'STATS', 'TRAINERS', 'PROFILE', 'GYM_CATALOG', 
      'WORKOUT_PROGRAM', 'WORKOUT_HISTORY', 'STORE', 'CART', 
      'ATTENDANCE', 'ORDER_HISTORY', 'CATEGORY_VIDEOS'
    ];

    const adminScreens: AppScreen[] = [
      'ADMIN_DASHBOARD', 'ADMIN_USERS', 'ADMIN_PLANS', 'ADMIN_EXERCISES', 
      'ADMIN_WORKOUTS', 'ADMIN_CATEGORIES', 'ADMIN_SHOP', 'ADMIN_ORDERS', 
      'ADMIN_EXPLORE', 'ADMIN_INDIAN_FOODS', 'ADMIN_FOOD_APPROVALS', 
      'ADMIN_PT', 'ADMIN_ANNOUNCEMENTS', 'ADMIN_SUBSCRIPTION_TRACKER', 
      'ADMIN_ATTENDANCE', 'CONFIG'
    ];

    if (userScreens.includes(currentScreen)) {
      let active: 'HOME' | 'EXPLORE' | 'STATS' | 'WORKOUTS' = 'HOME';
      if (currentScreen === 'EXPLORE' || currentScreen === 'CATEGORY_VIDEOS') active = 'EXPLORE';
      if (currentScreen === 'STATS' || currentScreen === 'DAILY_TRACKER') active = 'STATS';
      if (currentScreen === 'WORKOUT_PROGRAM') active = 'WORKOUTS';
      
      return <BottomNav active={active} onNavigate={navigate} />;
    }

    if (adminScreens.includes(currentScreen)) {
      return <AdminBottomNav activeScreen={currentScreen} onNavigate={navigate} />;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#090E1A] text-white font-sans flex justify-center">
      <div className="w-full max-w-[430px] bg-[#090E1A] min-h-screen relative shadow-2xl overflow-x-hidden no-scrollbar">
        <PullToRefresh onRefresh={handleRefresh}>
          {renderScreen()}
        </PullToRefresh>
        {renderNavigation()}
      </div>
      
      {/* PWA Install Prompt */}
      {showPWAInstall && (
        <PWAInstallPrompt onClose={() => setShowPWAInstall(false)} />
      )}
    </div>
  );
};

export default App;
