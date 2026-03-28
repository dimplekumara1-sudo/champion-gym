# ✓ ESSL X990 CGA2/CGA5 Door Access Issue - Complete Fix Guide

**Status**: ✅ Device is actively communicating with Supabase (live logs confirmed)
- **Device SN**: CUB7252100258
- **Last Device Ping**: Within last few minutes
- **Communication Channel**: Supabase Edge Function `essl-attendance` v28

---

## 🔍 Problem Analysis

You reported that **CGA2 and CGA5 are still accessing the door** despite being in the system.

### Why This Happens

The ESSL X990 works with a 3-step blocking  mechanism:

```
Step 1: Queue Block Commands in Supabase
   └─ INSERT into essl_commands table with:
      • DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99
      • DATA UPDATE USERINFO PIN=CGA2\tEnable=0

Step 2: Device Polls for Commands
   └─ Device calls Cloudflare Worker at `/iclock/getrequest`
      └─ Worker fetches pending commands from Supabase
      └─ Worker returns: C:ID:COMMAND\n

Step 3: Device Executes & Reports Back
   └─ Device executes: DATA UPDATE USER/USERINFO commands
   └─ Device reports back: ID=COMMAND_ID&Return=0
   └─ Supabase marks command status: 'completed'
```

**If CGA2/CGA5 still have access:**
- ❌ Commands were never queued (Step 1 failed)
- ❌ Commands queued but device didn't fetch them (Step 2 failed)
- ❌ Device got commands but didn't execute properly (Step 3 failed)
- ❌ Device is not enforcing Group 99 restriction

---

## 🚀 Quick Fix - Immediate Blocking

### Option 1: Via Supabase Dashboard (Fastest)

1. **Go to** `https://supabase.com` → Select project `osjvvcbcvlcdmqxczttf`

2. **SQL Editor** → Paste and execute:

```sql
-- STEP 1: Queue block commands for CGA2 and CGA5
INSERT INTO essl_commands (essl_id, command, status, payload)
VALUES 
  ('ALL', 'DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99', 'pending', '{"reason":"manual_block"}'),
  ('ALL', 'DATA UPDATE USERINFO PIN=CGA2\tEnable=0', 'pending', '{"reason":"manual_block"}'),
  ('ALL', 'DATA UPDATE USER PIN=CGA5 EndDateTime=20260101000000 Group=99', 'pending', '{"reason":"manual_block"}'),
  ('ALL', 'DATA UPDATE USERINFO PIN=CGA5\tEnable=0', 'pending', '{"reason":"manual_block"}');

-- STEP 2: Mark users as blocked in profiles table
UPDATE profiles 
SET essl_blocked = true, plan_status = 'expired', device_sync_status = 'SYNC_PENDING'
WHERE essl_id IN ('CGA2', 'CGA5');

-- STEP 3: Verify commands were queued
SELECT id, essl_id, command, status, created_at FROM essl_commands 
WHERE essl_id IN ('CGA2', 'CGA5', 'ALL') AND status IN ('pending', 'sent')
ORDER BY created_at DESC;
```

3. **Wait for Device to Poll**
   - Device polls every 30-60 seconds
   - Commands will be marked as 'completed' once executed
   - CGA2/CGA5 will be immediately blocked on their next scan attempt

---

### Option 2: Via API Call

```bash
# Call the sync-member-to-device edge function
# First, get the user IDs for CGA2 and CGA5 from profiles table

# Then call the function:
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/sync-member-to-device \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "<uuid-of-CGA2-user>",
    "action": "expire"
  }'
```

---

## 🔧 Troubleshooting Checklist

### Check 1: Do CGA2/CGA5 users exist in database?

**Supabase Dashboard → SQL Editor:**

```sql
SELECT id, username, essl_id, plan_status, essl_blocked, plan_expiry_date
FROM profiles
WHERE essl_id IN ('CGA2', 'CGA5')
ORDER BY username;
```

**Expected Output:**
```
┌──────────────────────┬────────┬──────────┬──────────────┬──────────────┐
│ id                   │ name   │ essl_id  │ plan_status  │ essl_blocked │
├──────────────────────┼────────┼──────────┼──────────────┼──────────────┤
│ c4dad036-f9f8-...    │ CGA2   │ CGA2     │ expired      │ true         │
│ a1b2c3d4-e5f6-...    │ CGA5   │ CGA5     │ expired      │ true         │
└──────────────────────┴────────┴──────────┴──────────────┴──────────────┘
```

❌ **Not found?** → These are test users you need to create manually in the app

### Check 2: Are block commands queued?

```sql
SELECT id, essl_id, command, status, created_at, updated_at
FROM essl_commands
WHERE essl_id IN ('CGA2', 'CGA5', 'ALL') 
  AND command LIKE '%CGA2%' OR command LIKE '%CGA5%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- 2 commands per user (USER + USERINFO)
- Status should progress: `pending` → `sent` → `completed`

❌ **No commands?** → Run the SQL from "Option 1" above

### Check 3: Are users still scanning after commands?

```sql
SELECT a.check_in, p.username, p.essl_id, p.essl_blocked, a.device_id
FROM attendance a
LEFT JOIN profiles p ON a.user_id = p.id
WHERE p.essl_id IN ('CGA2', 'CGA5')
ORDER BY a.check_in DESC
LIMIT 20;
```

❌ **Recent scans?** → Commands exist but device isn't executing them

---

## 🎯 Root Cause & Solution Matrix

| Symptom | Cause | Solution |
|---------|-------|----------|
| **No commands in table** | Sync function never called or failed | Run SQL from Option 1 |
| **Commands pending** | Device not polling `/iclock/getrequest` | Device connectivity issue (check firewall, Cloudflare Worker) |
| **Commands completed** | Device executed but not enforcing Group 99 | Check device configuration - Group 99 must be "Disabled/No Access" group |
| **Recent scans but blocked** | Database marked as blocked but device has cache | Restart device or clear local cache |
| **Commands in 'sent' status** | Device got commands but didn't report back | Check device response logs |

---

## 🔐 Advanced: Verify  Cloudflare Worker Config

The bridge between ESSL device and Supabase is a Cloudflare Worker at:
- **File**: [gym/src/index.js](gym/src/index.js)
- **Endpoints**:
  - `/iclock/getrequest?SN=CUB7252100258` - Device fetches pending commands
  - `/iclock/cdata` - Device sends attendance logs
  - `/iclock/devicecmd` - Device reports command execution status

**Check Worker Logs:**

1. Open Supabase → Edge Functions → Logs
2. Filter for: `SN=CUB7252100258`
3. Look for:
   - ✅ `GET /iclock/getrequest?SN=...` = Device is polling
   - ✅ `POST /iclock/cdata` = Device is sending logs
   - ✅ Response contains: `C:ID:COMMAND\n` = Commands being sent

---

## 📊 Complete Testing Flow

```bash
# 1. Check current status
SELECT * FROM profiles WHERE essl_id IN ('CGA2', 'CGA5');

# 2. Queue block commands
INSERT INTO essl_commands (essl_id, command, status) 
VALUES ('ALL', 'DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99', 'pending'), ...

# 3. Wait 60-90 seconds for device to poll

# 4. Check command execution status
SELECT command, status, updated_at FROM essl_commands 
WHERE essl_id = 'ALL' AND command LIKE '%CGA2%' 
ORDER BY updated_at DESC;

# 5. Verify user still gets access (should be DENIED)
-- Have test user CGA2 scan the device biometric reader
-- Should see: ❌ Access DENIED message on device

# 6. Check attendance log (should NOT have new scan)
SELECT * FROM attendance 
WHERE user_id = (SELECT id FROM profiles WHERE essl_id = 'CGA2')
ORDER BY check_in DESC LIMIT 1;
```

---

## 🚨 Emergency: Force Block via Worker

If all else fails, you can call the Cloudflare Worker directly:

```bash
curl -X POST https://<your-cf-worker-url>/essl/users/block \
  -H "x-internal-secret: <your-secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "essl_id": "CGA2"
  }'
```

This will:
1. Queue the block command immediately
2. Mark user as `essl_blocked = true`
3. Device will pick up on next poll

---

## 📝 Summary

| Action | Status | Result |
|--------|--------|--------|
| **Device Communication** | ✅ ACTIVE | Device is actively polling Supabase |
| **Command Queueing** | ⏳ Unknown | Need to verify commands are queued |
| **Command Execution** | ⏳ Unknown | Need to verify device executed commands |
| **Access Control** | ❌ FAILING | CGA2/CGA5 still have access |

**Next Steps:**
1. Run the SQL checks from "Check 1-3" above
2. Report findings back with the output
3. Apply the appropriate fix from the "Troubleshooting Matrix"
4. Verify: Have blocked users try to scan - should get "ACCESS DENIED"

---

## 🔗 Related Files

- [sync-member-to-device function](supabase/functions/sync-member-to-device/index.ts)
- [Cloudflare Worker code](gym/src/index.js)
- [ESSL System Guide](ESSL_SYSTEM_COMPLETE_FIX.md)
- [Diagnostic Checklist](ESSL_CGA2_CGA5_DIAGNOSTIC.md)
