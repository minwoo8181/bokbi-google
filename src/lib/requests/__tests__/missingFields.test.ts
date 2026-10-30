import { describe, it, expect } from 'vitest';
import {
  missingStep1,
  missingStep2,
  missingDongHo,
  missingOwnerVerify,
  missingFinalPledge,
  type Step2Input,
} from '../missingFields';
import { validateLeasedSale, type LeasedSaleInput } from '@/lib/market/leasedSale';
import { validateMortgage } from '@/lib/market/mortgage';
import { checkUnit } from '@/lib/market/units';
import type { ComplexUnits } from '@/components/analysis/types';

const base: Step2Input = {
  occupancy: 'VACANT',
  tenantPhone: '',
  tenantNotified: false,
  leasedSale: null,
  mortgage: { status: 'NONE', maxClaimManwon: 0, plan: null },
  moveInType: 'IMMEDIATE',
  moveInDate: '',
};

/** 바꾸기 전 2단계 통과 조건 (useMatchingForm canPassStep2 원본) */
const oldCanPass2 = (s: Step2Input) =>
  (s.occupancy !== 'TENANT' || (s.tenantNotified && s.tenantPhone.trim().length >= 10)) &&
  (s.moveInType !== 'DATE' || Boolean(s.moveInDate)) &&
  (s.leasedSale ? validateLeasedSale(s.leasedSale.input, s.leasedSale.askingManwon) : null) === null &&
  validateMortgage(s.mortgage) === null;

const lease = (p: Partial<LeasedSaleInput>): LeasedSaleInput => ({
  kind: null, depositManwon: 0, monthlyRentManwon: 0, leaseEndDate: '', renewal: null, ...p,
});

describe('missingFields: 빠진 칸 목록', () => {
  it('1단계: 타입이 2개 이상인데 안 골랐을 때만', () => {
    expect(missingStep1({ typeCount: 1, typeName: null })).toEqual([]);
    expect(missingStep1({ typeCount: 2, typeName: null })).toEqual(['TYPE']);
    expect(missingStep1({ typeCount: 2, typeName: '' })).toEqual([]);
  });

  it('2단계: 세입자 거주 + 근저당 미선택이면 화면 순서대로 모두', () => {
    const s = { ...base, occupancy: 'TENANT', mortgage: { status: null, maxClaimManwon: 0, plan: null } };
    expect(missingStep2(s)).toEqual(['TENANT_PHONE', 'TENANT_PLEDGE', 'MORTGAGE_STATUS']);
  });

  it('2단계: 세입자 낀 매매는 빠진 임대 정보를 하나씩 전부', () => {
    const s = { ...base, leasedSale: { input: lease({ kind: 'MONTHLY' }), askingManwon: 100000 } };
    expect(missingStep2(s)).toEqual(['LEASE_DEPOSIT', 'LEASE_RENT', 'LEASE_END_DATE', 'LEASE_RENEWAL']);
  });

  it('2단계: 날짜 지정인데 날짜가 없으면', () => {
    expect(missingStep2({ ...base, moveInType: 'DATE' })).toEqual(['MOVE_IN_DATE']);
  });

  it('2단계: 목록이 비는 조건 = 바꾸기 전 통과 조건 (여러 조합)', () => {
    const variants: Step2Input[] = [];
    for (const occupancy of ['VACANT', 'OWNER', 'TENANT'])
      for (const tenantPhone of ['', '010-1234-5678'])
        for (const tenantNotified of [false, true])
          for (const mortgage of [
            { status: null, maxClaimManwon: 0, plan: null },
            { status: 'NONE' as const, maxClaimManwon: 0, plan: null },
            { status: 'EXISTS' as const, maxClaimManwon: 0, plan: null },
            { status: 'EXISTS' as const, maxClaimManwon: 0, plan: 'KEEP' as const },
          ])
            for (const [moveInType, moveInDate] of [['IMMEDIATE', ''], ['DATE', ''], ['DATE', '2026-12-01']])
              for (const leasedSale of [
                null,
                { input: lease({}), askingManwon: 100000 },
                { input: lease({ kind: 'JEONSE', depositManwon: 120000, leaseEndDate: '2027-01-01', renewal: 'USED' }), askingManwon: 100000 },
                { input: lease({ kind: 'JEONSE', depositManwon: 50000, leaseEndDate: '2027-01-01', renewal: 'USED' }), askingManwon: 100000 },
              ])
                variants.push({ occupancy, tenantPhone, tenantNotified, mortgage, moveInType, moveInDate, leasedSale });
    for (const v of variants) expect(missingStep2(v).length === 0).toBe(oldCanPass2(v));
  });

  it('동·호수: 바꾸기 전 통과 조건과 같다', () => {
    const units: ComplexUnits = { dongs: [{ name: '101', floors: 20, hos: ['1203'] }] } as ComplexUnits;
    const cases: [ComplexUnits | null, string, string][] = [
      [null, '', ''], [null, '104', ''], [null, '104', '1802'],
      [units, '', ''], [units, '101', ''], [units, '999', '1203'], [units, '101', '9999'], [units, '101', '1203'],
    ];
    for (const [u, dong, ho] of cases) {
      const check = checkUnit(u, dong, ho);
      const old = check.status === 'OK' || (check.status === 'UNKNOWN' && !!dong.trim() && !!ho.trim());
      expect(missingDongHo({ check, dong, ho, singleBuilding: false }).length === 0).toBe(old);
    }
    expect(missingDongHo({ check: checkUnit(units, '', ''), dong: '', ho: '', singleBuilding: false })).toEqual(['DONG', 'HO']);
    expect(missingDongHo({ check: checkUnit(units, '999', '1203'), dong: '999', ho: '1203', singleBuilding: false })).toEqual(['UNIT']);
  });

  it('본인 인증·서약', () => {
    expect(missingOwnerVerify({ ownerName: ' ', smsVerified: false })).toEqual(['OWNER_NAME', 'SMS_VERIFY']);
    expect(missingOwnerVerify({ ownerName: '김', smsVerified: true })).toEqual([]);
    expect(missingFinalPledge({ ownerChecked: true, legalChecked: false })).toEqual(['LEGAL_PLEDGE']);
  });
});
