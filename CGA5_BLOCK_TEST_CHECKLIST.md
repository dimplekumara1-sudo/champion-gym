# CGA5 Block Test - Step-by-Step Checklist

## Current Status
```
User: YUVA SUBHARAM VASAMSETTI
ESSL ID: CGA5
Plan Expiry: 2026-02-09 (47 days expired)
Current Status: essl_blocked = true, plan_status = 'expired'
Grace Period: 0 (no grace)

New Command Queued:
├─ ID: 1d2a2c05-fbdd-4576-962e-fab42f562ba1
├─ Command: "DATA UPDATE USER PIN=CGA5 Group=99"
├─ Status: pending (READY TO EXECUTE)
└─ Created: 2026-03-28 13:47:23
```

---

## Pre-Test Checklist

### ✅ Step 1: Verify Network Connectivity
```powershell
# Test device can be reached
ping 192.168.0.215

# Expected output: "Reply from 192.168.0.215"
# If fails: Check device IP is correct, device is powered on
```

### ✅ Step 2: Verify Python & pyzk
```powershell
# Check Python is installed
python --version
# Expected: Python 3.8+

# Install/upgrade pyzk
pip install pyzk --upgrade

# Verify pyzk works
python -c "from zk import ZK; print('✅ pyzk ready')"
```

### ✅ Step 3: Check .env Configuration
File: `.env`
```
SUPABASE_URL=https://osjvvcbcvlcdmqxczttf.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DEVICE_IP=192.168.0.215                           ✅ Confirmed
DEVICE_PORT=4370                                  ✅ Correct
DEVICE_TIMEOUT=30                                 ✅ OK
POLL_INTERVAL=10                                  ✅ OK
```

---

## Execution Test

### Test Method A: Run Bridge Agent (Recommended)
```powershell
cd "c:\Users\dimpl\Downloads\powerflex---elite-fitness-coach (1)"
python bridge_agent.py
```

**What to watch for:**
```
✅ GOOD SIGNS:
[INFO] [START] Bridge Agent Starting...
[INFO]    Device  : 192.168.0.215:4370
[INFO]    Supabase: https://osjvvcbcvlcdmqxczttf.supabase.co
[INFO]    Poll    : every 10s
[INFO] [FOUND] Pending commands: 1
[INFO]   >> Executing: DATA UPDATE USER PIN=CGA5 Group=99
[INFO] [OK] Connected to X990 @ 192.168.0.215:4370
[INFO]   [OK] Blocked PIN=CGA5 -> Group 99
[INFO]   [OK] Completed: 1d2a2c05-fbdd-4576-962e-fab42f562ba1

❌ BAD SIGNS:
Device connection failed: No such file or directory
ModuleNotFoundError: No module named 'zk'
Supabase request error: 401 Unauthorized [Check API key]
[ERROR] Connection timed out [Check device IP: 192.168.0.215]
```

**Expected total time:** 10-30 seconds before completion

---

### Test Method B: Manual Block Script
If you can't run bridge agent, use this script:

**Step 1: Create file `manual_block_cga5.py`**
```python
#!/usr/bin/env python3
import os, sys
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuration
DEVICE_IP = os.getenv('DEVICE_IP', '192.168.0.215')
DEVICE_PORT = int(os.getenv('DEVICE_PORT', 4370))
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

print("=" * 60)
print("MANUAL CGA5 BLOCK TEST")
print("=" * 60)
print(f"Device: {DEVICE_IP}:{DEVICE_PORT}")
print(f"Target: CGA5 (YUVA SUBHARAM VASAMSETTI)")
print()

# Step 1: Import ZK
print("[1/4] Importing ZK library...")
try:
    from zk import ZK
    print("✅ ZK imported successfully")
except ImportError as e:
    print(f"❌ Failed to import ZK: {e}")
    print("   Fix: pip install pyzk")
    sys.exit(1)

# Step 2: Connect to device
print("\n[2/4] Connecting to device...")
try:
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=30)
    conn = zk.connect()
    conn.disable_device()
    print(f"✅ Connected to {DEVICE_IP}:{DEVICE_PORT}")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("   Troubleshooting:")
    print("   - Check device IP: 192.168.0.215")
    print("   - Check device is powered on")
    print("   - Check network: ping 192.168.0.215")
    print("   - Check port: telnet 192.168.0.215 4370")
    sys.exit(1)

# Step 3: Get CGA5 user
print("\n[3/4] Finding CGA5 on device...")
try:
    users = conn.get_users()
    cga5 = next((u for u in users if str(u.user_id) == 'CGA5'), None)
    
    if not cga5:
        print(f"❌ CGA5 not found on device")
        print(f"   Available users: {[u.user_id for u in users[:5]]}")
        conn.enable_device()
        conn.disconnect()
        sys.exit(1)
    
    print(f"✅ Found CGA5")
    print(f"   UID: {cga5.uid}")
    print(f"   Name: {cga5.name}")
    print(f"   Current Group: {cga5.group_id}")
    print(f"   Enable: {getattr(cga5, 'enable', 'N/A')}")
    
except Exception as e:
    print(f"❌ Failed to get users: {e}")
    conn.enable_device()
    conn.disconnect()
    sys.exit(1)

# Step 4: Block user
print("\n[4/4] Blocking CGA5 (setting Group=99)...")
try:
    conn.set_user(
        uid=cga5.uid,
        name=cga5.name,
        privilege=cga5.privilege,
        password=cga5.password,
        group_id='99',
        user_id=cga5.user_id,
        card=cga5.card
    )
    print("✅ Block command executed")
    
    # Verify
    users_after = conn.get_users()
    cga5_after = next((u for u in users_after if str(u.user_id) == 'CGA5'), None)
    
    if cga5_after and str(cga5_after.group_id) == '99':
        print("✅✅ VERIFICATION PASSED: CGA5 is now in Group 99")
        success = True
    else:
        print(f"⚠️  Verification inconclusive: Group={cga5_after.group_id if cga5_after else 'N/A'}")
        success = False
        
except Exception as e:
    print(f"❌ Block failed: {e}")
    success = False

# Cleanup
print("\n[CLEANUP] Disconnecting...")
try:
    if conn:
        conn.enable_device()
        conn.disconnect()
    print("✅ Disconnected cleanly")
except:
    pass

# Update database
if success:
    print("\n[DATABASE] Updating Supabase...")
    try:
        import requests
        import json
        
        headers = {
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        }
        
        # Mark command as completed
        update_url = f"{SUPABASE_URL}/rest/v1/essl_commands?id=eq.1d2a2c05-fbdd-4576-962e-fab42f562ba1"
        resp = requests.patch(
            update_url,
            json={'status': 'completed', 'updated_at': datetime.now().isoformat()},
            headers=headers
        )
        
        if resp.status_code in [200, 204]:
            print("✅ Command marked as completed in DB")
        
        # Log activity
        log_url = f"{SUPABASE_URL}/rest/v1/device_activity_log"
        resp = requests.post(
            log_url,
            json={
                'essl_id': 'CGA5',
                'action': 'user_block',
                'description': 'Blocked via manual script - Group=99',
                'success': True,
                'metadata': {'method': 'manual_block_script', 'timestamp': datetime.now().isoformat()}
            },
            headers=headers
        )
        
        if resp.status_code in [200, 201]:
            print("✅ Activity logged in DB")
            
    except Exception as e:
        print(f"⚠️  Database update failed: {e}")

print("\n" + "=" * 60)
print(f"TEST RESULT: {'✅ SUCCESS' if success else '❌ FAILED'}")
print("=" * 60)
sys.exit(0 if success else 1)
```

**Step 2: Run the script**
```powershell
python manual_block_cga5.py
```

---

## Post-Test Verification

### ✅ Database Check (Within 1 minute)
```sql
-- Check command status
SELECT status FROM essl_commands 
WHERE id = '1d2a2c05-fbdd-4576-962e-fab42f562ba1';
-- Expected: "completed"

-- Check activity log
SELECT * FROM device_activity_log
WHERE essl_id = 'CGA5'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: action='user_block', success=true

-- Check no new attendance for CGA5 today
SELECT * FROM attendance
WHERE essl_id = 'CGA5'
AND DATE(check_in) = CURRENT_DATE;
-- Expected: 0 rows
```

### ✅ Physical Device Check
1. **Have CGA5 try to scan their card at the X990 device**
   - Expected: "ACCESS DENIED" (or device beeps + red light)
   - If allowed: Group=99 not applied or device offline

2. **Check ADMS software:**
   - Find CGA5 user
   - Verify Group is set to 99
   - Verify Enable status

---

## Success Criteria  

| Criterion | Status | Details |
|-----------|--------|---------|
| Environment setup | ✅ | .env configured with IP 192.168.0.215 |
| Connectivity | ✅ | Device is reachable (can ping) |
| pyzk installed | 🔄 | Run: `pip install pyzk` |
| Bridge agent runs | 🔄 | Run: `python bridge_agent.py` |
| Command executes | 🔄 | Watch for "[OK] Completed" message |
| Database updated | 🔄 | essl_commands status = "completed" |
| Device blocked | 🔄 | CGA5 card scan = DENIED at device |
| Activity logged | 🔄 | device_activity_log has success=true |

---

## Current Command Ready for Execution

```
Command ID: 1d2a2c05-fbdd-4576-962e-fab42f562ba1
Status: pending ← Ready to go
Command: DATA UPDATE USER PIN=CGA5 Group=99
Queued: 2026-03-28 13:47:23

Just run bridge agent and this will execute!
```

---

## Expected Timeline

```
T+0s   → Bridge agent starts polling
T+0-10s → Finds pending command 
T+10s  → Connects to device 192.168.0.215:4370
T+15s  → Fetches CGA5 user info
T+18s  → Executes set_user() with Group=99
T+20s  → Marks command complete in database
T+30s  → Test results available

Total: ~30 seconds from start to finish
```

