import type { InventoryItem, InventoryScenario, MockErrorPayload, MockState } from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 503,
    message: "Mock error: inventory service unavailable",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function buildBase(): InventoryItem[] {
  return [
    {
      sku: "AN-6-BULKHEAD",
      name: "AN-6 Bulkhead Kit",
      onHand: 42,
      daysOfCover: 6.5,
      status: "ok",
      reorderPoint: 25,
      velocity: 5.8,
      incomingShipment: { eta: "2024-04-08T00:00:00Z", quantity: 80 }
    },
    {
      sku: "EFI-RETROFIT",
      name: "EFI Retrofit Bundle",
      onHand: 28,
      daysOfCover: 4.8,
      status: "warning",
      reorderPoint: 30,
      velocity: 6.9
    },
    {
      sku: "DUAL-TANK-SWITCH",
      name: "Dual Tank Switch Module",
      onHand: 64,
      daysOfCover: 9.1,
      status: "ok",
      reorderPoint: 35,
      velocity: 7.2
    }
  ];
}

function buildWarning(): InventoryItem[] {
  return [
    {
      sku: "AN-6-BULKHEAD",
      name: "AN-6 Bulkhead Kit",
      onHand: 9,
      daysOfCover: 1.4,
      status: "critical",
      reorderPoint: 25,
      velocity: 7.1,
      incomingShipment: { eta: "2024-04-10T00:00:00Z", quantity: 60 }
    },
    {
      sku: "EFI-RETROFIT",
      name: "EFI Retrofit Bundle",
      onHand: 12,
      daysOfCover: 2.0,
      status: "critical",
      reorderPoint: 30,
      velocity: 6.9
    },
    {
      sku: "DUAL-TANK-SWITCH",
      name: "Dual Tank Switch Module",
      onHand: 24,
      daysOfCover: 3.2,
      status: "warning",
      reorderPoint: 35,
      velocity: 7.4
    }
  ];
}

function buildEmpty(): InventoryItem[] {
  return [];
}

export function buildInventoryScenario(state: MockState): InventoryScenario {
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
