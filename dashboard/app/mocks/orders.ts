import type { Faker } from "@faker-js/faker";

import {
  createScenarioFaker,
  createSeededFaker,
  createMoney,
  percentage,
  roundTo,
  scenarioToDatasetState,
} from "./shared";
import type {
  MockScenario,
  Money,
  Order,
  OrderIssue,
  OrderOwner,
  OrderPriority,
  OrdersDataset,
  OrdersMetrics,
  ReturnEntry,
  ReturnsPanel,
  ShipmentsPanel,
  ShipmentDelayed,
  ShipmentTrackingPending,
} from "~/types/dashboard";

const DEFAULT_ORDER_COUNT = 36;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 12;

const SCENARIO_KEY = (scenario: MockScenario, seed: number) => `${scenario}::${seed}`;

type OrdersStore = {
  orders: Order[];
  shipments: ShipmentsPanel;
  returns: ReturnsPanel;
  inventory: OrdersDataset["inventory"];
  alerts: string[];
  dataGaps: string[];
};

const STORE = new Map<string, OrdersStore>();

const ORDER_PRIORITIES: Array<{ value: OrderPriority; weight: number }> = [
  { value: "standard", weight: 62 },
  { value: "rush", weight: 26 },
  { value: "vip", weight: 12 },
];
const ORDER_ISSUES: Array<{ value: OrderIssue; weight: number }> = [
  { value: "none", weight: 55 },
  { value: "inventory", weight: 18 },
  { value: "payment", weight: 9 },
  { value: "address", weight: 8 },
  { value: "carrier", weight: 6 },
  { value: "manual_check", weight: 4 },
];
const ORDER_CHANNELS: Array<{ value: Order["channel"]; weight: number }> = [
  { value: "online", weight: 78 },
  { value: "pos", weight: 14 },
  { value: "draft", weight: 8 },
];

const HOURS = 1000 * 60 * 60;

const clampPageSize = (value?: number | null) => {
  if (!Number.isFinite(value ?? NaN)) return DEFAULT_PAGE_SIZE;
  return Math.max(5, Math.min(MAX_PAGE_SIZE, Math.round(value!)));
};

const pickWeighted = <T>(faker: Faker, entries: Array<{ value: T; weight: number }>): T => {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const target = faker.number.float({ min: 0, max: total, multipleOf: 0.01 });
  let running = 0;
  for (const entry of entries) {
    running += entry.weight;
    if (target <= running) {
      return entry.value;
    }
  }
  return entries[entries.length - 1]!.value;
};

const makeOrder = (faker: ReturnType<typeof createScenarioFaker>, index: number): Order => {
  const priority = pickWeighted(faker, ORDER_PRIORITIES);
  const issue = pickWeighted(faker, ORDER_ISSUES);
  const channel = pickWeighted(faker, ORDER_CHANNELS);

  const lineItemCount = faker.number.int({ min: 1, max: 4 });
  const lineItems = Array.from({ length: lineItemCount }, (_, itemIndex) => {
    const quantity = faker.number.int({ min: 1, max: 4 });
    const price = faker.number.float({ min: 18, max: 260, multipleOf: 0.01 });
    return {
      id: `order-${index}-item-${itemIndex}`,
      title: faker.commerce.productName(),
      sku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
      quantity,
      price: createMoney(price),
      total: createMoney(price * quantity),
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
    "fulfilled",
  ] as Order["fulfillmentStatus"][]);
  const fulfillmentDueAt = fulfillmentStatus === "fulfilled"
    ? undefined
    : faker.date.soon({ days: 4, refDate: placedAt }).toISOString();
  const status = fulfillmentStatus === "fulfilled"
    ? "fulfilled"
    : pickWeighted(faker, [
        { value: "paid" as const, weight: 65 },
        { value: "processing" as const, weight: 35 },
      ]);
  const paymentStatus = status === "paid" ? "paid" : "pending";

  const ageHours = Math.max(
    roundTo((Date.now() - new Date(placedAt).getTime()) / HOURS, 1),
    0.5,
  );

  const assignedTo: OrderOwner = faker.helpers.arrayElement([
    "assistant",
    "assistant",
    "unassigned",
    faker.person.firstName().toLowerCase(),
  ]);

  return {
    id: `order-${index}`,
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
    total: createMoney(total),
    subtotal: createMoney(subtotal),
    shipping: createMoney(shipping),
    customer: {
      id: `customer-${index}`,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      firstOrderAt: faker.date.past({ years: 3 }).toISOString(),
      lastOrderAt: placedAt,
      location: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
      lifetimeValue: createMoney(
        total * faker.number.float({ min: 2.4, max: 5.8 }),
      ),
    },
    lineItems,
    tags: faker.helpers.arrayElements(
      ["VIP", "Wholesale", "Email", "Repeat", "Gift"],
      faker.number.int({ min: 0, max: 2 }),
    ),
    timeline: [
      {
        id: `order-${index}-event-placed`,
        type: "status",
        message: "Order placed",
        occurredAt: placedAt,
        state: status,
      },
      {
        id: `order-${index}-event-payment`,
        type: "payment",
        message: paymentStatus === "paid" ? "Payment captured" : "Awaiting payment",
        occurredAt: faker.date.soon({ days: 1, refDate: placedAt }).toISOString(),
        state: status,
      },
    ],
    supportThread: faker.datatype.boolean({ probability: 0.42 })
      ? `conversation:${faker.string.nanoid(6)}`
      : undefined,
  };
};

const buildShipments = (
  faker: ReturnType<typeof createSeededFaker>,
  orders: Order[],
): ShipmentsPanel => {
  const trackingPending: ShipmentTrackingPending[] = orders
    .filter((order) => order.fulfillmentStatus !== "fulfilled")
    .slice(0, 4)
    .map((order, index) => ({
      id: `tracking-${index}`,
      orderNumber: order.name,
      expectedShipDate: order.shipBy ?? order.fulfillmentDueAt ?? faker.date
        .soon({ days: 2 })
        .toISOString(),
      owner: order.assignedTo,
    }));

  const delayed: ShipmentDelayed[] = orders
    .filter(
      (order) =>
        order.fulfillmentStatus !== "fulfilled" &&
        !!order.fulfillmentDueAt &&
        new Date(order.fulfillmentDueAt).getTime() < Date.now(),
    )
    .slice(0, 3)
    .map((order, index) => ({
      id: `delay-${index}`,
      orderNumber: order.name,
      carrier: faker.helpers.arrayElement(["UPS", "FedEx", "USPS", "DHL"]),
      delayHours: faker.number.int({ min: 6, max: 42 }),
      lastUpdate: faker.date.recent({ days: 1 }).toISOString(),
    }));

  return {
    trackingPending,
    delayed,
    deliveredToday: faker.number.int({ min: 4, max: 18 }),
  };
};

const buildReturns = (
  faker: ReturnType<typeof createSeededFaker>,
  orders: Order[],
): ReturnsPanel => {
  const candidates = orders.slice(0, 6);
  const pending: ReturnEntry[] = candidates.map((order, index) => {
    const stage = faker.helpers.arrayElement<ReturnEntry["stage"]>([
      "awaiting_label",
      "in_transit",
      "inspection",
    ]);
    const ageDays = faker.number.float({ min: 0.5, max: 9.5, multipleOf: 0.5 });

    return {
      id: `return-${index}`,
      orderNumber: order.name,
      reason: faker.helpers.arrayElement([
        "Wrong size",
        "Damaged in transit",
        "Changed mind",
        "Incorrect fittings",
      ]),
      stage,
      ageDays,
      refundAmount: createMoney(order.total.amount * faker.number.float({ min: 0.4, max: 1 })),
    };
  });

  const refundValue = pending.reduce(
    (total, ret) => total + (ret.stage === "inspection" ? ret.refundAmount.amount : 0),
    0,
  );

  return {
    pending,
    refundsDue: pending.filter((entry) => entry.stage === "inspection").length,
    refundValue: createMoney(refundValue),
  };
};

const buildInventoryHolds = (
  faker: ReturnType<typeof createSeededFaker>,
): OrdersDataset["inventory"] => {
  return Array.from({ length: 4 }, (_, index) => ({
    sku: `INV-${faker.string.alphanumeric({ length: 6 }).toUpperCase()}`,
    title: `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${faker.commerce.product()}`,
    ordersWaiting: faker.number.int({ min: 1, max: 6 }),
    onHand: faker.number.int({ min: 0, max: 12 }),
    eta: faker.datatype.boolean({ likelihood: 60 })
      ? faker.date.soon({ days: 5 + index * 2 }).toISOString()
      : undefined,
  }));
};

const createStore = (scenario: MockScenario, seed: number): OrdersStore => {
  if (scenario === "empty") {
    return {
      orders: [],
      shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
      returns: { pending: [], refundsDue: 0, refundValue: createMoney(0) },
      inventory: [],
      alerts: [],
      dataGaps: [],
    };
  }

  if (scenario === "error") {
    return {
      orders: [],
      shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
      returns: { pending: [], refundsDue: 0, refundValue: createMoney(0) },
      inventory: [],
      alerts: [],
      dataGaps: [],
    };
  }

  const faker = createScenarioFaker(scenario, seed);
  const orders = Array.from({ length: DEFAULT_ORDER_COUNT }, (_, index) => makeOrder(faker, index));

  // Introduce additional pressure in warning scenario
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
        occurredAt: new Date().toISOString(),
        state: "processing",
      });
    });
  }

  const systemFaker = createSeededFaker(seed + 404);
  const shipments = buildShipments(systemFaker, orders);
  const returns = buildReturns(systemFaker, orders);
  const inventory = buildInventoryHolds(systemFaker);

  const alerts: string[] = [];
  if (scenario === "warning") {
    alerts.push("Multiple VIP orders are approaching SLA risk.");
  }
  const dataGaps: string[] = [];

  return {
    orders,
    shipments,
    returns,
    inventory,
    alerts,
    dataGaps,
  };
};

const getStore = (scenario: MockScenario, seed: number): OrdersStore => {
  const key = SCENARIO_KEY(scenario, seed);
  if (!STORE.has(key)) {
    STORE.set(key, createStore(scenario, seed));
  }
  return STORE.get(key)!;
};

const computeMetrics = (orders: Order[], shipments: ShipmentsPanel): OrdersMetrics => {
  const totalOrders = orders.length;
  if (!totalOrders) {
    return {
      totalOrders: 0,
      awaitingFulfillment: 0,
      awaitingTracking: 0,
      overdue: 0,
      overduePercentage: 0,
      averageFulfillmentHours: 0,
      slaBreaches: 0,
    };
  }
  const awaitingFulfillment = orders.filter((order) => order.fulfillmentStatus !== "fulfilled").length;
  const overdue = orders.filter(
    (order) =>
      order.fulfillmentStatus !== "fulfilled" &&
      !!order.fulfillmentDueAt &&
      new Date(order.fulfillmentDueAt).getTime() < Date.now(),
  ).length;
  const averageFulfillmentHours = orders.reduce((sum, order) => sum + order.ageHours, 0) / totalOrders;

  return {
    totalOrders,
    awaitingFulfillment,
    awaitingTracking: shipments.trackingPending.length,
    overdue,
    overduePercentage: percentage(overdue, totalOrders, 0),
    averageFulfillmentHours: roundTo(averageFulfillmentHours, 1),
    slaBreaches: shipments.delayed.length,
  };
};

const filterOrdersByTab = (orders: Order[], tab: OrdersDataset["tab"]): Order[] => {
  switch (tab) {
    case "unfulfilled":
      return orders.filter((order) => order.fulfillmentStatus !== "fulfilled");
    case "overdue":
      return orders.filter(
        (order) =>
          order.fulfillmentStatus !== "fulfilled" &&
          !!order.fulfillmentDueAt &&
          new Date(order.fulfillmentDueAt).getTime() < Date.now(),
      );
    case "refunded":
      return orders.filter((order) => order.status === "refunded");
    default:
      return orders;
  }
};

const paginateOrders = (orders: Order[], pageSize: number) => {
  const limited = orders.slice(0, pageSize);
  const hasNextPage = orders.length > pageSize;
  return {
    items: limited,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? limited[limited.length - 1]?.id ?? null : null,
    },
  };
};

const errorDataset = (scenario: MockScenario, tab: OrdersDataset["tab"]): OrdersDataset => ({
  scenario,
  state: "error",
  tab,
  period: buildDefaultPeriod(),
  orders: [],
  count: 0,
  pageInfo: { hasNextPage: false, endCursor: null },
  metrics: {
    totalOrders: 0,
    awaitingFulfillment: 0,
    awaitingTracking: 0,
    overdue: 0,
    overduePercentage: 0,
    averageFulfillmentHours: 0,
    slaBreaches: 0,
  },
  shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
  returns: { pending: [], refundsDue: 0, refundValue: createMoney(0) },
  inventory: [],
  alerts: [],
  dataGaps: [],
  error: "Orders service timed out while responding.",
});

const emptyDataset = (scenario: MockScenario, tab: OrdersDataset["tab"]): OrdersDataset => ({
  scenario,
  state: "empty",
  tab,
  period: buildDefaultPeriod(),
  orders: [],
  count: 0,
  pageInfo: { hasNextPage: false, endCursor: null },
  metrics: {
    totalOrders: 0,
    awaitingFulfillment: 0,
    awaitingTracking: 0,
    overdue: 0,
    overduePercentage: 0,
    averageFulfillmentHours: 0,
    slaBreaches: 0,
  },
  shipments: { trackingPending: [], delayed: [], deliveredToday: 0 },
  returns: { pending: [], refundsDue: 0, refundValue: createMoney(0) },
  inventory: [],
  alerts: [],
  dataGaps: [],
  alert: "No orders match the current filters.",
});

export type OrdersScenarioOptions = {
  scenario?: MockScenario;
  tab?: OrdersDataset["tab"];
  pageSize?: number;
  seed?: number;
};

const buildDefaultPeriod = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * HOURS);
  return {
    label: "Last 7 days",
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

export const getOrdersScenario = (
  options: OrdersScenarioOptions = {},
): OrdersDataset => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const tab = options.tab ?? "all";
  const pageSize = clampPageSize(options.pageSize);

  if (scenario === "error") {
    return errorDataset(scenario, tab);
  }
  if (scenario === "empty") {
    return emptyDataset(scenario, tab);
  }

  const store = getStore(scenario, seed);
  const filtered = filterOrdersByTab(store.orders, tab);
  const { items, pageInfo } = paginateOrders(filtered, pageSize);
  const metrics = computeMetrics(store.orders, store.shipments);

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    tab,
    period: buildDefaultPeriod(),
    orders: items,
    count: filtered.length,
    pageInfo,
    metrics,
    shipments: store.shipments,
    returns: store.returns,
    inventory: store.inventory,
    alerts: [...store.alerts],
    dataGaps: [...store.dataGaps],
  };
};

const findOrders = (scenario: MockScenario, seed: number, ids: string[]): { store: OrdersStore; orders: Order[] } => {
  const store = getStore(scenario, seed);
  const orders = ids
    .map((id) => store.orders.find((order) => order.id === id))
    .filter((order): order is Order => Boolean(order));
  return { store, orders };
};

export const assignOrders = (
  scenario: MockScenario,
  seed: number,
  ids: string[],
  assignee: string,
) => {
  const { store, orders } = findOrders(scenario, seed, ids);
  orders.forEach((order) => {
    order.assignedTo = assignee || "unassigned";
  });
  if (orders.length) {
    store.alerts = store.alerts.filter((msg) => !msg.startsWith("Assignment pending"));
  }
  return orders;
};

export const markOrdersFulfilled = (
  scenario: MockScenario,
  seed: number,
  ids: string[],
  tracking?: { number: string; carrier: string },
) => {
  const { store, orders } = findOrders(scenario, seed, ids);
  const orderNames = new Set(orders.map((order) => order.name));
  orders.forEach((order) => {
    order.fulfillmentStatus = "fulfilled";
    order.status = "fulfilled";
    order.issue = "none";
    order.fulfillmentDueAt = undefined;
  });
  store.shipments.trackingPending = store.shipments.trackingPending.filter(
    (shipment) => !orderNames.has(shipment.orderNumber),
  );
  store.shipments.delayed = store.shipments.delayed.filter(
    (shipment) => !orderNames.has(shipment.orderNumber),
  );
  if (tracking) {
    store.alerts.unshift(
      `Tracking ${tracking.number} (${tracking.carrier}) created for ${orders.map((order) => order.name).join(", ")}`,
    );
  }
  return orders;
};

export const requestSupport = (
  scenario: MockScenario,
  seed: number,
  payload: { orderId: string; conversationId?: string; note: string },
) => {
  const store = getStore(scenario, seed);
  const order = store.orders.find((item) => item.id === payload.orderId);
  if (!order) return null;
  order.issue = "manual_check";
  order.assignedTo = "assistant";
  order.supportThread = payload.conversationId ?? order.supportThread ?? `conversation:${payload.orderId}`;
  store.alerts.unshift(`Support requested for ${order.name}: ${payload.note}`);
  return order;
};

export const updateReturnAction = (
  scenario: MockScenario,
  seed: number,
  payload: { orderId: string; action: "approve_refund" | "deny" | "request_inspection"; note?: string },
) => {
  const store = getStore(scenario, seed);
  const entry = store.returns.pending.find((ret) => ret.orderNumber === payload.orderId);
  if (!entry) return null;

  if (payload.action === "approve_refund") {
    entry.stage = "inspection";
  } else if (payload.action === "deny") {
    store.returns.pending = store.returns.pending.filter((ret) => ret.orderNumber !== payload.orderId);
  } else {
    entry.stage = "in_transit";
  }

  if (payload.note) {
    store.alerts.unshift(`Return update for ${payload.orderId}: ${payload.note}`);
  }

  return entry;
};

export const resetOrdersStore = () => {
  STORE.clear();
};
