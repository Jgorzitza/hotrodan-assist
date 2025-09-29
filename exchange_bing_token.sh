#!/bin/bash

echo "=== EXCHANGING BING AUTHORIZATION CODE FOR REFRESH TOKEN ==="
echo ""

# Get the authorization code
AUTH_CODE="M.C556_BAY.2.U.b8cf5562-26c9-51a1-ebc5-da28dccc830f"
CLIENT_ID="5ac8d58b-668b-4ccf-ab2b-c53b831d55f8"

echo "🔍 Authorization Code: $AUTH_CODE"
echo "🔍 Client ID: $CLIENT_ID"
echo ""

read -p "Enter your Bing Client Secret: " CLIENT_SECRET

if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Client secret is required. Exiting."
    exit 1
fi

echo ""
echo "🔧 Exchanging authorization code for tokens..."

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

# Extract refresh token using jq if available, otherwise use grep
if command -v jq &> /dev/null; then
    REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refresh_token')
else
    REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    echo "✅ Refresh Token: $REFRESH_TOKEN"
    echo ""
    echo "🔧 Adding Bing credentials to .env files..."
    
    # Add to main .env
    echo "" >> .env
    echo "# Bing Webmaster Tools API" >> .env
    echo "BING_CLIENT_ID=$CLIENT_ID" >> .env
    echo "BING_CLIENT_SECRET=$CLIENT_SECRET" >> .env
    echo "BING_REFRESH_TOKEN=$REFRESH_TOKEN" >> .env
    
    # Add to dashboard .env
    echo "" >> dashboard/.env
    echo "# Bing Webmaster Tools API" >> dashboard/.env
    echo "BING_CLIENT_ID=$CLIENT_ID" >> dashboard/.env
    echo "BING_CLIENT_SECRET=$CLIENT_SECRET" >> dashboard/.env
    echo "BING_REFRESH_TOKEN=$REFRESH_TOKEN" >> dashboard/.env
    
    echo "✅ Bing credentials added successfully!"
    echo ""
    echo "📋 BING CREDENTIALS ADDED:"
    echo "   - BING_CLIENT_ID: $CLIENT_ID"
    echo "   - BING_CLIENT_SECRET: $CLIENT_SECRET"
    echo "   - BING_REFRESH_TOKEN: ${REFRESH_TOKEN:0:20}..."
    echo ""
    echo "🎯 SEO agent now has full functionality with GA4, GSC, and Bing!"
else
    echo "❌ Failed to extract refresh token from response"
    echo "Please check the response above for error details"
fi
