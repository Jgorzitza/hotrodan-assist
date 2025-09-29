import type { SalesDataset, SalesGranularity } from "~/types/dashboard";
import { getMcpClient, isMcpFeatureEnabled, shouldUseMcpMocks } from "~/lib/mcp";
import type { FeatureToggles } from "~/types/settings";

/**
 * MCP Integration for Sales Analytics
 * 
 * This module integrates sales insights with live MCP connectors
 * for Shopify orders/products and GA4 analytics data.
 */

export type McpSalesData = {
  shopifyOrders: any[];
  shopifyProducts: any[];
  ga4Sessions: any[];
  ga4Conversions: any[];
};

export type McpSalesIntegrationParams = {
  shopDomain?: string;
  dateRange: {
    start: string;
    end: string;
  };
  granularity: SalesGranularity;
  toggles?: FeatureToggles | null;
};

/**
 * Fetches live sales data from MCP connectors
 */
export async function fetchLiveSalesData(params: McpSalesIntegrationParams): Promise<McpSalesData> {
  const { shopDomain, dateRange, granularity, toggles } = params;
  
  // Check if MCP is enabled and we should use live data
  if (!isMcpFeatureEnabled(toggles) || shouldUseMcpMocks(toggles)) {
    console.log("[sales:mcp] Using mock data - MCP disabled or mock mode enabled");
    return getMockSalesData(params);
  }
  
  try {
    console.log("[sales:mcp] Fetching live data from MCP connectors");
    
    // Initialize MCP client
    const mcpClient = getMcpClient(toggles);
    
    // Fetch data from multiple connectors in parallel
    const [shopifyData, ga4Data] = await Promise.allSettled([
      fetchShopifyData(mcpClient, shopDomain, dateRange),
      fetchGA4Data(mcpClient, dateRange, granularity),
    ]);
    
    const shopifyResult = shopifyData.status === 'fulfilled' ? shopifyData.value : { orders: [], products: [] };
    const ga4Result = ga4Data.status === 'fulfilled' ? ga4Data.value : { sessions: [], conversions: [] };
    
    return {
      shopifyOrders: shopifyResult.orders || [],
      shopifyProducts: shopifyResult.products || [],
      ga4Sessions: ga4Result.sessions || [],
      ga4Conversions: ga4Result.conversions || [],
    };
    
  } catch (error) {
    console.error("[sales:mcp] Error fetching live data:", error);
    console.log("[sales:mcp] Falling back to mock data");
    return getMockSalesData(params);
  }
}

/**
 * Fetches Shopify data through MCP connector
 */
async function fetchShopifyData(mcpClient: any, shopDomain?: string, dateRange?: any) {
  try {
    // Use the MCP connectors API on port 8003
    const baseUrl = process.env.CONNECTORS_API_URL || "http://localhost:8003";
    
    if (!baseUrl) {
      throw new Error("No connector service URL configured");
    }
    
    // Fetch orders and products from Shopify connector
    const ordersResponse = await fetch(`${baseUrl}/shopify/orders`, {
      method: 'GET',
      headers: {
        'X-Shop-Domain': shopDomain || '',
        'Accept': 'application/json',
      },
    });
    
    const productsResponse = await fetch(`${baseUrl}/shopify/products`, {
      method: 'GET',
      headers: {
        'X-Shop-Domain': shopDomain || '',
        'Accept': 'application/json',
      },
    });
    
    const orders = ordersResponse.ok ? await ordersResponse.json() : { data: [] };
    const products = productsResponse.ok ? await productsResponse.json() : { data: [] };
    
    return {
      orders: orders.data || [],
      products: products.data || [],
    };
    
  } catch (error) {
    console.error("[sales:mcp] Shopify data fetch failed:", error);
    return { orders: [], products: [] };
  }
}

/**
 * Fetches GA4 data through MCP connector
 */
async function fetchGA4Data(mcpClient: any, dateRange?: any, granularity?: string) {
  try {
    const baseUrl = process.env.CONNECTORS_API_URL || "http://localhost:8003";
    
    if (!baseUrl) {
      throw new Error("No connector service URL configured");
    }
    
    // Fetch GA4 traffic summary and conversions
    const sessionsResponse = await fetch(`${baseUrl}/ga4/traffic_summary`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const conversionsResponse = await fetch(`${baseUrl}/ga4/conversions`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const sessions = sessionsResponse.ok ? await sessionsResponse.json() : { data: [] };
    const conversions = conversionsResponse.ok ? await conversionsResponse.json() : { data: [] };
    
    return {
      sessions: sessions.data || [],
      conversions: conversions.data || [],
    };
    
  } catch (error) {
    console.error("[sales:mcp] GA4 data fetch failed:", error);
    return { sessions: [], conversions: [] };
  }
}

/**
 * Generates mock sales data for testing
 */
function getMockSalesData(params: McpSalesIntegrationParams): McpSalesData {
  const { dateRange } = params;
  
  // Generate realistic mock data based on the date range
  const mockOrders = generateMockOrders(dateRange);
  const mockProducts = generateMockProducts();
  const mockSessions = generateMockSessions(dateRange);
  const mockConversions = generateMockConversions(dateRange);
  
  return {
    shopifyOrders: mockOrders,
    shopifyProducts: mockProducts,
    ga4Sessions: mockSessions,
    ga4Conversions: mockConversions,
  };
}

/**
 * Generates mock Shopify orders
 */
function generateMockOrders(dateRange: any): any[] {
  const orders = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i < Math.min(days * 5, 100); i++) {
    const orderDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    orders.push({
      id: `gid://shopify/Order/${1000 + i}`,
      name: `#${1000 + i}`,
      created_at: orderDate.toISOString(),
      total_price: (Math.random() * 500 + 50).toFixed(2),
      currency: 'USD',
      financial_status: Math.random() > 0.1 ? 'paid' : 'pending',
      fulfillment_status: Math.random() > 0.2 ? 'fulfilled' : 'unfulfilled',
      customer: {
        id: `gid://shopify/Customer/${2000 + i}`,
        email: `customer${i}@example.com`,
      },
      line_items: [
        {
          id: `gid://shopify/LineItem/${3000 + i}`,
          product_id: `gid://shopify/Product/${4000 + (i % 10)}`,
          variant_id: `gid://shopify/ProductVariant/${5000 + (i % 10)}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: (Math.random() * 200 + 25).toFixed(2),
        },
      ],
    });
  }
  
  return orders;
}

/**
 * Generates mock Shopify products
 */
function generateMockProducts(): any[] {
  const products = [];
  const productNames = [
    'Performance Kit - Stage 3',
    'High-Flow Radiator',
    'Cooling System Upgrade',
    'Turbo Charger Kit',
    'Intercooler System',
    'Fuel Injection Kit',
    'Exhaust System',
    'Brake Upgrade Kit',
    'Suspension Kit',
    'Engine Management System',
  ];
  
  for (let i = 0; i < productNames.length; i++) {
    products.push({
      id: `gid://shopify/Product/${4000 + i}`,
      title: productNames[i],
      handle: productNames[i].toLowerCase().replace(/\s+/g, '-'),
      status: 'active',
      product_type: i < 3 ? 'Performance' : i < 6 ? 'Cooling' : 'Accessories',
      vendor: 'AutoParts Pro',
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      variants: [
        {
          id: `gid://shopify/ProductVariant/${5000 + i}`,
          title: 'Default',
          price: (Math.random() * 500 + 100).toFixed(2),
          sku: `AP-${1000 + i}`,
          inventory_quantity: Math.floor(Math.random() * 100),
        },
      ],
    });
  }
  
  return products;
}

/**
 * Generates mock GA4 sessions
 */
function generateMockSessions(dateRange: any): any[] {
  const sessions = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    sessions.push({
      date: date.toISOString().split('T')[0],
      sessions: Math.floor(Math.random() * 500 + 100),
      users: Math.floor(Math.random() * 400 + 80),
      pageviews: Math.floor(Math.random() * 1000 + 200),
      bounce_rate: (Math.random() * 0.4 + 0.3).toFixed(3),
      avg_session_duration: Math.floor(Math.random() * 300 + 60),
    });
  }
  
  return sessions;
}

/**
 * Generates mock GA4 conversions
 */
function generateMockConversions(dateRange: any): any[] {
  const conversions = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    conversions.push({
      date: date.toISOString().split('T')[0],
      conversions: Math.floor(Math.random() * 50 + 10),
      conversion_rate: (Math.random() * 0.05 + 0.01).toFixed(4),
      revenue: (Math.random() * 5000 + 1000).toFixed(2),
    });
  }
  
  return conversions;
}

/**
 * Transforms MCP data into sales dataset format
 */
export function transformMcpDataToSalesDataset(
  mcpData: McpSalesData,
  granularity: SalesGranularity,
  dateRange: { start: string; end: string; label: string }
): SalesDataset {
  // This is a simplified transformation
  // In a real implementation, you would process the raw data more thoroughly
  
  const totalRevenue = mcpData.shopifyOrders.reduce((sum, order) => 
    sum + parseFloat(order.total_price || 0), 0
  );
  
  const totalOrders = mcpData.shopifyOrders.length;
  const totalSessions = mcpData.ga4Sessions.reduce((sum, session) => 
    sum + (session.sessions || 0), 0
  );
  
  const conversionRate = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Transform the data into the expected SalesDataset format
  // This is a simplified version - you'd want to process the data more thoroughly
  return {
    scenario: "base" as const,
    state: "ok" as const,
    granularity,
    range: dateRange,
    totals: {
      currentTotal: {
        amount: totalRevenue,
        currency: "USD" as const,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(totalRevenue),
      },
      previousTotal: {
        amount: totalRevenue * 0.95, // Mock previous period
        currency: "USD" as const,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(totalRevenue * 0.95),
      },
      deltaPercentage: 5.26,
      averageOrderValue: {
        amount: averageOrderValue,
        currency: "USD" as const,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(averageOrderValue),
      },
      conversionRate,
    },
    trend: [], // Would be populated from daily data
    channelBreakdown: [], // Would be populated from GA4 data
    forecast: null, // Would be calculated from trends
    collections: [], // Would be populated from products
    productsByCollection: {},
    variantsByProduct: {},
    bestSellers: [], // Would be populated from orders/products
    laggards: [], // Would be populated from orders/products
    attachRateInsights: [], // Would be calculated from order data
    overstockRisks: [], // Would be calculated from inventory
    cohortHighlights: [], // Would be calculated from customer data
    topCustomers: [], // Would be populated from orders
    alert: undefined,
    error: undefined,
  };
}
