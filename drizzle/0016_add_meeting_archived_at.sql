ALTER TABLE "meeting_proposals" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "meeting_proposals_archived_at_idx" ON "meeting_proposals" ("archived_at");
CREATE INDEX IF NOT EXISTS "meeting_proposals_finalized_date_idx" ON "meeting_proposals" ("finalized_date");

