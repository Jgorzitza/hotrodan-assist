import { z } from "zod";

export const MetricDatumSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
});

export const ProductRecommendationSchema = z.object({
  sku: z.string(),
  title: z.string(),
  rationale: z.string(),
  supportingMetrics: z.array(MetricDatumSchema),
});

export const InventorySignalSchema = z.object({
  sku: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  suggestedAction: z.string(),
  demandSignals: z.array(MetricDatumSchema),
});

export const SeoOpportunitySchema = z.object({
  handle: z.string(),
  keywordCluster: z.array(z.string()),
  projectedImpact: z.number(),
  notes: z.string().optional(),
});

export const McpResponseSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    data: inner,
    generatedAt: z.string(),
    source: z.string(),
    confidence: z.number(),
  });

export type Sanitizer<T> = (value: T) => T;

export const basicStringSanitizer = (value: string) => value.replace(/[\r\n\t]/g, " ").trim();

export const sanitizeProductRecommendation = (rec: z.infer<typeof ProductRecommendationSchema>) => ({
  ...rec,
  title: basicStringSanitizer(rec.title),
  rationale: basicStringSanitizer(rec.rationale),
});

export const sanitizeInventorySignal = (sig: z.infer<typeof InventorySignalSchema>) => ({
  ...sig,
  suggestedAction: basicStringSanitizer(sig.suggestedAction),
});

export const sanitizeSeoOpportunity = (op: z.infer<typeof SeoOpportunitySchema>) => ({
  ...op,
  notes: op.notes ? basicStringSanitizer(op.notes) : undefined,
});