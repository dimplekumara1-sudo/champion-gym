# Cloudflare Worker Deployment Script (PowerShell)
# This script helps deploy the gym access worker with proper configuration

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Cloudflare Worker Deployment Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
$wranglerPath = where.exe wrangler 2>$null
if (-not $wranglerPath) {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install wrangler" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Wrangler CLI found" -ForegroundColor Green
Write-Host ""

# Step 1: Check authentication
Write-Host "Step 1/4: Cloudflare Authentication" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
$whoami = wrangler whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Already logged in" -ForegroundColor Green
} else {
    Write-Host "Opening Cloudflare login in browser..." -ForegroundColor Yellow
    wrangler login
}
Write-Host ""

# Step 2: Configure secrets
Write-Host "Step 2/4: Configure Secrets" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "You'll need:"
Write-Host "  1. Supabase Service Role Key (from Settings → API)"
Write-Host "  2. Internal Secret (create a strong random string)"
Write-Host ""

$supabaseKey = Read-Host "Enter your Supabase Service Role Key"
if ([string]::IsNullOrEmpty($supabaseKey)) {
    Write-Host "❌ Supabase key cannot be empty" -ForegroundColor Red
    exit 1
}

$internalSecret = Read-Host "Enter Internal Secret (or press Enter to generate)"
if ([string]::IsNullOrEmpty($internalSecret)) {
    # Generate random secret
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    $internalSecret = [Convert]::ToBase64String($bytes)
    Write-Host "Generated: $internalSecret" -ForegroundColor Yellow
}

# Deploy secrets
Write-Host "Setting secrets..." -ForegroundColor Yellow
$supabaseKey | wrangler secret put SUPABASE_SERVICE_ROLE_KEY
$internalSecret | wrangler secret put INTERNAL_SECRET

Write-Host "✓ Secrets configured" -ForegroundColor Green
Write-Host ""

# Step 3: Verify worker configuration
Write-Host "Step 3/4: Verify Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
$wranger = Get-Content wrangler.toml
if ($wrangler -match "SUPABASE_URL") {
    Write-Host "✓ wrangler.toml configured" -ForegroundColor Green
}
Write-Host ""

# Step 4: Deploy worker
Write-Host "Step 4/4: Deploy Worker" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Deploying worker..." -ForegroundColor Yellow
wrangler deploy

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✓ Deployment Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the worker endpoint"
Write-Host "2. Configure your firewall rules if needed"
Write-Host "3. Update your Supabase Edge Function to call the worker"
Write-Host ""
Write-Host "Save this for later reference:" -ForegroundColor Yellow
Write-Host "  Internal Secret: $internalSecret" -ForegroundColor Yellow
Write-Host ""
