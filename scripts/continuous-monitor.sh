#!/usr/bin/env bash
set -euo pipefail

# Continuous monitoring script for Quality Engineer
# Runs security scans, performance checks, and quality metrics
# Appends findings to coordination/inbox/quality/<date>-monitor.log

DATE=$(date +%F)
TIMESTAMP=$(date -u +%FT%TZ)
LOG="coordination/inbox/quality/${DATE}-monitor.log"
mkdir -p "$(dirname "$LOG")"

echo "[$TIMESTAMP] === Continuous Quality Monitor ===" | tee -a "$LOG"

# 1. Security: npm audit (non-intrusive check)
echo "[$TIMESTAMP] Running npm audit..." | tee -a "$LOG"
if npm audit --json > /tmp/npm-audit.json 2>&1; then
  MODERATE=$(jq -r '.metadata.vulnerabilities.moderate // 0' /tmp/npm-audit.json 2>/dev/null || echo "0")
  HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' /tmp/npm-audit.json 2>/dev/null || echo "0")
  CRITICAL=$(jq -r '.metadata.vulnerabilities.critical // 0' /tmp/npm-audit.json 2>/dev/null || echo "0")
  echo "[$TIMESTAMP] npm audit: moderate=$MODERATE high=$HIGH critical=$CRITICAL" | tee -a "$LOG"
  
  if [[ "$CRITICAL" -gt 0 ]] || [[ "$HIGH" -gt 0 ]]; then
    echo "[$TIMESTAMP] ⚠️  ALERT: High/Critical vulnerabilities detected!" | tee -a "$LOG"
  fi
else
  echo "[$TIMESTAMP] npm audit failed or found issues" | tee -a "$LOG"
fi

# 2. TypeScript check (quick)
echo "[$TIMESTAMP] Running TypeScript check..." | tee -a "$LOG"
if npm run lint >/dev/null 2>&1; then
  echo "[$TIMESTAMP] ✅ TypeScript: PASS" | tee -a "$LOG"
else
  echo "[$TIMESTAMP] ❌ TypeScript: FAIL" | tee -a "$LOG"
fi

# 3. Check for large files or bloat
echo "[$TIMESTAMP] Checking for large files (>10MB)..." | tee -a "$LOG"
LARGE_FILES=$(find . -type f -size +10M -not -path "*/node_modules/*" -not -path "*/.venv*" -not -path "*/.git/*" 2>/dev/null || true)
if [[ -n "$LARGE_FILES" ]]; then
  echo "[$TIMESTAMP] ⚠️  Large files found:" | tee -a "$LOG"
  echo "$LARGE_FILES" | tee -a "$LOG"
else
  echo "[$TIMESTAMP] ✅ No large files detected" | tee -a "$LOG"
fi

# 4. Disk usage check
echo "[$TIMESTAMP] Checking disk usage..." | tee -a "$LOG"
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
echo "[$TIMESTAMP] Disk usage: ${DISK_USAGE}%" | tee -a "$LOG"
if [[ "$DISK_USAGE" -gt 80 ]]; then
  echo "[$TIMESTAMP] ⚠️  ALERT: Disk usage above 80%" | tee -a "$LOG"
fi

# 5. Node modules size check
if [[ -d "node_modules" ]]; then
  NODE_SIZE=$(du -sh node_modules 2>/dev/null | awk '{print $1}')
  echo "[$TIMESTAMP] node_modules size: $NODE_SIZE" | tee -a "$LOG"
fi

# 6. Performance: Count TODO/FIXME/HACK comments
echo "[$TIMESTAMP] Scanning for code debt markers..." | tee -a "$LOG"
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | wc -l || echo "0")
echo "[$TIMESTAMP] Code debt markers found: $TODO_COUNT" | tee -a "$LOG"

# 7. Git status check (uncommitted changes)
echo "[$TIMESTAMP] Checking git status..." | tee -a "$LOG"
if git diff --quiet && git diff --cached --quiet; then
  echo "[$TIMESTAMP] ✅ No uncommitted changes" | tee -a "$LOG"
else
  CHANGED=$(git status --short | wc -l)
  echo "[$TIMESTAMP] ℹ️  Uncommitted changes: $CHANGED files" | tee -a "$LOG"
fi

echo "[$TIMESTAMP] === Monitor cycle complete ===" | tee -a "$LOG"
echo "" | tee -a "$LOG"
