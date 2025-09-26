import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import rateLimit from "p-limit";

const limit = rateLimit(Number(process.env.SHOPIFY_MAX_CONCURRENT ?? 4));

export type AdminClient = AdminApiContext["admin"];

const withRateLimit = async <T>(fn: () => Promise<T>): Promise<T> =>
  limit(fn);

export const getAdminClient = async (
  admin: AdminClient,
): Promise<AdminClient> => admin;

export const executeAdmin = async <T>(
  client: AdminClient,
  request: Parameters<AdminClient["graphql"]>[0],
  options?: Parameters<AdminClient["graphql"]>[1],
): Promise<T> => {
  return withRateLimit(async () => {
    const response = await client.graphql(request, options);
    return (await response.json()) as T;
  });
};
