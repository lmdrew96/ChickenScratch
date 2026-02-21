CREATE TABLE IF NOT EXISTS webhook_events (
  svix_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);
