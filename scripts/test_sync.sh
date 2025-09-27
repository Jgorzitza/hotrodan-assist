#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="$ROOT_DIR/.venv-sync"
PYTHON_BIN="$VENV_PATH/bin/python"
PIP_BIN="$VENV_PATH/bin/pip"

if [[ ! -d "$VENV_PATH" ]]; then
  python3 -m venv "$VENV_PATH"
fi

"$PIP_BIN" install --upgrade --quiet pip >/dev/null
"$PIP_BIN" install --quiet -r "$ROOT_DIR/app/sync/requirements.txt" >/dev/null

cd "$ROOT_DIR"
PYTHONPATH="$ROOT_DIR" "$PYTHON_BIN" -m unittest \
  app.sync.tests.test_webhooks \
  app.sync.tests.test_orders_endpoint
