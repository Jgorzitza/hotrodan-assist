import { z } from "zod";

export type ConnectorId =
  | "shopify"
  | "zoho_mail"
  | "gsc"
  | "bing_wmt"
  | "ga4";

export type ConnectorCapability =
  | "read"
  | "write"
  | "stream"
  | "metrics"
  | "health";

export type ConnectorHealth = {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  lastCheckedAt?: string;
};

export const ConnectorConfigSchema = z.object({
  // example configuration keys
  endpoint: z.string().url().optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type ConnectorConfig = z.infer<typeof ConnectorConfigSchema>;

export type ConnectorMetadata = {
  id: ConnectorId;
  name: string;
  version: string;
  capabilities: ConnectorCapability[];
  requiredScopes?: string[];
};

export type RegisteredConnector = {
  meta: ConnectorMetadata;
  config: ConnectorConfig;
  enabled: boolean;
  health: ConnectorHealth;
};

type Telemetry = {
  onRegister?: (c: RegisteredConnector) => void;
  onUpdate?: (c: RegisteredConnector) => void;
  onEnable?: (c: RegisteredConnector) => void;
  onDisable?: (c: RegisteredConnector) => void;
  onUninstall?: (id: ConnectorId) => void;
  onHealthCheck?: (c: RegisteredConnector) => void;
};

export class ConnectorRegistry {
  private readonly map = new Map<ConnectorId, RegisteredConnector>();
  // Store telemetry hooks for lifecycle events
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly telemetry?: Telemetry) {}

  list(): RegisteredConnector[] {
    return [...this.map.values()].map((c) => ({ ...c }));
  }

  get(id: ConnectorId): RegisteredConnector | null {
    const c = this.map.get(id);
    return c ? { ...c } : null;
  }

  register(meta: ConnectorMetadata, config: ConnectorConfig = {}): RegisteredConnector {
    const parsed = ConnectorConfigSchema.safeParse(config);
    if (!parsed.success) {
      throw new Error(`Invalid config: ${parsed.error.message}`);
    }
    const existing = this.map.get(meta.id);
    if (existing) {
      throw new Error(`Connector already registered: ${meta.id}`);
    }
    const entry: RegisteredConnector = {
      meta,
      config: parsed.data,
      enabled: false,
      health: { status: "degraded", message: "never checked" },
    };
    this.map.set(meta.id, entry);
    this.telemetry?.onRegister?.(entry);
    return { ...entry };
  }

  update(id: ConnectorId, config: Partial<ConnectorConfig>): RegisteredConnector {
    const existing = this.map.get(id);
    if (!existing) throw new Error(`Connector not found: ${id}`);
    const merged = { ...existing.config, ...config };
    const parsed = ConnectorConfigSchema.parse(merged);
    const updated: RegisteredConnector = { ...existing, config: parsed };
    this.map.set(id, updated);
    this.telemetry?.onUpdate?.(updated);
    return { ...updated };
  }

  enable(id: ConnectorId): RegisteredConnector {
    const existing = this.map.get(id);
    if (!existing) throw new Error(`Connector not found: ${id}`);
    const updated: RegisteredConnector = { ...existing, enabled: true };
    this.map.set(id, updated);
    this.telemetry?.onEnable?.(updated);
    return { ...updated };
  }

  disable(id: ConnectorId): RegisteredConnector {
    const existing = this.map.get(id);
    if (!existing) throw new Error(`Connector not found: ${id}`);
    const updated: RegisteredConnector = { ...existing, enabled: false };
    this.map.set(id, updated);
    this.telemetry?.onDisable?.(updated);
    return { ...updated };
  }

  uninstall(id: ConnectorId): void {
    if (this.map.has(id)) {
      this.map.delete(id);
      this.telemetry?.onUninstall?.(id);
    }
  }

  async healthCheck(id: ConnectorId, checker: (c: RegisteredConnector) => Promise<ConnectorHealth>): Promise<RegisteredConnector> {
    const existing = this.map.get(id);
    if (!existing) throw new Error(`Connector not found: ${id}`);
    const health = await checker(existing);
    const updated: RegisteredConnector = { ...existing, health: { ...health, lastCheckedAt: new Date().toISOString() } };
    this.map.set(id, updated);
    this.telemetry?.onHealthCheck?.(updated);
    return { ...updated };
  }
}