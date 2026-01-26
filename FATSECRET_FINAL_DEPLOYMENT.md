# FatSecret API Integration - Final Deployment Guide

## Overview
FatSecret API is fully integrated via a Supabase Edge Function proxy to handle OAuth authentication server-side and bypass CORS issues.

## Edge Function Details

**Function Name:** `fatsecret-proxy`  
**Endpoint:** `https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/fatsecret-proxy`  
**Runtime:** Deno  
**Location:** `supabase/functions/fatsecret-proxy/index.ts`

## Current Status

✅ **Completed:**
- Edge Function code written and tested locally
- FatSecret credentials configured in .env.local
- DailyTracker.tsx fully refactored to use Edge Function proxy
- Food search modal with nutrition display implemented
- Calorie calculation with portion amounts working
- Real-time daily nutrition summary display

## Deployment Steps

### 1. Set Supabase Secrets (Required)
The Edge Function needs FatSecret credentials available as environment variables.

**Option A: Using Windows batch script**
```batch
# Run from project root:
deploy-fatsecret.bat
```

**Option B: Using Unix/Mac bash script**
```bash
# Run from project root:
bash deploy-fatsecret.sh
```

**Option C: Manual deployment via Supabase CLI**
```bash
# Set FatSecret credentials in Supabase secrets
supabase secrets set FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d
supabase secrets set FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f

# Deploy the Edge Function
supabase functions deploy fatsecret-proxy
```

### 2. Verify Deployment
Test the Edge Function with a simple search request:

```bash
# Search for "banana" food items
curl -X POST https://vlvecmxfsbvwrcnminmz.supabase.co/functions/v1/fatsecret-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "query": "banana",
    "maxResults": 5
  }'
```

Expected response:
```json
{
  "foods": {
    "food": [
      {
        "food_id": "...",
        "food_name": "Banana",
        "food_type": "...",
        "brand_name": "..."
      }
    ]
  }
}
```

## Frontend Configuration

The following files are already configured to use the Edge Function:

1. **lib/fatSecretService.ts** - Service layer calling the Edge Function
2. **screens/DailyTracker.tsx** - UI for food search and nutrition tracking
3. **.env.local** - Contains FatSecret credentials and Supabase configuration

No additional frontend changes needed - everything is ready once the Edge Function is deployed.

## Testing the Integration

### Option 1: Run in Development
```bash
npm run dev
# Navigate to Daily Tracker screen
# Test food search by typing in the search field
```

### Option 2: Run Test Script
```bash
# After deploying Edge Function, test with:
npx ts-node test-fatsecret.ts
```

This will:
1. Search for "banana"
2. Display search results
3. Fetch nutrition data for the first result

## API Endpoints Used

The Edge Function proxies these FatSecret APIs:

### 1. Food Search
**Request:**
```json
{
  "action": "search",
  "query": "banana",
  "maxResults": 10
}
```

**Response:** List of foods with IDs and names

### 2. Get Nutrition Info
**Request:**
```json
{
  "action": "getNutrition",
  "foodId": "12345678"
}
```

**Response:** Complete nutrition data including calories, protein, carbs, fat for different serving sizes

## Features Implemented

✅ **Food Search** - Real-time search with debouncing  
✅ **Nutrition Display** - Full macronutrient breakdown per serving  
✅ **Calorie Calculation** - Dynamic calculation based on portion amounts  
✅ **Daily Summary** - Total calories, protein, carbs, fat for the day  
✅ **Weekly Trend** - Chart showing 7-day calorie pattern  
✅ **Real-time Updates** - Instant reflection of added foods  

## Environment Variables

Required in Supabase secrets:
```
FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d
FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f
```

Available in .env.local (for reference):
```
VITE_SUPABASE_URL=https://vlvecmxfsbvwrcnminmz.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Troubleshooting

### Edge Function Returns 500 Error
**Cause:** Credentials not set in Supabase secrets  
**Solution:** Run deployment script or manually set secrets using Supabase CLI

### Food Search Returns No Results
**Cause:** FatSecret API authentication failed  
**Solution:** Verify credentials are correct and secrets are deployed

### CORS Errors in Browser Console
**This should NOT happen anymore** - all requests go through Edge Function  
**If it occurs:** Check that DailyTracker.tsx is using `supabase.functions.invoke()` correctly

## Next Steps

1. Deploy Edge Function using one of the methods above
2. Test with the curl command or browser test
3. Open app and navigate to Daily Tracker
4. Verify food search works and calculates calories correctly
5. (Future) Add meal persistence to Supabase database
6. (Future) Link plan macronutrient goals to daily recommendations

## Support

For FatSecret API details, see:
- Official API Docs: https://platform.fatsecret.com/api/Default.aspx
- OAuth Documentation: https://fatsecret.zendesk.com/hc/en-us/articles/4404503387796
