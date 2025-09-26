import type {
  InboxConversation,
  InboxData,
  InboxDataset,
  InboxMetrics,
  InboxProvider,
  InboxTicket,
  MockScenario,
} from "~/types/dashboard";

import { createScenarioFaker, scenarioToDatasetState } from "./shared";

type InboxScenarioOptions = {
  scenario?: MockScenario;
  filter?: InboxDataset["filter"];
  pageSize?: number;
  seed?: number;
};

export type InboxDataOptions = InboxScenarioOptions & {
  dataset?: InboxDataset;
};

type BuilderContext = {
  scenario: MockScenario;
  filter: InboxDataset["filter"];
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

const buildBaseTickets = ({
  scenario,
  filter,
  pageSize,
  seed,
}: BuilderContext): InboxDataset => {
  const faker = createScenarioFaker(scenario, seed);
  const tickets: InboxTicket[] = Array.from({ length: pageSize }, (_, index) => {
    const status = (["open", "snoozed", "resolved", "escalated"] as const)[
      index % 4
    ];
    const priority = (["low", "medium", "high", "urgent"] as const)[
      index % 4
    ];
    const createdAt = faker.date.recent({ days: 14 }).toISOString();
    const updatedAt = faker.date.soon({ days: 3, refDate: createdAt }).toISOString();

    return {
      id: `ticket-${index}`,
      subject: defaultSubjects[index % defaultSubjects.length]!,
      status,
      priority,
      sentiment: (["positive", "neutral", "negative"] as const)[
        index % 3
      ],
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
      slaBreached:
        index % 5 === 0 && status !== "resolved" && priority !== "low",
    };
  });

  const filteredTickets = filterTicketsByFilter(tickets, filter);

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    filter,
    tickets: filteredTickets,
    count: filteredTickets.length,
  };
};

const buildEmptyTickets: InboxScenarioBuilder = ({ scenario, filter }) => ({
  scenario,
  state: "empty",
  filter,
  tickets: [],
  count: 0,
  alert: "Inbox is quiet. No tickets match this filter.",
});

const buildWarningTickets: InboxScenarioBuilder = (context) => {
  const dataset = buildBaseTickets(context);
  dataset.state = "warning";
  dataset.alert = "Escalated inbox volume is trending up. Consider reassigning.";
  dataset.tickets = dataset.tickets.map((ticket, index) => ({
    ...ticket,
    status: index % 2 === 0 ? "escalated" : ticket.status,
    priority: index % 3 === 0 ? "urgent" : ticket.priority,
    slaBreached: index % 2 === 0 || ticket.slaBreached,
  }));
  return dataset;
};

const buildErrorTickets: InboxScenarioBuilder = ({ scenario, filter }) => ({
  scenario,
  state: "error",
  filter,
  tickets: [],
  count: 0,
  error: "Inbox service unavailable. Retry in a few minutes.",
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

  return BUILDERS[scenario]({ scenario, filter, pageSize, seed });
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

  return { outstanding, overdue, closedToday, approvalsPending, ideaCandidates };
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
    });

  return {
    dataset,
    metrics: toMetrics(dataset),
    conversations: toConversations(dataset),
  };
};
