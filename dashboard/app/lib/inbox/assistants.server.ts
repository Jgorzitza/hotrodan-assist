import type {
  InboxAttachment,
  InboxDataset,
  InboxDraft,
  InboxDraftFeedback,
  InboxFeedbackVote,
  InboxMetrics,
  InboxProvider,
  InboxTicket,
  InboxTicketPriority,
  InboxTicketStatus,
} from "~/types/dashboard";

type AssistantsDraftListItem = {
  id: string;
  draft_id: string;
  channel: string;
  conversation_id: string;
  customer_display?: string | null;
  subject?: string | null;
  chat_topic?: string | null;
  incoming_excerpt?: string | null;
  draft_excerpt?: string | null;
  confidence?: number | null;
  llm_model?: string | null;
  estimated_tokens_in?: number | null;
  estimated_tokens_out?: number | null;
  usd_cost?: number | null;
  created_at: string;
  sla_deadline?: string | null;
  status: string;
  tags?: string[] | null;
  auto_escalated?: boolean | null;
  auto_escalation_reason?: string | null;
  assigned_to?: string | null;
  escalation_reason?: string | null;
  time_remaining_seconds?: number | null;
  overdue?: boolean | null;
};

type AssistantsSourceSnippet = {
  title?: string | null;
  url?: string | null;
  relevance_score?: number | null;
};

type AssistantsAuditLogEntry = {
  timestamp?: string | null;
  actor?: string | null;
  action?: string | null;
  payload?: Record<string, unknown> | null;
};

type AssistantsNote = {
  note_id: string;
  author_user_id?: string | null;
  text: string;
  created_at?: string | null;
};

type AssistantsLearningNote = {
  note: string;
  author?: string | null;
  timestamp?: string | null;
};

type AssistantsDraftDetail = AssistantsDraftListItem & {
  incoming_text?: string | null;
  draft_text?: string | null;
  suggested_text?: string | null;
  final_text?: string | null;
  sources?: string[] | null;
  source_snippets?: AssistantsSourceSnippet[] | null;
  conversation_summary?: string[] | null;
  order_context?: Record<string, unknown> | null;
  audit_log?: AssistantsAuditLogEntry[] | null;
  notes?: AssistantsNote[] | null;
  learning_notes?: AssistantsLearningNote[] | null;
  metadata?: Record<string, unknown> | null;
  model_latency_ms?: number | null;
  sent_at?: string | null;
  usd_sent_copy?: boolean | null;
};

type AssistantsDraftListResponse = {
  drafts?: AssistantsDraftListItem[];
  next_cursor?: string | null;
  total?: number | null;
  refresh_after_seconds?: number | null;
};

const ASSISTANTS_CHANNEL_MAP: Record<string, InboxProvider> = {
  email: "email",
  chat: "chat",
  sms: "sms",
  social: "social",
};

const FALLBACK_CUSTOMER_NAME = "Customer";
const FALLBACK_ASSISTANT_ACTOR = "Assistant";

export const resolveAssistantsBaseUrl = (baseUrl?: string) => {
  const resolved = baseUrl ?? process.env.ASSISTANTS_SERVICE_URL;
  if (!resolved) {
    throw new Error("Missing ASSISTANTS_SERVICE_URL environment variable");
  }
  return resolved;
};

const safeIso = (value?: string | null) => {
  if (value && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
};

const mapChannel = (channel?: string | null): InboxProvider => {
  if (!channel) {
    return "email";
  }
  const normalized = channel.toLowerCase();
  if (normalized in ASSISTANTS_CHANNEL_MAP) {
    return ASSISTANTS_CHANNEL_MAP[normalized];
  }

  switch (normalized) {
    case "shopify":
      return "shopify";
    case "instagram":
      return "instagram";
    case "tiktok":
      return "tiktok";
    default:
      return "email";
  }
};

const mapStatus = (status?: string | null): InboxTicketStatus => {
  const normalized = status?.toLowerCase();
  switch (normalized) {
    case "needs_review":
      return "snoozed";
    case "escalated":
      return "escalated";
    case "sent":
      return "resolved";
    case "pending":
    default:
      return "open";
  }
};

const determinePriority = (
  draft: AssistantsDraftListItem | AssistantsDraftDetail,
): InboxTicketPriority => {
  if (draft.overdue) {
    return "urgent";
  }
  if (draft.auto_escalated) {
    return "urgent";
  }
  const tags = draft.tags ?? [];
  if (tags.some((tag) => tag?.toLowerCase() === "vip")) {
    return "high";
  }
  if (tags.some((tag) => tag?.toLowerCase().includes("priority"))) {
    return "high";
  }
  return "medium";
};

const determineSentiment = (
  draft: AssistantsDraftListItem | AssistantsDraftDetail,
): InboxTicket["sentiment"] => {
  if (draft.overdue) {
    return "negative";
  }
  if (draft.auto_escalated) {
    return "negative";
  }
  if (draft.status?.toLowerCase() === "sent") {
    return "positive";
  }
  return "neutral";
};

const parseCustomerDisplay = (
  display?: string | null,
  fallbackId?: string,
): InboxTicket["customer"] => {
  if (!display) {
    return {
      id: fallbackId ?? "customer",
      name: FALLBACK_CUSTOMER_NAME,
      email: "customer@example.com",
    };
  }

  const trimmed = display.trim();
  const match = trimmed.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  if (!match) {
    return {
      id: fallbackId ?? trimmed,
      name: trimmed,
      email: "customer@example.com",
    };
  }

  const name = match[1]?.trim() || FALLBACK_CUSTOMER_NAME;
  const email = match[2]?.trim() || "customer@example.com";

  return {
    id: fallbackId ?? email ?? name,
    name,
    email,
  };
};

const extractAttachments = (
  snippets?: AssistantsSourceSnippet[] | null,
): InboxAttachment[] | undefined => {
  if (!snippets?.length) {
    return undefined;
  }

  return snippets
    .filter((snippet) => Boolean(snippet.url))
    .map((snippet, index) => ({
      id: snippet.url ?? `source-${index}`,
      name: snippet.title ?? `Reference ${index + 1}`,
      url: snippet.url ?? "#",
    }));
};

const describeAuditAction = (entry: AssistantsAuditLogEntry) => {
  const action = entry.action ?? "event";
  const normalized = action.replace(/^draft\./, "");
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildTimeline = (
  detail: AssistantsDraftDetail,
  customerName: string,
  attachments: InboxAttachment[] | undefined,
): InboxTicket["timeline"] => {
  const timeline: InboxTicket["timeline"] = [];
  const createdAt = safeIso(detail.created_at);

  const incomingBody = detail.incoming_text ?? detail.incoming_excerpt ?? "Customer message unavailable.";
  timeline.push({
    id: `${detail.id}-incoming`,
    type: "customer_message",
    actor: customerName,
    timestamp: createdAt,
    body: incomingBody,
    attachments,
  });

  const draftText = detail.draft_text ?? detail.final_text ?? detail.suggested_text ?? detail.draft_excerpt;
  if (draftText) {
    timeline.push({
      id: `${detail.id}-draft`,
      type: "agent_reply",
      actor: detail.assigned_to ?? FALLBACK_ASSISTANT_ACTOR,
      timestamp: safeIso(detail.sent_at ?? detail.created_at),
      body: draftText,
    });
  }

  detail.audit_log?.forEach((entry, index) => {
    timeline.push({
      id: `${detail.id}-audit-${index}`,
      type: "system",
      actor: entry.actor ?? "System",
      timestamp: safeIso(entry.timestamp),
      body: describeAuditAction(entry),
    });
  });

  detail.notes?.forEach((note, index) => {
    if (parseFeedbackNote(note)) {
      return;
    }
    timeline.push({
      id: `${detail.id}-note-${index}`,
      type: "note",
      actor: note.author_user_id ?? FALLBACK_ASSISTANT_ACTOR,
      timestamp: safeIso(note.created_at),
      body: note.text,
    });
  });

  detail.learning_notes?.forEach((note, index) => {
    timeline.push({
      id: `${detail.id}-learning-${index}`,
      type: "note",
      actor: note.author ?? FALLBACK_ASSISTANT_ACTOR,
      timestamp: safeIso(note.timestamp),
      body: note.note,
    });
  });

  return timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
};

type ParsedFeedback = {
  vote: InboxFeedbackVote;
  comment?: string;
};

const parseFeedbackText = (text: string): ParsedFeedback | null => {
  try {
    const parsed = JSON.parse(text) as {
      type?: string;
      vote?: string;
      comment?: string | null;
    };

    if (parsed?.type === "feedback" && (parsed.vote === "up" || parsed.vote === "down")) {
      return {
        vote: parsed.vote,
        comment: parsed.comment ?? undefined,
      };
    }
  } catch (error) {
    // Non-JSON notes are ignored here.
  }

  return null;
};

const parseFeedbackNote = (note: AssistantsNote): ParsedFeedback | null =>
  parseFeedbackText(note.text);

const extractFeedback = (detail: AssistantsDraftDetail): InboxDraftFeedback[] => {
  const entries: InboxDraftFeedback[] = [];

  detail.notes?.forEach((note) => {
    const parsed = parseFeedbackNote(note);
    if (!parsed) {
      return;
    }
    entries.push({
      id: note.note_id,
      draftId: detail.draft_id,
      ticketId: detail.draft_id,
      vote: parsed.vote,
      comment: parsed.comment,
      submittedAt: safeIso(note.created_at),
      submittedBy: note.author_user_id ?? FALLBACK_ASSISTANT_ACTOR,
    });
  });

  detail.learning_notes?.forEach((note, index) => {
    entries.push({
      id: `${detail.draft_id}-learning-${index}`,
      draftId: detail.draft_id,
      ticketId: detail.draft_id,
      vote: "up",
      comment: note.note,
      submittedAt: safeIso(note.timestamp),
      submittedBy: note.author ?? FALLBACK_ASSISTANT_ACTOR,
    });
  });

  return entries.sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
};

const computeRevision = (detail?: AssistantsDraftDetail) => {
  const auditLength = detail?.audit_log?.length ?? 0;
  return Math.max(1, auditLength + 1);
};

const toInboxDraft = (detail: AssistantsDraftDetail): InboxDraft => {
  const updatedAt = detail.sent_at ?? detail.created_at;
  const lastActor = detail.audit_log?.[detail.audit_log.length - 1]?.actor;

  return {
    id: detail.draft_id,
    ticketId: detail.draft_id,
    content:
      detail.draft_text ??
      detail.final_text ??
      detail.suggested_text ??
      detail.draft_excerpt ??
      "",
    approved: mapStatus(detail.status) === "resolved",
    updatedAt: safeIso(updatedAt),
    updatedBy: detail.assigned_to ?? lastActor ?? FALLBACK_ASSISTANT_ACTOR,
    revision: computeRevision(detail),
    feedback: extractFeedback(detail),
  };
};

const toInboxTicket = (
  listItem: AssistantsDraftListItem,
  detail?: AssistantsDraftDetail,
): InboxTicket => {
  const resolvedDetail: AssistantsDraftDetail = {
    ...listItem,
    ...(detail ?? {}),
  } as AssistantsDraftDetail;

  const channel = mapChannel(resolvedDetail.channel ?? listItem.channel);
  const status = mapStatus(resolvedDetail.status ?? listItem.status);
  const priority = determinePriority(resolvedDetail);
  const sentiment = determineSentiment(resolvedDetail);
  const customer = parseCustomerDisplay(
    resolvedDetail.customer_display ?? listItem.customer_display,
    resolvedDetail.conversation_id ?? listItem.conversation_id,
  );
  const attachments = extractAttachments(resolvedDetail.source_snippets);
  const timeline = buildTimeline(resolvedDetail, customer.name, attachments);
  const aiDraft = toInboxDraft(resolvedDetail);

  const lastMessagePreview =
    listItem.incoming_excerpt ??
    resolvedDetail.incoming_text ??
    resolvedDetail.conversation_summary?.[0] ??
    "";

  const orderIdRaw = resolvedDetail.order_context?.order_id;
  const orderId = typeof orderIdRaw === "string" ? orderIdRaw : undefined;

  return {
    id: aiDraft.id,
    subject: resolvedDetail.subject ?? listItem.subject ?? "Customer inquiry",
    status,
    priority,
    sentiment,
    updatedAt: safeIso(resolvedDetail.sent_at ?? resolvedDetail.created_at),
    createdAt: safeIso(resolvedDetail.created_at),
    channel,
    customer,
    orderId,
    assignedTo: resolvedDetail.assigned_to ?? listItem.assigned_to ?? undefined,
    lastMessagePreview,
    slaBreached: Boolean(resolvedDetail.overdue ?? listItem.overdue),
    aiDraft,
    timeline,
    attachments,
  };
};

const filterTickets = (
  tickets: InboxTicket[],
  params: {
    filter: InboxDataset["filter"];
    channelFilter: InboxDataset["channelFilter"];
    statusFilter: InboxDataset["statusFilter"];
    assignedFilter: InboxDataset["assignedFilter"];
  },
) => {
  let scoped = [...tickets];

  if (params.filter === "unassigned") {
    scoped = scoped.filter((ticket) => !ticket.assignedTo);
  } else if (params.filter === "priority") {
    scoped = scoped.filter((ticket) => ticket.priority === "high" || ticket.priority === "urgent");
  } else if (params.filter === "overdue") {
    scoped = scoped.filter((ticket) => ticket.slaBreached);
  }

  if (params.channelFilter !== "all") {
    scoped = scoped.filter((ticket) => ticket.channel === params.channelFilter);
  }

  if (params.statusFilter !== "all") {
    scoped = scoped.filter((ticket) => ticket.status === params.statusFilter);
  }

  if (params.assignedFilter === "unassigned") {
    scoped = scoped.filter((ticket) => !ticket.assignedTo);
  } else if (params.assignedFilter !== "all") {
    scoped = scoped.filter((ticket) => ticket.assignedTo === params.assignedFilter);
  }

  return scoped;
};

const buildAvailableFilters = (tickets: InboxTicket[]) => {
  const channelSet = new Set<InboxProvider>();
  const statusSet = new Set<InboxTicketStatus>();
  const assignees = new Set<string>();

  tickets.forEach((ticket) => {
    channelSet.add(ticket.channel);
    statusSet.add(ticket.status);
    if (ticket.assignedTo) {
      assignees.add(ticket.assignedTo);
    }
  });

  return {
    channels: Array.from(channelSet),
    statuses: Array.from(statusSet),
    assignees: Array.from(assignees),
  } satisfies InboxDataset["availableFilters"];
};

const mapStatusFilterToService = (status: InboxDataset["statusFilter"]): string | null => {
  switch (status) {
    case "open":
      return "pending,needs_review";
    case "snoozed":
      return "needs_review";
    case "resolved":
      return "sent";
    case "escalated":
      return "escalated";
    case "all":
    default:
      return "all";
  }
};

const mapChannelFilterToService = (channel: InboxDataset["channelFilter"]): string | null => {
  if (channel === "all") {
    return null;
  }

  switch (channel) {
    case "shopify":
      return "chat";
    case "instagram":
    case "tiktok":
      return "social";
    default:
      return channel;
  }
};

const mapAssignedFilterToService = (assigned: InboxDataset["assignedFilter"]): string | null => {
  if (assigned === "all") {
    return null;
  }
  if (assigned === "unassigned") {
    return "unassigned";
  }
  return assigned;
};

export type FetchAssistantsInboxParams = {
  filter: InboxDataset["filter"];
  channelFilter: InboxDataset["channelFilter"];
  statusFilter: InboxDataset["statusFilter"];
  assignedFilter: InboxDataset["assignedFilter"];
  pageSize: number;
  signal?: AbortSignal;
  baseUrl?: string;
};

export type FetchAssistantsInboxResult = {
  dataset: InboxDataset;
  refreshAfterSeconds: number | null;
};

export const fetchAssistantsInbox = async (
  params: FetchAssistantsInboxParams,
): Promise<FetchAssistantsInboxResult> => {
  const baseUrl = resolveAssistantsBaseUrl(params.baseUrl);
  const listUrl = new URL("/assistants/drafts", baseUrl);
  listUrl.searchParams.set("limit", String(Math.max(params.pageSize, 1)));

  const statusParam = mapStatusFilterToService(params.statusFilter);
  if (statusParam) {
    listUrl.searchParams.set("status", statusParam);
  }

  const channelParam = mapChannelFilterToService(params.channelFilter);
  if (channelParam) {
    listUrl.searchParams.set("channel", channelParam);
  }

  const assignedParam = mapAssignedFilterToService(params.assignedFilter);
  if (assignedParam) {
    listUrl.searchParams.set("assigned", assignedParam);
  }

  const listResponse = await fetch(listUrl.toString(), {
    signal: params.signal,
  });

  if (!listResponse.ok) {
    const text = await listResponse.text().catch(() => "");
    throw new Error(`Assistants drafts request failed (${listResponse.status}): ${text}`);
  }

  const payload = (await listResponse.json()) as AssistantsDraftListResponse;
  const drafts = payload.drafts ?? [];

  const details = await Promise.all(
    drafts.map(async (draft) => {
      try {
        return await fetchAssistantsDraftDetail(draft.draft_id, {
          baseUrl,
          signal: params.signal,
        });
      } catch (error) {
        console.warn("assistants detail fetch failed", draft.draft_id, error);
        return null;
      }
    }),
  );

  const tickets = drafts.map((draft, index) => {
    const detail = details[index] ?? undefined;
    return toInboxTicket(draft, detail ?? undefined);
  });

  const filtered = filterTickets(tickets, params);

  const availableFilters = buildAvailableFilters(tickets);
  const state = filtered.length === 0 ? "empty" : "ok";

  const dataset: InboxDataset = {
    scenario: "base",
    state,
    filter: params.filter,
    channelFilter: params.channelFilter,
    statusFilter: params.statusFilter,
    assignedFilter: params.assignedFilter,
    tickets: filtered,
    count: filtered.length,
    availableFilters,
  };

  if (tickets.length === 0) {
    dataset.alert = "No drafts available from Assistants service.";
  }

  return {
    dataset,
    refreshAfterSeconds: payload.refresh_after_seconds ?? null,
  };
};

type FetchAssistantsDraftDetailParams = {
  baseUrl?: string;
  signal?: AbortSignal;
};

const fetchAssistantsDraftDetail = async (
  draftId: string,
  options: FetchAssistantsDraftDetailParams = {},
): Promise<AssistantsDraftDetail> => {
  const baseUrl = resolveAssistantsBaseUrl(options.baseUrl);
  const url = new URL(`/assistants/drafts/${draftId}`, baseUrl);

  const response = await fetch(url.toString(), { signal: options.signal });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Assistants draft detail failed (${response.status}): ${text}`);
  }

  return (await response.json()) as AssistantsDraftDetail;
};

export type FetchAssistantsDraftParams = {
  draftId: string;
  baseUrl?: string;
  signal?: AbortSignal;
};

export const fetchAssistantsDraft = async (
  params: FetchAssistantsDraftParams,
): Promise<InboxTicket> => {
  const detail = await fetchAssistantsDraftDetail(params.draftId, params);
  const listItem: AssistantsDraftListItem = {
    id: detail.id,
    draft_id: detail.draft_id,
    channel: detail.channel,
    conversation_id: detail.conversation_id,
    customer_display: detail.customer_display,
    subject: detail.subject,
    chat_topic: detail.chat_topic,
    incoming_excerpt: detail.incoming_excerpt,
    draft_excerpt: detail.draft_excerpt,
    confidence: detail.confidence,
    llm_model: detail.llm_model,
    estimated_tokens_in: detail.estimated_tokens_in,
    estimated_tokens_out: detail.estimated_tokens_out,
    usd_cost: detail.usd_cost,
    created_at: detail.created_at,
    sla_deadline: detail.sla_deadline,
    status: detail.status,
    tags: detail.tags,
    auto_escalated: detail.auto_escalated,
    auto_escalation_reason: detail.auto_escalation_reason,
    assigned_to: detail.assigned_to,
    escalation_reason: detail.escalation_reason,
    time_remaining_seconds: detail.time_remaining_seconds,
    overdue: detail.overdue,
  };

  return toInboxTicket(listItem, detail);
};

type AssistantsActionOptions = {
  baseUrl?: string;
  signal?: AbortSignal;
};

export type ApproveAssistantsDraftInput = AssistantsActionOptions & {
  draftId: string;
  actor: string;
  sendCopyToCustomer?: boolean;
  escalateToSpecialist?: boolean;
  escalationReason?: string | null;
  assignTo?: string | null;
};

export const approveAssistantsDraft = async (
  input: ApproveAssistantsDraftInput,
) => {
  const baseUrl = resolveAssistantsBaseUrl(input.baseUrl);
  const url = new URL("/assistants/approve", baseUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      draft_id: input.draftId,
      approver_user_id: input.actor,
      send_copy_to_customer: input.sendCopyToCustomer ?? false,
      escalate_to_specialist: input.escalateToSpecialist ?? false,
      escalation_reason: input.escalationReason ?? undefined,
      assign_to: input.assignTo ?? undefined,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Assistants approve failed (${response.status}): ${text}`);
  }
};

export type EditAssistantsDraftInput = AssistantsActionOptions & {
  draftId: string;
  actor: string;
  content: string;
  learningNotes?: string;
  sendCopyToCustomer?: boolean;
};

export const editAssistantsDraft = async (input: EditAssistantsDraftInput) => {
  const baseUrl = resolveAssistantsBaseUrl(input.baseUrl);
  const url = new URL("/assistants/edit", baseUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      draft_id: input.draftId,
      editor_user_id: input.actor,
      final_text: input.content,
      learning_notes: input.learningNotes ?? undefined,
      send_copy_to_customer: input.sendCopyToCustomer ?? false,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Assistants edit failed (${response.status}): ${text}`);
  }
};

export type FeedbackAssistantsDraftInput = AssistantsActionOptions & {
  draftId: string;
  actor: string;
  vote: InboxFeedbackVote;
  comment?: string;
};

export const submitAssistantsDraftFeedback = async (
  input: FeedbackAssistantsDraftInput,
) => {
  const baseUrl = resolveAssistantsBaseUrl(input.baseUrl);
  const url = new URL("/assistants/notes", baseUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      draft_id: input.draftId,
      author_user_id: input.actor,
      text: JSON.stringify({
        type: "feedback",
        vote: input.vote,
        comment: input.comment ?? null,
      }),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Assistants feedback failed (${response.status}): ${text}`);
  }
};

export const buildAssistantsMetrics = (dataset: InboxDataset): InboxMetrics => {
  const outstanding = dataset.tickets.filter((ticket) => ticket.status !== "resolved").length;
  const overdue = dataset.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvalsPending = dataset.tickets.filter(
    (ticket) => ticket.priority !== "low" && ticket.status === "open",
  ).length;
  const escalated = dataset.tickets.filter((ticket) => ticket.status === "escalated").length;

  return { outstanding, overdue, approvalsPending, escalated };
};
