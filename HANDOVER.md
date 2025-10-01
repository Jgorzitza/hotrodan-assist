# Handover Index

This repository uses generated handover docs per agent under `handover/` and instructions under `agent/<agent>/INSTRUCTIONS.md`.

- Authoritative registry: `coordination/registry/agents.yaml`
- Generated outputs: `handover/*.md`, `agent/*/INSTRUCTIONS.md`, `docs/agents.md`
- Generation script (Manager-owned): `scripts/generate_manager_artifacts.py`

Process
- Propose changes via `coordination/inbox/<agent>/<date>-notes.md` or `feedback/<agent>.md`.
- The Manager agent reviews and regenerates the managed artifacts. Do not edit generated files directly.

Useful references
- Program Manager prompt: `prompts/tooling/program-manager.md`
- Team prompts: `prompts/dashboard/*`, `prompts/tooling/*`
- Status Dashboard: `coordination/status-dashboard.md`