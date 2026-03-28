--========================================
-- ESSL X990 - CGA2/CGA5 IMMEDIATE BLOCK FIX
-- Copy-paste this entire script into Supabase SQL Editor
-- Then run it all at once
--========================================

-- STEP 1: Check if CGA2 and CGA5 exist
SELECT 
  id, 
  essl_id,
  plan_status, 
  essl_blocked,
  plan_expiry_date,
  grace_period,
  device_sync_status,
  last_synced_at
FROM profiles
WHERE essl_id IN ('CGA2', 'CGA5')
ORDER BY essl_id;

--========================================

-- STEP 2: Queue block commands
-- This will create 4 commands: 2 for CGA2, 2 for CGA5
INSERT INTO essl_commands (essl_id, command, status, payload) VALUES
  ('ALL', 'DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99', 'pending', '{"user_id":"cga2","reason":"door_access_block","pin":"CGA2"}'),
  ('ALL', 'DATA UPDATE USERINFO PIN=CGA2	Enable=0', 'pending', '{"user_id":"cga2","reason":"door_access_block","pin":"CGA2"}'),
  ('ALL', 'DATA UPDATE USER PIN=CGA5 EndDateTime=20260101000000 Group=99', 'pending', '{"user_id":"cga5","reason":"door_access_block","pin":"CGA5"}'),
  ('ALL', 'DATA UPDATE USERINFO PIN=CGA5	Enable=0', 'pending', '{"user_id":"cga5","reason":"door_access_block","pin":"CGA5"}');

--========================================

-- STEP 3: Update profiles table to mark as blocked
UPDATE profiles 
SET 
  essl_blocked = true, 
  plan_status = 'expired',
  device_sync_status = 'SYNC_PENDING',
  last_synced_at = NOW()
WHERE essl_id IN ('CGA2', 'CGA5');

--========================================

-- STEP 4: Verify commands were queued
SELECT 
  id::text,
  essl_id,
  command,
  status,
  sequence_id,
  created_at,
  updated_at
FROM essl_commands
WHERE (essl_id = 'ALL' AND (command LIKE '%CGA2%' OR command LIKE '%CGA5%'))
  OR essl_id IN ('CGA2', 'CGA5')
ORDER BY created_at DESC
LIMIT 10;

--========================================

-- STEP 5: Verify profiles were updated
SELECT 
  id::text,
  essl_id,
  plan_status,
  essl_blocked,
  device_sync_status,
  last_synced_at
FROM profiles
WHERE essl_id IN ('CGA2', 'CGA5')
ORDER BY essl_id;

--========================================

-- STEP 6: Check recent attendance (should be empty after fix takes effect)
-- Run this after 2 minutes to verify no recent scans from blocked users
SELECT 
  a.id::text,
  a.check_in,
  p.essl_id,
  p.essl_blocked,
  a.device_id,
  CASE 
    WHEN a.check_in > NOW() - INTERVAL '5 minutes' THEN '⚠️ RECENT'
    ELSE 'old'
  END as recency
FROM attendance a
LEFT JOIN profiles p ON a.user_id = p.id
WHERE p.essl_id IN ('CGA2', 'CGA5')
ORDER BY a.check_in DESC
LIMIT 20;

--========================================

-- STEP 7: Monitor command execution status
-- Run this multiple times (device polls every 30-60 seconds)
-- Status should go: pending → sent → completed
SELECT 
  id::text,
  essl_id,
  command,
  status,
  sequence_id,
  created_at,
  updated_at,
  updated_at - created_at as execution_time
FROM essl_commands
WHERE (essl_id = 'ALL' AND (command LIKE '%CGA2%' OR command LIKE '%CGA5%'))
ORDER BY created_at DESC;

--========================================
-- IMPORTANT NOTES:
--
-- 1. After running this script: 
--    - Device will fetch the commands within 30-60 seconds
--    - Commands status will change: pending → sent → completed
--    - CGA2/CGA5 will be locked out immediately
--
-- 2. To verify blocking worked:
--    - Have someone with CGA2/CGA5 biometric ID try to scan
--    - Device should display "ACCESS DENIED" or similar
--    - No new attendance record should be created
--
-- 3. If blocking doesn't work:
--    - Check STEP 7 output: commands should be 'completed'
--    - If still 'pending' after 2 minutes: device not polling
--    - If 'completed' but access works: device not enforcing Group 99
--
-- 4. To UNBLOCK users later:
--    - Update essl_blocked = false
--    - Queue re-enable commands with Group=1, Enable=1
--    - Set future plan_expiry_date
--
--========================================
