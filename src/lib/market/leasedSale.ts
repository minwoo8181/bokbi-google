import { formatPriceTenThousand } from '@/lib/utils';

/** 세입자 낀 매매: 임대 형태 */
export type LeaseKind = 'JEONSE' | 'MONTHLY';
/** 세입자의 계약갱신요구권 (주택임대차보호법 제6조의3, 1회·2년) */
export type RenewalRight = 'USED' | 'NOT_USED' | 'UNKNOWN';

export interface LeasedSaleInput {
  kind: LeaseKind | null;
  depositManwon: number;
  monthlyRentManwon: number;
  /** YYYY-MM-DD */
  leaseEndDate: string;
  renewal: RenewalRight | null;
}

export type LeasedSaleError = 'KIND' | 'DEPOSIT' | 'DEPOSIT_OVER_PRICE' | 'RENT' | 'END_DATE' | 'RENEWAL';

/** 매수에 필요한 금액 = 희망가 − 보증금 (만 원). 보증금이 없거나 희망가 이상이면 null */
export function buyerCashManwon(askingManwon: number, depositManwon: number): number | null {
  if (!(depositManwon > 0) || !(askingManwon > 0) || depositManwon >= askingManwon) return null;
  return askingManwon - depositManwon;
}

/** 빠진 항목 전부 (화면 순서). 보증금이 희망가 이상이면 매수 필요 금액을 만들 수 없어 막는다 */
export function leasedSaleErrors(input: LeasedSaleInput, askingManwon: number): LeasedSaleError[] {
  const errors: LeasedSaleError[] = [];
  if (!input.kind) errors.push('KIND');
  if (!(input.depositManwon > 0)) errors.push('DEPOSIT');
  else if (input.depositManwon >= askingManwon) errors.push('DEPOSIT_OVER_PRICE');
  if (input.kind === 'MONTHLY' && !(input.monthlyRentManwon > 0)) errors.push('RENT');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.leaseEndDate)) errors.push('END_DATE');
  if (!input.renewal) errors.push('RENEWAL');
  return errors;
}

/** 첫 번째 빠진 항목을 돌려준다 (없으면 null) */
export function validateLeasedSale(input: LeasedSaleInput, askingManwon: number): LeasedSaleError | null {
  return leasedSaleErrors(input, askingManwon)[0] ?? null;
}

const RENEWAL_LABEL: Record<RenewalRight, string> = {
  USED: '갱신권 사용함',
  NOT_USED: '갱신권 미사용',
  UNKNOWN: '갱신권 확인 필요',
};

/** 중개사 화면·접수증 한 줄 요약. 예: "전세 7억 원 · 2027.08.31 만료 · 갱신권 미사용" */
export function leasedSaleSummary(input: LeasedSaleInput): string {
  const lease =
    input.kind === 'MONTHLY'
      ? `월세 보증금 ${formatPriceTenThousand(input.depositManwon)} / 월 ${formatPriceTenThousand(input.monthlyRentManwon)}`
      : `전세 ${formatPriceTenThousand(input.depositManwon)}`;
  const parts = [lease];
  if (input.leaseEndDate) parts.push(`${input.leaseEndDate.replace(/-/g, '.')} 만료`);
  if (input.renewal) parts.push(RENEWAL_LABEL[input.renewal]);
  return parts.join(' · ');
}
