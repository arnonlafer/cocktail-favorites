-- Sync payloads keyed by sync code (same JSON shape as Workers KV).
CREATE TABLE IF NOT EXISTS sync_payloads (
  sync_code TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
