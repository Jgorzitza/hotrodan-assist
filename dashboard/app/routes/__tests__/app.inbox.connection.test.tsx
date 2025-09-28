/* @vitest-environment jsdom */
/* eslint-disable testing-library/no-unnecessary-act */

import React, { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { buildInboxHandshake } from "../../lib/inbox/events.server";
import { getInboxScenario } from "../../mocks";

type LoaderStub = {
  dataset: ReturnType<typeof getInboxScenario>;
  scenario: "base";
  useMockData: boolean;
  refreshAfterSeconds: number | null;
};

const createLoaderData = (): LoaderStub => ({
  dataset: getInboxScenario({
    scenario: "base",
    filter: "all",
    channelFilter: "all",
    statusFilter: "all",
    assignedFilter: "all",
    pageSize: 12,
  }),
  scenario: "base",
  useMockData: true,
  refreshAfterSeconds: null,
});

const createFetcherStub = () => ({
  submit: vi.fn(),
  state: "idle" as const,
  data: undefined as unknown,
  formData: undefined as FormData | undefined,
});

const createRevalidatorStub = () => ({
  state: "idle" as const,
  revalidate: vi.fn(),
});

let loaderData: LoaderStub = createLoaderData();
let fetcherQueue: ReturnType<typeof createFetcherStub>[] = [];
let navigateMock = vi.fn();
let setSearchParamsMock = vi.fn();
let searchParams = new URLSearchParams();
let revalidatorStub = createRevalidatorStub();

((globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true);

const authenticateAdminMock = vi.fn();

vi.mock("../../shopify.server", () => ({
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

vi.mock("@remix-run/react", async () => {
  const actual = await vi.importActual<typeof import("@remix-run/react")>(
    "@remix-run/react",
  );
  return {
    ...actual,
    useLoaderData: () => loaderData,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParams, setSearchParamsMock] as const,
    useFetcher: () => {
      if (fetcherQueue.length === 0) {
        const stub = createFetcherStub();
        fetcherQueue.push(stub);
      }
      return fetcherQueue.shift()!;
    },
    useRevalidator: () => revalidatorStub,
  };
});

vi.mock("@shopify/app-bridge-react", () => ({
  TitleBar: () => null,
}));

vi.mock("@shopify/polaris-icons", () => ({
  ThumbsDownIcon: "ThumbsDownIcon",
  ThumbsUpIcon: "ThumbsUpIcon",
}));

vi.mock("@shopify/polaris", async () => {
  const ReactModule = await import("react");
  const ReactImport = ReactModule.default;

  const omitProps = (props: Record<string, unknown>, keys: string[]) => {
    const clone: Record<string, unknown> = { ...props };
    for (const key of keys) {
      delete clone[key];
    }
    return clone;
  };

  const createDiv = (component: string) =>
    function Component({ children, ...props }: any) {
      return ReactImport.createElement(
        "div",
        {
          "data-component": component,
          ...omitProps(props, ["gap", "align", "blockAlign", "oneThird", "secondary"]),
        },
        children,
      );
    };

  const createSpan = (component: string) =>
    function Component({ children, ...props }: any) {
      return ReactImport.createElement(
        "span",
        {
          "data-component": component,
          ...props,
        },
        children,
      );
    };

  const Layout: any = function LayoutComponent({ children, ...props }: any) {
    return ReactImport.createElement(
      "div",
      {
        "data-component": "Layout",
        ...omitProps(props, ["gap", "align", "blockAlign", "oneThird", "secondary"]),
      },
      children,
    );
  };

  Layout.Section = function LayoutSection({ children, ...props }: any) {
    return ReactImport.createElement(
      "section",
      {
        "data-component": "Layout.Section",
        ...omitProps(props, ["oneThird", "secondary", "tertiary"]),
      },
      children,
    );
  };

  const Card: any = function CardComponent({ children, title, ...props }: any) {
    return ReactImport.createElement(
      "section",
      {
        "data-component": "Card",
        ...omitProps(props, ["sectioned", "subdued", "title"]),
      },
      title ? ReactImport.createElement("header", null, title) : null,
      children,
    );
  };

  Card.Section = function CardSection({ children, ...props }: any) {
    return ReactImport.createElement(
      "div",
      {
        "data-component": "Card.Section",
        ...omitProps(props, ["subdued", "sectioned"]),
      },
      children,
    );
  };

  const ResourceList: any = function ResourceListComponent({ items, renderItem }: any) {
    return ReactImport.createElement(
      "div",
      { "data-component": "ResourceList" },
      items.map((item: any) =>
        ReactImport.createElement(
          "div",
          {
            key: item.id,
            "data-component": "ResourceList.ItemWrapper",
          },
          renderItem(item),
        ),
      ),
    );
  };

  ResourceList.Item = function ResourceListItem({ children, onClick, selected, accessibilityLabel }: any) {
    return ReactImport.createElement(
      "div",
      {
        "data-component": "ResourceList.Item",
        onClick,
        role: "button",
        tabIndex: 0,
        "aria-pressed": selected ? "true" : undefined,
        "aria-label": accessibilityLabel,
      },
      children,
    );
  };

  const Select = function SelectComponent({ label, options, value, onChange }: any) {
    return ReactImport.createElement(
      "label",
      { "data-component": "Select" },
      ReactImport.createElement("span", null, label),
      ReactImport.createElement(
        "select",
        {
          value,
          "aria-label": label,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onChange(event.target.value),
        },
        options.map((option: any) =>
          ReactImport.createElement(
            "option",
            { key: option.value, value: option.value },
            option.label,
          ),
        ),
      ),
    );
  };

  const TextField = function TextFieldComponent({
    label,
    value,
    onChange,
    helpText,
    autoComplete,
    disabled,
    ...props
  }: any) {
    return ReactImport.createElement(
      "label",
      {
        "data-component": "TextField",
        ...omitProps(props, ["multiline", "helpText", "autoComplete", "disabled"]),
      },
      ReactImport.createElement("span", null, label),
      ReactImport.createElement("textarea", {
        value,
        disabled,
        "aria-label": label,
        autoComplete: typeof autoComplete === "string" ? autoComplete : undefined,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value),
      }),
      helpText ? ReactImport.createElement("small", null, helpText) : null,
    );
  };

  const Button = function ButtonComponent({
    children,
    onClick,
    disabled,
    loading,
    accessibilityLabel,
    ...props
  }: any) {
    return ReactImport.createElement(
      "button",
      {
        type: "button",
        "data-component": "Button",
        onClick,
        disabled: Boolean(disabled || loading),
        "aria-label": accessibilityLabel,
        ...omitProps(props, [
          "primary",
          "tone",
          "variant",
          "size",
          "icon",
          "pressed",
          "loading",
          "accessibilityLabel",
        ]),
      },
      children,
    );
  };

  const ButtonGroup = createDiv("ButtonGroup");
  const BlockStack = createDiv("BlockStack");
  const InlineStack = createDiv("InlineStack");

  const Banner = function BannerComponent({ title, children, action, ...props }: any) {
    const sanitized = omitProps(props, ["tone", "action"]);
    const actionMarkup = action
      ? ReactImport.createElement(
          "button",
          {
            type: "button",
            "data-component": "Banner.Action",
            onClick: action.onAction,
          },
          action.content,
        )
      : null;
    return ReactImport.createElement(
      "div",
      {
        "data-component": "Banner",
        ...sanitized,
      },
      title ? ReactImport.createElement("strong", null, title) : null,
      children,
      actionMarkup,
    );
  };

  const Badge = createSpan("Badge");
  const Page = function PageComponent({ title, subtitle, children, ...props }: any) {
    return ReactImport.createElement(
      "div",
      {
        "data-component": "Page",
        ...props,
      },
      title ? ReactImport.createElement("h1", null, title) : null,
      subtitle ? ReactImport.createElement("p", null, subtitle) : null,
      children,
    );
  };

  const Text = createSpan("Text");

  const Toast = function ToastComponent({ content }: any) {
    return ReactImport.createElement(
      "div",
      {
        "data-component": "Toast",
      },
      content,
    );
  };

  return {
    __esModule: true,
    Page,
    Layout,
    Card,
    ResourceList,
    Select,
    TextField,
    Button,
    ButtonGroup,
    BlockStack,
    InlineStack,
    Banner,
    Badge,
    Text,
    Toast,
  };
});

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  emitOpen() {
    this.onopen?.(new Event("open"));
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }

  close() {
    // noop for test doubles
  }

  static reset() {
    MockEventSource.instances = [];
  }

  static latest() {
    return MockEventSource.instances.at(-1) ?? null;
  }
}

const originalEventSource = globalThis.EventSource;
const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn> | null = null;

type BridgeStatus = "connecting" | "connected" | "reconnecting" | "offline";

const emitBridgeStatus = async (
  source: MockEventSource | null,
  status: BridgeStatus,
  extras?: Partial<{ retryDelayMs: number }>,
) => {
  if (!source) {
    return;
  }

  const now = new Date().toISOString();
  await act(async () => {
    source.emitMessage({
      id: `evt-bridge-${Math.random().toString(16).slice(2)}`,
      type: "event" as const,
      timestamp: now,
      event: {
        type: "bridge:status" as const,
        timestamp: now,
        payload: {
          status,
          ...(extras ?? {}),
        },
      },
    });
  });
};

type TelemetryRecord = {
  type: string;
  status: string;
  attempt: number;
  consecutiveFailures: number;
  reason?: string;
};

const telemetryEvents = (): TelemetryRecord[] => {
  if (!fetchMock) {
    return [];
  }

  return fetchMock.mock.calls
    .filter((call) => call[0] === "/app/inbox/telemetry")
    .map((call) => {
      const init = call[1] as { body?: unknown } | undefined;
      if (!init || typeof init.body !== "string") {
        return null;
      }

      try {
        return JSON.parse(init.body) as TelemetryRecord;
      } catch (error) {
        console.error("Failed to parse telemetry payload", error);
        return null;
      }
    })
    .filter((entry): entry is TelemetryRecord => Boolean(entry));
};

const loadInboxRoute = async () => {
  const module = await import("../app.inbox");
  return module.default;
};

describe("Inbox realtime connection indicator", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    authenticateAdminMock.mockReset();
    authenticateAdminMock.mockResolvedValue(undefined);
    loaderData = createLoaderData();
    fetcherQueue = [createFetcherStub(), createFetcherStub()];
    navigateMock = vi.fn();
    setSearchParamsMock = vi.fn();
    searchParams = new URLSearchParams();
    revalidatorStub = createRevalidatorStub();
    MockEventSource.reset();
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    globalThis.EventSource = originalEventSource;
    MockEventSource.reset();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    fetchMock = null;
    vi.useRealTimers();
  });

  const renderInboxRoute = async () => {
    const InboxRoute = await loadInboxRoute();
    await act(async () => {
      root.render(React.createElement(InboxRoute));
    });
  };

  const textContent = () => container.textContent ?? "";

  it("shows a live status once the stream handshake arrives", async () => {
    await renderInboxRoute();
    const source = MockEventSource.latest();
    expect(source).not.toBeNull();
    await act(async () => {
      source?.emitOpen();
      source?.emitMessage(buildInboxHandshake());
    });

    expect(textContent()).toContain("Realtime inbox updates are active.");
    expect(textContent()).toContain("Live");
    expect(textContent()).toContain("Mock Inbox Provider");
    expect(textContent()).toContain("Capabilities: Drafts • Feedback");
    expect(textContent()).toContain("Bridge status: Live");
    expect(textContent()).toContain("SSE");

    const events = telemetryEvents();
    expect(events.some((event) => event.type === "connection:attempt")).toBe(true);
    expect(events.some((event) => event.type === "connection:open")).toBe(true);
    expect(events.some((event) => event.type === "connection:handshake")).toBe(true);
  });

  it("renders Assistants provider capabilities when advertised", async () => {
    loaderData.useMockData = false;
    await renderInboxRoute();
    const source = MockEventSource.latest();
    expect(source).not.toBeNull();
    await act(async () => {
      source?.emitOpen();
      source?.emitMessage(
        buildInboxHandshake({
          provider: { label: "Assistants Service" },
          capabilities: ["drafts", "feedback", "attachments"],
        }),
      );
    });

    await emitBridgeStatus(source, "connected");

    expect(textContent()).toContain("Assistants Service");
    expect(textContent()).toContain("Capabilities: Drafts • Feedback • Attachments");
    expect(textContent()).toContain("Bridge status: Live");
    expect(textContent()).toContain("SSE");
  });

  it("reflects Assistants bridge status changes", async () => {
    loaderData.useMockData = false;
    await renderInboxRoute();

    const source = MockEventSource.latest();
    expect(source).not.toBeNull();

    await act(async () => {
      source?.emitOpen();
      source?.emitMessage(
        buildInboxHandshake({
          provider: { label: "Assistants Service" },
          capabilities: ["drafts", "feedback", "attachments"],
        }),
      );
    });

    await emitBridgeStatus(source, "connected");
    expect(textContent()).toContain("Bridge status: Live");

    await emitBridgeStatus(source, "reconnecting", { retryDelayMs: 5000 });
    expect(textContent()).toContain("Bridge status: Reconnecting");
    expect(textContent()).toContain("Reconnecting");
    const reconnectToast = container.querySelector('[data-component="Toast"]');
    expect(reconnectToast?.textContent).toContain("Retrying in 5s");

    await emitBridgeStatus(source, "offline");
    expect(textContent()).toContain("Bridge status: Offline");
    expect(textContent()).toContain("Realtime updates paused");
    const offlineToast = container.querySelector('[data-component="Toast"]');
    expect(offlineToast?.textContent).toContain("bridge offline");

    await emitBridgeStatus(source, "connected");
    expect(textContent()).toContain("Bridge status: Live");
    const reconnectedToast = container.querySelector('[data-component="Toast"]');
    expect(reconnectedToast?.textContent).toContain("bridge reconnected");
  });

  it("surfaces a reconnect affordance after the first stream error", async () => {
    vi.useFakeTimers();
    await renderInboxRoute();

    const first = MockEventSource.latest();
    expect(first).not.toBeNull();
    await act(async () => {
      first?.emitOpen();
      first?.emitError();
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const retryButton = buttons.find((button) => button.textContent === "Retry");
    expect(retryButton).toBeDefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    const events = telemetryEvents();
    expect(events.some((event) => event.type === "connection:error")).toBe(true);
    expect(events.some((event) => event.type === "connection:retry")).toBe(true);
  });

  it("emits telemetry when operators manually trigger a retry", async () => {
    vi.useFakeTimers();
    await renderInboxRoute();

    const first = MockEventSource.latest();
    expect(first).not.toBeNull();
    await act(async () => {
      first?.emitOpen();
      first?.emitError();
    });

    const retryButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Retry",
    );
    expect(retryButton).toBeDefined();

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const events = telemetryEvents();
    expect(events.some((event) => event.type === "connection:manual-retry")).toBe(true);
  });

  it("marks the connection offline after repeated failures", async () => {
    vi.useFakeTimers();
    await renderInboxRoute();

    const first = MockEventSource.latest();
    expect(first).not.toBeNull();
    await act(async () => {
      first?.emitOpen();
      first?.emitError();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    const second = MockEventSource.latest();
    expect(second).not.toBeNull();
    await act(async () => {
      second?.emitError();
    });

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    const third = MockEventSource.latest();
    expect(third).not.toBeNull();
    await act(async () => {
      third?.emitError();
    });

    expect(textContent()).toContain("Realtime updates paused");
    expect(textContent()).toContain("Offline");

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const events = telemetryEvents();
    expect(events.some((event) => event.type === "connection:offline")).toBe(true);
  });

  it("revalidates on the Assistants refresh cadence", async () => {
    vi.useFakeTimers();
    loaderData.useMockData = false;
    loaderData.refreshAfterSeconds = 5;

    await renderInboxRoute();

    expect(revalidatorStub.revalidate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(revalidatorStub.revalidate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(revalidatorStub.revalidate).toHaveBeenCalledTimes(2);
  });

  it("queues a dataset refresh when Assistants pushes a draft update", async () => {
    vi.useFakeTimers();
    loaderData.useMockData = false;

    await renderInboxRoute();

    const source = MockEventSource.latest();
    expect(source).not.toBeNull();

    const [ticket] = loaderData.dataset.tickets;
    expect(ticket).toBeDefined();

    const baseFeedback = ticket.aiDraft.feedback ?? [];
    const cloneTicket = (id: string, revisionOffset: number) => {
      const msOffset = revisionOffset * 1000;
      const updatedAt = new Date(Date.now() + msOffset).toISOString();
      const draft = {
        ...ticket.aiDraft,
        feedback: baseFeedback.map((entry) => ({ ...entry })),
        revision: ticket.aiDraft.revision + revisionOffset,
        updatedAt,
      };

      const clonedTimeline = ticket.timeline.map((entry) => ({
        ...entry,
        attachments: entry.attachments?.map((attachment) => ({ ...attachment })),
      }));

      const clonedAttachments = ticket.attachments?.map((attachment) => ({ ...attachment }));

      const eventTicket: typeof ticket = {
        ...ticket,
        customer: { ...ticket.customer },
        aiDraft: draft,
        updatedAt,
        timeline: clonedTimeline,
        attachments: clonedAttachments,
      };

      return {
        id,
        type: "event" as const,
        timestamp: updatedAt,
        message: "Draft updated via Assistants",
        event: {
          type: "draft:updated" as const,
          timestamp: updatedAt,
          payload: {
            ticketId: eventTicket.id,
            revision: draft.revision,
          },
        },
        ticket: eventTicket,
        draft,
      };
    };

    await act(async () => {
      source?.emitOpen();
      source?.emitMessage(buildInboxHandshake());
    });

    const firstEvent = cloneTicket("evt-test-1", 1);

    await act(async () => {
      source?.emitMessage(firstEvent);
    });

    expect(revalidatorStub.revalidate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(revalidatorStub.revalidate).toHaveBeenCalledTimes(1);

    const duplicateEvent = cloneTicket("evt-test-1", 1);

    await act(async () => {
      source?.emitMessage(duplicateEvent);
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(revalidatorStub.revalidate).toHaveBeenCalledTimes(1);

    const secondEvent = cloneTicket("evt-test-2", 2);

    await act(async () => {
      source?.emitMessage(secondEvent);
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(revalidatorStub.revalidate).toHaveBeenCalledTimes(2);
  });
});
