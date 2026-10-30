import { TradeType } from '@/components/analysis/types';

/**
 * ============================================================================
 * ⚖️ 대한민국 공인중개사법 시행규칙 제20조 제1항 [별표 1]
 * 주택 중개보수 상한요율 및 법정 상한 계산 엔진 (SSOT)
 * ============================================================================
 */

export interface LegalCommissionResult {
  tradeType: TradeType;
  dealPriceWon: number;
  rate: number; // 요율 계수 (e.g. 0.004)
  ratePercent: number; // 백분율 수치 (e.g. 0.4)
  ratePercentLabel: string; // '0.4%'
  maxWon: number; // 법정 상한 금액 (한도액 적용 시 한도액으로 제한)
  limitWon: number | null; // 법정 한도액 (있는 경우)
  bracketDescription: string; // 구간 설명
}

/**
 * 거래금액 × 요율(‰), 원 미만 절사. 정수 연산으로 부동소수 오차(예: 8,040,000.000001)를 막는다.
 * 1원 단위 결과가 네이버 중개보수 계산기와 같아야 한다 (commission.test.ts 대조 케이스).
 */
const byPermille = (price: number, permille: number) => Math.floor((Math.round(price) * permille) / 1000);

/**
 * 거래금액과 거래유형에 따른 정확한 법정 상한 요율 및 상한 금액 산출
 * 
 * @param dealPriceWon 거래금액 (원 단위)
 * @param tradeType '매매' | '전세'
 */
export function calculateLegalCommission(
  dealPriceWon: number,
  tradeType: TradeType
): LegalCommissionResult {
  const price = Math.max(0, dealPriceWon);

  if (tradeType === '매매') {
    if (price < 50000000) {
      // 5천만 원 미만: 0.6% (한도 25만 원)
      const raw = byPermille(price, 6);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.006,
        ratePercent: 0.6,
        ratePercentLabel: '0.6%',
        maxWon: Math.min(raw, 250000),
        limitWon: 250000,
        bracketDescription: '5천만 원 미만 (0.6%, 한도 25만 원)',
      };
    } else if (price < 200000000) {
      // 5천만 원 이상 ~ 2억 원 미만: 0.5% (한도 80만 원)
      const raw = byPermille(price, 5);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.005,
        ratePercent: 0.5,
        ratePercentLabel: '0.5%',
        maxWon: Math.min(raw, 800000),
        limitWon: 800000,
        bracketDescription: '5천만 ~ 2억 원 미만 (0.5%, 한도 80만 원)',
      };
    } else if (price < 900000000) {
      // 2억 원 이상 ~ 9억 원 미만: 0.4% (한도 없음) - 다산동 아파트 매매 주력 구간
      const maxWon = byPermille(price, 4);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.004,
        ratePercent: 0.4,
        ratePercentLabel: '0.4%',
        maxWon,
        limitWon: null,
        bracketDescription: '2억 ~ 9억 원 미만 (0.4%)',
      };
    } else if (price < 1200000000) {
      // 9억 원 이상 ~ 12억 원 미만: 0.5% (한도 없음)
      const maxWon = byPermille(price, 5);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.005,
        ratePercent: 0.5,
        ratePercentLabel: '0.5%',
        maxWon,
        limitWon: null,
        bracketDescription: '9억 ~ 12억 원 미만 (0.5%)',
      };
    } else if (price < 1500000000) {
      // 12억 원 이상 ~ 15억 원 미만: 0.6% (한도 없음)
      const maxWon = byPermille(price, 6);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.006,
        ratePercent: 0.6,
        ratePercentLabel: '0.6%',
        maxWon,
        limitWon: null,
        bracketDescription: '12억 ~ 15억 원 미만 (0.6%)',
      };
    } else {
      // 15억 원 이상: 0.7% (한도 없음)
      const maxWon = byPermille(price, 7);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.007,
        ratePercent: 0.7,
        ratePercentLabel: '0.7%',
        maxWon,
        limitWon: null,
        bracketDescription: '15억 원 이상 (0.7%)',
      };
    }
  } else {
    // ─── 임대차 (전세) ───
    if (price < 50000000) {
      // 5천만 원 미만: 0.5% (한도 20만 원)
      const raw = byPermille(price, 5);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.005,
        ratePercent: 0.5,
        ratePercentLabel: '0.5%',
        maxWon: Math.min(raw, 200000),
        limitWon: 200000,
        bracketDescription: '5천만 원 미만 (0.5%, 한도 20만 원)',
      };
    } else if (price < 100000000) {
      // 5천만 원 이상 ~ 1억 원 미만: 0.4% (한도 30만 원)
      const raw = byPermille(price, 4);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.004,
        ratePercent: 0.4,
        ratePercentLabel: '0.4%',
        maxWon: Math.min(raw, 300000),
        limitWon: 300000,
        bracketDescription: '5천만 ~ 1억 원 미만 (0.4%, 한도 30만 원)',
      };
    } else if (price < 600000000) {
      // 1억 원 이상 ~ 6억 원 미만: 0.3% (한도 없음) - 다산동 아파트 전세 주력 구간
      const maxWon = byPermille(price, 3);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.003,
        ratePercent: 0.3,
        ratePercentLabel: '0.3%',
        maxWon,
        limitWon: null,
        bracketDescription: '1억 ~ 6억 원 미만 (0.3%)',
      };
    } else if (price < 1200000000) {
      // 6억 원 이상 ~ 12억 원 미만: 0.4% (한도 없음)
      const maxWon = byPermille(price, 4);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.004,
        ratePercent: 0.4,
        ratePercentLabel: '0.4%',
        maxWon,
        limitWon: null,
        bracketDescription: '6억 ~ 12억 원 미만 (0.4%)',
      };
    } else if (price < 1500000000) {
      // 12억 원 이상 ~ 15억 원 미만: 0.5% (한도 없음)
      const maxWon = byPermille(price, 5);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.005,
        ratePercent: 0.5,
        ratePercentLabel: '0.5%',
        maxWon,
        limitWon: null,
        bracketDescription: '12억 ~ 15억 원 미만 (0.5%)',
      };
    } else {
      // 15억 원 이상: 0.6% (한도 없음)
      const maxWon = byPermille(price, 6);
      return {
        tradeType,
        dealPriceWon: price,
        rate: 0.006,
        ratePercent: 0.6,
        ratePercentLabel: '0.6%',
        maxWon,
        limitWon: null,
        bracketDescription: '15억 원 이상 (0.6%)',
      };
    }
  }
}

/**
 * 법정 요율 구간이 시작되는 금액 (원, 이 금액부터 다음 요율). calculateLegalCommission의 if 경계와 같아야 한다 (commission.test.ts가 대조).
 * "이 금액 아래로 팔리면 요율이 바뀌어요" 안내용
 */
export const BRACKET_STARTS_WON: Record<TradeType, number[]> = {
  매매: [50_000_000, 200_000_000, 900_000_000, 1_200_000_000, 1_500_000_000],
  전세: [50_000_000, 100_000_000, 600_000_000, 1_200_000_000, 1_500_000_000],
};

/** 제안 복비 하한: 법정 상한의 30% (대표님 결정 2026-10-22, 기존 50%에서 확대 — 엔진 추천 상한 70%와 짝) */
export const COMMISSION_FLOOR_RATIO = 0.3;

export interface CommissionQuote {
  legal: LegalCommissionResult;
  /** 하한 금액 (법정 상한 × 30%) */
  floorWon: number;
  /** 하한·상한으로 보정된 제안 복비 */
  proposedWon: number;
  /** 제안 복비 + 보너스, 법정 상한을 넘지 않도록 하드 캡 */
  totalWon: number;
  /** 보너스가 상한에 걸려 잘렸는지 */
  isCapped: boolean;
  /** 제안 복비가 하한 아래라 끌어올렸는지 */
  isRaisedToFloor: boolean;
  savedWon: number;
  /** 법정 상한 대비 실제 할인율 (0~1, 보너스 포함 합계 기준) */
  discount: number;
}

/**
 * 복비 견적 단일 엔진 — 화면마다 따로 계산하지 말고 이 함수만 사용한다 (RULES 규칙 11).
 * 공인중개사법 제33조: 합계가 법정 상한을 넘을 수 없다.
 */
export function computeCommissionQuote(input: {
  basisPriceWon: number;
  tradeType: TradeType;
  proposedWon: number;
  bonusWon?: number;
}): CommissionQuote {
  const legal = calculateLegalCommission(input.basisPriceWon, input.tradeType);
  const floorWon = Math.round(legal.maxWon * COMMISSION_FLOOR_RATIO);
  const proposedWon = Math.min(legal.maxWon, Math.max(floorWon, Math.round(input.proposedWon)));
  const rawTotal = proposedWon + Math.max(0, input.bonusWon ?? 0);
  const totalWon = Math.min(legal.maxWon, rawTotal);
  const discount = legal.maxWon > 0 ? 1 - totalWon / legal.maxWon : 0;
  return {
    legal,
    floorWon,
    proposedWon,
    totalWon,
    isCapped: rawTotal > legal.maxWon,
    isRaisedToFloor: input.proposedWon < floorWon,
    savedWon: legal.maxWon - totalWon,
    discount,
  };
}

/**
 * 중개보수 부가세 (법정 상한 요율과 별도로 청구). 일반과세 10%,
 * 간이과세는 부동산중개업 부가가치율 40% × 10% = 4%. 원 미만 절사
 */
export const COMMISSION_VAT_PERCENT = { GENERAL: 10, SIMPLIFIED: 4 } as const;

export function commissionVat(feeWon: number): { generalWon: number; simplifiedWon: number } {
  const fee = Math.max(0, Math.round(feeWon));
  return {
    generalWon: Math.floor((fee * COMMISSION_VAT_PERCENT.GENERAL) / 100),
    simplifiedWon: Math.floor((fee * COMMISSION_VAT_PERCENT.SIMPLIFIED) / 100),
  };
}

/** 추천 할인율(0~1)을 만 원 단위 제안 복비로 환산 — 내림이라 법정 상한을 넘는 일이 없다 */
export function commissionFromDiscount(basisPriceWon: number, tradeType: TradeType, discount: number): number {
  const legal = calculateLegalCommission(basisPriceWon, tradeType);
  return Math.floor((legal.maxWon * (1 - discount)) / 10000) * 10000;
}

/**
 * AI 추천 적정 복비 계산 엔진
 * (법정 상한 대비 매매 약 75% 수준, 전세 약 80% 수준의 상생 요율 제안)
 */
export function calculateRecommendedCommission(
  dealPriceWon: number,
  tradeType: TradeType
): number {
  const legal = calculateLegalCommission(dealPriceWon, tradeType);
  const discountMultiplier = tradeType === '매매' ? 0.75 : 0.80;
  // 만 원 단위로 절사
  return Math.round((legal.maxWon * discountMultiplier) / 10000) * 10000;
}
