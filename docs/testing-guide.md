# Testing Guide

**Generated**: 2025-10-01  
**Status**: Production-ready test suites

## Overview

This document provides comprehensive testing procedures for the llama_rag project, covering all services and quality gates required before deployment.

## Quick Start

```bash
# Run all dashboard tests
cd apps/dashboard
npm run test

# Run dashboard lint
npm run lint

# Run Python service tests
cd services/<service-name>
pytest

# Run quality sweep (all services)
bash scripts/quality-sweep.sh
```

## Test Suites by Service

### Dashboard (Next.js/TypeScript)

**Location**: `apps/dashboard/`

#### Unit Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm run test app/routes/app._index.test.tsx

# Watch mode (development)
npm run test -- --watch
```

**Current Status** (as of 2025-10-01):
- ✅ 12 tests passing in server-only subset
- ⚠️ 4 test files with minor configuration issues (Remix modules)
- Files tested:
  - `app/routes/app._index.test.tsx`
  - `app/routes/app.sales.test.tsx`
  - `app/routes/webhooks.test.tsx`
  - `app/lib/analytics/ga4Client.test.ts`
- Live-mode smoke commands:
  - `ENABLE_MCP=true MCP_FORCE_MOCKS=false USE_MOCK_DATA=false npx vitest run --root dashboard --config dashboard/vitest.config.ts app/routes/__tests__/app.sales.test.ts`
  - `ENABLE_MCP=true MCP_FORCE_MOCKS=false USE_MOCK_DATA=false npx vitest run --root dashboard --config dashboard/vitest.config.ts app/lib/sales/__tests__/analytics.server.test.ts app/lib/sales/__tests__/cache.server.test.ts`

#### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Check specific directory
npm run lint -- app/routes/
```

**Known Issues** (P1 to fix):
- Unused variables in `app/routes/app._index.tsx`
- Unused symbols in `app/routes/app.sales.tsx`
- Warnings: react-hooks/exhaustive-deps in several components

#### Type Checking

```bash
# Run TypeScript compiler
npm run type-check

# Or use tsc directly
npx tsc --noEmit
```

### Python Services

**Locations**: `services/assistants/`, `services/analytics/`, `services/sync/`, etc.

#### Unit Tests (pytest)

```bash
# Run all tests in a service
cd services/<service-name>
pytest

# Run with coverage
pytest --cov=. --cov-report=term-missing

# Run specific test file
pytest tests/test_main.py

# Run with verbose output
pytest -v

# Run specific test by name
pytest -k "test_health_check"
```

#### Code Quality (Black, isort, mypy)

```bash
# Format code with Black
black .

# Sort imports
isort .

# Type check with mypy
mypy .

# Run all quality checks
black --check . && isort --check . && mypy .
```

### RAG System

**Location**: `services/rag/`

#### Validation Tests

```bash
# Run golden queries validation
python scripts/run_goldens.py

# Check retrieval quality
python scripts/validate_retrieval.py

# Re-index documents
python scripts/ingest.py
```

**Golden Queries** (located in `data/golden_queries.json`):
- Minimum passing score: 0.8
- Current suite: 10 representative queries
- Tests semantic search, chunking, and ranking

### Integration Tests

**Location**: `tests/integration/`

```bash
# Run all integration tests
pytest tests/integration/

# Test specific integration
pytest tests/integration/test_mcp_integration.py

# With Docker Compose dependencies
docker compose up -d postgres redis
pytest tests/integration/
docker compose down
```

## Quality Gates

### Pre-Commit (Local Development)

Before committing code:

1. ✅ Run relevant unit tests
2. ✅ Run linter and fix issues
3. ✅ Check TypeScript types (if applicable)
4. ✅ Format code (Black for Python, Prettier for JS/TS)

### Pre-Push (Feature Branch)

Before pushing to remote:

1. ✅ Run full test suite for modified services
2. ✅ Ensure no lint errors (warnings OK with justification)
3. ✅ Run integration tests if APIs changed
4. ✅ Update documentation for new features

### Pre-Merge (Pull Request)

Before merging to main:

1. ✅ All CI checks passing
2. ✅ Code review approved
3. ✅ Integration tests passing
4. ✅ No regressions in other services
5. ✅ Performance benchmarks acceptable

### Pre-Deploy (Production)

Before deploying to production:

1. ✅ Full test suite passing (all services)
2. ✅ Integration tests passing with staging data
3. ✅ Load tests completed (if relevant)
4. ✅ Security scan passed
5. ✅ Monitoring/alerting configured
6. ✅ Rollback plan documented

## Test Commands Reference

### Dashboard Quick Commands

```bash
# Quality sweep (lint + test)
npm run lint && npm run test

# Type-safe build
npm run build

# Development server
npm run dev
```

### Python Services Quick Commands

```bash
# Full quality check
black --check . && isort --check . && mypy . && pytest

# With coverage report
pytest --cov=. --cov-report=html
open htmlcov/index.html

# Fast tests only (skip slow integration)
pytest -m "not slow"
```

### Docker-Based Tests

```bash
# Build and test in container
docker compose build dashboard
docker compose run dashboard npm test

# Run full stack integration
docker compose up -d
docker compose run integration-tests
docker compose down
```

## Continuous Integration (CI)

### GitHub Actions Workflow

**Location**: `.github/workflows/test.yml`

**Triggers**:
- Push to `main` or `develop`
- Pull request opened/updated
- Manual workflow dispatch

**Jobs**:
1. **Dashboard Tests**
   - Node.js 20.x
   - Install dependencies
   - Run linter
   - Run unit tests
   - Upload coverage

2. **Python Tests**
   - Python 3.11
   - Install dependencies
   - Run pytest with coverage
   - Run type checks

3. **Integration Tests**
   - Spin up Docker Compose
   - Run cross-service tests
   - Validate MCP connectors

4. **Build Validation**
   - Build Docker images
   - Check for vulnerabilities
   - Validate Dockerfiles

## Coverage Standards

### Target Coverage Levels

| Service | Unit Test | Integration | Current |
|---------|-----------|-------------|---------|
| Dashboard | ≥ 80% | ≥ 60% | ~35%* |
| Analytics | ≥ 80% | ≥ 60% | TBD |
| Assistants | ≥ 80% | ≥ 60% | TBD |
| RAG | ≥ 80% | ≥ 70% | TBD |
| Sync | ≥ 75% | ≥ 50% | TBD |

*Dashboard coverage estimate based on server-only subset passing; needs full measurement.

### Measuring Coverage

```bash
# Dashboard
cd apps/dashboard
npm run test -- --coverage
open coverage/index.html

# Python services
cd services/<service>
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## Test Data Management

### Mock Data

**Location**: `apps/dashboard/app/mocks/`

**Usage**:
```typescript
import { mockShopifyData } from '~/mocks/shopify';

// In tests
const mockResponse = mockShopifyData.products[0];
```

**Control via environment**:
```bash
MCP_FORCE_MOCKS=true  # Force dashboard loaders to use fixture data
MCP_FORCE_MOCKS=false # Allow live MCP-backed flows when credentials are present
```

### Test Fixtures

**Dashboard**: `apps/dashboard/test/fixtures/`
**Python**: `services/*/tests/fixtures/`

**Usage**:
```python
@pytest.fixture
def sample_query():
    return {
        "query": "How do I create a product?",
        "context": ["admin-api", "products"]
    }
```

### Golden Data (RAG)

**Location**: `data/golden_queries.json`

**Format**:
```json
{
  "queries": [
    {
      "id": "q1",
      "query": "How to create a Shopify app?",
      "expected_topics": ["app-setup", "api-credentials"],
      "min_relevance": 0.8
    }
  ]
}
```

## Debugging Failed Tests

### Common Issues

#### 1. Remix Module Resolution Errors

**Symptom**: `Cannot find module '@remix-run/react'` in tests

**Solution**:
```typescript
// Mock Remix in test setup
vi.mock('@remix-run/react', () => ({
  useLoaderData: vi.fn(),
  Link: ({ children }: any) => children,
}));
```

#### 2. Environment Variables Missing

**Symptom**: Tests fail with "Missing required environment variable"

**Solution**:
```bash
# Create test environment file
cp .env.example .env.test

# Load in tests
dotenv -e .env.test -- npm test
```

#### 3. Database Connection Errors

**Symptom**: `ECONNREFUSED` connecting to PostgreSQL

**Solution**:
```bash
# Start local database
docker compose up -d postgres

# Or use SQLite for tests
export DATABASE_URL=file:./test.db
```

#### 4. Timeout Errors

**Symptom**: `Test timeout of 5000ms exceeded`

**Solution**:
```typescript
// Increase timeout for slow tests
it('slow integration test', { timeout: 30000 }, async () => {
  // ...
});
```

## Performance Testing

### Load Testing (Future)

**Tools**: k6, Artillery, or Locust

**Targets**:
- Dashboard: 100 req/s sustained
- MCP API: 500 req/s peak
- Analytics: 50 req/s with 2s P95 latency

**Location**: `tests/performance/`

### Benchmarking (Current)

```bash
# RAG retrieval speed
python scripts/benchmark_retrieval.py

# GraphQL query performance
npm run benchmark:graphql
```

## Accessibility Testing

### Dashboard A11y

**Tools**: 
- `@axe-core/react` (automated)
- Manual screen reader testing
- Keyboard navigation checks

**Standards**: WCAG 2.1 Level AA

```bash
# Run a11y tests (future)
npm run test:a11y
```

## Security Testing

### Static Analysis

```bash
# JavaScript/TypeScript
npm audit
npm run lint:security

# Python
pip-audit
bandit -r services/
```

### Dependency Scanning

```bash
# Check for known vulnerabilities
npm audit fix
pip-audit --fix
```

### Secret Scanning

```bash
# Pre-commit hook (recommended)
# Prevents committing secrets
git-secrets --scan
```

## Test Maintenance

### Updating Tests

When modifying code:
1. Update relevant unit tests
2. Add tests for new functionality
3. Update integration tests if APIs changed
4. Run full suite before committing

### Removing Deprecated Tests

1. Mark test as deprecated with comment
2. Update related documentation
3. Remove after one sprint (if no objections)

### Test Review Checklist

- [ ] Tests are isolated (no external dependencies)
- [ ] Tests are deterministic (same result every time)
- [ ] Tests are fast (< 5s for unit, < 30s for integration)
- [ ] Tests have clear assertions
- [ ] Tests cover edge cases and errors
- [ ] Tests are documented with comments

## Troubleshooting

### Dashboard Tests Won't Run

**Check**:
1. Node modules installed: `npm install`
2. `.env.local` exists with valid values
3. TypeScript compiles: `npm run type-check`

### Python Tests Fail with Import Errors

**Check**:
1. Virtual environment activated
2. Dependencies installed: `pip install -r requirements.txt`
3. `PYTHONPATH` includes service directory

### Integration Tests Timeout

**Check**:
1. Docker services running: `docker compose ps`
2. Network connectivity
3. Firewall/security settings
4. Increase timeout in test config

## Additional Resources

- **Test Suite Status**: `quality-reports/test-suite-status.md`
- **Coverage Reports**: `coverage/` (generated locally)
- **CI Logs**: GitHub Actions workflows
- **Quality Metrics**: Tracked in `coordination/status-dashboard.md`

## Change Log

- **2025-10-01**: Initial testing guide
  - Documented dashboard test suite (12 passing server tests)
  - Added Python service testing procedures
  - Included quality gates and CI workflow overview
  - Added troubleshooting and debugging sections
