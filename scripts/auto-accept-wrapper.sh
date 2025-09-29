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
