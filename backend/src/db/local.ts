// Local RelDb backed by better-sqlite3. Imported lazily by aws.ts only when
// DB_ENGINE=sqlite (the default for local dev), so the Cloudflare Worker
// bundle never tries to resolve the native module.
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { SCHEMA_SQL, type RelDb } from './store';

export function openLocalDb(path: string): RelDb {
  // Indirection keeps bundlers (esbuild/wrangler) from statically resolving
  // the native module; this path only ever runs under Node.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = (require as (m: string) => any)(
    ['better', 'sqlite3'].join('-'),
  );
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  return {
    async exec(sql: string) {
      db.exec(sql);
    },
    async all(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...params) as Record<string, unknown>[];
    },
    async batch(stmts: { sql: string; params?: unknown[] }[]) {
      const run = db.transaction(() => {
        for (const s of stmts) db.prepare(s.sql).run(...(s.params ?? []));
      });
      run();
    },
  };
}
