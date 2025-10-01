# 🚀 Agent Instructions

Project root (canonical): /home/justin/llama_rag

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Continuous Work Protocol (MANDATORY)
- Never post “working on it” or “no more breaks” without proof-of-work.
- Every 5 minutes, append to feedback/[your-agent].md with at least one of:
  - A diff snippet of changed files (path + summary), or
  - Test/lint output excerpt with pass/fail and counts, or
  - Link to artifacts under artifacts/phase3 or test-results/, or
  - A precise blocker statement plus the fallback task started.
- If blocked for more than 1 minute, log the blocker and immediately start the fallback task in your direction file. Continue until unblocked.
- Never idle. When a task completes, immediately pick the next one from “Next 5 Tasks” in your direction.

## Simple instructions for all agents
1) Poll coordination/GO-SIGNAL.md, coordination/AGENT-INSTRUCTIONS.md, and your plans/agents/[your-agent]/direction.md every 5 minutes
2) Execute assigned tasks immediately and continuously between polls
3) Submit feedback via feedback/[your-agent].md with proof-of-work every cycle (see above)
