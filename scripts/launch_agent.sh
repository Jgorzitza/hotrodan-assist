#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_FILE="$REPO_ROOT/AGENT_COMMANDS.md"

if [[ ! -f "$AGENT_FILE" ]]; then
  echo "Missing AGENT_COMMANDS.md in $REPO_ROOT" >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage: scripts/launch_agent.sh <agent> [codex-options]
Agents:
  rag            - RAG & Corrections
  assistants     - Assistants API & Drafts
  approval       - Approval App UI
  sync           - Sync & Webhooks Service
  dashboard      - Dashboard Home UI
  sales          - Sales Analytics UI
  orders         - Orders Operations UI
  inbox          - Inbox UI & Feedback
  inventory      - Inventory Planner UI
  seo            - SEO Insights UI
  settings       - Settings Admin UI
  data           - Data & Prisma
  mcp            - MCP Integration
  tooling        - Tooling – Prisma Config
  manager        - Program Manager – Coordinator
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

agent="$1"
shift || true
extra_args=("$@")

prompt_path=""
role_label=""

case "$agent" in
  rag)
    prompt_path="agents.md"
    role_label="RAG & Corrections"
    ;;
  assistants)
    prompt_path="prompts/dashboard/data-layer.md"
    role_label="Assistants API & Drafts"
    ;;
  approval)
    prompt_path="prompts/dashboard/route-inbox.md"
    role_label="Approval App UI"
    ;;
  sync)
    prompt_path="prompts/dashboard/webhooks.md"
    role_label="Sync & Webhooks Service"
    ;;
  dashboard)
    prompt_path="prompts/dashboard/route-dashboard.md"
    role_label="Dashboard Home UI"
    ;;
  sales)
    prompt_path="prompts/dashboard/route-sales.md"
    role_label="Sales Analytics UI"
    ;;
  orders)
    prompt_path="prompts/dashboard/route-orders.md"
    role_label="Orders Operations UI"
    ;;
  inbox)
    prompt_path="prompts/dashboard/route-inbox.md"
    role_label="Inbox UI & Feedback"
    ;;
  inventory)
    prompt_path="prompts/dashboard/route-inventory.md"
    role_label="Inventory Planner UI"
    ;;
  seo)
    prompt_path="prompts/dashboard/route-seo.md"
    role_label="SEO Insights UI"
    ;;
  settings)
    prompt_path="prompts/dashboard/route-settings.md"
    role_label="Settings Admin UI"
    ;;
  data)
    prompt_path="prompts/dashboard/database.md"
    role_label="Data & Prisma"
    ;;
  mcp)
    prompt_path="prompts/dashboard/mcp.md"
    role_label="MCP Integration"
    ;;
  tooling)
    prompt_path="prompts/tooling/prisma-config.md"
    role_label="Tooling – Prisma Config"
    ;;
  manager|program)
    prompt_path="prompts/tooling/program-manager.md"
    role_label="Program Manager – Coordinator"
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown agent '$agent'." >&2
    usage
    exit 1
    ;;
esac

if [[ ! -f "$REPO_ROOT/$prompt_path" ]]; then
  echo "Prompt file '$prompt_path' not found." >&2
  exit 1
fi

row="$(grep -F "| $role_label |" "$AGENT_FILE" || true)"
if [[ -z "$row" ]]; then
  echo "Unable to locate row for '$role_label' in AGENT_COMMANDS.md" >&2
  exit 1
fi

IFS='|' read -r _ role_column command_column focus_column checklist_column _ <<< "$row"
role_column="$(echo "$role_column" | xargs)"
focus_column="$(echo "$focus_column" | xargs)"
checklist_column="$(echo "$checklist_column" | xargs)"

general_note="$(awk '/^### General Reminders/{flag=1} flag {print}' "$AGENT_FILE")"
if [[ -z "$general_note" ]]; then
  echo "Failed to extract General Reminders from AGENT_COMMANDS.md" >&2
  exit 1
fi

general_note="$(echo "$general_note" | sed '1d' | tr '\n' ' ')"

instructions=$(printf 'Role: %s agent. Primary responsibilities: %s. Pause checklist: %s. General reminders: %s. Open %s for the full plan and continue moving toward MVP.' \
  "$role_column" \
  "$focus_column" \
  "$checklist_column" \
  "$general_note" \
  "$prompt_path")

if [[ ${#extra_args[@]} -eq 0 ]]; then
  codex --cd "$REPO_ROOT" "$instructions"
else
  codex --cd "$REPO_ROOT" "${extra_args[@]}" "$instructions"
fi
