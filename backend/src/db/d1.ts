// Cloudflare D1 RelDb adapter. The Worker entry (worker.ts) constructs this
// around the `DB` binding from wrangler.toml.
import { SCHEMA_SQL, type RelDb } from './store';

// Minimal structural typings for the D1 client API (avoid a wrangler/types dep).
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(stmts: D1PreparedStatement[]): Promise<unknown[]>;
  exec(sql: string): Promise<unknown>;
}

export function openD1(db: D1Database): RelDb {
  return {
    async exec(sql: string) {
      await db.exec(sql);
    },
    async all(sql: string, params: unknown[] = []) {
      const res = await db.prepare(sql).bind(...params).all();
      return res.results;
    },
    async batch(stmts: { sql: string; params?: unknown[] }[]) {
      await db.batch(
        stmts.map((s) => db.prepare(s.sql).bind(...(s.params ?? []))),
      );
    },
  };
}

export { SCHEMA_SQL };
