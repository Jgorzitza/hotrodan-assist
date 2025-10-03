# 🚀 Agent Instructions

Project root (canonical): /home/justin/llama_rag

## Approvals & Cadence
- Manager directives are pre-approved. Do not pause waiting for CEO instructions.
- Poll every 5 minutes: `coordination/GO-SIGNAL.md`, this file, and your `plans/agents/<agent>/direction.md`.
- Keep `agent_launch_commands.md` handy for boot prompts & GO gate reminders.

## Proof-of-Work (non-negotiable)
Every 5 minutes append to `feedback/<agent>.md`:
- commands run + pass/fail counts, or
- diff summary (paths + intent), or
- blocker with owner + fallback you started.
Never send "working on it" without evidence.

## When Blocked
1. Log the blocker in `feedback/<agent>.md` and (if needed) `coordination/blockers-log.md`.
2. Start the fallback task listed in your direction file.
3. Keep polling while you work the fallback.

## GO Gate Reminder
No employee agent launches until the Manager posts `GO <commit-sha>` in `feedback/manager.md`. Once GO is posted, relaunch sessions so they pick up updated directions.

Stay aligned to the canonical docs:
- Strategy: `docs/NORTH_STAR.md`
- Planning: `plans/rpg.json`, `plans/tasks.backlog.yaml`
- Directions + feedback: `plans/agents/<agent>/direction.md`, `feedback/<agent>.md`
