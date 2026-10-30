/**
 * 다시 요청 (A안, 대표님 승인 2026-10-25)
 * 매칭 모달이 저장한 요청서(localStorage `bokbi_active_request_summary`)를 읽어
 * ① 내 의뢰에서 요약으로 보여주고 ② "수정"을 누르면 분석 화면의 매칭 모달을 그 단계부터, 값이 채워진 채로 연다.
 * 수정한 단계의 "다음"은 5단계(미리보기·서약)로 바로 간다. 동·호수·소유주가 바뀌면 처음부터 새로 요청.
 * 순수 함수 (저장소 접근은 화면에서)
 */
import type { LeaseKind, RenewalRight } from '@/lib/market/leasedSale';
import type { MortgagePlan, MortgageStatus } from '@/lib/market/mortgage';

export const REQUEST_SUMMARY_KEY = 'bokbi_active_request_summary';
/** 내 의뢰 → 분석 화면으로 넘길 때 쓰는 이어하기 정보 */
export const RESUME_KEY = 'bokbi_resume_request';

export type ResumeStep = 'PRICE_MOVEIN' | 'DONG_HO';

export interface SavedRequest {
  aptId: string;
  pyeongId: string | null;
  pyeongName: string;
  pyeongTypeName: string | null;
  tradeType: '매매' | '전세';
  floorCategory: 'low' | 'mid' | 'high';
  askingPriceTenThousand: number;
  finalCommissionWon: number;
  legalMaxWon: number;
  occupancy: 'VACANT' | 'OWNER' | 'TENANT';
  tenantPhone: string;
  isTenantNotifiedChecked: boolean;
  visitNoticeMemo: string;
  moveInType: 'IMMEDIATE' | 'NEGOTIABLE' | 'DATE';
  moveInDate: string;
  moveInDateFormatted: string;
  leasedSale: {
    kind: LeaseKind | null;
    depositManwon: number;
    monthlyRentManwon: number;
    leaseEndDate: string;
    renewal: RenewalRight | null;
    summary: string;
  } | null;
  mortgage: { status: MortgageStatus | null; maxClaimManwon: number; plan: MortgagePlan | null; summary: string };
  dongInput: string;
  hoInput: string;
  hasAircon: boolean;
  airconCount: string;
  hasMidDoor: boolean;
  hasCloset: boolean;
  customOptionMemo: string;
  selectedOptionsSummary: string;
  ownerName: string;
  ownerPhone: string;
  ownerTelecom: string;
}

export interface ResumeRequest {
  step: ResumeStep;
  /** 다시 요청 시트에서 고른 복비 (모달은 이 값으로 계산) */
  feeWon: number;
  /** 이어할 요청서 (함께 넘겨 분석 화면이 저장소 상태와 상관없이 같은 값을 쓰게) */
  draft: SavedRequest;
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown) => v === true;
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const oneOfOrNull = <T extends string>(v: unknown, list: readonly T[]): T | null => (list.includes(v as T) ? (v as T) : null);

/** 저장된 요청서를 검사해 읽는다. 단지 번호·평형·거래 유형이 없으면 이어하기 불가 → null */
export function parseSavedRequest(raw: unknown): SavedRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const aptId = typeof s.aptId === 'number' || typeof s.aptId === 'string' ? String(s.aptId) : '';
  const pyeongName = str(s.pyeongName);
  if (!aptId || !pyeongName || (s.tradeType !== '매매' && s.tradeType !== '전세')) return null;
  const ls = s.leasedSale as Record<string, unknown> | null | undefined;
  const mg = (s.mortgage ?? {}) as Record<string, unknown>;
  return {
    aptId,
    pyeongId: typeof s.pyeongId === 'string' && s.pyeongId ? s.pyeongId : null,
    pyeongName,
    pyeongTypeName: typeof s.pyeongTypeName === 'string' ? s.pyeongTypeName : null,
    tradeType: s.tradeType,
    floorCategory: oneOf(s.floorCategory, ['low', 'mid', 'high'] as const, 'mid'),
    askingPriceTenThousand: num(s.askingPriceTenThousand),
    finalCommissionWon: num(s.finalCommissionWon),
    legalMaxWon: num(s.legalMaxWon),
    occupancy: oneOf(s.occupancy, ['VACANT', 'OWNER', 'TENANT'] as const, 'VACANT'),
    tenantPhone: str(s.tenantPhone),
    isTenantNotifiedChecked: bool(s.isTenantNotifiedChecked),
    visitNoticeMemo: str(s.visitNoticeMemo),
    moveInType: oneOf(s.moveInType, ['IMMEDIATE', 'NEGOTIABLE', 'DATE'] as const, 'IMMEDIATE'),
    moveInDate: str(s.moveInDate),
    moveInDateFormatted: str(s.moveInDateFormatted),
    leasedSale:
      ls && typeof ls === 'object'
        ? {
            kind: oneOfOrNull(ls.kind, ['JEONSE', 'MONTHLY'] as const),
            depositManwon: num(ls.depositManwon),
            monthlyRentManwon: num(ls.monthlyRentManwon),
            leaseEndDate: str(ls.leaseEndDate),
            renewal: oneOfOrNull(ls.renewal, ['USED', 'NOT_USED', 'UNKNOWN'] as const),
            summary: str(ls.summary),
          }
        : null,
    mortgage: {
      status: oneOfOrNull(mg.status, ['NONE', 'EXISTS'] as const),
      maxClaimManwon: num(mg.maxClaimManwon),
      plan: oneOfOrNull(mg.plan, ['REPAY_AT_CLOSING', 'KEEP'] as const),
      summary: str(mg.summary),
    },
    dongInput: str(s.dongInput),
    hoInput: str(s.hoInput),
    hasAircon: bool(s.hasAircon),
    airconCount: str(s.airconCount, '3대'),
    hasMidDoor: bool(s.hasMidDoor),
    hasCloset: bool(s.hasCloset),
    customOptionMemo: str(s.customOptionMemo),
    selectedOptionsSummary: str(s.selectedOptionsSummary),
    ownerName: str(s.ownerName),
    ownerPhone: str(s.ownerPhone),
    ownerTelecom: str(s.ownerTelecom, 'SKT'),
  };
}

export function parseResume(raw: unknown): ResumeRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const step = oneOfOrNull(r.step, ['PRICE_MOVEIN', 'DONG_HO'] as const);
  const feeWon = num(r.feeWon);
  const draft = parseSavedRequest(r.draft);
  return step && feeWon > 0 && draft ? { step, feeWon, draft } : null;
}

/** 분석 화면 평형 목록에서 저장된 평형 찾기 (예전 요청서는 id 없이 이름만 있음) */
export function findSavedPyeong<P extends { id: string; name: string }>(list: P[], d: SavedRequest): P | null {
  if (d.pyeongId) return list.find((p) => p.id === d.pyeongId) ?? null;
  // 평형 이름은 '34평 (전용 85㎡)' 형태. 앞의 '34평'만 저장된 경우도 찾는다
  const head = (name: string) => name.split(' ')[0];
  return list.find((p) => p.name === d.pyeongName) ?? list.find((p) => head(p.name) === head(d.pyeongName)) ?? null;
}

/** 모달의 지금 평형·거래 유형이 저장된 요청서와 같을 때만 저장값을 채운다 (다르면 새 기본값) */
export function draftAppliesTo(d: SavedRequest | null, pyeongName: string, tradeType: string): d is SavedRequest {
  return d !== null && d.pyeongName.split(' ')[0] === pyeongName.split(' ')[0] && d.tradeType === tradeType;
}

/** 요약 시트의 줄: 어떤 항목이 어느 단계에서 바뀌는지 */
export interface DraftRow {
  key: 'PRICE' | 'OCCUPANCY' | 'MOVE_IN' | 'MORTGAGE' | 'OPTIONS';
  value: string;
  step: ResumeStep;
}

export function draftRows(d: SavedRequest, formatPrice: (manwon: number) => string, labels: {
  occupancy: Record<SavedRequest['occupancy'], string>;
  noOptions: string;
}): DraftRow[] {
  const occupancy = d.leasedSale?.summary ? `${labels.occupancy[d.occupancy]} · ${d.leasedSale.summary}` : labels.occupancy[d.occupancy];
  return [
    { key: 'PRICE', value: formatPrice(d.askingPriceTenThousand), step: 'PRICE_MOVEIN' },
    { key: 'OCCUPANCY', value: occupancy, step: 'PRICE_MOVEIN' },
    { key: 'MOVE_IN', value: d.moveInDateFormatted, step: 'PRICE_MOVEIN' },
    { key: 'MORTGAGE', value: d.mortgage.summary, step: 'PRICE_MOVEIN' },
    { key: 'OPTIONS', value: d.selectedOptionsSummary || labels.noOptions, step: 'DONG_HO' },
  ];
}
