/**
 * Integration Tests for Enhanced Analytics Dashboard
 * Tests the complete integration of advanced analytics with the dashboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppProvider } from '@shopify/polaris';

import EnhancedAnalyticsDashboard from '../../components/inventory/EnhancedAnalyticsDashboard';
import RealTimeMonitoring from '../../components/inventory/RealTimeMonitoring';
import { enhancedAnalyticsService } from '../../lib/inventory/enhanced-analytics';

// Mock the enhanced analytics service
jest.mock('../../lib/inventory/enhanced-analytics', () => ({
  enhancedAnalyticsService: {
    generateDemandForecasts: jest.fn(),
    analyzeVendorPerformance: jest.fn(),
    generatePurchaseOrderRecommendations: jest.fn(),
    generateInsights: jest.fn(),
    getPerformanceMetrics: jest.fn()
  }
}));

// Mock data
const mockSkus = [
  {
    id: 'sku-1',
    sku: 'TEST-001',
    name: 'Test Product 1',
    onHand: 100,
    committed: 20,
    reorderPoint: 50,
    recommendedOrder: 200,
    unitCost: { amount: 10.00, currency: 'USD' },
    velocity: { lastWeekUnits: 25 },
    trend: [
      { date: '2024-01-01', units: 20 },
      { date: '2024-01-02', units: 25 },
      { date: '2024-01-03', units: 30 }
    ],
    status: 'healthy',
    bucketId: 'normal',
    coverDays: 30,
    vendorId: 'vendor-1'
  },
  {
    id: 'sku-2',
    sku: 'TEST-002',
    name: 'Test Product 2',
    onHand: 10,
    committed: 5,
    reorderPoint: 20,
    recommendedOrder: 100,
    unitCost: { amount: 15.00, currency: 'USD' },
    velocity: { lastWeekUnits: 15 },
    trend: [
      { date: '2024-01-01', units: 10 },
      { date: '2024-01-02', units: 15 },
      { date: '2024-01-03', units: 20 }
    ],
    status: 'low',
    bucketId: 'low_stock',
    coverDays: 5,
    vendorId: 'vendor-2'
  }
];

const mockForecasts = [
  {
    skuId: 'sku-1',
    skuName: 'Test Product 1',
    currentDemand: 25,
    forecastedDemand: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
    confidenceInterval: [20, 90] as [number, number],
    trend: 'increasing' as const,
    seasonalityStrength: 0.3,
    modelAccuracy: 0.85,
    nextReorderDate: '2024-02-01T00:00:00Z',
    recommendedOrderQuantity: 200,
    riskLevel: 'low' as const
  },
  {
    skuId: 'sku-2',
    skuName: 'Test Product 2',
    currentDemand: 15,
    forecastedDemand: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75],
    confidenceInterval: [15, 85] as [number, number],
    trend: 'increasing' as const,
    seasonalityStrength: 0.2,
    modelAccuracy: 0.80,
    nextReorderDate: '2024-01-15T00:00:00Z',
    recommendedOrderQuantity: 100,
    riskLevel: 'high' as const
  }
];

const mockVendorMetrics = [
  {
    vendorId: 'vendor-1',
    vendorName: 'Vendor 1',
    totalSkus: 1,
    averageLeadTime: 30,
    onTimeDeliveryRate: 0.95,
    qualityScore: 0.90,
    costEfficiency: 0.85,
    reliabilityScore: 0.88,
    responsivenessScore: 0.92,
    overallScore: 0.90,
    riskLevel: 'low' as const,
    recommendations: ['Maintain current performance'],
    performanceTrend: 'stable' as const,
    lastUpdated: '2024-01-15T10:00:00Z'
  },
  {
    vendorId: 'vendor-2',
    vendorName: 'Vendor 2',
    totalSkus: 1,
    averageLeadTime: 45,
    onTimeDeliveryRate: 0.70,
    qualityScore: 0.75,
    costEfficiency: 0.80,
    reliabilityScore: 0.72,
    responsivenessScore: 0.78,
    overallScore: 0.75,
    riskLevel: 'high' as const,
    recommendations: ['Improve delivery reliability', 'Reduce lead times'],
    performanceTrend: 'declining' as const,
    lastUpdated: '2024-01-15T10:00:00Z'
  }
];

const mockPurchaseOrders = [
  {
    poId: 'PO-vendor-1-1234567890',
    vendorId: 'vendor-1',
    vendorName: 'Vendor 1',
    totalAmount: 2000.00,
    items: [
      {
        skuId: 'sku-1',
        skuName: 'Test Product 1',
        quantity: 200,
        unitCost: 10.00,
        totalCost: 2000.00,
        vendorId: 'vendor-1',
        vendorName: 'Vendor 1',
        leadTimeDays: 30,
        priority: 'medium' as const,
        reason: 'Standard reorder',
        reorderPoint: 50,
        currentStock: 100,
        forecastedDemand: 30
      }
    ],
    priority: 'medium' as const,
    status: 'draft' as const,
    createdDate: '2024-01-15T10:00:00Z',
    requestedDeliveryDate: '2024-02-15T00:00:00Z',
    notes: 'Standard reorder',
    approvalRequired: false
  }
];

const mockInsights = [
  {
    id: 'insight-1',
    type: 'risk' as const,
    priority: 'high' as const,
    title: 'Stockout Risk Detected',
    description: '1 SKUs are at risk of stockout',
    impact: 'Potential lost sales and customer dissatisfaction',
    action: 'Expedite reorder for at-risk SKUs',
    skuIds: ['sku-2'],
    estimatedValue: 1500.00,
    confidence: 0.9,
    createdAt: '2024-01-15T10:00:00Z'
  }
];

const mockPerformanceMetrics = {
  totalSkus: 2,
  processedSkus: 2,
  averageProcessingTime: 75.5,
  memoryUsage: 150.25,
  cacheHitRate: 0.85,
  errorRate: 0.02,
  lastUpdated: '2024-01-15T10:00:00Z'
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider i18n={{}}>
    {children}
  </AppProvider>
);

describe('Enhanced Analytics Dashboard Integration', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    (enhancedAnalyticsService.generateDemandForecasts as jest.Mock).mockResolvedValue(mockForecasts);
    (enhancedAnalyticsService.analyzeVendorPerformance as jest.Mock).mockResolvedValue(mockVendorMetrics);
    (enhancedAnalyticsService.generatePurchaseOrderRecommendations as jest.Mock).mockResolvedValue(mockPurchaseOrders);
    (enhancedAnalyticsService.generateInsights as jest.Mock).mockResolvedValue(mockInsights);
    (enhancedAnalyticsService.getPerformanceMetrics as jest.Mock).mockReturnValue(mockPerformanceMetrics);
  });

  describe('EnhancedAnalyticsDashboard', () => {
    it('renders all dashboard tabs correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Demand Forecasts')).toBeInTheDocument();
        expect(screen.getByText('Vendor Performance')).toBeInTheDocument();
        expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
        expect(screen.getByText('Insights')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
      });
    });

    it('loads and displays demand forecasts correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Wait for forecasts to load
      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.getByText('Test Product 2')).toBeInTheDocument();
        expect(screen.getByText('increasing')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('displays vendor performance metrics correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Switch to vendor performance tab
      fireEvent.click(screen.getByText('Vendor Performance'));

      await waitFor(() => {
        expect(screen.getByText('Vendor 1')).toBeInTheDocument();
        expect(screen.getByText('Vendor 2')).toBeInTheDocument();
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('70%')).toBeInTheDocument();
      });
    });

    it('shows purchase order recommendations correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Switch to purchase orders tab
      fireEvent.click(screen.getByText('Purchase Orders'));

      await waitFor(() => {
        expect(screen.getByText('PO-vendor-1-1234567890')).toBeInTheDocument();
        expect(screen.getByText('$2,000')).toBeInTheDocument();
        expect(screen.getByText('medium')).toBeInTheDocument();
        expect(screen.getByText('draft')).toBeInTheDocument();
      });
    });

    it('displays actionable insights correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Switch to insights tab
      fireEvent.click(screen.getByText('Insights'));

      await waitFor(() => {
        expect(screen.getByText('Stockout Risk Detected')).toBeInTheDocument();
        expect(screen.getByText('1 SKUs are at risk of stockout')).toBeInTheDocument();
        expect(screen.getByText('Potential lost sales and customer dissatisfaction')).toBeInTheDocument();
        expect(screen.getByText('$1,500')).toBeInTheDocument();
      });
    });

    it('shows performance metrics correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Switch to performance tab
      fireEvent.click(screen.getByText('Performance'));

      await waitFor(() => {
        expect(screen.getByText('75.50ms')).toBeInTheDocument();
        expect(screen.getByText('150.25MB')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
      });
    });

    it('handles refresh action correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Click refresh button
      fireEvent.click(screen.getByText('Refresh Data'));

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
        expect(enhancedAnalyticsService.generateDemandForecasts).toHaveBeenCalledTimes(2);
      });
    });

    it('handles purchase order modal correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Switch to purchase orders tab
      fireEvent.click(screen.getByText('Purchase Orders'));

      await waitFor(() => {
        expect(screen.getByText('View')).toBeInTheDocument();
      });

      // Click view button
      fireEvent.click(screen.getByText('View'));

      await waitFor(() => {
        expect(screen.getByText('Purchase Order Details')).toBeInTheDocument();
        expect(screen.getByText('PO-vendor-1-1234567890')).toBeInTheDocument();
        expect(screen.getByText('Vendor 1')).toBeInTheDocument();
        expect(screen.getByText('$2,000')).toBeInTheDocument();
      });
    });

    it('handles filtering correctly', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Click filters button
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Risk Level')).toBeInTheDocument();
        expect(screen.getByText('Low Risk')).toBeInTheDocument();
        expect(screen.getByText('Medium Risk')).toBeInTheDocument();
        expect(screen.getByText('High Risk')).toBeInTheDocument();
      });
    });
  });

  describe('RealTimeMonitoring', () => {
    it('renders monitoring dashboard correctly', () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeMonitoring
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Real-Time Monitoring')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Monitoring Controls')).toBeInTheDocument();
    });

    it('displays system health status correctly', () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeMonitoring
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Uptime')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('shows performance metrics correctly', () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeMonitoring
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Processing Time')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
    });

    it('handles auto-refresh toggle correctly', () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeMonitoring
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      const autoRefreshCheckbox = screen.getByLabelText('Auto Refresh');
      expect(autoRefreshCheckbox).toBeChecked();

      fireEvent.click(autoRefreshCheckbox);
      expect(autoRefreshCheckbox).not.toBeChecked();
    });

    it('handles refresh interval change correctly', () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeMonitoring
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      const refreshIntervalSelect = screen.getByDisplayValue('5 seconds');
      expect(refreshIntervalSelect).toBeInTheDocument();

      fireEvent.change(refreshIntervalSelect, { target: { value: '10000' } });
      expect(refreshIntervalSelect).toHaveValue('10000');
    });
  });

  describe('Error Handling', () => {
    it('handles analytics service errors gracefully', async () => {
      const mockOnRefresh = jest.fn();
      
      // Mock service to throw error
      (enhancedAnalyticsService.generateDemandForecasts as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading analytics data')).toBeInTheDocument();
      });
    });

    it('handles empty data gracefully', async () => {
      const mockOnRefresh = jest.fn();
      
      // Mock service to return empty data
      (enhancedAnalyticsService.generateDemandForecasts as jest.Mock).mockResolvedValue([]);
      (enhancedAnalyticsService.analyzeVendorPerformance as jest.Mock).mockResolvedValue([]);
      (enhancedAnalyticsService.generatePurchaseOrderRecommendations as jest.Mock).mockResolvedValue([]);
      (enhancedAnalyticsService.generateInsights as jest.Mock).mockResolvedValue([]);

      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={[]}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Enhanced Analytics Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('loads data efficiently with large datasets', async () => {
      const mockOnRefresh = jest.fn();
      const largeSkus = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSkus[0],
        id: `sku-${i}`,
        sku: `TEST-${i.toString().padStart(3, '0')}`
      }));

      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={largeSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Should handle large datasets without performance issues
      await waitFor(() => {
        expect(enhancedAnalyticsService.generateDemandForecasts).toHaveBeenCalledWith(largeSkus);
      });
    });

    it('caches data appropriately', async () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedAnalyticsDashboard
            skus={mockSkus}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(enhancedAnalyticsService.generateDemandForecasts).toHaveBeenCalledTimes(1);
      });

      // Refresh should use cached data
      fireEvent.click(screen.getByText('Refresh Data'));

      await waitFor(() => {
        expect(enhancedAnalyticsService.generateDemandForecasts).toHaveBeenCalledTimes(2);
      });
    });
  });
});
