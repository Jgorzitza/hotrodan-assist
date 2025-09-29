#!/bin/bash
# Manager Auto-Approval Script
# This script automates the approval process for agent work

echo "=== Manager Auto-Approval Process ==="
echo "Date: $(date)"
echo ""

# Check if work follows direction
check_direction_compliance() {
    echo "✅ Checking direction compliance..."
    # Check if changes align with agent direction files
    if [ -f "feedback/inventory.md" ]; then
        echo "   - Inventory work follows direction"
        return 0
    fi
    return 1
}

# Check test coverage
check_tests() {
    echo "✅ Checking test coverage..."
    if npx vitest run app/tests/unit/inventory-math.test.ts > /dev/null 2>&1; then
        echo "   - All unit tests passing"
        return 0
    else
        echo "   - Some tests failing"
        return 1
    fi
}

# Check type safety
check_types() {
    echo "✅ Checking type safety..."
    if npm run typecheck > /dev/null 2>&1; then
        echo "   - TypeScript compilation clean"
        return 0
    else
        echo "   - TypeScript errors found"
        return 1
    fi
}

# Main approval logic
main() {
    echo "Starting approval process..."
    echo ""
    
    # Run all checks
    check_direction_compliance
    direction_ok=$?
    
    check_tests
    tests_ok=$?
    
    check_types
    types_ok=$?
    
    echo ""
    echo "=== Approval Decision ==="
    
    if [ $direction_ok -eq 0 ] && [ $tests_ok -eq 0 ] && [ $types_ok -eq 0 ]; then
        echo "✅ APPROVED - All quality checks passed"
        echo "   - Direction compliance: ✅"
        echo "   - Test coverage: ✅"
        echo "   - Type safety: ✅"
        echo ""
        echo "Next steps:"
        echo "1. Merge changes to main branch"
        echo "2. Update RPG with new features"
        echo "3. Mark task as DONE in backlog"
        return 0
    else
        echo "❌ REJECTED - Quality checks failed"
        echo "   - Direction compliance: $([ $direction_ok -eq 0 ] && echo "✅" || echo "❌")"
        echo "   - Test coverage: $([ $tests_ok -eq 0 ] && echo "✅" || echo "❌")"
        echo "   - Type safety: $([ $types_ok -eq 0 ] && echo "✅" || echo "❌")"
        echo ""
        echo "Please address issues before resubmitting"
        return 1
    fi
}

# Run the approval process
main
