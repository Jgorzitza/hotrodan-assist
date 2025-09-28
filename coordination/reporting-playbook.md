# Reporting & Escalation Playbook

## Daily Cadence
1. Sweep new notes in `coordination/inbox/*/` and update `status-dashboard.md`.
2. Check `blockers-log.md` for items older than 48h; ping owners in feedback notes.
3. Review coordination memos (`coordination/2025-*`) for open tasks; update status or close out.
4. Log your sweep in `coordination/inbox/manager/<YYYY-MM-DD>-notes.md`.

## Weekly Cadence
- Regenerate managed instructions (`scripts/launch_agent.sh manager --regen`) after verifying prompts.
- Confirm all MVP gates still track green; update dependency matrix if contracts changed.
- Ensure `SESSION_SUMMARY_*` reflects latest ingest/goldens and dashboard status.

## Escalation Rules
- Credential or infra blockers → escalate to user immediately with mitigation plan.
- Cross-agent contract changes → create/append coordination memo and notify impacted agents via feedback notes.
- Schedule risk (>24h slip) → document in manager note + blockers log with new target.

## Communication Channels
- Primary: append-only notes in `coordination/inbox/`.
- Secondary: update `AGENT_COMMANDS.md` summary row if scope or cadence changes.
- Handoff: update `docs/agents.md` and `handover/*.md` via regen scripts after major shifts.
