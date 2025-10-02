#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
DIR_FILE="$ROOT_DIR/plans/agents/mcp/direction.md"
GO_SIGNAL="$ROOT_DIR/coordination/GO-SIGNAL.md"
FEEDBACK="$ROOT_DIR/feedback/mcp.md"
NOTES_DIR="$ROOT_DIR/coordination/inbox/mcp"
STAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

hash_file() {
  sha1sum "$1" | awk '{print $1}'
}

prev_hash=""

while true; do
  if [[ -f "$DIR_FILE" ]]; then
    current_hash=$(hash_file "$DIR_FILE")
    if [[ "$current_hash" != "$prev_hash" ]]; then
      echo "$STAMP — Direction file changed: $current_hash" >> "$FEEDBACK"
      prev_hash="$current_hash"
    fi
  fi
  if [[ ! -f "$GO_SIGNAL" ]]; then
    echo "$STAMP — GO-SIGNAL.md missing; continuing by direction file only" >> "$FEEDBACK"
  fi
  sleep 300
done