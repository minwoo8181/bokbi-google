import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '@/config/siteContent';
import { demoRequest } from '@/components/my-requests/mock-requests';
import { findPii } from '@/lib/analytics/privacy';
import type { OwnerRequest } from '@/lib/requests/types';
import { AD_SOON_HOURS, TICK_MS, complexLabel, noticeText, tickNotices } from '../notices';

const H = 3_600_000;
const t0 = new Date('2026-11-02T03:00:00Z');
const at = (h: number) => new Date(t0.getTime() + h * H);

/** 의뢰 하나 (t0에 만듦), 요청 카드 n장 */
function req(over: Partial<OwnerRequest> = {}, offers = 2): OwnerRequest {
  const r = demoRequest(t0);
  const base = r.offers[0];
  return {
    ...r,
    id: 'R1',
    createdAt: t0.toISOString(),
    offers: Array.from({ length: offers }, (_, i) => ({ ...base, id: `offer-${i + 1}`, order: i + 1, ad: null, fakeReport: undefined })),
    matchedOfferIds: [],
    releasedOfferIds: [],
    matchedAt: null,
    adWindowStartedAt: null,
    paused: null,
    endedReason: null,
    stage: 'RECEIVING',
    ...over,
  } as OwnerRequest;
}

/** 15분마다 돌린 결과를 모두 모음 (from~to 시간) */
function run(r: OwnerRequest, fromH: number, toH: number) {
  const out: string[] = [];
  for (let t = at(fromH).getTime(); t <= at(toH).getTime(); t += TICK_MS) for (const n of tickNotices([r], new Date(t))) out.push(`${n.kind}@${(t - t0.getTime()) / H}`);
  return out;
}

describe('알림 문구 (SITE_CONTENT.notify)', () => {
  it('8개 모두 [복비]로 시작, 개인정보·네이버·호칭·이모지 없음, 빈칸이 다 채워짐', () => {
    const vars = { complex: '다산자이아이비플레이스 34평 매매', n: 3 };
    for (const kind of Object.keys(SITE_CONTENT.notify) as (keyof typeof SITE_CONTENT.notify)[]) {
      const text = noticeText({ kind, vars });
      expect(text.startsWith('[복비] ')).toBe(true);
      expect(text).not.toMatch(/\{|네이버|집주인님|\p{Extended_Pictographic}/u);
      expect(findPii({ text: 'x', v: text }).filter((k) => k !== 'text')).toEqual([]);
    }
    expect(complexLabel({ complexName: '힐스테이트다산', pyeongLabel: '34평 · 전용 84㎡', tradeType: '매매' })).toBe('힐스테이트다산 34평 매매');
  });
});

describe('시간 알림 (15분마다, 한 번만)', () => {
  it('요청 받는 시간 끝: 48시간이 지난 그 15분에 한 번, 요청 0곳·이미 매칭·끝난 의뢰는 없음', () => {
    expect(run(req(), 40, 56)).toEqual(['RECEIVING_ENDED@48']);
    expect(run(req({}, 0), 40, 56)).toEqual([]);
    expect(run(req({ matchedOfferIds: ['offer-1'] }), 40, 56).filter((x) => x.startsWith('RECEIVING'))).toEqual([]);
    expect(run(req({ endedReason: 'CANCELLED' }), 40, 56)).toEqual([]);
  });

  it('광고 기한 6시간 전: 매칭된 곳 중 광고 안 올린 곳만 한 번, 올렸거나·해제·멈춤·소유자 확인 중이면 없음', () => {
    const matched = (over: Partial<OwnerRequest> = {}) =>
      req({ stage: 'IN_PROGRESS', matchedOfferIds: ['offer-1', 'offer-2'], matchedAt: at(10).toISOString(), adWindowStartedAt: at(10).toISOString(), ...over });
    const due = 10 + 48 - AD_SOON_HOURS;
    expect(run(matched(), 40, 60)).toEqual([`AD_DEADLINE_SOON@${due}`, `AD_DEADLINE_SOON@${due}`]);
    const r = matched();
    r.offers[0] = { ...r.offers[0], ad: { url: 'https://example.com/1', postedAt: at(20).toISOString() } };
    expect(tickNotices([r], at(due)).map((n) => n.target)).toEqual([{ broker: 'offer-2' }]);
    expect(run(matched({ releasedOfferIds: ['offer-1', 'offer-2'] }), 40, 60)).toEqual([]);
    expect(run(matched({ paused: { pausedAt: at(20).toISOString(), reason: '이사 일정' } }), 40, 60)).toEqual([]);
    const checking = matched();
    checking.offers = checking.offers.map((o) => ({ ...o, fakeReport: { at: at(12).toISOString(), status: 'PENDING' as const, decidedAt: null } }));
    expect(run(checking, 40, 60)).toEqual([]);
  });

  it('허위 매물 아님으로 끝나면 기다린 시간만큼 기한도 늦게 (화면 adState와 같은 계산)', () => {
    const r = req({ stage: 'IN_PROGRESS', matchedOfferIds: ['offer-1'], matchedAt: at(10).toISOString(), adWindowStartedAt: at(10).toISOString() }, 1);
    r.offers[0] = { ...r.offers[0], fakeReport: { at: at(12).toISOString(), status: 'REJECTED', decidedAt: at(22).toISOString() } };
    expect(run(r, 40, 70)).toEqual([`AD_DEADLINE_SOON@${10 + 10 + 48 - AD_SOON_HOURS}`]);
  });
});
