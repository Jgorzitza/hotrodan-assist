#!/bin/bash

echo "=== GSC CREDENTIALS SETUP ==="
echo ""
echo "✅ Using same OAuth credentials as GA4"
echo "   - Client ID: Same as GA4"
echo "   - Client Secret: Same as GA4"
echo "   - Only need: New refresh token with GSC scope"
echo ""

# Get existing GA4 credentials
GA4_CLIENT_ID=$(grep "GA4_CLIENT_ID=" .env | cut -d'=' -f2)
GA4_CLIENT_SECRET=$(grep "GA4_CLIENT_SECRET=" .env | cut -d'=' -f2)

echo "🔍 Using existing OAuth credentials:"
echo "   Client ID: ${GA4_CLIENT_ID:0:20}..."
echo "   Client Secret: ${GA4_CLIENT_SECRET:0:20}..."
echo ""

# Prompt for GSC refresh token
echo "📋 GSC REFRESH TOKEN STEPS:"
echo "1. Go to: https://developers.google.com/oauthplayground/"
echo "2. Click gear icon → 'Use your own OAuth credentials'"
echo "3. Enter Client ID: $GA4_CLIENT_ID"
echo "4. Enter Client Secret: $GA4_CLIENT_SECRET"
echo "5. Select scope: https://www.googleapis.com/auth/webmasters.readonly"
echo "6. Click 'Authorize APIs' and sign in"
echo "7. Click 'Exchange authorization code for tokens'"
echo "8. Copy the Refresh Token"
echo ""

read -p "Enter GSC Refresh Token: " GSC_REFRESH_TOKEN

if [ -z "$GSC_REFRESH_TOKEN" ]; then
    echo "❌ No refresh token provided. Exiting."
    exit 1
fi

echo ""
echo "🔧 Adding GSC credentials to .env files..."

# Add to main .env
echo "" >> .env
echo "# Google Search Console API" >> .env
echo "GSC_CLIENT_ID=$GA4_CLIENT_ID" >> .env
echo "GSC_CLIENT_SECRET=$GA4_CLIENT_SECRET" >> .env
echo "GSC_REFRESH_TOKEN=$GSC_REFRESH_TOKEN" >> .env

# Add to dashboard .env
echo "" >> dashboard/.env
echo "# Google Search Console API" >> dashboard/.env
echo "GSC_CLIENT_ID=$GA4_CLIENT_ID" >> dashboard/.env
echo "GSC_CLIENT_SECRET=$GA4_CLIENT_SECRET" >> dashboard/.env
echo "GSC_REFRESH_TOKEN=$GSC_REFRESH_TOKEN" >> dashboard/.env

echo "✅ GSC credentials added successfully!"
echo ""
echo "📋 GSC CREDENTIALS ADDED:"
echo "   - GSC_CLIENT_ID: $GA4_CLIENT_ID"
echo "   - GSC_CLIENT_SECRET: $GA4_CLIENT_SECRET"
echo "   - GSC_REFRESH_TOKEN: ${GSC_REFRESH_TOKEN:0:20}..."
echo ""
echo "🎯 SEO agent can now use GSC API for full functionality!"
