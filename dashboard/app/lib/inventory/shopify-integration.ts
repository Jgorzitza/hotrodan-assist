import type { InventorySkuDemand, VendorMapping } from "../../types/dashboard";

/**
 * Shopify API integration patterns for inventory management
 * Designed for MCP connector integration
 */

export type ShopifyInventoryItem = {
  id: string;
  sku: string;
  title: string;
  inventory_quantity: number;
  available: number;
  committed: number;
  incoming: number;
  outgoing: number;
  variant_id: string;
  product_id: string;
  location_id: string;
  updated_at: string;
};

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
};

export type ShopifyVariant = {
  id: string;
  sku: string;
  title: string;
  price: string;
  compare_at_price: string;
  inventory_quantity: number;
  weight: number;
  weight_unit: string;
  requires_shipping: boolean;
  taxable: boolean;
  barcode: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ShopifyLocation = {
  id: string;
  name: string;
  address1: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Shopify API client for inventory operations
 */
export class ShopifyInventoryClient {
  private baseUrl: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(shopDomain: string, accessToken: string, apiVersion: string = "2024-01") {
    this.baseUrl = `https://${shopDomain}.myshopify.com/admin/api/${apiVersion}`;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
  }

  /**
   * Fetch inventory levels for all locations
   */
  async getInventoryLevels(): Promise<ShopifyInventoryItem[]> {
    const response = await this.makeRequest("/inventory_levels.json");
    return response.inventory_levels || [];
  }

  /**
   * Fetch products with variants
   */
  async getProducts(limit: number = 250): Promise<ShopifyProduct[]> {
    const response = await this.makeRequest(`/products.json?limit=${limit}`);
    return response.products || [];
  }

  /**
   * Fetch locations
   */
  async getLocations(): Promise<ShopifyLocation[]> {
    const response = await this.makeRequest("/locations.json");
    return response.locations || [];
  }

  /**
   * Update inventory level for a specific item
   */
  async updateInventoryLevel(
    inventoryItemId: string,
    locationId: string,
    available: number
  ): Promise<ShopifyInventoryItem> {
    const response = await this.makeRequest("/inventory_levels/set.json", {
      method: "POST",
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: available,
      }),
    });
    return response.inventory_level;
  }

  /**
   * Create purchase order (if supported by Shopify)
   */
  async createPurchaseOrder(orderData: {
    vendor: string;
    items: Array<{
      sku: string;
      quantity: number;
      unit_cost: number;
    }>;
    notes?: string;
  }): Promise<any> {
    // This would integrate with a purchase order app or custom solution
    // For now, return a mock response
    return {
      id: `po-${Date.now()}`,
      status: "draft",
      vendor: orderData.vendor,
      items: orderData.items,
      total: orderData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0),
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Make authenticated request to Shopify API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "X-Shopify-Access-Token": this.accessToken,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Data mapping utilities for Shopify integration
 */
export class ShopifyDataMapper {
  /**
   * Convert Shopify inventory item to internal SKU demand format
   */
  static mapToSkuDemand(
    inventoryItem: ShopifyInventoryItem,
    product: ShopifyProduct,
    vendorMapping?: VendorMapping
  ): InventorySkuDemand {
    const variant = product.variants.find(v => v.id.toString() === inventoryItem.variant_id);
    
    return {
      id: inventoryItem.id,
      title: product.title,
      sku: inventoryItem.sku || variant?.sku || "",
      vendorId: vendorMapping?.vendorId || "unknown",
      vendorName: product.vendor || vendorMapping?.vendorName || "Unknown Vendor",
      status: this.determineStatus(inventoryItem.available, inventoryItem.committed),
      bucketId: this.determineBucket(inventoryItem.available, inventoryItem.committed),
      onHand: inventoryItem.inventory_quantity,
      inbound: inventoryItem.incoming,
      committed: inventoryItem.committed,
      coverDays: this.calculateCoverDays(inventoryItem.available, inventoryItem.committed),
      safetyStock: 0, // Will be calculated by ROP formula
      reorderPoint: 0, // Will be calculated by ROP formula
      recommendedOrder: 0, // Will be calculated by ROP formula
      stockoutDate: this.calculateStockoutDate(inventoryItem.available, inventoryItem.committed),
      unitCost: {
        amount: variant ? parseFloat(variant.price) : 0,
        currency: "USD",
        formatted: variant ? `$${parseFloat(variant.price).toFixed(2)}` : "$0.00",
      },
      velocity: {
        turnoverDays: 0, // Will be calculated from historical data
        sellThroughRate: 0, // Will be calculated from historical data
        lastWeekUnits: 0, // Will be calculated from historical data
      },
      trend: [], // Will be populated from historical data
    };
  }

  /**
   * Determine inventory status based on available and committed quantities
   */
  private static determineStatus(available: number, committed: number): "healthy" | "low" | "backorder" | "preorder" {
    if (available <= 0) return "backorder";
    if (available < committed) return "low";
    if (available < 10) return "low";
    return "healthy";
  }

  /**
   * Determine inventory bucket based on quantities
   */
  private static determineBucket(available: number, committed: number): "urgent" | "air" | "sea" | "overstock" {
    if (available <= 0) return "urgent";
    if (available < committed) return "urgent";
    if (available < 20) return "air";
    if (available > 200) return "overstock";
    return "sea";
  }

  /**
   * Calculate cover days based on available inventory
   */
  private static calculateCoverDays(available: number, committed: number): number {
    const netAvailable = available - committed;
    if (netAvailable <= 0) return 0;
    
    // This is a simplified calculation - in reality, this would use historical sales data
    const estimatedDailySales = 1; // Placeholder
    return Math.floor(netAvailable / estimatedDailySales);
  }

  /**
   * Calculate stockout date
   */
  private static calculateStockoutDate(available: number, committed: number): string {
    const netAvailable = available - committed;
    if (netAvailable <= 0) return new Date().toISOString();
    
    const estimatedDailySales = 1; // Placeholder
    const daysUntilStockout = Math.floor(netAvailable / estimatedDailySales);
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
    
    return stockoutDate.toISOString();
  }
}

/**
 * Integration configuration
 */
export type ShopifyIntegrationConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
  enableInventorySync: boolean;
  enablePurchaseOrders: boolean;
  syncInterval: number; // minutes
};

/**
 * Default configuration
 */
export const DEFAULT_SHOPIFY_CONFIG: ShopifyIntegrationConfig = {
  shopDomain: "",
  accessToken: "",
  apiVersion: "2024-01",
  enableInventorySync: true,
  enablePurchaseOrders: false,
  syncInterval: 15, // 15 minutes
};
