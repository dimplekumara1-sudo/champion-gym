import { supabase } from './supabase';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

export interface PlanRenewalData {
    userId: string;
    planId: string;
    paidAmount: number;
    paymentDate: Date;
}

export const planService = {
    // Process plan renewal - transitions upcoming plan to active
    async processPlanRenewal(userId: string): Promise<boolean> {
        try {
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('*, plans(duration_months)')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            const now = new Date();
            const expiryDate = new Date(profile.plan_expiry_date);

            // Determine new start date - if expired, start from now, else start from expiry (queued)
            const newStartDate = expiryDate > now ? expiryDate : now;
            
            // Get the plan to determine duration
            const { data: planData, error: planError } = await supabase
                .from('plans')
                .select('duration_months')
                .eq('id', profile.plan) // Use profile.plan (the id) not plan_id
                .single();

            if (planError) throw planError;

            const duration = planData?.duration_months || 1;
            const newExpiryDate = new Date(newStartDate);
            newExpiryDate.setMonth(newExpiryDate.getMonth() + duration);

            // Update profile with new plan dates and status
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    plan_start_date: newStartDate.toISOString(),
                    plan_expiry_date: newExpiryDate.toISOString(),
                    plan_status: 'active',
                    last_expiry_notification_sent: false,
                    payment_status: 'paid' // Assuming renewal process implies payment
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Invalidate cache
            cache.remove(CACHE_KEYS.PROFILE_DATA);
            cache.remove(`${CACHE_KEYS.PROFILE_DATA}_expiring_notifications`);
            cache.remove(`${CACHE_KEYS.PROFILE_DATA}_expired_notifications`);

            return true;
        } catch (error) {
            console.error('Error processing plan renewal:', error);
            return false;
        }
    },

    // Update plan to upcoming status (after approval but before activation)
    async markPlanAsUpcoming(userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ plan_status: 'upcoming' })
                .eq('id', userId);

            if (error) throw error;
            cache.remove(CACHE_KEYS.PROFILE_DATA);
            return true;
        } catch (error) {
            console.error('Error marking plan as upcoming:', error);
            return false;
        }
    },

    // Activate plan (move from upcoming/pending to active)
    async activatePlan(userId: string): Promise<boolean> {
        try {
            const now = new Date();
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1); // Default 1 month

            const { error } = await supabase
                .from('profiles')
                .update({
                    plan_status: 'active',
                    plan_start_date: now.toISOString(),
                    plan_expiry_date: expiryDate.toISOString(),
                    approval_status: 'approved',
                    payment_status: 'paid'
                })
                .eq('id', userId);

            if (error) throw error;
            cache.remove(CACHE_KEYS.PROFILE_DATA);
            return true;
        } catch (error) {
            console.error('Error activating plan:', error);
            return false;
        }
    },

    // Mark plan as expired
    async expirePlan(userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ plan_status: 'expired' })
                .eq('id', userId);

            if (error) throw error;
            cache.remove(CACHE_KEYS.PROFILE_DATA);
            return true;
        } catch (error) {
            console.error('Error expiring plan:', error);
            return false;
        }
    },

    // Handle partial payment - set due amount and payment due date
    async handlePartialPayment(
        userId: string,
        paidAmount: number,
        dueAmount: number,
        dueDate: Date
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    paid_amount: paidAmount,
                    due_amount: dueAmount,
                    payment_due_date: dueDate.toISOString(),
                    payment_status: paidAmount > 0 ? 'paid' : 'pending'
                })
                .eq('id', userId);

            if (error) throw error;
            cache.remove(CACHE_KEYS.PROFILE_DATA);
            return true;
        } catch (error) {
            console.error('Error handling partial payment:', error);
            return false;
        }
    },

    // Collect due amount and update payment status
    async collectDuePayment(userId: string, amountCollected: number): Promise<boolean> {
        try {
            // Fetch current profile
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            const newDueAmount = Math.max(0, (profile.due_amount || 0) - amountCollected);
            const newPaidAmount = (profile.paid_amount || 0) + amountCollected;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    paid_amount: newPaidAmount,
                    due_amount: newDueAmount,
                    payment_status: newDueAmount > 0 ? 'pending' : 'paid'
                })
                .eq('id', userId);

            if (updateError) throw updateError;
            cache.remove(CACHE_KEYS.PROFILE_DATA);
            return true;
        } catch (error) {
            console.error('Error collecting due payment:', error);
            return false;
        }
    },

    // Get users requiring payment collection (expired plans with due amounts)
    async getUsersRequiringPaymentCollection(): Promise<any[]> {
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone_number, plan_expiry_date, due_amount, payment_due_date')
                .eq('plan_status', 'expired')
                .gt('due_amount', 0)
                .order('payment_due_date', { ascending: true });

            if (error) throw error;
            return profiles || [];
        } catch (error) {
            console.error('Error getting users requiring payment collection:', error);
            return [];
        }
    },

    // Get users with upcoming renewals (within 7 days)
    async getUsersWithUpcomingRenewals(): Promise<any[]> {
        try {
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone_number, plan, plan_expiry_date')
                .eq('plan_status', 'active')
                .lte('plan_expiry_date', sevenDaysFromNow.toISOString())
                .gt('plan_expiry_date', new Date().toISOString())
                .order('plan_expiry_date', { ascending: true });

            if (error) throw error;
            return profiles || [];
        } catch (error) {
            console.error('Error getting upcoming renewals:', error);
            return [];
        }
    },

    // Calculate prorated upgrade amount
    calculateUpgrade(currentProfile: any, currentPlan: any, newPlan: any) {
        const now = new Date();
        const expiryDate = new Date(currentProfile.plan_expiry_date);
        const startDate = new Date(currentProfile.plan_start_date);

        const newPrice = parseFloat(newPlan.price.toString().replace(/[^0-9.]/g, ''));
        
        // If expired or no active plan
        if (expiryDate <= now || !currentProfile.plan_start_date || !currentProfile.plan_expiry_date) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (newPlan.duration_months || 1));
            
            return {
                unused_value: 0,
                payable_amount: newPrice,
                new_plan_start_date: startDate.toISOString(),
                new_plan_end_date: endDate.toISOString(),
                upgrade_type: 'post_expiry_upgrade'
            };
        }

        // Calculate proration
        const totalDuration = expiryDate.getTime() - startDate.getTime();
        const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
        const remainingDuration = expiryDate.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingDuration / (1000 * 60 * 60 * 24));

        const currentPrice = parseFloat(currentPlan.price.toString().replace(/[^0-9.]/g, ''));
        const dailyRate = currentPrice / totalDays;
        const unusedValue = Math.round(dailyRate * remainingDays);
        const payableAmount = Math.max(0, Math.round(newPrice - unusedValue));

        const newPlanStartDate = now;
        const newPlanEndDate = new Date(now);
        newPlanEndDate.setMonth(newPlanEndDate.getMonth() + (newPlan.duration_months || 1));

        return {
            unused_value: unusedValue,
            payable_amount: payableAmount,
            new_plan_start_date: newPlanStartDate.toISOString(),
            new_plan_end_date: newPlanEndDate.toISOString(),
            upgrade_type: 'active_upgrade'
        };
    }
};
