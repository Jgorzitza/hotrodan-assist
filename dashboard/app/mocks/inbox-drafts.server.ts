import { randomUUID } from "node:crypto";

import type { InboxDraft, InboxDraftFeedback, InboxFeedbackVote } from "~/types/dashboard";

type DraftSeedOptions = {
  ticketId: string;
  content: string;
  updatedBy?: string;
};

const DEFAULT_AUTHOR = "AI assistant";

const drafts = new Map<string, InboxDraft>();
const feedbackLog: InboxDraftFeedback[] = [];

const now = () => new Date().toISOString();

const createDraft = ({ ticketId, content, updatedBy = DEFAULT_AUTHOR }: DraftSeedOptions): InboxDraft => ({
  id: randomUUID(),
  ticketId,
  content,
  approved: false,
  updatedAt: now(),
  updatedBy,
  revision: 1,
  feedback: [],
});

export const ensureDraftForTicket = ({ ticketId, content, updatedBy }: DraftSeedOptions): InboxDraft => {
  const existing = drafts.get(ticketId);
  if (existing) {
    return existing;
  }

  const draft = createDraft({ ticketId, content, updatedBy });
  drafts.set(ticketId, draft);
  return draft;
};

export const updateDraftContent = (
  ticketId: string,
  content: string,
  updatedBy = "Operator",
): InboxDraft => {
  const current = drafts.get(ticketId) ?? createDraft({ ticketId, content, updatedBy });
  const next: InboxDraft = {
    ...current,
    content,
    approved: false,
    updatedAt: now(),
    updatedBy,
    revision: current.revision + (drafts.has(ticketId) ? 1 : 0),
  };
  drafts.set(ticketId, next);
  return next;
};

export const approveDraftContent = (
  ticketId: string,
  content: string,
  updatedBy = "Operator",
): InboxDraft => {
  const current = drafts.get(ticketId) ?? createDraft({ ticketId, content, updatedBy });
  const approvedDraft: InboxDraft = {
    ...current,
    content,
    approved: true,
    updatedAt: now(),
    updatedBy,
    revision: current.revision + (drafts.has(ticketId) ? 1 : 0),
  };
  drafts.set(ticketId, approvedDraft);
  return approvedDraft;
};

export const getDraftForTicket = (ticketId: string): InboxDraft | undefined => drafts.get(ticketId);

export const resetInboxDraftStore = () => {
  drafts.clear();
  feedbackLog.length = 0;
};

export const recordDraftFeedback = (
  ticketId: string,
  draftId: string,
  vote: InboxFeedbackVote,
  submittedBy: string,
  comment?: string,
): InboxDraftFeedback => {
  const timestamp = now();
  const feedback: InboxDraftFeedback = {
    id: randomUUID(),
    ticketId,
    draftId,
    vote,
    comment,
    submittedAt: timestamp,
    submittedBy,
  };

  const draft = drafts.get(ticketId);
  if (draft) {
    draft.feedback = [...draft.feedback, feedback];
    drafts.set(ticketId, draft);
  }

  feedbackLog.push(feedback);
  return feedback;
};

export const listDraftFeedback = (): InboxDraftFeedback[] => [...feedbackLog];
