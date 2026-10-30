/**
 * 매칭 요청 완료 영수증 줄 (2026-10-27 대표님 시안): 법정 상한 − 할인 + 더 빠른 매칭 옵션 = 내가 제안한 복비.
 * 새 계산은 없다 — computeCommissionQuote 결과를 영수증 줄로 나눌 뿐 (보너스가 상한에 잘렸으면 잘린 만큼만)
 */
import type { CommissionQuote } from '@/lib/commission';

export interface FeeReceipt {
  legalMaxWon: number;
  /** 법정 상한 − 제안 복비(보너스 전) */
  discountWon: number;
  /** 할인 ÷ 법정 상한, 반올림 % */
  discountPct: number;
  /** 실제로 더해진 보너스 (상한 하드캡 반영) */
  bonusWon: number;
  totalWon: number;
}

export function feeReceipt(q: CommissionQuote): FeeReceipt {
  const legalMaxWon = q.legal.maxWon;
  const discountWon = legalMaxWon - q.proposedWon;
  return {
    legalMaxWon,
    discountWon,
    discountPct: legalMaxWon > 0 ? Math.round((discountWon / legalMaxWon) * 100) : 0,
    bonusWon: q.totalWon - q.proposedWon,
    totalWon: q.totalWon,
  };
}
