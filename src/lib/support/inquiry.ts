/**
 * 문의하기 연결 주소 (대표님 2026-10-29): 카카오톡 채널 주소가 있으면 그곳, 없으면 개인정보 보호책임자 이메일.
 * 채널 주소는 배포 직전에 COMPANY_INFO.kakaoChannelUrl에 넣는다 — 그 전에도 버튼이 죽지 않게 이메일로
 */
export function inquiryHref(kakaoChannelUrl: string, email: string): { href: string; kind: 'KAKAO' | 'EMAIL' } {
  const url = kakaoChannelUrl.trim();
  if (/^https:\/\/(pf\.kakao\.com|open\.kakao\.com)\//.test(url)) return { href: url, kind: 'KAKAO' };
  return { href: `mailto:${email}`, kind: 'EMAIL' };
}
