import { formatPriceTenThousand } from '@/lib/utils';
import type { TradeType } from '@/components/analysis/types';

/** 근저당(융자) 설정 여부 */
export type MortgageStatus = 'NONE' | 'EXISTS';
/** 잔금 때 처리 계획: 상환·말소 / 유지(매매는 매수인 승계 협의) */
export type MortgagePlan = 'REPAY_AT_CLOSING' | 'KEEP';

export interface MortgageInput {
  status: MortgageStatus | null;
  /** 채권최고액 (만 원, 선택 입력 — 0이면 미입력) */
  maxClaimManwon: number;
  plan: MortgagePlan | null;
}

export type MortgageError = 'STATUS' | 'PLAN';

/** 근저당 여부는 필수, 있으면 처리 계획도 필수. 금액은 등기부를 보지 않으면 모를 수 있어 선택 */
export function validateMortgage(input: MortgageInput): MortgageError | null {
  if (!input.status) return 'STATUS';
  if (input.status === 'EXISTS' && !input.plan) return 'PLAN';
  return null;
}

const PLAN_LABEL: Record<TradeType, Record<MortgagePlan, string>> = {
  매매: { REPAY_AT_CLOSING: '잔금일에 상환·말소', KEEP: '매수인 승계 협의' },
  전세: { REPAY_AT_CLOSING: '잔금일에 상환·말소', KEEP: '유지' },
};

export const mortgagePlanLabel = (tradeType: TradeType, plan: MortgagePlan) => PLAN_LABEL[tradeType][plan];

/** 중개사 화면·접수증 한 줄 요약. 예: "있음 · 채권최고액 2억 4,000만 원 · 잔금일에 상환·말소" */
export function mortgageSummary(input: MortgageInput, tradeType: TradeType): string {
  if (input.status !== 'EXISTS') return '없음';
  const parts = ['있음'];
  if (input.maxClaimManwon > 0) parts.push(`채권최고액 ${formatPriceTenThousand(input.maxClaimManwon)}`);
  if (input.plan) parts.push(PLAN_LABEL[tradeType][input.plan]);
  return parts.join(' · ');
}
