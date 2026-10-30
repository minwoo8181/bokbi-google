/**
 * 거래금액이 바뀌었을 때 복비 다시 계산 (결정론, 대표님 확정 2026-10-26)
 * - 합의한 건 금액이 아니라 "법정 상한 대비 비율" (예: 9억 9,000만 상한 495만 중 297만 = 60%)
 * - 새 복비 = 실제 거래금액의 법정 상한(commission.ts) × 합의 비율, 천 원 미만 버림
 * - 법정 요율 구간이 바뀌어도 같은 비율: 올라간 상한에서도, 내려간 상한에서도 60%
 * - 비율은 소수로 저장하지 않고 정수 곱셈·나눗셈으로 계산한다 (희망가 그대로면 합의 금액이 1원도 안 바뀌게)
 */
import { BRACKET_STARTS_WON, calculateLegalCommission } from '@/lib/commission';
import type { TradeType } from '@/components/analysis/types';

export interface AgreedFee {
  tradeType: TradeType;
  /** 합의 때 기준가 (희망가, 만 원) */
  askingPriceManwon: number;
  /** 합의 복비 (원) */
  commissionWon: number;
}

export interface DealFee {
  /** 실제 거래금액 (만 원) */
  priceManwon: number;
  /** 다시 계산한 복비 (원) */
  feeWon: number;
  /** 실제 거래금액의 법정 상한 (원) */
  legalMaxWon: number;
  /** 법정 요율 표시 (예: 0.5%) */
  rateLabel: string;
  /** 합의 비율 (법정 상한의 %, 반올림) */
  ratioPct: number;
  /** 희망가와 같은 금액이라 합의 금액 그대로인지 */
  unchanged: boolean;
}

/** 합의 비율 (법정 상한의 %, 화면 표시용 반올림). 상한을 모르면 null */
export function agreedRatioPct(a: AgreedFee): number | null {
  const max = calculateLegalCommission(a.askingPriceManwon * 10_000, a.tradeType).maxWon;
  return max > 0 ? Math.round((a.commissionWon / max) * 100) : null;
}

export function feeForPrice(a: AgreedFee, priceManwon: number): DealFee {
  const legal = calculateLegalCommission(priceManwon * 10_000, a.tradeType);
  const basisMax = calculateLegalCommission(a.askingPriceManwon * 10_000, a.tradeType).maxWon;
  const ratioPct = basisMax > 0 ? Math.round((a.commissionWon / basisMax) * 100) : 100;
  if (priceManwon === a.askingPriceManwon || basisMax <= 0) {
    return { priceManwon, feeWon: Math.min(a.commissionWon, legal.maxWon), legalMaxWon: legal.maxWon, rateLabel: legal.ratePercentLabel, ratioPct, unchanged: true };
  }
  const raw = Math.floor((a.commissionWon * legal.maxWon) / basisMax / 1000) * 1000;
  return { priceManwon, feeWon: Math.min(raw, legal.maxWon), legalMaxWon: legal.maxWon, rateLabel: legal.ratePercentLabel, ratioPct, unchanged: false };
}

/**
 * 약속·동의 화면 예시 표 (대표님 2026-10-26: 서로 납득하게 실제 요율표로). 금액은 화면에서 feeForPrice로 계산한다 (손으로 적지 않음).
 * 같은 구간 안 / 구간이 내려감 / 구간이 올라감 / 전세
 */
export const FEE_RULE_EXAMPLES: { tradeType: TradeType; askingPriceManwon: number; ratioPct: number; priceManwon: number }[] = [
  { tradeType: '매매', askingPriceManwon: 99_000, ratioPct: 60, priceManwon: 95_000 },
  { tradeType: '매매', askingPriceManwon: 99_000, ratioPct: 60, priceManwon: 89_900 },
  { tradeType: '매매', askingPriceManwon: 85_000, ratioPct: 60, priceManwon: 90_000 },
  { tradeType: '전세', askingPriceManwon: 45_000, ratioPct: 80, priceManwon: 60_000 },
];

/**
 * 예시 한 줄: 합의 복비(비율 그대로, 천 원 미만 버림) → 실제 거래금액의 복비.
 * 화면 세 줄(합의 때 상한·요율 → 실제 거래 → 실제 상한 × 비율)에 쓰는 값을 모두 돌려준다
 */
export function feeRuleExample(x: (typeof FEE_RULE_EXAMPLES)[number]) {
  const basis = calculateLegalCommission(x.askingPriceManwon * 10_000, x.tradeType);
  const agreed: AgreedFee = { tradeType: x.tradeType, askingPriceManwon: x.askingPriceManwon, commissionWon: Math.floor((basis.maxWon * x.ratioPct) / 100 / 1000) * 1000 };
  return { agreed, fee: feeForPrice(agreed, x.priceManwon), basisMaxWon: basis.maxWon, basisRateLabel: basis.ratePercentLabel };
}

/**
 * 법정 상한 대비 할인율 (%, 반올림). 분석 화면 "27%↓"·매칭 모달 "법정 대비 28% 할인"·확정 시트가 모두 이 값을 쓴다.
 * 상한을 모르면 null
 */
export function discountPct(a: AgreedFee): number | null {
  const max = calculateLegalCommission(a.askingPriceManwon * 10_000, a.tradeType).maxWon;
  return max > 0 ? Math.round(((max - Math.min(a.commissionWon, max)) / max) * 100) : null;
}

export interface FeeScenario {
  priceManwon: number;
  feeWon: number;
  /** 이 금액의 법정 상한 (원) — 화면 세 줄 "상한 n원에서 같은 할인율로" */
  legalMaxWon: number;
  rateLabel: string;
  /** 희망가 줄 (합의 금액 그대로) */
  isAsking: boolean;
  /** 희망가와 법정 요율이 다른 줄 */
  rateChanged: boolean;
}

export interface BracketShift {
  /** 요율이 바뀌는 금액 (만 원) */
  boundaryManwon: number;
  /** DOWN: 이 금액 아래로 팔리면 / UP: 이 금액 이상에 팔리면 */
  direction: 'DOWN' | 'UP';
  fromRate: string;
  toRate: string;
}

/** 요율이 바뀌는 금액을 안내하는 범위: 희망가에서 ±15% 안 */
export const BRACKET_SHIFT_RANGE = 0.15;

/** 예시 금액 간격 (만 원): 5억 이상은 5,000만, 아래는 1,000만 */
const stepOf = (askingManwon: number) => (askingManwon >= 50_000 ? 5_000 : 1_000);

/** 희망가에서 가장 가까운 요율 경계 (±15% 안, 없으면 null) */
export function nearestBracketShift(a: AgreedFee): BracketShift | null {
  const asking = a.askingPriceManwon;
  if (asking <= 0) return null;
  const rateAt = (manwon: number) => calculateLegalCommission(manwon * 10_000, a.tradeType).ratePercentLabel;
  let best: BracketShift | null = null;
  let bestGap = Infinity;
  for (const won of BRACKET_STARTS_WON[a.tradeType]) {
    const b = won / 10_000;
    const gap = Math.abs(b - asking);
    if (gap / asking > BRACKET_SHIFT_RANGE || gap >= bestGap) continue;
    bestGap = gap;
    best = b <= asking
      ? { boundaryManwon: b, direction: 'DOWN', fromRate: rateAt(asking), toRate: rateAt(b - 1) }
      : { boundaryManwon: b, direction: 'UP', fromRate: rateAt(asking), toRate: rateAt(b) };
  }
  return best;
}

/**
 * 내 요청으로 계산한 "이 금액에 팔리면" 줄 (높은 금액부터, 최대 4줄):
 * 조금 높게 · 희망가 · 조금 낮게 + 요율이 바뀌는 금액 가까이면 경계 건너편 한 줄
 */
export function personalFeeScenarios(a: AgreedFee): { rows: FeeScenario[]; shift: BracketShift | null } {
  const asking = a.askingPriceManwon;
  if (asking <= 0 || calculateLegalCommission(asking * 10_000, a.tradeType).maxWon <= 0) return { rows: [], shift: null };
  const step = stepOf(asking);
  const up = Math.floor(asking / step) * step + step;
  const down = Math.ceil(asking / step) * step - step;
  const shift = nearestBracketShift(a);
  const prices = new Set([up, asking, down]);
  if (shift) prices.add(shift.direction === 'DOWN' ? shift.boundaryManwon - step : shift.boundaryManwon);
  const askingRate = feeForPrice(a, asking).rateLabel;
  const rows = [...prices]
    .filter((p) => p > 0)
    .sort((x, y) => y - x)
    .slice(0, 4)
    .map((p) => {
      const f = feeForPrice(a, p);
      return { priceManwon: p, feeWon: f.feeWon, legalMaxWon: f.legalMaxWon, rateLabel: f.rateLabel, isAsking: p === asking, rateChanged: f.rateLabel !== askingRate };
    });
  return { rows, shift };
}

/** 이 거래에서 받을 복비: 확정된 거래금액이 있으면 다시 계산, 없으면 합의 복비 그대로 (dealState.priceManwon) */
export function dealFeeWon(a: AgreedFee, priceManwon: number | null): number {
  return priceManwon === null ? a.commissionWon : feeForPrice(a, priceManwon).feeWon;
}

/** 거래금액 입력 확인 (만 원). 희망가의 절반~두 배 밖이면 잘못 친 것으로 본다 */
export type PriceReject = 'EMPTY' | 'OUT_OF_RANGE';
export function checkDealPrice(priceManwon: number | null, askingPriceManwon: number): PriceReject | null {
  if (priceManwon === null || !Number.isFinite(priceManwon) || priceManwon <= 0) return 'EMPTY';
  if (priceManwon < askingPriceManwon / 2 || priceManwon > askingPriceManwon * 2) return 'OUT_OF_RANGE';
  return null;
}
