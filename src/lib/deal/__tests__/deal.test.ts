import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { OwnerRequest } from '@/lib/requests/types';
import { canceledNotices, type VisitBooking } from '@/lib/requests/showing';
import { appendDealEvent, EMPTY_MARKET, EMPTY_WORKSPACE, parseMarket } from '@/lib/broker/mockMarket';
import { EMPTY_WALLET, refillWeekly, spendCredit } from '@/lib/broker/credits';
import { keptPromiseCount, settleDealReturns } from '../settle';
import { parseSeen, seenKey } from '../seen';
import { dealDateEvents, toIcsMany } from '@/lib/calendar';
import { parseSavedCalendar, savedKey } from '../savedCalendar';
import {
  adRemoval,
  allowedReports,
  applyDeals,
  canOwnerDeclare,
  cardStrip,
  creditReturnable,
  listRank,
  newsSince,
  promiseKept,
  type StripTone,
  checkDealDates,
  checkReport,
  closeOthers,
  dateEvents,
  consequences,
  DEAL_PHASES,
  dealDates,
  dealPhase,
  dealState,
  dday,
  nextAction,
  REPORT_STEPS,
  timeline,
  winnerOf,
  type DealContext,
  type DealEvent,
  type DealEventBody,
  type DealPhase,
  type ReportStep,
  type RequestDeals,
} from '../deal';

// 2026-11-01 12:00 KST
const now = new Date('2026-11-01T03:00:00Z');
const H = 3_600_000;
const iso = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * H).toISOString();
let seq = 0;
const ev = (hoursFromNow: number, body: DealEventBody): DealEvent => ({ id: `e${seq++}`, at: iso(hoursFromNow), ...body }) as DealEvent;

/** 매칭 3곳(offer-1..3), 매칭 10시간 전, offer-1·2는 광고 중 */
function base(opts: { matched?: string[]; ads?: string[]; visits?: VisitBooking[] } = {}): OwnerRequest {
  const r = demoRequest(now);
  const matched = opts.matched ?? ['offer-1', 'offer-2', 'offer-3'];
  const ads = opts.ads ?? ['offer-1', 'offer-2'];
  return {
    ...r,
    stage: 'IN_PROGRESS',
    matchedOfferIds: matched,
    matchedAt: iso(-10),
    adWindowStartedAt: iso(-10),
    offers: r.offers.map((o) => ({ ...o, ad: ads.includes(o.id) ? { url: `https://fin.land.naver.com/articles/26575531${o.id.slice(-1)}0`, postedAt: iso(-8) } : null })),
    visits: opts.visits ?? [],
  };
}
const ctx = (request: OwnerRequest, deals: RequestDeals, offerId = 'offer-1'): DealContext => ({ request, deals, offerId });

describe('전이표 전수 (단계 7 × 보고 4 = 28칸)', () => {
  const TABLE: Record<DealPhase, ReportStep[]> = {
    MATCHED: ['PROVISIONAL', 'CONTRACT'],
    PROVISIONAL: ['CONTRACT', 'BROKEN'],
    CONTRACTED: ['BALANCE', 'BROKEN'],
    DONE: [],
    BROKEN: [],
    CLOSED_ELSEWHERE: [],
    RELEASED: [],
  };
  const dates = { CONTRACT: '2026-11-02', MIDDLE: null, BALANCE: '2026-12-20' };
  let checked = 0;
  for (const phase of DEAL_PHASES) {
    for (const step of REPORT_STEPS) {
      it(`${phase} × ${step}`, () => {
        const ok = TABLE[phase].includes(step);
        expect(checkReport(phase, { pending: null, dates }, step)).toBe(ok ? null : 'WRONG_PHASE');
        expect(allowedReports(phase).includes(step)).toBe(ok);
        checked++;
      });
    }
  }
  it('28칸 모두 검사', () => expect(checked).toBe(28));
});

describe('보고와 확인', () => {
  it('정상 흐름: 가계약 → 계약 → 잔금 → 완료 (확인된 보고만 단계를 올린다)', () => {
    const e: DealEvent[] = [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })];
    expect(dealState(e)).toMatchObject({ phase: 'MATCHED', pending: { step: 'PROVISIONAL' } });
    e.push(ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }));
    expect(dealState(e)).toMatchObject({ phase: 'PROVISIONAL', pending: null, committedAt: iso(1) });
    e.push(ev(2, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-02' }), ev(2, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }));
    e.push(ev(3, { kind: 'REPORT', step: 'CONTRACT' }), ev(4, { kind: 'ANSWER', step: 'CONTRACT', ok: true }));
    expect(dealState(e).phase).toBe('CONTRACTED');
    e.push(ev(5, { kind: 'REPORT', step: 'BALANCE' }), ev(6, { kind: 'ANSWER', step: 'BALANCE', ok: true }));
    expect(dealState(e).phase).toBe('DONE');
    expect(dealState(e).committedAt).toBe(iso(1)); // 처음 확인 시각 유지
  });

  it('가계약 없이 바로 계약 (계약일 필요)', () => {
    expect(checkReport('MATCHED', { pending: null, dates: { CONTRACT: null, MIDDLE: null, BALANCE: null } }, 'CONTRACT')).toBe('NEED_CONTRACT_DATE');
    const e = [ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-02' }), ev(1, { kind: 'REPORT', step: 'CONTRACT' }), ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true })];
    expect(dealState(e)).toMatchObject({ phase: 'CONTRACTED', committedAt: iso(2) });
  });

  it('잔금 보고에는 잔금일 필요', () => {
    expect(checkReport('CONTRACTED', { pending: null, dates: { CONTRACT: '2026-11-02', MIDDLE: null, BALANCE: null } }, 'BALANCE')).toBe('NEED_BALANCE_DATE');
  });

  it('확인 대기 중에는 새 보고를 막는다', () => {
    const s = dealState([ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })]);
    expect(checkReport('MATCHED', s, 'CONTRACT')).toBe('PENDING');
    // 저장소에 규칙 밖 이벤트가 섞여도 접을 때 건너뛴다
    const messy = dealState([ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'REPORT', step: 'BALANCE' }), ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true })]);
    expect(messy).toMatchObject({ phase: 'MATCHED', pending: { step: 'PROVISIONAL' } });
  });

  it('아니에요: 단계는 그대로, 기록은 남고, 다시 보고할 수 있다', () => {
    const e = [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: false })];
    const s = dealState(e);
    expect(s).toMatchObject({ phase: 'MATCHED', pending: null, lastDenied: { step: 'PROVISIONAL' } });
    expect(checkReport('MATCHED', s, 'PROVISIONAL')).toBeNull();
    const items = timeline(ctx(base(), { 'offer-1': e }));
    expect(items.filter((i) => i.kind === 'REPORTED' || i.kind === 'ANSWERED')).toHaveLength(2);
    expect(dealState([...e, ev(2, { kind: 'REPORT', step: 'PROVISIONAL' })]).lastDenied).toBeNull();
  });

  it('해제: 가계약 뒤 해제를 확인하면 BROKEN', () => {
    const e = [
      ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }),
      ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }),
      ev(2, { kind: 'REPORT', step: 'BROKEN' }),
      ev(3, { kind: 'ANSWER', step: 'BROKEN', ok: true }),
    ];
    expect(dealState(e).phase).toBe('BROKEN');
  });
});

describe('날짜', () => {
  it('한 번에 넣든 따로 넣든 결과가 같고, 바꾸면 이력이 남는다', () => {
    const together = [ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-02' }), ev(0, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' })];
    const apart = [ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-02' }), ev(5, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' })];
    expect(dealDates(together).current).toEqual(dealDates(apart).current);
    const changed = dealDates([...apart, ev(6, { kind: 'DATE', field: 'BALANCE', date: '2026-12-27' })]);
    expect(changed.current.BALANCE).toBe('2026-12-27');
    expect(changed.changes.at(-1)).toMatchObject({ field: 'BALANCE', from: '2026-12-20', to: '2026-12-27' });
  });

  it('중도금 없음(null)과 같은 값 다시 넣기는 이력을 늘리지 않는다', () => {
    const d = dealDates([ev(0, { kind: 'DATE', field: 'MIDDLE', date: null }), ev(1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-02' }), ev(2, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-02' })]);
    expect(d.current.MIDDLE).toBeNull();
    expect(d.changes).toHaveLength(1);
  });

  it('한국 날짜 기준 D-day (자정 직전·직후)', () => {
    expect(dday('2026-11-01', now)).toBe(0);
    expect(dday('2026-11-02', now)).toBe(1);
    expect(dday('2026-10-31', now)).toBe(-1);
    expect(dday('2026-11-02', new Date('2026-11-01T14:59:00Z'))).toBe(1); // 23:59 KST
    expect(dday('2026-11-02', new Date('2026-11-01T15:00:00Z'))).toBe(0); // 00:00 KST
  });
});

describe('다른 중개사 정리', () => {
  const provisionalOk = (offerId = 'offer-1'): RequestDeals => ({
    [offerId]: [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })],
  });

  it('보고만으로는 정리되지 않고, 집주인이 확인해야 정리된다', () => {
    const r = base();
    const reported = { 'offer-1': [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })] } as RequestDeals;
    expect(dealPhase(ctx(r, reported, 'offer-2'))).toBe('MATCHED');
    expect(dealPhase(ctx(r, provisionalOk(), 'offer-2'))).toBe('CLOSED_ELSEWHERE');
    expect(dealPhase(ctx(r, provisionalOk(), 'offer-1'))).toBe('PROVISIONAL');
    expect(winnerOf(provisionalOk())).toBe('offer-1');
  });

  it('이긴 곳이 나중에 깨져도 정리된 곳은 되살리지 않는다', () => {
    const d = provisionalOk();
    d['offer-1'].push(ev(2, { kind: 'REPORT', step: 'BROKEN' }), ev(3, { kind: 'ANSWER', step: 'BROKEN', ok: true }));
    expect(dealPhase(ctx(base(), d, 'offer-2'))).toBe('CLOSED_ELSEWHERE');
    expect(dealPhase(ctx(base(), d, 'offer-1'))).toBe('BROKEN');
  });

  it('광고 내림 확인 n/m: 광고를 올렸던 곳만 센다 (안 올린 곳은 안내하지 않음)', () => {
    const d = provisionalOk();
    expect(adRemoval(base(), d)).toEqual({ done: 0, total: 1 }); // offer-3은 광고 없음 → 세지 않음
    d['offer-2'] = [ev(2, { kind: 'AD_REMOVED' })];
    expect(adRemoval(base(), d)).toEqual({ done: 1, total: 1 });
    expect(adRemoval(base({ ads: ['offer-1'] }), provisionalOk())).toEqual({ done: 0, total: 0 });
    expect(adRemoval(base(), {})).toBeNull();
  });

  it('자동 취소: 정리되는 곳의 앞으로 잡힌 방문만, 양쪽 모두 안내', () => {
    const visits: VisitBooking[] = [
      { id: 'win', offerId: 'offer-1', date: '2026-11-03', hour: 19 },
      { id: 'lose', offerId: 'offer-2', date: '2026-11-03', hour: 20 },
      { id: 'past', offerId: 'offer-2', date: '2026-10-30', hour: 19 },
    ];
    const r = base({ visits });
    const c = closeOthers(r, {}, 'offer-1', now);
    expect(c.canceledVisitIds).toEqual(['lose']);
    expect(c.visits.find((v) => v.id === 'lose')).toMatchObject({ canceledBy: 'SYSTEM', cancelReason: 'ELSEWHERE' });
    expect(c.visits.find((v) => v.id === 'win')?.canceledAt).toBeUndefined();
    expect(c.visits.find((v) => v.id === 'past')?.canceledAt).toBeUndefined();
    expect(canceledNotices(c.visits, 'OWNER').map((v) => v.id)).toEqual(['lose']);
    expect(canceledNotices(c.visits, { offerId: 'offer-2' }).map((v) => v.id)).toEqual(['lose']);
    // 이미 이긴 곳이 있으면 아무 일도 없다
    expect(closeOthers(r, provisionalOk(), 'offer-1', now).closedOfferIds).toEqual([]);
  });
});

describe('안내 = 실제 (매칭 1~3곳 × 광고 × 방문 0~2건 전수)', () => {
  const ids = ['offer-1', 'offer-2', 'offer-3'];
  let combos = 0;
  let mismatch = 0;
  for (let m = 1; m <= 3; m++) {
    for (let adMask = 0; adMask < 8; adMask++) {
      for (let nv = 0; nv <= 2; nv++) {
        const matched = ids.slice(0, m);
        const ads = ids.filter((_, i) => adMask & (1 << i));
        const visits: VisitBooking[] = matched.slice(1).flatMap((o, i) =>
          Array.from({ length: nv }, (_, k) => ({ id: `${o}-${k}`, offerId: o, date: '2026-11-04', hour: 13 + i * 3 + k })),
        );
        const r = base({ matched, ads, visits });
        for (const action of [
          { who: 'OWNER', kind: 'ANSWER', step: 'PROVISIONAL', ok: true },
          { who: 'OWNER', kind: 'ANSWER', step: 'CONTRACT', ok: true },
          { who: 'OWNER', kind: 'DECLARE' },
        ] as const) {
          combos++;
          const lines = consequences(action, ctx(r, {}), now);
          const c = closeOthers(r, {}, 'offer-1', now);
          const n = (k: string) => Number(lines.find((l) => l.key === k)?.vars?.n ?? 0);
          if (n('OTHERS_CLOSED') !== c.closedOfferIds.length || n('ADS_STOP') !== c.adStopOfferIds.length || n('VISITS_CANCELED') !== c.canceledVisitIds.length) mismatch++;
          if (m === 1 && lines.some((l) => l.key === 'ADS_STOP' || l.key === 'OTHERS_CLOSED')) mismatch++;
        }
      }
    }
  }
  it(`${combos}개 조합 불일치 0건`, () => expect(mismatch).toBe(0));

  it('중개사 확인 창에는 다른 중개사 이야기가 없다 (블라인드)', () => {
    for (const step of REPORT_STEPS) {
      const lines = consequences({ who: 'BROKER', kind: 'REPORT', step }, ctx(base(), {}), now);
      expect(lines.some((l) => ['OTHERS_CLOSED', 'ADS_STOP', 'VISITS_CANCELED'].includes(l.key))).toBe(false);
    }
  });

  it('아니에요 안내: 기록 남음 + 중개사가 전화', () => {
    expect(consequences({ who: 'OWNER', kind: 'ANSWER', step: 'CONTRACT', ok: false }, ctx(base(), {}), now).map((l) => l.key)).toEqual(['RECORD_KEPT', 'BROKER_WILL_CALL']);
  });
});

describe('기록 (블라인드)', () => {
  it('중개사 A의 기록에 B의 방문·이벤트·offerId가 없다', () => {
    const r = base({ visits: [{ id: 'a1', offerId: 'offer-1', date: '2026-11-03', hour: 19, createdAt: iso(-2) }, { id: 'b1', offerId: 'offer-2', date: '2026-11-03', hour: 20, createdAt: iso(-1) }] });
    const d: RequestDeals = { 'offer-2': [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })] };
    const items = timeline(ctx(r, d, 'offer-1'));
    const text = JSON.stringify(items);
    expect(text).not.toContain('offer-2');
    expect(text).not.toContain('b1');
    expect(items.map((i) => i.kind)).toEqual(['MATCHED', 'AD_POSTED', 'VISIT', 'CLOSED_ELSEWHERE']);
  });

  it('시간 순으로 쌓인다 (날짜 바꾸기 포함)', () => {
    const d: RequestDeals = {
      'offer-1': [ev(-5, { kind: 'OWNER_CHECKED', how: 'CONFIRMED' }), ev(1, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }), ev(2, { kind: 'DATE', field: 'BALANCE', date: '2026-12-27' })],
    };
    const items = timeline(ctx(base(), d));
    expect(items.map((i) => i.kind)).toEqual(['MATCHED', 'AD_POSTED', 'OWNER_CHECKED', 'DATE', 'DATE']);
    expect(items.at(-1)).toMatchObject({ from: '2026-12-20', to: '2026-12-27' });
  });
});

describe('지금 할 일', () => {
  const checked = (extra: DealEvent[] = []): RequestDeals => ({ 'offer-1': [ev(-9, { kind: 'OWNER_CHECKED', how: 'CONFIRMED' }), ...extra] });

  it('중개사: 소유자 확인 → 광고 → 방문·가계약', () => {
    const noAd = base({ ads: [] });
    expect(nextAction(ctx(noAd, {}), 'BROKER', now).kind).toBe('OWNER_CHECK');
    expect(nextAction(ctx(noAd, {}), 'BROKER', now, { ownerChecked: true }).kind).toBe('POST_AD'); // 기존 저장 위치 대신
    expect(nextAction(ctx(noAd, checked()), 'BROKER', now)).toMatchObject({ kind: 'POST_AD', vars: { h: 38 } });
    expect(nextAction(ctx(base(), checked()), 'BROKER', now)).toMatchObject({ kind: 'VISITS_AND_DEAL', reports: ['PROVISIONAL', 'CONTRACT'] });
    expect(nextAction(ctx(base(), checked()), 'OWNER', now).kind).toBe('IN_PROGRESS');
  });

  it('확인 대기: 집주인은 확인하기, 중개사는 기다림', () => {
    const d = checked([ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })]);
    expect(nextAction(ctx(base(), d), 'OWNER', now)).toMatchObject({ kind: 'CONFIRM', vars: { step: 'PROVISIONAL' } });
    expect(nextAction(ctx(base(), d), 'BROKER', now).kind).toBe('WAIT_OWNER');
  });

  it('아니에요 뒤 중개사는 전화로 확인', () => {
    const d = checked([ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: false })]);
    expect(nextAction(ctx(base(), d), 'BROKER', now)).toMatchObject({ kind: 'CALL_OWNER', vars: { step: 'PROVISIONAL' } });
  });

  it('캘린더 안내는 날짜가 정해진 직후에만, 바꾸면 다시', () => {
    const prov = [ev(-3, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(-2, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })];
    const noDates = checked(prov);
    expect(nextAction(ctx(base(), noDates), 'BROKER', now).kind).toBe('SET_DATES');
    const withDates = checked([...prov, ev(-1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' })]);
    for (const v of ['OWNER', 'BROKER'] as const) expect(nextAction(ctx(base(), withDates), v, now).kind).toBe('SAVE_CALENDAR');
    const saved = { calendarSavedAt: iso(-0.5) };
    expect(nextAction(ctx(base(), withDates), 'OWNER', now, saved)).toMatchObject({ kind: 'UNTIL_CONTRACT', vars: { dday: 7 } });
    expect(nextAction(ctx(base(), withDates), 'BROKER', now, saved)).toMatchObject({ kind: 'UNTIL_CONTRACT', vars: { dday: 7 } });
    const changed = checked([...prov, ev(-1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }), ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-09' })]);
    expect(nextAction(ctx(base(), changed), 'OWNER', now, saved).kind).toBe('SAVE_CALENDAR');
  });

  it('날짜를 오늘로 바꿔도 당일엔 캘린더 저장을 묻지 않는다', () => {
    const d = checked([
      ev(-3, { kind: 'REPORT', step: 'PROVISIONAL' }),
      ev(-2, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }),
      ev(-1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-01' }),
    ]);
    for (const v of ['OWNER', 'BROKER'] as const) {
      expect(nextAction(ctx(base(), d), v, now).kind).toBe('CONTRACT_DAY');
      expect(cardStrip(ctx(base(), d), v, now).key).not.toBe('SAVE_CALENDAR');
    }
  });

  it('계약하는 날: 중개사는 서류 안내 + 계약 완료, 집주인은 확인만 (캘린더 저장 묻지 않음)', () => {
    const d = checked([
      ev(-3, { kind: 'REPORT', step: 'PROVISIONAL' }),
      ev(-2, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }),
      ev(-1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-01' }),
    ]);
    const saved = { calendarSavedAt: iso(-0.5) };
    expect(nextAction(ctx(base(), d), 'BROKER', now, saved)).toMatchObject({ kind: 'CONTRACT_DAY', docs: 'CONTRACT', reports: ['CONTRACT', 'BROKEN'], vars: { dday: 0 } });
    const owner = nextAction(ctx(base(), d), 'OWNER', now, saved);
    expect(owner).toMatchObject({ kind: 'CONTRACT_DAY', vars: { dday: 0 } });
    expect(owner.docs).toBeUndefined(); // 서류 안내는 중개사만
  });

  it('잔금 날 → 완료 뒤 후기', () => {
    const d = checked([
      ev(-6, { kind: 'DATE', field: 'CONTRACT', date: '2026-10-25' }),
      ev(-6, { kind: 'DATE', field: 'BALANCE', date: '2026-11-02' }),
      ev(-5, { kind: 'REPORT', step: 'CONTRACT' }),
      ev(-4, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
    ]);
    const saved = { calendarSavedAt: iso(-1) };
    expect(nextAction(ctx(base(), d), 'BROKER', now, saved)).toMatchObject({ kind: 'BALANCE_DAY', docs: 'BALANCE', vars: { dday: 1 } });
    const done = { 'offer-1': [...d['offer-1'], ev(1, { kind: 'REPORT', step: 'BALANCE' }), ev(2, { kind: 'ANSWER', step: 'BALANCE', ok: true })] };
    expect(nextAction(ctx(base(), done), 'OWNER', now).kind).toBe('FEE_CHECK'); // 복비 답이 먼저 (⑥)
    done['offer-1'].push(ev(3, { kind: 'FEE_ANSWER', kept: true }));
    expect(nextAction(ctx(base(), done), 'OWNER', now).kind).toBe('WRITE_REVIEW');
    expect(nextAction(ctx(base(), done), 'BROKER', now).kind).toBe('WAIT_REVIEW');
  });

  it('정리된 중개사: 광고 내려 주세요 → 내리면 끝', () => {
    const d: RequestDeals = { 'offer-1': [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })] };
    expect(nextAction(ctx(base(), d, 'offer-2'), 'BROKER', now).kind).toBe('REMOVE_AD');
    expect(nextAction(ctx(base(), d, 'offer-3'), 'BROKER', now).kind).toBe('CLOSED'); // 광고 없던 곳
    d['offer-2'] = [ev(2, { kind: 'AD_REMOVED' })];
    expect(nextAction(ctx(base(), d, 'offer-2'), 'BROKER', now).kind).toBe('CLOSED');
  });

  it('집주인이 해제한 곳', () => {
    const r = { ...base(), releasedOfferIds: ['offer-1'] };
    expect(nextAction(ctx(r, {}), 'BROKER', now).kind).toBe('RELEASED');
  });
});

describe('색 띠', () => {
  const withAdWindow = (hoursAgo: number) => ({ ...base({ ads: [] }), adWindowStartedAt: iso(-hoursAgo) });
  const checked: RequestDeals = { 'offer-1': [ev(-9, { kind: 'OWNER_CHECKED', how: 'CONFIRMED' })] };

  it('광고 기한 경계: 25시간 초록 · 24시간 노랑 · 6시간 빨강 · 지남 빨강', () => {
    expect(cardStrip(ctx(withAdWindow(23), checked), 'BROKER', now)).toMatchObject({ tone: 'GOOD', key: 'AD_LEFT', vars: { h: 25 } });
    expect(cardStrip(ctx(withAdWindow(24), checked), 'BROKER', now)).toMatchObject({ tone: 'CAUTION', key: 'AD_SOON', vars: { h: 24 } });
    expect(cardStrip(ctx(withAdWindow(42), checked), 'BROKER', now)).toMatchObject({ tone: 'RISK', key: 'AD_LEFT', vars: { h: 6 } });
    expect(cardStrip(ctx(withAdWindow(49), checked), 'BROKER', now)).toMatchObject({ tone: 'RISK', key: 'AD_OVERDUE' });
    expect(cardStrip(ctx(withAdWindow(49), checked), 'OWNER', now).tone).toBe('RISK');
  });

  it('겹치면: 중개사는 빨강 > 파랑, 집주인은 파랑(확인해 주세요) > 빨강 (대표님 2026-10-25)', () => {
    const r = { ...withAdWindow(49), visits: [{ id: 'v', offerId: 'offer-1', date: '2026-11-01', hour: 19 }] };
    const d: RequestDeals = { 'offer-1': [...checked['offer-1'], ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })] };
    expect(cardStrip(ctx(r, d), 'OWNER', now)).toMatchObject({ tone: 'ACTION', key: 'CONFIRM' }); // 광고 지남 + 확인 대기 + 방문 오늘
    expect(cardStrip(ctx(withAdWindow(49), checked), 'BROKER', now).tone).toBe('RISK');
    expect(cardStrip(ctx(withAdWindow(49), { 'offer-1': [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })] }), 'BROKER', now).tone).toBe('RISK'); // 중개사는 기한이 먼저
    const r2 = { ...base(), visits: r.visits };
    expect(cardStrip(ctx(r2, d), 'OWNER', now)).toMatchObject({ tone: 'ACTION', key: 'CONFIRM' });
    expect(cardStrip(ctx(r2, checked), 'OWNER', now)).toMatchObject({ tone: 'CAUTION', key: 'VISIT_SOON', vars: { h: 7 } });
    expect(cardStrip(ctx(base(), checked), 'OWNER', now)).toMatchObject({ tone: 'GOOD', key: 'AD_LIVE' });
  });

  it('방문 24시간 경계와 다른 중개사 방문 제외', () => {
    const at = (date: string, hour: number, offerId = 'offer-1') => ({ ...base(), visits: [{ id: 'v', offerId, date, hour }] });
    expect(cardStrip(ctx(at('2026-11-02', 12), checked), 'BROKER', now)).toMatchObject({ tone: 'CAUTION', key: 'VISIT_SOON', vars: { h: 24 } });
    expect(cardStrip(ctx(at('2026-11-02', 13), checked), 'BROKER', now)).toMatchObject({ key: 'AD_LIVE' }); // 25시간 뒤 방문 = 초록, 광고 초록이 먼저
    expect(cardStrip(ctx(at('2026-11-01', 19, 'offer-2'), checked), 'BROKER', now).key).toBe('AD_LIVE');
  });

  it('가계약 뒤 계약일이 비어 있으면 중개사에게 파랑 "날짜를 넣어 주세요" (집주인은 아님)', () => {
    const d: RequestDeals = { 'offer-1': [...checked['offer-1'], ev(-2, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(-1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })] };
    expect(cardStrip(ctx(base(), d), 'BROKER', now)).toMatchObject({ tone: 'ACTION', key: 'SET_DATES' });
    expect(cardStrip(ctx(base(), d), 'OWNER', now).key).not.toBe('SET_DATES');
  });

  it('계약일 지났는데 보고 전이면 빨강, 끝난 거래는 회색', () => {
    const d: RequestDeals = {
      'offer-1': [...checked['offer-1'], ev(-5, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(-4, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }), ev(-3, { kind: 'DATE', field: 'CONTRACT', date: '2026-10-31' })],
    };
    expect(cardStrip(ctx(base(), d), 'BROKER', now, { calendarSavedAt: iso(-1) })).toMatchObject({ tone: 'RISK', key: 'DATE_PASSED' });
    expect(cardStrip(ctx(base(), d, 'offer-3'), 'OWNER', now)).toMatchObject({ tone: 'DONE', key: 'CLOSED' });
  });
});

describe('집주인이 직접 계약을 알림', () => {
  it('매칭·가계약 단계에서 바로 계약 확정, 처음이면 다른 곳 정리', () => {
    const e = [ev(0, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })];
    expect(dealState(e)).toMatchObject({ phase: 'CONTRACTED', ownerDeclared: true, committedAt: iso(0) });
    expect(dealPhase(ctx(base(), { 'offer-1': e }, 'offer-2'))).toBe('CLOSED_ELSEWHERE');
    const prov = [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }), ev(2, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })];
    expect(dealState(prov)).toMatchObject({ phase: 'CONTRACTED', committedAt: iso(1) });
  });

  it('중개사 보고가 확인 대기 중이어도 집주인 알림이 우선 (대기 보고 정리), 이미 계약 뒤면 건너뛴다', () => {
    expect(dealState([ev(0, { kind: 'REPORT', step: 'CONTRACT' }), ev(1, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })])).toMatchObject({ phase: 'CONTRACTED', pending: null, ownerDeclared: true });
    expect(canOwnerDeclare({ phase: 'CONTRACTED' })).toBe(false);
    expect(canOwnerDeclare({ phase: 'DONE' })).toBe(false);
  });

  it('중개사는 소유자 확인을 건너뛰고 "집주인이 계약을 알렸어요 · 날짜 넣기"', () => {
    const d: RequestDeals = { 'offer-1': [ev(0, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })] };
    expect(nextAction(ctx(base(), d), 'BROKER', now)).toMatchObject({ kind: 'SET_DATES', vars: { declared: 'CONTRACT' } });
    expect(cardStrip(ctx(base(), d), 'BROKER', now)).toMatchObject({ tone: 'ACTION', key: 'SET_DATES' });
    expect(timeline(ctx(base(), d)).map((i) => i.kind)).toContain('OWNER_DECLARED');
  });

  it('집주인 확인 카드에 보고된 날짜가 실린다', () => {
    const d: RequestDeals = {
      'offer-1': [ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }), ev(0, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }), ev(1, { kind: 'REPORT', step: 'CONTRACT' })],
    };
    expect(nextAction(ctx(base(), d), 'OWNER', now)).toMatchObject({ kind: 'CONFIRM', vars: { step: 'CONTRACT', contract: '2026-11-08', balance: '2026-12-20' } });
  });
});

describe('의뢰 단계 맞추기 (applyDeals)', () => {
  const contracted = (extra: DealEvent[] = []): RequestDeals => ({
    'offer-1': [
      ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }),
      ev(0, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }),
      ev(1, { kind: 'REPORT', step: 'CONTRACT' }),
      ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
      ...extra,
    ],
  });
  it('계약 확인 → CONTRACTED + 거래 날짜, 광고 링크는 기록용으로 남김. 다시 적용해도 같다', () => {
    const r = applyDeals(base(), contracted(), now);
    expect(r).toMatchObject({ stage: 'CONTRACTED', contract: { offerId: 'offer-1', reportedBy: 'BROKER', contractDate: '2026-11-08', balanceDate: '2026-12-20' } });
    expect(timeline(ctx(r, contracted())).map((i) => i.kind)).toContain('AD_POSTED');
    expect(applyDeals(r, contracted(), now)).toEqual(r);
  });
  it('후기·복비 답은 지키고, 집주인이 알린 계약은 OWNER', () => {
    const r = applyDeals(base(), contracted(), now);
    const answered = { ...r, contract: { ...r.contract!, feeKept: true } };
    expect(applyDeals(answered, contracted(), now).contract?.feeKept).toBe(true);
    expect(applyDeals(base(), { 'offer-1': [ev(0, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })] }, now).contract?.reportedBy).toBe('OWNER');
  });
  it('가계약만이면 그대로, 해제 확인이면 종료', () => {
    const prov: RequestDeals = { 'offer-1': [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(1, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })] };
    expect(applyDeals(base(), prov, now).stage).toBe('IN_PROGRESS');
    prov['offer-1'].push(ev(2, { kind: 'REPORT', step: 'BROKEN' }), ev(3, { kind: 'ANSWER', step: 'BROKEN', ok: true }));
    expect(applyDeals(base(), prov, now)).toMatchObject({ stage: 'ENDED', endedReason: 'DEAL_BROKEN' });
  });
});

describe('⑥ 복비 확인 · 후기 · 약속 이행 · 크레딧 돌려받기', () => {
  const dates = (by?: 'OWNER') => [
    ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08', ...(by ? { by } : {}) }),
    ev(0, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20', ...(by ? { by } : {}) }),
  ];
  const reported = [ev(1, { kind: 'REPORT', step: 'CONTRACT' }), ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true })];
  const balanceDone = [ev(5, { kind: 'REPORT', step: 'BALANCE' }), ev(6, { kind: 'ANSWER', step: 'BALANCE', ok: true })];

  it('복비 답은 계약 확정 뒤 한 번만, 후기는 잔금 확인 뒤 한 번만', () => {
    expect(dealState([ev(0, { kind: 'FEE_ANSWER', kept: true })]).feeKept).toBeNull(); // 계약 전
    const s = dealState([...dates(), ...reported, ev(3, { kind: 'FEE_ANSWER', kept: true }), ev(4, { kind: 'FEE_ANSWER', kept: false })]);
    expect(s.feeKept).toBe(true);
    expect(dealState([...dates(), ...reported, ev(3, { kind: 'REVIEW', stars: 5, chips: [] })]).review).toBeNull(); // 잔금 전
    const done = dealState([...dates(), ...reported, ...balanceDone, ev(7, { kind: 'REVIEW', stars: 4, chips: ['연락이 빨라요'] }), ev(8, { kind: 'REVIEW', stars: 1, chips: [] })]);
    expect(done.review).toMatchObject({ stars: 4, chips: ['연락이 빨라요'] });
  });

  it('약속 이행 조건표 전수: 복비 그대로 × 중개사가 알림 × 중개사가 날짜', () => {
    let checked = 0;
    for (const kept of [true, false, null] as const) {
      for (const declared of [false, true]) {
        for (const ownerDates of [false, true]) {
          const contract = declared ? [ev(2, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })] : reported;
          const fee = kept === null ? [] : [ev(3, { kind: 'FEE_ANSWER', kept })];
          const s = dealState([...dates(ownerDates ? 'OWNER' : undefined), ...contract, ...fee]);
          expect(promiseKept(s), `${kept}/${declared}/${ownerDates}`).toBe(kept === true && !declared && !ownerDates);
          checked++;
        }
      }
    }
    expect(checked).toBe(12);
  });

  it('크레딧 돌려받기: 잔금 확인 + 후기 (별점 무관), 자동·한 번만, 쓴 크레딧이 없으면 없음', () => {
    expect(creditReturnable(dealState([...dates(), ...reported, ...balanceDone]))).toBe(false);
    const events = [...dates(), ...reported, ...balanceDone, ev(7, { kind: 'REVIEW', stars: 1, chips: [] })];
    expect(creditReturnable(dealState(events))).toBe(true);
    const spent = spendCredit(refillWeekly(EMPTY_WALLET, now), 'R', now);
    if (!spent.ok) throw new Error('spend');
    const ws = { ...EMPTY_WORKSPACE, wallet: spent.wallet, sent: [{ requestId: 'R', offerId: 'offer-1', sentAt: iso(-20), strengths: [], snapshot: {} as never }] };
    const market = { ...EMPTY_MARKET, deals: { R: { 'offer-1': events } } };
    const once = settleDealReturns(ws, market, now);
    expect(once.wallet.balance).toBe(3);
    expect(once.wallet.events.at(-1)).toMatchObject({ kind: 'REFUND', reason: 'DEAL', requestId: 'R' });
    expect(settleDealReturns(once, market, now)).toBe(once); // 다시 실행해도 그대로
    const noSpend = { ...ws, wallet: refillWeekly(EMPTY_WALLET, now) };
    expect(settleDealReturns(noSpend, market, now)).toBe(noSpend);
    expect(keptPromiseCount(ws, market)).toBe(0); // 복비 답 없음
    const withFee = { ...market, deals: { R: { 'offer-1': [...events, ev(3, { kind: 'FEE_ANSWER', kept: true })] } } };
    expect(keptPromiseCount(ws, withFee)).toBe(1);
  });

  it('집주인 지금 할 일: 확인 → 복비 확인 → (48시간 지나 날짜 없으면) 직접 넣기 → 후기 즉시 → 끝', () => {
    const d = (e: DealEvent[]): RequestDeals => ({ 'offer-1': e });
    const contractNoDates = [ev(-1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }), ev(0, { kind: 'REPORT', step: 'CONTRACT' })];
    expect(nextAction(ctx(base(), d(contractNoDates)), 'OWNER', now).kind).toBe('CONFIRM');
    const confirmedAt = (h: number) => [ev(h - 1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }), ev(h - 0.5, { kind: 'REPORT', step: 'CONTRACT' }), ev(h, { kind: 'ANSWER', step: 'CONTRACT', ok: true })];
    expect(nextAction(ctx(base(), d(confirmedAt(-1))), 'OWNER', now).kind).toBe('FEE_CHECK');
    const answered = (h: number) => [...confirmedAt(h), ev(h + 0.1, { kind: 'FEE_ANSWER', kept: true })];
    expect(nextAction(ctx(base(), d(answered(-47))), 'OWNER', now, { calendarSavedAt: iso(0) }).kind).not.toBe('OWNER_SET_DATES'); // 47시간
    expect(nextAction(ctx(base(), d(answered(-48))), 'OWNER', now, { calendarSavedAt: iso(0) }).kind).toBe('OWNER_SET_DATES'); // 48시간
    expect(cardStrip(ctx(base(), d(confirmedAt(-1))), 'OWNER', now)).toMatchObject({ tone: 'ACTION', key: 'FEE_CHECK' });
    const done = [...dates(), ...reported, ev(3, { kind: 'FEE_ANSWER', kept: true }), ...balanceDone];
    expect(nextAction(ctx(base(), d(done)), 'OWNER', now).kind).toBe('WRITE_REVIEW');
    expect(cardStrip(ctx(base(), d(done)), 'OWNER', now)).toMatchObject({ tone: 'ACTION', key: 'WRITE_REVIEW' });
    expect(nextAction(ctx(base(), d(done)), 'BROKER', now).kind).toBe('WAIT_REVIEW');
    const reviewed = [...done, ev(7, { kind: 'REVIEW', stars: 5, chips: [] })];
    expect(nextAction(ctx(base(), d(reviewed)), 'OWNER', now).kind).toBe('REVIEW_DONE');
    expect(nextAction(ctx(base(), d(reviewed)), 'BROKER', now).kind).toBe('CREDIT_RETURNED');
    expect(cardStrip(ctx(base(), d(reviewed)), 'BROKER', now)).toMatchObject({ tone: 'DONE', key: 'CREDIT_RETURNED' });
  });

  it('applyDeals가 복비 답·후기를 계약 정보에 채운다 (진행 막대용)', () => {
    const r = applyDeals(base(), { 'offer-1': [...dates(), ...reported, ev(3, { kind: 'FEE_ANSWER', kept: true }), ...balanceDone, ev(7, { kind: 'REVIEW', stars: 5, chips: ['a'] })] }, now);
    expect(r.contract).toMatchObject({ feeKept: true, review: { stars: 5, chips: ['a'] } });
  });

  it('깨진 복비 답·후기·날짜 by는 읽을 때 버린다', () => {
    const raw = JSON.stringify({
      deals: {
        R: {
          o: [
            { id: 'a', at: iso(0), kind: 'FEE_ANSWER', kept: 'yes' },
            { id: 'b', at: iso(0), kind: 'REVIEW', stars: 6, chips: [] },
            { id: 'c', at: iso(0), kind: 'REVIEW', stars: 3, chips: [1] },
            { id: 'd', at: iso(0), kind: 'DATE', field: 'BALANCE', date: '2026-12-20', by: 'BROKER' },
            { id: 'e', at: iso(0), kind: 'REVIEW', stars: 3, chips: ['좋아요'] },
          ],
        },
      },
    });
    expect(parseMarket(raw).deals?.R.o.map((x) => x.id)).toEqual(['e']);
  });
});

describe('피드백 반영 (2026-10-26)', () => {
  it('집주인이 직접 가계약을 알리면 가계약 확정, 다른 곳 정리, 중개사엔 "집주인이 가계약을 알렸어요 · 날짜 넣기"', () => {
    const d: RequestDeals = { 'offer-1': [ev(0, { kind: 'OWNER_DECLARED', step: 'PROVISIONAL' })] };
    expect(dealState(d['offer-1'])).toMatchObject({ phase: 'PROVISIONAL', declaredStep: 'PROVISIONAL', ownerDeclared: false, committedAt: iso(0) });
    expect(dealPhase(ctx(base(), d, 'offer-2'))).toBe('CLOSED_ELSEWHERE');
    expect(nextAction(ctx(base(), d), 'BROKER', now)).toMatchObject({ kind: 'SET_DATES', vars: { declared: 'PROVISIONAL' } });
    // 가계약 단계에서 또 가계약 알림은 건너뜀, 계약 알림은 됨
    expect(canOwnerDeclare({ phase: 'PROVISIONAL' }, 'PROVISIONAL')).toBe(false);
    expect(canOwnerDeclare({ phase: 'PROVISIONAL' }, 'CONTRACT')).toBe(true);
    expect(consequences({ who: 'OWNER', kind: 'DECLARE', step: 'PROVISIONAL' }, ctx(base(), {}), now).map((l) => l.key)).toContain('BROKER_SETS_DATES');
  });

  it('가계약만 집주인이 알리고 계약은 중개사가 알리면 약속 이행에 쌓인다', () => {
    const s = dealState([
      ev(0, { kind: 'OWNER_DECLARED', step: 'PROVISIONAL' }),
      ev(1, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }),
      ev(1, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }),
      ev(2, { kind: 'REPORT', step: 'CONTRACT' }),
      ev(3, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
      ev(4, { kind: 'FEE_ANSWER', kept: true }),
    ]);
    expect(promiseKept(s)).toBe(true);
    expect(s.declaredStep).toBeNull(); // 계약 확인 뒤엔 "집주인이 알렸어요" 안내 끝
  });

  it('복비 아니에요 사유: 칩 저장, 사유 없으면 기타, 기록 줄에 사유', () => {
    const base3 = [ev(0, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })];
    expect(dealState([...base3, ev(1, { kind: 'FEE_ANSWER', kept: false, reason: 'OVERCHARGED' })]).feeReason).toBe('OVERCHARGED');
    expect(dealState([...base3, ev(1, { kind: 'FEE_ANSWER', kept: false })]).feeReason).toBe('OTHER');
    expect(dealState([...base3, ev(1, { kind: 'FEE_ANSWER', kept: true, reason: 'AGREED' })]).feeReason).toBeNull();
    const items = timeline(ctx(base(), { 'offer-1': [...base3, ev(1, { kind: 'FEE_ANSWER', kept: false, reason: 'AGREED' })] }));
    expect(items.find((i) => i.kind === 'FEE_ANSWER')).toMatchObject({ kept: false, reason: 'AGREED' });
    const raw = JSON.stringify({ deals: { R: { o: [{ id: 'a', at: iso(0), kind: 'FEE_ANSWER', kept: false, reason: 'NOPE' }, { id: 'b', at: iso(0), kind: 'FEE_ANSWER', kept: false, note: 'x'.repeat(81) }, { id: 'c', at: iso(0), kind: 'FEE_ANSWER', kept: false, reason: 'OTHER', note: '짧은 이유' }] } } });
    expect(parseMarket(raw).deals?.R.o.map((x) => x.id)).toEqual(['c']);
  });

  it('새 소식: 상대가 만든 기록만, 마지막으로 연 뒤의 것만, 최신이 앞', () => {
    const r = base({ visits: [{ id: 'v', offerId: 'offer-1', date: '2026-11-03', hour: 19, createdAt: iso(-1) }] });
    const d: RequestDeals = { 'offer-1': [ev(-3, { kind: 'REPORT', step: 'PROVISIONAL' }), ev(-2, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true })] };
    const owner = newsSince(ctx(r, d), 'OWNER', iso(-2.5));
    expect(owner.map((i) => i.kind)).toEqual(['VISIT']); // 가계약 보고(-3)는 이미 봄, 확인(-2)은 내가 한 것
    expect(newsSince(ctx(r, d), 'BROKER', iso(-2.5)).map((i) => i.kind)).toEqual(['ANSWERED']);
    expect(newsSince(ctx(r, d), 'OWNER', null).map((i) => i.kind)).toEqual(['VISIT', 'REPORTED', 'AD_POSTED']); // 매칭 줄은 새 소식 아님
    expect(newsSince(ctx(r, d), 'OWNER', iso(0))).toEqual([]);
    // 저장 시각 없는 예전 방문(미래 날짜)도 한 번 열면 꺼진다
    const legacy = base({ visits: [{ id: 'old', offerId: 'offer-1', date: '2026-11-20', hour: 19 }] });
    expect(newsSince(ctx(legacy, {}), 'OWNER', iso(0))).toEqual([]);
  });

  it('목록 순서: 내가 할 일·새 소식 카드 먼저, 그 안에서 색 순서', () => {
    const s = (tone: StripTone) => ({ tone, key: 'IN_PROGRESS' as const, vars: {} });
    const order = [
      { id: 'red', r: listRank(s('RISK'), false, 'OWNER') },
      { id: 'newsGreen', r: listRank(s('GOOD'), true, 'OWNER') },
      { id: 'blue', r: listRank(s('ACTION'), false, 'OWNER') },
      { id: 'gray', r: listRank(s('DONE'), false, 'OWNER') },
    ].sort((a, b) => a.r - b.r).map((x) => x.id);
    expect(order).toEqual(['blue', 'newsGreen', 'red', 'gray']);
    expect(listRank(s('RISK'), false, 'BROKER')).toBeLessThan(listRank(s('GOOD'), true, 'BROKER')); // 중개사는 빨강이 맨 위
  });

  it('읽음 기록 파싱', () => {
    expect(parseSeen('{"R:o:OWNER":"2026-11-01T00:00:00Z","x":1}')).toEqual({ 'R:o:OWNER': '2026-11-01T00:00:00Z' });
    expect(seenKey('R', 'o', 'BROKER')).toBe('R:o:BROKER');
  });
});

describe('날짜 시트 검사', () => {
  const empty = { CONTRACT: null, MIDDLE: null, BALANCE: null };
  const today = '2026-11-01';
  it('바뀐 게 없으면 NO_CHANGE, 새로 넣는 지난 날짜는 PAST', () => {
    expect(checkDealDates(empty, empty, today)).toBe('NO_CHANGE');
    expect(checkDealDates(empty, { ...empty, CONTRACT: '2026-10-31' }, today)).toBe('PAST');
    expect(checkDealDates(empty, { ...empty, CONTRACT: today }, today)).toBeNull();
  });
  it('이미 지난 계약일은 그대로 두고 잔금일만 넣을 수 있다', () => {
    const cur = { ...empty, CONTRACT: '2026-10-20' };
    expect(checkDealDates(cur, { ...cur, BALANCE: '2026-12-20' }, today)).toBeNull();
  });
  it('순서: 잔금 < 계약, 중도금이 범위 밖', () => {
    expect(checkDealDates(empty, { CONTRACT: '2026-11-10', MIDDLE: null, BALANCE: '2026-11-05' }, today)).toBe('BALANCE_BEFORE_CONTRACT');
    expect(checkDealDates(empty, { CONTRACT: '2026-11-10', MIDDLE: '2026-11-09', BALANCE: '2026-12-20' }, today)).toBe('MIDDLE_OUT');
    expect(checkDealDates(empty, { CONTRACT: '2026-11-10', MIDDLE: '2026-12-21', BALANCE: '2026-12-20' }, today)).toBe('MIDDLE_OUT');
    expect(checkDealDates(empty, { CONTRACT: '2026-11-10', MIDDLE: '2026-11-30', BALANCE: '2026-12-20' }, today)).toBeNull();
  });
  it('바뀐 칸만 이벤트로', () => {
    const cur = { ...empty, CONTRACT: '2026-11-10' };
    const evs = dateEvents(cur, { ...cur, BALANCE: '2026-12-20' }, now, 'd');
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ kind: 'DATE', field: 'BALANCE', date: '2026-12-20' });
  });
});

describe('거래 날짜 캘린더', () => {
  it('정해진 날짜만 하루 종일 일정으로, 파일 하나에 여러 개, 전날 오전 9시 알림', () => {
    const evs = dealDateEvents({ requestId: 'R', offerId: 'offer-1' }, { CONTRACT: '2026-11-08', MIDDLE: null, BALANCE: '2026-12-20' }, {
      complexName: 'e편한세상다산',
      pyeongLabel: '34평',
      dongHo: '101동 1203호',
      phone: '010-1234-5678',
    });
    expect(evs.map((e) => e.title)).toEqual(['e편한세상다산 34평 계약일 · 복비', 'e편한세상다산 34평 잔금일 · 복비']);
    const ics = toIcsMany(evs, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261108');
    expect(ics).toContain('TRIGGER:-PT900M');
    expect(ics).toContain('UID:deal-R-offer-1-balance@bokbi');
  });
  it('저장 기록 파싱: 깨진 값은 버린다', () => {
    expect(parseSavedCalendar('{"a:b":"2026-11-01T00:00:00Z","c":3}')).toEqual({ 'a:b': '2026-11-01T00:00:00Z' });
    expect(parseSavedCalendar('oops')).toEqual({});
    expect(savedKey('R', 'o')).toBe('R:o');
  });
});

describe('저장', () => {
  it('거래 이벤트는 추가만, 같은 id는 무시, 깨진 이벤트는 읽을 때 버린다', () => {
    const e = ev(0, { kind: 'REPORT', step: 'PROVISIONAL' });
    const m = appendDealEvent(appendDealEvent(EMPTY_MARKET, 'R', 'offer-1', e), 'R', 'offer-1', e);
    expect(m.deals?.R['offer-1']).toHaveLength(1);
    const raw = JSON.stringify({
      deals: {
        R: {
          'offer-1': [
            e,
            { id: 'x', at: iso(0), kind: 'REPORT', step: 'NOPE' },
            { id: 'y', at: iso(0), kind: 'DATE', field: 'BALANCE', date: '12/20' },
            { id: 'z', at: iso(0), kind: 'DATE', field: 'MIDDLE', date: null },
            { kind: 'AD_REMOVED' },
          ],
        },
        bad: 3,
      },
    });
    expect(parseMarket(raw).deals?.R['offer-1'].map((x) => x.id)).toEqual([e.id, 'z']);
  });
});
