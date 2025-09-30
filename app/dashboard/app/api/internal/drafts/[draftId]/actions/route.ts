import { NextRequest, NextResponse } from 'next/server';
import { ActionType, DraftStatus } from '@prisma/client';
import { prisma } from '../../../../../lib/db';
import {
  attachLearningSample,
  createOutboundMessage,
  markDraftStatus,
  recordDraftAction,
} from '../../../../../lib/repositories/drafts';

export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const body = await request.json();
    const {
      userId,
      type,
      finalText,
      finalHtml,
      sentMsgId,
      notes,
      diffJson,
      status,
      createOutbound,
      embeddingsJson,
    } = body;

    if (!userId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Object.values(ActionType).includes(type)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    const action = await recordDraftAction({
      draftId: params.draftId,
      userId,
      type: type as ActionType,
      finalText,
      finalHtml,
      sentMsgId,
      notes,
      diffJson,
    });

    const draft = await prisma.draft.findUnique({
      where: { id: params.draftId },
      select: { conversationId: true },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (createOutbound && typeof createOutbound !== 'object') {
      return NextResponse.json({ error: 'createOutbound must be an object when provided' }, { status: 400 });
    }

    let outboundMessageId: string | undefined;
    if (createOutbound && finalText) {
      const message = await createOutboundMessage({
        conversationId: draft.conversationId,
        bodyText: finalText,
        bodyHtml: finalHtml,
        metadata: createOutbound.metadata,
        sentAt: createOutbound.sentAt ? new Date(createOutbound.sentAt) : undefined,
      });
      outboundMessageId = message.id;

      await prisma.draftAction.update({
        where: { id: action.id },
        data: { messageId: message.id },
      });
    }

    if (diffJson) {
      await attachLearningSample({
        draftActionId: action.id,
        draftId: params.draftId,
        diffJson,
        embeddingsJson,
      });
    }

    if (status && Object.values(DraftStatus).includes(status)) {
      await markDraftStatus(params.draftId, status as DraftStatus);
    }

    return NextResponse.json({ ok: true, actionId: action.id, outboundMessageId });
  } catch (error) {
    console.error('Error recording draft action', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
