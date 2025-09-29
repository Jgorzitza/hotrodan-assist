#!/bin/bash

echo "=== ADDING GA4 CREDENTIALS ==="
echo ""
echo "Please provide the following GA4 credentials:"
echo ""

# Prompt for GA4 Property ID
read -p "GA4 Property ID: " GA4_PROPERTY_ID
if [ -z "$GA4_PROPERTY_ID" ]; then
    echo "Error: GA4 Property ID is required"
    exit 1
fi

# Prompt for GA4 Client ID
read -p "GA4 Client ID: " GA4_CLIENT_ID
if [ -z "$GA4_CLIENT_ID" ]; then
    echo "Error: GA4 Client ID is required"
    exit 1
fi

# Prompt for GA4 Client Secret
read -s -p "GA4 Client Secret: " GA4_CLIENT_SECRET
echo ""
if [ -z "$GA4_CLIENT_SECRET" ]; then
    echo "Error: GA4 Client Secret is required"
    exit 1
fi

# Prompt for GA4 Refresh Token
read -s -p "GA4 Refresh Token: " GA4_REFRESH_TOKEN
echo ""
if [ -z "$GA4_REFRESH_TOKEN" ]; then
    echo "Error: GA4 Refresh Token is required"
    exit 1
fi

echo ""
echo "Adding GA4 credentials to .env files..."

# Add to main .env file
echo "" >> .env
echo "# GA4 Credentials" >> .env
echo "GA4_PROPERTY_ID=$GA4_PROPERTY_ID" >> .env
echo "GA4_CLIENT_ID=$GA4_CLIENT_ID" >> .env
echo "GA4_CLIENT_SECRET=$GA4_CLIENT_SECRET" >> .env
echo "GA4_REFRESH_TOKEN=$GA4_REFRESH_TOKEN" >> .env

# Add to dashboard/.env file
echo "" >> dashboard/.env
echo "# GA4 Credentials" >> dashboard/.env
echo "GA4_PROPERTY_ID=$GA4_PROPERTY_ID" >> dashboard/.env
echo "GA4_CLIENT_ID=$GA4_CLIENT_ID" >> dashboard/.env
echo "GA4_CLIENT_SECRET=$GA4_CLIENT_SECRET" >> dashboard/.env
echo "GA4_REFRESH_TOKEN=$GA4_REFRESH_TOKEN" >> dashboard/.env

echo "✅ GA4 credentials added successfully to both .env files"
echo ""
echo "GA4 Property ID: $GA4_PROPERTY_ID"
echo "GA4 Client ID: $GA4_CLIENT_ID"
echo "GA4 Client Secret: [HIDDEN]"
echo "GA4 Refresh Token: [HIDDEN]"
echo ""
echo "Credentials are now available for MCP connectors and analytics systems."
