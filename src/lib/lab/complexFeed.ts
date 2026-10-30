import { buildPyeongStats, getComplexById, listComplexes } from '@/lib/market/repository';
import { calculateLegalCommission, commissionFromDiscount } from '@/lib/commission';
import type { PyeongDetailStat } from '@/components/analysis/types';

/**
 * design-lab 레퍼런스 홈의 단지 목록 한 줄 (서버에서 계산, 숫자는 모두 실데이터·엔진 결과).
 * 대표 평형·층 구간은 분석 화면 첫 화면과 같은 규칙이라 목록 금액 = 단지를 눌렀을 때 첫 금액
 */
export interface ComplexFeedItem {
  id: number;
  name: string;
  households: number;
  builtYear: number | null;
  pyeongName: string;
  /** 기준 실거래 (만 원) — 대표 평형의 가장 최근 거래 층 구간 */
  priceManwon: number;
  recommendedWon: number;
  legalMaxWon: number;
  /** 추천 할인 (0~100, 반올림) */
  discountPct: number;
  /** 단지 매매 매물 수 */
  listings: number;
  /** 단지 최근 6개월 중개 매매 수 */
  deals6m: number;
}

const tradeCount = (p: PyeongDetailStat) => p.market?.sale.series.reduce((s, m) => s + m.count, 0) ?? 0;

export function complexFeedItems(): ComplexFeedItem[] {
  return listComplexes().flatMap((a) => {
    const c = getComplexById(a.id);
    if (!c) return [];
    // 대표 평형 = 거래가 가장 많은 평형 (AnalysisClient defaultPyeongId와 같은 규칙, 같은 순서의 안정 정렬)
    const p = [...buildPyeongStats(c)].sort((x, y) => tradeCount(y) - tradeCount(x))[0];
    const side = p?.market?.sale;
    if (!p || !side) return [];
    const ref = side.reference[side.latestFloor ?? 'mid'];
    if (!ref || ref.priceManwon <= 0) return [];
    const priceWon = ref.priceManwon * 10000;
    return [
      {
        id: a.id,
        name: a.apt_name,
        households: a.total_households,
        builtYear: a.built_year ?? null,
        pyeongName: p.name,
        priceManwon: ref.priceManwon,
        recommendedWon: commissionFromDiscount(priceWon, '매매', ref.recommendation.discount),
        legalMaxWon: calculateLegalCommission(priceWon, '매매').maxWon,
        discountPct: Math.round(ref.recommendation.discount * 100),
        listings: a.current_sale_listings,
        deals6m: a.recent_trade_count,
      },
    ];
  });
}

export type ComplexSort = 'households' | 'discount' | 'newest';

/** 목록 정렬 (같은 값이면 세대 많은 순) */
export function sortComplexFeed(items: readonly ComplexFeedItem[], sort: ComplexSort): ComplexFeedItem[] {
  const key = (i: ComplexFeedItem) =>
    sort === 'discount' ? i.discountPct : sort === 'newest' ? i.builtYear ?? 0 : i.households;
  return [...items].sort((a, b) => key(b) - key(a) || b.households - a.households);
}
