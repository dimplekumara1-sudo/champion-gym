# Quick Deployment Guide

## Your Supabase Project
**Project ID:** `osjvvcbcvlcdmqxczttf`  
**Dashboard URL:** https://supabase.com/dashboard/project/osjvvcbcvlcdmqxczttf

## The Problem
Your app is trying to call the `fatsecret-proxy` Edge Function, but it hasn't been deployed yet.

## The Solution (2 Minutes)

### Step 1: Get Your Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Create new token"
3. Give it a name (e.g., "deployment")
4. Copy the token

### Step 2: Log In to Supabase CLI
```powershell
npx supabase login
# When prompted, paste your token
```

### Step 3: Deploy the Function
```powershell
cd "c:\Users\dimpl\Downloads\powerflex---elite-fitness-coach (1)"
npx supabase functions deploy fatsecret-proxy
```

### Step 4: Set the Secrets
```powershell
npx supabase secrets set `
  FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d `
  FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f
```

---

## Alternative: Deploy via Dashboard (No CLI Needed)

### Step 1: Go to Supabase Dashboard
https://supabase.com/dashboard/project/osjvvcbcvlcdmqxczttf

### Step 2: Create Edge Function
1. Click **Edge Functions** in left menu
2. Click **Create a new function**
3. Name: `fatsecret-proxy`
4. Copy code from `supabase/functions/fatsecret-proxy/index.ts`
5. Paste into editor
6. Click **Deploy**

### Step 3: Set Secrets
1. Go to **Settings** > **Secrets**
2. Add secret:
   - Name: `FATSECRET_CLIENT_ID`
   - Value: `5ffe8614026e49309a9a01d4c3ce831d`
3. Add another secret:
   - Name: `FATSECRET_CLIENT_SECRET`
   - Value: `97d4254cb1a741d79a8ace8c348bb74f`

### Step 4: Test
```bash
curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/fatsecret-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "search", "query": "banana", "maxResults": 5}'
```

---

## Function Code Reference

**File:** `supabase/functions/fatsecret-proxy/index.ts`

This file contains the complete Edge Function. You'll need to:
1. Copy its entire contents
2. Paste into Supabase Dashboard Edge Function editor
3. Deploy

The function:
- Handles OAuth authentication with FatSecret API
- Caches access tokens for performance
- Proxies two endpoints:
  - `search` - Search for foods
  - `getNutrition` - Get nutrition details for a food

---

## After Deployment

Once deployed, the app will automatically work:
1. Refresh your browser (or `npm run dev`)
2. Open Daily Tracker screen
3. Type "banana" in food search
4. You should see results!

---

## If Still Getting CORS Error

1. **Clear browser cache:** `Ctrl+Shift+Delete`
2. **Restart dev server:** Kill and restart `npm run dev`
3. **Check deployment:** Visit https://supabase.com/dashboard/project/osjvvcbcvlcdmqxczttf/functions
4. **Verify secrets:** Go to Settings > Secrets and confirm both are set

---

## Need Help?

The Edge Function handles these requests:

**Search Request:**
```json
{
  "action": "search",
  "query": "banana",
  "maxResults": 5
}
```

**Nutrition Request:**
```json
{
  "action": "getNutrition",
  "foodId": "12345"
}
```

Both responses come from FatSecret API, proxied through this Edge Function.
