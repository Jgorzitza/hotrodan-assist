export type InventoryBucket = {
  id: string;
  label: string;
  description: string;
  skuCount: number;
  href: string;
};

export type InventoryTrend = {
  label: string;
  projectedDays: number;
  currentStock: number;
};

const buckets: InventoryBucket[] = [
  {
    id: "urgent",
    label: "Need urgently",
    description: "Local supplier <2 days",
    skuCount: 6,
    href: "/app/inventory?bucket=urgent",
  },
  {
    id: "sea",
    label: "Sea freight",
    description: "Manufacturing 20d + delivery 30d",
    skuCount: 11,
    href: "/app/inventory?bucket=sea",
  },
  {
    id: "air",
    label: "Air freight",
    description: "Manufacturing 30d + delivery 5d",
    skuCount: 8,
    href: "/app/inventory?bucket=air",
  },
];

const trends: InventoryTrend[] = [
  { label: "LS Stage 3 Kit", projectedDays: 9, currentStock: 28 },
  { label: "Boost Controller Elite", projectedDays: 14, currentStock: 52 },
  { label: "Heat Shield V2", projectedDays: 32, currentStock: 104 },
];

export const getInventoryOverview = async () => ({ buckets, trends });
