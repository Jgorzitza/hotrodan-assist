import { PrismaClient, ChannelType, MessageDirection, DraftStatus, ActionType, JobStatus, JobType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const account = await prisma.account.upsert({
    where: { id: 'seed-hotrodan' },
    update: {},
    create: {
      id: 'seed-hotrodan',
      name: 'Hot Rod AN',
    },
  });

  const [admin, agent] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'owner@hotrodan.com' },
      update: {},
      create: {
        accountId: account.id,
        email: 'owner@hotrodan.com',
        displayName: 'Owner',
        role: 'admin',
        authProvider: 'magic_link',
        authSubject: 'owner@hotrodan.com',
      },
    }),
    prisma.user.upsert({
      where: { email: 'agent@hotrodan.com' },
      update: {},
      create: {
        accountId: account.id,
        email: 'agent@hotrodan.com',
        displayName: 'Agent',
        role: 'agent',
        authProvider: 'magic_link',
        authSubject: 'agent@hotrodan.com',
      },
    }),
  ]);

  const channel = await prisma.channel.upsert({
    where: { externalId: 'zoho-mailbox-hotrodan' },
    update: {},
    create: {
      accountId: account.id,
      externalId: 'zoho-mailbox-hotrodan',
      name: 'Support Inbox',
      type: ChannelType.email,
      metadata: { provider: 'zoho' },
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      accountId: account.id,
      channelId: channel.id,
      externalId: 'TICKET-123',
      subject: 'Fuel pump sizing for 400hp build',
      customerEmail: 'customer@example.com',
      customerName: 'Pat Customer',
      messages: {
        create: [
          {
            direction: MessageDirection.inbound,
            subject: 'Fuel pump sizing for 400hp build',
            bodyText: 'Need help picking a pump for a 400hp build, running E85.',
            metadata: { source: 'zoho' },
            attachments: { create: [] },
          },
        ],
      },
    },
    include: { messages: true },
  });

  const message = conversation.messages[0];

  const draft = await prisma.draft.create({
    data: {
      conversationId: conversation.id,
      triggerMessageId: message.id,
      modelKey: 'gpt-4o-mini',
      promptVersion: 'v1',
      status: DraftStatus.pending,
      suggestedText: 'Here is your draft answer...',
      topSources: [
        { title: 'EFI Basics', url: 'https://hotrodan.com/efi-basics', score: 0.91 },
      ],
    },
  });

  const outbound = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: MessageDirection.outbound,
      bodyText: 'Approved draft text to be sent to the customer.',
      metadata: { source: 'dashboard' },
    },
  });

  await prisma.draftAction.create({
    data: {
      draftId: draft.id,
      userId: admin.id,
      type: ActionType.approve,
      finalText: 'Approved draft text to be sent to the customer.',
      diffJson: { operations: [] },
      messageId: outbound.id,
    },
  });

  await prisma.jobRun.create({
    data: {
      accountId: account.id,
      type: JobType.crawl,
      status: JobStatus.succeeded,
      metrics: { documentsIndexed: 42 },
    },
  });

  await prisma.sourceDocument.create({
    data: {
      accountId: account.id,
      sourceUrl: 'https://hotrodan.com/blog/efi-basics',
      title: 'EFI Basics',
      indexedAt: new Date(),
      metadata: { checksum: 'abc123' },
    },
  });

  await prisma.notification.create({
    data: {
      accountId: account.id,
      userId: agent.id,
      type: 'draft_ready',
      payload: { draftId: draft.id },
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
