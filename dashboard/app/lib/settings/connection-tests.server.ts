import { performance } from "node:perf_hooks";

import { createBingClient } from "../seo/bing";
import { createGa4Client } from "../seo/ga4";
import { createGscClient } from "../seo/gsc";
import type {
  ConnectionStatusState,
  SettingsProvider,
} from "../../types/settings";

export type ConnectionTestResult = {
  status: ConnectionStatusState;
  durationMs: number;
  message: string;
};

type ConnectionTestInput = {
  provider: SettingsProvider;
  credential: string;
};

const DURATION_BASELINE: Record<SettingsProvider, number> = {
  ga4: 360,
  gsc: 920,
  bing: 480,
};

const formatDuration = (value: number) => `${value}ms`;

const buildResult = (
  provider: SettingsProvider,
  status: ConnectionStatusState,
  duration: number,
  message: string,
): ConnectionTestResult => ({
  status,
  durationMs: duration,
  message,
});

/**
 * TODO: Replace mock adapters with real API requests using stored credentials,
 * handle OAuth/token refresh, and log connection attempts for security audits.
 */
export const runConnectionTest = async (
  input: ConnectionTestInput,
): Promise<ConnectionTestResult> => {
  const start = performance.now();
  const durationFallback = DURATION_BASELINE[input.provider] ?? 500;

  switch (input.provider) {
    case "ga4": {
      const client = createGa4Client();
      const summary = await client.fetchTrafficSummary({
        propertyId: input.credential,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback,
      );
      if (summary.conversions > 0 && summary.sessions > 0) {
        return buildResult(
          input.provider,
          "success",
          duration,
          `GA4 responded with ${summary.conversions} conversions across ${summary.sessions} sessions (${formatDuration(duration)})`,
        );
      }

      if (summary.sessions > 0) {
        return buildResult(
          input.provider,
          "warning",
          duration,
          `GA4 returned data but conversions were zero (${formatDuration(duration)})`,
        );
      }

      return buildResult(
        input.provider,
        "error",
        duration,
        `GA4 response empty; verify property permissions (${formatDuration(duration)})`,
      );
    }
    case "gsc": {
      const client = createGscClient();
      const issues = await client.fetchCoverageIssues({
        siteUrl: input.credential,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback,
      );
      const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
      const warningCount = issues.filter((issue) => issue.severity === "warning").length;
      const total = issues.length;

      if (criticalCount > 0) {
        return buildResult(
          input.provider,
          "warning",
          duration,
          `GSC connection healthy but ${criticalCount} critical issue${
            criticalCount === 1 ? "" : "s"
          } detected (${formatDuration(duration)})`,
        );
      }

      if (warningCount > 0) {
        return buildResult(
          input.provider,
          "warning",
          duration,
          `GSC returned ${warningCount} warning${
            warningCount === 1 ? "" : "s"
          } (${formatDuration(duration)})`,
        );
      }

      if (total === 0) {
        return buildResult(
          input.provider,
          "warning",
          duration,
          `GSC responded but no coverage data available (${formatDuration(duration)})`,
        );
      }

      return buildResult(
        input.provider,
        "success",
        duration,
        `GSC responded with ${total} coverage issue${
          total === 1 ? "" : "s"
        } (${formatDuration(duration)})`,
      );
    }
    case "bing": {
      const client = createBingClient();
      const metrics = await client.fetchPageMetrics({
        siteUrl: input.credential,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback,
      );
      if (!metrics.length) {
        return buildResult(
          input.provider,
          "warning",
          duration,
          `Bing responded but no page metrics returned (${formatDuration(duration)})`,
        );
      }

      const topPage = metrics[0];
      return buildResult(
        input.provider,
        "success",
        duration,
        `Bing returned ${metrics.length} pages; top URL ${topPage.url} (${formatDuration(duration)})`,
      );
    }
    default: {
      const duration = Math.max(
        Math.round(performance.now() - start),
        durationFallback,
      );
      return buildResult(
        input.provider,
        "error",
        duration,
        `Unknown provider: ${input.provider} (${formatDuration(duration)})`,
      );
    }
  }
};
