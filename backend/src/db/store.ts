// Relational storage abstraction for the document engine. Implemented by
// better-sqlite3 locally (local.ts) and Cloudflare D1 in the Worker (d1.ts).
export interface RelDb {
  /** Run schema/DDL statements. */
  exec(sql: string): Promise<void>;
  /** SELECT — returns all rows as plain objects. */
  all(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  /** Atomically execute a list of write statements (one transaction). */
  batch(stmts: { sql: string; params?: unknown[] }[]): Promise<void>;
}

// Single-table document schema. Items carry their Dynamo-style keys as real
// columns for indexed lookup; the whole item is kept as JSON in `data`.
export const SCHEMA_SQL = `
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
`;
