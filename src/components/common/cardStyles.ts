/**
 * 카드 안 이동 버튼 ("거래 진행 상황") 공통 모양 (대표님 2026-10-27: 너무 크다).
 * 진한 주 버튼은 화면 맨 위 긴급 알림 상자의 "지금 하기" 하나 → 카드 버튼은 연한 파랑, 누르는 높이 44px 유지.
 * 집주인 진행 중인 부동산 카드와 중개사 진행 중 매물 카드가 함께 쓴다
 */
export const CARD_ACTION =
  'w-full h-11 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold flex items-center justify-center gap-1 active:scale-[0.99] transition-transform duration-fast ease-out-soft';
