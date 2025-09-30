import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { fetchInventoryDashboard } from "~/lib/shopify/inventory.server";
import { generateInventoryAlerts } from "~/lib/inventory/alerts.server";
import { sendLowStockAlerts, getDefaultEmailConfig } from "~/lib/notifications/email-alerts.server";

/**
 * API endpoint to manually trigger alert emails
 * Can be called via cron job or manually
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    // Fetch current inventory data
    const inventoryData = await fetchInventoryDashboard(admin);
    
    // Generate alerts
    const alerts = generateInventoryAlerts(inventoryData);
    
    // Send email if alerts exist
    const config = getDefaultEmailConfig();
    const result = await sendLowStockAlerts(alerts, config);
    
    return json({
      success: true,
      alertsSent: result.sent,
      alertCount: alerts.length,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
};
