# Database / Prisma

This document defines the relational schema, Prisma configuration, and operational practices for the dashboard + approval workflow. It is the canonical reference for wiring persistence across the FastAPI stubs (`app/assistants`, `app/sync`) and the future Next.js dashboard. Treat it as a living specification: every schema or migration change should update this file.

## Goals
- Single Postgres database shared by the approval dashboard, background webhooks, and assistants API
- Prisma ORM for type-safe access from Node/Next services; FastAPI services will call via a thin internal API layer (tRPC/REST)
- Durable audit trail of every user/customer touch: inbound message → AI draft → human action → outbound
- Support multi-tenant future without blocking the current single-tenant deployment
- Keep RAG artifacts (Chroma vectors) out of Postgres; store only metadata and links

## Stack & Environment
- **Database**: Postgres 15 (Neon or RDS). Use `UTF8`, `pgcrypto` extension for IDs, `uuid-ossp` optional.
- **Schema owner**: `app_owner`; runtime role `app_rw`; readonly role `app_ro` for analytics.
- **Connection string env vars**:
  - `DATABASE_URL` (used by Prisma + dashboard server actions)
  - `SHADOW_DATABASE_URL` (for Prisma Migrate)
  - `DATABASE_URL_RO` (readonly queries / BI)
- Pooling handled by Prisma Data Proxy _or_ PgBouncer (session mode). Default max 5 connections per service.

Directory layout:
```
root/
  prisma/
    schema.prisma
    migrations/
  app/
    assistants/ <-- talks to internal API (not directly to DB)
    dashboard/  <-- Next.js app (future) with Prisma client
```

## Prisma Configuration
`prisma/schema.prisma` seeds the project:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "tracing"]
}

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```
- Generate client with `npx prisma generate`
- Apply migrations via `npx prisma migrate dev` (dev) and `npx prisma migrate deploy` (prod)
- Include `prisma/client` in the dashboard app only; FastAPI services should call the dashboard API instead of duplicating ORM libs

## Data Model Overview
The schema captures the lifecycle from inbound customer requests to outbound replies and learning signals.

### Core Entities
- **Account**: tenant container. Hardcode a single record for `Hot Rod AN`, but keep fields generic.
- **User**: dashboard operator or admin. OIDC identity (email, auth provider subject).
- **Channel**: integration endpoints (Zoho email, Intercom chat, Shopify comments).
- **Conversation**: thread within a channel (maps to Zoho ticket ID, chat thread ID, etc.).
- **Message**: inbound/outbound payloads associated to a conversation.
- **Draft**: AI-generated response proposal tied to a message/conversation.
- **DraftAction**: approve/edit/reject operations taken by humans; stores diff + metadata.
- **LearningSample**: normalized data for fine-tuning/correction (captures original draft + final message + diff).
- **Attachment**: file references associated to messages or drafts.

### Operational Entities
- **JobRun**: ingestion jobs (crawler, goldens) with status + metrics.
- **SourceDocument**: metadata mirror of documents ingested into Chroma (so dashboard can show provenance and freshness).
- **Notification**: internal feed items (e.g., “Draft ready”, “Ingest failed”).

### Enums (Prisma)
```prisma
enum ChannelType { email chat shopify slack }
enum MessageDirection { inbound outbound system }
enum DraftStatus { pending sent superseded archived }
enum ActionType { approve edit reject }
enum JobType { crawl ingest_goldens corrections_sync }
enum JobStatus { queued running succeeded failed }
```

## Prisma Schema (First Migration)
```prisma
model Account {
  id              String           @id @default(cuid())
  name            String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  users           User[]
  channels        Channel[]
  conversations   Conversation[]
  sourceDocuments SourceDocument[]
  jobRuns         JobRun[]
  notifications   Notification[]
}

model User {
  id            String        @id @default(cuid())
  accountId     String
  account       Account       @relation(fields: [accountId], references: [id])
  email         String        @unique
  displayName   String
  role          String        @default("agent")
  authProvider  String
  authSubject   String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  actions       DraftAction[]
  draftsCreated Draft[]       @relation("DraftCreator")
  notifications Notification[]
}

model Channel {
  id            String         @id @default(cuid())
  accountId     String
  account       Account        @relation(fields: [accountId], references: [id])
  type          ChannelType
  externalId    String         @unique
  name          String
  metadata      Json           @default("{}")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  conversations Conversation[]

  @@index([accountId, type], map: "idx_channel_account_type")
}

model Conversation {
  id            String         @id @default(cuid())
  accountId     String
  account       Account        @relation(fields: [accountId], references: [id])
  channelId     String
  channel       Channel        @relation(fields: [channelId], references: [id])
  externalId    String         @unique
  subject       String?
  status        String         @default("open")
  customerEmail String?
  customerName  String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  messages      Message[]
  drafts        Draft[]

  @@index([accountId, status], map: "idx_conversation_account_status")
  @@index([channelId, createdAt], map: "idx_conversation_channel_created")
}

model Message {
  id             String        @id @default(cuid())
  conversationId String
  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  externalId     String?
  direction      MessageDirection
  subject        String?
  bodyText       String
  bodyHtml       String?
  sentAt         DateTime      @default(now())
  metadata       Json           @default("{}")
  attachments    Attachment[]
  actions        DraftAction[] @relation("ActionMessage")
  triggeredDraft Draft?        @relation("DraftTrigger")

  @@index([conversationId, sentAt], map: "idx_message_conversation_sent")
}

model Draft {
  id               String          @id @default(cuid())
  conversationId   String
  conversation     Conversation    @relation(fields: [conversationId], references: [id])
  triggerMessageId String? @unique
  triggerMessage   Message?        @relation("DraftTrigger", fields: [triggerMessageId], references: [id])
  authorUserId     String?
  authorUser       User?           @relation("DraftCreator", fields: [authorUserId], references: [id])
  modelKey         String
  promptVersion    String
  status           DraftStatus     @default(pending)
  suggestedText    String
  suggestedHtml    String?
  topSources       Json            @default("[]")
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  actions          DraftAction[]
  learningSample   LearningSample?

  @@index([conversationId, status], map: "idx_draft_conversation_status")
  @@index([status, createdAt], map: "idx_draft_status_created")
}

model DraftAction {
  id            String        @id @default(cuid())
  draftId       String
  draft         Draft         @relation(fields: [draftId], references: [id])
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  type          ActionType
  finalText     String?
  finalHtml     String?
  sentMsgId     String?
  notes         String?
  diffJson      Json?
  createdAt     DateTime      @default(now())
  messageId     String?
  message       Message?      @relation("ActionMessage", fields: [messageId], references: [id])
  learningSample LearningSample?

  @@index([draftId], map: "idx_action_draft")
  @@index([userId, createdAt], map: "idx_action_user_created")
}

model LearningSample {
  id             String       @id @default(cuid())
  draftId        String       @unique
  draft          Draft        @relation(fields: [draftId], references: [id])
  actionId       String       @unique
  action         DraftAction  @relation(fields: [actionId], references: [id])
  diffJson       Json
  embeddingsJson Json?
  createdAt      DateTime     @default(now())
}

model Attachment {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id])
  fileName  String
  mimeType  String
  sizeBytes Int
  fileUrl   String
  createdAt DateTime @default(now())

  @@index([messageId], map: "idx_attachment_message")
}

model JobRun {
  id         String    @id @default(cuid())
  accountId  String
  account    Account   @relation(fields: [accountId], references: [id])
  type       JobType
  status     JobStatus @default(queued)
  startedAt  DateTime?
  finishedAt DateTime?
  error      String?
  metrics    Json?
  createdAt  DateTime  @default(now())

  @@index([accountId, type, createdAt], map: "idx_jobrun_account_type_created")
}

model SourceDocument {
  id            String   @id @default(cuid())
  accountId     String
  account       Account  @relation(fields: [accountId], references: [id])
  sourceUrl     String   @unique
  title         String?
  hash          String?
  indexedAt     DateTime
  nextRefreshAt DateTime?
  metadata      Json     @default("{}")
}

model Notification {
  id        String   @id @default(cuid())
  accountId String
  account   Account  @relation(fields: [accountId], references: [id])
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  type      String
  payload   Json     @default("{}")
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([accountId, createdAt], map: "idx_notification_account_created")
  @@index([userId, createdAt], map: "idx_notification_user_created")
}
```

### Notes
- Use `Json` columns for flexible metadata; ensure payloads are <64 KB.
- `diffJson` should contain a structured format (operations array) to replay edits.
- `LearningSample.embeddingsJson` is optional if we precompute vectors for retraining.
- Conversations default to `open`; close when we ingest upstream status.

## Access Patterns & Queries
- **Draft feed**: dashboard lists open conversations → latest inbound message → pending draft. Query uses `Conversation` + `Message` + `Draft` with `status = pending`.
- **Audit timeline**: fetch conversation with messages + draft actions ordered by timestamp (use Prisma `include`).
- **Corrections export**: nightly job selects `LearningSample` rows created in the last 24h to sync with the corrections layer.
- **Ingestion monitor**: dashboard polls `JobRun` table (filter `type` + `status`).

### Performance Guidelines
- Add composite indexes as usage patterns emerge (e.g., `@@index([conversationId, status])`).
- Partitioning not required initially; monitor `Message` growth (>10M rows) before introducing table partitioning.
- Keep attachments in S3/GCS; store signed URLs only.

## Migrations & Tooling
1. `npm run prisma:migrate:deploy` applies the canonical migration (`prisma/migrations/20240924120000_init`).
2. `npm run prisma:format` keeps the schema tidy; wire into CI.
3. Enable `prisma migrate diff` for preview deployments.
4. Add GitHub workflow that runs `prisma generate` + `prisma migrate diff --from-schema-datamodel ./prisma/schema.prisma --to-schema-datasource env(DATABASE_URL)` to catch drift.
5. Local verification loop:
   - `docker run -d -p 5433:5432 --name hotrodan-postgres postgres:15`
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/app SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/app_shadow npm run prisma:migrate:deploy`
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/app npm run seed`

Seed script (`scripts/seed.ts`): creates the Hot Rod AN tenant, admin/agent users, Zoho email channel, sample conversation/message, pending draft, approval action + outbound message, recent job run, source doc metadata, and a notification so designers have realistic fixtures.

## API Integration Plan
- **Dashboard (Next.js)**: create `lib/db.ts` with a singleton Prisma client; wrap mutations in server actions or tRPC procedures.
- **Assistants FastAPI**: expose REST endpoints (internal only) that mutate the DB via the dashboard backend. Keeps Python tiny and avoids duplicating Prisma.
- **Sync Service**: when Zoho or Shopify webhook arrives → call dashboard internal API `POST /internal/conversations/{id}/messages` to upsert rows + enqueue draft request.
- **Draft Workflow**:
  1. Webhook inserts inbound `Message` (direction `inbound`).
  2. Worker requests draft from RAG → creates `Draft` row with `pending` status + `topSources` metadata.
  3. Dashboard user approves/edits → create `DraftAction`, update `Draft.status` (`sent` or `superseded`), insert outbound `Message` (direction `outbound`).
  4. Sync service pushes outbound message to Zoho via adapter.

## Security & Compliance
- Restrict direct DB access to the dashboard backend; FastAPI pods talk to it via mTLS-protected internal network.
- Store minimal PII: email, name. Hash 3rd-party IDs if possible; avoid storing message bodies once archived (use retention policy).
- Configure row-level security later if multi-tenant expansion requires.
- Daily logical backups via managed Postgres provider.

## Next Steps
- Deploy Postgres and apply migrations via `npm run prisma:migrate:deploy`.
- Replace the assistants placeholder text with the real RAG draft pipeline and top sources.
- Flesh out dashboard views for the draft review queue using the repository helpers.
- Add observability (Prisma query logging, DataDog tracing) once the services run end-to-end.
