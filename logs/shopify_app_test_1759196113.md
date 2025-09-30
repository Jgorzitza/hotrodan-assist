
# Shopify Admin App Test Report
Generated: 2025-09-29 19:35:13

## Summary
- **Tests Passed**: 5/7
- **Success Rate**: 71.4%

## Detailed Results

### Node.js Dependencies
- **Status**: ✅ PASS
- **Details**: Dependencies installed successfully

### Shopify CLI Config
- **Status**: ❌ FAIL
- **Details**: Missing env vars: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL

### App Build
- **Status**: ✅ PASS
- **Details**: Build completed successfully

### Tunnel Health
- **Status**: ❌ FAIL
- **Details**: Tunnel not accessible: HTTPSConnectionPool(host='mock-tunnel-url.ngrok.io%20%20', port=443): Max retries exceeded with url: / (Caused by NameResolutionError("<urllib3.connection.HTTPSConnection object at 0x7c1b453fa750>: Failed to resolve 'mock-tunnel-url.ngrok.io%20%20' ([Errno -2] Name or service not known)"))

### Inventory API
- **Status**: ✅ PASS
- **Details**: Inventory service is healthy

### Dashboard Cards
- **Status**: ✅ PASS
- **Details**: Dashboard builds successfully (mock data mode)

### Webhook Registration
- **Status**: ✅ PASS
- **Details**: Webhook files found: ['queue.webhooks-l0sNRNKZ.js', 'webhooks.fulfillments.update-l0sNRNKZ.js', 'webhooks.app.uninstalled-l0sNRNKZ.js', 'webhooks.orders.create-l0sNRNKZ.js', 'webhooks.app.scopes_update-l0sNRNKZ.js', 'webhooks.orders.fulfilled-l0sNRNKZ.js', 'webhooks.products.update-l0sNRNKZ.js', '20250326150000_add_webhook_registry', 'webhooks.worker.ts', 'webhooks', 'webhooks.products.update.tsx', 'webhooks.app.scopes_update.tsx', 'webhooks.orders.fulfilled.tsx', 'webhooks.orders.create.tsx', 'queue.webhooks.tsx', 'webhooks.fulfillments.update.tsx', 'webhooks.app.uninstalled.tsx', 'webhooks', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhooks', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhooks', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhooks', 'webhooks', 'authenticate.webhooks.doc.d.ts', 'authenticate.webhooks.doc.d.ts.map', 'webhooks', 'webhooks.app.uninstalled-l0sNRNKZ.js', 'webhooks.app.scopes_update-l0sNRNKZ.js', 'webhooks.app.scopes_update.tsx', 'webhooks.app.uninstalled.tsx', 'webhooks', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhooks', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhooks', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhooks', 'webhooks', 'authenticate.webhooks.doc.d.ts', 'authenticate.webhooks.doc.d.ts.map', 'webhooks']
