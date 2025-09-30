import type { KpiCard, KpiScenario, MockErrorPayload, MockState } from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 502,
    message: "Mock error: KPI service bad gateway",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function buildBase(): KpiCard[] {
  return [
    {
      id: "aov",
      label: "Average Order Value",
      value: 271,
      changePct: 4.2,
      changeDirection: "up",
      target: 250,
      status: "ok",
      trend: [
        { label: "D-6", value: 248 },
        { label: "D-5", value: 252 },
        { label: "D-4", value: 260 },
        { label: "D-3", value: 266 },
        { label: "D-2", value: 269 },
        { label: "D-1", value: 271 }
      ]
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: 3.2,
      changePct: 0,
      changeDirection: "flat",
      target: 3.5,
      status: "warning",
      trend: [
        { label: "D-6", value: 3.0 },
        { label: "D-5", value: 3.1 },
        { label: "D-4", value: 3.2 },
        { label: "D-3", value: 3.1 },
        { label: "D-2", value: 3.2 },
        { label: "D-1", value: 3.2 }
      ]
    }
  ];
}

function buildWarning(): KpiCard[] {
  return [
    {
      id: "aov",
      label: "Average Order Value",
      value: 238,
      changePct: -9.5,
      changeDirection: "down",
      target: 250,
      status: "warning",
      trend: [
        { label: "D-6", value: 265 },
        { label: "D-5", value: 260 },
        { label: "D-4", value: 255 },
        { label: "D-3", value: 248 },
        { label: "D-2", value: 240 },
        { label: "D-1", value: 238 }
      ]
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: 2.2,
      changePct: -24.1,
      changeDirection: "down",
      target: 3.5,
      status: "critical",
      trend: [
        { label: "D-6", value: 3.1 },
        { label: "D-5", value: 2.9 },
        { label: "D-4", value: 2.8 },
        { label: "D-3", value: 2.6 },
        { label: "D-2", value: 2.4 },
        { label: "D-1", value: 2.2 }
      ]
    }
  ];
}

function buildEmpty(): KpiCard[] {
  return [];
}

export function buildKpiScenario(state: MockState): KpiScenario {
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
