/**
 * 거래 페이지 머리 카드 진행 동그라미 (대표님 2026-10-27 A안): 매칭 · 광고 · 계약 · 잔금 · 후기.
 * 집주인·중개사 화면이 같은 번호를 쓴다. 0 = 이 거래가 끝나 진행 표시를 숨김, 6 = 모두 끝남(전부 ✓)
 */
import type { DealPhase, DealState } from './deal';

export const DEAL_STEPS = 5;

export function dealStep(phase: DealPhase, state: Pick<DealState, 'pending' | 'review'>, adPosted: boolean): number {
  switch (phase) {
    case 'BROKEN':
    case 'CLOSED_ELSEWHERE':
    case 'RELEASED':
      return 0;
    case 'DONE':
      return state.review ? DEAL_STEPS + 1 : 5;
    case 'CONTRACTED':
      return 4;
    case 'PROVISIONAL':
      return 3;
    case 'MATCHED':
      // 광고 전에 계약을 알렸어도(확인 대기) 계약 단계로 본다
      return adPosted || state.pending ? 3 : 2;
  }
}
