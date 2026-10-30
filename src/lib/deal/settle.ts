/**
 * 거래 기록 → 중개사 작업 공간 정산 (결정론·순수 함수, ⑥ 2026-10-25)
 * - 크레딧 자동 돌려받기: 후기가 등록된 거래(creditReturnable)는 그 의뢰에 쓴 크레딧 1개를 돌려받는다 (버튼 없음, 1번만)
 * - 약속 이행 건수: promiseKept인 거래 수 (가짜 숫자 없이 실제 기록으로만)
 * 목업: 중개사 화면이 불러올 때·저장소가 바뀔 때마다 부른다. 서버에선 후기 등록 트랜잭션(RPC) 안에서 처리
 */
import { returnDealCredit } from '@/lib/broker/credits';
import type { BrokerWorkspace, MockMarket } from '@/lib/broker/mockMarket';
import { creditReturnable, dealState, promiseKept, type DealEvent } from './deal';

const stateOf = (m: Pick<MockMarket, 'deals'>, requestId: string, offerId: string) => dealState(m.deals?.[requestId]?.[offerId] ?? []);

/** 돌려받을 거래가 있으면 지갑에 반영. 바뀐 게 없으면 같은 객체를 돌려준다 (저장 여부 판단용) */
export function settleDealReturns(ws: BrokerWorkspace, market: Pick<MockMarket, 'deals'>, now: Date): BrokerWorkspace {
  let wallet = ws.wallet;
  for (const s of ws.sent) {
    if (creditReturnable(stateOf(market, s.requestId, s.offerId))) wallet = returnDealCredit(wallet, s.requestId, now);
  }
  return wallet === ws.wallet ? ws : { ...ws, wallet };
}

export function keptPromiseCount(ws: BrokerWorkspace, market: Pick<MockMarket, 'deals'>): number {
  return ws.sent.filter((s) => promiseKept(stateOf(market, s.requestId, s.offerId))).length;
}

/**
 * 사무소 실적 (A10): 요청 카드별 거래 기록 → 약속 이행 건수(kept) + 계약까지 간 거래 수(total — 0이면 집주인 카드 "복비 첫 거래").
 * 브라우저 저장소는 요청 보낼 때, Supabase는 거래 기록이 추가될 때마다 서버가 다시 세서 broker_offices에 저장
 */
export function promiseStats(eventsByOffer: Iterable<DealEvent[]>): { kept: number; total: number } {
  let kept = 0;
  let total = 0;
  for (const events of eventsByOffer) {
    const s = dealState(events);
    if (s.phase === 'CONTRACTED' || s.phase === 'DONE') total += 1;
    if (promiseKept(s)) kept += 1;
  }
  return { kept, total };
}

/** 브라우저 저장소: 이 중개사가 보낸 요청들의 실적 */
export function workspacePromiseStats(ws: BrokerWorkspace, market: Pick<MockMarket, 'deals'>): { kept: number; total: number } {
  return promiseStats(ws.sent.map((s) => market.deals?.[s.requestId]?.[s.offerId] ?? []));
}
