# API Endpoint Inventory — 2025-10-01 08:21 UTC

## Dashboard API Routes

### Webhooks (6 routes)
1. `webhooks.app.scopes_update.tsx` — Shopify app scopes changed
2. `webhooks.app.uninstalled.tsx` — Shopify app uninstalled
3. `webhooks.fulfillments.update.tsx` — Fulfillment status updates
4. `webhooks.orders.create.tsx` — New order created
5. `webhooks.orders.fulfilled.tsx` — Order fulfilled
6. `webhooks.products.update.tsx` — Product data updated

### Cron Jobs (1 route)
1. `cron.retention.ts` — Data retention/cleanup job

### API Subdirectory
1. `api/seo/health.ts` — SEO service health check

### Additional API Routes
- `queue.webhooks.tsx` — Webhook queue management UI

**Total API/webhook routes**: 9

## Authentication & Security

### Webhook Routes
Expected pattern (from codebase review):
```typescript
// Shopify webhook signature verification
// HMAC validation required
// Queue-based processing (async)
```

### Cron Route
Expected pattern:
```typescript
// Bearer token authentication
// Protected endpoint (authorization header required)
```

### Health Check
```typescript
// Public endpoint (no auth)
// Returns service status
```

## Observations

✅ **Good separation**: Webhooks, cron, API organized clearly
✅ **Async processing**: Queue-based webhook handling (prevents blocking)
✅ **Health monitoring**: SEO health endpoint available

⚠️ **Documentation gap**: No OpenAPI/Swagger spec found
⚠️ **Rate limiting**: No explicit rate limiting detected (may be in middleware)
⚠️ **Request validation**: No explicit Zod/Joi schemas detected (manual validation)

## Recommendations

### IMMEDIATE
1. ⏳ Add OpenAPI spec for API routes (documentation)
2. ⏳ Implement rate limiting middleware (if not present)
3. ⏳ Add request validation schemas (Zod/Joi)

### FUTURE
1. ⏳ API versioning strategy (v1, v2 prefixes)
2. ⏳ Centralized error handling (consistent error responses)
3. ⏳ Request/response logging (audit trail)

## Verdict

✅ **API structure is functional**
- Clear organization (webhooks, cron, api)
- Async webhook processing
- Health check endpoint

⚠️ **Documentation and hardening needed**
- Add OpenAPI spec
- Implement rate limiting
- Add request validation schemas

