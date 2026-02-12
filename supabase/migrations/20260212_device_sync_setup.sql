-- Add device sync columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_sync_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create device sync logs table
CREATE TABLE IF NOT EXISTS public.device_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  command VARCHAR(50),
  request_payload JSONB,
  response_payload JSONB,
  status VARCHAR(20), -- 'success', 'failed', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on device_sync_logs
ALTER TABLE public.device_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all sync logs
CREATE POLICY "Admins can view all sync logs"
  ON public.device_sync_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Schedule daily cron for auto-expiry (Phase 6)
-- Note: Replace YOUR_PROJECT and YOUR_ANON_KEY with actual values
-- SELECT cron.schedule(
--   'check-expired-members',
--   '0 1 * * *', -- Run at 1 AM daily
--   $$
--   SELECT net.http_post(
--     url:='https://YOUR_PROJECT.supabase.co/functions/v1/check-expired-members',
--     headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
--   );
--   $$
-- );

-- Ensure expired users stay blocked (Safety Trigger)
CREATE OR REPLACE FUNCTION public.enforce_member_block_status()
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
        -- Calculate final expiry date including grace period
        final_expiry := NEW.plan_expiry_date + (COALESCE(NEW.grace_period, global_grace) || ' days')::INTERVAL;
        
        -- If current time is past final expiry and status is NOT expired or NOT blocked
        IF (CURRENT_TIMESTAMP > final_expiry) THEN
            IF (NEW.essl_blocked = false OR NEW.plan_status != 'expired') THEN
                NEW.essl_blocked := true;
                NEW.plan_status := 'expired';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_expired_users_blocked_trigger ON public.profiles;
CREATE TRIGGER ensure_expired_users_blocked_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_member_block_status();
