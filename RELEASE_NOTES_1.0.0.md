# Release Notes - v1.0.0

**Release Date:** 2025-09-29

## What's New

### 🚀 Features
- - feat(tooling): add production optimization and monitoring tools
- - feat(sales): complete advanced analytics platform — APIs, tests, docs across 10 deliverables
- - feat(mcp): complete all backlog items - idempotency, OAuth rotation, resilience, observability, contract tests, replay, canary deploy; comprehensive tests and docs
- - feat(reliability): add async retry with backoff and JSONL DLQ; tests; docs
- - feat(contracts): add typed contracts registry with JSON Schema export; tests; docs; check off focus item
- - feat(service-registry): implement health/version registry, CLI, test; docs; mark focus item complete
- - feat(service-registry): add async health/version poller, CLI, focused test, docs
- - feat(service-registry): add async health/version poller, CLI, docs
- - feat(sales): channel/campaign metrics API + tests + docs
- - feat: refresh inbox and inventory mocks
- - feat: publish dashboard scaffold baseline

### 🐛 Bug Fixes
- - fix(reliability): add missing retry_dlq.py module
- - fix(ci): add missing llama-index-embeddings-fastembed dependency
- - fix: convert accidental submodule dashboard/dashboard to regular directory

### 📚 Documentation
- - docs(manager): canonicalize instruction files, remove duplicates, update prompt path [MANAGER_OVERRIDE]

### 🎨 Styling


### 🔧 Refactoring


### ⚡ Performance


### 🧪 Tests
- - test(reliability): add missing test file; mark retry/DLQ complete
- - test(sales): inline validation for channel/campaign metrics (logged)

### 🔨 Build & CI


### 🛠️ Maintenance
- - chore(manager): update manager feedback with MCP completion summary
- - chore(sales): add package initializers for imports
- - chore(mcp): initialize MCP backlog todos in notes and start service registry task
- - chore(quality): finalize manager updates and attach latest audit report before restart
- - chore(quality): stabilize audits (Black/Ruff fixes, syntax repair, build script); refine secret detection; no functional changes
- - chore(repo): archive legacy direction files under archive/legacy
- - chore(project): add manager-driven multi-agent plan + RPG + directions
- - chore(repo): tighten .gitignore; stop tracking local caches
- - chore(repo): stop tracking local virtualenvs
- - chore(project): add manager-driven multi-agent plan + RPG + directions
- - chore: add coordination suite and update agent docs
- - chore: refresh sitemap ingest 2025-09-27 pm
- - chore: refresh sitemap ingest 2025-09-27
- - chore: snapshot state for review
- - chore: capture agent orchestration updates

## Breaking Changes
<!-- List any breaking changes here -->

## Migration Guide
<!-- Add migration instructions if needed -->

## Contributors
<!-- List contributors for this release -->

## Full Changelog
```
647f6b9e inventory: production deployment infrastructure (Docker, API, tests, monitoring)
1c158563 dashboard: add theme system and ThemeToggle component with WCAG AA color tokens
eb5a0de1 fix(reliability): add missing retry_dlq.py module
d3fba141 dashboard: add theme system integration to main dashboard
486fac90 feat(tooling): add production optimization and monitoring tools
fe4d0952 dashboard: add permission system and PermissionManager component
bc715cf9 dashboard: add permission system integration to main dashboard
b916e229 dashboard: add export utilities and ExportManager component
c126f442 dashboard: add export functionality integration to main dashboard
afa278f3 dashboard: add layout presets and save-view feature with management UI
04dd344a feat(sales): complete advanced analytics platform — APIs, tests, docs across 10 deliverables
d7e3c1dc dashboard: add cohort analysis components and calculation logic
33baaa39 Quality Engineer: Final manager update and feedback completion
e5e387cf dashboard: add cohort analysis integration to main dashboard
f639721e chore(manager): update manager feedback with MCP completion summary
d722bb23 Quality Engineer: Complete comprehensive quality framework implementation
777dc4d6 inventory: mark lead time variability complete - ALL BACKLOG ITEMS DONE
b84804b6 inventory: replenishment lead time variability model (impl+tests+docs)
680fa87c dashboard: add EnhancedMetricCard component with sparklines
482838e3 dashboard: add enhanced metric card components and calculation logic
e66465f2 inventory: mark audit ledger complete
f2d54f01 inventory: audit ledger for adjustments (impl+tests+docs)
acd9a1e0 dashboard: add enhanced metric cards with sparklines for revenue, AOV, conversion, CAC, LTV
0daaca04 inventory: mark BOM/kitting complete
a9480085 inventory: BOM/kitting support in availability calcs (impl+tests+docs)
20bac80b inventory: mark cycle counts complete
39aa073d inventory: cycle counts workflow integration (impl+tests+docs)
15bd807d dashboard: add cross-widget drill-down navigation with context system
07afa5e2 inventory: mark webhooks complete
e3697718 inventory: webhooks for low-stock alerts (impl+tests+docs)
59dbba7d inventory: mark backorder policy complete
11f219a8 inventory: backorder policy rules + ETA surfacing (impl+tests+docs)
2fe14ae0 inventory: mark purchase orders complete
fc314c52 inventory: purchase order recommendations generator (impl+tests+docs)
efa9f103 feat(mcp): complete all backlog items - idempotency, OAuth rotation, resilience, observability, contract tests, replay, canary deploy; comprehensive tests and docs
6d7b87e0 inventory: mark demand forecasting complete
39e457be inventory: demand forecasting with seasonality (impl+tests+docs)
6ef66d3f inventory: mark safety stock complete
60e7190a inventory: safety stock rules per SKU/location (impl+tests+docs)
941b6262 test(reliability): add missing test file; mark retry/DLQ complete
126c681a dashboard: compare range param + UI (Polaris Select); tests for resolver
5ed8e614 feat(reliability): add async retry with backoff and JSONL DLQ; tests; docs
04b6a7a2 inventory: multi-location stock sync (impl+tests+docs)
44d1a50f feat(contracts): add typed contracts registry with JSON Schema export; tests; docs; check off focus item
82579ece feat(service-registry): implement health/version registry, CLI, test; docs; mark focus item complete
9a680f9c feat(service-registry): add async health/version poller, CLI, focused test, docs
27c9ea08 chore(sales): add package initializers for imports
648f9870 feat(service-registry): add async health/version poller, CLI, docs
f7422b5d test(sales): inline validation for channel/campaign metrics (logged)
6e26f275 feat(sales): channel/campaign metrics API + tests + docs
66c0a6c4 chore(mcp): initialize MCP backlog todos in notes and start service registry task
ed358894 chore(quality): finalize manager updates and attach latest audit report before restart
f7eb3417 chore(quality): stabilize audits (Black/Ruff fixes, syntax repair, build script); refine secret detection; no functional changes
f133d45f Add Code Quality & Performance Engineer agent
05897fc0 Complete Bing Webmaster Tools authentication setup
d557f51c Tooling Agent: Comprehensive code cleanup and optimization
4dfc17fd fix(ci): add missing llama-index-embeddings-fastembed dependency
4a4f8ef8 Pre-agent startup: All changes committed, coordination files ready, auto-acceptance configured
fcee4acc merge: adopt canonical repo layout
bc1247d4 chore(repo): archive legacy direction files under archive/legacy
9fbd2120 chore(project): add manager-driven multi-agent plan + RPG + directions
cf7a260f chore(repo): tighten .gitignore; stop tracking local caches
f872add8 merge(main<-canonical): resolve inventory prompt; add dashboard note
69e70f1d chore(repo): stop tracking local virtualenvs
1a68c801 chore(project): add manager-driven multi-agent plan + RPG + directions
684b86ae docs(manager): canonicalize instruction files, remove duplicates, update prompt path [MANAGER_OVERRIDE]
251b3b69 chore: add coordination suite and update agent docs
75d08c49 Sync current working tree
487af4da chore: refresh sitemap ingest 2025-09-27 pm
fb3b5f5a chore: refresh sitemap ingest 2025-09-27
76d805e2 Merge pull request #2 from Jgorzitza/feature/route-inventory
f87671b0 Update agent docs for remote handoff
a9262f44 chore: snapshot state for review
6544828f chore: capture agent orchestration updates
611b4911 Expand inventory dashboard mocks and route
4c882c9f Document dashboard testing flows and add action harness
4723b640 feat: refresh inbox and inventory mocks
68101eec Add dashboard testing harness and webhook utilities
f0462969 feat: publish dashboard scaffold baseline
0992a374 Add route inventory planning brief
a71f1642 fix: convert accidental submodule dashboard/dashboard to regular directory
04a45082 Link to all-in-one handover
0ea6dbea Link to all-in-one handover
6b27fdc6 Link to all-in-one handover
d40fe43d Add all-in-one handover (Markdown)
928fcec4 Add CI: offline golden tests
a3e1bc3e Add Dockerfiles and per-service requirements
fe9d50ca Add .gitignore and untrack vector/index caches
401e101b git push -u origin mainInitial handover bundle
2d4541e2 Initial commit
```
