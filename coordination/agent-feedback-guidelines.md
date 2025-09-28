# Agent Feedback Workflow

To keep master direction centralized in the dashboard prompts, individual agents should propose scope or focus adjustments in their own feedback note instead of overwriting the prompt directly.

## How to use this workflow
1. Create (or update) a note under `coordination/<agent>-feedback.md` summarizing the change you’d like the Program Manager to consider.
2. Include:
   - A short description of the suggested change.
   - The prompt section it affects.
   - Any dependencies (tests, contracts, upstream blockers).
3. Notify the Program Manager (tag in your session summary or add a bullet to `AGENT_COMMANDS.md` if urgent).
4. The Program Manager will review, incorporate approved updates into the master prompt, and reply in the feedback note if clarification is needed.

## Example
```
coordination/webhooks-feedback.md
- Request: Re-enable BullMQ worker replay before MVP to validate retry strategy.
- Prompt section: prompts/dashboard/webhooks.md — Immediate focus.
- Dependencies: Requires Upstash credentials + analytics service stub.
- Rationale: Need confidence in retry behaviour before launch window.
```

## Current feedback notes
- `coordination/rag-feedback.md`
- `coordination/assistants-feedback.md`
- `coordination/data-layer-feedback.md`
- `coordination/webhooks-feedback.md`
- `coordination/orders-feedback.md`
- `coordination/route-inbox-feedback.md`
- `coordination/route-dashboard-feedback.md`
- `coordination/route-sales-feedback.md`
- `coordination/route-settings-feedback.md`
- `coordination/route-inventory-feedback.md`
- `coordination/route-seo-feedback.md`
- `coordination/database-feedback.md`
- `coordination/mcp-feedback.md`
- `coordination/tooling-feedback.md`

Do not edit the master prompt’s “Immediate Focus” section unless you have explicit approval in the feedback note.
