# ESSL X990 Device Architecture & CGA2/CGA5 Blocking Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM OVERVIEW                         │
└─────────────────────────────────────────────────────────────────┘

                    ESSL X990 Device
                   (SN: CUB7252100258)
                         │
                         │ HTTP/HTTPS with credentials
                         │
          ┌──────────────┴───────────────┬──────────────────┐
          │                              │                  │
          ▼                              ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  /iclock/cdata│  │/iclock/  │  │/iclock/  │
    │ (Attendance)  │  │getrequest │  │devicecmd │
    │               │  │(Commands) │  │(Response)│
    └──────────────┘  └──────────────┘  └──────────────┘
          │                │                    │
          └────────────────┼────────────────────┘
                           │
                           ▼
            ┌── Cloudflare Worker ──┐
            │  (gym/src/index.js)   │
            │  Acts as bridge/proxy  │
            └───────────────┬────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │      Supabase Backend           │
         ├─────────────────────────────────┤
         │ Edge Functions:                 │
         │ • sync-member-to-device         │
         │ • essl-management               │
         │ • essl-attendance               │
         │ • check-expired-members         │
         └─────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌────────────┐
   │ profiles │     │essl_     │     │ attendance │
   │ table    │     │commands  │     │ table      │
   │ CGA2 ←───┼─────┤ table    │     │            │
   │ CGA5 ←───┤     │ (queues) │     │ scans      │
   └──────────┘     └──────────┘     └────────────┘
   ▲                │
   │ essl_blocked?  │ status progress
   │ plan_status?   │ pending→sent→
   │                │ completed
   └────────────────┘
```

---

## How CGA2/CGA5 Blocking Works

### Current Flow (Why They're Still Accessing)

```
Step 1: User [CGA2/CGA5] scans biometric
         │
         ▼
Step 2: Device sends → /iclock/cdata 
         POST: {"EmployeeCode": "CGA2", "LogTime": "...", ...}
         │
         ▼
Step 3: essl-attendance function receives
         │
         ├─→ Maps CGA2 to user_id in profiles table
         │
         ├─→ Checks: user.essl_blocked?
         │   ❌ PROBLEM: If false, attendance is recorded
         │
         └─→ Creates attendance record
             ✅ User gets access to door


ISSUE: Unless essl_blocked = true AND Group=99 enforced, 
       device allows access on scan
```

### Fixed Flow (What We're Setting Up)

```
Step 1: ADMIN runs SQL script
         │
         ▼
Step 2: Commands inserted into essl_commands table
         INSERT:
         • DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99
         • DATA UPDATE USERINFO PIN=CGA2\tEnable=0
         │
         ▼
Step 3: profiles table updated
         UPDATE profiles SET essl_blocked = true WHERE essl_id = 'CGA2'
         │
         ▼
Step 4: Device polls /iclock/getrequest
         GET /iclock/getrequest?SN=CUB7252100258
         │
         ▼
Step 5: Cloudflare Worker fetches pending commands
         SELECT * FROM essl_commands WHERE status = 'pending'
         │
         ▼
Step 6: Worker returns commands to device
         Response body:
         C:1:DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99\n
         C:2:DATA UPDATE USERINFO PIN=CGA2\tEnable=0\n
         │
         ▼
Step 7: Device executes commands locally
         • Moves CGA2 user to Access Group 99 (restricted)
         • Sets Enable=0 (disabled)
         │
         ▼
Step 8: Device reports back
         POST /iclock/devicecmd: ID=COMMAND_ID&Return=0
         │
         ▼
Step 9: essl_commands status updated to 'completed'
         │
         ▼
Step 10: Next scan from CGA2
         Device checks: Is CGA2 in Group 99? Yes!
         Device checks: Is Enable=1? No (it's 0)
         │
         ▼
         🔒 ACCESS DENIED
```

---

## Command Queue Status Transitions

```
SQL Script Executed
    │
    ▼
INSERT essl_commands → status = 'pending'
    │
    ├─→ Waiting for device to poll
    │
    ▼
Device calls /iclock/getrequest → status = 'sent'
    │
    ├─→ Command  sent to device
    │   Device processing locally
    │
    ▼
Device returns ID=...&Return=0 → status = 'completed'
    │
    ├─→ ✅ SUCCESS - User blocked
    │
    ✓ CGA2/CGA5 now denied on scan
```

---

## What Can Go Wrong

```
Scenario 1: Commands stay in 'pending' state
├─ Cause: Device not polling Cloudflare Worker
├─ Check: Is device connected to internet?
├─ Fix: Verify firewall allows Cloudflare Worker connection
└─ Timeline: Should change within 2 minutes

Scenario 2: Commands completed but access still works
├─ Cause: Device not enforcing Group 99 restriction
├─ Check: Is Group 99 configured as NO ACCESS on device?
├─ Fix: Manually configure access groups on device
└─ Solution: Need local device console access to reconfigure

Scenario 3: No commands in table
├─ Cause: SQL script didn't run or had error
├─ Check: Did you see any SQL errors?
├─ Fix: Retry running ESSL_BLOCK_CGA2_CGA5.sql
└─ Verify: Check Step 4 in SQL script for results

Scenario 4: essl_blocked=true but user still in profiles as active
├─ Cause: Database updated but device has cached data
├─ Fix: Device will check again on next poll
├─ Timeline: Auto-refreshes within 1-2 minutes
└─ Manual: Could restart device to clear cache
```

---

## Testing the Fix

```
After running SQL script and waiting 2+ minutes:

Test Case 1: Recent attendance logs
  SELECT * FROM attendance 
  WHERE essl_id IN ('CGA2', 'CGA5')
  AND check_in > NOW() - INTERVAL '5 minutes'
  
  Result: ❌ ZERO records = SUCCESS ✅

Test Case 2: Command execution status
  SELECT status, updated_at FROM essl_commands
  WHERE command LIKE '%CGA2%'
  
  Result: ✅ status='completed' = SUCCESS ✅

Test Case 3: Physical device test
  Have person with CGA2/CGA5 try to scan
  
  Result: ❌ "ACCESS DENIED" = SUCCESS ✅

Test Case 4: Profiles table check
  SELECT essl_blocked FROM profiles WHERE essl_id='CGA2'
  
  Result: ✅ true = SUCCESS ✅
```

---

## Quick Reference: Key Tables

### profiles table (user info)
```
┌─────────────────┬───────────────────────────────────────┐
│ essl_id         │ Biometric reader PIN (e.g., "CGA2")   │
│ essl_blocked    │ boolean - true = user cannot scan      │
│ plan_status     │ text - "active", "expired", etc.       │
│ plan_expiry     │ timestamp - when plan expires          │
│ grace_period    │ days - extra time after expiry         │
└─────────────────┴───────────────────────────────────────┘
```

### essl_commands table (device queue)
```
┌─────────────────┬──────────────────────────────────────────┐
│ essl_id         │ "ALL" for broadcast, or specific ID      │
│ command         │ ESSL device command (DATA UPDATE USER...) │
│ status          │ pending → sent → completed/failed        │
│ sequence_id     │ numeric ID device uses to report back    │
│ created_at      │ when command was queued                  │
│ updated_at      │ when command status changed              │
└─────────────────┴──────────────────────────────────────────┘
```

### attendance table (logs)
```
┌─────────────────┬──────────────────────────────────────────┐
│ user_id         │ FK to profiles.id                        │
│ check_in        │ timestamp of scan                        │
│ device_id       │ which device (SN: CUB7252100258)        │
│ raw_data        │ JSON with original payload               │
│ created_at      │ when record was created                  │
└─────────────────┴──────────────────────────────────────────┘
```

---

## Commands Reference

### Block User Command
```
DATA UPDATE USER PIN=CGA2 EndDateTime=20260101000000 Group=99
  └─ Moves user to restricted group (no access)
  └─ EndDateTime=20260101 ensures expired state

DATA UPDATE USERINFO PIN=CGA2	Enable=0
  └─ Disables user globally
  └─ Takes precedence over group assignment
```

### Enable User Command
```
DATA UPDATE USER PIN=CGA2 EndDateTime=20991231235959 Group=1
  └─ Moves user to allowed access group
  └─ EndDateTime=2099 is far future (always valid)

DATA UPDATE USERINFO PIN=CGA2	Enable=1
  └─ Enables user globally
```

### Query Commands
```
DATA QUERY User
  └─ Device responds with all users in its memory

DATA QUERY AccessGroup
  └─ Device responds with all access group configurations
```

---

**Now run: `ESSL_BLOCK_CGA2_CGA5.sql` in Supabase → SQL Editor** 🚀
