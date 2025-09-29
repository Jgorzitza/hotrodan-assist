import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleFulfillmentsUpdate } from "../lib/webhooks/handlers.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const context = await authenticate.webhook(request);

  await handleFulfillmentsUpdate({
    apiVersion: context.apiVersion,
    shop: context.shop,
    topic: context.topic,
    webhookId: context.webhookId,
    payload: context.payload,
    session: context.session,
    admin: context.admin,
    subTopic: context.subTopic,
  });

  return new Response();
};
