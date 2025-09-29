# Sales Analytics UI - Real Data Integration Guide

## 🎯 Current Status
- ✅ **Mock Data**: Fully functional with realistic fixtures
- ✅ **Live Data Pipeline**: Ready to activate
- ✅ **Database**: Prisma configured with SQLite/PostgreSQL support
- ✅ **Caching**: Redis/Memory cache layer implemented

## 🔧 How to Connect Real Shopify Data

### Step 1: Environment Configuration
Create `.env` file with:
```bash
# Data Source Toggle
USE_MOCK_DATA=false

# Analytics Service
ANALYTICS_SERVICE_URL=https://your-analytics-service.com/api/v1

# Shopify API
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_analytics,read_orders,read_products,read_customers

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sales_analytics"

# Cache (Optional)
REDIS_URL=redis://localhost:6379
```

### Step 2: Analytics Service Integration
The system expects your analytics service to return data in this format:
```typescript
interface AnalyticsSalesResponse {
  scenario: string;
  state: "ok" | "warning" | "error" | "empty";
  granularity: "daily" | "weekly" | "monthly";
  range: {
    label: string;
    start: string; // YYYY-MM-DD format
    end: string;   // YYYY-MM-DD format
  };
  totals: {
    current_total: { amount: number; currency: string };
    previousTotal: { amount: number; currencyCode: string };
    delta_percentage: number;
    averageOrderValue: { amount: number; currency: string };
    conversion_rate: number;
  };
  trend: Array<{
    date: string;
    total: { amount: number; currency: string };
    orders: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    total: { amount: number; currency: string };
    percentage: number;
  }>;
  collections: Array<{
    id: string;
    title: string;
    handle: string;
    gmv: { amount: number; currency: string };
    orders: number;
    conversionRate: number;
    returningRate: number;
    attachRate: number;
    deltaPercentage: number;
    products: Array<{
      id: string;
      title: string;
      gmv: { amount: number; currency: string };
      orders: number;
      attachRate: number;
      returningRate: number;
      refundRate: number;
      skuCount: number;
      inventoryStatus: "healthy" | "overstock" | "stockout_risk";
      variants: Array<{
        id: string;
        sku: string;
        title: string;
        gmv: { amount: number; currency: string };
        unitsSold: number;
        inventoryOnHand: number;
        attachRate: number;
        backorderRisk: "none" | "low" | "medium" | "high";
      }>;
    }>;
  }>;
  // ... additional fields
}
```

### Step 3: Data Sources You Can Connect

#### Option A: Direct Shopify API
```typescript
// In your analytics service
const shopifyData = await fetch('https://afafsaf.myshopify.com/admin/api/2024-01/analytics.json', {
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
  }
});
```

#### Option B: Shopify Plus Analytics API
```typescript
// For advanced analytics
const analyticsData = await fetch('https://afafsaf.myshopify.com/admin/api/2024-01/analytics/overview.json');
```

#### Option C: Custom Data Warehouse
```typescript
// Connect to your existing data warehouse
const warehouseData = await fetch('https://your-warehouse.com/api/sales-analytics');
```

### Step 4: Activate Live Data
```bash
# Set environment variable
export USE_MOCK_DATA=false

# Restart the application
npm run dev
```

## 🚀 Data Pipeline Features

### ✅ **Caching Layer**
- **Memory Cache**: Fast in-memory caching for development
- **Redis Cache**: Production-ready distributed caching
- **TTL**: 6-hour cache expiration by default
- **Invalidation**: Smart cache invalidation on data updates

### ✅ **Error Handling**
- **Graceful Fallback**: Falls back to mock data if live service fails
- **Retry Logic**: Automatic retry with exponential backoff
- **Alert System**: User notifications for data issues

### ✅ **Performance Optimization**
- **Lazy Loading**: Data loaded only when needed
- **Pagination**: Large datasets handled efficiently
- **Compression**: Gzip compression for API responses

## 📊 Real-Time Data Updates

The system supports multiple update strategies:

1. **Polling**: Regular data refresh every 15 minutes
2. **Webhooks**: Real-time updates via Shopify webhooks
3. **Manual Refresh**: User-triggered data refresh
4. **Scheduled Jobs**: Background data processing

## 🔍 Monitoring & Debugging

- **Logs**: Comprehensive logging for data flow
- **Metrics**: Performance monitoring
- **Health Checks**: Service availability monitoring
- **Debug Mode**: Detailed error reporting

## 🎯 Next Steps

1. **Choose Data Source**: Select your preferred data integration method
2. **Configure Service**: Set up your analytics service endpoint
3. **Test Integration**: Verify data flow with test data
4. **Deploy**: Roll out to production environment
5. **Monitor**: Set up monitoring and alerting

The Sales Analytics UI is fully ready for real data integration! 🚀
