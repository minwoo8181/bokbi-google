/**
 * 의뢰 시점 추천값 기록 (대표님 2026-10-29 "복비 로직 기록장"): 의뢰를 저장할 때 그때 쓴 추천 기준 버전과
 * 추천·실제 할인을 같이 남긴다. 나중에 매칭률과 맞대어 로직을 고칠 근거 — 화면에는 쓰지 않고, 자동으로 바뀌는 값도 없다.
 * 서버(Supabase)에서는 requests.recommendation(jsonb, 의뢰 시점 고정) 칸에 들어간다
 */
import { RECOMMENDATION_POLICY_VERSION } from '@/lib/analysis/marketEngine';

/** 추천 화면 값 중 기록에 남길 것만 (components/analysis/types RecommendationView와 같은 이름) */
export interface RecommendationInput {
  grade: string;
  confidence: string;
  isGeneric: boolean;
  discount: number;
  band: { min: number; max: number };
  areaBand: string;
  speedRatio: number | null;
}

export interface RecommendationSnapshot {
  policyVersion: string;
  /** 추천 할인 (0~1). 추천이 없던 화면(데이터 없음)이면 null */
  recommendedDiscount: number | null;
  band: { min: number; max: number } | null;
  grade: string | null;
  confidence: string | null;
  isGeneric: boolean | null;
  areaBand: string | null;
  speedRatio: number | null;
  /** 집주인이 실제로 정한 할인 = 1 − 제안 복비 ÷ 법정 상한 (0~1, 소수 셋째 자리). 상한이 0이면 null */
  chosenDiscount: number | null;
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

export function recommendationSnapshot(rec: RecommendationInput | null, input: { commissionWon: number; legalMaxWon: number }): RecommendationSnapshot {
  const { commissionWon, legalMaxWon } = input;
  const chosen = legalMaxWon > 0 && Number.isFinite(commissionWon) ? round3(Math.min(1, Math.max(0, 1 - commissionWon / legalMaxWon))) : null;
  return {
    policyVersion: RECOMMENDATION_POLICY_VERSION,
    recommendedDiscount: rec ? round3(rec.discount) : null,
    band: rec ? { min: round3(rec.band.min), max: round3(rec.band.max) } : null,
    grade: rec?.grade ?? null,
    confidence: rec?.confidence ?? null,
    isGeneric: rec?.isGeneric ?? null,
    areaBand: rec?.areaBand ?? null,
    speedRatio: rec?.speedRatio ?? null,
    chosenDiscount: chosen,
  };
}

/** 저장된 요청 요약에서 기록을 꺼낸다 (버전이 없는 옛 요약이면 null) */
export function readRecommendationSnapshot(raw: unknown): RecommendationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return typeof r.policyVersion === 'string' ? (r as unknown as RecommendationSnapshot) : null;
}
