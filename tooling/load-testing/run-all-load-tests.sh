#!/bin/bash
# Run all k6 load tests

set -e

echo "🚀 Starting k6 load testing suite..."
mkdir -p ../../logs

# Check k6 installation
if ! command -v k6 &> /dev/null; then
    echo "⚠️  k6 not installed. Install from: https://k6.io/docs/get-started/installation/"
    echo "    Quick install (Linux): sudo gpg -k && sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo 'deb https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6"
    exit 1
fi

echo "Running Dashboard Load Test..."
k6 run k6-dashboard.js || true

echo "Running Inventory API Load Test..."
k6 run k6-inventory-api.js || true

echo "✅ Load testing complete! Results in logs/"
