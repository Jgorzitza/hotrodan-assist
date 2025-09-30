/**
 * Inventory Alert System
 * Monitors inventory levels and triggers notifications
 */

import type { InventoryDashboardData } from "~/lib/shopify/inventory.server";

export type AlertType = "LOW_STOCK" | "OUT_OF_STOCK" | "OVERSTOCK";

export type InventoryAlert = {
  id: string;
  type: AlertType;
  productId: string;
  productTitle: string;
  currentStock: number;
  threshold: number;
  message: string;
  createdAt: Date;
};

const ALERT_THRESHOLDS = {
  LOW_STOCK: 10,
  OUT_OF_STOCK: 0,
  OVERSTOCK: 1000,
};

/**
 * Check inventory data and generate alerts
 */
export function generateInventoryAlerts(
  data: InventoryDashboardData
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  data.products.forEach((product) => {
    // Out of stock alert
    if (product.inventory <= ALERT_THRESHOLDS.OUT_OF_STOCK) {
      alerts.push({
        id: `${product.id}-out-of-stock`,
        type: "OUT_OF_STOCK",
        productId: product.id,
        productTitle: product.title,
        currentStock: product.inventory,
        threshold: ALERT_THRESHOLDS.OUT_OF_STOCK,
        message: `${product.title} is out of stock`,
        createdAt: new Date(),
      });
    }
    // Low stock alert
    else if (product.inventory <= ALERT_THRESHOLDS.LOW_STOCK) {
      alerts.push({
        id: `${product.id}-low-stock`,
        type: "LOW_STOCK",
        productId: product.id,
        productTitle: product.title,
        currentStock: product.inventory,
        threshold: ALERT_THRESHOLDS.LOW_STOCK,
        message: `${product.title} has low stock (${product.inventory} remaining)`,
        createdAt: new Date(),
      });
    }
    // Overstock alert
    else if (product.inventory >= ALERT_THRESHOLDS.OVERSTOCK) {
      alerts.push({
        id: `${product.id}-overstock`,
        type: "OVERSTOCK",
        productId: product.id,
        productTitle: product.title,
        currentStock: product.inventory,
        threshold: ALERT_THRESHOLDS.OVERSTOCK,
        message: `${product.title} may be overstocked (${product.inventory} units)`,
        createdAt: new Date(),
      });
    }
  });

  return alerts;
}

/**
 * Get alert priority (for sorting)
 */
export function getAlertPriority(type: AlertType): number {
  switch (type) {
    case "OUT_OF_STOCK":
      return 3;
    case "LOW_STOCK":
      return 2;
    case "OVERSTOCK":
      return 1;
    default:
      return 0;
  }
}

/**
 * Format alert for display
 */
export function formatAlert(alert: InventoryAlert): string {
  const emoji = {
    LOW_STOCK: "⚠️",
    OUT_OF_STOCK: "🚨",
    OVERSTOCK: "📦",
  }[alert.type];

  return `${emoji} ${alert.message}`;
}
