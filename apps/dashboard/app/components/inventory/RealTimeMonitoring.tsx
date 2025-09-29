/**
 * Real-Time Inventory Monitoring Component
 * Provides live monitoring of inventory performance and alerts
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ProgressBar,
  Spinner,
  Toast,
  Frame,
  TopBar,
  Navigation,
  Icon,
  Tooltip,
  Tabs,
  EmptyState,
  ResourceList,
  ResourceItem,
  Avatar,
  Thumbnail,
  BlockStack,
  InlineBlockStack,
  BlockBlockStack,
  InlineGrid,
  Box,
  Divider,
  Collapsible,
  List,
  Link,
  Popover,
  ActionList,
  Filters,
  Pagination,
  IndexTable,
  ChoiceList,
  RangeSlider,
  DatePicker,
  DatePicker,
  ColorPicker,
  DropZone,
  Button,
  Banner,
  CalloutCard,
  Text,
  Text,
  Subheading,
  Caption,
  TextStyle,
  VisuallyHidden,
  ScreenReaderOnly,
  KeyboardKey,
  KeyboardShortcut,
  Focus,
  TrapFocus,
  FocusManager,
  Portal,
  Backdrop,
  Overlay,
  Sheet,
  Drawer,
  Dialog,
  ContextualSaveBar,
  Loading,
  SkeletonBodyText,
  SkeletonText,
  SkeletonPage,
} from '@shopify/polaris';

import type { InventorySkuDemand } from '../../types/dashboard';

interface RealTimeMonitoringProps {
  skus: InventorySkuDemand[];
  onRefresh: () => void;
  isLoading?: boolean;
}

interface MonitoringState {
  alerts: Alert[];
  performanceMetrics: PerformanceMetrics;
  systemHealth: SystemHealth;
  lastUpdate: Date;
  isConnected: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  skuId?: string;
  vendorId?: string;
  acknowledged: boolean;
  actionRequired: boolean;
}

interface PerformanceMetrics {
  totalSkus: number;
  processedSkus: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  latency: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  lastError?: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

const RealTimeMonitoring: React.FC<RealTimeMonitoringProps> = ({
  skus,
  onRefresh,
  isLoading = false
}) => {
  const [state, setState] = useState<MonitoringState>({
    alerts: [],
    performanceMetrics: {
      totalSkus: 0,
      processedSkus: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughput: 0,
      latency: 0
    },
    systemHealth: {
      status: 'healthy',
      uptime: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0
    },
    lastUpdate: new Date(),
    isConnected: true,
    autoRefresh: true,
    refreshInterval: 5000 // 5 seconds
  });

  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize monitoring
  useEffect(() => {
    initializeMonitoring();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-refresh when enabled
  useEffect(() => {
    if (state.autoRefresh && state.isConnected) {
      intervalRef.current = setInterval(() => {
        updateMonitoringData();
      }, state.refreshInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.autoRefresh, state.isConnected, state.refreshInterval]);

  const initializeMonitoring = () => {
    // Initialize with current data
    updateMonitoringData();
    
    // Set up WebSocket connection for real-time updates
    // This would connect to a WebSocket server in production
    setupWebSocketConnection();
  };

  const setupWebSocketConnection = () => {
    // Simulate WebSocket connection
    // In production, this would connect to a real WebSocket server
    console.log('WebSocket connection established');
  };

  const updateMonitoringData = async () => {
    try {
      // Simulate real-time data updates
      const newAlerts = generateMockAlerts();
      const performanceMetrics = generateMockPerformanceMetrics();
      const systemHealth = generateMockSystemHealth();

      setState(prev => ({
        ...prev,
        alerts: [...prev.alerts, ...newAlerts].slice(-50), // Keep last 50 alerts
        performanceMetrics,
        systemHealth,
        lastUpdate: new Date(),
        isConnected: true
      }));

      // Check for critical alerts
      const criticalAlerts = newAlerts.filter(alert => alert.type === 'critical');
      if (criticalAlerts.length > 0) {
        setToast({ 
          content: `${criticalAlerts.length} critical alert(s) detected`, 
          error: true 
        });
      }
    } catch (error) {
      console.error('Error updating monitoring data:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        systemHealth: {
          ...prev.systemHealth,
          status: 'critical',
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  const generateMockAlerts = (): Alert[] => {
    const alertTypes = ['critical', 'warning', 'info'] as const;
    const alertTitles = [
      'Low Stock Alert',
      'High Demand Detected',
      'Vendor Delay',
      'System Performance Issue',
      'Data Sync Error',
      'Cache Miss Rate High',
      'Memory Usage High',
      'API Rate Limit Exceeded'
    ];

    const alerts: Alert[] = [];
    const numAlerts = Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0;

    for (let i = 0; i < numAlerts; i++) {
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const title = alertTitles[Math.floor(Math.random() * alertTitles.length)];
      
      alerts.push({
        id: `alert-${Date.now()}-${i}`,
        type,
        title,
        message: `${title} detected at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date(),
        skuId: Math.random() < 0.5 ? skus[Math.floor(Math.random() * skus.length)]?.id : undefined,
        vendorId: Math.random() < 0.3 ? `vendor-${Math.floor(Math.random() * 5)}` : undefined,
        acknowledged: false,
        actionRequired: type === 'critical'
      });
    }

    return alerts;
  };

  const generateMockPerformanceMetrics = (): PerformanceMetrics => {
    return {
      totalSkus: skus.length,
      processedSkus: Math.floor(skus.length * (0.8 + Math.random() * 0.2)),
      averageProcessingTime: 50 + Math.random() * 100,
      memoryUsage: 100 + Math.random() * 200,
      cacheHitRate: 0.8 + Math.random() * 0.15,
      errorRate: Math.random() * 0.05,
      throughput: 1000 + Math.random() * 500,
      latency: 10 + Math.random() * 20
    };
  };

  const generateMockSystemHealth = (): SystemHealth => {
    const errorCount = Math.floor(Math.random() * 5);
    const warningCount = Math.floor(Math.random() * 10);
    const infoCount = Math.floor(Math.random() * 20);

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorCount > 3) status = 'critical';
    else if (errorCount > 1 || warningCount > 5) status = 'degraded';

    return {
      status,
      uptime: Date.now() - (Math.random() * 24 * 60 * 60 * 1000), // Random uptime up to 24 hours
      errorCount,
      warningCount,
      infoCount
    };
  };

  const handleRefresh = () => {
    onRefresh();
    updateMonitoringData();
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    }));
  };

  const handleAcknowledgeAllAlerts = () => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert => ({ ...alert, acknowledged: true }))
    }));
  };

  const handleToggleAutoRefresh = () => {
    setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setState(prev => ({ ...prev, refreshInterval: interval }));
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      healthy: { status: 'success' as const, text: 'Healthy' },
      degraded: { status: 'warning' as const, text: 'Degraded' },
      critical: { status: 'critical' as const, text: 'Critical' }
    };
    
    const { status: badgeStatus, text } = statusMap[status as keyof typeof statusMap] || statusMap.healthy;
    return <Badge status={badgeStatus}>{text}</Badge>;
  };

  const getAlertBadge = (type: string) => {
    const typeMap = {
      critical: { status: 'critical' as const, text: 'Critical' },
      warning: { status: 'warning' as const, text: 'Warning' },
      info: { status: 'info' as const, text: 'Info' }
    };
    
    const { status: badgeStatus, text } = typeMap[type as keyof typeof typeMap] || typeMap.info;
    return <Badge status={badgeStatus}>{text}</Badge>;
  };

  const renderSystemHealth = () => (
    <Card>
      <BlockBlockStack gap="400">
        <InlineBlockStack align="space-between">
          <Text>System Health</Text>
          {getStatusBadge(state.systemHealth.status)}
        </InlineBlockStack>

        <InlineGrid columns={4} gap="400">
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Uptime</Text>
              <Text variant="headingLg">
                {Math.floor(state.systemHealth.uptime / (1000 * 60 * 60))}h {Math.floor((state.systemHealth.uptime % (1000 * 60 * 60)) / (1000 * 60))}m
              </Text>
            </BlockBlockStack>
          </Card>
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Errors</Text>
              <Text variant="headingLg" color={state.systemHealth.errorCount > 0 ? 'critical' : 'success'}>
                {state.systemHealth.errorCount}
              </Text>
            </BlockBlockStack>
          </Card>
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Warnings</Text>
              <Text variant="headingLg" color={state.systemHealth.warningCount > 5 ? 'warning' : 'success'}>
                {state.systemHealth.warningCount}
              </Text>
            </BlockBlockStack>
          </Card>
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Info</Text>
              <Text variant="headingLg">{state.systemHealth.infoCount}</Text>
            </BlockBlockStack>
          </Card>
        </InlineGrid>

        {state.systemHealth.lastError && (
          <Banner status="critical">
            <Text>Last Error: {state.systemHealth.lastError}</Text>
          </Banner>
        )}
      </BlockBlockStack>
    </Card>
  );

  const renderPerformanceMetrics = () => (
    <Card>
      <BlockBlockStack gap="400">
        <Text>Performance Metrics</Text>

        <InlineGrid columns={4} gap="400">
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Processing Time</Text>
              <Text variant="headingLg">{state.performanceMetrics.averageProcessingTime.toFixed(2)}ms</Text>
              <ProgressBar 
                progress={Math.min(100, (state.performanceMetrics.averageProcessingTime / 200) * 100)} 
                size="small"
              />
            </BlockBlockStack>
          </Card>
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Memory Usage</Text>
              <Text variant="headingLg">{state.performanceMetrics.memoryUsage.toFixed(2)}MB</Text>
              <ProgressBar 
                progress={Math.min(100, (state.performanceMetrics.memoryUsage / 500) * 100)} 
                size="small"
              />
            </BlockBlockStack>
          </Card>
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Cache Hit Rate</Text>
              <Text variant="headingLg">{Math.round(state.performanceMetrics.cacheHitRate * 100)}%</Text>
              <ProgressBar 
                progress={state.performanceMetrics.cacheHitRate * 100} 
                size="small"
              />
            </BlockBlockStack>
          </Card>
          <Card>
            <BlockBlockStack gap="200">
              <Text variant="headingMd">Error Rate</Text>
              <Text variant="headingLg" color={state.performanceMetrics.errorRate > 0.02 ? 'critical' : 'success'}>
                {Math.round(state.performanceMetrics.errorRate * 100)}%
              </Text>
              <ProgressBar 
                progress={Math.min(100, state.performanceMetrics.errorRate * 1000)} 
                size="small"
              />
            </BlockBlockStack>
          </Card>
        </InlineGrid>
      </BlockBlockStack>
    </Card>
  );

  const renderAlerts = () => (
    <Card>
      <BlockBlockStack gap="400">
        <InlineBlockStack align="space-between">
          <Text>Alerts</Text>
          <ButtonGroup>
            <Button 
              onClick={handleAcknowledgeAllAlerts}
              disabled={state.alerts.filter(a => !a.acknowledged).length === 0}
            >
              Acknowledge All
            </Button>
            <Button onClick={handleRefresh} loading={isLoading}>
              Refresh
            </Button>
          </ButtonGroup>
        </InlineBlockStack>

        <DataTable
          columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
          headings={['Type', 'Title', 'Message', 'Time', 'Status', 'Actions']}
          rows={state.alerts.slice(0, 20).map(alert => [
            getAlertBadge(alert.type),
            alert.title,
            alert.message,
            alert.timestamp.toLocaleTimeString(),
            alert.acknowledged ? <Badge status="success">Acknowledged</Badge> : <Badge status="info">New</Badge>,
            <ButtonGroup>
              {!alert.acknowledged && (
                <Button 
                  size="slim" 
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              )}
              {alert.actionRequired && (
                <Button size="slim" status="critical">
                  Take Action
                </Button>
              )}
            </ButtonGroup>
          ])}
        />
      </BlockBlockStack>
    </Card>
  );

  const renderControls = () => (
    <Card>
      <BlockBlockStack gap="400">
        <Text>Monitoring Controls</Text>
        
        <InlineBlockStack gap="400" align="space-between">
          <InlineBlockStack gap="200">
            <Checkbox
              checked={state.autoRefresh}
              onChange={handleToggleAutoRefresh}
              label="Auto Refresh"
            />
            <Text variant="bodyMd" color="subdued">
              {state.autoRefresh ? 'Enabled' : 'Disabled'}
            </Text>
          </InlineBlockStack>

          <InlineBlockStack gap="200">
            <Text variant="bodyMd">Refresh Interval:</Text>
            <Select
              options={[
                { label: '1 second', value: '1000' },
                { label: '5 seconds', value: '5000' },
                { label: '10 seconds', value: '10000' },
                { label: '30 seconds', value: '30000' }
              ]}
              value={state.refreshInterval.toString()}
              onChange={(value) => handleRefreshIntervalChange(parseInt(value))}
            />
          </InlineBlockStack>

          <InlineBlockStack gap="200">
            <Text variant="bodyMd">Connection:</Text>
            <Badge status={state.isConnected ? 'success' : 'critical'}>
              {state.isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </InlineBlockStack>
        </InlineBlockStack>

        <Text variant="bodyMd" color="subdued">
          Last Update: {state.lastUpdate.toLocaleString()}
        </Text>
      </BlockBlockStack>
    </Card>
  );

  return (
    <Page
      title="Real-Time Monitoring"
      subtitle="Live inventory system monitoring and alerts"
      primaryAction={{
        content: 'Refresh Now',
        onAction: handleRefresh,
        loading: isLoading
      }}
      secondaryActions={[
        {
          content: 'Export Logs',
          onAction: () => setToast({ content: 'Export functionality coming soon' })
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockBlockStack gap="400">
            {renderSystemHealth()}
            {renderPerformanceMetrics()}
            {renderAlerts()}
            {renderControls()}
          </BlockBlockStack>
        </Layout.Section>
      </Layout>

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

export default RealTimeMonitoring;
