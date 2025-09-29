#!/bin/bash

# Visual Regression Test Runner
# This script runs visual regression tests and generates baseline screenshots

set -e

echo "🎨 Starting Visual Regression Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3000"}
UPDATE_SNAPSHOTS=${UPDATE_SNAPSHOTS:-false}
HEADLESS=${HEADLESS:-true}
BROWSER=${BROWSER:-"chromium"}

echo -e "${BLUE}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Update Snapshots: $UPDATE_SNAPSHOTS"
echo "  Headless: $HEADLESS"
echo "  Browser: $BROWSER"
echo ""

# Check if base URL is accessible
echo -e "${YELLOW}Checking if dashboard is accessible...${NC}"
if ! curl -s --head "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Dashboard is not accessible at $BASE_URL${NC}"
    echo "Please start the dashboard server first:"
    echo "  cd apps/dashboard && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Dashboard is accessible${NC}"

# Create test results directory
mkdir -p test-results/screenshots
mkdir -p test-results/baselines

# Run visual regression tests
echo -e "${YELLOW}Running visual regression tests...${NC}"

if [ "$UPDATE_SNAPSHOTS" = "true" ]; then
    echo -e "${BLUE}Updating baseline screenshots...${NC}"
    npx playwright test --config=visual-regression.config.js --project=$BROWSER --update-snapshots
else
    echo -e "${BLUE}Running visual regression tests against baselines...${NC}"
    npx playwright test --config=visual-regression.config.js --project=$BROWSER
fi

# Check test results
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All visual regression tests passed!${NC}"
    
    # Generate test report
    echo -e "${YELLOW}Generating test report...${NC}"
    npx playwright show-report test-results/html-report
    
    # Copy screenshots to baselines if updating
    if [ "$UPDATE_SNAPSHOTS" = "true" ]; then
        echo -e "${YELLOW}Copying updated screenshots to baselines...${NC}"
        cp -r test-results/screenshots/* test-results/baselines/ 2>/dev/null || true
    fi
    
    echo -e "${GREEN}🎉 Visual regression testing completed successfully!${NC}"
else
    echo -e "${RED}❌ Visual regression tests failed!${NC}"
    echo "Check the test results for details:"
    echo "  npx playwright show-report test-results/html-report"
    exit 1
fi
