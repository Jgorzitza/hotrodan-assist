import { addHours, now, toIso } from "./factories/dates";
import type {
  DashboardHomePayload,
  DashboardHomeScenario,
  MockErrorPayload,
  MockState
} from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 503,
    message: "Mock error: dashboard home loader failed",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function makeBaseInbox(): DashboardHomePayload["inbox"] {
  const anchor = now();
  return {
    awaitingReview: 3,
    awaitingReviewSlaMinutes: 30,
    threads: [
      {
        conversationId: "c118",
        channel: "chat",
        customer: "Kimberly H.",
        lastMessageAt: toIso(addHours(anchor, -0.3)),
        slaBreach: false,
        subject: "EFI swap fuel pump sizing",
        summary: "Assistant drafted follow-up with AN-8 fittings recommendation.",
        draftStatus: "proposed",
        nextActionOwner: "human"
      },
      {
        conversationId: "c204",
        channel: "email",
        customer: "Diego M.",
        lastMessageAt: toIso(addHours(anchor, -1.0)),
        slaBreach: false,
        subject: "Returnless kit availability",
        summary: "Waiting on Ops to confirm warehouse ETA.",
        draftStatus: "approved",
        nextActionOwner: "assistant"
      },
      {
        conversationId: "c311",
        channel: "chat",
        customer: "Sasha L.",
        lastMessageAt: toIso(addHours(anchor, -1.1)),
        slaBreach: true,
        subject: "Billing address update",
        summary: "Customer provided VIN, awaiting billing override instructions.",
        draftStatus: "proposed",
        nextActionOwner: "human"
      }
    ]
  };
}

function makeWarningInbox(): DashboardHomePayload["inbox"] {
  const anchor = now();
  return {
    awaitingReview: 7,
    awaitingReviewSlaMinutes: 20,
    threads: [
      {
        conversationId: "c402",
        channel: "chat",
        customer: "Lena P.",
        lastMessageAt: toIso(addHours(anchor, -0.1)),
        slaBreach: true,
        subject: "AN-10 hose backorder",
        summary: "Need escalation note on supplier delay.",
        draftStatus: "proposed",
        nextActionOwner: "human"
      },
      {
        conversationId: "c415",
        channel: "email",
        customer: "Tyler S.",
        lastMessageAt: toIso(addHours(anchor, -0.6)),
        slaBreach: true,
        subject: "Payment link retry",
        summary: "Assistant awaiting finance guidance on failed charge.",
        draftStatus: "edited",
        nextActionOwner: "human"
      },
      {
        conversationId: "c421",
        channel: "chat",
        customer: "Sonia R.",
        lastMessageAt: toIso(addHours(anchor, -1.2)),
        slaBreach: true,
        subject: "Order #8472 shipment stuck",
        summary: "Carrier exception; need logistics update.",
        draftStatus: "proposed",
        nextActionOwner: "assistant"
      },
      {
        conversationId: "c433",
        channel: "email",
        customer: "Manny G.",
        lastMessageAt: toIso(addHours(anchor, -1.8)),
        slaBreach: false,
        subject: "Bulk AN fitting pricing",
        summary: "Sales requested tiered discount approval.",
        draftStatus: "approved",
        nextActionOwner: "human"
      }
    ]
  };
}

function makeEmptyInbox(): DashboardHomePayload["inbox"] {
  return {
    awaitingReview: 0,
    awaitingReviewSlaMinutes: 0,
    threads: []
  };
}

function makeBaseLearning(): DashboardHomePayload["learning"] {
  return {
    editsLast24h: 5,
    newCorrections: [
      {
        pattern: "Torque spec for AN-6 fittings",
        author: "Devon",
        addedAt: "2024-04-04T09:10:00Z"
      }
    ],
    goldensRegressions: []
  };
}

function makeWarningLearning(): DashboardHomePayload["learning"] {
  return {
    editsLast24h: 11,
    newCorrections: [
      {
        pattern: "Returnless retrofit lead time messaging",
        author: "Priya",
        addedAt: "2024-04-04T12:05:00Z"
      },
      {
        pattern: "Fuel pump amperage calculator",
        author: "Justin",
        addedAt: "2024-04-04T10:18:00Z"
      }
    ],
    goldensRegressions: [
      {
        id: "GD-022",
        title: "AN-6 hose compatibility",
        failingSince: "2024-04-03T23:30:00Z"
      }
    ]
  };
}

function makeEmptyLearning(): DashboardHomePayload["learning"] {
  return {
    editsLast24h: 0,
    newCorrections: [],
    goldensRegressions: []
  };
}

function makeBaseSystemHealth(): DashboardHomePayload["systemHealth"] {
  return {
    ragIndexAgeHours: 6.5,
    lastIngest: "2024-04-04T08:05:00Z",
    openaiLatencyP95Ms: 820,
    errorRatePct: 1.2
  };
}

function makeWarningSystemHealth(): DashboardHomePayload["systemHealth"] {
  return {
    ragIndexAgeHours: 28.1,
    lastIngest: "2024-04-03T11:40:00Z",
    openaiLatencyP95Ms: 1190,
    errorRatePct: 5.4
  };
}

function makeEmptySystemHealth(): DashboardHomePayload["systemHealth"] {
  return {
    ragIndexAgeHours: null,
    lastIngest: null,
    openaiLatencyP95Ms: null,
    errorRatePct: null
  };
}

function makeBaseHighlights(): DashboardHomePayload["highlights"] {
  return {
    notableThreads: [
      "c118 — follow-up on AN fittings upgrade",
      "c204 — returnless kit inventory sync"
    ],
    productRequests: [
      { category: "fuel systems", count: 7, trend: "up" },
      { category: "pressure regulators", count: 3, trend: "flat" }
    ]
  };
}

function makeWarningHighlights(): DashboardHomePayload["highlights"] {
  return {
    notableThreads: [
      "c402 — supplier escalation required",
      "c421 — carrier exception follow-up",
      "c415 — payment retry blocked"
    ],
    productRequests: [
      { category: "fuel systems", count: 12, trend: "up" },
      { category: "wiring harnesses", count: 5, trend: "up" },
      { category: "gauges", count: 4, trend: "flat" }
    ]
  };
}

function makeEmptyHighlights(): DashboardHomePayload["highlights"] {
  return {
    notableThreads: [],
    productRequests: []
  };
}

function buildBase(): DashboardHomePayload {
  return {
    inbox: makeBaseInbox(),
    learning: makeBaseLearning(),
    systemHealth: makeBaseSystemHealth(),
    highlights: makeBaseHighlights()
  };
}

function buildWarning(): DashboardHomePayload {
  return {
    inbox: makeWarningInbox(),
    learning: makeWarningLearning(),
    systemHealth: makeWarningSystemHealth(),
    highlights: makeWarningHighlights()
  };
}

function buildEmpty(): DashboardHomePayload {
  return {
    inbox: makeEmptyInbox(),
    learning: makeEmptyLearning(),
    systemHealth: makeEmptySystemHealth(),
    highlights: makeEmptyHighlights()
  };
}

export function buildDashboardHomeScenario(state: MockState): DashboardHomeScenario {
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
