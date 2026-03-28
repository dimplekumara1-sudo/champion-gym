-- Supabase Schema for eSSL X990 Bridge Agent
-- Run this in Supabase SQL Editor

-- ─── Enhance essl_commands table ───────────────────────────────────────
ALTER TABLE essl_commands ADD COLUMN IF NOT EXISTS result JSONB DEFAULT NULL;
ALTER TABLE essl_commands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster polling
CREATE INDEX IF NOT EXISTS idx_essl_commands_status 
ON essl_commands(status) WHERE status IN ('pending', 'sent');

-- ─── Create blocked_attempts table for audit ──────────────────────────
CREATE TABLE IF NOT EXISTS blocked_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  essl_id TEXT NOT NULL,
  device_sn TEXT,
  reason TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocked_attempts_essl_id 
ON blocked_attempts(essl_id);

CREATE INDEX IF NOT EXISTS idx_blocked_attempts_attempted_at 
ON blocked_attempts(attempted_at DESC);

-- ─── Create device_status table for monitoring ─────────────────────────
CREATE TABLE IF NOT EXISTS device_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_ip TEXT NOT NULL UNIQUE,
  device_name TEXT,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  users_count INTEGER DEFAULT 0,
  groups_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── Create activity_log table for device operations ────────────────────
CREATE TABLE IF NOT EXISTS device_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  essl_id TEXT,
  action TEXT NOT NULL, -- 'user_block', 'user_unblock', 'user_add', 'user_delete', 'attendance'
  description TEXT,
  device_ip TEXT,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_essl_id 
ON device_activity_log(essl_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_action 
ON device_activity_log(action);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at 
ON device_activity_log(created_at DESC);

-- ─── Update profiles table with device tracking columns ────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_sync_status TEXT DEFAULT 'PENDING'; -- PENDING, SYNCED, FAILED

-- ─── Enable RLS for security ──────────────────────────────────────────
ALTER TABLE blocked_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all audit tables
CREATE POLICY "Admins can view blocked_attempts"
  ON blocked_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auth.users WHERE auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  ));

CREATE POLICY "Admins can view device_activity_log"
  ON device_activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auth.users WHERE auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  ));

-- ─── Create function to auto-log user changes ────────────────────────
CREATE OR REPLACE FUNCTION log_user_block_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.essl_blocked IS DISTINCT FROM NEW.essl_blocked) THEN
    INSERT INTO device_activity_log (essl_id, action, description, success)
    VALUES (
      NEW.essl_id,
      CASE WHEN NEW.essl_blocked THEN 'user_block' ELSE 'user_unblock' END,
      CASE WHEN NEW.essl_blocked 
        THEN 'User blocked: ' || NEW.username
        ELSE 'User unblocked: ' || NEW.username
      END,
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for block changes
DROP TRIGGER IF EXISTS on_user_block_change ON profiles;
CREATE TRIGGER on_user_block_change
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_user_block_change();

-- ─── View: Pending commands ready for device ────────────────────────────
CREATE OR REPLACE VIEW v_pending_commands AS
SELECT 
  id,
  essl_id,
  command,
  status,
  created_at,
  sequence_id
FROM essl_commands
WHERE status = 'pending'
ORDER BY created_at ASC;

-- ─── View: Recent blocked attempts ────────────────────────────────────────
CREATE OR REPLACE VIEW v_recent_blocked_attempts AS
SELECT 
  ba.essl_id,
  COUNT(*) as attempt_count,
  MAX(ba.attempted_at) as latest_attempt,
  CASE 
    WHEN p.essl_blocked THEN 'Currently Blocked ✓'
    ELSE 'Warning: Flag not set'
  END as status
FROM blocked_attempts ba
LEFT JOIN profiles p ON ba.essl_id = p.essl_id
WHERE ba.attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY ba.essl_id, p.essl_blocked
ORDER BY attempt_count DESC;

-- ─── Insert test/seed data (optional) ────────────────────────────────────
-- Uncomment to test the setup:
/*
INSERT INTO essl_commands (essl_id, command, status, payload)
VALUES 
  ('ALL', 'INFO', 'pending', '{"action":"test"}');
*/

COMMIT;
