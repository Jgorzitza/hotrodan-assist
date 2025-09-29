# Release Notes - v1.0.0

**Release Date:** 2025-09-29

## What's New

### 🚀 Features
- - feat(service-registry): implement health/version registry, CLI, test; docs; mark focus item complete
- - feat(service-registry): add async health/version poller, CLI, focused test, docs
- - feat(service-registry): add async health/version poller, CLI, docs
- - feat(sales): channel/campaign metrics API + tests + docs
- - feat: refresh inbox and inventory mocks
- - feat: publish dashboard scaffold baseline

### 🐛 Bug Fixes
- - fix(ci): add missing llama-index-embeddings-fastembed dependency
- - fix: convert accidental submodule dashboard/dashboard to regular directory

### 📚 Documentation
- - docs(manager): canonicalize instruction files, remove duplicates, update prompt path [MANAGER_OVERRIDE]

### 🎨 Styling


### 🔧 Refactoring


### ⚡ Performance


### 🧪 Tests
- - test(sales): inline validation for channel/campaign metrics (logged)

### 🔨 Build & CI


### 🛠️ Maintenance
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
