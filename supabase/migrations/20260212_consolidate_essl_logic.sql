-- Drop redundant SQL triggers that conflict with Edge Function sync
DROP TRIGGER IF EXISTS queue_essl_user_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS ensure_expired_users_blocked_trigger ON public.profiles;

-- Drop redundant functions
DROP FUNCTION IF EXISTS public.queue_essl_user_update();
DROP FUNCTION IF EXISTS public.enforce_member_block_status();

-- Ensure device_sync_logs policy doesn't cause errors if already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'device_sync_logs' 
        AND policyname = 'Admins can view all sync logs'
    ) THEN
        CREATE POLICY "Admins can view all sync logs"
          ON public.device_sync_logs FOR SELECT
          USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          ));
    END IF;
END $$;
