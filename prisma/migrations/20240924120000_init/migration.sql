-- Initial Prisma schema migration
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ChannelType" AS ENUM ('email', 'chat', 'shopify', 'slack');
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound', 'system');
CREATE TYPE "DraftStatus" AS ENUM ('pending', 'sent', 'superseded', 'archived');
CREATE TYPE "ActionType" AS ENUM ('approve', 'edit', 'reject');
CREATE TYPE "JobType" AS ENUM ('crawl', 'ingest_goldens', 'corrections_sync');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

CREATE TABLE "Account" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'agent',
  "authProvider" TEXT NOT NULL,
  "authSubject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "User_email_key" UNIQUE ("email")
);

CREATE TABLE "Channel" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "type" "ChannelType" NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Channel_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Channel_externalId_key" UNIQUE ("externalId")
);

CREATE TABLE "Conversation" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "subject" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "customerEmail" TEXT,
  "customerName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Conversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Conversation_externalId_key" UNIQUE ("externalId")
);

CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "externalId" TEXT,
  "direction" "MessageDirection" NOT NULL,
  "subject" TEXT,
  "bodyText" TEXT NOT NULL,
  "bodyHtml" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Draft" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "triggerMessageId" TEXT,
  "authorUserId" TEXT,
  "modelKey" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "status" "DraftStatus" NOT NULL DEFAULT 'pending',
  "suggestedText" TEXT NOT NULL,
  "suggestedHtml" TEXT,
  "topSources" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Draft_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Draft_triggerMessageId_fkey" FOREIGN KEY ("triggerMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Draft_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Draft_triggerMessageId_key" ON "Draft" ("triggerMessageId");

CREATE TABLE "DraftAction" (
  "id" TEXT PRIMARY KEY,
  "draftId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ActionType" NOT NULL,
  "finalText" TEXT,
  "finalHtml" TEXT,
  "sentMsgId" TEXT,
  "notes" TEXT,
  "diffJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "messageId" TEXT,
  CONSTRAINT "DraftAction_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DraftAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DraftAction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LearningSample" (
  "id" TEXT PRIMARY KEY,
  "draftId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "diffJson" JSONB NOT NULL,
  "embeddingsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningSample_draftId_key" UNIQUE ("draftId"),
  CONSTRAINT "LearningSample_actionId_key" UNIQUE ("actionId"),
  CONSTRAINT "LearningSample_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningSample_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "DraftAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Attachment" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "JobRun" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "type" "JobType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'queued',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "error" TEXT,
  "metrics" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobRun_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "SourceDocument" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "title" TEXT,
  "hash" TEXT,
  "indexedAt" TIMESTAMP(3) NOT NULL,
  "nextRefreshAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT "SourceDocument_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SourceDocument_sourceUrl_key" UNIQUE ("sourceUrl")
);

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_channel_account_type" ON "Channel" ("accountId", "type");
CREATE INDEX "idx_conversation_account_status" ON "Conversation" ("accountId", "status");
CREATE INDEX "idx_conversation_channel_created" ON "Conversation" ("channelId", "createdAt");
CREATE INDEX "idx_message_conversation_sent" ON "Message" ("conversationId", "sentAt");
CREATE INDEX "idx_draft_conversation_status" ON "Draft" ("conversationId", "status");
CREATE INDEX "idx_draft_status_created" ON "Draft" ("status", "createdAt");
CREATE INDEX "idx_action_draft" ON "DraftAction" ("draftId");
CREATE INDEX "idx_action_user_created" ON "DraftAction" ("userId", "createdAt");
CREATE INDEX "idx_attachment_message" ON "Attachment" ("messageId");
CREATE INDEX "idx_jobrun_account_type_created" ON "JobRun" ("accountId", "type", "createdAt");
CREATE INDEX "idx_notification_account_created" ON "Notification" ("accountId", "createdAt");
CREATE INDEX "idx_notification_user_created" ON "Notification" ("userId", "createdAt");
