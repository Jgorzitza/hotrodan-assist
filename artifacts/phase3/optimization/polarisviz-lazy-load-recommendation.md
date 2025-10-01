# PolarisVizProvider Lazy Load Optimization — 2025-10-01 08:10 UTC

## Problem Statement

**Current state**: PolarisVizProvider (226 kB, largest bundle chunk) is imported statically in 5 route files, loading visualization libraries even when charts are not immediately visible or needed.

**Impact**:
- 226.25 kB bundle (86.56 kB gzipped)
- Parsed/executed on every page load for these routes
- Delays time-to-interactive for non-chart interactions

## Affected Routes

1. `app.inventory.tsx` — lines 36 (import), 571 (wrapper)
2. `app.seo.tsx` — lines 31 (import), 1054, 1698 (usage)
3. `app.sales.tsx` — lines 29 (import), 1367, 1756 (usage)
4. `app._index.tsx` — lines 28 (import), 216, 484 (usage)

## Recommendation

**Priority**: MEDIUM-HIGH
**Effort**: LOW-MEDIUM (2-4 hours per route)
**Impact**: 226 kB bundle reduction (10% of total 2.4M build)

**Suggested approach**: Dynamic import with lazy() + Suspense for immediate wins.

### Expected Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial bundle | 2.4M | ~2.2M | -8-10% |
| Largest chunk | 226 kB | context (151 kB) | New baseline |
| Time-to-interactive | Baseline | -200-500ms | Faster TTI |

