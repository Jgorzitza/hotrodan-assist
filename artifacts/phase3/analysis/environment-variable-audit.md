# Environment Variable Audit — 2025-10-01 08:20 UTC

## Root .env.example Analysis

**File**: `/home/justin/llama_rag/.env.example`  
**Variables defined**: 20

### Required Variables

#### OpenAI
- OPENAI_API_KEY (empty)

#### Shopify
- SHOPIFY_SHOP (empty)
- SHOPIFY_ACCESS_TOKEN (empty)
- SHOPIFY_API_VERSION=2024-10 ✅ (has default)
- SHOPIFY_WEBHOOK_SECRET (empty)
- SHOPIFY_BOT_SIGNATURE_INPUT (empty)
- SHOPIFY_BOT_SIGNATURE (empty)
- SHOPIFY_BOT_SIGNATURE_AGENT=https://shopify.com ✅ (has default)

#### Zoho (CRM integration)
- ZOHO_CLIENT_ID (empty)
- ZOHO_CLIENT_SECRET (empty)
- ZOHO_REFRESH_TOKEN (empty)
- ZOHO_ORG_ID (empty)
- ZOHO_ACCOUNT_ID (empty)
- ZOHO_DEFAULT_FROM (empty)

#### Database & Storage
- POSTGRES_URL=postgresql+psycopg2://postgres:postgres@db:5432/app ✅ (has default)
- REDIS_URL=redis://redis:6379/0 ✅ (has default)
- CHROMA_PATH=/data/chroma ✅ (has default)
- PERSIST_DIR=/data/storage ✅ (has default)

#### RAG Configuration
- INDEX_ID=hotrodan ✅ (has default)
- COLLECTION=hotrodan_docs ✅ (has default)

### Validation Summary

**Variables with defaults**: 8 (40%)
**Variables requiring manual setup**: 12 (60%)

### Missing Variables

**From earlier security scan** (found in code but not in .env.example):
- DATABASE_URL (dashboard Prisma)
- DIRECT_URL (dashboard Prisma)
- SHADOW_DATABASE_URL (dashboard Prisma)
- SHOPIFY_API_KEY (dashboard)
- SHOPIFY_API_SECRET (dashboard)
- SCOPES (dashboard)
- SHOPIFY_APP_URL (dashboard)
- SHOP_CUSTOM_DOMAIN (dashboard, optional)

**Total variables needed**: ~28-30

### Recommendations

#### IMMEDIATE
1. ⚠️ **Reconcile .env.example files** (root vs dashboard/apps)
2. ⚠️ **Document all required variables** in single source of truth
3. ⚠️ **Add validation script** to check for missing variables on startup

#### Documentation Needed
- Which variables are required vs optional?
- Which have safe defaults for development?
- Which must be provisioned for production?

## Verdict

⚠️ **Environment variable documentation is incomplete**
- Multiple .env.example files (root, apps/dashboard, dashboard)
- Variables discovered in code not documented in .env.example
- No validation script to catch missing variables

**Action**: Document comprehensive environment variable requirements.

