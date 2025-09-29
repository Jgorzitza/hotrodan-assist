#!/bin/bash
# Auto-acceptance configuration for Cursor environment

echo "Setting up auto-acceptance for coordination files..."

# Configure VS Code settings for auto-save and format on save
mkdir -p .vscode
cat << 'VSCODE_EOF' > .vscode/settings.json
{
    "files.autoSave": "afterDelay",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit"
    },
    "files.autoSaveDelay": 1000,
    "editor.formatOnSaveMode": "file"
}
VSCODE_EOF

# Configure git for auto-acceptance of coordination files
git config --local core.hooksPath .githooks

# Set up git alias for manager coordination commits
git config --local alias.coordination '!f() { export MANAGER_OVERRIDE=1; git commit "$@"; unset MANAGER_OVERRIDE; }; f'

echo "Auto-acceptance configured!"
echo "Coordination files: Auto-accepted"
echo "Agent work files: Auto-accepted after quality checks"
echo "Other files: Standard checks"
echo ""
echo "Manager can now commit coordination changes with:"
echo "git coordination -m 'manager: update directions'"
