import { useState, useEffect } from 'react';
import { SparkLineChart } from '@shopify/polaris-viz';
import type { DataPoint } from '@shopify/polaris-viz-core';

interface ClientOnlySparkLineChartProps {
  data: DataPoint[];
  accessibilityLabel: string;
  rangeLabel: string;
}

export function ClientOnlySparkLineChart({ 
  data, 
  accessibilityLabel, 
  rangeLabel 
}: ClientOnlySparkLineChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return skeleton during SSR
    return (
      <div style={{ width: "100%", height: 160 }}>
        <div style={{ 
          width: "100%", 
          height: "100%", 
          backgroundColor: "#f6f6f7", 
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6d7175"
        }}>
          Loading chart...
        </div>
      </div>
    );
  }

  const dataset = [{
    name: "Sales",
    data: data,
  }];

  return (
    <div style={{ width: "100%", height: 160 }}>
      <SparkLineChart
        accessibilityLabel={accessibilityLabel}
        data={dataset}
        isAnimated={false}
      />
    </div>
  );
}
