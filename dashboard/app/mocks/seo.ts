export type SeoAction = {
  id: string;
  severity: "Now" | "Soon" | "Later";
  title: string;
  summary: string;
};

export type KeywordRow = {
  keyword: string;
  clicks: number;
  ctr: number;
  position: number;
  delta: number;
};

const actions: SeoAction[] = [
  {
    id: "seo-1",
    severity: "Now",
    title: "Fix robots.txt blocking /collections/turbo-kit",
    summary: "Remove disallow rule or adjust meta robots to restore crawl.",
  },
  {
    id: "seo-2",
    severity: "Soon",
    title: "Add FAQ schema to LS Stage 2",
    summary: "Capture new question volume around 'CARB EO'.",
  },
  {
    id: "seo-3",
    severity: "Later",
    title: "Improve LCP on /blog/heat-management",
    summary: "Compress hero image, lazy load embedded video.",
  },
];

const keywords: KeywordRow[] = [
  { keyword: "ls swap kit", clicks: 1420, ctr: 4.1, position: 6.2, delta: 1.2 },
  { keyword: "turbo kit camaro", clicks: 980, ctr: 5.6, position: 4.8, delta: 0.9 },
  { keyword: "efi fuel pump", clicks: 620, ctr: 3.2, position: 9.4, delta: -0.6 },
];

export const getSeoOverview = async () => ({ actions, keywords });
