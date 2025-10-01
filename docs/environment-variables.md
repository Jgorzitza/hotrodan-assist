# Environment Variables Documentation

**Generated**: 2025-10-01  
**Status**: Consolidated from multiple sources

## Overview

This document provides comprehensive documentation for all environment variables used across the llama_rag project. Variables are organized by service and priority.

## Quick Start

1. Copy `.env.example.consolidated` to `.env`
2. Fill in required variables (marked with ⚠️ below)
3. Optional: Customize service URLs if running non-default ports
4. Optional: Enable features via toggle variables

## Variable Categories

### 🔴 REQUIRED (Production)

These must be set for production deployment:

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_API_KEY` | Shopify app API key | `abc123...` |
| `SHOPIFY_API_SECRET` | Shopify app secret | `def456...` |
| `SHOPIFY_APP_URL` | Public URL for app | `https://app.example.com` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

### 🟡 IMPORTANT (Recommended)

Strongly recommended for production:

| Variable | Description | Default |
|----------|-------------|---------|
| `SHOPIFY_WEBHOOK_SECRET` | Webhook signature verification | (none) |
| `CRON_SECRET` | Cron endpoint authentication | (none) |
| `SECRETS_ADAPTER` | How to store sensitive data | `prisma` |
| `USE_MOCK_DATA` | Enable mock data mode | `false` |

### 🟢 OPTIONAL (Feature-Specific)

Only needed if using specific features:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `ENABLE_MCP` | Enable MCP integration | MCP features |
| `MCP_API_URL` | MCP service endpoint | MCP features |
| `ZOHO_CLIENT_ID` | Zoho CRM client ID | CRM integration |
| `ANALYTICS_SERVICE_URL` | Analytics service | SEO/Analytics features |
| `ASSISTANTS_SERVICE_URL` | AI assistants service | Chat features |

## Variable Groups

### Shopify Configuration

```bash
# Core credentials
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_APP_URL=https://your-app.example.com
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# API configuration
SHOPIFY_API_VERSION=2024-10
SCOPES=read_products,read_orders,read_customers,write_products,write_orders

# Shop identifiers
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...

# Optional: Custom domain
SHOP_CUSTOM_DOMAIN=shop.example.com

# Performance tuning
SHOPIFY_GRAPHQL_MAX_ATTEMPTS=3
SHOPIFY_GRAPHQL_BACKOFF_MS=1000
SHOPIFY_MAX_CONCURRENT=5
```

### Database & Storage

```bash
# PostgreSQL (Dashboard)
DATABASE_URL=postgresql://postgres:password@localhost:5432/app
DIRECT_URL=postgresql://postgres:password@localhost:5432/app

# PostgreSQL (Python services)
POSTGRES_URL=postgresql+psycopg2://postgres:password@localhost:5432/app

# Redis
REDIS_URL=redis://localhost:6379/0
UPSTASH_REDIS_URL=  # Optional: Upstash Redis for serverless

# Vector DB
CHROMA_PATH=/data/chroma
PERSIST_DIR=/data/storage
INDEX_ID=hotrodan
COLLECTION=hotrodan_docs
```

### Feature Toggles

```bash
# Mock data (disable in production)
USE_MOCK_DATA=false

# MCP integration
ENABLE_MCP=true
MCP_FORCE_MOCKS=false  # For testing MCP UI without real API
```

### MCP Integration

```bash
MCP_API_URL=http://localhost:8003
MCP_API_KEY=your-mcp-key
MCP_TIMEOUT_MS=5000
MCP_MAX_RETRIES=3
```

### Analytics & SEO

```bash
ANALYTICS_SERVICE_URL=http://localhost:8003
ANALYTICS_REFRESH_URL=http://localhost:8003/refresh
ANALYTICS_REFRESH_TOKEN=your-token
ANALYTICS_REFRESH_TIMEOUT_MS=8000
```

### Microservices

```bash
ASSISTANTS_SERVICE_URL=http://localhost:8002
SYNC_SERVICE_URL=http://localhost:8004
```

### Webhook Queue

```bash
WEBHOOK_QUEUE_DRIVER=bullmq
WEBHOOK_QUEUE_NAME=shopify-webhooks
WEBHOOK_QUEUE_REDIS_URL=redis://localhost:6379/1
WEBHOOK_QUEUE_USE_BULLMQ=true
WEBHOOK_SYNC_TIMEOUT_MS=30000
```

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
USE_MOCK_DATA=true
ENABLE_MCP=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_dev
```

### Staging

```bash
NODE_ENV=production
USE_MOCK_DATA=false
ENABLE_MCP=true
DATABASE_URL=postgresql://user:pass@staging-db:5432/app
SHOPIFY_APP_URL=https://staging-app.example.com
```

### Production

```bash
NODE_ENV=production
USE_MOCK_DATA=false
ENABLE_MCP=true
DATABASE_URL=postgresql://user:pass@prod-db:5432/app
SHOPIFY_APP_URL=https://app.example.com
SECRETS_ADAPTER=prisma
```

## Security Best Practices

### 1. Secret Management

- ✅ **DO**: Use `SECRETS_ADAPTER=prisma` in production
- ✅ **DO**: Store encrypted secrets in database
- ✅ **DO**: Rotate `SHOPIFY_WEBHOOK_SECRET` regularly
- ❌ **DON'T**: Commit `.env` files with real secrets
- ❌ **DON'T**: Log environment variable values

### 2. Access Control

- ✅ **DO**: Use strong `CRON_SECRET` for cron endpoints
- ✅ **DO**: Restrict database access to app servers only
- ✅ **DO**: Use separate credentials per environment
- ❌ **DON'T**: Share production credentials in Slack/email
- ❌ **DON'T**: Use development credentials in production

### 3. Validation

Add startup validation to catch missing variables:

```typescript
const required = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'DATABASE_URL',
  'REDIS_URL'
];

required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});
```

## Troubleshooting

### Common Issues

**Problem**: App fails to start with "Missing required environment variable"

**Solution**: Check that all required variables are set in `.env` file

---

**Problem**: Webhooks fail signature verification

**Solution**: Ensure `SHOPIFY_WEBHOOK_SECRET` matches Shopify app configuration

---

**Problem**: Database connection fails

**Solution**: Verify `DATABASE_URL` format and network accessibility

---

**Problem**: MCP features don't work

**Solution**: Check `ENABLE_MCP=true` and `MCP_API_URL` is correct

## Migration Guide

### From Old .env.example Files

If you have existing `.env` files from root or `apps/dashboard`:

1. Backup existing `.env` files
2. Copy `.env.example.consolidated` to `.env`
3. Migrate values from old `.env` to new structure
4. Test application startup
5. Verify all features work correctly

### Variable Renames

No variables were renamed in consolidation. All original names preserved.

### Deprecated Variables

None currently. All variables in use are documented.

## References

- Consolidated file: `.env.example.consolidated`
- Original root: `.env.example`
- Original dashboard: `apps/dashboard/.env.example`
- Docker Compose: `docker-compose.yml` (references many of these)

## Change Log

- **2025-10-01**: Initial consolidated documentation
  - Merged root and dashboard .env.example files
  - Added 33 dashboard-specific variables
  - Added 20 root service variables
  - Organized by category with usage notes
