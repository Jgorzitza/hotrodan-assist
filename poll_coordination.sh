#!/bin/bash
# Polling script for coordination files - runs every 5 minutes as required

echo "=== Tooling Agent Polling Check - $(date) ==="
echo "Checking coordination files for updates..."

# Check GO-SIGNAL.md
if [ -f "coordination/GO-SIGNAL.md" ]; then
    echo "✓ GO-SIGNAL.md exists"
    echo "Last modified: $(stat -c %y coordination/GO-SIGNAL.md)"
else
    echo "⚠️  GO-SIGNAL.md not found"
fi

# Check tooling direction
if [ -f "plans/agents/tooling/direction.md" ]; then
    echo "✓ tooling/direction.md exists"
    echo "Last modified: $(stat -c %y plans/agents/tooling/direction.md)"
else
    echo "⚠️  tooling/direction.md not found"
fi

# Check for any new blockers
if [ -f "coordination/blockers-log.md" ]; then
    echo "✓ blockers-log.md exists"
    echo "Last modified: $(stat -c %y coordination/blockers-log.md)"
else
    echo "⚠️  blockers-log.md not found"
fi

echo "=== Polling complete ==="
echo ""
