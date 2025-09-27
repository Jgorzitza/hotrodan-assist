import type { LoaderFunctionArgs } from "@remix-run/node";

import {
  buildInboxHandshake,
  subscribeToInboxStream,
  type InboxStreamEnvelope,
} from "~/lib/inbox/events.server";

const encoder = new TextEncoder();

const formatMessage = (payload: InboxStreamEnvelope) => {
  const body = JSON.stringify(payload);
  return encoder.encode(`data: ${body}\n\n`);
};

const formatPing = () => encoder.encode("event: ping\ndata: {}\n\n");

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: InboxStreamEnvelope) => {
        controller.enqueue(formatMessage(payload));
      };

      const unsubscribe = subscribeToInboxStream(send);
      const pingInterval = setInterval(() => {
        controller.enqueue(formatPing());
      }, 20000);

      const shutdown = () => {
        clearInterval(pingInterval);
        unsubscribe();
        try {
          controller.close();
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Invalid state")) {
            console.warn("inbox stream close error", error);
          }
        }
        cleanup = null;
      };

      cleanup = shutdown;

      if (request.signal.aborted) {
        shutdown();
        return;
      }

      request.signal.addEventListener("abort", shutdown, { once: true });

      controller.enqueue(formatMessage(buildInboxHandshake()));
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
