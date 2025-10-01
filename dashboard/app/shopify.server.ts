import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import type { RegisterResult, Session } from "@shopify/shopify-api";
import { WebhookOperation } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  SHOPIFY_WEBHOOK_REGISTRATION,
  SHOPIFY_WEBHOOK_SUBSCRIPTIONS,
  type WebhookTopicKey,
} from "./lib/webhooks/constants";
import { recordWebhookRegistration } from "./lib/webhooks/persistence.server";
import fs from "fs";
import path from "path";

const defaultOperation = WebhookOperation.Update;

async function ensureWebhookSubscriptions(session: Session) {
  if (!session?.shop) return;

  try {
    const result = await shopify.registerWebhooks({ session });
    if (!result) {
      await Promise.all(
        SHOPIFY_WEBHOOK_SUBSCRIPTIONS.map((spec) =>
          recordWebhookRegistration(
            session.shop,
            spec.key,
            SHOPIFY_WEBHOOK_REGISTRATION[spec.key].deliveryMethod,
            defaultOperation,
            true,
            SHOPIFY_WEBHOOK_REGISTRATION[spec.key].callbackUrl,
          ),
        ),
      );
      return;
    }

    await Promise.all(
      Object.entries(result).flatMap(([key, records]) => {
        const topicKey = key as WebhookTopicKey;
        const subscription = SHOPIFY_WEBHOOK_REGISTRATION[topicKey];
        if (!subscription) {
          return [];
        }
        const typedRecords = Array.isArray(records)
          ? (records as RegisterResult[])
          : [];
        return typedRecords.map((record) =>
          recordWebhookRegistration(
            session.shop,
            topicKey,
            record.deliveryMethod,
            record.operation,
            record.success,
            subscription.callbackUrl,
            record.result,
          ),
        );
      }),
    );
  } catch (error) {
    console.warn("[shopify] Failed to register webhooks", {
      shop: session.shop,
      error,
    });
  }
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  webhooks: SHOPIFY_WEBHOOK_REGISTRATION,
  hooks: {
    afterAuth: async ({ session }) => {
      await ensureWebhookSubscriptions(session);
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;

function readSavedConversationId(): string | undefined {
  if (process.env.SHOPIFY_CONVERSATION_ID && process.env.SHOPIFY_CONVERSATION_ID.trim() !== "") {
    return process.env.SHOPIFY_CONVERSATION_ID.trim();
  }
  try {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const filePath = path.join(repoRoot, "coordination", "shopify", "conversation_id.txt");
    if (fs.existsSync(filePath)) {
      const v = fs.readFileSync(filePath, "utf8").trim();
      if (v) return v;
    }
  } catch {}
  return undefined;
}

function wrapAdminWithMutationGuard(admin: any): any {
  const originalGraphql = admin?.graphql?.bind ? admin.graphql.bind(admin) : admin.graphql;
  if (!originalGraphql) return admin;
  admin.graphql = async (query: any, options?: any) => {
    try {
      const text = typeof query === "string" ? query : String(query ?? "");
      const isMutation = /\bmutation\b/.test(text);
      if (isMutation) {
        const vars = options && typeof options === "object" ? (options as any).variables : undefined;
        const savedId = readSavedConversationId();
        if (!savedId || !vars || vars.conversationId !== savedId) {
          throw new Error("GraphQL mutation blocked: missing or invalid conversationId (guardrail)");
        }
      }
    } catch (e) {
      throw e;
    }
    return originalGraphql(query, options);
  };
  return admin;
}

const _authenticate = shopify.authenticate;
export const authenticate = {
  ..._authenticate,
  admin: async (...args: any[]) => {
    const result = await (_authenticate as any).admin(...args);
    if (result && result.admin) {
      result.admin = wrapAdminWithMutationGuard(result.admin);
    }
    return result;
  },
} as typeof shopify.authenticate;

export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
