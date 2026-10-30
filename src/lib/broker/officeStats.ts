/**
 * 사무소 실적 서버 갱신 (A10, 서버 키로만). 거래 기록이 추가되면 그 요청 카드의 사무소 실적을 다시 센다.
 * 계산은 브라우저 저장소와 같은 TS 규칙(lib/deal/settle.ts promiseStats) — SQL로 다시 쓰지 않아 규칙이 갈라지지 않는다.
 * 저장은 set_office_promise(서버 키 전용, 마이그레이션 20261029160000_office_promise.sql)
 */
import { promiseStats } from '@/lib/deal/settle';
import { dealsFromRows, type DealEventRow } from '@/lib/data/supabase/map';
import { eq, inList, type DbPort, type DbResult } from '@/lib/data/supabase/port';

function must<T>(r: DbResult<T>): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** 한 사무소의 실적을 다시 세서 저장. 돌려준 값 = 저장한 값 */
export async function refreshOfficePromise(db: DbPort, officeId: string): Promise<{ kept: number; total: number }> {
  const offers = must(await db.select<{ id: string }>('offers', { columns: 'id', filters: [eq('office_id', officeId)] }));
  const ids = offers.map((o) => o.id);
  const rows = ids.length
    ? must(await db.select<DealEventRow>('deal_events', { columns: 'id,request_id,offer_id,kind,body,at', filters: [inList('offer_id', ids)] }))
    : [];
  const stats = promiseStats(Object.values(dealsFromRows(rows)));
  must(await db.rpc('set_office_promise', { p_office: officeId, p_kept: stats.kept, p_total: stats.total }));
  return stats;
}

/** 요청 카드 하나에 거래 기록이 추가됐을 때: 그 카드의 사무소 실적 갱신. 없는 카드면 null */
export async function refreshPromiseForOffer(db: DbPort, offerId: string): Promise<{ kept: number; total: number } | null> {
  const [offer] = must(await db.select<{ office_id: string }>('offers', { columns: 'office_id', filters: [eq('id', offerId)] }));
  return offer ? refreshOfficePromise(db, offer.office_id) : null;
}
