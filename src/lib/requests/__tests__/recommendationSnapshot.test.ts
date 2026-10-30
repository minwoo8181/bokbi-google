import { describe, expect, it } from 'vitest';
import { ENGINE_PARAMS, RECOMMENDATION_POLICY_VERSION } from '@/lib/analysis/marketEngine';
import { readRecommendationSnapshot, recommendationSnapshot } from '../recommendationSnapshot';
import { newRequestInput } from '../summaryRequest';

const rec = {
  grade: 'BALANCED',
  confidence: 'HIGH',
  isGeneric: false,
  discount: 0.27349,
  band: { min: 0.24849, max: 0.29849 },
  areaBand: 'MEDIUM',
  speedRatio: 1.1,
};

describe('추천 기준 버전', () => {
  // ENGINE_PARAMS를 바꿨는데 버전을 안 올리면 여기서 실패한다 → 버전을 올리고 아래 값을 같이 고친다
  it('v1-2026-10-29 = 지금 엔진 값', () => {
    expect(RECOMMENDATION_POLICY_VERSION).toBe('v1-2026-10-29');
    expect(ENGINE_PARAMS).toEqual({
      windowDays: 182,
      reportLagDays: 30,
      pseudoSales: 3,
      minRecDiscount: 0.2,
      midRecDiscount: 0.3,
      maxRecDiscount: 0.5,
      slowAnchor: 0.5,
      fastAnchor: 2,
      bandShrinkK: 6,
      maxProposalDiscount: 0.7,
      priceWindowMonths: 6,
      minMomentumSample: 3,
      fastRatio: 1.25,
      slowRatio: 0.75,
      cautionSpan: 0.1,
      wideZoneMaxDiscount: 0.2,
      bandHalfWidth: 0.025,
    });
  });
});

describe('recommendationSnapshot', () => {
  it('버전·추천·실제 할인을 남긴다', () => {
    const s = recommendationSnapshot(rec, { commissionWon: 3_500_000, legalMaxWon: 5_000_000 });
    expect(s).toEqual({
      policyVersion: RECOMMENDATION_POLICY_VERSION,
      recommendedDiscount: 0.273,
      band: { min: 0.248, max: 0.298 },
      grade: 'BALANCED',
      confidence: 'HIGH',
      isGeneric: false,
      areaBand: 'MEDIUM',
      speedRatio: 1.1,
      chosenDiscount: 0.3,
    });
  });

  it('추천이 없어도 버전과 실제 할인은 남긴다', () => {
    const s = recommendationSnapshot(null, { commissionWon: 4_000_000, legalMaxWon: 5_000_000 });
    expect(s.policyVersion).toBe(RECOMMENDATION_POLICY_VERSION);
    expect(s.recommendedDiscount).toBeNull();
    expect(s.chosenDiscount).toBe(0.2);
  });

  it('상한이 0이면 실제 할인 null, 0~1 밖은 잘라낸다', () => {
    expect(recommendationSnapshot(null, { commissionWon: 1, legalMaxWon: 0 }).chosenDiscount).toBeNull();
    expect(recommendationSnapshot(null, { commissionWon: 6_000_000, legalMaxWon: 5_000_000 }).chosenDiscount).toBe(0);
  });

  it('저장된 요약에서 다시 읽는다 (버전 없는 옛 요약은 null)', () => {
    const s = recommendationSnapshot(rec, { commissionWon: 3_500_000, legalMaxWon: 5_000_000 });
    expect(readRecommendationSnapshot(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(readRecommendationSnapshot({ discount: 0.3 })).toBeNull();
    expect(readRecommendationSnapshot(null)).toBeNull();
  });

  it('서버 의뢰(blind)에 기록이 실린다', () => {
    const s = recommendationSnapshot(rec, { commissionWon: 3_500_000, legalMaxWon: 5_000_000 });
    const input = newRequestInput({ aptName: '힐스테이트다산', tradeType: '매매', pyeongName: '34평', recommendation: s }, '2026-10-01');
    expect(input?.blind.recommendation).toEqual(s);
    const old = newRequestInput({ aptName: '힐스테이트다산', tradeType: '매매', pyeongName: '34평' }, '2026-10-01');
    expect(old?.blind.recommendation).toBeUndefined();
  });
});
