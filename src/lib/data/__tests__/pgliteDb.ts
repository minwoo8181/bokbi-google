/**
 * 시험 전용: PGlite(Node 안의 Postgres)에 Supabase 마이그레이션을 올리고, 사람별 DbPort 어댑터를 만든다.
 * 호출마다 트랜잭션 하나: role(anon·authenticated) + request.jwt.claims(sub·aal)를 설정 → Supabase가 요청마다 하는 것과 같다
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import type { DbError, DbPort, DbResult, Filter, SelectOptions } from '../supabase/port';

export const SUPABASE_DIR = path.resolve(__dirname, '../../../../supabase');
export const readSql = (rel: string) => readFileSync(path.join(SUPABASE_DIR, rel), 'utf8');
export const MIGRATIONS = readdirSync(path.join(SUPABASE_DIR, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();

/** Supabase 흉내(shim) + 마이그레이션 전부를 올린 새 DB */
export async function bootDb(): Promise<PGlite> {
  const pg = await PGlite.create({ extensions: { pgcrypto } });
  await pg.exec(readSql('tests/shim.sql'));
  for (const f of MIGRATIONS) await pg.exec(readSql(`migrations/${f}`));
  return pg;
}

export interface Actor {
  /** null = 로그인 전 */
  uid: string | null;
  /** 관리자 2단계 인증 통과 */
  aal2?: boolean;
  /** 서버 키 (관리자 웹 푸시 발송 경로) — uid와 상관없이 service_role */
  service?: boolean;
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (s: string) => {
  if (!IDENT.test(s)) throw new Error(`bad identifier: ${s}`);
  return `"${s}"`;
};

/** JS 값 → PGlite 인자 (객체는 jsonb 문자열, 배열은 Postgres 배열 리터럴) */
function param(v: unknown): unknown {
  if (Array.isArray(v)) return `{${v.map((x) => `"${String(x).replace(/["\\]/g, '\\$&')}"`).join(',')}}`;
  if (v instanceof Uint8Array) return v;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

/**
 * 값 모양을 PostgREST(JSON)와 맞춘다: 시각·날짜는 문자열, bigint·numeric은 숫자, bytea는 '\x…' 16진 문자열.
 * (PGlite 기본은 Date·BigInt·Uint8Array라 저장소 변환이 운영과 다르게 시험되는 것을 막음)
 */
const PARSERS = {
  1184: (v: string) => new Date(v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString(), // timestamptz
  1082: (v: string) => v, // date
  20: (v: string) => Number(v), // int8
  1700: (v: string) => Number(v), // numeric
  17: (v: string) => v, // bytea (텍스트 출력 = \x…)
};
const OPTS = { parsers: PARSERS };

const asError = (e: unknown): DbError => {
  const err = e as { message?: string; code?: string };
  return { message: err.message ?? String(e), code: err.code };
};

function where(filters: Filter[] | undefined, params: unknown[]): string {
  if (!filters?.length) return '';
  const parts = filters.map((f) => {
    if (f.op === 'is') return `${ident(f.col)} is ${f.value === null ? 'null' : f.value ? 'true' : 'false'}`;
    params.push(param(f.value));
    return f.op === 'in' ? `${ident(f.col)}::text = any($${params.length}::text[])` : `${ident(f.col)} = $${params.length}`;
  });
  return ` where ${parts.join(' and ')}`;
}

export function pgliteDb(pg: PGlite, actor: Actor): DbPort {
  const claims = JSON.stringify(
    actor.service ? { role: 'service_role' } : actor.uid ? { sub: actor.uid, role: 'authenticated', aal: actor.aal2 ? 'aal2' : 'aal1' } : { role: 'anon' },
  );
  const role = actor.service ? 'service_role' : actor.uid ? 'authenticated' : 'anon';
  const procCache = new Map<string, { retset: boolean; args: string[] }>();

  async function run<T>(fn: (tx: Transaction) => Promise<T>): Promise<DbResult<T>> {
    try {
      const data = await pg.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true), set_config('role', $2, true)`, [claims, role]);
        return fn(tx);
      });
      return { data, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  }

  async function proc(name: string) {
    const hit = procCache.get(name);
    if (hit) return hit;
    const r = await pg.query<{ retset: boolean; args: string[] | null }>(
      `select p.proretset as retset, p.proargnames as args from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`,
      [name],
    );
    if (!r.rows[0]) throw new Error(`no function public.${name}`);
    const info = { retset: r.rows[0].retset, args: r.rows[0].args ?? [] };
    procCache.set(name, info);
    return info;
  }

  return {
    async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
      const info = await proc(fn);
      const params: unknown[] = [];
      const named = Object.entries(args).map(([k, v]) => {
        params.push(param(v));
        return `${ident(k)} => $${params.length}`;
      });
      const call = `public.${ident(fn)}(${named.join(', ')})`;
      return run(async (tx) => {
        if (info.retset) return (await tx.query(`select * from ${call}`, params, OPTS)).rows as T;
        return ((await tx.query<{ v: unknown }>(`select ${call} as v`, params, OPTS)).rows[0]?.v ?? null) as T;
      });
    },

    async select<T>(table: string, opts: SelectOptions = {}) {
      const params: unknown[] = [];
      const cols = opts.columns && opts.columns !== '*' ? opts.columns.split(',').map((c) => ident(c.trim())).join(', ') : '*';
      const order = opts.order ? ` order by ${ident(opts.order.col)} ${opts.order.ascending === false ? 'desc' : 'asc'}` : '';
      const sql = `select ${cols} from public.${ident(table)}${where(opts.filters, params)}${order}`;
      return run(async (tx) => (await tx.query(sql, params, OPTS)).rows as T[]);
    },

    async update(table, values, filters) {
      const params: unknown[] = [];
      const sets = Object.entries(values).map(([k, v]) => {
        params.push(param(v));
        return `${ident(k)} = $${params.length}`;
      });
      const sql = `update public.${ident(table)} set ${sets.join(', ')}${where(filters, params)}`;
      return run(async (tx) => {
        await tx.query(sql, params);
        return null;
      });
    },

    async insert(table, rows) {
      return run(async (tx) => {
        for (const row of rows) {
          const keys = Object.keys(row);
          const params = keys.map((k) => param(row[k]));
          await tx.query(`insert into public.${ident(table)} (${keys.map(ident).join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, params);
        }
        return null;
      });
    },
  };
}
