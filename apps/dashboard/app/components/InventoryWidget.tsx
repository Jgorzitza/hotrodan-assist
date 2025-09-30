import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  ProgressBar,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';

type InventoryMetrics = {
  totalProducts: number;
  lowStockCount: number;
  totalSKUs: number;
};

type InventoryWidgetProps = {
  initialMetrics: InventoryMetrics;
  refreshInterval?: number; // milliseconds
};

/**
 * Real-time Inventory Dashboard Widget
 * Auto-refreshes to show current inventory status
 */
export function InventoryWidget({
  initialMetrics,
  refreshInterval = 30000, // 30 seconds default
}: InventoryWidgetProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Fetch fresh metrics from the API
        const response = await fetch('/api/inventory/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
          setLastUpdate(new Date());
        }
      } catch {
        // Silent fail - keep showing last known data
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const lowStockPercentage =
    metrics.totalProducts > 0
      ? (metrics.lowStockCount / metrics.totalProducts) * 100
      : 0;

  const stockHealth =
    lowStockPercentage < 5
      ? 'success'
      : lowStockPercentage < 15
        ? 'attention'
        : 'critical';

  return (
    <Card>
      <BlockStack gap='400'>
        <InlineStack align='space-between'>
          <Text variant='headingMd' as='h2'>
            Inventory Status
          </Text>
          <Text variant='bodySm' tone='subdued'>
            Updated {lastUpdate.toLocaleTimeString()}
          </Text>
        </InlineStack>

        <BlockStack gap='300'>
          <InlineStack align='space-between'>
            <Text variant='bodyMd'>Total Products</Text>
            <Text variant='headingLg'>{metrics.totalProducts}</Text>
          </InlineStack>

          <InlineStack align='space-between'>
            <Text variant='bodyMd'>Low Stock Items</Text>
            <InlineStack gap='200' align='end'>
              <Text variant='headingLg'>{metrics.lowStockCount}</Text>
              <Badge
                tone={
                  stockHealth === 'success'
                    ? 'success'
                    : stockHealth === 'attention'
                      ? 'attention'
                      : 'critical'
                }
              >
                {lowStockPercentage.toFixed(1)}%
              </Badge>
            </InlineStack>
          </InlineStack>

          <BlockStack gap='200'>
            <Text variant='bodySm' tone='subdued'>
              Stock Health
            </Text>
            <ProgressBar
              progress={100 - lowStockPercentage}
              tone={stockHealth}
              size='small'
            />
          </BlockStack>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
