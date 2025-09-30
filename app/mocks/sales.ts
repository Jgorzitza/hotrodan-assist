import { addDays, now, toIso } from "./factories/dates";
import type {
  MockErrorPayload,
  MockState,
  SalesRoutePayload,
  SalesRouteScenario
} from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 500,
    message: "Mock error: sales route timed out",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function periodRange(days: number): { start: string; end: string } {
  const anchor = now();
  const start = addDays(anchor, -days + 1);
  return {
    start: toIso(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))),
    end: toIso(anchor)
  };
}

function buildBase(): SalesRoutePayload {
  const range = periodRange(7);
  return {
    period: {
      label: "Last 7 days",
      start: range.start,
      end: range.end
    },
    revenue: {
      gross: 47280,
      net: 43950,
      previousPeriodDeltaPct: 7.4,
      topProducts: [
        { sku: "AN-8-HOSE", name: "AN-8 PTFE Hose Kit", revenue: 8200, deltaPct: 18.9 },
        { sku: "EFI-RETROFIT", name: "EFI Retrofit Bundle", revenue: 6900, deltaPct: 9.7 },
        { sku: "DUAL-TANK-SWITCH", name: "Dual Tank Switch Module", revenue: 5400, deltaPct: 5.3 }
      ]
    },
    assistantPipeline: {
      openOpportunities: [
        {
          conversationId: "c118",
          stage: "quote_sent",
          estimatedValue: 4200,
          lastMessage: "2024-04-02T21:12:00Z",
          owner: "human",
          blockedReason: "Waiting on financing approval"
        },
        {
          conversationId: "c204",
          stage: "qualified",
          estimatedValue: 1800,
          lastMessage: "2024-04-03T16:55:00Z",
          owner: "assistant",
          blockedReason: null
        },
        {
          conversationId: "c244",
          stage: "waiting_payment",
          estimatedValue: 2700,
          lastMessage: "2024-04-01T18:32:00Z",
          owner: "human",
          blockedReason: "Customer verifying ACH limit"
        }
      ],
      winsLastPeriod: 6,
      winsPreviousPeriod: 5
    },
    shopifyMetrics: {
      orders: 162,
      avgOrderValue: 271,
      conversionRatePct: 3.2,
      abandonedCheckouts: 24
    },
    inventoryWatch: [
      { sku: "AN-6-BULKHEAD", name: "AN-6 Bulkhead Kit", onHand: 28, daysOfCover: 4.8, status: "warning" },
      { sku: "AN-10-HOSE", name: "AN-10 Hose Kit", onHand: 64, daysOfCover: 9.3, status: "ok" }
    ],
    demandSignals: {
      productRequests: [
        { category: "fuel systems", count: 16, trend: "up" },
        { category: "wiring", count: 8, trend: "flat" }
      ],
      faqGaps: [
        { topic: "Returnless vs return-style", requests: 5 },
        { topic: "Fuel pump amperage", requests: 4 }
      ]
    }
  };
}

function buildWarning(): SalesRoutePayload {
  const range = periodRange(4);
  return {
    period: {
      label: "MTD",
      start: "2024-04-01T00:00:00Z",
      end: range.end
    },
    revenue: {
      gross: 12840,
      net: 11710,
      previousPeriodDeltaPct: -27.6,
      topProducts: [
        { sku: "AN-10-HOSE", name: "AN-10 Hose Kit", revenue: 2400, deltaPct: -33.1 },
        { sku: "EFI-RETROFIT", name: "EFI Retrofit Bundle", revenue: 2100, deltaPct: -18.4 }
      ]
    },
    assistantPipeline: {
      openOpportunities: [
        {
          conversationId: "c244",
          stage: "waiting_payment",
          estimatedValue: 2700,
          lastMessage: "2024-04-01T08:05:00Z",
          owner: "assistant",
          blockedReason: "Customer awaiting bank transfer confirmation (52h)"
        },
        {
          conversationId: "c301",
          stage: "quote_sent",
          estimatedValue: 3600,
          lastMessage: "2024-04-03T13:42:00Z",
          owner: "human",
          blockedReason: "Needs custom fabrication estimate"
        },
        {
          conversationId: "c325",
          stage: "qualified",
          estimatedValue: 2200,
          lastMessage: "2024-04-03T16:18:00Z",
          owner: "assistant",
          blockedReason: null
        },
        {
          conversationId: "c341",
          stage: "waiting_payment",
          estimatedValue: 1950,
          lastMessage: "2024-04-02T10:27:00Z",
          owner: "human",
          blockedReason: "Pending PO approval (50h)"
        }
      ],
      winsLastPeriod: 2,
      winsPreviousPeriod: 5
    },
    shopifyMetrics: {
      orders: 42,
      avgOrderValue: 279,
      conversionRatePct: 2.3,
      abandonedCheckouts: 39
    },
    inventoryWatch: [
      { sku: "AN-6-BULKHEAD", name: "AN-6 Bulkhead Kit", onHand: 12, daysOfCover: 1.8, status: "critical" },
      { sku: "DUAL-TANK-SWITCH", name: "Dual Tank Switch Module", onHand: 33, daysOfCover: 3.1, status: "warning" },
      { sku: "EFI-RETROFIT", name: "EFI Retrofit Bundle", onHand: 15, daysOfCover: 2.6, status: "critical" }
    ],
    demandSignals: {
      productRequests: [
        { category: "fuel systems", count: 22, trend: "up" },
        { category: "gauges", count: 10, trend: "up" }
      ],
      faqGaps: [
        { topic: "Fuel pump amperage", requests: 7 },
        { topic: "Boost-referenced regulators", requests: 6 }
      ]
    }
  };
}

function buildEmpty(): SalesRoutePayload {
  return {
    period: {
      label: "Today",
      start: "2024-04-04T00:00:00Z",
      end: "2024-04-04T23:59:59Z"
    },
    revenue: {
      gross: 0,
      net: 0,
      previousPeriodDeltaPct: 0,
      topProducts: []
    },
    assistantPipeline: {
      openOpportunities: [],
      winsLastPeriod: 0,
      winsPreviousPeriod: 0
    },
    shopifyMetrics: {
      orders: 0,
      avgOrderValue: 0,
      conversionRatePct: 0,
      abandonedCheckouts: 0
    },
    inventoryWatch: [],
    demandSignals: {
      productRequests: [],
      faqGaps: []
    }
  };
}

export function buildSalesScenario(state: MockState): SalesRouteScenario {
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
