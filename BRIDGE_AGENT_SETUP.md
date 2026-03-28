# Bridge Agent Setup Guide

## Overview

The Bridge Agent is a Python service that runs on your LAN and communicates with the eSSL X990 device via the ZKTeco protocol (port 4370). It polls Supabase for pending commands and executes them on the device.

```
Your App (Web/Mobile)
        │
        ▼
Supabase (Cloud) ──────── essl_commands table
        │
[polls every 10s]
        │
        ▼
Bridge Agent (Your LAN PC) ──── TCP:4370 ──── X990 @ 192.168.0.215
```

---

## Prerequisites

- **Python 3.8+** installed
- **PC/Server on the same LAN as X990** (192.168.0.x)
- **Network access to Supabase** (cloud API)
- **Network connectivity to X990 port 4370**

---

## Installation Steps

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the same directory as `bridge_agent.py`:

```bash
# .env
SUPABASE_URL=https://osjvvcbcvlcdmqxczttf.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
DEVICE_IP=192.168.0.215
DEVICE_PORT=4370
DEVICE_TIMEOUT=30
POLL_INTERVAL=10
```

**Where to find:**
- `SUPABASE_URL`: Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_KEY`: Supabase Dashboard → Settings → API → Service Role Key (KEEP SECRET!)
- `DEVICE_IP`: From X990 device touchscreen → Settings → Network → IP Address
- `DEVICE_PORT`: Default 4370 for ZKTeco protocol

### 3. Run the Schema Migration

1. Go to **Supabase Dashboard → SQL Editor**
2. Create a new query
3. Copy the contents of `bridge_agent_schema.sql`
4. Paste into the SQL editor
5. Click **▶️ Run**

This creates all necessary tables and indexes.

### 4. Start the Bridge Agent

```bash
python bridge_agent.py
```

**Expected output:**
```
[INFO] 🚀 Bridge Agent Starting...
[INFO]    Target: 192.168.0.215:4370
[INFO]    Poll Interval: 10s
[INFO]    Supabase: https://osjvvcbcvlcdmqxczttf.supabase.co
[INFO] ✓ Connected to X990 @ 192.168.0.215:4370
```

---

## Testing the Setup

### Test 1: Verify Device Connection

In Supabase SQL Editor, run:

```sql
INSERT INTO essl_commands (essl_id, command, status, payload)
VALUES 
  ('ALL', 'INFO', 'pending', '{"action":"test"}');

-- Check the result after 10 seconds
SELECT id, command, status, result, updated_at
FROM essl_commands
WHERE command = 'INFO'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** Command status changes from `pending` → `completed`, result shows device info.

### Test 2: Block a User

```sql
-- Block user CGA5
INSERT INTO essl_commands (essl_id, command, status, payload)
VALUES 
  ('ALL', 'DATA UPDATE USER PIN=CGA5 Group=99 EndDateTime=20261231235959', 'pending', '{"action":"block_user"}');

-- Monitor status
SELECT command, status, result
FROM essl_commands
WHERE command LIKE '%CGA5%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** Status changes to `completed`, user CGA5 moved to Group 99 on device.

### Test 3: Unblock a User

```sql
-- Unblock user CGA5
INSERT INTO essl_commands (essl_id, command, status, payload)
VALUES 
  ('ALL', 'DATA UPDATE USER PIN=CGA5 Group=1 EndDateTime=20991231235959', 'pending', '{"action":"unblock_user"}');
```

---

## Monitoring

### View Pending Commands

```sql
SELECT * FROM v_pending_commands;
```

### View Recent Blocked Attempts

```sql
SELECT * FROM v_recent_blocked_attempts;
```

### View Device Activity Log

```sql
SELECT * FROM device_activity_log
ORDER BY created_at DESC
LIMIT 20;
```

### View Bridge Agent Logs

```bash
tail -f bridge_agent.log
```

---

## Troubleshooting

### Connection Refused (Failed to connect to X990)

1. **Check device IP:**
   ```bash
   ping 192.168.0.215
   ```
   
2. **Check device port:**
   ```bash
   telnet 192.168.0.215 4370
   ```
   
3. **Ensure device is on the same LAN** (check subnet mask)

4. **Restart the device:** Power cycle X990

### Authentication Error

- Verify `SUPABASE_SERVICE_KEY` is **correct and has service role privileges**
- Check that key is **not accidentally truncated**
- Ensure no extra spaces or quotes in `.env` file

### Commands Not Executing

1. Check if Bridge Agent is running:
   ```bash
   ps aux | grep bridge_agent
   ```

2. Check logs:
   ```bash
   tail -f bridge_agent.log
   ```

3. Verify Supabase connectivity:
   ```bash
   curl https://osjvvcbcvlcdmqxczttf.supabase.co/rest/v1/essl_commands?limit=1 \
     -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
   ```

4. Test device directly:
   ```python
   from zk import ZK
   zk = ZK('192.168.0.215', port=4370)
   zk.connect()
   print(zk.get_device_name())
   ```

---

## Running as a Service (Linux/Mac)

### Systemd Service (Linux)

Create `/etc/systemd/system/essl-bridge.service`:

```ini
[Unit]
Description=eSSL X990 Bridge Agent
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/bridge_agent
ExecStart=/usr/bin/python3 /path/to/bridge_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable essl-bridge
sudo systemctl start essl-bridge
sudo systemctl status essl-bridge
```

### Launchd Service (Mac)

Create `~/Library/LaunchAgents/com.gym.essl-bridge.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gym.essl-bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/path/to/bridge_agent.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/essl-bridge.err</string>
    <key>StandardOutPath</string>
    <string>/tmp/essl-bridge.log</string>
</dict>
</plist>
```

Then:
```bash
launchctl load ~/Library/LaunchAgents/com.gym.essl-bridge.plist
```

---

## Supported Commands

### Update User (Change Group/Expiry)
```sql
INSERT INTO essl_commands (essl_id, command, status)
VALUES ('ALL', 'DATA UPDATE USER PIN=CGA5 Group=99 EndDateTime=20261231235959', 'pending');
```

### Delete User
```sql
INSERT INTO essl_commands (essl_id, command, status)
VALUES ('ALL', 'DATA DELETE USER PIN=CGA5', 'pending');
```

### Add User
```sql
INSERT INTO essl_commands (essl_id, command, status)
VALUES ('ALL', 'DATA ADD USER PIN=CGA5 Name=John Doe Group=1 EndDateTime=20991231235959', 'pending');
```

### Get Device Info
```sql
INSERT INTO essl_commands (essl_id, command, status)
VALUES ('ALL', 'INFO', 'pending');
```

---

## Architecture Flow

### When a User is Blocked (Expires)

```
1. Supabase check-expired-members function runs
   ├─ Finds users where plan_expiry_date < now
   └─ Sets essl_blocked = true

2. Triggers insert command to essl_commands
   └─ "DATA UPDATE USER PIN=CGA5 Group=99 ..." (pending)

3. Bridge Agent polls every 10s
   ├─ Sees pending command
   ├─ Connects to X990 via TCP:4370
   └─ Executes: Move CGA5 to Group 99

4. Device executes locally
   ├─ Group 99 = no time zone access
   ├─ When CGA5 scans: Device denies locally (no server call)
   └─ No attendance record created

5. Bridge updates command status
   └─ completed
```

### When User Scans (Device-side)

```
X990 Device
├─ User CGA5 scans fingerprint
├─ Checks local Group: Group=99? (DENIED)
├─ Device beeps: Access Denied ❌
└─ No PUSH to server (local decision)
```

---

## Security

1. **Service Key:** Keep `SUPABASE_SERVICE_KEY` secret
   - Never commit to Git
   - Rotate regularly via Supabase Dashboard
   - Use environment variables, not hardcoded

2. **Device Network:** X990 should be on secure LAN
   - Restrict port 4370 with firewall
   - Use VPN if running remotely

3. **Audit Trail:** All block/unblock events logged in `device_activity_log`
   - Review regularly
   - Archive for compliance

---

## Support

For issues, check:
- `bridge_agent.log` file
- Supabase logs: Dashboard → Logs → API
- Device connectivity: `ping 192.168.0.215` + `telnet 192.168.0.215 4370`
