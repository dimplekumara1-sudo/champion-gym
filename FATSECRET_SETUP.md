# FatSecret API Integration Guide

## Architecture

The app uses a **Supabase Edge Function** as a proxy to FatSecret API. This approach:
- ✅ Solves CORS issues (server-to-server communication)
- ✅ Keeps API credentials secure on the server
- ✅ Handles OAuth token management server-side

## Setup Instructions

### 1. Register for FatSecret Developer Account

1. Go to https://platform.fatsecret.com/register
2. Create a new developer account
3. Create an application to get your API credentials

### 2. Get API Credentials

After creating your application, you'll receive:
- **Client ID** (Consumer Key)
- **Client Secret** (Consumer Secret)

### 3. Configure Supabase Secrets

Add your FatSecret credentials to Supabase environment variables:

```bash
supabase secrets set FATSECRET_CLIENT_ID=your_client_id_here
supabase secrets set FATSECRET_CLIENT_SECRET=your_client_secret_here
```

Or set them in your `supabase/.env.local` file:

```env
FATSECRET_CLIENT_ID=your_client_id_here
FATSECRET_CLIENT_SECRET=your_client_secret_here
```

### 4. Deploy Edge Function

The Edge Function is already created at:
`supabase/functions/fatsecret-proxy/index.ts`

Deploy it with:

```bash
supabase functions deploy fatsecret-proxy
```

### 5. Verify Setup

The DailyTracker component will now:
- Allow users to search for foods using the FatSecret database
- Fetch nutrition information (calories, protein, carbs, fat)
- Calculate calories based on the amount entered
- Display a daily summary of nutrition intake

## Features Implemented

### Food Search
- Search across FatSecret's comprehensive food database
- Results include brand names and food descriptions

### Nutrition Calculation
- Automatic calorie calculation based on serving size
- Macronutrient tracking (protein, carbs, fat)
- Support for different units (grams, ounces, milliliters)

### Daily Summary
- Real-time calorie tracking
- Remaining calories calculation
- Macronutrient breakdown

## API Architecture

### Edge Function Flow
```
DailyTracker Component
        ↓
    searchFoods() / getFoodNutrition()
        ↓
supabase.functions.invoke('fatsecret-proxy')
        ↓
Supabase Edge Function (fatsecret-proxy)
        ↓
FatSecret OAuth API
        ↓
FatSecret REST API
```

### Endpoints Used (via Edge Function)
- **OAuth Token**: `https://oauth.fatsecret.com/connect/token`
- **Food Search**: `https://platform.fatsecret.com/rest/foods/search/v1`
- **Food Details**: `https://platform.fatsecret.com/rest/food/v5`

## Error Handling

If you see an error, follow these steps:

### "Edge Function not found"
- Deploy the edge function: `supabase functions deploy fatsecret-proxy`

### "Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET"
- Set the Supabase secrets with your FatSecret API credentials

### "Failed to load resource: net::ERR_FAILED"
- This is a CORS error - make sure you're using the Edge Function proxy
- Don't call FatSecret API directly from the browser

## Rate Limits

FatSecret has rate limits on API calls. The Edge Function handles:
- OAuth token caching (reuses token until expiration)
- Server-side rate limit management

For production applications, consider:
- Implementing food search result caching in Supabase Database
- Adding rate limit headers to responses
- Optimizing search queries
