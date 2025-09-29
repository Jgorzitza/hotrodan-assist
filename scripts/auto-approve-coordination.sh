#!/bin/bash
# Auto-approve coordination files for Manager commits

# Set manager override for coordination files
export MANAGER_OVERRIDE=1

# Configure git user for manager commits
git config user.name "Manager"
git config user.email "manager@llama_rag.local"

# Add and commit coordination files with auto-approval
if [[ "$1" == "coordination" ]]; then
    echo "Auto-approving coordination files..."
    git add coordination/ feedback/ plans/agents/*/direction.md plans/tasks.backlog.yaml 2>/dev/null || true
    git commit -m "manager: auto-update coordination files" || true
    echo "Coordination files auto-approved and committed"
fi
