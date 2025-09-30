# Hot Rod AN — Working Handover (Updated)

## Current Focus
- Dashboard prompt specs live in `prompts/dashboard/route-dashboard.md` and `prompts/dashboard/route-sales.md`.
- Renderers + API endpoints live in `app/dashboard/` and `/assistants/dashboard/{home|sales}`.
- Docker compose now includes a `dashboard` service (port 8003) sharing renderer logic with assistants.

## What Changed Recently
- Added Markdown specs for dashboard routes (home + sales) with structured payload expectations and escalation heuristics.
- Implemented shared renderer helpers that output Markdown + escalation signals, exposed via FastAPI and reused by assistants.
- Updated documentation, tests, and provided `scripts/render_dashboard_samples.py` for quick markdown previews.

## Tests
```bash
python run_goldens.py
python3 -m unittest tests/test_dashboard_prompts.py tests/test_assistants_dashboard.py
```

## Next Ideas
- Wire real telemetry from approval app / Shopify sync into the dashboard payloads.
- Add snapshot tests or markdown baselines once payload schemas settle.
- Consider pushing renderer output into a corrections/goldens workflow to guard regression in tone/structure.

See **HANDOVER_ALL_IN_ONE.md** for the full long-form spec and roadmap.
