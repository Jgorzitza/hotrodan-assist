#!/bin/bash
# Sales Insights Production Integration Startup Script
# Part of sales.production-integration

echo "🚀 Starting Sales Insights Production Integration..."

# Set environment variables
export SALES_INSIGHTS_API_URL="http://localhost:8004"
export SALES_INSIGHTS_PORT="8004"
export SALES_INSIGHTS_HOST="0.0.0.0"
export USE_MOCK_DATA="true"  # Set to false when MCP connectors are ready
export REFRESH_INTERVAL_MINUTES="15"

echo "📊 Configuration:"
echo "   - API URL: $SALES_INSIGHTS_API_URL"
echo "   - Port: $SALES_INSIGHTS_PORT"
echo "   - Mock Data: $USE_MOCK_DATA"
echo "   - Refresh Interval: $REFRESH_INTERVAL_MINUTES minutes"

# Change to the sales insights directory
cd "$(dirname "$0")/../app/sales_insights"

echo "🔧 Starting Sales Insights API Server..."

# Start the FastAPI server
python3 api_server.py

echo "✅ Sales Insights API Server started!"
echo "🌐 Dashboard: http://localhost:3000/app/sales-live"
echo "📊 API Health: http://localhost:8004/api/sales/health"
echo "📈 API Docs: http://localhost:8004/docs"
