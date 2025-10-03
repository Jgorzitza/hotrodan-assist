# Cleanup Inventory — 2025-10-02

| Path | Type | Issue | Planned action |
| --- | --- | --- | --- |
| README.md | doc | References archived HANDOVER docs; lacks structure + North Star alignment | Update to match NORTH_STAR and document repo layout |
| docs/COMPONENTS.md (missing) | doc | Required supporting doc absent | Create placeholder with header |
| docs/DECISIONS.md (missing) | doc | Decisions log missing | Create file and add canonicalization entry |
| docs/PATTERNS.md (missing) | doc | Required supporting doc absent | Create placeholder with header |
| docs/TROUBLESHOOTING.md (missing) | doc | Required supporting doc absent | Create placeholder with header |
| docs/ARCHITECTURE.md (missing) | doc | Required supporting doc absent | Create placeholder with header |
| handover/** | instructions | Legacy direction/hand-off docs duplicate plans/agents/* | Archive under archive/legacy/handover/; add HANDOVER.md stub pointing to canonical docs |
| AGENT_COMMANDS.md | boot prompt | Duplicates agent_launch_commands; references obsolete scripts | Archive under archive/legacy/AGENT_COMMANDS.md; add stub linking to agent_launch_commands.md |
| agent_launch_commands.md | boot prompt | Missing GO gate warning; references non-canonical prompts | Update content and add GO-gate note |
| plans/agents.json | plan meta | References obsolete prompts/branches | Archive under archive/legacy/plans/agents.json |
| plans/work_orders/WO-00*.yml | plan meta | Out-of-date work orders no longer used | Archive under archive/legacy/plans/work_orders/ |
| plans/tasks.backlog.yaml | backlog | >10 active tasks; no cleanup atoms | Normalize to ≤10 active and add cleanup tasks |
| commands/cleanup-and-merge.md | instructions | Outdated (moves HANDOVER root files) | Archive under archive/legacy/commands/ |
| playbooks/phase3/cleanup.md | instructions | Outdated (references removed files) | Archive under archive/legacy/playbooks/ |
| feedback/dashboard-2025-10-01-1751.md | feedback | Ad-hoc status file outside canonical naming | Archive under archive/legacy/feedback/ |
| .github/CODEOWNERS | policy | Points to archived files; misses canonical set | Update owners for canonical docs |
| .github/workflows/verify-managed-files.yml | policy | Guards outdated paths; enforces missing headers | Update managed list to canonical files |
| .github/workflows/check-required-files.yml | policy | Requires removed files; misses canonical docs | Update required-file list |
| .github/pull_request_template.md (missing) | policy | Template absent; acceptance requires atomic scope checklist | Add new template |
| coordination/AGENT-INSTRUCTIONS.md | instructions | Duplicates agent direction guardrails; stale dated overrides | Normalize or archive after canonical directions updated |
| coordination/AGENT-POLLING-INSTRUCTIONS.md | instructions | Redundant with direction guardrails; stale | Normalize or archive after canonical directions updated |
