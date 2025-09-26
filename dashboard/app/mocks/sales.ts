export type SalesKpi = {
  id: string;
  label: string;
  value: string;
  delta: number;
  period: "WoW" | "MoM" | "YoY";
};

export type SalesCohort = {
  customer: string;
  lifetimeValue: string;
  lastOrder: string;
};

export type ProductPerformance = {
  name: string;
  sku: string;
  gmv: string;
  units: number;
  delta: number;
};

export type SalesDrilldown = {
  breadcrumbs: string[];
  kpis: SalesKpi[];
  bestSellers: ProductPerformance[];
  laggards: ProductPerformance[];
  cohorts: SalesCohort[];
};

export const getSalesDrilldown = async (
  _params: { period: string; collection?: string | null; product?: string | null },
): Promise<SalesDrilldown> => {
  return {
    breadcrumbs: ["All", "Turbo Kits", "Stage 2"],
    kpis: [
      { id: "gmv", label: "GMV", value: "$602K", delta: 18.2, period: "YoY" },
      { id: "orders", label: "Orders", value: "4,380", delta: 15.7, period: "YoY" },
      { id: "aov", label: "AOV", value: "$137", delta: 2.9, period: "YoY" },
      { id: "refunds", label: "Refunds", value: "$16.4K", delta: -3.1, period: "YoY" },
    ],
    bestSellers: [
      { name: "LS Swap Kit Stage 2", sku: "LS-S2", gmv: "$210K", units: 420, delta: 12.4 },
      { name: "Boost Controller Elite", sku: "BC-ELITE", gmv: "$82K", units: 310, delta: 9.1 },
    ],
    laggards: [
      { name: "Fuel Rail Kit", sku: "FRK-05", gmv: "$12K", units: 40, delta: -8.6 },
      { name: "Legacy Harness V1", sku: "H-V1", gmv: "$9K", units: 27, delta: -12.2 },
    ],
    cohorts: [
      { customer: "Jessie Power", lifetimeValue: "$14.2K", lastOrder: "6 days ago" },
      { customer: "Garage 42", lifetimeValue: "$11.8K", lastOrder: "11 days ago" },
      { customer: "Boost Bros", lifetimeValue: "$10.5K", lastOrder: "18 days ago" },
    ],
  };
};
