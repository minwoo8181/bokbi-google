/**
 * supabase-js 어댑터 (lib/data/supabase/supabaseJs.ts): 필터·정렬이 supabase-js 호출로 그대로 가고, 오류가 포트 모양으로 오는지
 * (실제 서버 없이 호출 기록만 보는 가짜 클라이언트)
 */
import { describe, expect, it } from 'vitest';
import { eq, inList } from '../supabase/port';
import { supabaseJsDb, type SupabaseLike } from '../supabase/supabaseJs';

function fakeClient(result: { data: unknown; error: { message: string; code?: string } | null }) {
  const calls: unknown[][] = [];
  const query = (): any => {
    const q: any = {
      eq: (...a: unknown[]) => (calls.push(['eq', ...a]), q),
      in: (...a: unknown[]) => (calls.push(['in', ...a]), q),
      is: (...a: unknown[]) => (calls.push(['is', ...a]), q),
      order: (...a: unknown[]) => (calls.push(['order', ...a]), q),
      then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok),
    };
    return q;
  };
  const client: SupabaseLike = {
    rpc: (fn, args) => (calls.push(['rpc', fn, args]), Promise.resolve(result)),
    from: (table) => ({
      select: (cols) => (calls.push(['select', table, cols]), query()),
      update: (v) => (calls.push(['update', table, v]), query()),
      insert: (rows) => (calls.push(['insert', table, rows]), Promise.resolve(result)),
    }),
  };
  return { client, calls };
}

describe('supabase-js 어댑터', () => {
  it('읽기: 칸·필터·정렬을 그대로 넘기고 행 배열을 돌려줌', async () => {
    const { client, calls } = fakeClient({ data: [{ id: 'a' }], error: null });
    const r = await supabaseJsDb(client).select('offers', { columns: 'id', filters: [eq('request_id', 'r1'), inList('id', ['a', 'b'])], order: { col: 'at', ascending: false } });
    expect(r).toEqual({ data: [{ id: 'a' }], error: null });
    expect(calls).toEqual([['select', 'offers', 'id'], ['eq', 'request_id', 'r1'], ['in', 'id', ['a', 'b']], ['order', 'at', { ascending: false }]]);
  });

  it('함수 오류는 메시지(앱 오류 코드)·코드 그대로', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'NO_CREDIT', code: 'P0001' } });
    expect(await supabaseJsDb(client).rpc('send_request', { p_request: 'r' })).toEqual({ data: null, error: { message: 'NO_CREDIT', code: 'P0001' } });
  });

  it('수정·추가는 성공하면 data null', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    const db = supabaseJsDb(client);
    expect(await db.update('requests', { showing: {} }, [eq('id', 'r')])).toEqual({ data: null, error: null });
    expect(await db.insert('visits', [{ visit_hour: 14 }])).toEqual({ data: null, error: null });
    expect(calls[0]).toEqual(['update', 'requests', { showing: {} }]);
  });
});
