import { NextRequest, NextResponse } from 'next/server';
import { DraftStatus } from '@prisma/client';
import { createDraft, markDraftStatus } from '../../../../lib/repositories/drafts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      triggerMessageId,
      authorUserId,
      modelKey,
      promptVersion,
      suggestedText,
      suggestedHtml,
      topSources,
      status,
    } = body;

    if (!conversationId || !modelKey || !promptVersion || !suggestedText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const draft = await createDraft({
      conversationId,
      triggerMessageId,
      authorUserId,
      modelKey,
      promptVersion,
      suggestedText,
      suggestedHtml,
      topSources,
    });

    if (status && Object.values(DraftStatus).includes(status)) {
      await markDraftStatus(draft.id, status as DraftStatus);
    }

    return NextResponse.json({ ok: true, draftId: draft.id });
  } catch (error) {
    console.error('Error creating draft', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
