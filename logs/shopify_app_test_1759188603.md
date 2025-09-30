
# Shopify Admin App Test Report
Generated: 2025-09-29 17:30:03

## Summary
- **Tests Passed**: 3/7
- **Success Rate**: 42.9%

## Detailed Results

### Node.js Dependencies
- **Status**: ✅ PASS
- **Details**: Dependencies installed successfully

### Shopify CLI Config
- **Status**: ❌ FAIL
- **Details**: Missing env vars: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL

### App Build
- **Status**: ❌ FAIL
- **Details**: Build failed: 
> build
> remix vite:build

vite v6.3.6 building for production...
transforming...
✓ 2196 modules transformed.
rendering chunks...
computing gzip size...
build/client/.vite/manifest.json                               21.57 kB │ gzip:  2.41 kB
build/client/assets/route-TqOIn4DE.css                          0.76 kB │ gzip:  0.35 kB
build/client/assets/styles-BeiPL2RV.css                       444.11 kB │ gzip: 52.26 kB
build/client/assets/webhooks.fulfillments.update-l0sNRNKZ.js    0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.app.scopes_update-l0sNRNKZ.js      0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.orders.fulfilled-l0sNRNKZ.js       0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.app.uninstalled-l0sNRNKZ.js        0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.products.update-l0sNRNKZ.js        0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.orders.create-l0sNRNKZ.js          0.00 kB │ gzip:  0.02 kB
build/client/assets/cron.retention-l0sNRNKZ.js                  0.00 kB │ gzip:  0.02 kB
build/client/assets/queue.webhooks-l0sNRNKZ.js                  0.00 kB │ gzip:  0.02 kB
build/client/assets/auth._-l0sNRNKZ.js                          0.00 kB │ gzip:  0.02 kB
build/client/assets/app.inbox.telemetry-l0sNRNKZ.js             0.00 kB │ gzip:  0.02 kB
build/client/assets/app.inbox.stream-l0sNRNKZ.js                0.00 kB │ gzip:  0.02 kB
build/client/assets/TitleBar-DFMSJ8Yc.js                        0.04 kB │ gzip:  0.06 kB
build/client/assets/context-BSKof4BJ.js                         0.09 kB │ gzip:  0.10 kB
build/client/assets/context-CdsfRJ3p.js                         0.12 kB │ gzip:  0.11 kB
build/client/assets/Divider-DdX0k3iD.js                         0.32 kB │ gzip:  0.26 kB
build/client/assets/app.agent-approvals-CELRD99X.js             0.53 kB │ gzip:  0.32 kB
build/client/assets/Toast-CZe5Ihba.js                           0.64 kB │ gzip:  0.41 kB
build/client/assets/date-range-CLhjUUo2.js                      0.72 kB │ gzip:  0.42 kB
build/client/assets/Link-BWGL7uAm.js                            0.73 kB │ gzip:  0.39 kB
build/client/assets/InlineGrid-Bklo_vep.js                      0.81 kB │ gzip:  0.49 kB
build/client/assets/route-zDXoMkSN.js                           0.85 kB │ gzip:  0.51 kB
build/client/assets/FormLayout-Cauguaew.js                      0.96 kB │ gzip:  0.53 kB
build/client/assets/AfterInitialMount-C-VclerA.js               1.25 kB │ gzip:  0.47 kB
build/client/assets/SkeletonThumbnail-0ezpmZgf.js               1.31 kB │ gzip:  0.48 kB
build/client/assets/route-Bn_23Ztk.js                           1.51 kB │ gzip:  0.62 kB
build/client/assets/use-index-resource-state-7IuosbnD.js        1.54 kB │ gzip:  0.78 kB
build/client/assets/root-C2_dilur.js                            1.54 kB │ gzip:  0.88 kB
build/client/assets/Layout-Drv8ZkBJ.js                          1.64 kB │ gzip:  0.60 kB
build/client/assets/Sticky-3Wxpi6V4.js                          1.85 kB │ gzip:  0.80 kB
build/client/assets/index-1GQyLQny.js                           1.85 kB │ gzip:  0.72 kB
build/client/assets/EmptyState-by-HQyrj.js                      1.93 kB │ gzip:  0.81 kB
build/client/assets/app.additional-DUU9Dyr0.js                  2.09 kB │ gzip:  0.96 kB
build/client/assets/SparkLineChart-CQgKgDqj.js                  2.11 kB │ gzip:  1.10 kB
build/client/assets/Select-BzpuXWta.js                          2.74 kB │ gzip:  1.24 kB
build/client/assets/entry.client-DwtQxr1L.js                    3.86 kB │ gzip:  1.47 kB
build/client/assets/Checkbox-drAGhQ4I.js                        4.33 kB │ gzip:  1.81 kB
build/client/assets/styles-BEE87H3u.js                          5.95 kB │ gzip:  2.46 kB
build/client/assets/app.fast-movers-BxP-W8mN.js                 6.00 kB │ gzip:  2.26 kB
build/client/assets/app.vendor-mapping-O0Xsf_ZW.js              6.33 kB │ gzip:  2.19 kB
build/client/assets/app._index_enhanced-CYhrVqXJ.js             8.17 kB │ gzip:  2.66 kB
build/client/assets/app._index-pUvZpJun.js                      8.32 kB │ gzip:  2.63 kB
build/client/assets/Banner-DCanv2aO.js                          8.35 kB │ gzip:  2.67 kB
build/client/assets/LineSeries-CNDg3zjh.js                      9.79 kB │ gzip:  3.46 kB
build/client/assets/EmptySearchResult-D4D1_l9z.js               9.95 kB │ gzip:  3.49 kB
build/client/assets/Modal-vYd8S7dQ.js                          10.69 kB │ gzip:  4.09 kB
build/client/assets/app.settings-CaEWU_u_.js                   13.92 kB │ gzip:  4.41 kB
build/client/assets/app.sales-DUKc8sPS.js                      14.12 kB │ gzip:  4.49 kB
build/client/assets/LineChart-DpGSaaOT.js                      14.17 kB │ gzip:  5.50 kB
build/client/assets/app.inventory-DGiKRtvP.js                  15.50 kB │ gzip:  5.23 kB
build/client/assets/DataTable-DOlFJz1k.js                      17.17 kB │ gzip:  5.21 kB
build/client/assets/app.seo-BEafDDhW.js                        17.46 kB │ gzip:  5.28 kB
build/client/assets/Tabs-DcbyKX5H.js                           20.83 kB │ gzip:  6.99 kB
build/client/assets/app.orders-gR80luhd.js                     32.88 kB │ gzip:  9.69 kB
build/client/assets/IndexTable-nycHw1tK.js                     33.32 kB │ gzip:  9.51 kB
build/client/assets/app.inbox-DanAAwgj.js                      35.00 kB │ gzip: 11.59 kB
build/client/assets/BarChart-BTH-R0IZ.js                       40.07 kB │ gzip: 13.50 kB
build/client/assets/app-CrorpQtX.js                            46.72 kB │ gzip: 15.44 kB
build/client/assets/SkipLink-CU7_6Q_C.js                       48.10 kB │ gzip: 16.73 kB
build/client/assets/PolarisVizProvider-BMFajI3Y.js             56.64 kB │ gzip: 22.01 kB
build/client/assets/Page-CO1VPtMw.js                           88.48 kB │ gzip: 27.14 kB
build/client/assets/components-CTA1UUXK.js                    114.85 kB │ gzip: 37.50 kB
build/client/assets/index-DZoorY08.js                         143.29 kB │ gzip: 45.97 kB
build/client/assets/context-CVB7tZr2.js                       151.78 kB │ gzip: 17.07 kB
build/client/assets/ChartContainer-DSIix7Zm.js                160.42 kB │ gzip: 62.35 kB
✓ built in 5.92s
vite v6.3.6 building SSR bundle for production...
transforming...
✓ 87 modules transformed.
Generated an empty chunk: "webhooks.fulfillments.update".
Generated an empty chunk: "webhooks.app.scopes_update".
Generated an empty chunk: "webhooks.orders.fulfilled".
Generated an empty chunk: "webhooks.app.uninstalled".
Generated an empty chunk: "webhooks.products.update".
Generated an empty chunk: "webhooks.orders.create".
Generated an empty chunk: "cron.retention".
Generated an empty chunk: "queue.webhooks".
Generated an empty chunk: "auth._".
Generated an empty chunk: "app.inbox.telemetry".
Generated an empty chunk: "app.inbox.stream".
✗ Build failed in 440ms
app/lib/webhooks/handlers.server.ts (6:2): "createWebhookEvent" is not exported by "app/lib/webhooks/persistence.server.ts", imported by "app/lib/webhooks/handlers.server.ts".
file: /home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts:6:2

4: import {
5:   cleanupStoreSessions,
6:   createWebhookEvent,
     ^
7:   markWebhookEventStatus,
8:   persistOrderFlag,

    at getRollupError (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/parseAst.js:401:41)
    at error (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/parseAst.js:397:42)
    at Module.error (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:16938:16)
    at Module.traceVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:17390:29)
    at ModuleScope.findVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:15060:39)
    at ReturnValueScope.findVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:5642:38)
    at FunctionBodyScope.findVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:5642:38)
    at Identifier.bind (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:5413:40)
    at CallExpression.bind (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:2804:23)
    at CallExpression.bind (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:12108:15) {
  binding: 'createWebhookEvent',
  code: 'MISSING_EXPORT',
  exporter: '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/persistence.server.ts',
  id: '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts',
  url: 'https://rollupjs.org/troubleshooting/#error-name-is-not-exported-by-module',
  pos: 84,
  loc: {
    column: 2,
    file: '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts',
    line: 6
  },
  frame: '4: import {\n' +
    '5:   cleanupStoreSessions,\n' +
    '6:   createWebhookEvent,\n' +
    '     ^\n' +
    '7:   markWebhookEventStatus,\n' +
    '8:   persistOrderFlag,',
  watchFiles: [
    '/home/justin/llama_rag/apps/dashboard/app/root.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.fulfillments.update.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/entry.server.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.app.scopes_update.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.orders.fulfilled.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.app.uninstalled.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.products.update.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.orders.create.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/cron.retention.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/queue.webhooks.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/_index/route.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/auth.$.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/auth.login/route.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app._index_enhanced.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.agent-approvals.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.vendor-mapping.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.fast-movers.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.additional.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inventory.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.settings.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app._index.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.orders.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inbox.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inbox.telemetry.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inbox.stream.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.sales.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.seo.tsx',
    '/home/justin/llama_rag/apps/dashboard/package.json',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/shopify.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/db.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/events.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/config.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/assistants.stream.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/assistants.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/repository.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/telemetry.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/persistence.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/retention.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/queue.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/index.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/config.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/date-range.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/index.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/settings.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/dashboard.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inventory/math.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/_index/styles.module.css',
    '/home/justin/llama_rag/apps/dashboard/app/routes/auth.login/error.server.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/vendor-mapping.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/telemetry.client.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/sales/fixtures.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/sales/cache.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/ga4.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/bing.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/persistence.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/gsc.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/health-checks.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/connection-tests.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/orders/sync.server.ts',
    '/home/justin/llama_rag/apps/dashboard/node_modules/@shopify/polaris/locales/en.json',
    '/home/justin/llama_rag/apps/dashboard/node_modules/@shopify/polaris/build/esm/styles.css',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/idempotency.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/constants.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/orders.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/builder.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/shared.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/rag-draft-generator.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/mocks.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/types.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/client.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/fixtures/analytics.sales.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/sales/analytics.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/env.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/security/secrets.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/seo.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/currency.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/inbox.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/kpis.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/inventory.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/sales.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/factories/numbers.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/factories/dates.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/inbox-drafts.server.ts'
  ],
  [Symbol(augmented)]: true
}


### Tunnel Health
- **Status**: ❌ FAIL
- **Details**: Tunnel not accessible: HTTPSConnectionPool(host='mock-tunnel-url.ngrok.io%20%20', port=443): Max retries exceeded with url: / (Caused by NameResolutionError("<urllib3.connection.HTTPSConnection object at 0x727be2352690>: Failed to resolve 'mock-tunnel-url.ngrok.io%20%20' ([Errno -2] Name or service not known)"))

### Inventory API
- **Status**: ✅ PASS
- **Details**: Inventory service is healthy

### Dashboard Cards
- **Status**: ❌ FAIL
- **Details**: Dashboard build failed: 
> build
> remix vite:build

vite v6.3.6 building for production...
transforming...
✓ 2196 modules transformed.
rendering chunks...
computing gzip size...
build/client/.vite/manifest.json                               21.57 kB │ gzip:  2.41 kB
build/client/assets/route-TqOIn4DE.css                          0.76 kB │ gzip:  0.35 kB
build/client/assets/styles-BeiPL2RV.css                       444.11 kB │ gzip: 52.26 kB
build/client/assets/webhooks.fulfillments.update-l0sNRNKZ.js    0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.app.scopes_update-l0sNRNKZ.js      0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.orders.fulfilled-l0sNRNKZ.js       0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.app.uninstalled-l0sNRNKZ.js        0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.products.update-l0sNRNKZ.js        0.00 kB │ gzip:  0.02 kB
build/client/assets/webhooks.orders.create-l0sNRNKZ.js          0.00 kB │ gzip:  0.02 kB
build/client/assets/cron.retention-l0sNRNKZ.js                  0.00 kB │ gzip:  0.02 kB
build/client/assets/queue.webhooks-l0sNRNKZ.js                  0.00 kB │ gzip:  0.02 kB
build/client/assets/auth._-l0sNRNKZ.js                          0.00 kB │ gzip:  0.02 kB
build/client/assets/app.inbox.telemetry-l0sNRNKZ.js             0.00 kB │ gzip:  0.02 kB
build/client/assets/app.inbox.stream-l0sNRNKZ.js                0.00 kB │ gzip:  0.02 kB
build/client/assets/TitleBar-DFMSJ8Yc.js                        0.04 kB │ gzip:  0.06 kB
build/client/assets/context-BSKof4BJ.js                         0.09 kB │ gzip:  0.10 kB
build/client/assets/context-CdsfRJ3p.js                         0.12 kB │ gzip:  0.11 kB
build/client/assets/Divider-DdX0k3iD.js                         0.32 kB │ gzip:  0.26 kB
build/client/assets/app.agent-approvals-CELRD99X.js             0.53 kB │ gzip:  0.32 kB
build/client/assets/Toast-CZe5Ihba.js                           0.64 kB │ gzip:  0.41 kB
build/client/assets/date-range-CLhjUUo2.js                      0.72 kB │ gzip:  0.42 kB
build/client/assets/Link-BWGL7uAm.js                            0.73 kB │ gzip:  0.39 kB
build/client/assets/InlineGrid-Bklo_vep.js                      0.81 kB │ gzip:  0.49 kB
build/client/assets/route-zDXoMkSN.js                           0.85 kB │ gzip:  0.51 kB
build/client/assets/FormLayout-Cauguaew.js                      0.96 kB │ gzip:  0.53 kB
build/client/assets/AfterInitialMount-C-VclerA.js               1.25 kB │ gzip:  0.47 kB
build/client/assets/SkeletonThumbnail-0ezpmZgf.js               1.31 kB │ gzip:  0.48 kB
build/client/assets/route-Bn_23Ztk.js                           1.51 kB │ gzip:  0.62 kB
build/client/assets/use-index-resource-state-7IuosbnD.js        1.54 kB │ gzip:  0.78 kB
build/client/assets/root-C2_dilur.js                            1.54 kB │ gzip:  0.88 kB
build/client/assets/Layout-Drv8ZkBJ.js                          1.64 kB │ gzip:  0.60 kB
build/client/assets/Sticky-3Wxpi6V4.js                          1.85 kB │ gzip:  0.80 kB
build/client/assets/index-1GQyLQny.js                           1.85 kB │ gzip:  0.72 kB
build/client/assets/EmptyState-by-HQyrj.js                      1.93 kB │ gzip:  0.81 kB
build/client/assets/app.additional-DUU9Dyr0.js                  2.09 kB │ gzip:  0.96 kB
build/client/assets/SparkLineChart-CQgKgDqj.js                  2.11 kB │ gzip:  1.10 kB
build/client/assets/Select-BzpuXWta.js                          2.74 kB │ gzip:  1.24 kB
build/client/assets/entry.client-DwtQxr1L.js                    3.86 kB │ gzip:  1.47 kB
build/client/assets/Checkbox-drAGhQ4I.js                        4.33 kB │ gzip:  1.81 kB
build/client/assets/styles-BEE87H3u.js                          5.95 kB │ gzip:  2.46 kB
build/client/assets/app.fast-movers-BxP-W8mN.js                 6.00 kB │ gzip:  2.26 kB
build/client/assets/app.vendor-mapping-O0Xsf_ZW.js              6.33 kB │ gzip:  2.19 kB
build/client/assets/app._index_enhanced-CYhrVqXJ.js             8.17 kB │ gzip:  2.66 kB
build/client/assets/app._index-pUvZpJun.js                      8.32 kB │ gzip:  2.63 kB
build/client/assets/Banner-DCanv2aO.js                          8.35 kB │ gzip:  2.67 kB
build/client/assets/LineSeries-CNDg3zjh.js                      9.79 kB │ gzip:  3.46 kB
build/client/assets/EmptySearchResult-D4D1_l9z.js               9.95 kB │ gzip:  3.49 kB
build/client/assets/Modal-vYd8S7dQ.js                          10.69 kB │ gzip:  4.09 kB
build/client/assets/app.settings-CaEWU_u_.js                   13.92 kB │ gzip:  4.41 kB
build/client/assets/app.sales-DUKc8sPS.js                      14.12 kB │ gzip:  4.49 kB
build/client/assets/LineChart-DpGSaaOT.js                      14.17 kB │ gzip:  5.50 kB
build/client/assets/app.inventory-DGiKRtvP.js                  15.50 kB │ gzip:  5.23 kB
build/client/assets/DataTable-DOlFJz1k.js                      17.17 kB │ gzip:  5.21 kB
build/client/assets/app.seo-BEafDDhW.js                        17.46 kB │ gzip:  5.28 kB
build/client/assets/Tabs-DcbyKX5H.js                           20.83 kB │ gzip:  6.99 kB
build/client/assets/app.orders-gR80luhd.js                     32.88 kB │ gzip:  9.69 kB
build/client/assets/IndexTable-nycHw1tK.js                     33.32 kB │ gzip:  9.51 kB
build/client/assets/app.inbox-DanAAwgj.js                      35.00 kB │ gzip: 11.59 kB
build/client/assets/BarChart-BTH-R0IZ.js                       40.07 kB │ gzip: 13.50 kB
build/client/assets/app-CrorpQtX.js                            46.72 kB │ gzip: 15.44 kB
build/client/assets/SkipLink-CU7_6Q_C.js                       48.10 kB │ gzip: 16.73 kB
build/client/assets/PolarisVizProvider-BMFajI3Y.js             56.64 kB │ gzip: 22.01 kB
build/client/assets/Page-CO1VPtMw.js                           88.48 kB │ gzip: 27.14 kB
build/client/assets/components-CTA1UUXK.js                    114.85 kB │ gzip: 37.50 kB
build/client/assets/index-DZoorY08.js                         143.29 kB │ gzip: 45.97 kB
build/client/assets/context-CVB7tZr2.js                       151.78 kB │ gzip: 17.07 kB
build/client/assets/ChartContainer-DSIix7Zm.js                160.42 kB │ gzip: 62.35 kB
✓ built in 5.87s
vite v6.3.6 building SSR bundle for production...
transforming...
✓ 87 modules transformed.
Generated an empty chunk: "webhooks.fulfillments.update".
Generated an empty chunk: "webhooks.app.scopes_update".
Generated an empty chunk: "webhooks.orders.fulfilled".
Generated an empty chunk: "webhooks.app.uninstalled".
Generated an empty chunk: "webhooks.products.update".
Generated an empty chunk: "webhooks.orders.create".
Generated an empty chunk: "cron.retention".
Generated an empty chunk: "queue.webhooks".
Generated an empty chunk: "auth._".
Generated an empty chunk: "app.inbox.telemetry".
Generated an empty chunk: "app.inbox.stream".
✗ Build failed in 406ms
app/lib/webhooks/handlers.server.ts (6:2): "createWebhookEvent" is not exported by "app/lib/webhooks/persistence.server.ts", imported by "app/lib/webhooks/handlers.server.ts".
file: /home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts:6:2

4: import {
5:   cleanupStoreSessions,
6:   createWebhookEvent,
     ^
7:   markWebhookEventStatus,
8:   persistOrderFlag,

    at getRollupError (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/parseAst.js:401:41)
    at error (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/parseAst.js:397:42)
    at Module.error (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:16938:16)
    at Module.traceVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:17390:29)
    at ModuleScope.findVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:15060:39)
    at ReturnValueScope.findVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:5642:38)
    at FunctionBodyScope.findVariable (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:5642:38)
    at Identifier.bind (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:5413:40)
    at CallExpression.bind (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:2804:23)
    at CallExpression.bind (file:///home/justin/llama_rag/apps/dashboard/node_modules/rollup/dist/es/shared/node-entry.js:12108:15) {
  binding: 'createWebhookEvent',
  code: 'MISSING_EXPORT',
  exporter: '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/persistence.server.ts',
  id: '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts',
  url: 'https://rollupjs.org/troubleshooting/#error-name-is-not-exported-by-module',
  pos: 84,
  loc: {
    column: 2,
    file: '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts',
    line: 6
  },
  frame: '4: import {\n' +
    '5:   cleanupStoreSessions,\n' +
    '6:   createWebhookEvent,\n' +
    '     ^\n' +
    '7:   markWebhookEventStatus,\n' +
    '8:   persistOrderFlag,',
  watchFiles: [
    '/home/justin/llama_rag/apps/dashboard/app/root.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/entry.server.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.fulfillments.update.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.app.scopes_update.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.orders.fulfilled.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.app.uninstalled.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.products.update.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/webhooks.orders.create.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/cron.retention.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/queue.webhooks.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/auth.login/route.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/_index/route.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/auth.$.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app._index_enhanced.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.agent-approvals.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.vendor-mapping.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.fast-movers.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.additional.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inventory.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.settings.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app._index.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.orders.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inbox.telemetry.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inbox.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.inbox.stream.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.seo.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/routes/app.sales.tsx',
    '/home/justin/llama_rag/apps/dashboard/package.json',
    '/home/justin/llama_rag/apps/dashboard/app/shopify.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/handlers.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/db.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/retention.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/queue.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/persistence.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/config.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/vendor-mapping.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/settings.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/repository.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/index.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/config.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/index.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/dashboard.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/date-range.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/connection-tests.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/settings/health-checks.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inventory/math.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/assistants.stream.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/events.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/assistants.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/routes/_index/styles.module.css',
    '/home/justin/llama_rag/apps/dashboard/app/routes/auth.login/error.server.tsx',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/ga4.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/gsc.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/bing.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/seo/persistence.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/telemetry.client.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/telemetry.server.ts',
    '/home/justin/llama_rag/apps/dashboard/node_modules/@shopify/polaris/build/esm/styles.css',
    '/home/justin/llama_rag/apps/dashboard/app/lib/orders/sync.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/sales/cache.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/sales/fixtures.server.ts',
    '/home/justin/llama_rag/apps/dashboard/node_modules/@shopify/polaris/locales/en.json',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/constants.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/webhooks/idempotency.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/builder.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/shared.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/orders.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/security/secrets.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/env.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/client.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/mocks.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/mcp/types.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/seo.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/inbox/rag-draft-generator.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/currency.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/fixtures/analytics.sales.ts',
    '/home/justin/llama_rag/apps/dashboard/app/lib/sales/analytics.server.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/factories/numbers.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/inbox.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/inventory.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/kpis.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/sales.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/factories/dates.ts',
    '/home/justin/llama_rag/apps/dashboard/app/mocks/inbox-drafts.server.ts'
  ],
  [Symbol(augmented)]: true
}


### Webhook Registration
- **Status**: ✅ PASS
- **Details**: Webhook files found: ['queue.webhooks-l0sNRNKZ.js', 'webhooks.fulfillments.update-l0sNRNKZ.js', 'webhooks.app.uninstalled-l0sNRNKZ.js', 'webhooks.orders.create-l0sNRNKZ.js', 'webhooks.app.scopes_update-l0sNRNKZ.js', 'webhooks.orders.fulfilled-l0sNRNKZ.js', 'webhooks.products.update-l0sNRNKZ.js', '20250326150000_add_webhook_registry', 'webhooks.worker.ts', 'webhooks', 'webhooks.products.update.tsx', 'webhooks.app.scopes_update.tsx', 'webhooks.orders.fulfilled.tsx', 'webhooks.orders.create.tsx', 'queue.webhooks.tsx', 'webhooks.fulfillments.update.tsx', 'webhooks.app.uninstalled.tsx', 'webhooks', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhooks', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhooks', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhooks', 'webhooks', 'authenticate.webhooks.doc.d.ts', 'authenticate.webhooks.doc.d.ts.map', 'webhooks', 'webhooks.app.uninstalled-l0sNRNKZ.js', 'webhooks.app.scopes_update-l0sNRNKZ.js', 'webhooks.app.scopes_update.tsx', 'webhooks.app.uninstalled.tsx', 'webhooks', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhook.mjs', 'webhook.mjs.map', 'webhooks', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhook.d.ts', 'webhook.d.ts.map', 'webhooks', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhook.js', 'webhook.js.map', 'webhooks', 'webhooks', 'authenticate.webhooks.doc.d.ts', 'authenticate.webhooks.doc.d.ts.map', 'webhooks']
