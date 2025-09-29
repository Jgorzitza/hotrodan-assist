import type { EnhancedMetricData } from "~/components/EnhancedMetricCard";
import type { CohortData } from "~/components/CohortAnalysis";

export type ExportFormat = "csv" | "png" | "pdf";

export type ExportOptions = {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  dateRange?: string;
  compareRange?: string;
};

export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape CSV values
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv");
}

export function exportMetricsToCSV(metrics: EnhancedMetricData[], filename: string): void {
  const csvData = metrics.map(metric => ({
    Metric: metric.label,
    Value: metric.value,
    "Delta %": metric.delta.toFixed(1),
    "Delta Period": metric.deltaPeriod,
    Format: metric.format || "number",
  }));

  exportToCSV(csvData, filename);
}

export function exportCohortToCSV(cohortData: CohortData[], filename: string): void {
  if (!cohortData || cohortData.length === 0) {
    console.warn("No cohort data to export");
    return;
  }

  const maxPeriods = Math.max(...cohortData.map(cohort => cohort.retention.length));
  const headers = ["Cohort", "Size", ...Array.from({ length: maxPeriods }, (_, i) => `Month ${i}`)];
  
  const csvData = cohortData.map(cohort => {
    const row: Record<string, any> = {
      Cohort: cohort.cohort,
      Size: cohort.size,
    };
    
    for (let i = 0; i < maxPeriods; i++) {
      row[`Month ${i}`] = cohort.retention[i] ? `${cohort.retention[i].toFixed(1)}%` : "";
    }
    
    return row;
  });

  exportToCSV(csvData, filename);
}

export function exportToPNG(element: HTMLElement, filename: string): void {
  if (!element) {
    console.warn("No element to export");
    return;
  }

  // Use html2canvas if available, otherwise fallback to basic screenshot
  if (typeof window !== "undefined" && (window as any).html2canvas) {
    (window as any).html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    }).then((canvas: HTMLCanvasElement) => {
      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `${filename}.png`, "image/png");
        }
      });
    });
  } else {
    // Fallback: try to capture using canvas
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = element.offsetWidth;
      canvas.height = element.offsetHeight;
      
      // This is a basic fallback - in production, you'd want to use a proper library
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `${filename}.png`, "image/png");
        }
      });
    } catch (error) {
      console.error("Failed to export PNG:", error);
    }
  }
}

export function exportToPDF(element: HTMLElement, filename: string, options?: { title?: string; dateRange?: string }): void {
  if (!element) {
    console.warn("No element to export");
    return;
  }

  // Use jsPDF if available
  if (typeof window !== "undefined" && (window as any).jsPDF) {
    const { jsPDF } = (window as any);
    const doc = new jsPDF("p", "mm", "a4");
    
    // Add title
    if (options?.title) {
      doc.setFontSize(16);
      doc.text(options.title, 20, 20);
    }
    
    // Add date range
    if (options?.dateRange) {
      doc.setFontSize(10);
      doc.text(`Date Range: ${options.dateRange}`, 20, 30);
    }
    
    // Add content (this is a simplified version)
    doc.setFontSize(12);
    doc.text("Dashboard Export", 20, 50);
    doc.text("Generated on: " + new Date().toLocaleDateString(), 20, 60);
    
    doc.save(`${filename}.pdf`);
  } else {
    // Fallback: convert to PNG and embed in PDF
    console.warn("jsPDF not available, falling back to PNG export");
    exportToPNG(element, filename);
  }
}

export function exportDashboardData(
  metrics: EnhancedMetricData[],
  cohortData: CohortData[],
  format: ExportFormat,
  filename: string,
  options?: ExportOptions
): void {
  const timestamp = new Date().toISOString().split("T")[0];
  const fullFilename = `${filename}-${timestamp}`;

  switch (format) {
    case "csv":
      // Export metrics and cohort data as separate CSV files
      exportMetricsToCSV(metrics, `${fullFilename}-metrics`);
      exportCohortToCSV(cohortData, `${fullFilename}-cohorts`);
      break;
    case "png":
      // Export dashboard screenshot
      const dashboardElement = document.querySelector("[data-dashboard-export]") as HTMLElement;
      if (dashboardElement) {
        exportToPNG(dashboardElement, fullFilename);
      }
      break;
    case "pdf":
      // Export dashboard as PDF
      const pdfElement = document.querySelector("[data-dashboard-export]") as HTMLElement;
      if (pdfElement) {
        exportToPDF(pdfElement, fullFilename, {
          title: "Dashboard Export",
          dateRange: options?.dateRange,
        });
      }
      break;
    default:
      console.warn(`Unsupported export format: ${format}`);
  }
}

function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generateExportFilename(prefix: string, format: ExportFormat): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `${prefix}-${timestamp}`;
}

export function validateExportData(data: any[]): boolean {
  return Array.isArray(data) && data.length > 0;
}
