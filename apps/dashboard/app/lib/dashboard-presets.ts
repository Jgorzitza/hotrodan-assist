export type DashboardWidget = {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  config?: Record<string, unknown>;
};

export type DashboardPreset = {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
};

export type DashboardLayout = {
  widgets: DashboardWidget[];
  filters: Record<string, unknown>;
  dateRange: string;
  compareRange?: string;
};

const DEFAULT_PRESETS: DashboardPreset[] = [
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level metrics for executive reporting",
    widgets: [
      { id: "revenue", type: "metric", position: { x: 0, y: 0, w: 2, h: 1 }, visible: true },
      { id: "aov", type: "metric", position: { x: 2, y: 0, w: 2, h: 1 }, visible: true },
      { id: "conversion", type: "metric", position: { x: 4, y: 0, w: 2, h: 1 }, visible: true },
      { id: "sales-trend", type: "chart", position: { x: 0, y: 1, w: 6, h: 2 }, visible: true },
      { id: "cohort-analysis", type: "cohort", position: { x: 0, y: 3, w: 6, h: 3 }, visible: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: "marketing-focus",
    name: "Marketing Focus",
    description: "Marketing metrics and campaign performance",
    widgets: [
      { id: "cac", type: "metric", position: { x: 0, y: 0, w: 2, h: 1 }, visible: true },
      { id: "ltv", type: "metric", position: { x: 2, y: 0, w: 2, h: 1 }, visible: true },
      { id: "conversion", type: "metric", position: { x: 4, y: 0, w: 2, h: 1 }, visible: true },
      { id: "cohort-analysis", type: "cohort", position: { x: 0, y: 1, w: 6, h: 3 }, visible: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "operational",
    name: "Operational",
    description: "Day-to-day operational metrics",
    widgets: [
      { id: "revenue", type: "metric", position: { x: 0, y: 0, w: 2, h: 1 }, visible: true },
      { id: "aov", type: "metric", position: { x: 2, y: 0, w: 2, h: 1 }, visible: true },
      { id: "sales-trend", type: "chart", position: { x: 0, y: 1, w: 6, h: 2 }, visible: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getDefaultPresets(): DashboardPreset[] {
  return DEFAULT_PRESETS;
}

export function createPreset(
  name: string,
  description: string,
  widgets: DashboardWidget[]
): DashboardPreset {
  const now = new Date().toISOString();
  return {
    id: `preset-${Date.now()}`,
    name,
    description,
    widgets,
    createdAt: now,
    updatedAt: now,
  };
}

export function savePreset(preset: DashboardPreset): void {
  const presets = getSavedPresets();
  const existingIndex = presets.findIndex(p => p.id === preset.id);
  
  if (existingIndex >= 0) {
    presets[existingIndex] = { ...preset, updatedAt: new Date().toISOString() };
  } else {
    presets.push(preset);
  }
  
  localStorage.setItem("dashboard-presets", JSON.stringify(presets));
}

export function getSavedPresets(): DashboardPreset[] {
  try {
    const stored = localStorage.getItem("dashboard-presets");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function deletePreset(presetId: string): void {
  const presets = getSavedPresets();
  const filtered = presets.filter(p => p.id !== presetId);
  localStorage.setItem("dashboard-presets", JSON.stringify(filtered));
}

export function loadPreset(presetId: string): DashboardPreset | null {
  const allPresets = [...getDefaultPresets(), ...getSavedPresets()];
  return allPresets.find(p => p.id === presetId) || null;
}

export function getAllPresets(): DashboardPreset[] {
  return [...getDefaultPresets(), ...getSavedPresets()];
}

export function exportPreset(preset: DashboardPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function importPreset(presetJson: string): DashboardPreset | null {
  try {
    const preset = JSON.parse(presetJson);
    if (isValidPreset(preset)) {
      return preset;
    }
    return null;
  } catch {
    return null;
  }
}

function isValidPreset(preset: unknown): preset is DashboardPreset {
  return (
    typeof preset === "object" &&
    preset !== null &&
    typeof (preset as any).id === "string" &&
    typeof (preset as any).name === "string" &&
    Array.isArray((preset as any).widgets)
  );
}
