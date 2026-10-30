import { describe, expect, it } from 'vitest';
import { buyerCashManwon, leasedSaleSummary, validateLeasedSale, type LeasedSaleInput } from '../leasedSale';

const base: LeasedSaleInput = { kind: 'JEONSE', depositManwon: 70000, monthlyRentManwon: 0, leaseEndDate: '2027-08-31', renewal: 'NOT_USED' };

describe('세입자 낀 매매', () => {
  it('매수 필요 금액 = 희망가 − 보증금', () => {
    expect(buyerCashManwon(139500, 70000)).toBe(69500);
  });

  it('보증금이 없거나 희망가 이상이면 매수 필요 금액을 만들지 않는다', () => {
    expect(buyerCashManwon(139500, 0)).toBeNull();
    expect(buyerCashManwon(139500, 139500)).toBeNull();
    expect(buyerCashManwon(139500, 150000)).toBeNull();
  });

  it('필수 항목이 모두 있으면 통과', () => {
    expect(validateLeasedSale(base, 139500)).toBeNull();
  });

  it('빠진 항목을 순서대로 알려준다', () => {
    expect(validateLeasedSale({ ...base, kind: null }, 139500)).toBe('KIND');
    expect(validateLeasedSale({ ...base, depositManwon: 0 }, 139500)).toBe('DEPOSIT');
    expect(validateLeasedSale({ ...base, depositManwon: 140000 }, 139500)).toBe('DEPOSIT_OVER_PRICE');
    expect(validateLeasedSale({ ...base, kind: 'MONTHLY', monthlyRentManwon: 0 }, 139500)).toBe('RENT');
    expect(validateLeasedSale({ ...base, leaseEndDate: '' }, 139500)).toBe('END_DATE');
    expect(validateLeasedSale({ ...base, renewal: null }, 139500)).toBe('RENEWAL');
  });

  it('요약 한 줄: 전세 / 월세', () => {
    expect(leasedSaleSummary(base)).toBe('전세 7억 원 · 2027.08.31 만료 · 갱신권 미사용');
    expect(leasedSaleSummary({ ...base, kind: 'MONTHLY', depositManwon: 5000, monthlyRentManwon: 150, renewal: 'USED' })).toBe(
      '월세 보증금 5,000만 원 / 월 150만 원 · 2027.08.31 만료 · 갱신권 사용함',
    );
  });
});
