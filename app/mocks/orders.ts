import type {
  MockErrorPayload,
  MockState,
  Order,
  OrdersScenario,
  PaginatedOrders
} from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 504,
    message: "Mock error: orders service timeout",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function buildBase(): PaginatedOrders {
  return {
    nodes: [
      {
        id: "O-10021",
        status: "paid",
        placedAt: "2024-04-03T18:24:00Z",
        expectedShipAt: "2024-04-05T16:00:00Z",
        slaRisk: "none",
        lineItems: [
          { sku: "AN-8-HOSE", name: "AN-8 PTFE Hose Kit", quantity: 1, price: 289.99 },
          { sku: "EFI-RETROFIT", name: "EFI Retrofit Bundle", quantity: 1, price: 1189.0 }
        ],
        timeline: [
          { type: "payment_captured", occurredAt: "2024-04-03T18:25:00Z" },
          { type: "label_purchased", occurredAt: "2024-04-04T08:15:00Z" }
        ]
      },
      {
        id: "O-10022",
        status: "processing",
        placedAt: "2024-04-03T20:41:00Z",
        expectedShipAt: "2024-04-06T17:00:00Z",
        slaRisk: "warning",
        lineItems: [
          { sku: "DUAL-TANK-SWITCH", name: "Dual Tank Switch Module", quantity: 2, price: 349.0 }
        ],
        timeline: [{ type: "payment_captured", occurredAt: "2024-04-03T20:42:00Z" }]
      },
      {
        id: "O-10023",
        status: "fulfilled",
        placedAt: "2024-04-02T14:07:00Z",
        expectedShipAt: "2024-04-03T16:00:00Z",
        slaRisk: "none",
        lineItems: [{ sku: "AN-6-BULKHEAD", name: "AN-6 Bulkhead Kit", quantity: 3, price: 64.0 }],
        timeline: [
          { type: "payment_captured", occurredAt: "2024-04-02T14:08:00Z" },
          { type: "shipped", occurredAt: "2024-04-03T11:30:00Z" }
        ]
      }
    ],
    pageInfo: {
      hasNextPage: true,
      cursor: "O-10023"
    }
  };
}

function buildWarning(): PaginatedOrders {
  return {
    nodes: [
      {
        id: "O-10024",
        status: "processing",
        placedAt: "2024-04-02T09:12:00Z",
        expectedShipAt: "2024-04-03T12:00:00Z",
        slaRisk: "breach",
        lineItems: [{ sku: "AN-10-HOSE", name: "AN-10 Hose Kit", quantity: 1, price: 369.0 }],
        timeline: [
          { type: "payment_captured", occurredAt: "2024-04-02T09:13:00Z" },
          {
            type: "delay_flagged",
            occurredAt: "2024-04-04T10:00:00Z",
            note: "Awaiting supplier confirmation"
          }
        ]
      },
      {
        id: "O-10025",
        status: "processing",
        placedAt: "2024-04-02T17:33:00Z",
        expectedShipAt: "2024-04-04T18:00:00Z",
        slaRisk: "warning",
        lineItems: [{ sku: "EFI-RETROFIT", name: "EFI Retrofit Bundle", quantity: 1, price: 1189.0 }],
        timeline: [{ type: "payment_captured", occurredAt: "2024-04-02T17:34:00Z" }]
      },
      {
        id: "O-10026",
        status: "refund_pending",
        placedAt: "2024-04-01T16:20:00Z",
        expectedShipAt: undefined,
        slaRisk: "warning",
        lineItems: [{ sku: "PRESS-GAUGE", name: "Fuel Pressure Gauge", quantity: 2, price: 89.0 }],
        timeline: [{ type: "refund_requested", occurredAt: "2024-04-03T12:00:00Z" }]
      }
    ],
    pageInfo: {
      hasNextPage: false,
      cursor: null
    }
  };
}

function buildEmpty(): PaginatedOrders {
  return {
    nodes: [],
    pageInfo: {
      hasNextPage: false,
      cursor: null
    }
  };
}

export function buildOrdersScenario(state: MockState): OrdersScenario {
  switch (state) {
    case "warning":
      return buildWarning();
    case "empty":
      return buildEmpty();
    case "error":
      return ERROR_PAYLOAD;
    case "base":
    default:
      return buildBase();
  }
}
