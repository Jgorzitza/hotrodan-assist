import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  clearQueue,
  enqueueWebhookJob,
  isBullQueueEnabled,
  markJobStatus,
  snapshotQueue,
} from "../lib/webhooks/queue.server";
import {
  snapshotOrderFlags,
  snapshotVelocity,
  snapshotWebhookRegistrations,
} from "../lib/webhooks/persistence.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  const [queue, registrations, orderFlags, productVelocity] = await Promise.all([
    snapshotQueue(),
    snapshotWebhookRegistrations(),
    snapshotOrderFlags(),
    snapshotVelocity(),
  ]);

  return json({
    queue,
    registrations,
    orderFlags,
    productVelocity,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  switch (request.method) {
    case "POST": {
      const body = await safeJson(request);
      if (!body) {
        return new Response("Invalid JSON body", { status: 400 });
      }
      if (!body.topicKey && !body.topic) {
        return new Response("Missing topic", { status: 422 });
      }
      if (!body.shop && !body.shopDomain) {
        return new Response("Missing shop domain", { status: 422 });
      }
      const job = await enqueueWebhookJob({
        webhookId: body.webhookId,
        topicKey: body.topicKey ?? body.topic,
        shopDomain: body.shop ?? body.shopDomain,
        payload: body.payload,
      });
      return json({ job }, { status: 201 });
    }
    case "PATCH": {
      if (isBullQueueEnabled()) {
        return new Response(
          "Manual queue status updates are disabled while the BullMQ driver is active",
          { status: 409 },
        );
      }
      const body = await safeJson(request);
      if (!body || !body.id || !body.status) {
        return new Response("Missing job id or status", { status: 422 });
      }
      const job = await markJobStatus(body.id, body.status, body.error);
      if (!job) {
        return new Response("Job not found", { status: 404 });
      }
      return json({ job });
    }
    case "DELETE": {
      await clearQueue();
      return new Response(null, { status: 204 });
    }
    default:
      return new Response(null, { status: 405 });
  }
};

const safeJson = async (request: Request) => {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
};
