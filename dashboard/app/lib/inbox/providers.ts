import type {
  InboxDataset,
  InboxProvider,
  MockScenario,
} from "~/types/dashboard";

import { getInboxScenario } from "../../mocks";

export type InboxMessage = {
  id: string;
  provider: InboxProvider;
  subject: string;
  preview: string;
  receivedAt: string;
  sentiment: "positive" | "neutral" | "negative";
};

export type InboxDraft = {
  id: string;
  messageId: string;
  content: string;
  approved: boolean;
  editedContent?: string;
};

export interface InboxProviderClient {
  listMessages(): Promise<InboxMessage[]>;
  sendDraft(draft: InboxDraft): Promise<void>;
}

interface ProviderOptions {
  scenario?: MockScenario;
  pageSize?: number;
}

const toMessages = (dataset: InboxDataset, provider: InboxProvider): InboxMessage[] =>
  dataset.tickets
    .filter((ticket) => ticket.channel === provider)
    .map((ticket) => ({
      id: ticket.id,
      provider,
      subject: ticket.subject,
      preview: ticket.lastMessagePreview,
      receivedAt: ticket.updatedAt,
      sentiment: ticket.sentiment,
    }));

export class MockInboxProvider implements InboxProviderClient {
  constructor(
    private provider: InboxProvider,
    private options: ProviderOptions = {},
  ) {}

  async listMessages(): Promise<InboxMessage[]> {
    const dataset = getInboxScenario({
      scenario: this.options.scenario,
      pageSize: this.options.pageSize,
    });
    return toMessages(dataset, this.provider);
  }

  async sendDraft(_draft: InboxDraft): Promise<void> {
    return Promise.resolve();
  }
}

export const createInboxProvider = (
  provider: InboxProvider,
  options?: ProviderOptions,
): InboxProviderClient => new MockInboxProvider(provider, options);
