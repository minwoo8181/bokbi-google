'use client';

/** 내 의뢰 테스트 스위처: 상태별 틀 확인용 예시 의뢰·거래 기록 (배포 전 제거) */
import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { OwnerRequest } from '@/lib/requests/types';
import type { DealEvent, DealEventBody, RequestDeals } from '@/lib/deal/deal';
import { DEMO_OFFERS_WITH_RECORD, demoRequest, withDemoProgress } from './mock-requests';
import { toDateKey } from './format';

const t = SITE_CONTENT.myRequests;
export type OwnerQaKind = Exclude<keyof typeof t.qa, 'title'>;

const allAdsDown = (r: OwnerRequest): OwnerRequest => ({ ...r, offers: r.offers.map((o) => ({ ...o, ad: null })) });

/**
 * 예시 의뢰와 그 의뢰의 거래 기록. 계약 뒤 예시는 거래 기록 이벤트로 만들고 화면에서 applyDeals로 단계를 맞춘다
 * (⑥: 계약 완료 카드 → 거래 페이지). 중개사 화면에서 쌓인 기록과 섞이지 않게 예시마다 새로 만든다
 */
export function ownerQaScenario(kind: OwnerQaKind, d: Date): { request: OwnerRequest | null; deals: RequestDeals; baseId: string } {
  const base = demoRequest(d);
  const contracted = withDemoProgress(base, d, 20);
  const expired = { ...base, createdAt: new Date(d.getTime() - 49 * 3_600_000).toISOString() };
  const map: Record<OwnerQaKind, OwnerRequest | null> = {
    receivingEmpty: { ...base, offers: [] },
    receiving: base,
    receivingRecord: { ...base, offers: DEMO_OFFERS_WITH_RECORD },
    inProgress: withDemoProgress(base, d, 0.7),
    inProgressAdOverdue: withDemoProgress(base, d, 3),
    inProgressUnlocked: withDemoProgress(base, d, 8),
    inProgressTenant: withDemoProgress({ ...base, occupancy: 'TENANT' }, d, 0.7),
    // 중개사가 계약 완료를 알린 상태 (거래 기록 이벤트로)
    inProgressBrokerReported: withDemoProgress(base, d, 8),
    paused: { ...allAdsDown(withDemoProgress(base, d, 9)), paused: { pausedAt: d.toISOString(), reason: '이사 일정이 바뀌었어요' } },
    contractedDatesPending: contracted,
    contractedDatesOverdue: contracted,
    contracted,
    contractedReview: contracted,
    expiredNoOffer: { ...expired, offers: [] },
    expired,
    empty: null,
  };
  const iso = (h: number) => new Date(d.getTime() + h * 3_600_000).toISOString();
  const day = (n: number) => toDateKey(new Date(d.getTime() + n * 86_400_000));
  const ev = (id: string, h: number, body: DealEventBody) => ({ ...body, id: `qa-${id}`, at: iso(h) }) as DealEvent;
  const brokerContract = (h: number, balanceDay: number) => [
    ev('d1', h - 2, { kind: 'DATE', field: 'CONTRACT', date: day(-40) }),
    ev('d2', h - 2, { kind: 'DATE', field: 'BALANCE', date: day(balanceDay) }),
    ev('r', h - 1, { kind: 'REPORT', step: 'CONTRACT' }),
    ev('a', h, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
  ];
  const qaEvents: Partial<Record<OwnerQaKind, DealEvent[]>> = {
    inProgressBrokerReported: [
      ev('d1', -2, { kind: 'DATE', field: 'CONTRACT', date: toDateKey(d) }),
      ev('d2', -2, { kind: 'DATE', field: 'BALANCE', date: day(50) }),
      ev('r', -1, { kind: 'REPORT', step: 'CONTRACT' }),
    ],
    // 집주인이 직접 알림 5시간 전 → 복비 확인부터
    contractedDatesPending: [ev('o', -5, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })],
    // 50시간 지나도 날짜 없음 → 집주인이 직접 넣기
    contractedDatesOverdue: [ev('o', -50, { kind: 'OWNER_DECLARED', step: 'CONTRACT' }), ev('f', -49, { kind: 'FEE_ANSWER', kept: true })],
    contracted: [...brokerContract(-60, 20), ev('f', -59, { kind: 'FEE_ANSWER', kept: true })],
    // 잔금 확인까지 끝남 → 후기 바로
    contractedReview: [
      ...brokerContract(-60, -1),
      ev('f', -59, { kind: 'FEE_ANSWER', kept: true }),
      ev('br', -3, { kind: 'REPORT', step: 'BALANCE' }),
      ev('ba', -2, { kind: 'ANSWER', step: 'BALANCE', ok: true }),
    ],
  };
  return { request: map[kind], deals: qaEvents[kind] ? { 'offer-1': qaEvents[kind]! } : {}, baseId: base.id };
}

export function OwnerQaSwitcher({ onPick }: { onPick: (k: OwnerQaKind) => void }) {
  return (
    <div className="pt-6 border-t border-border-default text-center space-y-2">
      <p className="text-[12px] font-bold text-text-tertiary">{t.qa.title}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(t.qa) as (keyof typeof t.qa)[])
          .filter((k): k is OwnerQaKind => k !== 'title')
          .map((k) => (
            <button key={k} type="button" data-testid={`qa-${k}`} onClick={() => onPick(k)} className="h-9 px-3 rounded-lg bg-surface-card text-[12px] font-bold text-text-secondary">
              {t.qa[k]}
            </button>
          ))}
      </div>
    </div>
  );
}
