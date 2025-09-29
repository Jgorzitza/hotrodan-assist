import { Card, BlockStack, Text, InlineStack, Badge } from "@shopify/polaris";

export type CohortData = {
  cohort: string; // Signup month
  size: number; // Number of customers in cohort
  retention: number[]; // Retention rates for each period
  periods: string[]; // Period labels (Month 0, Month 1, etc.)
};

type CohortAnalysisProps = {
  data: CohortData[];
  isLoading?: boolean;
};

export function CohortAnalysis({ data, isLoading = false }: CohortAnalysisProps) {
  if (isLoading) {
    return <CohortAnalysisSkeleton />;
  }

  const maxRetention = Math.max(...data.flatMap(cohort => cohort.retention));
  const minRetention = Math.min(...data.flatMap(cohort => cohort.retention));

  const getRetentionColor = (retention: number) => {
    if (retention === 0) return "#f6f6f7";
    if (retention === 100) return "#008060";
    
    const intensity = (retention - minRetention) / (maxRetention - minRetention);
    const hue = 120 * intensity; // Green hue based on intensity
    return `hsl(${hue}, 70%, 50%)`;
  };

  const getRetentionTextColor = (retention: number) => {
    return retention > 50 ? "#ffffff" : "#000000";
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          Customer Cohort Analysis
        </Text>
        
        <Text as="p" variant="bodySm" tone="subdued">
          Customer retention by signup month and time since signup
        </Text>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e1e3e5" }}>
                  <Text as="span" variant="bodySm" fontWeight="semibold">
                    Cohort
                  </Text>
                </th>
                <th style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #e1e3e5" }}>
                  <Text as="span" variant="bodySm" fontWeight="semibold">
                    Size
                  </Text>
                </th>
                {data[0]?.periods.map((period, index) => (
                  <th key={period} style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #e1e3e5" }}>
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      {period}
                    </Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort) => (
                <tr key={cohort.cohort}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f6f6f7" }}>
                    <Text as="span" variant="bodySm">
                      {cohort.cohort}
                    </Text>
                  </td>
                  <td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #f6f6f7" }}>
                    <Badge tone="info">
                      {cohort.size.toLocaleString()}
                    </Badge>
                  </td>
                  {cohort.retention.map((rate, index) => (
                    <td key={index} style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #f6f6f7" }}>
                      <div
                        style={{
                          backgroundColor: getRetentionColor(rate),
                          color: getRetentionTextColor(rate),
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          minWidth: "40px",
                          display: "inline-block",
                        }}
                      >
                        {rate > 0 ? `${rate.toFixed(1)}%` : "-"}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Text as="span" variant="bodySm" tone="subdued">
            Legend:
          </Text>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: "#f6f6f7", borderRadius: "2px" }} />
            <Text as="span" variant="bodySm">0%</Text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: "#008060", borderRadius: "2px" }} />
            <Text as="span" variant="bodySm">100%</Text>
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}

export function CohortAnalysisSkeleton() {
  return (
    <Card>
      <BlockStack gap="400">
        <div style={{ width: "200px", height: "20px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
        <div style={{ width: "300px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e1e3e5" }}>
                  <div style={{ width: "60px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
                </th>
                <th style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #e1e3e5" }}>
                  <div style={{ width: "40px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
                </th>
                {Array.from({ length: 6 }, (_, i) => (
                  <th key={i} style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #e1e3e5" }}>
                    <div style={{ width: "50px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <tr key={rowIndex}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f6f6f7" }}>
                    <div style={{ width: "60px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
                  </td>
                  <td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #f6f6f7" }}>
                    <div style={{ width: "40px", height: "16px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
                  </td>
                  {Array.from({ length: 6 }, (_, colIndex) => (
                    <td key={colIndex} style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #f6f6f7" }}>
                      <div style={{ width: "40px", height: "20px", backgroundColor: "#e1e3e5", borderRadius: "4px" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlockStack>
    </Card>
  );
}
