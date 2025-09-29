#!/bin/bash
# Setup global Cursor configuration for auto-acceptance

echo "🚀 Setting up global Cursor auto-acceptance configuration..."

# Create global Cursor settings directory
mkdir -p ~/.config/Cursor/User

# Create global settings.json for Cursor
cat << 'GLOBAL_EOF' > ~/.config/Cursor/User/settings.json
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
GLOBAL_EOF

# Create global keybindings.json for Cursor
cat << 'KEYBINDINGS_EOF' > ~/.config/Cursor/User/keybindings.json
[
    {
        "key": "ctrl+s",
        "command": "workbench.action.files.save",
        "when": "editorTextFocus"
    },
    {
        "key": "ctrl+shift+s",
        "command": "workbench.action.files.saveAll"
    },
    {
        "key": "ctrl+shift+p",
        "command": "workbench.action.showCommands"
    },
    {
        "key": "ctrl+shift+f",
        "command": "workbench.action.findInFiles"
    },
    {
        "key": "ctrl+shift+h",
        "command": "workbench.action.replaceInFiles"
    },
    {
        "key": "ctrl+shift+g",
        "command": "workbench.view.scm"
    },
    {
        "key": "ctrl+shift+d",
        "command": "workbench.view.debug"
    },
    {
        "key": "ctrl+shift+e",
        "command": "workbench.view.explorer"
    },
    {
        "key": "ctrl+shift+x",
        "command": "workbench.view.extensions"
    },
    {
        "key": "ctrl+shift+y",
        "command": "workbench.debug.action.toggleRepl"
    },
    {
        "key": "ctrl+shift+z",
        "command": "workbench.action.terminal.toggleTerminal"
    }
]
KEYBINDINGS_EOF

echo "✅ Global Cursor configuration created!"
echo "📁 Location: ~/.config/Cursor/User/"
echo "🎯 Result: Auto-acceptance configured globally for Cursor"
echo ""
echo "🔄 Please restart Cursor for changes to take effect"
