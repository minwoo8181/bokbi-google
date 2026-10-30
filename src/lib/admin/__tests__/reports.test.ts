import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { DealEvent } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import type { AdminAction } from '../adminLog';
import { isOpenReport, reportRows } from '../reports';

const now = new Date('2026-11-02T03:00:00Z');
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

function req(): OwnerRequest {
  const r = demoRequest(now);
  return {
    ...r,
    stage: 'IN_PROGRESS',
    matchedOfferIds: ['offer-1', 'offer-2'],
    offers: r.offers.map((o) =>
      o.id === 'offer-1' ? { ...o, fakeReport: { at: ago(5), status: 'PENDING' as const, decidedAt: null } } : o.id === 'offer-3' ? { ...o, fakeReport: { at: ago(50), status: 'REJECTED' as const, decidedAt: ago(40) } } : o,
    ),
  };
}
const fee: DealEvent[] = [
  { id: 'd', at: ago(10), kind: 'OWNER_DECLARED', step: 'CONTRACT' },
  { id: 'f', at: ago(9), kind: 'FEE_ANSWER', kept: false, reason: 'OVERCHARGED' },
];
const act = (result: AdminAction['result'], target: AdminAction['target'] = 'FEE_OVERCHARGED', offerId = 'offer-2'): AdminAction => ({ id: `${target}-${result}`, at: ago(1), target, requestId: req().id, offerId, result });

describe('관리자 신고 목록', () => {
  it('허위 매물(판정은 공유 저장소)과 복비 "더 요구"(처리 기록)를 한 목록으로, 처리할 것 먼저', () => {
    const r = req();
    const rows = reportRows([r], { [r.id]: { 'offer-2': fee } }, []);
    expect(rows.map((x) => [x.kind, x.offerId, x.status])).toEqual([
      ['FEE_OVERCHARGED', 'offer-2', 'PENDING'],
      ['FAKE_REPORT', 'offer-1', 'PENDING'],
      ['FAKE_REPORT', 'offer-3', 'REJECTED'],
    ]);
    expect(rows.filter(isOpenReport)).toHaveLength(2);
  });

  it('연락만 했으면 CONTACTED(아직 처리할 것), 확인·반려하면 끝', () => {
    const r = req();
    const deals = { [r.id]: { 'offer-2': fee } };
    expect(reportRows([r], deals, [act('CONTACTED')]).find((x) => x.kind === 'FEE_OVERCHARGED')?.status).toBe('CONTACTED');
    expect(reportRows([r], deals, [act('CONTACTED'), act('CONFIRMED')]).find((x) => x.kind === 'FEE_OVERCHARGED')).toMatchObject({ status: 'CONFIRMED' });
    expect(reportRows([r], deals, [act('CONTACTED', 'FAKE_REPORT', 'offer-1')]).find((x) => x.offerId === 'offer-1')?.status).toBe('CONTACTED');
  });

  it('합의 조정·기타 사유는 신고가 아님', () => {
    const r = { ...req(), offers: demoRequest(now).offers };
    const agreed: DealEvent[] = [fee[0], { ...fee[1], reason: 'AGREED' } as DealEvent];
    expect(reportRows([r], { [r.id]: { 'offer-2': agreed } }, [])).toEqual([]);
  });
});
