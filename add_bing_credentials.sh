#!/bin/bash

echo "=== BING WEBMASTER TOOLS CREDENTIALS SETUP ==="
echo ""
echo "🔍 Bing Webmaster Tools API Setup:"
echo "   - Requires Microsoft Azure App Registration"
echo "   - Different from Google OAuth (separate process)"
echo "   - Need Client ID, Client Secret, and Refresh Token"
echo ""

echo "📋 BING API SETUP STEPS:"
echo "1. Go to: https://portal.azure.com/"
echo "2. Navigate to: Azure Active Directory > App registrations"
echo "3. Click 'New registration'"
echo "4. Name: 'Bing Webmaster Tools API'"
echo "5. Redirect URI: https://www.bing.com/webmasters/"
echo "6. Click 'Register'"
echo "7. Note down: Application (client) ID"
echo "8. Go to 'Certificates & secrets' > 'New client secret'"
echo "9. Note down: Client secret value"
echo "10. Go to 'API permissions' > 'Add a permission'"
echo "11. Select 'Bing Webmaster Tools API' > 'Delegated permissions'"
echo "12. Grant 'Bing.WebmasterTools.Read' permission"
echo ""

echo "🔧 OAUTH 2.0 PLAYGROUND STEPS:"
echo "1. Go to: https://developers.google.com/oauthplayground/"
echo "2. Click gear icon → 'Use your own OAuth credentials'"
echo "3. Enter Client ID: [Your Bing Client ID]"
echo "4. Enter Client Secret: [Your Bing Client Secret]"
echo "5. Select scope: https://www.bing.com/webmasters/"
echo "6. Click 'Authorize APIs' and sign in with Microsoft account"
echo "7. Click 'Exchange authorization code for tokens'"
echo "8. Copy the Refresh Token"
echo ""

read -p "Enter Bing Client ID: " BING_CLIENT_ID
read -p "Enter Bing Client Secret: " BING_CLIENT_SECRET
read -p "Enter Bing Refresh Token: " BING_REFRESH_TOKEN

if [ -z "$BING_CLIENT_ID" ] || [ -z "$BING_CLIENT_SECRET" ] || [ -z "$BING_REFRESH_TOKEN" ]; then
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
