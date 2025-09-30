import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { performanceMonitor } from "~/lib/monitoring/performance.server";

/**
 * API endpoint for performance metrics
 */
export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  const summary = performanceMonitor.getSummary();
  
  return json({
    summary,
    timestamp: new Date().toISOString(),
  });
};
