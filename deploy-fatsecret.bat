@echo off
REM Deploy FatSecret Proxy Edge Function to Supabase
REM This script sets the required environment variables and deploys the function

echo Setting FatSecret API credentials in Supabase...

REM Set the secrets in Supabase
supabase secrets set ^
  FATSECRET_CLIENT_ID="5ffe8614026e49309a9a01d4c3ce831d" ^
  FATSECRET_CLIENT_SECRET="97d4254cb1a741d79a8ace8c348bb74f"

echo Deploying fatsecret-proxy function...
supabase functions deploy fatsecret-proxy

echo.
echo ✅ Deployment complete!
echo.
echo Your FatSecret Proxy is now available at:
echo https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/fatsecret-proxy
echo.
echo You can test it by running:
echo curl -X POST https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/fatsecret-proxy ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"action\": \"search\", \"query\": \"banana\", \"maxResults\": 5}"
pause
