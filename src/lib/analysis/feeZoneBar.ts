/**
 * 복비 구간 막대 (0원 ~ 법정 상한). 분석 카드(보기 전용)와 매칭 요청 창 복비 정하기(직접 조절)가 같은 막대를 그린다 (2026-10-27).
 * 경계는 feeZone(marketEngine)과 같다: 하한(상한의 30%) 아래 빗금 → 매칭 어려움 → 줄어들 수 있음 → 추천 → 많은 요청
 */
import { ENGINE_PARAMS, type FeeZone } from './marketEngine';

export interface ZoneSegment {
  zone: FeeZone;
  /** 막대 왼쪽 끝(0원) 기준 % */
  from: number;
  to: number;
}

export interface FeeZoneBarLayout {
  /** 하한 아래 빗금 끝 % */
  floorPct: number;
  /** 왼쪽부터 RISK · CAUTION · RECOMMENDED · WIDE. 폭이 0인 구간은 빠진다 (추천 20%면 초록 없음) */
  segments: ZoneSegment[];
}

/** 금액 → 막대 위 % (0~100으로 자름) */
export function barPercent(won: number, legalMaxWon: number): number {
  return legalMaxWon > 0 ? Math.min(100, Math.max(0, (won / legalMaxWon) * 100)) : 0;
}

/**
 * @param recEffective 실제 추천 금액의 할인율 (만 원 내림 때문에 추천 할인보다 조금 큼)
 */
export function feeZoneBarLayout(legalMaxWon: number, floorWon: number, recEffective: number): FeeZoneBarLayout {
  const floorPct = barPercent(floorWon, legalMaxWon);
  const recPct = Math.max(floorPct, (1 - recEffective) * 100);
  const riskEndPct = Math.min(recPct, Math.max(floorPct, (1 - recEffective - ENGINE_PARAMS.cautionSpan) * 100));
  const widePct = Math.max(recPct, (1 - ENGINE_PARAMS.wideZoneMaxDiscount) * 100);
  const all: ZoneSegment[] = [
    { zone: 'RISK', from: floorPct, to: riskEndPct },
    { zone: 'CAUTION', from: riskEndPct, to: recPct },
    { zone: 'RECOMMENDED', from: recPct, to: widePct },
    { zone: 'WIDE', from: widePct, to: 100 },
  ];
  return { floorPct, segments: all.filter((s) => s.to > s.from) };
}
