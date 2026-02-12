# Cloudflare Worker Setup Instructions

## Overview
This Cloudflare Worker acts as a bridge between your eSSL ADMS system and Supabase for user access management. It handles blocking/unblocking expired users.

## Prerequisites
1. Cloudflare account with Workers enabled
2. Supabase project with the following tables:
   - `essl_users` 
   - `essl_commands`
3. Local eSSL ADMS device with bridge API running (optional for local sync)

## Setup Steps

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Deploy Secrets
Before deploying, set up the required secrets:

```bash
# Set up service role key from Supabase
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service role key

# Set up internal secret for authentication
wrangler secret put INTERNAL_SECRET
# Create a strong secret string

# Optional: Set up local bridge API credentials
wrangler secret put LOCAL_API_KEY
wrangler secret put WORKER_SECRET
```

To retrieve your Supabase service role key:
1. Go to Supabase dashboard → Settings → API
2. Copy the Service Role Key (long secret key)

### 3. Update Configuration
Edit `wrangler.toml` to set:
- `SUPABASE_URL`: Your Supabase project URL (already set to osjvvcbcvlcdmqxczttf.supabase.co)
- `LOCAL_BRIDGE_URL`: Update with your actual public IP/domain if using local sync

### 4. Deploy Worker
```bash
# Deploy to production
wrangler deploy

# Or deploy to a development environment
wrangler deploy --env development
```

### 5. Get Worker URL
After deployment, you'll get a URL like:
```
https://gym-access-worker.yourname.workers.dev
```

## API Endpoints

### Block User
**Request:**
```bash
curl -X POST https://gym-access-worker.yourname.workers.dev/essl/users/block \
  -H "x-internal-secret: YOUR_INTERNAL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"essl_id": "CGA8"}'
```

**Response (Success 200):**
```json
{"success": true}
```

**Response (Error 403):**
```json
{"success": false, "error": "Unauthorized"}
```

Error codes:
- `401`: Missing or invalid x-internal-secret header
- `503`: Service key not configured (SUPABASE_SERVICE_ROLE_KEY missing)
- `500`: Error queuing command on Supabase

### Unblock User
**Request:**
```bash
curl -X POST https://gym-access-worker.yourname.workers.dev/essl/users/unblock \
  -H "x-internal-secret: YOUR_INTERNAL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"essl_id": "CGA8"}'
```

### Sync Users
**Request:**
```bash
curl -X GET https://gym-access-worker.yourname.workers.dev/essl/users/sync \
  -H "x-internal-secret: YOUR_INTERNAL_SECRET"
```

## Troubleshooting

### Error: "Worker failed for CGA8 with status 403"
**Cause:** The x-internal-secret header is missing or incorrect.
**Solution:** 
1. Verify the secret matches what you set with `wrangler secret put INTERNAL_SECRET`
2. Ensure the header name is exactly `x-internal-secret` (lowercase)
3. Check authentication logs in Cloudflare dashboard

### Error: "error code: 1003"
**Cause:** Typically indicates Supabase API connectivity issues or invalid credentials.
**Solution:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
2. Check that your Supabase URL is accessible
3. Ensure `essl_commands` table exists and has proper RLS policies
4. Check Supabase project logs for API errors

### Error: "Service key not configured"
**Cause:** `SUPABASE_SERVICE_ROLE_KEY` secret not set.
**Solution:**
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service role key
```

## Testing Locally
```bash
# Run tests with wrangler
npm test

# Or use the test script
node test-worker.js
```

## Integration with Supabase Function
To automatically block expired users, set up a scheduled task in Supabase:

```sql
-- Create function to identify expired users (example)
SELECT id, essl_id 
FROM essl_users 
WHERE plan_expires_at < NOW()
  AND status != 'blocked';
```

Then call the worker endpoint for each expired user:
```typescript
// In your Supabase Edge Function
for (const user of expiredUsers) {
  await fetch('https://gym-access-worker.yourname.workers.dev/essl/users/block', {
    method: 'POST',
    headers: {
      'x-internal-secret': process.env.INTERNAL_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ essl_id: user.essl_id })
  });
}
```

## Deployment Checklist
- [ ] All environment variables set via `wrangler secret put`
- [ ] `wrangler.toml` updated with correct URLs
- [ ] Supabase project accessible and has required tables
- [ ] RLS policies configured if needed
- [ ] Worker deployed successfully
- [ ] Test blocking a non-critical user first
- [ ] Monitor logs after deployment

