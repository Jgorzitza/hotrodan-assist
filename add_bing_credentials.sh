#!/bin/bash

echo "=== BING WEBMASTER TOOLS CREDENTIALS SETUP ==="
echo ""
echo "🔍 Using /consumers/ endpoint for Microsoft Account users"
echo ""

echo "📋 YOUR /CONSUMERS/ OAUTH URL:"
echo "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=5ac8d58b-668b-4ccf-ab2b-c53b831d55f8&response_type=code&redirect_uri=https://jwt.ms&scope=api://5ac8d58b-668b-4ccf-ab2b-c53b831d55f8/access_as_user&response_mode=query"
echo ""

echo "🔍 STEPS:"
echo "1. Copy the URL above and open it in your browser"
echo "2. Sign in with your Microsoft account"
echo "3. You should be redirected to jwt.ms with tokens in the URL"
echo "4. The URL will look like:"
echo "   https://jwt.ms/#access_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...&refresh_token=0.AAAA...&token_type=Bearer&expires_in=3600"
echo "5. Copy the 'refresh_token' part (everything after 'refresh_token=' and before '&')"
echo ""

read -p "Enter Bing Client ID (5ac8d58b-668b-4ccf-ab2b-c53b831d55f8): " BING_CLIENT_ID
read -p "Enter Bing Client Secret: " BING_CLIENT_SECRET
read -p "Enter Bing Refresh Token: " BING_REFRESH_TOKEN

# Use the provided client ID if empty
if [ -z "$BING_CLIENT_ID" ]; then
    BING_CLIENT_ID="5ac8d58b-668b-4ccf-ab2b-c53b831d55f8"
fi

if [ -z "$BING_CLIENT_SECRET" ] || [ -z "$BING_REFRESH_TOKEN" ]; then
    echo "❌ Missing credentials. Exiting."
    exit 1
fi

echo ""
echo "🔧 Adding Bing credentials to .env files..."

# Add to main .env
echo "" >> .env
echo "# Bing Webmaster Tools API" >> .env
echo "BING_CLIENT_ID=$BING_CLIENT_ID" >> .env
echo "BING_CLIENT_SECRET=$BING_CLIENT_SECRET" >> .env
echo "BING_REFRESH_TOKEN=$BING_REFRESH_TOKEN" >> .env

# Add to dashboard .env
echo "" >> dashboard/.env
echo "# Bing Webmaster Tools API" >> dashboard/.env
echo "BING_CLIENT_ID=$BING_CLIENT_ID" >> dashboard/.env
echo "BING_CLIENT_SECRET=$BING_CLIENT_SECRET" >> dashboard/.env
echo "BING_REFRESH_TOKEN=$BING_REFRESH_TOKEN" >> dashboard/.env

echo "✅ Bing credentials added successfully!"
echo ""
echo "📋 BING CREDENTIALS ADDED:"
echo "   - BING_CLIENT_ID: $BING_CLIENT_ID"
echo "   - BING_CLIENT_SECRET: $BING_CLIENT_SECRET"
echo "   - BING_REFRESH_TOKEN: ${BING_REFRESH_TOKEN:0:20}..."
echo ""
echo "🎯 SEO agent now has full functionality with GA4, GSC, and Bing!"
