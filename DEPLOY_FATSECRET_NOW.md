# 🚀 FatSecret Edge Function Deployment - Step by Step

## The Problem
You're getting a CORS error because the `fatsecret-proxy` Edge Function hasn't been deployed to your Supabase project yet.

## The Solution
Deploy the Edge Function with the FatSecret credentials. Choose your method:

---

## Method 1: PowerShell (Windows) - Easiest ✅

```powershell
# Open PowerShell and run:
.\deploy-fatsecret.ps1
```

**What it does:**
1. Installs Supabase CLI if needed
2. Sets FatSecret credentials in Supabase secrets
3. Deploys the Edge Function
4. Shows you the endpoint URL

---

## Method 2: Batch Script (Windows)

```cmd
# Open Command Prompt and run:
deploy-fatsecret.bat
```

---

## Method 3: Manual Deployment (Mac/Linux/Windows)

### Prerequisites
You need the Supabase CLI installed:

```bash
npm install -g supabase
```

### Deploy Steps

**Step 1:** Set the FatSecret secrets in Supabase
```bash
supabase secrets set FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d
supabase secrets set FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f
```

**Step 2:** Deploy the Edge Function
```bash
supabase functions deploy fatsecret-proxy
```

**Expected output:**
```
✓ Created deployment (fatsecret-proxy: v1)
Deploying function fatsecret-proxy...
```

---

## Verify Deployment

After deployment, test the function with:

```bash
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/fatsecret-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "query": "banana",
    "maxResults": 5
  }'
```

**Expected response:**
```json
{
  "foods": {
    "food": [
      {
        "food_id": "12345",
        "food_name": "Banana",
        "brand_name": ""
      },
      ...
    ]
  }
}
```

---

## After Deployment

1. **Restart your app:**
   ```bash
   npm run dev
   ```

2. **Test in the app:**
   - Navigate to the Daily Tracker screen
   - Type "banana" in the food search field
   - You should see search results appear

3. **In VS Code:** 
   - Press `F5` to reload or close and reopen the dev server

---

## Troubleshooting

### Still getting CORS errors?

**Check 1:** Is the function deployed?
```bash
supabase functions list
```
Should show: `fatsecret-proxy`

**Check 2:** Are the secrets set?
```bash
supabase secrets list
```
Should show:
```
FATSECRET_CLIENT_ID = 5ffe8614026e49309a9a01d4c3ce831d
FATSECRET_CLIENT_SECRET = 97d4254cb1a741d79a8ace8c348bb74f
```

**Check 3:** Clear browser cache
- Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Clear cached images and files
- Reload the app

**Check 4:** Verify .env.local
Make sure your `.env.local` has:
```
VITE_SUPABASE_URL=https://osjvvcbcvlcdmqxczttf.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

### Getting a 500 error from the function?

**Likely cause:** Credentials not properly set in Supabase  
**Solution:** Run the deployment script again and verify with `supabase secrets list`

### The function is deployed but still not working?

Check the function logs:
```bash
supabase functions logs fatsecret-proxy
```

This will show you any errors from the Edge Function.

---

## Summary

| Step | Command | Status |
|------|---------|--------|
| 1. Install Supabase CLI | `npm install -g supabase` | ✅ Prerequisites |
| 2. Set FatSecret credentials | `supabase secrets set ...` | ⏳ **DO THIS NOW** |
| 3. Deploy function | `supabase functions deploy fatsecret-proxy` | ⏳ **DO THIS NOW** |
| 4. Test in browser | Navigate to Daily Tracker | ⏳ Test after deploy |

---

## Quick Deploy (Copy & Paste)

For **Windows PowerShell:**
```powershell
npm install -g supabase; supabase secrets set FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f; supabase functions deploy fatsecret-proxy
```

For **Mac/Linux Bash:**
```bash
npm install -g supabase && supabase secrets set FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f && supabase functions deploy fatsecret-proxy
```

---

## Need Help?

Check these files:
- **Edge Function:** `supabase/functions/fatsecret-proxy/index.ts`
- **Frontend Service:** `lib/fatSecretService.ts`
- **Usage:** `screens/DailyTracker.tsx`
- **Environment:** `.env.local`
