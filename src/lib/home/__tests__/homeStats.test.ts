import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '@/config/siteContent';
import { EMPTY_LIVE, homeStatsView, MIN_CALC_SHOWN, parseLiveStats } from '../homeStats';

const copy = SITE_CONTENT.home.stats;
const facts = { complexes: 58, trades: 5509, listings: 1762, offices: 336 };

describe('홈 숫자 카드 (상황별 전광판)', () => {
  it('매칭 0건: 분석 사실 숫자, LIVE 없음, 중개사무소는 등록 명단 수', () => {
    const v = homeStatsView(facts, EMPTY_LIVE, copy);
    expect(v).toMatchObject({ stage: 'FACTS', badge: null, title: '복비 엔진이 분석한 다산동 아파트', big: '58개 단지 · 실거래 5,509건', sub: '매물 1,762건 흐름까지 함께 봐요' });
    expect(v.right).toEqual({ label: '다산동 중개사무소', value: '336곳', note: '등록 명단 기준' });
  });

  it('매칭 1건부터: 한 집 평균(만 원 아래 버림)·현재까지 총합, ● LIVE, 집 수는 안 보임', () => {
    const v = homeStatsView(facts, { matchCount: 12, feeGapTotalWon: 18_400_000, calcCount: 8902 }, copy);
    expect(v).toMatchObject({ stage: 'LIVE', badge: 'LIVE', title: '집주인과 중개사가 함께 정한 복비', big: '한 집 평균 153만 원 낮게', sub: '현재까지 총 1,840만 원 · 법정 상한 기준' });
    expect(`${v.big} ${v.sub}`).not.toMatch(/12/);
    expect(v.left).toEqual({ label: '복비 계산', value: '8,902명 계산 중' });
  });

  it('1억 넘는 총합 표기', () => {
    expect(homeStatsView(facts, { matchCount: 84, feeGapTotalWon: 123_000_000, calcCount: null }, copy).sub).toBe('현재까지 총 1억 2,300만 원 · 법정 상한 기준');
  });

  it('매칭은 있는데 낮게 정한 금액이 0원이면 사실 숫자 그대로 (0원 평균을 보여 주지 않음)', () => {
    expect(homeStatsView(facts, { matchCount: 3, feeGapTotalWon: 0, calcCount: null }, copy).stage).toBe('FACTS');
  });

  it('조회 수: 모르거나 너무 작으면 왼쪽 칸 숨김, 경계값부터 보임', () => {
    expect(homeStatsView(facts, EMPTY_LIVE, copy).left).toBeNull();
    expect(homeStatsView(facts, { ...EMPTY_LIVE, calcCount: MIN_CALC_SHOWN - 1 }, copy).left).toBeNull();
    expect(homeStatsView(facts, { ...EMPTY_LIVE, calcCount: MIN_CALC_SHOWN }, copy).left?.value).toBe(`${MIN_CALC_SHOWN}명 계산 중`);
  });

  it('카드 문구에 과장·가짜 숫자 표현 없음 (줄였다·집주인 n명)', () => {
    const all = JSON.stringify(copy);
    for (const bad of ['줄였', '집주인 {n}명', '1억 4,384만', '1,428명']) expect(all).not.toContain(bad);
  });

  it('공개 집계 응답 검사: 모양이 틀리면 매칭 0건', () => {
    expect(parseLiveStats(null)).toEqual(EMPTY_LIVE);
    expect(parseLiveStats({ matchCount: 2, feeGapTotalWon: 3_000_000, calcCount: 40 })).toEqual({ matchCount: 2, feeGapTotalWon: 3_000_000, calcCount: 40 });
    expect(parseLiveStats({ matchCount: -1, feeGapTotalWon: 'x', calcCount: null })).toEqual(EMPTY_LIVE);
  });
});
