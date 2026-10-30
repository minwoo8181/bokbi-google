import { describe, it, expect } from 'vitest';
import { MASKED_HO, maskDong, maskPhoneDeep } from '../matchingMask';
import {
  formatMoveInDateWithDay,
  localRequestNumber,
  moveInLabel,
  optionsSummary,
  submittedAtLabel,
} from '../moveIn';
import { STEP_COUNT, STEP_INDEX, nextStep, prevStep, progressPercent } from '../modalStep';
import type { ModalStep } from '@/components/analysis/types';
import { SITE_CONTENT } from '@/config/siteContent';

describe('maskDong (중개사에게 보이는 동)', () => {
  it('여러 자리 숫자는 끝자리만 가린다', () => {
    expect(maskDong('104', false)).toBe('10*동');
    expect(maskDong('1502동', false)).toBe('150*동');
  });
  it('한 자리 숫자는 뒤에 * 하나', () => {
    expect(maskDong('3', false)).toBe('3*동');
  });
  it('숫자 없는 동 이름은 통째로 가린다', () => {
    expect(maskDong('다산엘리시아A동', false)).toBe('*동');
  });
  it('빈 칸은 예시 모양', () => {
    expect(maskDong('', false)).toBe('10*동');
  });
  it('단일 건물은 동 표기 없음 (입력이 있어도)', () => {
    expect(maskDong('104', true)).toBe('');
    expect(maskDong('', true)).toBe('');
  });
  it('호수는 항상 전부 가린다', () => {
    expect(MASKED_HO).toBe('***호');
  });
});

describe('maskPhoneDeep (010-*B**-**G*)', () => {
  it('11자리는 가운데·끝 한 자리씩만 보인다', () => {
    expect(maskPhoneDeep('010-9876-5432')).toBe('010-*8**-**3*');
    expect(maskPhoneDeep('01012345678')).toBe('010-*2**-**7*');
  });
  it('빈 값·짧은 번호는 기본 모양 (실제 번호를 흘리지 않음)', () => {
    expect(maskPhoneDeep('')).toBe('010-*4**-**9*');
    expect(maskPhoneDeep('010-123-4567')).toBe('010-*4**-**9*');
  });
});

describe('입주 시기 문구', () => {
  it('날짜에 요일을 붙인다', () => {
    expect(formatMoveInDateWithDay('2026-12-01')).toBe('2026년 12월 1일 (화)');
    expect(formatMoveInDateWithDay('2027-06-30')).toBe('2027년 6월 30일 (수)');
  });
  it('빈 값은 빈 문자열, 형식이 다르면 그대로', () => {
    expect(formatMoveInDateWithDay('')).toBe('');
    expect(formatMoveInDateWithDay('2026/12/01')).toBe('2026/12/01');
    expect(formatMoveInDateWithDay('abc-de-fg')).toBe('abc-de-fg');
  });
  it('입주 유형별 문구', () => {
    expect(moveInLabel('IMMEDIATE', '')).toBe('즉시 입주');
    expect(moveInLabel('NEGOTIABLE', '2026-12-01')).toBe('입주 협의');
    expect(moveInLabel('DATE', '2026-12-01')).toBe('2026년 12월 1일 (화)');
    expect(moveInLabel('DATE', '')).toBe('입주 협의');
  });
});

describe('optionsSummary', () => {
  const none = { hasAircon: false, airconCount: '3대', hasMidDoor: false, hasCloset: false, customOptionMemo: '' };
  it('아무것도 없으면 빈 문자열', () => {
    expect(optionsSummary(none)).toBe('');
  });
  it('고른 순서대로, 자유 메모는 앞뒤 공백 정리', () => {
    expect(
      optionsSummary({ hasAircon: true, airconCount: '5대 이상', hasMidDoor: true, hasCloset: true, customOptionMemo: '  베란다 확장 ' }),
    ).toBe('시스템에어컨(5대 이상), 중문, 붙박이장, 베란다 확장');
  });
  it('공백만 있는 메모는 넣지 않는다', () => {
    expect(optionsSummary({ ...none, hasCloset: true, customOptionMemo: '   ' })).toBe('붙박이장');
  });
});

describe('접수 일시·번호', () => {
  it('일시는 기기 시각, 두 자리로', () => {
    expect(submittedAtLabel(new Date(2026, 0, 5, 9, 7))).toBe('2026.01.05 09:07');
  });
  it('번호는 UTC 날짜 + 무작위 4자리', () => {
    expect(localRequestNumber(new Date('2026-10-26T15:30:00Z'), () => 0)).toBe('BK-20261026-2222');
    expect(localRequestNumber(new Date('2026-10-26T15:30:00Z'))).toMatch(/^BK-20261026-[2-9A-HJKMNP-Z]{4}$/);
  });
  it('끝자리는 매번 달라진다 (예전 고정 -9842 아님)', () => {
    const now = new Date('2026-10-27T03:00:00Z');
    const ids = new Set(Array.from({ length: 50 }, () => localRequestNumber(now)));
    expect(ids.size).toBeGreaterThan(45);
    expect([...ids].some((id) => id.endsWith('-9842'))).toBe(false);
  });
});

describe('단계 이동', () => {
  const all: ModalStep[] = ['TRADE_PYEONG', 'PRICE_MOVEIN', 'FEE', 'DONG_HO', 'OWNER_VERIFY', 'FINAL_PLEDGE', 'COMPLETE'];
  it('단계 번호 1~7 (복비 정하기 = 3단계, 2026-10-27), 진행률', () => {
    expect(all.map((s) => STEP_INDEX[s])).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(progressPercent('TRADE_PYEONG')).toBeCloseTo(100 / 7);
    expect(progressPercent('COMPLETE')).toBe(100);
  });
  it('처음 요청: 한 단계씩 (희망가 → 복비 → 동·호수)', () => {
    expect(all.slice(0, 5).map((s) => nextStep(s, false))).toEqual(['PRICE_MOVEIN', 'FEE', 'DONG_HO', 'OWNER_VERIFY', 'FINAL_PLEDGE']);
    expect(['PRICE_MOVEIN', 'FEE', 'DONG_HO', 'OWNER_VERIFY', 'FINAL_PLEDGE'].map((s) => prevStep(s as ModalStep, false, null))).toEqual([
      'TRADE_PYEONG',
      'PRICE_MOVEIN',
      'FEE',
      'DONG_HO',
      'OWNER_VERIFY',
    ]);
  });
  it('다시 요청: 2·3단계 다음은 5단계, 5단계 이전은 고치던 단계', () => {
    expect(nextStep('PRICE_MOVEIN', true)).toBe('FINAL_PLEDGE');
    expect(nextStep('DONG_HO', true)).toBe('FINAL_PLEDGE');
    expect(nextStep('TRADE_PYEONG', true)).toBe('PRICE_MOVEIN');
    expect(prevStep('FINAL_PLEDGE', true, 'DONG_HO')).toBe('DONG_HO');
    expect(prevStep('FINAL_PLEDGE', true, 'PRICE_MOVEIN')).toBe('PRICE_MOVEIN');
  });
  it('진행 표시 이름 칸 = 완료를 뺀 단계 수, 3번째가 복비', () => {
    const labels = SITE_CONTENT.matchingModal.stepperLabels;
    expect(labels).toHaveLength(STEP_COUNT - 1);
    expect(labels[STEP_INDEX.FEE - 1]).toBe('복비');
    expect(labels[STEP_INDEX.DONG_HO - 1]).toBe('동·호수');
  });
  it('다시 요청은 복비 정하기를 지나지 않는다 (내 의뢰에서 고른 복비 그대로)', () => {
    expect(prevStep('DONG_HO', true, 'DONG_HO')).toBe('PRICE_MOVEIN');
  });
  it('다시 요청인데 동·호수를 못 불러와 평소 순서(resumeShort false)면 인증부터', () => {
    expect(nextStep('DONG_HO', false)).toBe('OWNER_VERIFY');
    expect(prevStep('FINAL_PLEDGE', false, 'DONG_HO')).toBe('OWNER_VERIFY');
  });
  it('완료·제출 단계는 버튼이 따로라 그대로', () => {
    expect(nextStep('FINAL_PLEDGE', false)).toBe('FINAL_PLEDGE');
    expect(nextStep('COMPLETE', true)).toBe('COMPLETE');
    expect(prevStep('TRADE_PYEONG', false, null)).toBe('TRADE_PYEONG');
  });
});
