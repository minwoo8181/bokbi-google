import { describe, expect, it } from 'vitest';
import { fillSecrets, formatDongHo, newRequestInput, splitDongHo, stripSecrets, SUMMARY_SECRET_KEYS } from '../summaryRequest';
import { parseSavedRequest } from '../requestDraft';

/** 매칭 모달 handleFinalSubmit 이 저장하는 모양 (필요한 칸만) */
const summary = {
  id: 'BK-20261026-9842',
  aptId: 16,
  aptName: '다산자이아이비플레이스',
  pyeongId: '85',
  pyeongName: '34평 (전용 85㎡)',
  pyeongExclusiveArea: 84.9,
  pyeongTypeName: 'A',
  tradeType: '매매',
  dongInput: '104',
  hoInput: '1802',
  maskedDong: '10*동',
  maskedHo: '***호',
  floorLabel: '중층',
  floorCategory: 'mid',
  askingPriceTenThousand: 99_000,
  finalCommissionWon: 2_970_000,
  legalMaxWon: 4_950_000,
  occupancy: 'TENANT',
  tenantPhone: '010-1111-2222',
  visitNoticeMemo: '오후만 가능',
  moveInType: 'DATE',
  moveInDate: '2026-12-20',
  ownerName: '홍길동',
  ownerPhone: '010-3333-4444',
  ownerTelecom: 'SKT',
  hasAircon: true,
  airconCount: '3대',
  hasMidDoor: true,
  hasCloset: false,
  customOptionMemo: '거실 확장',
  selectedOptionsSummary: '시스템에어컨(3대), 중문, 거실 확장',
  mortgage: { status: 'NONE', plan: null, maxClaimManwon: 0, summary: '없음' },
  leasedSale: null,
};
const SECRET_VALUES = ['104', '1802', '홍길동', '010-1111-2222', '010-3333-4444', '오후만 가능', '거실 확장'];

describe('formatDongHo · splitDongHo', () => {
  it.each([
    ['104', '1802', '104 1802호'],
    ['104동', '1802', '104동 1802호'],
    ['', '1802', '1802호'],
  ])('%s + %s ↔ %s', (dong, ho, line) => {
    expect(formatDongHo(dong, ho)).toBe(line);
    expect(splitDongHo(line)).toEqual({ dongInput: dong, hoInput: ho });
  });

  it('모양이 다르면 동 칸에 통째로', () => {
    expect(splitDongHo(' 상가 ')).toEqual({ dongInput: '상가', hoInput: '' });
  });
});

describe('newRequestInput', () => {
  const input = newRequestInput(summary, '2026년 10월 24일')!;

  it('블라인드 칸에는 비밀 값이 없다', () => {
    const blind = JSON.stringify(input.blind);
    for (const v of SECRET_VALUES.slice(2)) expect(blind).not.toContain(v);
    expect(blind).not.toContain('104 1802');
  });

  it('비밀 칸은 동·호수 한 줄 + 연락처·메모', () => {
    expect(input.secret).toEqual({ dongHo: '104 1802호', ownerName: '홍길동', tenantPhone: '010-1111-2222', visitMemo: '오후만 가능', optionMemo: '거실 확장' });
    expect(input.termsVersion).toBe('2026년 10월 24일');
  });

  it('금액·평형·집 정보 매핑', () => {
    expect(input.blind).toMatchObject({
      aptId: '16',
      complexName: '다산자이아이비플레이스',
      tradeType: '매매',
      pyeongLabel: '34평 A · 전용 85㎡',
      maskedDongHo: '10*동 ***호',
      askingPriceManwon: 99_000,
      commissionWon: 2_970_000,
      legalMaxWon: 4_950_000,
      occupancy: 'TENANT',
    });
    expect(input.blind.details).toMatchObject({ moveIn: { type: 'DATE', date: '2026-12-20' }, aircon: '3대', midDoor: true, closet: false });
    expect(input.blind.showing).toBeDefined();
  });

  it('단지 이름·거래 유형이 없으면 null', () => {
    expect(newRequestInput({ ...summary, aptName: '' }, 'v')).toBeNull();
    expect(newRequestInput({ ...summary, tradeType: '월세' }, 'v')).toBeNull();
  });
});

describe('stripSecrets', () => {
  const stripped = stripSecrets(summary);

  it('비밀 칸이 모두 빠지고 옵션 요약 끝 메모도 빠진다', () => {
    for (const k of SUMMARY_SECRET_KEYS) expect(stripped).not.toHaveProperty(k);
    const json = JSON.stringify(stripped);
    for (const v of SECRET_VALUES.slice(2)) expect(json).not.toContain(v);
    expect(stripped.selectedOptionsSummary).toBe('시스템에어컨(3대), 중문');
  });

  it('다시 요청 요청서로 읽을 수 있다 (비밀 칸은 빈 값)', () => {
    const d = parseSavedRequest(stripped)!;
    expect(d).not.toBeNull();
    expect([d.dongInput, d.hoInput, d.ownerName, d.tenantPhone]).toEqual(['', '', '', '']);
  });

  it('원본은 그대로', () => {
    expect(summary.dongInput).toBe('104');
  });
});

describe('fillSecrets', () => {
  const contact = { ownerName: '홍길동', ownerPhone: '', tenantPhone: '010-1111-2222', visitMemo: '오후만 가능', optionMemo: '거실 확장' };

  it('비밀 칸이 빈 요청서를 열람 값으로 채운다 (strip → fill 왕복)', () => {
    const d = fillSecrets(parseSavedRequest(stripSecrets(summary))!, { dongHo: '104 1802호', contact });
    const original = parseSavedRequest(summary)!;
    expect(d).toEqual({ ...original, ownerPhone: '' });
  });

  it('요청서에 이미 동·호수가 있으면 그대로 (local 모드)', () => {
    const original = parseSavedRequest(summary)!;
    expect(fillSecrets(original, { dongHo: '999 1호', contact: null })).toBe(original);
  });

  it('파기돼 연락처가 없으면 동·호수만', () => {
    const d = fillSecrets(parseSavedRequest(stripSecrets(summary))!, { dongHo: '104 1802호', contact: null });
    expect([d.dongInput, d.hoInput, d.ownerName]).toEqual(['104', '1802', '']);
  });
});
