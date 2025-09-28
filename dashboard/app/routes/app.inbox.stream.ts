import type { LoaderFunctionArgs } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import {
  buildInboxHandshake,
  subscribeToInboxStream,
  type InboxStreamEnvelope,
  type InboxStreamHandshake,
} from "~/lib/inbox/events.server";
import {
  ensureAssistantsEventStream,
  getAssistantsBridgeStatus,
  stopAssistantsEventStream,
} from "~/lib/inbox/assistants.stream.server";
import { resolveAssistantsBaseUrl } from "~/lib/inbox/assistants.server";

const encoder = new TextEncoder();

const formatMessage = (payload: InboxStreamEnvelope) => {
  const body = JSON.stringify(payload);
  return encoder.encode(`data: ${body}\n\n`);
};

const formatPing = () => encoder.encode("event: ping\ndata: {}\n\n");

const ASSISTANTS_HANDSHAKE_OPTIONS = {
  provider: {
    id: "assistants-service",
    label: "Assistants Service",
    version: "0.1.0",
  },
  capabilities: ["drafts", "feedback", "attachments"] as const,
};

const resolveStreamHandshake = async (request: Request): Promise<InboxStreamHandshake> => {
  if (USE_MOCK_DATA) {
    stopAssistantsEventStream({ emit: false });
    return buildInboxHandshake({ bridgeStatus: "connected" });
  }

  let useMockData = true;

  try {
    const { session } = await authenticate.admin(request);
    const settings = await storeSettingsRepository.getSettings(session.shop);
    const assistantsEnabled = Boolean(settings?.toggles?.enableAssistantsProvider);
    useMockData = !assistantsEnabled;
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.warn("inbox stream handshake fallback", error);
    useMockData = true;
  }

  if (useMockData) {
    stopAssistantsEventStream({ emit: false });
    return buildInboxHandshake({ bridgeStatus: "connected" });
  }

  try {
    const baseUrl = resolveAssistantsBaseUrl();
    ensureAssistantsEventStream({ baseUrl });
    return buildInboxHandshake({
      ...ASSISTANTS_HANDSHAKE_OPTIONS,
      bridgeStatus: getAssistantsBridgeStatus(),
    });
  } catch (error) {
    console.warn("assistants stream bridge unavailable", error);
    stopAssistantsEventStream({ emit: true, reason: "connection-error" });
    return buildInboxHandshake({ bridgeStatus: "offline" });
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const handshake = await resolveStreamHandshake(request);
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

      controller.enqueue(formatMessage(handshake));
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
