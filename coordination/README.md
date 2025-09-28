# Coordination Hub

This directory tracks cross-agent status, memos, and feedback for the llama_rag program. Use these artifacts to keep prompts aligned and ensure every agent continues without waiting on user input.

## Key Areas
- `inbox/` – per-agent append-only notes. Template lives in `coordination/note-template.md`.
- `*-feedback.md` – scope proposals awaiting Program Manager review.
- `dependency-matrix.md` – shared contract map; update whenever schemas or APIs shift.
- `status-dashboard.md` – snapshot of each agent’s current state and next check-in.
- `blockers-log.md` – escalating issues with owners and resolution tracking.
- `reporting-playbook.md` – cadence for sweeps, summaries, and escalations.
- `registry/` – generated metadata wiring agents to instructions and handover docs (read-only).

## Conventions
- Copy the note template before starting a sweep: `coordination/inbox/<agent>/<YYYY-MM-DD>-notes.md`.
- Append instead of editing historical entries; close the loop in follow-up notes.
- Capture cross-team contract changes in both the dependency matrix and a coordination memo.
- Treat files listed in `coordination/registry/instruction-map.json` as generated; do not modify directly.
