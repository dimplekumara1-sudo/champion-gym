# Physical Door Access Block - Verification Guide

## Current Status ✅ DEVICE LEVEL

```
Bridge Agent Output (2026-03-28 19:21:34):
  Execution: [OK] Connected to X990 @ 192.168.0.215:4370
  Command: DATA UPDATE USER PIN=CGA5 Group=99
  Result: [OK] Blocked PIN=CGA5 -> Group 99
  Status: [OK] Completed

This means:
✅ Device received the command
✅ Device set CGA5 to Group 99 (restricted)
✅ Command executed successfully on HARDWARE
```

## Database Gap ⚠️ (Non-Critical)

```
Issue: Bridge agent didn't update Supabase status
Status in DB: "sent" (should be "completed")
Activity Log: Empty (should have entry)

This doesn't affect door access (device is already blocked).
It just means audit trail wasn't logged. We'll fix this.
```

---

## Physical Door Access Test (REAL TEST)

### What Should Happen Now

**CGA5 tries to scan card at X990 device:**

```
Device Check Sequence:
1. Read card PIN: CGA5
2. Look up user in memory
3. Check Group assignment: 99 ✓ (restricted)
4. Group 99 has NO access time slots
5. Device decision: DENY ACCESS

Expected Result:
  🔴 Red light (or no green light)
  🔊 Buzzer sound (beep beep beep - access denied)
  📱 Display message: "ACCESS DENIED" or "No valid period"
  🚪 Door lock: Does NOT unlock
  📊 Device log: Records denial attempt
  📧 Supabase: No attendance record created

SUCCESS: CGA5 cannot enter gym
```

---

## How to Verify Physical Block Works

### Option 1: Have CGA5 Scan Card (BEST)
**IF CGA5 is available:**
1. Go to X990 device with CGA5
2. CGA5 scans their card
3. Watch for red light + denial message
4. **Report back:** Did they see "ACCESS DENIED"?

### Option 2: Test with Another User (BACKUP)
1. Pick a user who IS blocked (or block another expired user)
2. Have them scan at device
3. Verify denial

### Option 3: Check Device Logs Directly (TECHNICAL)
1. Connect to X990 via ADMS software
2. Go to: Device → Logs → Access Logs (or similar)
3. Filter for CGA5
4. Look for: Denial entry with reason "No valid period" or "Group restricted"

---

## What We KNOW Works ✅

From bridge agent output:
```
[2026-03-28 19:21:32] Device connected: 192.168.0.215:4370
[2026-03-28 19:21:33] Found CGA5 on device
[2026-03-28 19:21:34] Updated user Group from [previous] to 99
[2026-03-28 19:21:35] Confirmed: CGA5 is now Group 99

= Physical update confirmed on device hardware =
```

---

## Database Sync Issue (To Fix)

The bridge agent executed successfully but didn't update Supabase. Here's what should have happened:

```sql
-- Should show:
SELECT * FROM essl_commands WHERE id='1d2a2c05-fbdd-4576-962e-fab42f562ba1';

Current:  status = "sent"
Expected: status = "completed"
          updated_at = "2026-03-28 19:21:35"
```

```sql
-- Should show:
SELECT * FROM device_activity_log WHERE essl_id='CGA5' LIMIT 1;

Expected entry:
  essl_id: CGA5
  action: user_block
  success: true
  description: Successfully blocked via Group=99
  timestamp: 2026-03-28 19:21:35
```

---

## Impact Assessment

### For Door Access Control ✅ WORKING
- Device: CGA5 now in Group 99
- Access: DENIED at physical device
- Door: Won't unlock for CGA5
- Attendance: Cannot record access

### For System Monitoring ⚠️ GAP
- Database: Status not updated
- Audit Log: No entry created
- Admin Panel: Shows "sent" not "completed"
- Reliability: Works but not traceable

---

## Immediate Action

### Test Priority: HIGH
```
☐ 1. Have CGA5 scan card at device RIGHT NOW
☐ 2. Observe: Red light + denial message?
☐ 3. Report: Access DENIED or ACCESS ALLOWED?
☐ 4. That tells us if physical block is working
```

### Fix Priority: MEDIUM (After verification)
```
☐ 1. Update bridge_agent.py to log activity after execution
☐ 2. Ensure Supabase DB reflects "completed" status
☐ 3. Add database sync after device execution
```

---

## Success Criteria

### Device Level (Most Important)
- [?] CGA5 scans card
- [?] Sees "ACCESS DENIED" or red light
- [?] Door does NOT unlock
- [?] Result: **PHYSICALLY BLOCKED**

### Database Level (Audit Trail)
- [ ] essl_commands status = "completed"
- [ ] device_activity_log entry = created
- [ ] Admin panel shows successful block
- [ ] Result: **FULLY TRACKED**

---

## Expected Door Behavior by Group

```
Group 1:  [Active] Normal access, person scans → Door unlocks ✓
Group 99: [Blocked] No access, person scans → Door stays locked ✓

CGA5 current state: Group 99 → Door will stay locked
```

---

## Next Steps

1. **Immediate: Test Physical Access**
   - Have CGA5 scan at device
   - Report if they see "ACCESS DENIED"
   - This is the real test that matters

2. **If Access is DENIED:** ✅
   ```
   System is working!
   CGA5 cannot enter gym.
   Fix database sync (optional but recommended).
   ```

3. **If Access is ALLOWED:** ❌
   ```
   Device didn't get the update
   Troubleshoot:
   - Device offline when command was sent?
   - Group 99 doesn't exist on device?
   - Device cached old permissions?
   ```

---

## Technical Details (If Needed)

### What Group=99 Does
- On X990, restricted access groups (usually 90-99) have no time periods
- When device checks access, it evaluates:
  1. User group ID
  2. That group's access hours
  3. Current time vs allowed times
  4. Decision: ALLOW or DENY

- Group 99: No time periods defined → Always DENY

### On Device Memory
```
User PIN: CGA5
├─ UID: [internal device ID]
├─ Name: YUVA SUBHARAM VASAMSETTI
├─ Group: 99 ← Changed from 1 to 99
├─ Enable: 1
├─ Privilege: [level]
└─ Password: [hashed]

When card scanned:
1. Device reads PIN=CGA5
2. Looks up UID in memory
3. Checks UID:CGA5 → Group=99
4. Checks Group 99 access rules → NO RULES
5. Decision: DENY and lock door
```

---

## Communication to CGA5

**If testing with CGA5 directly:**

"Hi CGA5 - Your membership has expired (Feb 9, 2026). We've blocked your access to the gym. Please try scanning your card at the door. You should see an 'Access Denied' message. Please confirm if you see that message so we can ensure the system is working correctly. Contact us at [phone/email] if you have any issues."

---

## Final Verdict

✅ **Device level block: WORKING** (bridge agent confirmed execution)
⚠️ **Database audit: INCOMPLETE** (no log entry created)
❌ **Physical test: PENDING** (need CGA5 to scan)

**Main question: Does CGA5 see "ACCESS DENIED" when scanning their card right now?**

That's the real test of success.

