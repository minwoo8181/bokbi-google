import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '../siteContent';
import { DEMO_OFFERS_WITH_RECORD } from '@/components/my-requests/mock-requests';

/**
 * 강점 칩·후기 칩 자동 점검 (2026-10-25). 칩을 고칠 때 블라인드·사실 아닌 약속 원칙이 깨지지 않게 막는다.
 * 근거: docs/handover/broker-chips-research.md §2
 */
const { brokerStrengths } = SITE_CONTENT;
const strengthChips = brokerStrengths.groups.flatMap((g) => g.chips);
const { reviewChipGroups } = SITE_CONTENT.myRequests.contracted;
const reviewChips: readonly string[] = reviewChipGroups.flatMap((g) => g.chips);

/** 사실 아닌 약속·자격처럼 읽히는 말·사람 속성·중개사를 낮추는 말 */
const BANNED = ['100%', '최저', '무조건', '선착순', '보장', '전문', '년차', '경력', '나이', '여성', '남성', '할인', '저렴'];

describe('강점 칩', () => {
  // "잘해요" 칩 개편 후 22개 (상한 26, 대표님 2026-10-25)
  it('전체 26개 이내, 분야별 3~6개, 중복 없음', () => {
    expect(strengthChips.length).toBeLessThanOrEqual(26);
    for (const g of brokerStrengths.groups) {
      expect(g.chips.length).toBeGreaterThanOrEqual(3);
      expect(g.chips.length).toBeLessThanOrEqual(6);
    }
    expect(new Set(strengthChips).size).toBe(strengthChips.length);
  });

  it('금지 표현과 숫자가 없다 (연차·인원 등은 파랑 확인 배지 몫)', () => {
    for (const c of strengthChips) {
      for (const w of BANNED) expect(c, c).not.toContain(w);
      expect(c, c).not.toMatch(/\d/);
    }
  });

  it('카드 한 줄에 맞게 12자 이내', () => {
    for (const c of strengthChips) expect(c.length, c).toBeLessThanOrEqual(12);
  });

  it('강점 칩마다 짝이 되는 후기 칩이 있다 (집주인이 고르면 "인정")', () => {
    for (const c of strengthChips) {
      const pair = brokerStrengths.endorsedBy[c];
      expect(pair, c).toBeDefined();
      expect(reviewChips, `${c} → ${pair}`).toContain(pair);
    }
    expect(Object.keys(brokerStrengths.endorsedBy).sort()).toEqual([...strengthChips].sort());
  });

  it('가능한 것(조건)은 강점과 겹치지 않고 12자 이내', () => {
    for (const c of brokerStrengths.conditions) {
      expect(strengthChips, c).not.toContain(c);
      expect(c.length, c).toBeLessThanOrEqual(12);
    }
  });

  it('목업 강점은 목록 안에서 최대 3개', () => {
    for (const o of DEMO_OFFERS_WITH_RECORD) {
      expect(o.strengths.length).toBeLessThanOrEqual(brokerStrengths.max);
      for (const s of o.strengths) expect(strengthChips, s).toContain(s);
    }
  });
});

describe('후기 칩', () => {
  it('20~30개, 중복 없음, 금지 표현 없음', () => {
    expect(reviewChips.length).toBeGreaterThanOrEqual(20);
    expect(reviewChips.length).toBeLessThanOrEqual(30);
    expect(new Set(reviewChips).size).toBe(reviewChips.length);
    for (const c of reviewChips) for (const w of BANNED) expect(c, c).not.toContain(w);
  });

  // 강점 칩 짝 4개를 더해 묶음 최대 6개 (2026-10-25)
  it('6묶음, 묶음마다 3~6개', () => {
    expect(reviewChipGroups.map((g) => g.label)).toEqual(['설명·전문성', '소통', '판매 활동', '방문 안내', '협상·계약', '신뢰']);
    for (const g of reviewChipGroups) {
      expect(g.chips.length).toBeGreaterThanOrEqual(3);
      expect(g.chips.length).toBeLessThanOrEqual(6);
    }
  });

  it('복비 약속 이행 칩이 있다', () => {
    expect(reviewChips).toContain('복비 약속을 지켰어요');
  });

  it('목업 후기 집계는 목록 안의 칩만 쓴다', () => {
    for (const o of DEMO_OFFERS_WITH_RECORD) {
      for (const c of Object.keys(o.review.chipCounts)) expect(reviewChips, c).toContain(c);
    }
  });
});
