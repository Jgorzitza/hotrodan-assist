import { NextRequest, NextResponse } from 'next/server';
import { ChannelType, MessageDirection } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import { upsertConversationWithMessage } from '../../../../../lib/repositories/conversations';

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const body = await request.json();
    const {
      accountId,
      channelId,
      channelExternalId,
      channelType,
      channelName,
      channelMetadata,
      externalId,
      subject,
      customerEmail,
      customerName,
      direction,
      bodyText,
      bodyHtml,
      metadata,
      sentAt,
    } = body;

    if (!accountId || (!channelId && !channelExternalId) || !direction || !bodyText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Object.values(MessageDirection).includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction value' }, { status: 400 });
    }

    let resolvedChannelId = channelId as string | undefined;
    if (!resolvedChannelId && channelExternalId) {
      if (!channelType || !Object.values(ChannelType).includes(channelType)) {
        return NextResponse.json({ error: 'channelType required when channelId not provided' }, { status: 400 });
      }

      const channel = await prisma.channel.upsert({
        where: { externalId: channelExternalId },
        update: {
          name: channelName ?? undefined,
          metadata: channelMetadata ?? undefined,
        },
        create: {
          accountId,
          externalId: channelExternalId,
          type: channelType as ChannelType,
          name: channelName ?? channelExternalId,
          metadata: channelMetadata ?? {},
        },
      });
      resolvedChannelId = channel.id;
    }

    if (!resolvedChannelId) {
      return NextResponse.json({ error: 'Unable to resolve channel' }, { status: 400 });
    }

    const conversation = await upsertConversationWithMessage({
      conversationExternalId: params.conversationId,
      accountId,
      channelId: resolvedChannelId,
      message: {
        externalId,
        subject,
        bodyText,
        bodyHtml,
        direction: direction as MessageDirection,
        metadata,
        sentAt: sentAt ? new Date(sentAt) : undefined,
      },
    });

    if (customerEmail || customerName || subject) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          customerEmail: customerEmail ?? undefined,
          customerName: customerName ?? undefined,
          subject: subject ?? conversation.subject ?? undefined,
        },
      });
    }

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    console.error('Error upserting conversation message', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
