import { randomUUID } from "node:crypto";
import pLimit from "p-limit";

import {
  DEFAULT_RESOURCE_PATHS,
  mockInventorySignals,
  mockProductRecommendations,
  mockSeoOpportunities,
} from "./mocks";
import {
  InventorySignalSchema,
  McpResponseSchema,
  ProductRecommendationSchema,
  SeoOpportunitySchema,
  sanitizeInventorySignal,
  sanitizeProductRecommendation,
  sanitizeSeoOpportunity,
} from "./schema.server";
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
const DEFAULT_MAX_CONCURRENT = 4;
const DEFAULT_RATE_LIMIT_RPS = 0; // 0 disables rate limiting
const DEFAULT_BREAKER_FAILURE_THRESHOLD = 5;
const DEFAULT_BREAKER_COOLDOWN_MS = 10_000;
const DEFAULT_BREAKER_HALF_OPEN_MAX = 1;

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
  onRateLimitDelay?: (event: {
    resource: McpResourceType;
    context: McpRequestContext;
    delayMs: number;
  }) => void;
  onBreakerOpen?: (event: { resource: McpResourceType; context: McpRequestContext }) => void;
  onBreakerHalfOpen?: (event: { resource: McpResourceType; context: McpRequestContext }) => void;
  onBreakerClose?: (event: { resource: McpResourceType; context: McpRequestContext }) => void;
};

export type CircuitBreakerOptions = {
  failureThreshold?: number; // consecutive failures to open
  cooldownMs?: number; // time the breaker remains open
  halfOpenMax?: number; // max in-flight requests during half-open probe
};

export type McpClientConfig = {
  apiKey?: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
  maxRetries?: number;
  timeoutMs?: number;
  useMocks?: boolean;
  telemetry?: TelemetryHooks;
  // New reliability options
  maxConcurrent?: number; // concurrency limiter
  rateLimitRps?: number; // requests per second; 0 disables
  breaker?: CircuitBreakerOptions;
  keepAlive?: boolean; // hint for connection pooling
  cacheTtlMs?: number; // optional response cache TTL
  cacheSize?: number; // optional LRU size
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const withJitter = (baseMs: number) => {
  const jitterFactor = 0.2; // +/-20%
  const delta = baseMs * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * delta;
  return Math.max(0, Math.round(baseMs + jitter));
};

enum BreakerState {
  Closed = "closed",
  Open = "open",
  HalfOpen = "half_open",
}

export class McpClient {
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly telemetry?: TelemetryHooks;
  private readonly useMocks: boolean;

  // Concurrency and rate limiting
  private readonly limiter;
  private readonly rateLimitRps: number;
  private lastRequests: number[] = [];

  // Circuit breaker state
  private breakerState: BreakerState = BreakerState.Closed;
  private consecutiveFailures = 0;
  private openedAt = 0;
  private halfOpenInFlight = 0;
  private shortCircuitedSinceOpen = true;
  private readonly breakerOptions: Required<CircuitBreakerOptions>;

  // Optional keep-alive dispatcher (best-effort)
  private readonly dispatcher: unknown | undefined;

  // Simple response cache
  private readonly cacheTtlMs: number;
  private readonly cacheSize: number;
  private cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(private readonly config: McpClientConfig = {}) {
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.telemetry = config.telemetry;
    this.useMocks = config.useMocks ?? true;

    const concurrency = config.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
    this.limiter = pLimit(Math.max(1, concurrency));
    this.rateLimitRps = config.rateLimitRps ?? DEFAULT_RATE_LIMIT_RPS;

    this.breakerOptions = {
      failureThreshold: config.breaker?.failureThreshold ?? DEFAULT_BREAKER_FAILURE_THRESHOLD,
      cooldownMs: config.breaker?.cooldownMs ?? DEFAULT_BREAKER_COOLDOWN_MS,
      halfOpenMax: config.breaker?.halfOpenMax ?? DEFAULT_BREAKER_HALF_OPEN_MAX,
    };

    // Best-effort undici Agent keep-alive support without hard dependency
    if (config.keepAlive) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Agent } = require("undici");
        this.dispatcher = new Agent({ keepAliveTimeout: 30_000, keepAliveMaxTimeout: 60_000 });
      } catch {
        this.dispatcher = undefined;
      }
    }

    this.cacheTtlMs = Math.max(0, config.cacheTtlMs ?? 0);
    this.cacheSize = Math.max(0, config.cacheSize ?? 0);
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
        // @ts-expect-error: dispatcher is undici-specific and optional
        dispatcher: this.dispatcher,
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

    // Circuit breaker short-circuit
    if (this.isBreakerOpen()) {
      this.telemetry?.onBreakerOpen?.({ resource, context });
      return fallback();
    }

    try {
      const result = await this.limiter(() => this.fetchWithRetry(resource, path, context));
      // success path closes breaker and resets failures
      this.onSuccess(resource, context);
      return result;
    } catch (error) {
      this.onFailure(resource, context, error);
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

    const cacheKey = this.buildCacheKey(path, payload);
    if (this.cacheTtlMs > 0 && this.cacheSize > 0) {
      const hit = this.cache.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value as McpResponse<T>;
      }
    }

    // Rate limiting (RPS) — simple sliding window over last second
    const rateDelay = this.computeRateLimitDelay();
    if (rateDelay > 0) {
      this.telemetry?.onRateLimitDelay?.({ resource, context, delayMs: rateDelay });
      await wait(rateDelay);
    }

    // Half-open probe guard
    if (this.breakerState === BreakerState.HalfOpen) {
      if (this.halfOpenInFlight >= this.breakerOptions.halfOpenMax) {
        // Too many probes in flight, delay slightly to yield
        await wait(10);
      }
      this.halfOpenInFlight += 1;
      this.telemetry?.onBreakerHalfOpen?.({ resource, context });
    }

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
          // @ts-expect-error: dispatcher is undici-specific and optional
          dispatcher: this.dispatcher,
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

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after"));
          if (Number.isFinite(retryAfter) && retryAfter > 0) {
            await wait(withJitter(Math.min(retryAfter * 1000, 10_000)));
          }
          throw new Error("rate_limited");
        }

        if (!response.ok) {
          throw new Error(`MCP request failed with status ${response.status}`);
        }

        const raw = await response.json();
        const data = this.validateAndSanitize<T>(resource, raw);
        this.noteSuccessfulRequest();
        if (this.cacheTtlMs > 0 && this.cacheSize > 0) {
          this.ensureCacheSize();
          this.cache.set(cacheKey, { expiresAt: Date.now() + this.cacheTtlMs, value: data });
        }
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
        const baseBackoff = Math.min(2 ** attempt * 100, 1_000);
        await wait(withJitter(baseBackoff));
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

    // Versioning and feature hints
    headers["X-MCP-Client-Version"] = "1.0.0";
    headers["X-MCP-Features"] = [
      this.rateLimitRps > 0 ? "rate-limit" : null,
      this.breakerOptions.failureThreshold > 0 ? "breaker" : null,
      this.cacheTtlMs > 0 ? "cache" : null,
    ]
      .filter(Boolean)
      .join(",");

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

  private computeRateLimitDelay(): number {
    if (!this.rateLimitRps || this.rateLimitRps <= 0) return 0;
    const now = Date.now();
    // Remove requests older than 1 second
    this.lastRequests = this.lastRequests.filter((t) => now - t < 1000);
    if (this.lastRequests.length < this.rateLimitRps) {
      // allow immediately
      this.lastRequests.push(now);
      return 0;
    }
    const earliest = this.lastRequests[0]!;
    const delay = Math.max(0, 1000 - (now - earliest));
    // Schedule slot
    this.lastRequests.push(now + delay);
    return delay;
  }

  private noteSuccessfulRequest() {
    this.lastRequests = this.lastRequests.filter((t) => Date.now() - t < 1000);
  }

  private isBreakerOpen(): boolean {
    if (this.breakerState === BreakerState.Open) {
      // Guarantee at least one short-circuit immediately after opening to avoid race conditions
      if (!this.shortCircuitedSinceOpen) {
        this.shortCircuitedSinceOpen = true;
        return true;
      }
      if (Date.now() - this.openedAt >= this.breakerOptions.cooldownMs) {
        // transition to half-open
        this.breakerState = BreakerState.HalfOpen;
        this.halfOpenInFlight = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private onSuccess(resource: McpResourceType, context: McpRequestContext) {
    this.consecutiveFailures = 0;
    if (this.breakerState !== BreakerState.Closed) {
      this.breakerState = BreakerState.Closed;
      this.halfOpenInFlight = 0;
      this.telemetry?.onBreakerClose?.({ resource, context });
    }
  }

  private onFailure(resource: McpResourceType, context: McpRequestContext, _error: unknown) {
    // Decrement half-open in-flight if applicable
    if (this.breakerState === BreakerState.HalfOpen && this.halfOpenInFlight > 0) {
      this.halfOpenInFlight -= 1;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.breakerOptions.failureThreshold) {
      this.breakerState = BreakerState.Open;
      this.openedAt = Date.now();
      this.shortCircuitedSinceOpen = false;
      this.telemetry?.onBreakerOpen?.({ resource, context });
    }
  }

  private validateAndSanitize<T>(resource: McpResourceType, raw: unknown): McpResponse<T> {
    switch (resource) {
      case McpResourceType.ProductRecommendation: {
        const schema = McpResponseSchema(ProductRecommendationSchema.array());
        const parsed = schema.parse(raw);
        // sanitize
        const data = parsed.data.map(sanitizeProductRecommendation) as unknown as T;
        return { ...parsed, data } as McpResponse<T>;
      }
      case McpResourceType.InventorySignal: {
        const schema = McpResponseSchema(InventorySignalSchema.array());
        const parsed = schema.parse(raw);
        const data = parsed.data.map(sanitizeInventorySignal) as unknown as T;
        return { ...parsed, data } as McpResponse<T>;
      }
      case McpResourceType.SeoOpportunity: {
        const schema = McpResponseSchema(SeoOpportunitySchema.array());
        const parsed = schema.parse(raw);
        const data = parsed.data.map(sanitizeSeoOpportunity) as unknown as T;
        return { ...parsed, data } as McpResponse<T>;
      }
      default:
        return raw as McpResponse<T>;
    }
  }

  private buildCacheKey(path: string, payload: unknown) {
    return `${path}::${JSON.stringify(payload)}`;
  }

  private ensureCacheSize() {
    if (this.cache.size < this.cacheSize) return;
    const oldestKey = this.cache.keys().next().value as string | undefined;
    if (oldestKey) this.cache.delete(oldestKey);
  }
}

export const createMcpClient = (config?: McpClientConfig) => new McpClient(config);
