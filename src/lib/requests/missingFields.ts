/**
 * 매칭 모달: 단계마다 아직 안 채운 칸 목록 (화면 위→아래 순서).
 * 다음 버튼은 늘 켜 두고, 목록이 비어 있지 않으면 넘어가지 않고 첫 칸으로 스크롤 + 칸 아래 빨간 안내 (대표님 2026-10-27).
 * 넘어가는 조건 = 목록이 비었을 때. 조건 자체는 기존 규칙(leasedSale·mortgage·units) 그대로 쓴다
 */
import { leasedSaleErrors, type LeasedSaleError, type LeasedSaleInput } from '@/lib/market/leasedSale';
import { validateMortgage, type MortgageError, type MortgageInput } from '@/lib/market/mortgage';
import type { UnitCheck } from '@/lib/market/units';

export type MissingField =
  | 'TYPE'
  | 'TENANT_PHONE'
  | 'TENANT_PLEDGE'
  | `LEASE_${LeasedSaleError}`
  | `MORTGAGE_${MortgageError}`
  | 'MOVE_IN_DATE'
  | 'DONG'
  | 'HO'
  | 'UNIT'
  | 'OWNER_NAME'
  | 'SMS_VERIFY'
  | 'OWNER_PLEDGE'
  | 'LEGAL_PLEDGE';

export function missingStep1(input: { typeCount: number; typeName: string | null }): MissingField[] {
  return input.typeCount >= 2 && input.typeName === null ? ['TYPE'] : [];
}

export interface Step2Input {
  occupancy: string;
  tenantPhone: string;
  tenantNotified: boolean;
  /** 세입자 낀 매매일 때만 값이 있다 */
  leasedSale: { input: LeasedSaleInput; askingManwon: number } | null;
  mortgage: MortgageInput;
  moveInType: string;
  moveInDate: string;
}

export function missingStep2(s: Step2Input): MissingField[] {
  const out: MissingField[] = [];
  if (s.occupancy === 'TENANT') {
    if (s.tenantPhone.trim().length < 10) out.push('TENANT_PHONE');
    if (!s.tenantNotified) out.push('TENANT_PLEDGE');
  }
  if (s.leasedSale) {
    for (const e of leasedSaleErrors(s.leasedSale.input, s.leasedSale.askingManwon)) out.push(`LEASE_${e}`);
  }
  const m = validateMortgage(s.mortgage);
  if (m) out.push(`MORTGAGE_${m}`);
  if (s.moveInType === 'DATE' && !s.moveInDate) out.push('MOVE_IN_DATE');
  return out;
}

/** 동·호수: 대장 데이터가 없는 단지(UNKNOWN)는 빈칸만 막고, 있으면 대장에 있는 집만 통과 */
export function missingDongHo(s: { check: UnitCheck; dong: string; ho: string; singleBuilding: boolean }): MissingField[] {
  if (s.check.status === 'OK') return [];
  const blanks: MissingField[] = [];
  if (!s.singleBuilding && !s.dong.trim()) blanks.push('DONG');
  if (!s.ho.trim()) blanks.push('HO');
  if (s.check.status === 'UNKNOWN') return blanks;
  return blanks.length > 0 ? blanks : ['UNIT'];
}

export function missingOwnerVerify(s: { ownerName: string; smsVerified: boolean }): MissingField[] {
  const out: MissingField[] = [];
  if (!s.ownerName.trim()) out.push('OWNER_NAME');
  if (!s.smsVerified) out.push('SMS_VERIFY');
  return out;
}

export function missingFinalPledge(s: { ownerChecked: boolean; legalChecked: boolean }): MissingField[] {
  const out: MissingField[] = [];
  if (!s.ownerChecked) out.push('OWNER_PLEDGE');
  if (!s.legalChecked) out.push('LEGAL_PLEDGE');
  return out;
}
