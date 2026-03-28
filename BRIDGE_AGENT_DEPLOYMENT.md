# Complete eSSL X990 Blocking System - Deployment Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         Your Web App / Admin Dashboard                   │
│         (React/Vue/Next.js)                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Calls Supabase Edge Functions
                     │
         ┌───────────▼────────────┐
         │   Supabase Cloud       │
         │  ┌──────────────────┐  │
         │  │ check-expired    │  │ → Finds expired users
         │  │ members function │  │ → Updates essl_blocked=true
         │  └───────┬──────────┘  │
         │          │             │
         │  ┌───────▼──────────┐  │
         │  │ essl_commands    │  │ → Queue for device:
         │  │ table (pending)  │  │   "DATA UPDATE USER PIN=CGA5"
         │  └───────┬──────────┘  │
         └──────────┼──────────────┘
                    │
    [Polls every 10 seconds]
                    │
         ┌──────────▼──────────────┐
         │  Bridge Agent (Python)  │
         │  (Your LAN PC)          │
         │  bridge_agent.py        │
         └──────────┬──────────────┘
                    │
                    │ TCP:4370 (ZKTeco Protocol)
                    │
         ┌──────────▼───────────────┐
         │   eSSL X990 Device        │
         │   @ 192.168.0.215        │
         │  ┌────────────────────┐  │
         │  │ Group 1: Enabled   │  │
         │  │ Group 99: BLOCKED  │  │ ← Execution
         │  └────────────────────┘  │
         └──────────────────────────┘
```

---

## Step-by-Step Deployment

### STEP 1: Supabase Schema (5 minutes)

**In Supabase Dashboard:**

1. Navigate to **SQL Editor**
2. Click **+ New Query**
3. Copy entire contents of: `bridge_agent_schema.sql`
4. Paste into editor
5. Click **▶️ Run**

**Verification:**
```sql
-- Run this to verify tables created
SELECT tablename FROM pg_tables 
WHERE schemaname='public' 
AND tablename IN ('essl_commands', 'blocked_attempts', 'device_activity_log');
```

**Expected:** Should return 3 rows.

---

### STEP 2: Install Python Dependencies (2 minutes)

**On your Bridge Agent PC/Server:**

```bash
# Clone or download the repository
cd /path/to/bridge_agent

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "from zk import ZK; print('✓ py-zk installed')"
```

---

### STEP 3: Configure Environment (3 minutes)

**Create `.env` file:**

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env          # or use your editor
```

**Your `.env` should look like:**

```
SUPABASE_URL=https://osjvvcbcvlcdmqxczttf.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DEVICE_IP=192.168.0.215
DEVICE_PORT=4370
DEVICE_TIMEOUT=30
POLL_INTERVAL=10
```

**Where to get Service Key:**
1. Supabase Dashboard
2. Settings → API
3. Copy "Service Role Key" (NOT the anon key)
4. Keep it SECRET!

---

### STEP 4: Test Device Connection (2 minutes)

**Run this quick test:**

```bash
python -c "
from zk import ZK
try:
    zk = ZK('192.168.0.215', port=4370, timeout=10)
    zk.connect()
    print(f'✓ Connected! Device: {zk.get_device_name()}')
    users = zk.get_users()
    print(f'✓ Users on device: {len(users)}')
    zk.disconnect()
except Exception as e:
    print(f'✗ Error: {e}')
"
```

**Expected output:**
```
✓ Connected! Device: ZK X990...
✓ Users on device: 15
```

**If it fails:**
- Check IP: `ping 192.168.0.215`
- Check port: `telnet 192.168.0.215 4370`
- Check device is on same subnet

---

### STEP 5: Start Bridge Agent (1 minute)

```bash
python bridge_agent.py
```

**Expected output:**
```
2026-03-21 14:05:30,123 [INFO] 🚀 Bridge Agent Starting...
2026-03-21 14:05:30,124 [INFO]    Target: 192.168.0.215:4370
2026-03-21 14:05:30,125 [INFO]    Poll Interval: 10s
2026-03-21 14:05:30,126 [INFO]    Supabase: https://osjvvcbcvlcdmqxczttf.supabase.co
2026-03-21 14:05:31,234 [INFO] ✓ Connected to X990 @ 192.168.0.215:4370
2026-03-21 14:05:31,240 [INFO] 📨 Found 0 pending command(s)
```

**Keep this running in the background:**
- On Linux/Mac: Use `nohup python bridge_agent.py &` or systemd service
- On Windows: Use Task Scheduler or create a batch file

---

### STEP 6: Test End-to-End Blocking (5 minutes)

**Test Scenario: Block user CGA5**

#### In Supabase SQL Editor:

```sql
-- 1. Force the user to be expired
UPDATE profiles
SET essl_blocked = true, plan_status = 'expired'
WHERE essl_id = 'CGA5';

-- 2. Queue block command to device
INSERT INTO essl_commands (essl_id, command, status, payload)
VALUES (
  'ALL',
  'DATA UPDATE USER PIN=CGA5 Group=99 EndDateTime=20261231235959',
  'pending',
  '{"action":"test_block","reason":"testing"}'
);

-- 3. Wait 15 seconds for bridge to process
-- (Bridge polls every 10s)

-- 4. Check the result
SELECT command, status, result, updated_at
FROM essl_commands
WHERE command LIKE '%CGA5%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected result after 15 seconds:**
```
command                                          | status    | result
-----------------------------------------------------+----------+-----------
DATA UPDATE USER PIN=CGA5 Group=99...             | completed | {"success": true, "pin": "CGA5", "group": 99}
```

#### Test on the Device:

1. **Have user CGA5 try to scan the biometric reader**
2. **Expected behavior:**
   - ❌ Device shows: "Access Denied"
   - ❌ No beep/unlock
   - ❌ No attendance record in Supabase

**Verify in Supabase:**
```sql
-- Should be NO new attendance for CGA5
SELECT * FROM attendance
WHERE essl_id = 'CGA5'
AND check_in > NOW() - INTERVAL '5 minutes'
ORDER BY check_in DESC;

-- Should see blocked attempt logged
SELECT * FROM blocked_attempts
WHERE essl_id = 'CGA5'
ORDER BY attempted_at DESC
LIMIT 5;
```

---

## Now Integrate with Your App

### In ConfigScreen (React)

**Your existing button now uses the bridge:**

```typescript
const handleCheckExpiredMembers = async () => {
  try {
    setIsCheckingExpiry(true);
    const { data, error } = await supabase.functions.invoke('check-expired-members');
    
    if (error) throw error;
    
    // This now triggers the bridge automatically!
    alert(`Expiry check complete: ${data.processed} users processed.`);
    alert('Block commands queued. Bridge agent will sync within 10 seconds.');
    fetchEsslCommands();
  } catch (error: any) {
    console.error('Error:', error);
    alert(error.message);
  } finally {
    setIsCheckingExpiry(false);
  }
};
```

### Flow when a user's plan expires:

```
1. check-expired-members function runs
   ├─ Finds expiredusers
   └─ Sets essl_blocked=true
   
2. Supabase trigger (auto) or manual insert queues:
   └─ "DATA UPDATE USER PIN=CGA5 Group=99" → essl_commands (pending)

3. Bridge Agent picks it up (10s poll)
   └─ Connects to X990
   └─ Executes: Move CGA5 to Group 99
   └─ Updates status: completed

4. Device enforces locally
   └─ CGA5 scans: Device checks Group=99 (blocked)
   └─ Device denies: No unlock, no server call

5. (Optional) Attendance record
   └─ If CGA5 somehow bypasses device, server also rejects
```

---

## Monitoring & Verification

### Daily Checklist

**Every morning, check:**

```sql
-- 1. Is bridge still running?
SELECT COUNT(*) as pending_commands
FROM essl_commands
WHERE status = 'pending';
-- Should be 0 or empty most of the time

-- 2. Recent block attempts?
SELECT * FROM v_recent_blocked_attempts;

-- 3. Device online?
SELECT * FROM device_status
WHERE device_ip = '192.168.0.215';

-- 4. Activity log (last 24h)
SELECT * FROM device_activity_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

### Troubleshooting

**If bridge is not running:**
```bash
# Check process
ps aux | grep bridge_agent

# Check logs
tail -f bridge_agent.log

# Restart
python bridge_agent.py
```

**If commands not executing:**
```bash
# Check Supabase connectivity
curl https://osjvvcbcvlcdmqxczttf.supabase.co/rest/v1/ \
  -H "apikey: $SUPABASE_SERVICE_KEY"

# Check device connectivity
ping 192.168.0.215
telnet 192.168.0.215 4370
```

**If user can still access after blocking:**
```sql
-- Verify block was queued
SELECT * FROM essl_commands
WHERE command LIKE '%CGA5%'
ORDER BY created_at DESC;

-- Verify database block flag
SELECT essl_blocked, plan_status, device_sync_status
FROM profiles
WHERE essl_id = 'CGA5';

-- Test manual block
INSERT INTO essl_commands (essl_id, command, status)
VALUES ('ALL', 'DATA UPDATE USER PIN=CGA5 Group=99', 'pending');
```

---

## Complete System Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **Web App** | Your dashboard | Admin controls, view blocked users |
| **Supabase** | Cloud | Queue commands, store logs |
| **Bridge Agent** | Your LAN PC | Execute commands on device |
| **X990 Device** | 192.168.0.215 | Enforce locally (Group 99 = blocked) |

---

## Security Checklist

- [ ] Service key is in `.env` (not hardcoded in code)
- [ ] `.env` file is in `.gitignore`
- [ ] Bridge agent runs as non-root user (Linux/Mac)
- [ ] X990 firewall restricts port 4370 to trusted IPs
- [ ] Audit logs are reviewed regularly
- [ ] Backup service key stored securely

---

## Success Indicators

✅ **System is working when:**
1. Bridge logs show: "Connected to X990"
2. Pending commands become "completed" within 15 seconds
3. Blocked users are denied at device (Group 99)
4. Activity log shows all operations

❌ **Issues if:**
- Bridge can't connect: Check IP/network
- Commands stay "pending": Check bridge is running
- Users still access: Verify Group 99 is assigned
- No logs: Check Supabase schema was applied

---

## Next Steps

1. ✅ Run `bridge_agent_schema.sql` in Supabase
2. ✅ Install Python dependencies
3. ✅ Create `.env` file with your values
4. ✅ Test device connection
5. ✅ Start `bridge_agent.py`
6. ✅ Test blocking CGA5
7. ✅ Monitor logs

**Once working, your admin panel can block users instantly from the web app!**
