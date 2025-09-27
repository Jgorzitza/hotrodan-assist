import { randomUUID } from "node:crypto";

import {
  DEFAULT_RESOURCE_PATHS,
  mockInventorySignals,
  mockProductRecommendations,
  mockSeoOpportunities,
} from "./mocks";
import {
  McpResourceType,
  type InventorySignal,
  type McpRequestContext,
  type McpResponse,
  type ProductRecommendation,
  type SeoOpportunity,
  type McpTelemetryEvent,
} from "./types";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 5_000;

export type TelemetryHooks = {
  onRequest?: (
    event: McpTelemetryEvent & { context: McpRequestContext; requestId: string },
  ) => void;
  onResponse?: (
    event: McpTelemetryEvent & { context: McpRequestContext; requestId: string },
  ) => void;
  onRetry?: (
    event: McpTelemetryEvent & { context: McpRequestContext; requestId: string },
  ) => void;
  onError?: (
    event: McpTelemetryEvent & { context: McpRequestContext; requestId: string },
  ) => void;
};

export type McpClientConfig = {
  apiKey?: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
  maxRetries?: number;
  timeoutMs?: number;
  useMocks?: boolean;
  telemetry?: TelemetryHooks;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class McpClient {
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly telemetry?: TelemetryHooks;
  private readonly useMocks: boolean;

  constructor(private readonly config: McpClientConfig = {}) {
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.telemetry = config.telemetry;
    this.useMocks = config.useMocks ?? true;
  }

  async getProductRecommendations(
    context: McpRequestContext,
  ): Promise<McpResponse<ProductRecommendation[]>> {
    return this.execute(
      McpResourceType.ProductRecommendation,
      DEFAULT_RESOURCE_PATHS[McpResourceType.ProductRecommendation],
      context,
      () => mockProductRecommendations(context),
    );
  }

  async getInventorySignals(
    context: McpRequestContext,
  ): Promise<McpResponse<InventorySignal[]>> {
    return this.execute(
      McpResourceType.InventorySignal,
      DEFAULT_RESOURCE_PATHS[McpResourceType.InventorySignal],
      context,
      () => mockInventorySignals(context),
    );
  }

  async getSeoOpportunities(
    context: McpRequestContext,
  ): Promise<McpResponse<SeoOpportunity[]>> {
    return this.execute(
      McpResourceType.SeoOpportunity,
      DEFAULT_RESOURCE_PATHS[McpResourceType.SeoOpportunity],
      context,
      () => mockSeoOpportunities(context),
    );
  }

  async ping(): Promise<boolean> {
    if (this.shouldUseMocks()) {
      return true;
    }

    if (!this.config.endpoint) {
      return false;
    }

    try {
      const url = this.formatUrl("/health");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const requestId = randomUUID();
      this.telemetry?.onRequest?.({
        resource: McpResourceType.ProductRecommendation,
        attempt: 1,
        requestId,
        context: {
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation,
        },
      });
      const response = await this.fetchFn(url, {
        headers: this.headers({
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation,
          requestId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      this.telemetry?.onResponse?.({
        resource: McpResourceType.ProductRecommendation,
        attempt: 1,
        status: response.status,
        requestId,
        context: {
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation,
        },
      });
      return response.ok;
    } catch (error) {
      const requestId = randomUUID();
      this.telemetry?.onError?.({
        resource: McpResourceType.ProductRecommendation,
        attempt: 1,
        error,
        requestId,
        context: {
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation,
        },
      });
      return false;
    }
  }

  private async execute<T>(
    resource: McpResourceType,
    path: string,
    context: McpRequestContext,
    fallback: () => Promise<McpResponse<T>>,
  ): Promise<McpResponse<T>> {
    if (this.shouldUseMocks()) {
      return fallback();
    }

    if (!this.config.endpoint) {
      return fallback();
    }

    try {
      return await this.fetchWithRetry(resource, path, context);
    } catch (error) {
      const requestId = randomUUID();
      this.telemetry?.onError?.({
        resource,
        attempt: this.maxRetries,
        error,
        context,
        requestId,
      });
      return fallback();
    }
  }

  private async fetchWithRetry<T>(
    resource: McpResourceType,
    path: string,
    context: McpRequestContext,
  ): Promise<McpResponse<T>> {
    const baseUrl = this.config.endpoint;
    if (!baseUrl) {
      throw new Error("MCP endpoint missing");
    }

    const payload = {
      resource,
      params: context.params,
      shopDomain: context.shopDomain,
      dateRange: context.dateRange,
    } satisfies Omit<McpRequestContext, "resource"> & { resource: McpResourceType };

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const requestId = randomUUID();
        this.telemetry?.onRequest?.({ resource, attempt, context, requestId });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        const response = await this.fetchFn(this.formatUrl(path), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.headers({
              shopDomain: context.shopDomain,
              resource,
              requestId,
            }),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        this.telemetry?.onResponse?.({
          resource,
          attempt,
          status: response.status,
          context,
          requestId,
        });

        if (!response.ok) {
          throw new Error(`MCP request failed with status ${response.status}`);
        }

        const data = (await response.json()) as McpResponse<T>;
        return data;
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }

        this.telemetry?.onRetry?.({
          resource,
          attempt,
          error,
          context,
          requestId: randomUUID(),
        });
        await wait(Math.min(2 ** attempt * 100, 1_000));
      }
    }

    throw new Error("MCP request exhausted retries");
  }

  private headers(
    context?: { shopDomain?: string; resource?: McpResourceType; requestId?: string },
  ): Record<string, string> | undefined {
    const headers: Record<string, string> = {};

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    if (context?.shopDomain) {
      headers["X-Shop-Domain"] = context.shopDomain;
    }

    if (context?.resource) {
      headers["X-MCP-Resource"] = context.resource;
    }

    if (context?.requestId) {
      headers["X-Request-Id"] = context.requestId;
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  private shouldUseMocks() {
    return this.useMocks;
  }

  private formatUrl(path: string) {
    const baseUrl = this.config.endpoint ?? "";
    const normalizedBase = baseUrl.endsWith("/")
      ? baseUrl.slice(0, baseUrl.length - 1)
      : baseUrl;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }
}

export const createMcpClient = (config?: McpClientConfig) => new McpClient(config);
