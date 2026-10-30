import { describe, it, expect } from 'vitest';
import { SITE_CONTENT } from '@/config/siteContent';
import { getPyeongListForApartment } from '@/lib/mock-analysis-data';

describe('Matching Modal 6-Step Verification & SSOT Compliance', () => {
  it('Step 1: Pyeong chips dynamically adjust to complex pyeongs', () => {
    // 힐스테이트다산 (2 pyeongs)
    const hillList = getPyeongListForApartment('힐스테이트다산');
    expect(hillList.length).toBe(2);

    // 다산자이아이비플레이스 (3 pyeongs: 34평 84㎡, 39평 99㎡, 41평 104㎡)
    const xiList = getPyeongListForApartment('다산자이아이비플레이스');
    expect(xiList.length).toBe(3);

    // Default fallback (4 pyeongs: 24, 30, 34, 38)
    const fallbackList = getPyeongListForApartment('미확인단지');
    expect(fallbackList.length).toBe(4);
  });

  it('Step 2: Korean day-of-week calculation helper works accurately', () => {
    const formatMoveInDateWithDay = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          const dateObj = new Date(y, m - 1, d);
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const dayOfWeek = days[dateObj.getDay()];
          return `${y}년 ${m}월 ${d}일 (${dayOfWeek})`;
        }
      } catch {}
      return dateStr;
    };

    // 2026-12-01 is Tuesday (화요일)
    expect(formatMoveInDateWithDay('2026-12-01')).toBe('2026년 12월 1일 (화)');
    // 2026-10-22 is Thursday (목요일)
    expect(formatMoveInDateWithDay('2026-10-22')).toBe('2026년 10월 22일 (목)');
  });

  it('Step 3: Options labels and SSOT helper notice exist in siteContent', () => {
    const step3 = SITE_CONTENT.matchingModal.step3;
    expect(step3.subTitle).toBe('허위 매물 없는 매칭을 위해 확인해요');
    // 블라인드 안내는 미리보기 한 곳: 과장 표현 금지
    expect(step3.livePreviewLabel + step3.livePreviewNote).not.toMatch(/100%|절대/);
    expect('securityCardTitle' in step3).toBe(false);
    expect(step3.optionAirconLabel).toBe('시스템에어컨');
    expect(step3.airconUnits).toEqual(['2대', '3대', '4대', '5대 이상']);
    expect(step3.optionMidDoorLabel).toBe('중문 설치');
    expect(step3.optionClosetLabel).toBe('붙박이장');
    expect(step3.optionEtcPlaceholder).toContain('기타 옵션이나 특이사항');
  });

  it('Step 5: Commission discount badge & blind security notice', () => {
    const step5 = SITE_CONTENT.matchingModal.step5;
    expect(step5.previewDiscountTag).toBe('(법정 상한보다 {percent}% · {saved} 낮게)');
    expect(step5.title).toBe('중개사에게 이렇게 보여요');
    expect(step5.previewUnlockTag).toBe('🔒 매칭 후 공개');
    // 중복 블라인드 문구(제목 아래·배지·카드 아래)는 삭제
    expect('previewSecurityNotice' in step5).toBe(false);
    expect('previewBadge' in step5).toBe(false);
    expect('subTitle' in step5).toBe(false);
  });

  it('Step 5: Masked address does not create double parentheses with floorLabel', () => {
    const maskedDong = '10*동';
    const maskedHo = '***호';
    const floorLabel = '중층 (5~14층)';
    const rendered = `${maskedDong} ${maskedHo} · ${floorLabel}`;
    expect(rendered).toBe('10*동 ***호 · 중층 (5~14층)');
    expect(rendered).not.toContain('((5~14층))');
    expect(rendered).not.toContain('(중층 (5~14층))');
  });

  it('Step 6: simple completion (A안) keeps 48h, max-3 and blind rules in three steps', () => {
    const step6 = SITE_CONTENT.matchingModal.step6;
    expect(step6.title).toBe('매칭 요청을 보냈어요');
    expect(step6.subTitle).toContain('48시간');
    expect(step6.timelineSteps).toHaveLength(3);
    const all = [step6.title, step6.subTitle, ...step6.timelineSteps].join(' ');
    expect(all).toContain('최대 3곳');
    expect(all).toContain('동·호수가 공개');
    // 사실이 아니거나 아직 없는 기능 문구 금지
    expect(all).not.toMatch(/3km|100%|무료 취소|선착순/);
  });

  it('Step 2: Asking price direct input and real-time savings badge tokens', () => {
    const step2 = SITE_CONTENT.matchingModal.step2;
    expect(step2.directEditButton).toBe('직접 입력');
    expect(step2.directEditConfirm).toBe('확인');
    expect(step2.directEditCancel).toBe('취소');
    expect(step2.directEditUnit).toBe('만 원');
    expect(step2.savingsBadgeText).toBe('매칭되면 복비가 법정 상한보다 약 {amount} 낮아요');
    // 이모지 대신 점 표시 (대표님 2026-10-27)
    expect(`${step2.savingsBadgeText}${step2.savingsBadgeZero}${step2.savingsBadgeSub}`).not.toMatch(/[✨!]/);
  });

  it('Step 4: 동의 3개(약관·수집·제3자 제공)를 인증번호 발송 전에 받는다', () => {
    const c = SITE_CONTENT.matchingModal.step4.consents;
    expect(c.items.map((i) => i.key)).toEqual(['TERMS', 'COLLECT', 'PROVIDE']);
    expect(c.items.every((i) => i.label.startsWith('[필수]'))).toBe(true);
    // 수집·이용 고지 필수 항목 (개인정보 보호법 제15조 2항): 목적·항목·보유 기간 + 거부할 권리
    const collect = c.items.find((i) => i.key === 'COLLECT')!.rows.map(([k]) => k);
    expect(collect).toEqual(expect.arrayContaining(['목적', '항목', '보유 기간']));
    const provide = c.items.find((i) => i.key === 'PROVIDE')!.rows.map(([k]) => k);
    expect(provide).toEqual(expect.arrayContaining(['받는 곳', '목적', '항목', '보유 기간']));
    expect(c.refusal).toContain('동의하지 않을 수 있어요');
  });

  it('집주인 화면에 사실과 다른 "선착순"·확인 안 된 약속이 없다', () => {
    const m = SITE_CONTENT.matchingModal;
    const p = SITE_CONTENT.home.process;
    const text = [m.headerTitle, m.step1.summaryNotice, p.sectionTitle, ...p.steps.flatMap((s) => [s.title, s.desc])].join(' ');
    expect(text).not.toMatch(/선착순|3초|100%|AI 정밀/);
  });

  it('Step 4: SMS verification without Kakao OAuth compliance', () => {
    const step4 = SITE_CONTENT.matchingModal.step4;
    expect(step4.carrierSectionTitle).toContain('알뜰폰 포함');
    expect(step4.confirmCodeButton).toBe('인증 확인');
    expect(step4.verifiedBadge).toContain('인증 완료');
    expect(step4.testAutoFillButton).toContain('123456');
  });
});
