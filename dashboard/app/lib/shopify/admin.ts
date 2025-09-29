import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import rateLimit from "p-limit";

import prisma from "~/db.server";
import { decryptSecret } from "~/lib/security/secrets.server";

const limit = rateLimit(Number(process.env.SHOPIFY_MAX_CONCURRENT ?? 4));

const MAX_ATTEMPTS = Number(process.env.SHOPIFY_GRAPHQL_MAX_ATTEMPTS ?? 3);
const BASE_DELAY_MS = Number(process.env.SHOPIFY_GRAPHQL_BACKOFF_MS ?? 250);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export type AdminClient = AdminApiContext;

export type StoreSession = {
  storeId: string;
  shopDomain: string;
  planLevel: string;
  accessToken: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withRateLimit = async <T>(fn: () => Promise<T>): Promise<T> => limit(fn);

const decodeAccessToken = (cipher: string): string => {
  try {
    const token = decryptSecret(cipher);
    if (!token) {
      throw new Error("Access token decrypted to empty value");
    }
    return token;
  } catch (error) {
    // Fallback for plain-text dev tokens until real KMS integration lands.
    if (cipher.startsWith("mock::")) {
      throw error;
    }
    return cipher;
  }
};

/**
 * Fetches the encrypted store access token from Prisma and executes the callback with
 * a decrypted session. Replace `decodeAccessToken` with KMS/Shopify secret storage
 * before shipping to production.
 */
export const withStoreSession = async <T>(
  shopDomain: string,
  callback: (session: StoreSession) => Promise<T>,
): Promise<T> => {
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ domain: shopDomain }, { myShopifyDomain: shopDomain }],
    },
    select: {
      id: true,
      domain: true,
      myShopifyDomain: true,
      planLevel: true,
      accessTokenCipher: true,
    },
  });

  if (!store || !store.accessTokenCipher) {
    throw new Error(`Store session unavailable for ${shopDomain}`);
  }

  const accessToken = decodeAccessToken(store.accessTokenCipher);
  const canonicalDomain = store.domain ?? store.myShopifyDomain ?? shopDomain;

  return callback({
    storeId: store.id,
    shopDomain: canonicalDomain,
    planLevel: store.planLevel,
    accessToken,
  });
};

export const getAdminClient = async (
  admin: AdminClient,
): Promise<AdminClient> => admin;

const toErrorPayload = (status: number, body: string) => {
  try {
    const parsed = JSON.parse(body) as { errors?: unknown };
    return parsed.errors ?? body;
  } catch {
    return body;
  }
};

export const executeAdmin = async <T>(
  client: AdminClient,
  request: Parameters<AdminClient["graphql"]>[0],
  options?: Parameters<AdminClient["graphql"]>[1],
): Promise<T> => {
  return withRateLimit(async () => {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < MAX_ATTEMPTS) {
      attempt += 1;

      try {
        const response = await client.graphql(request, options);
        const body = await response.text();

        if (response.ok) {
          try {
            return JSON.parse(body) as T;
          } catch (parseError) {
            throw new Error(
              `Failed to parse Shopify response JSON: ${(parseError as Error).message}`,
            );
          }
        }

        lastError = toErrorPayload(response.status, body);

        if (!RETRYABLE_STATUS.has(response.status) || attempt >= MAX_ATTEMPTS) {
          throw new Error(
            `Shopify Admin API request failed (${response.status}): ${JSON.stringify(lastError)}`,
          );
        }
      } catch (error) {
        lastError = error;
        if (attempt >= MAX_ATTEMPTS) {
          throw error;
        }
      }

      await sleep(BASE_DELAY_MS * attempt ** 2);
    }

    throw new Error(`Shopify Admin API request failed: ${JSON.stringify(lastError)}`);
  });
};
