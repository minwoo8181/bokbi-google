/**
 * 매칭 모달 블라인드 마스킹 (중개사에게 보이는 동·호수·전화). 매칭 확정 전에는 이 모양만 보인다
 */

export const MASKED_HO = '***호';

/** 동 마스킹: 끝자리만 가린다. 단일 건물은 동 표기 없음, 숫자 없는 동 이름은 통째로 가림 */
export function maskDong(dongInput: string, singleBuilding: boolean): string {
  if (singleBuilding) return ''; // 이름 없는 단일 건물: 동 표기 없음
  if (!dongInput) return '10*동';
  const digits = dongInput.replace(/[^0-9]/g, '');
  if (digits.length === 0) return '*동'; // '다산엘리시아A동'처럼 숫자 없는 동 이름은 통째로 가린다
  if (digits.length === 1) return `${digits}*동`;
  return `${digits.slice(0, -1)}*동`;
}

/** 대표님 지침: 010-ABCD-EFGH → 010-*B**-**G* (11자리가 아니면 기본 모양) */
export function maskPhoneDeep(phone: string): string {
  const fallback = '010-*4**-**9*';
  if (!phone) return fallback;
  const nums = phone.replace(/[^0-9]/g, '');
  if (nums.length >= 11) {
    const b = nums[4] || '4';
    const g = nums[9] || '9';
    return `010-*${b}**-**${g}*`;
  }
  return fallback;
}
