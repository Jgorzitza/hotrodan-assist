import { DeliveryMethod } from "@shopify/shopify-app-remix/server";

export const WEBHOOK_BASE_PATH = "/webhooks" as const;

export type WebhookTopic =
  | "orders/create"
  | "orders/fulfilled"
  | "fulfillments/update"
  | "products/update"
  | "app/uninstalled";

export type WebhookTopicKey =
  | "ORDERS_CREATE"
  | "ORDERS_FULFILLED"
  | "FULFILLMENTS_UPDATE"
  | "PRODUCTS_UPDATE"
  | "APP_UNINSTALLED";

type WebhookSubscriptionSpec = {
  topic: WebhookTopic;
  key: WebhookTopicKey;
  callbackPath: `${typeof WEBHOOK_BASE_PATH}/${string}`;
  description: string;
};

const subscriptionSpecs: WebhookSubscriptionSpec[] = [
  {
    topic: "orders/create",
    key: "ORDERS_CREATE",
    callbackPath: `${WEBHOOK_BASE_PATH}/orders/create`,
    description: "Capture new orders for sync + OrderFlag bootstrapping",
  },
  {
    topic: "orders/fulfilled",
    key: "ORDERS_FULFILLED",
    callbackPath: `${WEBHOOK_BASE_PATH}/orders/fulfilled`,
    description: "Mark fulfilled orders + release queued follow-ups",
  },
  {
    topic: "fulfillments/update",
    key: "FULFILLMENTS_UPDATE",
    callbackPath: `${WEBHOOK_BASE_PATH}/fulfillments/update`,
    description: "Track fulfillment status changes for inventory + alerts",
  },
  {
    topic: "products/update",
    key: "PRODUCTS_UPDATE",
    callbackPath: `${WEBHOOK_BASE_PATH}/products/update`,
    description: "Refresh product velocity metrics + analytics caches",
  },
  {
    topic: "app/uninstalled",
    key: "APP_UNINSTALLED",
    callbackPath: `${WEBHOOK_BASE_PATH}/app/uninstalled`,
    description: "Purge store tokens + disable scheduled jobs on uninstall",
  },
];

export const SHOPIFY_WEBHOOK_SUBSCRIPTIONS = subscriptionSpecs;

export const SHOPIFY_WEBHOOK_REGISTRATION = subscriptionSpecs.reduce(
  (acc, spec) => ({
    ...acc,
    [spec.key]: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: spec.callbackPath,
    },
  }),
  {} as Record<WebhookTopicKey, { deliveryMethod: DeliveryMethod; callbackUrl: string }>,
);

export const SHOPIFY_WEBHOOK_KEYS = subscriptionSpecs.map((spec) => spec.key);

export const SHOPIFY_WEBHOOK_TOPICS = subscriptionSpecs.map((spec) => spec.topic);

export const SHOPIFY_WEBHOOK_DESCRIPTIONS = subscriptionSpecs.reduce(
  (acc, spec) => ({
    ...acc,
    [spec.key]: spec.description,
  }),
  {} as Record<WebhookTopicKey, string>,
);

export const resolveWebhookKey = (topic: string): WebhookTopicKey | undefined => {
  const normalized = topic.replace(/\./g, "/").replace(/_/g, "/").toLowerCase();
  const spec = subscriptionSpecs.find((entry) => entry.topic === normalized);
  return spec?.key;
};
