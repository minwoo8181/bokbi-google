import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '../siteContent';

/** 분석 화면 문구 자동 점검 (2026-10-27): 시세·호가 출처로 매물 수집처(네이버) 이름을 쓰지 않는다 */
describe('분석 화면 문구', () => {
  it('어디에도 "네이버"가 없다', () => {
    expect(JSON.stringify(SITE_CONTENT.analysis)).not.toContain('네이버');
  });
});
