# Shopify Live Data Integration

## Overview

The dashboard now fetches real inventory data from Shopify Admin API instead of using mock data. This integration includes caching, webhooks, and alerts for a complete real-time inventory management system.

## Components

### 1. GraphQL Queries (`app/lib/shopify/inventory-queries.ts`)

Defines GraphQL queries for fetching product and inventory data:
- `GET_PRODUCTS_WITH_INVENTORY_QUERY`: Fetches products with totalInventory

### 2. Service Layer (`app/lib/shopify/inventory.server.ts`)

Handles data fetching and transformation:
- `fetchInventoryDashboard()`: Main function to fetch inventory data
- Returns `InventoryDashboardData` with metrics and product list
- Calculates low stock count (< 10 units)

### 3. Caching (`app/lib/shopify/cache.server.ts`)

Simple in-memory cache with TTL:
- Default TTL: 5 minutes
- Automatically clears expired entries
- Cache key based on operation name

### 4. Webhook Handler (`app/routes/webhooks.inventory.update.tsx`)

Listens for `INVENTORY_LEVELS_UPDATE` events:
- Clears cache when inventory changes
- Ensures dashboard shows fresh data

### 5. Alert System (`app/lib/inventory/alerts.server.ts`)

Monitors inventory and generates alerts:
- **LOW_STOCK**: < 10 units
- **OUT_OF_STOCK**: 0 units  
- **OVERSTOCK**: > 1000 units
- Priority-based sorting
- Formatted display with emojis

### 6. Performance Monitoring (`app/lib/monitoring/performance.server.ts`)

Tracks API performance:
- Average response time
- P95 latency
- Success rate
- `/api/performance` endpoint for metrics

## Usage

### In Dashboard Routes

```typescript
import { fetchInventoryDashboard } from "~/lib/shopify/inventory.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const shopifyData = await fetchInventoryDashboard(admin);
  
  // Use shopifyData.metrics.lowStockCount, etc.
};
```

### Generating Alerts

```typescript
import { generateInventoryAlerts } from "~/lib/inventory/alerts.server";

const alerts = generateInventoryAlerts(shopifyData);
alerts.forEach(alert => console.log(formatAlert(alert)));
```

### Performance Tracking

```typescript
import { measurePerformance } from "~/lib/monitoring/performance.server";

const data = await measurePerformance(
  "fetch-inventory",
  () => fetchInventoryDashboard(admin)
);
```

## Configuration

Set `USE_MOCK_DATA=false` in environment to enable live Shopify data.

## Testing

1. Install app in Shopify store
2. Set `USE_MOCK_DATA=false`
3. Access dashboard - should show real product counts
4. Change inventory in Shopify Admin
5. Webhook should clear cache
6. Refresh dashboard - should show updated data

## Architecture

```
Shopify Admin API
       ↓
GraphQL Queries (inventory-queries.ts)
       ↓
Service Layer (inventory.server.ts)
       ↓
Cache (cache.server.ts) ← Webhook clears
       ↓
Dashboard Routes
       ↓
Alert System (alerts.server.ts)
```

## Performance

- **Cache TTL**: 5 minutes
- **Target p95**: < 2s for dashboard load
- **Webhook latency**: < 100ms
- **Alert generation**: < 50ms

## Future Enhancements

- [ ] Redis cache for multi-instance deployments
- [ ] Email alerts for critical inventory levels
- [ ] Inventory trend charts
- [ ] Purchase order integration
- [ ] Multi-location support
- [ ] Inventory forecasting
