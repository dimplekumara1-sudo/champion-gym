#!/bin/bash
# Cloudflare Worker Deployment Script
# This script helps deploy the gym access worker with proper configuration

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cloudflare Worker Deployment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "✓ Wrangler CLI found"
echo ""

# Step 1: Check if already logged in to Cloudflare
echo "Step 1/4: Cloudflare Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if wrangler whoami > /dev/null 2>&1; then
    ACCOUNT=$(wrangler whoami | grep -oP 'Account \K[^ ]*' || echo "Checking...")
    echo "✓ Already logged in"
else
    echo "Opening Cloudflare login in browser..."
    wrangler login
fi
echo ""

# Step 2: Configure secrets
echo "Step 2/4: Configure Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "You'll need:"
echo "  1. Supabase Service Role Key (from Settings → API)"
echo "  2. Internal Secret (create a strong random string)"
echo ""

read -p "Enter your Supabase Service Role Key: " SUPABASE_KEY
if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Supabase key cannot be empty"
    exit 1
fi

read -p "Enter Internal Secret (or press Enter to generate): " INTERNAL_SECRET
if [ -z "$INTERNAL_SECRET" ]; then
    INTERNAL_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo "Generated: $INTERNAL_SECRET"
fi

# Deploy secrets
echo "Setting secrets..."
echo "$SUPABASE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY
echo "$INTERNAL_SECRET" | wrangler secret put INTERNAL_SECRET

echo "✓ Secrets configured"
echo ""

# Step 3: Verify worker configuration
echo "Step 3/4: Verify Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if grep -q "SUPABASE_URL" wrangler.toml; then
    echo "✓ wrangler.toml configured"
else
    echo "⚠ wrangler.toml needs updating. Skipping..."
fi
echo ""

# Step 4: Deploy worker
echo "Step 4/4: Deploy Worker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying worker..."
wrangler deploy

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
echo "1. Test the worker endpoint"
echo "2. Configure your firewall rules if needed"
echo "3. Update your Supabase Edge Function to call the worker"
echo ""
echo "Save this for later reference:"
echo "  Internal Secret: $INTERNAL_SECRET"
echo ""
