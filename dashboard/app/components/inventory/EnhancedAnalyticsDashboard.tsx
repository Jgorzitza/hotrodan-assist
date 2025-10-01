/**
 * Enhanced Analytics Dashboard Component
 * Integrates all advanced analytics features into a comprehensive dashboard
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Page,
  Layout,
  Text,
  Button,
  Badge,
  DataTable,
  ButtonGroup,
  Modal,
  ChoiceList,
  FormLayout,
  Tabs,
  Spinner,
  Toast,
  // Non-standard stack components used throughout this file
  BlockBlockStack,
  InlineBlockStack,
  InlineGrid,
  List,
} from '@shopify/polaris';

import {
  enhancedAnalyticsService,
  type AdvancedDemandForecast,
  type VendorPerformanceMetrics,
  type PurchaseOrderRecommendation,
  type InventoryInsight,
  type PerformanceMetrics
} from '../../lib/inventory/enhanced-analytics';

import type { InventorySkuDemand } from '../../types/dashboard';

interface EnhancedAnalyticsDashboardProps {
  skus: InventorySkuDemand[];
  onRefresh: () => void;
  isLoading?: boolean;
}

interface DashboardState {
  activeTab: number;
  forecasts: AdvancedDemandForecast[];
  vendorMetrics: VendorPerformanceMetrics[];
  purchaseOrders: PurchaseOrderRecommendation[];
  insights: InventoryInsight[];
  performanceMetrics: PerformanceMetrics | null;
  selectedSkus: string[];
  filters: {
    riskLevel: string[];
    vendor: string[];
    priority: string[];
    dateRange: [Date, Date];
  };
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
  showFilters: boolean;
  showPurchaseOrderModal: boolean;
  selectedPurchaseOrder: PurchaseOrderRecommendation | null;
}

const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
  skus,
  onRefresh,
  isLoading = false
}) => {
  const [state, setState] = useState<DashboardState>({
    activeTab: 0,
    forecasts: [],
    vendorMetrics: [],
    purchaseOrders: [],
    insights: [],
    performanceMetrics: null,
    selectedSkus: [],
    filters: {
      riskLevel: [],
      vendor: [],
      priority: [],
      dateRange: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()]
    },
    sortBy: 'skuName',
    sortDirection: 'asc',
    page: 1,
    pageSize: 25,
    showFilters: false,
    showPurchaseOrderModal: false,
    selectedPurchaseOrder: null
  });

  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);

  // Load data on component mount and when SKUs change
  const loadAnalyticsData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Load all analytics data in parallel
      const [forecasts, vendorMetrics, purchaseOrders, insights, performanceMetrics] = await Promise.all([
        enhancedAnalyticsService.generateDemandForecasts(skus),
        enhancedAnalyticsService.analyzeVendorPerformance(skus),
        enhancedAnalyticsService.generatePurchaseOrderRecommendations(skus),
        enhancedAnalyticsService.generateInsights(skus),
        Promise.resolve(enhancedAnalyticsService.getPerformanceMetrics())
      ]);

      setState(prev => ({
        ...prev,
        forecasts,
        vendorMetrics,
        purchaseOrders,
        insights,
        performanceMetrics,
        isLoading: false
      }));

      setToast({ content: 'Analytics data loaded successfully' });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setToast({ content: 'Error loading analytics data', error: true });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [skus]);

  useEffect(() => {
    if (skus.length > 0) {
      loadAnalyticsData();
    }
  }, [skus, loadAnalyticsData]);

  const handleRefresh = () => {
    onRefresh();
    loadAnalyticsData();
  };

  const handleTabChange = (activeTab: number) => {
    setState(prev => ({ ...prev, activeTab }));
  };

  const handleFilterChange = (key: keyof DashboardState['filters'], value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      page: 1
    }));
  };


  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, page }));
  };

  const handlePurchaseOrderAction = (action: 'view' | 'approve' | 'reject', po: PurchaseOrderRecommendation) => {
    if (action === 'view') {
      setState(prev => ({
        ...prev,
        selectedPurchaseOrder: po,
        showPurchaseOrderModal: true
      }));
    } else {
      // Handle approve/reject logic
      setToast({ content: `Purchase order ${action}d successfully` });
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = state.forecasts;

    // Apply filters
    if (state.filters.riskLevel.length > 0) {
      filtered = filtered.filter(forecast => 
        state.filters.riskLevel.includes(forecast.riskLevel)
      );
    }

    if (state.filters.vendor.length > 0) {
      filtered = filtered.filter(forecast => 
        state.filters.vendor.includes(forecast.skuId) // This would need proper vendor mapping
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[state.sortBy as keyof AdvancedDemandForecast];
      const bValue = b[state.sortBy as keyof AdvancedDemandForecast];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return state.sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return state.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [state.forecasts, state.filters, state.sortBy, state.sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    return filteredAndSortedData.slice(start, end);
  }, [filteredAndSortedData, state.page, state.pageSize]);

  const totalPages = Math.ceil(filteredAndSortedData.length / state.pageSize);

  // Tab content components
  const renderDemandForecasts = () => (
    <Card>
      <BlockBlockStack gap="400">
        <InlineBlockStack align="space-between">
          <Text>Demand Forecasts</Text>
          <ButtonGroup>
            <Button onClick={handleRefresh} loading={state.isLoading}>
              Refresh
            </Button>
            <Button onClick={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}>
              Filters
            </Button>
          </ButtonGroup>
        </InlineBlockStack>

        {state.showFilters && (
          <Card>
            <FormLayout>
              <ChoiceList
                title="Risk Level"
                choices={[
                  { label: 'Low Risk', value: 'low' },
                  { label: 'Medium Risk', value: 'medium' },
                  { label: 'High Risk', value: 'high' }
                ]}
                selected={state.filters.riskLevel}
                onChange={(value) => handleFilterChange('riskLevel', value)}
                allowMultiple
              />
            </FormLayout>
          </Card>
        )}

        <DataTable
          columnContentTypes={['text', 'text', 'numeric', 'text', 'numeric', 'text', 'text']}
          headings={['SKU', 'Name', 'Current Demand', 'Trend', 'Confidence', 'Risk Level', 'Next Reorder']}
          rows={paginatedData.map(forecast => [
            forecast.skuId,
            forecast.skuName,
            forecast.currentDemand.toString(),
            forecast.trend,
            `${Math.round(forecast.modelAccuracy * 100)}%`,
            <Badge key={`risk-${forecast.skuId}`} status={forecast.riskLevel === 'high' ? 'critical' : forecast.riskLevel === 'medium' ? 'warning' : 'success'}>
              {forecast.riskLevel}
            </Badge>,
            new Date(forecast.nextReorderDate).toLocaleDateString()
          ])}
          pagination={{
            hasNext: state.page < totalPages,
            hasPrevious: state.page > 1,
            onNext: () => handlePageChange(state.page + 1),
            onPrevious: () => handlePageChange(state.page - 1)
          }}
        />
      </BlockBlockStack>
    </Card>
  );

  const renderVendorPerformance = () => (
    <Card>
      <BlockBlockStack gap="400">
        <Text>Vendor Performance</Text>
        <DataTable
          columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric', 'numeric', 'text']}
          headings={['Vendor', 'SKUs', 'On-Time Delivery', 'Quality Score', 'Cost Efficiency', 'Overall Score', 'Risk Level']}
          rows={state.vendorMetrics.map(vendor => [
            vendor.vendorName,
            vendor.vendorId,
            `${Math.round(vendor.onTimeDeliveryRate * 100)}%`,
            `${Math.round(vendor.qualityScore * 100)}%`,
            `${Math.round(vendor.costEfficiency * 100)}%`,
            `${Math.round(vendor.overallScore * 100)}%`,
            <Badge key={`vendor-risk-${vendor.vendorId}`} status={vendor.riskLevel === 'high' ? 'critical' : vendor.riskLevel === 'medium' ? 'warning' : 'success'}>
              {vendor.riskLevel}
            </Badge>
          ])}
        />
      </BlockBlockStack>
    </Card>
  );

  const renderPurchaseOrders = () => (
    <Card>
      <BlockBlockStack gap="400">
        <InlineBlockStack align="space-between">
          <Text>Purchase Order Recommendations</Text>
          <Badge status="info">{state.purchaseOrders.length} recommendations</Badge>
        </InlineBlockStack>

        <DataTable
          columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text']}
          headings={['PO ID', 'Vendor', 'Total Amount', 'Priority', 'Status', 'Actions']}
          rows={state.purchaseOrders.map(po => [
            po.poId,
            po.vendorName,
            `$${po.totalAmount.toLocaleString()}`,
            <Badge key={`po-priority-${po.poId}`} status={po.priority === 'urgent' ? 'critical' : po.priority === 'high' ? 'warning' : 'info'}>
              {po.priority}
            </Badge>,
            <Badge key={`po-status-${po.poId}`} status={po.status === 'approved' ? 'success' : 'info'}>
              {po.status}
            </Badge>,
            <ButtonGroup key={`po-actions-${po.poId}`}>
              <Button key={`po-view-${po.poId}`} size="slim" onClick={() => handlePurchaseOrderAction('view', po)}>
                View
              </Button>
              <Button key={`po-approve-${po.poId}`} size="slim" onClick={() => handlePurchaseOrderAction('approve', po)}>
                Approve
              </Button>
              <Button key={`po-reject-${po.poId}`} size="slim" onClick={() => handlePurchaseOrderAction('reject', po)}>
                Reject
              </Button>
            </ButtonGroup>
          ])}
        />
      </BlockBlockStack>
    </Card>
  );

  const renderInsights = () => (
    <Card>
      <BlockBlockStack gap="400">
        <Text>Actionable Insights</Text>
        <List>
          {state.insights.map(insight => (
            <List.Item key={insight.id}>
              <Card>
                <BlockBlockStack gap="200">
                  <InlineBlockStack align="space-between">
                    <Text level={4}>{insight.title}</Text>
                    <Badge status={insight.priority === 'high' ? 'critical' : insight.priority === 'medium' ? 'warning' : 'info'}>
                      {insight.priority}
                    </Badge>
                  </InlineBlockStack>
                  <Text>{insight.description}</Text>
                  <Text variant="bodyMd" color="subdued">
                    <strong>Impact:</strong> {insight.impact}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    <strong>Action:</strong> {insight.action}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    <strong>Estimated Value:</strong> ${insight.estimatedValue.toLocaleString()}
                  </Text>
                </BlockBlockStack>
              </Card>
            </List.Item>
          ))}
        </List>
      </BlockBlockStack>
    </Card>
  );

  const renderPerformanceMetrics = () => (
    <Card>
      <BlockBlockStack gap="400">
        <Text>Performance Metrics</Text>
        {state.performanceMetrics ? (
          <InlineGrid columns={3} gap="400">
            <Card>
              <BlockBlockStack gap="200">
                <Text variant="headingMd">Processing Speed</Text>
                <Text variant="headingLg">{state.performanceMetrics.averageProcessingTime.toFixed(2)}ms</Text>
              </BlockBlockStack>
            </Card>
            <Card>
              <BlockBlockStack gap="200">
                <Text variant="headingMd">Memory Usage</Text>
                <Text variant="headingLg">{state.performanceMetrics.memoryUsage.toFixed(2)}MB</Text>
              </BlockBlockStack>
            </Card>
            <Card>
              <BlockBlockStack gap="200">
                <Text variant="headingMd">Cache Hit Rate</Text>
                <Text variant="headingLg">{Math.round(state.performanceMetrics.cacheHitRate * 100)}%</Text>
              </BlockBlockStack>
            </Card>
          </InlineGrid>
        ) : (
          <Spinner size="large" />
        )}
      </BlockBlockStack>
    </Card>
  );

  const tabs = [
    { id: 'forecasts', content: 'Demand Forecasts', panel: renderDemandForecasts() },
    { id: 'vendors', content: 'Vendor Performance', panel: renderVendorPerformance() },
    { id: 'purchase-orders', content: 'Purchase Orders', panel: renderPurchaseOrders() },
    { id: 'insights', content: 'Insights', panel: renderInsights() },
    { id: 'performance', content: 'Performance', panel: renderPerformanceMetrics() }
  ];

  return (
    <Page
      title="Enhanced Analytics Dashboard"
      subtitle="Advanced ML-powered inventory analytics and recommendations"
      primaryAction={{
        content: 'Refresh Data',
        onAction: handleRefresh,
        loading: state.isLoading
      }}
      secondaryActions={[
        {
          content: 'Export Data',
          onAction: () => setToast({ content: 'Export functionality coming soon' })
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <Tabs
            tabs={tabs}
            selected={state.activeTab}
            onSelect={handleTabChange}
          >
            {tabs[state.activeTab].panel}
          </Tabs>
        </Layout.Section>
      </Layout>

      {/* Purchase Order Modal */}
      <Modal
        open={state.showPurchaseOrderModal}
        onClose={() => setState(prev => ({ ...prev, showPurchaseOrderModal: false }))}
        title="Purchase Order Details"
        large
      >
        {state.selectedPurchaseOrder && (
          <Modal.Section>
            <BlockBlockStack gap="400">
              <InlineBlockStack align="space-between">
                <Text variant="headingMd">{state.selectedPurchaseOrder.poId}</Text>
                <Badge status={state.selectedPurchaseOrder.priority === 'urgent' ? 'critical' : 'info'}>
                  {state.selectedPurchaseOrder.priority}
                </Badge>
              </InlineBlockStack>
              
              <Text><strong>Vendor:</strong> {state.selectedPurchaseOrder.vendorName}</Text>
              <Text><strong>Total Amount:</strong> ${state.selectedPurchaseOrder.totalAmount.toLocaleString()}</Text>
              <Text><strong>Items:</strong> {state.selectedPurchaseOrder.items.length}</Text>
              
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric']}
                headings={['SKU', 'Name', 'Quantity', 'Unit Cost', 'Total Cost']}
                rows={state.selectedPurchaseOrder.items.map(item => [
                  item.skuId,
                  item.skuName,
                  item.quantity.toString(),
                  `$${item.unitCost.toFixed(2)}`,
                  `$${item.totalCost.toFixed(2)}`
                ])}
              />
            </BlockBlockStack>
          </Modal.Section>
        )}
      </Modal>

      {/* Toast notifications */}
      {toast && (
        <Toast
          content={toast.content}
          error={toast.error}
          onDismiss={() => setToast(null)}
        />
      )}
    </Page>
  );
};

export default EnhancedAnalyticsDashboard;
