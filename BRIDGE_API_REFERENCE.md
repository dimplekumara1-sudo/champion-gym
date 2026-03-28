# Bridge Agent API Reference

> **New Flask-based HTTP API Server** — Added to `bridge_agent.py`  
> Runs on Windows PC with LAN access to eSSL X990  
> Responds to calls from Cloudflare Worker + React app

---

## Installation & Running

### 1. Install Dependencies
```powershell
pip install flask requests pyzk
```

### 2. Create `.env` file
```bash
DEVICE_IP=192.168.0.215
DEVICE_PORT=4370
PORT=5000
BRIDGE_SECRET=your_strong_secret_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
POLL_INTERVAL=60
```

### 3. Run the Bridge
```powershell
python bridge_agent.py
```

You'll see:
```
============================================================
  eSSL X990 Bridge Agent — HTTP API Server
  Device : 192.168.0.215:4370
  Port   : 5000
  Sweep  : every 60s
============================================================
[OK] Device reachable
[OK] Expiry sweep thread started
[OK] Starting Flask server on 0.0.0.0:5000
```

---

## API Endpoints

All endpoints require `X-Bridge-Secret` header matching `BRIDGE_SECRET` from `.env`

### `GET /health`
Health check — test if device is reachable

**Response:**
```json
{
  "status": "ok",
  "device": "192.168.0.215:4370",
  "device_ok": true,
  "date": "2026-03-28"
}
```

---

### `POST /block`
**SOFT BLOCK** — Sets `group_id=""` (no access)  
Fingerprints stay on device, can be unblocked later

**Request:**
```json
{
  "essl_id": "CGA5"
}
```

**Response (Success):**
```json
{
  "status": "blocked",
  "essl_id": "CGA5",
  "uid": 42,
  "name": "YUVA SUBHARAM"
}
```

**Response (Already Deleted):**
```json
{
  "error": "CGA5 is permanently deleted — block rejected",
  "permanently_deleted": true
}
```
**HTTP Status:** 403

---

### `POST /unblock`
**RESTORE ACCESS** — Sets `group_id="1"` (active)  
Rejected for permanently deleted users

**Request:**
```json
{
  "essl_id": "CGA5",
  "group_id": "1"
}
```

**Response (Success):**
```json
{
  "status": "unblocked",
  "essl_id": "CGA5",
  "uid": 42,
  "group_id": "1"
}
```

**Response (Permanently Deleted):**
```json
{
  "error": "CGA5 is permanently deleted — unblock rejected",
  "permanently_deleted": true
}
```
**HTTP Status:** 403

---

### `POST /sync-expiry`
**SYNC EXPIRY DATE** — Pushes to device for firmware-level enforcement

The X990 device independently denies access once expiry date passes

**Request:**
```json
{
  "essl_id": "CGA5",
  "expiry_date": "2026-06-30"
}
```

**Response (Success):**
```json
{
  "status": "expiry_synced",
  "essl_id": "CGA5",
  "expiry_date": "2026-06-30"
}
```

---

### `POST /delete`
**HARD DELETE** — IRREVERSIBLE  
Removes user + fingerprints from device  
Writes to `permanently_deleted_users` table  
All future operations (block/unblock/sync) will be rejected

**Request:**
```json
{
  "essl_id": "CGA5"
}
```

**Response (Success):**
```json
{
  "status": "permanently_deleted",
  "essl_id": "CGA5",
  "name": "YUVA SUBHARAM",
  "irreversible": true
}
```

---

### `GET /users`
**LIST ALL USERS** — Currently on device

**Response:**
```json
[
  {
    "uid": 42,
    "essl_id": "CGA5",
    "name": "YUVA SUBHARAM VASAMSETTI",
    "privilege": 0,
    "group_id": "1"
  },
  {
    "uid": 43,
    "essl_id": "CGA2",
    "name": "TEST USER",
    "privilege": 0,
    "group_id": "99"
  }
]
```

---

## Auto-Blocking Sweep

Bridge runs a background thread every `POLL_INTERVAL` seconds (default 60s):

1. **Query:** Finds all users where `plan_expiry <= TODAY` AND `device_blocked = false` AND `permanently_deleted != true`
2. **Block:** Calls `block_user()` on each expired user
3. **Sync:** Updates Supabase `device_blocked = true`

**Log Output:**
```
[SWEEP] Found 3 expired users
[SWEEP-BLOCKED] John Doe (USER123) — expired 2026-03-25
[SWEEP-BLOCKED] Jane Smith (USER456) — expired 2026-03-20
[SWEEP-BLOCKED] Bob Jones (USER789) — expired 2026-03-27
```

This is the **safety net** — catches users the webhook missed

---

## Supabase Schema Requirements

Your `profiles` table needs these columns:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_expiry DATE,
  ADD COLUMN IF NOT EXISTS device_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS permanently_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
```

**permanently_deleted_users table** (created by bridge_agent when needed):
```sql
CREATE TABLE permanently_deleted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essl_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  deleted_at TIMESTAMP DEFAULT NOW(),
  deletion_reason TEXT,
  deletion_method TEXT,
  notes TEXT
);
```

---

## Integration with Cloudflare Worker

Cloudflare Worker calls the bridge via HTTP:

```javascript
// Supabase webhook → Worker → bridge_agent
async function bridge(action, payload, env) {
  const res = await fetch(`${env.BRIDGE_URL}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Secret": env.BRIDGE_SECRET
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// When profile.plan_expiry changes:
await bridge("block", { essl_id: "CGA5" }, env);

// When profile is manually re-enabled:
await bridge("unblock", { essl_id: "CGA5", group_id: "1" }, env);

// When member is terminated (permanent):
await bridge("delete", { essl_id: "CGA5" }, env);
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
Missing or incorrect `X-Bridge-Secret` header

### 400 Bad Request
```json
{
  "error": "essl_id required"
}
```
Missing required parameter

### 403 Permanently Deleted
```json
{
  "error": "CGA5 is permanently deleted — block rejected",
  "permanently_deleted": true
}
```
User is in `permanently_deleted_users` table

### 500 Server Error
```json
{
  "error": "User CGA5 not found on device"
}
```
Device communication failed or user doesn't exist

---

## Logs

All operations logged to `bridge.log`:

```
2026-03-28 20:05:57 [INFO] [FOUND] Pending commands: 2
2026-03-28 20:05:58 [INFO] [BLOCKED]   essl_id=CGA5  uid=42  name=YUVA SUBHARAM
2026-03-28 20:06:01 [INFO] [PERM-DELETED] essl_id=CGA5 name=YUVA SUBHARAM VASAMSETTI
2026-03-28 20:06:01 [INFO] [PERM-DELETE] CGA5 marked in both tables — IRREVERSIBLE
```

---

## Security

**Permanent Deletion Prevents Re-activation:**
- ✅ User removed from device
- ✅ Marked in `permanently_deleted_users` table
- ✅ Marked in `profiles.permanently_deleted = TRUE`
- ✅ Every operation checks `is_permanently_deleted()` first
- ✅ Returns 403 if user is permanently deleted

**API Secret:**
- Must be strong (30+ characters recommended)
- Same value in `BRIDGE_SECRET` and Cloudflare Worker `env.BRIDGE_SECRET`
- Sent as `X-Bridge-Secret` header

---

## Troubleshooting

### Bridge won't connect to device
```
[WARN] Device not reachable at startup: [Errno 10061]...
```
- Check device IP: `ping 192.168.0.215`
- Check device port: 4370
- Check network connectivity / firewall

### Permanent deletion not sticking
- Verify `permanently_deleted_users` table exists
- Check `is_permanently_deleted()` is being called
- Check Supabase connection

### Users not auto-blocking at expiry
- Check `plan_expiry` column exists and has dates
- Check sweep is running: `[SWEEP] Found X expired users`
- Check `device_blocked = false` in those rows

---

## Start on Windows Boot

**Auto-run setup:**
1. Press `Win + R`
2. Type `shell:startup`
3. Create shortcut to `start_bridge.bat`
4. Restart

Or manually run:
```powershell
cd "C:\Users\dimpl\Downloads\powerflex---elite-fitness-coach (1)"
python bridge_agent.py
```
