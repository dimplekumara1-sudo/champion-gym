# Architecture Validation Test Script

## Step 1: Test Manual Block via Cloudflare Worker

Your proposed manual endpoint:
```bash
curl -X POST https://your-worker.workers.dev/block-user \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "deviceUid": 12345}'
```

**Expected Result:**
- Row inserted in `essl_commands` with `status: pending`
- Within 30 seconds, Python `bridge_agent.py` should pick it up
- Command status changes: `pending` → `sent` → `completed`
- User can no longer scan card on X990 device

---

## Step 2: Test Automatic Scheduler (Your Current Setup)

Your cron runs every 30 minutes. To test immediately:

```bash
# Call the check-expired-members function directly
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/check-expired-members \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Check these:**

```sql
-- 1. See what users were marked as expired
SELECT id, full_name, essl_id, plan_expiry_date, essl_blocked, plan_status
FROM profiles
WHERE essl_blocked = true
  AND plan_status = 'expired'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. Check if commands were queued
SELECT essl_id, command, status, created_at
FROM essl_commands
WHERE command LIKE '%Group=99%'
  OR command LIKE '%Enable=0%'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if bridge agent executed them
SELECT essl_id, action, success, created_at
FROM device_activity_log
WHERE action = 'user_block'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 3: Confirm X990 Block Method Works

Your device uses **Group=99** to block. Verify this is correct:

**SSH into your X990 or use ADMS:**

```
1. Find a test user (or create one: PIN=TEST123)
2. Note their current Group (should be 1 = normal access)
3. Run command: DATA UPDATE USER PIN=TEST123 Group=99
4. Try scanning the card on the device
   - If blocked: ✅ Architecture works
   - If access allowed: ❌ Different approach needed (try Enable=0 or delete_user)
```

---

## Step 4: Edge Cases to Test

### Case A: Block an Active User, Then Unblock
```sql
-- Block
UPDATE profiles SET essl_blocked = true WHERE essl_id = 'TEST123';

-- Should queue Group=99 command
SELECT * FROM essl_commands WHERE essl_id = 'TEST123' AND command LIKE '%Group=99%';

-- Unblock
UPDATE profiles SET essl_blocked = false WHERE essl_id = 'TEST123';

-- Should queue Group=1 command  
SELECT * FROM essl_commands WHERE essl_id = 'TEST123' AND command LIKE '%Group=1%';
```

### Case B: User Expires During Grace Period
```sql
UPDATE profiles 
SET plan_expiry_date = NOW() - INTERVAL '5 days'
WHERE essl_id = 'CGA1';

-- Run check-expired-members
-- Verify: User marked as expired + blocked if past grace period
SELECT essl_blocked, plan_status FROM profiles WHERE essl_id = 'CGA1';
```

### Case C: Offline Device, Then Online
If X990 is offline when block command is queued:
- Command sits in `essl_commands` with status `pending`
- When device comes online, bridge agent will send it
- Status updates to `completed` when device acknowledges

Check: `SELECT * FROM essl_commands WHERE status NOT IN ('completed', 'failed');`

---

## Differences: Proposed vs. Your Architecture

| Feature | Proposed | Your Current |
|---------|----------|--------------|
| **Trigger** | Manual POST to Worker | React UI button |
| **Transport** | Cloudflare to Express | Supabase to Python |
| **Library** | zklib-js | pyzk |
| **Scheduler** | Cloudflare cron | Supabase pg_cron |
| **Reliability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (already tested) |

**Recommendation:** Your current setup is proven. The proposed architecture would work but requires additional infrastructure (Cloud Server with Express + Node.js runtime).

### If You Want to Implement The Proposed Approach:

You'd need to:
1. Set up a Node.js Cloud Server  
2. Install `zklib-js` (npm package)
3. Replace Python bridge agent with Express middleware
4. Update Cloudflare Worker to route to Cloud Server instead of command queue

**But your current architecture accomplishes the same goal with less complexity.**

---

## Validation Checklist

- [ ] Manual block via UI works (card cannot scan)
- [ ] Automatic check finds expired users (every 30 min)
- [ ] Grace period is respected (user not blocked during grace)
- [ ] Commands sync from queue to device (check device_activity_log)
- [ ] Offline device queues commands properly
- [ ] Unblock also works (re-enables user after manual block)
- [ ] No duplicate commands sent to device
- [ ] Command error logging works (check failed status)
