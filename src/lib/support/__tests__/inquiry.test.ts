import { describe, expect, it } from 'vitest';
import { inquiryHref } from '../inquiry';

describe('문의하기 연결', () => {
  it('카카오 채널 주소가 있으면 카카오로', () => {
    expect(inquiryHref('https://pf.kakao.com/_abcd/chat', 'privacy@bokbi.kr')).toEqual({ href: 'https://pf.kakao.com/_abcd/chat', kind: 'KAKAO' });
  });

  it('비었거나 카카오 주소가 아니면 이메일로 (버튼이 죽지 않게)', () => {
    expect(inquiryHref('', 'privacy@bokbi.kr')).toEqual({ href: 'mailto:privacy@bokbi.kr', kind: 'EMAIL' });
    expect(inquiryHref('http://pf.kakao.com/_abcd', 'a@b.kr').kind).toBe('EMAIL');
    expect(inquiryHref('https://evil.example/pf.kakao.com/', 'a@b.kr').kind).toBe('EMAIL');
  });
});
