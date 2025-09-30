/**
 * Shopify Inventory Service
 * 
 * Fetches real inventory data from Shopify Admin API
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { executeAdmin } from "./admin";
import { buildGetProductsWithInventoryQuery } from "./inventory-queries";

export type InventoryMetrics = {
  totalProducts: number;
  lowStockCount: number;
  totalSKUs: number;
};

export type InventoryDashboardData = {
  metrics: InventoryMetrics;
  products: Array<{
    id: string;
    title: string;
    inventory: number;
  }>;
};

/**
 * Fetch inventory dashboard data from Shopify
 */
export const fetchInventoryDashboard = async (
  admin: AdminApiContext
): Promise<InventoryDashboardData> => {
  try {
    const response = await executeAdmin<any>(
      admin,
      buildGetProductsWithInventoryQuery(50).query,
      { variables: { first: 50 } }
    );

    const products = response.data?.products?.edges?.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      inventory: edge.node.totalInventory ?? 0,
    })) ?? [];

    const metrics = {
      totalProducts: products.length,
      lowStockCount: products.filter((p: any) => p.inventory < 10).length,
      totalSKUs: products.length,
    };

    console.log(`✅ Fetched ${products.length} products from Shopify`);

    return {
      metrics,
      products,
    };
  } catch (error) {
    console.error("❌ Failed to fetch Shopify inventory:", error);
    throw error;
  }
};
