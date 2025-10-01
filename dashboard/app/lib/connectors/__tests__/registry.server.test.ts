import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConnectorRegistry, type ConnectorMetadata } from "../registry.server";

const meta: ConnectorMetadata = {
  id: "ga4",
  name: "Google Analytics 4",
  version: "1.0.0",
  capabilities: ["read", "metrics", "health"],
};

describe("ConnectorRegistry", () => {
  let registry: ConnectorRegistry;
  const telemetry = {
    onRegister: vi.fn(),
    onUpdate: vi.fn(),
    onEnable: vi.fn(),
    onDisable: vi.fn(),
    onUninstall: vi.fn(),
    onHealthCheck: vi.fn(),
  };

  beforeEach(() => {
    registry = new ConnectorRegistry(telemetry);
    Object.values(telemetry).forEach((fn) => fn.mockClear?.());
  });

  it("registers and lists connectors", () => {
    const created = registry.register(meta, { timeoutMs: 5000 });
    expect(created.enabled).toBe(false);
    const all = registry.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.meta.id).toBe("ga4");
  });

  it("validates config updates", () => {
    registry.register(meta);
    const updated = registry.update("ga4", { maxRetries: 3 });
    expect(updated.config.maxRetries).toBe(3);
    expect(() => registry.update("ga4", { timeoutMs: -1 as unknown as number })).toThrow();
  });

  it("enables, disables, uninstalls", () => {
    registry.register(meta);
    const enabled = registry.enable("ga4");
    expect(enabled.enabled).toBe(true);
    const disabled = registry.disable("ga4");
    expect(disabled.enabled).toBe(false);
    registry.uninstall("ga4");
    expect(registry.get("ga4")).toBeNull();
  });

  it("performs a health check via provided checker", async () => {
    registry.register(meta);
    const result = await registry.healthCheck("ga4", async () => ({ status: "healthy" }));
    expect(result.health.status).toBe("healthy");
    expect(result.health.lastCheckedAt).toBeDefined();
  });
});