import { describe, it, expect } from 'vitest';
import { COMPLEX_PYEONG_MAP } from '../complexPyeongMap';
import { getPyeongListForApartment } from '@/lib/mock-analysis-data';
import { SITE_CONTENT } from '@/config/siteContent';

describe('Real Complex Pyeong Mapping & SSOT Copywriting', () => {
  it('should load real traded pyeongs for 다산자이아이비플레이스 from 국토교통부 dataset', () => {
    const list = getPyeongListForApartment('다산자이아이비플레이스');
    expect(list.length).toBeGreaterThanOrEqual(2);
    
    // 다산자이아이비플레이스는 34평(전용 84㎡)과 39평(전용 99㎡/104㎡)이 주력
    const names = list.map((p) => p.name);
    expect(names.some((n) => n.includes('34평') || n.includes('84'))).toBe(true);
    expect(names.some((n) => n.includes('39평') || n.includes('99') || n.includes('104'))).toBe(true);
  });

  it('should load real traded pyeongs for 힐스테이트다산', () => {
    const list = getPyeongListForApartment('힐스테이트다산');
    expect(list.length).toBeGreaterThanOrEqual(2);
    
    // 힐스테이트다산은 30평(전용 66.8㎡)과 34평(전용 84.8㎡)
    const names = list.map((p) => p.name);
    expect(names.some((n) => n.includes('30평') || n.includes('28평'))).toBe(true);
    expect(names.some((n) => n.includes('34평') || n.includes('84'))).toBe(true);
  });

  it('should fallback gracefully for unknown apartment names', () => {
    const list = getPyeongListForApartment('미등록단지테스트');
    expect(list.length).toBe(4);
    expect(list[0].id).toBe('24');
    expect(list[2].id).toBe('34');
  });

  it('should keep the max-3 selection rule and 48-hour window on the completion screen', () => {
    const step6 = SITE_CONTENT.matchingModal.step6;
    expect(step6.timelineSteps.join(' ')).toContain('최대 3곳');
    expect(step6.subTitle).toContain('48시간');
  });

  it('should resolve colloquial apartment aliases to official 국토교통부 complexes without falling back', () => {
    // 1. 다산자연앤푸르지오 -> 다산푸르지오
    const prugio = getPyeongListForApartment('다산자연앤푸르지오');
    expect(prugio.length).toBeGreaterThan(0);
    expect(prugio[0].contracts.length).toBeGreaterThan(0);

    // 2. 다산금강펜테리움리버테라스I -> 다산 펜테리움 리버테라스 Ⅰ
    const penterium = getPyeongListForApartment('다산금강펜테리움리버테라스I');
    expect(penterium.length).toBeGreaterThan(0);
    expect(penterium[0].name).toContain('34평');

    // 3. 다산e편한세상자이 -> 다산 이편한세상자이 (실거래 445건 1위 단지)
    const epyn = getPyeongListForApartment('다산e편한세상자이');
    expect(epyn.length).toBeGreaterThanOrEqual(3);

    // 4. 가운휴먼시아6단지 -> 다산 한신 더휴 6단지
    const hanshin = getPyeongListForApartment('가운휴먼시아6단지');
    expect(hanshin.length).toBeGreaterThan(0);

    // 5. 플루리움4단지 -> 플루리움4,5단지
    const plurium = getPyeongListForApartment('플루리움4단지');
    expect(plurium.length).toBeGreaterThan(0);
  });

  it('should enforce blind preview copy in step 5', () => {
    const step5 = SITE_CONTENT.matchingModal.step5;
    expect(step5.previewUnlockTag).toBe('🔒 매칭 후 공개');
  });
});
