import { describe, expect, it } from 'vitest';
import { getAnalysisBundle, getSearchIndex } from '../repository';
import { shortName } from '../debateTopics';
import { COMPLEX_SHORT_NAMES } from '@/data/complexShortNames';

/** 금지 3가지 중 문구로 잡을 수 있는 것: 가격 담합 유도·비하 표현 */
const BANNED = ['내놓지 말', '팔지 말', '이하로 팔', '거래하지 말', '임대 단지', '휴거', '빌거'];

describe('단지별 주민 투표 주제', () => {
  const bundles = getSearchIndex().map(({ id }) => getAnalysisBundle(id)!);

  it('단지마다 주제 묶음이 다르다 (예전엔 58개 단지가 같은 5개 주제)', () => {
    // 개별 질문은 우연히 같을 수 있다 (예: 두 단지 34평 최고가가 모두 11억 5,000만) — 단지의 주제 묶음 전체가 겹치면 안 된다
    const sets = bundles.filter((b) => b.debates.length > 0).map((b) => b.debates.map((d) => d.question).join('|'));
    expect(new Set(sets).size).toBe(sets.length);
  });

  it('주제 id·선택지 id가 단지마다 고유하다 (투표 저장 키 충돌 방지)', () => {
    const ids = bundles.flatMap((b) => b.debates.flatMap((d) => [d.id, ...d.options.map((o) => o.id)]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('투표 칸 글자는 9자 이하, 이모지 없음 (짧은 이름 표 src/data/complexShortNames.ts, 7자 이상은 13px로 한 줄)', () => {
    for (const b of bundles)
      for (const d of b.debates)
        for (const o of d.options) {
          expect(o.label.length, `${b.apartment.apt_name}: ${o.label}`).toBeLessThanOrEqual(9);
          expect(o.label).not.toMatch(/\p{Extended_Pictographic}/u);
        }
  });

  it('짧은 이름 표의 키는 모두 실제 단지 이름', () => {
    const names = new Set(bundles.map((b) => shortName(b.apartment.apt_name)));
    for (const k of Object.keys(COMPLEX_SHORT_NAMES)) expect(names.has(k), k).toBe(true);
  });

  it('가짜 표수 없음: 모든 선택지 0표', () => {
    for (const b of bundles) for (const d of b.debates) for (const o of d.options) expect(o.votes).toBe(0);
  });

  it('금지 문구·채워지지 않은 자리표시가 없다', () => {
    for (const b of bundles) {
      for (const d of b.debates) {
        const text = [d.question, d.description, ...d.options.map((o) => o.label)].join(' ');
        expect(text, text).not.toMatch(/\{\w+\}/);
        for (const w of BANNED) expect(text, `${b.apartment.apt_name}: ${text}`).not.toContain(w);
      }
    }
  });

  it('비교 막대(B안): 값은 양수이고 표기가 비어 있지 않다', () => {
    for (const b of bundles) {
      for (const d of b.debates) {
        for (const s of d.compare ?? []) {
          expect(s.value, `${b.apartment.apt_name} ${d.key}`).toBeGreaterThanOrEqual(0);
          expect(s.display.length).toBeGreaterThan(0);
          expect(s.label).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it('대장 배틀 (2026-10-27): 30평대 실거래 중간값 순위, 30평대가 없으면 20평대. 상대는 바로 위(1위면 2위), 막대 = 그 두 단지 중간값', () => {
    const data = getSearchIndex().map(({ id }) => ({ id, b: getAnalysisBundle(id)! }));
    let n30 = 0;
    let n20 = 0;
    for (const { b } of data) {
      const d = b.debates.find((x) => x.key === 'LEADER');
      if (!d) continue;
      expect(d.question).toMatch(/^다산 (30|20)평대 대장은\?$/);
      const [rankA, rankB] = d.description.match(/(\d+)위 vs (\d+)위/)!.slice(1).map(Number);
      expect(rankB, d.description).toBe(rankA === 1 ? 2 : rankA - 1);
      // 순위가 위인 쪽 값이 크거나 같다
      const [mine, rival] = d.compare!;
      expect(rankB < rankA ? rival.value >= mine.value : mine.value >= rival.value, `${b.apartment.apt_name}`).toBe(true);
      if (d.question.includes('30평대')) n30++;
      else n20++;
    }
    expect(n30).toBeGreaterThan(30);
    expect(n20).toBeGreaterThan(0);
    // 소형만 있는 단지가 30평대 1위로 올라오지 않는다 (예전 ㎡당 순위의 문제)
    const ivy = data.find(({ b }) => b.apartment.apt_name.includes('아이비플레이스'))!.b.debates.find((d) => d.key === 'LEADER')!;
    expect(ivy.question).toBe('다산 30평대 대장은?');
    expect(ivy.description).toContain('1위 vs 2위');
  });

  it('다산자이아이비플레이스: 실데이터 숫자로 5개 틀이 모두 만들어진다', () => {
    const ivy = bundles.find((b) => b.apartment.apt_name.includes('아이비플레이스'))!;
    expect(ivy.debates.map((d) => d.key)).toEqual(['RECORD', 'LEADER', 'SUPPLY', 'JEONSE', 'UPGRADE']);
    const supply = ivy.debates.find((d) => d.key === 'SUPPLY')!;
    expect(supply.question).toContain(`매물 ${ivy.apartment.current_sale_listings}건`);
  });
});
