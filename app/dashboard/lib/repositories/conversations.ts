import { prisma } from '../db';
import { MessageDirection, Prisma } from '@prisma/client';

type UpsertMessageInput = {
  conversationExternalId: string;
  accountId: string;
  channelId: string;
  message: {
    externalId?: string | null;
    subject?: string | null;
    bodyText: string;
    bodyHtml?: string | null;
    direction: MessageDirection;
    metadata?: Prisma.JsonValue;
    sentAt?: Date;
  };
};

export async function upsertConversationWithMessage(input: UpsertMessageInput) {
  const { conversationExternalId, accountId, channelId, message } = input;

  return prisma.conversation.upsert({
    where: { externalId: conversationExternalId },
    create: {
      externalId: conversationExternalId,
      accountId,
      channelId,
      messages: {
        create: {
          direction: message.direction,
          externalId: message.externalId ?? undefined,
          subject: message.subject ?? undefined,
          bodyText: message.bodyText,
          bodyHtml: message.bodyHtml ?? undefined,
          metadata: message.metadata ?? Prisma.JsonNull,
          sentAt: message.sentAt ?? new Date(),
        },
      },
    },
    update: {
      accountId,
      channelId,
      messages: {
        create: {
          direction: message.direction,
          externalId: message.externalId ?? undefined,
          subject: message.subject ?? undefined,
          bodyText: message.bodyText,
          bodyHtml: message.bodyHtml ?? undefined,
          metadata: message.metadata ?? Prisma.JsonNull,
          sentAt: message.sentAt ?? new Date(),
        },
      },
    },
    include: {
      messages: true,
    },
  });
}
