# ✓ ESSL X990 CGA2/CGA5 Access Issue - Diagnostic Guide

**Status**: Device is actively communicating with Supabase
- **Device SN**: CUB7252100258
- **Last Activity**: Multiple requests in last hour
- **Endpoint**: essl-attendance function (v28)

## 📋 Diagnostic Steps

### 1. Check Database via Supabase Dashboard

#### Query 1: User Status
```sql
SELECT 
  id, username, essl_id, plan_status, plan_expiry_date, essl_blocked, 
  grace_period, device_sync_status, last_synced_at
FROM profiles 
WHERE essl_id IN ('CGA2', 'CGA5')
ORDER BY username;
```

**What to look for:**
- `essl_blocked` should be `true` for blocked users
- `plan_status` should be 'expired' for expired users
- `plan_expiry_date` should be in the past

#### Query 2: Pending Commands
```sql
SELECT 
  id, essl_id, command, status, created_at, updated_at, sequence_id
FROM essl_commands
WHERE essl_id IN ('CGA2', 'CGA5', 'ALL') AND status IN ('pending', 'sent')
ORDER BY created_at DESC;
```

**What to look for:**
- Commands should be queued with `status = 'pending'`
- Example for CGA2 block:
  - `DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99`
  - `DATA UPDATE USERINFO PIN=CGA2\tEnable=0`

#### Query 3: Recent Attendance Scans
```sql
SELECT 
  a.id, a.check_in, p.username, p.essl_id, p.essl_blocked, p.plan_status, 
  a.device_id, a.raw_data
FROM attendance a
LEFT JOIN profiles p ON a.user_id = p.id
WHERE p.essl_id IN ('CGA2', 'CGA5')
ORDER BY a.check_in DESC
LIMIT 20;
```

**What to look for:**
- Recent scans from users that should be blocked
- These should NOT exist if the user was successfully blocked

### 2. Check Cloudflare Worker Logs

#### URL: `https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance?SN=CUB7252100258`

The device is actively polling. Check if it's also calling `/iclock/getrequest` via Cloudflare Worker to fetch commands.

### 3. Common Issues & Solutions

#### Issue A: Commands Not Queued
**Symptom**: No commands in `essl_commands` table for CGA2/CGA5

**Solution**:
1. Manually queue block commands:
```sql
INSERT INTO essl_commands (essl_id, command, status, payload) VALUES
  ('ALL', 'DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99', 'pending', '{"user_id":"<uuid>"}'),
  ('ALL', 'DATA UPDATE USERINFO PIN=CGA2\tEnable=0', 'pending', '{"user_id":"<uuid>"}'),
  ('ALL', 'DATA UPDATE USER PIN=CGA5 EndDateTime=20260101000000 Group=99', 'pending', '{"user_id":"<uuid>"}'),
  ('ALL', 'DATA UPDATE USERINFO PIN=CGA5\tEnable=0', 'pending', '{"user_id":"<uuid>"}');
```

2. Mark profiles as blocked:
```sql
UPDATE profiles 
SET essl_blocked = true, plan_status = 'expired'
WHERE essl_id IN ('CGA2', 'CGA5');
```

#### Issue B: Commands Queued but Not Executed
**Symptom**: Commands exist but status is still 'pending' or 'sent'

**Possible Causes**:
1. Device not polling `/iclock/getrequest` endpoint
2. Cloudflare Worker not receiving device requests
3. Device executing commands but not reporting back

**Solution**:
1. Check Worker logs to see if device is calling `/iclock/getrequest`
2. Verify device can reach Cloudflare Worker endpoint
3. Check device's local logs for command execution errors

#### Issue C: Device Ignoring Group=99 Restriction
**Symptom**: Commands show 'completed' but user still has access

**Possible Causes**:
1. Device not enforcing Group 99 access restriction
2. User's PIN exists in multiple groups on device
3. Device firmware issue

**Solution**:
1. Verify Group 99 is configured as "No Access" on device
2. Check device's access control configuration
3. Consider updating access groups via `DATA QUERY AccessGroup` command

### 4. Force Block Users Script

```bash
# Call via Supabase API to directly block user
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/sync-member-to-device \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "<user_id_from_database>",
    "action": "expire"
  }'
```

### 5. Device Direct Command

If all else fails, send command directly to device via Cloudflare Worker:

```bash
curl -X POST https://<cf-worker-url>/essl/users/block \
  -H "x-internal-secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "essl_id": "CGA2"
  }'
```

---

## 🔍 Next Steps

1. Run Query 1 to identify the exact user IDs and current status
2. Run Query 2 to check if commands are queued
3. Run Query 3 to see recent scans
4. Based on results, apply the appropriate solution above

**Report findings** with the output from the three queries above.
