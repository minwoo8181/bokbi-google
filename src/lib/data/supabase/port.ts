/**
 * Supabase 저장소가 기대는 작은 DB 포트 (포트·어댑터). 결과 모양은 supabase-js와 같다({ data, error }).
 * 운영 = supabase-js 서버 클라이언트 어댑터(쿠키 세션 → RLS), 시험 = PGlite 어댑터(사람별 role + jwt claims).
 * 저장소 로직은 이 네 가지만 쓴다 → 같은 코드가 운영과 PC 시험에서 똑같이 돈다
 */

export interface DbError {
  message: string;
  /** Postgres 오류 코드 (42501 권한 없음, 23514 check 위반, P0001 함수가 낸 앱 오류 코드 등) */
  code?: string;
}

export type DbResult<T> = { data: T; error: null } | { data: null; error: DbError };

export interface Filter {
  col: string;
  op: 'eq' | 'in' | 'is';
  value: unknown;
}

export interface SelectOptions {
  /** 기본 '*' */
  columns?: string;
  filters?: Filter[];
  order?: { col: string; ascending?: boolean };
}

export interface DbPort {
  /** 함수 호출. 행 집합을 돌려주는 함수는 배열, 값 하나를 돌려주는 함수는 그 값 */
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>>;
  select<T = Record<string, unknown>>(table: string, opts?: SelectOptions): Promise<DbResult<T[]>>;
  update(table: string, values: Record<string, unknown>, filters: Filter[]): Promise<DbResult<null>>;
  insert(table: string, rows: Record<string, unknown>[]): Promise<DbResult<null>>;
}

export const eq = (col: string, value: unknown): Filter => ({ col, op: 'eq', value });
export const inList = (col: string, value: unknown[]): Filter => ({ col, op: 'in', value });
