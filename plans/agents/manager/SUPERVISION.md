# Overnight Supervision Protocol

## 🎯 ACTIVE MONITORING - Every 30 Minutes

### Check All Agent Progress Files:
- coordination/inbox/dashboard/2025-09-30-notes.md
- coordination/inbox/inventory/2025-09-30-notes.md
- coordination/inbox/seo/2025-09-30-notes.md
- coordination/inbox/rag/2025-09-30-notes.md
- coordination/inbox/mcp/2025-09-30-notes.md
- coordination/inbox/quality/2025-09-30-notes.md
- coordination/inbox/tooling/2025-09-30-notes.md
- coordination/inbox/approvals/2025-09-30-notes.md

### 🚨 NUDGE TRIGGERS:

**STALLED (No updates 30+ min):**
```
URGENT: Resume work immediately!
You're in autonomous mode - no waiting required.
Continue with next task in OVERNIGHT_TASKS.md
Log progress every 15 minutes.
```

**WAITING FOR APPROVAL:**
```
AUTONOMOUS MODE: No approval needed!
Continue working through all tasks.
Handle blockers yourself - log and move on.
DO NOT STOP until all tasks complete.
```

**FINISHED TOO EARLY (<80% tasks):**
```
Task list incomplete: X of Y tasks done.
Continue with remaining tasks:
[List next 5 tasks]
Keep working until time expires!
```

**STUCK ON SAME TASK:**
```
BLOCKER DETECTED: Log issue and SKIP to next task.
Return to this later if unblocked.
DO NOT wait - keep moving forward!
Next task: [specify task]
```

## 📊 Hourly Progress Check

Target: ~10% of tasks per hour per agent
- Dashboard: 5 tasks/hour (50 total)
- Quality: 6 tasks/hour (60 total)
- SEO: 4 tasks/hour (43 total)
- MCP: 5 tasks/hour (50 total)
- RAG: 3.5 tasks/hour (35 total)
- Tooling: 3.5 tasks/hour (35 total)
- Inventory: 3 tasks/hour (30 total)
- Approvals: 2.5 tasks/hour (25 total)

## 🎯 Manager Actions:

1. **Monitor** progress files every 30 min
2. **Nudge** stalled/lazy agents immediately
3. **Unblock** stuck agents with solutions
4. **Reallocate** if agents finish early
5. **Track** overall progress toward 250+ tasks

**Manager stays active all night!**
