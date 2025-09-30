import type { MockErrorPayload, MockState, SettingsPayload, SettingsScenario } from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 500,
    message: "Mock error: settings service failed",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function buildBase(): SettingsPayload {
  return {
    merchant: {
      id: "m-001",
      name: "Hot Rod AN",
      plan: "Scale",
      timezone: "America/Chicago"
    },
    team: [
      { id: "u-justin", name: "Justin", role: "admin", lastActiveAt: "2024-04-04T15:10:00Z" },
      { id: "u-devon", name: "Devon", role: "editor", lastActiveAt: "2024-04-04T14:22:00Z" }
    ],
    featureFlags: {
      assistant_routing: true,
      inventory_warnings: true,
      seo_dashboards: false
    },
    integrations: [
      { id: "shopify", provider: "shopify", status: "connected", lastSyncAt: "2024-04-04T13:30:00Z" },
      { id: "klaviyo", provider: "klaviyo", status: "pending", lastSyncAt: null }
    ]
  };
}

function buildWarning(): SettingsPayload {
  return {
    merchant: {
      id: "m-001",
      name: "Hot Rod AN",
      plan: "Growth",
      timezone: "America/Chicago"
    },
    team: [
      { id: "u-justin", name: "Justin", role: "admin", lastActiveAt: "2024-04-04T15:10:00Z" },
      { id: "u-devon", name: "Devon", role: "editor", lastActiveAt: "2024-04-02T19:45:00Z" },
      { id: "u-priya", name: "Priya", role: "viewer", lastActiveAt: null }
    ],
    featureFlags: {
      assistant_routing: true,
      inventory_warnings: false,
      seo_dashboards: false
    },
    integrations: [
      { id: "shopify", provider: "shopify", status: "connected", lastSyncAt: "2024-04-04T13:30:00Z" },
      { id: "klaviyo", provider: "klaviyo", status: "disconnected", lastSyncAt: "2024-04-01T09:00:00Z" }
    ]
  };
}

function buildEmpty(): SettingsPayload {
  return {
    merchant: {
      id: "m-001",
      name: "Hot Rod AN",
      plan: "Trial",
      timezone: "America/Chicago"
    },
    team: [],
    featureFlags: {},
    integrations: []
  };
}

export function buildSettingsScenario(state: MockState): SettingsScenario {
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
