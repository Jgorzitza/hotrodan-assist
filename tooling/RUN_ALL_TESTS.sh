#!/bin/bash
# Master Test Runner - Run all automation tests

set -e

echo "🚀 Master Test Runner - Running All Automation Tests"
echo "======================================================"

mkdir -p ../logs

# 1. API Benchmarking
echo "📊 Running API Benchmarks..."
cd benchmarking && python3 api-benchmarks.py || true
cd ..

# 2. Regression Testing
echo "🧪 Running Regression Tests..."
cd regression && python3 critical-path-tests.py || true
cd ..

# 3. Error Tracking
echo "🔍 Running Error Tracking..."
cd monitoring && python3 error-tracking.py || true
cd ..

echo ""
echo "======================================================"
echo "✅ Test suite complete! Check logs/ for results."
echo "======================================================"
