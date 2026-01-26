@echo off
REM Deploy FatSecret Proxy Edge Function via Supabase REST API
REM This uses direct API calls instead of the CLI

echo Deploying FatSecret Proxy Edge Function...
echo.

REM The deployment requires:
REM 1. Your Supabase project reference: osjvvcbcvlcdmqxczttf
REM 2. Your Supabase service role key (available in project settings)
REM 3. The function code

echo.
echo IMPORTANT: You need to log in to Supabase first
echo.
echo Visit: https://supabase.com/dashboard/
echo.
echo Then do ONE of the following:
echo.
echo OPTION 1: Use Supabase Dashboard (EASIEST)
echo =============================================
echo 1. Go to your project at: https://supabase.com/dashboard
echo 2. Click "Edge Functions" in the left menu
echo 3. Click "Create a new function"
echo 4. Name it: fatsecret-proxy
echo 5. Copy the code from: supabase\functions\fatsecret-proxy\index.ts
echo 6. Paste it into the function editor
echo 7. Click "Deploy"
echo 8. Then set the secrets:
echo    - Click "Settings" menu
echo    - Go to "Secrets"
echo    - Add FATSECRET_CLIENT_ID=5ffe8614026e49309a9a01d4c3ce831d
echo    - Add FATSECRET_CLIENT_SECRET=97d4254cb1a741d79a8ace8c348bb74f
echo.
echo OPTION 2: Use Supabase CLI (Requires Authentication)
echo ====================================================
echo 1. Go to https://supabase.com/dashboard/account/tokens
echo 2. Create a new token (or use existing one)
echo 3. Run: npx supabase login
echo 4. Paste your token when prompted
echo 5. Then run the deployment:
echo    npx supabase functions deploy fatsecret-proxy
echo.
echo After deployment, test with:
echo curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/fatsecret-proxy ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"action\": \"search\", \"query\": \"banana\", \"maxResults\": 5}"
echo.
pause
