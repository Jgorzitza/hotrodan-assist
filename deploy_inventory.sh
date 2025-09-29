#!/bin/bash

# Inventory Production Deployment Script
# Deploys optimized inventory components to production

set -e

echo "🚀 Starting Inventory Production Deployment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run from project root."
    exit 1
fi

# Check if required files exist
echo "📋 Checking required files..."
required_files=(
    "inventory_api.py"
    "inventory_analytics_optimized.py"
    "mcp_inventory_integration.py"
    "test_inventory_performance.py"
    "Dockerfile.inventory"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Required file $file not found"
        exit 1
    fi
    echo "✅ Found $file"
done

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/chroma
mkdir -p data/storage
mkdir -p logs/inventory

# Set permissions
chmod 755 data/chroma
chmod 755 data/storage
chmod 755 logs/inventory

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build inventory-api connectors

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
if curl -f http://localhost:8004/health > /dev/null 2>&1; then
    echo "✅ Inventory API is healthy"
else
    echo "❌ Inventory API health check failed"
    exit 1
fi

if curl -f http://localhost:8003/health > /dev/null 2>&1; then
    echo "✅ MCP Connectors are healthy"
else
    echo "⚠️  MCP Connectors health check failed (may be using mock data)"
fi

# Run production validation tests
echo "🧪 Running production validation tests..."
if [ -f "test_inventory_performance.py" ]; then
    python3 test_inventory_performance.py --production
    echo "✅ Production validation tests completed"
else
    echo "⚠️  Production validation tests not found"
fi

# Display service information
echo ""
echo "🎉 Inventory Production Deployment Complete!"
echo ""
echo "📊 Service Endpoints:"
echo "  Inventory API: http://localhost:8004"
echo "  MCP Connectors: http://localhost:8003"
echo "  Health Check: http://localhost:8004/health"
echo "  API Docs: http://localhost:8004/docs"
echo ""
echo "📈 Performance Monitoring:"
echo "  Metrics: http://localhost:8004/performance/metrics"
echo "  Logs: tail -f logs/inventory/inventory.log"
echo ""
echo "🔧 Management Commands:"
echo "  Stop services: docker-compose down"
echo "  View logs: docker-compose logs -f inventory-api"
echo "  Restart: docker-compose restart inventory-api"
echo ""

echo "✅ Deployment completed successfully!"
