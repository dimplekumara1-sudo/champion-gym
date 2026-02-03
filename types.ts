
export type AppScreen =
  | 'SPLASH'
  | 'LOGIN'
  | 'SIGNUP'
  | 'GOOGLE_PASSWORD_SETUP'
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
  | 'NUTRITION_GOALS'
  | 'EXPLORE'
  | 'CATEGORY_VIDEOS'
  | 'TRAINERS'
  | 'WORKOUT_PROGRAM'
  | 'WORKOUT_DETAIL'
  | 'WORKOUT_SUMMARY'
  | 'WORKOUT_FEEDBACK'
  | 'STATS'
  | 'PROFILE'
  | 'CONFIG'
  | 'GYM_CATALOG'
  | 'CREATE_WORKOUT'
  | 'SUBSCRIPTION_DETAILS'
  | 'WORKOUT_HISTORY'
  | 'STORE'
  | 'CART'
  | 'ORDER_HISTORY'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_USERS'
  | 'ADMIN_PLANS'
  | 'ADMIN_EXERCISES'
  | 'ADMIN_WORKOUTS'
  | 'ADMIN_CATEGORIES'
  | 'ADMIN_SHOP'
  | 'ADMIN_ORDERS'
  | 'ADMIN_EXPLORE'
  | 'ADMIN_INDIAN_FOODS'
  | 'ADMIN_FOOD_APPROVALS'
  | 'ADMIN_PT'
  | 'ADMIN_ANNOUNCEMENTS'
  | 'ADMIN_SUBSCRIPTION_TRACKER'
  | 'ATTENDANCE'
  | 'ADMIN_ATTENDANCE';

export type NavTab = 'HOME' | 'EXPLORE' | 'ADD' | 'STATS' | 'MY_WORKOUTS';

export interface UserStats {
  weight: number;
  height: number;
  goal: string;
  gender: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  onboarding_completed: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  payment_status: 'pending' | 'paid' | 'failed' | 'unpaid';
  plan: string | null;
  plan_start_date: string | null;
  plan_expiry_date: string | null;
  height: number | null;
  weight: number | null;
  target_weight: number | null;
  goal: string | null;
  gender: string | null;
  phone_number: string | null;
  username: string | null;
  openwearables_user_id: string | null;
  essl_id: string | null;
  essl_blocked: boolean;
  grace_period: number | null;
  created_at: string;
  due_amount?: number | null;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  description: string | null;
  features: string[];
  popular: boolean;
  duration_months: number;
  updated_at: string;
}

export interface WaterIntake {
  id: number;
  user_id: string;
  amount_ml: number;
  date: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  target_user?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  link?: string;
  target_user?: string; // null for broadcast to all users
}
