export type InboxConversation = {
  id: string;
  channel: "email" | "shopify" | "instagram";
  subject: string;
  customer: string;
  status: "open" | "pending" | "closed";
  receivedAt: string;
  sentiment: "positive" | "neutral" | "negative";
};

export type InboxMetrics = {
  outstanding: number;
  overdue: number;
  closedToday: number;
  approvalsPending: number;
  ideaCandidates: number;
};

const conversations: InboxConversation[] = [
  {
    id: "inbox-1",
    channel: "email",
    subject: "Need ETA on LS Stage 2 kit",
    customer: "All Motor Co",
    status: "open",
    receivedAt: "2h ago",
    sentiment: "neutral",
  },
  {
    id: "inbox-2",
    channel: "shopify",
    subject: "Return request: Boost Controller",
    customer: "Cam Street",
    status: "pending",
    receivedAt: "4h ago",
    sentiment: "negative",
  },
  {
    id: "inbox-3",
    channel: "instagram",
    subject: "Do you have a turbo blanket for S500?",
    customer: "Kelsey",
    status: "open",
    receivedAt: "7h ago",
    sentiment: "positive",
  },
];

const metrics: InboxMetrics = {
  outstanding: 24,
  overdue: 6,
  closedToday: 12,
  approvalsPending: 9,
  ideaCandidates: 3,
};

export const getInboxData = async () => ({
  conversations,
  metrics,
});
