var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, useLocation, Link, useRouteError, useSearchParams, useNavigate, useNavigation, useFetcher, useRevalidator } from "@remix-run/react";
import { createReadableStreamFromReadable, json, redirect } from "@remix-run/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, DeliveryMethod, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient, SettingsSecretProvider, IntegrationProvider, ConnectionEventStatus, SeoInsightSeverity, SeoInsightStatus } from "@prisma/client";
import crypto, { randomUUID, createHash } from "node:crypto";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { AppProvider, Page, Card, FormLayout, Text, TextField, Button, BlockStack, Badge, Banner, InlineStack, ButtonGroup, InlineGrid, Layout, SkeletonDisplayText, SkeletonBodyText, SkeletonThumbnail, useIndexResourceState, Divider, EmptyState, IndexTable, Modal, Box, DataTable, Link as Link$1, List, Tabs, InlineError, Checkbox, useBreakpoints, Select, Tag, Pagination, Grid, Toast, ResourceList } from "@shopify/polaris";
import { AppProvider as AppProvider$1 } from "@shopify/shopify-app-remix/react";
import { NavMenu, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { PolarisVizProvider, SparkLineChart, BarChart, LineChart } from "@shopify/polaris-viz";
import { Faker, en } from "@faker-js/faker";
import { z } from "zod";
import { performance } from "node:perf_hooks";
import { ThumbsUpIcon, ThumbsDownIcon } from "@shopify/polaris-icons";
import { EventEmitter } from "node:events";
import { TextDecoder } from "node:util";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.January25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const shopify_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  addDocumentResponseHeaders,
  authenticate,
  login
}, Symbol.toStringTag, { value: "Module" }));
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url
        }
      ),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function App$2() {
  return /* @__PURE__ */ jsxs("html", { children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$2
}, Symbol.toStringTag, { value: "Module" }));
const WEBHOOK_BASE_PATH = "/webhooks";
const subscriptionSpecs = [
  {
    topic: "orders/create",
    key: "ORDERS_CREATE",
    callbackPath: `${WEBHOOK_BASE_PATH}/orders/create`,
    description: "Capture new orders for sync + OrderFlag bootstrapping"
  },
  {
    topic: "orders/fulfilled",
    key: "ORDERS_FULFILLED",
    callbackPath: `${WEBHOOK_BASE_PATH}/orders/fulfilled`,
    description: "Mark fulfilled orders + release queued follow-ups"
  },
  {
    topic: "fulfillments/update",
    key: "FULFILLMENTS_UPDATE",
    callbackPath: `${WEBHOOK_BASE_PATH}/fulfillments/update`,
    description: "Track fulfillment status changes for inventory + alerts"
  },
  {
    topic: "products/update",
    key: "PRODUCTS_UPDATE",
    callbackPath: `${WEBHOOK_BASE_PATH}/products/update`,
    description: "Refresh product velocity metrics + analytics caches"
  },
  {
    topic: "app/uninstalled",
    key: "APP_UNINSTALLED",
    callbackPath: `${WEBHOOK_BASE_PATH}/app/uninstalled`,
    description: "Purge store tokens + disable scheduled jobs on uninstall"
  }
];
subscriptionSpecs.reduce(
  (acc, spec) => ({
    ...acc,
    [spec.key]: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: spec.callbackPath
    }
  }),
  {}
);
subscriptionSpecs.map((spec) => spec.key);
subscriptionSpecs.map((spec) => spec.topic);
subscriptionSpecs.reduce(
  (acc, spec) => ({
    ...acc,
    [spec.key]: spec.description
  }),
  {}
);
const resolveWebhookKey = (topic) => {
  const normalized = topic.replace(/\./g, "/").replace(/_/g, "/").toLowerCase();
  const spec = subscriptionSpecs.find((entry2) => entry2.topic === normalized);
  return spec == null ? void 0 : spec.key;
};
const cleanupStoreSessions = async () => {
  console.log("[webhooks:persistence] cleanupStoreSessions called");
  return Promise.resolve();
};
const createWebhookEvent = async (eventData) => {
  console.log("[webhooks:persistence] createWebhookEvent called", eventData);
  return eventData;
};
const markWebhookEventStatus = async (eventId, status) => {
  console.log("[webhooks:persistence] markWebhookEventStatus called", { eventId, status });
  return Promise.resolve();
};
const persistOrderFlag = async (orderId, flag) => {
  console.log("[webhooks:persistence] persistOrderFlag called", { orderId, flag });
  return Promise.resolve();
};
const persistProductVelocity = async (productId, velocity) => {
  console.log("[webhooks:persistence] persistProductVelocity called", { productId, velocity });
  return Promise.resolve();
};
const snapshotWebhookRegistrations = async () => {
  console.log("[webhooks:persistence] snapshotWebhookRegistrations called");
  return [];
};
const snapshotOrderFlags = async () => {
  console.log("[webhooks:persistence] snapshotOrderFlags called");
  return [];
};
const snapshotVelocity = async () => {
  console.log("[webhooks:persistence] snapshotVelocity called");
  return [];
};
const parseBoolean$3 = (value, fallback = false) => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};
const queueName = process.env.WEBHOOK_QUEUE_NAME ?? "sync:webhooks";
const redisUrl = process.env.WEBHOOK_QUEUE_REDIS_URL ?? process.env.UPSTASH_REDIS_URL ?? "";
const driverPreference = (_b = process.env.WEBHOOK_QUEUE_DRIVER) == null ? void 0 : _b.toLowerCase();
const bullFlag = driverPreference === "bullmq" || !driverPreference && parseBoolean$3(process.env.WEBHOOK_QUEUE_USE_BULLMQ);
const bullConfigAvailable = Boolean(redisUrl);
const BULL_QUEUE_ENABLED = bullFlag && bullConfigAvailable;
let driver = null;
let bullQueueInstance = null;
const truncatePayload = (payload) => {
  if (payload == null) return void 0;
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length <= 512) return serialized;
    return `${serialized.slice(0, 509)}...`;
  } catch (_error) {
    return void 0;
  }
};
const nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
const createMemoryDriver = () => {
  const queue = [];
  return {
    async enqueue(job) {
      const timestamp = nowIso();
      const record = {
        id: randomUUID(),
        webhookId: job.webhookId,
        topicKey: job.topicKey,
        shopDomain: job.shopDomain,
        payloadDigest: truncatePayload(job.payload),
        attempts: 0,
        status: "pending",
        enqueuedAt: timestamp,
        updatedAt: timestamp
      };
      queue.push(record);
      return record;
    },
    async mark(jobId, status, error) {
      const record = queue.find((job) => job.id === jobId);
      if (!record) return void 0;
      record.status = status;
      record.updatedAt = nowIso();
      record.error = error;
      if (status === "failed" && error) {
        record.attempts += 1;
      }
      return record;
    },
    async snapshot() {
      return queue.map((job) => ({ ...job }));
    },
    async clear() {
      queue.splice(0, queue.length);
    },
    async purge(shopDomain) {
      const normalized = shopDomain.toLowerCase();
      let removed = 0;
      for (let index2 = queue.length - 1; index2 >= 0; index2 -= 1) {
        const item = queue[index2];
        if (item.shopDomain.toLowerCase() === normalized) {
          queue.splice(index2, 1);
          removed += 1;
        }
      }
      return removed;
    }
  };
};
const createRedisOptions = () => {
  const options = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };
  if (redisUrl.startsWith("rediss://")) {
    options.tls = { rejectUnauthorized: false };
  }
  return options;
};
const createRedisConnection = () => {
  if (!redisUrl) {
    throw new Error("WEBHOOK_QUEUE_REDIS_URL or UPSTASH_REDIS_URL must be set when BullMQ driver is enabled");
  }
  return new IORedis(redisUrl, createRedisOptions());
};
const ensureBullQueue = () => {
  if (!bullQueueInstance) {
    if (!BULL_QUEUE_ENABLED) {
      throw new Error("BullMQ queue requested but feature flag is disabled");
    }
    const queueOptions = {
      connection: createRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { age: 60 * 60, count: 500 },
        removeOnFail: { age: 24 * 60 * 60, count: 1e3 },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2e3
        }
      }
    };
    bullQueueInstance = new Queue(queueName, queueOptions);
  }
  return bullQueueInstance;
};
const mapJobStatus = (job) => {
  if (job.finishedOn) return "completed";
  if (job.failedReason) return "failed";
  if (job.processedOn) return "processing";
  return "pending";
};
const toQueueJob = (job) => {
  var _a2, _b2, _c, _d, _e, _f;
  const enqueuedAt = ((_a2 = job.data) == null ? void 0 : _a2.enqueuedAt) ?? new Date(job.timestamp ?? Date.now()).toISOString();
  const updatedAtMs = job.finishedOn ?? job.processedOn ?? job.timestamp ?? Date.now();
  return {
    id: String(job.id ?? job.name ?? randomUUID()),
    webhookId: (_b2 = job.data) == null ? void 0 : _b2.webhookId,
    topicKey: ((_c = job.data) == null ? void 0 : _c.topicKey) ?? job.name,
    shopDomain: ((_d = job.data) == null ? void 0 : _d.shopDomain) ?? "",
    payloadDigest: ((_e = job.data) == null ? void 0 : _e.payloadDigest) ?? truncatePayload((_f = job.data) == null ? void 0 : _f.payload),
    attempts: job.attemptsMade ?? 0,
    status: mapJobStatus(job),
    enqueuedAt,
    updatedAt: new Date(updatedAtMs).toISOString(),
    error: job.failedReason ?? void 0
  };
};
const createBullDriver = () => {
  const queue = ensureBullQueue();
  return {
    async enqueue(job) {
      const enqueuedAt = nowIso();
      const payloadDigest = truncatePayload(job.payload);
      const data = {
        webhookId: job.webhookId,
        topicKey: job.topicKey,
        shopDomain: job.shopDomain,
        payload: job.payload,
        payloadDigest,
        enqueuedAt
      };
      const bullJob = await queue.add(job.topicKey ?? "webhook", data);
      return toQueueJob(bullJob);
    },
    async mark() {
      throw new Error("Manual queue status overrides are disabled when BullMQ is active");
    },
    async snapshot() {
      const jobs = await queue.getJobs(["waiting", "delayed", "active", "completed", "failed"], 0, 50, false);
      return jobs.map((job) => toQueueJob(job));
    },
    async clear() {
      await queue.drain(true);
      await queue.clean(0, 1e3, "completed");
      await queue.clean(0, 1e3, "failed");
      await queue.clean(0, 1e3, "delayed");
    },
    async purge(shopDomain) {
      var _a2, _b2;
      const normalized = shopDomain.toLowerCase();
      const targetStatuses = ["waiting", "delayed", "paused", "waiting-children"];
      const jobs = await queue.getJobs(targetStatuses, 0, -1, false);
      let removed = 0;
      for (const job of jobs) {
        const domain = (((_a2 = job.data) == null ? void 0 : _a2.shopDomain) ?? ((_b2 = job.data) == null ? void 0 : _b2.shop) ?? "").toLowerCase();
        if (domain === normalized) {
          await job.remove();
          removed += 1;
        }
      }
      return removed;
    }
  };
};
const getDriver = () => {
  if (!driver) {
    driver = BULL_QUEUE_ENABLED ? createBullDriver() : createMemoryDriver();
  }
  return driver;
};
const isBullQueueEnabled = () => BULL_QUEUE_ENABLED;
const enqueueWebhookJob = (job) => getDriver().enqueue(job);
const markJobStatus = (jobId, status, error) => getDriver().mark(jobId, status, error);
const snapshotQueue = () => getDriver().snapshot();
const clearQueue = () => getDriver().clear();
const processedWebhookIds = /* @__PURE__ */ new Set();
const hasProcessedWebhook = (webhookId) => {
  if (!webhookId) return false;
  return processedWebhookIds.has(webhookId);
};
const markWebhookProcessed = (webhookId) => {
  if (!webhookId) return;
  processedWebhookIds.add(webhookId);
};
const ensurePayloadObject = (payload) => {
  if (payload && typeof payload === "object") {
    return payload;
  }
  return {};
};
const withWebhookProcessing = async (context, impl) => {
  if (!context.webhookId) {
    throw new Error("Webhook context missing webhookId");
  }
  if (hasProcessedWebhook(context.webhookId)) {
    return { duplicate: true };
  }
  const topicKey = resolveWebhookKey(context.topic);
  if (!topicKey) {
    throw new Error(`Unsupported webhook topic: ${context.topic}`);
  }
  const payloadObject = ensurePayloadObject(context.payload);
  const eventRecord = await createWebhookEvent(
    context.webhookId,
    context.shop,
    context.topic
  );
  const webhookEventId = eventRecord == null ? void 0 : eventRecord.id;
  await markWebhookEventStatus(context.webhookId, "PROCESSING");
  try {
    await impl({
      ...context,
      topicKey,
      payloadObject,
      webhookEventId
    });
    await markWebhookEventStatus(context.webhookId, "SUCCEEDED");
    markWebhookProcessed(context.webhookId);
    return { enqueued: true };
  } catch (error) {
    error instanceof Error ? error.message : "Unknown error";
    await markWebhookEventStatus(context.webhookId, "FAILED");
    throw error;
  }
};
const extractOrderId = (payload) => (payload == null ? void 0 : payload.admin_graphql_api_id) || (payload == null ? void 0 : payload.id) || (payload == null ? void 0 : payload.order_id) || (payload == null ? void 0 : payload.legacyResourceId);
const extractSku = (payload) => {
  const firstVariant = Array.isArray(payload == null ? void 0 : payload.variants) ? payload.variants[0] : void 0;
  if (firstVariant == null ? void 0 : firstVariant.sku) return String(firstVariant.sku);
  if (payload == null ? void 0 : payload.sku) return String(payload.sku);
  if (payload == null ? void 0 : payload.id) return `product-${payload.id}`;
  return `product-${Date.now()}`;
};
const estimateAverageDailySales = (payload) => {
  const velocity = Number((payload == null ? void 0 : payload.velocity) ?? (payload == null ? void 0 : payload.average_daily_sales) ?? 0);
  if (Number.isFinite(velocity) && velocity > 0) return velocity;
  const totalSales = Number((payload == null ? void 0 : payload.total_sales) ?? (payload == null ? void 0 : payload.totalOrdered) ?? 0);
  if (Number.isFinite(totalSales) && totalSales > 0) {
    const days = Number((payload == null ? void 0 : payload.days) ?? 30) || 30;
    return Number((totalSales / days).toFixed(2));
  }
  return 0;
};
const handleOrdersCreateImpl = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey
}) => {
  const orderId = extractOrderId(payloadObject);
  await persistOrderFlag({
    shopDomain: shop,
    webhookEventId,
    orderId,
    flagType: "order_created",
    status: "OPEN",
    metadata: {
      webhookId,
      financialStatus: payloadObject == null ? void 0 : payloadObject.financial_status,
      fulfillmentStatus: payloadObject == null ? void 0 : payloadObject.fulfillment_status,
      totalPrice: payloadObject == null ? void 0 : payloadObject.total_price
    }
  });
  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      orderId,
      reason: "order_created",
      placedAt: payloadObject == null ? void 0 : payloadObject.created_at
    }
  });
};
const handleOrdersFulfilledImpl = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey
}) => {
  const orderId = extractOrderId(payloadObject);
  await persistOrderFlag({
    shopDomain: shop,
    webhookEventId,
    orderId,
    flagType: "order_fulfilled",
    status: "RESOLVED",
    metadata: {
      webhookId,
      fulfilledAt: (payloadObject == null ? void 0 : payloadObject.fulfilled_at) ?? (payloadObject == null ? void 0 : payloadObject.processed_at),
      locationId: payloadObject == null ? void 0 : payloadObject.location_id
    }
  });
  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      orderId,
      reason: "order_fulfilled",
      fulfillmentStatus: payloadObject == null ? void 0 : payloadObject.fulfillment_status
    }
  });
};
const handleFulfillmentsUpdateImpl = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey
}) => {
  const orderId = extractOrderId(payloadObject);
  await persistOrderFlag({
    shopDomain: shop,
    webhookEventId,
    orderId,
    flagType: "fulfillment_update",
    status: "OPEN",
    metadata: {
      webhookId,
      status: payloadObject == null ? void 0 : payloadObject.status,
      trackingCompany: payloadObject == null ? void 0 : payloadObject.tracking_company,
      trackingNumbers: payloadObject == null ? void 0 : payloadObject.tracking_numbers
    }
  });
  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      orderId,
      reason: "fulfillment_update",
      status: payloadObject == null ? void 0 : payloadObject.status
    }
  });
};
const handleProductsUpdateImpl = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey
}) => {
  const sku = extractSku(payloadObject);
  const averageDailySales = estimateAverageDailySales(payloadObject);
  const currentInventory = Number((payloadObject == null ? void 0 : payloadObject.total_inventory) ?? (payloadObject == null ? void 0 : payloadObject.inventory_quantity) ?? 0);
  await persistProductVelocity({
    shopDomain: shop,
    webhookEventId,
    sku,
    averageDailySales,
    currentInventory,
    metadata: {
      webhookId,
      productId: payloadObject == null ? void 0 : payloadObject.id,
      title: payloadObject == null ? void 0 : payloadObject.title
    }
  });
  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      sku,
      averageDailySales,
      currentInventory
    }
  });
};
const handleAppUninstalledImpl = async ({
  shop,
  webhookId,
  topicKey
}) => {
  await cleanupStoreSessions();
  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      action: "cleanup"
    }
  });
};
const handleOrdersCreate = (context) => withWebhookProcessing(context, handleOrdersCreateImpl);
const handleOrdersFulfilled = (context) => withWebhookProcessing(context, handleOrdersFulfilledImpl);
const handleFulfillmentsUpdate = (context) => withWebhookProcessing(context, handleFulfillmentsUpdateImpl);
const handleProductsUpdate = (context) => withWebhookProcessing(context, handleProductsUpdateImpl);
const handleAppUninstalled = (context) => withWebhookProcessing(context, handleAppUninstalledImpl);
const action$i = async ({ request }) => {
  const context = await authenticate.webhook(request);
  await handleFulfillmentsUpdate({
    apiVersion: context.apiVersion,
    shop: context.shop,
    topic: context.topic,
    webhookId: context.webhookId,
    payload: context.payload,
    session: context.session,
    admin: context.admin,
    subTopic: context.subTopic
  });
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$i
}, Symbol.toStringTag, { value: "Module" }));
const action$h = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$h
}, Symbol.toStringTag, { value: "Module" }));
const action$g = async ({ request }) => {
  const context = await authenticate.webhook(request);
  await handleOrdersFulfilled({
    apiVersion: context.apiVersion,
    shop: context.shop,
    topic: context.topic,
    webhookId: context.webhookId,
    payload: context.payload,
    session: context.session,
    admin: context.admin,
    subTopic: context.subTopic
  });
  return new Response();
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$g
}, Symbol.toStringTag, { value: "Module" }));
const action$f = async ({ request }) => {
  const context = await authenticate.webhook(request);
  await handleAppUninstalled({
    apiVersion: context.apiVersion,
    shop: context.shop,
    topic: context.topic,
    webhookId: context.webhookId,
    payload: context.payload,
    session: context.session,
    admin: context.admin,
    subTopic: context.subTopic
  });
  return new Response();
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$f
}, Symbol.toStringTag, { value: "Module" }));
const action$e = async ({ request }) => {
  const context = await authenticate.webhook(request);
  await handleProductsUpdate({
    apiVersion: context.apiVersion,
    shop: context.shop,
    topic: context.topic,
    webhookId: context.webhookId,
    payload: context.payload,
    session: context.session,
    admin: context.admin,
    subTopic: context.subTopic
  });
  return new Response();
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$e
}, Symbol.toStringTag, { value: "Module" }));
const action$d = async ({ request }) => {
  const context = await authenticate.webhook(request);
  await handleOrdersCreate({
    apiVersion: context.apiVersion,
    shop: context.shop,
    topic: context.topic,
    webhookId: context.webhookId,
    payload: context.payload,
    session: context.session,
    admin: context.admin,
    subTopic: context.subTopic
  });
  return new Response();
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$d
}, Symbol.toStringTag, { value: "Module" }));
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1e3;
const MILLISECONDS_IN_MINUTE = 60 * 1e3;
const DEFAULT_KPI_CACHE_TTL_MINUTES = 6 * 60;
const toDate = (value) => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
};
const normalizeStoreDomain = (store) => {
  if (!store) {
    return null;
  }
  if (store.domain) {
    return store.domain;
  }
  if (store.myShopifyDomain) {
    return store.myShopifyDomain;
  }
  return null;
};
const pruneConnectionEvents = async (options = {}) => {
  const retainDays = options.retainDays ?? 30;
  const now2 = options.now ? new Date(options.now) : /* @__PURE__ */ new Date();
  const cutoff = new Date(now2.getTime() - retainDays * MILLISECONDS_IN_DAY);
  const staleEvents = await prisma.connectionEvent.findMany({
    where: { createdAt: { lt: cutoff } },
    select: {
      id: true,
      storeId: true,
      integration: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
  if (staleEvents.length === 0) {
    return {
      cutoff: cutoff.toISOString(),
      staleCount: 0,
      deletedCount: 0,
      combosScanned: 0,
      keepIds: []
    };
  }
  const combos = /* @__PURE__ */ new Map();
  for (const event of staleEvents) {
    const key = `${event.storeId}:${event.integration}`;
    if (!combos.has(key)) {
      combos.set(key, {
        storeId: event.storeId,
        integration: event.integration
      });
    }
  }
  const keepIds = /* @__PURE__ */ new Set();
  const comboArray = Array.from(combos.values());
  if (comboArray.length > 0) {
    const latestPerCombo = await Promise.all(
      comboArray.map(
        (combo) => prisma.connectionEvent.findFirst({
          where: {
            storeId: combo.storeId,
            integration: combo.integration
          },
          orderBy: {
            createdAt: "desc"
          },
          select: { id: true }
        })
      )
    );
    for (const record of latestPerCombo) {
      if (record == null ? void 0 : record.id) {
        keepIds.add(record.id);
      }
    }
  }
  const idsToDelete = staleEvents.filter((event) => !keepIds.has(event.id)).map((event) => event.id);
  let deletedCount = 0;
  if (idsToDelete.length > 0) {
    const result = await prisma.connectionEvent.deleteMany({
      where: { id: { in: idsToDelete } }
    });
    deletedCount = result.count;
  }
  return {
    cutoff: cutoff.toISOString(),
    staleCount: staleEvents.length,
    deletedCount,
    combosScanned: combos.size,
    keepIds: Array.from(keepIds.values())
  };
};
const collectSecretRotationReminders = async (options = {}) => {
  var _a2, _b2, _c;
  const now2 = options.now ? new Date(options.now) : /* @__PURE__ */ new Date();
  const upcomingWindowDays = options.upcomingWindowDays ?? 14;
  const upperBound = new Date(now2.getTime() + upcomingWindowDays * MILLISECONDS_IN_DAY);
  const secrets = await prisma.storeSecret.findMany({
    where: {
      rotationReminderAt: {
        not: null,
        lte: upperBound
      }
    },
    select: {
      id: true,
      storeId: true,
      provider: true,
      maskedValue: true,
      rotationReminderAt: true,
      store: {
        select: {
          domain: true,
          myShopifyDomain: true,
          name: true,
          settings: {
            select: {
              notificationEmails: true
            }
          }
        }
      }
    },
    orderBy: {
      rotationReminderAt: "asc"
    }
  });
  const records = [];
  for (const secret of secrets) {
    const reminderAt = toDate(secret.rotationReminderAt);
    if (!reminderAt) {
      continue;
    }
    const diffMs = reminderAt.getTime() - now2.getTime();
    const status = diffMs < 0 ? "overdue" : "upcoming";
    const daysUntilDue = diffMs >= 0 ? Math.ceil(diffMs / MILLISECONDS_IN_DAY) : 0;
    const daysOverdue = diffMs < 0 ? Math.ceil(Math.abs(diffMs) / MILLISECONDS_IN_DAY) : 0;
    records.push({
      secretId: secret.id,
      storeId: secret.storeId,
      provider: secret.provider,
      maskedValue: secret.maskedValue,
      rotationReminderAt: reminderAt.toISOString(),
      status,
      daysUntilDue,
      daysOverdue,
      shopDomain: normalizeStoreDomain(secret.store ?? null),
      storeName: ((_a2 = secret.store) == null ? void 0 : _a2.name) ?? null,
      notificationEmails: ((_c = (_b2 = secret.store) == null ? void 0 : _b2.settings) == null ? void 0 : _c.notificationEmails) ?? null
    });
  }
  return records;
};
const pruneKpiCache = async (options = {}) => {
  const now2 = options.now ? new Date(options.now) : /* @__PURE__ */ new Date();
  const fallbackTtlMinutes = options.fallbackTtlMinutes ?? DEFAULT_KPI_CACHE_TTL_MINUTES;
  const expired = await prisma.kpiCache.findMany({
    where: {
      expiresAt: {
        not: null,
        lt: now2
      }
    },
    select: { id: true }
  });
  const staleIds = /* @__PURE__ */ new Set();
  let fallbackCutoff = null;
  for (const row of expired) {
    staleIds.add(row.id);
  }
  if (fallbackTtlMinutes > 0) {
    fallbackCutoff = new Date(now2.getTime() - fallbackTtlMinutes * MILLISECONDS_IN_MINUTE);
    const staleWithoutExpiry = await prisma.kpiCache.findMany({
      where: {
        expiresAt: null,
        refreshedAt: {
          lt: fallbackCutoff
        }
      },
      select: { id: true }
    });
    for (const row of staleWithoutExpiry) {
      staleIds.add(row.id);
    }
  }
  const staleCount = staleIds.size;
  if (staleCount === 0) {
    return {
      staleCount: 0,
      deletedCount: 0,
      expiredCount: expired.length,
      fallbackCount: 0,
      fallbackCutoff: fallbackCutoff ? fallbackCutoff.toISOString() : null
    };
  }
  const deleteResult = await prisma.kpiCache.deleteMany({
    where: {
      id: {
        in: Array.from(staleIds.values())
      }
    }
  });
  return {
    staleCount,
    deletedCount: deleteResult.count,
    expiredCount: expired.length,
    fallbackCount: staleCount - expired.length,
    fallbackCutoff: fallbackCutoff ? fallbackCutoff.toISOString() : null
  };
};
const runSettingsRetention = async (options = {}) => {
  const now2 = options.now ? new Date(options.now) : /* @__PURE__ */ new Date();
  const prune = await pruneConnectionEvents({
    retainDays: options.retainDays,
    now: now2
  });
  const rotationReminders = await collectSecretRotationReminders({
    upcomingWindowDays: options.upcomingWindowDays,
    now: now2
  });
  const kpiCache = await pruneKpiCache({
    now: now2
  });
  return {
    ranAt: now2.toISOString(),
    prune,
    rotationReminders,
    kpiCache
  };
};
const CRON_STATUS_UNAUTHORIZED = { status: 401, statusText: "Unauthorized" };
const METHOD_NOT_ALLOWED = { status: 405, statusText: "Method Not Allowed" };
const parseJsonBody = async (request) => {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
};
const isAuthorized = (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }
  const header = request.headers.get("authorization");
  if (header == null ? void 0 : header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    return token === secret;
  }
  const urlSecret = new URL(request.url).searchParams.get("token");
  return urlSecret === secret;
};
const loader$i = async (_args) => new Response("Use POST", METHOD_NOT_ALLOWED);
const action$c = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("Unsupported method", METHOD_NOT_ALLOWED);
  }
  if (!isAuthorized(request)) {
    return new Response("Missing or invalid cron token", CRON_STATUS_UNAUTHORIZED);
  }
  const overrides = await parseJsonBody(request) ?? void 0;
  const result = await runSettingsRetention(overrides ?? {});
  console.info("[cron:retention] Completed settings retention sweep", {
    ranAt: result.ranAt,
    deletedEvents: result.prune.deletedCount,
    staleEvents: result.prune.staleCount,
    reminders: result.rotationReminders.length,
    kpiCacheDeleted: result.kpiCache.deletedCount,
    kpiCacheStale: result.kpiCache.staleCount
  });
  return json({ ok: true, result });
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c,
  loader: loader$i
}, Symbol.toStringTag, { value: "Module" }));
const loader$h = async (_args) => {
  const [queue, registrations, orderFlags, productVelocity] = await Promise.all([
    snapshotQueue(),
    snapshotWebhookRegistrations(),
    snapshotOrderFlags(),
    snapshotVelocity()
  ]);
  return json({
    queue,
    registrations,
    orderFlags,
    productVelocity
  });
};
const action$b = async ({ request }) => {
  switch (request.method) {
    case "POST": {
      const body = await safeJson(request);
      if (!body) {
        return new Response("Invalid JSON body", { status: 400 });
      }
      if (!body.topicKey && !body.topic) {
        return new Response("Missing topic", { status: 422 });
      }
      if (!body.shop && !body.shopDomain) {
        return new Response("Missing shop domain", { status: 422 });
      }
      const job = await enqueueWebhookJob({
        webhookId: body.webhookId,
        topicKey: body.topicKey ?? body.topic,
        shopDomain: body.shop ?? body.shopDomain,
        payload: body.payload
      });
      return json({ job }, { status: 201 });
    }
    case "PATCH": {
      if (isBullQueueEnabled()) {
        return new Response(
          "Manual queue status updates are disabled while the BullMQ driver is active",
          { status: 409 }
        );
      }
      const body = await safeJson(request);
      if (!body || !body.id || !body.status) {
        return new Response("Missing job id or status", { status: 422 });
      }
      const job = await markJobStatus(body.id, body.status, body.error);
      if (!job) {
        return new Response("Job not found", { status: 404 });
      }
      return json({ job });
    }
    case "DELETE": {
      await clearQueue();
      return new Response(null, { status: 204 });
    }
    default:
      return new Response(null, { status: 405 });
  }
};
const safeJson = async (request) => {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b,
  loader: loader$h
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"ActionMenu":{"Actions":{"moreActions":"More actions"},"RollupActions":{"rollupButton":"View actions"}},"ActionList":{"SearchField":{"clearButtonLabel":"Clear","search":"Search","placeholder":"Search actions"}},"Avatar":{"label":"Avatar","labelWithInitials":"Avatar with initials {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Loading","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Incomplete","partiallyComplete":"Partially complete","complete":"Complete"},"TONE_LABELS":{"info":"Info","success":"Success","warning":"Warning","critical":"Critical","attention":"Attention","new":"New","readOnly":"Read-only","enabled":"Enabled"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Dismiss notification"},"Button":{"spinnerAccessibilityLabel":"Loading"},"Common":{"checkbox":"checkbox","undo":"Undo","cancel":"Cancel","clear":"Clear","close":"Close","submit":"Submit","more":"More"},"ContextualSaveBar":{"save":"Save","discard":"Discard"},"DataTable":{"sortAccessibilityLabel":"sort {direction} by","navAccessibilityLabel":"Scroll table {direction} one column","totalsRowHeading":"Totals","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Show previous month, {previousMonthName} {showPreviousYear}","nextMonth":"Show next month, {nextMonth} {nextYear}","today":"Today ","start":"Start of range","end":"End of range","months":{"january":"January","february":"February","march":"March","april":"April","may":"May","june":"June","july":"July","august":"August","september":"September","october":"October","november":"November","december":"December"},"days":{"monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"daysAbbreviated":{"monday":"Mo","tuesday":"Tu","wednesday":"We","thursday":"Th","friday":"Fr","saturday":"Sa","sunday":"Su"}},"DiscardConfirmationModal":{"title":"Discard all unsaved changes","message":"If you discard changes, you’ll delete any edits you made since you last saved.","primaryAction":"Discard changes","secondaryAction":"Continue editing"},"DropZone":{"single":{"overlayTextFile":"Drop file to upload","overlayTextImage":"Drop image to upload","overlayTextVideo":"Drop video to upload","actionTitleFile":"Add file","actionTitleImage":"Add image","actionTitleVideo":"Add video","actionHintFile":"or drop file to upload","actionHintImage":"or drop image to upload","actionHintVideo":"or drop video to upload","labelFile":"Upload file","labelImage":"Upload image","labelVideo":"Upload video"},"allowMultiple":{"overlayTextFile":"Drop files to upload","overlayTextImage":"Drop images to upload","overlayTextVideo":"Drop videos to upload","actionTitleFile":"Add files","actionTitleImage":"Add images","actionTitleVideo":"Add videos","actionHintFile":"or drop files to upload","actionHintImage":"or drop images to upload","actionHintVideo":"or drop videos to upload","labelFile":"Upload files","labelImage":"Upload images","labelVideo":"Upload videos"},"errorOverlayTextFile":"File type is not valid","errorOverlayTextImage":"Image type is not valid","errorOverlayTextVideo":"Video type is not valid"},"EmptySearchResult":{"altText":"Empty search results"},"Frame":{"skipToContent":"Skip to content","navigationLabel":"Navigation","Navigation":{"closeMobileNavigationLabel":"Close navigation"}},"FullscreenBar":{"back":"Back","accessibilityLabel":"Exit fullscreen mode"},"Filters":{"moreFilters":"More filters","moreFiltersWithCount":"More filters ({count})","filter":"Filter {resourceName}","noFiltersApplied":"No filters applied","cancel":"Cancel","done":"Done","clearAllFilters":"Clear all filters","clear":"Clear","clearLabel":"Clear {filterName}","addFilter":"Add filter","clearFilters":"Clear all","searchInView":"in:{viewName}"},"FilterPill":{"clear":"Clear","unsavedChanges":"Unsaved changes - {label}"},"IndexFilters":{"searchFilterTooltip":"Search and filter","searchFilterTooltipWithShortcut":"Search and filter (F)","searchFilterAccessibilityLabel":"Search and filter results","sort":"Sort your results","addView":"Add a new view","newView":"Custom search","SortButton":{"ariaLabel":"Sort the results","tooltip":"Sort","title":"Sort by","sorting":{"asc":"Ascending","desc":"Descending","az":"A-Z","za":"Z-A"}},"EditColumnsButton":{"tooltip":"Edit columns","accessibilityLabel":"Customize table column order and visibility"},"UpdateButtons":{"cancel":"Cancel","update":"Update","save":"Save","saveAs":"Save as","modal":{"title":"Save view as","label":"Name","sameName":"A view with this name already exists. Please choose a different name.","save":"Save","cancel":"Cancel"}}},"IndexProvider":{"defaultItemSingular":"Item","defaultItemPlural":"Items","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} are selected","selected":"{selectedItemsCount} selected","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No {resourceNamePlural} found","emptySearchDescription":"Try changing the filters or search term","onboardingBadgeText":"New","resourceLoadingAccessibilityLabel":"Loading {resourceNamePlural}…","selectAllLabel":"Select all {resourceNamePlural}","selected":"{selectedItemsCount} selected","undo":"Undo","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural}","selectItem":"Select {resourceName}","selectButtonText":"Select","sortAccessibilityLabel":"sort {direction} by"},"Loading":{"label":"Page loading bar"},"Modal":{"iFrameTitle":"body markup","modalWarning":"These required properties are missing from Modal: {missingProps}"},"Page":{"Header":{"rollupActionsLabel":"View actions for {title}","pageReadyAccessibilityLabel":"{title}. This page is ready"}},"Pagination":{"previous":"Previous","next":"Next","pagination":"Pagination"},"ProgressBar":{"negativeWarningMessage":"Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.","exceedWarningMessage":"Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."},"ResourceList":{"sortingLabel":"Sort by","defaultItemSingular":"item","defaultItemPlural":"items","showing":"Showing {itemsCount} {resource}","showingTotalCount":"Showing {itemsCount} of {totalItemsCount} {resource}","loading":"Loading {resource}","selected":"{selectedItemsCount} selected","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} in your store are selected","allFilteredItemsSelected":"All {itemsLength}+ {resourceNamePlural} in this filter are selected","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural} in your store","selectAllFilteredItems":"Select all {itemsLength}+ {resourceNamePlural} in this filter","emptySearchResultTitle":"No {resourceNamePlural} found","emptySearchResultDescription":"Try changing the filters or search term","selectButtonText":"Select","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Actions for {accessibilityLabel}","actionsDropdown":"Actions dropdown","viewItem":"View details for {itemName}"},"BulkActions":{"actionsActivatorLabel":"Actions","moreActionsActivatorLabel":"More actions"}},"SkeletonPage":{"loadingLabel":"Page loading"},"Tabs":{"newViewAccessibilityLabel":"Create new view","newViewTooltip":"Create view","toggleTabsLabel":"More views","Tab":{"rename":"Rename view","duplicate":"Duplicate view","edit":"Edit view","editColumns":"Edit columns","delete":"Delete view","copy":"Copy of {name}","deleteModal":{"title":"Delete view?","description":"This can’t be undone. {viewName} view will no longer be available in your admin.","cancel":"Cancel","delete":"Delete view"}},"RenameModal":{"title":"Rename view","label":"Name","cancel":"Cancel","create":"Save","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"DuplicateModal":{"title":"Duplicate view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"CreateViewModal":{"title":"Create new view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}}},"Tag":{"ariaLabel":"Remove {children}"},"TextField":{"characterCount":"{count} characters","characterCountWithMaxLength":"{count} of {limit} characters used"},"TooltipOverlay":{"accessibilityLabel":"Tooltip: {label}"},"TopBar":{"toggleMenuLabel":"Toggle menu","SearchField":{"clearButtonLabel":"Clear","search":"Search"}},"MediaCard":{"dismissButton":"Dismiss","popoverButton":"Actions"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Play video","defaultWithDuration":"Play video of length {duration}","duration":{"hours":{"other":{"only":"{hourCount} hours","andMinutes":"{hourCount} hours and {minuteCount} minutes","andMinute":"{hourCount} hours and {minuteCount} minute","minutesAndSeconds":"{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hours, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hours, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hours, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hours and {secondCount} seconds","andSecond":"{hourCount} hours and {secondCount} second"},"one":{"only":"{hourCount} hour","andMinutes":"{hourCount} hour and {minuteCount} minutes","andMinute":"{hourCount} hour and {minuteCount} minute","minutesAndSeconds":"{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hour, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hour, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hour, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hour and {secondCount} seconds","andSecond":"{hourCount} hour and {secondCount} second"}},"minutes":{"other":{"only":"{minuteCount} minutes","andSeconds":"{minuteCount} minutes and {secondCount} seconds","andSecond":"{minuteCount} minutes and {secondCount} second"},"one":{"only":"{minuteCount} minute","andSeconds":"{minuteCount} minute and {secondCount} seconds","andSecond":"{minuteCount} minute and {secondCount} second"}},"seconds":{"other":"{secondCount} seconds","one":"{secondCount} second"}}}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-BeiPL2RV.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const links$1 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$g = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};
const action$a = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "example.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a,
  default: Auth,
  links: links$1,
  loader: loader$g
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$f = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};
function App$1() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: styles.index, children: /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "A short heading about [your app]" }),
    /* @__PURE__ */ jsx("p", { className: styles.text, children: "A tagline about [your app] that describes your value proposition." }),
    showForm && /* @__PURE__ */ jsxs(Form, { className: styles.form, method: "post", action: "/auth/login", children: [
      /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
        /* @__PURE__ */ jsx("span", { children: "Shop domain" }),
        /* @__PURE__ */ jsx("input", { className: styles.input, type: "text", name: "shop" }),
        /* @__PURE__ */ jsx("span", { children: "e.g: my-shop-domain.myshopify.com" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Log in" })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] })
    ] })
  ] }) });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
const loader$e = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$d = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const navItems = [
    { label: "Dashboard", to: "/app" },
    { label: "Sales", to: "/app/sales" },
    { label: "Orders", to: "/app/orders" },
    { label: "Inbox", to: "/app/inbox" },
    { label: "Inventory", to: "/app/inventory" },
    { label: "SEO", to: "/app/seo" },
    { label: "Settings", to: "/app/settings" }
  ];
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsx(NavMenu, { children: navItems.map((item) => {
      const isActive = location.pathname === item.to;
      return /* @__PURE__ */ jsx(
        Link,
        {
          to: item.to,
          prefetch: "intent",
          style: isActive ? { fontWeight: 600 } : void 0,
          children: item.label
        },
        item.to
      );
    }) }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
const roundTo$1 = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};
const percentage = (part, total, precision = 1) => {
  if (total === 0) {
    return 0;
  }
  return roundTo$1(part / total * 100, precision);
};
const deltaPercentage = (current, previous, precision = 1) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundTo$1((current - previous) / previous * 100, precision);
};
const DEFAULT_CURRENCY$1 = "USD";
const formatterCache = /* @__PURE__ */ new Map();
const buildFormatter = (currency, fractionDigits) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: fractionDigits,
  maximumFractionDigits: fractionDigits
});
const getFormatter = (currency, fractionDigits) => {
  const key = `${currency}-${fractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = buildFormatter(currency, fractionDigits);
    formatterCache.set(key, formatter);
  }
  return formatter;
};
const roundTo = (value, precision = 2) => {
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const sanitizeAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};
const formatCurrency$3 = (amount, currency = DEFAULT_CURRENCY$1) => {
  const numeric = sanitizeAmount(amount);
  const absolute = Math.abs(numeric);
  if (absolute >= 1e3) {
    const scaled = roundTo(numeric / 1e3, 1);
    const formatter2 = getFormatter(currency, 1);
    return `${formatter2.format(scaled)}K`;
  }
  const formatter = getFormatter(currency, 2);
  return formatter.format(roundTo(numeric, 2));
};
const createMoney$1 = (amount, currency = DEFAULT_CURRENCY$1) => {
  const numeric = roundTo(sanitizeAmount(amount), 2);
  return {
    amount: numeric,
    currency,
    formatted: formatCurrency$3(numeric, currency)
  };
};
const DEFAULT_SEED = 1337;
const SCENARIO_SEEDS = {
  base: DEFAULT_SEED,
  empty: DEFAULT_SEED + 101,
  warning: DEFAULT_SEED + 202,
  error: DEFAULT_SEED + 303
};
const createSeededFaker = (seed = DEFAULT_SEED) => {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
};
const createScenarioFaker$1 = (scenario, offset = 0) => {
  const baseSeed = SCENARIO_SEEDS[scenario] ?? DEFAULT_SEED;
  return createSeededFaker(baseSeed + offset);
};
const clone = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};
const isMockScenario = (value) => {
  return value === "base" || value === "empty" || value === "warning" || value === "error";
};
const resolveScenario = (candidate, fallback = "base") => {
  if (candidate && isMockScenario(candidate)) {
    return candidate;
  }
  return fallback;
};
const scenarioFromSearchParams = (searchParams, paramName = "mockState") => {
  const value = (searchParams == null ? void 0 : searchParams.get(paramName)) ?? void 0;
  return resolveScenario(value);
};
const scenarioToDatasetState = (scenario) => {
  switch (scenario) {
    case "empty":
      return "empty";
    case "warning":
      return "warning";
    case "error":
      return "error";
    default:
      return "ok";
  }
};
const BASE_SHOP_DOMAIN = "demo-shop.myshopify.com";
const HISTORY_LIMIT = 5;
const baseThresholds = {
  lowStockMinimum: 8,
  overdueOrderHours: 12,
  overstockPercentage: 35
};
const baseToggles = {
  enableMcpIntegration: true,
  enableExperimentalWidgets: false,
  enableBetaWorkflows: false,
  enableAssistantsProvider: false,
  useMockData: true,
  enableMcp: false,
  enableSeo: false,
  enableInventory: false
};
const baseSecretMetadata = {
  ga4: {
    provider: "ga4",
    maskedValue: "••••1234",
    lastUpdatedAt: "2024-01-12T12:00:00.000Z",
    lastVerifiedAt: "2024-02-02T09:15:00.000Z"
  },
  gsc: {
    provider: "gsc",
    maskedValue: "••••5678",
    lastUpdatedAt: "2023-12-20T15:30:00.000Z",
    lastVerifiedAt: "2024-01-05T18:20:00.000Z",
    rotationReminderAt: "2024-03-01T00:00:00.000Z"
  },
  bing: null,
  mcp: null
};
const baseConnections = {
  ga4: {
    provider: "ga4",
    status: "success",
    lastCheckedAt: "2024-02-05T14:10:00.000Z",
    message: "GA4 responded in 420ms",
    history: [
      {
        id: "ga4-20240130",
        provider: "ga4",
        status: "success",
        timestamp: "2024-01-30T11:10:00.000Z",
        durationMs: 410,
        message: "HTTP 200"
      },
      {
        id: "ga4-20240205",
        provider: "ga4",
        status: "success",
        timestamp: "2024-02-05T14:10:00.000Z",
        durationMs: 420,
        message: "HTTP 200"
      }
    ]
  },
  gsc: {
    provider: "gsc",
    status: "warning",
    lastCheckedAt: "2024-02-04T08:50:00.000Z",
    message: "Slow response (1.2s). Retry suggested.",
    history: [
      {
        id: "gsc-20240118",
        provider: "gsc",
        status: "success",
        timestamp: "2024-01-18T10:05:00.000Z",
        durationMs: 520,
        message: "HTTP 200"
      },
      {
        id: "gsc-20240204",
        provider: "gsc",
        status: "warning",
        timestamp: "2024-02-04T08:50:00.000Z",
        durationMs: 1200,
        message: "Response exceeded SLA"
      }
    ]
  },
  bing: {
    provider: "bing",
    status: "error",
    lastCheckedAt: "2024-02-02T13:40:00.000Z",
    message: "API key missing. Add credential to enable tests.",
    history: [
      {
        id: "bing-20240202",
        provider: "bing",
        status: "error",
        timestamp: "2024-02-02T13:40:00.000Z",
        durationMs: 0,
        message: "Credential not provided"
      }
    ]
  },
  mcp: {
    provider: "mcp",
    status: "warning",
    lastCheckedAt: "2024-02-06T10:00:00.000Z",
    message: "Mock MCP client active. Supply live credentials to enable ping tests.",
    history: [
      {
        id: "mcp-20240206",
        provider: "mcp",
        status: "warning",
        timestamp: "2024-02-06T10:00:00.000Z",
        durationMs: 250,
        message: "Using mock transport"
      }
    ]
  }
};
const settingsByShop = /* @__PURE__ */ new Map();
const createBaseSettings = (shopDomain) => ({
  shopDomain,
  thresholds: clone(baseThresholds),
  toggles: clone(baseToggles),
  secrets: clone(baseSecretMetadata),
  connections: clone(baseConnections)
});
const ensureSettings = (shopDomain) => {
  if (!settingsByShop.has(shopDomain)) {
    const initial = createBaseSettings(shopDomain);
    settingsByShop.set(shopDomain, initial);
  }
  return settingsByShop.get(shopDomain);
};
const resetMockSettings = (shopDomain = BASE_SHOP_DOMAIN) => {
  settingsByShop.set(shopDomain, createBaseSettings(shopDomain));
};
const getMockSettings = (shopDomain = BASE_SHOP_DOMAIN) => {
  const current = ensureSettings(shopDomain);
  return clone(current);
};
const updateMockThresholds = (shopDomain, thresholds) => {
  const current = ensureSettings(shopDomain);
  current.thresholds = { ...thresholds };
  return clone(current);
};
const updateMockToggles = (shopDomain, toggles) => {
  const current = ensureSettings(shopDomain);
  current.toggles = { ...toggles };
  return clone(current);
};
const updateMockSecret = (shopDomain, provider, secret) => {
  const current = ensureSettings(shopDomain);
  current.secrets[provider] = secret ? { ...secret } : null;
  return clone(current);
};
const recordMockConnectionAttempt = (shopDomain, attempt) => {
  const current = ensureSettings(shopDomain);
  const connection = current.connections[attempt.provider] ?? {
    provider: attempt.provider,
    status: attempt.status,
    history: []
  };
  const history = [clone(attempt), ...connection.history];
  connection.status = attempt.status;
  connection.lastCheckedAt = attempt.timestamp;
  connection.message = attempt.message;
  connection.history = history.slice(0, HISTORY_LIMIT);
  current.connections[attempt.provider] = connection;
  return clone(current);
};
resetMockSettings();
const ENCRYPTION_PREFIX = "mock::";
const encryptSecret = (secret) => {
  if (!secret) {
    throw new Error("Secret payload must be provided for encryption");
  }
  const iv = crypto.randomBytes(12).toString("base64");
  const payload = Buffer.from(secret, "utf-8").toString("base64");
  return `${ENCRYPTION_PREFIX}${iv}:${payload}`;
};
const decryptSecret = (encrypted) => {
  if (!encrypted) {
    return null;
  }
  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    throw new Error("Unexpected secret format");
  }
  const encoded = encrypted.slice(ENCRYPTION_PREFIX.length);
  const parts = encoded.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid secret payload");
  }
  const [, payload] = parts;
  return Buffer.from(payload, "base64").toString("utf-8");
};
const maskSecret = (secret, visibleChars = 4) => {
  if (!secret) {
    return "";
  }
  const trimmed = secret.trim();
  if (!trimmed) {
    return "";
  }
  const visible = trimmed.slice(-visibleChars);
  return `••••${visible}`;
};
const isMockMode = () => process.env.USE_MOCK_DATA !== "false";
const PROVIDERS = ["ga4", "gsc", "bing", "mcp"];
const createDefaultMcpOverrides = () => ({
  endpoint: null,
  timeoutMs: null,
  maxRetries: null
});
const cloneMcpOverrides = (overrides) => ({
  endpoint: overrides.endpoint,
  timeoutMs: overrides.timeoutMs,
  maxRetries: overrides.maxRetries
});
const toJson$1 = (value) => JSON.parse(JSON.stringify(value));
const defaultSecretSeeds = {
  ga4: "mock-ga4-service-account-1234",
  gsc: "mock-gsc-credentials-5678",
  bing: null,
  mcp: null
};
const encryptedSecretsStore = /* @__PURE__ */ new Map();
const mcpOverridesStore = /* @__PURE__ */ new Map();
const ensureEncryptedSecrets = (shopDomain) => {
  if (!encryptedSecretsStore.has(shopDomain)) {
    const seeds = {
      ga4: null,
      gsc: null,
      bing: null,
      mcp: null
    };
    PROVIDERS.forEach((provider) => {
      const seed = defaultSecretSeeds[provider];
      seeds[provider] = seed ? encryptSecret(seed) : null;
    });
    encryptedSecretsStore.set(shopDomain, seeds);
  }
  return encryptedSecretsStore.get(shopDomain);
};
const ensureMcpOverrides = (shopDomain) => {
  if (!mcpOverridesStore.has(shopDomain)) {
    mcpOverridesStore.set(shopDomain, createDefaultMcpOverrides());
  }
  return mcpOverridesStore.get(shopDomain);
};
class MockStoreSettingsRepository {
  async getSettings(shopDomain) {
    ensureEncryptedSecrets(shopDomain);
    return getMockSettings(shopDomain);
  }
  async updateThresholds(shopDomain, thresholds) {
    return updateMockThresholds(shopDomain, thresholds);
  }
  async updateToggles(shopDomain, toggles) {
    return updateMockToggles(shopDomain, toggles);
  }
  async updateSecret(shopDomain, input2) {
    const bucket = ensureEncryptedSecrets(shopDomain);
    if (!input2.secret) {
      bucket[input2.provider] = null;
      return updateMockSecret(shopDomain, input2.provider, null);
    }
    bucket[input2.provider] = encryptSecret(input2.secret);
    const current = getMockSettings(shopDomain);
    const existingMetadata = current.secrets[input2.provider];
    const verifiedAt = input2.verifiedAt !== void 0 ? input2.verifiedAt : (existingMetadata == null ? void 0 : existingMetadata.lastVerifiedAt) ?? null;
    const rotationReminderAt = input2.rotationReminderAt === null ? null : input2.rotationReminderAt ?? (existingMetadata == null ? void 0 : existingMetadata.rotationReminderAt) ?? null;
    const metadata = this.buildSecretMetadata(
      input2.provider,
      input2.secret,
      verifiedAt,
      rotationReminderAt
    );
    return updateMockSecret(shopDomain, input2.provider, metadata);
  }
  buildSecretMetadata(provider, secret, verifiedAt, rotationReminderAt) {
    return {
      provider,
      maskedValue: maskSecret(secret),
      lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastVerifiedAt: verifiedAt ?? void 0,
      rotationReminderAt: rotationReminderAt ?? void 0
    };
  }
  async getDecryptedSecret(shopDomain, provider) {
    const bucket = ensureEncryptedSecrets(shopDomain);
    return decryptSecret(bucket[provider] ?? null);
  }
  async getMcpIntegrationOverrides(shopDomain) {
    const overrides = ensureMcpOverrides(shopDomain);
    return cloneMcpOverrides(overrides);
  }
  async updateMcpIntegrationOverrides(shopDomain, input2) {
    const overrides = ensureMcpOverrides(shopDomain);
    if (Object.prototype.hasOwnProperty.call(input2, "endpoint")) {
      overrides.endpoint = input2.endpoint === void 0 ? overrides.endpoint : input2.endpoint;
    }
    if (Object.prototype.hasOwnProperty.call(input2, "timeoutMs")) {
      overrides.timeoutMs = input2.timeoutMs === void 0 ? overrides.timeoutMs : input2.timeoutMs;
    }
    if (Object.prototype.hasOwnProperty.call(input2, "maxRetries")) {
      overrides.maxRetries = input2.maxRetries === void 0 ? overrides.maxRetries : input2.maxRetries;
    }
    return cloneMcpOverrides(overrides);
  }
  async recordConnectionTest(shopDomain, input2) {
    const timestamp = input2.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
    return recordMockConnectionAttempt(shopDomain, {
      id: `${input2.provider}-${timestamp}`,
      provider: input2.provider,
      status: input2.status,
      timestamp,
      durationMs: input2.durationMs,
      message: input2.message
    });
  }
}
const DEFAULT_THRESHOLDS = {
  lowStockMinimum: 8,
  overdueOrderHours: 12,
  overstockPercentage: 35
};
const DEFAULT_TOGGLES = {
  enableMcpIntegration: true,
  enableExperimentalWidgets: false,
  enableBetaWorkflows: false,
  enableAssistantsProvider: false,
  useMockData: true,
  enableMcp: false,
  enableSeo: false,
  enableInventory: false
};
const createDefaultConnections = () => ({
  ga4: {
    provider: "ga4",
    status: "warning",
    message: "No GA4 checks recorded yet.",
    history: []
  },
  gsc: {
    provider: "gsc",
    status: "warning",
    message: "No GSC checks recorded yet.",
    history: []
  },
  bing: {
    provider: "bing",
    status: "warning",
    message: "No Bing checks recorded yet.",
    history: []
  },
  mcp: {
    provider: "mcp",
    status: "warning",
    message: "No MCP checks recorded yet.",
    history: []
  }
});
const SECRET_PROVIDER_MAP = {
  ga4: SettingsSecretProvider.ga4,
  gsc: SettingsSecretProvider.gsc,
  bing: SettingsSecretProvider.bing,
  mcp: SettingsSecretProvider.mcp
};
const INTEGRATION_PROVIDER_MAP = {
  ga4: IntegrationProvider.GA4,
  gsc: IntegrationProvider.GSC,
  bing: IntegrationProvider.BING,
  mcp: IntegrationProvider.MCP
};
const EVENT_STATUS_TO_CONNECTION_STATUS = {
  [ConnectionEventStatus.SUCCESS]: "success",
  [ConnectionEventStatus.WARNING]: "warning",
  [ConnectionEventStatus.FAILURE]: "error",
  [ConnectionEventStatus.INFO]: "success"
};
const CONNECTION_STATUS_TO_EVENT_STATUS = {
  success: ConnectionEventStatus.SUCCESS,
  warning: ConnectionEventStatus.WARNING,
  error: ConnectionEventStatus.FAILURE
};
const parseBoolean$2 = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
};
const parseConnectionStatus = (value, fallback) => {
  if (value === "success" || value === "warning" || value === "error") {
    return value;
  }
  return fallback;
};
const parseHistory = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const attempts = [];
  for (const entry2 of value) {
    if (!entry2 || typeof entry2 !== "object") {
      continue;
    }
    const candidate = entry2;
    const provider = candidate.provider;
    if (provider !== "ga4" && provider !== "gsc" && provider !== "bing" && provider !== "mcp") {
      continue;
    }
    const timestamp = candidate.timestamp;
    if (typeof timestamp !== "string") {
      continue;
    }
    const duration = Number(candidate.durationMs);
    if (!Number.isFinite(duration)) {
      continue;
    }
    const status = parseConnectionStatus(candidate.status, "warning");
    attempts.push({
      id: typeof candidate.id === "string" ? candidate.id : `${provider}-${timestamp}`,
      provider,
      status,
      timestamp,
      durationMs: duration,
      message: typeof candidate.message === "string" ? candidate.message : void 0
    });
    if (attempts.length >= 5) {
      break;
    }
  }
  return attempts;
};
const parseConnections = (value, defaults) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value;
  const output = {};
  for (const provider of PROVIDERS) {
    const entry2 = record[provider];
    if (!entry2 || typeof entry2 !== "object" || Array.isArray(entry2)) {
      continue;
    }
    const candidate = entry2;
    const status = parseConnectionStatus(
      candidate.status,
      defaults[provider].status
    );
    const lastCheckedAt = typeof candidate.lastCheckedAt === "string" ? candidate.lastCheckedAt : defaults[provider].lastCheckedAt;
    const message = typeof candidate.message === "string" ? candidate.message : defaults[provider].message;
    const history = parseHistory(candidate.history);
    output[provider] = {
      provider,
      status,
      lastCheckedAt,
      message,
      history
    };
  }
  return output;
};
const parseOverrides = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultMcpOverrides();
  }
  const record = value;
  const endpoint = typeof record.endpoint === "string" && record.endpoint.trim().length > 0 ? record.endpoint.trim() : null;
  const timeoutValue = record.timeoutMs;
  let timeout = null;
  if (typeof timeoutValue === "number") {
    timeout = Number.isFinite(timeoutValue) ? timeoutValue : null;
  } else if (typeof timeoutValue === "string" && timeoutValue.trim().length > 0 && Number.isFinite(Number(timeoutValue))) {
    timeout = Number(timeoutValue);
  }
  const maxRetriesValue = record.maxRetries;
  let maxRetries = null;
  if (typeof maxRetriesValue === "number") {
    maxRetries = Number.isFinite(maxRetriesValue) ? maxRetriesValue : null;
  } else if (typeof maxRetriesValue === "string" && maxRetriesValue.trim().length > 0 && Number.isFinite(Number(maxRetriesValue))) {
    maxRetries = Number(maxRetriesValue);
  }
  return {
    endpoint,
    timeoutMs: timeout,
    maxRetries
  };
};
const parseConnectionMetadata = (value) => {
  const defaults = createDefaultConnections();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      connections: {},
      overrides: createDefaultMcpOverrides()
    };
  }
  const record = value;
  if ("connections" in record || "mcpOverrides" in record) {
    return {
      connections: parseConnections(record.connections, defaults),
      overrides: parseOverrides(record.mcpOverrides)
    };
  }
  return {
    connections: parseConnections(record, defaults),
    overrides: createDefaultMcpOverrides()
  };
};
const mapIntegrationToSettingsProvider = (integration) => {
  switch (integration) {
    case IntegrationProvider.GA4:
      return "ga4";
    case IntegrationProvider.GSC:
      return "gsc";
    case IntegrationProvider.BING:
      return "bing";
    case IntegrationProvider.MCP:
      return "mcp";
    default:
      return null;
  }
};
const extractDuration = (metadata) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }
  const record = metadata;
  const duration = Number(record.durationMs);
  return Number.isFinite(duration) ? duration : 0;
};
class PrismaStoreSettingsRepository {
  async getSettings(shopDomain) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    return this.buildSettingsPayload(store);
  }
  async updateThresholds(shopDomain, thresholds) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { thresholds: toJson$1(thresholds) }
    });
    return this.getSettings(shopDomain);
  }
  async updateToggles(shopDomain, toggles) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { featureFlags: toJson$1(toggles) }
    });
    return this.getSettings(shopDomain);
  }
  async updateSecret(shopDomain, input2) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    const provider = SECRET_PROVIDER_MAP[input2.provider];
    if (!input2.secret) {
      await prisma.storeSecret.deleteMany({
        where: { storeId: store.id, provider }
      });
      return this.getSettings(shopDomain);
    }
    const existing = await prisma.storeSecret.findUnique({
      where: {
        storeId_provider: {
          storeId: store.id,
          provider
        }
      }
    });
    const ciphertext = encryptSecret(input2.secret);
    const existingPlaintext = existing ? decryptSecret(existing.ciphertext) : null;
    const secretChanged = existingPlaintext !== input2.secret;
    const maskedValue = secretChanged || !(existing == null ? void 0 : existing.maskedValue) ? maskSecret(input2.secret) : existing.maskedValue;
    const rotationReminderAt = input2.rotationReminderAt === null ? null : input2.rotationReminderAt ? new Date(input2.rotationReminderAt) : (existing == null ? void 0 : existing.rotationReminderAt) ?? null;
    const lastVerifiedAt = input2.verifiedAt === void 0 ? (existing == null ? void 0 : existing.lastVerifiedAt) ?? null : input2.verifiedAt ? new Date(input2.verifiedAt) : null;
    if (existing) {
      await prisma.storeSecret.update({
        where: { id: existing.id },
        data: {
          ciphertext,
          maskedValue,
          rotationReminderAt,
          lastVerifiedAt
        }
      });
    } else {
      await prisma.storeSecret.create({
        data: {
          storeId: store.id,
          provider,
          ciphertext,
          maskedValue,
          rotationReminderAt,
          lastVerifiedAt
        }
      });
    }
    return this.getSettings(shopDomain);
  }
  async getDecryptedSecret(shopDomain, provider) {
    const store = await this.findStore(shopDomain);
    if (!store) {
      return null;
    }
    const secret = await prisma.storeSecret.findUnique({
      where: {
        storeId_provider: {
          storeId: store.id,
          provider: SECRET_PROVIDER_MAP[provider]
        }
      }
    });
    return secret ? decryptSecret(secret.ciphertext) : null;
  }
  async getMcpIntegrationOverrides(shopDomain) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    const metadata = parseConnectionMetadata(store.settings.connectionMetadata);
    return { ...metadata.overrides };
  }
  async updateMcpIntegrationOverrides(shopDomain, input2) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    const metadata = parseConnectionMetadata(store.settings.connectionMetadata);
    const overrides = {
      endpoint: input2.endpoint === void 0 ? metadata.overrides.endpoint : input2.endpoint,
      timeoutMs: input2.timeoutMs === void 0 ? metadata.overrides.timeoutMs : input2.timeoutMs,
      maxRetries: input2.maxRetries === void 0 ? metadata.overrides.maxRetries : input2.maxRetries
    };
    const payload = this.buildConnectionMetadataPayload(
      metadata.connections,
      overrides
    );
    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { connectionMetadata: payload }
    });
    return overrides;
  }
  async recordConnectionTest(shopDomain, input2) {
    const store = await this.ensureStoreWithSettings(shopDomain);
    const timestampIso = input2.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
    const timestamp = new Date(timestampIso);
    await prisma.connectionEvent.create({
      data: {
        storeId: store.id,
        integration: INTEGRATION_PROVIDER_MAP[input2.provider],
        status: CONNECTION_STATUS_TO_EVENT_STATUS[input2.status],
        message: input2.message,
        metadata: toJson$1({ durationMs: input2.durationMs }),
        createdAt: timestamp
      }
    });
    const metadata = parseConnectionMetadata(store.settings.connectionMetadata);
    const existing = metadata.connections[input2.provider];
    const updatedSummary = {
      ...existing ?? createDefaultConnections()[input2.provider],
      status: input2.status,
      lastCheckedAt: timestampIso,
      message: input2.message ?? (existing == null ? void 0 : existing.message),
      history: (existing == null ? void 0 : existing.history) ?? []
    };
    metadata.connections = {
      ...metadata.connections,
      [input2.provider]: updatedSummary
    };
    const payload = this.buildConnectionMetadataPayload(
      metadata.connections,
      metadata.overrides
    );
    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { connectionMetadata: payload }
    });
    return this.getSettings(shopDomain);
  }
  async findStore(shopDomain) {
    return prisma.store.findFirst({
      where: {
        OR: [{ domain: shopDomain }, { myShopifyDomain: shopDomain }]
      },
      include: {
        settings: true,
        secrets: true
      }
    });
  }
  async ensureStoreWithSettings(shopDomain) {
    const store = await this.findStore(shopDomain);
    if (!store) {
      throw new Error(`Store not found for domain: ${shopDomain}`);
    }
    if (!store.settings) {
      const defaults = createDefaultConnections();
      const created = await prisma.storeSettings.create({
        data: {
          storeId: store.id,
          thresholds: toJson$1(DEFAULT_THRESHOLDS),
          featureFlags: toJson$1(DEFAULT_TOGGLES),
          connectionMetadata: this.buildConnectionMetadataPayload(
            defaults,
            createDefaultMcpOverrides()
          )
        }
      });
      store.settings = created;
    }
    return store;
  }
  buildConnectionMetadataPayload(connections, overrides) {
    const payloadConnections = {};
    for (const provider of PROVIDERS) {
      const entry2 = connections[provider];
      if (!entry2) {
        continue;
      }
      payloadConnections[provider] = {
        provider: entry2.provider,
        status: entry2.status,
        lastCheckedAt: entry2.lastCheckedAt ?? null,
        message: entry2.message ?? null
      };
    }
    const payload = {};
    if (Object.keys(payloadConnections).length > 0) {
      payload.connections = payloadConnections;
    }
    payload.mcpOverrides = {
      endpoint: overrides.endpoint,
      timeoutMs: overrides.timeoutMs,
      maxRetries: overrides.maxRetries
    };
    return toJson$1(payload);
  }
  async buildSettingsPayload(store) {
    const settings = store.settings;
    const thresholds = this.parseThresholds(settings.thresholds);
    const toggles = this.parseFeatureFlags(settings.featureFlags);
    const metadata = parseConnectionMetadata(settings.connectionMetadata);
    const secrets = this.buildSecrets(store.secrets);
    const connections = await this.buildConnections(
      store.id,
      metadata.connections
    );
    return {
      shopDomain: store.domain,
      thresholds,
      toggles,
      secrets,
      connections
    };
  }
  parseThresholds(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value;
      const lowStock = Number(record.lowStockMinimum);
      const overdue = Number(record.overdueOrderHours);
      const overstock = Number(record.overstockPercentage);
      return {
        lowStockMinimum: Number.isFinite(lowStock) ? lowStock : DEFAULT_THRESHOLDS.lowStockMinimum,
        overdueOrderHours: Number.isFinite(overdue) ? overdue : DEFAULT_THRESHOLDS.overdueOrderHours,
        overstockPercentage: Number.isFinite(overstock) ? overstock : DEFAULT_THRESHOLDS.overstockPercentage
      };
    }
    return { ...DEFAULT_THRESHOLDS };
  }
  parseFeatureFlags(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value;
      return {
        enableMcpIntegration: parseBoolean$2(
          record.enableMcpIntegration,
          DEFAULT_TOGGLES.enableMcpIntegration
        ),
        enableAssistantsProvider: parseBoolean$2(
          record.enableAssistantsProvider,
          DEFAULT_TOGGLES.enableAssistantsProvider
        ),
        enableExperimentalWidgets: parseBoolean$2(
          record.enableExperimentalWidgets,
          DEFAULT_TOGGLES.enableExperimentalWidgets
        ),
        enableBetaWorkflows: parseBoolean$2(
          record.enableBetaWorkflows,
          DEFAULT_TOGGLES.enableBetaWorkflows
        ),
        useMockData: parseBoolean$2(
          record.useMockData,
          DEFAULT_TOGGLES.useMockData
        ),
        enableMcp: parseBoolean$2(
          record.enableMcp,
          DEFAULT_TOGGLES.enableMcp
        ),
        enableSeo: parseBoolean$2(
          record.enableSeo,
          DEFAULT_TOGGLES.enableSeo
        ),
        enableInventory: parseBoolean$2(
          record.enableInventory,
          DEFAULT_TOGGLES.enableInventory
        )
      };
    }
    return { ...DEFAULT_TOGGLES };
  }
  buildSecrets(secrets) {
    var _a2, _b2;
    const base = {
      ga4: null,
      gsc: null,
      bing: null,
      mcp: null
    };
    for (const secret of secrets) {
      const provider = secret.provider;
      if (!PROVIDERS.includes(provider)) {
        continue;
      }
      base[provider] = {
        provider,
        maskedValue: secret.maskedValue,
        lastUpdatedAt: secret.updatedAt.toISOString(),
        lastVerifiedAt: (_a2 = secret.lastVerifiedAt) == null ? void 0 : _a2.toISOString(),
        rotationReminderAt: (_b2 = secret.rotationReminderAt) == null ? void 0 : _b2.toISOString()
      };
    }
    return base;
  }
  async buildConnections(storeId, metadataConnections) {
    var _a2;
    const defaults = createDefaultConnections();
    const base = {
      ga4: { ...defaults.ga4, history: [] },
      gsc: { ...defaults.gsc, history: [] },
      bing: { ...defaults.bing, history: [] },
      mcp: { ...defaults.mcp, history: [] }
    };
    for (const provider of PROVIDERS) {
      const summary = metadataConnections[provider];
      if (!summary) {
        continue;
      }
      base[provider] = {
        ...base[provider],
        status: summary.status ?? base[provider].status,
        lastCheckedAt: summary.lastCheckedAt ?? base[provider].lastCheckedAt,
        message: summary.message ?? base[provider].message,
        history: []
      };
    }
    const events = await prisma.connectionEvent.findMany({
      where: {
        storeId,
        integration: {
          in: PROVIDERS.map((provider) => INTEGRATION_PROVIDER_MAP[provider])
        }
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        integration: true,
        status: true,
        message: true,
        metadata: true,
        createdAt: true
      }
    });
    const grouped = /* @__PURE__ */ new Map();
    for (const event of events) {
      const provider = mapIntegrationToSettingsProvider(event.integration);
      if (!provider) {
        continue;
      }
      const attempt = {
        id: event.id,
        provider,
        status: EVENT_STATUS_TO_CONNECTION_STATUS[event.status],
        timestamp: event.createdAt.toISOString(),
        durationMs: extractDuration(event.metadata),
        message: event.message ?? void 0
      };
      const existing = grouped.get(provider) ?? [];
      if (existing.length < 5) {
        existing.push(attempt);
      }
      grouped.set(provider, existing);
    }
    for (const provider of PROVIDERS) {
      const attempts = grouped.get(provider) ?? [];
      if (attempts.length > 0) {
        base[provider] = {
          ...base[provider],
          status: attempts[0].status,
          lastCheckedAt: attempts[0].timestamp,
          message: attempts[0].message ?? base[provider].message,
          history: attempts
        };
      } else {
        const fallbackHistory = ((_a2 = metadataConnections[provider]) == null ? void 0 : _a2.history) ?? [];
        base[provider] = {
          ...base[provider],
          history: fallbackHistory.slice(0, 5)
        };
      }
    }
    return base;
  }
}
class StoreSettingsRepository {
  constructor(useMockData = isMockMode()) {
    __publicField(this, "impl");
    this.impl = useMockData ? new MockStoreSettingsRepository() : new PrismaStoreSettingsRepository();
  }
  getSettings(shopDomain) {
    return this.impl.getSettings(shopDomain);
  }
  updateThresholds(shopDomain, thresholds) {
    return this.impl.updateThresholds(shopDomain, thresholds);
  }
  updateToggles(shopDomain, toggles) {
    return this.impl.updateToggles(shopDomain, toggles);
  }
  updateSecret(shopDomain, input2) {
    return this.impl.updateSecret(shopDomain, input2);
  }
  getDecryptedSecret(shopDomain, provider) {
    return this.impl.getDecryptedSecret(shopDomain, provider);
  }
  getMcpIntegrationOverrides(shopDomain) {
    return this.impl.getMcpIntegrationOverrides(shopDomain);
  }
  updateMcpIntegrationOverrides(shopDomain, input2) {
    return this.impl.updateMcpIntegrationOverrides(shopDomain, input2);
  }
  recordConnectionTest(shopDomain, input2) {
    return this.impl.recordConnectionTest(shopDomain, input2);
  }
}
const storeSettingsRepository = new StoreSettingsRepository();
var McpResourceType = /* @__PURE__ */ ((McpResourceType2) => {
  McpResourceType2["ProductRecommendation"] = "ProductRecommendation";
  McpResourceType2["InventorySignal"] = "InventorySignal";
  McpResourceType2["SeoOpportunity"] = "SeoOpportunity";
  return McpResourceType2;
})(McpResourceType || {});
const MOCK_CONFIDENCE = 0.68;
const MOCK_GENERATED_AT = "2024-02-05T00:00:00.000Z";
const MOCK_SOURCE = "mock-mcp";
const MOCK_PRODUCT_RECOMMENDATIONS = [
  {
    sku: "CAM-Stage3",
    title: "Camaro Stage 3 Kit",
    rationale: "High intent queries with stock buffer >= 14 days",
    supportingMetrics: [
      { label: "30d CTR", value: 6.1, unit: "%" },
      { label: "Attach rate", value: 2.4, unit: "%" }
    ]
  },
  {
    sku: "MUS-HC",
    title: "Mustang Handling Components",
    rationale: "Cart abandons spike; promo recommended",
    supportingMetrics: [
      { label: "Cart abandons", value: 38 },
      { label: "Inventory days", value: 21 }
    ]
  }
];
const MOCK_INVENTORY_SIGNALS = [
  {
    sku: "LS-S2",
    riskLevel: "high",
    suggestedAction: "Expedite PO via air freight to avoid 6d stockout",
    demandSignals: [
      { label: "Projected demand", value: 42 },
      { label: "Lead time", value: 18, unit: "days" }
    ]
  },
  {
    sku: "JEEP-LIFT",
    riskLevel: "medium",
    suggestedAction: "Divert 15 units from EU warehouse",
    demandSignals: [
      { label: "Waitlisted", value: 12 },
      { label: "On-hand", value: 24 }
    ]
  }
];
const MOCK_SEO_OPPORTUNITIES = [
  {
    handle: "collections/turbo-kit",
    keywordCluster: [
      "camaro turbo kit",
      "turbo install camaro",
      "camaro forced induction"
    ],
    projectedImpact: 8.1,
    notes: "Optimize PDP meta + add how-to guide snippet."
  },
  {
    handle: "products/ford-mustang-catback",
    keywordCluster: [
      "mustang catback exhaust",
      "mustang exhaust hp gain"
    ],
    projectedImpact: 5.6,
    notes: "Capture testimonial schema and add dyno results."
  }
];
const toMockResponse = async (data) => ({
  data,
  generatedAt: MOCK_GENERATED_AT,
  source: MOCK_SOURCE,
  confidence: MOCK_CONFIDENCE
});
const mockProductRecommendations = (context) => {
  return toMockResponse(MOCK_PRODUCT_RECOMMENDATIONS);
};
const mockInventorySignals = (context) => {
  return toMockResponse(MOCK_INVENTORY_SIGNALS);
};
const mockSeoOpportunities = (context) => {
  return toMockResponse(MOCK_SEO_OPPORTUNITIES);
};
const mockPing = async () => true;
const createMockMcpClient = () => ({
  getProductRecommendations: mockProductRecommendations,
  getInventorySignals: mockInventorySignals,
  getSeoOpportunities: mockSeoOpportunities,
  ping: mockPing
});
const DEFAULT_RESOURCE_PATHS = {
  [McpResourceType.ProductRecommendation]: "/recommendations",
  [McpResourceType.InventorySignal]: "/inventory/signals",
  [McpResourceType.SeoOpportunity]: "/seo/opportunities"
};
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 5e3;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class McpClient {
  constructor(config = {}) {
    __publicField(this, "fetchFn");
    __publicField(this, "maxRetries");
    __publicField(this, "timeoutMs");
    __publicField(this, "telemetry");
    __publicField(this, "useMocks");
    this.config = config;
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.telemetry = config.telemetry;
    this.useMocks = config.useMocks ?? true;
  }
  async getProductRecommendations(context) {
    return this.execute(
      McpResourceType.ProductRecommendation,
      DEFAULT_RESOURCE_PATHS[McpResourceType.ProductRecommendation],
      context,
      () => mockProductRecommendations()
    );
  }
  async getInventorySignals(context) {
    return this.execute(
      McpResourceType.InventorySignal,
      DEFAULT_RESOURCE_PATHS[McpResourceType.InventorySignal],
      context,
      () => mockInventorySignals()
    );
  }
  async getSeoOpportunities(context) {
    return this.execute(
      McpResourceType.SeoOpportunity,
      DEFAULT_RESOURCE_PATHS[McpResourceType.SeoOpportunity],
      context,
      () => mockSeoOpportunities()
    );
  }
  async ping() {
    var _a2, _b2, _c, _d, _e, _f;
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
      (_b2 = (_a2 = this.telemetry) == null ? void 0 : _a2.onRequest) == null ? void 0 : _b2.call(_a2, {
        resource: McpResourceType.ProductRecommendation,
        attempt: 1,
        requestId,
        context: {
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation
        }
      });
      const response = await this.fetchFn(url, {
        headers: this.headers({
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation,
          requestId
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      (_d = (_c = this.telemetry) == null ? void 0 : _c.onResponse) == null ? void 0 : _d.call(_c, {
        resource: McpResourceType.ProductRecommendation,
        attempt: 1,
        status: response.status,
        requestId,
        context: {
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation
        }
      });
      return response.ok;
    } catch (error) {
      const requestId = randomUUID();
      (_f = (_e = this.telemetry) == null ? void 0 : _e.onError) == null ? void 0 : _f.call(_e, {
        resource: McpResourceType.ProductRecommendation,
        attempt: 1,
        error,
        requestId,
        context: {
          shopDomain: "health-check",
          resource: McpResourceType.ProductRecommendation
        }
      });
      return false;
    }
  }
  async execute(resource, path, context, fallback) {
    var _a2, _b2;
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
      (_b2 = (_a2 = this.telemetry) == null ? void 0 : _a2.onError) == null ? void 0 : _b2.call(_a2, {
        resource,
        attempt: this.maxRetries,
        error,
        context,
        requestId
      });
      return fallback();
    }
  }
  async fetchWithRetry(resource, path, context) {
    var _a2, _b2, _c, _d, _e, _f;
    const baseUrl = this.config.endpoint;
    if (!baseUrl) {
      throw new Error("MCP endpoint missing");
    }
    const payload = {
      resource,
      params: context.params,
      shopDomain: context.shopDomain,
      dateRange: context.dateRange
    };
    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const requestId = randomUUID();
        (_b2 = (_a2 = this.telemetry) == null ? void 0 : _a2.onRequest) == null ? void 0 : _b2.call(_a2, { resource, attempt, context, requestId });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        const response = await this.fetchFn(this.formatUrl(path), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.headers({
              shopDomain: context.shopDomain,
              resource,
              requestId
            })
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);
        (_d = (_c = this.telemetry) == null ? void 0 : _c.onResponse) == null ? void 0 : _d.call(_c, {
          resource,
          attempt,
          status: response.status,
          context,
          requestId
        });
        if (!response.ok) {
          throw new Error(`MCP request failed with status ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }
        (_f = (_e = this.telemetry) == null ? void 0 : _e.onRetry) == null ? void 0 : _f.call(_e, {
          resource,
          attempt,
          error,
          context,
          requestId: randomUUID()
        });
        await wait(Math.min(2 ** attempt * 100, 1e3));
      }
    }
    throw new Error("MCP request exhausted retries");
  }
  headers(context) {
    const headers2 = {};
    if (this.config.apiKey) {
      headers2.Authorization = `Bearer ${this.config.apiKey}`;
    }
    if (context == null ? void 0 : context.shopDomain) {
      headers2["X-Shop-Domain"] = context.shopDomain;
    }
    if (context == null ? void 0 : context.resource) {
      headers2["X-MCP-Resource"] = context.resource;
    }
    if (context == null ? void 0 : context.requestId) {
      headers2["X-Request-Id"] = context.requestId;
    }
    return Object.keys(headers2).length > 0 ? headers2 : void 0;
  }
  shouldUseMocks() {
    return this.useMocks;
  }
  formatUrl(path) {
    const baseUrl = this.config.endpoint ?? "";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }
}
const createMcpClient = (config) => new McpClient(config);
const parseBoolean$1 = (value, fallback) => {
  if (value === void 0 || value === "") {
    return fallback;
  }
  return ["1", "true", "on", "yes"].includes(value.toLowerCase());
};
const parseNumber = (value) => {
  if (!value) {
    return void 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? void 0 : parsed;
};
const envMcpEnabled = () => parseBoolean$1(process.env.ENABLE_MCP, false);
const envUseMocks = () => parseBoolean$1(process.env.USE_MOCK_DATA, true);
const selectString = (override, fallback) => {
  if (override && override.trim().length > 0) {
    return override;
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  return void 0;
};
const selectNumber = (override, fallback) => {
  if (override !== void 0 && override !== null) {
    return override;
  }
  return parseNumber(fallback);
};
const stripPersistedKeys = (overrides) => {
  if (!overrides) {
    return void 0;
  }
  const {
    apiKey: _apiKey,
    endpoint: _endpoint,
    maxRetries: _maxRetries,
    timeoutMs: _timeoutMs,
    ...rest
  } = overrides;
  return rest;
};
const resolveMcpConfigFromEnv = (overrides) => ({
  apiKey: selectString(overrides == null ? void 0 : overrides.apiKey, process.env.MCP_API_KEY),
  endpoint: selectString(overrides == null ? void 0 : overrides.endpoint, process.env.MCP_API_URL),
  maxRetries: selectNumber(overrides == null ? void 0 : overrides.maxRetries, process.env.MCP_MAX_RETRIES),
  timeoutMs: selectNumber(overrides == null ? void 0 : overrides.timeoutMs, process.env.MCP_TIMEOUT_MS)
});
const isMcpFeatureEnabled = (toggles) => envMcpEnabled() && Boolean(toggles == null ? void 0 : toggles.enableMcpIntegration);
const shouldUseMcpMocks = (toggles) => envUseMocks() || !isMcpFeatureEnabled(toggles);
const getMcpClient = (toggles, overrides) => {
  if (shouldUseMcpMocks(toggles)) {
    return createMockMcpClient();
  }
  const runtimeOverrides = stripPersistedKeys(overrides) ?? {};
  return createMcpClient({
    ...resolveMcpConfigFromEnv(overrides),
    ...runtimeOverrides,
    useMocks: false
  });
};
const getMcpProductRecommendations = (context, toggles, overrides) => {
  const client = getMcpClient(toggles, overrides);
  return client.getProductRecommendations({
    ...context,
    resource: McpResourceType.ProductRecommendation
  });
};
const getMcpInventorySignals = (context, toggles, overrides) => {
  const client = getMcpClient(toggles, overrides);
  return client.getInventorySignals({
    ...context,
    resource: McpResourceType.InventorySignal
  });
};
const getMcpSeoOpportunities = (context, toggles, overrides) => {
  const client = getMcpClient(toggles, overrides);
  return client.getSeoOpportunities({
    ...context,
    resource: McpResourceType.SeoOpportunity
  });
};
const coerceString = (value) => {
  if (!value) {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
};
const coerceNumber = (value) => value === null || value === void 0 ? void 0 : value;
const getMcpClientOverridesForShop = async (shopDomain) => {
  const [apiKey, overrides] = await Promise.all([
    storeSettingsRepository.getDecryptedSecret(shopDomain, "mcp"),
    storeSettingsRepository.getMcpIntegrationOverrides(shopDomain)
  ]);
  return {
    apiKey: coerceString(apiKey),
    endpoint: coerceString(overrides.endpoint),
    timeoutMs: coerceNumber(overrides.timeoutMs),
    maxRetries: coerceNumber(overrides.maxRetries)
  };
};
const DASHBOARD_RANGE_KEY_VALUES = [
  "today",
  "7d",
  "14d",
  "28d",
  "90d"
];
const DASHBOARD_RANGE_PRESETS = {
  today: { label: "Today", days: 1 },
  "7d": { label: "Last 7 days", days: 7 },
  "14d": { label: "Last 14 days", days: 14 },
  "28d": { label: "Last 28 days", days: 28 },
  "90d": { label: "Last 90 days", days: 90 }
};
const DASHBOARD_RANGE_OPTIONS = DASHBOARD_RANGE_KEY_VALUES.map((key) => ({
  value: key,
  label: DASHBOARD_RANGE_PRESETS[key].label
}));
const DEFAULT_DASHBOARD_RANGE = "28d";
const clampToUtcDay = (value) => {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};
const createSelection = (key, referenceDate = /* @__PURE__ */ new Date()) => {
  const preset = DASHBOARD_RANGE_PRESETS[key];
  const end = clampToUtcDay(referenceDate);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (preset.days - 1));
  return {
    key,
    label: preset.label,
    days: preset.days,
    start: start.toISOString(),
    end: end.toISOString()
  };
};
const resolveDashboardRangeKey = (candidate, fallback = DEFAULT_DASHBOARD_RANGE) => {
  if (!candidate) {
    return fallback;
  }
  if (DASHBOARD_RANGE_KEY_VALUES.includes(candidate)) {
    return candidate;
  }
  return fallback;
};
const DEFAULT_SHARED_PARAM_KEYS = ["mockState"];
const withDashboardRangeParam = (path, key, options) => {
  const url = new URL(path, "https://dashboard.internal");
  if (options == null ? void 0 : options.searchParams) {
    const params = options.searchParams instanceof URLSearchParams ? options.searchParams : new URLSearchParams(options.searchParams);
    const allowedKeys = new Set(options.includeKeys ?? DEFAULT_SHARED_PARAM_KEYS);
    params.forEach((value, paramKey) => {
      if (!allowedKeys.has(paramKey)) return;
      if (!value) return;
      url.searchParams.set(paramKey, value);
    });
  }
  url.searchParams.set("range", key);
  return `${url.pathname}${url.search}${url.hash}`;
};
const buildDashboardRangeSelection = (key, referenceDate = /* @__PURE__ */ new Date()) => createSelection(key, referenceDate);
const DASHBOARD_RANGE_KEY_LIST = DASHBOARD_RANGE_KEY_VALUES;
const DEFAULT_AUTHOR = "AI assistant";
const drafts = /* @__PURE__ */ new Map();
const now = () => (/* @__PURE__ */ new Date()).toISOString();
const createDraft = ({ ticketId, content: content2, updatedBy = DEFAULT_AUTHOR }) => ({
  id: randomUUID(),
  ticketId,
  content: content2,
  approved: false,
  updatedAt: now(),
  updatedBy,
  revision: 1,
  feedback: []
});
const ensureDraftForTicket = ({ ticketId, content: content2, updatedBy }) => {
  const existing = drafts.get(ticketId);
  if (existing) {
    return existing;
  }
  const draft = createDraft({ ticketId, content: content2, updatedBy });
  drafts.set(ticketId, draft);
  return draft;
};
const updateDraftContent = (ticketId, content2, updatedBy = "Operator") => {
  const current = drafts.get(ticketId) ?? createDraft({ ticketId, content: content2, updatedBy });
  const next = {
    ...current,
    content: content2,
    approved: false,
    updatedAt: now(),
    updatedBy,
    revision: current.revision + (drafts.has(ticketId) ? 1 : 0)
  };
  drafts.set(ticketId, next);
  return next;
};
const approveDraftContent = (ticketId, content2, updatedBy = "Operator") => {
  const current = drafts.get(ticketId) ?? createDraft({ ticketId, content: content2, updatedBy });
  const approvedDraft = {
    ...current,
    content: content2,
    approved: true,
    updatedAt: now(),
    updatedBy,
    revision: current.revision + (drafts.has(ticketId) ? 1 : 0)
  };
  drafts.set(ticketId, approvedDraft);
  return approvedDraft;
};
const getDraftForTicket = (ticketId) => drafts.get(ticketId);
const recordDraftFeedback = (ticketId, draftId, vote, submittedBy, comment) => {
  const timestamp = now();
  const feedback = {
    id: randomUUID(),
    ticketId,
    draftId,
    vote,
    comment,
    submittedAt: timestamp,
    submittedBy
  };
  const draft = drafts.get(ticketId);
  if (draft) {
    draft.feedback = [...draft.feedback, feedback];
    drafts.set(ticketId, draft);
  }
  return feedback;
};
const defaultSubjects = [
  "Order delayed",
  "Wrong item received",
  "Question about preorder",
  "Custom wholesale pricing",
  "Update shipping address",
  "Return label request",
  "Inventory availability"
];
const providerRotation = [
  "email",
  "shopify",
  "instagram",
  "tiktok"
];
const addHours = (isoTimestamp, hours) => new Date(new Date(isoTimestamp).getTime() + hours * 60 * 60 * 1e3).toISOString();
const maybeBuildAttachments = (ticketId, index2, faker) => {
  if (index2 % 3 !== 0) {
    return void 0;
  }
  const count = index2 % 2 + 1;
  return Array.from({ length: count }, (_, attachmentIndex) => {
    const extension = faker.helpers.arrayElement(["pdf", "png", "jpg", "txt"]);
    const descriptor = faker.word.noun();
    return {
      id: `${ticketId}-attachment-${attachmentIndex}`,
      name: `${descriptor}-${attachmentIndex}.${extension}`,
      url: faker.internet.url()
    };
  });
};
const buildTimeline$1 = (ticket, attachments, index2, faker) => {
  const responseAt = addHours(ticket.createdAt, 2 + index2 % 4);
  const systemAt = addHours(responseAt, 1);
  const timeline = [
    {
      id: `${ticket.id}-message-1`,
      type: "customer_message",
      actor: ticket.customer.name,
      timestamp: ticket.createdAt,
      body: faker.lorem.paragraphs({ min: 1, max: 2, separator: "\n\n" }),
      attachments
    }
  ];
  if (ticket.assignedTo) {
    timeline.push({
      id: `${ticket.id}-reply-1`,
      type: "agent_reply",
      actor: ticket.assignedTo,
      timestamp: responseAt,
      body: faker.lorem.sentences(2)
    });
  } else {
    timeline.push({
      id: `${ticket.id}-note-1`,
      type: "note",
      actor: "Routing bot",
      timestamp: responseAt,
      body: "Queued for assignment per inbox load balancing policy."
    });
  }
  timeline.push({
    id: `${ticket.id}-system-1`,
    type: "system",
    actor: "Support Copilot",
    timestamp: systemAt,
    body: "AI draft prepared with guardrails for tone, refunds, and policy references."
  });
  return timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};
const getInboxDraft = (ticketId) => getDraftForTicket(ticketId);
const updateInboxDraft = (ticketId, content2, updatedBy = "Operator") => updateDraftContent(ticketId, content2, updatedBy);
const approveInboxDraft = (ticketId, content2, updatedBy = "Operator") => approveDraftContent(ticketId, content2, updatedBy);
const submitInboxDraftFeedback = (ticketId, draftId, vote, submittedBy = "Operator", comment) => recordDraftFeedback(ticketId, draftId, vote, submittedBy, comment);
const buildBaseTickets = ({
  scenario,
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
  pageSize,
  seed
}) => {
  const faker = createScenarioFaker$1(scenario, seed);
  const ticketCount = Math.max(pageSize, 24);
  const seededTickets = Array.from({ length: ticketCount }, (_, index2) => {
    const status = ["open", "snoozed", "resolved", "escalated"][index2 % 4];
    const priority = ["low", "medium", "high", "urgent"][index2 % 4];
    const createdAt = faker.date.recent({ days: 14 }).toISOString();
    const updatedAt = faker.date.soon({ days: 3, refDate: createdAt }).toISOString();
    return {
      id: `ticket-${index2}`,
      subject: defaultSubjects[index2 % defaultSubjects.length],
      status,
      priority,
      sentiment: ["positive", "neutral", "negative"][index2 % 3],
      updatedAt,
      createdAt,
      channel: providerRotation[index2 % providerRotation.length],
      customer: {
        id: `customer-${index2}`,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        avatarUrl: faker.image.avatar()
      },
      orderId: index2 % 2 === 0 ? `#${faker.number.int({ min: 1e3, max: 9999 })}` : void 0,
      assignedTo: index2 % 3 === 0 ? faker.person.fullName() : void 0,
      lastMessagePreview: faker.lorem.sentence({ min: 8, max: 16 }),
      slaBreached: index2 % 5 === 0 && status !== "resolved" && priority !== "low"
    };
  });
  const ticketsWithContext = seededTickets.map((ticket, index2) => {
    var _a2;
    const draftSeed = faker.lorem.paragraphs({ min: 1, max: 2, separator: "\n\n" });
    const draft = ensureDraftForTicket({
      ticketId: ticket.id,
      content: draftSeed,
      updatedBy: "AI assistant"
    });
    const attachments = maybeBuildAttachments(ticket.id, index2, faker);
    const timeline = buildTimeline$1(ticket, attachments, index2, faker);
    const latestTimestamp = ((_a2 = timeline[timeline.length - 1]) == null ? void 0 : _a2.timestamp) ?? ticket.updatedAt;
    return {
      ...ticket,
      updatedAt: latestTimestamp,
      aiDraft: draft,
      attachments,
      timeline
    };
  });
  const availableFilters = buildAvailableFilters$1(ticketsWithContext);
  const filteredTickets = applyFilters(ticketsWithContext, {
    filter,
    channelFilter,
    statusFilter,
    assignedFilter
  });
  const paginatedTickets = filteredTickets.slice(0, pageSize);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
    tickets: paginatedTickets,
    count: filteredTickets.length,
    availableFilters
  };
};
const buildEmptyTickets = ({
  scenario,
  filter,
  channelFilter,
  statusFilter,
  assignedFilter
}) => ({
  scenario,
  state: "empty",
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
  tickets: [],
  count: 0,
  alert: "Inbox is quiet. No tickets match this filter.",
  availableFilters: {
    channels: [],
    statuses: [],
    assignees: []
  }
});
const buildWarningTickets = (context) => {
  const dataset = buildBaseTickets(context);
  const totalMatches = dataset.count;
  dataset.state = "warning";
  dataset.alert = "Escalated inbox volume is trending up. Consider reassigning.";
  dataset.tickets = dataset.tickets.map((ticket, index2) => ({
    ...ticket,
    status: index2 % 2 === 0 ? "escalated" : ticket.status,
    priority: index2 % 3 === 0 ? "urgent" : ticket.priority,
    slaBreached: index2 % 2 === 0 || ticket.slaBreached
  }));
  dataset.count = totalMatches;
  return dataset;
};
const buildErrorTickets = ({
  scenario,
  filter,
  channelFilter,
  statusFilter,
  assignedFilter
}) => ({
  scenario,
  state: "error",
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
  tickets: [],
  count: 0,
  error: "Inbox service unavailable. Retry in a few minutes.",
  availableFilters: {
    channels: [],
    statuses: [],
    assignees: []
  }
});
const BUILDERS$4 = {
  base: buildBaseTickets,
  empty: buildEmptyTickets,
  warning: buildWarningTickets,
  error: buildErrorTickets
};
const getInboxScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const filter = options.filter ?? "all";
  const pageSize = options.pageSize ?? 10;
  const seed = options.seed ?? 0;
  const channelFilter = options.channelFilter ?? "all";
  const statusFilter = options.statusFilter ?? "all";
  const assignedFilter = options.assignedFilter ?? "all";
  return BUILDERS$4[scenario]({
    scenario,
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
    pageSize,
    seed
  });
};
const filterTicketsByFilter = (tickets, filter) => {
  switch (filter) {
    case "unassigned":
      return tickets.filter((ticket) => !ticket.assignedTo);
    case "priority":
      return tickets.filter((ticket) => ticket.priority === "high" || ticket.priority === "urgent");
    case "overdue":
      return tickets.filter((ticket) => Boolean(ticket.slaBreached));
    default:
      return tickets;
  }
};
const applyFilters = (tickets, {
  filter,
  channelFilter,
  statusFilter,
  assignedFilter
}) => {
  let filtered = filterTicketsByFilter(tickets, filter);
  if (channelFilter !== "all") {
    filtered = filtered.filter((ticket) => ticket.channel === channelFilter);
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((ticket) => ticket.status === statusFilter);
  }
  if (assignedFilter === "unassigned") {
    filtered = filtered.filter((ticket) => !ticket.assignedTo);
  } else if (assignedFilter !== "all") {
    filtered = filtered.filter((ticket) => ticket.assignedTo === assignedFilter);
  }
  return filtered;
};
const buildAvailableFilters$1 = (tickets) => {
  const channels = Array.from(new Set(tickets.map((ticket) => ticket.channel))).sort();
  const statuses = Array.from(new Set(tickets.map((ticket) => ticket.status))).sort();
  const assignees = Array.from(
    new Set(
      tickets.map((ticket) => ticket.assignedTo).filter((value) => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));
  return {
    channels,
    statuses,
    assignees
  };
};
const calculateStockoutDate = (inventoryOnHand, dailySales) => {
  if (dailySales <= 0) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
  }
  const daysRemaining = inventoryOnHand / dailySales;
  const now2 = /* @__PURE__ */ new Date();
  return new Date(now2.getTime() + daysRemaining * 24 * 60 * 60 * 1e3);
};
const calculateReorderPoint = ({
  dailySales,
  leadTimeDays,
  safetyStockDays
}) => {
  const leadDemand = dailySales * leadTimeDays;
  const safetyStock = dailySales * safetyStockDays;
  return Math.ceil(leadDemand + safetyStock);
};
const calculateSafetyStock = (averageSales, peakSales, leadTimeDays) => {
  const demandVariance = Math.max(peakSales - averageSales, 0);
  return Math.ceil(demandVariance * leadTimeDays);
};
const calculateTrendStats = (trend) => {
  if (!Array.isArray(trend) || trend.length === 0) {
    return null;
  }
  const sanitized = trend.map((point) => ({
    label: point.label,
    units: Number.isFinite(point.units) ? point.units : 0
  }));
  const average = Math.round(
    sanitized.reduce((total, entry2) => total + entry2.units, 0) / sanitized.length
  );
  const latest = sanitized[sanitized.length - 1];
  const prior = sanitized.length > 1 ? sanitized[sanitized.length - 2] : null;
  const deltaPercentage2 = prior && prior.units > 0 ? Math.round((latest.units - prior.units) / prior.units * 100) : null;
  let highest = sanitized[0];
  let lowest = sanitized[0];
  for (const point of sanitized) {
    if (point.units > highest.units) {
      highest = point;
    }
    if (point.units < lowest.units) {
      lowest = point;
    }
  }
  return {
    average,
    latest,
    deltaPercentage: deltaPercentage2,
    highest,
    lowest
  };
};
const aggregateTrendSeries = (series) => {
  if (!Array.isArray(series) || series.length === 0) {
    return [];
  }
  const lengths = series.map((entry2) => Array.isArray(entry2) ? entry2.length : 0);
  const maxLength = Math.max(0, ...lengths);
  if (maxLength === 0) {
    return [];
  }
  const totals = Array.from({ length: maxLength }, () => 0);
  const labels = Array.from({ length: maxLength }, () => "");
  series.forEach((entry2) => {
    if (!Array.isArray(entry2)) {
      return;
    }
    entry2.forEach((point, index2) => {
      const units = Number.isFinite(point == null ? void 0 : point.units) ? point.units : 0;
      totals[index2] += units;
      if (!labels[index2] && typeof (point == null ? void 0 : point.label) === "string" && point.label.trim().length > 0) {
        labels[index2] = point.label;
      }
    });
  });
  return totals.map((total, index2) => ({
    label: labels[index2] || `P${index2 + 1}`,
    units: Math.round(total)
  }));
};
const BUCKET_ORDER = [
  "urgent",
  "air",
  "sea",
  "overstock"
];
const BUCKET_DEFINITIONS = {
  urgent: {
    label: "Need urgently (<48h)",
    description: "SKUs stocked out or about to stock out. Trigger expediting.",
    leadTimeDays: 2
  },
  air: {
    label: "Manufacturer air (≈30d lead)",
    description: "Air freight viable to avoid extended stockouts.",
    leadTimeDays: 30
  },
  sea: {
    label: "Manufacturer sea (≈60d lead)",
    description: "Standard replenishment cycle via ocean freight.",
    leadTimeDays: 60
  },
  overstock: {
    label: "Overstock / promo",
    description: "Long cover — consider promotions to clear stock.",
    leadTimeDays: 21
  }
};
const STATUS_BY_BUCKET = {
  urgent: "backorder",
  air: "low",
  sea: "healthy",
  overstock: "preorder"
};
const clampNumber = (value, minimum = 0) => Math.max(Math.round(value), minimum);
const buildTrend = (faker, dailySales) => {
  return Array.from({ length: 6 }).map((_, index2) => {
    const jitter = faker.number.float({ min: -2.5, max: 3.5, multipleOf: 0.1 });
    const baseUnits = dailySales * 7;
    const units = Math.max(Math.round(baseUnits + jitter * 5 - index2 * 1.2), 0);
    return {
      label: `W-${6 - index2}`,
      units
    };
  });
};
const createVendorSeeds = (faker, count) => {
  const vendorCount = Math.max(3, Math.min(Math.floor(count / 4), 5));
  return Array.from({ length: vendorCount }).map((_, index2) => ({
    id: `vendor-${index2 + 1}`,
    name: faker.company.name(),
    leadTimeDays: faker.number.int({ min: 18, max: 65 }),
    notes: faker.company.catchPhrase()
  }));
};
const buildSku = (faker, index2, vendorSeeds) => {
  const bucketId = BUCKET_ORDER[index2 % BUCKET_ORDER.length];
  const bucketConfig = BUCKET_DEFINITIONS[bucketId];
  const vendor = vendorSeeds[index2 % vendorSeeds.length];
  const dailySales = Math.max(
    faker.number.float({ min: 1.2, max: 18, multipleOf: 0.1 }),
    0.5
  );
  const safetyStockDays = bucketId === "urgent" ? 5 : bucketId === "air" ? 12 : bucketId === "sea" ? 25 : 15;
  const onHand = clampNumber(
    faker.number.int({
      min: bucketId === "overstock" ? 120 : 18,
      max: bucketId === "urgent" ? 95 : 360
    })
  );
  const inbound = clampNumber(
    faker.number.int({ min: bucketId === "urgent" ? 20 : 0, max: 260 })
  );
  const committed = clampNumber(faker.number.int({ min: 8, max: 180 }));
  const coverDays = clampNumber(onHand / dailySales);
  const peakFactor = faker.number.float({ min: 1.1, max: 1.9, multipleOf: 0.05 });
  const safetyStock = clampNumber(
    calculateSafetyStock(dailySales, dailySales * peakFactor, bucketConfig.leadTimeDays)
  );
  const reorderPoint = clampNumber(
    calculateReorderPoint({
      dailySales,
      leadTimeDays: bucketConfig.leadTimeDays,
      safetyStockDays
    })
  );
  const netInventory = onHand + inbound - committed;
  const recommendedOrder = Math.max(reorderPoint - netInventory + safetyStock, 0);
  const unitCost = createMoney$1(
    faker.number.float({ min: 6, max: 120, multipleOf: 0.5 })
  );
  const stockoutDate = calculateStockoutDate(
    Math.max(onHand - committed + inbound, 0),
    Math.max(dailySales, 0.1)
  ).toISOString();
  const turnoverDays = clampNumber(
    faker.number.int({ min: 15, max: 65 }) + (bucketId === "overstock" ? 20 : 0)
  );
  const sellThroughRate = Number.parseFloat(
    faker.number.float({ min: 0.25, max: 0.9, multipleOf: 0.01 }).toFixed(2)
  );
  const lastWeekUnits = clampNumber(dailySales * 7 + faker.number.int({ min: -5, max: 10 }));
  return {
    id: `inventory-${index2}`,
    title: `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${faker.commerce.product()}`,
    sku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: STATUS_BY_BUCKET[bucketId],
    bucketId,
    onHand,
    inbound,
    committed,
    coverDays,
    safetyStock,
    reorderPoint,
    recommendedOrder: clampNumber(recommendedOrder),
    stockoutDate,
    unitCost,
    velocity: {
      turnoverDays,
      sellThroughRate,
      lastWeekUnits
    },
    trend: buildTrend(faker, dailySales)
  };
};
const buildSkus = (faker, count, vendorSeeds) => {
  return Array.from({ length: count }).map((_, index2) => buildSku(faker, index2, vendorSeeds));
};
const buildBucketSummaries = (skus) => {
  return BUCKET_ORDER.map((bucketId) => {
    const config = BUCKET_DEFINITIONS[bucketId];
    const bucketSkus = skus.filter((sku) => sku.bucketId === bucketId);
    const valueAtRiskAmount = bucketSkus.reduce(
      (total, sku) => total + sku.recommendedOrder * sku.unitCost.amount,
      0
    );
    return {
      id: bucketId,
      label: config.label,
      description: config.description,
      leadTimeDays: config.leadTimeDays,
      skuCount: bucketSkus.length,
      valueAtRisk: createMoney$1(valueAtRiskAmount)
    };
  });
};
const buildVendorDraftItems = (skus, vendorId) => {
  return skus.filter((sku) => sku.vendorId === vendorId).map((sku) => ({
    skuId: sku.id,
    sku: sku.sku,
    title: sku.title,
    recommendedOrder: sku.recommendedOrder,
    draftQuantity: sku.recommendedOrder,
    unitCost: sku.unitCost
  }));
};
const buildVendorDrafts = (skus, vendors, faker) => {
  return vendors.map((vendor) => {
    const items = buildVendorDraftItems(skus, vendor.id);
    const totalDraftAmount = items.reduce(
      (total, item) => total + item.draftQuantity * item.unitCost.amount,
      0
    );
    const paddedBudget = totalDraftAmount * faker.number.float({ min: 1.1, max: 1.6, multipleOf: 0.05 });
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      leadTimeDays: vendor.leadTimeDays,
      budgetRemaining: createMoney$1(paddedBudget),
      lastOrderAt: faker.date.recent({ days: 60 }).toISOString(),
      notes: vendor.notes,
      items
    };
  });
};
const buildSummary = (skus, vendorDrafts) => {
  const totalCover = skus.reduce((total, sku) => total + sku.coverDays, 0);
  const totalDraftAmount = vendorDrafts.reduce((total, vendor) => {
    return total + vendor.items.reduce(
      (itemTotal, item) => itemTotal + item.draftQuantity * item.unitCost.amount,
      0
    );
  }, 0);
  const skusAtRisk = skus.filter(
    (sku) => sku.bucketId === "urgent" || sku.bucketId === "air"
  ).length;
  return {
    skusAtRisk,
    averageCoverDays: skus.length ? Math.round(totalCover / skus.length) : 0,
    openPoBudget: createMoney$1(totalDraftAmount)
  };
};
const assembleDataset = (scenario, skus, vendorSeeds, faker, alert, error) => {
  const buckets = buildBucketSummaries(skus);
  const vendorDrafts = buildVendorDrafts(skus, vendorSeeds, faker);
  const summary = buildSummary(skus, vendorDrafts);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    summary,
    buckets,
    skus,
    vendors: vendorDrafts,
    alert,
    error
  };
};
const buildBaseInventory = ({
  scenario,
  seed,
  count
}) => {
  const faker = createScenarioFaker$1(scenario, seed);
  const vendorSeeds = createVendorSeeds(faker, count);
  const skus = buildSkus(faker, count, vendorSeeds);
  return assembleDataset(scenario, skus, vendorSeeds, faker);
};
const buildWarningInventory = ({
  scenario,
  seed,
  count
}) => {
  const faker = createScenarioFaker$1(scenario, seed);
  const vendorSeeds = createVendorSeeds(faker, count);
  const skus = buildSkus(faker, count, vendorSeeds).map((sku, index2) => {
    if (index2 % 2 === 0) {
      const adjusted = Math.max(
        sku.recommendedOrder + faker.number.int({ min: 10, max: 40 }),
        0
      );
      return {
        ...sku,
        bucketId: "urgent",
        status: "backorder",
        coverDays: Math.max(sku.coverDays - 6, 0),
        recommendedOrder: adjusted
      };
    }
    return sku;
  });
  return assembleDataset(
    scenario,
    skus,
    vendorSeeds,
    faker,
    "Low-stock SKUs exceed configured thresholds. Expedite replenishment."
  );
};
const buildEmptyInventory = ({ scenario }) => {
  const emptyBuckets = BUCKET_ORDER.map((bucketId) => ({
    id: bucketId,
    label: BUCKET_DEFINITIONS[bucketId].label,
    description: BUCKET_DEFINITIONS[bucketId].description,
    leadTimeDays: BUCKET_DEFINITIONS[bucketId].leadTimeDays,
    skuCount: 0,
    valueAtRisk: createMoney$1(0)
  }));
  return {
    scenario,
    state: "empty",
    summary: {
      skusAtRisk: 0,
      averageCoverDays: 0,
      openPoBudget: createMoney$1(0)
    },
    buckets: emptyBuckets,
    skus: [],
    vendors: [],
    alert: "Inventory catalog is empty. Import products to begin tracking."
  };
};
const buildErrorInventory = ({ scenario }) => {
  const emptyBuckets = BUCKET_ORDER.map((bucketId) => ({
    id: bucketId,
    label: BUCKET_DEFINITIONS[bucketId].label,
    description: BUCKET_DEFINITIONS[bucketId].description,
    leadTimeDays: BUCKET_DEFINITIONS[bucketId].leadTimeDays,
    skuCount: 0,
    valueAtRisk: createMoney$1(0)
  }));
  return {
    scenario,
    state: "error",
    summary: {
      skusAtRisk: 0,
      averageCoverDays: 0,
      openPoBudget: createMoney$1(0)
    },
    buckets: emptyBuckets,
    skus: [],
    vendors: [],
    error: "Inventory snapshot failed to load. Refresh to retry."
  };
};
const BUILDERS$3 = {
  base: buildBaseInventory,
  empty: buildEmptyInventory,
  warning: buildWarningInventory,
  error: buildErrorInventory
};
const getInventoryScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const count = options.count ?? 18;
  return BUILDERS$3[scenario]({ scenario, seed, count });
};
const DEFAULT_RANGE_END = /* @__PURE__ */ new Date("2024-02-15T00:00:00.000Z");
const toUtc = (value) => {
  return typeof value === "string" ? new Date(value) : new Date(value.getTime());
};
const addDays = (date, days) => {
  const next = toUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const subDays = (date, days) => {
  return addDays(date, -days);
};
const toIso = (date) => {
  return date.toISOString();
};
const createDateRange = (days, end = DEFAULT_RANGE_END, label2) => {
  const safeDays = Math.max(days, 1);
  const endUtc = toUtc(end);
  const startUtc = subDays(endUtc, safeDays - 1);
  return {
    label: label2 ?? `${safeDays}-day range`,
    start: toIso(startUtc),
    end: toIso(endUtc)
  };
};
const stepsByGranularity = {
  daily: 1,
  weekly: 7,
  monthly: 30
};
const buildDateBuckets = (range, granularity) => {
  const buckets = [];
  const step = stepsByGranularity[granularity];
  let cursor = toUtc(range.start);
  const end = toUtc(range.end);
  while (cursor <= end) {
    buckets.push(toIso(cursor));
    cursor = addDays(cursor, step);
  }
  if (buckets[buckets.length - 1] !== range.end) {
    buckets[buckets.length - 1] = range.end;
  }
  return buckets;
};
const templates = [
  {
    id: "aov",
    label: "Average order value",
    unit: "currency",
    baseline: () => 168,
    format: (value) => formatCurrency$3(value),
    thresholds: { warning: 140, critical: 120, comparator: "lt" }
  },
  {
    id: "conversion",
    label: "Conversion rate",
    unit: "percentage",
    baseline: () => 2.6,
    format: (value) => `${roundTo$1(value, 2)}%`,
    thresholds: { warning: 2.1, critical: 1.5, comparator: "lt" }
  },
  {
    id: "returning",
    label: "Returning customers",
    unit: "percentage",
    baseline: () => 34,
    format: (value) => `${roundTo$1(value, 1)}%`,
    thresholds: { warning: 28, critical: 20, comparator: "lt" }
  },
  {
    id: "refundRate",
    label: "Refund rate",
    unit: "percentage",
    baseline: () => 1.9,
    format: (value) => `${roundTo$1(value, 2)}%`,
    thresholds: { warning: 3.5, critical: 5, comparator: "gt" }
  }
];
const computeState = (template, value) => {
  const { warning, critical, comparator } = template.thresholds;
  if (comparator === "lt") {
    if (value <= critical) return "critical";
    if (value <= warning) return "warning";
    return "ok";
  }
  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "ok";
};
const buildBaseKpis = ({ scenario, seed }) => {
  const faker = createScenarioFaker$1(scenario, seed);
  const range = createDateRange(30, DEFAULT_RANGE_END, "Last 30 days");
  const metrics = templates.map((template, index2) => {
    const variance = faker.number.float({ min: 0.9, max: 1.12, multipleOf: 1e-4 });
    const value = roundTo$1(template.baseline() * variance, 2);
    const delta = roundTo$1(
      faker.number.float({ min: -7, max: 9, multipleOf: 0.01 }),
      1
    );
    return {
      id: template.id,
      label: template.label,
      unit: template.unit,
      value,
      formattedValue: template.unit === "currency" ? createMoney$1(value).formatted : template.format(value),
      delta,
      deltaLabel: delta >= 0 ? `▲ ${roundTo$1(Math.abs(delta), 1)}%` : `▼ ${roundTo$1(Math.abs(delta), 1)}%`,
      state: computeState(template, value)
    };
  });
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    range,
    metrics
  };
};
const buildEmptyKpis = ({ scenario }) => ({
  scenario,
  state: "empty",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  metrics: []
});
const buildWarningKpis = (context) => {
  const dataset = buildBaseKpis(context);
  dataset.state = "warning";
  dataset.metrics = dataset.metrics.map((metric, index2) => {
    if (index2 % 2 === 0) {
      return { ...metric, state: "warning", delta: -Math.abs(metric.delta) };
    }
    return metric;
  });
  return dataset;
};
const buildErrorKpis = ({ scenario }) => ({
  scenario,
  state: "error",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  metrics: [],
  error: "KPI data feed failed integrity checks."
});
const BUILDERS$2 = {
  base: buildBaseKpis,
  empty: buildEmptyKpis,
  warning: buildWarningKpis,
  error: buildErrorKpis
};
const getKpiScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  return BUILDERS$2[scenario]({ scenario, seed });
};
const DEFAULT_ORDER_COUNT = 36;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 12;
const SCENARIO_KEY = (scenario, seed) => `${scenario}::${seed}`;
const STORE = /* @__PURE__ */ new Map();
const ORDER_PRIORITIES = [
  { value: "standard", weight: 62 },
  { value: "rush", weight: 26 },
  { value: "vip", weight: 12 }
];
const ORDER_ISSUES = [
  { value: "none", weight: 55 },
  { value: "inventory", weight: 18 },
  { value: "payment", weight: 9 },
  { value: "address", weight: 8 },
  { value: "carrier", weight: 6 },
  { value: "manual_check", weight: 4 }
];
const ORDER_CHANNELS = [
  { value: "online", weight: 78 },
  { value: "pos", weight: 14 },
  { value: "draft", weight: 8 }
];
const HOURS = 1e3 * 60 * 60;
const clampPageSize$1 = (value) => {
  if (!Number.isFinite(value ?? NaN)) return DEFAULT_PAGE_SIZE;
  return Math.max(5, Math.min(MAX_PAGE_SIZE, Math.round(value)));
};
const pickWeighted = (faker, entries) => {
  const total = entries.reduce((sum, entry2) => sum + entry2.weight, 0);
  const target = faker.number.float({ min: 0, max: total, multipleOf: 0.01 });
  let running = 0;
  for (const entry2 of entries) {
    running += entry2.weight;
    if (target <= running) {
      return entry2.value;
    }
  }
  return entries[entries.length - 1].value;
};
const makeOrder = (faker, index2) => {
  const priority = pickWeighted(faker, ORDER_PRIORITIES);
  const issue = pickWeighted(faker, ORDER_ISSUES);
  const channel = pickWeighted(faker, ORDER_CHANNELS);
  const lineItemCount = faker.number.int({ min: 1, max: 4 });
  const lineItems = Array.from({ length: lineItemCount }, (_, itemIndex) => {
    const quantity = faker.number.int({ min: 1, max: 4 });
    const price = faker.number.float({ min: 18, max: 260, multipleOf: 0.01 });
    return {
      id: `order-${index2}-item-${itemIndex}`,
      title: faker.commerce.productName(),
      sku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
      quantity,
      price: createMoney$1(price),
      total: createMoney$1(price * quantity)
    };
  });
  const subtotal = lineItems.reduce((sum, item) => sum + item.total.amount, 0);
  const shipping = faker.number.float({ min: 6, max: 28, multipleOf: 0.01 });
  const total = subtotal + shipping;
  const placedAt = faker.date.recent({ days: 20 }).toISOString();
  const shipBy = faker.date.soon({ days: 6, refDate: placedAt }).toISOString();
  const fulfillmentStatus = faker.helpers.arrayElement([
    "unfulfilled",
    "unfulfilled",
    "partial",
    "fulfilled"
  ]);
  const fulfillmentDueAt = fulfillmentStatus === "fulfilled" ? void 0 : faker.date.soon({ days: 4, refDate: placedAt }).toISOString();
  const status = fulfillmentStatus === "fulfilled" ? "fulfilled" : pickWeighted(faker, [
    { value: "paid", weight: 65 },
    { value: "processing", weight: 35 }
  ]);
  const paymentStatus = status === "paid" ? "paid" : "pending";
  const ageHours = Math.max(
    roundTo$1((Date.now() - new Date(placedAt).getTime()) / HOURS, 1),
    0.5
  );
  const assignedTo = faker.helpers.arrayElement([
    "assistant",
    "assistant",
    "unassigned",
    faker.person.firstName().toLowerCase()
  ]);
  return {
    id: `order-${index2}`,
    name: `#${faker.number.int({ min: 4100, max: 9999 })}`,
    status,
    paymentStatus,
    fulfillmentStatus,
    placedAt,
    fulfillmentDueAt,
    shipBy,
    ageHours,
    priority,
    issue,
    assignedTo,
    channel,
    total: createMoney$1(total),
    subtotal: createMoney$1(subtotal),
    shipping: createMoney$1(shipping),
    customer: {
      id: `customer-${index2}`,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      firstOrderAt: faker.date.past({ years: 3 }).toISOString(),
      lastOrderAt: placedAt,
      location: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
      lifetimeValue: createMoney$1(
        total * faker.number.float({ min: 2.4, max: 5.8 })
      )
    },
    lineItems,
    tags: faker.helpers.arrayElements(
      ["VIP", "Wholesale", "Email", "Repeat", "Gift"],
      faker.number.int({ min: 0, max: 2 })
    ),
    timeline: [
      {
        id: `order-${index2}-event-placed`,
        type: "status",
        message: "Order placed",
        occurredAt: placedAt,
        state: status
      },
      {
        id: `order-${index2}-event-payment`,
        type: "payment",
        message: paymentStatus === "paid" ? "Payment captured" : "Awaiting payment",
        occurredAt: faker.date.soon({ days: 1, refDate: placedAt }).toISOString(),
        state: status
      }
    ],
    supportThread: faker.datatype.boolean({ probability: 0.42 }) ? `conversation:${faker.string.nanoid(6)}` : void 0
  };
};
const buildShipments = (faker, orders) => {
  const trackingPending = orders.filter((order) => order.fulfillmentStatus !== "fulfilled").slice(0, 4).map((order, index2) => ({
    id: `tracking-${index2}`,
    orderId: order.id,
    orderNumber: order.name,
    expectedShipDate: order.shipBy ?? order.fulfillmentDueAt ?? faker.date.soon({ days: 2 }).toISOString(),
    owner: order.assignedTo
  }));
  const delayed = orders.filter(
    (order) => order.fulfillmentStatus !== "fulfilled" && !!order.fulfillmentDueAt && new Date(order.fulfillmentDueAt).getTime() < Date.now()
  ).slice(0, 3).map((order, index2) => ({
    id: `delay-${index2}`,
    orderId: order.id,
    orderNumber: order.name,
    carrier: faker.helpers.arrayElement(["UPS", "FedEx", "USPS", "DHL"]),
    delayHours: faker.number.int({ min: 6, max: 42 }),
    lastUpdate: faker.date.recent({ days: 1 }).toISOString()
  }));
  return {
    trackingPending,
    delayed,
    deliveredToday: faker.number.int({ min: 4, max: 18 })
  };
};
const buildReturns = (faker, orders) => {
  const candidates = orders.slice(0, 6);
  const pending = candidates.map((order, index2) => {
    const stage = faker.helpers.arrayElement([
      "awaiting_label",
      "in_transit",
      "inspection"
    ]);
    const ageDays = faker.number.float({ min: 0.5, max: 9.5, multipleOf: 0.5 });
    return {
      id: `return-${index2}`,
      orderId: order.id,
      orderNumber: order.name,
      reason: faker.helpers.arrayElement([
        "Wrong size",
        "Damaged in transit",
        "Changed mind",
        "Incorrect fittings"
      ]),
      stage,
      ageDays,
      refundAmount: createMoney$1(order.total.amount * faker.number.float({ min: 0.4, max: 1 }))
    };
  });
  const refundValue = pending.reduce(
    (total, ret) => total + (ret.stage === "inspection" ? ret.refundAmount.amount : 0),
    0
  );
  return {
    pending,
    refundsDue: pending.filter((entry2) => entry2.stage === "inspection").length,
    refundValue: createMoney$1(refundValue)
  };
};
const buildInventoryHolds = (faker) => {
  return Array.from({ length: 4 }, (_, index2) => ({
    sku: `INV-${faker.string.alphanumeric({ length: 6 }).toUpperCase()}`,
    title: `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${faker.commerce.product()}`,
    ordersWaiting: faker.number.int({ min: 1, max: 6 }),
    onHand: faker.number.int({ min: 0, max: 12 }),
    eta: faker.datatype.boolean({ likelihood: 60 }) ? faker.date.soon({ days: 5 + index2 * 2 }).toISOString() : void 0
  }));
};
const createStore = (scenario, seed) => {
  if (scenario === "empty") {
    return {
      orders: [],
      shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
      returns: { pending: [], refundsDue: 0, refundValue: createMoney$1(0) },
      inventory: [],
      alerts: [],
      dataGaps: []
    };
  }
  if (scenario === "error") {
    return {
      orders: [],
      shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
      returns: { pending: [], refundsDue: 0, refundValue: createMoney$1(0) },
      inventory: [],
      alerts: [],
      dataGaps: []
    };
  }
  const faker = createScenarioFaker$1(scenario, seed);
  const orders = Array.from({ length: DEFAULT_ORDER_COUNT }, (_, index2) => makeOrder(faker, index2));
  if (scenario === "warning") {
    orders.slice(0, 5).forEach((order) => {
      order.priority = "vip";
      order.issue = order.issue === "none" ? "inventory" : order.issue;
      order.status = "processing";
      order.fulfillmentStatus = "unfulfilled";
      if (order.fulfillmentDueAt) {
        const past = new Date(Date.now() - HOURS * faker.number.int({ min: 4, max: 24 }));
        order.fulfillmentDueAt = past.toISOString();
      }
      order.timeline.push({
        id: `event-${order.id}-warning`,
        type: "status",
        message: "Fulfillment delayed",
        occurredAt: (/* @__PURE__ */ new Date()).toISOString(),
        state: "processing"
      });
    });
  }
  const systemFaker = createSeededFaker(seed + 404);
  const shipments = buildShipments(systemFaker, orders);
  const returns = buildReturns(systemFaker, orders);
  const inventory = buildInventoryHolds(systemFaker);
  const alerts = [];
  if (scenario === "warning") {
    alerts.push("Multiple VIP orders are approaching SLA risk.");
  }
  const dataGaps = [];
  return {
    orders,
    shipments,
    returns,
    inventory,
    alerts,
    dataGaps
  };
};
const getStore = (scenario, seed) => {
  const key = SCENARIO_KEY(scenario, seed);
  if (!STORE.has(key)) {
    STORE.set(key, createStore(scenario, seed));
  }
  return STORE.get(key);
};
const computeMetrics = (orders, shipments) => {
  const totalOrders = orders.length;
  if (!totalOrders) {
    return {
      totalOrders: 0,
      awaitingFulfillment: 0,
      awaitingTracking: 0,
      overdue: 0,
      overduePercentage: 0,
      averageFulfillmentHours: 0,
      slaBreaches: 0
    };
  }
  const awaitingFulfillment = orders.filter((order) => order.fulfillmentStatus !== "fulfilled").length;
  const overdue = orders.filter(
    (order) => order.fulfillmentStatus !== "fulfilled" && !!order.fulfillmentDueAt && new Date(order.fulfillmentDueAt).getTime() < Date.now()
  ).length;
  const averageFulfillmentHours = orders.reduce((sum, order) => sum + order.ageHours, 0) / totalOrders;
  return {
    totalOrders,
    awaitingFulfillment,
    awaitingTracking: shipments.trackingPending.length,
    overdue,
    overduePercentage: percentage(overdue, totalOrders, 0),
    averageFulfillmentHours: roundTo$1(averageFulfillmentHours, 1),
    slaBreaches: shipments.delayed.length
  };
};
const filterOrdersByTab = (orders, tab) => {
  switch (tab) {
    case "unfulfilled":
      return orders.filter((order) => order.fulfillmentStatus !== "fulfilled");
    case "overdue":
      return orders.filter(
        (order) => order.fulfillmentStatus !== "fulfilled" && !!order.fulfillmentDueAt && new Date(order.fulfillmentDueAt).getTime() < Date.now()
      );
    case "refunded":
      return orders.filter((order) => order.status === "refunded");
    default:
      return orders;
  }
};
const paginateOrders = (orders, pageSize, cursor, direction = "after") => {
  var _a2, _b2, _c, _d;
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const lastIndex = Math.max(0, orders.length - 1);
  const initialStart = 0;
  const resolveStartIndex = () => {
    if (!cursor) {
      return direction === "before" ? Math.max(0, orders.length - pageSize) : initialStart;
    }
    const index2 = orders.findIndex((order) => order.id === cursor);
    if (index2 === -1) {
      return initialStart;
    }
    if (direction === "before") {
      return Math.max(0, index2 - pageSize);
    }
    return Math.min(index2 + 1, Math.max(orders.length - pageSize, 0));
  };
  let startIndex = resolveStartIndex();
  if (startIndex > lastIndex) {
    startIndex = Math.max(0, orders.length - pageSize);
  }
  const items = orders.slice(startIndex, startIndex + pageSize);
  const hasNextPage = startIndex + items.length < orders.length;
  const hasPreviousPage = startIndex > 0;
  const startCursor = ((_a2 = items[0]) == null ? void 0 : _a2.id) ?? null;
  const endCursor = ((_b2 = items[items.length - 1]) == null ? void 0 : _b2.id) ?? null;
  const previousCursor = hasPreviousPage ? ((_c = orders[Math.max(0, startIndex - 1)]) == null ? void 0 : _c.id) ?? null : null;
  const nextCursor = hasNextPage ? ((_d = orders[Math.min(lastIndex, startIndex + pageSize - 1)]) == null ? void 0 : _d.id) ?? null : null;
  const page = items.length ? Math.min(totalPages, Math.max(1, Math.floor(startIndex / pageSize) + 1)) : 1;
  return {
    items,
    pageInfo: {
      cursor: endCursor,
      startCursor,
      endCursor,
      nextCursor,
      previousCursor,
      hasNextPage,
      hasPreviousPage,
      page,
      pageSize,
      totalPages
    }
  };
};
const errorDataset = (scenario, tab) => ({
  scenario,
  state: "error",
  tab,
  period: buildDefaultPeriod(),
  orders: {
    items: [],
    count: 0,
    pageInfo: {
      cursor: null,
      startCursor: null,
      endCursor: null,
      nextCursor: null,
      previousCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 1
    }
  },
  metrics: {
    totalOrders: 0,
    awaitingFulfillment: 0,
    awaitingTracking: 0,
    overdue: 0,
    overduePercentage: 0,
    averageFulfillmentHours: 0,
    slaBreaches: 0
  },
  shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
  returns: { pending: [], refundsDue: 0, refundValue: createMoney$1(0) },
  inventory: [],
  alerts: [],
  dataGaps: [],
  error: "Orders service timed out while responding."
});
const emptyDataset = (scenario, tab) => ({
  scenario,
  state: "empty",
  tab,
  period: buildDefaultPeriod(),
  orders: {
    items: [],
    count: 0,
    pageInfo: {
      cursor: null,
      startCursor: null,
      endCursor: null,
      nextCursor: null,
      previousCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 1
    }
  },
  metrics: {
    totalOrders: 0,
    awaitingFulfillment: 0,
    awaitingTracking: 0,
    overdue: 0,
    overduePercentage: 0,
    averageFulfillmentHours: 0,
    slaBreaches: 0
  },
  shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
  returns: { pending: [], refundsDue: 0, refundValue: createMoney$1(0) },
  inventory: [],
  alerts: [],
  dataGaps: [],
  alert: "No orders match the current filters."
});
const buildDefaultPeriod = () => {
  const end = /* @__PURE__ */ new Date();
  const start = new Date(end.getTime() - 7 * 24 * HOURS);
  return {
    label: "Last 7 days",
    start: start.toISOString(),
    end: end.toISOString()
  };
};
const getOrdersScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const tab = options.tab ?? "all";
  const pageSize = clampPageSize$1(options.pageSize);
  const cursor = options.cursor ?? null;
  const direction = options.direction === "before" ? "before" : "after";
  if (scenario === "error") {
    return errorDataset(scenario, tab);
  }
  if (scenario === "empty") {
    return emptyDataset(scenario, tab);
  }
  const store = getStore(scenario, seed);
  let filtered = filterOrdersByTab(store.orders, tab);
  if (options.status) {
    const normalized = options.status.toLowerCase();
    if (normalized === "awaiting_fulfillment") {
      filtered = filtered.filter((order) => order.fulfillmentStatus !== "fulfilled");
    } else if (normalized === "awaiting_tracking") {
      filtered = filtered.filter((order) => order.fulfillmentStatus === "partial");
    } else if (normalized === "overdue") {
      filtered = filtered.filter((order) => {
        const due = order.fulfillmentDueAt ?? order.shipBy;
        return due ? new Date(due).getTime() < Date.now() : false;
      });
    } else if (normalized === "holds") {
      filtered = filtered.filter((order) => order.issue !== "none");
    }
  }
  if (options.priority) {
    filtered = filtered.filter((order) => order.priority === options.priority);
  }
  if (options.channel) {
    filtered = filtered.filter((order) => order.channel === options.channel);
  }
  if (options.assignedTo) {
    const normalizedAssigned = options.assignedTo.toLowerCase();
    filtered = filtered.filter((order) => order.assignedTo.toLowerCase() === normalizedAssigned);
  }
  if (options.tag) {
    const normalizedTag = options.tag.toLowerCase();
    filtered = filtered.filter(
      (order) => order.tags.some((tag) => tag.toLowerCase() === normalizedTag)
    );
  }
  const startDate = options.dateStart ? new Date(options.dateStart) : null;
  const endDate = options.dateEnd ? new Date(options.dateEnd) : null;
  if (startDate && !Number.isNaN(startDate.getTime())) {
    filtered = filtered.filter((order) => new Date(order.placedAt) >= startDate);
  }
  if (endDate && !Number.isNaN(endDate.getTime())) {
    filtered = filtered.filter((order) => new Date(order.placedAt) <= endDate);
  }
  const { items, pageInfo } = paginateOrders(filtered, pageSize, cursor, direction);
  const metrics = computeMetrics(store.orders, store.shipments);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    tab,
    period: buildDefaultPeriod(),
    orders: {
      items,
      count: filtered.length,
      pageInfo
    },
    metrics,
    shipments: store.shipments,
    returns: store.returns,
    inventory: store.inventory,
    alerts: [...store.alerts],
    dataGaps: [...store.dataGaps]
  };
};
const findOrders = (scenario, seed, ids) => {
  const store = getStore(scenario, seed);
  const orders = ids.map((id) => store.orders.find((order) => order.id === id)).filter((order) => Boolean(order));
  return { store, orders };
};
const assignOrders = (scenario, seed, ids, assignee) => {
  const { store, orders } = findOrders(scenario, seed, ids);
  orders.forEach((order) => {
    order.assignedTo = assignee || "unassigned";
  });
  if (orders.length) {
    store.alerts = store.alerts.filter((msg) => !msg.startsWith("Assignment pending"));
  }
  return orders;
};
const markOrdersFulfilled = (scenario, seed, ids, tracking) => {
  const { store, orders } = findOrders(scenario, seed, ids);
  const orderNames = new Set(orders.map((order) => order.name));
  orders.forEach((order) => {
    order.fulfillmentStatus = "fulfilled";
    order.status = "fulfilled";
    order.issue = "none";
    order.fulfillmentDueAt = void 0;
  });
  store.shipments.trackingPending = store.shipments.trackingPending.filter(
    (shipment) => !orderNames.has(shipment.orderNumber)
  );
  store.shipments.delayed = store.shipments.delayed.filter(
    (shipment) => !orderNames.has(shipment.orderNumber)
  );
  if (tracking) {
    store.alerts.unshift(
      `Tracking ${tracking.number} (${tracking.carrier}) created for ${orders.map((order) => order.name).join(", ")}`
    );
  }
  return orders;
};
const requestSupport = (scenario, seed, payload) => {
  const store = getStore(scenario, seed);
  const order = store.orders.find((item) => item.id === payload.orderId);
  if (!order) return null;
  order.issue = "manual_check";
  order.assignedTo = "assistant";
  order.supportThread = payload.conversationId ?? order.supportThread ?? `conversation:${payload.orderId}`;
  store.alerts.unshift(`Support requested for ${order.name}: ${payload.note}`);
  return order;
};
const updateReturnAction = (scenario, seed, payload) => {
  const store = getStore(scenario, seed);
  const entry2 = store.returns.pending.find(
    (ret) => ret.orderId === payload.orderId || ret.orderNumber === payload.orderId
  );
  if (!entry2) return null;
  if (payload.action === "approve_refund") {
    entry2.stage = "inspection";
  } else if (payload.action === "deny") {
    store.returns.pending = store.returns.pending.filter((ret) => ret.orderNumber !== payload.orderId);
  } else {
    entry2.stage = "in_transit";
  }
  if (payload.note) {
    store.alerts.unshift(`Return update for ${payload.orderId}: ${payload.note}`);
  }
  return entry2;
};
const DEFAULT_RANGE_BY_GRANULARITY = {
  daily: 14,
  weekly: 12,
  monthly: 12
};
const CHANNEL_WEIGHTS = [
  { label: "Online Store", weight: 0.56 },
  { label: "Retail", weight: 0.22 },
  { label: "Wholesale", weight: 0.14 },
  { label: "Marketplaces", weight: 0.08 }
];
const INVENTORY_STATUSES = [
  "healthy",
  "overstock",
  "stockout_risk"
];
const BACKORDER_RISK = [
  "none",
  "low",
  "medium",
  "high"
];
const buildBaseScenario = ({
  scenario,
  granularity,
  days,
  seed
}) => {
  const faker = createScenarioFaker$1(scenario, seed);
  const range = createDateRange(days);
  const buckets = buildDateBuckets(range, granularity);
  const totalAmount = faker.number.float({
    min: 8e4,
    max: 14e4,
    multipleOf: 0.01
  });
  const previousTotalAmount = faker.number.float({
    min: totalAmount * 0.88,
    max: totalAmount * 1.08,
    multipleOf: 0.01
  });
  const orders = faker.number.int({ min: 450, max: 950 });
  const avgOrderValue = totalAmount / Math.max(orders, 1);
  const conversionRate = faker.number.float({
    min: 1.4,
    max: 3.5,
    multipleOf: 0.01
  });
  const baseBucketValue = totalAmount / buckets.length;
  const trend = buckets.map((date, index2) => {
    const modifier = faker.number.float({
      min: 0.82,
      max: 1.18,
      multipleOf: 1e-4
    });
    const bucketTotal = baseBucketValue * modifier;
    const bucketOrders = Math.max(
      12,
      Math.round(orders / buckets.length * modifier)
    );
    return {
      date,
      total: createMoney$1(bucketTotal),
      orders: bucketOrders
    };
  });
  const channelBreakdown = CHANNEL_WEIGHTS.map(({ label: label2, weight }, index2) => {
    const modifier = faker.number.float({
      min: 0.92,
      max: 1.08,
      multipleOf: 1e-4
    });
    const channelTotal = totalAmount * weight * modifier;
    return {
      channel: label2,
      total: createMoney$1(channelTotal),
      percentage: percentage(channelTotal, totalAmount, 1)
    };
  });
  const collectionCount = faker.number.int({ min: 4, max: 6 });
  const collectionWeights = Array.from(
    { length: collectionCount },
    () => faker.number.float({ min: 0.85, max: 1.2, multipleOf: 1e-4 })
  );
  const collectionWeightTotal = collectionWeights.reduce(
    (sum, weight) => sum + weight,
    0
  ) || collectionCount;
  const collections = [];
  const productsByCollection = {};
  const variantsByProduct = {};
  collectionWeights.forEach((weight) => {
    const collectionId = faker.string.uuid();
    const title = faker.commerce.department();
    const handle = faker.helpers.slugify(title).toLowerCase();
    const collectionGmv = totalAmount * weight / collectionWeightTotal;
    const orderModifier = faker.number.float({
      min: 0.85,
      max: 1.12,
      multipleOf: 1e-4
    });
    const collectionOrders = Math.max(
      18,
      Math.round(orders / collectionCount * orderModifier)
    );
    const conversion = faker.number.float({
      min: 1.2,
      max: 3.8,
      multipleOf: 0.01
    });
    const returningRate = faker.number.float({
      min: 18,
      max: 42,
      multipleOf: 0.1
    });
    const attachRate = faker.number.float({
      min: 8,
      max: 26,
      multipleOf: 0.1
    });
    const deltaPct = faker.number.float({
      min: -9,
      max: 14,
      multipleOf: 0.1
    });
    const collection = {
      id: collectionId,
      title,
      handle,
      gmv: createMoney$1(collectionGmv),
      orders: collectionOrders,
      conversionRate: conversion,
      returningRate,
      attachRate,
      deltaPercentage: deltaPct
    };
    collections.push(collection);
    const productCount = faker.number.int({ min: 3, max: 6 });
    const productWeights = Array.from(
      { length: productCount },
      () => faker.number.float({ min: 0.9, max: 1.25, multipleOf: 1e-4 })
    );
    const productWeightTotal = productWeights.reduce(
      (sum, value) => sum + value,
      0
    ) || productCount;
    const products = [];
    productWeights.forEach((productWeight) => {
      const productId = faker.string.uuid();
      const productTitle = faker.commerce.productName();
      const productGmv = collectionGmv * productWeight / productWeightTotal;
      const productOrders = Math.max(
        8,
        Math.round(
          collectionOrders / productCount * faker.number.float({ min: 0.9, max: 1.2, multipleOf: 1e-4 })
        )
      );
      const product = {
        id: productId,
        title: productTitle,
        gmv: createMoney$1(productGmv),
        orders: productOrders,
        attachRate: faker.number.float({
          min: 4,
          max: 28,
          multipleOf: 0.1
        }),
        returningRate: faker.number.float({
          min: 10,
          max: 36,
          multipleOf: 0.1
        }),
        refundRate: faker.number.float({
          min: 0.4,
          max: 5.5,
          multipleOf: 0.1
        }),
        skuCount: faker.number.int({ min: 2, max: 6 }),
        inventoryStatus: faker.helpers.arrayElement(INVENTORY_STATUSES)
      };
      products.push(product);
      const variantCount = Math.max(
        2,
        Math.min(6, product.skuCount + faker.number.int({ min: -1, max: 1 }))
      );
      const variantWeights = Array.from(
        { length: variantCount },
        () => faker.number.float({ min: 0.9, max: 1.2, multipleOf: 1e-4 })
      );
      const variantWeightTotal = variantWeights.reduce(
        (sum, value) => sum + value,
        0
      ) || variantCount;
      const variants = variantWeights.map(
        (variantWeight, index2) => {
          const unitsBaseline = Math.max(
            1,
            Math.round(
              product.orders / variantCount * faker.number.float({
                min: 0.9,
                max: 1.25,
                multipleOf: 1e-4
              })
            )
          );
          const unitsSold = unitsBaseline;
          const inventoryOnHand = Math.max(
            unitsSold,
            Math.round(
              unitsSold * faker.number.float({ min: 1.1, max: 2.3, multipleOf: 0.01 })
            )
          );
          return {
            id: faker.string.uuid(),
            sku: faker.string.alphanumeric({ length: 8, casing: "upper" }),
            title: `${productTitle} ${String.fromCharCode(65 + index2)}`,
            gmv: createMoney$1(product.gmv.amount * variantWeight / variantWeightTotal),
            unitsSold,
            inventoryOnHand,
            attachRate: faker.number.float({
              min: 1,
              max: 14,
              multipleOf: 0.1
            }),
            backorderRisk: faker.helpers.arrayElement(BACKORDER_RISK)
          };
        }
      );
      variantsByProduct[productId] = variants;
    });
    productsByCollection[collectionId] = products;
  });
  const allProducts = Object.values(productsByCollection).flat();
  const bestSellers = [...allProducts].sort((a, b) => b.gmv.amount - a.gmv.amount).slice(0, Math.min(6, allProducts.length));
  const laggards = [...allProducts].sort((a, b) => a.orders - b.orders).slice(0, Math.min(6, allProducts.length));
  const attachRateInsights = [];
  if (allProducts.length > 1) {
    const insightCount = Math.min(4, allProducts.length);
    for (let index2 = 0; index2 < insightCount; index2 += 1) {
      const primary = allProducts[index2];
      const secondary = allProducts[(index2 + 1) % allProducts.length];
      attachRateInsights.push({
        id: `attach-${primary.id}`,
        primaryProduct: primary.title,
        attachmentProduct: secondary.title,
        attachRate: faker.number.float({
          min: 8,
          max: 32,
          multipleOf: 0.1
        }),
        opportunity: `${secondary.title} added on ${faker.number.int({ min: 18, max: 42 })}
          .toString()}% of orders containing ${primary.title}`
      });
    }
  }
  const riskCandidates = allProducts.filter(
    (product) => product.inventoryStatus !== "healthy"
  );
  const risksSource = allProducts.length === 0 ? [] : (riskCandidates.length ? riskCandidates : allProducts).slice(
    0,
    Math.min(4, allProducts.length)
  );
  const overstockRisks = risksSource.map(
    (product, index2) => {
      const status = product.inventoryStatus === "healthy" ? "overstock" : product.inventoryStatus;
      return {
        id: `risk-${product.id}-${index2}`,
        productId: product.id,
        title: product.title,
        status,
        daysOnHand: faker.number.int({
          min: status === "overstock" ? 45 : 7,
          max: status === "overstock" ? 120 : 28
        }),
        recommendedAction: status === "overstock" ? "Plan clearance campaign to reduce aging stock." : status === "stockout_risk" ? "Expedite replenishment to avoid lost revenue." : "Bundle with best sellers to improve velocity."
      };
    }
  );
  const repeatPurchaseRate = faker.number.float({
    min: 24,
    max: 44,
    multipleOf: 0.1
  });
  const highestOrderValue = createMoney$1(
    faker.number.float({ min: 540, max: 1840, multipleOf: 0.01 })
  );
  const timeToSecondPurchase = faker.number.int({ min: 14, max: 48 });
  const cohortHighlights = [
    {
      id: "repeat-rate",
      title: "Repeat purchase rate",
      value: `${repeatPurchaseRate.toFixed(1)}%`,
      description: "Customers returning within 90 days."
    },
    {
      id: "top-order-value",
      title: "Highest order value",
      value: highestOrderValue.formatted,
      description: "Largest single order for the selected window."
    },
    {
      id: "time-to-repeat",
      title: "Time to 2nd purchase",
      value: `${timeToSecondPurchase} days`,
      description: "Median time for customers to purchase again."
    }
  ];
  const referenceDate = new Date(range.end);
  const topCustomers = Array.from(
    { length: 5 },
    () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const lastOrder = faker.date.recent({
        days: Math.max(14, Math.min(days, 120)),
        refDate: referenceDate
      });
      const firstOrder = faker.date.past({ years: 3, refDate: lastOrder });
      return {
        id: faker.string.uuid(),
        name: `${firstName} ${lastName}`,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        orders: faker.number.int({ min: 3, max: 12 }),
        lifetimeValue: createMoney$1(
          faker.number.float({ min: 450, max: 6200, multipleOf: 0.01 })
        ),
        lastOrderAt: lastOrder.toISOString(),
        firstOrderAt: firstOrder.toISOString()
      };
    }
  );
  const forecastVariance = faker.number.float({
    min: -4.2,
    max: 6.5,
    multipleOf: 0.1
  });
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    granularity,
    range,
    totals: {
      currentTotal: createMoney$1(totalAmount),
      previousTotal: createMoney$1(previousTotalAmount),
      deltaPercentage: deltaPercentage(totalAmount, previousTotalAmount),
      averageOrderValue: createMoney$1(avgOrderValue),
      conversionRate
    },
    trend,
    channelBreakdown,
    forecast: {
      projectedTotal: createMoney$1(
        totalAmount * (1 + forecastVariance / 100)
      ),
      variancePercentage: forecastVariance,
      varianceLabel: forecastVariance > 1 ? "ahead" : forecastVariance < -1 ? "behind" : "on_track"
    },
    collections,
    productsByCollection,
    variantsByProduct,
    bestSellers,
    laggards,
    attachRateInsights,
    overstockRisks,
    cohortHighlights,
    topCustomers
  };
};
const buildEmptyScenario = ({
  scenario,
  granularity,
  days,
  seed
}) => {
  const range = createDateRange(days);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    granularity,
    range,
    totals: {
      currentTotal: createMoney$1(0),
      previousTotal: createMoney$1(0),
      deltaPercentage: 0,
      averageOrderValue: createMoney$1(0),
      conversionRate: 0
    },
    trend: [],
    channelBreakdown: [],
    forecast: null,
    collections: [],
    productsByCollection: {},
    variantsByProduct: {},
    bestSellers: [],
    laggards: [],
    attachRateInsights: [],
    overstockRisks: [],
    cohortHighlights: [],
    topCustomers: [],
    alert: "No sales recorded for the selected date range."
  };
};
const buildWarningScenario = (context) => {
  const base = buildBaseScenario(context);
  const { scenario } = context;
  const faker = createScenarioFaker$1(scenario, context.seed + 99);
  const drop = faker.number.float({ min: -18, max: -8, multipleOf: 0.1 });
  const currentAmount = base.totals.currentTotal.amount;
  const adjustedAmount = currentAmount * (1 + drop / 100);
  return {
    ...base,
    state: "warning",
    totals: {
      ...base.totals,
      currentTotal: createMoney$1(adjustedAmount),
      deltaPercentage: drop
    },
    forecast: base.forecast && {
      ...base.forecast,
      projectedTotal: createMoney$1(adjustedAmount * 1.02),
      variancePercentage: drop,
      varianceLabel: "behind"
    },
    alert: "Revenue is trending below forecast. Review conversion funnels."
  };
};
const buildErrorScenario = ({
  scenario,
  granularity,
  days
}) => {
  const range = createDateRange(days);
  return {
    scenario,
    state: "error",
    granularity,
    range,
    totals: {
      currentTotal: createMoney$1(0),
      previousTotal: createMoney$1(0),
      deltaPercentage: 0,
      averageOrderValue: createMoney$1(0),
      conversionRate: 0
    },
    trend: [],
    channelBreakdown: [],
    forecast: null,
    collections: [],
    productsByCollection: {},
    variantsByProduct: {},
    bestSellers: [],
    laggards: [],
    attachRateInsights: [],
    overstockRisks: [],
    cohortHighlights: [],
    topCustomers: [],
    error: "Sales insights are temporarily unavailable. Try again shortly."
  };
};
const BUILDERS$1 = {
  base: buildBaseScenario,
  empty: buildEmptyScenario,
  warning: buildWarningScenario,
  error: buildErrorScenario
};
const getSalesScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const granularity = options.granularity ?? "daily";
  const days = options.days ?? DEFAULT_RANGE_BY_GRANULARITY[granularity];
  const seed = options.seed ?? 0;
  const builder = BUILDERS$1[scenario];
  return builder({ scenario, granularity, days, seed });
};
const insightTemplates = [
  {
    title: "Core Web Vitals regression",
    description: "Largest Contentful Paint exceeded 4s on mobile.",
    metricLabel: "LCP",
    source: "ga4"
  },
  {
    title: "Keyword ranking opportunity",
    description: "'custom hot rods' moved up 4 places in search results.",
    metricLabel: "Rank",
    source: "gsc"
  },
  {
    title: "Broken sitemap links",
    description: "6 URLs returned 404 in the latest crawl.",
    metricLabel: "Errors",
    source: "bing"
  },
  {
    title: "Meta description length",
    description: "12 product pages exceed the recommended 160 characters.",
    metricLabel: "Pages",
    source: "gsc"
  }
];
const keywordBlueprints = [
  {
    query: "custom hot rods",
    intent: "transactional",
    topPage: "/collections/custom-builds"
  },
  {
    query: "ls turbo kit",
    intent: "transactional",
    topPage: "/collections/turbo-kit"
  },
  {
    query: "fabricated headers",
    intent: "informational",
    topPage: "/blogs/tech/hand-built-headers"
  },
  {
    query: "drag racing safety checklist",
    intent: "informational",
    topPage: "/blogs/tech/track-day-prep"
  },
  {
    query: "ls swap parts list",
    intent: "informational",
    topPage: "/blogs/builds/ls-swap-guide"
  },
  {
    query: "hot rod interior kits",
    intent: "transactional",
    topPage: "/collections/interior"
  },
  {
    query: "ceramic coating vs powder coat",
    intent: "informational",
    topPage: "/blogs/tech/ceramic-vs-powder"
  },
  {
    query: "custom chassis services",
    intent: "navigational",
    topPage: "/pages/build-program"
  }
];
const pageBlueprints = [
  {
    url: "https://hotrodan.com/collections/turbo-kit",
    title: "Turbo kits",
    canonicalStatus: "issue",
    canonicalIssue: "Duplicate canonical tag detected"
  },
  {
    url: "https://hotrodan.com/products/ls-stage-3-kit",
    title: "LS Stage 3 kit",
    canonicalStatus: "ok"
  },
  {
    url: "https://hotrodan.com/blogs/tech/heat-management",
    title: "Heat management guide",
    canonicalStatus: "ok"
  },
  {
    url: "https://hotrodan.com/pages/build-program",
    title: "Custom build program",
    canonicalStatus: "issue",
    canonicalIssue: "Canonical points to archived landing page"
  },
  {
    url: "https://hotrodan.com/collections/interior",
    title: "Interior upgrades",
    canonicalStatus: "ok"
  }
];
const actionBlueprints = [
  {
    id: "seo-action-0",
    title: "Compress hero imagery on turbo kits",
    description: "Largest Contentful Paint is elevated on mobile—ship next-gen image formats and lazy-load below the fold assets.",
    priority: "now",
    source: "ga4",
    metricLabel: "LCP",
    metricValue: "4.8s",
    defaultAssignee: "Performance squad"
  },
  {
    id: "seo-action-1",
    title: "Resolve duplicate canonical on build program",
    description: "Canonical tag references retired landing page causing indexation gaps.",
    priority: "now",
    source: "gsc",
    metricLabel: "Pages affected",
    metricValue: "6",
    defaultAssignee: "Platform team"
  },
  {
    id: "seo-action-2",
    title: "Refresh LS swap content pillar",
    description: "Monthly searches are up 18%. Expand FAQ and add internal links to conversion paths.",
    priority: "soon",
    source: "gsc",
    metricLabel: "Avg position",
    metricValue: "12.4",
    defaultAssignee: "Content ops"
  },
  {
    id: "seo-action-3",
    title: "Add Bing sitemap ping",
    description: "Bing is lagging on new product updates—schedule sitemap ping after product drops.",
    priority: "soon",
    source: "bing",
    metricLabel: "Indexation",
    metricValue: "+3d",
    defaultAssignee: "Growth automation"
  },
  {
    id: "seo-action-4",
    title: "Expand interior kit schema",
    description: "Missing structured data prevents rich results; add `Product` + `AggregateOffer` schema.",
    priority: "later",
    source: "gsc",
    metricLabel: "CTR uplift",
    metricValue: "+0.8%",
    defaultAssignee: "Tech SEO"
  }
];
const buildKeywordRows = (faker, scenario) => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }
  return keywordBlueprints.map((blueprint, index2) => {
    const impressions = faker.number.int({ min: 3200, max: 24e3 });
    const ctr = roundTo$1(
      faker.number.float({ min: 1.6, max: 6.8, multipleOf: 0.01 }),
      2
    );
    const clicks = Math.round(ctr / 100 * impressions);
    const basePosition = faker.number.float({
      min: 2.2,
      max: 18.4,
      multipleOf: 0.1
    });
    const deltaSeed = roundTo$1(
      faker.number.float({ min: -3.6, max: 5.4, multipleOf: 0.1 }),
      1
    );
    const delta = scenario === "warning" && index2 < 3 ? -Math.abs(deltaSeed) : deltaSeed;
    let avgPosition = basePosition;
    if (delta > 0) {
      avgPosition = Math.max(1, basePosition - delta);
    } else if (delta < 0) {
      avgPosition = basePosition + Math.abs(delta);
    }
    return {
      id: `keyword-${index2}`,
      query: blueprint.query,
      clicks,
      impressions,
      ctr,
      avgPosition: roundTo$1(avgPosition, 1),
      delta,
      topPage: blueprint.topPage,
      intent: blueprint.intent,
      source: "gsc"
    };
  });
};
const buildPageRows = (faker, scenario) => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }
  return pageBlueprints.map((blueprint, index2) => {
    const entrances = faker.number.int({ min: 180, max: 5200 });
    const exitRate = faker.number.float({ min: 0.18, max: 0.52, multipleOf: 0.01 });
    const exits = Math.round(entrances * exitRate);
    const conversionRate = roundTo$1(
      faker.number.float({ min: 0.6, max: 3.8, multipleOf: 0.01 }),
      2
    );
    const canonicalStatus = scenario === "warning" && index2 < 2 ? "issue" : blueprint.canonicalStatus;
    const canonicalIssue = canonicalStatus === "issue" ? blueprint.canonicalIssue ?? "Canonical points to out-of-stock variant" : void 0;
    return {
      id: `page-${index2}`,
      url: blueprint.url,
      title: blueprint.title,
      entrances,
      exits,
      conversionRate,
      canonicalStatus,
      canonicalIssue,
      source: "ga4"
    };
  });
};
const buildActions = (faker, scenario) => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }
  return actionBlueprints.map((blueprint, index2) => {
    const priority = blueprint.priority;
    let status = "not_started";
    if (priority === "now") {
      status = index2 === 0 ? "in_progress" : "not_started";
    }
    if (scenario === "warning" && priority === "later") {
      status = "done";
    }
    const assignedTo = scenario === "warning" && priority === "now" ? `${blueprint.defaultAssignee} (escalated)` : blueprint.defaultAssignee;
    const lastUpdatedAt = faker.date.recent({ days: 7 }).toISOString();
    const dueWindow = priority === "later" ? 21 : priority === "soon" ? 10 : 4;
    const dueAt = faker.date.soon({ days: dueWindow }).toISOString();
    return {
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      priority,
      status,
      assignedTo,
      source: blueprint.source,
      metricLabel: blueprint.metricLabel,
      metricValue: blueprint.metricValue,
      dueAt,
      lastUpdatedAt
    };
  });
};
const buildTrafficPoints = (faker, scenario, rangeStart, rangeEnd) => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }
  const end = new Date(rangeEnd);
  const start = new Date(rangeStart);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24))
  );
  const sampleSize = Math.min(30, totalDays);
  const points = [];
  for (let index2 = sampleSize - 1; index2 >= 0; index2 -= 1) {
    const pointDate = new Date(end);
    pointDate.setDate(end.getDate() - (sampleSize - 1 - index2));
    const impressions = faker.number.int({ min: 3200, max: 14200 });
    const ctr = roundTo$1(
      faker.number.float({ min: 2.1, max: 5.7, multipleOf: 0.01 }),
      2
    );
    const clicks = Math.round(ctr / 100 * impressions);
    points.push({
      date: pointDate.toISOString(),
      impressions,
      clicks,
      ctr
    });
  }
  if (scenario === "warning") {
    return points.map((point, index2) => {
      if (index2 < points.length - 3) {
        return point;
      }
      const factor = 0.82;
      const impressions = Math.round(point.impressions * factor);
      const clicks = Math.round(point.clicks * factor);
      const ctr = impressions === 0 ? 0 : roundTo$1(clicks / impressions * 100, 2);
      return {
        ...point,
        impressions,
        clicks,
        ctr
      };
    });
  }
  return points;
};
const buildBaseSeo = ({ scenario, seed }) => {
  const faker = createScenarioFaker$1(scenario, seed);
  const range = createDateRange(30, DEFAULT_RANGE_END, "Last 30 days");
  const insights = insightTemplates.map((template, index2) => {
    const severity = "info";
    const detectedAt = faker.date.recent({ days: 10 }).toISOString();
    const metricValue = index2 % 2 === 0 ? `${roundTo$1(
      faker.number.float({ min: 3.2, max: 4.8, multipleOf: 0.01 }),
      2
    )}s` : `${faker.number.int({ min: 1, max: 12 })}`;
    return {
      id: `seo-${index2}`,
      severity,
      metricValue,
      delta: index2 % 2 === 0 ? `${roundTo$1(
        faker.number.float({
          min: -0.8,
          max: 0.4,
          multipleOf: 0.01
        }),
        2
      )}s` : `${faker.number.int({ min: -6, max: 6 })}`,
      url: faker.internet.url(),
      detectedAt,
      ...template
    };
  });
  const keywords = buildKeywordRows(faker, scenario);
  const pages = buildPageRows(faker, scenario);
  const actions = buildActions(faker, scenario);
  const traffic = buildTrafficPoints(faker, scenario, range.start, range.end);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    range,
    scorecard: {
      coreWebVitals: roundTo$1(
        faker.number.float({ min: 68, max: 92, multipleOf: 0.1 }),
        1
      ),
      clickThroughRate: roundTo$1(
        faker.number.float({ min: 2.5, max: 4.2, multipleOf: 0.1 }),
        1
      ),
      crawlSuccessRate: roundTo$1(
        faker.number.float({ min: 80, max: 97, multipleOf: 0.1 }),
        1
      ),
      keywordRankings: roundTo$1(
        faker.number.float({ min: 70, max: 95, multipleOf: 0.1 }),
        1
      )
    },
    insights,
    keywords,
    pages,
    actions,
    traffic
  };
};
const buildEmptySeo = ({ scenario }) => ({
  scenario,
  state: "empty",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  scorecard: {
    coreWebVitals: 0,
    clickThroughRate: 0,
    crawlSuccessRate: 0,
    keywordRankings: 0
  },
  insights: [],
  keywords: [],
  pages: [],
  actions: [],
  traffic: [],
  alert: "No SEO integrations connected yet."
});
const buildWarningSeo = (context) => {
  const dataset = buildBaseSeo(context);
  dataset.state = "warning";
  dataset.insights = dataset.insights.map((insight, index2) => ({
    ...insight,
    severity: index2 % 2 === 0 ? "critical" : "warning"
  }));
  dataset.alert = "Core Web Vitals are degrading across mobile sessions.";
  dataset.scorecard.coreWebVitals = roundTo$1(
    Math.max(dataset.scorecard.coreWebVitals - 10, 40),
    1
  );
  dataset.scorecard.crawlSuccessRate = roundTo$1(
    Math.max(dataset.scorecard.crawlSuccessRate - 12, 50),
    1
  );
  return dataset;
};
const buildErrorSeo = ({ scenario }) => ({
  scenario,
  state: "error",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  scorecard: {
    coreWebVitals: 0,
    clickThroughRate: 0,
    crawlSuccessRate: 0,
    keywordRankings: 0
  },
  insights: [],
  keywords: [],
  pages: [],
  actions: [],
  traffic: [],
  error: "SEO analytics provider authentication failed."
});
const BUILDERS = {
  base: buildBaseSeo,
  empty: buildEmptySeo,
  warning: buildWarningSeo,
  error: buildErrorSeo
};
const getSeoScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  return BUILDERS[scenario]({ scenario, seed });
};
const getSeoCollections = (options = {}) => {
  const dataset = getSeoScenario(options);
  return {
    keywords: dataset.keywords,
    pages: dataset.pages,
    actions: dataset.actions,
    traffic: dataset.traffic
  };
};
const buildDashboardMocks = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  return {
    sales: getSalesScenario({ scenario, seed }),
    orders: getOrdersScenario({ scenario, seed }),
    inbox: getInboxScenario({ scenario, seed }),
    inventory: getInventoryScenario({ scenario, seed }),
    kpis: getKpiScenario({ scenario, seed }),
    seo: getSeoScenario({ scenario, seed }),
    settings: getMockSettings()
  };
};
const scenarioFromRequest$1 = (request) => {
  const url = new URL(request.url);
  return scenarioFromSearchParams(url.searchParams);
};
const RANGE_CONFIG = {
  today: { deltaPeriod: "WoW" },
  "7d": { deltaPeriod: "WoW" },
  "14d": { deltaPeriod: "WoW" },
  "28d": { deltaPeriod: "MoM" },
  "90d": { deltaPeriod: "YoY" }
};
const scenarioMessages = {
  base: "Feature the Camaro Stage 3 kit to capitalize on search lift.",
  empty: "No dataset connected yet—enable integrations in settings.",
  warning: "Sales are lagging forecast. Target inventory velocity campaigns.",
  error: "Mock services offline. Retry after mock data refresh."
};
const toMetrics = (mocks, deltaPeriod) => {
  const sales = mocks.sales;
  const orders = mocks.orders.orders.items;
  const refundedTotal = orders.filter((order) => order.status === "refunded").reduce((total, order) => total + order.total.amount, 0);
  return [
    {
      id: "gmv",
      label: "GMV",
      value: sales.totals.currentTotal.formatted,
      delta: sales.totals.deltaPercentage,
      deltaPeriod
    },
    {
      id: "orders",
      label: "Orders",
      value: mocks.orders.orders.count.toLocaleString("en-US"),
      delta: sales.totals.deltaPercentage * 0.75,
      deltaPeriod
    },
    {
      id: "aov",
      label: "AOV",
      value: sales.totals.averageOrderValue.formatted,
      delta: sales.totals.deltaPercentage * 0.35,
      deltaPeriod
    },
    {
      id: "refunds",
      label: "Refunds",
      value: createMoney$1(refundedTotal).formatted,
      delta: -Math.abs(sales.totals.deltaPercentage * 0.25),
      deltaPeriod
    }
  ];
};
const toOrderBuckets = ({ orders }) => {
  const orderItems = orders.orders.items;
  const unfulfilled = orderItems.filter(
    (order) => order.fulfillmentStatus !== "fulfilled"
  ).length;
  const stalled = orderItems.filter(
    (order) => order.fulfillmentStatus === "partial"
  ).length;
  const issues = orderItems.filter(
    (order) => order.status === "refunded" || order.status === "cancelled"
  ).length;
  return [
    {
      id: "unfulfilled",
      label: "Open & Unfulfilled",
      count: unfulfilled,
      description: "Orders waiting on pick/pack",
      href: "/app/orders?tab=unfulfilled"
    },
    {
      id: "tracking",
      label: "Tracking issues",
      count: stalled,
      description: "No carrier movement in 48h",
      href: "/app/orders?tab=tracking"
    },
    {
      id: "issues",
      label: "Delivery issues",
      count: issues,
      description: "Customer reported problems",
      href: "/app/orders?tab=issues"
    }
  ];
};
const toInboxSnapshot = ({ inbox }) => {
  const outstanding = inbox.tickets.filter((ticket) => ticket.status !== "sent").length;
  const breached = inbox.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvals = inbox.tickets.filter((ticket) => ticket.status === "needs_review").length;
  return {
    outstanding,
    overdueHours: breached * 3,
    approvalsPending: approvals
  };
};
const toInventorySnapshot = ({ inventory }) => {
  var _a2;
  const purchaseOrdersInFlight = inventory.vendors.reduce((total, vendor) => {
    return total + vendor.items.filter((item) => item.draftQuantity > 0).length;
  }, 0);
  const overstock = ((_a2 = inventory.buckets.find((bucket) => bucket.id === "overstock")) == null ? void 0 : _a2.skuCount) ?? 0;
  return {
    lowStock: inventory.summary.skusAtRisk,
    purchaseOrdersInFlight,
    overstock
  };
};
const toSeoHighlight = ({ seo }) => {
  const risingKeywordRows = seo.keywords.filter((keyword) => keyword.delta > 0);
  const risingQueries = risingKeywordRows.length;
  const risingPages = risingKeywordRows.reduce((pages, keyword) => {
    if (!keyword.topPage) {
      return pages;
    }
    pages.add(keyword.topPage);
    return pages;
  }, /* @__PURE__ */ new Set()).size;
  const criticalIssues = seo.insights.filter(
    (insight) => insight.severity === "critical"
  ).length;
  const summary = seo.alert ? seo.alert : seo.insights.slice(0, 2).map((insight) => insight.title).join(" · ") || "Search performance steady.";
  return {
    trafficDelta: seo.scorecard.clickThroughRate,
    risingQueries,
    risingPages,
    criticalIssues,
    summary
  };
};
const toSparkline = (sales) => {
  return sales.trend.map((point) => Number.parseFloat(point.total.amount.toFixed(2)));
};
const getDashboardOverview = async (range, scenario = "base") => {
  const normalizedRange = resolveDashboardRangeKey(range, DEFAULT_DASHBOARD_RANGE);
  const config = RANGE_CONFIG[normalizedRange] ?? RANGE_CONFIG[DEFAULT_DASHBOARD_RANGE];
  const mocks = buildDashboardMocks({ scenario });
  return {
    range: normalizedRange,
    rangeLabel: DASHBOARD_RANGE_PRESETS[normalizedRange].label,
    metrics: toMetrics(mocks, config.deltaPeriod),
    sparkline: toSparkline(mocks.sales),
    orders: toOrderBuckets(mocks),
    inbox: toInboxSnapshot(mocks),
    inventory: toInventorySnapshot(mocks),
    seo: toSeoHighlight(mocks),
    mcpRecommendation: scenarioMessages[scenario]
  };
};
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true";
const HOME_RANGE_KEYS$1 = DASHBOARD_RANGE_KEY_LIST.filter(
  (key) => key !== "14d"
);
const SALES_PERIOD_BY_RANGE$1 = {
  today: "7d",
  "7d": "7d",
  "14d": "14d",
  "28d": "28d",
  "90d": "90d"
};
const loader$c = async ({ request }) => {
  const url = new URL(request.url);
  const range = resolveDashboardRangeKey(url.searchParams.get("range"), DEFAULT_DASHBOARD_RANGE);
  const scenario = scenarioFromRequest$1(request);
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);
  const data = await getDashboardOverview(range, scenario);
  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let mcpSource;
  let mcpGeneratedAt;
  let mcpOverrides;
  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }
    const response = await getMcpProductRecommendations(
      {
        shopDomain,
        params: { limit: 3, range }
      },
      toggles,
      mcpOverrides
    );
    const topRecommendation = response.data.at(0);
    if (topRecommendation) {
      data.mcpRecommendation = `${topRecommendation.title}: ${topRecommendation.rationale}`;
    }
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  } else {
    data.mcpRecommendation = "Enable the MCP integration in Settings to populate storefront insights.";
  }
  return json(
    {
      data,
      useMockData: USE_MOCK_DATA,
      scenario,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
        source: mcpSource,
        generatedAt: mcpGeneratedAt
      }
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
function DashboardRoute$1() {
  const { data, useMockData, scenario, mcp } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const salesPrefetcher = useFetcher();
  const prefetchedSalesHref = useRef(null);
  const activeRange = resolveDashboardRangeKey(
    searchParams.get("range"),
    data.range ?? DEFAULT_DASHBOARD_RANGE
  );
  const navigationLocation = navigation.location;
  const isHomeNavigation = navigation.state !== "idle" && (navigationLocation == null ? void 0 : navigationLocation.pathname) === "/app";
  const showSkeleton = isHomeNavigation;
  const sharedLinkOptions = { searchParams };
  const salesHref = (() => {
    const base = withDashboardRangeParam("/app/sales", activeRange, sharedLinkOptions);
    const url = new URL(base, "https://dashboard.internal");
    url.searchParams.set("period", SALES_PERIOD_BY_RANGE$1[activeRange] ?? "28d");
    return `${url.pathname}${url.search}${url.hash}`;
  })();
  const handleSalesPrefetch = () => {
    if (!salesHref || prefetchedSalesHref.current === salesHref) {
      return;
    }
    prefetchedSalesHref.current = salesHref;
    salesPrefetcher.load(salesHref);
  };
  const handleRangeSelect = (value) => {
    const params = new URLSearchParams(searchParams);
    params.set("range", value);
    navigate(`?${params.toString()}`, { replace: true });
  };
  const sparklineData = data.sparkline.map((value, index2) => ({
    key: index2,
    value
  }));
  const rangeLabel = data.rangeLabel ?? DASHBOARD_RANGE_PRESETS[activeRange].label;
  const metricCount = data.metrics.length || 4;
  const metricsContent = showSkeleton ? Array.from({ length: metricCount }, (_, index2) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(MetricTileSkeleton$1, {}) }, `metric-skeleton-${index2}`)) : data.metrics.map((metric) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: metric.label }),
    /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: metric.value }),
    /* @__PURE__ */ jsx(Badge, { tone: metric.delta >= 0 ? "success" : "critical", children: `${formatDelta$2(metric.delta)} ${metric.deltaPeriod}` })
  ] }) }, metric.id));
  return /* @__PURE__ */ jsx(PolarisVizProvider, { children: /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(
      TitleBar,
      {
        title: "Operations dashboard"
      }
    ),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
      useMockData && /* @__PURE__ */ jsx(
        Banner,
        {
          title: `Mock data scenario: ${scenario}`,
          tone: scenario === "warning" ? "warning" : "info",
          children: /* @__PURE__ */ jsx("p", { children: "Change the `mockState` query parameter (base, empty, warning, error) to preview different UI permutations." })
        }
      ),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingLg", children: "Sales overview" }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "plain",
                url: salesHref,
                onMouseEnter: handleSalesPrefetch,
                onFocus: handleSalesPrefetch,
                onTouchStart: handleSalesPrefetch,
                children: "View sales"
              }
            ),
            /* @__PURE__ */ jsx(ButtonGroup, { children: HOME_RANGE_KEYS$1.map((option) => /* @__PURE__ */ jsx(
              Button,
              {
                pressed: activeRange === option,
                onClick: () => handleRangeSelect(option),
                children: option.toUpperCase()
              },
              option
            )) }),
            /* @__PURE__ */ jsx(Text, { as: "span", tone: "subdued", variant: "bodySm", children: rangeLabel })
          ] })
        ] }),
        /* @__PURE__ */ jsx(InlineGrid, { columns: { xs: 1, sm: 2, lg: 4 }, gap: "300", children: metricsContent }),
        showSkeleton ? /* @__PURE__ */ jsx(SalesSparklineSkeleton$1, {}) : /* @__PURE__ */ jsx(
          SalesSparkline$1,
          {
            points: sparklineData,
            rangeLabel
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Orders attention", children: /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: showSkeleton ? Array.from({ length: data.orders.length || 3 }, (_, index2) => /* @__PURE__ */ jsx(OrderBucketSkeleton$1, {}, `order-skeleton-${index2}`)) : data.orders.map((bucket) => /* @__PURE__ */ jsxs(
          InlineStack,
          {
            align: "space-between",
            blockAlign: "center",
            children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingMd", children: bucket.label }),
                /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: bucket.description })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: bucket.count }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    url: withDashboardRangeParam(
                      bucket.href,
                      activeRange,
                      sharedLinkOptions
                    ),
                    accessibilityLabel: `View ${bucket.label}`,
                    children: "Open"
                  }
                )
              ] })
            ]
          },
          bucket.id
        )) }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Inbox", children: showSkeleton ? /* @__PURE__ */ jsx(InboxSnapshotSkeleton$1, {}) : /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Outstanding" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.inbox.outstanding })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Overdue >12h" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.inbox.overdueHours })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "AI approvals pending" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.inbox.approvalsPending })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              url: withDashboardRangeParam("/app/inbox", activeRange, sharedLinkOptions),
              tone: "primary",
              variant: "plain",
              children: "Go to inbox"
            }
          )
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Inventory snapshot", children: showSkeleton ? /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(InlineStack, { gap: "400", children: Array.from({ length: 3 }, (_, index2) => /* @__PURE__ */ jsx(MetricTileSkeleton$1, {}, `inventory-skeleton-${index2}`)) }),
        /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(InlineStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(MetricTile$2, { label: "Low stock", value: data.inventory.lowStock }),
          /* @__PURE__ */ jsx(
            MetricTile$2,
            {
              label: "POs in flight",
              value: data.inventory.purchaseOrdersInFlight
            }
          ),
          /* @__PURE__ */ jsx(MetricTile$2, { label: "Overstock", value: data.inventory.overstock })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            url: withDashboardRangeParam("/app/inventory", activeRange, sharedLinkOptions),
            accessibilityLabel: "View inventory planner",
            children: "Open inventory planner"
          }
        )
      ] }) }) }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "SEO highlights", children: showSkeleton ? /* @__PURE__ */ jsx(SeoHighlightsSkeleton$1, {}) : /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", children: "Traffic Δ" }),
          /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
            "+",
            data.seo.trafficDelta,
            "%"
          ] }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: data.seo.summary }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Rising queries" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.seo.risingQueries })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Rising pages" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.seo.risingPages })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Critical issues" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", tone: "critical", as: "span", children: data.seo.criticalIssues })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              url: withDashboardRangeParam("/app/seo", activeRange, sharedLinkOptions),
              variant: "plain",
              children: "Dive into SEO"
            }
          )
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "MCP insight", children: showSkeleton ? /* @__PURE__ */ jsx(McpInsightSkeleton$1, {}) : /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: data.mcpRecommendation }),
          !mcp.enabled && /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Configure credentials and enable the MCP toggle in Settings to load live data." }),
          mcp.usingMocks && /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Showing mock data while `USE_MOCK_DATA` is enabled." }),
          mcp.generatedAt && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
            "Last updated ",
            new Date(mcp.generatedAt).toLocaleString(),
            " • ",
            mcp.source ?? "mock"
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              url: withDashboardRangeParam("/app/settings", activeRange, sharedLinkOptions),
              variant: "plain",
              children: "Manage MCP toggles"
            }
          )
        ] }) }) })
      ] })
    ] })
  ] }) });
}
function MetricTile$2({ label: label2, value }) {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: label2 }),
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: value })
  ] });
}
function MetricTileSkeleton$1() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function OrderBucketSkeleton$1() {
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", gap: "200", children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
      /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" }),
      /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 })
    ] }) }),
    /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
      /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" }),
      /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
    ] })
  ] });
}
function InlineStatSkeleton$1() {
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", gap: "200", children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }) }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function InboxSnapshotSkeleton$1() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
    /* @__PURE__ */ jsx(InlineStatSkeleton$1, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton$1, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton$1, {}),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function SeoHighlightsSkeleton$1() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" }),
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 2 }),
    /* @__PURE__ */ jsx(InlineStatSkeleton$1, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton$1, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton$1, {}),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function McpInsightSkeleton$1() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 2 }),
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
const formatDelta$2 = (delta) => `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
function SalesSparkline$1({
  points,
  rangeLabel
}) {
  if (!points.length) {
    return /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Sales trend data unavailable." });
  }
  const dataset = [{
    name: "Sales",
    data: points
  }];
  return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 160 }, children: /* @__PURE__ */ jsx(
    SparkLineChart,
    {
      accessibilityLabel: `Sales trend for the selected range ${rangeLabel}`,
      data: dataset,
      isAnimated: false
    }
  ) });
}
function SalesSparklineSkeleton$1() {
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        width: "100%",
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsx(SkeletonThumbnail, { size: "extraLarge" })
    }
  );
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: DashboardRoute$1,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
const loader$b = async ({ request }) => {
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
  }
  const actions = [
    {
      id: "action-1",
      agent: "rag_ingest",
      action: "read",
      description: "Query inventory data for reorder analysis",
      riskLevel: "low",
      confidence: 0.95,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      autoApprovable: true
    },
    {
      id: "action-2",
      agent: "dashboard_orders",
      action: "write",
      description: "Update order status in database",
      riskLevel: "medium",
      confidence: 0.85,
      timestamp: new Date(Date.now() - 3e5).toISOString(),
      status: "pending",
      autoApprovable: false,
      batchId: "batch-1"
    },
    {
      id: "action-3",
      agent: "program_manager",
      action: "query",
      description: "Generate project status report",
      riskLevel: "low",
      confidence: 0.98,
      timestamp: new Date(Date.now() - 6e5).toISOString(),
      status: "pending",
      autoApprovable: true
    }
  ];
  return json(
    {
      actions,
      autoApprovalEnabled: true,
      batchMode: true
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$9 = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "approve") {
    const actionIds = formData.getAll("actionIds");
    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }
    return json({
      success: true,
      message: `Approved ${actionIds.length} action(s)`,
      approvedIds: actionIds
    });
  }
  if (intent === "reject") {
    const actionId = formData.get("actionId");
    const reason = formData.get("reason");
    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }
    return json({
      success: true,
      message: `Rejected action ${actionId}`,
      reason
    });
  }
  if (intent === "auto-approve-all") {
    const riskThreshold = formData.get("riskThreshold");
    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }
    return json({
      success: true,
      message: `Auto-approved all actions below ${riskThreshold} risk threshold`
    });
  }
  return json({ success: false, message: "Unknown action" }, { status: 400 });
};
function AgentApprovalsRoute() {
  const { actions, autoApprovalEnabled } = useLoaderData();
  useFetcher();
  const [selectedActions] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingActionId, setRejectingActionId] = useState(null);
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(actions);
  const pendingActions = actions.filter((action2) => action2.status === "pending");
  pendingActions.filter((action2) => action2.autoApprovable);
  pendingActions.filter((action2) => !action2.autoApprovable);
  const key = action$9.batchId || action$9.id;
  if (!groups[key]) {
    groups[key] = [];
  }
  groups[key].push(action$9);
  return groups;
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9,
  default: AgentApprovalsRoute,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const createVendorMapping = (faker, index2) => {
  const id = `vendor-${index2 + 1}`;
  const name = faker.company.name();
  const email = faker.internet.email();
  const phone = faker.phone.number();
  const leadTimeDays = faker.number.int({ min: 7, max: 60 });
  const minimumOrderValue = createMoney(
    faker.number.float({ min: 100, max: 5e3, multipleOf: 50 })
  );
  const paymentTerms = faker.helpers.arrayElement([
    "Net 30",
    "Net 15",
    "Net 45",
    "2/10 Net 30",
    "COD"
  ]);
  const notes = faker.lorem.sentence();
  const isActive = faker.datatype.boolean(0.8);
  const createdAt = faker.date.past({ years: 2 }).toISOString();
  const updatedAt = faker.date.recent({ days: 30 }).toISOString();
  return {
    id,
    name,
    email,
    phone,
    leadTimeDays,
    minimumOrderValue,
    paymentTerms,
    notes,
    isActive,
    createdAt,
    updatedAt
  };
};
const createVendorSkuMapping = (faker, vendorId, skuIndex) => {
  const id = `mapping-${vendorId}-${skuIndex}`;
  const productId = `product-${skuIndex}`;
  const sku = faker.string.alphanumeric({ length: 8 }).toUpperCase();
  const vendorSku = faker.string.alphanumeric({ length: 10 }).toUpperCase();
  const vendorPrice = createMoney(
    faker.number.float({ min: 5, max: 200, multipleOf: 0.01 })
  );
  const isPrimary = faker.datatype.boolean(0.3);
  const createdAt = faker.date.past({ years: 1 }).toISOString();
  const updatedAt = faker.date.recent({ days: 7 }).toISOString();
  return {
    id,
    vendorId,
    productId,
    sku,
    vendorSku,
    vendorPrice,
    isPrimary,
    createdAt,
    updatedAt
  };
};
const buildVendorMappings = (faker, vendorCount, skuCount) => {
  const vendors = Array.from(
    { length: vendorCount },
    (_, index2) => createVendorMapping(faker, index2)
  );
  const skuMappings = [];
  vendors.forEach((vendor) => {
    const mappingsPerVendor = faker.number.int({ min: 2, max: Math.min(skuCount, 8) });
    for (let i = 0; i < mappingsPerVendor; i++) {
      skuMappings.push(createVendorSkuMapping(faker, vendor.id, i));
    }
  });
  return { vendors, skuMappings };
};
const buildBaseVendorMapping = ({
  scenario,
  seed,
  vendorCount,
  skuCount
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const { vendors, skuMappings } = buildVendorMappings(faker, vendorCount, skuCount);
  return {
    scenario,
    state: "ok",
    vendors,
    skuMappings
  };
};
const buildEmptyVendorMapping = ({
  scenario
}) => ({
  scenario,
  state: "empty",
  vendors: [],
  skuMappings: [],
  alert: "No vendor mappings found. Add vendors and SKU mappings to begin."
});
const buildErrorVendorMapping = ({
  scenario
}) => ({
  scenario,
  state: "error",
  vendors: [],
  skuMappings: [],
  error: "Failed to load vendor mappings. Please try again."
});
const VENDOR_MAPPING_BUILDERS = {
  base: buildBaseVendorMapping,
  empty: buildEmptyVendorMapping,
  warning: buildBaseVendorMapping,
  error: buildErrorVendorMapping
};
const getVendorMappingScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const vendorCount = options.vendorCount ?? 5;
  const skuCount = options.skuCount ?? 20;
  return VENDOR_MAPPING_BUILDERS[scenario]({ scenario, seed, vendorCount, skuCount });
};
const createFastMoversDecile = (faker, decile, skuIds, minVelocity, maxVelocity) => {
  const skuCount = skuIds.length;
  const averageVelocity = (minVelocity + maxVelocity) / 2;
  const totalValue = createMoney(
    faker.number.float({ min: 1e3, max: 5e4, multipleOf: 100 })
  );
  return {
    decile,
    minVelocity,
    maxVelocity,
    skuCount,
    skuIds,
    totalValue,
    averageVelocity
  };
};
const buildFastMoversDeciles = (faker, skuCount) => {
  const deciles = [];
  const skusPerDecile = Math.ceil(skuCount / 10);
  for (let i = 0; i < 10; i++) {
    const startIndex = i * skusPerDecile;
    const endIndex = Math.min(startIndex + skusPerDecile, skuCount);
    if (startIndex >= skuCount) break;
    const skuIds = Array.from({ length: endIndex - startIndex }, (_, j) => `sku-${startIndex + j + 1}`);
    const minVelocity = Math.max(100 - i * 10, 10);
    const maxVelocity = Math.max(110 - i * 10, 20);
    deciles.push(createFastMoversDecile(faker, i + 1, skuIds, minVelocity, maxVelocity));
  }
  return deciles;
};
const buildFastMoversPayload = ({
  scenario,
  seed,
  skuCount
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const deciles = buildFastMoversDeciles(faker, skuCount);
  const skus = deciles.flatMap(
    (decile) => decile.skuIds.map((skuId, index2) => ({
      id: skuId,
      title: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      sku: skuId,
      vendorId: `vendor-${index2 % 3 + 1}`,
      vendorName: faker.company.name(),
      status: "healthy",
      bucketId: "sea",
      onHand: faker.number.int({ min: 50, max: 500 }),
      inbound: faker.number.int({ min: 0, max: 100 }),
      committed: faker.number.int({ min: 0, max: 50 }),
      coverDays: faker.number.int({ min: 7, max: 30 }),
      safetyStock: faker.number.int({ min: 10, max: 50 }),
      reorderPoint: faker.number.int({ min: 50, max: 200 }),
      recommendedOrder: faker.number.int({ min: 0, max: 100 }),
      stockoutDate: faker.date.future({ days: 30 }).toISOString(),
      unitCost: createMoney(faker.number.float({ min: 10, max: 100 })),
      velocity: {
        turnoverDays: faker.number.int({ min: 7, max: 30 }),
        sellThroughRate: faker.number.float({ min: 0.1, max: 0.9 }),
        lastWeekUnits: faker.number.int({ min: 10, max: 200 })
      },
      trend: Array.from({ length: 6 }, (_, i) => ({
        label: `W-${6 - i}`,
        units: faker.number.int({ min: 5, max: 50 })
      }))
    }))
  );
  return {
    scenario,
    state: "ok",
    deciles,
    skus
  };
};
const buildEmptyFastMovers = ({
  scenario
}) => ({
  scenario,
  state: "empty",
  deciles: [],
  skus: [],
  alert: "No SKU velocity data available. Sync inventory to populate Fast Movers analysis."
});
const buildErrorFastMovers = ({
  scenario
}) => ({
  scenario,
  state: "error",
  deciles: [],
  skus: [],
  error: "Failed to load Fast Movers data. Please try again."
});
const FAST_MOVERS_BUILDERS = {
  base: buildFastMoversPayload,
  empty: buildEmptyFastMovers,
  warning: buildFastMoversPayload,
  error: buildErrorFastMovers
};
const getFastMoversScenario = (options = {}) => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const skuCount = options.skuCount ?? 50;
  return FAST_MOVERS_BUILDERS[scenario]({ scenario, seed, vendorCount: 0, skuCount });
};
function scenarioFromRequest(request) {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("mockState");
  return scenario || "normal";
}
const formatCurrency$2 = (amount, currency) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(amount);
const formatDate$3 = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
}).format(new Date(value));
const loader$a = async ({ request }) => {
  new URL(request.url);
  const scenario = scenarioFromRequest(request);
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    session.shop;
  }
  const payload = getVendorMappingScenario({ scenario });
  return json(
    {
      payload,
      scenario,
      useMockData: USE_MOCK_DATA
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$8 = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "create-vendor") {
    const name = formData.get("name");
    const email = formData.get("email");
    const leadTimeDays = formData.get("leadTimeDays");
    if (!name || !email || !leadTimeDays) {
      return json({ success: false, message: "Missing required fields" }, { status: 400 });
    }
    return json({
      success: true,
      message: `Vendor ${name} created successfully`
    });
  }
  if (intent === "update-vendor") {
    const vendorId = formData.get("vendorId");
    const name = formData.get("name");
    const email = formData.get("email");
    if (!vendorId || !name || !email) {
      return json({ success: false, message: "Missing required fields" }, { status: 400 });
    }
    return json({
      success: true,
      message: `Vendor ${name} updated successfully`
    });
  }
  if (intent === "delete-vendor") {
    const vendorId = formData.get("vendorId");
    if (!vendorId) {
      return json({ success: false, message: "Missing vendor ID" }, { status: 400 });
    }
    return json({
      success: true,
      message: "Vendor deleted successfully"
    });
  }
  return json({ success: false, message: "Unknown action" }, { status: 400 });
};
function VendorMappingRoute() {
  const { payload, useMockData, scenario } = useLoaderData();
  const [searchParams] = useSearchParams();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(payload.vendors);
  payload.vendors.map((vendor) => [
    vendor.name,
    vendor.email,
    vendor.leadTimeDays.toString(),
    formatCurrency$2(vendor.minimumOrderValue.amount, vendor.minimumOrderValue.currency),
    vendor.paymentTerms,
    /* @__PURE__ */ jsx(Badge, { tone: vendor.isActive ? "success" : "critical", children: vendor.isActive ? "Active" : "Inactive" }),
    formatDate$3(vendor.updatedAt)
  ]);
  const handleCreateVendor = () => {
    setIsCreateModalOpen(true);
  };
  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setIsEditModalOpen(true);
  };
  const handleDeleteVendor = (vendor) => {
    setSelectedVendor(vendor);
    setIsDeleteModalOpen(true);
  };
  const handleViewMappings = (vendor) => {
    setSelectedVendor(vendor);
  };
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Vendor Mapping",
      subtitle: "Manage vendor relationships and SKU mappings for inventory planning.",
      children: [
        /* @__PURE__ */ jsx(
          TitleBar,
          {
            title: "Vendor Mapping"
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (useMockData || payload.alert || payload.error) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            useMockData && /* @__PURE__ */ jsx(Banner, { tone: scenario === "warning" ? "warning" : "info", title: `Mock state: ${scenario}`, children: /* @__PURE__ */ jsx("p", { children: "Append `?mockState=warning` (etc) to explore alternate datasets." }) }),
            payload.alert && !payload.error && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Vendor mapping alert", children: /* @__PURE__ */ jsx("p", { children: payload.alert }) }),
            payload.error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Vendor mapping unavailable", children: /* @__PURE__ */ jsx("p", { children: payload.error }) })
          ] }),
          /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(Text, { variant: "headingMd", as: "h2", children: [
                "Vendors (",
                payload.vendors.length,
                ")"
              ] }),
              /* @__PURE__ */ jsx(ButtonGroup, { children: /* @__PURE__ */ jsx(Button, { onClick: handleCreateVendor, children: "Add vendor" }) })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(Card, { children: payload.vendors.length === 0 ? /* @__PURE__ */ jsx(
              EmptyState,
              {
                heading: "No vendors found",
                action: {
                  content: "Add your first vendor",
                  onAction: handleCreateVendor
                },
                image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
                children: /* @__PURE__ */ jsx("p", { children: "Add vendors to start mapping SKUs and managing inventory relationships." })
              }
            ) : /* @__PURE__ */ jsx(
              IndexTable,
              {
                resourceName: { singular: "vendor", plural: "vendors" },
                itemCount: payload.vendors.length,
                selectedItemsCount: allResourcesSelected ? "All" : selectedResources.length,
                onSelectionChange: handleSelectionChange,
                headings: [
                  { title: "Name" },
                  { title: "Email" },
                  { title: "Lead time (days)" },
                  { title: "Min order value" },
                  { title: "Payment terms" },
                  { title: "Status" },
                  { title: "Last updated" },
                  { title: "" }
                ],
                children: payload.vendors.map((vendor, index2) => /* @__PURE__ */ jsxs(
                  IndexTable.Row,
                  {
                    id: vendor.id,
                    position: index2,
                    selected: selectedResources.includes(vendor.id),
                    children: [
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                        /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: vendor.name }),
                        vendor.phone && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: vendor.phone })
                      ] }) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: vendor.email }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: vendor.leadTimeDays }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatCurrency$2(vendor.minimumOrderValue.amount, vendor.minimumOrderValue.currency) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: vendor.paymentTerms }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Badge, { tone: vendor.isActive ? "success" : "critical", children: vendor.isActive ? "Active" : "Inactive" }) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatDate$3(vendor.updatedAt) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(ButtonGroup, { children: [
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            size: "slim",
                            onClick: () => handleViewMappings(vendor),
                            children: "View mappings"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            size: "slim",
                            onClick: () => handleEditVendor(vendor),
                            children: "Edit"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            size: "slim",
                            tone: "critical",
                            onClick: () => handleDeleteVendor(vendor),
                            children: "Delete"
                          }
                        )
                      ] }) })
                    ]
                  },
                  vendor.id
                ))
              }
            ) })
          ] }) }) }),
          /* @__PURE__ */ jsxs(
            Modal,
            {
              open: isCreateModalOpen,
              onClose: () => setIsCreateModalOpen(false),
              title: "Add new vendor",
              children: [
                /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Vendor name",
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "Enter vendor name"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Email",
                      type: "email",
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "vendor@example.com"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Phone",
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "+1 (555) 123-4567"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Lead time (days)",
                      type: "number",
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "30"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Minimum order value",
                      type: "number",
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "1000",
                      prefix: "$"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Payment terms",
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "Net 30"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Notes",
                      multiline: true,
                      value: "",
                      onChange: () => {
                      },
                      placeholder: "Additional notes about this vendor"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "end", gap: "200", children: [
                  /* @__PURE__ */ jsx(Button, { onClick: () => setIsCreateModalOpen(false), children: "Cancel" }),
                  /* @__PURE__ */ jsx(Button, { primary: true, children: "Create vendor" })
                ] }) })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            Modal,
            {
              open: isEditModalOpen,
              onClose: () => setIsEditModalOpen(false),
              title: `Edit ${selectedVendor == null ? void 0 : selectedVendor.name}`,
              children: [
                selectedVendor && /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Vendor name",
                      value: selectedVendor.name,
                      onChange: () => {
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Email",
                      type: "email",
                      value: selectedVendor.email,
                      onChange: () => {
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Phone",
                      value: selectedVendor.phone || "",
                      onChange: () => {
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Lead time (days)",
                      type: "number",
                      value: selectedVendor.leadTimeDays.toString(),
                      onChange: () => {
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Minimum order value",
                      type: "number",
                      value: selectedVendor.minimumOrderValue.amount.toString(),
                      onChange: () => {
                      },
                      prefix: "$"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Payment terms",
                      value: selectedVendor.paymentTerms,
                      onChange: () => {
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Notes",
                      multiline: true,
                      value: selectedVendor.notes || "",
                      onChange: () => {
                      }
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "end", gap: "200", children: [
                  /* @__PURE__ */ jsx(Button, { onClick: () => setIsEditModalOpen(false), children: "Cancel" }),
                  /* @__PURE__ */ jsx(Button, { primary: true, children: "Save changes" })
                ] }) })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            Modal,
            {
              open: isDeleteModalOpen,
              onClose: () => setIsDeleteModalOpen(false),
              title: `Delete ${selectedVendor == null ? void 0 : selectedVendor.name}`,
              children: [
                selectedVendor && /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(Text, { as: "p", children: [
                  "Are you sure you want to delete ",
                  selectedVendor.name,
                  "? This action cannot be undone."
                ] }) }),
                /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "end", gap: "200", children: [
                  /* @__PURE__ */ jsx(Button, { onClick: () => setIsDeleteModalOpen(false), children: "Cancel" }),
                  /* @__PURE__ */ jsx(Button, { tone: "critical", children: "Delete vendor" })
                ] }) })
              ]
            }
          )
        ] })
      ]
    }
  );
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: VendorMappingRoute,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const formatCurrency$1 = (amount, currency) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(amount);
const formatNumber$3 = (value) => new Intl.NumberFormat("en-US").format(Math.round(value));
const getDecileTone = (decile) => {
  if (decile <= 2) return "critical";
  if (decile <= 4) return "warning";
  if (decile <= 7) return "info";
  return "success";
};
const loader$9 = async ({ request }) => {
  new URL(request.url);
  const scenario = scenarioFromRequest(request);
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    session.shop;
  }
  const payload = getFastMoversScenario({ scenario });
  return json(
    {
      payload,
      scenario,
      useMockData: USE_MOCK_DATA
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$7 = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "export-csv") {
    const decile = formData.get("decile");
    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }
    const csv = `SKU,Title,Vendor,Velocity,Value
SKU-001,Product A,Vendor 1,150,1000
SKU-002,Product B,Vendor 2,120,800`;
    return json({
      success: true,
      message: `Fast Movers decile ${decile} exported successfully`,
      csv,
      filename: `fast-movers-decile-${decile}.csv`
    });
  }
  return json({ success: false, message: "Unknown action" }, { status: 400 });
};
function FastMoversRoute() {
  const { payload, useMockData, scenario } = useLoaderData();
  const [searchParams] = useSearchParams();
  const [selectedDecile, setSelectedDecile] = useState(null);
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(payload.skus);
  const decileChartData = useMemo(() => {
    if (payload.deciles.length === 0) return [];
    return [
      {
        name: "Velocity by Decile",
        data: payload.deciles.map((decile) => ({
          key: `Decile ${decile.decile}`,
          value: decile.averageVelocity
        }))
      }
    ];
  }, [payload.deciles]);
  const decileRows = payload.deciles.map((decile) => [
    `Decile ${decile.decile}`,
    formatNumber$3(decile.minVelocity),
    formatNumber$3(decile.maxVelocity),
    formatNumber$3(decile.averageVelocity),
    formatNumber$3(decile.skuCount),
    formatCurrency$1(decile.totalValue.amount, decile.totalValue.currency)
  ]);
  const filteredSkus = useMemo(() => {
    if (!selectedDecile) return payload.skus;
    return payload.skus.filter((sku) => selectedDecile.skuIds.includes(sku.id));
  }, [payload.skus, selectedDecile]);
  const handleDecileClick = (decile) => {
    setSelectedDecile(decile);
  };
  const handleExportDecile = (decile) => {
    console.log(`Exporting decile ${decile.decile}`);
  };
  return /* @__PURE__ */ jsx(PolarisVizProvider, { children: /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Fast Movers",
      subtitle: "Analyze SKU velocity patterns and identify high-performing inventory.",
      children: [
        /* @__PURE__ */ jsx(
          TitleBar,
          {
            title: "Fast Movers",
            primaryAction: { content: "Export all", url: "#" }
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (useMockData || payload.alert || payload.error) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            useMockData && /* @__PURE__ */ jsx(Banner, { tone: scenario === "warning" ? "warning" : "info", title: `Mock state: ${scenario}`, children: /* @__PURE__ */ jsx("p", { children: "Append `?mockState=warning` (etc) to explore alternate datasets." }) }),
            payload.alert && !payload.error && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Fast Movers alert", children: /* @__PURE__ */ jsx("p", { children: payload.alert }) }),
            payload.error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Fast Movers data unavailable", children: /* @__PURE__ */ jsx("p", { children: payload.error }) })
          ] }),
          /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Velocity Deciles" }) }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(Card.Section, { children: payload.deciles.length === 0 ? /* @__PURE__ */ jsx(
              EmptyState,
              {
                heading: "No velocity data available",
                image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
                children: /* @__PURE__ */ jsx("p", { children: "Sync inventory data to populate Fast Movers analysis." })
              }
            ) : /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              decileChartData.length > 0 && /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-subdued", borderRadius: "200", children: /* @__PURE__ */ jsx("div", { style: { height: 300 }, children: /* @__PURE__ */ jsx(
                BarChart,
                {
                  data: decileChartData,
                  isAnimated: false,
                  accessibilityLabel: "SKU velocity by decile",
                  yAxisOptions: {
                    labelFormatter: (value) => formatNumber$3(Number(value))
                  }
                }
              ) }) }),
              /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "numeric", "numeric", "numeric", "numeric", "text"],
                  headings: [
                    "Decile",
                    "Min velocity",
                    "Max velocity",
                    "Avg velocity",
                    "SKU count",
                    "Total value"
                  ],
                  rows: decileRows
                }
              ),
              /* @__PURE__ */ jsx(InlineStack, { gap: "200", wrap: true, children: payload.deciles.map((decile) => /* @__PURE__ */ jsx(
                Card,
                {
                  sectioned: true,
                  background: (selectedDecile == null ? void 0 : selectedDecile.decile) === decile.decile ? "bg-selected" : void 0,
                  children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                    /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                      /* @__PURE__ */ jsxs(Badge, { tone: getDecileTone(decile.decile), children: [
                        "Decile ",
                        decile.decile
                      ] }),
                      /* @__PURE__ */ jsx(
                        Button,
                        {
                          size: "slim",
                          onClick: () => handleExportDecile(decile),
                          children: "Export"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "Velocity range" }),
                      /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                        formatNumber$3(decile.minVelocity),
                        " - ",
                        formatNumber$3(decile.maxVelocity)
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "SKUs" }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: formatNumber$3(decile.skuCount) })
                    ] }),
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "Total value" }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: formatCurrency$1(decile.totalValue.amount, decile.totalValue.currency) })
                    ] }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        size: "slim",
                        onClick: () => handleDecileClick(decile),
                        pressed: (selectedDecile == null ? void 0 : selectedDecile.decile) === decile.decile,
                        children: (selectedDecile == null ? void 0 : selectedDecile.decile) === decile.decile ? "Selected" : "View SKUs"
                      }
                    )
                  ] })
                },
                decile.decile
              )) })
            ] }) })
          ] }) }) }),
          selectedDecile && /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(Text, { variant: "headingMd", as: "h2", children: [
                "SKUs in Decile ",
                selectedDecile.decile
              ] }),
              /* @__PURE__ */ jsx(Button, { onClick: () => setSelectedDecile(null), children: "Close" })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(Card.Section, { children: filteredSkus.length === 0 ? /* @__PURE__ */ jsx(
              EmptyState,
              {
                heading: "No SKUs in this decile",
                image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
                children: /* @__PURE__ */ jsx("p", { children: "This decile contains no SKUs." })
              }
            ) : /* @__PURE__ */ jsx(
              IndexTable,
              {
                resourceName: { singular: "SKU", plural: "SKUs" },
                itemCount: filteredSkus.length,
                selectedItemsCount: allResourcesSelected ? "All" : selectedResources.length,
                onSelectionChange: handleSelectionChange,
                headings: [
                  { title: "SKU" },
                  { title: "Title" },
                  { title: "Vendor" },
                  { title: "Velocity" },
                  { title: "On hand" },
                  { title: "Unit cost" },
                  { title: "Status" }
                ],
                children: filteredSkus.map((sku, index2) => /* @__PURE__ */ jsxs(
                  IndexTable.Row,
                  {
                    id: sku.id,
                    position: index2,
                    selected: selectedResources.includes(sku.id),
                    children: [
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: sku.sku }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: sku.title }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: sku.vendorName }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                        /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                          formatNumber$3(sku.velocity.lastWeekUnits),
                          " units"
                        ] }),
                        /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
                          sku.velocity.turnoverDays,
                          " days turnover"
                        ] })
                      ] }) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatNumber$3(sku.onHand) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatCurrency$1(sku.unitCost.amount, sku.unitCost.currency) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Badge, { tone: sku.status === "healthy" ? "success" : "warning", children: sku.status }) })
                    ]
                  },
                  sku.id
                ))
              }
            ) })
          ] }) }) })
        ] })
      ]
    }
  ) });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: FastMoversRoute,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
function AdditionalPage() {
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Additional page" }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
          "The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using",
          " ",
          /* @__PURE__ */ jsx(
            Link$1,
            {
              url: "https://shopify.dev/docs/apps/tools/app-bridge",
              target: "_blank",
              removeUnderline: true,
              children: "App Bridge"
            }
          ),
          "."
        ] }),
        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
          "To create your own page and have it show up in the app navigation, add a page inside ",
          /* @__PURE__ */ jsx(Code, { children: "app/routes" }),
          ", and a link to it in the ",
          /* @__PURE__ */ jsx(Code, { children: "<NavMenu>" }),
          " component found in ",
          /* @__PURE__ */ jsx(Code, { children: "app/routes/app.jsx" }),
          "."
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Resources" }),
        /* @__PURE__ */ jsx(List, { children: /* @__PURE__ */ jsx(List.Item, { children: /* @__PURE__ */ jsx(
          Link$1,
          {
            url: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav",
            target: "_blank",
            removeUnderline: true,
            children: "App nav best practices"
          }
        ) }) })
      ] }) }) })
    ] })
  ] });
}
function Code({ children }) {
  return /* @__PURE__ */ jsx(
    Box,
    {
      as: "span",
      padding: "025",
      paddingInlineStart: "100",
      paddingInlineEnd: "100",
      background: "bg-surface-active",
      borderWidth: "025",
      borderColor: "border",
      borderRadius: "100",
      children: /* @__PURE__ */ jsx("code", { children })
    }
  );
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdditionalPage
}, Symbol.toStringTag, { value: "Module" }));
const BUCKET_IDS = [
  "urgent",
  "air",
  "sea",
  "overstock"
];
const STATUS_TONE$1 = {
  healthy: "success",
  low: "warning",
  backorder: "critical",
  preorder: "info"
};
const MCP_RISK_TONE = {
  low: "success",
  medium: "warning",
  high: "critical"
};
const clampCount = (value, fallback = 18) => {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, 8), 48);
};
const isBucketId = (value) => {
  return typeof value === "string" && BUCKET_IDS.includes(value);
};
const formatDate$2 = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
}).format(new Date(value));
const formatNumber$2 = (value) => new Intl.NumberFormat("en-US").format(Math.round(value));
const formatCurrency = (amount, currency) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(amount);
const loader$8 = async ({ request }) => {
  var _a2;
  const url = new URL(request.url);
  const scenario = scenarioFromRequest$1(request);
  const count = clampCount(url.searchParams.get("count"));
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);
  const payload = getInventoryScenario({ scenario, count });
  const bucketParam = url.searchParams.get("bucket");
  const selectedBucket = isBucketId(bucketParam) ? bucketParam : ((_a2 = payload.buckets[0]) == null ? void 0 : _a2.id) ?? "urgent";
  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let mcpSignals = [];
  let mcpSource;
  let mcpGeneratedAt;
  let mcpOverrides;
  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }
    const response = await getMcpInventorySignals(
      {
        shopDomain,
        params: { limit: 5, bucket: selectedBucket }
      },
      toggles,
      mcpOverrides
    );
    mcpSignals = response.data;
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  }
  return json(
    {
      payload,
      scenario,
      useMockData: USE_MOCK_DATA,
      selectedBucket,
      count,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
        signals: mcpSignals,
        source: mcpSource,
        generatedAt: mcpGeneratedAt
      }
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$6 = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "save-draft") {
    const rawPayload = formData.get("payload");
    if (typeof rawPayload !== "string") {
      return json(
        { ok: false, message: "Missing draft payload" },
        { status: 400 }
      );
    }
    try {
      const parsed = JSON.parse(rawPayload);
      const submissions = Array.isArray(parsed.vendors) ? parsed.vendors : [parsed];
      const vendors = submissions.map((entry2) => entry2.vendorId).join(", ");
      return json(
        {
          ok: true,
          message: vendors ? `Draft saved for ${vendors}` : "Draft saved"
        },
        {
          headers: {
            "Cache-Control": "private, max-age=0, must-revalidate"
          }
        }
      );
    } catch (error) {
      console.error("Failed to parse draft payload", error);
      return json(
        { ok: false, message: "Invalid draft payload" },
        { status: 400 }
      );
    }
  }
  if (intent === "export-csv") {
    const scenario = scenarioFromRequest$1(request);
    const vendorId = formData.get("vendorId");
    const bucketId = formData.get("bucketId");
    const count = clampCount(formData.get("count"));
    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }
    const dataset = getInventoryScenario({ scenario, count });
    let filename = "inventory-export.csv";
    const rows = [];
    if (typeof vendorId === "string" && vendorId) {
      const vendor = dataset.vendors.find(
        (entry2) => entry2.vendorId === vendorId
      );
      filename = `inventory-${vendorId}.csv`;
      if (vendor) {
        vendor.items.forEach((item) => {
          rows.push([
            item.sku,
            item.title,
            vendor.vendorName,
            String(item.recommendedOrder),
            String(item.draftQuantity),
            formatCurrency(item.unitCost.amount, item.unitCost.currency)
          ]);
        });
      }
    } else if (isBucketId(bucketId)) {
      filename = `inventory-${bucketId}.csv`;
      dataset.skus.filter((sku) => sku.bucketId === bucketId).forEach((sku) => {
        rows.push([
          sku.sku,
          sku.title,
          sku.vendorName,
          String(sku.recommendedOrder),
          String(sku.recommendedOrder),
          formatCurrency(sku.unitCost.amount, sku.unitCost.currency)
        ]);
      });
    } else {
      dataset.skus.forEach((sku) => {
        rows.push([
          sku.sku,
          sku.title,
          sku.vendorName,
          String(sku.recommendedOrder),
          String(sku.recommendedOrder),
          formatCurrency(sku.unitCost.amount, sku.unitCost.currency)
        ]);
      });
    }
    const header = [
      "SKU",
      "Title",
      "Vendor",
      "Recommended",
      "Draft",
      "UnitCost"
    ];
    const csv = [header, ...rows].map((line) => line.join(",")).join("\n");
    return json(
      {
        ok: true,
        message: `CSV ready: ${filename}`,
        csv,
        filename
      },
      {
        headers: {
          "Cache-Control": "private, max-age=0, must-revalidate"
        }
      }
    );
  }
  return json(
    { ok: false, message: "Unknown action intent" },
    { status: 400 }
  );
};
function InventoryRoute() {
  var _a2, _b2;
  const { payload, useMockData, scenario, selectedBucket, count, mcp } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const saveFetcher = useFetcher();
  const exportFetcher = useFetcher();
  const [detailSku, setDetailSku] = useState(null);
  const activeBucket = useMemo(() => {
    const bucketParam = searchParams.get("bucket");
    if (isBucketId(bucketParam)) {
      return bucketParam;
    }
    return selectedBucket;
  }, [searchParams, selectedBucket]);
  useEffect(() => {
    var _a3;
    if ((_a3 = exportFetcher.data) == null ? void 0 : _a3.csv) {
      const blob = new Blob([exportFetcher.data.csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = exportFetcher.data.filename ?? "inventory-export.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    }
  }, [exportFetcher.data]);
  const [draftQuantities, setDraftQuantities] = useState(() => {
    const quantities = {};
    payload.vendors.forEach((vendor) => {
      vendor.items.forEach((item) => {
        quantities[item.skuId] = item.draftQuantity;
      });
    });
    return quantities;
  });
  const [vendorNotes, setVendorNotes] = useState(() => {
    const notes = {};
    payload.vendors.forEach((vendor) => {
      notes[vendor.vendorId] = vendor.notes ?? "";
    });
    return notes;
  });
  useEffect(() => {
    const nextQuantities = {};
    payload.vendors.forEach((vendor) => {
      vendor.items.forEach((item) => {
        nextQuantities[item.skuId] = item.draftQuantity;
      });
    });
    setDraftQuantities(nextQuantities);
    const nextNotes = {};
    payload.vendors.forEach((vendor) => {
      nextNotes[vendor.vendorId] = vendor.notes ?? "";
    });
    setVendorNotes(nextNotes);
  }, [payload.vendors]);
  const detailTrendDataset = useMemo(() => {
    var _a3;
    if (!((_a3 = detailSku == null ? void 0 : detailSku.trend) == null ? void 0 : _a3.length)) return [];
    return [
      {
        name: "Weekly units",
        data: detailSku.trend.map((point) => ({
          key: point.label,
          value: Number.isFinite(point.units) ? point.units : 0
        }))
      }
    ];
  }, [detailSku]);
  const detailTrendStats = useMemo(() => {
    if (!detailSku) return null;
    return calculateTrendStats(detailSku.trend);
  }, [detailSku]);
  const filteredSkus = useMemo(
    () => payload.skus.filter((sku) => sku.bucketId === activeBucket),
    [payload.skus, activeBucket]
  );
  const activeBucketMeta = useMemo(
    () => payload.buckets.find((bucket) => bucket.id === activeBucket) ?? null,
    [payload.buckets, activeBucket]
  );
  const bucketTrendPoints = useMemo(
    () => aggregateTrendSeries(filteredSkus.map((sku) => sku.trend)),
    [filteredSkus]
  );
  const bucketTrendDataset = useMemo(() => {
    if (bucketTrendPoints.length === 0) return [];
    return [
      {
        name: "Bucket weekly units",
        data: bucketTrendPoints.map((point, index2) => ({
          key: point.label || String(index2),
          value: Number.isFinite(point.units) ? point.units : 0
        }))
      }
    ];
  }, [bucketTrendPoints]);
  const bucketTrendStats = useMemo(
    () => calculateTrendStats(bucketTrendPoints),
    [bucketTrendPoints]
  );
  const bucketTabs = useMemo(
    () => payload.buckets.map((bucket) => ({
      id: bucket.id,
      content: bucket.label
    })),
    [payload.buckets]
  );
  const selectedTabIndex = Math.max(
    bucketTabs.findIndex((tab) => tab.id === activeBucket),
    0
  );
  const summaryCards = [
    {
      id: "skus-at-risk",
      label: "SKUs at risk",
      value: formatNumber$2(payload.summary.skusAtRisk),
      tone: "critical"
    },
    {
      id: "average-cover",
      label: "Average cover",
      value: `${formatNumber$2(payload.summary.averageCoverDays)} days`,
      tone: "info"
    },
    {
      id: "open-po",
      label: "Open PO budget",
      value: payload.summary.openPoBudget.formatted,
      tone: "success"
    }
  ];
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(filteredSkus);
  const handleTabChange = (index2) => {
    const bucket = payload.buckets[index2];
    if (!bucket) return;
    const params = new URLSearchParams(searchParams);
    params.set("bucket", bucket.id);
    navigate(`?${params.toString()}`, { replace: true });
  };
  const handleDraftChange = (skuId, value) => {
    const numeric = Number(value);
    setDraftQuantities((current) => ({
      ...current,
      [skuId]: Number.isFinite(numeric) ? Math.max(Math.round(numeric), 0) : 0
    }));
  };
  const handleSaveDraft = (vendorId) => {
    const vendor = payload.vendors.find((entry2) => entry2.vendorId === vendorId);
    if (!vendor) return;
    const submission = {
      vendorId,
      notes: vendorNotes[vendorId],
      items: vendor.items.map((item) => ({
        skuId: item.skuId,
        draftQuantity: draftQuantities[item.skuId] ?? item.draftQuantity ?? 0
      }))
    };
    saveFetcher.submit(
      {
        intent: "save-draft",
        payload: JSON.stringify(submission)
      },
      { method: "post" }
    );
  };
  const handleExportVendor = (vendorId) => {
    exportFetcher.submit(
      {
        intent: "export-csv",
        vendorId,
        count: String(count)
      },
      { method: "post" }
    );
  };
  const handleBucketExport = () => {
    exportFetcher.submit(
      {
        intent: "export-csv",
        bucketId: activeBucket,
        count: String(count)
      },
      { method: "post" }
    );
  };
  return /* @__PURE__ */ jsx(PolarisVizProvider, { children: /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Inventory",
      subtitle: "Demand planning cockpit for replenishment, expediting, and overstock mitigation.",
      children: [
        /* @__PURE__ */ jsx(
          TitleBar,
          {
            title: "Inventory"
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (useMockData || payload.alert || payload.error) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            useMockData && /* @__PURE__ */ jsx(Banner, { tone: scenario === "warning" ? "warning" : "info", title: `Mock state: ${scenario}`, children: /* @__PURE__ */ jsx("p", { children: "Append `?mockState=warning` (etc) to explore alternate datasets." }) }),
            payload.alert && !payload.error && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Inventory alert", children: /* @__PURE__ */ jsx("p", { children: payload.alert }) }),
            payload.error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Inventory data unavailable", children: /* @__PURE__ */ jsx("p", { children: payload.error }) })
          ] }),
          /* @__PURE__ */ jsx(InlineGrid, { columns: { xs: 1, md: 3 }, gap: "300", children: summaryCards.map((card) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: card.label }),
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "span", children: card.value })
          ] }) }) }, card.id)) }),
          /* @__PURE__ */ jsx(Card, { title: "MCP inventory signals", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            mcp.signals.map((signal) => /* @__PURE__ */ jsx(
              Box,
              {
                background: "bg-subdued",
                padding: "200",
                borderRadius: "200",
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "150", children: [
                  /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: signal.sku }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: signal.suggestedAction })
                    ] }),
                    /* @__PURE__ */ jsx(Badge, { tone: MCP_RISK_TONE[signal.riskLevel], children: signal.riskLevel.toUpperCase() })
                  ] }),
                  signal.demandSignals.length > 0 && /* @__PURE__ */ jsx(InlineStack, { gap: "200", wrap: true, children: signal.demandSignals.map((metric) => /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
                    metric.label,
                    ": ",
                    metric.value,
                    metric.unit ? `${metric.unit}` : ""
                  ] }, metric.label)) })
                ] })
              },
              signal.sku
            )),
            mcp.signals.length === 0 && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: mcp.enabled ? "No MCP inventory signals returned yet. Check back after the next sync." : "Enable the MCP integration in Settings to surface prioritized restock actions." }),
            mcp.generatedAt && /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "p", children: [
              "Last updated ",
              new Date(mcp.generatedAt).toLocaleString(),
              " • ",
              mcp.source ?? "mock"
            ] }),
            mcp.usingMocks && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: "Showing mock MCP data while `USE_MOCK_DATA` is enabled." })
          ] }) }),
          /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Tabs, { tabs: bucketTabs, selected: selectedTabIndex, onSelect: handleTabChange, fitted: true }),
              /* @__PURE__ */ jsx(Button, { onClick: handleBucketExport, loading: exportFetcher.state !== "idle" && ((_a2 = exportFetcher.formData) == null ? void 0 : _a2.get("bucketId")) === activeBucket, children: "Export bucket CSV" })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              (activeBucketMeta == null ? void 0 : activeBucketMeta.description) && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: activeBucketMeta.description }),
              filteredSkus.length === 0 ? /* @__PURE__ */ jsx(BlockStack, { gap: "200", align: "center", children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "No SKUs in this bucket yet." }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                bucketTrendDataset.length > 0 ? /* @__PURE__ */ jsx(
                  BucketTrendSummary,
                  {
                    bucketLabel: (activeBucketMeta == null ? void 0 : activeBucketMeta.label) ?? activeBucket,
                    dataset: bucketTrendDataset,
                    stats: bucketTrendStats
                  }
                ) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Demand trend data unavailable for this bucket." }),
                /* @__PURE__ */ jsx(
                  IndexTable,
                  {
                    resourceName: { singular: "SKU", plural: "SKUs" },
                    itemCount: filteredSkus.length,
                    selectedItemsCount: allResourcesSelected ? "All" : selectedResources.length,
                    onSelectionChange: handleSelectionChange,
                    headings: [
                      { title: "SKU" },
                      { title: "Vendor" },
                      { title: "On hand" },
                      { title: "Inbound" },
                      { title: "Committed" },
                      { title: "Cover (days)" },
                      { title: "Trend (6w)" },
                      { title: "Stockout" },
                      { title: "Recommended" },
                      { title: "" }
                    ],
                    children: filteredSkus.map((sku, index2) => /* @__PURE__ */ jsxs(
                      IndexTable.Row,
                      {
                        id: sku.id,
                        position: index2,
                        selected: selectedResources.includes(sku.id),
                        children: [
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: sku.title }),
                            /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: sku.sku })
                          ] }) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "span", children: sku.vendorName }) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatNumber$2(sku.onHand) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatNumber$2(sku.inbound) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatNumber$2(sku.committed) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatNumber$2(sku.coverDays) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(SkuTrendSparkline, { skuTitle: sku.title, trend: sku.trend }) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatDate$2(sku.stockoutDate) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: formatNumber$2(sku.recommendedOrder) }),
                          /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "end", gap: "200", children: [
                            /* @__PURE__ */ jsx(Badge, { tone: STATUS_TONE$1[sku.status], children: sku.status }),
                            /* @__PURE__ */ jsx(Button, { onClick: () => setDetailSku(sku), children: "View details" })
                          ] }) })
                        ]
                      },
                      sku.id
                    ))
                  }
                )
              ] })
            ] }) })
          ] }) }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Purchase order planner" }),
              ((_b2 = saveFetcher.data) == null ? void 0 : _b2.ok) && /* @__PURE__ */ jsx(Badge, { tone: "success", children: saveFetcher.data.message })
            ] }),
            payload.vendors.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "No vendor drafts available yet." }) }) }) : payload.vendors.map((vendor) => {
              var _a3, _b3;
              const totalDraftValue = vendor.items.reduce((total, item) => {
                const draftQty = draftQuantities[item.skuId] ?? item.draftQuantity;
                return total + draftQty * item.unitCost.amount;
              }, 0);
              return /* @__PURE__ */ jsxs(Card, { title: vendor.vendorName, children: [
                /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { gap: "400", children: [
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                    "Lead time: ",
                    vendor.leadTimeDays,
                    " days"
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                    "Budget: ",
                    vendor.budgetRemaining.formatted
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                    "Draft total: ",
                    formatCurrency(totalDraftValue, vendor.budgetRemaining.currency)
                  ] })
                ] }) }),
                /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: vendor.items.map((item) => /* @__PURE__ */ jsx(
                  Box,
                  {
                    background: "bg-subdued",
                    padding: "200",
                    borderRadius: "200",
                    children: /* @__PURE__ */ jsxs(BlockStack, { gap: "150", children: [
                      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                        /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: item.title }),
                          /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: item.sku })
                        ] }),
                        /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
                          "Reco: ",
                          formatNumber$2(item.recommendedOrder)
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "space-between", blockAlign: "center", children: [
                        /* @__PURE__ */ jsx(
                          TextField,
                          {
                            label: "Draft quantity",
                            labelHidden: true,
                            type: "number",
                            min: 0,
                            value: String(draftQuantities[item.skuId] ?? item.draftQuantity),
                            onChange: (value) => handleDraftChange(item.skuId, value)
                          }
                        ),
                        /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                          "Unit cost: ",
                          item.unitCost.formatted
                        ] }),
                        /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                          "Line total: ",
                          formatCurrency(
                            (draftQuantities[item.skuId] ?? item.draftQuantity) * item.unitCost.amount,
                            item.unitCost.currency
                          )
                        ] })
                      ] })
                    ] })
                  },
                  item.skuId
                )) }) }),
                /* @__PURE__ */ jsx(Card, { subdued: true, children: /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Planner notes",
                    multiline: true,
                    value: vendorNotes[vendor.vendorId],
                    onChange: (value) => setVendorNotes((current) => ({
                      ...current,
                      [vendor.vendorId]: value
                    }))
                  }
                ) }),
                /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(InlineStack, { align: "end", gap: "200", children: /* @__PURE__ */ jsxs(ButtonGroup, { children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      onClick: () => handleSaveDraft(vendor.vendorId),
                      loading: saveFetcher.state !== "idle" && ((_a3 = saveFetcher.formData) == null ? void 0 : _a3.get("payload")) !== void 0,
                      primary: true,
                      children: "Save draft"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      onClick: () => handleExportVendor(vendor.vendorId),
                      loading: exportFetcher.state !== "idle" && ((_b3 = exportFetcher.formData) == null ? void 0 : _b3.get("vendorId")) === vendor.vendorId,
                      children: "Export vendor CSV"
                    }
                  )
                ] }) }) })
              ] }, vendor.vendorId);
            })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          Modal,
          {
            open: detailSku !== null,
            onClose: () => setDetailSku(null),
            title: (detailSku == null ? void 0 : detailSku.title) ?? "SKU details",
            children: detailSku && /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", tone: "subdued", children: [
                  detailSku.sku,
                  " • ",
                  detailSku.vendorName
                ] }),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Badge, { tone: STATUS_TONE$1[detailSku.status], children: detailSku.status }),
                  /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
                    "Bucket: ",
                    detailSku.bucketId
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx(Divider, {}),
              /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, sm: 2 }, gap: "200", children: [
                /* @__PURE__ */ jsx(Metric, { label: "On hand", value: formatNumber$2(detailSku.onHand) }),
                /* @__PURE__ */ jsx(Metric, { label: "Inbound", value: formatNumber$2(detailSku.inbound) }),
                /* @__PURE__ */ jsx(Metric, { label: "Committed", value: formatNumber$2(detailSku.committed) }),
                /* @__PURE__ */ jsx(Metric, { label: "Coverage", value: `${formatNumber$2(detailSku.coverDays)} days` }),
                /* @__PURE__ */ jsx(
                  Metric,
                  {
                    label: "Reorder point",
                    value: formatNumber$2(detailSku.reorderPoint)
                  }
                ),
                /* @__PURE__ */ jsx(
                  Metric,
                  {
                    label: "Safety stock",
                    value: formatNumber$2(detailSku.safetyStock)
                  }
                ),
                /* @__PURE__ */ jsx(
                  Metric,
                  {
                    label: "Stockout date",
                    value: formatDate$2(detailSku.stockoutDate)
                  }
                ),
                /* @__PURE__ */ jsx(
                  Metric,
                  {
                    label: "Recommended order",
                    value: formatNumber$2(detailSku.recommendedOrder)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Demand trend" }),
                  (detailTrendStats == null ? void 0 : detailTrendStats.deltaPercentage) !== null && /* @__PURE__ */ jsxs(Badge, { tone: detailTrendStats.deltaPercentage >= 0 ? "success" : "critical", children: [
                    detailTrendStats.deltaPercentage >= 0 ? "+" : "",
                    detailTrendStats.deltaPercentage,
                    "% WoW"
                  ] })
                ] }),
                detailTrendDataset.length ? /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 240 }, children: /* @__PURE__ */ jsx(
                  LineChart,
                  {
                    data: detailTrendDataset,
                    isAnimated: false,
                    xAxisOptions: { hide: true },
                    tooltipOptions: {
                      keyFormatter: (value) => String(value ?? ""),
                      valueFormatter: (value) => {
                        const numeric = typeof value === "number" ? value : Number(value ?? 0);
                        const safe = Number.isFinite(numeric) ? numeric : 0;
                        return `${formatNumber$2(safe)} units`;
                      }
                    },
                    yAxisOptions: {
                      labelFormatter: (value) => {
                        const numeric = typeof value === "number" ? value : Number(value ?? 0);
                        const safe = Number.isFinite(numeric) ? numeric : 0;
                        return formatNumber$2(safe);
                      }
                    }
                  }
                ) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Demand trend data unavailable." }),
                detailTrendStats && /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, sm: 3 }, gap: "200", children: [
                  /* @__PURE__ */ jsx(
                    Metric,
                    {
                      label: `Latest (${detailTrendStats.latest.label})`,
                      value: `${formatNumber$2(detailTrendStats.latest.units)} units`
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Metric,
                    {
                      label: "6-week average",
                      value: `${formatNumber$2(detailTrendStats.average)} units`
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Metric,
                    {
                      label: `Range (${detailTrendStats.lowest.label}-${detailTrendStats.highest.label})`,
                      value: `${formatNumber$2(detailTrendStats.lowest.units)}-${formatNumber$2(detailTrendStats.highest.units)} units`
                    }
                  )
                ] }),
                useMockData && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Showing mock demand history. Live Shopify analytics will populate this chart once connected." })
              ] })
            ] }) })
          }
        )
      ]
    }
  ) });
}
function SkuTrendSparkline({ trend, skuTitle }) {
  if (!trend.length) {
    return /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "--" });
  }
  const data = trend.map((point, index2) => ({
    key: index2,
    value: Number.isFinite(point.units) ? point.units : 0
  }));
  const latest = trend[trend.length - 1];
  const latestUnits = Number.isFinite(latest.units) ? latest.units : 0;
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx("div", { style: { width: "100%", minWidth: 120, height: 60 }, children: /* @__PURE__ */ jsx(
      SparkLineChart,
      {
        data: [
          {
            name: "Weekly units",
            data
          }
        ],
        isAnimated: false,
        accessibilityLabel: `Weekly units sold for ${skuTitle}`
      }
    ) }),
    /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
      latest.label,
      ": ",
      formatNumber$2(latestUnits)
    ] })
  ] });
}
function Metric({ label: label2, value }) {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: label2 }),
    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: value })
  ] });
}
function BucketTrendSummary({ bucketLabel, dataset, stats }) {
  if (!dataset.length) {
    return null;
  }
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", gap: "300", wrap: true, children: [
    /* @__PURE__ */ jsx("div", { style: { flex: "1 1 240px", minWidth: 220, maxWidth: 360, height: 100 }, children: /* @__PURE__ */ jsx(
      SparkLineChart,
      {
        data: dataset,
        isAnimated: false,
        accessibilityLabel: `Weekly units sold across ${bucketLabel} bucket`
      }
    ) }),
    stats && /* @__PURE__ */ jsxs(BlockStack, { gap: "050", align: "end", children: [
      /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
        /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "span", children: [
          "Last week: ",
          formatNumber$2(stats.latest.units),
          " units"
        ] }),
        stats.deltaPercentage !== null && /* @__PURE__ */ jsxs(Badge, { tone: stats.deltaPercentage >= 0 ? "success" : "critical", children: [
          stats.deltaPercentage >= 0 ? "+" : "",
          stats.deltaPercentage,
          "% WoW"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
        "Avg ",
        formatNumber$2(stats.average),
        " units • Range ",
        formatNumber$2(stats.lowest.units),
        "-",
        formatNumber$2(stats.highest.units),
        " units"
      ] })
    ] })
  ] });
}
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: InventoryRoute,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
class MockBingClient {
  constructor(options = {}) {
    __publicField(this, "options");
    this.options = options;
  }
  async fetchPageMetrics(params) {
    const { pages } = getSeoCollections(this.options);
    return pages;
  }
}
const createBingClient = (options) => new MockBingClient(options);
class MockGa4Client {
  constructor(options = {}) {
    __publicField(this, "options");
    this.options = options;
  }
  async fetchTrafficSummary(params) {
    const scenario = this.options.scenario ?? "base";
    if (scenario === "empty" || scenario === "error") {
      return { totalUsers: 0, sessions: 0, conversions: 0, source: "ga4" };
    }
    if (scenario === "warning") {
      return {
        totalUsers: 16120,
        sessions: 19842,
        conversions: 712,
        source: "ga4"
      };
    }
    return { totalUsers: 18452, sessions: 23120, conversions: 842, source: "ga4" };
  }
  async fetchTrafficTrend() {
    const { traffic } = getSeoCollections(this.options);
    return traffic;
  }
}
const createGa4Client = (options) => new MockGa4Client(options);
class MockGscClient {
  constructor(options = {}) {
    __publicField(this, "options");
    this.options = options;
  }
  async fetchCoverageIssues(params) {
    const scenario = this.options.scenario ?? "base";
    if (scenario === "empty") {
      return [];
    }
    if (scenario === "warning") {
      return [
        {
          page: "/collections/turbo-kit",
          issue: "Blocked by robots.txt",
          severity: "critical"
        },
        {
          page: "/products/ls-stage-2",
          issue: "Mobile usability: clickable elements too close",
          severity: "warning"
        },
        {
          page: "/pages/build-program",
          issue: "Duplicate canonical tag detected",
          severity: "warning"
        }
      ];
    }
    if (scenario === "error") {
      throw new Error("GSC unavailable");
    }
    return [
      {
        page: "/collections/turbo-kit",
        issue: "Blocked by robots.txt",
        severity: "critical"
      },
      {
        page: "/products/ls-stage-2",
        issue: "Mobile usability: clickable elements too close",
        severity: "warning"
      }
    ];
  }
  async fetchSeoActions() {
    const { actions } = getSeoCollections(this.options);
    return actions;
  }
  async fetchKeywordTable() {
    const { keywords } = getSeoCollections(this.options);
    return keywords;
  }
}
const createGscClient = (options) => new MockGscClient(options);
const DURATION_BASELINE = {
  ga4: 360,
  gsc: 920,
  bing: 480,
  mcp: 250
};
const formatDuration = (value) => `${value}ms`;
const buildResult = (provider, status, duration, message) => ({
  status,
  durationMs: duration,
  message
});
const runConnectionTest = async (input2) => {
  const start = performance.now();
  const durationFallback = DURATION_BASELINE[input2.provider] ?? 500;
  switch (input2.provider) {
    case "ga4": {
      const client = createGa4Client({});
      const summary = await client.fetchTrafficSummary({
        propertyId: input2.credential,
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      });
      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback
      );
      if (summary.conversions > 0 && summary.sessions > 0) {
        return buildResult(
          input2.provider,
          "success",
          duration,
          `GA4 responded with ${summary.conversions} conversions across ${summary.sessions} sessions (${formatDuration(duration)})`
        );
      }
      if (summary.sessions > 0) {
        return buildResult(
          input2.provider,
          "warning",
          duration,
          `GA4 returned data but conversions were zero (${formatDuration(duration)})`
        );
      }
      return buildResult(
        input2.provider,
        "error",
        duration,
        `GA4 response empty; verify property permissions (${formatDuration(duration)})`
      );
    }
    case "gsc": {
      const client = createGscClient({});
      const issues = await client.fetchCoverageIssues({
        siteUrl: input2.credential,
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      });
      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback
      );
      const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
      const warningCount = issues.filter((issue) => issue.severity === "warning").length;
      const total = issues.length;
      if (criticalCount > 0) {
        return buildResult(
          input2.provider,
          "warning",
          duration,
          `GSC connection healthy but ${criticalCount} critical issue${criticalCount === 1 ? "" : "s"} detected (${formatDuration(duration)})`
        );
      }
      if (warningCount > 0) {
        return buildResult(
          input2.provider,
          "warning",
          duration,
          `GSC returned ${warningCount} warning${warningCount === 1 ? "" : "s"} (${formatDuration(duration)})`
        );
      }
      if (total === 0) {
        return buildResult(
          input2.provider,
          "warning",
          duration,
          `GSC responded but no coverage data available (${formatDuration(duration)})`
        );
      }
      return buildResult(
        input2.provider,
        "success",
        duration,
        `GSC responded with ${total} coverage issue${total === 1 ? "" : "s"} (${formatDuration(duration)})`
      );
    }
    case "bing": {
      const client = createBingClient({});
      const metrics = await client.fetchPageMetrics({
        siteUrl: input2.credential,
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      });
      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback
      );
      if (!metrics.length) {
        return buildResult(
          input2.provider,
          "warning",
          duration,
          `Bing responded but no page metrics returned (${formatDuration(duration)})`
        );
      }
      const topPage = metrics[0];
      return buildResult(
        input2.provider,
        "success",
        duration,
        `Bing returned ${metrics.length} pages; top URL ${topPage.url} (${formatDuration(duration)})`
      );
    }
    case "mcp": {
      const envConfig = resolveMcpConfigFromEnv(input2.overrides);
      const forceMocks = ["1", "true", "yes", "on"].includes(
        (process.env.MCP_FORCE_MOCKS ?? "").toLowerCase()
      );
      const shouldMock = forceMocks || !envConfig.endpoint;
      const client = createMcpClient({
        ...envConfig,
        apiKey: input2.credential,
        useMocks: shouldMock
      });
      const pingOk = await client.ping();
      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback
      );
      if (!pingOk) {
        const reason = shouldMock ? "Mock ping failed unexpectedly" : "Verify MCP endpoint and API key";
        return buildResult(
          input2.provider,
          "error",
          duration,
          `MCP ping failed. ${reason} (${formatDuration(duration)})`
        );
      }
      if (shouldMock) {
        return buildResult(
          input2.provider,
          "warning",
          duration,
          `MCP ping succeeded in mock mode (${formatDuration(duration)}). Configure MCP_API_URL to validate live connectivity.`
        );
      }
      return buildResult(
        input2.provider,
        "success",
        duration,
        `MCP ping succeeded (${formatDuration(duration)}).`
      );
    }
    default: {
      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback
      );
      return buildResult(
        input2.provider,
        "error",
        duration,
        `Unknown provider: ${input2.provider} (${formatDuration(duration)})`
      );
    }
  }
};
const BACKEND_SERVICES = [
  {
    name: "RAG API",
    url: process.env.RAG_API_URL || "http://localhost:3001",
    envKey: "RAG_API_URL",
    description: "RAG service for document processing and querying"
  },
  {
    name: "MCP API",
    url: process.env.MCP_API_URL || "http://localhost:3002",
    envKey: "MCP_API_URL",
    description: "Model Context Protocol API for external integrations"
  },
  {
    name: "SEO API",
    url: process.env.SEO_API_URL || "http://localhost:3003",
    envKey: "SEO_API_URL",
    description: "SEO analysis and optimization service"
  },
  {
    name: "Inventory API",
    url: process.env.INVENTORY_API_URL || "http://localhost:3004",
    envKey: "INVENTORY_API_URL",
    description: "Inventory management and reorder point service"
  },
  {
    name: "Sales API",
    url: process.env.SALES_API_URL || "http://localhost:3005",
    envKey: "SALES_API_URL",
    description: "Sales analytics and insights service"
  },
  {
    name: "Approvals API",
    url: process.env.APPROVALS_API_URL || "http://localhost:3006",
    envKey: "APPROVALS_API_URL",
    description: "Customer service approval workflow service"
  }
];
async function checkServiceHealth(service) {
  const start = performance.now();
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const envValue = process.env[service.envKey];
    if (!envValue) {
      return {
        service: service.name,
        status: "unknown",
        responseTime: 0,
        message: `Environment variable ${service.envKey} not configured`,
        lastChecked: timestamp
      };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5e3);
    const response = await fetch(`${service.url}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json"
      }
    });
    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - start);
    if (response.ok) {
      return {
        service: service.name,
        status: "healthy",
        responseTime,
        message: `Service responding normally (${response.status})`,
        lastChecked: timestamp
      };
    } else {
      return {
        service: service.name,
        status: "unhealthy",
        responseTime,
        message: `Service returned error status ${response.status}`,
        lastChecked: timestamp
      };
    }
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);
    let message = "Service unreachable";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        message = "Service timeout (5s)";
      } else {
        message = `Connection error: ${error.message}`;
      }
    }
    return {
      service: service.name,
      status: "unhealthy",
      responseTime,
      message,
      lastChecked: timestamp
    };
  }
}
async function checkAllServicesHealth() {
  const healthChecks = await Promise.allSettled(
    BACKEND_SERVICES.map((service) => checkServiceHealth(service))
  );
  return healthChecks.map((result, index2) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        service: BACKEND_SERVICES[index2].name,
        status: "unknown",
        responseTime: 0,
        message: `Health check failed: ${result.reason}`,
        lastChecked: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  });
}
function getEnvironmentStatus() {
  const envKeys = [
    "USE_MOCK_DATA",
    "ENABLE_MCP",
    "ENABLE_SEO",
    "ENABLE_INVENTORY",
    "RAG_API_URL",
    "MCP_API_URL",
    "SEO_API_URL",
    "INVENTORY_API_URL",
    "SALES_API_URL",
    "APPROVALS_API_URL"
  ];
  const status = {};
  for (const key of envKeys) {
    const value = process.env[key];
    status[key] = {
      present: !!value,
      value: value ? key.includes("URL") ? value : "***" : void 0
    };
  }
  return status;
}
const providerMeta = {
  ga4: {
    label: "Google Analytics 4",
    description: "Used for traffic, conversions, and anomaly detection widgets."
  },
  gsc: {
    label: "Google Search Console",
    description: "Required for keyword rankings and crawl issue surfacing."
  },
  bing: {
    label: "Bing Webmaster Tools",
    description: "Optional, powers supplemental keyword audits."
  },
  mcp: {
    label: "Shopify MCP",
    description: "Powers storefront intelligence. Provide the MCP API key issued for this shop."
  }
};
const thresholdsSchema = z.object({
  lowStockMinimum: z.coerce.number().int().min(0).max(500),
  overdueOrderHours: z.coerce.number().int().min(1).max(240),
  overstockPercentage: z.coerce.number().int().min(0).max(500)
});
const togglesSchema = z.object({
  enableMcpIntegration: z.boolean(),
  enableAssistantsProvider: z.boolean(),
  enableExperimentalWidgets: z.boolean(),
  enableBetaWorkflows: z.boolean(),
  useMockData: z.boolean(),
  enableMcp: z.boolean(),
  enableSeo: z.boolean(),
  enableInventory: z.boolean()
});
const loader$7 = async ({ request }) => {
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const [settings, mcpOverrides, healthChecks, envStatus] = await Promise.all([
    storeSettingsRepository.getSettings(shopDomain),
    storeSettingsRepository.getMcpIntegrationOverrides(shopDomain),
    checkAllServicesHealth(),
    Promise.resolve(getEnvironmentStatus())
  ]);
  return json({
    settings,
    useMockData: USE_MOCK_DATA ? true : false,
    mcpOverrides,
    healthChecks,
    envStatus
  });
};
const badRequest = (data) => json(data, { status: 400 });
const parseSecretForm = (formData) => {
  const provider = z.enum(["ga4", "gsc", "bing", "mcp"]).parse(formData.get("provider"));
  const rawSecret = formData.get("secret");
  const secretValue = typeof rawSecret === "string" && rawSecret.trim().length > 0 ? rawSecret.trim() : null;
  const rawRotation = formData.get("rotationReminderAt");
  const rotationReminderAt = typeof rawRotation === "string" && rawRotation ? (/* @__PURE__ */ new Date(`${rawRotation}T00:00:00.000Z`)).toISOString() : null;
  return { provider, secret: secretValue, rotationReminderAt };
};
const providerStatusToBadge = (status) => {
  switch (status) {
    case "success":
      return { tone: "success", label: "Success" };
    case "warning":
      return { tone: "warning", label: "Warning" };
    default:
      return { tone: "critical", label: "Error" };
  }
};
const healthStatusToBadge = (status) => {
  switch (status) {
    case "healthy":
      return { tone: "success", label: "Healthy" };
    case "unhealthy":
      return { tone: "critical", label: "Unhealthy" };
    default:
      return { tone: "warning", label: "Unknown" };
  }
};
const MCP_TIMEOUT_MIN_MS = 100;
const MCP_TIMEOUT_MAX_MS = 12e4;
const MCP_MAX_RETRIES_MIN = 0;
const MCP_MAX_RETRIES_MAX = 10;
const parseMcpOverridesForm = (formData) => {
  const fieldErrors = {};
  const formErrors = [];
  const rawEndpoint = formData.get("endpoint");
  let endpoint = void 0;
  if (typeof rawEndpoint === "string") {
    const trimmed = rawEndpoint.trim();
    if (trimmed.length === 0) {
      endpoint = null;
    } else if (!/^https?:\/\//i.test(trimmed)) {
      fieldErrors["mcp-endpoint"] = "Endpoint must start with http:// or https://.";
    } else {
      endpoint = trimmed;
    }
  }
  const rawTimeout = formData.get("timeoutMs");
  let timeoutMs = void 0;
  if (typeof rawTimeout === "string") {
    const trimmed = rawTimeout.trim();
    if (trimmed.length === 0) {
      timeoutMs = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        fieldErrors["mcp-timeoutMs"] = "Timeout must be a positive number of milliseconds.";
      } else if (parsed < MCP_TIMEOUT_MIN_MS || parsed > MCP_TIMEOUT_MAX_MS) {
        fieldErrors["mcp-timeoutMs"] = `Timeout must be between ${MCP_TIMEOUT_MIN_MS} and ${MCP_TIMEOUT_MAX_MS} ms.`;
      } else {
        timeoutMs = Math.round(parsed);
      }
    }
  }
  const rawMaxRetries = formData.get("maxRetries");
  let maxRetries = void 0;
  if (typeof rawMaxRetries === "string") {
    const trimmed = rawMaxRetries.trim();
    if (trimmed.length === 0) {
      maxRetries = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        fieldErrors["mcp-maxRetries"] = "Max retries must be an integer.";
      } else if (parsed < MCP_MAX_RETRIES_MIN || parsed > MCP_MAX_RETRIES_MAX) {
        fieldErrors["mcp-maxRetries"] = `Max retries must be between ${MCP_MAX_RETRIES_MIN} and ${MCP_MAX_RETRIES_MAX}.`;
      } else {
        maxRetries = parsed;
      }
    }
  }
  const overrides = {};
  if (endpoint !== void 0) {
    overrides.endpoint = endpoint;
  }
  if (timeoutMs !== void 0) {
    overrides.timeoutMs = timeoutMs;
  }
  if (maxRetries !== void 0) {
    overrides.maxRetries = maxRetries;
  }
  return { overrides, fieldErrors, formErrors };
};
const action$5 = async ({ request }) => {
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (typeof intent !== "string") {
    return badRequest({
      ok: false,
      formErrors: ["Missing intent"]
    });
  }
  switch (intent) {
    case "update-thresholds": {
      const parseResult = thresholdsSchema.safeParse({
        lowStockMinimum: formData.get("lowStockMinimum"),
        overdueOrderHours: formData.get("overdueOrderHours"),
        overstockPercentage: formData.get("overstockPercentage")
      });
      if (!parseResult.success) {
        const fieldErrors = {};
        for (const issue of parseResult.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            fieldErrors[key] = issue.message;
          }
        }
        return badRequest({
          ok: false,
          fieldErrors,
          meta: { intent }
        });
      }
      const updated = await storeSettingsRepository.updateThresholds(
        shopDomain,
        parseResult.data
      );
      return json({
        ok: true,
        settings: updated,
        toast: {
          status: "success",
          message: "Operational thresholds updated"
        },
        meta: { intent }
      });
    }
    case "update-toggles": {
      const togglesInput = {
        enableMcpIntegration: formData.has("enableMcpIntegration"),
        enableAssistantsProvider: formData.has("enableAssistantsProvider"),
        enableExperimentalWidgets: formData.has("enableExperimentalWidgets"),
        enableBetaWorkflows: formData.has("enableBetaWorkflows"),
        useMockData: formData.has("useMockData"),
        enableMcp: formData.has("enableMcp"),
        enableSeo: formData.has("enableSeo"),
        enableInventory: formData.has("enableInventory")
      };
      const parseResult = togglesSchema.safeParse(togglesInput);
      if (!parseResult.success) {
        return badRequest({
          ok: false,
          formErrors: ["Unable to parse toggles"],
          meta: { intent }
        });
      }
      const updated = await storeSettingsRepository.updateToggles(
        shopDomain,
        parseResult.data
      );
      return json({
        ok: true,
        settings: updated,
        toast: {
          status: "success",
          message: "Feature toggles saved"
        },
        meta: { intent }
      });
    }
    case "update-mcp-overrides": {
      const { overrides, fieldErrors: overrideFieldErrors, formErrors } = parseMcpOverridesForm(formData);
      if (Object.keys(overrideFieldErrors).length > 0 || formErrors.length > 0) {
        return badRequest({
          ok: false,
          fieldErrors: overrideFieldErrors,
          formErrors: formErrors.length > 0 ? formErrors : void 0,
          meta: { intent }
        });
      }
      const updatedOverrides = await storeSettingsRepository.updateMcpIntegrationOverrides(
        shopDomain,
        overrides
      );
      return json({
        ok: true,
        mcpOverrides: updatedOverrides,
        toast: {
          status: "success",
          message: "MCP override settings saved"
        },
        meta: { intent }
      });
    }
    case "update-secret": {
      let secretPayload;
      try {
        secretPayload = parseSecretForm(formData);
      } catch (error) {
        return badRequest({
          ok: false,
          formErrors: ["Invalid secret payload"],
          meta: { intent }
        });
      }
      const actionTypeRaw = formData.get("actionType");
      const actionType = typeof actionTypeRaw === "string" && actionTypeRaw === "remove" ? "remove" : "save";
      if (secretPayload.secret && secretPayload.secret.length < 4) {
        return badRequest({
          ok: false,
          fieldErrors: {
            [`secret-${secretPayload.provider}`]: "Secret must be at least 4 characters."
          },
          meta: { intent, provider: secretPayload.provider }
        });
      }
      if (actionType === "remove") {
        const updated2 = await storeSettingsRepository.updateSecret(
          shopDomain,
          {
            provider: secretPayload.provider,
            secret: null,
            rotationReminderAt: null
          }
        );
        return json({
          ok: true,
          settings: updated2,
          toast: {
            status: "warning",
            message: `${providerMeta[secretPayload.provider].label} credential removed`
          },
          meta: { intent, provider: secretPayload.provider }
        });
      }
      let secretToPersist = secretPayload.secret;
      if (!secretToPersist) {
        const existingSecret = await storeSettingsRepository.getDecryptedSecret(
          shopDomain,
          secretPayload.provider
        );
        if (!existingSecret) {
          return badRequest({
            ok: false,
            fieldErrors: {
              [`secret-${secretPayload.provider}`]: "Enter a credential before saving."
            },
            meta: { intent, provider: secretPayload.provider }
          });
        }
        secretToPersist = existingSecret;
      }
      const updated = await storeSettingsRepository.updateSecret(shopDomain, {
        provider: secretPayload.provider,
        secret: secretToPersist,
        rotationReminderAt: secretPayload.rotationReminderAt ?? null
      });
      const isNewSecret = Boolean(secretPayload.secret);
      return json({
        ok: true,
        settings: updated,
        toast: {
          status: "success",
          message: isNewSecret ? `${providerMeta[secretPayload.provider].label} credential saved` : `${providerMeta[secretPayload.provider].label} reminder updated`
        },
        meta: { intent, provider: secretPayload.provider }
      });
    }
    case "test-connection": {
      let provider;
      try {
        provider = z.enum(["ga4", "gsc", "bing", "mcp"]).parse(
          formData.get("provider")
        );
      } catch {
        return badRequest({
          ok: false,
          formErrors: ["Unknown provider"],
          meta: { intent }
        });
      }
      const secret = await storeSettingsRepository.getDecryptedSecret(
        shopDomain,
        provider
      );
      if (!secret) {
        const updated2 = await storeSettingsRepository.recordConnectionTest(
          shopDomain,
          {
            provider,
            status: "error",
            durationMs: 0,
            message: "Credential missing"
          }
        );
        return badRequest({
          ok: false,
          settings: updated2,
          toast: {
            status: "error",
            message: `${providerMeta[provider].label} credential missing. Add an API key before testing.`
          },
          meta: { intent, provider }
        });
      }
      let connectionOverrides;
      if (provider === "mcp") {
        const overrides = await storeSettingsRepository.getMcpIntegrationOverrides(shopDomain);
        connectionOverrides = {
          endpoint: overrides.endpoint ?? void 0,
          timeoutMs: overrides.timeoutMs ?? void 0,
          maxRetries: overrides.maxRetries ?? void 0
        };
      }
      const { status, durationMs, message } = await runConnectionTest({
        provider,
        credential: secret,
        overrides: connectionOverrides
      });
      const updated = await storeSettingsRepository.recordConnectionTest(
        shopDomain,
        {
          provider,
          status,
          durationMs,
          message
        }
      );
      return json({
        ok: true,
        settings: updated,
        toast: {
          status: status === "success" ? "success" : "warning",
          message: status === "success" ? `${providerMeta[provider].label} connection healthy` : `${providerMeta[provider].label} responded, but review warnings`
        },
        meta: { intent, provider }
      });
    }
    case "refresh-health": {
      const healthChecks = await checkAllServicesHealth();
      const envStatus = getEnvironmentStatus();
      return json({
        ok: true,
        healthChecks,
        envStatus,
        toast: {
          status: "success",
          message: "Health status refreshed"
        },
        meta: { intent }
      });
    }
    default:
      return badRequest({
        ok: false,
        formErrors: ["Unsupported intent"],
        meta: { intent }
      });
  }
};
const isoToDateInput = (iso) => iso ? iso.slice(0, 10) : "";
function SettingsRoute() {
  var _a2, _b2, _c, _d, _e, _f, _g, _h;
  const { settings, useMockData, mcpOverrides: initialMcpOverrides, healthChecks: initialHealthChecks, envStatus: initialEnvStatus } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const appBridge = useAppBridge();
  const [thresholds, setThresholds] = useState(settings.thresholds);
  const [toggles, setToggles] = useState(settings.toggles);
  const [secretDrafts, setSecretDrafts] = useState({
    ga4: "",
    gsc: "",
    bing: "",
    mcp: ""
  });
  const [rotationDrafts, setRotationDrafts] = useState({
    ga4: isoToDateInput((_a2 = settings.secrets.ga4) == null ? void 0 : _a2.rotationReminderAt),
    gsc: isoToDateInput((_b2 = settings.secrets.gsc) == null ? void 0 : _b2.rotationReminderAt),
    bing: isoToDateInput((_c = settings.secrets.bing) == null ? void 0 : _c.rotationReminderAt),
    mcp: isoToDateInput((_d = settings.secrets.mcp) == null ? void 0 : _d.rotationReminderAt)
  });
  const [mcpOverridesState, setMcpOverridesState] = useState(initialMcpOverrides);
  const [mcpOverrideDraft, setMcpOverrideDraft] = useState({
    endpoint: initialMcpOverrides.endpoint ?? "",
    timeoutMs: initialMcpOverrides.timeoutMs ? String(initialMcpOverrides.timeoutMs) : "",
    maxRetries: initialMcpOverrides.maxRetries ? String(initialMcpOverrides.maxRetries) : ""
  });
  const [healthChecks, setHealthChecks] = useState(initialHealthChecks);
  const [envStatus, setEnvStatus] = useState(initialEnvStatus);
  useEffect(() => {
    var _a3, _b3, _c2, _d2;
    setThresholds(settings.thresholds);
    setToggles(settings.toggles);
    setRotationDrafts({
      ga4: isoToDateInput((_a3 = settings.secrets.ga4) == null ? void 0 : _a3.rotationReminderAt),
      gsc: isoToDateInput((_b3 = settings.secrets.gsc) == null ? void 0 : _b3.rotationReminderAt),
      bing: isoToDateInput((_c2 = settings.secrets.bing) == null ? void 0 : _c2.rotationReminderAt),
      mcp: isoToDateInput((_d2 = settings.secrets.mcp) == null ? void 0 : _d2.rotationReminderAt)
    });
  }, [settings]);
  useEffect(() => {
    setMcpOverridesState(initialMcpOverrides);
    setMcpOverrideDraft({
      endpoint: initialMcpOverrides.endpoint ?? "",
      timeoutMs: initialMcpOverrides.timeoutMs ? String(initialMcpOverrides.timeoutMs) : "",
      maxRetries: initialMcpOverrides.maxRetries ? String(initialMcpOverrides.maxRetries) : ""
    });
  }, [initialMcpOverrides]);
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.healthChecks) {
      setHealthChecks(actionData.healthChecks);
    }
    if (actionData == null ? void 0 : actionData.envStatus) {
      setEnvStatus(actionData.envStatus);
    }
  }, [actionData]);
  useEffect(() => {
    var _a3;
    if (actionData == null ? void 0 : actionData.toast) {
      appBridge.toast.show({
        message: actionData.toast.message,
        isError: actionData.toast.status === "error",
        duration: 4e3
      });
    }
    if ((actionData == null ? void 0 : actionData.ok) && ((_a3 = actionData.meta) == null ? void 0 : _a3.intent) === "update-secret") {
      setSecretDrafts((prev) => {
        var _a4;
        return {
          ...prev,
          [(_a4 = actionData.meta) == null ? void 0 : _a4.provider]: ""
        };
      });
    }
  }, [actionData, appBridge]);
  useEffect(() => {
    var _a3;
    if ((actionData == null ? void 0 : actionData.ok) && ((_a3 = actionData.meta) == null ? void 0 : _a3.intent) === "update-mcp-overrides" && actionData.mcpOverrides) {
      const next = actionData.mcpOverrides;
      setMcpOverridesState(next);
      setMcpOverrideDraft({
        endpoint: next.endpoint ?? "",
        timeoutMs: next.timeoutMs ? String(next.timeoutMs) : "",
        maxRetries: next.maxRetries ? String(next.maxRetries) : ""
      });
    }
  }, [actionData]);
  const fieldErrors = (actionData == null ? void 0 : actionData.fieldErrors) ?? {};
  const isSubmitting = (targetIntent) => {
    var _a3;
    return navigation.state === "ting" && ((_a3 = navigation.formData) == null ? void 0 : _a3.get("intent")) === targetIntent;
  };
  const healthTableRows = healthChecks.map((check) => [
    check.service,
    /* @__PURE__ */ jsx(Badge, { tone: healthStatusToBadge(check.status).tone, children: healthStatusToBadge(check.status).label }, `${check.service}-status`),
    `${check.responseTime}ms`,
    check.message,
    new Date(check.lastChecked).toLocaleString()
  ]);
  const envTableRows = Object.entries(envStatus).map(([key, status]) => [
    key,
    /* @__PURE__ */ jsx(Badge, { tone: status.present ? "success" : "critical", children: status.present ? "Set" : "Missing" }, `${key}-status`),
    status.value || "Not configured"
  ]);
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Settings",
      subtitle: "Manage operational thresholds, API access, and feature flags.",
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Settings" }),
        useMockData && /* @__PURE__ */ jsx(Box, { paddingBlockStart: "400", children: /* @__PURE__ */ jsx(Banner, { title: "Mock data enabled", tone: "info", children: /* @__PURE__ */ jsx("p", { children: "Changes apply to in-memory fixtures. Clear the server to reset or set `USE_MOCK_DATA=false` to connect to live Shopify data." }) }) }),
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { title: "System Health" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingMd", children: "Backend Services" }),
                /* @__PURE__ */ jsxs(Form, { method: "post", children: [
                  /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "refresh-health" }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      loading: isSubmitting("refresh-health"),
                      size: "slim",
                      children: "Refresh"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "text", "text", "text"],
                  headings: ["Service", "Status", "Response Time", "Message", "Last Checked"],
                  rows: healthTableRows
                }
              )
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { title: "Environment Variables" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingMd", children: "Configuration Status" }),
              /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "text"],
                  headings: ["Variable", "Status", "Value"],
                  rows: envTableRows
                }
              )
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { title: "Operational thresholds" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Form, { method: "post", children: [
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "update-thresholds" }),
              /* @__PURE__ */ jsxs(FormLayout, { children: [
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Low-stock minimum",
                    type: "number",
                    name: "lowStockMinimum",
                    value: String(thresholds.lowStockMinimum),
                    onChange: (value) => setThresholds((prev) => ({
                      ...prev,
                      lowStockMinimum: Number(value || 0)
                    })),
                    min: 0,
                    autoComplete: "off",
                    error: ((_e = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _e.intent) === "update-thresholds" ? fieldErrors.lowStockMinimum : void 0,
                    helpText: "Trigger low-stock alerts when inventory drops below this value."
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Overdue order hours",
                    type: "number",
                    name: "overdueOrderHours",
                    value: String(thresholds.overdueOrderHours),
                    onChange: (value) => setThresholds((prev) => ({
                      ...prev,
                      overdueOrderHours: Number(value || 0)
                    })),
                    min: 1,
                    autoComplete: "off",
                    error: ((_f = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _f.intent) === "update-thresholds" ? fieldErrors.overdueOrderHours : void 0,
                    helpText: "Orders exceeding this window surface in the orders dashboard."
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Overstock percentage",
                    type: "number",
                    name: "overstockPercentage",
                    value: String(thresholds.overstockPercentage),
                    onChange: (value) => setThresholds((prev) => ({
                      ...prev,
                      overstockPercentage: Number(value || 0)
                    })),
                    min: 0,
                    autoComplete: "off",
                    error: ((_g = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _g.intent) === "update-thresholds" ? fieldErrors.overstockPercentage : void 0,
                    helpText: "Inventory flagged as overstock when buffer exceeds this percentage."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    primary: true,
                    loading: isSubmitting("update-thresholds"),
                    children: "Save thresholds"
                  }
                )
              ] })
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { title: "Integrations" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: Object.keys(providerMeta).map((provider) => {
              var _a3, _b3, _c2, _d2, _e2, _f2, _g2, _h2, _i, _j, _k, _l, _m;
              const meta = providerMeta[provider];
              const secret = settings.secrets[provider];
              const connection = settings.connections[provider];
              const badge = providerStatusToBadge(connection.status);
              const secretError = ((_a3 = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _a3.provider) === provider ? fieldErrors[`secret-${provider}`] : void 0;
              const tingSecret = isSubmitting("update-secret") && ((_b3 = navigation.formData) == null ? void 0 : _b3.get("provider")) === provider;
              const credentialPlaceholder = provider === "mcp" ? "Paste MCP API key" : "Paste API key or service account JSON";
              const connectionHelpText = provider === "mcp" ? mcpOverridesState.endpoint ? `Routing via ${mcpOverridesState.endpoint}.` : "Falling back to MCP_API_URL or mock transport." : void 0;
              const tingOverrides = provider === "mcp" && isSubmitting("update-mcp-overrides");
              return /* @__PURE__ */ jsx(
                Box,
                {
                  padding: "400",
                  borderWidth: "025",
                  borderRadius: "200",
                  borderColor: "border-subdued",
                  children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                    /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                      /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                        /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingMd", children: meta.label }),
                        /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: meta.description })
                      ] }),
                      /* @__PURE__ */ jsx(Badge, { tone: badge.tone, children: badge.label })
                    ] }),
                    connection.message && /* @__PURE__ */ jsx(
                      Banner,
                      {
                        tone: connection.status === "error" ? "critical" : "warning",
                        title: connection.message,
                        children: /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
                          "Last checked ",
                          connection.lastCheckedAt ?? "never"
                        ] })
                      }
                    ),
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                      /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
                        "Stored credential: ",
                        " ",
                        (secret == null ? void 0 : secret.maskedValue) ?? "Not configured"
                      ] }),
                      /* @__PURE__ */ jsxs(Form, { method: "post", children: [
                        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "update-secret" }),
                        /* @__PURE__ */ jsx("input", { type: "hidden", name: "provider", value: provider }),
                        /* @__PURE__ */ jsxs(FormLayout, { children: [
                          /* @__PURE__ */ jsx(
                            TextField,
                            {
                              label: "New credential",
                              type: "text",
                              name: "secret",
                              autoComplete: "off",
                              value: secretDrafts[provider],
                              onChange: (value) => setSecretDrafts((prev) => ({
                                ...prev,
                                [provider]: value
                              })),
                              placeholder: credentialPlaceholder,
                              error: secretError
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            TextField,
                            {
                              label: "Rotation reminder",
                              type: "date",
                              name: "rotationReminderAt",
                              value: rotationDrafts[provider],
                              onChange: (value) => setRotationDrafts((prev) => ({
                                ...prev,
                                [provider]: value
                              }))
                            }
                          ),
                          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                            /* @__PURE__ */ jsx(
                              Button,
                              {
                                primary: true,
                                name: "actionType",
                                value: "save",
                                loading: tingSecret && ((_c2 = navigation.formData) == null ? void 0 : _c2.get("actionType")) !== "remove",
                                children: "Save credential"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              Button,
                              {
                                variant: "secondary",
                                tone: "critical",
                                name: "actionType",
                                value: "remove",
                                disabled: !secret,
                                loading: tingSecret && ((_d2 = navigation.formData) == null ? void 0 : _d2.get("actionType")) === "remove",
                                onClick: () => setSecretDrafts((prev) => ({
                                  ...prev,
                                  [provider]: ""
                                })),
                                children: "Remove credential"
                              }
                            )
                          ] })
                        ] })
                      ] })
                    ] }),
                    provider === "mcp" && /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx(Divider, {}),
                      /* @__PURE__ */ jsxs(Form, { method: "post", children: [
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "hidden",
                            name: "intent",
                            value: "update-mcp-overrides"
                          }
                        ),
                        /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Override MCP connection settings for this shop. Leave fields blank to inherit environment defaults." }),
                          /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                            "Current endpoint: ",
                            " ",
                            mcpOverridesState.endpoint ?? "Environment-supplied or mock transport",
                            mcpOverridesState.timeoutMs ? ` • Timeout ${mcpOverridesState.timeoutMs} ms` : "",
                            typeof mcpOverridesState.maxRetries === "number" ? ` • Max retries ${mcpOverridesState.maxRetries}` : ""
                          ] }),
                          /* @__PURE__ */ jsxs(FormLayout, { children: [
                            /* @__PURE__ */ jsx(
                              TextField,
                              {
                                label: "Endpoint override",
                                type: "text",
                                name: "endpoint",
                                autoComplete: "off",
                                value: mcpOverrideDraft.endpoint,
                                onChange: (value) => setMcpOverrideDraft((prev) => ({
                                  ...prev,
                                  endpoint: value
                                })),
                                placeholder: "https://example.com/mcp",
                                error: ((_e2 = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _e2.intent) === "update-mcp-overrides" ? fieldErrors["mcp-endpoint"] : void 0,
                                helpText: "Provide a fully qualified HTTP(S) endpoint."
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              TextField,
                              {
                                label: "Request timeout (ms)",
                                type: "number",
                                name: "timeoutMs",
                                value: mcpOverrideDraft.timeoutMs,
                                onChange: (value) => setMcpOverrideDraft((prev) => ({
                                  ...prev,
                                  timeoutMs: value
                                })),
                                min: MCP_TIMEOUT_MIN_MS,
                                max: MCP_TIMEOUT_MAX_MS,
                                inputMode: "numeric",
                                error: ((_f2 = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _f2.intent) === "update-mcp-overrides" ? fieldErrors["mcp-timeoutMs"] : void 0,
                                helpText: `Allowed range ${MCP_TIMEOUT_MIN_MS}-${MCP_TIMEOUT_MAX_MS} ms.`
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              TextField,
                              {
                                label: "Max retries",
                                type: "number",
                                name: "maxRetries",
                                value: mcpOverrideDraft.maxRetries,
                                onChange: (value) => setMcpOverrideDraft((prev) => ({
                                  ...prev,
                                  maxRetries: value
                                })),
                                min: MCP_MAX_RETRIES_MIN,
                                max: MCP_MAX_RETRIES_MAX,
                                inputMode: "numeric",
                                error: ((_g2 = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _g2.intent) === "update-mcp-overrides" ? fieldErrors["mcp-maxRetries"] : void 0,
                                helpText: `Allowed range ${MCP_MAX_RETRIES_MIN}-${MCP_MAX_RETRIES_MAX}.`
                              }
                            ),
                            ((_h2 = actionData == null ? void 0 : actionData.meta) == null ? void 0 : _h2.intent) === "update-mcp-overrides" && actionData.formErrors && /* @__PURE__ */ jsx(
                              InlineError,
                              {
                                message: actionData.formErrors.join(", "),
                                fieldID: "mcp-overrides"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                            /* @__PURE__ */ jsx(
                              Button,
                              {
                                primary: true,
                                loading: tingOverrides,
                                children: "Save MCP overrides"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              Button,
                              {
                                type: "button",
                                variant: "secondary",
                                disabled: tingOverrides,
                                onClick: () => setMcpOverrideDraft({
                                  endpoint: "",
                                  timeoutMs: "",
                                  maxRetries: ""
                                }),
                                children: "Reset fields"
                              }
                            )
                          ] })
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx(Divider, {}),
                    /* @__PURE__ */ jsxs(Form, { method: "post", children: [
                      /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "test-connection" }),
                      /* @__PURE__ */ jsx("input", { type: "hidden", name: "provider", value: provider }),
                      /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            loading: isSubmitting("test-connection") && ((_i = navigation.formData) == null ? void 0 : _i.get("provider")) === provider,
                            children: "Test connection"
                          }
                        ),
                        /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                          "Last ",
                          ((_j = connection.history[0]) == null ? void 0 : _j.status) ?? "n/a",
                          " test at ",
                          " ",
                          ((_k = connection.history[0]) == null ? void 0 : _k.timestamp) ?? "n/a",
                          ((_l = connection.history[0]) == null ? void 0 : _l.message) ? ` — ${(_m = connection.history[0]) == null ? void 0 : _m.message}` : "",
                          connectionHelpText ? ` — ${connectionHelpText}` : ""
                        ] })
                      ] })
                    ] })
                  ] })
                },
                provider
              );
            }) }) })
          ] }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { title: "Feature toggles" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Form, { method: "post", children: [
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "update-toggles" }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Use mock data",
                    name: "useMockData",
                    checked: toggles.useMockData,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      useMockData: value
                    })),
                    helpText: "Enable mock data mode for development and testing."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable MCP integration",
                    name: "enableMcpIntegration",
                    checked: toggles.enableMcpIntegration,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableMcpIntegration: value
                    })),
                    helpText: "Controls access to storefront MCP widgets."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable MCP connectors",
                    name: "enableMcp",
                    checked: toggles.enableMcp,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableMcp: value
                    })),
                    helpText: "Enable MCP connector functionality for external integrations."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable SEO features",
                    name: "enableSeo",
                    checked: toggles.enableSeo,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableSeo: value
                    })),
                    helpText: "Enable SEO analysis and optimization features."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable inventory features",
                    name: "enableInventory",
                    checked: toggles.enableInventory,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableInventory: value
                    })),
                    helpText: "Enable inventory management and reorder point features."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable Assistants provider",
                    name: "enableAssistantsProvider",
                    checked: toggles.enableAssistantsProvider,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableAssistantsProvider: value
                    })),
                    helpText: "Connects the inbox to the live Assistants service for draft approvals."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable experimental widgets",
                    name: "enableExperimentalWidgets",
                    checked: toggles.enableExperimentalWidgets,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableExperimentalWidgets: value
                    })),
                    helpText: "Shows beta dashboard cards for internal QA."
                  }
                ),
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: "Enable beta workflows",
                    name: "enableBetaWorkflows",
                    checked: toggles.enableBetaWorkflows,
                    onChange: (value) => setToggles((prev) => ({
                      ...prev,
                      enableBetaWorkflows: value
                    })),
                    helpText: "Allows merchants to opt into upcoming flows."
                  }
                ),
                (actionData == null ? void 0 : actionData.formErrors) && ((_h = actionData.meta) == null ? void 0 : _h.intent) === "update-toggles" && /* @__PURE__ */ jsx(
                  InlineError,
                  {
                    message: actionData.formErrors.join(", "),
                    fieldID: "feature-toggles"
                  }
                ),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    primary: true,
                    loading: isSubmitting("update-toggles"),
                    children: "Save toggles"
                  }
                )
              ] })
            ] }) })
          ] }) })
        ] })
      ]
    }
  );
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: SettingsRoute,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const HOME_RANGE_KEYS = DASHBOARD_RANGE_KEY_LIST.filter(
  (key) => key !== "14d"
);
const SALES_PERIOD_BY_RANGE = {
  today: "7d",
  "7d": "7d",
  "14d": "14d",
  "28d": "28d",
  "90d": "90d"
};
const loader$6 = async ({ request }) => {
  const url = new URL(request.url);
  const range = resolveDashboardRangeKey(url.searchParams.get("range"), DEFAULT_DASHBOARD_RANGE);
  const scenario = scenarioFromRequest$1(request);
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);
  const data = await getDashboardOverview(range, scenario);
  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let mcpSource;
  let mcpGeneratedAt;
  let mcpOverrides;
  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }
    const response = await getMcpProductRecommendations(
      {
        shopDomain,
        params: { limit: 3, range }
      },
      toggles,
      mcpOverrides
    );
    const topRecommendation = response.data.at(0);
    if (topRecommendation) {
      data.mcpRecommendation = `${topRecommendation.title}: ${topRecommendation.rationale}`;
    }
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  } else {
    data.mcpRecommendation = "Enable the MCP integration in Settings to populate storefront insights.";
  }
  return json(
    {
      data,
      useMockData: USE_MOCK_DATA,
      scenario,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
        source: mcpSource,
        generatedAt: mcpGeneratedAt
      }
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
function DashboardRoute() {
  const { data, useMockData, scenario, mcp } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const salesPrefetcher = useFetcher();
  const prefetchedSalesHref = useRef(null);
  const activeRange = resolveDashboardRangeKey(
    searchParams.get("range"),
    data.range ?? DEFAULT_DASHBOARD_RANGE
  );
  const navigationLocation = navigation.location;
  const isHomeNavigation = navigation.state !== "idle" && (navigationLocation == null ? void 0 : navigationLocation.pathname) === "/app";
  const showSkeleton = isHomeNavigation;
  const sharedLinkOptions = { searchParams };
  const salesHref = (() => {
    const base = withDashboardRangeParam("/app/sales", activeRange, sharedLinkOptions);
    const url = new URL(base, "https://dashboard.internal");
    url.searchParams.set("period", SALES_PERIOD_BY_RANGE[activeRange] ?? "28d");
    return `${url.pathname}${url.search}${url.hash}`;
  })();
  const handleSalesPrefetch = () => {
    if (!salesHref || prefetchedSalesHref.current === salesHref) {
      return;
    }
    prefetchedSalesHref.current = salesHref;
    salesPrefetcher.load(salesHref);
  };
  const handleRangeSelect = (value) => {
    const params = new URLSearchParams(searchParams);
    params.set("range", value);
    navigate(`?${params.toString()}`, { replace: true });
  };
  const sparklineData = data.sparkline.map((value, index2) => ({
    key: index2,
    value
  }));
  const rangeLabel = data.rangeLabel ?? DASHBOARD_RANGE_PRESETS[activeRange].label;
  const metricCount = data.metrics.length || 4;
  const metricsContent = showSkeleton ? Array.from({ length: metricCount }, (_, index2) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(MetricTileSkeleton, {}) }, `metric-skeleton-${index2}`)) : data.metrics.map((metric) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: metric.label }),
    /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: metric.value }),
    /* @__PURE__ */ jsx(Badge, { tone: metric.delta >= 0 ? "success" : "critical", children: `${formatDelta$1(metric.delta)} ${metric.deltaPeriod}` })
  ] }) }, metric.id));
  return /* @__PURE__ */ jsx(PolarisVizProvider, { children: /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(
      TitleBar,
      {
        title: "Operations dashboard"
      }
    ),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
      useMockData && /* @__PURE__ */ jsx(
        Banner,
        {
          title: `Mock data scenario: ${scenario}`,
          tone: scenario === "warning" ? "warning" : "info",
          children: /* @__PURE__ */ jsx("p", { children: "Change the `mockState` query parameter (base, empty, warning, error) to preview different UI permutations." })
        }
      ),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingLg", children: "Sales overview" }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "plain",
                url: salesHref,
                onMouseEnter: handleSalesPrefetch,
                onFocus: handleSalesPrefetch,
                onTouchStart: handleSalesPrefetch,
                children: "View sales"
              }
            ),
            /* @__PURE__ */ jsx(ButtonGroup, { children: HOME_RANGE_KEYS.map((option) => /* @__PURE__ */ jsx(
              Button,
              {
                pressed: activeRange === option,
                onClick: () => handleRangeSelect(option),
                children: option.toUpperCase()
              },
              option
            )) }),
            /* @__PURE__ */ jsx(Text, { as: "span", tone: "subdued", variant: "bodySm", children: rangeLabel })
          ] })
        ] }),
        /* @__PURE__ */ jsx(InlineGrid, { columns: { xs: 1, sm: 2, lg: 4 }, gap: "300", children: metricsContent }),
        showSkeleton ? /* @__PURE__ */ jsx(SalesSparklineSkeleton, {}) : /* @__PURE__ */ jsx(
          SalesSparkline,
          {
            points: sparklineData,
            rangeLabel
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Orders attention", children: /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: showSkeleton ? Array.from({ length: data.orders.length || 3 }, (_, index2) => /* @__PURE__ */ jsx(OrderBucketSkeleton, {}, `order-skeleton-${index2}`)) : data.orders.map((bucket) => /* @__PURE__ */ jsxs(
          InlineStack,
          {
            align: "space-between",
            blockAlign: "center",
            children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingMd", children: bucket.label }),
                /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: bucket.description })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: bucket.count }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    url: withDashboardRangeParam(
                      bucket.href,
                      activeRange,
                      sharedLinkOptions
                    ),
                    accessibilityLabel: `View ${bucket.label}`,
                    children: "Open"
                  }
                )
              ] })
            ]
          },
          bucket.id
        )) }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Inbox", children: showSkeleton ? /* @__PURE__ */ jsx(InboxSnapshotSkeleton, {}) : /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Outstanding" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.inbox.outstanding })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Overdue >12h" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.inbox.overdueHours })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "AI approvals pending" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.inbox.approvalsPending })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              url: withDashboardRangeParam("/app/inbox", activeRange, sharedLinkOptions),
              tone: "primary",
              variant: "plain",
              children: "Go to inbox"
            }
          )
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Inventory snapshot", children: showSkeleton ? /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(InlineStack, { gap: "400", children: Array.from({ length: 3 }, (_, index2) => /* @__PURE__ */ jsx(MetricTileSkeleton, {}, `inventory-skeleton-${index2}`)) }),
        /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(InlineStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(MetricTile$1, { label: "Low stock", value: data.inventory.lowStock }),
          /* @__PURE__ */ jsx(
            MetricTile$1,
            {
              label: "POs in flight",
              value: data.inventory.purchaseOrdersInFlight
            }
          ),
          /* @__PURE__ */ jsx(MetricTile$1, { label: "Overstock", value: data.inventory.overstock })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            url: withDashboardRangeParam("/app/inventory", activeRange, sharedLinkOptions),
            accessibilityLabel: "View inventory planner",
            children: "Open inventory planner"
          }
        )
      ] }) }) }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "SEO highlights", children: showSkeleton ? /* @__PURE__ */ jsx(SeoHighlightsSkeleton, {}) : /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", children: "Traffic Δ" }),
          /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
            "+",
            data.seo.trafficDelta,
            "%"
          ] }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: data.seo.summary }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Rising queries" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.seo.risingQueries })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Rising pages" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: data.seo.risingPages })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: "Critical issues" }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", tone: "critical", as: "span", children: data.seo.criticalIssues })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              url: withDashboardRangeParam("/app/seo", activeRange, sharedLinkOptions),
              variant: "plain",
              children: "Dive into SEO"
            }
          )
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "MCP insight", children: showSkeleton ? /* @__PURE__ */ jsx(McpInsightSkeleton, {}) : /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: data.mcpRecommendation }),
          !mcp.enabled && /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Configure credentials and enable the MCP toggle in Settings to load live data." }),
          mcp.usingMocks && /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Showing mock data while `USE_MOCK_DATA` is enabled." }),
          mcp.generatedAt && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
            "Last updated ",
            new Date(mcp.generatedAt).toLocaleString(),
            " • ",
            mcp.source ?? "mock"
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              url: withDashboardRangeParam("/app/settings", activeRange, sharedLinkOptions),
              variant: "plain",
              children: "Manage MCP toggles"
            }
          )
        ] }) }) })
      ] })
    ] })
  ] }) });
}
function MetricTile$1({ label: label2, value }) {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: label2 }),
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: value })
  ] });
}
function MetricTileSkeleton() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function OrderBucketSkeleton() {
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", gap: "200", children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
      /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" }),
      /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 })
    ] }) }),
    /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
      /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" }),
      /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
    ] })
  ] });
}
function InlineStatSkeleton() {
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", gap: "200", children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }) }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function InboxSnapshotSkeleton() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
    /* @__PURE__ */ jsx(InlineStatSkeleton, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton, {}),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function SeoHighlightsSkeleton() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" }),
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 2 }),
    /* @__PURE__ */ jsx(InlineStatSkeleton, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton, {}),
    /* @__PURE__ */ jsx(InlineStatSkeleton, {}),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
function McpInsightSkeleton() {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 2 }),
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonBodyText, { lines: 1 }),
    /* @__PURE__ */ jsx(SkeletonDisplayText, { size: "small" })
  ] });
}
const formatDelta$1 = (delta) => `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
function SalesSparkline({
  points,
  rangeLabel
}) {
  if (!points.length) {
    return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 160 }, children: /* @__PURE__ */ jsx("div", { style: {
      width: "100%",
      height: "100%",
      backgroundColor: "#f6f6f7",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6d7175"
    }, children: "Sales trend data unavailable." }) });
  }
  return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 160 }, children: /* @__PURE__ */ jsx("div", { style: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f6f6f7",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6d7175"
  }, children: "Sales trend chart (disabled for SSR compatibility)" }) });
}
function SalesSparklineSkeleton() {
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        width: "100%",
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsx(SkeletonThumbnail, { size: "extraLarge" })
    }
  );
}
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: DashboardRoute,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
const KNOWN_CHANNELS = ["online", "pos", "draft"];
const resolveStatus = (status) => {
  switch (status) {
    case "fulfilled":
    case "closed":
      return "fulfilled";
    case "refunded":
      return "refunded";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "paid":
      return "paid";
    default:
      return "processing";
  }
};
const resolveFulfillmentStatus = (status) => {
  switch (status) {
    case "fulfilled":
      return "fulfilled";
    case "awaiting_tracking":
    case "in_transit":
      return "partial";
    default:
      return "unfulfilled";
  }
};
const resolveIssue = (issue) => {
  if (!issue) return "none";
  if (issue === "inventory" || issue === "payment" || issue === "address" || issue === "carrier" || issue === "manual_check") {
    return issue;
  }
  return "manual_check";
};
const resolveTimelineType = (event) => {
  if (event.startsWith("payment")) return "payment";
  if (event.startsWith("fulfillment")) return "fulfillment";
  if (event.includes("support")) return "note";
  return "status";
};
const mapOrders = (items) => items.map((item, index2) => {
  const total = createMoney$1(item.value_usd ?? 0);
  const normalizedChannel = item.channel ?? "online";
  return {
    id: item.id ?? `order-${index2}`,
    name: item.order_number ?? `#${1e3 + index2}`,
    status: resolveStatus(item.status),
    paymentStatus: "paid",
    fulfillmentStatus: resolveFulfillmentStatus(item.status),
    placedAt: item.placed_at ?? (/* @__PURE__ */ new Date()).toISOString(),
    fulfillmentDueAt: item.ship_by ?? void 0,
    shipBy: item.ship_by ?? void 0,
    ageHours: Number.isFinite(item.age_hours) ? Number(item.age_hours) : 0,
    priority: item.priority ?? "standard",
    issue: resolveIssue(item.issue),
    assignedTo: item.assigned_to ?? "unassigned",
    channel: KNOWN_CHANNELS.includes(normalizedChannel) ? normalizedChannel : "online",
    total,
    subtotal: total,
    shipping: createMoney$1(0),
    customer: {
      id: `${item.order_number ?? index2}-customer`,
      name: `Customer ${item.order_number ?? index2}`,
      email: "",
      firstOrderAt: item.placed_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      lastOrderAt: item.placed_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      location: "",
      lifetimeValue: total
    },
    lineItems: [
      {
        id: `${item.id ?? index2}-line-0`,
        title: "Order item",
        sku: "",
        quantity: 1,
        price: total,
        total
      }
    ],
    tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string" && tag.length > 0) : [],
    timeline: (item.timeline ?? []).map((entry2, timelineIndex) => ({
      id: `${item.id ?? index2}-timeline-${timelineIndex}`,
      type: resolveTimelineType(entry2.event ?? "status"),
      message: entry2.details ?? entry2.event ?? "",
      occurredAt: entry2.ts
    })),
    supportThread: item.support_thread ?? void 0
  };
});
const mapMetrics = (metrics) => ({
  totalOrders: metrics.total_orders,
  awaitingFulfillment: metrics.awaiting_fulfillment,
  awaitingTracking: metrics.awaiting_tracking,
  overdue: metrics.overdue,
  overduePercentage: metrics.overdue_pct,
  averageFulfillmentHours: metrics.avg_fulfillment_hours,
  slaBreaches: metrics.breaches
});
const buildOrderLookup = (orders) => {
  const lookup = /* @__PURE__ */ new Map();
  orders.forEach((order) => {
    lookup.set(order.id, order);
    const numericId = order.id.split("/").pop();
    if (numericId) {
      lookup.set(numericId, order);
    }
    lookup.set(order.name, order);
    if (order.name.startsWith("#")) {
      lookup.set(order.name.slice(1), order);
    }
  });
  return lookup;
};
const resolveOrderFromLookup = (lookup, orderId, orderNumber) => {
  if (orderId) {
    const normalizedId = orderId.trim();
    const byId = lookup.get(normalizedId);
    if (byId) return byId;
    const numeric = normalizedId.split("/").pop();
    if (numeric) {
      const byNumeric = lookup.get(numeric);
      if (byNumeric) return byNumeric;
    }
  }
  if (orderNumber) {
    const normalizedNumber = orderNumber.trim();
    const byNumber = lookup.get(normalizedNumber);
    if (byNumber) return byNumber;
    const withoutHash = normalizedNumber.startsWith("#") ? normalizedNumber.slice(1) : normalizedNumber;
    const byWithoutHash = lookup.get(withoutHash);
    if (byWithoutHash) return byWithoutHash;
    if (!normalizedNumber.startsWith("#")) {
      const withHash = lookup.get(`#${normalizedNumber}`);
      if (withHash) return withHash;
    }
  }
  return null;
};
const mapShipments = (shipments, lookup) => ({
  trackingPending: (shipments.tracking_pending ?? []).map((entry2, index2) => {
    const resolvedOrder = resolveOrderFromLookup(lookup, entry2.order_id, entry2.order_number);
    return {
      id: `${entry2.order_number ?? index2}-tracking`,
      orderId: (resolvedOrder == null ? void 0 : resolvedOrder.id) ?? entry2.order_id ?? entry2.order_number ?? `${index2}`,
      orderNumber: (resolvedOrder == null ? void 0 : resolvedOrder.name) ?? entry2.order_number ?? "",
      expectedShipDate: entry2.expected_ship_date ?? (resolvedOrder == null ? void 0 : resolvedOrder.fulfillmentDueAt) ?? (resolvedOrder == null ? void 0 : resolvedOrder.shipBy) ?? "",
      owner: entry2.owner ?? (resolvedOrder == null ? void 0 : resolvedOrder.assignedTo) ?? "assistant"
    };
  }),
  delayed: (shipments.delayed ?? []).map((entry2, index2) => {
    const resolvedOrder = resolveOrderFromLookup(lookup, entry2.order_id, entry2.order_number);
    return {
      id: `${entry2.order_number ?? index2}-delay`,
      orderId: (resolvedOrder == null ? void 0 : resolvedOrder.id) ?? entry2.order_id ?? entry2.order_number ?? `${index2}`,
      orderNumber: (resolvedOrder == null ? void 0 : resolvedOrder.name) ?? entry2.order_number ?? "",
      carrier: entry2.carrier ?? "",
      delayHours: Number.isFinite(entry2.delay_hours) ? Number(entry2.delay_hours) : 0,
      lastUpdate: entry2.last_update ?? (/* @__PURE__ */ new Date()).toISOString()
    };
  }),
  deliveredToday: shipments.delivered_today ?? 0
});
const mapReturns = (returns, lookup) => ({
  pending: (returns.pending ?? []).map((entry2, index2) => {
    const resolvedOrder = resolveOrderFromLookup(lookup, entry2.order_id, entry2.order_number);
    return {
      id: `${entry2.order_number ?? index2}-return`,
      orderId: (resolvedOrder == null ? void 0 : resolvedOrder.id) ?? entry2.order_id ?? entry2.order_number ?? `${index2}`,
      orderNumber: (resolvedOrder == null ? void 0 : resolvedOrder.name) ?? entry2.order_number ?? "",
      reason: entry2.reason ?? "",
      stage: entry2.stage ?? "inspection",
      ageDays: Number.isFinite(entry2.age_days) ? Number(entry2.age_days) : 0,
      refundAmount: createMoney$1(entry2.refund_amount ?? 0)
    };
  }),
  refundsDue: returns.refunds_due ?? 0,
  refundValue: createMoney$1(returns.refund_value_usd ?? 0)
});
const mapInventory = (blocks) => blocks.map((block) => ({
  sku: block.sku,
  title: block.name,
  ordersWaiting: block.orders_waiting,
  onHand: block.on_hand,
  eta: block.eta ?? void 0
}));
const fetchOrdersFromSync = async (params) => {
  const baseUrl = params.baseUrl ?? process.env.SYNC_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("Missing SYNC_SERVICE_URL environment variable");
  }
  const url = new URL("/sync/orders", baseUrl);
  const search = params.search;
  url.searchParams.set("tab", search.tab);
  url.searchParams.set("pageSize", String(search.pageSize));
  if (search.cursor) url.searchParams.set("cursor", search.cursor);
  if (search.direction === "before") url.searchParams.set("direction", "before");
  if (search.status) url.searchParams.set("status", search.status);
  if (search.priority) url.searchParams.set("priority", search.priority);
  if (search.channel) url.searchParams.set("channel", search.channel);
  if (search.assigned_to) url.searchParams.set("assigned_to", search.assigned_to);
  if (search.tag) url.searchParams.set("tag", search.tag);
  if (search.date_start) url.searchParams.set("date_start", search.date_start);
  if (search.date_end) url.searchParams.set("date_end", search.date_end);
  const response = await fetch(url.toString(), {
    signal: params.signal,
    headers: params.shopDomain ? { "X-Shop-Domain": params.shopDomain } : void 0
  });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(`Sync orders request failed (${response.status}): ${text2}`);
  }
  const payload = await response.json();
  const orders = mapOrders(payload.orders.items ?? []);
  const orderLookup = buildOrderLookup(orders);
  const pageInfo = payload.orders.page_info;
  return {
    scenario: "base",
    state: "ok",
    tab: search.tab,
    period: payload.period,
    orders: {
      items: orders,
      count: payload.metrics.total_orders,
      pageInfo: {
        cursor: pageInfo.cursor ?? pageInfo.endCursor ?? null,
        startCursor: pageInfo.startCursor ?? null,
        endCursor: pageInfo.endCursor ?? null,
        nextCursor: pageInfo.nextCursor ?? null,
        previousCursor: pageInfo.previousCursor ?? null,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: pageInfo.hasPreviousPage,
        page: pageInfo.page,
        pageSize: pageInfo.pageSize,
        totalPages: pageInfo.totalPages
      }
    },
    metrics: mapMetrics(payload.metrics),
    shipments: mapShipments(payload.shipments ?? {}, orderLookup),
    returns: mapReturns(payload.returns ?? {}, orderLookup),
    inventory: mapInventory(payload.inventory_blocks ?? []),
    alerts: payload.alerts ?? [],
    dataGaps: payload.data_gaps ?? []
  };
};
const postOrdersSyncAction = async ({
  path,
  payload,
  baseUrl,
  shopDomain,
  signal,
  transformPayload
}) => {
  const resolvedBaseUrl = baseUrl ?? process.env.SYNC_SERVICE_URL;
  if (!resolvedBaseUrl) {
    throw new Error("Missing SYNC_SERVICE_URL environment variable");
  }
  const url = new URL(path, resolvedBaseUrl);
  const bodyPayload = transformPayload ? transformPayload(payload) : payload;
  const response = await fetch(url.toString(), {
    method: "POST",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...shopDomain ? { "X-Shop-Domain": shopDomain } : {}
    },
    body: JSON.stringify({ ...bodyPayload, shop_domain: shopDomain ?? void 0 })
  });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(
      `Sync orders action failed (${response.status} ${response.statusText}): ${text2 || "<empty>"}`
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  const result = await response.json();
  return result ?? {};
};
const TAB_IDS = ["all", "unfulfilled", "overdue", "refunded"];
const TAB_OPTIONS = [
  { id: "all", content: "All" },
  { id: "unfulfilled", content: "Unfulfilled" },
  { id: "overdue", content: "Overdue" },
  { id: "refunded", content: "Refunded" }
];
const STATUS_FILTERS = [
  "awaiting_fulfillment",
  "awaiting_tracking",
  "overdue",
  "holds"
];
const PRIORITY_FILTERS = ["vip", "rush", "standard"];
const CHANNEL_FILTERS = ["online", "pos", "draft"];
const PAGE_SIZE_OPTIONS = [
  { label: "12 / page", value: "12" },
  { label: "24 / page", value: "24" },
  { label: "36 / page", value: "36" },
  { label: "50 / page", value: "50" }
];
const ISSUE_TONE = {
  inventory: "attention",
  payment: "critical",
  address: "warning",
  carrier: "warning",
  manual_check: "info",
  none: "success"
};
const STATUS_TONE = {
  paid: "info",
  processing: "attention",
  fulfilled: "success",
  refunded: "info",
  cancelled: "critical"
};
const FULFILLMENT_TONE = {
  fulfilled: "success",
  partial: "info",
  unfulfilled: "attention"
};
const QuerySchema = z.object({
  tab: z.enum(TAB_IDS).catch("all"),
  pageSize: z.coerce.number().int().min(5).max(50).catch(12),
  cursor: z.string().trim().min(1).max(120).transform((value) => value || void 0).optional().catch(void 0),
  direction: z.enum(["after", "before"]).catch("after"),
  status: z.enum(STATUS_FILTERS).optional().catch(void 0),
  priority: z.enum(PRIORITY_FILTERS).optional().catch(void 0),
  channel: z.enum(CHANNEL_FILTERS).optional().catch(void 0),
  range: z.enum(DASHBOARD_RANGE_KEY_LIST).optional().catch(void 0),
  assigned_to: z.string().trim().min(1).max(120).optional().catch(void 0),
  tag: z.string().trim().min(1).max(120).optional().catch(void 0),
  date_start: z.string().trim().optional().catch(void 0),
  date_end: z.string().trim().optional().catch(void 0)
});
const isValidDate = (value) => {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
};
const loader$5 = async ({ request }) => {
  var _a2;
  const url = new URL(request.url);
  const parsedQuery = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsedQuery.success) {
    console.warn("orders loader: invalid query params", parsedQuery.error.flatten().fieldErrors);
  }
  const query = parsedQuery.success ? parsedQuery.data : QuerySchema.parse({});
  const {
    range: rangeParam,
    tab,
    pageSize,
    cursor: rawCursor,
    direction,
    status,
    priority,
    channel,
    assigned_to: assignedTo,
    tag,
    date_start: rawDateStart,
    date_end: rawDateEnd
  } = query;
  const cursor = rawCursor ?? null;
  const scenario = scenarioFromRequest$1(request);
  const resolvedRangeKey = resolveDashboardRangeKey(
    rangeParam ?? url.searchParams.get("range"),
    DEFAULT_DASHBOARD_RANGE
  );
  const rangeSelection = buildDashboardRangeSelection(resolvedRangeKey);
  let dateStart = isValidDate(rawDateStart) ? rawDateStart : void 0;
  let dateEnd = isValidDate(rawDateEnd) ? rawDateEnd : void 0;
  if (!dateStart) {
    dateStart = rangeSelection.start;
  }
  if (!dateEnd) {
    dateEnd = rangeSelection.end;
  }
  let dataset;
  if (!USE_MOCK_DATA) {
    const { authenticate: authenticate2 } = await Promise.resolve().then(() => shopify_server);
    const auth = await authenticate2.admin(request);
    try {
      dataset = await fetchOrdersFromSync({
        shopDomain: (_a2 = auth == null ? void 0 : auth.session) == null ? void 0 : _a2.shop,
        signal: request.signal,
        search: {
          tab,
          pageSize,
          cursor,
          direction,
          status,
          priority,
          channel,
          assigned_to: assignedTo,
          tag,
          date_start: dateStart,
          date_end: dateEnd
        }
      });
    } catch (error) {
      console.error("orders loader: sync fetch failed", error);
      dataset = getOrdersScenario({
        scenario,
        tab,
        pageSize,
        cursor,
        direction,
        status,
        priority,
        channel,
        assignedTo,
        tag,
        dateStart,
        dateEnd
      });
      dataset.alerts = ["Sync temporarily unavailable — showing mock data", ...dataset.alerts];
      dataset.state = "warning";
    }
  } else {
    dataset = getOrdersScenario({
      scenario,
      tab,
      pageSize,
      cursor,
      direction,
      status,
      priority,
      channel,
      assignedTo,
      tag,
      dateStart,
      dateEnd
    });
  }
  return json(
    { dataset, scenario, useMockData: USE_MOCK_DATA },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$4 = async ({ request }) => {
  var _a2, _b2, _c;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const scenario = scenarioFromRequest$1(request);
  const seed = 0;
  const buildResponse = (success, fallbackMessage, overrides) => {
    var _a3, _b3;
    const message = (overrides == null ? void 0 : overrides.message) ?? ((_a3 = overrides == null ? void 0 : overrides.toast) == null ? void 0 : _a3.message) ?? fallbackMessage;
    const status = ((_b3 = overrides == null ? void 0 : overrides.toast) == null ? void 0 : _b3.status) ?? (success ? "success" : "error");
    return {
      success,
      message,
      toast: {
        status,
        message
      },
      updatedOrders: (overrides == null ? void 0 : overrides.updated) ?? []
    };
  };
  const mergeUpdatedOrders = (...values) => {
    const merged = [];
    const seen = /* @__PURE__ */ new Set();
    values.forEach((value) => {
      if (!value) return;
      const entries = Array.isArray(value) ? value : [value];
      entries.forEach((entry2) => {
        if (!entry2 || typeof entry2 !== "object") return;
        const id = entry2.id;
        if (typeof id !== "string" || seen.has(id)) return;
        seen.add(id);
        merged.push(entry2);
      });
    });
    return merged;
  };
  if (!intent || typeof intent !== "string") {
    const message = "Missing action intent.";
    return json(buildResponse(false, message, { message }), { status: 400 });
  }
  let syncCall = null;
  if (!USE_MOCK_DATA) {
    const { authenticate: authenticate2 } = await Promise.resolve().then(() => shopify_server);
    const auth = await authenticate2.admin(request);
    const shopDomain = ((_a2 = auth == null ? void 0 : auth.session) == null ? void 0 : _a2.shop) ?? null;
    const baseUrl = process.env.SYNC_SERVICE_URL;
    if (!baseUrl) {
      const message = "Missing SYNC_SERVICE_URL configuration.";
      return json(buildResponse(false, message, { message }), { status: 500 });
    }
    syncCall = async (path, payload) => postOrdersSyncAction({
      path,
      payload,
      baseUrl,
      shopDomain,
      signal: request.signal
    });
  }
  const parseIds = () => {
    const idsRaw = formData.get("orderIds");
    if (typeof idsRaw !== "string") return [];
    try {
      const parsed = JSON.parse(idsRaw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return idsRaw.split(",").map((value) => value.trim()).filter(Boolean);
    }
  };
  switch (intent) {
    case "assign": {
      const assignee = formData.get("assignee") ?? "unassigned";
      const ids = parseIds();
      const fallbackMessage = `Assigned ${ids.length} order(s) to ${assignee}.`;
      if (syncCall) {
        try {
          const result = await syncCall(
            "/sync/orders/assign",
            {
              orderIds: ids,
              assignee
            }
          );
          const success = result.success ?? true;
          const updated2 = mergeUpdatedOrders(result.updatedOrders, result.updatedOrder);
          return json(
            buildResponse(success, fallbackMessage, {
              message: result.message,
              toast: result.toast,
              updated: updated2
            })
          );
        } catch (error) {
          console.error("orders assign sync error", error);
          const message = "Failed to assign orders via Sync.";
          return json(buildResponse(false, message, { message }), { status: 502 });
        }
      }
      const updated = assignOrders(scenario, seed, ids, assignee);
      const patches = updated.map((order) => ({
        id: order.id,
        assignedTo: order.assignedTo ?? assignee
      }));
      return json(buildResponse(true, fallbackMessage, { updated: patches }));
    }
    case "markFulfilled": {
      const ids = parseIds();
      const trackingRaw = formData.get("tracking");
      let tracking;
      if (typeof trackingRaw === "string") {
        try {
          const parsed = JSON.parse(trackingRaw);
          if (parsed && parsed.number && parsed.carrier) {
            tracking = {
              number: String(parsed.number),
              carrier: String(parsed.carrier)
            };
          }
        } catch {
        }
      }
      const fallbackMessage = `Marked ${ids.length} order(s) fulfilled${tracking ? ` with tracking ${tracking.number}` : ""}.`;
      if (syncCall) {
        try {
          const result = await syncCall(
            "/sync/orders/fulfill",
            {
              orderIds: ids,
              tracking
            }
          );
          const success = result.success ?? true;
          const updated2 = mergeUpdatedOrders(result.updatedOrders, result.updatedOrder);
          return json(
            buildResponse(success, fallbackMessage, {
              message: result.message,
              toast: result.toast,
              updated: updated2
            })
          );
        } catch (error) {
          console.error("orders fulfill sync error", error);
          const message = "Failed to mark orders fulfilled via Sync.";
          return json(buildResponse(false, message, { message }), { status: 502 });
        }
      }
      const updated = markOrdersFulfilled(scenario, seed, ids, tracking);
      const patches = updated.map((order) => ({
        id: order.id,
        fulfillmentStatus: order.fulfillmentStatus,
        tracking: tracking ?? void 0
      }));
      return json(buildResponse(true, fallbackMessage, { updated: patches }));
    }
    case "requestSupport": {
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        const message2 = "Missing payload for support request.";
        return json(buildResponse(false, message2, { message: message2 }), { status: 400 });
      }
      const payload = JSON.parse(payloadRaw);
      const ids = Array.isArray(payload.orderIds) && payload.orderIds.length ? payload.orderIds.map(String) : payload.orderId ? [String(payload.orderId)] : [];
      if (!ids.length) {
        const message2 = "No orders provided for support request.";
        return json(buildResponse(false, message2, { message: message2 }), { status: 400 });
      }
      const fallbackMessage = `Support requested for ${ids.length} order${ids.length === 1 ? "" : "s"}.`;
      if (syncCall) {
        try {
          const results = await Promise.all(
            ids.map(
              (id) => syncCall(
                "/sync/orders/support",
                {
                  orderId: id,
                  conversationId: payload.conversationId,
                  note: payload.note
                }
              )
            )
          );
          const success2 = results.every((result) => result.success ?? true);
          const updated2 = mergeUpdatedOrders(
            ...results.map((result) => result.updatedOrders),
            ...results.map((result) => result.updatedOrder)
          );
          const firstMessage = (_b2 = results.find((result) => Boolean(result.message))) == null ? void 0 : _b2.message;
          const firstToast = (_c = results.find((result) => {
            var _a3;
            return (_a3 = result.toast) == null ? void 0 : _a3.message;
          })) == null ? void 0 : _c.toast;
          return json(
            buildResponse(success2, fallbackMessage, {
              message: firstMessage,
              toast: firstToast,
              updated: updated2
            })
          );
        } catch (error) {
          console.error("orders support sync error", error);
          const message2 = "Failed to request support via Sync.";
          return json(buildResponse(false, message2, { message: message2 }), { status: 502 });
        }
      }
      const updated = ids.map(
        (id) => requestSupport(scenario, seed, {
          orderId: id,
          conversationId: payload.conversationId,
          note: payload.note
        })
      ).filter((order) => Boolean(order));
      const success = updated.length === ids.length;
      const message = updated.length ? `Support requested for ${updated.length} order${updated.length === 1 ? "" : "s"}.` : "Order not found.";
      const patches = updated.map((order) => ({
        id: order.id,
        supportThread: order.supportThread ?? payload.conversationId ?? `conversation:${order.id}`
      }));
      return json(buildResponse(success, message, { message, updated: patches }));
    }
    case "updateReturn": {
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        const message2 = "Missing payload for return update.";
        return json(buildResponse(false, message2, { message: message2 }), { status: 400 });
      }
      const payload = JSON.parse(payloadRaw);
      const fallbackMessage = `Return updated (${payload.action}) for ${payload.orderId}.`;
      if (syncCall) {
        try {
          const result2 = await syncCall(
            "/sync/orders/returns",
            payload
          );
          const success2 = result2.success ?? true;
          const updated = mergeUpdatedOrders(result2.updatedOrders, result2.updatedOrder);
          return json(
            buildResponse(success2, fallbackMessage, {
              message: result2.message,
              toast: result2.toast,
              updated
            })
          );
        } catch (error) {
          console.error("orders return sync error", error);
          const message2 = "Failed to update return via Sync.";
          return json(buildResponse(false, message2, { message: message2 }), { status: 502 });
        }
      }
      const result = updateReturnAction(scenario, seed, payload);
      const success = Boolean(result);
      const message = success ? fallbackMessage : "Return not found.";
      return json(buildResponse(success, fallbackMessage, { message, updated: [] }));
    }
    default: {
      const message = `Unknown intent: ${intent}`;
      return json(buildResponse(false, message, { message }), { status: 400 });
    }
  }
};
const PRIORITY_TONE = {
  vip: "critical",
  rush: "warning",
  standard: "success"
};
function OrdersRoute() {
  var _a2, _b2, _c;
  const { dataset, scenario, useMockData } = useLoaderData();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [assignTarget, setAssignTarget] = useState("assistant");
  const [toast, setToast] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportNote, setSupportNote] = useState("");
  const { mdUp } = useBreakpoints();
  const [alerts, setAlerts] = useState(dataset.alerts);
  const [dataGaps, setDataGaps] = useState(dataset.dataGaps);
  const eventSourceRef = useRef(null);
  const reconnectRef = useRef(null);
  const { orders: optimisticOrders, lookup: ordersById } = useOptimisticOrders({
    baseOrders: dataset.orders.items,
    submission: fetcher.submission,
    response: fetcher.data
  });
  const rangeValue = resolveDashboardRangeKey(
    searchParams.get("range"),
    DEFAULT_DASHBOARD_RANGE
  );
  const channelValue = searchParams.get("channel") ?? "all";
  const ownerValue = searchParams.get("assigned_to") ?? "all";
  const tagValue = searchParams.get("tag") ?? "all";
  const rangeOptions = useMemo(() => DASHBOARD_RANGE_OPTIONS, []);
  const channelOptions = useMemo(
    () => [
      { label: "All channels", value: "all" },
      { label: "Online", value: "online" },
      { label: "POS", value: "pos" },
      { label: "Draft", value: "draft" }
    ],
    []
  );
  const ownerOptions = useMemo(() => {
    const owners = /* @__PURE__ */ new Set();
    optimisticOrders.forEach((order) => {
      if (order.assignedTo) {
        owners.add(order.assignedTo);
      }
    });
    const sorted = Array.from(owners).sort((a, b) => a.localeCompare(b));
    return [
      { label: "All owners", value: "all" },
      ...sorted.map((owner) => ({ label: formatOwner(owner), value: owner })),
      { label: "Unassigned", value: "unassigned" }
    ].filter((option, index2, array) => {
      return array.findIndex((entry2) => entry2.value === option.value) === index2;
    });
  }, [optimisticOrders]);
  const tagOptions = useMemo(() => {
    const tags = /* @__PURE__ */ new Set();
    optimisticOrders.forEach((order) => {
      order.tags.forEach((tag) => {
        if (tag) {
          tags.add(tag);
        }
      });
    });
    const sorted = Array.from(tags).sort((a, b) => a.localeCompare(b));
    return [
      { label: "All tags", value: "all" },
      ...sorted.map((tag) => ({ label: tag, value: tag }))
    ];
  }, [optimisticOrders]);
  const activeFilters = useMemo(
    () => [
      channelValue !== "all" ? { key: "channel", label: `Channel: ${formatChannel$1(channelValue)}` } : null,
      ownerValue !== "all" ? { key: "assigned_to", label: `Owner: ${formatOwner(ownerValue)}` } : null,
      tagValue !== "all" ? { key: "tag", label: `Tag: ${tagValue}` } : null
    ].filter(Boolean),
    [channelValue, ownerValue, tagValue]
  );
  const updateSearchParams = useCallback(
    (updater) => {
      const params = new URLSearchParams(searchParams);
      updater(params);
      params.delete("cursor");
      params.delete("direction");
      const nextSearch = params.toString();
      navigate(
        nextSearch ? `${location.pathname}?${nextSearch}` : location.pathname,
        { replace: true }
      );
    },
    [location.pathname, navigate, searchParams]
  );
  const handleRangeChange = useCallback(
    (value) => {
      updateSearchParams((params) => {
        params.set("range", value);
        params.delete("date_start");
        params.delete("date_end");
      });
    },
    [updateSearchParams]
  );
  const handleChannelChange = useCallback(
    (value) => {
      updateSearchParams((params) => {
        if (value === "all") {
          params.delete("channel");
        } else {
          params.set("channel", value);
        }
      });
    },
    [updateSearchParams]
  );
  const handleOwnerChange = useCallback(
    (value) => {
      updateSearchParams((params) => {
        if (value === "all") {
          params.delete("assigned_to");
        } else {
          params.set("assigned_to", value);
        }
      });
    },
    [updateSearchParams]
  );
  const handleTagChange = useCallback(
    (value) => {
      updateSearchParams((params) => {
        if (value === "all") {
          params.delete("tag");
        } else {
          params.set("tag", value);
        }
      });
    },
    [updateSearchParams]
  );
  const handleFilterRemove = useCallback(
    (key) => {
      updateSearchParams((params) => {
        params.delete(key);
      });
    },
    [updateSearchParams]
  );
  const selectedIndex = Math.max(
    TAB_OPTIONS.findIndex((tab) => tab.id === dataset.tab),
    0
  );
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection
  } = useIndexResourceState(optimisticOrders, {
    resourceIDResolver: (resource) => resource.id
  });
  const selectedOrderCount = useMemo(() => selectedResources.length, [selectedResources]);
  const activeOrder = activeOrderId ? ordersById.get(activeOrderId) ?? null : null;
  useEffect(() => {
    if (activeOrderId && !activeOrder) {
      setActiveOrderId(null);
    }
  }, [activeOrder, activeOrderId]);
  const fetcherIntentRaw = (_a2 = fetcher.submission) == null ? void 0 : _a2.formData.get("intent");
  const actionState = useMemo(
    () => ({
      intent: typeof fetcherIntentRaw === "string" ? fetcherIntentRaw : null,
      isBusy: fetcher.state !== "idle"
    }),
    [fetcher.state, fetcherIntentRaw]
  );
  const isRequestSupportBusy = actionState.isBusy && actionState.intent === "requestSupport";
  const selectedOrderLabels = useMemo(() => {
    if (!selectedResources.length) return [];
    const nameMap = /* @__PURE__ */ new Map();
    optimisticOrders.forEach((order) => {
      nameMap.set(order.id, order.name);
    });
    return selectedResources.map((id) => nameMap.get(id) ?? id);
  }, [optimisticOrders, selectedResources]);
  const handleTabChange = useCallback(
    (index2) => {
      updateSearchParams((params) => {
        params.set("tab", TAB_OPTIONS[index2].id);
      });
    },
    [updateSearchParams]
  );
  useEffect(() => {
    setAlerts(dataset.alerts);
    setDataGaps(dataset.dataGaps);
  }, [dataset.alerts, dataset.dataGaps]);
  useEffect(() => {
    if (useMockData || typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const source = new EventSource("/sync/orders/alerts");
      eventSourceRef.current = source;
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data ?? "{}");
          if (payload == null ? void 0 : payload.message) {
            setAlerts(
              (current) => current.includes(payload.message) ? current : [payload.message, ...current]
            );
            setToast({
              status: typeof payload.status === "string" && payload.status.length > 0 ? payload.status : "info",
              message: String(payload.message)
            });
          }
          if ((payload == null ? void 0 : payload.type) === "data_gap" && (payload == null ? void 0 : payload.message)) {
            setDataGaps(
              (current) => current.includes(payload.message) ? current : [payload.message, ...current]
            );
          }
        } catch (error) {
          console.warn("orders alerts stream parse error", error);
        }
        revalidator.revalidate();
      };
      source.onerror = () => {
        source.close();
        if (cancelled) return;
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
        }
        reconnectRef.current = setTimeout(connect, 5e3);
      };
    };
    connect();
    return () => {
      var _a3;
      cancelled = true;
      (_a3 = eventSourceRef.current) == null ? void 0 : _a3.close();
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
  }, [revalidator, useMockData]);
  useEffect(() => {
    if (!fetcher.data) return;
    const { toast: responseToast, message, success } = fetcher.data;
    const nextToast = (responseToast == null ? void 0 : responseToast.message) ? {
      status: responseToast.status ?? (success ? "success" : "error"),
      message: responseToast.message
    } : message ? { status: success ? "success" : "error", message } : null;
    if (nextToast) {
      setToast(nextToast);
    }
    clearSelection();
    revalidator.revalidate();
  }, [fetcher.data, clearSelection, revalidator]);
  const metrics = dataset.metrics;
  const pageInfo = dataset.orders.pageInfo;
  const nextCursor = pageInfo.nextCursor;
  const previousCursor = pageInfo.previousCursor;
  const canGoNext = pageInfo.hasNextPage && Boolean(nextCursor);
  const canGoPrevious = pageInfo.hasPreviousPage;
  const pageSizeValue = String(pageInfo.pageSize);
  const totalOrdersCount = dataset.orders.count;
  const hasOrders = optimisticOrders.length > 0;
  const firstItemIndex = hasOrders ? (Math.max(pageInfo.page, 1) - 1) * pageInfo.pageSize + 1 : 0;
  const lastItemIndex = hasOrders ? Math.min(totalOrdersCount, firstItemIndex + optimisticOrders.length - 1) : 0;
  const pageSummary = hasOrders ? `${firstItemIndex}-${lastItemIndex} of ${totalOrdersCount}` : `0 of ${totalOrdersCount}`;
  const pageLabel = `Page ${Math.min(pageInfo.page, pageInfo.totalPages)} of ${pageInfo.totalPages}`;
  const pageSizeOptions = useMemo(() => {
    if (PAGE_SIZE_OPTIONS.some((option) => option.value === pageSizeValue)) {
      return PAGE_SIZE_OPTIONS;
    }
    return [...PAGE_SIZE_OPTIONS, { label: `${pageSizeValue} / page`, value: pageSizeValue }];
  }, [pageSizeValue]);
  const handleAssign = () => {
    if (!selectedOrderCount) return;
    fetcher.submit(
      {
        intent: "assign",
        orderIds: JSON.stringify(selectedResources),
        assignee: assignTarget
      },
      { method: "post" }
    );
  };
  const handleSupportClose = useCallback(() => {
    setSupportModalOpen(false);
    setSupportNote("");
  }, []);
  const handleSupportSubmit = useCallback(() => {
    if (!selectedOrderCount) return;
    const trimmed = supportNote.trim();
    const summary = selectedOrderLabels.slice(0, 3).join(", ");
    const defaultNote = summary ? `Follow-up requested for ${summary}${selectedOrderLabels.length > 3 ? ` (+${selectedOrderLabels.length - 3} more)` : ""}.` : "Follow-up requested from dashboard.";
    fetcher.submit(
      {
        intent: "requestSupport",
        payload: JSON.stringify({
          orderIds: selectedResources,
          note: trimmed || defaultNote
        })
      },
      { method: "post" }
    );
    setSupportModalOpen(false);
    setSupportNote("");
  }, [fetcher, selectedOrderCount, selectedOrderLabels, selectedResources, supportNote]);
  const handlePageSizeChange = useCallback(
    (value) => {
      const params = new URLSearchParams(searchParams);
      params.set("pageSize", value);
      params.delete("cursor");
      params.delete("direction");
      navigate(`?${params.toString()}`);
    },
    [navigate, searchParams]
  );
  const handleNextPage = useCallback(() => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("cursor", nextCursor);
    params.set("direction", "after");
    navigate(`?${params.toString()}`);
  }, [navigate, nextCursor, searchParams]);
  const handlePreviousPage = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (previousCursor) {
      params.set("cursor", previousCursor);
      params.set("direction", "before");
    } else {
      params.delete("cursor");
      params.delete("direction");
    }
    navigate(`?${params.toString()}`);
  }, [navigate, previousCursor, searchParams]);
  const handleMarkFulfilled = () => {
    if (!selectedOrderCount) return;
    const first = selectedResources[0] ?? "";
    const trackingNumber = `TRK-${first.slice(-4).toUpperCase() || "0000"}`;
    fetcher.submit(
      {
        intent: "markFulfilled",
        orderIds: JSON.stringify(selectedResources),
        tracking: JSON.stringify({ number: trackingNumber, carrier: "UPS" })
      },
      { method: "post" }
    );
  };
  const handleShipmentAddTracking = useCallback(
    (shipment) => {
      const targetId = shipment.orderId;
      if (!targetId) {
        setToast({ status: "error", message: "Unable to add tracking — missing order reference." });
        return;
      }
      const sanitized = shipment.orderNumber.replace(/[^0-9A-Z]/gi, "");
      const suffix = sanitized.slice(-4).padStart(4, "0");
      const trackingNumber = `TRK-${suffix || "0000"}`;
      fetcher.submit(
        {
          intent: "markFulfilled",
          orderIds: JSON.stringify([targetId]),
          tracking: JSON.stringify({ number: trackingNumber, carrier: "UPS" })
        },
        { method: "post" }
      );
    },
    [fetcher, setToast]
  );
  const handleShipmentFollowUp = useCallback(
    (shipment) => {
      const targetId = shipment.orderId;
      if (!targetId) {
        setToast({ status: "error", message: "Unable to request support — missing order reference." });
        return;
      }
      const note = `Carrier ${shipment.carrier ?? "Unknown"} delayed ${shipment.delayHours}h (last update ${formatDateTime$1(shipment.lastUpdate)}).`;
      fetcher.submit(
        {
          intent: "requestSupport",
          payload: JSON.stringify({ orderIds: [targetId], note })
        },
        { method: "post" }
      );
    },
    [fetcher, setToast]
  );
  const handleReturnAction = useCallback(
    (entry2, action2) => {
      if (!entry2.orderId) {
        setToast({ status: "error", message: "Unable to update return — missing order reference." });
        return;
      }
      const note = action2 === "approve_refund" ? "Refund approved from dashboard orders." : action2 === "request_inspection" ? "Inspection requested before refund approval." : "Return denied from dashboard orders.";
      fetcher.submit(
        {
          intent: "updateReturn",
          payload: JSON.stringify({ orderId: entry2.orderId, action: action2, note })
        },
        { method: "post" }
      );
    },
    [fetcher, setToast]
  );
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Orders",
      subtitle: "Monitor fulfillment backlog, shipment health, and returns.",
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Orders", primaryAction: { content: "Export CSV", url: "#" } }),
        /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (alerts.length || dataGaps.length || useMockData) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            useMockData && /* @__PURE__ */ jsx(Banner, { tone: scenario === "warning" ? "warning" : "info", title: `Mock state: ${scenario}`, children: /* @__PURE__ */ jsx("p", { children: "Append `mockState=warning` (etc) to preview additional states." }) }),
            alerts.map((alert, index2) => /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Fulfillment alert", children: /* @__PURE__ */ jsx("p", { children: alert }) }, `alert-${index2}`)),
            dataGaps.map((gap, index2) => /* @__PURE__ */ jsx(Banner, { tone: "attention", title: "Data gap", children: /* @__PURE__ */ jsx("p", { children: gap }) }, `gap-${index2}`))
          ] }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", wrap: true, children: [
              /* @__PURE__ */ jsx(
                Select,
                {
                  labelHidden: true,
                  label: "Date range",
                  options: rangeOptions,
                  value: rangeValue,
                  onChange: handleRangeChange
                }
              ),
              /* @__PURE__ */ jsx(
                Select,
                {
                  labelHidden: true,
                  label: "Channel",
                  options: channelOptions,
                  value: channelValue,
                  onChange: handleChannelChange
                }
              ),
              /* @__PURE__ */ jsx(
                Select,
                {
                  labelHidden: true,
                  label: "Owner",
                  options: ownerOptions,
                  value: ownerValue,
                  onChange: handleOwnerChange
                }
              ),
              /* @__PURE__ */ jsx(
                Select,
                {
                  labelHidden: true,
                  label: "Tag",
                  options: tagOptions,
                  value: tagValue,
                  onChange: handleTagChange,
                  disabled: tagOptions.length <= 1
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: dataset.period.label }),
              activeFilters.length > 0 && /* @__PURE__ */ jsx(InlineStack, { gap: "100", wrap: true, children: activeFilters.map((filter) => /* @__PURE__ */ jsx(Tag, { onRemove: () => handleFilterRemove(filter.key), children: filter.label }, filter.key)) })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsx(FulfillmentPulseCard, { metrics }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Tabs, { tabs: TAB_OPTIONS, selected: selectedIndex, onSelect: handleTabChange, fitted: true }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    labelHidden: true,
                    label: "Assign to",
                    options: AssignOptions,
                    value: assignTarget,
                    onChange: (value) => setAssignTarget(value)
                  }
                ),
                /* @__PURE__ */ jsxs(ButtonGroup, { children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      disabled: !selectedOrderCount,
                      onClick: handleAssign,
                      loading: fetcher.state !== "idle" && ((_b2 = fetcher.submission) == null ? void 0 : _b2.formData.get("intent")) === "assign",
                      children: "Assign"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      disabled: !selectedOrderCount,
                      onClick: handleMarkFulfilled,
                      loading: fetcher.state !== "idle" && ((_c = fetcher.submission) == null ? void 0 : _c.formData.get("intent")) === "markFulfilled",
                      children: "Mark fulfilled"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      disabled: !selectedOrderCount,
                      onClick: () => setSupportModalOpen(true),
                      loading: isRequestSupportBusy,
                      children: "Request follow-up"
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              IndexTable,
              {
                resourceName: { singular: "order", plural: "orders" },
                itemCount: optimisticOrders.length,
                selectedItemsCount: allResourcesSelected ? "All" : selectedResources.length,
                onSelectionChange: handleSelectionChange,
                headings: mdUp ? IndexHeadingsDesktop : IndexHeadingsMobile,
                children: optimisticOrders.map((order, index2) => /* @__PURE__ */ jsxs(
                  IndexTable.Row,
                  {
                    id: order.id,
                    position: index2,
                    onClick: () => setActiveOrderId(order.id),
                    children: [
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                        /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", as: "span", children: order.name }),
                        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                          /* @__PURE__ */ jsx(Badge, { tone: PRIORITY_TONE[order.priority], children: order.priority }),
                          /* @__PURE__ */ jsx(Text, { as: "span", tone: "subdued", variant: "bodySm", children: order.customer.name })
                        ] })
                      ] }) }),
                      mdUp && /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Badge, { tone: order.issue === "none" ? "success" : "warning", children: order.issue }) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "span", children: order.total.formatted }) }),
                      mdUp && /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: formatDate$1(order.shipBy ?? order.fulfillmentDueAt) }) }),
                      /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "span", children: [
                        order.ageHours.toFixed(1),
                        "h ago"
                      ] }) }),
                      mdUp && /* @__PURE__ */ jsx(IndexTable.Cell, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: order.assignedTo }) })
                    ]
                  },
                  order.id
                ))
              }
            ),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: pageSummary }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    labelHidden: true,
                    label: "Rows per page",
                    options: pageSizeOptions,
                    value: pageSizeValue,
                    onChange: handlePageSizeChange
                  }
                ),
                /* @__PURE__ */ jsx(
                  Pagination,
                  {
                    label: pageLabel,
                    hasPrevious: canGoPrevious,
                    onPrevious: handlePreviousPage,
                    hasNext: canGoNext,
                    onNext: handleNextPage
                  }
                )
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(Grid, { columns: { xs: 1, md: 2 }, gap: "400", children: [
            /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsx(
              ShipmentsCard,
              {
                shipments: dataset.shipments,
                onAddTracking: handleShipmentAddTracking,
                onTriggerFollowUp: handleShipmentFollowUp,
                actionState
              }
            ) }),
            /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsx(
              ReturnsCard,
              {
                returns: dataset.returns,
                onHandleReturn: handleReturnAction,
                actionState
              }
            ) })
          ] }),
          /* @__PURE__ */ jsx(OperationalNotes, { inventory: dataset.inventory, alerts })
        ] }) }) }),
        toast && /* @__PURE__ */ jsx(
          Toast,
          {
            content: toast.message,
            duration: 3e3,
            error: toast.status === "error",
            onDismiss: () => setToast(null)
          }
        ),
        /* @__PURE__ */ jsx(
          Modal,
          {
            open: supportModalOpen,
            onClose: handleSupportClose,
            title: `Request support${selectedOrderCount > 1 ? ` (${selectedOrderCount})` : ""}`,
            primaryAction: {
              content: selectedOrderCount > 1 ? "Send requests" : "Send request",
              onAction: handleSupportSubmit,
              loading: isRequestSupportBusy,
              disabled: !selectedOrderCount || isRequestSupportBusy
            },
            secondaryActions: [{ content: "Cancel", onAction: handleSupportClose, disabled: isRequestSupportBusy }],
            children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              selectedOrderLabels.length > 0 && /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                "Target orders: ",
                selectedOrderLabels.join(", ")
              ] }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Note for support",
                  value: supportNote,
                  onChange: setSupportNote,
                  multiline: 4,
                  autoComplete: "off",
                  placeholder: "Include context, blockers, or next steps for support."
                }
              )
            ] }) })
          }
        ),
        /* @__PURE__ */ jsx(OrderDetailModal, { order: activeOrder, onClose: () => setActiveOrderId(null) })
      ]
    }
  );
}
const AssignOptions = [
  { label: "Assistant", value: "assistant" },
  { label: "Ops team", value: "ops" },
  { label: "Unassigned", value: "unassigned" }
];
const IndexHeadingsDesktop = [
  { title: "Order" },
  { title: "Issue" },
  { title: "Value" },
  { title: "Ship by" },
  { title: "Age" },
  { title: "Owner" }
];
const IndexHeadingsMobile = [
  { title: "Order" },
  { title: "Value" },
  { title: "Age" }
];
const formatDate$1 = (value) => value ? new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
}).format(new Date(value)) : "—";
const formatDateTime$1 = (value) => value ? new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
}).format(new Date(value)) : "—";
const inventoryHoldTone = (entry2) => {
  if (entry2.onHand <= 0) {
    return "critical";
  }
  if (entry2.ordersWaiting > entry2.onHand) {
    return "warning";
  }
  return "attention";
};
const inventoryHoldSuggestion = (entry2) => {
  if (entry2.onHand <= 0) {
    return "No stock on hand — escalate the purchase order or reroute impacted orders.";
  }
  const deficit = entry2.ordersWaiting - entry2.onHand;
  if (deficit > 0) {
    return `${deficit} unit${deficit === 1 ? "" : "s"} short — split shipments or recommend alternates until restock arrives.`;
  }
  if (entry2.ordersWaiting === 0) {
    return "Inventory is clear — confirm the block is lifted in fulfillment.";
  }
  return "Sufficient stock to cover waiting orders — coordinate pick/pack to release the hold.";
};
const toTitleCase$1 = (value) => value.split(/[-_\s]+/).filter(Boolean).map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
function formatOwner(value) {
  if (!value) return "Unassigned";
  if (value === "assistant") return "Assistant";
  if (value === "unassigned") return "Unassigned";
  return toTitleCase$1(value);
}
function formatChannel$1(value) {
  switch (value) {
    case "online":
      return "Online";
    case "pos":
      return "POS";
    case "draft":
      return "Draft";
    default:
      return toTitleCase$1(value);
  }
}
function FulfillmentPulseCard({ metrics }) {
  const rows = [
    ["Total orders", String(metrics.totalOrders), void 0],
    ["Awaiting fulfillment", String(metrics.awaitingFulfillment), metrics.awaitingFulfillment > 0 ? "attention" : "success"],
    ["Awaiting tracking", String(metrics.awaitingTracking), metrics.awaitingTracking > 0 ? "warning" : "success"],
    ["Overdue", `${metrics.overdue} (${metrics.overduePercentage.toFixed(0)}%)`, metrics.overdue > 0 ? "critical" : "success"],
    ["Avg fulfillment time", `${metrics.averageFulfillmentHours.toFixed(1)}h`, void 0],
    ["SLA breaches", String(metrics.slaBreaches), metrics.slaBreaches ? "critical" : "success"]
  ];
  return /* @__PURE__ */ jsx(Card, { title: "Fulfillment pulse", children: /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsx(Grid, { columns: { xs: 1, sm: 2, md: 3 }, gap: "200", children: rows.map(([label2, value, tone]) => /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", tone: "subdued", variant: "bodySm", children: label2 }),
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingSm", children: value }),
    tone && /* @__PURE__ */ jsx(Badge, { tone, children: "Action needed" })
  ] }) }, label2)) }) }) });
}
function ShipmentsCard({
  shipments,
  onAddTracking,
  onTriggerFollowUp,
  actionState
}) {
  const trackingBusy = actionState.isBusy && actionState.intent === "markFulfilled";
  const followUpBusy = actionState.isBusy && actionState.intent === "requestSupport";
  return /* @__PURE__ */ jsxs(Card, { title: "Shipments", children: [
    /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
        /* @__PURE__ */ jsxs(Text, { variant: "headingSm", as: "h3", children: [
          "Tracking pending (",
          shipments.trackingPending.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
          "Delivered today: ",
          shipments.deliveredToday
        ] })
      ] }),
      shipments.trackingPending.length ? /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: shipments.trackingPending.map((entry2) => /* @__PURE__ */ jsxs(
        InlineStack,
        {
          align: "space-between",
          blockAlign: "center",
          wrap: true,
          gap: "200",
          children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", as: "span", children: entry2.orderNumber }),
              /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                "Expected ",
                formatDate$1(entry2.expectedShipDate),
                " · Owner ",
                formatOwner(entry2.owner)
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => onAddTracking(entry2),
                disabled: trackingBusy,
                loading: trackingBusy,
                variant: "primary",
                children: "Add tracking"
              }
            )
          ]
        },
        entry2.id
      )) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "No tracking items pending." })
    ] }) }),
    /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
    /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ jsxs(Text, { variant: "headingSm", as: "h3", children: [
        "Delayed (",
        shipments.delayed.length,
        ")"
      ] }),
      shipments.delayed.length ? /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: shipments.delayed.map((entry2) => /* @__PURE__ */ jsxs(
        InlineStack,
        {
          align: "space-between",
          blockAlign: "center",
          wrap: true,
          gap: "200",
          children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", as: "span", children: entry2.orderNumber }),
              /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                entry2.carrier,
                " delay ",
                entry2.delayHours,
                "h · Last update ",
                formatDateTime$1(entry2.lastUpdate)
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => onTriggerFollowUp(entry2),
                disabled: followUpBusy,
                loading: followUpBusy,
                children: "Trigger follow-up"
              }
            )
          ]
        },
        entry2.id
      )) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "No carrier delays." })
    ] }) })
  ] });
}
function ReturnsCard({
  returns,
  onHandleReturn,
  actionState
}) {
  const returnBusy = (action2) => actionState.isBusy && actionState.intent === action2;
  return /* @__PURE__ */ jsxs(Card, { title: "Returns & refunds", children: [
    /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
      "Refund exposure ",
      returns.refundValue.formatted,
      " • Pending approvals ",
      returns.refundsDue
    ] }) }),
    /* @__PURE__ */ jsx(Card.Section, { children: returns.pending.length ? /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: returns.pending.map((entry2) => /* @__PURE__ */ jsx(BlockStack, { gap: "150", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, gap: "200", children: [
      /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
        /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", as: "span", children: entry2.orderNumber }),
        /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
          "Stage ",
          entry2.stage.replace(/_/g, " "),
          " · Reason ",
          entry2.reason,
          " · Age ",
          entry2.ageDays.toFixed(1),
          "d"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(ButtonGroup, { children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            onClick: () => onHandleReturn(entry2, "approve_refund"),
            loading: returnBusy("updateReturn"),
            disabled: returnBusy("updateReturn"),
            children: "Approve refund"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            onClick: () => onHandleReturn(entry2, "request_inspection"),
            loading: returnBusy("updateReturn"),
            disabled: returnBusy("updateReturn"),
            children: "Request inspection"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            tone: "critical",
            onClick: () => onHandleReturn(entry2, "deny"),
            loading: returnBusy("updateReturn"),
            disabled: returnBusy("updateReturn"),
            children: "Deny"
          }
        )
      ] })
    ] }) }, entry2.id)) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "No returns pending." }) })
  ] });
}
function OperationalNotes({
  inventory,
  alerts
}) {
  return /* @__PURE__ */ jsxs(Card, { title: "Operational notes", children: [
    /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Inventory blocks" }),
      inventory.length ? /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: inventory.map((item, index2) => /* @__PURE__ */ jsxs(BlockStack, { gap: "150", children: [
        index2 > 0 ? /* @__PURE__ */ jsx(Divider, { borderColor: "border" }) : null,
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "start", gap: "200", wrap: true, children: [
          /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", fontWeight: "semibold", as: "span", children: [
                item.sku,
                " — ",
                item.title
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "150", wrap: true, children: [
                /* @__PURE__ */ jsxs(Badge, { tone: inventoryHoldTone(item), children: [
                  item.ordersWaiting,
                  " waiting"
                ] }),
                /* @__PURE__ */ jsxs(Badge, { tone: item.onHand > 0 ? "info" : "critical", children: [
                  item.onHand,
                  " on hand"
                ] }),
                /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                  "ETA ",
                  formatDate$1(item.eta)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "p", children: inventoryHoldSuggestion(item) })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "plain",
              url: `/app/inventory?sku=${encodeURIComponent(item.sku)}`,
              children: "Review in inventory"
            }
          )
        ] })
      ] }, item.sku)) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "No inventory holds." })
    ] }) }),
    alerts.length > 0 && /* @__PURE__ */ jsxs(Card.Section, { children: [
      /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Alerts" }),
      /* @__PURE__ */ jsx(BlockStack, { gap: "100", children: alerts.map((alert, index2) => /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
        "• ",
        alert
      ] }, index2)) })
    ] })
  ] });
}
function OrderDetailModal({ order, onClose }) {
  if (!order) return null;
  const lineItemRows = order.lineItems.map((item) => [
    item.title,
    item.sku,
    `${item.quantity} × ${item.price.formatted}`,
    item.total.formatted
  ]);
  const hasLineItems = lineItemRows.length > 0;
  const tags = order.tags.filter(Boolean);
  const supportThreadLink = order.supportThread ? `/app/inbox?conversation=${encodeURIComponent(order.supportThread)}` : null;
  return /* @__PURE__ */ jsxs(
    Modal,
    {
      instant: true,
      open: true,
      onClose,
      title: `Order ${order.name}`,
      primaryAction: { content: "Close", onAction: onClose },
      children: [
        /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: order.name }),
              /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                "Placed ",
                formatDateTime$1(order.placedAt),
                " · ",
                order.channel.toUpperCase()
              ] })
            ] }),
            /* @__PURE__ */ jsx(Badge, { tone: PRIORITY_TONE[order.priority], children: order.priority })
          ] }),
          /* @__PURE__ */ jsxs(Grid, { columns: { xs: 1, sm: 2 }, gap: "200", children: [
            /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "Status" }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "100", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(Badge, { tone: STATUS_TONE[order.status], children: order.status }),
                /* @__PURE__ */ jsxs(Badge, { tone: FULFILLMENT_TONE[order.fulfillmentStatus], children: [
                  "Fulfillment: ",
                  order.fulfillmentStatus
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "Issue" }),
              /* @__PURE__ */ jsx(Badge, { tone: ISSUE_TONE[order.issue], children: order.issue === "none" ? "No active issue" : order.issue.replace(/_/g, " ") })
            ] }) }),
            /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "Owner" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: order.assignedTo ?? "unassigned" }),
              /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                order.ageHours.toFixed(1),
                "h in queue"
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Grid.Cell, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "Ship by" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: formatDate$1(order.shipBy ?? order.fulfillmentDueAt) }),
              /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                "Order value ",
                order.total.formatted
              ] })
            ] }) })
          ] }),
          tags.length > 0 && /* @__PURE__ */ jsx(InlineStack, { gap: "100", children: tags.map((tag) => /* @__PURE__ */ jsx(Tag, { children: tag }, tag)) })
        ] }) }),
        /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
        /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Customer" }),
            /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
              "Lifetime value ",
              order.customer.lifetimeValue.formatted
            ] })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: order.customer.name }),
            /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: order.customer.email }),
            /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: order.customer.location })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
              "First order ",
              formatDate$1(order.customer.firstOrderAt)
            ] }),
            /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
              "Last order ",
              formatDate$1(order.customer.lastOrderAt)
            ] })
          ] })
        ] }) }),
        hasLineItems && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
          /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Items" }),
              /* @__PURE__ */ jsxs(Text, { tone: "subdued", variant: "bodySm", as: "span", children: [
                "Subtotal ",
                order.subtotal.formatted,
                " · Shipping ",
                order.shipping.formatted
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "text", "text", "text"],
                headings: ["Product", "SKU", "Qty × Price", "Total"],
                rows: lineItemRows
              }
            )
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
        /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Fulfillment timeline" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", align: "start", children: [
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "Support thread" }),
              order.supportThread && supportThreadLink ? /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "plain",
                  url: supportThreadLink,
                  accessibilityLabel: `Open support thread ${order.supportThread}`,
                  children: order.supportThread
                }
              ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "Not linked" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "100", children: order.timeline.length ? order.timeline.map((event) => /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", as: "span", children: event.message }),
            /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: formatDateTime$1(event.occurredAt) })
          ] }, event.id)) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: "No events recorded yet." }) })
        ] }) })
      ]
    }
  );
}
function useOptimisticOrders({ baseOrders, submission, response }) {
  const [optimisticOrders, setOptimisticOrders] = useState(baseOrders);
  const lastSubmissionRef = useRef(null);
  const lastResponseRef = useRef(null);
  useEffect(() => {
    setOptimisticOrders(baseOrders);
  }, [baseOrders]);
  useEffect(() => {
    if (!submission || submission === lastSubmissionRef.current) {
      return;
    }
    lastSubmissionRef.current = submission;
    const intent = submission.formData.get("intent");
    if (typeof intent !== "string" || !intent) {
      return;
    }
    const formData = submission.formData;
    setOptimisticOrders(
      (current) => applyOptimisticSubmission({
        current,
        intent,
        formData
      })
    );
  }, [submission]);
  useEffect(() => {
    if (!response || response === lastResponseRef.current) {
      return;
    }
    lastResponseRef.current = response;
    if (response.success === false) {
      setOptimisticOrders(baseOrders);
      return;
    }
    if (!Array.isArray(response.updatedOrders) || response.updatedOrders.length === 0) {
      return;
    }
    setOptimisticOrders((current) => applyUpdatedOrderPatches(current, response.updatedOrders));
  }, [baseOrders, response]);
  return useMemo(() => {
    const lookup = /* @__PURE__ */ new Map();
    optimisticOrders.forEach((order) => {
      lookup.set(order.id, order);
    });
    return { orders: optimisticOrders, lookup };
  }, [optimisticOrders]);
}
function applyOptimisticSubmission({
  current,
  intent,
  formData
}) {
  switch (intent) {
    case "assign": {
      const ids = parseOrderIds(formData.get("orderIds"));
      if (!ids.length) return current;
      const assigneeRaw = formData.get("assignee");
      const assignee = typeof assigneeRaw === "string" && assigneeRaw.trim().length ? assigneeRaw.trim() : "unassigned";
      return applyOrderTransform(current, ids, (order) => {
        if (order.assignedTo === assignee) return order;
        return { ...order, assignedTo: assignee };
      });
    }
    case "markFulfilled": {
      const ids = parseOrderIds(formData.get("orderIds"));
      if (!ids.length) return current;
      const tracking = parseJson(formData.get("tracking"));
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      return applyOrderTransform(current, ids, (order) => {
        if (order.fulfillmentStatus === "fulfilled" && order.status === "fulfilled") {
          return order;
        }
        const optimisticId = `${order.id}-optimistic-fulfill-${timestamp}`;
        const timelineExists = order.timeline.some((event) => event.id === optimisticId);
        const messageParts = ["Marked fulfilled — awaiting Sync"];
        if (tracking == null ? void 0 : tracking.number) {
          messageParts.push(`Tracking ${tracking.number}`);
        }
        const nextTimeline = timelineExists ? order.timeline : [
          {
            id: optimisticId,
            type: "fulfillment",
            message: messageParts.join(" · "),
            occurredAt: timestamp,
            state: "fulfilled"
          },
          ...order.timeline
        ];
        return {
          ...order,
          status: "fulfilled",
          fulfillmentStatus: "fulfilled",
          issue: "none",
          timeline: nextTimeline
        };
      });
    }
    case "requestSupport": {
      const payload = parseJson(
        formData.get("payload")
      );
      const ids = Array.isArray(payload == null ? void 0 : payload.orderIds) ? ((payload == null ? void 0 : payload.orderIds) ?? []).map((value) => String(value)) : [];
      if (!ids.length) return current;
      const note = typeof (payload == null ? void 0 : payload.note) === "string" ? payload.note.trim() : "";
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      return applyOrderTransform(current, ids, (order, index2) => {
        const fallbackThread = order.supportThread ?? `conversation:${order.id}`;
        const optimisticThread = (payload == null ? void 0 : payload.conversationId) ?? fallbackThread;
        const optimisticId = `${order.id}-optimistic-support-${timestamp}-${index2}`;
        const timelineExists = order.timeline.some((event) => event.id === optimisticId);
        const timelineMessage = note ? `Support requested — ${note}` : "Support follow-up requested from dashboard.";
        return {
          ...order,
          supportThread: optimisticThread,
          timeline: timelineExists ? order.timeline : [
            {
              id: optimisticId,
              type: "note",
              message: timelineMessage,
              occurredAt: timestamp
            },
            ...order.timeline
          ]
        };
      });
    }
    default:
      return current;
  }
}
function applyOrderTransform(orders, ids, transform) {
  if (!ids.length) return orders;
  const idSet = new Set(ids);
  let changed = false;
  const next = orders.map((order, index2) => {
    if (!idSet.has(order.id)) return order;
    const result = transform(order, index2);
    if (result !== order) {
      changed = true;
    }
    return result;
  });
  return changed ? next : orders;
}
function applyUpdatedOrderPatches(orders, updates) {
  if (!updates.length) return orders;
  const updateMap = /* @__PURE__ */ new Map();
  updates.forEach((update) => {
    if (update && typeof update === "object" && "id" in update && typeof update.id === "string") {
      updateMap.set(update.id, update);
    }
  });
  if (!updateMap.size) return orders;
  return orders.map((order) => {
    const patch = updateMap.get(order.id);
    if (!patch) return order;
    let next = order;
    let changed = false;
    if ("assignedTo" in patch && typeof patch.assignedTo === "string") {
      const assigned = patch.assignedTo.trim() || "unassigned";
      if (assigned !== order.assignedTo) {
        next = changed ? { ...next, assignedTo: assigned } : { ...order, assignedTo: assigned };
        changed = true;
      }
    }
    if ("fulfillmentStatus" in patch && typeof patch.fulfillmentStatus === "string") {
      const normalizedStatus = normalizeFulfillmentStatus(patch.fulfillmentStatus);
      if (normalizedStatus && normalizedStatus !== order.fulfillmentStatus) {
        next = changed ? { ...next } : { ...order };
        next.fulfillmentStatus = normalizedStatus;
        if (normalizedStatus === "fulfilled") {
          next.status = "fulfilled";
          next.issue = "none";
        }
        changed = true;
      }
    }
    if ("supportThread" in patch && typeof patch.supportThread === "string") {
      if (patch.supportThread && patch.supportThread !== order.supportThread) {
        next = changed ? { ...next, supportThread: patch.supportThread } : { ...order, supportThread: patch.supportThread };
        changed = true;
      }
    }
    return changed ? next : order;
  });
}
function parseOrderIds(value) {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  const parsed = parseJson(trimmed);
  if (Array.isArray(parsed)) {
    return parsed.map((entry2) => String(entry2)).filter((entry2) => entry2.length > 0);
  }
  return trimmed.split(",").map((entry2) => entry2.trim()).filter((entry2) => entry2.length > 0);
}
function parseJson(value) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function normalizeFulfillmentStatus(value) {
  const normalized = value.toLowerCase();
  if (normalized === "fulfilled") return "fulfilled";
  if (normalized === "partial") return "partial";
  if (normalized === "unfulfilled") return "unfulfilled";
  if (normalized === "in_transit" || normalized === "awaiting_tracking") return "partial";
  return null;
}
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: OrdersRoute,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const ASSISTANTS_CHANNEL_MAP = {
  email: "email",
  chat: "chat",
  sms: "sms",
  social: "social"
};
const FALLBACK_CUSTOMER_NAME = "Customer";
const FALLBACK_ASSISTANT_ACTOR = "Assistant";
const resolveAssistantsBaseUrl = (baseUrl) => {
  const resolved = baseUrl ?? process.env.ASSISTANTS_SERVICE_URL;
  if (!resolved) {
    throw new Error("Missing ASSISTANTS_SERVICE_URL environment variable");
  }
  return resolved;
};
const safeIso = (value) => {
  if (value && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return (/* @__PURE__ */ new Date()).toISOString();
};
const mapChannel = (channel) => {
  if (!channel) {
    return "email";
  }
  const normalized = channel.toLowerCase();
  if (normalized in ASSISTANTS_CHANNEL_MAP) {
    return ASSISTANTS_CHANNEL_MAP[normalized];
  }
  switch (normalized) {
    case "shopify":
      return "shopify";
    case "instagram":
      return "instagram";
    case "tiktok":
      return "tiktok";
    default:
      return "email";
  }
};
const mapStatus = (status) => {
  const normalized = status == null ? void 0 : status.toLowerCase();
  switch (normalized) {
    case "needs_review":
      return "snoozed";
    case "escalated":
      return "escalated";
    case "sent":
      return "resolved";
    case "pending":
    default:
      return "open";
  }
};
const determinePriority = (draft) => {
  if (draft.overdue) {
    return "urgent";
  }
  if (draft.auto_escalated) {
    return "urgent";
  }
  const tags = draft.tags ?? [];
  if (tags.some((tag) => (tag == null ? void 0 : tag.toLowerCase()) === "vip")) {
    return "high";
  }
  if (tags.some((tag) => tag == null ? void 0 : tag.toLowerCase().includes("priority"))) {
    return "high";
  }
  return "medium";
};
const determineSentiment = (draft) => {
  var _a2;
  if (draft.overdue) {
    return "negative";
  }
  if (draft.auto_escalated) {
    return "negative";
  }
  if (((_a2 = draft.status) == null ? void 0 : _a2.toLowerCase()) === "sent") {
    return "positive";
  }
  return "neutral";
};
const parseCustomerDisplay = (display, fallbackId) => {
  var _a2, _b2;
  if (!display) {
    return {
      id: fallbackId ?? "customer",
      name: FALLBACK_CUSTOMER_NAME,
      email: "customer@example.com"
    };
  }
  const trimmed = display.trim();
  const match = trimmed.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  if (!match) {
    return {
      id: fallbackId ?? trimmed,
      name: trimmed,
      email: "customer@example.com"
    };
  }
  const name = ((_a2 = match[1]) == null ? void 0 : _a2.trim()) || FALLBACK_CUSTOMER_NAME;
  const email = ((_b2 = match[2]) == null ? void 0 : _b2.trim()) || "customer@example.com";
  return {
    id: fallbackId ?? email ?? name,
    name,
    email
  };
};
const extractAttachments = (snippets) => {
  if (!(snippets == null ? void 0 : snippets.length)) {
    return void 0;
  }
  return snippets.filter((snippet) => Boolean(snippet.url)).map((snippet, index2) => ({
    id: snippet.url ?? `source-${index2}`,
    name: snippet.title ?? `Reference ${index2 + 1}`,
    url: snippet.url ?? "#"
  }));
};
const describeAuditAction = (entry2) => {
  const action2 = entry2.action ?? "event";
  const normalized = action2.replace(/^draft\./, "");
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};
const buildTimeline = (detail, customerName, attachments) => {
  var _a2, _b2, _c;
  const timeline = [];
  const createdAt = safeIso(detail.created_at);
  const incomingBody = detail.incoming_text ?? detail.incoming_excerpt ?? "Customer message unavailable.";
  timeline.push({
    id: `${detail.id}-incoming`,
    type: "customer_message",
    actor: customerName,
    timestamp: createdAt,
    body: incomingBody,
    attachments
  });
  const draftText = detail.draft_text ?? detail.final_text ?? detail.suggested_text ?? detail.draft_excerpt;
  if (draftText) {
    timeline.push({
      id: `${detail.id}-draft`,
      type: "agent_reply",
      actor: detail.assigned_to ?? FALLBACK_ASSISTANT_ACTOR,
      timestamp: safeIso(detail.sent_at ?? detail.created_at),
      body: draftText
    });
  }
  (_a2 = detail.audit_log) == null ? void 0 : _a2.forEach((entry2, index2) => {
    timeline.push({
      id: `${detail.id}-audit-${index2}`,
      type: "system",
      actor: entry2.actor ?? "System",
      timestamp: safeIso(entry2.timestamp),
      body: describeAuditAction(entry2)
    });
  });
  (_b2 = detail.notes) == null ? void 0 : _b2.forEach((note, index2) => {
    if (parseFeedbackNote(note)) {
      return;
    }
    timeline.push({
      id: `${detail.id}-note-${index2}`,
      type: "note",
      actor: note.author_user_id ?? FALLBACK_ASSISTANT_ACTOR,
      timestamp: safeIso(note.created_at),
      body: note.text
    });
  });
  (_c = detail.learning_notes) == null ? void 0 : _c.forEach((note, index2) => {
    timeline.push({
      id: `${detail.id}-learning-${index2}`,
      type: "note",
      actor: note.author ?? FALLBACK_ASSISTANT_ACTOR,
      timestamp: safeIso(note.timestamp),
      body: note.note
    });
  });
  return timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};
const parseFeedbackText = (text2) => {
  try {
    const parsed = JSON.parse(text2);
    if ((parsed == null ? void 0 : parsed.type) === "feedback" && (parsed.vote === "up" || parsed.vote === "down")) {
      return {
        vote: parsed.vote,
        comment: parsed.comment ?? void 0
      };
    }
  } catch (error) {
  }
  return null;
};
const parseFeedbackNote = (note) => parseFeedbackText(note.text);
const extractFeedback = (detail) => {
  var _a2, _b2;
  const entries = [];
  (_a2 = detail.notes) == null ? void 0 : _a2.forEach((note) => {
    const parsed = parseFeedbackNote(note);
    if (!parsed) {
      return;
    }
    entries.push({
      id: note.note_id,
      draftId: detail.draft_id,
      ticketId: detail.draft_id,
      vote: parsed.vote,
      comment: parsed.comment,
      submittedAt: safeIso(note.created_at),
      submittedBy: note.author_user_id ?? FALLBACK_ASSISTANT_ACTOR
    });
  });
  (_b2 = detail.learning_notes) == null ? void 0 : _b2.forEach((note, index2) => {
    entries.push({
      id: `${detail.draft_id}-learning-${index2}`,
      draftId: detail.draft_id,
      ticketId: detail.draft_id,
      vote: "up",
      comment: note.note,
      submittedAt: safeIso(note.timestamp),
      submittedBy: note.author ?? FALLBACK_ASSISTANT_ACTOR
    });
  });
  return entries.sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );
};
const computeRevision = (detail) => {
  var _a2;
  const auditLength = ((_a2 = detail == null ? void 0 : detail.audit_log) == null ? void 0 : _a2.length) ?? 0;
  return Math.max(1, auditLength + 1);
};
const toInboxDraft = (detail) => {
  var _a2, _b2;
  const updatedAt = detail.sent_at ?? detail.created_at;
  const lastActor = (_b2 = (_a2 = detail.audit_log) == null ? void 0 : _a2[detail.audit_log.length - 1]) == null ? void 0 : _b2.actor;
  return {
    id: detail.draft_id,
    ticketId: detail.draft_id,
    content: detail.draft_text ?? detail.final_text ?? detail.suggested_text ?? detail.draft_excerpt ?? "",
    approved: mapStatus(detail.status) === "resolved",
    updatedAt: safeIso(updatedAt),
    updatedBy: detail.assigned_to ?? lastActor ?? FALLBACK_ASSISTANT_ACTOR,
    revision: computeRevision(detail),
    feedback: extractFeedback(detail)
  };
};
const toInboxTicket = (listItem, detail) => {
  var _a2, _b2;
  const resolvedDetail = {
    ...listItem,
    ...detail ?? {}
  };
  const channel = mapChannel(resolvedDetail.channel ?? listItem.channel);
  const status = mapStatus(resolvedDetail.status ?? listItem.status);
  const priority = determinePriority(resolvedDetail);
  const sentiment = determineSentiment(resolvedDetail);
  const customer = parseCustomerDisplay(
    resolvedDetail.customer_display ?? listItem.customer_display,
    resolvedDetail.conversation_id ?? listItem.conversation_id
  );
  const attachments = extractAttachments(resolvedDetail.source_snippets);
  const timeline = buildTimeline(resolvedDetail, customer.name, attachments);
  const aiDraft = toInboxDraft(resolvedDetail);
  const lastMessagePreview = listItem.incoming_excerpt ?? resolvedDetail.incoming_text ?? ((_a2 = resolvedDetail.conversation_summary) == null ? void 0 : _a2[0]) ?? "";
  const orderIdRaw = (_b2 = resolvedDetail.order_context) == null ? void 0 : _b2.order_id;
  const orderId = typeof orderIdRaw === "string" ? orderIdRaw : void 0;
  return {
    id: aiDraft.id,
    subject: resolvedDetail.subject ?? listItem.subject ?? "Customer inquiry",
    status,
    priority,
    sentiment,
    updatedAt: safeIso(resolvedDetail.sent_at ?? resolvedDetail.created_at),
    createdAt: safeIso(resolvedDetail.created_at),
    channel,
    customer,
    orderId,
    assignedTo: resolvedDetail.assigned_to ?? listItem.assigned_to ?? void 0,
    lastMessagePreview,
    slaBreached: Boolean(resolvedDetail.overdue ?? listItem.overdue),
    aiDraft,
    timeline,
    attachments
  };
};
const filterTickets = (tickets, params) => {
  let scoped = [...tickets];
  if (params.filter === "unassigned") {
    scoped = scoped.filter((ticket) => !ticket.assignedTo);
  } else if (params.filter === "priority") {
    scoped = scoped.filter((ticket) => ticket.priority === "high" || ticket.priority === "urgent");
  } else if (params.filter === "overdue") {
    scoped = scoped.filter((ticket) => ticket.slaBreached);
  }
  if (params.channelFilter !== "all") {
    scoped = scoped.filter((ticket) => ticket.channel === params.channelFilter);
  }
  if (params.statusFilter !== "all") {
    scoped = scoped.filter((ticket) => ticket.status === params.statusFilter);
  }
  if (params.assignedFilter === "unassigned") {
    scoped = scoped.filter((ticket) => !ticket.assignedTo);
  } else if (params.assignedFilter !== "all") {
    scoped = scoped.filter((ticket) => ticket.assignedTo === params.assignedFilter);
  }
  return scoped;
};
const buildAvailableFilters = (tickets) => {
  const channelSet = /* @__PURE__ */ new Set();
  const statusSet = /* @__PURE__ */ new Set();
  const assignees = /* @__PURE__ */ new Set();
  tickets.forEach((ticket) => {
    channelSet.add(ticket.channel);
    statusSet.add(ticket.status);
    if (ticket.assignedTo) {
      assignees.add(ticket.assignedTo);
    }
  });
  return {
    channels: Array.from(channelSet),
    statuses: Array.from(statusSet),
    assignees: Array.from(assignees)
  };
};
const mapStatusFilterToService = (status) => {
  switch (status) {
    case "open":
      return "pending,needs_review";
    case "snoozed":
      return "needs_review";
    case "resolved":
      return "sent";
    case "escalated":
      return "escalated";
    case "all":
    default:
      return "all";
  }
};
const mapChannelFilterToService = (channel) => {
  if (channel === "all") {
    return null;
  }
  switch (channel) {
    case "shopify":
      return "chat";
    case "instagram":
    case "tiktok":
      return "social";
    default:
      return channel;
  }
};
const mapAssignedFilterToService = (assigned) => {
  if (assigned === "all") {
    return null;
  }
  if (assigned === "unassigned") {
    return "unassigned";
  }
  return assigned;
};
const fetchAssistantsInbox = async (params) => {
  const baseUrl = resolveAssistantsBaseUrl(params.baseUrl);
  const listUrl = new URL("/assistants/drafts", baseUrl);
  listUrl.searchParams.set("limit", String(Math.max(params.pageSize, 1)));
  const statusParam = mapStatusFilterToService(params.statusFilter);
  if (statusParam) {
    listUrl.searchParams.set("status", statusParam);
  }
  const channelParam = mapChannelFilterToService(params.channelFilter);
  if (channelParam) {
    listUrl.searchParams.set("channel", channelParam);
  }
  const assignedParam = mapAssignedFilterToService(params.assignedFilter);
  if (assignedParam) {
    listUrl.searchParams.set("assigned", assignedParam);
  }
  const listResponse = await fetch(listUrl.toString(), {
    signal: params.signal
  });
  if (!listResponse.ok) {
    const text2 = await listResponse.text().catch(() => "");
    throw new Error(`Assistants drafts request failed (${listResponse.status}): ${text2}`);
  }
  const payload = await listResponse.json();
  const drafts2 = payload.drafts ?? [];
  const details = await Promise.all(
    drafts2.map(async (draft) => {
      try {
        return await fetchAssistantsDraftDetail(draft.draft_id, {
          baseUrl,
          signal: params.signal
        });
      } catch (error) {
        console.warn("assistants detail fetch failed", draft.draft_id, error);
        return null;
      }
    })
  );
  const tickets = drafts2.map((draft, index2) => {
    const detail = details[index2] ?? void 0;
    return toInboxTicket(draft, detail ?? void 0);
  });
  const filtered = filterTickets(tickets, params);
  const availableFilters = buildAvailableFilters(tickets);
  const state = filtered.length === 0 ? "empty" : "ok";
  const dataset = {
    scenario: "base",
    state,
    filter: params.filter,
    channelFilter: params.channelFilter,
    statusFilter: params.statusFilter,
    assignedFilter: params.assignedFilter,
    tickets: filtered,
    count: filtered.length,
    availableFilters
  };
  if (tickets.length === 0) {
    dataset.alert = "No drafts available from Assistants service.";
  }
  return {
    dataset,
    refreshAfterSeconds: payload.refresh_after_seconds ?? null
  };
};
const fetchAssistantsDraftDetail = async (draftId, options = {}) => {
  const baseUrl = resolveAssistantsBaseUrl(options.baseUrl);
  const url = new URL(`/assistants/drafts/${draftId}`, baseUrl);
  const response = await fetch(url.toString(), { signal: options.signal });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(`Assistants draft detail failed (${response.status}): ${text2}`);
  }
  return await response.json();
};
const fetchAssistantsDraft = async (params) => {
  const detail = await fetchAssistantsDraftDetail(params.draftId, params);
  const listItem = {
    id: detail.id,
    draft_id: detail.draft_id,
    channel: detail.channel,
    conversation_id: detail.conversation_id,
    customer_display: detail.customer_display,
    subject: detail.subject,
    chat_topic: detail.chat_topic,
    incoming_excerpt: detail.incoming_excerpt,
    draft_excerpt: detail.draft_excerpt,
    confidence: detail.confidence,
    llm_model: detail.llm_model,
    estimated_tokens_in: detail.estimated_tokens_in,
    estimated_tokens_out: detail.estimated_tokens_out,
    usd_cost: detail.usd_cost,
    created_at: detail.created_at,
    sla_deadline: detail.sla_deadline,
    status: detail.status,
    tags: detail.tags,
    auto_escalated: detail.auto_escalated,
    auto_escalation_reason: detail.auto_escalation_reason,
    assigned_to: detail.assigned_to,
    escalation_reason: detail.escalation_reason,
    time_remaining_seconds: detail.time_remaining_seconds,
    overdue: detail.overdue
  };
  return toInboxTicket(listItem, detail);
};
const approveAssistantsDraft = async (input2) => {
  const baseUrl = resolveAssistantsBaseUrl(input2.baseUrl);
  const url = new URL("/assistants/approve", baseUrl);
  const response = await fetch(url.toString(), {
    method: "POST",
    signal: input2.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      draft_id: input2.draftId,
      approver_user_id: input2.actor,
      send_copy_to_customer: input2.sendCopyToCustomer ?? false,
      escalate_to_specialist: input2.escalateToSpecialist ?? false,
      escalation_reason: input2.escalationReason ?? void 0,
      assign_to: input2.assignTo ?? void 0
    })
  });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(`Assistants approve failed (${response.status}): ${text2}`);
  }
};
const editAssistantsDraft = async (input2) => {
  const baseUrl = resolveAssistantsBaseUrl(input2.baseUrl);
  const url = new URL("/assistants/edit", baseUrl);
  const response = await fetch(url.toString(), {
    method: "POST",
    signal: input2.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      draft_id: input2.draftId,
      editor_user_id: input2.actor,
      final_text: input2.content,
      learning_notes: input2.learningNotes ?? void 0,
      send_copy_to_customer: input2.sendCopyToCustomer ?? false
    })
  });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(`Assistants edit failed (${response.status}): ${text2}`);
  }
};
const submitAssistantsDraftFeedback = async (input2) => {
  const baseUrl = resolveAssistantsBaseUrl(input2.baseUrl);
  const url = new URL("/assistants/notes", baseUrl);
  const response = await fetch(url.toString(), {
    method: "POST",
    signal: input2.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      draft_id: input2.draftId,
      author_user_id: input2.actor,
      text: JSON.stringify({
        type: "feedback",
        vote: input2.vote,
        comment: input2.comment ?? null
      })
    })
  });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(`Assistants feedback failed (${response.status}): ${text2}`);
  }
};
const emitter = new EventEmitter();
emitter.setMaxListeners(0);
const subscribeToInboxStream = (listener) => {
  emitter.addListener("message", listener);
  return () => {
    emitter.removeListener("message", listener);
  };
};
const publishInboxActionEvent = (response) => {
  if (!response.success || !response.event) {
    return;
  }
  const payload = {
    id: randomUUID(),
    type: "event",
    timestamp: response.event.timestamp,
    event: response.event,
    message: response.message,
    ticket: response.ticket,
    draft: response.draft,
    feedback: response.feedback
  };
  emitter.emit("message", payload);
};
const buildInboxHandshake = (options = {}) => {
  const providerDefaults = {
    id: "mock-inbox-provider",
    label: "Mock Inbox Provider",
    transport: "sse",
    version: "0.1.0"
  };
  const provider = {
    ...providerDefaults,
    ...options.provider ?? {}
  };
  const capabilities = options.capabilities ?? ["drafts", "feedback"];
  return {
    id: randomUUID(),
    type: "handshake",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    provider,
    capabilities: [...capabilities],
    bridge: options.bridgeStatus ? {
      status: options.bridgeStatus
    } : void 0
  };
};
const logInboxConnectionTelemetry = void 0;
const VALID_FILTERS = [
  "all",
  "unassigned",
  "priority",
  "overdue"
];
const VALID_CHANNELS = [
  "email",
  "shopify",
  "instagram",
  "tiktok",
  "chat",
  "sms",
  "social"
];
const VALID_STATUSES = [
  "open",
  "snoozed",
  "resolved",
  "escalated"
];
const CHANNEL_LABELS = {
  email: "Email",
  shopify: "Shopify",
  instagram: "Instagram",
  tiktok: "TikTok",
  chat: "Chat",
  sms: "SMS",
  social: "Social"
};
const STATUS_LABELS = {
  open: "Open",
  snoozed: "Snoozed",
  resolved: "Resolved",
  escalated: "Escalated"
};
const formatChannel = (channel) => CHANNEL_LABELS[channel];
const formatStatus = (status) => STATUS_LABELS[status];
const formatAssignee = (value) => value ?? "Unassigned";
const timelineTone = (type) => {
  switch (type) {
    case "customer_message":
      return "attention";
    case "agent_reply":
      return "success";
    case "note":
      return "warning";
    default:
      return "info";
  }
};
const timelineLabel = (type) => {
  switch (type) {
    case "customer_message":
      return "Customer";
    case "agent_reply":
      return "Agent";
    case "note":
      return "Note";
    default:
      return "System";
  }
};
const buildFeedbackIndex = (tickets) => {
  const map = {};
  tickets.forEach((ticket) => {
    map[ticket.id] = ticket.aiDraft.feedback;
  });
  return map;
};
const feedbackVoteLabel = {
  up: "Positive",
  down: "Negative"
};
const CONNECTION_STATUS_LABEL = {
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline"
};
const CONNECTION_STATUS_DESCRIPTION = {
  connecting: "Establishing realtime sync…",
  connected: "Realtime inbox updates are active.",
  reconnecting: "Connection dropped. Retrying shortly…",
  offline: "Realtime sync unavailable. Manual refresh recommended until reconnected."
};
const CONNECTION_STATUS_TONE = {
  connecting: "info",
  connected: "success",
  reconnecting: "warning",
  offline: "critical"
};
const isConnectionStatus = (value) => Object.prototype.hasOwnProperty.call(CONNECTION_STATUS_LABEL, value);
const HANDSHAKE_CAPABILITY_LABELS = {
  drafts: "Drafts",
  feedback: "Feedback",
  attachments: "Attachments"
};
const formatHandshakeCapabilities = (capabilities) => {
  if (!capabilities.length) {
    return "None";
  }
  return capabilities.map((capability) => HANDSHAKE_CAPABILITY_LABELS[capability] ?? capability).join(" • ");
};
const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Priority", value: "priority" },
  { label: "Overdue", value: "overdue" }
];
const parseFilter = (value) => {
  if (value && VALID_FILTERS.includes(value)) {
    return value;
  }
  return "all";
};
const parseChannelFilter = (value) => {
  if (value && VALID_CHANNELS.includes(value)) {
    return value;
  }
  return "all";
};
const parseStatusFilter = (value) => {
  if (value && VALID_STATUSES.includes(value)) {
    return value;
  }
  return "all";
};
const parseAssignedFilter = (value) => {
  if (!value || value === "all") return "all";
  if (value === "unassigned") return "unassigned";
  return value;
};
const parseFilters = (url) => {
  const filter = parseFilter(url.searchParams.get("filter"));
  const channelFilter = parseChannelFilter(url.searchParams.get("channel"));
  const statusFilter = parseStatusFilter(url.searchParams.get("status"));
  const assignedFilter = parseAssignedFilter(url.searchParams.get("assigned"));
  return { filter, channelFilter, statusFilter, assignedFilter };
};
const clampPageSize = (value) => {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(Math.round(value), 5), 50);
};
const loader$4 = async ({ request }) => {
  const url = new URL(request.url);
  const { filter, channelFilter, statusFilter, assignedFilter } = parseFilters(url);
  const pageSize = clampPageSize(Number(url.searchParams.get("pageSize") ?? "12"));
  const scenario = scenarioFromRequest$1(request);
  let dataset = null;
  let refreshAfterSeconds = null;
  let useMockDataset = true;
  let fallbackBecauseAssistantsDisabled = false;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;
    const settings = await storeSettingsRepository.getSettings(shopDomain);
    const assistantsEnabled = Boolean(settings.toggles.enableAssistantsProvider);
    if (assistantsEnabled) {
      try {
        const { dataset: serviceDataset, refreshAfterSeconds: serviceRefresh } = await fetchAssistantsInbox({
          filter,
          channelFilter,
          statusFilter,
          assignedFilter,
          pageSize,
          signal: request.signal
        });
        dataset = serviceDataset;
        refreshAfterSeconds = serviceRefresh;
        useMockDataset = false;
      } catch (error) {
        console.error("inbox loader: assistants fetch failed", error);
        dataset = await getInboxScenario({
          scenario,
          filter,
          channelFilter,
          statusFilter,
          assignedFilter,
          pageSize
        });
        const fallbackAlert = "Assistants service unavailable — showing mock data.";
        dataset.alert = dataset.alert ? `${fallbackAlert} ${dataset.alert}` : fallbackAlert;
        if (dataset.state === "ok") {
          dataset.state = "warning";
        }
        refreshAfterSeconds = null;
        useMockDataset = true;
      }
    } else {
      fallbackBecauseAssistantsDisabled = true;
    }
  }
  if (!dataset) {
    dataset = await getInboxScenario({
      scenario,
      filter,
      channelFilter,
      statusFilter,
      assignedFilter,
      pageSize
    });
    refreshAfterSeconds = null;
    useMockDataset = true;
  }
  if (fallbackBecauseAssistantsDisabled) {
    const disabledAlert = "Assistants provider disabled in Settings — showing mock data.";
    dataset.alert = dataset.alert ? `${disabledAlert} ${dataset.alert}` : disabledAlert;
    if (dataset.state === "ok") {
      dataset.state = "warning";
    }
  }
  return json(
    { dataset, scenario, useMockData: useMockDataset, refreshAfterSeconds },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$3 = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent !== "approve" && intent !== "edit" && intent !== "feedback") {
    return json(
      {
        success: false,
        message: "Unsupported action."
      },
      { status: 400 }
    );
  }
  const ticketIdEntry = formData.get("ticketId");
  if (typeof ticketIdEntry !== "string" || ticketIdEntry.length === 0) {
    return json(
      {
        success: false,
        message: "Missing ticket reference."
      },
      { status: 400 }
    );
  }
  const ticketId = ticketIdEntry;
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  let useAssistantsService = false;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    try {
      const settings = await storeSettingsRepository.getSettings(session.shop);
      useAssistantsService = Boolean(settings.toggles.enableAssistantsProvider);
    } catch (error) {
      console.error("inbox action: failed to load settings, falling back to mocks", error);
      useAssistantsService = false;
    }
  }
  if (useAssistantsService) {
    if (intent === "feedback") {
      const draftIdEntry = formData.get("draftId");
      const voteEntry = formData.get("vote");
      if (voteEntry !== "up" && voteEntry !== "down") {
        return json(
          {
            success: false,
            message: "Feedback vote must be 'up' or 'down'."
          },
          { status: 400 }
        );
      }
      if (typeof draftIdEntry !== "string" || draftIdEntry.length === 0) {
        return json(
          {
            success: false,
            message: "Missing draft reference for feedback."
          },
          { status: 400 }
        );
      }
      const commentEntry = formData.get("comment");
      const submittedByEntry = formData.get("submittedBy");
      const submittedBy = typeof submittedByEntry === "string" && submittedByEntry.length > 0 ? submittedByEntry : "Operator";
      const comment = typeof commentEntry === "string" && commentEntry.trim().length > 0 ? commentEntry.trim() : void 0;
      try {
        await submitAssistantsDraftFeedback({
          draftId: draftIdEntry,
          actor: submittedBy,
          vote: voteEntry,
          comment,
          signal: request.signal
        });
        const ticket2 = await fetchAssistantsDraft({
          draftId: ticketId,
          signal: request.signal
        });
        const draft = ticket2.aiDraft;
        const history = draft.feedback;
        const feedback = history[history.length - 1] ?? {
          id: `${draft.id}-feedback-${Date.now()}`,
          draftId: draft.id,
          ticketId: ticket2.id,
          vote: voteEntry,
          comment,
          submittedAt: now2,
          submittedBy
        };
        const payload2 = {
          success: true,
          message: voteEntry === "up" ? "Positive feedback logged." : "Constructive feedback captured.",
          ticket: ticket2,
          draft,
          feedback,
          event: {
            type: "draft:feedback",
            timestamp: now2,
            payload: {
              ticketId,
              draftId: draft.id,
              vote: voteEntry
            }
          }
        };
        publishInboxActionEvent(payload2);
        return json(payload2);
      } catch (error) {
        console.error("inbox action: assistants feedback failed", error);
        return json(
          {
            success: false,
            message: "Assistants service temporarily unavailable."
          },
          { status: 502 }
        );
      }
    }
    const contentEntry2 = formData.get("content");
    if (typeof contentEntry2 !== "string") {
      return json(
        {
          success: false,
          message: "Missing draft content."
        },
        { status: 400 }
      );
    }
    const trimmedContent2 = contentEntry2.trim();
    if (!trimmedContent2) {
      return json(
        {
          success: false,
          message: "Draft content cannot be empty."
        },
        { status: 400 }
      );
    }
    const updatedByEntry2 = formData.get("updatedBy");
    const updatedBy2 = typeof updatedByEntry2 === "string" && updatedByEntry2.length > 0 ? updatedByEntry2 : "Operator";
    try {
      if (intent === "approve") {
        await approveAssistantsDraft({
          draftId: ticketId,
          actor: updatedBy2,
          signal: request.signal
        });
      } else {
        await editAssistantsDraft({
          draftId: ticketId,
          actor: updatedBy2,
          content: trimmedContent2,
          signal: request.signal
        });
      }
      const ticket2 = await fetchAssistantsDraft({
        draftId: ticketId,
        signal: request.signal
      });
      const payload2 = {
        success: true,
        message: intent === "approve" ? "Draft approved." : "Draft sent with edits.",
        ticket: ticket2,
        draft: ticket2.aiDraft,
        event: {
          type: intent === "approve" ? "draft:approved" : "draft:updated",
          timestamp: now2,
          payload: {
            ticketId,
            revision: ticket2.aiDraft.revision
          }
        }
      };
      publishInboxActionEvent(payload2);
      return json(payload2);
    } catch (error) {
      console.error("inbox action: assistants mutation failed", error);
      return json(
        {
          success: false,
          message: "Assistants service temporarily unavailable."
        },
        { status: 502 }
      );
    }
  }
  const url = new URL(request.url);
  const { filter, channelFilter, statusFilter, assignedFilter } = parseFilters(url);
  const pageSize = clampPageSize(Number(url.searchParams.get("pageSize") ?? "12"));
  const scenario = scenarioFromRequest$1(request);
  const findTicketWithFallback = async () => {
    const scopedDataset = await getInboxScenario({
      scenario,
      filter,
      channelFilter,
      statusFilter,
      assignedFilter,
      pageSize
    });
    const scopedTicket = scopedDataset.tickets.find((entry2) => entry2.id === ticketId);
    if (scopedTicket) {
      return scopedTicket;
    }
    const fallbackDataset = await getInboxScenario({
      scenario,
      filter: "all",
      channelFilter: "all",
      statusFilter: "all",
      assignedFilter: "all",
      pageSize: Math.max(pageSize, 50)
    });
    return fallbackDataset.tickets.find((entry2) => entry2.id === ticketId);
  };
  if (intent === "feedback") {
    const draftIdEntry = formData.get("draftId");
    const voteEntry = formData.get("vote");
    if (voteEntry !== "up" && voteEntry !== "down") {
      return json(
        {
          success: false,
          message: "Feedback vote must be 'up' or 'down'."
        },
        { status: 400 }
      );
    }
    if (typeof draftIdEntry !== "string" || draftIdEntry.length === 0) {
      return json(
        {
          success: false,
          message: "Missing draft reference for feedback."
        },
        { status: 400 }
      );
    }
    const commentEntry = formData.get("comment");
    const submittedByEntry = formData.get("submittedBy");
    const submittedBy = typeof submittedByEntry === "string" && submittedByEntry.length > 0 ? submittedByEntry : "Operator";
    const comment = typeof commentEntry === "string" && commentEntry.trim().length > 0 ? commentEntry.trim() : void 0;
    const feedback = submitInboxDraftFeedback(
      ticketId,
      draftIdEntry,
      voteEntry,
      submittedBy,
      comment
    );
    const ticket2 = await findTicketWithFallback();
    const draft = getInboxDraft(ticketId);
    if (!ticket2 || !draft) {
      return json(
        {
          success: false,
          message: "Ticket not found after recording feedback."
        },
        { status: 404 }
      );
    }
    const payload2 = {
      success: true,
      message: voteEntry === "up" ? "Positive feedback logged." : "Constructive feedback captured.",
      ticket: ticket2,
      draft,
      feedback,
      event: {
        type: "draft:feedback",
        timestamp: now2,
        payload: {
          ticketId,
          draftId: draftIdEntry,
          vote: voteEntry
        }
      }
    };
    publishInboxActionEvent(payload2);
    return json(payload2);
  }
  const contentEntry = formData.get("content");
  if (typeof contentEntry !== "string") {
    return json(
      {
        success: false,
        message: "Missing draft content."
      },
      { status: 400 }
    );
  }
  const trimmedContent = contentEntry.trim();
  if (!trimmedContent) {
    return json(
      {
        success: false,
        message: "Draft content cannot be empty."
      },
      { status: 400 }
    );
  }
  const updatedByEntry = formData.get("updatedBy");
  const updatedBy = typeof updatedByEntry === "string" && updatedByEntry.length > 0 ? updatedByEntry : "Operator";
  const draftRecord = intent === "approve" ? approveInboxDraft(ticketId, trimmedContent, updatedBy) : updateInboxDraft(ticketId, trimmedContent, updatedBy);
  const ticket = await findTicketWithFallback();
  if (!ticket) {
    return json(
      {
        success: false,
        message: "Ticket not found for the current filter."
      },
      { status: 404 }
    );
  }
  const payload = {
    success: true,
    message: intent === "approve" ? "Draft approved." : "Draft updated.",
    ticket,
    draft: draftRecord,
    event: {
      type: intent === "approve" ? "draft:approved" : "draft:updated",
      timestamp: now2,
      payload: {
        ticketId,
        revision: draftRecord.revision
      }
    }
  };
  publishInboxActionEvent(payload);
  return json(payload);
};
const sentimentTone = (sentiment) => {
  switch (sentiment) {
    case "positive":
      return "success";
    case "negative":
      return "critical";
    default:
      return "attention";
  }
};
const priorityTone = (priority) => {
  switch (priority) {
    case "urgent":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "attention";
    default:
      return "new";
  }
};
const statusTone = (status) => {
  switch (status) {
    case "escalated":
      return "critical";
    case "resolved":
      return "success";
    case "snoozed":
      return "warning";
    default:
      return "attention";
  }
};
const formatTimeAgo = (value) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.max(Math.round(diffMs / (1e3 * 60 * 60)), 0);
  if (diffHours < 1) return "just now";
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};
function InboxRoute() {
  var _a2, _b2, _c, _d;
  const { dataset, scenario, useMockData, refreshAfterSeconds } = useLoaderData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftFetcher = useFetcher();
  const feedbackFetcher = useFetcher();
  const { revalidate: revalidatePage } = useRevalidator();
  const [selectedTicketId, setSelectedTicketId] = useState(
    ((_a2 = dataset.tickets[0]) == null ? void 0 : _a2.id) ?? null
  );
  const [draftContent, setDraftContent] = useState(
    ((_b2 = dataset.tickets[0]) == null ? void 0 : _b2.aiDraft.content) ?? ""
  );
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackIndex, setFeedbackIndex] = useState(() => buildFeedbackIndex(dataset.tickets));
  const [toast, setToast] = useState(null);
  const initialProviderStatus = useMockData ? "connected" : "connecting";
  const [eventStreamStatus, setEventStreamStatus] = useState("connecting");
  const [providerStatus, setProviderStatus] = useState(initialProviderStatus);
  const [streamHandshake, setStreamHandshake] = useState(null);
  const connectionRetryRef = useRef(() => {
  });
  const refreshTimerRef = useRef(null);
  const revalidatePendingRef = useRef(null);
  const processedEventIdsRef = useRef(/* @__PURE__ */ new Set());
  const updateProviderStatus = useCallback(
    (nextStatus, options) => {
      setProviderStatus((current) => {
        if (current === nextStatus) {
          return current;
        }
        if (!(options == null ? void 0 : options.suppressToast) && !useMockData) {
          if (nextStatus === "reconnecting" && current === "connected") {
            const retrySeconds = typeof (options == null ? void 0 : options.retryDelayMs) === "number" ? Math.max(Math.round(options.retryDelayMs / 1e3), 1) : null;
            setToast(
              retrySeconds ? `Assistants realtime bridge interrupted. Retrying in ${retrySeconds}s…` : "Assistants realtime bridge interrupted. Retrying…"
            );
          } else if (nextStatus === "offline") {
            setToast("Assistants realtime bridge offline. We'll keep retrying automatically.");
          } else if (nextStatus === "connected" && (current === "offline" || current === "reconnecting")) {
            setToast("Assistants realtime bridge reconnected.");
          }
        }
        return nextStatus;
      });
    },
    [setToast, useMockData]
  );
  useEffect(() => {
    if (useMockData) {
      updateProviderStatus("connected", { suppressToast: true });
    }
  }, [updateProviderStatus, useMockData]);
  const forceReconnect = useCallback(() => {
    connectionRetryRef.current();
  }, []);
  const queueDatasetRefresh = useCallback(
    (eventId) => {
      if (useMockData || !eventId) {
        return;
      }
      const processed = processedEventIdsRef.current;
      if (processed.has(eventId)) {
        return;
      }
      if (processed.size >= 128) {
        processed.clear();
      }
      processed.add(eventId);
      if (revalidatePendingRef.current) {
        return;
      }
      revalidatePendingRef.current = setTimeout(() => {
        revalidatePendingRef.current = null;
        revalidatePage();
      }, 250);
    },
    [revalidatePage, useMockData]
  );
  const connectionStatus = useMemo(() => {
    if (eventStreamStatus === "offline" || providerStatus === "offline") {
      return "offline";
    }
    if (eventStreamStatus === "reconnecting" || providerStatus === "reconnecting") {
      return "reconnecting";
    }
    if (eventStreamStatus === "connecting" || providerStatus === "connecting") {
      return "connecting";
    }
    return "connected";
  }, [eventStreamStatus, providerStatus]);
  useEffect(() => {
    return () => {
      if (revalidatePendingRef.current) {
        clearTimeout(revalidatePendingRef.current);
        revalidatePendingRef.current = null;
      }
    };
  }, []);
  const metrics = useMemo(() => buildMetrics(dataset), [dataset]);
  const channelOptions = useMemo(
    () => [
      { label: "All channels", value: "all" },
      ...dataset.availableFilters.channels.map((channel) => ({
        label: formatChannel(channel),
        value: channel
      }))
    ],
    [dataset.availableFilters.channels]
  );
  const statusOptions = useMemo(
    () => [
      { label: "All statuses", value: "all" },
      ...dataset.availableFilters.statuses.map((status) => ({
        label: formatStatus(status),
        value: status
      }))
    ],
    [dataset.availableFilters.statuses]
  );
  const assigneeOptions = useMemo(
    () => [
      { label: "All assignees", value: "all" },
      { label: "Unassigned", value: "unassigned" },
      ...dataset.availableFilters.assignees.map((assignee) => ({
        label: assignee,
        value: assignee
      }))
    ],
    [dataset.availableFilters.assignees]
  );
  const selectedTicket = useMemo(() => {
    if (!dataset.tickets.length) return null;
    if (selectedTicketId) {
      return dataset.tickets.find((ticket) => ticket.id === selectedTicketId) ?? dataset.tickets[0];
    }
    return dataset.tickets[0];
  }, [dataset.tickets, selectedTicketId]);
  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null;
    const mappedFeedback = feedbackIndex[selectedTicket.id];
    if (!mappedFeedback) {
      return selectedTicket;
    }
    return {
      ...selectedTicket,
      aiDraft: {
        ...selectedTicket.aiDraft,
        feedback: mappedFeedback
      }
    };
  }, [feedbackIndex, selectedTicket]);
  const selectedTicketIdRef = useRef((selectedTicket == null ? void 0 : selectedTicket.id) ?? null);
  useEffect(() => {
    selectedTicketIdRef.current = (selectedTicket == null ? void 0 : selectedTicket.id) ?? null;
  }, [selectedTicket == null ? void 0 : selectedTicket.id]);
  useEffect(() => {
    if (!dataset.tickets.length) {
      setSelectedTicketId(null);
      setDraftContent("");
      return;
    }
    if (!selectedTicketId || !dataset.tickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(dataset.tickets[0].id);
    }
  }, [dataset.tickets, selectedTicketId]);
  useEffect(() => {
    setFeedbackIndex((current) => {
      const next = { ...current };
      dataset.tickets.forEach((ticket) => {
        const existing = next[ticket.id];
        if (!existing || ticket.aiDraft.feedback.length > existing.length) {
          next[ticket.id] = ticket.aiDraft.feedback;
        }
      });
      return next;
    });
  }, [dataset.tickets]);
  useEffect(() => {
    if (activeTicket) {
      setDraftContent(activeTicket.aiDraft.content);
    } else {
      setDraftContent("");
    }
  }, [activeTicket]);
  useEffect(() => {
    setFeedbackComment("");
  }, [selectedTicketId]);
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (useMockData || !refreshAfterSeconds || refreshAfterSeconds <= 0) {
      return;
    }
    let cancelled = false;
    const scheduleNext = () => {
      if (cancelled) {
        return;
      }
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        revalidatePage();
        scheduleNext();
      }, refreshAfterSeconds * 1e3);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshAfterSeconds, revalidatePage, useMockData]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setEventStreamStatus("offline");
      return;
    }
    let source = null;
    let retryHandle = null;
    let closed = false;
    let consecutiveFailures = 0;
    let attempt = 0;
    let attemptStartedAt = null;
    let currentEventStreamStatus = "connecting";
    let offlineLogged = false;
    let manualOverride = false;
    const setEventStreamState = (next) => {
      currentEventStreamStatus = next;
      setEventStreamStatus(next);
    };
    const latencySinceAttempt = () => {
      if (attemptStartedAt === null) {
        return void 0;
      }
      return Math.max(Date.now() - attemptStartedAt, 0);
    };
    const telemetry = (type, status, extras) => {
      logInboxConnectionTelemetry({
        type,
        status,
        attempt,
        consecutiveFailures,
        scenario,
        useMockData,
        ...extras
      });
    };
    const updateFeedbackIndex = (payload) => {
      setFeedbackIndex((current) => {
        const next = { ...current };
        let mutated = false;
        if (payload.ticket) {
          next[payload.ticket.id] = payload.ticket.aiDraft.feedback;
          mutated = true;
        } else if (payload.feedback) {
          const existing = next[payload.feedback.ticketId] ?? [];
          const deduped = existing.filter((entry2) => entry2.id !== payload.feedback.id);
          next[payload.feedback.ticketId] = [...deduped, payload.feedback];
          mutated = true;
        }
        if (!mutated) {
          return current;
        }
        return next;
      });
    };
    const handleEnvelope = (payload) => {
      var _a3, _b3;
      if (payload.type === "handshake") {
        setStreamHandshake(payload);
        consecutiveFailures = 0;
        offlineLogged = false;
        telemetry("connection:handshake", "connected", { latencyMs: latencySinceAttempt() });
        attemptStartedAt = null;
        setEventStreamState("connected");
        const bridgeStatus2 = (_a3 = payload.bridge) == null ? void 0 : _a3.status;
        if (bridgeStatus2 && isConnectionStatus(bridgeStatus2)) {
          updateProviderStatus(bridgeStatus2, { suppressToast: true });
        } else if (!useMockData) {
          updateProviderStatus("connecting", { suppressToast: true });
        } else {
          updateProviderStatus("connected", { suppressToast: true });
        }
        return;
      }
      if (payload.type === "event" && ((_b3 = payload.event) == null ? void 0 : _b3.type) === "bridge:status") {
        const bridgePayload = payload.event.payload;
        const status = bridgePayload == null ? void 0 : bridgePayload.status;
        if (status && isConnectionStatus(status)) {
          const retryDelayMs = typeof (bridgePayload == null ? void 0 : bridgePayload.retryDelayMs) === "number" ? bridgePayload.retryDelayMs : void 0;
          updateProviderStatus(status, { retryDelayMs });
        }
        return;
      }
      updateFeedbackIndex(payload);
      queueDatasetRefresh(payload.id);
      if (payload.draft && payload.draft.ticketId === selectedTicketIdRef.current) {
        setDraftContent(payload.draft.content);
      } else if (payload.ticket && payload.ticket.id === selectedTicketIdRef.current) {
        setDraftContent(payload.ticket.aiDraft.content);
      }
      if (payload.feedback && payload.feedback.ticketId === selectedTicketIdRef.current) {
        setFeedbackComment("");
      }
      if (payload.message) {
        setToast(payload.message);
      }
    };
    const scheduleReconnect = (delay) => {
      if (closed || retryHandle) {
        return;
      }
      telemetry("connection:retry", currentEventStreamStatus, { retryDelayMs: delay });
      retryHandle = setTimeout(() => {
        retryHandle = null;
        connect();
      }, delay);
    };
    const connect = () => {
      if (closed) {
        return;
      }
      attempt += 1;
      attemptStartedAt = Date.now();
      setStreamHandshake(null);
      const status = manualOverride ? "connecting" : consecutiveFailures > 0 ? "reconnecting" : "connecting";
      setEventStreamState(status);
      telemetry("connection:attempt", status);
      if (manualOverride) {
        telemetry("connection:manual-retry", status);
        manualOverride = false;
      }
      source == null ? void 0 : source.close();
      source = new EventSource("/app/inbox/stream");
      source.onopen = () => {
        consecutiveFailures = 0;
        offlineLogged = false;
        telemetry("connection:open", "connected", { latencyMs: latencySinceAttempt() });
        setEventStreamState("connected");
        if (retryHandle) {
          clearTimeout(retryHandle);
          retryHandle = null;
        }
      };
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleEnvelope(payload);
        } catch (error) {
          console.error("inbox stream parse error", error);
        }
      };
      source.onerror = () => {
        if (closed) {
          return;
        }
        consecutiveFailures += 1;
        const delay = Math.min(consecutiveFailures * 2e3, 15e3);
        const nextStatus = consecutiveFailures >= 3 ? "offline" : "reconnecting";
        telemetry("connection:error", nextStatus, { retryDelayMs: delay });
        if (nextStatus === "offline" && !offlineLogged) {
          telemetry("connection:offline", "offline", { reason: "max-retries-exceeded" });
          offlineLogged = true;
        }
        setEventStreamState(nextStatus);
        if (consecutiveFailures === 1) {
          setToast("Realtime updates interrupted. Attempting to reconnect…");
        } else if (nextStatus === "offline" && consecutiveFailures === 3) {
          setToast("Realtime updates are offline. We'll keep retrying in the background.");
        }
        scheduleReconnect(delay);
      };
    };
    const reconnect = () => {
      if (closed) {
        return;
      }
      consecutiveFailures = 0;
      offlineLogged = false;
      manualOverride = true;
      if (retryHandle) {
        clearTimeout(retryHandle);
        retryHandle = null;
      }
      connect();
    };
    connectionRetryRef.current = reconnect;
    connect();
    return () => {
      closed = true;
      connectionRetryRef.current = () => {
      };
      source == null ? void 0 : source.close();
      if (retryHandle) {
        clearTimeout(retryHandle);
      }
    };
  }, [queueDatasetRefresh, scenario, updateProviderStatus, useMockData]);
  useEffect(() => {
    if (draftFetcher.state !== "idle" || !draftFetcher.data) return;
    const updatedTicket = draftFetcher.data.ticket;
    if (updatedTicket) {
      setFeedbackIndex((current) => ({
        ...current,
        [updatedTicket.id]: updatedTicket.aiDraft.feedback
      }));
      if (updatedTicket.id === (activeTicket == null ? void 0 : activeTicket.id)) {
        setDraftContent(updatedTicket.aiDraft.content);
      }
    }
    if (draftFetcher.data.message) {
      setToast(draftFetcher.data.message);
    }
  }, [activeTicket == null ? void 0 : activeTicket.id, draftFetcher.data, draftFetcher.state]);
  useEffect(() => {
    if (feedbackFetcher.state !== "idle" || !feedbackFetcher.data) return;
    const { feedback, ticket, message } = feedbackFetcher.data;
    if (feedback) {
      setFeedbackIndex((current) => {
        const previous = current[feedback.ticketId] ?? [];
        const deduped = previous.filter((entry2) => entry2.id !== feedback.id);
        return {
          ...current,
          [feedback.ticketId]: [...deduped, feedback]
        };
      });
      if (feedback.ticketId === (activeTicket == null ? void 0 : activeTicket.id)) {
        setFeedbackComment("");
      }
    }
    if (ticket && ticket.id === (activeTicket == null ? void 0 : activeTicket.id)) {
      setDraftContent(ticket.aiDraft.content);
    }
    if (message) {
      setToast(message);
    }
  }, [activeTicket == null ? void 0 : activeTicket.id, feedbackFetcher.data, feedbackFetcher.state]);
  const updateSearchParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    const currentValue = params.get(key) ?? "all";
    const normalized = value || "all";
    if (currentValue === normalized) {
      return;
    }
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };
  const handleFilterChange = (value) => {
    updateSearchParam("filter", value);
  };
  const handleChannelChange = (value) => {
    updateSearchParam("channel", value);
  };
  const handleStatusChange = (value) => {
    updateSearchParam("status", value);
  };
  const handleAssignedChange = (value) => {
    updateSearchParam("assigned", value);
  };
  const handleSelectTicket = (ticketId) => {
    setSelectedTicketId(ticketId);
    setFeedbackComment("");
  };
  const handleDraftAction = (intent) => {
    if (!activeTicket) return;
    draftFetcher.submit(
      {
        intent,
        ticketId: activeTicket.id,
        content: draftContent,
        updatedBy: "Operator"
      },
      { method: "post" }
    );
  };
  const handleFeedback = (vote) => {
    if (!activeTicket) return;
    feedbackFetcher.submit(
      {
        intent: "feedback",
        ticketId: activeTicket.id,
        draftId: activeTicket.aiDraft.id,
        vote,
        comment: feedbackComment,
        submittedBy: "Operator"
      },
      { method: "post" }
    );
  };
  const hasTickets = dataset.tickets.length > 0;
  const isSubmitting = draftFetcher.state !== "idle";
  const isFeedbackSubmitting = feedbackFetcher.state !== "idle";
  const currentFeedback = (activeTicket == null ? void 0 : activeTicket.aiDraft.feedback) ?? [];
  const feedbackHistory = currentFeedback.slice(-3).reverse();
  const lastFeedback = currentFeedback[currentFeedback.length - 1];
  const providerBadgeLabel = streamHandshake ? streamHandshake.provider.label : useMockData ? "Mock inbox provider" : "Assistants bridge";
  const providerCapabilitiesLabel = streamHandshake ? `Capabilities: ${formatHandshakeCapabilities(streamHandshake.capabilities)}` : useMockData ? "Mock provider handshake pending…" : "Negotiating Assistants handshake…";
  const providerStatusLabel = `Bridge status: ${CONNECTION_STATUS_LABEL[providerStatus]}`;
  const providerTransportLabel = (streamHandshake == null ? void 0 : streamHandshake.provider.transport) ? streamHandshake.provider.transport.toUpperCase() : null;
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Inbox",
      subtitle: "Monitor conversations, approvals, and SLA breaches across channels.",
      children: [
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            (dataset.alert || dataset.error || useMockData) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              useMockData && /* @__PURE__ */ jsx(
                Banner,
                {
                  tone: scenario === "warning" ? "warning" : "info",
                  title: `Mock state: ${scenario}`,
                  children: /* @__PURE__ */ jsx("p", { children: "Adjust `mockState` in the query string to test UI permutations." })
                }
              ),
              dataset.alert && !dataset.error && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Inbox alert", children: /* @__PURE__ */ jsx("p", { children: dataset.alert }) }),
              dataset.error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Inbox unavailable", children: /* @__PURE__ */ jsx("p", { children: dataset.error }) })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Badge, { tone: CONNECTION_STATUS_TONE[connectionStatus], children: CONNECTION_STATUS_LABEL[connectionStatus] }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: CONNECTION_STATUS_DESCRIPTION[connectionStatus] }),
              connectionStatus === "reconnecting" && /* @__PURE__ */ jsx(
                Button,
                {
                  size: "slim",
                  variant: "plain",
                  onClick: forceReconnect,
                  accessibilityLabel: "Retry realtime connection",
                  children: "Retry"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "150", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Badge, { tone: "info", children: providerBadgeLabel }),
              providerTransportLabel ? /* @__PURE__ */ jsx(Badge, { tone: "subdued", children: providerTransportLabel }) : null,
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: providerCapabilitiesLabel }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: providerStatusLabel })
            ] }),
            connectionStatus === "offline" && /* @__PURE__ */ jsx(
              Banner,
              {
                tone: "critical",
                title: "Realtime updates paused",
                action: { content: "Retry connection", onAction: forceReconnect },
                children: /* @__PURE__ */ jsx("p", { children: "We will keep retrying automatically. Approvals continue, but updates may be stale." })
              }
            ),
            /* @__PURE__ */ jsx(Card, { title: "Tickets overview", sectioned: true, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(MetricRow, { label: "Outstanding", value: metrics.outstanding, tone: "critical" }),
              /* @__PURE__ */ jsx(MetricRow, { label: "Overdue", value: metrics.overdue, tone: "warning" }),
              /* @__PURE__ */ jsx(MetricRow, { label: "Approvals pending", value: metrics.approvalsPending, tone: "attention" }),
              /* @__PURE__ */ jsx(MetricRow, { label: "Escalated", value: metrics.escalated })
            ] }) }),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Ticket filter",
                options: FILTER_OPTIONS,
                value: dataset.filter,
                onChange: handleFilterChange
              }
            ),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Channel",
                options: channelOptions,
                value: dataset.channelFilter,
                onChange: handleChannelChange
              }
            ),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Status",
                options: statusOptions,
                value: dataset.statusFilter,
                onChange: handleStatusChange
              }
            ),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Assignee",
                options: assigneeOptions,
                value: dataset.assignedFilter,
                onChange: handleAssignedChange
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(
              ResourceList,
              {
                resourceName: { singular: "ticket", plural: "tickets" },
                items: dataset.tickets,
                renderItem: (ticket) => /* @__PURE__ */ jsx(
                  ResourceList.Item,
                  {
                    id: ticket.id,
                    accessibilityLabel: `View ${ticket.subject}`,
                    onClick: () => handleSelectTicket(ticket.id),
                    selected: ticket.id === (selectedTicket == null ? void 0 : selectedTicket.id),
                    children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                        /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: ticket.subject }),
                        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                          /* @__PURE__ */ jsx(Badge, { tone: priorityTone(ticket.priority), children: ticket.priority }),
                          /* @__PURE__ */ jsx(Badge, { tone: sentimentTone(ticket.sentiment), children: ticket.sentiment }),
                          /* @__PURE__ */ jsx(Badge, { tone: "info", children: formatChannel(ticket.channel) })
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                        /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                          ticket.customer.name,
                          " • ",
                          formatAssignee(ticket.assignedTo)
                        ] }),
                        /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: formatTimeAgo(ticket.updatedAt) })
                      ] }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "p", children: ticket.lastMessagePreview })
                    ] })
                  }
                )
              }
            ) }) }),
            /* @__PURE__ */ jsx(Layout.Section, { secondary: true, children: hasTickets && activeTicket ? /* @__PURE__ */ jsxs(Card, { title: activeTicket.subject, children: [
              /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Badge, { tone: statusTone(activeTicket.status), children: formatStatus(activeTicket.status) }),
                  /* @__PURE__ */ jsx(Badge, { tone: priorityTone(activeTicket.priority), children: activeTicket.priority }),
                  /* @__PURE__ */ jsx(Badge, { tone: "info", children: formatChannel(activeTicket.channel) }),
                  /* @__PURE__ */ jsx(Badge, { tone: activeTicket.aiDraft.approved ? "success" : "attention", children: activeTicket.aiDraft.approved ? "Approved" : "Needs review" })
                ] }),
                /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "p", children: [
                  activeTicket.customer.name,
                  " • ",
                  formatAssignee(activeTicket.assignedTo)
                ] })
              ] }) }),
              /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Conversation timeline" }),
                activeTicket.timeline.length ? /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: activeTicket.timeline.map((entry2, index2) => /* @__PURE__ */ jsxs(BlockStack, { gap: "150", children: [
                  /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                    /* @__PURE__ */ jsxs(InlineStack, { gap: "150", blockAlign: "center", children: [
                      /* @__PURE__ */ jsx(Badge, { tone: timelineTone(entry2.type), children: timelineLabel(entry2.type) }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "span", children: entry2.actor })
                    ] }),
                    /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", as: "span", children: formatTimeAgo(entry2.timestamp) })
                  ] }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "p", children: entry2.body }),
                  entry2.attachments && entry2.attachments.length > 0 ? /* @__PURE__ */ jsx(InlineStack, { gap: "150", children: entry2.attachments.map((attachment) => /* @__PURE__ */ jsx(Badge, { tone: "info", children: attachment.name }, attachment.id)) }) : null
                ] }, entry2.id)) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Timeline events will appear here as messages arrive." })
              ] }) }),
              /* @__PURE__ */ jsx(Card.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "AI draft response",
                    multiline: true,
                    autoComplete: "off",
                    value: draftContent,
                    onChange: (value) => setDraftContent(value),
                    helpText: `Last updated ${formatTimeAgo(activeTicket.aiDraft.updatedAt)} by ${activeTicket.aiDraft.updatedBy}`,
                    disabled: isSubmitting
                  }
                ),
                /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "Provide edits or approve to log feedback for future training iterations." }),
                /* @__PURE__ */ jsx(InlineStack, { align: "end", children: /* @__PURE__ */ jsxs(ButtonGroup, { children: [
                  /* @__PURE__ */ jsx(Button, { onClick: () => handleDraftAction("edit"), loading: isSubmitting, children: "Save edits" }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      primary: true,
                      onClick: () => handleDraftAction("approve"),
                      loading: isSubmitting,
                      children: "Approve draft"
                    }
                  )
                ] }) })
              ] }) }),
              /* @__PURE__ */ jsx(Card.Section, { subdued: true, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Draft feedback" }),
                  currentFeedback.length ? /* @__PURE__ */ jsx(Badge, { tone: "info", children: currentFeedback.length }) : null
                ] }),
                /* @__PURE__ */ jsx(InlineStack, { gap: "200", children: /* @__PURE__ */ jsxs(ButtonGroup, { children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      icon: ThumbsUpIcon,
                      tone: "success",
                      pressed: (lastFeedback == null ? void 0 : lastFeedback.vote) === "up",
                      onClick: () => handleFeedback("up"),
                      loading: isFeedbackSubmitting && ((_c = feedbackFetcher.formData) == null ? void 0 : _c.get("vote")) === "up",
                      disabled: isSubmitting || isFeedbackSubmitting,
                      children: "Upvote"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      icon: ThumbsDownIcon,
                      tone: "critical",
                      pressed: (lastFeedback == null ? void 0 : lastFeedback.vote) === "down",
                      onClick: () => handleFeedback("down"),
                      loading: isFeedbackSubmitting && ((_d = feedbackFetcher.formData) == null ? void 0 : _d.get("vote")) === "down",
                      disabled: isSubmitting || isFeedbackSubmitting,
                      children: "Downvote"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Feedback notes (optional)",
                    multiline: true,
                    autoComplete: "off",
                    value: feedbackComment,
                    onChange: (value) => setFeedbackComment(value),
                    disabled: isFeedbackSubmitting
                  }
                ),
                currentFeedback.length ? /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Recent feedback signals" }),
                  feedbackHistory.map((entry2) => /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                    /* @__PURE__ */ jsxs(InlineStack, { gap: "150", blockAlign: "center", children: [
                      /* @__PURE__ */ jsx(Badge, { tone: entry2.vote === "up" ? "success" : "critical", children: feedbackVoteLabel[entry2.vote] }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "span", children: entry2.submittedBy })
                    ] }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: formatTimeAgo(entry2.submittedAt) })
                  ] }, entry2.id))
                ] }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "No feedback submitted yet." })
              ] }) })
            ] }) : /* @__PURE__ */ jsx(Card, { sectioned: true, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "No tickets match the current filters." }),
              /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "Adjust the filters on the left to review other inbox conversations." })
            ] }) }) })
          ] }) })
        ] }),
        toast && /* @__PURE__ */ jsx(Toast, { content: toast, duration: 3e3, onDismiss: () => setToast(null) })
      ]
    }
  );
}
const buildMetrics = (dataset) => {
  const outstanding = dataset.tickets.filter((ticket) => ticket.status !== "resolved").length;
  const overdue = dataset.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvalsPending = dataset.tickets.filter(
    (ticket) => ticket.priority !== "low" && ticket.status === "open"
  ).length;
  const escalated = dataset.tickets.filter((ticket) => ticket.status === "escalated").length;
  return { outstanding, overdue, approvalsPending, escalated };
};
function MetricRow({
  label: label2,
  value,
  tone
}) {
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: label2 }),
    /* @__PURE__ */ jsx(Badge, { tone, children: value })
  ] });
}
const route22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: InboxRoute,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const recordInboxConnectionTelemetry = (payload) => {
  const entry2 = {
    id: randomUUID(),
    ...payload
  };
  return entry2;
};
const CONNECTION_STATUSES = [
  "connecting",
  "connected",
  "reconnecting",
  "offline"
];
const TELEMETRY_EVENT_TYPES = [
  "connection:attempt",
  "connection:open",
  "connection:handshake",
  "connection:error",
  "connection:retry",
  "connection:offline",
  "connection:manual-retry"
];
const MOCK_SCENARIOS = ["base", "empty", "warning", "error"];
const toNumber$1 = (value, label2) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label2}`);
  }
  return parsed;
};
const toOptionalNumber = (value, label2) => {
  if (value === void 0 || value === null || value === "") {
    return void 0;
  }
  return toNumber$1(value, label2);
};
const parseBoolean = (value, label2) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "false") {
    return value === "true";
  }
  throw new Error(`Invalid ${label2}`);
};
const parseTelemetryPayload = (raw) => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Telemetry payload must be an object");
  }
  const data = raw;
  const { type, status, attempt, consecutiveFailures, scenario, timestamp, useMockData } = data;
  if (typeof type !== "string" || !TELEMETRY_EVENT_TYPES.includes(type)) {
    throw new Error("Unsupported telemetry event type");
  }
  if (typeof status !== "string" || !CONNECTION_STATUSES.includes(status)) {
    throw new Error("Unsupported telemetry connection status");
  }
  if (typeof scenario !== "string" || !MOCK_SCENARIOS.includes(scenario)) {
    throw new Error("Unsupported telemetry scenario");
  }
  if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
    throw new Error("Invalid telemetry timestamp");
  }
  const payload = {
    type,
    status,
    attempt: toNumber$1(attempt, "attempt"),
    consecutiveFailures: toNumber$1(consecutiveFailures, "consecutiveFailures"),
    scenario,
    useMockData: parseBoolean(useMockData, "useMockData"),
    timestamp
  };
  const latencyMs = toOptionalNumber(data.latencyMs, "latencyMs");
  if (latencyMs !== void 0) {
    payload.latencyMs = latencyMs;
  }
  const retryDelayMs = toOptionalNumber(data.retryDelayMs, "retryDelayMs");
  if (retryDelayMs !== void 0) {
    payload.retryDelayMs = retryDelayMs;
  }
  if (data.reason !== void 0) {
    if (typeof data.reason !== "string") {
      throw new Error("Telemetry reason must be a string");
    }
    payload.reason = data.reason;
  }
  return payload;
};
const readBody = async (request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  const text2 = await request.text();
  if (!text2) {
    throw new Error("Empty telemetry payload");
  }
  try {
    return JSON.parse(text2);
  } catch (error) {
    throw new Error("Invalid telemetry payload");
  }
};
const loader$3 = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 405 });
};
const action$2 = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }
  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }
  try {
    const body = await readBody(request);
    const payload = parseTelemetryPayload(body);
    recordInboxConnectionTelemetry(payload);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.warn("inbox telemetry: failed to record event", error);
    return json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to record telemetry event"
      },
      { status: 400 }
    );
  }
};
const route23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const STREAM_PATH = "/assistants/events";
const INITIAL_RECONNECT_DELAY_MS = 2e3;
const MAX_RECONNECT_DELAY_MS = 3e4;
let streamState = null;
let bridgeStatus = "offline";
const buildBridgeEventPayload = (status, payload) => {
  const body = { status };
  if (payload) {
    const entries = [
      ["attempt", payload.attempt],
      ["consecutiveFailures", payload.consecutiveFailures],
      ["retryDelayMs", payload.retryDelayMs],
      ["reason", payload.reason]
    ];
    for (const [key, value] of entries) {
      if (value !== void 0) {
        body[key] = value;
      }
    }
  }
  return body;
};
const updateBridgeStatus = (status, payload, options) => {
  const shouldEmit = (options == null ? void 0 : options.emit) ?? true;
  if (!(options == null ? void 0 : options.force) && bridgeStatus === status) {
    return;
  }
  bridgeStatus = status;
  if (!shouldEmit) {
    return;
  }
  publishInboxActionEvent({
    success: true,
    message: "",
    event: {
      type: "bridge:status",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      payload: buildBridgeEventPayload(status, payload)
    }
  });
};
const getAssistantsBridgeStatus = () => bridgeStatus;
const getLogger = (custom) => custom ?? console;
const exponentialBackoff = (attempt) => {
  const delay = INITIAL_RECONNECT_DELAY_MS * Math.pow(2, Math.max(attempt - 1, 0));
  return Math.min(delay, MAX_RECONNECT_DELAY_MS);
};
const cleanupState = (state) => {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
  }
  state.abortController.abort();
  state.disposed = true;
};
const parseSseMessage = (payload) => {
  const lines = payload.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean);
  if (lines.length === 0) {
    return null;
  }
  let eventType = "message";
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }
  if (!dataLines.length) {
    return null;
  }
  return {
    eventType,
    data: dataLines.join("\n")
  };
};
const deliverEvent = (rawData, state) => {
  try {
    const parsed = JSON.parse(rawData);
    if (!parsed || typeof parsed !== "object") {
      return;
    }
    const envelope = parsed;
    if (envelope.type !== "event" || !envelope.event) {
      return;
    }
    const response = {
      success: true,
      message: envelope.message || "Action completed",
      ticket: envelope.ticket,
      draft: envelope.draft,
      feedback: envelope.feedback,
      event: envelope.event
    };
    publishInboxActionEvent(response);
  } catch (error) {
    state.logger.warn("assistants stream: failed to parse event", error);
  }
};
const processBuffer = (state) => {
  let buffer = state.pendingBuffer;
  let separatorIndex = buffer.indexOf("\n\n");
  while (separatorIndex !== -1) {
    const chunk = buffer.slice(0, separatorIndex).trim();
    buffer = buffer.slice(separatorIndex + 2);
    if (chunk) {
      const message = parseSseMessage(chunk);
      if (message) {
        if (message.eventType === "ping") ;
        else {
          deliverEvent(message.data, state);
        }
      }
    }
    separatorIndex = buffer.indexOf("\n\n");
  }
  state.pendingBuffer = buffer;
};
const startStream = async (state) => {
  const url = new URL(STREAM_PATH, state.baseUrl).toString();
  const decoder = new TextDecoder();
  const attemptConnection = async () => {
    if (state.disposed) {
      return;
    }
    const attemptNumber = state.consecutiveFailures + 1;
    updateBridgeStatus(
      attemptNumber === 1 ? "connecting" : "reconnecting",
      {
        attempt: attemptNumber,
        consecutiveFailures: state.consecutiveFailures
      },
      { force: attemptNumber !== 1 }
    );
    try {
      const response = await state.fetchImpl(url, {
        headers: { Accept: "text/event-stream" },
        signal: state.abortController.signal
      });
      if (!response.ok) {
        throw new Error(`Assistants events stream failed (${response.status})`);
      }
      if (!response.body) {
        throw new Error("Assistants events stream missing body");
      }
      state.consecutiveFailures = 0;
      updateBridgeStatus("connected", { attempt: attemptNumber });
      const reader = response.body.getReader();
      state.pendingBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (value) {
            state.pendingBuffer += decoder.decode(value, { stream: false });
            processBuffer(state);
          }
          if (!state.abortController.signal.aborted) {
            throw new Error("Assistants events stream ended unexpectedly");
          }
          break;
        }
        state.pendingBuffer += decoder.decode(value, { stream: true });
        processBuffer(state);
        if (state.abortController.signal.aborted) {
          break;
        }
      }
    } catch (error) {
      if (state.abortController.signal.aborted || state.disposed) {
        return;
      }
      state.consecutiveFailures = attemptNumber;
      const delay = exponentialBackoff(state.consecutiveFailures);
      const status = state.consecutiveFailures >= 3 ? "offline" : "reconnecting";
      updateBridgeStatus(
        status,
        {
          attempt: attemptNumber,
          consecutiveFailures: state.consecutiveFailures,
          retryDelayMs: delay,
          reason: error instanceof Error ? error.message : String(error)
        },
        { force: true }
      );
      state.logger.warn(
        `assistants stream: connection error (attempt ${attemptNumber}), retrying in ${delay}ms`,
        error
      );
      state.reconnectTimer = setTimeout(() => {
        if (!state.disposed) {
          void attemptConnection();
        }
      }, delay);
    }
  };
  await attemptConnection();
};
const ensureAssistantsEventStream = (options) => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    getLogger(options.logger).warn(
      "assistants stream: fetch implementation unavailable; skipping bridge"
    );
    updateBridgeStatus("offline", { reason: "fetch-unavailable" }, { force: true, emit: false });
    return;
  }
  if (streamState && !streamState.disposed) {
    if (streamState.baseUrl === options.baseUrl) {
      return;
    }
    cleanupState(streamState);
    streamState = null;
  }
  updateBridgeStatus("connecting", { attempt: 1 }, { force: true });
  const state = {
    baseUrl: options.baseUrl,
    fetchImpl,
    abortController: new AbortController(),
    reconnectTimer: null,
    consecutiveFailures: 0,
    logger: getLogger(options.logger),
    pendingBuffer: "",
    disposed: false
  };
  streamState = state;
  void startStream(state);
};
const stopAssistantsEventStream = (options = {}) => {
  if (!streamState) {
    updateBridgeStatus("offline", void 0, { force: true, emit: options.emit ?? false });
    return;
  }
  cleanupState(streamState);
  streamState = null;
  updateBridgeStatus(
    "offline",
    options.reason ? { reason: options.reason } : void 0,
    { force: true, emit: options.emit ?? false }
  );
};
const encoder = new TextEncoder();
const formatMessage = (payload) => {
  const body = JSON.stringify(payload);
  return encoder.encode(`data: ${body}

`);
};
const formatPing = () => encoder.encode("event: ping\ndata: {}\n\n");
const ASSISTANTS_HANDSHAKE_OPTIONS = {
  provider: {
    id: "assistants-service",
    label: "Assistants Service",
    version: "0.1.0"
  },
  capabilities: ["drafts", "feedback", "attachments"]
};
const resolveStreamHandshake = async (request) => {
  var _a2;
  if (USE_MOCK_DATA) {
    stopAssistantsEventStream({ emit: false });
    return buildInboxHandshake({ bridgeStatus: "connected" });
  }
  let useMockData = true;
  try {
    const { session } = await authenticate.admin(request);
    const settings = await storeSettingsRepository.getSettings(session.shop);
    const assistantsEnabled = Boolean((_a2 = settings == null ? void 0 : settings.toggles) == null ? void 0 : _a2.enableAssistantsProvider);
    useMockData = !assistantsEnabled;
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.warn("inbox stream handshake fallback", error);
    useMockData = true;
  }
  if (useMockData) {
    stopAssistantsEventStream({ emit: false });
    return buildInboxHandshake({ bridgeStatus: "connected" });
  }
  try {
    const baseUrl = resolveAssistantsBaseUrl();
    ensureAssistantsEventStream({ baseUrl });
    return buildInboxHandshake({
      ...ASSISTANTS_HANDSHAKE_OPTIONS,
      bridgeStatus: getAssistantsBridgeStatus()
    });
  } catch (error) {
    console.warn("assistants stream bridge unavailable", error);
    stopAssistantsEventStream({ emit: true, reason: "connection-error" });
    return buildInboxHandshake({ bridgeStatus: "offline" });
  }
};
const loader$2 = async ({ request }) => {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }
  const handshake = await resolveStreamHandshake(request);
  let cleanup = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload) => {
        controller.enqueue(formatMessage(payload));
      };
      const unsubscribe = subscribeToInboxStream(send);
      const pingInterval = setInterval(() => {
        controller.enqueue(formatPing());
      }, 2e4);
      const shutdown = () => {
        clearInterval(pingInterval);
        unsubscribe();
        try {
          controller.close();
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Invalid state")) {
            console.warn("inbox stream close error", error);
          }
        }
        cleanup = null;
      };
      cleanup = shutdown;
      if (request.signal.aborted) {
        shutdown();
        return;
      }
      request.signal.addEventListener("abort", shutdown, { once: true });
      controller.enqueue(formatMessage(handshake));
    },
    cancel() {
      cleanup == null ? void 0 : cleanup();
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
};
const route24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const MS_PER_DAY$1 = 24 * 60 * 60 * 1e3;
const toDateOnlyFromDate = (date) => date.toISOString().slice(0, 10);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const normalizeDateInput = (value) => {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const prefix = trimmed.slice(0, 10);
  if (ISO_DATE_PATTERN.test(prefix)) {
    return prefix;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return void 0;
  }
  return toDateOnlyFromDate(parsed);
};
const toDateOnly = (value, fallback) => {
  const normalized = normalizeDateInput(value);
  if (normalized) {
    return normalized;
  }
  const fallbackNormalized = normalizeDateInput(fallback);
  if (fallbackNormalized) {
    return fallbackNormalized;
  }
  return toDateOnlyFromDate(/* @__PURE__ */ new Date());
};
const DEFAULT_CURRENCY = "USD";
const defaultRangeEnd = /* @__PURE__ */ new Date();
const defaultRangeStart = new Date(defaultRangeEnd.getTime() - 27 * MS_PER_DAY$1);
const DEFAULT_RANGE = {
  label: "Last 28 days",
  start: toDateOnlyFromDate(defaultRangeStart),
  end: toDateOnlyFromDate(defaultRangeEnd)
};
const isCurrencyCode = (value) => {
  return value === "USD" || value === "CAD" || value === "EUR" || value === "GBP";
};
const currencyFormatterCache$1 = /* @__PURE__ */ new Map();
const getCurrencyFormatter$1 = (currency) => {
  let formatter = currencyFormatterCache$1.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    currencyFormatterCache$1.set(currency, formatter);
  }
  return formatter;
};
const firstDefined = (...values) => {
  for (const value of values) {
    if (value !== void 0 && value !== null) {
      return value;
    }
  }
  return void 0;
};
const toNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};
const toCurrencyCode = (value) => {
  if (typeof value === "string" && value.trim().length > 0) {
    const upper = value.trim().toUpperCase();
    if (isCurrencyCode(upper)) {
      return upper;
    }
  }
  return DEFAULT_CURRENCY;
};
const toMoney = (payload) => {
  const amount = toNumber(payload == null ? void 0 : payload.amount, 0);
  const currency = toCurrencyCode((payload == null ? void 0 : payload.currency) ?? (payload == null ? void 0 : payload.currency_code) ?? (payload == null ? void 0 : payload.currencyCode));
  return {
    amount,
    currency,
    formatted: getCurrencyFormatter$1(currency).format(amount)
  };
};
const toGranularity = (value) => {
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return "daily";
};
const toScenario = (value) => {
  if (value === "empty" || value === "warning" || value === "error") {
    return value;
  }
  return "base";
};
const toDatasetState = (value) => {
  if (value === "empty" || value === "warning" || value === "error") {
    return value;
  }
  return "ok";
};
const toVarianceLabel = (value) => {
  if (value === "ahead" || value === "behind") {
    return value;
  }
  return "on_track";
};
const toInventoryStatus = (value) => {
  if (value === "overstock" || value === "stockout_risk") {
    return value;
  }
  return "healthy";
};
const toBackorderRisk = (value) => {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "none";
};
const mapTotals = (totals) => {
  return {
    currentTotal: toMoney(firstDefined(totals == null ? void 0 : totals.current_total, totals == null ? void 0 : totals.currentTotal)),
    previousTotal: toMoney(firstDefined(totals == null ? void 0 : totals.previous_total, totals == null ? void 0 : totals.previousTotal)),
    deltaPercentage: toNumber(firstDefined(totals == null ? void 0 : totals.delta_percentage, totals == null ? void 0 : totals.deltaPercentage), 0),
    averageOrderValue: toMoney(firstDefined(totals == null ? void 0 : totals.average_order_value, totals == null ? void 0 : totals.averageOrderValue)),
    conversionRate: toNumber(firstDefined(totals == null ? void 0 : totals.conversion_rate, totals == null ? void 0 : totals.conversionRate), 0)
  };
};
const mapTrend = (entries) => {
  if (!entries || entries.length === 0) {
    return [];
  }
  const now2 = Date.now();
  return entries.map((entry2, index2) => {
    const fallbackDate = new Date(now2 - index2 * MS_PER_DAY$1);
    return {
      date: toDateOnly(entry2.date, toDateOnlyFromDate(fallbackDate)),
      total: toMoney(entry2.total),
      orders: toNumber(entry2.orders, 0)
    };
  });
};
const mapChannelBreakdown = (entries) => {
  return (entries ?? []).map((entry2, index2) => ({
    channel: entry2.channel ?? `Channel ${index2 + 1}`,
    total: toMoney(entry2.total),
    percentage: toNumber(entry2.percentage, 0)
  }));
};
const mapForecast = (forecast) => {
  if (!forecast) return null;
  return {
    projectedTotal: toMoney(firstDefined(forecast.projected_total, forecast.projectedTotal)),
    variancePercentage: toNumber(firstDefined(forecast.variance_percentage, forecast.variancePercentage), 0),
    varianceLabel: toVarianceLabel(firstDefined(forecast.variance_label, forecast.varianceLabel))
  };
};
const mapVariant = (variant, productId, index2) => {
  const id = variant.id ?? `${productId}-variant-${index2}`;
  return {
    id,
    sku: variant.sku ?? id,
    title: variant.title ?? `Variant ${index2 + 1}`,
    gmv: toMoney(variant.gmv),
    unitsSold: toNumber(firstDefined(variant.units_sold, variant.unitsSold), 0),
    inventoryOnHand: toNumber(firstDefined(variant.inventory_on_hand, variant.inventoryOnHand), 0),
    attachRate: toNumber(firstDefined(variant.attach_rate, variant.attachRate), 0),
    backorderRisk: toBackorderRisk(firstDefined(variant.backorder_risk, variant.backorderRisk))
  };
};
const mapProduct = (product, fallbackId, index2) => {
  const id = product.id ?? fallbackId;
  const variants = (product.variants ?? []).map(
    (variant, variantIndex) => mapVariant(variant, id, variantIndex)
  );
  return {
    product: {
      id,
      title: product.title ?? `Product ${index2 + 1}`,
      gmv: toMoney(product.gmv),
      orders: toNumber(product.orders, 0),
      attachRate: toNumber(firstDefined(product.attach_rate, product.attachRate), 0),
      returningRate: toNumber(firstDefined(product.returning_rate, product.returningRate), 0),
      refundRate: toNumber(firstDefined(product.refund_rate, product.refundRate), 0),
      skuCount: toNumber(firstDefined(product.sku_count, product.skuCount), variants.length),
      inventoryStatus: toInventoryStatus(firstDefined(product.inventory_status, product.inventoryStatus))
    },
    variants
  };
};
const mapCollections = (collections) => {
  const mapped = [];
  const productsByCollection = {};
  const variantsByProduct = {};
  (collections ?? []).forEach((collection, index2) => {
    const id = collection.id ?? `collection-${index2}`;
    mapped.push({
      id,
      title: collection.title ?? `Collection ${index2 + 1}`,
      handle: collection.handle ?? id,
      gmv: toMoney(collection.gmv),
      orders: toNumber(collection.orders, 0),
      conversionRate: toNumber(firstDefined(collection.conversion_rate, collection.conversionRate), 0),
      returningRate: toNumber(firstDefined(collection.returning_rate, collection.returningRate), 0),
      attachRate: toNumber(firstDefined(collection.attach_rate, collection.attachRate), 0),
      deltaPercentage: toNumber(firstDefined(collection.delta_percentage, collection.deltaPercentage), 0)
    });
    const products = collection.products ?? [];
    const mappedProducts = [];
    productsByCollection[id] = mappedProducts;
    products.forEach((product, productIndex) => {
      const fallbackId = `${id}-product-${productIndex}`;
      const { product: mappedProduct, variants } = mapProduct(product, fallbackId, productIndex);
      mappedProducts.push(mappedProduct);
      variantsByProduct[mappedProduct.id] = variants;
    });
  });
  return { collections: mapped, productsByCollection, variantsByProduct };
};
const mapAttachRateInsights = (insights) => (insights ?? []).map((insight, index2) => ({
  id: insight.id ?? `attach-${index2}`,
  primaryProduct: insight.primary_product ?? insight.primaryProduct ?? "",
  attachmentProduct: insight.attachment_product ?? insight.attachmentProduct ?? "",
  attachRate: toNumber(firstDefined(insight.attach_rate, insight.attachRate), 0),
  opportunity: insight.opportunity ?? ""
}));
const mapInventoryRisks = (risks) => (risks ?? []).map((risk, index2) => ({
  id: risk.id ?? `risk-${index2}`,
  productId: risk.product_id ?? risk.productId ?? "",
  title: risk.title ?? "",
  status: risk.status === "overstock" || risk.status === "stockout_risk" ? risk.status : "healthy",
  daysOnHand: toNumber(firstDefined(risk.days_on_hand, risk.daysOnHand), 0),
  recommendedAction: risk.recommended_action ?? risk.recommendedAction ?? ""
}));
const mapCohortHighlights = (highlights) => (highlights ?? []).map((highlight, index2) => ({
  id: highlight.id ?? `highlight-${index2}`,
  title: highlight.title ?? "",
  value: highlight.value ?? "",
  description: highlight.description ?? ""
}));
const mapTopCustomers = (customers) => (customers ?? []).map((customer, index2) => ({
  id: customer.id ?? `customer-${index2}`,
  name: customer.name ?? "",
  email: customer.email ?? "",
  orders: toNumber(customer.orders, 0),
  lifetimeValue: toMoney(firstDefined(customer.lifetime_value, customer.lifetimeValue)),
  lastOrderAt: customer.last_order_at ?? customer.lastOrderAt ?? (/* @__PURE__ */ new Date()).toISOString(),
  firstOrderAt: customer.first_order_at ?? customer.firstOrderAt ?? (/* @__PURE__ */ new Date()).toISOString()
}));
const mapProductsList = (products) => {
  const mapped = [];
  (products ?? []).forEach((product, index2) => {
    const fallbackId = `product-${index2}`;
    const { product: mappedProduct } = mapProduct(product, fallbackId, index2);
    mapped.push(mappedProduct);
  });
  return mapped;
};
const buildAnalyticsUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  const normalizedPath = url.pathname.endsWith("/") ? `${url.pathname}analytics/sales` : `${url.pathname}/analytics/sales`;
  url.pathname = normalizedPath.replace(/\/+/g, "/");
  url.searchParams.set("period", params.period);
  url.searchParams.set("compare", params.compare);
  url.searchParams.set("granularity", params.granularity);
  if (params.bucketDate) url.searchParams.set("bucketDate", params.bucketDate);
  if (params.collectionId) url.searchParams.set("collectionId", params.collectionId);
  if (params.productId) url.searchParams.set("productId", params.productId);
  if (params.variantId) url.searchParams.set("variantId", params.variantId);
  if (params.days) url.searchParams.set("days", String(params.days));
  if (params.rangeStart) url.searchParams.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) url.searchParams.set("rangeEnd", params.rangeEnd);
  return url.toString();
};
const mapAnalyticsResponse = (payload) => {
  var _a2, _b2, _c;
  const granularity = toGranularity(payload.granularity);
  const rangeStart = toDateOnly((_a2 = payload.range) == null ? void 0 : _a2.start, DEFAULT_RANGE.start);
  const rangeEnd = toDateOnly((_b2 = payload.range) == null ? void 0 : _b2.end, DEFAULT_RANGE.end);
  const range = {
    label: ((_c = payload.range) == null ? void 0 : _c.label) ?? DEFAULT_RANGE.label,
    start: rangeStart,
    end: rangeEnd
  };
  const totals = mapTotals(payload.totals);
  const trend = mapTrend(payload.trend);
  const channelBreakdown = mapChannelBreakdown(
    payload.channel_breakdown ?? payload.channelBreakdown
  );
  const forecast = mapForecast(payload.forecast);
  const collectionsMapping = mapCollections(payload.collections);
  return {
    scenario: toScenario(payload.scenario),
    state: toDatasetState(payload.state),
    granularity,
    range,
    totals,
    trend,
    channelBreakdown,
    forecast,
    collections: collectionsMapping.collections,
    productsByCollection: collectionsMapping.productsByCollection,
    variantsByProduct: collectionsMapping.variantsByProduct,
    bestSellers: mapProductsList(payload.best_sellers ?? payload.bestSellers),
    laggards: mapProductsList(payload.laggards),
    attachRateInsights: mapAttachRateInsights(
      payload.attach_rate_insights ?? payload.attachRateInsights
    ),
    overstockRisks: mapInventoryRisks(payload.overstock_risks ?? payload.overstockRisks),
    cohortHighlights: mapCohortHighlights(
      payload.cohort_highlights ?? payload.cohortHighlights
    ),
    topCustomers: mapTopCustomers(payload.top_customers ?? payload.topCustomers),
    alert: payload.alert ?? void 0,
    error: payload.error ?? void 0
  };
};
const fetchSalesAnalytics = async (params) => {
  const baseUrl = params.baseUrl ?? process.env.ANALYTICS_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("Missing ANALYTICS_SERVICE_URL environment variable");
  }
  const url = buildAnalyticsUrl(baseUrl, params.search);
  const headers2 = {
    Accept: "application/json"
  };
  if (params.shopDomain) {
    headers2["X-Shop-Domain"] = params.shopDomain;
  }
  const response = await fetch(url, {
    signal: params.signal,
    headers: headers2
  });
  if (!response.ok) {
    const text2 = await response.text().catch(() => "");
    throw new Error(
      `Analytics service request failed (${response.status} ${response.statusText})` + (text2 ? `: ${text2}` : "")
    );
  }
  const payload = await response.json();
  return mapAnalyticsResponse(payload);
};
const DEFAULT_CACHE_TTL_MINUTES = 6 * 60;
const isObject = (value) => typeof value === "object" && value !== null;
const parseRangeBoundary = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = `${trimmed}T00:00:00.000Z`;
    const date2 = new Date(iso);
    return Number.isNaN(date2.getTime()) ? null : date2;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};
const normalizeSearch = (search) => ({
  period: search.period,
  compare: search.compare,
  granularity: search.granularity,
  bucketDate: search.bucketDate ?? null,
  collectionId: search.collectionId ?? null,
  productId: search.productId ?? null,
  variantId: search.variantId ?? null,
  days: typeof search.days === "number" ? search.days : null
});
const buildMetricKey = (search) => {
  const normalized = normalizeSearch(search);
  const hash = createHash("sha1").update(JSON.stringify(normalized)).digest("hex");
  return `sales_analytics:${hash}`;
};
const isSalesDataset = (value) => {
  if (!isObject(value)) return false;
  return typeof value.range === "object" && value.range !== null && Array.isArray(value.trend) && Array.isArray(value.collections) && typeof value.totals === "object";
};
const isCachedPayload = (value) => isObject(value) && "dataset" in value && isSalesDataset(value.dataset);
const cloneDataset = (dataset) => {
  if (typeof structuredClone === "function") {
    return structuredClone(dataset);
  }
  return JSON.parse(JSON.stringify(dataset));
};
const resolveStoreId$1 = async ({
  explicitStoreId,
  shopDomain
}) => {
  if (explicitStoreId) {
    return explicitStoreId;
  }
  if (!shopDomain) {
    return null;
  }
  const normalized = shopDomain.toLowerCase();
  try {
    const record = await prisma.store.findFirst({
      where: {
        OR: [
          { domain: normalized },
          { myShopifyDomain: normalized }
        ]
      },
      select: { id: true }
    });
    return (record == null ? void 0 : record.id) ?? null;
  } catch (error) {
    console.warn("[sales:cache] Failed to resolve store for domain", {
      shopDomain: normalized,
      error
    });
    return null;
  }
};
const loadCachedDataset = async (args) => {
  try {
    const row = await prisma.kpiCache.findUnique({
      where: {
        storeId_metricKey_rangeStart_rangeEnd: {
          storeId: args.storeId,
          metricKey: args.metricKey,
          rangeStart: args.rangeStart,
          rangeEnd: args.rangeEnd
        }
      }
    });
    if (!row) {
      return null;
    }
    if (row.expiresAt && row.expiresAt.getTime() <= args.now.getTime()) {
      return null;
    }
    const payload = row.payload;
    if (!payload) {
      return null;
    }
    if (isCachedPayload(payload)) {
      return cloneDataset(payload.dataset);
    }
    if (isSalesDataset(payload)) {
      return cloneDataset(payload);
    }
    console.warn("[sales:cache] Ignoring invalid cache payload", {
      storeId: args.storeId,
      metricKey: args.metricKey
    });
    return null;
  } catch (error) {
    console.warn("[sales:cache] Failed to load sales analytics cache", {
      storeId: args.storeId,
      metricKey: args.metricKey,
      error
    });
    return null;
  }
};
const persistCache = async (args) => {
  const payload = {
    dataset: args.dataset,
    search: normalizeSearch(args.search),
    storedAt: args.now.toISOString()
  };
  const ttlMinutes = typeof args.ttlMinutes === "number" && args.ttlMinutes > 0 ? args.ttlMinutes : DEFAULT_CACHE_TTL_MINUTES;
  const expiresAt = new Date(args.now.getTime() + ttlMinutes * 60 * 1e3);
  try {
    await prisma.kpiCache.upsert({
      where: {
        storeId_metricKey_rangeStart_rangeEnd: {
          storeId: args.storeId,
          metricKey: args.metricKey,
          rangeStart: args.rangeStart,
          rangeEnd: args.rangeEnd
        }
      },
      update: {
        payload,
        refreshedAt: args.now,
        expiresAt
      },
      create: {
        storeId: args.storeId,
        metricKey: args.metricKey,
        rangeStart: args.rangeStart,
        rangeEnd: args.rangeEnd,
        payload,
        refreshedAt: args.now,
        expiresAt
      }
    });
  } catch (error) {
    console.warn("[sales:cache] Failed to persist sales analytics cache", {
      storeId: args.storeId,
      metricKey: args.metricKey,
      error
    });
  }
};
const fetchSalesAnalyticsWithCache = async (options) => {
  const { cache, ...fetchParams } = options;
  const now2 = (cache == null ? void 0 : cache.now) ?? /* @__PURE__ */ new Date();
  const rangeStart = parseRangeBoundary(fetchParams.search.rangeStart);
  const rangeEnd = parseRangeBoundary(fetchParams.search.rangeEnd);
  let storeId = null;
  if (rangeStart && rangeEnd) {
    storeId = await resolveStoreId$1({
      explicitStoreId: (cache == null ? void 0 : cache.storeId) ?? null,
      shopDomain: fetchParams.shopDomain ?? null
    });
    if (storeId) {
      const metricKey = buildMetricKey(fetchParams.search);
      const cached = await loadCachedDataset({
        storeId,
        metricKey,
        rangeStart,
        rangeEnd,
        now: now2
      });
      if (cached) {
        return cached;
      }
      const dataset = await fetchSalesAnalytics(fetchParams);
      await persistCache({
        storeId,
        metricKey,
        rangeStart,
        rangeEnd,
        dataset,
        search: fetchParams.search,
        now: now2,
        ttlMinutes: cache == null ? void 0 : cache.ttlMinutes
      });
      return dataset;
    }
  }
  return fetchSalesAnalytics(fetchParams);
};
const ISO = (value) => value;
const analyticsSalesBase = {
  scenario: "base",
  state: "ok",
  granularity: "daily",
  range: {
    label: "Last 28 days",
    start: ISO("2025-08-30T00:00:00Z"),
    end: ISO("2025-09-26T23:59:59Z")
  },
  totals: {
    current_total: { amount: 98210.45, currency: "USD" },
    previousTotal: { amount: 93425.87, currencyCode: "USD" },
    delta_percentage: 5.1,
    averageOrderValue: { amount: 195.32, currency: "USD" },
    conversion_rate: 2.6
  },
  trend: [
    { date: "2025-08-30", total: { amount: 3580.12, currency: "USD" }, orders: 27 },
    { date: "2025-08-31", total: { amount: 3721.45, currency: "USD" }, orders: 28 },
    { date: "2025-09-01", total: { amount: 4102.18, currency: "USD" }, orders: 32 },
    { date: "2025-09-02", total: { amount: 3895.76, currency: "USD" }, orders: 30 }
  ],
  channelBreakdown: [
    { channel: "Online Store", total: { amount: 61200.33, currency: "USD" }, percentage: 62 },
    { channel: "Wholesale", total: { amount: 22100.12, currency: "USD" }, percentage: 23 },
    { channel: "Retail", total: { amount: 14910, currency: "USD" }, percentage: 15 }
  ],
  forecast: {
    projected_total: { amount: 101500.12, currency: "USD" },
    variancePercentage: 3.4,
    variance_label: "ahead"
  },
  collections: [
    {
      id: "gid://shopify/Collection/100",
      title: "Performance Kits",
      handle: "performance-kits",
      gmv: { amount: 35800.4, currency: "USD" },
      orders: 145,
      conversionRate: 2.9,
      returning_rate: 28.5,
      attach_rate: 15.2,
      delta_percentage: 4.3,
      products: [
        {
          id: "gid://shopify/Product/1001",
          title: "Stage 3 Supercharger",
          gmv: { amount: 18210.55, currency: "USD" },
          orders: 58,
          attach_rate: 16.4,
          returningRate: 24.1,
          refund_rate: 1.1,
          sku_count: 2,
          inventory_status: "healthy",
          variants: [
            {
              id: "gid://shopify/ProductVariant/1001",
              sku: "SC-3-GT",
              title: "GT",
              gmv: { amount: 10210.1, currency: "USD" },
              units_sold: 34,
              inventory_on_hand: 96,
              attach_rate: 12.4,
              backorder_risk: "low"
            },
            {
              id: "gid://shopify/ProductVariant/1002",
              sku: "SC-3-SS",
              title: "SS",
              gmv: { amount: 8010.45, currency: "USD" },
              unitsSold: 24,
              inventoryOnHand: 65,
              attachRate: 18.6,
              backorderRisk: "none"
            }
          ]
        }
      ]
    },
    {
      id: "gid://shopify/Collection/200",
      title: "Cooling",
      handle: "cooling",
      gmv: { amount: 18410.05, currency: "USD" },
      orders: 88,
      conversion_rate: 2.4,
      returningRate: 31.2,
      attach_rate: 12.1,
      deltaPercentage: 6.1,
      products: [
        {
          id: "gid://shopify/Product/2001",
          title: "High-Flow Radiator",
          gmv: { amount: 10840.77, currency: "USD" },
          orders: 42,
          attach_rate: 11.8,
          returning_rate: 27.4,
          refund_rate: 0.9,
          sku_count: 1,
          inventory_status: "overstock",
          variants: [
            {
              id: "gid://shopify/ProductVariant/2001",
              sku: "RAD-HF-01",
              title: "Standard",
              gmv: { amount: 10840.77, currency: "USD" },
              units_sold: 42,
              inventory_on_hand: 180,
              attach_rate: 9.5,
              backorder_risk: "none"
            }
          ]
        }
      ]
    }
  ],
  bestSellers: [
    {
      id: "gid://shopify/Product/1001",
      title: "Stage 3 Supercharger",
      gmv: { amount: 18210.55, currency: "USD" },
      orders: 58,
      attach_rate: 16.4,
      returningRate: 24.1,
      refund_rate: 1.1,
      sku_count: 2,
      inventory_status: "healthy"
    }
  ],
  laggards: [
    {
      id: "gid://shopify/Product/2002",
      title: "Coolant Hose Kit",
      gmv: { amount: 3020.12, currency: "USD" },
      orders: 11,
      attach_rate: 6.2,
      returningRate: 18.4,
      refund_rate: 2.4,
      sku_count: 1,
      inventory_status: "stockout_risk"
    }
  ],
  attach_rate_insights: [
    {
      id: "attach-base-1",
      primary_product: "Stage 3 Supercharger",
      attachment_product: "High-Flow Radiator",
      attach_rate: 12.5,
      opportunity: "Bundle radiator with supercharger upgrade"
    }
  ],
  overstock_risks: [
    {
      id: "overstock-base-1",
      product_id: "gid://shopify/Product/2001",
      title: "High-Flow Radiator",
      status: "overstock",
      days_on_hand: 54,
      recommended_action: "Launch Labor Day promo"
    }
  ],
  cohort_highlights: [
    {
      id: "cohort-base-1",
      title: "High-value repeat",
      value: "38",
      description: "Customers with >$1k LTV ordering twice in 60 days"
    }
  ],
  top_customers: [
    {
      id: "customer-base-1",
      name: "Eva Motors",
      email: "eva@example.com",
      orders: 6,
      lifetime_value: { amount: 2480.5, currency: "USD" },
      last_order_at: ISO("2025-09-24T16:00:00Z"),
      first_order_at: ISO("2024-03-10T14:32:00Z")
    }
  ]
};
const analyticsSalesWarning = {
  scenario: "warning",
  state: "warning",
  granularity: "weekly",
  range: {
    label: "Last 4 weeks",
    start: ISO("2025-09-01T00:00:00Z"),
    end: ISO("2025-09-28T00:00:00Z")
  },
  totals: {
    current_total: { amount: 125000.55, currency: "USD" },
    previousTotal: { amount: 115000.12, currencyCode: "USD" },
    delta_percentage: 8.7,
    averageOrderValue: { amount: 220.45, currency: "USD" },
    conversion_rate: 2.3
  },
  trend: [
    { date: "2025-09-01", total: { amount: 5e3, currency: "USD" }, orders: 40 },
    { date: "2025-09-02", total: { amount: 5200, currency: "USD" }, orders: 42 },
    { date: "2025-09-03", total: { amount: 5300, currency: "USD" }, orders: 44 },
    { date: "2025-09-04", total: { amount: 5400, currency: "USD" }, orders: 46 }
  ],
  channel_breakdown: [
    { channel: "Online Store", total: { amount: 85e3, currency: "USD" }, percentage: 68 },
    { channel: "Retail", total: { amount: 4e4, currency: "USD" }, percentage: 32 }
  ],
  forecast: {
    projected_total: { amount: 13e4, currency: "USD" },
    variancePercentage: 4.2,
    variance_label: "ahead"
  },
  collections: [
    {
      id: "gid://shopify/Collection/1",
      title: "EFI Components",
      handle: "efi-components",
      gmv: { amount: 42e3, currency: "USD" },
      orders: 180,
      conversionRate: 2.7,
      returning_rate: 35,
      attach_rate: 18,
      delta_percentage: 6.4,
      products: [
        {
          id: "gid://shopify/Product/1",
          title: "Fuel Pump Kit",
          gmv: { amount: 18e3, currency: "USD" },
          orders: 75,
          attach_rate: 22.5,
          returningRate: 28,
          refund_rate: 2.1,
          sku_count: 3,
          inventory_status: "healthy",
          variants: [
            {
              id: "gid://shopify/ProductVariant/1",
              sku: "FP-1000",
              title: "Standard",
              gmv: { amount: 1e4, currency: "USD" },
              units_sold: 50,
              inventory_on_hand: 120,
              attach_rate: 15,
              backorder_risk: "low"
            }
          ]
        }
      ]
    }
  ],
  best_sellers: [
    {
      id: "gid://shopify/Product/4",
      title: "Injector Set",
      gmv: { amount: 22e3, currency: "USD" },
      orders: 90,
      attach_rate: 16.4,
      returningRate: 30,
      refundRate: 1.2,
      skuCount: 2,
      inventoryStatus: "overstock"
    }
  ],
  laggards: [
    {
      id: "gid://shopify/Product/5",
      title: "Fuel Filter",
      gmv: { amount: 2500, currency: "USD" },
      orders: 8,
      attach_rate: 4.5,
      returningRate: 10,
      refund_rate: 3.5,
      sku_count: 1,
      inventory_status: "stockout_risk"
    }
  ],
  attach_rate_insights: [
    {
      id: "insight-1",
      primary_product: "Fuel Pump Kit",
      attachment_product: "Pressure Regulator",
      attach_rate: 12.5,
      opportunity: "Bundle with regulator"
    }
  ],
  overstock_risks: [
    {
      id: "risk-1",
      product_id: "gid://shopify/Product/3",
      title: "Hose Kit",
      status: "overstock",
      days_on_hand: 65,
      recommended_action: "Run clearance promo"
    }
  ],
  cohort_highlights: [
    {
      id: "highlight-1",
      title: "Top Repeat Cohort",
      value: "42",
      description: "Customers ordering 3+ times"
    }
  ],
  top_customers: [
    {
      id: "customer-1",
      name: "Alex Driver",
      email: "alex@example.com",
      orders: 8,
      lifetime_value: { amount: 3200, currency: "USD" },
      last_order_at: ISO("2025-09-25T15:00:00Z"),
      first_order_at: ISO("2024-04-02T12:00:00Z")
    }
  ],
  alert: "Live data delayed"
};
const analyticsSalesEmpty = {
  scenario: "empty",
  state: "empty",
  granularity: "daily",
  range: {
    label: "Last 7 days",
    start: ISO("2025-09-20T00:00:00Z"),
    end: ISO("2025-09-26T23:59:59Z")
  },
  totals: {
    current_total: { amount: 0, currency: "USD" },
    previousTotal: { amount: 4500.34, currencyCode: "USD" },
    delta_percentage: -100,
    averageOrderValue: { amount: 0, currency: "USD" },
    conversion_rate: 0
  },
  trend: [],
  channelBreakdown: [],
  forecast: {
    projected_total: { amount: 0, currency: "USD" },
    variancePercentage: -100,
    variance_label: "behind"
  },
  collections: [],
  bestSellers: [],
  laggards: [],
  attachRateInsights: [],
  overstockRisks: [],
  cohortHighlights: [],
  topCustomers: [],
  alert: "No sales recorded in the selected period",
  error: null
};
const analyticsSalesError = {
  scenario: "error",
  state: "error",
  granularity: "daily",
  range: {
    label: "Last 7 days",
    start: ISO("2025-09-20T00:00:00Z"),
    end: ISO("2025-09-26T23:59:59Z")
  },
  totals: {
    current_total: { amount: 0, currency: "USD" },
    previousTotal: { amount: 0, currencyCode: "USD" },
    delta_percentage: 0,
    averageOrderValue: { amount: 0, currency: "USD" },
    conversion_rate: 0
  },
  trend: [],
  channelBreakdown: [],
  forecast: null,
  collections: [],
  bestSellers: [],
  laggards: [],
  attachRateInsights: [],
  overstockRisks: [],
  cohortHighlights: [],
  topCustomers: [],
  alert: null,
  error: "Sales insights are temporarily unavailable. Try again shortly."
};
const analyticsSalesFixtures = {
  base: analyticsSalesBase,
  warning: analyticsSalesWarning,
  empty: analyticsSalesEmpty,
  error: analyticsSalesError
};
const SCENARIO_TO_FIXTURE = {
  base: "base",
  warning: "warning",
  empty: "empty",
  error: "error"
};
const resolveFixtureKey = (scenario) => {
  return SCENARIO_TO_FIXTURE[scenario] ?? "base";
};
const buildSalesFixtureDataset = (options) => {
  const fixtureKey = resolveFixtureKey(options.scenario);
  const payload = structuredClone(analyticsSalesFixtures[fixtureKey]);
  payload.granularity = options.granularity;
  if (options.range) {
    payload.range = {
      label: options.range.label,
      start: options.range.start,
      end: options.range.end
    };
  }
  return mapAnalyticsResponse(payload);
};
const GRANULARITY_VALUES = ["daily", "weekly", "monthly"];
const GRANULARITY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" }
];
const PERIOD_OPTIONS = ["7d", "14d", "28d", "90d"];
const PERIOD_TO_DAYS = {
  "7d": 7,
  "14d": 14,
  "28d": 28,
  "90d": 90
};
const DEFAULT_PERIOD = "28d";
const mapRangeKeyToPeriod = (range) => {
  switch (range) {
    case "today":
      return "7d";
    case "7d":
    case "14d":
    case "28d":
    case "90d":
      return range;
    default:
      return DEFAULT_PERIOD;
  }
};
const mapPeriodToRangeKey = (period) => {
  switch (period) {
    case "14d":
      return "14d";
    case "7d":
    case "28d":
    case "90d":
      return period;
    default:
      return DEFAULT_DASHBOARD_RANGE;
  }
};
const MS_PER_DAY = 24 * 60 * 60 * 1e3;
const computeRangeDays = (range, fallback) => {
  if (!(range == null ? void 0 : range.start) || !(range == null ? void 0 : range.end)) return fallback;
  const start = Date.parse(range.start);
  const end = Date.parse(range.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return fallback;
  }
  const diff = end - start;
  if (!Number.isFinite(diff)) {
    return fallback;
  }
  const days = Math.floor(diff / MS_PER_DAY) + 1;
  if (!Number.isFinite(days) || days <= 0) {
    return fallback;
  }
  return days;
};
const toDateOnlyString = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  const [datePart] = trimmed.split("T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  return trimmed;
};
const COMPARE_OPTIONS = ["previous_period", "previous_year"];
const COMPARE_SELECT_OPTIONS = [
  { label: "Previous period", value: "previous_period" },
  { label: "Previous year", value: "previous_year" }
];
const SEARCH_SCHEMA = z.object({
  period: z.enum(PERIOD_OPTIONS).default(DEFAULT_PERIOD),
  compare: z.enum(COMPARE_OPTIONS).default("previous_period"),
  granularity: z.enum(GRANULARITY_VALUES).default("daily"),
  bucketDate: z.string().optional().refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: "Invalid bucket date"
  }),
  collectionId: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional()
});
const currencyFormatterCache = /* @__PURE__ */ new Map();
const getCurrencyFormatter = (currency) => {
  let formatter = currencyFormatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    currencyFormatterCache.set(currency, formatter);
  }
  return formatter;
};
const makeMoney = (currency, amount) => {
  const rounded = Math.round(amount * 100) / 100;
  return {
    amount: rounded,
    currency,
    formatted: getCurrencyFormatter(currency).format(rounded)
  };
};
const scaleMoney = (money, factor) => {
  return makeMoney(money.currency, money.amount * factor);
};
const scaleCount = (value, factor) => {
  if (factor === 1) return Math.round(value);
  return Math.max(0, Math.round(value * factor));
};
const sumNumbers = (values) => values.reduce((total, current) => total + current, 0);
const averageNumbers = (values) => {
  if (!values.length) return 0;
  return sumNumbers(values) / values.length;
};
const toOneDecimal = (value) => Number(value.toFixed(1));
const parseSearch = (url) => {
  const raw = {};
  const keys = [
    "period",
    "compare",
    "granularity",
    "bucketDate",
    "collectionId",
    "productId",
    "variantId"
  ];
  keys.forEach((key) => {
    const value = url.searchParams.get(key);
    raw[key] = value && value.trim().length > 0 ? value.trim() : void 0;
  });
  if (!raw.period) {
    const rangeValue = url.searchParams.get("range");
    if (rangeValue) {
      const normalizedRange = resolveDashboardRangeKey(rangeValue, DEFAULT_DASHBOARD_RANGE);
      raw.period = mapRangeKeyToPeriod(normalizedRange);
    }
  }
  if (!raw.period) {
    const daysValue = url.searchParams.get("days");
    if (daysValue) {
      const parsedDays = Number(daysValue);
      if (Number.isFinite(parsedDays)) {
        const mapped = Object.entries(PERIOD_TO_DAYS).find(([, days]) => days === parsedDays);
        if (mapped) {
          raw.period = mapped[0];
        } else if (parsedDays === 30) {
          raw.period = "28d";
        }
      }
    }
  }
  const result = SEARCH_SCHEMA.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  console.warn("sales loader: falling back to defaults due to invalid params", result.error.flatten());
  return SEARCH_SCHEMA.parse({});
};
const selectEntities = (dataset, filters) => {
  const collection = filters.collectionId ? dataset.collections.find((item) => item.id === filters.collectionId) : void 0;
  const products = collection ? dataset.productsByCollection[collection.id] ?? [] : [];
  const product = collection && filters.productId ? products.find((item) => item.id === filters.productId) : void 0;
  const variants = product ? dataset.variantsByProduct[product.id] ?? [] : [];
  const variant = product && filters.variantId ? variants.find((item) => item.id === filters.variantId) : void 0;
  const level = product ? "variants" : collection ? "products" : "collections";
  return { collection, products, product, variants, variant, level };
};
const computeFactors = (dataset, bucket) => {
  if (!bucket) {
    return { revenue: 1, orders: 1 };
  }
  const totalRevenue = dataset.totals.currentTotal.amount || 1;
  const revenueFactor = bucket.total.amount / totalRevenue || 0;
  const totalOrders = dataset.trend.reduce((total, entry2) => total + entry2.orders, 0) || 1;
  const ordersFactor = bucket.orders / totalOrders || revenueFactor || 1;
  return {
    revenue: Math.max(revenueFactor, 0),
    orders: Math.max(ordersFactor, 0)
  };
};
const computeCollectionMetrics = (rows, currency) => ({
  gmv: makeMoney(currency, sumNumbers(rows.map((row) => row.gmv.amount))),
  orders: sumNumbers(rows.map((row) => row.orders)),
  attachRate: toOneDecimal(averageNumbers(rows.map((row) => row.attachRate))),
  returningRate: toOneDecimal(averageNumbers(rows.map((row) => row.returningRate)))
});
const computeProductMetrics = (rows, currency) => ({
  gmv: makeMoney(currency, sumNumbers(rows.map((row) => row.gmv.amount))),
  orders: sumNumbers(rows.map((row) => row.orders)),
  attachRate: toOneDecimal(averageNumbers(rows.map((row) => row.attachRate))),
  returningRate: toOneDecimal(averageNumbers(rows.map((row) => row.returningRate)))
});
const computeVariantMetrics = (rows, currency, product) => ({
  gmv: makeMoney(currency, sumNumbers(rows.map((row) => row.gmv.amount))),
  orders: sumNumbers(rows.map((row) => row.unitsSold)),
  attachRate: toOneDecimal(averageNumbers(rows.map((row) => row.attachRate))),
  returningRate: toOneDecimal((product == null ? void 0 : product.returningRate) ?? 0)
});
const computeDrilldown = (dataset, selection, factors) => {
  const currency = dataset.totals.currentTotal.currency;
  if (selection.level === "collections") {
    const rows2 = dataset.collections.map((row) => ({
      ...row,
      gmv: scaleMoney(row.gmv, factors.revenue),
      orders: scaleCount(row.orders, factors.orders)
    }));
    return {
      level: "collections",
      rows: rows2,
      metrics: computeCollectionMetrics(rows2, currency),
      nextLevel: "products"
    };
  }
  if (selection.level === "products") {
    const collection = selection.collection;
    const baseRows = dataset.productsByCollection[collection.id] ?? [];
    const rows2 = baseRows.map((row) => ({
      ...row,
      gmv: scaleMoney(row.gmv, factors.revenue),
      orders: scaleCount(row.orders, factors.orders)
    }));
    return {
      level: "products",
      rows: rows2,
      metrics: computeProductMetrics(rows2, currency),
      nextLevel: "variants",
      selectedCollection: {
        ...collection,
        gmv: scaleMoney(collection.gmv, factors.revenue),
        orders: scaleCount(collection.orders, factors.orders)
      }
    };
  }
  const product = selection.product;
  const variants = dataset.variantsByProduct[product.id] ?? [];
  const rows = variants.map((row) => ({
    ...row,
    gmv: scaleMoney(row.gmv, factors.revenue),
    unitsSold: scaleCount(row.unitsSold, factors.orders)
  }));
  return {
    level: "variants",
    rows,
    metrics: computeVariantMetrics(rows, currency, product),
    nextLevel: null,
    selectedCollection: selection.collection ? {
      ...selection.collection,
      gmv: scaleMoney(selection.collection.gmv, factors.revenue),
      orders: scaleCount(selection.collection.orders, factors.orders)
    } : void 0,
    selectedProduct: {
      ...product,
      gmv: scaleMoney(product.gmv, factors.revenue),
      orders: scaleCount(product.orders, factors.orders)
    }
  };
};
const buildSearchParams = (base, filters) => {
  const params = new URLSearchParams();
  if (base.has("mockState")) {
    const mockState = base.get("mockState");
    if (mockState) {
      params.set("mockState", mockState);
    }
  }
  params.set("period", filters.period);
  params.set("compare", filters.compare);
  params.set("granularity", filters.granularity);
  if (filters.bucketDate) params.set("bucketDate", filters.bucketDate);
  if (filters.collectionId) params.set("collectionId", filters.collectionId);
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.variantId) params.set("variantId", filters.variantId);
  return params;
};
const buildHref = (url, filters, overrides) => {
  const params = buildSearchParams(url.searchParams, filters);
  Object.entries(overrides).forEach(([key, value]) => {
    const param = key;
    if (value === null || value === void 0 || value === "") {
      params.delete(param);
    } else {
      params.set(param, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};
const buildBreadcrumbs = (url, filters, selection, rangeLabel, level) => {
  const breadcrumbs = [];
  const baseLabel = filters.bucketDate ? new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(filters.bucketDate)) : rangeLabel;
  breadcrumbs.push({
    label: baseLabel,
    ...filters.bucketDate ? {
      href: buildHref(url, filters, {
        bucketDate: null,
        collectionId: null,
        productId: null,
        variantId: null
      })
    } : {}
  });
  if (selection.collection) {
    breadcrumbs.push({
      label: selection.collection.title,
      ...level !== "collections" ? {
        href: buildHref(url, filters, {
          collectionId: null,
          productId: null,
          variantId: null
        })
      } : {}
    });
  }
  if (selection.product) {
    breadcrumbs.push({
      label: selection.product.title,
      ...level === "variants" ? {
        href: buildHref(url, filters, { productId: null, variantId: null })
      } : {}
    });
  }
  return breadcrumbs;
};
const escapeCsv = (value) => {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};
const generateCsv = (drilldown) => {
  const lines = [];
  switch (drilldown.level) {
    case "collections": {
      lines.push(
        "Collection,Handle,GMV,Orders,Conversion Rate,Returning Rate,Attach Rate,Delta %"
      );
      drilldown.rows.forEach((row) => {
        lines.push(
          [
            escapeCsv(row.title),
            escapeCsv(row.handle),
            escapeCsv(row.gmv.formatted),
            escapeCsv(row.orders),
            escapeCsv(`${row.conversionRate.toFixed(2)}%`),
            escapeCsv(`${row.returningRate.toFixed(1)}%`),
            escapeCsv(`${row.attachRate.toFixed(1)}%`),
            escapeCsv(`${row.deltaPercentage.toFixed(1)}%`)
          ].join(",")
        );
      });
      break;
    }
    case "products": {
      lines.push(
        "Product,GMV,Orders,Attach Rate,Returning Rate,Refund Rate,SKU Count,Inventory Status"
      );
      drilldown.rows.forEach((row) => {
        lines.push(
          [
            escapeCsv(row.title),
            escapeCsv(row.gmv.formatted),
            escapeCsv(row.orders),
            escapeCsv(`${row.attachRate.toFixed(1)}%`),
            escapeCsv(`${row.returningRate.toFixed(1)}%`),
            escapeCsv(`${row.refundRate.toFixed(1)}%`),
            escapeCsv(row.skuCount),
            escapeCsv(row.inventoryStatus.replace(/_/g, " "))
          ].join(",")
        );
      });
      break;
    }
    case "variants": {
      lines.push(
        "Variant,SKU,GMV,Units Sold,Attach Rate,Inventory On Hand,Backorder Risk"
      );
      drilldown.rows.forEach((row) => {
        lines.push(
          [
            escapeCsv(row.title),
            escapeCsv(row.sku),
            escapeCsv(row.gmv.formatted),
            escapeCsv(row.unitsSold),
            escapeCsv(`${row.attachRate.toFixed(1)}%`),
            escapeCsv(row.inventoryOnHand),
            escapeCsv(row.backorderRisk.replace(/_/g, " "))
          ].join(",")
        );
      });
      break;
    }
    default: {
      lines.push("No data available");
    }
  }
  if (lines.length === 1 && !lines[0]) {
    lines.push("No records");
  }
  return `${lines.join("\n")}
`;
};
const loader$1 = async ({ request }) => {
  var _a2, _b2, _c, _d;
  const url = new URL(request.url);
  const search = parseSearch(url);
  const scenario = scenarioFromRequest$1(request);
  const fallbackRange = mapPeriodToRangeKey(search.period);
  const rawRangeParam = url.searchParams.get("range");
  const activeRange = rawRangeParam ? resolveDashboardRangeKey(rawRangeParam, fallbackRange) : fallbackRange;
  const rangeSelection = buildDashboardRangeSelection(activeRange);
  const normalizedPeriod = mapRangeKeyToPeriod(activeRange);
  const normalizedSearch = {
    ...search,
    period: normalizedPeriod
  };
  const rangeStartDate = toDateOnlyString(rangeSelection.start);
  const rangeEndDate = toDateOnlyString(rangeSelection.end);
  const fixtureRange = {
    label: rangeSelection.label,
    start: rangeStartDate,
    end: rangeEndDate,
    days: rangeSelection.days
  };
  const fixtureDataset = buildSalesFixtureDataset({
    scenario,
    granularity: normalizedSearch.granularity,
    range: fixtureRange
  });
  let dataset = fixtureDataset;
  let usingMockDataset = USE_MOCK_DATA;
  if (!USE_MOCK_DATA) {
    const auth = await authenticate.admin(request);
    try {
      dataset = await fetchSalesAnalyticsWithCache({
        shopDomain: ((_a2 = auth == null ? void 0 : auth.session) == null ? void 0 : _a2.shop) ?? void 0,
        signal: request.signal,
        search: {
          period: normalizedSearch.period,
          compare: normalizedSearch.compare,
          granularity: normalizedSearch.granularity,
          bucketDate: normalizedSearch.bucketDate ?? void 0,
          collectionId: normalizedSearch.collectionId ?? void 0,
          productId: normalizedSearch.productId ?? void 0,
          variantId: normalizedSearch.variantId ?? void 0,
          days: rangeSelection.days,
          rangeStart: rangeStartDate,
          rangeEnd: rangeEndDate
        }
      });
      usingMockDataset = false;
    } catch (error) {
      console.error("sales loader: analytics fetch failed", error);
      const fallbackMessage = "Sales analytics temporarily unavailable — showing mock data";
      dataset = {
        ...fixtureDataset,
        state: fixtureDataset.state === "ok" ? "warning" : fixtureDataset.state,
        alert: fixtureDataset.alert ? `${fallbackMessage}. ${fixtureDataset.alert}` : fallbackMessage
      };
      usingMockDataset = true;
    }
  }
  const datasetRangeDays = computeRangeDays(dataset.range, rangeSelection.days);
  const bucket = normalizedSearch.bucketDate ? dataset.trend.find((entry2) => entry2.date === normalizedSearch.bucketDate) : void 0;
  const resolvedSearch = {
    ...normalizedSearch,
    bucketDate: bucket == null ? void 0 : bucket.date
  };
  const selection = selectEntities(dataset, resolvedSearch);
  const filters = {
    period: resolvedSearch.period,
    compare: resolvedSearch.compare,
    granularity: resolvedSearch.granularity,
    bucketDate: resolvedSearch.bucketDate ?? null,
    collectionId: ((_b2 = selection.collection) == null ? void 0 : _b2.id) ?? null,
    productId: ((_c = selection.product) == null ? void 0 : _c.id) ?? null,
    variantId: ((_d = selection.variant) == null ? void 0 : _d.id) ?? null,
    days: datasetRangeDays,
    range: activeRange
  };
  const factors = computeFactors(dataset, bucket);
  const drilldownCore = computeDrilldown(dataset, selection, factors);
  const breadcrumbs = buildBreadcrumbs(
    url,
    filters,
    selection,
    dataset.range.label,
    drilldownCore.level
  );
  let drilldown;
  if (drilldownCore.level === "collections") {
    drilldown = { ...drilldownCore, breadcrumbs };
  } else if (drilldownCore.level === "products") {
    drilldown = { ...drilldownCore, breadcrumbs };
  } else {
    drilldown = { ...drilldownCore, breadcrumbs };
  }
  return json(
    {
      dataset,
      scenario,
      useMockData: usingMockDataset,
      filters,
      drilldown,
      selection: {
        bucket: bucket ?? void 0,
        collection: selection.collection ?? void 0,
        product: selection.product ?? void 0,
        variant: selection.variant ?? void 0
      }
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const action$1 = async ({ request }) => {
  var _a2;
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent !== "export") {
    return json({ ok: false, message: "Unsupported action intent." }, { status: 400 });
  }
  const raw = {};
  const keys = [
    "period",
    "compare",
    "granularity",
    "bucketDate",
    "collectionId",
    "productId",
    "variantId"
  ];
  keys.forEach((key) => {
    const value = formData.get(key);
    raw[key] = typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
  });
  const parsed = SEARCH_SCHEMA.safeParse(raw);
  const search = parsed.success ? parsed.data : SEARCH_SCHEMA.parse({});
  const scenario = scenarioFromRequest$1(request);
  const rangeKey = mapPeriodToRangeKey(search.period);
  const rangeSelection = buildDashboardRangeSelection(rangeKey);
  const actionRangeStart = toDateOnlyString(rangeSelection.start);
  const actionRangeEnd = toDateOnlyString(rangeSelection.end);
  const fixtureDataset = buildSalesFixtureDataset({
    scenario,
    granularity: search.granularity,
    range: {
      label: rangeSelection.label,
      start: actionRangeStart,
      end: actionRangeEnd,
      days: rangeSelection.days
    }
  });
  let dataset = fixtureDataset;
  if (!USE_MOCK_DATA) {
    const auth = await authenticate.admin(request);
    try {
      dataset = await fetchSalesAnalyticsWithCache({
        shopDomain: ((_a2 = auth == null ? void 0 : auth.session) == null ? void 0 : _a2.shop) ?? void 0,
        signal: request.signal,
        search: {
          period: search.period,
          compare: search.compare,
          granularity: search.granularity,
          bucketDate: search.bucketDate ?? void 0,
          collectionId: search.collectionId ?? void 0,
          productId: search.productId ?? void 0,
          variantId: search.variantId ?? void 0,
          days: rangeSelection.days,
          rangeStart: actionRangeStart,
          rangeEnd: actionRangeEnd
        }
      });
    } catch (error) {
      console.error("sales action: analytics fetch failed", error);
      const fallbackMessage = "Sales analytics export using mock data";
      dataset = {
        ...fixtureDataset,
        state: fixtureDataset.state === "ok" ? "warning" : fixtureDataset.state,
        alert: fixtureDataset.alert ? `${fallbackMessage}. ${fixtureDataset.alert}` : fallbackMessage
      };
    }
  }
  const bucket = search.bucketDate ? dataset.trend.find((entry2) => entry2.date === search.bucketDate) : void 0;
  const resolvedSearch = {
    ...search,
    bucketDate: bucket == null ? void 0 : bucket.date
  };
  const selection = selectEntities(dataset, resolvedSearch);
  const factors = computeFactors(dataset, bucket);
  const drilldownCore = computeDrilldown(dataset, selection, factors);
  const csv = generateCsv(drilldownCore);
  const filename = `sales-${drilldownCore.level}-${search.period}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
};
const formatPercent = (value, fractionDigits = 1) => `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
const formatDate = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
  new Date(value)
);
function SalesRoute() {
  var _a2;
  const { dataset, scenario, useMockData, filters, drilldown, selection } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exportFetcher = useFetcher();
  const drilldownPrefetcher = useFetcher();
  const location = useLocation();
  const { load: loadDrilldown } = drilldownPrefetcher;
  const exportData = exportFetcher.data;
  const exportReadyRef = useRef(null);
  const prefetchedDrilldownsRef = useRef(/* @__PURE__ */ new Set());
  const basePathname = location.pathname || "/app/sales";
  const prefetchDrilldown = useCallback(
    (href) => {
      if (!href) return;
      const targetPath = href.startsWith("?") ? `${basePathname}${href}` : href;
      if (prefetchedDrilldownsRef.current.has(targetPath)) {
        return;
      }
      prefetchedDrilldownsRef.current.add(targetPath);
      loadDrilldown(targetPath);
    },
    [basePathname, loadDrilldown]
  );
  const buildClientHref = useMemo(
    () => (overrides) => {
      const params = new URLSearchParams();
      const mockState = searchParams.get("mockState");
      if (mockState) {
        params.set("mockState", mockState);
      }
      const periodValue = overrides.period ?? filters.period;
      params.set("period", periodValue);
      const rangeCandidate = overrides.range === void 0 ? filters.range : overrides.range ?? filters.range;
      const effectiveRange = rangeCandidate ?? mapPeriodToRangeKey(periodValue);
      params.set("range", effectiveRange);
      params.set("compare", overrides.compare ?? filters.compare);
      params.set("granularity", overrides.granularity ?? filters.granularity);
      const bucketDate = overrides.bucketDate === void 0 ? filters.bucketDate : overrides.bucketDate;
      if (bucketDate) {
        params.set("bucketDate", bucketDate);
      }
      const collectionId = overrides.collectionId === void 0 ? filters.collectionId : overrides.collectionId;
      if (collectionId) {
        params.set("collectionId", collectionId);
      }
      const productId = overrides.productId === void 0 ? filters.productId : overrides.productId;
      if (productId) {
        params.set("productId", productId);
      }
      const variantId = overrides.variantId === void 0 ? filters.variantId : overrides.variantId;
      if (variantId) {
        params.set("variantId", variantId);
      }
      const query = params.toString();
      return query ? `?${query}` : "";
    },
    [filters, searchParams]
  );
  exportFetcher.state !== "idle";
  useEffect(() => {
    if (exportFetcher.state === "idle" && typeof exportData === "string" && exportData.length > 0 && exportReadyRef.current !== exportData) {
      exportReadyRef.current = exportData;
      const blob = new Blob([exportData], { type: "text/csv;charset=utf-8" });
      const urlObject = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = urlObject;
      anchor.download = `sales-${drilldown.level}-${filters.period}.csv`;
      anchor.click();
      URL.revokeObjectURL(urlObject);
    }
  }, [exportFetcher.state, exportData, drilldown.level, filters.period]);
  const handleGranularityChange = (value) => {
    const href = buildClientHref({
      granularity: value,
      collectionId: null,
      productId: null,
      variantId: null
    });
    navigate(href || ".", { replace: true });
  };
  const handleRangeChange = (value) => {
    const href = buildClientHref({
      period: mapRangeKeyToPeriod(value),
      range: value,
      bucketDate: null,
      collectionId: null,
      productId: null,
      variantId: null
    });
    navigate(href || ".", { replace: true });
  };
  const handleCompareChange = (value) => {
    const href = buildClientHref({ compare: value });
    navigate(href || ".", { replace: true });
  };
  const handleResetDrilldown = () => {
    const href = buildClientHref({
      collectionId: null,
      productId: null,
      variantId: null
    });
    navigate(href || ".", { replace: true });
  };
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: dataset.totals.currentTotal.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    [dataset.totals.currentTotal.currency]
  );
  const formatCurrencyValue = useCallback(
    (value) => {
      const numeric = typeof value === "number" ? value : Number(
        typeof value === "string" && value.trim().length ? value : value ?? 0
      );
      const safe = Number.isFinite(numeric) ? numeric : 0;
      return currencyFormatter.format(safe);
    },
    [currencyFormatter]
  );
  const revenueTrendSeries = useMemo(() => {
    if (!dataset.trend.length) return [];
    return [
      {
        name: "GMV",
        data: dataset.trend.map((bucket) => ({
          key: bucket.date,
          value: bucket.total.amount
        }))
      }
    ];
  }, [dataset.trend]);
  const channelBreakdownData = useMemo(
    () => dataset.channelBreakdown.map((channel) => ({
      key: channel.channel,
      value: channel.total.amount
    })),
    [dataset.channelBreakdown]
  );
  const channelBreakdownSeries = useMemo(() => {
    if (!channelBreakdownData.length) return [];
    return [
      {
        name: "Revenue",
        data: channelBreakdownData
      }
    ];
  }, [channelBreakdownData]);
  const channelChartHeight = useMemo(
    () => Math.max(160, channelBreakdownData.length * 44),
    [channelBreakdownData]
  );
  const drilldownTable = useMemo(() => {
    switch (drilldown.level) {
      case "collections": {
        const rows = drilldown.rows.map((row) => {
          const href = drilldown.nextLevel ? buildClientHref({
            collectionId: row.id,
            productId: null,
            variantId: null
          }) : "";
          return [
            drilldown.nextLevel ? /* @__PURE__ */ jsx(
              Link$1,
              {
                url: href,
                onMouseEnter: () => prefetchDrilldown(href),
                onFocus: () => prefetchDrilldown(href),
                onTouchStart: () => prefetchDrilldown(href),
                children: row.title
              }
            ) : row.title,
            row.gmv.formatted,
            formatNumber$1(row.orders),
            `${row.conversionRate.toFixed(2)}%`,
            `${row.returningRate.toFixed(1)}%`,
            `${row.attachRate.toFixed(1)}%`,
            formatPercent(row.deltaPercentage)
          ];
        });
        const columnTypes = [
          "text",
          "numeric",
          "numeric",
          "text",
          "text",
          "text",
          "text"
        ];
        return {
          headings: [
            "Collection",
            "GMV",
            "Orders",
            "Conversion",
            "Returning",
            "Attach",
            "Δ"
          ],
          rows,
          columnTypes
        };
      }
      case "products": {
        const rows = drilldown.rows.map((row) => {
          const href = drilldown.nextLevel ? buildClientHref({
            productId: row.id,
            variantId: null
          }) : "";
          return [
            drilldown.nextLevel ? /* @__PURE__ */ jsx(
              Link$1,
              {
                url: href,
                onMouseEnter: () => prefetchDrilldown(href),
                onFocus: () => prefetchDrilldown(href),
                onTouchStart: () => prefetchDrilldown(href),
                children: row.title
              }
            ) : row.title,
            row.gmv.formatted,
            formatNumber$1(row.orders),
            `${row.attachRate.toFixed(1)}%`,
            `${row.returningRate.toFixed(1)}%`,
            `${row.refundRate.toFixed(1)}%`,
            toTitleCase(row.inventoryStatus)
          ];
        });
        const columnTypes = [
          "text",
          "numeric",
          "numeric",
          "text",
          "text",
          "text",
          "text"
        ];
        return {
          headings: [
            "Product",
            "GMV",
            "Orders",
            "Attach",
            "Returning",
            "Refund",
            "Inventory"
          ],
          rows,
          columnTypes
        };
      }
      case "variants": {
        const rows = drilldown.rows.map((row) => [
          row.title,
          row.sku,
          row.gmv.formatted,
          formatNumber$1(row.unitsSold),
          `${row.attachRate.toFixed(1)}%`,
          formatNumber$1(row.inventoryOnHand),
          toTitleCase(row.backorderRisk)
        ]);
        const columnTypes = [
          "text",
          "text",
          "numeric",
          "numeric",
          "text",
          "numeric",
          "text"
        ];
        return {
          headings: [
            "Variant",
            "SKU",
            "GMV",
            "Units",
            "Attach",
            "On hand",
            "Backorder risk"
          ],
          rows,
          columnTypes
        };
      }
      default:
        return { headings: [], rows: [], columnTypes: [] };
    }
  }, [drilldown, buildClientHref]);
  const trendRows = useMemo(
    () => dataset.trend.map((bucket) => {
      var _a3;
      const href = buildClientHref({
        bucketDate: bucket.date,
        collectionId: null,
        productId: null,
        variantId: null
      });
      const formatted = formatDate(bucket.date);
      const isActive = ((_a3 = selection.bucket) == null ? void 0 : _a3.date) === bucket.date;
      const linkTarget = href || ".";
      return [
        /* @__PURE__ */ jsx(Link$1, { url: linkTarget, children: isActive ? /* @__PURE__ */ jsx(Badge, { tone: "info", children: formatted }) : formatted }, bucket.date),
        bucket.total.formatted,
        formatNumber$1(bucket.orders)
      ];
    }),
    [dataset.trend, buildClientHref, selection.bucket]
  );
  const bestSellerRows = useMemo(
    () => dataset.bestSellers.slice(0, 5).map((product) => [
      product.title,
      product.gmv.formatted,
      formatNumber$1(product.orders),
      `${product.attachRate.toFixed(1)}%`
    ]),
    [dataset.bestSellers]
  );
  const laggardRows = useMemo(
    () => dataset.laggards.slice(0, 5).map((product) => [
      product.title,
      product.gmv.formatted,
      formatNumber$1(product.orders),
      `${product.attachRate.toFixed(1)}%`
    ]),
    [dataset.laggards]
  );
  const attachRateRows = useMemo(
    () => dataset.attachRateInsights.slice(0, 4).map((insight) => [
      `${insight.primaryProduct} → ${insight.attachmentProduct}`,
      `${insight.attachRate.toFixed(1)}%`,
      insight.opportunity
    ]),
    [dataset.attachRateInsights]
  );
  const inventoryRiskRows = useMemo(
    () => dataset.overstockRisks.slice(0, 4).map((risk) => [
      risk.title,
      toTitleCase(risk.status),
      `${risk.daysOnHand} days`,
      risk.recommendedAction
    ]),
    [dataset.overstockRisks]
  );
  const customerRows = useMemo(
    () => dataset.topCustomers.slice(0, 5).map((customer) => [
      customer.name,
      formatNumber$1(customer.orders),
      customer.lifetimeValue.formatted,
      formatDateTime(customer.lastOrderAt)
    ]),
    [dataset.topCustomers]
  );
  const ordersMetricLabel = drilldown.level === "variants" ? "Units sold" : "Orders";
  const hasPathSelection = Boolean(
    filters.collectionId || filters.productId || filters.variantId
  );
  return /* @__PURE__ */ jsx(PolarisVizProvider, { children: /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Sales analytics",
      subtitle: "Inspect revenue trends, channel performance, and forecast variance.",
      children: [
        /* @__PURE__ */ jsx(
          TitleBar,
          {
            title: "Sales"
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          (dataset.alert || dataset.error || useMockData) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            useMockData && /* @__PURE__ */ jsx(
              Banner,
              {
                title: `Mock data scenario: ${scenario}`,
                tone: scenario === "warning" ? "warning" : "info",
                children: /* @__PURE__ */ jsx("p", { children: "Adjust the `mockState` query parameter to preview alternate data states." })
              }
            ),
            dataset.alert && !dataset.error && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Attention required", children: /* @__PURE__ */ jsx("p", { children: dataset.alert }) }),
            dataset.error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Sales data unavailable", children: /* @__PURE__ */ jsx("p", { children: dataset.error }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(
              Card,
              {
                title: "Revenue summary",
                actions: [
                  {
                    content: "Refresh",
                    onAction: () => navigate(0)
                  }
                ]
              }
            ),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    labelHidden: true,
                    label: "Granularity",
                    options: GRANULARITY_OPTIONS,
                    value: filters.granularity,
                    onChange: handleGranularityChange
                  }
                ),
                /* @__PURE__ */ jsx(ButtonGroup, { children: DASHBOARD_RANGE_KEY_LIST.map((option) => /* @__PURE__ */ jsx(
                  Button,
                  {
                    pressed: filters.range === option,
                    onClick: () => handleRangeChange(option),
                    children: option === "today" ? "TODAY" : option.toUpperCase()
                  },
                  option
                )) }),
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    labelHidden: true,
                    label: "Comparison",
                    options: COMPARE_SELECT_OPTIONS,
                    value: filters.compare,
                    onChange: handleCompareChange
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(Badge, { tone: dataset.forecast ? "attention" : "info", children: dataset.range.label })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, sm: 2, lg: 4 }, gap: "300", children: [
              /* @__PURE__ */ jsx(
                MetricTile,
                {
                  label: "Current revenue",
                  value: dataset.totals.currentTotal.formatted,
                  delta: formatPercent(dataset.totals.deltaPercentage)
                }
              ),
              /* @__PURE__ */ jsx(
                MetricTile,
                {
                  label: "Previous period",
                  value: dataset.totals.previousTotal.formatted,
                  delta: "Benchmark"
                }
              ),
              /* @__PURE__ */ jsx(
                MetricTile,
                {
                  label: "Average order value",
                  value: dataset.totals.averageOrderValue.formatted,
                  delta: `Conversion ${dataset.totals.conversionRate.toFixed(2)}%`
                }
              ),
              /* @__PURE__ */ jsx(
                MetricTile,
                {
                  label: "Forecast variance",
                  value: ((_a2 = dataset.forecast) == null ? void 0 : _a2.projectedTotal.formatted) ?? dataset.totals.currentTotal.formatted,
                  delta: dataset.forecast ? `${formatPercent(dataset.forecast.variancePercentage)} ${dataset.forecast.varianceLabel.replace("_", " ")}` : "On track"
                }
              )
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { title: "Performance drilldown", children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
              /* @__PURE__ */ jsx(InlineStack, { gap: "200", wrap: true, children: drilldown.breadcrumbs.map((crumb, index2) => /* @__PURE__ */ jsxs(InlineStack, { gap: "100", blockAlign: "center", children: [
                index2 > 0 && /* @__PURE__ */ jsx(Text, { as: "span", tone: "subdued", children: "›" }),
                crumb.href ? /* @__PURE__ */ jsx(Link$1, { url: crumb.href, children: crumb.label }) : /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", children: crumb.label })
              ] }, `${crumb.label}-${index2}`)) }),
              hasPathSelection && /* @__PURE__ */ jsx(Button, { onClick: handleResetDrilldown, variant: "plain", children: "Reset drilldown" })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, sm: 2, lg: 4 }, gap: "300", children: [
              /* @__PURE__ */ jsx(MetricSummary, { label: "GMV", value: drilldown.metrics.gmv.formatted }),
              /* @__PURE__ */ jsx(
                MetricSummary,
                {
                  label: ordersMetricLabel,
                  value: formatNumber$1(drilldown.metrics.orders)
                }
              ),
              /* @__PURE__ */ jsx(
                MetricSummary,
                {
                  label: "Attach rate",
                  value: `${drilldown.metrics.attachRate.toFixed(1)}%`
                }
              ),
              /* @__PURE__ */ jsx(
                MetricSummary,
                {
                  label: "Returning rate",
                  value: `${drilldown.metrics.returningRate.toFixed(1)}%`
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: drilldownTable.rows.length ? /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: drilldownTable.columnTypes,
                headings: drilldownTable.headings,
                rows: drilldownTable.rows
              }
            ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No data available for this selection." }) })
          ] }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { title: "Revenue trend", children: [
              /* @__PURE__ */ jsx(Card, { children: revenueTrendSeries.length ? /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 220 }, children: /* @__PURE__ */ jsx(
                SparkLineChart,
                {
                  data: revenueTrendSeries,
                  isAnimated: false,
                  accessibilityLabel: "Revenue trend for the selected period",
                  tooltipOptions: {
                    valueFormatter: (value) => formatCurrencyValue(value),
                    keyFormatter: (value) => formatDate(String(value ?? "")),
                    titleFormatter: (value) => formatDate(String(value ?? ""))
                  }
                }
              ) }) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "Revenue trend data unavailable." }) }),
              /* @__PURE__ */ jsx(Card, { children: trendRows.length ? /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "numeric"],
                  headings: ["Date", "GMV", "Orders"],
                  rows: trendRows
                }
              ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No revenue entries for this period." }) })
            ] }) }),
            /* @__PURE__ */ jsx(Layout.Section, { secondary: true, children: /* @__PURE__ */ jsxs(Card, { title: "Channel breakdown", children: [
              /* @__PURE__ */ jsx(Card, { children: channelBreakdownSeries.length ? /* @__PURE__ */ jsx("div", { style: { width: "100%", height: channelChartHeight }, children: /* @__PURE__ */ jsx(
                BarChart,
                {
                  data: channelBreakdownSeries,
                  direction: "horizontal",
                  isAnimated: false,
                  showLegend: false,
                  skipLinkText: "Skip channel breakdown chart",
                  tooltipOptions: {
                    valueFormatter: (value) => formatCurrencyValue(value),
                    keyFormatter: (value) => String(value ?? "")
                  },
                  xAxisOptions: {
                    labelFormatter: (value) => formatCurrencyValue(value)
                  }
                }
              ) }) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No channel data available." }) }),
              dataset.channelBreakdown.length ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: dataset.channelBreakdown.map((channel) => /* @__PURE__ */ jsxs(
                InlineStack,
                {
                  align: "space-between",
                  blockAlign: "center",
                  children: [
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                      /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", children: channel.channel }),
                      /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                        formatPercent(channel.percentage, 1),
                        " of revenue"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "span", children: channel.total.formatted })
                  ]
                },
                channel.channel
              )) }) }) : null
            ] }) })
          ] }),
          /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Product performance", sectioned: true, children: /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, lg: 2 }, gap: "400", children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Best sellers" }),
              bestSellerRows.length ? /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "numeric", "text"],
                  headings: ["Product", "GMV", "Orders", "Attach"],
                  rows: bestSellerRows
                }
              ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No best sellers to show." })
            ] }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Laggards" }),
              laggardRows.length ? /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "numeric", "text"],
                  headings: ["Product", "GMV", "Orders", "Attach"],
                  rows: laggardRows
                }
              ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No laggards detected." })
            ] })
          ] }) }) }) }),
          /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Attach & inventory insights", sectioned: true, children: /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, lg: 2 }, gap: "400", children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Attach opportunities" }),
              attachRateRows.length ? /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "text"],
                  headings: ["Bundle", "Attach", "Opportunity"],
                  rows: attachRateRows
                }
              ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No attach-rate insights available." })
            ] }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Inventory risks" }),
              inventoryRiskRows.length ? /* @__PURE__ */ jsx(
                DataTable,
                {
                  columnContentTypes: ["text", "text", "text", "text"],
                  headings: ["Product", "Status", "Days on hand", "Recommendation"],
                  rows: inventoryRiskRows
                }
              ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "Inventory is healthy." })
            ] })
          ] }) }) }) }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Customer cohorts", sectioned: true, children: /* @__PURE__ */ jsx(InlineGrid, { columns: { xs: 1, sm: 3 }, gap: "400", children: dataset.cohortHighlights.map((highlight) => /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: highlight.title }),
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: highlight.value }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: highlight.description })
            ] }, highlight.id)) }) }) }),
            /* @__PURE__ */ jsx(Layout.Section, { secondary: true, children: /* @__PURE__ */ jsx(Card, { title: "Top customers", sectioned: true, children: customerRows.length ? /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "numeric", "text", "text"],
                headings: ["Customer", "Orders", "Lifetime value", "Last order"],
                rows: customerRows
              }
            ) : /* @__PURE__ */ jsx(Text, { tone: "subdued", variant: "bodySm", children: "No customer insights yet." }) }) })
          ] })
        ] })
      ]
    }
  ) });
}
function MetricSummary({ label: label2, value }) {
  return /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: label2 }),
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: value })
  ] });
}
const formatNumber$1 = (value) => value.toLocaleString("en-US");
const toTitleCase = (value) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
const formatDateTime = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
}).format(new Date(value));
function MetricTile({
  label: label2,
  value,
  delta
}) {
  return /* @__PURE__ */ jsx(Card, { background: "bg-surface-secondary", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: label2 }),
    /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: value }),
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: delta })
  ] }) }) });
}
const route25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: SalesRoute,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const ACTION_CATEGORY = "SEO_ACTION";
const PRIORITY_TO_SEVERITY = {
  now: SeoInsightSeverity.CRITICAL,
  soon: SeoInsightSeverity.HIGH,
  later: SeoInsightSeverity.MEDIUM
};
const STATUS_TO_PRISMA = {
  not_started: SeoInsightStatus.OPEN,
  in_progress: SeoInsightStatus.IN_PROGRESS,
  done: SeoInsightStatus.RESOLVED
};
const STATUS_FROM_PRISMA = {
  OPEN: "not_started",
  IN_PROGRESS: "in_progress",
  RESOLVED: "done",
  DISMISSED: "done"
};
const toJson = (value) => JSON.parse(JSON.stringify(value));
const buildInsightId = (storeId, actionId) => `seo-action:${storeId}:${actionId}`;
const resolveStoreId = async (shopDomain) => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ domain: shopDomain }, { myShopifyDomain: shopDomain }]
    },
    select: { id: true }
  });
  return (store == null ? void 0 : store.id) ?? null;
};
const normaliseAssignee = (value) => {
  if (value === void 0 || value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  if (trimmed.toLowerCase() === "unassigned") {
    return null;
  }
  return trimmed;
};
const normaliseMetric = (value) => {
  if (value === void 0 || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};
const persistSeoActionUpdate = async (input2) => {
  const storeId = await resolveStoreId(input2.shopDomain);
  if (!storeId) {
    return { ok: false, reason: "missing-store" };
  }
  const { action: action2 } = input2;
  const severity = PRIORITY_TO_SEVERITY[action2.priority];
  const status = STATUS_TO_PRISMA[action2.status];
  const metadata = toJson({
    actionId: action2.id,
    assignedTo: normaliseAssignee(action2.assignedTo),
    priority: action2.priority,
    source: action2.source ?? null,
    metricLabel: normaliseMetric(action2.metricLabel),
    metricValue: normaliseMetric(action2.metricValue),
    lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const recordId = buildInsightId(storeId, action2.id);
  const dueDate = (() => {
    if (action2.dueAt === void 0) {
      return void 0;
    }
    if (action2.dueAt === null) {
      return null;
    }
    const parsed = new Date(action2.dueAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();
  const completedAt = status === SeoInsightStatus.RESOLVED ? /* @__PURE__ */ new Date() : null;
  await prisma.seoInsight.upsert({
    where: { id: recordId },
    create: {
      id: recordId,
      storeId,
      title: action2.title,
      description: action2.description,
      category: ACTION_CATEGORY,
      severity,
      status,
      metadata,
      dueAt: dueDate ?? null,
      completedAt,
      resourceUrl: null
    },
    update: {
      title: action2.title,
      description: action2.description,
      severity,
      status,
      metadata,
      ...dueDate !== void 0 ? { dueAt: dueDate } : {},
      completedAt
    }
  });
  return { ok: true, storeId, insightId: recordId };
};
const getPersistedActionOverrides = async (shopDomain, actionIds) => {
  if (!actionIds.length) {
    return {};
  }
  const storeId = await resolveStoreId(shopDomain);
  if (!storeId) {
    return {};
  }
  const ids = actionIds.map((actionId) => buildInsightId(storeId, actionId));
  const records = await prisma.seoInsight.findMany({
    where: { id: { in: ids } }
  });
  const overrides = {};
  for (const record of records) {
    const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata : null;
    const hasAssignedTo = metadata !== null && Object.prototype.hasOwnProperty.call(metadata, "assignedTo");
    let normalisedAssignee;
    if (hasAssignedTo) {
      const assignedToRaw = metadata.assignedTo;
      normalisedAssignee = typeof assignedToRaw === "string" ? normaliseAssignee(assignedToRaw) : null;
    }
    const actionId = (() => {
      if ((metadata == null ? void 0 : metadata.actionId) && typeof metadata.actionId === "string") {
        return metadata.actionId;
      }
      const segment = record.id.split(":");
      return segment.length ? segment[segment.length - 1] : record.id;
    })();
    const override = {
      status: STATUS_FROM_PRISMA[record.status],
      lastUpdatedAt: record.updatedAt.toISOString(),
      dueAt: record.dueAt ? record.dueAt.toISOString() : void 0
    };
    if (normalisedAssignee !== void 0) {
      override.assignedTo = normalisedAssignee;
    }
    overrides[actionId] = override;
  }
  return overrides;
};
const filtersSchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  keywordIntent: z.enum(["transactional", "informational", "navigational", "all"]).optional(),
  page: z.enum(["all", "issue", "ok"]).optional(),
  pageSearch: z.string().trim().max(120).optional(),
  actionPriority: z.enum(["all", "now", "soon", "later"]).optional(),
  ga4: z.string().optional(),
  gsc: z.string().optional(),
  bing: z.string().optional()
});
const adapterLabels = {
  ga4: "GA4",
  gsc: "Search Console",
  bing: "Bing"
};
const ADAPTER_TONE = {
  success: "success",
  warning: "warning",
  error: "critical"
};
const PRIORITY_ORDER = {
  now: 0,
  soon: 1,
  later: 2
};
const ACTION_STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done"
};
const ACTION_STATUS_TONE = {
  not_started: "subdued",
  in_progress: "info",
  done: "success"
};
const numberFormatter = new Intl.NumberFormat("en-US");
const formatNumber = (value) => numberFormatter.format(Math.round(value));
const formatPercentage = (value, fractionDigits = 1) => {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(fractionDigits)}%`;
};
const formatDelta = (value) => {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toFixed(1);
  return safe > 0 ? `+${formatted}` : formatted;
};
const formatDateLabel = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  });
};
const escapeCsvValue = (value) => {
  if (value === null || value === void 0) return "";
  const stringValue = String(value);
  if (/[,"\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};
const parseBooleanParam = (value) => {
  if (value === void 0 || value === null) return true;
  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "disabled", "no"].includes(normalized)) {
    return false;
  }
  if (["1", "true", "on", "enabled", "yes"].includes(normalized)) {
    return true;
  }
  return true;
};
const parseFiltersFromInput = (input2) => {
  const result = filtersSchema.safeParse(input2);
  const data = result.success ? result.data : {};
  const keywordSearch = data.keyword ?? "";
  const keywordIntent = data.keywordIntent ?? "all";
  const pageStatus = data.page ?? "all";
  const pageSearch = data.pageSearch ?? "";
  const actionPriority = data.actionPriority ?? "all";
  const toggles = {
    ga4: parseBooleanParam(data.ga4),
    gsc: parseBooleanParam(data.gsc),
    bing: parseBooleanParam(data.bing)
  };
  return {
    keywordSearch,
    keywordIntent,
    pageStatus,
    pageSearch,
    actionPriority,
    toggles
  };
};
const buildAdapterMeta = (settings, toggles) => {
  const makeMeta = (id) => {
    const connection = settings.connections[id];
    const toggled = toggles[id] ?? true;
    const disabledByConnection = connection.status === "error";
    const active = toggled && !disabledByConnection;
    return {
      id,
      label: adapterLabels[id],
      status: connection.status,
      message: connection.message,
      lastCheckedAt: connection.lastCheckedAt,
      toggled,
      disabledByConnection,
      active
    };
  };
  return {
    ga4: makeMeta("ga4"),
    gsc: makeMeta("gsc"),
    bing: makeMeta("bing")
  };
};
async function fetchAdapterData(adapter, fetcher, fallback) {
  if (!adapter.active) {
    return fallback;
  }
  try {
    return await fetcher();
  } catch (error) {
    adapter.active = false;
    adapter.error = error instanceof Error ? error.message : "Adapter error";
    adapter.status = "error";
    adapter.message = adapter.error;
    return fallback;
  }
}
const collectSeoData = async (scenario, useMockData, adapters, shopDomain, range) => {
  const scenarioOptions = useMockData ? { scenario } : void 0;
  const ga4Client = createGa4Client(scenarioOptions);
  const gscClient = createGscClient(scenarioOptions);
  const bingClient = createBingClient(scenarioOptions);
  const [
    trafficSummary,
    traffic,
    keywords,
    actions,
    coverageIssues,
    pages
  ] = await Promise.all([
    fetchAdapterData(
      adapters.ga4,
      () => ga4Client.fetchTrafficSummary({
        propertyId: shopDomain,
        startDate: range.start,
        endDate: range.end
      }),
      null
    ),
    fetchAdapterData(
      adapters.ga4,
      () => ga4Client.fetchTrafficTrend({
        propertyId: shopDomain,
        startDate: range.start,
        endDate: range.end
      }),
      []
    ),
    fetchAdapterData(
      adapters.gsc,
      () => gscClient.fetchKeywordTable({
        siteUrl: shopDomain,
        startDate: range.start,
        endDate: range.end
      }),
      []
    ),
    fetchAdapterData(
      adapters.gsc,
      () => gscClient.fetchSeoActions({ siteUrl: shopDomain }),
      []
    ),
    fetchAdapterData(
      adapters.gsc,
      () => gscClient.fetchCoverageIssues({
        siteUrl: shopDomain,
        startDate: range.start,
        endDate: range.end
      }),
      []
    ),
    fetchAdapterData(
      adapters.bing,
      () => bingClient.fetchPageMetrics({
        siteUrl: shopDomain,
        startDate: range.start,
        endDate: range.end
      }),
      []
    )
  ]);
  return {
    trafficSummary,
    traffic,
    keywords,
    actions,
    coverageIssues,
    pages
  };
};
const applyKeywordFilters = (rows, filters) => {
  const total = rows.length;
  const search = filters.keywordSearch.trim().toLowerCase();
  const filtered = rows.filter(
    (row) => filters.keywordIntent === "all" ? true : row.intent === filters.keywordIntent
  ).filter((row) => {
    var _a2;
    if (!search) return true;
    return row.query.toLowerCase().includes(search) || (((_a2 = row.topPage) == null ? void 0 : _a2.toLowerCase().includes(search)) ?? false);
  }).sort((a, b) => b.clicks - a.clicks);
  return { rows: filtered, total };
};
const applyPageFilters = (rows, filters) => {
  const total = rows.length;
  const search = filters.pageSearch.trim().toLowerCase();
  const filtered = rows.filter(
    (row) => filters.pageStatus === "all" ? true : row.canonicalStatus === filters.pageStatus
  ).filter((row) => {
    if (!search) return true;
    return row.title.toLowerCase().includes(search) || row.url.toLowerCase().includes(search);
  }).sort((a, b) => b.entrances - a.entrances);
  return { rows: filtered, total };
};
const sortActions = (rows) => {
  return rows.slice().sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (dueA !== dueB) return dueA - dueB;
    return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
  });
};
const countActionsByPriority = (rows) => {
  return rows.reduce(
    (acc, action2) => {
      acc[action2.priority] += 1;
      return acc;
    },
    { now: 0, soon: 0, later: 0 }
  );
};
const buildKeywordCsv = (rows) => {
  const header = [
    "Keyword",
    "Clicks",
    "Impressions",
    "CTR (%)",
    "Average position",
    "Delta",
    "Intent",
    "Top page"
  ].join(",");
  const lines = rows.map(
    (row) => [
      escapeCsvValue(row.query),
      row.clicks,
      row.impressions,
      row.ctr.toFixed(2),
      row.avgPosition.toFixed(1),
      row.delta.toFixed(1),
      row.intent,
      escapeCsvValue(row.topPage ?? "")
    ].join(",")
  );
  return [header, ...lines].join("\n");
};
const buildPageCsv = (rows) => {
  const header = [
    "URL",
    "Title",
    "Entrances",
    "Exits",
    "Conversion rate (%)",
    "Canonical status",
    "Canonical issue"
  ].join(",");
  const lines = rows.map(
    (row) => [
      escapeCsvValue(row.url),
      escapeCsvValue(row.title),
      row.entrances,
      row.exits,
      row.conversionRate.toFixed(2),
      row.canonicalStatus,
      escapeCsvValue(row.canonicalIssue ?? "")
    ].join(",")
  );
  return [header, ...lines].join("\n");
};
const loader = async ({ request }) => {
  const scenario = scenarioFromRequest$1(request);
  const url = new URL(request.url);
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);
  const dataset = getSeoScenario({ scenario });
  const filters = parseFiltersFromInput(Object.fromEntries(url.searchParams));
  const adapters = buildAdapterMeta(settings, filters.toggles);
  const seoData = await collectSeoData(
    scenario,
    USE_MOCK_DATA,
    adapters,
    shopDomain,
    dataset.range
  );
  const actionOverrides = await getPersistedActionOverrides(
    shopDomain,
    seoData.actions.map((action2) => action2.id)
  );
  const mergedActions = sortActions(
    seoData.actions.map((action2) => {
      const override = actionOverrides[action2.id];
      if (!override) {
        return action2;
      }
      const assignedTo = Object.prototype.hasOwnProperty.call(override, "assignedTo") ? override.assignedTo ?? "Unassigned" : action2.assignedTo;
      return {
        ...action2,
        status: override.status ?? action2.status,
        assignedTo,
        lastUpdatedAt: override.lastUpdatedAt ?? action2.lastUpdatedAt,
        dueAt: override.dueAt !== void 0 && override.dueAt !== null ? override.dueAt : action2.dueAt
      };
    })
  );
  const keywordResult = applyKeywordFilters(seoData.keywords, filters);
  const pageResult = applyPageFilters(seoData.pages, filters);
  const actions = mergedActions;
  const actionTotals = countActionsByPriority(actions);
  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let opportunities = [];
  let mcpSource;
  let mcpGeneratedAt;
  let mcpOverrides;
  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }
    const response = await getMcpSeoOpportunities(
      {
        shopDomain,
        params: { limit: 5 }
      },
      toggles,
      mcpOverrides
    );
    opportunities = response.data;
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  }
  return json(
    {
      dataset,
      scenario,
      useMockData: USE_MOCK_DATA,
      filters,
      adapters,
      keywords: keywordResult.rows,
      keywordTotal: keywordResult.total,
      pages: pageResult.rows,
      pageTotal: pageResult.total,
      actions,
      actionTotals,
      coverageIssues: seoData.coverageIssues,
      traffic: seoData.traffic,
      trafficSummary: seoData.trafficSummary,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
        opportunities,
        source: mcpSource,
        generatedAt: mcpGeneratedAt
      }
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
};
const actionUpdateSchema = z.object({
  actionId: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "done"]),
  assignedTo: z.string().max(80).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["now", "soon", "later"]),
  source: z.enum(["ga4", "gsc", "bing"]).optional(),
  metricLabel: z.string().max(120).optional(),
  metricValue: z.string().max(120).optional(),
  dueAt: z.string().optional()
});
const action = async ({ request }) => {
  var _a2, _b2, _c, _d, _e, _f, _g, _h;
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "update-action") {
    const getString = (key) => {
      const value = formData.get(key);
      return typeof value === "string" ? value : void 0;
    };
    const getNonEmptyString = (key) => {
      const value = getString(key);
      if (!value) {
        return void 0;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : void 0;
    };
    const parsed = actionUpdateSchema.safeParse({
      actionId: getString("actionId"),
      status: getString("status"),
      assignedTo: getNonEmptyString("assignedTo"),
      title: getString("title"),
      description: getString("description"),
      priority: getString("priority"),
      source: getNonEmptyString("source"),
      metricLabel: getNonEmptyString("metricLabel"),
      metricValue: getNonEmptyString("metricValue"),
      dueAt: getNonEmptyString("dueAt")
    });
    if (!parsed.success) {
      return json({ ok: false, error: "Invalid action payload" }, { status: 400 });
    }
    let shopDomain = BASE_SHOP_DOMAIN;
    if (!USE_MOCK_DATA) {
      const { session } = await authenticate.admin(request);
      shopDomain = session.shop;
    }
    const result = await persistSeoActionUpdate({
      shopDomain,
      action: {
        id: parsed.data.actionId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: parsed.data.status,
        assignedTo: parsed.data.assignedTo ?? null,
        source: parsed.data.source,
        metricLabel: parsed.data.metricLabel ?? null,
        metricValue: parsed.data.metricValue ?? null,
        dueAt: parsed.data.dueAt
      }
    });
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (!result.ok) {
      return json({
        ok: true,
        intent: "update-action",
        persisted: false,
        updatedAt
      });
    }
    return json({
      ok: true,
      intent: "update-action",
      persisted: true,
      insightId: result.insightId,
      updatedAt
    });
  }
  if (intent === "export-keywords" || intent === "export-pages") {
    const scenario = scenarioFromRequest$1(request);
    let shopDomain = BASE_SHOP_DOMAIN;
    if (!USE_MOCK_DATA) {
      const { session } = await authenticate.admin(request);
      shopDomain = session.shop;
    }
    const settings = await storeSettingsRepository.getSettings(shopDomain);
    const filterInput = {
      keyword: (_a2 = formData.get("keyword")) == null ? void 0 : _a2.toString(),
      keywordIntent: (_b2 = formData.get("keywordIntent")) == null ? void 0 : _b2.toString(),
      page: (_c = formData.get("page")) == null ? void 0 : _c.toString(),
      pageSearch: (_d = formData.get("pageSearch")) == null ? void 0 : _d.toString(),
      actionPriority: (_e = formData.get("actionPriority")) == null ? void 0 : _e.toString(),
      ga4: (_f = formData.get("ga4")) == null ? void 0 : _f.toString(),
      gsc: (_g = formData.get("gsc")) == null ? void 0 : _g.toString(),
      bing: (_h = formData.get("bing")) == null ? void 0 : _h.toString()
    };
    const filters = parseFiltersFromInput(filterInput);
    const adapters = buildAdapterMeta(settings, filters.toggles);
    const dataset = getSeoScenario({ scenario });
    const seoData = await collectSeoData(
      scenario,
      USE_MOCK_DATA,
      adapters,
      shopDomain,
      dataset.range
    );
    if (intent === "export-keywords") {
      const keywordResult = applyKeywordFilters(seoData.keywords, filters);
      const csv2 = buildKeywordCsv(keywordResult.rows);
      return json({
        filename: `seo-keywords-${scenario}.csv`,
        csv: csv2,
        count: keywordResult.rows.length,
        note: "TODO: stream via background worker when datasets exceed 5k rows."
      });
    }
    const pageResult = applyPageFilters(seoData.pages, filters);
    const csv = buildPageCsv(pageResult.rows);
    return json({
      filename: `seo-pages-${scenario}.csv`,
      csv,
      count: pageResult.rows.length,
      note: "TODO: stream via background worker when datasets exceed 5k rows."
    });
  }
  return json({ ok: false, error: "Unsupported intent" }, { status: 400 });
};
const severityTone = (severity) => {
  switch (severity) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    default:
      return "info";
  }
};
function SeoRoute() {
  var _a2, _b2;
  const {
    dataset,
    scenario,
    useMockData,
    filters,
    adapters,
    keywords,
    keywordTotal,
    pages,
    pageTotal,
    actions,
    actionTotals,
    coverageIssues,
    traffic,
    trafficSummary,
    mcp
  } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exportFetcher = useFetcher();
  const actionFetcher = useFetcher();
  const [keywordQuery, setKeywordQuery] = useState(filters.keywordSearch);
  const [pageQuery, setPageQuery] = useState(filters.pageSearch);
  const [actionsState, setActionsState] = useState(actions);
  const appendActionContext = useCallback((formData, action2) => {
    if (!action2) {
      return;
    }
    formData.append("title", action2.title);
    formData.append("description", action2.description);
    formData.append("priority", action2.priority);
    formData.append("source", action2.source);
    if (action2.metricLabel) {
      formData.append("metricLabel", action2.metricLabel);
    }
    if (action2.metricValue) {
      formData.append("metricValue", action2.metricValue);
    }
    if (action2.dueAt) {
      formData.append("dueAt", action2.dueAt);
    }
  }, []);
  useEffect(() => {
    setKeywordQuery(filters.keywordSearch);
  }, [filters.keywordSearch]);
  useEffect(() => {
    setPageQuery(filters.pageSearch);
  }, [filters.pageSearch]);
  useEffect(() => {
    setActionsState(actions);
  }, [actions]);
  useEffect(() => {
    var _a3, _b3;
    if (((_a3 = exportFetcher.data) == null ? void 0 : _a3.csv) && ((_b3 = exportFetcher.data) == null ? void 0 : _b3.filename)) {
      const blob = new Blob([exportFetcher.data.csv], {
        type: "text/csv;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFetcher.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [exportFetcher.data]);
  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      const search = next.toString();
      navigate({ search: search ? `?${search}` : "" }, { replace: true });
    },
    [navigate, searchParams]
  );
  const handleAdapterToggle = useCallback(
    (source, nextValue) => {
      updateParams({ [source]: nextValue ? "1" : "0" });
    },
    [updateParams]
  );
  const handleKeywordSubmit = useCallback(
    (event) => {
      event == null ? void 0 : event.preventDefault();
      updateParams({ keyword: keywordQuery.trim() || null });
    },
    [keywordQuery, updateParams]
  );
  const handleKeywordClear = useCallback(() => {
    setKeywordQuery("");
    updateParams({ keyword: null });
  }, [updateParams]);
  const handlePageSubmit = useCallback(
    (event) => {
      event == null ? void 0 : event.preventDefault();
      updateParams({ pageSearch: pageQuery.trim() || null });
    },
    [pageQuery, updateParams]
  );
  const handlePageClear = useCallback(() => {
    setPageQuery("");
    updateParams({ pageSearch: null });
  }, [updateParams]);
  const handleExport = useCallback(
    (type) => {
      const formData = new FormData();
      formData.append("intent", type === "keywords" ? "export-keywords" : "export-pages");
      if (filters.keywordSearch) formData.append("keyword", filters.keywordSearch);
      if (filters.keywordIntent !== "all") {
        formData.append("keywordIntent", filters.keywordIntent);
      }
      if (filters.pageStatus !== "all") {
        formData.append("page", filters.pageStatus);
      }
      if (filters.pageSearch) formData.append("pageSearch", filters.pageSearch);
      if (filters.actionPriority !== "all") {
        formData.append("actionPriority", filters.actionPriority);
      }
      formData.append("ga4", filters.toggles.ga4 ? "1" : "0");
      formData.append("gsc", filters.toggles.gsc ? "1" : "0");
      formData.append("bing", filters.toggles.bing ? "1" : "0");
      exportFetcher.submit(formData, { method: "post" });
    },
    [exportFetcher, filters]
  );
  const handleStatusChange = useCallback(
    (actionId, nextStatus) => {
      const current = actionsState.find((action2) => action2.id === actionId);
      if (!current) {
        return;
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const contextAction = {
        ...current,
        status: nextStatus,
        lastUpdatedAt: timestamp
      };
      setActionsState(
        (state) => state.map(
          (action2) => action2.id === actionId ? { ...action2, status: nextStatus, lastUpdatedAt: timestamp } : action2
        )
      );
      const formData = new FormData();
      formData.append("intent", "update-action");
      formData.append("actionId", actionId);
      formData.append("status", nextStatus);
      formData.append("assignedTo", current.assignedTo ?? "Unassigned");
      appendActionContext(formData, contextAction);
      actionFetcher.submit(formData, { method: "post" });
    },
    [actionFetcher, actionsState, appendActionContext]
  );
  const handleAssignmentChange = useCallback(
    (actionId, nextAssignee) => {
      const current = actionsState.find((action2) => action2.id === actionId);
      if (!current) {
        return;
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const assignedTo = nextAssignee || "Unassigned";
      const contextAction = {
        ...current,
        assignedTo,
        lastUpdatedAt: timestamp
      };
      setActionsState(
        (state) => state.map(
          (action2) => action2.id === actionId ? { ...action2, assignedTo, lastUpdatedAt: timestamp } : action2
        )
      );
      const formData = new FormData();
      formData.append("intent", "update-action");
      formData.append("actionId", actionId);
      formData.append("assignedTo", assignedTo);
      formData.append("status", current.status);
      appendActionContext(formData, contextAction);
      actionFetcher.submit(formData, { method: "post" });
    },
    [actionFetcher, actionsState, appendActionContext]
  );
  const priorityFilterList = useMemo(() => {
    if (filters.actionPriority !== "all") {
      return [filters.actionPriority];
    }
    return ["now", "soon", "later"];
  }, [filters.actionPriority]);
  const filteredActions = useMemo(() => {
    if (filters.actionPriority === "all") {
      return actionsState;
    }
    return actionsState.filter((action2) => action2.priority === filters.actionPriority);
  }, [actionsState, filters.actionPriority]);
  const groupedActions = useMemo(() => {
    return filteredActions.reduce(
      (acc, action2) => {
        acc[action2.priority].push(action2);
        return acc;
      },
      { now: [], soon: [], later: [] }
    );
  }, [filteredActions]);
  const assignmentOptions = useMemo(() => {
    const values = /* @__PURE__ */ new Set();
    actionsState.forEach((action2) => values.add(action2.assignedTo));
    values.add("Unassigned");
    return Array.from(values).filter(Boolean).map((value) => ({ label: value, value }));
  }, [actionsState]);
  const chartSeries = useMemo(() => {
    if (!traffic.length) return [];
    return [
      {
        name: "Clicks",
        data: traffic.map((point) => ({ key: point.date, value: point.clicks }))
      },
      {
        name: "Impressions",
        data: traffic.map((point) => ({ key: point.date, value: point.impressions }))
      }
    ];
  }, [traffic]);
  const adapterList = useMemo(() => [adapters.ga4, adapters.gsc, adapters.bing], [adapters]);
  return /* @__PURE__ */ jsx(PolarisVizProvider, { children: /* @__PURE__ */ jsxs(
    Page,
    {
      title: "SEO insights",
      subtitle: "Review health scores, keyword opportunities, and technical issues.",
      children: [
        /* @__PURE__ */ jsx(
          TitleBar,
          {
            title: "SEO"
          }
        ),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          (dataset.alert || dataset.error || useMockData) && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            useMockData && /* @__PURE__ */ jsx(
              Banner,
              {
                tone: scenario === "warning" ? "warning" : "info",
                title: `Mock state: ${scenario}`,
                children: /* @__PURE__ */ jsx("p", { children: "Adjust `mockState` in the query string to explore alternate UI states." })
              }
            ),
            dataset.alert && !dataset.error && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "SEO attention required", children: /* @__PURE__ */ jsx("p", { children: dataset.alert }) }),
            dataset.error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "SEO signals unavailable", children: /* @__PURE__ */ jsx("p", { children: dataset.error }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Data sources" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "Toggle adapters for this view. Connection health reflects the latest Settings sync." })
              ] }),
              /* @__PURE__ */ jsx(ButtonGroup, { children: adapterList.map((adapter) => /* @__PURE__ */ jsx(
                Button,
                {
                  pressed: adapter.toggled && !adapter.disabledByConnection,
                  disabled: adapter.disabledByConnection,
                  onClick: () => handleAdapterToggle(
                    adapter.id,
                    !(adapter.toggled && !adapter.disabledByConnection)
                  ),
                  children: adapter.label
                },
                adapter.id
              )) })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(InlineGrid, { columns: { xs: 1, sm: 3 }, gap: "200", children: adapterList.map((adapter) => /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "span", children: adapter.label }),
                /* @__PURE__ */ jsx(Badge, { tone: ADAPTER_TONE[adapter.status], children: adapter.status === "success" ? "Healthy" : adapter.status === "warning" ? "Warning" : "Error" })
              ] }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: adapter.disabledByConnection ? "Enable in Settings to hydrate this section." : adapter.error ?? adapter.message ?? "Connected" })
            ] }, adapter.id)) }) })
          ] }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { title: "Scorecard", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(
                ScoreRow,
                {
                  label: "Core Web Vitals",
                  value: `${dataset.scorecard.coreWebVitals}%`
                }
              ),
              /* @__PURE__ */ jsx(
                ScoreRow,
                {
                  label: "Click-through rate",
                  value: `${dataset.scorecard.clickThroughRate}%`
                }
              ),
              /* @__PURE__ */ jsx(
                ScoreRow,
                {
                  label: "Crawl success",
                  value: `${dataset.scorecard.crawlSuccessRate}%`
                }
              ),
              /* @__PURE__ */ jsx(
                ScoreRow,
                {
                  label: "Keyword rankings",
                  value: `${dataset.scorecard.keywordRankings}%`
                }
              )
            ] }) }) }),
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Organic traffic" }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: dataset.range.label })
                ] }),
                trafficSummary && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                  /* @__PURE__ */ jsxs(BlockStack, { gap: "030", children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "Sessions" }),
                    /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "span", children: formatNumber(trafficSummary.sessions) })
                  ] }),
                  /* @__PURE__ */ jsxs(BlockStack, { gap: "030", children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "Conversions" }),
                    /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "span", children: formatNumber(trafficSummary.conversions) })
                  ] })
                ] })
              ] }) }),
              /* @__PURE__ */ jsx(Card, { children: adapters.ga4.active && traffic.length ? /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 260 }, children: /* @__PURE__ */ jsx(
                LineChart,
                {
                  isAnimated: false,
                  data: chartSeries,
                  xAxisOptions: {
                    labelFormatter: (value) => formatDateLabel(String(value))
                  },
                  tooltipOptions: {
                    keyFormatter: (value) => formatDateLabel(String(value)),
                    valueFormatter: (value, { series }) => series === 0 ? `${formatNumber(Number(value ?? 0))} clicks` : `${formatNumber(Number(value ?? 0))} impressions`
                  }
                }
              ) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: adapters.ga4.toggled ? "GA4 data unavailable. Check adapter status in settings." : "GA4 adapter disabled for this view." }) })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Keyword performance" }),
                /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
                  keywords.length,
                  " of ",
                  keywordTotal,
                  " queries shown"
                ] })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    label: "Keyword intent",
                    labelHidden: true,
                    options: [
                      { label: "All intents", value: "all" },
                      { label: "Transactional", value: "transactional" },
                      { label: "Informational", value: "informational" },
                      { label: "Navigational", value: "navigational" }
                    ],
                    value: filters.keywordIntent,
                    onChange: (value) => updateParams({
                      keywordIntent: value === "all" ? null : value
                    })
                  }
                ),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleExport("keywords"),
                    loading: exportFetcher.state !== "idle" && ((_a2 = exportFetcher.formData) == null ? void 0 : _a2.get("intent")) === "export-keywords",
                    children: "Export CSV"
                  }
                )
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("form", { onSubmit: handleKeywordSubmit, children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "end", wrap: true, children: [
              /* @__PURE__ */ jsx(Box, { minWidth: "240px", children: /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Search keywords",
                  labelHidden: true,
                  placeholder: "Filter keywords or top pages",
                  value: keywordQuery,
                  onChange: (value) => setKeywordQuery(value)
                }
              ) }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Button, { submit: true, children: "Apply" }),
                /* @__PURE__ */ jsx(Button, { onClick: handleKeywordClear, variant: "secondary", children: "Clear" })
              ] })
            ] }) }) }),
            /* @__PURE__ */ jsx(Card, { children: adapters.gsc.active && keywords.length ? /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: [
                  "text",
                  "numeric",
                  "numeric",
                  "numeric",
                  "numeric",
                  "numeric",
                  "text",
                  "text"
                ],
                headings: [
                  "Keyword",
                  "Clicks",
                  "Impressions",
                  "CTR",
                  "Avg position",
                  "Δ position",
                  "Intent",
                  "Top page"
                ],
                rows: keywords.map((row) => [
                  row.query,
                  row.clicks.toLocaleString("en-US"),
                  row.impressions.toLocaleString("en-US"),
                  formatPercentage(row.ctr, 2),
                  row.avgPosition.toFixed(1),
                  formatDelta(row.delta),
                  row.intent.replace(/^(.)/, (match) => match.toUpperCase()),
                  row.topPage ?? "—"
                ])
              }
            ) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: adapters.gsc.toggled ? "Search Console data unavailable. Check adapter status in settings." : "Search Console adapter disabled for this view." }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Landing pages" }),
                /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
                  pages.length,
                  " of ",
                  pageTotal,
                  " tracked pages"
                ] })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    label: "Canonical status",
                    labelHidden: true,
                    options: [
                      { label: "All", value: "all" },
                      { label: "Issue", value: "issue" },
                      { label: "Healthy", value: "ok" }
                    ],
                    value: filters.pageStatus,
                    onChange: (value) => updateParams({ page: value === "all" ? null : value })
                  }
                ),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleExport("pages"),
                    loading: exportFetcher.state !== "idle" && ((_b2 = exportFetcher.formData) == null ? void 0 : _b2.get("intent")) === "export-pages",
                    children: "Export CSV"
                  }
                )
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("form", { onSubmit: handlePageSubmit, children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "end", wrap: true, children: [
              /* @__PURE__ */ jsx(Box, { minWidth: "240px", children: /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Search pages",
                  labelHidden: true,
                  placeholder: "Filter by URL or title",
                  value: pageQuery,
                  onChange: (value) => setPageQuery(value)
                }
              ) }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Button, { submit: true, children: "Apply" }),
                /* @__PURE__ */ jsx(Button, { onClick: handlePageClear, variant: "secondary", children: "Clear" })
              ] })
            ] }) }) }),
            coverageIssues.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Divider, { borderColor: "border-subdued" }),
              /* @__PURE__ */ jsxs(Card, { subdued: true, children: [
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Coverage warnings" }),
                  /* @__PURE__ */ jsxs(Badge, { tone: coverageIssues.length > 2 ? "critical" : "warning", children: [
                    coverageIssues.length,
                    " open"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                  coverageIssues.slice(0, 3).map((issue) => /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                    issue.issue,
                    " — ",
                    issue.page
                  ] }, `${issue.page}-${issue.issue}`)),
                  coverageIssues.length > 3 && /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
                    "+",
                    coverageIssues.length - 3,
                    " additional issues in Search Console"
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
            /* @__PURE__ */ jsx(Card, { children: adapters.bing.active && pages.length ? /* @__PURE__ */ jsx(
              DataTable,
              {
                columnContentTypes: ["text", "numeric", "numeric", "numeric", "text"],
                headings: [
                  "Page",
                  "Entrances",
                  "Exits",
                  "Conversion",
                  "Canonical"
                ],
                rows: pages.map((row) => [
                  `${row.title} — ${row.url}`,
                  row.entrances.toLocaleString("en-US"),
                  row.exits.toLocaleString("en-US"),
                  formatPercentage(row.conversionRate, 2),
                  row.canonicalStatus === "issue" ? `Issue — ${row.canonicalIssue ?? "Review canonical"}` : "Healthy"
                ])
              }
            ) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: adapters.bing.toggled ? "Bing metrics unavailable. Add credentials in settings." : "Bing adapter disabled for this view." }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Action queue" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: "Prioritized follow-ups grouped by severity" })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    label: "Action priority",
                    labelHidden: true,
                    options: [
                      { label: "All priorities", value: "all" },
                      { label: "Now", value: "now" },
                      { label: "Soon", value: "soon" },
                      { label: "Later", value: "later" }
                    ],
                    value: filters.actionPriority,
                    onChange: (value) => updateParams({
                      actionPriority: value === "all" ? null : value
                    })
                  }
                ),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "100", blockAlign: "center", children: [
                  /* @__PURE__ */ jsxs(Badge, { tone: "critical", children: [
                    "Now ",
                    actionTotals.now
                  ] }),
                  /* @__PURE__ */ jsxs(Badge, { tone: "warning", children: [
                    "Soon ",
                    actionTotals.soon
                  ] }),
                  /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
                    "Later ",
                    actionTotals.later
                  ] })
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Divider, { borderColor: "border" }),
            /* @__PURE__ */ jsxs(Card, { children: [
              priorityFilterList.map((priority) => {
                const items = groupedActions[priority];
                if (!items.length) {
                  if (filters.actionPriority !== "all") {
                    return /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "No actions in this bucket." }, priority);
                  }
                  return null;
                }
                return /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: priority === "now" ? "Now" : priority === "soon" ? "Soon" : "Later" }),
                  /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: items.map((action2) => /* @__PURE__ */ jsxs(
                    Box,
                    {
                      padding: "200",
                      background: "bg-surface-secondary",
                      borderRadius: "200",
                      children: [
                        /* @__PURE__ */ jsx(BlockStack, { gap: "150", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                          /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                            /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: action2.title }),
                            /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: action2.description })
                          ] }),
                          /* @__PURE__ */ jsx(Badge, { tone: ACTION_STATUS_TONE[action2.status], children: ACTION_STATUS_LABEL[action2.status] })
                        ] }) }),
                        /* @__PURE__ */ jsx(Divider, { borderColor: "border-subdued" }),
                        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", wrap: true, blockAlign: "center", children: [
                          /* @__PURE__ */ jsx(
                            Select,
                            {
                              label: "Status",
                              labelHidden: true,
                              options: [
                                { label: "Not started", value: "not_started" },
                                { label: "In progress", value: "in_progress" },
                                { label: "Done", value: "done" }
                              ],
                              value: action2.status,
                              onChange: (value) => handleStatusChange(action2.id, value)
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            Select,
                            {
                              label: "Owner",
                              labelHidden: true,
                              options: assignmentOptions,
                              value: action2.assignedTo,
                              onChange: (value) => handleAssignmentChange(action2.id, value)
                            }
                          ),
                          /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
                            action2.metricLabel,
                            ": ",
                            action2.metricValue
                          ] }),
                          action2.dueAt && /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
                            "Due ",
                            new Date(action2.dueAt).toLocaleDateString()
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
                          "Updated ",
                          new Date(action2.lastUpdatedAt).toLocaleDateString()
                        ] })
                      ]
                    },
                    action2.id
                  )) })
                ] }, priority);
              }),
              !filteredActions.length && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "No SEO actions match the selected filters." })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Card, { title: "MCP keyword opportunities", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            mcp.opportunities.map((opportunity) => /* @__PURE__ */ jsx(
              Box,
              {
                background: "bg-subdued",
                padding: "200",
                borderRadius: "200",
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "150", children: [
                  /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "span", children: opportunity.handle }),
                      /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "span", children: opportunity.notes ?? "Prioritize optimization to unlock incremental traffic." })
                    ] }),
                    /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
                      "Impact +",
                      opportunity.projectedImpact.toFixed(1),
                      "%"
                    ] })
                  ] }),
                  opportunity.keywordCluster.length > 0 && /* @__PURE__ */ jsx(InlineStack, { gap: "150", wrap: true, children: opportunity.keywordCluster.map((keyword) => /* @__PURE__ */ jsx(Badge, { tone: "subdued", children: keyword }, keyword)) })
                ] })
              },
              opportunity.handle
            )),
            mcp.opportunities.length === 0 && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: mcp.enabled ? "No MCP SEO opportunities available yet. Check again after the next crawl." : "Enable the MCP integration in Settings to populate keyword opportunities." }),
            mcp.generatedAt && /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "p", children: [
              "Last updated ",
              new Date(mcp.generatedAt).toLocaleString(),
              " • ",
              mcp.source ?? "mock"
            ] }),
            mcp.usingMocks && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: "Showing mock MCP data while `USE_MOCK_DATA` is enabled." })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { title: "Insights", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            dataset.insights.map((insight) => /* @__PURE__ */ jsxs(BlockStack, { gap: "150", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "start", children: [
                /* @__PURE__ */ jsxs(InlineStack, { gap: "100", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Badge, { tone: severityTone(insight.severity), children: insight.severity }),
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: insight.title })
                ] }),
                /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                  insight.source.toUpperCase(),
                  " • ",
                  new Date(insight.detectedAt).toLocaleDateString()
                ] })
              ] }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: insight.description }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
                  insight.metricLabel,
                  ": ",
                  insight.metricValue
                ] }),
                insight.delta && /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", as: "span", children: [
                  "Δ ",
                  insight.delta
                ] }),
                insight.url && /* @__PURE__ */ jsx("a", { href: insight.url, target: "_blank", rel: "noreferrer", children: "View page" })
              ] })
            ] }, insight.id)),
            !dataset.insights.length && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: "No active insights. Connect GA4/GSC/Bing in Settings to populate this view." })
          ] }) })
        ] })
      ]
    }
  ) });
}
function ScoreRow({ label: label2, value }) {
  return /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", children: label2 }),
    /* @__PURE__ */ jsx(Text, { as: "span", variant: "headingMd", children: value })
  ] });
}
const route26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: SeoRoute,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-DwtQxr1L.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-C2_dilur.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js"], "css": [] }, "routes/webhooks.fulfillments.update": { "id": "routes/webhooks.fulfillments.update", "parentId": "root", "path": "webhooks/fulfillments/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.fulfillments.update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.orders.fulfilled": { "id": "routes/webhooks.orders.fulfilled", "parentId": "root", "path": "webhooks/orders/fulfilled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.orders.fulfilled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.products.update": { "id": "routes/webhooks.products.update", "parentId": "root", "path": "webhooks/products/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.products.update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.orders.create": { "id": "routes/webhooks.orders.create", "parentId": "root", "path": "webhooks/orders/create", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.orders.create-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/cron.retention": { "id": "routes/cron.retention", "parentId": "root", "path": "cron/retention", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cron.retention-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/queue.webhooks": { "id": "routes/queue.webhooks", "parentId": "root", "path": "queue/webhooks", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/queue.webhooks-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-zDXoMkSN.js", "imports": ["/assets/index-DZoorY08.js", "/assets/styles-BEE87H3u.js", "/assets/components-CTA1UUXK.js", "/assets/Page-CO1VPtMw.js", "/assets/FormLayout-Cauguaew.js", "/assets/context-CVB7tZr2.js", "/assets/context-CdsfRJ3p.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-Bn_23Ztk.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js"], "css": ["/assets/route-TqOIn4DE.css"] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-CrorpQtX.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/styles-BEE87H3u.js", "/assets/context-CVB7tZr2.js", "/assets/context-CdsfRJ3p.js"], "css": [] }, "routes/app._index_enhanced": { "id": "routes/app._index_enhanced", "parentId": "routes/app", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index_enhanced-CYhrVqXJ.js", "imports": ["/assets/index-DZoorY08.js", "/assets/date-range-CLhjUUo2.js", "/assets/components-CTA1UUXK.js", "/assets/Page-CO1VPtMw.js", "/assets/PolarisVizProvider-BMFajI3Y.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/InlineGrid-Bklo_vep.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/SkeletonThumbnail-0ezpmZgf.js", "/assets/SparkLineChart-CQgKgDqj.js", "/assets/context-CVB7tZr2.js", "/assets/ChartContainer-DSIix7Zm.js", "/assets/LineSeries-CNDg3zjh.js"], "css": [] }, "routes/app.agent-approvals": { "id": "routes/app.agent-approvals", "parentId": "routes/app", "path": "agent-approvals", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.agent-approvals-CELRD99X.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/use-index-resource-state-7IuosbnD.js"], "css": [] }, "routes/app.vendor-mapping": { "id": "routes/app.vendor-mapping", "parentId": "routes/app", "path": "vendor-mapping", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.vendor-mapping-O0Xsf_ZW.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/use-index-resource-state-7IuosbnD.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/Divider-DdX0k3iD.js", "/assets/EmptyState-by-HQyrj.js", "/assets/IndexTable-nycHw1tK.js", "/assets/Modal-vYd8S7dQ.js", "/assets/context-CVB7tZr2.js", "/assets/EmptySearchResult-D4D1_l9z.js", "/assets/Checkbox-drAGhQ4I.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js", "/assets/context-BSKof4BJ.js", "/assets/context-CdsfRJ3p.js", "/assets/InlineGrid-Bklo_vep.js"], "css": [] }, "routes/app.fast-movers": { "id": "routes/app.fast-movers", "parentId": "routes/app", "path": "fast-movers", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.fast-movers-BxP-W8mN.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/use-index-resource-state-7IuosbnD.js", "/assets/PolarisVizProvider-BMFajI3Y.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/Divider-DdX0k3iD.js", "/assets/EmptyState-by-HQyrj.js", "/assets/BarChart-BTH-R0IZ.js", "/assets/DataTable-DOlFJz1k.js", "/assets/IndexTable-nycHw1tK.js", "/assets/context-CVB7tZr2.js", "/assets/EmptySearchResult-D4D1_l9z.js", "/assets/Checkbox-drAGhQ4I.js", "/assets/SkipLink-CU7_6Q_C.js", "/assets/ChartContainer-DSIix7Zm.js", "/assets/index-1GQyLQny.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js"], "css": [] }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.additional-DUU9Dyr0.js", "imports": ["/assets/index-DZoorY08.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/Link-BWGL7uAm.js", "/assets/context-CVB7tZr2.js"], "css": [] }, "routes/app.inventory": { "id": "routes/app.inventory", "parentId": "routes/app", "path": "inventory", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.inventory-DGiKRtvP.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/use-index-resource-state-7IuosbnD.js", "/assets/PolarisVizProvider-BMFajI3Y.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/InlineGrid-Bklo_vep.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/Tabs-DcbyKX5H.js", "/assets/Divider-DdX0k3iD.js", "/assets/IndexTable-nycHw1tK.js", "/assets/Modal-vYd8S7dQ.js", "/assets/LineChart-DpGSaaOT.js", "/assets/SparkLineChart-CQgKgDqj.js", "/assets/context-CVB7tZr2.js", "/assets/FormLayout-Cauguaew.js", "/assets/Checkbox-drAGhQ4I.js", "/assets/EmptySearchResult-D4D1_l9z.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js", "/assets/context-BSKof4BJ.js", "/assets/context-CdsfRJ3p.js", "/assets/SkipLink-CU7_6Q_C.js", "/assets/ChartContainer-DSIix7Zm.js", "/assets/LineSeries-CNDg3zjh.js"], "css": [] }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings-CaEWU_u_.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/DataTable-DOlFJz1k.js", "/assets/FormLayout-Cauguaew.js", "/assets/Divider-DdX0k3iD.js", "/assets/Checkbox-drAGhQ4I.js", "/assets/context-CVB7tZr2.js", "/assets/index-1GQyLQny.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-pUvZpJun.js", "imports": ["/assets/index-DZoorY08.js", "/assets/date-range-CLhjUUo2.js", "/assets/components-CTA1UUXK.js", "/assets/Page-CO1VPtMw.js", "/assets/PolarisVizProvider-BMFajI3Y.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/InlineGrid-Bklo_vep.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/SkeletonThumbnail-0ezpmZgf.js", "/assets/context-CVB7tZr2.js"], "css": [] }, "routes/app.orders": { "id": "routes/app.orders", "parentId": "routes/app", "path": "orders", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.orders-gR80luhd.js", "imports": ["/assets/index-DZoorY08.js", "/assets/date-range-CLhjUUo2.js", "/assets/components-CTA1UUXK.js", "/assets/context-CVB7tZr2.js", "/assets/use-index-resource-state-7IuosbnD.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/Banner-DCanv2aO.js", "/assets/Select-BzpuXWta.js", "/assets/Tabs-DcbyKX5H.js", "/assets/IndexTable-nycHw1tK.js", "/assets/Toast-CZe5Ihba.js", "/assets/Modal-vYd8S7dQ.js", "/assets/Divider-DdX0k3iD.js", "/assets/DataTable-DOlFJz1k.js", "/assets/FormLayout-Cauguaew.js", "/assets/Checkbox-drAGhQ4I.js", "/assets/EmptySearchResult-D4D1_l9z.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js", "/assets/index-1GQyLQny.js", "/assets/context-BSKof4BJ.js", "/assets/context-CdsfRJ3p.js", "/assets/InlineGrid-Bklo_vep.js"], "css": [] }, "routes/app.inbox": { "id": "routes/app.inbox", "parentId": "routes/app", "path": "inbox", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.inbox-DanAAwgj.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/Page-CO1VPtMw.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/Banner-DCanv2aO.js", "/assets/Select-BzpuXWta.js", "/assets/context-CVB7tZr2.js", "/assets/index-1GQyLQny.js", "/assets/Checkbox-drAGhQ4I.js", "/assets/InlineGrid-Bklo_vep.js", "/assets/EmptySearchResult-D4D1_l9z.js", "/assets/Sticky-3Wxpi6V4.js", "/assets/Toast-CZe5Ihba.js", "/assets/context-BSKof4BJ.js"], "css": [] }, "routes/app.inbox.telemetry": { "id": "routes/app.inbox.telemetry", "parentId": "routes/app.inbox", "path": "telemetry", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.inbox.telemetry-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.inbox.stream": { "id": "routes/app.inbox.stream", "parentId": "routes/app.inbox", "path": "stream", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.inbox.stream-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.sales": { "id": "routes/app.sales", "parentId": "routes/app", "path": "sales", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.sales-DUKc8sPS.js", "imports": ["/assets/index-DZoorY08.js", "/assets/date-range-CLhjUUo2.js", "/assets/components-CTA1UUXK.js", "/assets/Link-BWGL7uAm.js", "/assets/Page-CO1VPtMw.js", "/assets/PolarisVizProvider-BMFajI3Y.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/Select-BzpuXWta.js", "/assets/InlineGrid-Bklo_vep.js", "/assets/DataTable-DOlFJz1k.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/SparkLineChart-CQgKgDqj.js", "/assets/BarChart-BTH-R0IZ.js", "/assets/context-CVB7tZr2.js", "/assets/index-1GQyLQny.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js", "/assets/ChartContainer-DSIix7Zm.js", "/assets/LineSeries-CNDg3zjh.js", "/assets/SkipLink-CU7_6Q_C.js"], "css": [] }, "routes/app.seo": { "id": "routes/app.seo", "parentId": "routes/app", "path": "seo", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.seo-BEafDDhW.js", "imports": ["/assets/index-DZoorY08.js", "/assets/components-CTA1UUXK.js", "/assets/PolarisVizProvider-BMFajI3Y.js", "/assets/Page-CO1VPtMw.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Banner-DCanv2aO.js", "/assets/Divider-DdX0k3iD.js", "/assets/InlineGrid-Bklo_vep.js", "/assets/Layout-Drv8ZkBJ.js", "/assets/LineChart-DpGSaaOT.js", "/assets/Select-BzpuXWta.js", "/assets/DataTable-DOlFJz1k.js", "/assets/context-CVB7tZr2.js", "/assets/SkipLink-CU7_6Q_C.js", "/assets/ChartContainer-DSIix7Zm.js", "/assets/LineSeries-CNDg3zjh.js", "/assets/index-1GQyLQny.js", "/assets/AfterInitialMount-C-VclerA.js", "/assets/Sticky-3Wxpi6V4.js"], "css": [] } }, "url": "/assets/manifest-55d3288f.js", "version": "55d3288f" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": false, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.fulfillments.update": {
    id: "routes/webhooks.fulfillments.update",
    parentId: "root",
    path: "webhooks/fulfillments/update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/webhooks.orders.fulfilled": {
    id: "routes/webhooks.orders.fulfilled",
    parentId: "root",
    path: "webhooks/orders/fulfilled",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/webhooks.products.update": {
    id: "routes/webhooks.products.update",
    parentId: "root",
    path: "webhooks/products/update",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/webhooks.orders.create": {
    id: "routes/webhooks.orders.create",
    parentId: "root",
    path: "webhooks/orders/create",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/cron.retention": {
    id: "routes/cron.retention",
    parentId: "root",
    path: "cron/retention",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/queue.webhooks": {
    id: "routes/queue.webhooks",
    parentId: "root",
    path: "queue/webhooks",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route10
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app._index_enhanced": {
    id: "routes/app._index_enhanced",
    parentId: "routes/app",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app.agent-approvals": {
    id: "routes/app.agent-approvals",
    parentId: "routes/app",
    path: "agent-approvals",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.vendor-mapping": {
    id: "routes/app.vendor-mapping",
    parentId: "routes/app",
    path: "vendor-mapping",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.fast-movers": {
    id: "routes/app.fast-movers",
    parentId: "routes/app",
    path: "fast-movers",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/app.inventory": {
    id: "routes/app.inventory",
    parentId: "routes/app",
    path: "inventory",
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route20
  },
  "routes/app.orders": {
    id: "routes/app.orders",
    parentId: "routes/app",
    path: "orders",
    index: void 0,
    caseSensitive: void 0,
    module: route21
  },
  "routes/app.inbox": {
    id: "routes/app.inbox",
    parentId: "routes/app",
    path: "inbox",
    index: void 0,
    caseSensitive: void 0,
    module: route22
  },
  "routes/app.inbox.telemetry": {
    id: "routes/app.inbox.telemetry",
    parentId: "routes/app.inbox",
    path: "telemetry",
    index: void 0,
    caseSensitive: void 0,
    module: route23
  },
  "routes/app.inbox.stream": {
    id: "routes/app.inbox.stream",
    parentId: "routes/app.inbox",
    path: "stream",
    index: void 0,
    caseSensitive: void 0,
    module: route24
  },
  "routes/app.sales": {
    id: "routes/app.sales",
    parentId: "routes/app",
    path: "sales",
    index: void 0,
    caseSensitive: void 0,
    module: route25
  },
  "routes/app.seo": {
    id: "routes/app.seo",
    parentId: "routes/app",
    path: "seo",
    index: void 0,
    caseSensitive: void 0,
    module: route26
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
