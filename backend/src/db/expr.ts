// Minimal DynamoDB expression engine: tokenizer, parser and evaluator for the
// subset of Update / Condition / KeyCondition expressions used by db.ts.
// Supports SET/ADD/REMOVE/DELETE update clauses, = <> < <= > >= comparisons,
// AND/OR/NOT, IN, BETWEEN, attribute_exists, attribute_not_exists,
// begins_with, contains, attribute_type, size, if_not_exists, list_append,
// and document paths with dotted segments and [n] list indexes.

export interface ExprContext {
  names?: Record<string, string>;
  values?: Record<string, unknown>;
}

type Tok =
  | { t: 'word'; v: string }
  | { t: 'name'; v: string }
  | { t: 'val'; v: string }
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' } | { t: 'rp' } | { t: 'comma' } | { t: 'dot' }
  | { t: 'lbr' } | { t: 'rbr' };

const KEYWORDS = new Set([
  'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'SET', 'ADD', 'REMOVE', 'DELETE',
]);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const isDigit = (c: string) => c >= '0' && c <= '9';
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '#') {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      toks.push({ t: 'name', v: src.slice(i + 1, j) }); i = j; continue;
    }
    if (c === ':') {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      toks.push({ t: 'val', v: src.slice(i + 1, j) }); i = j; continue;
    }
    if (c === "'") {
      let j = i + 1; let s = '';
      while (j < src.length && src[j] !== "'") { s += src[j]; j++; }
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (isDigit(c) || (c === '-' && isDigit(src[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: 'num', v: parseFloat(src.slice(i, j)) }); i = j; continue;
    }
    if (c === '<' || c === '>') {
      if (src[i + 1] === '=') { toks.push({ t: 'op', v: c + '=' }); i += 2; }
      else if (c === '<' && src[i + 1] === '>') { toks.push({ t: 'op', v: '<>' }); i += 2; }
      else { toks.push({ t: 'op', v: c }); i++; }
      continue;
    }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (c === '+') { toks.push({ t: 'op', v: '+' }); i++; continue; }
    if (c === '-') { toks.push({ t: 'op', v: '-' }); i++; continue; }
    if (c === '(') { toks.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { toks.push({ t: 'rp' }); i++; continue; }
    if (c === ',') { toks.push({ t: 'comma' }); i++; continue; }
    if (c === '.') { toks.push({ t: 'dot' }); i++; continue; }
    if (c === '[') { toks.push({ t: 'lbr' }); i++; continue; }
    if (c === ']') { toks.push({ t: 'rbr' }); i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const w = src.slice(i, j);
      toks.push({ t: 'word', v: w }); i = j; continue;
    }
    throw new Error(`expr: unexpected char '${c}' in ${src}`);
  }
  return toks;
}

// ---------- AST ----------
type Operand =
  | { kind: 'path'; path: PathSeg[] }
  | { kind: 'valref'; name: string }
  | { kind: 'lit'; value: unknown }
  | { kind: 'fn'; name: string; args: Operand[] }
  | { kind: 'arith'; op: '+' | '-'; l: Operand; r: Operand };

type PathSeg = { kind: 'attr'; name: string } | { kind: 'index'; index: number };

type Cond =
  | { kind: 'cmp'; op: string; l: Operand; r: Operand }
  | { kind: 'between'; o: Operand; lo: Operand; hi: Operand }
  | { kind: 'in'; o: Operand; list: Operand[] }
  | { kind: 'and' | 'or'; parts: Cond[] }
  | { kind: 'not'; c: Cond }
  | { kind: 'fn'; name: string; args: Operand[] };

class Parser {
  private pos = 0;
  constructor(private toks: Tok[]) {}
  private peek(): Tok | undefined { return this.toks[this.pos]; }
  private next(): Tok { const t = this.toks[this.pos++]; if (!t) throw new Error('expr: unexpected end'); return t; }
  private isKw(kw: string): boolean {
    const t = this.peek();
    return t?.t === 'word' && t.v.toUpperCase() === kw;
  }
  private takeKw(kw: string): boolean { if (this.isKw(kw)) { this.pos++; return true; } return false; }
  private expect(t: Tok['t']): Tok { const tok = this.next(); if (tok.t !== t) throw new Error(`expr: expected ${t}, got ${tok.t}`); return tok; }

  parseOperand(): Operand {
    return this.parseOperandImpl();
  }
  parseCondition(): Cond {
    const c = this.parseOr();
    if (this.pos !== this.toks.length) throw new Error(`expr: trailing tokens in condition`);
    return c;
  }
  private parseOr(): Cond {
    const parts = [this.parseAnd()];
    while (this.takeKw('OR')) parts.push(this.parseAnd());
    return parts.length === 1 ? parts[0] : { kind: 'or', parts };
  }
  private parseAnd(): Cond {
    const parts = [this.parseNot()];
    while (this.takeKw('AND')) parts.push(this.parseNot());
    return parts.length === 1 ? parts[0] : { kind: 'and', parts };
  }
  private parseNot(): Cond {
    if (this.takeKw('NOT')) return { kind: 'not', c: this.parseNot() };
    if (this.peek()?.t === 'lp') {
      // could be '(' cond ')' — but functions already consumed as operand;
      // try parenthesised condition
      this.next();
      const c = this.parseOr();
      this.expect('rp');
      return c;
    }
    return this.parsePredicate();
  }
  private parsePredicate(): Cond {
    const l = this.parseOperand();
    // Bare function predicates (attribute_exists(x), begins_with(a, b), ...)
    // unless a comparison follows (e.g. size(x) < :v).
    const next = this.peek();
    if (l.kind === 'fn' && !(next?.t === 'op' && ['=', '<>', '<', '<=', '>', '>='].includes(next.v))) {
      return { kind: 'fn', name: l.name, args: l.args };
    }
    if (this.takeKw('BETWEEN')) {
      const lo = this.parseOperand();
      if (!this.takeKw('AND')) throw new Error('expr: BETWEEN requires AND');
      const hi = this.parseOperand();
      return { kind: 'between', o: l, lo, hi };
    }
    if (this.takeKw('IN')) {
      this.expect('lp');
      const list: Operand[] = [this.parseOperand()];
      while (this.peek()?.t === 'comma') { this.next(); list.push(this.parseOperand()); }
      this.expect('rp');
      return { kind: 'in', o: l, list };
    }
    const t = this.next();
    if (t.t !== 'op' || !['=', '<>', '<', '<=', '>', '>='].includes(t.v)) {
      throw new Error(`expr: expected comparison op, got ${t.t}:${'v' in t ? t.v : ''}`);
    }
    const r = this.parseOperand();
    return { kind: 'cmp', op: t.v, l, r };
  }
  private parseOperandImpl(): Operand {
    const t = this.next();
    let base: Operand;
    if (t.t === 'val') base = { kind: 'valref', name: t.v };
    else if (t.t === 'num') base = { kind: 'lit', value: t.v };
    else if (t.t === 'str') base = { kind: 'lit', value: t.v };
    else if (t.t === 'word' || t.t === 'name') {
      const first = t.t === 'name' ? `#${t.v}` : t.v;
      const lower = t.t === 'word' ? t.v.toLowerCase() : '';
      if (t.t === 'word' && this.peek()?.t === 'lp' && !KEYWORDS.has(t.v.toUpperCase())) {
        this.next(); // consume '('
        const args: Operand[] = [];
        if (this.peek()?.t !== 'rp') {
          args.push(this.parseOperand());
          while (this.peek()?.t === 'comma') { this.next(); args.push(this.parseOperand()); }
        }
        this.expect('rp');
        base = { kind: 'fn', name: lower, args };
      } else {
        base = { kind: 'path', path: this.parsePathRest(first) };
      }
    } else throw new Error(`expr: unexpected token ${t.t}`);
    // arithmetic: operand + operand / operand - operand
    const n = this.peek();
    if (n?.t === 'op' && (n.v === '+' || n.v === '-')) {
      this.next();
      const r = this.parseOperand();
      base = { kind: 'arith', op: n.v as '+' | '-', l: base, r };
    }
    return base;
  }
  private parsePathRest(first: string): PathSeg[] {
    const segs: PathSeg[] = [{ kind: 'attr', name: first }];
    for (;;) {
      const t = this.peek();
      if (t?.t === 'dot') {
        this.next();
        const n = this.next();
        if (n.t === 'word') segs.push({ kind: 'attr', name: n.v });
        else if (n.t === 'name') segs.push({ kind: 'attr', name: `#${n.v}` });
        else throw new Error('expr: bad path segment');
      } else if (t?.t === 'lbr') {
        this.next();
        const n = this.expect('num');
        this.expect('rbr');
        segs.push({ kind: 'index', index: n.t === 'num' ? n.v : 0 });
      } else break;
    }
    return segs;
  }
}

// ---------- path / operand evaluation ----------
type Doc = Record<string, unknown>;

function resolveSegName(seg: PathSeg, ctx: ExprContext): string | number {
  if (seg.kind === 'index') return seg.index;
  if (seg.name.startsWith('#')) {
    // Name keys carry the '#' prefix ('#status'); accept both spellings.
    const real = ctx.names?.[seg.name] ?? ctx.names?.[seg.name.slice(1)];
    if (!real) throw new Error(`expr: unknown attribute name ${seg.name}`);
    return real;
  }
  return seg.name;
}

function getPath(item: Doc | undefined, path: PathSeg[], ctx: ExprContext): unknown {
  let cur: unknown = item;
  for (const seg of path) {
    if (cur === undefined || cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[resolveSegName(seg, ctx)];
  }
  return cur;
}

function setPath(item: Doc, path: PathSeg[], ctx: ExprContext, value: unknown): void {
  let cur: Doc = item;
  for (let i = 0; i < path.length - 1; i++) {
    const key = resolveSegName(path[i], ctx) as string;
    const next = cur[key];
    if (next === undefined || next === null || typeof next !== 'object') {
      cur[key] = typeof resolveSegName(path[i + 1], ctx) === 'number' ? [] : {};
    }
    cur = cur[key] as Doc;
  }
  cur[resolveSegName(path[path.length - 1], ctx) as string] = value;
}

function removePath(item: Doc, path: PathSeg[], ctx: ExprContext): void {
  let cur: unknown = item;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur === undefined || cur === null || typeof cur !== 'object') return;
    cur = (cur as Record<string | number, unknown>)[resolveSegName(path[i], ctx)];
  }
  if (cur && typeof cur === 'object') {
    delete (cur as Record<string | number, unknown>)[resolveSegName(path[path.length - 1], ctx)];
  }
}

function evalOperand(o: Operand, item: Doc | undefined, ctx: ExprContext): unknown {
  switch (o.kind) {
    case 'lit': return o.value;
    case 'valref': {
      // Attribute values are keyed with the ':' prefix (':code'); accept both.
      const vals = ctx.values ?? {};
      if (`:${o.name}` in vals) return vals[`:${o.name}`];
      if (o.name in vals) return vals[o.name];
      throw new Error(`expr: missing value :${o.name}`);
    }
    case 'path': return getPath(item, o.path, ctx);
    case 'arith': {
      const l = evalOperand(o.l, item, ctx); const r = evalOperand(o.r, item, ctx);
      if (typeof l !== 'number' || typeof r !== 'number') return undefined;
      return o.op === '+' ? l + r : l - r;
    }
    case 'fn': {
      const args = o.args.map((a) => evalOperand(a, item, ctx));
      switch (o.name) {
        case 'if_not_exists': return args[0] === undefined ? args[1] : args[0];
        case 'list_append': {
          const a = Array.isArray(args[0]) ? args[0] : [];
          const b = Array.isArray(args[1]) ? args[1] : [];
          // Dynamo appends arg2 to arg1
          return [...(Array.isArray(args[0]) ? a : args[0] === undefined ? [] : [args[0]]),
                  ...(Array.isArray(args[1]) ? b : [args[1]])];
        }
        case 'size': {
          const v = args[0];
          if (typeof v === 'string' || Array.isArray(v)) return v.length;
          if (v && typeof v === 'object') return Object.keys(v).length;
          return undefined;
        }
        default: throw new Error(`expr: unsupported function ${o.name}`);
      }
    }
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  const ka = Object.keys(a as Doc); const kb = Object.keys(b as Doc);
  return ka.length === kb.length && ka.every((k) => deepEqual((a as Doc)[k], (b as Doc)[k]));
}

function compare(op: string, a: unknown, b: unknown): boolean {
  switch (op) {
    case '=': return deepEqual(a, b);
    case '<>': return !deepEqual(a, b);
    case '<': return (a as never) < (b as never);
    case '<=': return (a as never) <= (b as never);
    case '>': return (a as never) > (b as never);
    case '>=': return (a as never) >= (b as never);
    default: throw new Error(`expr: bad op ${op}`);
  }
}

function evalCond(c: Cond, item: Doc | undefined, ctx: ExprContext): boolean {
  switch (c.kind) {
    case 'and': return c.parts.every((p) => evalCond(p, item, ctx));
    case 'or': return c.parts.some((p) => evalCond(p, item, ctx));
    case 'not': return !evalCond(c.c, item, ctx);
    case 'cmp': return compare(c.op, evalOperand(c.l, item, ctx), evalOperand(c.r, item, ctx));
    case 'between': {
      const v = evalOperand(c.o, item, ctx);
      return compare('>=', v, evalOperand(c.lo, item, ctx)) && compare('<=', v, evalOperand(c.hi, item, ctx));
    }
    case 'in': {
      const v = evalOperand(c.o, item, ctx);
      return c.list.some((o) => deepEqual(v, evalOperand(o, item, ctx)));
    }
    case 'fn': {
      switch (c.name) {
        case 'attribute_exists': {
          const p = c.args[0];
          if (p.kind !== 'path') throw new Error('expr: attribute_exists needs a path');
          return getPath(item, p.path, ctx) !== undefined;
        }
        case 'attribute_not_exists': {
          const p = c.args[0];
          if (p.kind !== 'path') throw new Error('expr: attribute_not_exists needs a path');
          return getPath(item, p.path, ctx) === undefined;
        }
        case 'begins_with': {
          const v = evalOperand(c.args[0], item, ctx);
          const p = evalOperand(c.args[1], item, ctx);
          return typeof v === 'string' && typeof p === 'string' && v.startsWith(p);
        }
        case 'contains': {
          const v = evalOperand(c.args[0], item, ctx);
          const p = evalOperand(c.args[1], item, ctx);
          if (typeof v === 'string') return typeof p === 'string' && v.includes(p);
          if (Array.isArray(v)) return v.some((x) => deepEqual(x, p));
          return false;
        }
        case 'attribute_type': {
          const v = evalOperand(c.args[0], item, ctx);
          const t = evalOperand(c.args[1], item, ctx);
          const map: Record<string, (x: unknown) => boolean> = {
            S: (x) => typeof x === 'string',
            N: (x) => typeof x === 'number',
            BOOL: (x) => typeof x === 'boolean',
            NULL: (x) => x === null,
            L: (x) => Array.isArray(x),
            M: (x) => typeof x === 'object' && x !== null && !Array.isArray(x),
            SS: (x) => Array.isArray(x) && x.every((y) => typeof y === 'string'),
            NS: (x) => Array.isArray(x) && x.every((y) => typeof y === 'number'),
          };
          return typeof t === 'string' && (map[t]?.(v) ?? false);
        }
        default: throw new Error(`expr: unsupported function ${c.name}`);
      }
    }
  }
}

// ---------- public API ----------

const condCache = new Map<string, Cond>();
export function evalCondition(
  expression: string | undefined,
  item: Doc | undefined,
  ctx: ExprContext,
): boolean {
  if (!expression) return true;
  let ast = condCache.get(expression);
  if (!ast) { ast = new Parser(tokenize(expression)).parseCondition(); condCache.set(expression, ast); }
  return evalCond(ast, item, ctx);
}

export interface KeyCondition {
  pkAttr: string;
  pkVal: unknown;
  skAttr?: string;
  skCond?: { op: 'eq' | 'begins_with' | 'lt' | 'le' | 'gt' | 'ge' | 'between'; v: unknown; v2?: unknown };
}

// Extracts a key condition of the form "pk = :v [AND <sk predicate>]".
export function parseKeyCondition(
  expression: string,
  ctx: ExprContext,
): KeyCondition {
  const ast = new Parser(tokenize(expression)).parseCondition();
  const parts = ast.kind === 'and' ? ast.parts : [ast];
  const out: Partial<KeyCondition> = {};
  const skMap: Record<string, 'eq' | 'lt' | 'le' | 'gt' | 'ge'> = {
    '=': 'eq', '<': 'lt', '<=': 'le', '>': 'gt', '>=': 'ge',
  };
  for (const part of parts) {
    if (part.kind === 'cmp' && part.l.kind === 'path' && part.r.kind === 'valref') {
      const attr = resolveSegName(part.l.path[0], ctx) as string;
      const v = ctx.values?.[':' + part.r.name] ?? ctx.values?.[part.r.name];
      // The equality on the partition key (pk/gsi1pk/gsi2pk) is the pk term;
      // other predicates constrain the sort key.
      if (part.op === '=' && (attr === 'pk' || attr.endsWith('pk'))) {
        out.pkAttr = attr; out.pkVal = v; continue;
      }
      const op = skMap[part.op];
      if (op) { out.skAttr = attr; out.skCond = { op, v }; continue; }
    }
    if (part.kind === 'fn' && part.name === 'begins_with' && part.args[0].kind === 'path' && part.args[1].kind === 'valref') {
      out.skAttr = resolveSegName(part.args[0].path[0], ctx) as string;
      out.skCond = { op: 'begins_with', v: ctx.values?.[':' + part.args[1].name] ?? ctx.values?.[part.args[1].name] };
      continue;
    }
    if (part.kind === 'between' && part.o.kind === 'path') {
      out.skAttr = resolveSegName(part.o.path[0], ctx) as string;
      out.skCond = {
        op: 'between',
        v: evalOperand(part.lo, undefined, ctx),
        v2: evalOperand(part.hi, undefined, ctx),
      };
      continue;
    }
    throw new Error(`expr: unsupported key condition part ${JSON.stringify(part.kind)}`);
  }
  if (!out.pkAttr) throw new Error('expr: key condition missing pk equality');
  return out as KeyCondition;
}

// Applies an UpdateExpression to a copy of item. Returns the new item.
export function applyUpdate(
  expression: string,
  item: Doc | undefined,
  ctx: ExprContext,
): Doc {
  const out: Doc = JSON.parse(JSON.stringify(item ?? {}));
  const toks = tokenize(expression);

  // Split into clauses by leading keyword. Each clause is a comma-separated
  // list of actions; commas inside function calls are nested in parens.
  interface Action { verb: string; toks: Tok[] }
  const actions: Action[] = [];
  let verb = '';
  let cur: Tok[] = [];
  let depth = 0;
  const flush = () => { if (cur.length) actions.push({ verb, toks: cur }); cur = []; };
  for (const t of toks) {
    if (depth === 0 && t.t === 'word' &&
        ['SET', 'ADD', 'REMOVE', 'DELETE'].includes(t.v.toUpperCase())) {
      if (verb !== '') flush();
      verb = t.v.toUpperCase();
      continue;
    }
    if (t.t === 'lp' || t.t === 'lbr') depth++;
    if (t.t === 'rp' || t.t === 'rbr') depth--;
    if (depth === 0 && t.t === 'comma') { flush(); continue; }
    cur.push(t);
  }
  flush();

  for (const a of actions) {
    switch (a.verb) {
      case 'SET': {
        // path = operand
        let eq = -1;
        for (let i = 0; i < a.toks.length; i++) {
          const tok = a.toks[i];
          if (tok.t === 'op' && tok.v === '=') { eq = i; break; }
        }
        if (eq < 0) throw new Error(`expr: SET without '=' in ${expression}`);
        const pathToks = a.toks.slice(0, eq);
        const path = new PathParser(pathToks, ctx).parse();
        const rhs = new Parser(a.toks.slice(eq + 1)).parseOperand();
        setPath(out, path, ctx, evalOperand(rhs, out, ctx));
        break;
      }
      case 'ADD': {
        const path = new PathParser(a.toks.slice(0, -1), ctx).parse();
        const valTok = a.toks[a.toks.length - 1];
        const val = new Parser([valTok]).parseOperand();
        const cur = getPath(out, path, ctx);
        const add = evalOperand(val, out, ctx);
        if (typeof add === 'number') {
          setPath(out, path, ctx, (typeof cur === 'number' ? cur : 0) + add);
        } else if (Array.isArray(add)) {
          const set = new Set([...(Array.isArray(cur) ? cur : []), ...add]);
          setPath(out, path, ctx, [...set]);
        } else throw new Error(`expr: ADD unsupported value in ${expression}`);
        break;
      }
      case 'REMOVE': {
        const path = new PathParser(a.toks, ctx).parse();
        removePath(out, path, ctx);
        break;
      }
      case 'DELETE': {
        const path = new PathParser(a.toks.slice(0, -1), ctx).parse();
        const val = evalOperand(new Parser([a.toks[a.toks.length - 1]]).parseOperand(), out, ctx);
        const cur = getPath(out, path, ctx);
        if (Array.isArray(cur) && Array.isArray(val)) {
          setPath(out, path, ctx, cur.filter((x) => !val.some((y) => deepEqual(x, y))));
        }
        break;
      }
      default: throw new Error(`expr: action without clause in ${expression}`);
    }
  }
  return out;
}

// Path tokens include possible #name and [index] / .attr segments.
class PathParser {
  constructor(private toks: Tok[], private ctx: ExprContext) {}
  parse(): PathSeg[] {
    const o = new Parser(this.toks).parseOperand();
    if (o.kind !== 'path') throw new Error('expr: expected path');
    return o.path;
  }
}
