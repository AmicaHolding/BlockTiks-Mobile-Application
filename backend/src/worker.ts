// Cloudflare Worker entry: binds the D1 database and adapts fetch() to the
// Fastify app via app.inject(). Requires nodejs_compat (wrangler.toml) for
// crypto/JWT and the Stripe SDK. Build: `npm run dev:worker` (wrangler dev
// gives you a local D1) or deploy with `npm run deploy:worker`.
import { buildApp } from './app';
import { useDocClient } from './aws';
import { SqlDocClient } from './db/engine';
import { openD1, type D1Database } from './db/d1';
import { SCHEMA_SQL } from './db/store';

interface Env {
  DB: D1Database;
}

let ready: Promise<unknown> | undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!ready) {
      const db = openD1(env.DB);
      useDocClient(new SqlDocClient(db));
      ready = db.exec(SCHEMA_SQL);
    }
    await ready;

    const app = buildApp();
    await app.ready();

    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const res = await app.inject({
      method: request.method as 'GET',
      url: url.pathname + url.search,
      headers,
      payload: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.text(),
    });
    return new Response(res.rawPayload, {
      status: res.statusCode,
      headers: res.headers as Record<string, string>,
    });
  },
};
