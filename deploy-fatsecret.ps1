#!/usr/bin/env pwsh
# Deploy FatSecret Proxy Edge Function to Supabase
# Prerequisites: npx available (comes with Node.js)

$projectUrl = "https://osjvvcbcvlcdmqxczttf.supabase.co"
$clientId = "5ffe8614026e49309a9a01d4c3ce831d"
$clientSecret = "97d4254cb1a741d79a8ace8c348bb74f"

Write-Host "🚀 Deploying FatSecret Proxy Edge Function..." -ForegroundColor Green
Write-Host "Project: $projectUrl" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is available via npx
try {
    $version = npx supabase --version 2>&1
    Write-Host "✅ Supabase CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g supabase
}

Write-Host ""
Write-Host "📝 Setting FatSecret credentials in Supabase secrets..." -ForegroundColor Cyan

# Set the secrets
npx supabase secrets set FATSECRET_CLIENT_ID=$clientId FATSECRET_CLIENT_SECRET=$clientSecret

Write-Host ""
Write-Host "📦 Deploying fatsecret-proxy function..." -ForegroundColor Cyan

# Deploy the function
npx supabase functions deploy fatsecret-proxy

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your FatSecret Proxy is now available at:" -ForegroundColor Cyan
Write-Host "$projectUrl/functions/v1/fatsecret-proxy" -ForegroundColor Yellow
Write-Host ""
Write-Host "You can test it with:" -ForegroundColor Cyan
Write-Host @"
curl -X POST $projectUrl/functions/v1/fatsecret-proxy `
  -H "Content-Type: application/json" `
  -d '{
    "action": "search",
    "query": "banana",
    "maxResults": 5
  }'
"@ -ForegroundColor White
