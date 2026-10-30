import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '../siteContent';

/**
 * 중개사 쪽 문구 자동 점검 (2026-10-25)
 * - 비용 표현(광고비·0원·무료) 금지: 나중에 크레딧·매칭비가 생겨도 사실로 남게 "집주인이 직접 맡긴 매물"로
 * - 사실 아닌 약속(선착순·100%·하루 3건) 금지, "경쟁" 대신 "최대 3곳만 맡아요"
 */
const BANNED = /광고비|0원|무료|선착순|100%|하루 (최대 )?3건|경쟁/;
const texts = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(texts) : v && typeof v === 'object' ? Object.values(v).flatMap(texts) : [];

describe('중개사 문구', () => {
  it('가입·배너·중개사 금액 카드에 비용·과장 표현이 없다', () => {
    const all = [
      ...texts(SITE_CONTENT.brokerSignup),
      ...texts(SITE_CONTENT.home.partnerBanner),
      ...texts(SITE_CONTENT.analysis.brokerPayout),
      ...texts(SITE_CONTENT.brokerAgent),
      ...texts(SITE_CONTENT.brokerDeal),
    ];
    for (const s of all) expect(s, s).not.toMatch(BANNED);
  });

  it('하드코딩된 배너·중개사 화면에도 없다', () => {
    for (const f of [
      'src/components/agent/BrokerPartnerBanner.tsx',
      'src/components/agent/AgentWorkspace.tsx',
      'src/components/agent/FeedRequestSheet.tsx',
      'src/components/agent/MoreCreditsSheet.tsx',
      'src/components/agent/DealPage.tsx',
      'src/components/agent/DealNextCard.tsx',
      'src/components/agent/DealTimeline.tsx',
      'src/components/agent/DealDatesSheet.tsx',
      'src/components/agent/DealNewsRow.tsx',
      'src/components/agent/VisitScheduleSection.tsx',
      'src/components/agent/SpecialTermsBuilder.tsx',
    ]) {
      // 주석은 화면에 안 나오므로 빼고 검사
      const code = readFileSync(f, 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, f).not.toMatch(BANNED);
    }
  });

  it('약속 화면: 지켜드리는 것 2개 + 지킬 약속 4개, 첫 약속은 합의 복비', () => {
    const p = SITE_CONTENT.brokerSignup.promise;
    expect(p.protectItems).toHaveLength(2);
    expect(p.items).toHaveLength(4);
    expect(p.items[0].title).toContain('합의한 복비');
  });

  it('가입 순서: 사무소·본인 확인 → 잘하는 점 → 약속 → 완료, 운영팀 전화·실사 안내 (대표님 2026-10-28)', () => {
    const s = SITE_CONTENT.brokerSignup;
    expect(s.steps).toEqual(['사무소·본인 확인', '잘하는 점', '약속', '신청 완료']);
    expect(s.auditNotice).toContain('전화와 실사');
  });

  it('가입 화면에 "네이버"가 없다 — 확인 전화는 "브이월드 등 공개된 사무소 번호" (대표님 2026-10-29)', () => {
    expect(JSON.stringify(SITE_CONTENT.brokerSignup)).not.toContain('네이버');
    expect(SITE_CONTENT.brokerSignup.office.callPreview).toContain('브이월드 등 공개된 사무소 번호');
    expect(SITE_CONTENT.brokerSignup.done.callHow).toContain('브이월드 등 공개된 사무소 번호');
  });
});
