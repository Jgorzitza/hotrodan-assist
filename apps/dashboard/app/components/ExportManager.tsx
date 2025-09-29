import { 
  Card, 
  BlockStack, 
  Text, 
  Button, 
  InlineStack, 
  Select,
  Badge,
  ButtonGroup,
  Popover,
  ActionList,
  Banner
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { 
  exportDashboardData,
  exportMetricsToCSV,
  exportCohortToCSV,
  exportToPNG,
  exportToPDF,
  generateExportFilename,
  type ExportFormat,
  type ExportOptions
} from "~/lib/export-utils";
import type { EnhancedMetricData } from "~/components/EnhancedMetricCard";
import type { CohortData } from "~/components/CohortAnalysis";

type ExportManagerProps = {
  metrics: EnhancedMetricData[];
  cohortData: CohortData[];
  dateRange: string;
  compareRange?: string;
  dashboardElement?: HTMLElement;
};

export function ExportManager({ 
  metrics, 
  cohortData, 
  dateRange, 
  compareRange,
  dashboardElement 
}: ExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    
    try {
      const filename = generateExportFilename("dashboard", format);
      const options: ExportOptions = {
        format,
        filename,
        includeMetadata: true,
        dateRange,
        compareRange,
      };

      if (format === "csv") {
        // Export both metrics and cohort data
        exportMetricsToCSV(metrics, `${filename}-metrics`);
        exportCohortToCSV(cohortData, `${filename}-cohorts`);
      } else if (format === "png" && dashboardElement) {
        exportToPNG(dashboardElement, filename);
      } else if (format === "pdf" && dashboardElement) {
        exportToPDF(dashboardElement, filename, {
          title: "Dashboard Export",
          dateRange,
        });
      } else {
        // Fallback to full dashboard export
        exportDashboardData(metrics, cohortData, format, filename, options);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [metrics, cohortData, dateRange, compareRange, dashboardElement]);

  const exportOptions = [
    {
      label: "CSV (Data)",
      value: "csv",
      description: "Export metrics and cohort data as CSV files",
    },
    {
      label: "PNG (Image)",
      value: "png",
      description: "Export dashboard as PNG image",
    },
    {
      label: "PDF (Document)",
      value: "pdf",
      description: "Export dashboard as PDF document",
    },
  ];

  const quickExportActions = [
    {
      content: "Export Metrics CSV",
      onAction: () => {
        const filename = generateExportFilename("metrics", "csv");
        exportMetricsToCSV(metrics, filename);
      },
    },
    {
      content: "Export Cohort CSV",
      onAction: () => {
        const filename = generateExportFilename("cohorts", "csv");
        exportCohortToCSV(cohortData, filename);
      },
    },
    {
      content: "Export Dashboard PNG",
      onAction: () => {
        if (dashboardElement) {
          const filename = generateExportFilename("dashboard", "png");
          exportToPNG(dashboardElement, filename);
        }
      },
      disabled: !dashboardElement,
    },
    {
      content: "Export Dashboard PDF",
      onAction: () => {
        if (dashboardElement) {
          const filename = generateExportFilename("dashboard", "pdf");
          exportToPDF(dashboardElement, filename, {
            title: "Dashboard Export",
            dateRange,
          });
        }
      },
      disabled: !dashboardElement,
    },
  ];

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            Export Dashboard
          </Text>
          <ButtonGroup>
            <Select
              options={exportOptions}
              value={exportFormat}
              onChange={(value) => setExportFormat(value as ExportFormat)}
            />
            <Button 
              onClick={() => handleExport(exportFormat)}
              loading={isExporting}
              disabled={isExporting}
            >
              Export
            </Button>
            <Popover
              active={isPopoverOpen}
              activator={
                <Button onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
                  Quick Export
                </Button>
              }
              onClose={() => setIsPopoverOpen(false)}
            >
              <ActionList items={quickExportActions} />
            </Popover>
          </ButtonGroup>
        </InlineStack>

        <Text as="p" variant="bodySm" tone="subdued">
          Export dashboard data and visualizations in various formats
        </Text>

        <InlineStack gap="200" wrap={false}>
          <Badge tone="info">
            {metrics.length} metrics
          </Badge>
          <Badge tone="info">
            {cohortData.length} cohorts
          </Badge>
          <Badge tone="info">
            {dateRange} range
          </Badge>
          {compareRange && (
            <Badge tone="info">
              vs {compareRange}
            </Badge>
          )}
        </InlineStack>

        {exportFormat === "csv" && (
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              CSV export will create separate files for metrics and cohort data.
            </Text>
          </Banner>
        )}

        {exportFormat === "png" && !dashboardElement && (
          <Banner tone="warning">
            <Text as="p" variant="bodySm">
              PNG export requires a dashboard element reference. This feature may not work in all contexts.
            </Text>
          </Banner>
        )}

        {exportFormat === "pdf" && !dashboardElement && (
          <Banner tone="warning">
            <Text as="p" variant="bodySm">
              PDF export requires a dashboard element reference. This feature may not work in all contexts.
            </Text>
          </Banner>
        )}
      </BlockStack>
    </Card>
  );
}

export function ExportButton({ 
  data, 
  format, 
  filename, 
  children 
}: { 
  data: any[]; 
  format: ExportFormat; 
  filename: string; 
  children: React.ReactNode; 
}) {
  const handleExport = useCallback(() => {
    if (format === "csv") {
      exportToCSV(data, filename);
    } else {
      console.warn(`Export format ${format} not supported for this component`);
    }
  }, [data, format, filename]);

  return (
    <Button onClick={handleExport}>
      {children}
    </Button>
  );
}
