# Gym Access Control Worker

Cloudflare Worker for managing eSSL ADMS user access control and integration with Supabase for automated user blocking/unblocking.

## What This Does

This worker acts as a bridge between:
- **Supabase Functions** → Identify expired users and request blocking
- **Cloudflare Workers** → Handle API requests with authentication
- **eSSL ADMS Devices** → Sync user access groups for door lock control

When a user's membership expires, the system automatically:
1. Identifies expired users in Supabase
2. Sends block request to this worker  
3. Worker queues command to Supabase database
4. eSSL devices sync commands and move user to locked access group

---

## Quick Start

### Prerequisites
- Cloudflare Account (free tier works)
- Supabase Project with tables: `essl_users`, `essl_commands`
- Wrangler CLI: `npm install -g wrangler`

### Deploy in 2 Minutes

**Option 1: Automated Deployment (Recommended)**
```bash
# Linux/Mac
bash deploy.sh

# Windows
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

**Option 2: Manual Deployment**
```bash
# Authenticate with Cloudflare
wrangler login

# Set secrets (get Service Role Key from Supabase)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put INTERNAL_SECRET

# Deploy
wrangler deploy
```

Get your worker URL → `https://gym-access-worker.yourname.workers.dev`

---

## API Endpoints

### Block User
```bash
curl -X POST https://your-worker.workers.dev/essl/users/block \
  -H "x-internal-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"essl_id": "USER_ID"}'
```

### Unblock User  
```bash
curl -X POST https://your-worker.workers.dev/essl/users/unblock \
  -H "x-internal-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"essl_id": "USER_ID"}'
```

### Sync Users
```bash
curl -X GET https://your-worker.workers.dev/essl/users/sync \
  -H "x-internal-secret: YOUR_SECRET"
```

---

## Documentation

- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Complete setup guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Debug common issues
- **[FIX_SUMMARY.md](./FIX_SUMMARY.md)** - What was fixed in this version

---

## Troubleshooting

### Error 403 or 1003?
See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

### Quick checks:
```bash
# 1. View live logs
wrangler tail

# 2. Test the worker
node test-deployed.js

# 3. Check if secrets are set
wrangler secret list
```

---

## File Structure

```
gym/
├── src/
│   └── index.js                 # Main worker code
├── wrangler.toml               # Cloudflare configuration
├── test-worker.js              # Local test script
├── test-deployed.js            # Deployed worker tests
├── deploy.sh                    # Linux/Mac deployment script
├── deploy.ps1                   # Windows deployment script
├── SETUP_INSTRUCTIONS.md       # Detailed setup guide
├── TROUBLESHOOTING.md          # Debugging guide
├── FIX_SUMMARY.md              # What was fixed
└── README.md                    # This file
```

---

## Configuration

Required environment variables (set via `wrangler secret put`):
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Settings → API
- `INTERNAL_SECRET` - Create any strong random string (e.g., `openssl rand -base64 32`)

Optional configuration in `wrangler.toml`:
- `SUPABASE_URL` - Already set to `osjvvcbcvlcdmqxczttf.supabase.co`
- `LOCAL_BRIDGE_URL` - For local eSSL sync (optional)

---

## Live Monitoring

Monitor blocking operations in real-time:
```bash
wrangler tail

# Watch for:
# - "Successfully queued block command for CGA8"
# - "Error blocking user CGA8: ..."
# - "Supabase API error (403): ..."
```

---

## Integration with Supabase

To automatically block expired users, add to your Supabase Edge Function:

```typescript
const expiredUsers = await supabase
  .from('users')
  .select('essl_id')
  .lt('membership_expires', new Date().toISOString())
  .eq('is_active', true);

for (const user of expiredUsers.data) {
  await fetch('https://YOUR_WORKER_URL/essl/users/block', {
    method: 'POST',
    headers: {
      'x-internal-secret': process.env.INTERNAL_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ essl_id: user.essl_id })
  });
}
```

---

## Recent Fixes (V2.0)

✅ Added service key validation with proper error messages  
✅ Enhanced error logging for debugging  
✅ Improved Supabase API error details  
✅ Better configuration documentation  
✅ Added comprehensive troubleshooting guide  

See [FIX_SUMMARY.md](./FIX_SUMMARY.md) for details.

---

## Support & Debugging

1. **Setup Issues** → Read [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)
2. **Error Messages** → Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Test Worker** → Run `node test-deployed.js`
4. **View Logs** → Run `wrangler tail`
5. **Performance** → Cloudflare Workers are globally distributed, <10ms latency

---

## Next Steps

1. Set up secrets: `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
2. Deploy: `wrangler deploy`
3. Test: `node test-deployed.js`
4. Monitor: `wrangler tail`
5. Integrate: Call worker from Supabase when user expires

---

**Happy blocking! 🔐**

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

