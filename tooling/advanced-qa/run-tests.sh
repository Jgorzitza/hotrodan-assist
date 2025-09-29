#!/bin/bash
# Advanced QA Test Runner

set -e

echo "🚀 Starting Advanced QA Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p test-results
mkdir -p coverage
mkdir -p security-reports

# Function to run tests with error handling
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${BLUE}Running $test_name...${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# 1. Unit Tests
echo -e "\n${YELLOW}1. Running Unit Tests${NC}"
if run_test "Unit Tests" "npm run test:unit"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# 2. Integration Tests
echo -e "\n${YELLOW}2. Running Integration Tests${NC}"
if run_test "Integration Tests" "npm run test:integration"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# 3. Dashboard Tests
echo -e "\n${YELLOW}3. Running Dashboard Tests${NC}"
cd dashboard
if run_test "Dashboard Tests" "npm run lint && npm run test"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi
cd ..

# 4. E2E Tests
echo -e "\n${YELLOW}4. Running E2E Tests${NC}"
if run_test "E2E Tests" "npm run test:e2e"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Summary
echo -e "\n${BLUE}=================================="
echo -e "Test Suite Summary"
echo -e "==================================${NC}"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi
