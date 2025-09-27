import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  Layout,
  Page,
  ResourceList,
  Select,
  Text,
  TextField,
  Toast,
} from "@shopify/polaris";
import { ThumbsDownIcon, ThumbsUpIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { publishInboxActionEvent } from "~/lib/inbox/events.server";
import type { InboxStreamEnvelope } from "~/lib/inbox/events.server";
import {
  approveInboxDraft,
  getInboxDraft,
  getInboxScenario,
  scenarioFromRequest,
  submitInboxDraftFeedback,
  updateInboxDraft,
} from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type {
  InboxActionResponse,
  InboxDataset,
  InboxFeedbackVote,
  InboxProvider,
  InboxTicket,
  InboxTicketStatus,
  MockScenario,
} from "~/types/dashboard";

const VALID_FILTERS: ReadonlyArray<InboxDataset["filter"]> = [
  "all",
  "unassigned",
  "priority",
  "overdue",
];

const VALID_CHANNELS: ReadonlyArray<InboxProvider> = [
  "email",
  "shopify",
  "instagram",
  "tiktok",
];

const VALID_STATUSES: ReadonlyArray<InboxTicketStatus> = [
  "open",
  "snoozed",
  "resolved",
  "escalated",
];

const CHANNEL_LABELS: Record<InboxProvider, string> = {
  email: "Email",
  shopify: "Shopify",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const STATUS_LABELS: Record<InboxTicketStatus, string> = {
  open: "Open",
  snoozed: "Snoozed",
  resolved: "Resolved",
  escalated: "Escalated",
};

const formatChannel = (channel: InboxProvider) => CHANNEL_LABELS[channel];
const formatStatus = (status: InboxTicketStatus) => STATUS_LABELS[status];
const formatAssignee = (value?: string) => value ?? "Unassigned";

const timelineTone = (type: InboxTicket["timeline"][number]["type"]) => {
  switch (type) {
    case "customer_message":
      return "attention" as const;
    case "agent_reply":
      return "success" as const;
    case "note":
      return "warning" as const;
    default:
      return "info" as const;
  }
};

const timelineLabel = (type: InboxTicket["timeline"][number]["type"]) => {
  switch (type) {
    case "customer_message":
      return "Customer";
    case "agent_reply":
      return "Agent";
    case "note":
      return "Note";
    default:
      return "System";
  }
};

const buildFeedbackIndex = (tickets: InboxTicket[]) => {
  const map: Record<string, InboxTicket["aiDraft"]["feedback"]> = {};
  tickets.forEach((ticket) => {
    map[ticket.id] = ticket.aiDraft.feedback;
  });
  return map;
};

const feedbackVoteLabel = {
  up: "Positive",
  down: "Negative",
} satisfies Record<InboxTicket["aiDraft"]["feedback"][number]["vote"], string>;

type InboxEventEnvelope = Extract<InboxStreamEnvelope, { type: "event" }>;

const FILTER_OPTIONS: Array<{ label: string; value: InboxDataset["filter"] }> = [
  { label: "All", value: "all" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Priority", value: "priority" },
  { label: "Overdue", value: "overdue" },
];

const parseFilter = (value: string | null): InboxDataset["filter"] => {
  if (value && VALID_FILTERS.includes(value as InboxDataset["filter"])) {
    return value as InboxDataset["filter"];
  }
  return "all";
};

const parseChannelFilter = (value: string | null): InboxDataset["channelFilter"] => {
  if (value && VALID_CHANNELS.includes(value as InboxProvider)) {
    return value as InboxProvider;
  }
  return "all";
};

const parseStatusFilter = (value: string | null): InboxDataset["statusFilter"] => {
  if (value && VALID_STATUSES.includes(value as InboxTicketStatus)) {
    return value as InboxTicketStatus;
  }
  return "all";
};

const parseAssignedFilter = (value: string | null): InboxDataset["assignedFilter"] => {
  if (!value || value === "all") return "all";
  if (value === "unassigned") return "unassigned";
  return value;
};

const parseFilters = (url: URL) => {
  const filter = parseFilter(url.searchParams.get("filter"));
  const channelFilter = parseChannelFilter(url.searchParams.get("channel"));
  const statusFilter = parseStatusFilter(url.searchParams.get("status"));
  const assignedFilter = parseAssignedFilter(url.searchParams.get("assigned"));

  return { filter, channelFilter, statusFilter, assignedFilter };
};

type LoaderData = {
  dataset: InboxDataset;
  scenario: MockScenario;
  useMockData: boolean;
};

const clampPageSize = (value: number) => {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(Math.round(value), 5), 50);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const { filter, channelFilter, statusFilter, assignedFilter } = parseFilters(url);
  const pageSize = clampPageSize(Number(url.searchParams.get("pageSize") ?? "12"));
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  const dataset = getInboxScenario({
    scenario,
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
    pageSize,
  });

  return json<LoaderData>(
    { dataset, scenario, useMockData: USE_MOCK_DATA },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "approve" && intent !== "edit" && intent !== "feedback") {
    return json<InboxActionResponse>(
      {
        success: false,
        message: "Unsupported action.",
      },
      { status: 400 },
    );
  }

  const ticketIdEntry = formData.get("ticketId");
  if (typeof ticketIdEntry !== "string" || ticketIdEntry.length === 0) {
    return json<InboxActionResponse>(
      {
        success: false,
        message: "Missing ticket reference.",
      },
      { status: 400 },
    );
  }

  const ticketId = ticketIdEntry;
  const url = new URL(request.url);
  const { filter, channelFilter, statusFilter, assignedFilter } = parseFilters(url);
  const pageSize = clampPageSize(Number(url.searchParams.get("pageSize") ?? "12"));
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  const now = new Date().toISOString();

  const findTicketWithFallback = (): InboxTicket | undefined => {
    const scopedDataset = getInboxScenario({
      scenario,
      filter,
      channelFilter,
      statusFilter,
      assignedFilter,
      pageSize,
    });

    const scopedTicket = scopedDataset.tickets.find((entry) => entry.id === ticketId);
    if (scopedTicket) {
      return scopedTicket;
    }

    const fallbackDataset = getInboxScenario({
      scenario,
      filter: "all",
      channelFilter: "all",
      statusFilter: "all",
      assignedFilter: "all",
      pageSize: Math.max(pageSize, 50),
    });

    return fallbackDataset.tickets.find((entry) => entry.id === ticketId);
  };

  if (intent === "feedback") {
    const draftIdEntry = formData.get("draftId");
    const voteEntry = formData.get("vote");

    if (voteEntry !== "up" && voteEntry !== "down") {
      return json<InboxActionResponse>(
        {
          success: false,
          message: "Feedback vote must be 'up' or 'down'.",
        },
        { status: 400 },
      );
    }

    if (typeof draftIdEntry !== "string" || draftIdEntry.length === 0) {
      return json<InboxActionResponse>(
        {
          success: false,
          message: "Missing draft reference for feedback.",
        },
        { status: 400 },
      );
    }

    const commentEntry = formData.get("comment");
    const submittedByEntry = formData.get("submittedBy");
    const submittedBy =
      typeof submittedByEntry === "string" && submittedByEntry.length > 0
        ? submittedByEntry
        : "Operator";
    const comment =
      typeof commentEntry === "string" && commentEntry.trim().length > 0
        ? commentEntry.trim()
        : undefined;

    const feedback = submitInboxDraftFeedback(
      ticketId,
      draftIdEntry,
      voteEntry,
      submittedBy,
      comment,
    );

    const ticket = findTicketWithFallback();
    const draft = getInboxDraft(ticketId);

    if (!ticket || !draft) {
      return json<InboxActionResponse>(
        {
          success: false,
          message: "Ticket not found after recording feedback.",
        },
        { status: 404 },
      );
    }

    const payload: InboxActionResponse = {
      success: true,
      message: voteEntry === "up" ? "Positive feedback logged." : "Constructive feedback captured.",
      ticket,
      draft,
      feedback,
      event: {
        type: "draft:feedback",
        timestamp: now,
        payload: {
          ticketId,
          draftId: draftIdEntry,
          vote: voteEntry,
        },
      },
    };

    publishInboxActionEvent(payload);

    return json<InboxActionResponse>(payload);
  }

  const contentEntry = formData.get("content");
  if (typeof contentEntry !== "string") {
    return json<InboxActionResponse>(
      {
        success: false,
        message: "Missing draft content.",
      },
      { status: 400 },
    );
  }

  const trimmedContent = contentEntry.trim();
  if (!trimmedContent) {
    return json<InboxActionResponse>(
      {
        success: false,
        message: "Draft content cannot be empty.",
      },
      { status: 400 },
    );
  }

  const updatedByEntry = formData.get("updatedBy");
  const updatedBy =
    typeof updatedByEntry === "string" && updatedByEntry.length > 0
      ? updatedByEntry
      : "Operator";

  const draftRecord =
    intent === "approve"
      ? approveInboxDraft(ticketId, trimmedContent, updatedBy)
      : updateInboxDraft(ticketId, trimmedContent, updatedBy);

  const ticket = findTicketWithFallback();

  if (!ticket) {
    return json<InboxActionResponse>(
      {
        success: false,
        message: "Ticket not found for the current filter.",
      },
      { status: 404 },
    );
  }

  const payload: InboxActionResponse = {
    success: true,
    message: intent === "approve" ? "Draft approved." : "Draft updated.",
    ticket,
    draft: draftRecord,
    event: {
      type: intent === "approve" ? "draft:approved" : "draft:updated",
      timestamp: now,
      payload: {
        ticketId,
        revision: draftRecord.revision,
      },
    },
  };

  publishInboxActionEvent(payload);

  return json<InboxActionResponse>(payload);
};

const sentimentTone = (sentiment: InboxTicket["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return "success" as const;
    case "negative":
      return "critical" as const;
    default:
      return "attention" as const;
  }
};

const priorityTone = (priority: InboxTicket["priority"]) => {
  switch (priority) {
    case "urgent":
      return "critical" as const;
    case "high":
      return "warning" as const;
    case "medium":
      return "attention" as const;
    default:
      return "new" as const;
  }
};

const statusTone = (status: InboxTicketStatus) => {
  switch (status) {
    case "escalated":
      return "critical" as const;
    case "resolved":
      return "success" as const;
    case "snoozed":
      return "warning" as const;
    default:
      return "attention" as const;
  }
};

const formatTimeAgo = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.max(Math.round(diffMs / (1000 * 60 * 60)), 0);
  if (diffHours < 1) return "just now";
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function InboxRoute() {
  const { dataset, scenario, useMockData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftFetcher = useFetcher<typeof action>();
  const feedbackFetcher = useFetcher<typeof action>();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    dataset.tickets[0]?.id ?? null,
  );
  const [draftContent, setDraftContent] = useState<string>(
    dataset.tickets[0]?.aiDraft.content ?? "",
  );
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [feedbackIndex, setFeedbackIndex] = useState<
    Record<string, InboxTicket["aiDraft"]["feedback"]>
  >(() => buildFeedbackIndex(dataset.tickets));
  const [toast, setToast] = useState<string | null>(null);

  const metrics = useMemo(() => buildMetrics(dataset), [dataset]);

  const channelOptions = useMemo(
    () => [
      { label: "All channels", value: "all" },
      ...dataset.availableFilters.channels.map((channel) => ({
        label: formatChannel(channel),
        value: channel,
      })),
    ],
    [dataset.availableFilters.channels],
  );

  const statusOptions = useMemo(
    () => [
      { label: "All statuses", value: "all" },
      ...dataset.availableFilters.statuses.map((status) => ({
        label: formatStatus(status),
        value: status,
      })),
    ],
    [dataset.availableFilters.statuses],
  );

  const assigneeOptions = useMemo(
    () => [
      { label: "All assignees", value: "all" },
      { label: "Unassigned", value: "unassigned" },
      ...dataset.availableFilters.assignees.map((assignee) => ({
        label: assignee,
        value: assignee,
      })),
    ],
    [dataset.availableFilters.assignees],
  );

  const selectedTicket = useMemo(() => {
    if (!dataset.tickets.length) return null;
    if (selectedTicketId) {
      return (
        dataset.tickets.find((ticket) => ticket.id === selectedTicketId) ?? dataset.tickets[0]
      );
    }
    return dataset.tickets[0];
  }, [dataset.tickets, selectedTicketId]);

  const activeTicket = useMemo(() => {
    if (!selectedTicket) return null;
    const mappedFeedback = feedbackIndex[selectedTicket.id];
    if (!mappedFeedback) {
      return selectedTicket;
    }
    return {
      ...selectedTicket,
      aiDraft: {
        ...selectedTicket.aiDraft,
        feedback: mappedFeedback,
      },
    };
  }, [feedbackIndex, selectedTicket]);

  const selectedTicketIdRef = useRef<string | null>(selectedTicket?.id ?? null);

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicket?.id ?? null;
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!dataset.tickets.length) {
      setSelectedTicketId(null);
      setDraftContent("");
      return;
    }

    if (!selectedTicketId || !dataset.tickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(dataset.tickets[0]!.id);
    }
  }, [dataset.tickets, selectedTicketId]);

  useEffect(() => {
    setFeedbackIndex((current) => {
      const next = { ...current };
      dataset.tickets.forEach((ticket) => {
        const existing = next[ticket.id];
        if (!existing || ticket.aiDraft.feedback.length > existing.length) {
          next[ticket.id] = ticket.aiDraft.feedback;
        }
      });
      return next;
    });
  }, [dataset.tickets]);

  useEffect(() => {
    if (activeTicket) {
      setDraftContent(activeTicket.aiDraft.content);
    } else {
      setDraftContent("");
    }
  }, [activeTicket]);

  useEffect(() => {
    setFeedbackComment("");
  }, [selectedTicketId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    let source: EventSource | null = null;
    let retryHandle: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const updateFeedbackIndex = (payload: InboxEventEnvelope) => {
      setFeedbackIndex((current) => {
        const next = { ...current };
        let mutated = false;

        if (payload.ticket) {
          next[payload.ticket.id] = payload.ticket.aiDraft.feedback;
          mutated = true;
        } else if (payload.feedback) {
          const existing = next[payload.feedback.ticketId] ?? [];
          const deduped = existing.filter((entry) => entry.id !== payload.feedback.id);
          next[payload.feedback.ticketId] = [...deduped, payload.feedback];
          mutated = true;
        }

        if (!mutated) {
          return current;
        }

        return next;
      });
    };

    const handleEnvelope = (payload: InboxStreamEnvelope) => {
      if (payload.type === "handshake") {
        return;
      }

      updateFeedbackIndex(payload);

      if (payload.draft && payload.draft.ticketId === selectedTicketIdRef.current) {
        setDraftContent(payload.draft.content);
      } else if (payload.ticket && payload.ticket.id === selectedTicketIdRef.current) {
        setDraftContent(payload.ticket.aiDraft.content);
      }

      if (payload.feedback && payload.feedback.ticketId === selectedTicketIdRef.current) {
        setFeedbackComment("");
      }

      if (payload.message) {
        setToast(payload.message);
      }
    };

    const connect = () => {
      source?.close();
      source = new EventSource("/app/inbox/stream");
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as InboxStreamEnvelope;
          handleEnvelope(payload);
        } catch (error) {
          console.error("inbox stream parse error", error);
        }
      };
      source.onerror = () => {
        if (closed) {
          return;
        }
        if (retryHandle) {
          return;
        }
        retryHandle = setTimeout(() => {
          retryHandle = null;
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      source?.close();
      if (retryHandle) {
        clearTimeout(retryHandle);
      }
    };
  }, []);

  useEffect(() => {
    if (draftFetcher.state !== "idle" || !draftFetcher.data) return;

    const updatedTicket = draftFetcher.data.ticket;
    if (updatedTicket) {
      setFeedbackIndex((current) => ({
        ...current,
        [updatedTicket.id]: updatedTicket.aiDraft.feedback,
      }));

      if (updatedTicket.id === activeTicket?.id) {
        setDraftContent(updatedTicket.aiDraft.content);
      }
    }

    if (draftFetcher.data.message) {
      setToast(draftFetcher.data.message);
    }
  }, [activeTicket?.id, draftFetcher.data, draftFetcher.state]);

  useEffect(() => {
    if (feedbackFetcher.state !== "idle" || !feedbackFetcher.data) return;

    const { feedback, ticket, message } = feedbackFetcher.data;

    if (feedback) {
      setFeedbackIndex((current) => {
        const previous = current[feedback.ticketId] ?? [];
        const deduped = previous.filter((entry) => entry.id !== feedback.id);
        return {
          ...current,
          [feedback.ticketId]: [...deduped, feedback],
        };
      });

      if (feedback.ticketId === activeTicket?.id) {
        setFeedbackComment("");
      }
    }

    if (ticket && ticket.id === activeTicket?.id) {
      setDraftContent(ticket.aiDraft.content);
    }

    if (message) {
      setToast(message);
    }
  }, [activeTicket?.id, feedbackFetcher.data, feedbackFetcher.state]);

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    const currentValue = params.get(key) ?? "all";
    const normalized = value || "all";
    if (currentValue === normalized) {
      return;
    }

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleFilterChange = (value: string) => {
    updateSearchParam("filter", value);
  };

  const handleChannelChange = (value: string) => {
    updateSearchParam("channel", value);
  };

  const handleStatusChange = (value: string) => {
    updateSearchParam("status", value);
  };

  const handleAssignedChange = (value: string) => {
    updateSearchParam("assigned", value);
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setFeedbackComment("");
  };

  const handleDraftAction = (intent: "approve" | "edit") => {
    if (!activeTicket) return;

    draftFetcher.submit(
      {
        intent,
        ticketId: activeTicket.id,
        content: draftContent,
        updatedBy: "Operator",
      },
      { method: "post" },
    );
  };

  const handleFeedback = (vote: InboxFeedbackVote) => {
    if (!activeTicket) return;

    feedbackFetcher.submit(
      {
        intent: "feedback",
        ticketId: activeTicket.id,
        draftId: activeTicket.aiDraft.id,
        vote,
        comment: feedbackComment,
        submittedBy: "Operator",
      },
      { method: "post" },
    );
  };

  const hasTickets = dataset.tickets.length > 0;
  const isSubmitting = draftFetcher.state !== "idle";
  const isFeedbackSubmitting = feedbackFetcher.state !== "idle";
  const currentFeedback = activeTicket?.aiDraft.feedback ?? [];
  const feedbackHistory = currentFeedback.slice(-3).reverse();
  const lastFeedback = currentFeedback[currentFeedback.length - 1];

  return (
    <Page
      title="Inbox"
      subtitle="Monitor conversations, approvals, and SLA breaches across channels."
    >
      <TitleBar title="Inbox" primaryAction={{ content: "New message", url: "#" }} />
      <Layout>
        <Layout.Section oneThird>
          <BlockStack gap="300">
            {(dataset.alert || dataset.error || useMockData) && (
              <BlockStack gap="200">
                {useMockData && (
                  <Banner
                    tone={scenario === "warning" ? "warning" : "info"}
                    title={`Mock state: ${scenario}`}
                  >
                    <p>Adjust `mockState` in the query string to test UI permutations.</p>
                  </Banner>
                )}
                {dataset.alert && !dataset.error && (
                  <Banner tone="warning" title="Inbox alert">
                    <p>{dataset.alert}</p>
                  </Banner>
                )}
                {dataset.error && (
                  <Banner tone="critical" title="Inbox unavailable">
                    <p>{dataset.error}</p>
                  </Banner>
                )}
              </BlockStack>
            )}

            <Card title="Tickets overview" sectioned>
              <BlockStack gap="200">
                <MetricRow label="Outstanding" value={metrics.outstanding} tone="critical" />
                <MetricRow label="Overdue" value={metrics.overdue} tone="warning" />
                <MetricRow label="Approvals pending" value={metrics.approvalsPending} tone="attention" />
                <MetricRow label="Escalated" value={metrics.escalated} />
              </BlockStack>
            </Card>

            <Select
              label="Ticket filter"
              options={FILTER_OPTIONS}
              value={dataset.filter}
              onChange={handleFilterChange}
            />
            <Select
              label="Channel"
              options={channelOptions}
              value={dataset.channelFilter}
              onChange={handleChannelChange}
            />
            <Select
              label="Status"
              options={statusOptions}
              value={dataset.statusFilter}
              onChange={handleStatusChange}
            />
            <Select
              label="Assignee"
              options={assigneeOptions}
              value={dataset.assignedFilter}
              onChange={handleAssignedChange}
            />
          </BlockStack>
        </Layout.Section>
        <Layout.Section>
          <Layout>
            <Layout.Section>
              <Card>
                <ResourceList
                  resourceName={{ singular: "ticket", plural: "tickets" }}
                  items={dataset.tickets}
                  renderItem={(ticket) => (
                    <ResourceList.Item
                      id={ticket.id}
                      accessibilityLabel={`View ${ticket.subject}`}
                      onClick={() => handleSelectTicket(ticket.id)}
                      selected={ticket.id === selectedTicket?.id}
                    >
                      <BlockStack gap="100">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingSm" as="h3">
                            {ticket.subject}
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge>
                            <Badge tone={sentimentTone(ticket.sentiment)}>{ticket.sentiment}</Badge>
                            <Badge tone="info">{formatChannel(ticket.channel)}</Badge>
                          </InlineStack>
                        </InlineStack>
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="span" variant="bodySm" tone="subdued">
                            {ticket.customer.name} • {formatAssignee(ticket.assignedTo)}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {formatTimeAgo(ticket.updatedAt)}
                          </Text>
                        </InlineStack>
                        <Text variant="bodySm" as="p">
                          {ticket.lastMessagePreview}
                        </Text>
                      </BlockStack>
                    </ResourceList.Item>
                  )}
                />
              </Card>
            </Layout.Section>
            <Layout.Section secondary>
              {hasTickets && activeTicket ? (
                <Card title={activeTicket.subject}>
                  <Card.Section>
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone={statusTone(activeTicket.status)}>
                          {formatStatus(activeTicket.status)}
                        </Badge>
                        <Badge tone={priorityTone(activeTicket.priority)}>
                          {activeTicket.priority}
                        </Badge>
                        <Badge tone="info">{formatChannel(activeTicket.channel)}</Badge>
                        <Badge tone={activeTicket.aiDraft.approved ? "success" : "attention"}>
                          {activeTicket.aiDraft.approved ? "Approved" : "Needs review"}
                        </Badge>
                      </InlineStack>
                      <Text variant="bodySm" tone="subdued" as="p">
                        {activeTicket.customer.name} • {formatAssignee(activeTicket.assignedTo)}
                      </Text>
                    </BlockStack>
                  </Card.Section>
                  <Card.Section>
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">
                        Conversation timeline
                      </Text>
                      {activeTicket.timeline.length ? (
                        <BlockStack gap="200">
                          {activeTicket.timeline.map((entry, index) => (
                            <BlockStack key={entry.id} gap="150">
                              <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="150" blockAlign="center">
                                  <Badge tone={timelineTone(entry.type)}>
                                    {timelineLabel(entry.type)}
                                  </Badge>
                                  <Text variant="bodySm" as="span">
                                    {entry.actor}
                                  </Text>
                                </InlineStack>
                                <Text tone="subdued" variant="bodySm" as="span">
                                  {formatTimeAgo(entry.timestamp)}
                                </Text>
                              </InlineStack>
                              <Text variant="bodySm" as="p">
                                {entry.body}
                              </Text>
                              {entry.attachments && entry.attachments.length > 0 ? (
                                <InlineStack gap="150">
                                  {entry.attachments.map((attachment) => (
                                    <Badge key={attachment.id} tone="info">
                                      {attachment.name}
                                    </Badge>
                                  ))}
                                </InlineStack>
                              ) : null}
                            </BlockStack>
                          ))}
                        </BlockStack>
                      ) : (
                        <Text variant="bodySm" tone="subdued">
                          Timeline events will appear here as messages arrive.
                        </Text>
                      )}
                    </BlockStack>
                  </Card.Section>
                  <Card.Section>
                    <BlockStack gap="200">
                      <TextField
                        label="AI draft response"
                        multiline
                        autoComplete="off"
                        value={draftContent}
                        onChange={(value) => setDraftContent(value)}
                        helpText={`Last updated ${formatTimeAgo(activeTicket.aiDraft.updatedAt)} by ${activeTicket.aiDraft.updatedBy}`}
                        disabled={isSubmitting}
                      />
                      <Text tone="subdued" variant="bodySm">
                        Provide edits or approve to log feedback for future training iterations.
                      </Text>
                      <InlineStack align="end">
                        <ButtonGroup>
                          <Button onClick={() => handleDraftAction("edit")} loading={isSubmitting}>
                            Save edits
                          </Button>
                          <Button
                            primary
                            onClick={() => handleDraftAction("approve")}
                            loading={isSubmitting}
                          >
                            Approve draft
                          </Button>
                        </ButtonGroup>
                      </InlineStack>
                    </BlockStack>
                  </Card.Section>
                  <Card.Section subdued>
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="headingSm" as="h3">
                          Draft feedback
                        </Text>
                        {currentFeedback.length ? (
                          <Badge tone="info">{currentFeedback.length}</Badge>
                        ) : null}
                      </InlineStack>
                      <InlineStack gap="200">
                        <ButtonGroup>
                          <Button
                            icon={ThumbsUpIcon}
                            tone="success"
                            pressed={lastFeedback?.vote === "up"}
                            onClick={() => handleFeedback("up")}
                            loading={
                              isFeedbackSubmitting && feedbackFetcher.formData?.get("vote") === "up"
                            }
                            disabled={isSubmitting || isFeedbackSubmitting}
                          >
                            Upvote
                          </Button>
                          <Button
                            icon={ThumbsDownIcon}
                            tone="critical"
                            pressed={lastFeedback?.vote === "down"}
                            onClick={() => handleFeedback("down")}
                            loading={
                              isFeedbackSubmitting && feedbackFetcher.formData?.get("vote") === "down"
                            }
                            disabled={isSubmitting || isFeedbackSubmitting}
                          >
                            Downvote
                          </Button>
                        </ButtonGroup>
                      </InlineStack>
                      <TextField
                        label="Feedback notes (optional)"
                        multiline
                        autoComplete="off"
                        value={feedbackComment}
                        onChange={(value) => setFeedbackComment(value)}
                        disabled={isFeedbackSubmitting}
                      />
                      {currentFeedback.length ? (
                        <BlockStack gap="100">
                          <Text variant="bodySm" tone="subdued">
                            Recent feedback signals
                          </Text>
                          {feedbackHistory.map((entry) => (
                            <InlineStack key={entry.id} align="space-between" blockAlign="center">
                              <InlineStack gap="150" blockAlign="center">
                                <Badge tone={entry.vote === "up" ? "success" : "critical"}>
                                  {feedbackVoteLabel[entry.vote]}
                                </Badge>
                                <Text variant="bodySm" as="span">
                                  {entry.submittedBy}
                                </Text>
                              </InlineStack>
                              <Text variant="bodySm" tone="subdued" as="span">
                                {formatTimeAgo(entry.submittedAt)}
                              </Text>
                            </InlineStack>
                          ))}
                        </BlockStack>
                      ) : (
                        <Text variant="bodySm" tone="subdued">
                          No feedback submitted yet.
                        </Text>
                      )}
                    </BlockStack>
                  </Card.Section>
                </Card>
              ) : (
                <Card sectioned>
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">
                      No tickets match the current filters.
                    </Text>
                    <Text tone="subdued" variant="bodySm">
                      Adjust the filters on the left to review other inbox conversations.
                    </Text>
                  </BlockStack>
                </Card>
              )}
            </Layout.Section>
          </Layout>
        </Layout.Section>
      </Layout>

      {toast && <Toast content={toast} duration={3000} onDismiss={() => setToast(null)} />}
    </Page>
  );
}

type Metrics = {
  outstanding: number;
  overdue: number;
  approvalsPending: number;
  escalated: number;
};

const buildMetrics = (dataset: InboxDataset): Metrics => {
  const outstanding = dataset.tickets.filter((ticket) => ticket.status !== "resolved").length;
  const overdue = dataset.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvalsPending = dataset.tickets.filter(
    (ticket) => ticket.priority !== "low" && ticket.status === "open",
  ).length;
  const escalated = dataset.tickets.filter((ticket) => ticket.status === "escalated").length;

  return { outstanding, overdue, approvalsPending, escalated };
};

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "critical" | "warning" | "attention" | "success" | "info";
}) {
  return (
    <InlineStack align="space-between" blockAlign="center">
      <Text variant="bodyMd" as="span">
        {label}
      </Text>
      <Badge tone={tone}>{value}</Badge>
    </InlineStack>
  );
}
