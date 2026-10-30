import { describe, it, expect } from 'vitest';
import { draftAppliesTo, draftRows, findSavedPyeong, parseResume, parseSavedRequest } from '../requestDraft';

/** 매칭 모달 handleFinalSubmit 이 저장하는 모양 그대로 */
const saved = {
  aptId: 8,
  pyeongId: '85',
  pyeongName: '34평',
  pyeongTypeName: '34B',
  tradeType: '매매',
  floorCategory: 'mid',
  askingPriceTenThousand: 124_000,
  finalCommissionWon: 5_330_000,
  legalMaxWon: 7_440_000,
  occupancy: 'TENANT',
  tenantPhone: '010-0000-0000',
  isTenantNotifiedChecked: true,
  visitNoticeMemo: '',
  moveInType: 'DATE',
  moveInDate: '2027-08-31',
  moveInDateFormatted: '2027년 8월 31일 (화)',
  leasedSale: { kind: 'JEONSE', depositManwon: 70_000, monthlyRentManwon: 0, leaseEndDate: '2027-08-31', renewal: 'NOT_USED', summary: '전세 7억 원 · 2027.08.31 만료 · 갱신권 미사용', buyerCashManwon: 54_000 },
  mortgage: { status: 'NONE', maxClaimManwon: 0, plan: null, summary: '없음' },
  dongInput: '5201동',
  hoInput: '1201',
  hasAircon: true,
  airconCount: '3대',
  hasMidDoor: false,
  hasCloset: true,
  customOptionMemo: '',
  selectedOptionsSummary: '시스템에어컨(3대), 붙박이장',
  ownerName: '홍길동',
  ownerPhone: '010-9876-5432',
  ownerTelecom: 'SKT',
};

describe('다시 요청: 저장된 요청서 읽기', () => {
  it('모달이 저장한 값을 그대로 읽는다 (단지 번호는 문자열로)', () => {
    const d = parseSavedRequest(saved)!;
    expect(d.aptId).toBe('8');
    expect(d.pyeongId).toBe('85');
    expect(d.leasedSale?.renewal).toBe('NOT_USED');
    expect(d.mortgage.status).toBe('NONE');
    expect(d.hasCloset).toBe(true);
  });

  it('단지 번호·평형·거래 유형이 없으면 이어하기 불가', () => {
    expect(parseSavedRequest({ ...saved, aptId: undefined })).toBeNull();
    expect(parseSavedRequest({ ...saved, pyeongName: '' })).toBeNull();
    expect(parseSavedRequest({ ...saved, tradeType: '월세' })).toBeNull();
    expect(parseSavedRequest(null)).toBeNull();
    expect(parseSavedRequest('x')).toBeNull();
  });

  it('이상한 값은 안전한 기본값으로', () => {
    const d = parseSavedRequest({ ...saved, occupancy: '??', floorCategory: 'top', moveInType: 1, leasedSale: null, mortgage: undefined })!;
    expect(d.occupancy).toBe('VACANT');
    expect(d.floorCategory).toBe('mid');
    expect(d.moveInType).toBe('IMMEDIATE');
    expect(d.leasedSale).toBeNull();
    expect(d.mortgage.status).toBeNull();
  });

  it('예전 요청서(평형 id 없음)는 평형 이름으로 찾는다', () => {
    const list = [{ id: '67', name: '27평 (전용 67㎡)' }, { id: '85', name: '34평 (전용 85㎡)' }];
    expect(findSavedPyeong(list, parseSavedRequest(saved)!)?.id).toBe('85');
    expect(findSavedPyeong(list, parseSavedRequest({ ...saved, pyeongId: undefined })!)?.id).toBe('85');
    expect(findSavedPyeong(list, parseSavedRequest({ ...saved, pyeongId: '99' })!)).toBeNull();
  });

  it('평형·거래 유형이 같을 때만 저장값을 채운다', () => {
    const d = parseSavedRequest(saved);
    expect(draftAppliesTo(d, '34평', '매매')).toBe(true);
    expect(draftAppliesTo(d, '34평 (전용 85㎡)', '매매')).toBe(true);
    expect(draftAppliesTo(d, '27평', '매매')).toBe(false);
    expect(draftAppliesTo(d, '34평', '전세')).toBe(false);
    expect(draftAppliesTo(null, '34평', '매매')).toBe(false);
  });

  it('이어하기 정보: 단계·복비·요청서가 모두 있어야 한다', () => {
    const r = parseResume({ step: 'DONG_HO', feeWon: 5_000_000, draft: saved });
    expect(r?.step).toBe('DONG_HO');
    expect(r?.feeWon).toBe(5_000_000);
    expect(r?.draft.aptId).toBe('8');
    expect(parseResume({ step: 'OWNER_VERIFY', feeWon: 5_000_000, draft: saved })).toBeNull(); // 인증 단계는 다시 하지 않음
    expect(parseResume({ step: 'DONG_HO', feeWon: 0, draft: saved })).toBeNull();
    expect(parseResume({ step: 'DONG_HO', feeWon: 5_000_000 })).toBeNull(); // 요청서 없음
    expect(parseResume(undefined)).toBeNull();
  });

  it('요약 줄: 항목마다 고칠 단계가 정해져 있다', () => {
    const rows = draftRows(parseSavedRequest(saved)!, (m) => `${m}만`, {
      occupancy: { VACANT: '공실', OWNER: '집주인 거주', TENANT: '세입자 거주' },
      noOptions: '없음',
    });
    expect(rows.map((r) => [r.key, r.step])).toEqual([
      ['PRICE', 'PRICE_MOVEIN'],
      ['OCCUPANCY', 'PRICE_MOVEIN'],
      ['MOVE_IN', 'PRICE_MOVEIN'],
      ['MORTGAGE', 'PRICE_MOVEIN'],
      ['OPTIONS', 'DONG_HO'],
    ]);
    expect(rows[1].value).toBe('세입자 거주 · 전세 7억 원 · 2027.08.31 만료 · 갱신권 미사용');
    expect(rows[4].value).toBe('시스템에어컨(3대), 붙박이장');
  });
});
