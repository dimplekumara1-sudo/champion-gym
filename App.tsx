
import React, { useState, useEffect } from 'react';
import { AppScreen } from './types';
import SplashScreen from './screens/SplashScreen';
import OnboardingGoal from './screens/OnboardingGoal';
import OnboardingGender from './screens/OnboardingGender';
import OnboardingHeight from './screens/OnboardingHeight';
import OnboardingWeight from './screens/OnboardingWeight';
import OnboardingPlan from './screens/OnboardingPlan';
import Dashboard from './screens/Dashboard';
import DailyTracker from './screens/DailyTracker';
import ExploreScreen from './screens/ExploreScreen';
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
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('SPLASH');
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showGooglePasswordSetup, setShowGooglePasswordSetup] = useState(false);
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState<number>(0);

  const updateOnboardingData = (data: Partial<typeof onboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id);
      } else {
        setCurrentScreen('SPLASH');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, role, plan, approval_status, plan_expiry_date, has_password')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserRole(data?.role || 'user');

      // Check if user signed in with Google and doesn't have password
      const { data: { user } } = await supabase.auth.getUser();
      const isGoogleAuth = user?.app_metadata?.provider === 'google';

      if (isGoogleAuth && !data?.has_password) {
        setShowGooglePasswordSetup(true);
        return;
      }

      if (data?.role === 'admin') {
        setCurrentScreen('ADMIN_DASHBOARD');
        return;
      }

      // Check if plan has expired
      const now = new Date();
      const expiryDate = data?.plan_expiry_date ? new Date(data.plan_expiry_date) : null;
      const isExpired = expiryDate && now > expiryDate;

      if (isExpired) {
        setCurrentScreen('ONBOARDING_PLAN');
        return;
      }

      if (data?.onboarding_completed) {
        if (data?.approval_status === 'approved') {
          setCurrentScreen('DASHBOARD');
        } else {
          setCurrentScreen('APPLICATION_STATUS');
        }
      } else if (data?.plan) {
        setCurrentScreen('APPLICATION_STATUS');
      } else {
        setCurrentScreen('ONBOARDING_GOAL');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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
              if (session?.user) checkOnboardingStatus(session.user.id);
            });
          }}
          onSkip={() => {
            setShowGooglePasswordSetup(false);
            if (session?.user) checkOnboardingStatus(session.user.id);
          }}
        />
      );
    }

    switch (currentScreen) {
      case 'SPLASH': return <SplashScreen onGetStarted={() => navigate('SIGNUP')} onSignIn={() => navigate('LOGIN')} />;
      case 'LOGIN': return <LoginScreen onLogin={() => {
        if (session?.user) checkOnboardingStatus(session.user.id);
        else navigate('DASHBOARD');
      }} onSignUp={() => navigate('SIGNUP')} />;
      case 'SIGNUP': return <SignupScreen onSignup={() => navigate('ONBOARDING_GOAL')} onSignIn={() => navigate('LOGIN')} />;
      case 'GOOGLE_PASSWORD_SETUP': return <GooglePasswordSetup onComplete={() => navigate('ONBOARDING_GOAL')} onSkip={() => navigate('ONBOARDING_GOAL')} />;
      case 'ONBOARDING_GOAL': return <OnboardingGoal onNext={(goal) => { updateOnboardingData({ goal }); navigate('ONBOARDING_GENDER'); }} />;
      case 'ONBOARDING_GENDER': return <OnboardingGender onNext={(gender) => { updateOnboardingData({ gender }); navigate('ONBOARDING_HEIGHT'); }} />;
      case 'ONBOARDING_HEIGHT': return <OnboardingHeight onNext={(height) => { updateOnboardingData({ height }); navigate('ONBOARDING_WEIGHT'); }} />;
      case 'ONBOARDING_WEIGHT': return <OnboardingWeight onNext={(data) => { updateOnboardingData(data); navigate('ONBOARDING_PLAN'); }} />;
      case 'ONBOARDING_PLAN': return <OnboardingPlan onboardingData={onboardingData} onNext={() => navigate('APPLICATION_STATUS')} />;
      case 'APPLICATION_STATUS': return <ApplicationStatus onBack={() => navigate('SPLASH')} onHome={() => navigate('DASHBOARD')} />;
      case 'SUCCESS': return <SuccessScreen onNext={() => navigate('DASHBOARD')} />;
      case 'DASHBOARD': return <Dashboard onNavigate={navigate} />;
      case 'DAILY_TRACKER': return <DailyTracker onNavigate={navigate} />;
      case 'EXPLORE': return <ExploreScreen onNavigate={(s) => { if (s === 'GYM_CATALOG') setSelectedCategory(null); navigate(s); }} onSelectWorkout={(id) => { setSelectedWorkoutId(id); setSelectedUserProgramId(null); navigate('WORKOUT_DETAIL'); }} onSelectCategory={(cat) => { setSelectedCategory(cat); navigate('GYM_CATALOG'); }} />;
      case 'STATS': return <DailyTracker onNavigate={navigate} />;
      case 'TRAINERS': return <TrainersScreen onNavigate={navigate} />;
      case 'PROFILE': return <ProfileScreen onNavigate={navigate} />;
      case 'GYM_CATALOG': return <GymCatalog onNavigate={navigate} initialCategory={selectedCategory} />;
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
      case 'STORE': return <StoreScreen onNavigate={navigate} />;
      case 'CART': return <CartScreen onNavigate={navigate} />;
      case 'ORDER_HISTORY': return <OrderHistoryScreen onNavigate={navigate} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090E1A] text-white font-sans flex justify-center">
      <div className="w-full max-w-[430px] bg-[#090E1A] min-h-screen relative shadow-2xl overflow-x-hidden no-scrollbar">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
