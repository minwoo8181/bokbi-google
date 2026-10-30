/**
 * 선택 줄(분석 매매/전세 · 평형대 · 층수 구간, 매칭 창, 홈 단지 예시, 중개사 피드)의 공통 세그먼트 모양.
 * 2026-10-29 대표님 "버튼 디자인이 제각각, 이런 식으로 통일": 회색 알약 틀 안에서 고른 칸만 흰 알약 + 진한 글씨.
 * 여러 곳이 이 값을 같이 쓴다 (2026-10-27 디자인 통일)
 */
export const SEGMENT_TRACK = 'p-1 rounded-[22px] bg-border-default grid gap-1';

/** 칸 공통: 누르는 높이 44px 이상 */
export const SEGMENT_ITEM = 'min-h-11 rounded-full text-center transition-all active:scale-95';

export const segmentItemState = (selected: boolean) =>
  selected ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary';

/**
 * 분석 "평형·층 고르기" 칸 (대표님 2026-10-29 캔버스 1번 "테두리 카드"): 회색 틀 없이 칸마다 얇은 테두리,
 * 고른 칸만 파란 테두리 + 연파랑. 아래 큰 파란 버튼과 겹치지 않게 파랑은 테두리에만
 */
export const FLOOR_CARD = 'rounded-xl px-1 py-2 text-center transition-transform duration-fast ease-out-soft active:scale-95';

export const floorCardState = (selected: boolean) =>
  selected ? 'border-2 border-brand bg-brand-subtle text-brand-hover' : 'border border-border-default bg-surface-card text-text-primary';

/** 섹션 제목 ("평형대 선택", "층수 구간") */
export const SEGMENT_TITLE = 'text-[13px] font-bold text-text-primary';
