/**
 * 운영 어댑터: supabase-js 클라이언트 → DB 포트 (port.ts). 서버에서 사용자 세션(쿠키)으로 만든 클라이언트를 넘긴다 → RLS 적용.
 * 시험은 같은 포트의 PGlite 어댑터(__tests__/pgliteDb.ts) — 저장소 로직은 둘 다 같은 코드
 */
import type { DbError, DbPort, DbResult, Filter } from './port';

/** supabase-js에서 쓰는 부분만 (버전마다 바뀌는 제네릭 타입에 묶이지 않게) */
interface Query extends PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
  eq(col: string, v: unknown): Query;
  in(col: string, v: unknown[]): Query;
  is(col: string, v: unknown): Query;
  order(col: string, opts: { ascending: boolean }): Query;
}
export interface SupabaseLike {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
  from(table: string): {
    select(columns: string): Query;
    update(values: Record<string, unknown>): Query;
    insert(rows: Record<string, unknown>[]): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
  };
}

const toResult = <T>(r: { data: unknown; error: { message: string; code?: string } | null }): DbResult<T> =>
  r.error ? { data: null, error: { message: r.error.message, code: r.error.code } as DbError } : { data: r.data as T, error: null };

function applyFilters(q: Query, filters: Filter[] = []): Query {
  for (const f of filters) {
    if (f.op === 'eq') q = q.eq(f.col, f.value);
    else if (f.op === 'in') q = q.in(f.col, f.value as unknown[]);
    else q = q.is(f.col, f.value);
  }
  return q;
}

export function supabaseJsDb(client: SupabaseLike): DbPort {
  return {
    async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
      return toResult<T>(await client.rpc(fn, args));
    },
    async select<T>(table: string, opts: { columns?: string; filters?: Filter[]; order?: { col: string; ascending?: boolean } } = {}) {
      let q = applyFilters(client.from(table).select(opts.columns ?? '*'), opts.filters);
      if (opts.order) q = q.order(opts.order.col, { ascending: opts.order.ascending !== false });
      const r = toResult<T[]>(await q);
      return r.error ? r : { data: (r.data ?? []) as T[], error: null };
    },
    async update(table, values, filters) {
      const r = toResult<unknown>(await applyFilters(client.from(table).update(values), filters));
      return r.error ? r : { data: null, error: null };
    },
    async insert(table, rows) {
      const r = toResult<unknown>(await client.from(table).insert(rows));
      return r.error ? r : { data: null, error: null };
    },
  };
}
