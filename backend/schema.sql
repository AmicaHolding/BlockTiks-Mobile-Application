-- Sahra (BlockTiks) D1 schema — single-table document store.
-- Items keep their Dynamo-style keys (pk/sk + GSI keys) in indexed columns;
-- the full item lives in `data` as JSON. Applied automatically on local boot
-- (db/local.ts) and via `wrangler d1 execute` / migrations for remote D1.

CREATE TABLE IF NOT EXISTS items (
  pk TEXT NOT NULL,
  sk TEXT NOT NULL,
  gsi1pk TEXT,
  gsi1sk TEXT,
  gsi2pk TEXT,
  gsi2sk TEXT,
  data TEXT NOT NULL,
  PRIMARY KEY (pk, sk)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_items_gsi1 ON items (gsi1pk, gsi1sk);
CREATE INDEX IF NOT EXISTS idx_items_gsi2 ON items (gsi2pk, gsi2sk);
