import { describe, expect, it } from 'vitest';
import { mortgageSummary, validateMortgage } from '../mortgage';

describe('근저당(융자)', () => {
  it('여부는 필수, 있으면 처리 계획도 필수, 금액은 선택', () => {
    expect(validateMortgage({ status: null, maxClaimManwon: 0, plan: null })).toBe('STATUS');
    expect(validateMortgage({ status: 'NONE', maxClaimManwon: 0, plan: null })).toBeNull();
    expect(validateMortgage({ status: 'EXISTS', maxClaimManwon: 24000, plan: null })).toBe('PLAN');
    expect(validateMortgage({ status: 'EXISTS', maxClaimManwon: 0, plan: 'KEEP' })).toBeNull();
  });

  it('요약: 없음 / 금액·계획 포함 / 거래 유형별 유지 표현', () => {
    expect(mortgageSummary({ status: 'NONE', maxClaimManwon: 0, plan: null }, '매매')).toBe('없음');
    expect(mortgageSummary({ status: 'EXISTS', maxClaimManwon: 24000, plan: 'REPAY_AT_CLOSING' }, '매매')).toBe(
      '있음 · 채권최고액 2억 4,000만 원 · 잔금일에 상환·말소',
    );
    expect(mortgageSummary({ status: 'EXISTS', maxClaimManwon: 0, plan: 'KEEP' }, '매매')).toBe('있음 · 매수인 승계 협의');
    expect(mortgageSummary({ status: 'EXISTS', maxClaimManwon: 0, plan: 'KEEP' }, '전세')).toBe('있음 · 유지');
  });
});
