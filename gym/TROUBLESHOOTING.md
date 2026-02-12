# Troubleshooting: Worker Failed for User with Status 403 & Error 1003

## Problem Summary
The Cloudflare Worker is failing to block expired users with:
- **Error**: "Worker failed for CGA8 with status 403"
- **Error Code**: 1003 (Supabase API connectivity issue)
- **Status**: Access control request cannot be processed

## Root Causes & Solutions

### 1. Missing Environment Variables 🔑

**Symptom**: Status 503 "Service key not configured"

**Cause**: 
- `SUPABASE_SERVICE_ROLE_KEY` is not set as a secret
- Without this key, the worker cannot authenticate to Supabase API

**Solution**:
```bash
# Set the secret
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Get your key from:
# Supabase Dashboard → Settings → API → Service Role Secret Key
```

Then redeploy:
```bash
wrangler deploy
```

---

### 2. Invalid x-internal-secret Header 🔐

**Symptom**: Status 401 "Unauthorized"

**Cause**:
- Missing `x-internal-secret` header in request
- Header value doesn't match configured secret
- Header name is incorrect (case-sensitive)

**Verification**:
```bash
# This should be in your request headers
x-internal-secret: YOUR_INTERNAL_SECRET_VALUE

# Test with curl
curl -X POST https://gym-access-worker.your-worker.workers.dev/essl/users/block \
  -H "x-internal-secret: YOUR_INTERNAL_SECRET_VALUE" \
  -H "Content-Type: application/json" \
  -d '{"essl_id": "CGA8"}'
```

**Solution**:
1. Ensure the secret is set via: `wrangler secret put INTERNAL_SECRET`
2. Verify the header is included in all blocking requests
3. Double-check the exact secret value matches what you set

---

### 3. Cloudflare Worker Error 1003 🌐

**Symptom**: "Worker response for CGA8: error code: 1003"

**Cause**: 
- Worker cannot reach Supabase API (network issue)
- Invalid Authorization header to Supabase
- Supabase API quota exceeded
- Regional connectivity issue

**Solution**:

**Option A: Verify Supabase Connectivity**
```bash
# Test direct connection to Supabase
curl -X GET https://osjvvcbcvlcdmqxczttf.supabase.co/rest/v1/essl_commands?limit=1 \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Option B: Check Supabase Project Status**
- Go to [Supabase Dashboard](https://app.supabase.com)
- Check project status and API health
- Verify no planned maintenance

**Option C: Verify essl_commands Table**
```sql
-- Run in Supabase SQL Editor
-- Check table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'essl_commands'
);

-- Check table structure
\d essl_commands
```

**Option D: Check RLS Policies**
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies 
WHERE tablename = 'essl_commands';

-- For service role to work, ensure policies allow it or use:
ALTER TABLE essl_commands DISABLE ROW LEVEL SECURITY;
```

---

### 4. Incorrect Request Payload 📋

**Symptom**: Status 400 "Missing essl_id"

**Cause**: 
- Request body is missing `essl_id` field
- Body is not valid JSON
- Empty or null essl_id value

**Solution**:
Ensure request body has:
```json
{
  "essl_id": "CGA8"
}
```

✅ **Correct**:
```bash
curl -X POST https://gym-access-worker.your-worker.workers.dev/essl/users/block \
  -H "x-internal-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"essl_id":"CGA8"}'
```

❌ **Incorrect**:
```bash
# Missing essl_id
-d '{}' 

# Wrong field name
-d '{"id":"CGA8"}'

# Not JSON
-d 'CGA8'
```

---

### 5. Supabase Service Key Not Having Permissions ❌

**Symptom**: Status 500 with error message from Supabase

**Cause**:
- Service role key doesn't have write permissions to `essl_commands` table
- Row-level security policies are blocking the insert

**Solution**:

**Check Authorization in Supabase**:
```sql
-- In SQL Editor
SELECT users, (grants).* FROM information_schema.role_grants 
WHERE role_name = 'service_role';
```

**Grant Permissions**:
```sql
-- Get current schema permissions
SELECT * FROM information_schema.schemata;

-- Grant full access to service role
GRANT ALL PRIVILEGES ON all tables in SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON all sequences in SCHEMA public TO service_role;
```

---

### 6. Regional Cloudflare Issue 🌍

**Symptom**: "Error 1003" randomly or from specific regions

**Cause**:
- Cloudflare regional issue
- ISP blocking
- Regional rate limiting

**Solution**:
```bash
# Test from different region/network
# Use VPN or proxy if needed

# Check Cloudflare status
curl -I https://1.1.1.1/dns-query

# Monitor logs
wrangler tail
```

---

## Step-by-Step Debugging

### 1. Test Locally First
```bash
# Run local test
npm test
# or
node test-worker.js
```

### 2. Check Worker Logs
```bash
# Real-time logs
wrangler tail

# Watch for the CGA8 user blocking attempt
```

### 3. Check Supabase Logs
1. Go to Supabase Dashboard
2. Select your project
3. Go to "Logs" → "Database"
4. Look for API requests to `essl_commands`

### 4. Verify Each Component

**Component: Cloudflare Worker**
```bash
curl -I https://gym-access-worker.your-worker.workers.dev/essl/users/block
# Should return 200 or 4xx, not 5xx
```

**Component: Supabase API**
```bash
curl -X GET https://osjvvcbcvlcdmqxczttf.supabase.co/rest/v1/ \
  -H "apikey: YOUR_KEY"
# Should return 200 with API info
```

**Component: Secret Configuration**
```bash
# List all secrets
wrangler secret list

# Should show:
# ✓ SUPABASE_SERVICE_ROLE_KEY
# ✓ INTERNAL_SECRET
```

---

## Testing the Fix

### After making changes:

```bash
# 1. Redeploy worker
wrangler deploy

# 2. Run test suite
node test-deployed.js

# 3. Test blocking a user
WORKER_URL=https://gym-access-worker.your-worker.workers.dev \
INTERNAL_SECRET=your-secret \
node test-deployed.js
```

### Expected Results:
```
✓ POST /essl/users/block - Response 200
✓ POST /essl/users/unblock - Response 200
✓ GET /essl/users/sync - Response 200
✓ Missing secret header returns 401
✓ CORS headers present
```

---

## Monitoring After Deployment

### 1. Enable Structured Logging
Add to worker:
```javascript
console.info('Blocking user:', { userId: 'CGA8', timestamp: new Date() });
```

### 2. Set Up Alerts
- Cloudflare Dashboard → Notifications → Alert Settings
- Create alert for "Worker Errors"

### 3. Track Success Rate
Monitor the ratio of:
- Successful blocks: Status 200
- Failed blocks: Status 4xx, 5xx

---

## Quick Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set via `wrangler secret put`
- [ ] `INTERNAL_SECRET` set via `wrangler secret put`
- [ ] `essl_commands` table exists in Supabase
- [ ] Row-level security allows service role access
- [ ] Blocking requests include `x-internal-secret` header
- [ ] Request body includes `essl_id` field
- [ ] Worker deployed after changes: `wrangler deploy`
- [ ] Test with `node test-deployed.js`
- [ ] Logs checked for error details: `wrangler tail`

---

## Still Having Issues?

1. **Check Wrangler Version**:
   ```bash
   wrangler --version
   # Should be 3.x or newer
   ```

2. **Check Node Version**:
   ```bash
   node --version
   # Should be 16.x or newer
   ```

3. **Redeploy Everything**:
   ```bash
   wrangler delete               # Delete old deployment
   wrangler deploy               # Deploy fresh
   ```

4. **Review Recent Changes**:
   Ensure recent updates to `wrangler.toml` or environment variables are correct

5. **Contact Support**:
   - Cloudflare: https://dash.cloudflare.com/support
   - Supabase: https://app.supabase.com/support/tickets

