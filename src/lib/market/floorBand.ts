import type { FloorCategory, PyeongDetailStat, ReferencePrice, TradeType } from '@/components/analysis/types';
import { SITE_CONTENT } from '@/config/siteContent';

/** 층 구간 (대표님 제안 2026-10-23): 저층 1~3층 · 중층 4~14층 · 고층 15층 이상 */
export const floorBandOf = (floor: number): FloorCategory => (floor <= 3 ? 'low' : floor <= 14 ? 'mid' : 'high');

/** '중층 (4~14층)' 형태 라벨 (스티키 바·모달·내 의뢰) */
export function floorBandLabel(cat: FloorCategory): string {
  const b = SITE_CONTENT.analysis.floorSelector.bands[cat];
  return `${b.label} (${b.range})`;
}

/** 선택 평형·거래유형·층 구간의 기준 실거래 — 화면 전체가 같은 숫자를 쓰도록 여기서만 꺼낸다 */
export function referenceOf(p: PyeongDetailStat, tradeType: TradeType, cat: FloorCategory): ReferencePrice | null {
  const side = tradeType === '매매' ? p.market?.sale : p.market?.jeonse;
  return side?.reference[cat] ?? null;
}
