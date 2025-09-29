#!/bin/bash

# Dashboard Deployment Script with Cloudflare Tunnel
# This script deploys the dashboard with Cloudflare tunnel configuration

set -e

echo "🚀 Deploying Dashboard with Cloudflare Tunnel..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_PORT=${DASHBOARD_PORT:-8080}
CLOUDFLARE_DOMAIN=${CLOUDFLARE_DOMAIN:-""}

echo -e "${BLUE}Configuration:${NC}"
echo "  Dashboard Port: $DASHBOARD_PORT"
echo "  Cloudflare Domain: $CLOUDFLARE_DOMAIN"
echo ""

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo -e "${YELLOW}Running inside Docker container${NC}"
    DOCKER_MODE=true
else
    echo -e "${YELLOW}Running on host system${NC}"
    DOCKER_MODE=false
fi

# Build dashboard
echo -e "${YELLOW}Building dashboard...${NC}"
cd apps/dashboard
npm ci
npm run build

# Check if Cloudflare tunnel is configured
if [ ! -f "cloudflare/credentials.json" ]; then
    echo -e "${YELLOW}Cloudflare tunnel not configured. Setting up...${NC}"
    
    if [ "$DOCKER_MODE" = "true" ]; then
        echo -e "${RED}❌ Cannot set up Cloudflare tunnel inside Docker container${NC}"
        echo "Please run the setup script on the host system first:"
        echo "  cd apps/dashboard && ./cloudflare/setup-tunnel.sh"
        exit 1
    else
        ./cloudflare/setup-tunnel.sh
    fi
fi

# Start dashboard
echo -e "${YELLOW}Starting dashboard...${NC}"

if [ "$DOCKER_MODE" = "true" ]; then
    # Inside Docker - start with tunnel
    cloudflared tunnel --config /app/cloudflare/tunnel-config.yml run &
    npm run start
else
    # On host - start with tunnel
    cloudflared tunnel --config cloudflare/tunnel-config.yml run &
    npm run start
fi

echo -e "${GREEN}✅ Dashboard deployed with Cloudflare tunnel!${NC}"
echo ""
echo "Dashboard should be accessible at:"
echo "  Local: http://localhost:$DASHBOARD_PORT"
if [ -f "cloudflare/credentials.json" ]; then
    echo "  Cloudflare: https://dashboard.$CLOUDFLARE_DOMAIN"
fi
