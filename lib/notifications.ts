import { supabase } from './supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

export interface PlanNotification {
    userId: string;
    type: 'expiring_soon' | 'expired' | 'payment_due';
    daysLeft?: number;
    expiryDate?: string;
    dueAmount?: number;
    title: string;
    message: string;
    actionUrl?: string;
}

export const notificationService = {
    // Check for users with expiring plans (5 days or less)
    async getExpiringPlansNotifications(): Promise<PlanNotification[]> {
        try {
            const cacheKey = `${CACHE_KEYS.PROFILE_DATA}_expiring_notifications`;
            const cached = cache.get<PlanNotification[]>(cacheKey);

            if (cached) {
                return cached;
            }

            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, full_name, plan_expiry_date, plan_status, last_expiry_notification_sent')
                .eq('approval_status', 'approved')
                .eq('payment_status', 'paid')
                .lte('plan_expiry_date', fiveDaysFromNow.toISOString())
                .gt('plan_expiry_date', new Date().toISOString());

            if (error) throw error;

            const notifications: PlanNotification[] = (profiles || []).map(profile => {
                const daysLeft = Math.ceil(
                    (new Date(profile.plan_expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return {
                    userId: profile.id,
                    type: 'expiring_soon',
                    daysLeft,
                    expiryDate: profile.plan_expiry_date,
                    title: 'Plan Expiring Soon',
                    message: `Your plan expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to continue!`,
                    actionUrl: 'PROFILE'
                };
            });

            cache.set(cacheKey, notifications, CACHE_TTL.MEDIUM);
            return notifications;
        } catch (error) {
            console.error('Error getting expiring plans notifications:', error);
            return [];
        }
    },

    // Check for expired plans (for payment collection)
    async getExpiredPlansNotifications(): Promise<PlanNotification[]> {
        try {
            const cacheKey = `${CACHE_KEYS.PROFILE_DATA}_expired_notifications`;
            const cached = cache.get<PlanNotification[]>(cacheKey);

            if (cached) {
                return cached;
            }

            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, full_name, plan_expiry_date, due_amount, payment_due_date')
                .eq('approval_status', 'approved')
                .lt('plan_expiry_date', new Date().toISOString())
                .eq('plan_status', 'expired');

            if (error) throw error;

            const notifications: PlanNotification[] = (profiles || []).map(profile => {
                return {
                    userId: profile.id,
                    type: 'expired',
                    expiryDate: profile.plan_expiry_date,
                    dueAmount: profile.due_amount,
                    title: 'Plan Expired',
                    message: 'Your subscription has expired. Please renew to continue your fitness journey!',
                    actionUrl: 'PROFILE'
                };
            });

            cache.set(cacheKey, notifications, CACHE_TTL.MEDIUM);
            return notifications;
        } catch (error) {
            console.error('Error getting expired plans notifications:', error);
            return [];
        }
    },

    // Mark notification as sent
    async markNotificationSent(userId: string): Promise<void> {
        try {
            await supabase
                .from('profiles')
                .update({ last_expiry_notification_sent: true })
                .eq('id', userId);

            // Invalidate cache
            const cacheKey = `${CACHE_KEYS.PROFILE_DATA}_expiring_notifications`;
            cache.remove(cacheKey);
        } catch (error) {
            console.error('Error marking notification as sent:', error);
        }
    },

    // Get payment due notifications
    async getPaymentDueNotifications(): Promise<PlanNotification[]> {
        try {
            const cacheKey = `${CACHE_KEYS.PROFILE_DATA}_payment_due_notifications`;
            const cached = cache.get<PlanNotification[]>(cacheKey);

            if (cached) {
                return cached;
            }

            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, full_name, payment_due_date, due_amount')
                .eq('approval_status', 'approved')
                .lte('payment_due_date', new Date().toISOString())
                .gt('due_amount', 0);

            if (error) throw error;

            const notifications: PlanNotification[] = (profiles || []).map(profile => {
                return {
                    userId: profile.id,
                    type: 'payment_due',
                    dueAmount: profile.due_amount,
                    title: 'Payment Due',
                    message: `Please pay the outstanding amount of $${profile.due_amount.toFixed(2)}`,
                    actionUrl: 'PROFILE'
                };
            });

            cache.set(cacheKey, notifications, CACHE_TTL.MEDIUM);
            return notifications;
        } catch (error) {
            console.error('Error getting payment due notifications:', error);
            return [];
        }
    },

    // Get all notifications for a user
    async getUserNotifications(userId: string): Promise<PlanNotification[]> {
        const expiringNotifications = await this.getExpiringPlansNotifications();
        const expiredNotifications = await this.getExpiredPlansNotifications();
        const paymentDueNotifications = await this.getPaymentDueNotifications();

        const allNotifications = [
            ...expiringNotifications,
            ...expiredNotifications,
            ...paymentDueNotifications
        ].filter(n => n.userId === userId);

        return allNotifications;
    }
};
