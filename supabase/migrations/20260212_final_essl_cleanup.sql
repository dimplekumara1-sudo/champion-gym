-- DROP ALL OLD AND CONFLICTING ESSL TRIGGERS AND FUNCTIONS
-- This ensures a single source of truth (sync-member-to-device edge function)

-- 1. Drop known triggers on profiles
DROP TRIGGER IF EXISTS queue_essl_user_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS update_plan_status_trigger ON public.profiles;
DROP TRIGGER IF EXISTS ensure_expired_users_blocked_trigger ON public.profiles;
DROP TRIGGER IF EXISTS enforce_member_block_status_trigger ON public.profiles;
DROP TRIGGER IF EXISTS profile_status_sync_trigger ON public.profiles;

-- 2. Drop known functions
DROP FUNCTION IF EXISTS public.queue_essl_user_update();
DROP FUNCTION IF EXISTS public.update_plan_status();
DROP FUNCTION IF EXISTS public.enforce_member_block_status();

-- 3. We keep plan_status update logic but MOVE it to a cleaner function that doesn't conflict
-- and ensures users stay blocked if truly expired.

CREATE OR REPLACE FUNCTION public.sync_profile_status_logic()
RETURNS TRIGGER AS $$
DECLARE
    global_grace INTEGER := 0;
    final_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Fetch global grace period
    SELECT (value->>'global_grace_period')::INTEGER INTO global_grace 
    FROM public.app_settings 
    WHERE id = 'gym_settings';

    IF NEW.plan_expiry_date IS NOT NULL THEN
        -- End of Day logic: Expiry is at 23:59:59 of the expiry date + grace days
        -- We use date_trunc to get the day and add 1 day minus 1 second
        final_expiry := (date_trunc('day', NEW.plan_expiry_date) + INTERVAL '1 day' - INTERVAL '1 second') 
                        + (COALESCE(NEW.grace_period, global_grace) || ' days')::INTERVAL;
        
        IF (CURRENT_TIMESTAMP > final_expiry) THEN
            NEW.plan_status := 'expired';
            NEW.essl_blocked := true;
        ELSIF (NEW.approval_status = 'approved') THEN
            -- Only set to active if it was previously expired or pending
            -- and we are now within a valid date range
            IF NEW.plan_status IN ('expired', 'pending') THEN
                NEW.plan_status := 'active';
                -- Note: We don't automatically unblock here to avoid accidents, 
                -- let the Edge Function handle the unblock command.
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_status_sync_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_status_logic();

-- 4. Unschedule old cron jobs safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'block-expired-users-hourly') THEN
        PERFORM cron.unschedule('block-expired-users-hourly');
    END IF;
    
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-members') THEN
        PERFORM cron.unschedule('check-expired-members');
    END IF;

    -- Unschedule previous version of v2 if exists to allow re-runs
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-members-v2') THEN
        PERFORM cron.unschedule('check-expired-members-v2');
    END IF;
END $$;

-- 5. Schedule NEW consolidated cron job (runs every 30 mins)
-- Note: User should replace SERVICE_ROLE_KEY if deploying manually, 
-- but usually this is handled via Supabase Dashboard for secrets.
SELECT cron.schedule(
    'check-expired-members-v2',
    '*/30 * * * *',
    $$
    SELECT net.http_post(
        url:='https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/check-expired-members',
        headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
    $$
);
