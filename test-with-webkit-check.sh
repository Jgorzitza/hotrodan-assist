#!/bin/bash
# Script to run e2e tests with WebKit dependency detection

echo "🔍 Checking WebKit system dependencies..."

# Check if WebKit dependencies are available
WEBKIT_AVAILABLE=true

# Try to run a simple WebKit test to detect dependencies
if ! npx playwright test --project=webkit --grep="should verify Playwright configuration" --reporter=line 2>&1 | grep -q "Host system is missing dependencies"; then
    echo "✅ WebKit dependencies are available"
    echo "🚀 Running all e2e tests including WebKit..."
    npm run test:e2e
else
    echo "❌ WebKit dependencies are missing"
    echo "🔧 Running e2e tests without WebKit (Chromium + Mobile Chrome only)..."
    
    # Run tests excluding WebKit
    npx playwright test --project=chromium --project=mobile-chrome
    
    echo ""
    echo "📋 WebKit Status Summary:"
    echo "  - WebKit browser: ✅ Installed"
    echo "  - System dependencies: ❌ Missing"
    echo "  - To enable WebKit: Run 'sudo ./install-webkit-deps.sh'"
fi
