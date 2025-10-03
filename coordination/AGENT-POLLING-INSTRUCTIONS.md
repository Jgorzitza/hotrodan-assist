# 🔄 Agent Polling Instructions

Project root (canonical): /home/justin/llama_rag

## 5-Minute Poll Loop
1. `coordination/GO-SIGNAL.md`
2. `coordination/AGENT-INSTRUCTIONS.md`
3. `plans/agents/<agent>/direction.md`
4. Relevant inbox note under `coordination/inbox/<agent>/<date>-notes.md`

Use quick commands:
```bash
ls -l coordination/GO-SIGNAL.md coordination/AGENT-INSTRUCTIONS.md
head -40 plans/agents/<agent>/direction.md
```

## Proof-of-Work Expectations
- Every poll cycle append to `feedback/<agent>.md`.
- Include command output, diff summary, or blocker + fallback started.
- No evidence → non-compliant.

## Idle? Start the Next Task
- Re-read direction file; pick the next action listed.
- Update feedback before switching tasks.
- Escalate blockers via `coordination/blockers-log.md` with owner + timestamp.

Remember the GO gate: employees stay paused until Manager posts `GO <commit-sha>` in `feedback/manager.md`.
