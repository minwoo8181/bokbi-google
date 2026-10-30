import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '../siteContent';

/** 홈 문구 자동 점검 (2026-10-25, 2026-10-28 홈 구성 바뀜): 사실 아닌 약속 금지, 블라인드는 지켜주는 대상과 함께, 달라요 3단계 */
const { hero, process, guide, search } = SITE_CONTENT.home;
const all = [
  hero.title,
  hero.safeNote,
  hero.guideLink,
  search.submit,
  process.sectionTitle,
  ...process.steps.flatMap((s) => [s.title, s.desc]),
  ...guide.pages.flatMap((p) => [p.title, ...p.lines]),
];

describe('홈 문구', () => {
  it('슬로건·달라요·이용 방법·페이지 설명에 사실 아닌 약속이 없다', () => {
    const meta = readFileSync('src/app/layout.tsx', 'utf8');
    for (const s of [...all, meta]) {
      expect(s).not.toMatch(/3초|100%|AI 정밀|선착순|무료|0원/);
    }
  });

  it('가린 동·호수는 "내가 고른 중개사에게만"과 함께 쓴다 (누구에게 보이는지 빠뜨리지 않기)', () => {
    expect(process.steps[1].desc).toMatch(/동·호수.*내가 고른 중개사에게만/);
  });

  // 2026-10-29 대표님 A안: 홈 섹션은 짧게, 나머지 강점은 "자세히 보기" 시트가 들고 있다
  it('달라요는 3단계, 이용 방법은 3장 (예전 강점 4가지가 섹션이나 시트에 빠짐없이 들어감)', () => {
    expect(process.steps).toHaveLength(3);
    expect(guide.pages).toHaveLength(3);
    const text = [...process.steps.map((s) => s.desc), ...guide.pages.flatMap((p) => p.lines)].join(' ');
    for (const k of ['흥정', '동·호수', '지역 인증 대표 공인중개사', '집 보는 시간']) expect(text).toContain(k);
  });
});
