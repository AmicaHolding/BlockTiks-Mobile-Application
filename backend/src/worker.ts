// Cloudflare Worker entry: binds the D1 database and adapts fetch() to the
// Fastify app via app.inject(). Requires nodejs_compat (wrangler.toml) for
// crypto/JWT and the Stripe SDK. Build: `npm run dev:worker` (wrangler dev
// gives you a local D1) or deploy with `npm run deploy:worker`.
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { FastifyBaseLogger } from 'fastify';
import { buildApp } from './app';
import { useDocClient } from './aws';
import { SqlDocClient } from './db/engine';
import { openD1, type D1Database } from './db/d1';

// pino can't load in Workers; Fastify accepts any logger with this shape.
const consoleLogger: Record<string, unknown> = {
  level: 'info',
  info: (...a: unknown[]) => console.log(...a),
  warn: (...a: unknown[]) => console.warn(...a),
  error: (...a: unknown[]) => console.error(...a),
  fatal: (...a: unknown[]) => console.error(...a),
  debug: () => {},
  trace: () => {},
  silent: () => {},
  child: () => consoleLogger,
};

// Workers forbid eval after startup, and Fastify's router compiles code with
// new Function while routes register. Build the app at module load, driving
// avvio's process.nextTick with microtasks since timers don't run at startup.
process.nextTick = ((fn: (...a: unknown[]) => void, ...args: unknown[]) =>
  queueMicrotask(() => fn(...args))) as typeof process.nextTick;
const { app } = await (async () => {
  const a = buildApp({ loggerInstance: consoleLogger as unknown as FastifyBaseLogger });
  await a.ready();
  return { app: a };
})();

// light-my-request can't subclass workerd's http.ServerResponse, so feed
// Fastify minimal req/res objects directly.
function dispatch(method: string, url: string, headers: Record<string, string>, body: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = new Readable({ read() {} }) as Readable & Record<string, unknown>;
    Object.assign(req, {
      method,
      url,
      headers,
      httpVersion: '1.1',
      socket: { remoteAddress: headers['cf-connecting-ip'] ?? '127.0.0.1', encrypted: true },
    });
    req.connection = req.socket;
    if (body) req.push(body);
    req.push(null);

    const out: Buffer[] = [];
    const resHeaders = new Map<string, string | string[]>();
    const res = new EventEmitter() as EventEmitter & Record<string, unknown>;
    res.statusCode = 200;
    res.headersSent = false;
    res.writableEnded = false;
    res.socket = req.socket;
    res.setHeader = (k: string, v: string | string[]) => void resHeaders.set(k.toLowerCase(), v);
    res.getHeader = (k: string) => resHeaders.get(k.toLowerCase());
    res.getHeaders = () => Object.fromEntries(resHeaders);
    res.hasHeader = (k: string) => resHeaders.has(k.toLowerCase());
    res.removeHeader = (k: string) => void resHeaders.delete(k.toLowerCase());
    res.writeHead = (code: number, h?: Record<string, string | string[]>) => {
      res.statusCode = code;
      for (const [k, v] of Object.entries(h ?? {})) resHeaders.set(k.toLowerCase(), v);
      res.headersSent = true;
      return res;
    };
    res.write = (chunk: string | Uint8Array) => {
      out.push(Buffer.from(chunk));
      return true;
    };
    res.end = (chunk?: string | Uint8Array) => {
      if (chunk) out.push(Buffer.from(chunk));
      res.writableEnded = true;
      res.headersSent = true;
      const h = new Headers();
      for (const [k, v] of resHeaders) {
        for (const x of Array.isArray(v) ? v : [String(v)]) h.append(k, x);
      }
      const status = res.statusCode as number;
      const noBody = method === 'HEAD' || status === 204 || status === 304;
      resolve(new Response(noBody ? null : Buffer.concat(out), { status, headers: h }));
      res.emit('finish');
      return res;
    };
    try {
      (app.routing as (a: unknown, b: unknown) => void)(req, res);
    } catch (e) {
      reject(e);
    }
  });
}

interface Env {
  DB: D1Database;
}

let ready: Promise<unknown> | undefined;

function init(env: Env) {
  // Schema is applied out-of-band (`wrangler d1 execute --file schema.sql`);
  // D1 exec() cannot take multi-line statements.
  if (!ready) {
    useDocClient(new SqlDocClient(openD1(env.DB)));
    ready = Promise.resolve();
  }
  return ready;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await init(env);

    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
    return dispatch(request.method, url.pathname + url.search, headers, body);
  },
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await init(env);
    const { handler } = await import('./sweeper');
    await handler();
  },
};
