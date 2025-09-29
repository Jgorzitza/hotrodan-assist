#!/bin/bash

echo "=== QUICK BING TOKEN EXCHANGE ==="
echo ""

# Get fresh authorization code
read -p "Enter the NEW authorization code from jwt.ms: " AUTH_CODE
CLIENT_ID="5ac8d58b-668b-4ccf-ab2b-c53b831d55f8"

if [ -z "$AUTH_CODE" ]; then
    echo "❌ Authorization code is required. Exiting."
    exit 1
fi

echo ""
echo "🔍 Using authorization code: $AUTH_CODE"
echo ""

read -p "Enter your Bing Client Secret: " CLIENT_SECRET

if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Client secret is required. Exiting."
    exit 1
fi

echo ""
echo "🔧 Exchanging authorization code for access token..."

# Exchange the code for tokens
RESPONSE=$(curl -s -X POST 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "code=$AUTH_CODE" \
  -d 'redirect_uri=https://jwt.ms' \
  -d 'grant_type=authorization_code')

echo "📋 Response:"
echo "$RESPONSE"
echo ""

# Extract access token
if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
else
    ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo "✅ Access Token: ${ACCESS_TOKEN:0:50}..."
    echo ""
    echo "🔧 Adding Bing credentials to .env files..."
    
    # Use access token as refresh token for Bing API
    REFRESH_TOKEN="$ACCESS_TOKEN"
    
    # Add to main .env
    echo "" >> .env
    echo "# Bing Webmaster Tools API" >> .env
    echo "BING_CLIENT_ID=$CLIENT_ID" >> .env
    echo "BING_CLIENT_SECRET=$CLIENT_SECRET" >> .env
    echo "BING_REFRESH_TOKEN=$REFRESH_TOKEN" >> .env
    
    # Add to dashboard .env
    echo "" >> dashboard/.env
    echo "# Bing Webmaster Tools API" >> .env
    echo "BING_CLIENT_ID=$CLIENT_ID" >> .env
    echo "BING_CLIENT_SECRET=$CLIENT_SECRET" >> .env
    echo "BING_REFRESH_TOKEN=$REFRESH_TOKEN" >> .env
    
    echo "✅ Bing credentials added successfully!"
    echo ""
    echo "📋 BING CREDENTIALS ADDED:"
    echo "   - BING_CLIENT_ID: $CLIENT_ID"
    echo "   - BING_CLIENT_SECRET: $CLIENT_SECRET"
    echo "   - BING_REFRESH_TOKEN: ${REFRESH_TOKEN:0:50}... (using access token)"
    echo ""
    echo "🎯 SEO agent now has full functionality with GA4, GSC, and Bing!"
else
    echo "❌ Failed to extract access token from response"
    echo "Please check the response above for error details"
fi
