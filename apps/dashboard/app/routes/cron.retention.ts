import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import {
  runSettingsRetention,
  type RunRetentionOptions,
} from "../lib/settings/retention.server";

const CRON_STATUS_UNAUTHORIZED = { status: 401, statusText: "Unauthorized" } as const;
const METHOD_NOT_ALLOWED = { status: 405, statusText: "Method Not Allowed" } as const;

const parseJsonBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch (_error) {
    return null;
  }
};

const isAuthorized = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    return token === secret;
  }

  const urlSecret = new URL(request.url).searchParams.get("token");
  return urlSecret === secret;
};

export const loader = async (_args: LoaderFunctionArgs) =>
  new Response("Use POST", METHOD_NOT_ALLOWED);

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Unsupported method", METHOD_NOT_ALLOWED);
  }

  if (!isAuthorized(request)) {
    return new Response("Missing or invalid cron token", CRON_STATUS_UNAUTHORIZED);
  }

  const overrides =
    (await parseJsonBody<
      Pick<RunRetentionOptions, "retainDays" | "upcomingWindowDays">
    >(request)) ?? undefined;

  const result = await runSettingsRetention(overrides ?? {});

  console.info("[cron:retention] Completed settings retention sweep", {
    ranAt: result.ranAt,
    deletedEvents: result.prune.deletedCount,
    staleEvents: result.prune.staleCount,
    reminders: result.rotationReminders.length,
    kpiCacheDeleted: result.kpiCache.deletedCount,
    kpiCacheStale: result.kpiCache.staleCount,
  });

  return json({ ok: true, result });
};
