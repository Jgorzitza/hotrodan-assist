#!/bin/bash
set -e
echo "🌐 Cross-Browser Testing..."
python3 selenium-setup.py --browser ${1:-chrome} --url ${DASHBOARD_URL:-http://localhost:3000}
