import { Card, BlockStack, Text, Badge, InlineStack } from "@shopify/polaris";
import { SparkLineChart } from "@shopify/polaris-viz";
import type { DataPoint } from "@shopify/polaris-viz-core";

export type EnhancedMetricData = {
  id: string;
  label: string;
  value: string | number;
  delta: number;
  deltaPeriod: string;
  sparklineData: number[];
  format?: "currency" | "percentage" | "number";
  trend?: "up" | "down" | "neutral";
};

type EnhancedMetricCardProps = {
  metric: EnhancedMetricData;
  onClick?: () => void;
};

export function EnhancedMetricCard({ metric, onClick }: EnhancedMetricCardProps) {
  const formatValue = (value: string | number, format?: string) => {
    if (typeof value === "string") return value;
    
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "number":
        return new Intl.NumberFormat("en-US").format(value);
      default:
        return value.toString();
    }
  };

  const getTrendColor = (delta: number) => {
    if (delta > 0) return "success";
    if (delta < 0) return "critical";
    return "info";
  };

  const getTrendIcon = (delta: number) => {
    if (delta > 0) return "↗";
    if (delta < 0) return "↘";
    return "→";
  };

  const sparklinePoints: DataPoint[] = metric.sparklineData.map((value, index) => ({
    key: index,
    value,
  }));

  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodySm" tone="subdued">
            {metric.label}
          </Text>
          <Badge tone={getTrendColor(metric.delta)}>
            {getTrendIcon(metric.delta)} {Math.abs(metric.delta).toFixed(1)}%
          </Badge>
        </InlineStack>
        
        <Text as="p" variant="headingLg">
          {formatValue(metric.value, metric.format)}
        </Text>
        
        <Text as="span" variant="bodySm" tone="subdued">
          vs {metric.deltaPeriod}
        </Text>
        
        <div style={{ height: "60px", width: "100%" }}>
          <SparkLineChart
            data={sparklinePoints}
            isAnimated={false}
            accessibilityLabel={`${metric.label} trend`}
          />
        </div>
      </BlockStack>
    </Card>
  );
}

export function EnhancedMetricCardSkeleton() {
  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <div style={{ width: "60px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
          <div style={{ width: "40px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
        </InlineStack>
        
        <div style={{ width: "80px", height: "24px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
        
        <div style={{ width: "100px", height: "14px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
        
        <div style={{ height: "60px", width: "100%", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
      </BlockStack>
    </Card>
  );
}
