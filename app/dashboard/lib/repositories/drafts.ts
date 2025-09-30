import { ActionType, DraftStatus, MessageDirection, Prisma } from '@prisma/client';
import { prisma } from '../db';

export type CreateDraftInput = {
  conversationId: string;
  triggerMessageId?: string | null;
  authorUserId?: string | null;
  modelKey: string;
  promptVersion: string;
  suggestedText: string;
  suggestedHtml?: string | null;
  topSources?: Prisma.JsonValue;
};

export async function createDraft(input: CreateDraftInput) {
  return prisma.draft.create({
    data: {
      conversationId: input.conversationId,
      triggerMessageId: input.triggerMessageId ?? undefined,
      authorUserId: input.authorUserId ?? undefined,
      modelKey: input.modelKey,
      promptVersion: input.promptVersion,
      suggestedText: input.suggestedText,
      suggestedHtml: input.suggestedHtml ?? undefined,
      topSources: input.topSources ?? [],
    },
    include: {
      conversation: true,
    },
  });
}

export type RecordDraftActionInput = {
  draftId: string;
  userId: string;
  type: ActionType;
  finalText?: string | null;
  finalHtml?: string | null;
  sentMsgId?: string | null;
  notes?: string | null;
  diffJson?: Prisma.JsonValue;
};

export async function recordDraftAction(input: RecordDraftActionInput) {
  return prisma.draftAction.create({
    data: {
      draftId: input.draftId,
      userId: input.userId,
      type: input.type,
      finalText: input.finalText ?? undefined,
      finalHtml: input.finalHtml ?? undefined,
      sentMsgId: input.sentMsgId ?? undefined,
      notes: input.notes ?? undefined,
      diffJson: input.diffJson ?? Prisma.JsonNull,
    },
  });
}

export async function markDraftStatus(draftId: string, status: DraftStatus) {
  return prisma.draft.update({
    where: { id: draftId },
    data: { status },
  });
}

export async function createOutboundMessage(params: {
  conversationId: string;
  bodyText: string;
  bodyHtml?: string | null;
  metadata?: Prisma.JsonValue;
  sentAt?: Date;
}) {
  return prisma.message.create({
    data: {
      conversationId: params.conversationId,
      direction: MessageDirection.outbound,
      bodyText: params.bodyText,
      bodyHtml: params.bodyHtml ?? undefined,
      metadata: params.metadata ?? Prisma.JsonNull,
      sentAt: params.sentAt ?? new Date(),
    },
  });
}

export async function attachLearningSample(params: {
  draftActionId: string;
  draftId: string;
  diffJson: Prisma.JsonValue;
  embeddingsJson?: Prisma.JsonValue;
}) {
  return prisma.learningSample.create({
    data: {
      draftId: params.draftId,
      actionId: params.draftActionId,
      diffJson: params.diffJson,
      embeddingsJson: params.embeddingsJson ?? Prisma.JsonNull,
    },
  });
}
