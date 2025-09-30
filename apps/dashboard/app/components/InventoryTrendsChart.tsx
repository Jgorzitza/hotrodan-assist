import { Card, BlockStack, Text } from '@shopify/polaris';
import { LineChart } from '@shopify/polaris-viz';
import type { DataSeries } from '@shopify/polaris-viz';

type TrendDataPoint = {
  date: string;
  totalInventory: number;
  lowStockCount: number;
};

type InventoryTrendsChartProps = {
  data: TrendDataPoint[];
  title?: string;
};

/**
 * Inventory Trends Chart Component
 * Visualizes inventory levels over time
 */
export function InventoryTrendsChart({
  data,
  title = 'Inventory Trends (Last 30 Days)',
}: InventoryTrendsChartProps) {
  const series: DataSeries[] = [
    {
      name: 'Total Inventory',
      data: data.map(d => ({
        key: d.date,
        value: d.totalInventory,
      })),
      color: '#006fbb',
    },
    {
      name: 'Low Stock Items',
      data: data.map(d => ({
        key: d.date,
        value: d.lowStockCount,
      })),
      color: '#bf0711',
    },
  ];

  return (
    <Card>
      <BlockStack gap='400'>
        <Text variant='headingMd' as='h2'>
          {title}
        </Text>
        {data.length > 0 ? (
          <LineChart data={series} theme='Light' isAnimated />
        ) : (
          <Text tone='subdued'>No trend data available</Text>
        )}
      </BlockStack>
    </Card>
  );
}
