/**
 * 매칭 모달 단계 이동 규칙.
 * 처음 요청: 평형 → 희망가 → 복비 정하기(2026-10-27 분석 카드에서 옮김) → 동·호수 → 인증 → 확인·서약 → 완료.
 * 다시 요청(resumeShort)이면 고친 단계(희망가·동·호수)의 "다음"은 확인·서약으로 바로, 확인·서약의 "이전"은 고치던 단계로.
 * 다시 요청은 내 의뢰에서 고른 복비를 그대로 쓰므로 복비 정하기를 지나지 않는다 (예전과 같음)
 */
import type { ModalStep } from '@/components/analysis/types';

export const STEP_INDEX: Record<ModalStep, number> = {
  TRADE_PYEONG: 1,
  PRICE_MOVEIN: 2,
  FEE: 3,
  DONG_HO: 4,
  OWNER_VERIFY: 5,
  FINAL_PLEDGE: 6,
  COMPLETE: 7,
};

export const STEP_COUNT = 7;

export function progressPercent(step: ModalStep): number {
  return (STEP_INDEX[step] / STEP_COUNT) * 100;
}

/** "다음" 버튼이 가는 단계. 확인·서약 제출·완료는 버튼이 따로라 그대로 */
export function nextStep(step: ModalStep, resumeShort: boolean): ModalStep {
  switch (step) {
    case 'TRADE_PYEONG':
      return 'PRICE_MOVEIN';
    case 'PRICE_MOVEIN':
      return resumeShort ? 'FINAL_PLEDGE' : 'FEE';
    case 'FEE':
      return 'DONG_HO';
    case 'DONG_HO':
      return resumeShort ? 'FINAL_PLEDGE' : 'OWNER_VERIFY';
    case 'OWNER_VERIFY':
      return 'FINAL_PLEDGE';
    default:
      return step;
  }
}

/** "이전" 버튼이 가는 단계. resumeStep = 다시 요청에서 고치던 단계 */
export function prevStep(step: ModalStep, resumeShort: boolean, resumeStep: ModalStep | null): ModalStep {
  switch (step) {
    case 'PRICE_MOVEIN':
      return 'TRADE_PYEONG';
    case 'FEE':
      return 'PRICE_MOVEIN';
    case 'DONG_HO':
      return resumeShort ? 'PRICE_MOVEIN' : 'FEE';
    case 'OWNER_VERIFY':
      return 'DONG_HO';
    case 'FINAL_PLEDGE':
      return resumeShort && resumeStep ? resumeStep : 'OWNER_VERIFY';
    default:
      return step;
  }
}
