import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { fetchInventoryDashboard } from '~/lib/shopify/inventory.server';

/**
 * API endpoint for real-time inventory metrics
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const data = await fetchInventoryDashboard(admin);

    return json({
      metrics: data.metrics,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return json(
      {
        metrics: {
          totalProducts: 0,
          lowStockCount: 0,
          totalSKUs: 0,
        },
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch inventory metrics',
      },
      { status: 500 }
    );
  }
};
