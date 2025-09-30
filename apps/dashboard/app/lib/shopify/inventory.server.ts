/**
 * Shopify Inventory Service
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

type ProductEdge = {
  node: {
    id: string;
    title: string;
    totalInventory?: number | null;
  };
};

type ProductsResponse = {
  data?: {
    products?: {
      edges?: ProductEdge[];
    };
  };
};

export const fetchInventoryDashboard = async (
  admin: AdminApiContext
): Promise<InventoryDashboardData> => {
  const response = await executeAdmin<ProductsResponse>(
    admin,
    buildGetProductsWithInventoryQuery(50).query,
    { variables: { first: 50 } }
  );

  const products = response.data?.products?.edges?.map((edge: ProductEdge) => ({
    id: edge.node.id,
    title: edge.node.title,
    inventory: edge.node.totalInventory ?? 0,
  })) ?? [];

  const metrics = {
    totalProducts: products.length,
    lowStockCount: products.filter((p) => p.inventory < 10).length,
    totalSKUs: products.length,
  };

  return {
    metrics,
    products,
  };
};
