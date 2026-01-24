
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
import TrainersScreen from './screens/TrainersScreen';
import ProfileScreen from './screens/ProfileScreen';
import WorkoutProgram from './screens/WorkoutProgram';
import WorkoutDetail from './screens/WorkoutDetail';
import WorkoutSummary from './screens/WorkoutSummary';
import WorkoutFeedback from './screens/WorkoutFeedback';
import SuccessScreen from './screens/SuccessScreen';
import ApplicationStatus from './screens/ApplicationStatus';
import AdminDashboard from './screens/AdminDashboard';
import AdminUsers from './screens/AdminUsers';
import AdminPlans from './screens/AdminPlans';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('SPLASH');
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState({
    goal: '',
    gender: '',
    height: 178,
    weight: 75,
    target_weight: 70,
    plan: ''
  });

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
        .select('onboarding_completed, role, plan')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUserRole(data?.role || 'user');

      if (data?.onboarding_completed) {
        setCurrentScreen('DASHBOARD');
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
    switch (currentScreen) {
      case 'SPLASH': return <SplashScreen onGetStarted={() => navigate('SIGNUP')} onSignIn={() => navigate('LOGIN')} />;
      case 'LOGIN': return <LoginScreen onLogin={() => navigate('DASHBOARD')} onSignUp={() => navigate('SIGNUP')} />;
      case 'SIGNUP': return <SignupScreen onSignup={() => navigate('ONBOARDING_GOAL')} onSignIn={() => navigate('LOGIN')} />;
      case 'ONBOARDING_GOAL': return <OnboardingGoal onNext={(goal) => { updateOnboardingData({ goal }); navigate('ONBOARDING_GENDER'); }} />;
      case 'ONBOARDING_GENDER': return <OnboardingGender onNext={(gender) => { updateOnboardingData({ gender }); navigate('ONBOARDING_HEIGHT'); }} />;
      case 'ONBOARDING_HEIGHT': return <OnboardingHeight onNext={(height) => { updateOnboardingData({ height }); navigate('ONBOARDING_WEIGHT'); }} />;
      case 'ONBOARDING_WEIGHT': return <OnboardingWeight onNext={(data) => { updateOnboardingData(data); navigate('ONBOARDING_PLAN'); }} />;
      case 'ONBOARDING_PLAN': return <OnboardingPlan onboardingData={onboardingData} onNext={() => navigate('APPLICATION_STATUS')} />;
      case 'APPLICATION_STATUS': return <ApplicationStatus onBack={() => navigate('SPLASH')} onHome={() => navigate('DASHBOARD')} />;
      case 'SUCCESS': return <SuccessScreen onNext={() => navigate('DASHBOARD')} />;
      case 'DASHBOARD': return <Dashboard onNavigate={navigate} />;
      case 'DAILY_TRACKER': return <DailyTracker onNavigate={navigate} />;
      case 'EXPLORE': return <ExploreScreen onNavigate={navigate} />;
      case 'STATS': return <DailyTracker onNavigate={navigate} />;
      case 'TRAINERS': return <TrainersScreen onNavigate={navigate} />;
      case 'PROFILE': return <ProfileScreen onNavigate={navigate} />;
      case 'WORKOUT_PROGRAM': return <WorkoutProgram onNavigate={navigate} onSelectWorkout={() => navigate('WORKOUT_DETAIL')} />;
      case 'WORKOUT_DETAIL': return <WorkoutDetail onBack={() => navigate('WORKOUT_PROGRAM')} onStart={() => navigate('WORKOUT_SUMMARY')} />;
      case 'WORKOUT_SUMMARY': return <WorkoutSummary onNext={() => navigate('WORKOUT_FEEDBACK')} onHome={() => navigate('DASHBOARD')} />;
      case 'WORKOUT_FEEDBACK': return <WorkoutFeedback onFinish={() => navigate('DASHBOARD')} onBack={() => navigate('WORKOUT_SUMMARY')} />;
      case 'ADMIN_DASHBOARD': return <AdminDashboard onNavigate={navigate} />;
      case 'ADMIN_USERS': return <AdminUsers onNavigate={navigate} />;
      case 'ADMIN_PLANS': return <AdminPlans onNavigate={navigate} />;
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
