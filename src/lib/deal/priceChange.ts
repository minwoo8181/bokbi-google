/**
 * 매칭 뒤 집주인 희망가 바꾸기 (대표님 2026-10-27).
 * - 복비는 합의한 비율 그대로 새 희망가로 다시 계산 (dealFee.feeForPrice — 거래금액이 바뀔 때와 같은 규칙, 새 규칙 없음)
 * - 저장: 의뢰의 희망가·복비·법정 상한을 바꾸고 매칭된 곳마다 PRICE_CHANGED 기록 (repo requests.changePrice, DB owner_change_price)
 * - 광고 가격은 중개사가 바꿔야 해서 집주인이 부동산마다 전화·문자로 알리고 "알렸어요"(PRICE_NOTIFIED) 체크.
 *   안 알린 곳은 "지금 확인할 일"에 빨강으로 남는다 (ownerTodo)
 */
import { checkDealPrice, feeForPrice, type AgreedFee, type PriceReject } from './dealFee';
import type { RequestDeals } from './deal';

export type PriceChangeReject = PriceReject | 'SAME';

/** 새 희망가 검사: 빈칸·지금과 같음·너무 멂(절반~2배 밖, DB도 같은 범위로 막음) */
export function checkPriceChange(priceManwon: number | null, currentManwon: number): PriceChangeReject | null {
  if (priceManwon !== null && priceManwon === currentManwon) return 'SAME';
  return checkDealPrice(priceManwon, currentManwon);
}

export interface PriceChangePlan {
  priceManwon: number;
  fromManwon: number;
  /** 새 희망가 기준 복비 (원) */
  feeWon: number;
  /** 새 희망가의 법정 상한 (원) */
  legalMaxWon: number;
  /** 법정 상한 대비 할인 % (반올림, 화면 표시용) */
  discountPct: number;
}

export function priceChangePlan(agreed: AgreedFee, priceManwon: number): PriceChangePlan {
  const f = feeForPrice(agreed, priceManwon);
  return {
    priceManwon,
    fromManwon: agreed.askingPriceManwon,
    feeWon: f.feeWon,
    legalMaxWon: f.legalMaxWon,
    discountPct: f.legalMaxWon > 0 ? Math.round(((f.legalMaxWon - f.feeWon) / f.legalMaxWon) * 100) : 0,
  };
}

/** 바뀐 희망가를 아직 알리지 않은 중개사 (마지막 PRICE_CHANGED 뒤에 같은 금액 PRICE_NOTIFIED가 없음) */
export function pendingPriceNotices(deals: RequestDeals, offerIds: string[]): { offerId: string; priceManwon: number }[] {
  const out: { offerId: string; priceManwon: number }[] = [];
  for (const offerId of offerIds) {
    const events = deals[offerId] ?? [];
    let last = -1;
    events.forEach((e, i) => {
      if (e.kind === 'PRICE_CHANGED') last = i;
    });
    if (last < 0) continue;
    const change = events[last];
    if (change.kind !== 'PRICE_CHANGED') continue;
    const notified = events.slice(last + 1).some((e) => e.kind === 'PRICE_NOTIFIED' && e.priceManwon === change.priceManwon);
    if (!notified) out.push({ offerId, priceManwon: change.priceManwon });
  }
  return out;
}
