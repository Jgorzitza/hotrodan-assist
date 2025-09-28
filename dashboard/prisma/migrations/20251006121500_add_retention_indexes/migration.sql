-- Add indexes supporting retention cron queries
CREATE INDEX "StoreSecret_rotationReminderAt_idx" ON "public"."StoreSecret"("rotationReminderAt");
CREATE INDEX "ConnectionEvent_createdAt_idx" ON "public"."ConnectionEvent"("createdAt");
