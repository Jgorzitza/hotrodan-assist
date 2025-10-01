import type {
  InboxConversation,
  InboxData,
  InboxDataset,
  InboxDraft,
  InboxDraftFeedback,
  InboxFeedbackVote,
  InboxMetrics,
  InboxProvider,
  InboxTicket,
  MockScenario,
} from "~/types/dashboard";

import type { Faker } from "@faker-js/faker";

import { createScenarioFaker, scenarioToDatasetState } from "./shared";
import {
  approveDraftContent,
  ensureDraftForTicket,
  getDraftForTicket,
  listDraftFeedback,
  recordDraftFeedback,
  updateDraftContent,
} from "./inbox-drafts.server";

type InboxScenarioOptions = {
  scenario?: MockScenario;
  filter?: InboxDataset["filter"];
  pageSize?: number;
  seed?: number;
  channelFilter?: InboxDataset["channelFilter"];
  statusFilter?: InboxDataset["statusFilter"];
  assignedFilter?: InboxDataset["assignedFilter"];
};

export type InboxDataOptions = InboxScenarioOptions & {
  dataset?: InboxDataset;
};

type BuilderContext = {
  scenario: MockScenario;
  filter: InboxDataset["filter"];
  channelFilter: InboxDataset["channelFilter"];
  statusFilter: InboxDataset["statusFilter"];
  assignedFilter: InboxDataset["assignedFilter"];
  pageSize: number;
  seed: number;
};

type InboxScenarioBuilder = (context: BuilderContext) => InboxDataset;

const defaultSubjects = [
  "Order delayed",
  "Wrong item received",
  "Question about preorder",
  "Custom wholesale pricing",
  "Update shipping address",
  "Return label request",
  "Inventory availability",
];

const providerRotation: InboxProvider[] = [
  "email",
  "shopify",
  "instagram",
  "tiktok",
];

const addHours = (isoTimestamp: string, hours: number) =>
  new Date(new Date(isoTimestamp).getTime() + hours * 60 * 60 * 1000).toISOString();

const maybeBuildAttachments = (
  ticketId: string,
  index: number,
  faker: Faker,
): InboxTicket["attachments"] => {
  if (index % 3 !== 0) {
    return undefined;
  }

  const count = (index % 2) + 1;
  return Array.from({ length: count }, (_, attachmentIndex) => {
    const extension = faker.helpers.arrayElement(["pdf", "png", "jpg", "txt"]);
    const descriptor = faker.word.noun();
    return {
      id: `${ticketId}-attachment-${attachmentIndex}`,
      name: `${descriptor}-${attachmentIndex}.${extension}`,
      url: faker.internet.url(),
    };
  });
};

const buildTimeline = (
  ticket: Omit<InboxTicket, "aiDraft" | "timeline" | "attachments">,
  attachments: InboxTicket["attachments"],
  index: number,
  faker: Faker,
): InboxTicket["timeline"] => {
  const responseAt = addHours(ticket.createdAt, 2 + (index % 4));
  const systemAt = addHours(responseAt, 1);

  const timeline = [
    {
      id: `${ticket.id}-message-1`,
      type: "customer_message" as const,
      actor: ticket.customer.name,
      timestamp: ticket.createdAt,
body: faker.lorem.paragraphs({ min: 1, max: 2 }),
      attachments,
    },
  ];

  if (ticket.assignedTo) {
    timeline.push({
      id: `${ticket.id}-reply-1`,
      type: "agent_reply" as const,
      actor: ticket.assignedTo,
      timestamp: responseAt,
      body: faker.lorem.sentences(2),
    });
  } else {
    timeline.push({
      id: `${ticket.id}-note-1`,
      type: "note" as const,
      actor: "Routing bot",
      timestamp: responseAt,
      body: "Queued for assignment per inbox load balancing policy.",
    });
  }

  timeline.push({
    id: `${ticket.id}-system-1`,
    type: "system" as const,
    actor: "Support Copilot",
    timestamp: systemAt,
    body: "AI draft prepared with guardrails for tone, refunds, and policy references.",
  });

  return timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
};

export const getInboxDraft = (ticketId: string): InboxDraft | undefined =>
  getDraftForTicket(ticketId);

export const updateInboxDraft = (
  ticketId: string,
  content: string,
  updatedBy = "Operator",
): InboxDraft => updateDraftContent(ticketId, content, updatedBy);

export const approveInboxDraft = (
  ticketId: string,
  content: string,
  updatedBy = "Operator",
): InboxDraft => approveDraftContent(ticketId, content, updatedBy);

export const submitInboxDraftFeedback = (
  ticketId: string,
  draftId: string,
  vote: InboxFeedbackVote,
  submittedBy = "Operator",
  comment?: string,
): InboxDraftFeedback => recordDraftFeedback(ticketId, draftId, vote, submittedBy, comment);

export const listInboxDraftFeedback = (): InboxDraftFeedback[] => listDraftFeedback();

const buildBaseTickets = ({
  scenario,
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
  pageSize,
  seed,
}: BuilderContext): InboxDataset => {
  const faker = createScenarioFaker(scenario, seed);
  const ticketCount = Math.max(pageSize, 24);

  const seededTickets = Array.from({ length: ticketCount }, (_, index) => {
    const status = (["open", "snoozed", "resolved", "escalated"] as const)[index % 4]!;
    const priority = (["low", "medium", "high", "urgent"] as const)[index % 4]!;
    const createdAt = faker.date.recent({ days: 14 }).toISOString();
    const updatedAt = faker.date.soon({ days: 3, refDate: createdAt }).toISOString();

    return {
      id: `ticket-${index}`,
      subject: defaultSubjects[index % defaultSubjects.length]!,
      status,
      priority,
      sentiment: (["positive", "neutral", "negative"] as const)[index % 3]!,
      updatedAt,
      createdAt,
      channel: providerRotation[index % providerRotation.length]!,
      customer: {
        id: `customer-${index}`,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        avatarUrl: faker.image.avatar(),
      },
      orderId:
        index % 2 === 0 ? `#${faker.number.int({ min: 1000, max: 9999 })}` : undefined,
      assignedTo: index % 3 === 0 ? faker.person.fullName() : undefined,
      lastMessagePreview: faker.lorem.sentence({ min: 8, max: 16 }),
      slaBreached: index % 5 === 0 && status !== "resolved" && priority !== "low",
    };
  });

  const ticketsWithContext: InboxTicket[] = seededTickets.map((ticket, index) => {
const draftSeed = faker.lorem.paragraphs({ min: 1, max: 2 });
    const draft = ensureDraftForTicket({
      ticketId: ticket.id,
      content: draftSeed,
      updatedBy: "AI assistant",
    });

    const attachments = maybeBuildAttachments(ticket.id, index, faker);
    const timeline = buildTimeline(ticket, attachments, index, faker);
    const latestTimestamp = timeline[timeline.length - 1]?.timestamp ?? ticket.updatedAt;

    return {
      ...ticket,
      updatedAt: latestTimestamp,
      aiDraft: draft,
      attachments,
      timeline,
    };
  });

  const availableFilters = buildAvailableFilters(ticketsWithContext);
  const filteredTickets = applyFilters(ticketsWithContext, {
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
  });

  const paginatedTickets = filteredTickets.slice(0, pageSize);

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
    tickets: paginatedTickets,
    count: filteredTickets.length,
    availableFilters,
  };
};

const buildEmptyTickets: InboxScenarioBuilder = ({
  scenario,
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
}) => ({
  scenario,
  state: "empty",
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
  tickets: [],
  count: 0,
  alert: "Inbox is quiet. No tickets match this filter.",
  availableFilters: {
    channels: [],
    statuses: [],
    assignees: [],
  },
});

const buildWarningTickets: InboxScenarioBuilder = (context) => {
  const dataset = buildBaseTickets(context);
  const totalMatches = dataset.count;
  dataset.state = "warning";
  dataset.alert = "Escalated inbox volume is trending up. Consider reassigning.";
  dataset.tickets = dataset.tickets.map((ticket, index) => ({
    ...ticket,
    status: index % 2 === 0 ? "escalated" : ticket.status,
    priority: index % 3 === 0 ? "urgent" : ticket.priority,
    slaBreached: index % 2 === 0 || ticket.slaBreached,
  }));
  dataset.count = totalMatches;
  return dataset;
};

const buildErrorTickets: InboxScenarioBuilder = ({
  scenario,
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
}) => ({
  scenario,
  state: "error",
  filter,
  channelFilter,
  statusFilter,
  assignedFilter,
  tickets: [],
  count: 0,
  error: "Inbox service unavailable. Retry in a few minutes.",
  availableFilters: {
    channels: [],
    statuses: [],
    assignees: [],
  },
});

const BUILDERS: Record<MockScenario, InboxScenarioBuilder> = {
  base: buildBaseTickets,
  empty: buildEmptyTickets,
  warning: buildWarningTickets,
  error: buildErrorTickets,
};

export const getInboxScenario = (
  options: InboxScenarioOptions = {},
): InboxDataset => {
  const scenario = options.scenario ?? "base";
  const filter = options.filter ?? "all";
  const pageSize = options.pageSize ?? 10;
  const seed = options.seed ?? 0;
  const channelFilter = options.channelFilter ?? "all";
  const statusFilter = options.statusFilter ?? "all";
  const assignedFilter = options.assignedFilter ?? "all";

  return BUILDERS[scenario]({
    scenario,
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
    pageSize,
    seed,
  });
};

const filterTicketsByFilter = (
  tickets: InboxTicket[],
  filter: InboxDataset["filter"],
): InboxTicket[] => {
  switch (filter) {
    case "unassigned":
      return tickets.filter((ticket) => !ticket.assignedTo);
    case "priority":
      return tickets.filter((ticket) => ticket.priority === "high" || ticket.priority === "urgent");
    case "overdue":
      return tickets.filter((ticket) => Boolean(ticket.slaBreached));
    default:
      return tickets;
  }
};

const applyFilters = (
  tickets: InboxTicket[],
  {
    filter,
    channelFilter,
    statusFilter,
    assignedFilter,
  }: {
    filter: InboxDataset["filter"];
    channelFilter: InboxDataset["channelFilter"];
    statusFilter: InboxDataset["statusFilter"];
    assignedFilter: InboxDataset["assignedFilter"];
  },
): InboxTicket[] => {
  let filtered = filterTicketsByFilter(tickets, filter);

  if (channelFilter !== "all") {
    filtered = filtered.filter((ticket) => ticket.channel === channelFilter);
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((ticket) => ticket.status === statusFilter);
  }

  if (assignedFilter === "unassigned") {
    filtered = filtered.filter((ticket) => !ticket.assignedTo);
  } else if (assignedFilter !== "all") {
    filtered = filtered.filter((ticket) => ticket.assignedTo === assignedFilter);
  }

  return filtered;
};

const buildAvailableFilters = (tickets: InboxTicket[]): InboxDataset["availableFilters"] => {
  const channels = Array.from(new Set(tickets.map((ticket) => ticket.channel))).sort();
  const statuses = Array.from(new Set(tickets.map((ticket) => ticket.status))).sort();
  const assignees = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.assignedTo)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    channels,
    statuses,
    assignees,
  };
};

const toMetrics = (dataset: InboxDataset): InboxMetrics => {
  const today = new Date().toDateString();

  const outstanding = dataset.tickets.filter((ticket) => ticket.status !== "resolved").length;
  const overdue = dataset.tickets.filter((ticket) => Boolean(ticket.slaBreached)).length;
  const closedToday = dataset.tickets.filter((ticket) => {
    if (ticket.status !== "resolved") return false;
    const updated = new Date(ticket.updatedAt).toDateString();
    return updated === today;
  }).length;
  const approvalsPending = dataset.tickets.filter((ticket) => ticket.priority === "urgent").length;
  const ideaCandidates = dataset.tickets.filter((ticket) => ticket.sentiment === "positive").length;

  const total = dataset.count;
  const low = dataset.tickets.filter((t) => t.sentiment === "negative").length;
  const medium = dataset.tickets.filter((t) => t.sentiment === "neutral").length;
  const high = dataset.tickets.filter((t) => t.sentiment === "positive").length;
  const accounted = low + medium + high;
  const unscored = Math.max(0, total - accounted);

  return {
    outstanding,
    overdue,
    closedToday,
    approvalsPending,
    ideaCandidates,
    total,
    confidenceHistogram: { low, medium, high, unscored },
  };
};

const toConversations = (dataset: InboxDataset): InboxConversation[] =>
  dataset.tickets.map((ticket) => ({
    id: ticket.id,
    channel: ticket.channel,
    subject: ticket.subject,
    customer: ticket.customer.name,
    status: ticket.status,
    sentiment: ticket.sentiment,
    receivedAt: ticket.updatedAt,
  }));

export const getInboxData = (options: InboxDataOptions = {}): InboxData => {
  const dataset =
    options.dataset ??
    getInboxScenario({
      scenario: options.scenario,
      filter: options.filter,
      pageSize: options.pageSize,
      seed: options.seed,
      channelFilter: options.channelFilter,
      statusFilter: options.statusFilter,
      assignedFilter: options.assignedFilter,
    });

  const availableScenarios: MockScenario[] = ["base", "empty", "warning", "error"];

  return {
    dataset,
    metrics: toMetrics(dataset),
    conversations: toConversations(dataset),
    availableScenarios,
  };
};
