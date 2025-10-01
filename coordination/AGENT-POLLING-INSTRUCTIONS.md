# 🔄 AGENT POLLING INSTRUCTIONS

Project root (canonical): /home/justin/llama_rag

## ⚡ CRITICAL: POLL EVERY 5 MINUTES - DON'T WAIT!

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

### Files to poll every 5 minutes
1. coordination/GO-SIGNAL.md
2. coordination/AGENT-INSTRUCTIONS.md
3. plans/agents/[your-agent]/direction.md
4. coordination/agent-notifications.md (if present)

### Polling commands
```bash
ls -la coordination/GO-SIGNAL.md coordination/AGENT-INSTRUCTIONS.md || true
head -20 plans/agents/[your-agent]/direction.md || true
```

### If you're idle
- Check your direction file
- Continue current assigned tasks
- Submit feedback immediately when work complete
