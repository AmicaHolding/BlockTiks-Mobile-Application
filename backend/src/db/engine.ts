// SqlDocClient: a drop-in send()-compatible implementation of the subset of
// DynamoDB DocumentClient commands used by db.ts, backed by a relational
// store (SQLite locally, Cloudflare D1 in the Worker). The single-table key
// scheme (pk/sk/gsi1/gsi2) is preserved verbatim — every item is stored as
// JSON with its key attributes duplicated into indexed columns.

import { applyUpdate, evalCondition, parseKeyCondition, type ExprContext } from './expr';
import type { RelDb } from './store';

type Doc = Record<string, unknown>;

interface CmdInput {
  TableName?: string;
  Key?: Doc;
  Item?: Doc;
  IndexName?: string;
  KeyConditionExpression?: string;
  FilterExpression?: string;
  ConditionExpression?: string;
  UpdateExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
  ScanIndexForward?: boolean;
  Limit?: number;
  ExclusiveStartKey?: Doc;
  ReturnValues?: string;
  RequestItems?: Record<string, unknown>;
  TransactItems?: Record<string, CmdInput>[];
  ProjectionExpression?: string;
}

function ctxOf(input: CmdInput): ExprContext {
  return { names: input.ExpressionAttributeNames, values: input.ExpressionAttributeValues };
}

function condFail(cancellation = false): never {
  const e = new Error(cancellation ? 'Transaction cancelled' : 'The conditional request failed');
  e.name = cancellation ? 'TransactionCanceledException' : 'ConditionalCheckFailedException';
  throw e;
}

// Strip undefined values recursively (DocumentClient removeUndefinedValues).
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined) as T;
  if (v && typeof v === 'object') {
    const o: Doc = {};
    for (const [k, x] of Object.entries(v as Doc)) if (x !== undefined) o[k] = clean(x);
    return o as T;
  }
  return v;
}

export class SqlDocClient {
  constructor(private db: RelDb) {}

  async send(command: { input?: CmdInput } & object): Promise<Record<string, unknown>> {
    const name = command.constructor.name;
    const input = (command as { input?: CmdInput }).input ?? {};
    switch (name) {
      case 'GetCommand': return this.get(input);
      case 'PutCommand': return this.put(input);
      case 'DeleteCommand': return this.del(input);
      case 'UpdateCommand': return this.update(input);
      case 'QueryCommand': return this.query(input);
      case 'ScanCommand': return this.scan(input);
      case 'BatchGetCommand': return this.batchGet(input);
      case 'BatchWriteCommand': return this.batchWrite(input);
      case 'TransactWriteCommand': return this.transact(input);
      default: throw new Error(`SqlDocClient: unsupported command ${name}`);
    }
  }

  private async getItem(pk: unknown, sk: unknown): Promise<Doc | undefined> {
    const rows = await this.db.all('SELECT data FROM items WHERE pk = ? AND sk = ?', [pk, sk]);
    return rows.length ? (JSON.parse(rows[0].data as string) as Doc) : undefined;
  }

  private writeStmt(item: Doc): { sql: string; params: unknown[] } {
    const it = clean(item);
    return {
      sql: `INSERT OR REPLACE INTO items (pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        it.pk, it.sk,
        it.gsi1pk ?? null, it.gsi1sk ?? null,
        it.gsi2pk ?? null, it.gsi2sk ?? null,
        JSON.stringify(it),
      ],
    };
  }

  private deleteStmt(key: Doc): { sql: string; params: unknown[] } {
    return { sql: 'DELETE FROM items WHERE pk = ? AND sk = ?', params: [key.pk, key.sk] };
  }

  private async get(input: CmdInput) {
    const item = await this.getItem(input.Key!.pk, input.Key!.sk);
    return { Item: item };
  }

  private async put(input: CmdInput) {
    const item = clean(input.Item!);
    if (input.ConditionExpression) {
      const existing = await this.getItem(item.pk, item.sk);
      if (!evalCondition(input.ConditionExpression, existing, ctxOf(input))) {
        condFail();
      }
    }
    await this.db.batch([this.writeStmt(item)]);
    return {};
  }

  private async del(input: CmdInput) {
    const key = input.Key!;
    if (input.ConditionExpression) {
      const existing = await this.getItem(key.pk, key.sk);
      if (!evalCondition(input.ConditionExpression, existing, ctxOf(input))) condFail();
    }
    await this.db.batch([this.deleteStmt(key)]);
    return {};
  }

  private async update(input: CmdInput) {
    const key = input.Key!;
    const existing = await this.getItem(key.pk, key.sk);
    const base = existing ?? { ...key };
    if (!evalCondition(input.ConditionExpression, existing, ctxOf(input))) condFail();
    const updated = applyUpdate(input.UpdateExpression!, base, ctxOf(input));
    updated.pk = key.pk;
    updated.sk = key.sk;
    await this.db.batch([this.writeStmt(updated)]);
    return { Attributes: input.ReturnValues === 'ALL_NEW' ? updated : undefined };
  }

  // ---------- query / scan ----------

  private keyCols(input: CmdInput): { pk: string; sk: string } {
    if (input.IndexName === 'gsi1') return { pk: 'gsi1pk', sk: 'gsi1sk' };
    if (input.IndexName === 'gsi2') return { pk: 'gsi2pk', sk: 'gsi2sk' };
    return { pk: 'pk', sk: 'sk' };
  }

  private skPredicate(col: string, kc: ReturnType<typeof parseKeyCondition>['skCond']): { sql: string; params: unknown[] } {
    if (!kc) return { sql: '', params: [] };
    switch (kc.op) {
      case 'eq': return { sql: `${col} = ?`, params: [kc.v] };
      case 'begins_with': {
        // range form: col >= prefix AND col < prefix-with-last-char+1
        const p = String(kc.v);
        const hi = p.slice(0, -1) + String.fromCodePoint(p.codePointAt(p.length - 1)! + 1);
        return { sql: `${col} >= ? AND ${col} < ?`, params: [p, hi] };
      }
      case 'lt': return { sql: `${col} < ?`, params: [kc.v] };
      case 'le': return { sql: `${col} <= ?`, params: [kc.v] };
      case 'gt': return { sql: `${col} > ?`, params: [kc.v] };
      case 'ge': return { sql: `${col} >= ?`, params: [kc.v] };
      case 'between': return { sql: `${col} BETWEEN ? AND ?`, params: [kc.v, kc.v2] };
    }
  }

  private async query(input: CmdInput) {
    const cols = this.keyCols(input);
    const kc = parseKeyCondition(input.KeyConditionExpression!, ctxOf(input));
    const forward = input.ScanIndexForward !== false;
    const pred = this.skPredicate(cols.sk, kc.skCond);
    const params: unknown[] = [kc.pkVal];
    let where = `${cols.pk} = ?`;
    if (pred.sql) {
      where += ` AND ${pred.sql}`;
      params.push(...pred.params);
    }
    if (input.ExclusiveStartKey) {
      const lek = input.ExclusiveStartKey;
      const lastSk = lek[cols.sk];
      const cmp = forward ? '>' : '<';
      where += ` AND (${cols.sk} ${cmp} ? OR (${cols.sk} = ? AND (pk ${cmp} ? OR (pk = ? AND sk ${cmp} ?))))`;
      params.push(lastSk, lastSk, lek.pk, lek.pk, lek.sk);
    }
    const limit = input.Limit ?? 0;
    const fetch = limit > 0 ? limit + 1 : 0;
    const sql =
      `SELECT data, pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk FROM items WHERE ${where} ` +
      `ORDER BY ${cols.sk} ${forward ? 'ASC' : 'DESC'}, pk ${forward ? 'ASC' : 'DESC'}, sk ${forward ? 'ASC' : 'DESC'}` +
      (fetch ? ` LIMIT ${fetch}` : '');
    const rows = await this.db.all(sql, params);
    let items = rows.map((r) => JSON.parse(r.data as string) as Doc);
    let lastKey: Doc | undefined;
    if (limit > 0 && items.length > limit) {
      items = items.slice(0, limit);
      const last = rows[limit - 1];
      lastKey = { pk: last.pk, sk: last.sk };
      for (const k of ['gsi1pk', 'gsi1sk', 'gsi2pk', 'gsi2sk']) {
        if (last[k] !== null && last[k] !== undefined) lastKey[k] = last[k];
      }
    }
    if (input.FilterExpression) {
      items = items.filter((it) => evalCondition(input.FilterExpression, it, ctxOf(input)));
    }
    return { Items: items, Count: items.length, LastEvaluatedKey: lastKey };
  }

  private async scan(input: CmdInput) {
    const params: unknown[] = [];
    let where = '1=1';
    if (input.ExclusiveStartKey) {
      where = '(pk > ? OR (pk = ? AND sk > ?))';
      params.push(input.ExclusiveStartKey.pk, input.ExclusiveStartKey.pk, input.ExclusiveStartKey.sk);
    }
    const limit = input.Limit ?? 0;
    const sql =
      `SELECT data, pk, sk FROM items WHERE ${where} ORDER BY pk, sk` +
      (limit ? ` LIMIT ${limit + 1}` : '');
    const rows = await this.db.all(sql, params);
    let items = rows.map((r) => JSON.parse(r.data as string) as Doc);
    let lastKey: Doc | undefined;
    if (limit > 0 && items.length > limit) {
      items = items.slice(0, limit);
      lastKey = { pk: rows[limit - 1].pk, sk: rows[limit - 1].sk };
    }
    if (input.FilterExpression) {
      items = items.filter((it) => evalCondition(input.FilterExpression, it, ctxOf(input)));
    }
    return { Items: items, Count: items.length, LastEvaluatedKey: lastKey };
  }

  private async batchGet(input: CmdInput) {
    const responses: Record<string, Doc[]> = {};
    for (const [table, req] of Object.entries(input.RequestItems ?? {})) {
      const keys = ((req as { Keys?: Doc[] }).Keys ?? []) as Doc[];
      const items: Doc[] = [];
      for (let i = 0; i < keys.length; i += 100) {
        const slice = keys.slice(i, i + 100);
        const cond = slice.map(() => '(pk = ? AND sk = ?)').join(' OR ');
        const rows = await this.db.all(
          `SELECT data FROM items WHERE ${cond}`,
          slice.flatMap((k) => [k.pk, k.sk]),
        );
        items.push(...rows.map((r) => JSON.parse(r.data as string) as Doc));
      }
      responses[table] = items;
    }
    return { Responses: responses };
  }

  private async batchWrite(input: CmdInput) {
    const stmts: { sql: string; params: unknown[] }[] = [];
    for (const reqs of Object.values(input.RequestItems ?? {})) {
      for (const req of reqs as { PutRequest?: { Item: Doc }; DeleteRequest?: { Key: Doc } }[]) {
        if (req.PutRequest) stmts.push(this.writeStmt(req.PutRequest.Item));
        else if (req.DeleteRequest) stmts.push(this.deleteStmt(req.DeleteRequest.Key));
      }
    }
    await this.db.batch(stmts);
    return {};
  }

  // ---------- transactions ----------

  private async transact(input: CmdInput) {
    const stmts: { sql: string; params: unknown[] }[] = [];
    try {
      for (const t of input.TransactItems ?? []) {
        if (t.ConditionCheck) {
          const cc = t.ConditionCheck;
          const existing = await this.getItem(cc.Key!.pk, cc.Key!.sk);
          if (!evalCondition(cc.ConditionExpression, existing, ctxOf(cc))) {
            condFail(true);
          }
        } else if (t.Put) {
          const p = t.Put;
          const item = clean(p.Item!);
          if (p.ConditionExpression) {
            const existing = await this.getItem(item.pk, item.sk);
            if (!evalCondition(p.ConditionExpression, existing, ctxOf(p))) {
              condFail(true);
            }
          }
          stmts.push(this.writeStmt(item));
        } else if (t.Update) {
          const u = t.Update;
          const existing = await this.getItem(u.Key!.pk, u.Key!.sk);
          const base = existing ?? { ...u.Key };
          if (!evalCondition(u.ConditionExpression, existing, ctxOf(u))) condFail(true);
          const updated = applyUpdate(u.UpdateExpression!, base, ctxOf(u));
          updated.pk = u.Key!.pk;
          updated.sk = u.Key!.sk;
          stmts.push(this.writeStmt(updated));
        } else if (t.Delete) {
          const d = t.Delete;
          if (d.ConditionExpression) {
            const existing = await this.getItem(d.Key!.pk, d.Key!.sk);
            if (!evalCondition(d.ConditionExpression, existing, ctxOf(d))) {
              condFail(true);
            }
          }
          stmts.push(this.deleteStmt(d.Key!));
        }
      }
    } catch (e) {
      if ((e as Error).name === 'ConditionalCheckFailedException') {
        (e as Error).name = 'TransactionCanceledException';
      }
      throw e;
    }
    await this.db.batch(stmts);
    return {};
  }
}
