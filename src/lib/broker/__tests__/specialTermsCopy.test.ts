import { describe, expect, it } from 'vitest';
import raw from '@/data/special-terms/terms.json';
import { SITE_CONTENT } from '@/config/siteContent';
import type { TermsData } from '../specialTerms';

const data = raw as unknown as TermsData;

/** 내 사무소 "복비 특약" 안내 문구의 숫자가 실제 특약 데이터와 같은지 (엑셀을 고치면 문구도 같이 고치게) */
describe('복비 특약 안내 문구 숫자', () => {
  it('상황 수·문구 수가 terms.json과 같다', () => {
    const sub = SITE_CONTENT.brokerTerms.officeMenuSub;
    expect(sub).toContain(`${data.types.length}가지 상황`);
    expect(sub).toContain(`${data.clauses.length}개`);
  });
});
