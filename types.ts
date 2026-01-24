
export type AppScreen = 
  | 'SPLASH'
  | 'LOGIN'
  | 'SIGNUP'
  | 'FORGOT_PASSWORD'
  | 'VERIFICATION'
  | 'SUCCESS'
  | 'ONBOARDING_GOAL'
  | 'ONBOARDING_GENDER'
  | 'ONBOARDING_HEIGHT'
  | 'ONBOARDING_WEIGHT'
  | 'ONBOARDING_PLAN'
  | 'APPLICATION_STATUS'
  | 'DASHBOARD'
  | 'DAILY_TRACKER'
  | 'EXPLORE'
  | 'TRAINERS'
  | 'WORKOUT_PROGRAM'
  | 'WORKOUT_DETAIL'
  | 'WORKOUT_SUMMARY'
  | 'WORKOUT_FEEDBACK'
  | 'STATS'
  | 'PROFILE'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_USERS'
  | 'ADMIN_PLANS';

export type NavTab = 'HOME' | 'EXPLORE' | 'ADD' | 'STATS' | 'MY_WORKOUTS';

export interface UserStats {
  weight: number;
  height: number;
  goal: string;
  gender: string;
}
