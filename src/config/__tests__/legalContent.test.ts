import { describe, expect, it } from 'vitest';
import { COMPANY_INFO, COMPANY_TOKENS, SITE_CONTENT, type LegalBlock } from '../siteContent';
import { resolveCompanyTokens } from '@/components/common/LegalText';

/** 법적 고지 자동 점검 (2026-10-24). 문구를 고칠 때 법정 필수 조항이 빠지거나 자리표시가 깨지지 않게 막는다 */
const { legal } = SITE_CONTENT;
const blockText = (b: LegalBlock): string[] =>
  'p' in b ? [b.p] : 'ul' in b ? [...b.ul] : [...b.table.head, ...b.table.rows.flat()];
const docText = (doc: { sections: readonly { heading: string; blocks: readonly LegalBlock[] }[] }) =>
  doc.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap(blockText)]);
const allLegalText = [
  ...docText(legal.termsOfService),
  ...docText(legal.privacyPolicy),
  ...docText(legal.disclaimerPolicy),
  ...Object.values(legal.modal).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))),
  SITE_CONTENT.home.footer.disclaimer,
  SITE_CONTENT.home.footer.businessInfoToggle,
];

describe('개인정보 처리방침 필수 조항 (개인정보 보호법 제30조·시행령 제31조)', () => {
  const headings = legal.privacyPolicy.sections.map((s) => s.heading).join('\n');
  const REQUIRED = [
    '처리 목적',
    '처리하는 개인정보의 항목',
    '보유 기간',
    '제3자 제공',
    '위탁',
    '국외 이전',
    '파기',
    '정보주체의 권리',
    '자동 수집 장치',
    '안전성 확보',
    '보호책임자',
    '구제',
    '변경',
  ];
  it.each(REQUIRED)('"%s" 조항이 있다', (keyword) => {
    expect(headings).toContain(keyword);
  });

  it('위탁 수탁자마다 처리 국가가 있다', () => {
    for (const p of COMPANY_INFO.privacyProcessors) expect(p.country.length).toBeGreaterThan(0);
  });
});

describe('이용약관 필수 조항', () => {
  const headings = legal.termsOfService.sections.map((s) => s.heading).join('\n');
  it.each(['약관의 게시와 변경', '크레딧', '분쟁 해결과 관할', '회사의 지위', '부칙'])('"%s" 조항이 있다', (keyword) => {
    expect(headings).toContain(keyword);
  });

  it('사용한 크레딧은 환불되지 않음을 명시한다 (청약철회 제한 사전 고지)', () => {
    const credit = legal.termsOfService.sections.find((s) => s.heading.includes('크레딧'))!;
    expect(credit.blocks.flatMap(blockText).join(' ')).toContain('환불되지 않습니다');
  });
});

describe('사실 정합·자리표시', () => {
  it('실제 배포처(Cloudflare)와 다른 Vercel 표기가 없다', () => {
    expect(JSON.stringify(COMPANY_INFO)).not.toContain('Vercel');
    expect(allLegalText.join(' ')).not.toContain('Vercel');
  });

  it('모든 {company.키} 자리표시가 실제 값으로 치환된다', () => {
    const unresolved = allLegalText.map(resolveCompanyTokens).filter((t) => t.includes('{company.'));
    expect(unresolved).toEqual([]);
  });

  it('바닥글 한 줄 고지는 개업공인중개사가 아님·통신판매중개자·거래 당사자 아님을 모두 말한다', () => {
    const d = SITE_CONTENT.home.footer.disclaimer;
    for (const k of ['개업공인중개사가 아닌', '통신판매중개자', '거래의 당사자가 아닙니다']) expect(d).toContain(k);
  });

  it('배포 전 교체 목록의 키는 모두 자리표시 키다', () => {
    for (const key of COMPANY_INFO.pendingFields) expect(Object.keys(COMPANY_TOKENS)).toContain(key);
  });

  it('금지 용어를 쓰지 않는다 (RULES 금지 사전)', () => {
    const text = allLegalText.join(' ');
    for (const banned of ['수수료', '계약을 진행할 수 있습니다', '제한합니다', '선착순 수락']) expect(text).not.toContain(banned);
  });

  it('배포 전 교체 항목 목록을 출력한다 (0개가 되어야 배포 가능)', () => {
    if (COMPANY_INFO.pendingFields.length > 0) {
      console.warn(`[배포 전 교체 필요 ${COMPANY_INFO.pendingFields.length}개] ${COMPANY_INFO.pendingFields.join(', ')}`);
    }
    expect(Array.isArray(COMPANY_INFO.pendingFields)).toBe(true);
  });
});
