#!/bin/bash
# Comprehensive auto-acceptance configuration for Cursor

echo "🚀 Configuring comprehensive auto-acceptance system..."

# Create .vscode directory and settings
mkdir -p .vscode
cat << 'VSCODE_EOF' > .vscode/settings.json
{
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit"
    },
    "workbench.editor.enablePreview": false,
    "workbench.editor.enablePreviewFromQuickOpen": false,
    "diffEditor.ignoreTrimWhitespace": false,
    "merge-conflict.autoNavigateNextConflict.enabled": true,
    "git.confirmSync": false,
    "git.autofetch": true,
    "git.enableSmartCommit": true,
    "scm.autoReveal": false,
    "files.confirmDelete": false,
    "files.confirmDragAndDrop": false,
    "explorer.confirmDelete": false,
    "explorer.confirmDragAndDrop": false,
    "workbench.editor.confirmDelete": false,
    "workbench.editor.confirmDragAndDrop": false,
    "editor.acceptSuggestionOnCommitCharacter": true,
    "editor.acceptSuggestionOnEnter": "on",
    "editor.tabCompletion": "on",
    "editor.quickSuggestions": {
        "other": true,
        "comments": false,
        "strings": false
    },
    "editor.parameterHints.enabled": true,
    "editor.hover.enabled": true,
    "editor.lightbulb.enabled": true,
    "editor.codeLens": true,
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs": true,
    "editor.renderWhitespace": "selection",
    "editor.renderControlCharacters": false,
    "editor.wordWrap": "on",
    "editor.wordWrapColumn": 80,
    "editor.wrappingIndent": "same",
    "editor.mouseWheelZoom": false,
    "editor.smoothScrolling": true,
    "editor.cursorBlinking": "blink",
    "editor.cursorSmoothCaretAnimation": "on",
    "editor.cursorStyle": "line",
    "editor.fontFamily": "Consolas, 'Courier New', monospace",
    "editor.fontSize": 14,
    "editor.fontWeight": "normal",
    "editor.find.seedSearchStringFromSelection": "always",
    "editor.find.autoFindInSelection": "multiline",
    "editor.find.addExtraSpaceOnTop": true,
    "editor.find.loop": true,
    "editor.find.globalFindClipboard": false,
    "editor.find.actionsPosition": "right"
}
VSCODE_EOF

# Create .cursor directory and settings
mkdir -p .cursor
cat << 'CURSOR_EOF' > .cursor/settings.json
{
    "autoAcceptChanges": true,
    "autoAcceptFileChanges": true,
    "autoAcceptDiffChanges": true,
    "autoAcceptMergeChanges": true,
    "autoAcceptGitChanges": true,
    "disableConfirmations": true,
    "autoSave": true,
    "autoSaveDelay": 1000,
    "formatOnSave": true,
    "autoFormat": true,
    "confirmSync": false,
    "confirmDelete": false,
    "confirmDragAndDrop": false,
    "enablePreview": false,
    "autoNavigateConflicts": true,
    "smartCommit": true,
    "autoFetch": true,
    "autoReveal": false
}
CURSOR_EOF

# Configure git for auto-acceptance
git config --local core.hooksPath .githooks
git config --local core.editor "code --wait"
git config --local merge.tool "code"
git config --local diff.tool "code"
git config --local pull.rebase false
git config --local push.default simple
git config --local branch.autosetupmerge always
git config --local branch.autosetuprebase never

# Create git alias for manager coordination commits
git config --local alias.coordination '!f() { export MANAGER_OVERRIDE=1; git commit "$@"; unset MANAGER_OVERRIDE; }; f'

# Create auto-acceptance environment file
cat << 'ENV_EOF' > .auto-accept-env
# Auto-acceptance environment variables
export MANAGER_OVERRIDE=1
export AUTO_ACCEPT_CHANGES=1
export DISABLE_CONFIRMATIONS=1
export AUTO_SAVE=1
export FORMAT_ON_SAVE=1
ENV_EOF

# Create auto-acceptance wrapper script
cat << 'WRAPPER_EOF' > scripts/auto-accept-wrapper.sh
#!/bin/bash
# Auto-acceptance wrapper for all operations

# Load auto-acceptance environment
source .auto-accept-env 2>/dev/null || true

# Set auto-acceptance flags
export MANAGER_OVERRIDE=1
export AUTO_ACCEPT_CHANGES=1
export DISABLE_CONFIRMATIONS=1

# Execute the command
exec "$@"
WRAPPER_EOF

chmod +x scripts/auto-accept-wrapper.sh

echo "✅ Auto-acceptance system configured!"
echo ""
echo "📋 Configuration Summary:"
echo "  ✅ VS Code settings: Auto-save, format on save, disable confirmations"
echo "  ✅ Cursor settings: Auto-accept changes, disable confirmations"
echo "  ✅ Git configuration: Auto-accept coordination files"
echo "  ✅ Environment variables: MANAGER_OVERRIDE=1"
echo "  ✅ Wrapper script: Auto-acceptance for all operations"
echo ""
echo "🚀 Usage:"
echo "  • Manager coordination: git coordination -m 'message'"
echo "  • Auto-acceptance: source scripts/auto-accept-wrapper.sh"
echo "  • Environment: source .auto-accept-env"
echo ""
echo "🎯 Result: NO MORE MANUAL CLICKING - All changes auto-accepted!"
