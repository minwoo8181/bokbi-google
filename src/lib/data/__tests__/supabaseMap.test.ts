/**
 * Supabase 행 → 앱 타입 변환 (lib/data/supabase/map.ts)
 */
import { describe, expect, it } from 'vitest';
import { agentCountBand, officeAgeBand, type AgentCountBand, type OfficeAgeBand } from '@/lib/requests/stage';
import { countForBand, dealsFromRows, requestFromRow, walletFromLedger, yearForBand, type RequestRow } from '../supabase/map';

describe('Supabase 변환', () => {
  it('구간 → 대표값은 앱 구간 규칙으로 같은 구간이 나온다 (집주인 카드 배지가 그대로)', () => {
    for (const y of [2026, 2027, 2035]) {
      for (const band of ['UNDER_3', 'FROM_3_TO_10', 'OVER_10'] as OfficeAgeBand[]) expect(officeAgeBand(yearForBand(band, y), y)).toBe(band);
    }
    for (const band of ['ONE', 'TWO_PLUS'] as AgentCountBand[]) expect(agentCountBand(countForBand(band))).toBe(band);
    expect(yearForBand(null, 2026)).toBeNull();
    expect(countForBand(null)).toBeNull();
  });

  it('지갑: 잔액 = 장부 합, 0개 지급 줄은 내역에서 빼고 채운 주는 남김', () => {
    const w = walletFromLedger([
      { kind: 'WEEKLY', amount: 3, request_id: null, reason: null, week: '2026-10-19', at: '2026-10-19T00:00:00Z' },
      { kind: 'SPEND', amount: -1, request_id: 'r1', reason: null, week: null, at: '2026-10-20T00:00:00Z' },
      { kind: 'REFUND', amount: 1, request_id: 'r1', reason: 'DEAL', week: null, at: '2026-10-21T00:00:00Z' },
      { kind: 'WEEKLY', amount: 0, request_id: null, reason: null, week: '2026-10-26', at: '2026-10-26T00:00:00Z' },
    ]);
    expect(w.balance).toBe(3);
    expect(w.refilledWeek).toBe('2026-10-26');
    expect(w.events.map((e) => e.kind)).toEqual(['WEEKLY', 'SPEND', 'REFUND']);
    expect(w.events[2]).toMatchObject({ reason: 'DEAL', requestId: 'r1' });
  });

  it('거래 기록: 카드별로 시간순, 깨진 줄만 버림', () => {
    const d = dealsFromRows([
      { id: 'b', request_id: 'r', offer_id: 'o', kind: 'REPORT', body: { step: 'PROVISIONAL' }, at: '2026-10-26T02:00:00Z' },
      { id: 'a', request_id: 'r', offer_id: 'o', kind: 'OWNER_CHECKED', body: { how: 'CONFIRMED' }, at: '2026-10-26T01:00:00Z' },
      { id: 'x', request_id: 'r', offer_id: 'o', kind: 'REPORT', body: { step: 'NOPE' }, at: '2026-10-26T03:00:00Z' },
    ]);
    expect(d.o.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('의뢰: 해제된 곳은 매칭 목록에서 빠지고 해제 목록으로, 동·호수·연락처는 없음', () => {
    const row = {
      id: 'r', owner_id: 'u', apt_id: null, complex_name: '단지', trade_type: '매매', pyeong_label: '34평', floor_label: '중층', masked_dong_ho: '1**동',
      asking_price_manwon: 90000, commission_won: '3000000', legal_max_won: 4500000, occupancy: 'VACANT', details: null, showing: { weekly: {}, blocked: [] },
      stage: 'IN_PROGRESS', ended_reason: null, created_at: '2026-10-26T00:00:00Z', matched_at: '2026-10-26T01:00:00Z', ad_window_started_at: '2026-10-26T01:00:00Z',
      paused_at: null, pause_reason: null, resumed_at: null, ended_at: null,
    } as RequestRow;
    const r = requestFromRow(row, {
      offers: [],
      matched: [
        { id: 'o1', matchedAt: '2026-10-26T01:00:00Z', releasedAt: null },
        { id: 'o2', matchedAt: '2026-10-26T01:00:00Z', releasedAt: '2026-10-27T01:00:00Z' },
        { id: 'o3', matchedAt: null, releasedAt: null },
      ],
      visits: [],
    });
    expect(r.matchedOfferIds).toEqual(['o1']);
    expect(r.releasedOfferIds).toEqual(['o2']);
    expect(r.commissionWon).toBe(3_000_000);
    expect(r.dongHo).toBe('');
    expect(r.contact).toBeUndefined();
  });
});
