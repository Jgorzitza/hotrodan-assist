import { 
  Card, 
  BlockStack, 
  Text, 
  Button, 
  InlineStack, 
  Badge,
  ButtonGroup,
  InlineGrid,
  ProgressBar,
  Banner,
  Modal,
  TextField,
  Select
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useCacheManager } from "~/hooks/useCache";
import { dataService, getCacheStats, getCacheConfig, updateCacheConfig } from "~/lib/data-service";

type CacheManagerProps = {
  onCacheUpdate?: () => void;
};

export function CacheManager({ onCacheUpdate }: CacheManagerProps) {
  const { stats, clearCache, invalidatePattern, invalidateByVersion, updateConfig, config } = useCacheManager();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pattern, setPattern] = useState("");
  const [version, setVersion] = useState("");
  const [newConfig, setNewConfig] = useState({
    defaultTTL: config.defaultTTL / 1000 / 60, // Convert to minutes
    maxAge: config.maxAge / 1000 / 60, // Convert to minutes
    staleWhileRevalidate: config.staleWhileRevalidate,
  });

  const handleClearCache = useCallback(() => {
    clearCache();
    onCacheUpdate?.();
  }, [clearCache, onCacheUpdate]);

  const handleInvalidatePattern = useCallback(() => {
    if (pattern.trim()) {
      const count = invalidatePattern(pattern);
      console.log(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
      setPattern("");
      onCacheUpdate?.();
    }
  }, [pattern, invalidatePattern, onCacheUpdate]);

  const handleInvalidateVersion = useCallback(() => {
    if (version.trim()) {
      const count = invalidateByVersion(version);
      console.log(`Invalidated ${count} cache entries with version: ${version}`);
      setVersion("");
      onCacheUpdate?.();
    }
  }, [version, invalidateByVersion, onCacheUpdate]);

  const handleUpdateConfig = useCallback(() => {
    updateConfig({
      defaultTTL: newConfig.defaultTTL * 60 * 1000, // Convert back to milliseconds
      maxAge: newConfig.maxAge * 60 * 1000, // Convert back to milliseconds
      staleWhileRevalidate: newConfig.staleWhileRevalidate,
    });
    setIsModalOpen(false);
    onCacheUpdate?.();
  }, [newConfig, updateConfig, onCacheUpdate]);

  const handleInvalidateMetrics = useCallback(() => {
    dataService.invalidateMetrics();
    onCacheUpdate?.();
  }, [onCacheUpdate]);

  const handleInvalidateCohort = useCallback(() => {
    dataService.invalidateCohort();
    onCacheUpdate?.();
  }, [onCacheUpdate]);

  const handleInvalidatePresets = useCallback(() => {
    dataService.invalidatePresets();
    onCacheUpdate?.();
  }, [onCacheUpdate]);

  const handleInvalidateAll = useCallback(() => {
    dataService.invalidateAll();
    onCacheUpdate?.();
  }, [onCacheUpdate]);

  const getHitRateColor = (rate: number) => {
    if (rate >= 0.8) return "success";
    if (rate >= 0.6) return "warning";
    return "critical";
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Cache Management
            </Text>
            <Badge tone={getHitRateColor(stats.hitRate)}>
              {Math.round(stats.hitRate * 100)}% hit rate
            </Badge>
          </InlineStack>

          <Text as="p" variant="bodySm" tone="subdued">
            Manage client-side caching and revalidation strategies
          </Text>

          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="300">
            <Card sectioned>
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Cache Stats
                </Text>
                <Text as="p" variant="bodySm">
                  Hits: {stats.hits.toLocaleString()}
                </Text>
                <Text as="p" variant="bodySm">
                  Misses: {stats.misses.toLocaleString()}
                </Text>
                <Text as="p" variant="bodySm">
                  Size: {stats.size} entries
                </Text>
                <Text as="p" variant="bodySm">
                  Evictions: {stats.evictions.toLocaleString()}
                </Text>
              </BlockStack>
            </Card>

            <Card sectioned>
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Performance
                </Text>
                <Text as="p" variant="bodySm">
                  Hit Rate: {Math.round(stats.hitRate * 100)}%
                </Text>
                <ProgressBar 
                  progress={stats.hitRate * 100} 
                  tone={getHitRateColor(stats.hitRate)}
                />
                <Text as="p" variant="bodySm">
                  Revalidations: {stats.revalidations.toLocaleString()}
                </Text>
              </BlockStack>
            </Card>

            <Card sectioned>
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Configuration
                </Text>
                <Text as="p" variant="bodySm">
                  Default TTL: {formatTime(config.defaultTTL)}
                </Text>
                <Text as="p" variant="bodySm">
                  Max Age: {formatTime(config.maxAge)}
                </Text>
                <Text as="p" variant="bodySm">
                  Stale While Revalidate: {config.staleWhileRevalidate ? "Yes" : "No"}
                </Text>
                <Text as="p" variant="bodySm">
                  Version: {config.version}
                </Text>
              </BlockStack>
            </Card>

            <Card sectioned>
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Actions
                </Text>
                <ButtonGroup vertical>
                  <Button onClick={() => setIsModalOpen(true)}>
                    Configure
                  </Button>
                  <Button onClick={handleClearCache}>
                    Clear All
                  </Button>
                </ButtonGroup>
              </BlockStack>
            </Card>
          </InlineGrid>

          <Card sectioned>
            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">
                Invalidate Cache
              </Text>
              
              <InlineStack gap="200" wrap={false}>
                <TextField
                  label="Pattern"
                  value={pattern}
                  onChange={setPattern}
                  placeholder="e.g., metrics:*, cohort:*"
                  helpText="Use * for wildcards"
                />
                <Button onClick={handleInvalidatePattern} disabled={!pattern.trim()}>
                  Invalidate Pattern
                </Button>
              </InlineStack>

              <InlineStack gap="200" wrap={false}>
                <TextField
                  label="Version"
                  value={version}
                  onChange={setVersion}
                  placeholder="e.g., 1.0.0"
                  helpText="Invalidate entries with specific version"
                />
                <Button onClick={handleInvalidateVersion} disabled={!version.trim()}>
                  Invalidate Version
                </Button>
              </InlineStack>

              <InlineStack gap="200" wrap={false}>
                <Button onClick={handleInvalidateMetrics}>
                  Invalidate Metrics
                </Button>
                <Button onClick={handleInvalidateCohort}>
                  Invalidate Cohort
                </Button>
                <Button onClick={handleInvalidatePresets}>
                  Invalidate Presets
                </Button>
                <Button onClick={handleInvalidateAll} tone="critical">
                  Invalidate All
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>

          {stats.hitRate < 0.5 && (
            <Banner tone="warning">
              <Text as="p" variant="bodySm">
                Low cache hit rate detected. Consider adjusting TTL settings or checking cache invalidation patterns.
              </Text>
            </Banner>
          )}

          {stats.size > 1000 && (
            <Banner tone="info">
              <Text as="p" variant="bodySm">
                Large cache size detected ({stats.size} entries). Consider clearing unused entries or reducing TTL.
              </Text>
            </Banner>
          )}
        </BlockStack>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cache Configuration"
        primaryAction={{
          content: "Update",
          onAction: handleUpdateConfig,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <TextField
              label="Default TTL (minutes)"
              type="number"
              value={newConfig.defaultTTL.toString()}
              onChange={(value) => setNewConfig(prev => ({ ...prev, defaultTTL: Number(value) }))}
              helpText="Default time-to-live for cache entries"
            />
            
            <TextField
              label="Max Age (minutes)"
              type="number"
              value={newConfig.maxAge.toString()}
              onChange={(value) => setNewConfig(prev => ({ ...prev, maxAge: Number(value) }))}
              helpText="Maximum age before entries are considered stale"
            />
            
            <Select
              label="Stale While Revalidate"
              options={[
                { label: "Enabled", value: "true" },
                { label: "Disabled", value: "false" },
              ]}
              value={newConfig.staleWhileRevalidate.toString()}
              onChange={(value) => setNewConfig(prev => ({ ...prev, staleWhileRevalidate: value === "true" }))}
              helpText="Serve stale data while revalidating in background"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}

export function CacheStatus({ compact = false }: { compact?: boolean }) {
  const { stats } = useCacheManager();

  if (compact) {
    return (
      <Badge tone={stats.hitRate >= 0.8 ? "success" : stats.hitRate >= 0.6 ? "warning" : "critical"}>
        Cache: {Math.round(stats.hitRate * 100)}%
      </Badge>
    );
  }

  return (
    <InlineStack gap="200" blockAlign="center">
      <Text as="span" variant="bodySm">
        Cache Hit Rate:
      </Text>
      <Badge tone={stats.hitRate >= 0.8 ? "success" : stats.hitRate >= 0.6 ? "warning" : "critical"}>
        {Math.round(stats.hitRate * 100)}%
      </Badge>
      <Text as="span" variant="bodySm" tone="subdued">
        ({stats.hits}/{stats.hits + stats.misses})
      </Text>
    </InlineStack>
  );
}
