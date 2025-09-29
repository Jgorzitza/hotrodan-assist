#!/bin/bash

# Production Deployment Script for Approvals System
# This script deploys the approvals system to production

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for Approvals System"
echo "=================================================="

# Configuration
APP_NAME="hotrod-an-assist"
ENVIRONMENT="production"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/justin/llama_rag/backups"
LOG_FILE="/home/justin/llama_rag/logs/deployment_${TIMESTAMP}.log"

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting deployment process..."

# Step 1: Pre-deployment checks
log "Step 1: Running pre-deployment checks..."

# Check if all required services are running
if ! pgrep -f "remix vite:dev" > /dev/null; then
    log "ERROR: Remix development server is not running"
    exit 1
fi

if ! pgrep -f "python.*rag_api" > /dev/null; then
    log "ERROR: RAG API server is not running"
    exit 1
fi

# Check TypeScript compilation
log "Running TypeScript compilation check..."
cd /home/justin/llama_rag
if ! npm run typecheck; then
    log "ERROR: TypeScript compilation failed"
    exit 1
fi

log "✅ Pre-deployment checks passed"

# Step 2: Create backup
log "Step 2: Creating backup..."
BACKUP_FILE="$BACKUP_DIR/approvals_backup_${TIMESTAMP}.tar.gz"
tar -czf "$BACKUP_FILE" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=backups \
    /home/justin/llama_rag
log "✅ Backup created: $BACKUP_FILE"

# Step 3: Production build
log "Step 3: Building for production..."
cd /home/justin/llama_rag/dashboard

# Install production dependencies
log "Installing production dependencies..."
npm ci --only=production

# Build the application
log "Building application..."
npm run build

log "✅ Production build completed"

# Step 4: Deploy to production
log "Step 4: Deploying to production..."

# Start production services
log "Starting production services..."

# Start RAG API in production mode
cd /home/justin/llama_rag
nohup python3 app/rag_api/main.py > logs/rag_api_${TIMESTAMP}.log 2>&1 &
RAG_PID=$!
echo $RAG_PID > logs/rag_api.pid

# Start connectors API
nohup python3 app/connectors/api.py > logs/connectors_${TIMESTAMP}.log 2>&1 &
CONNECTORS_PID=$!
echo $CONNECTORS_PID > logs/connectors.pid

# Start Shopify app in production mode
cd /home/justin/llama_rag/dashboard
nohup shopify app dev --reset > logs/shopify_app_${TIMESTAMP}.log 2>&1 &
SHOPIFY_PID=$!
echo $SHOPIFY_PID > logs/shopify_app.pid

log "✅ Production services started"

# Step 5: Health checks
log "Step 5: Running health checks..."

# Wait for services to start
sleep 10

# Check RAG API
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    log "✅ RAG API health check passed"
else
    log "❌ RAG API health check failed"
    exit 1
fi

# Check connectors API
if curl -f http://localhost:8003/health > /dev/null 2>&1; then
    log "✅ Connectors API health check passed"
else
    log "❌ Connectors API health check failed"
    exit 1
fi

# Check Shopify app
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Shopify app health check passed"
else
    log "❌ Shopify app health check failed"
    exit 1
fi

log "✅ All health checks passed"

log "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
log "Check the log file for details: $LOG_FILE"

echo ""
echo "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "Services are now running:"
echo "- RAG API: http://localhost:8000"
echo "- Connectors API: http://localhost:8003" 
echo "- Shopify App: http://localhost:3000"
echo ""
echo "Monitor logs with: tail -f $LOG_FILE"
