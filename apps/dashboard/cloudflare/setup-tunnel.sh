#!/bin/bash

# Cloudflare Tunnel Setup Script for Dashboard
# This script sets up a Cloudflare tunnel for the dashboard application

set -e

echo "🌐 Setting up Cloudflare Tunnel for Dashboard..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    
    # Detect OS and install cloudflared
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflared
    else
        echo "Unsupported OS. Please install cloudflared manually."
        exit 1
    fi
fi

# Create tunnel
echo "Creating Cloudflare tunnel..."
TUNNEL_NAME="dashboard-tunnel-$(date +%s)"
cloudflared tunnel create $TUNNEL_NAME

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')

echo "Tunnel created with ID: $TUNNEL_ID"

# Create credentials file
echo "Creating credentials file..."
cloudflared tunnel token $TUNNEL_ID > cloudflare/credentials.json

# Update tunnel config with actual tunnel ID
sed -i "s/dashboard-tunnel/$TUNNEL_ID/g" cloudflare/tunnel-config.yml

# Create DNS record
echo "Creating DNS record..."
read -p "Enter your domain (e.g., your-domain.com): " DOMAIN
cloudflared tunnel route dns $TUNNEL_ID dashboard.$DOMAIN

echo "✅ Cloudflare tunnel setup complete!"
echo "Tunnel ID: $TUNNEL_ID"
echo "Dashboard URL: https://dashboard.$DOMAIN"
echo ""
echo "To start the tunnel, run:"
echo "  cloudflared tunnel --config cloudflare/tunnel-config.yml run"
