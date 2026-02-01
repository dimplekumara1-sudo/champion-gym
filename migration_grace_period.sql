-- 1. Add grace_period and essl_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS essl_id TEXT;

-- 2. Setup global configuration for grace period
-- This allows setting a default grace period for all users in one place
INSERT INTO app_settings (id, value, updated_at)
VALUES ('gym_settings', '{"global_grace_period": 1}'::jsonb, now())
ON CONFLICT (id) DO UPDATE SET 
    value = jsonb_set(app_settings.value, '{global_grace_period}', EXCLUDED.value->'global_grace_period'),
    updated_at = now();

-- 3. Fix Attendance Table (Removed check_out since access is one-way)
-- If table exists, we drop the check_out column to avoid confusion
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='check_out') THEN
        ALTER TABLE public.attendance DROP COLUMN check_out;
    END IF;
END $$;

-- Ensure table structure is correct
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4 (),
  user_id uuid NULL,
  check_in timestamp with time zone NULL,
  device_id text NULL,
  raw_data jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- 4. Optimized Indexes for Admin Dashboard and Logs
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON public.attendance USING btree (check_in);
