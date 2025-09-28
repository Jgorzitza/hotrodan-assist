import { Prisma, SeoInsightSeverity, SeoInsightStatus } from "@prisma/client";

import prisma from "~/db.server";
import type {
  SeoActionPriority,
  SeoActionStatus,
  SeoSource,
} from "~/types/dashboard";

const ACTION_CATEGORY = "SEO_ACTION";

const PRIORITY_TO_SEVERITY: Record<SeoActionPriority, SeoInsightSeverity> = {
  now: SeoInsightSeverity.CRITICAL,
  soon: SeoInsightSeverity.HIGH,
  later: SeoInsightSeverity.MEDIUM,
};

const STATUS_TO_PRISMA: Record<SeoActionStatus, SeoInsightStatus> = {
  not_started: SeoInsightStatus.OPEN,
  in_progress: SeoInsightStatus.IN_PROGRESS,
  done: SeoInsightStatus.RESOLVED,
};

const STATUS_FROM_PRISMA: Record<SeoInsightStatus, SeoActionStatus> = {
  OPEN: "not_started",
  IN_PROGRESS: "in_progress",
  RESOLVED: "done",
  DISMISSED: "done",
};

const toJson = <T>(value: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const buildInsightId = (storeId: string, actionId: string): string =>
  `seo-action:${storeId}:${actionId}`;

type StoreRef = {
  id: string;
};

const resolveStoreId = async (shopDomain: string): Promise<string | null> => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ domain: shopDomain }, { myShopifyDomain: shopDomain }],
    },
    select: { id: true },
  });

  return (store as StoreRef | null)?.id ?? null;
};

export type PersistSeoActionUpdateInput = {
  shopDomain: string;
  action: {
    id: string;
    title: string;
    description: string;
    priority: SeoActionPriority;
    status: SeoActionStatus;
    assignedTo?: string | null;
    source?: SeoSource;
    metricLabel?: string | null;
    metricValue?: string | null;
    dueAt?: string | null;
  };
};

export type PersistSeoActionUpdateResult =
  | { ok: true; storeId: string; insightId: string }
  | { ok: false; reason: "missing-store" };

export type SeoActionOverride = {
  status: SeoActionStatus;
  assignedTo?: string | null;
  lastUpdatedAt: string;
  dueAt?: string | null;
};

const normaliseAssignee = (value?: string | null): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  if (trimmed.toLowerCase() === "unassigned") {
    return null;
  }
  return trimmed;
};

const normaliseMetric = (value?: string | null): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const persistSeoActionUpdate = async (
  input: PersistSeoActionUpdateInput,
): Promise<PersistSeoActionUpdateResult> => {
  const storeId = await resolveStoreId(input.shopDomain);
  if (!storeId) {
    return { ok: false, reason: "missing-store" };
  }

  const { action } = input;
  const severity = PRIORITY_TO_SEVERITY[action.priority];
  const status = STATUS_TO_PRISMA[action.status];
  const metadata = toJson({
    actionId: action.id,
    assignedTo: normaliseAssignee(action.assignedTo),
    priority: action.priority,
    source: action.source ?? null,
    metricLabel: normaliseMetric(action.metricLabel),
    metricValue: normaliseMetric(action.metricValue),
    lastUpdatedAt: new Date().toISOString(),
  });

  const recordId = buildInsightId(storeId, action.id);
  const dueDate = (() => {
    if (action.dueAt === undefined) {
      return undefined;
    }
    if (action.dueAt === null) {
      return null;
    }
    const parsed = new Date(action.dueAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();

  const completedAt =
    status === SeoInsightStatus.RESOLVED ? new Date() : null;

  await prisma.seoInsight.upsert({
    where: { id: recordId },
    create: {
      id: recordId,
      storeId,
      title: action.title,
      description: action.description,
      category: ACTION_CATEGORY,
      severity,
      status,
      metadata,
      dueAt: dueDate ?? null,
      completedAt,
      resourceUrl: null,
    },
    update: {
      title: action.title,
      description: action.description,
      severity,
      status,
      metadata,
      ...(dueDate !== undefined ? { dueAt: dueDate } : {}),
      completedAt,
    },
  });

  return { ok: true, storeId, insightId: recordId };
};

export const getPersistedActionOverrides = async (
  shopDomain: string,
  actionIds: string[],
): Promise<Record<string, SeoActionOverride>> => {
  if (!actionIds.length) {
    return {};
  }

  const storeId = await resolveStoreId(shopDomain);
  if (!storeId) {
    return {};
  }

  const ids = actionIds.map((actionId) => buildInsightId(storeId, actionId));
  const records = await prisma.seoInsight.findMany({
    where: { id: { in: ids } },
  });

  const overrides: Record<string, SeoActionOverride> = {};

  for (const record of records) {
    const metadata =
      record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : null;
    const hasAssignedTo =
      metadata !== null && Object.prototype.hasOwnProperty.call(metadata, "assignedTo");
    let normalisedAssignee: string | null | undefined;
    if (hasAssignedTo) {
      const assignedToRaw = (metadata as Record<string, unknown>).assignedTo;
      normalisedAssignee =
        typeof assignedToRaw === "string" ? normaliseAssignee(assignedToRaw) : null;
    }
    const actionId = (() => {
      if (metadata?.actionId && typeof metadata.actionId === "string") {
        return metadata.actionId;
      }
      const segment = record.id.split(":");
      return segment.length ? segment[segment.length - 1] : record.id;
    })();

    const override: SeoActionOverride = {
      status: STATUS_FROM_PRISMA[record.status],
      lastUpdatedAt: record.updatedAt.toISOString(),
      dueAt: record.dueAt ? record.dueAt.toISOString() : undefined,
    };

    if (normalisedAssignee !== undefined) {
      override.assignedTo = normalisedAssignee;
    }

    overrides[actionId] = override;
  }

  return overrides;
};
