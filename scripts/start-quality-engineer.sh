#!/bin/bash
# Quality Engineer Startup Script
# Starts the overnight enterprise audit system

echo "🔍 QUALITY ENGINEER STARTING"
echo "📋 Following instructions for quality.overnight-enterprise-audit"
echo "⚠️ HIERARCHY: FEEDBACK TO MANAGER ONLY"
echo "🔄 Working continuously..."

# Change to the project directory
cd /home/justin/llama_rag

# Activate virtual environment
source .venv/bin/activate

# Start the overnight enterprise audit
python3 scripts/overnight-enterprise-audit.py
