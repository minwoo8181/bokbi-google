/**
 * 매칭 모달 요약(`bokbi_active_request_summary`) ↔ 저장소 새 의뢰 (A2', 대표님 2026-10-26).
 * - newRequestInput: 요약 → NewRequestInput (블라인드 칸 / 비밀 칸 분리)
 * - stripSecrets: Supabase 모드에서 휴대폰에 남길 요약 (동·호수·이름·전화·메모 뺌 — 서버에만 암호화 보관)
 * - fillSecrets: 다시 요청 때 서버에서 열람한 값으로 요청서 비밀 칸을 채움
 * 순수 함수 (저장소 접근은 화면에서)
 */
import type { NewRequestInput } from '@/lib/data/repo';
import type { LeasedSaleInput } from '@/lib/market/leasedSale';
import { readRecommendationSnapshot } from './recommendationSnapshot';
import { defaultAvailability } from './showing';
import type { HouseDetails, OwnerContact } from './types';
import type { SavedRequest } from './requestDraft';

/** 휴대폰 요약에 남기지 않는 칸 */
export const SUMMARY_SECRET_KEYS = ['dongInput', 'hoInput', 'ownerName', 'ownerPhone', 'tenantPhone', 'visitNoticeMemo', 'customOptionMemo'] as const;

/** 동·호수 한 줄 ("104 1802호", 동이 하나뿐인 단지는 "1802호") */
export const formatDongHo = (dong: string, ho: string) => `${dong} ${ho}호`.trim();

/** formatDongHo의 반대 (모양이 다르면 동 칸에 통째로) */
export function splitDongHo(dongHo: string): { dongInput: string; hoInput: string } {
  const m = dongHo.trim().match(/^(.*?)\s*(\S+)호$/);
  return m ? { dongInput: m[1], hoInput: m[2] } : { dongInput: dongHo.trim(), hoInput: '' };
}

/** 매칭 모달 저장값 → 집 정보 (정해진 칸만, 자유 메모·채권최고액 제외) */
export function detailsFromSummary(saved: Record<string, unknown>): HouseDetails {
  const moveType = saved.moveInType === 'IMMEDIATE' || saved.moveInType === 'DATE' ? saved.moveInType : 'NEGOTIABLE';
  const m = saved.mortgage as { status?: unknown; plan?: unknown } | undefined;
  const l = saved.leasedSale as Partial<LeasedSaleInput> | null | undefined;
  return {
    moveIn: { type: moveType, date: typeof saved.moveInDate === 'string' ? saved.moveInDate : '' },
    aircon: saved.hasAircon === true ? (typeof saved.airconCount === 'string' ? saved.airconCount : '') : null,
    midDoor: saved.hasMidDoor === true,
    closet: saved.hasCloset === true,
    mortgage:
      m?.status === 'EXISTS' || m?.status === 'NONE'
        ? { status: m.status, plan: m.plan === 'REPAY_AT_CLOSING' || m.plan === 'KEEP' ? m.plan : null }
        : null,
    lease:
      l && typeof l.depositManwon === 'number' && l.depositManwon > 0
        ? {
            kind: l.kind === 'MONTHLY' ? 'MONTHLY' : 'JEONSE',
            depositManwon: l.depositManwon,
            monthlyRentManwon: typeof l.monthlyRentManwon === 'number' ? l.monthlyRentManwon : 0,
            leaseEndDate: typeof l.leaseEndDate === 'string' ? l.leaseEndDate : '',
            renewal: l.renewal === 'USED' || l.renewal === 'NOT_USED' || l.renewal === 'UNKNOWN' ? l.renewal : null,
          }
        : null,
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** 요약 → 새 의뢰. 단지 이름·거래 유형이 없으면 null */
export function newRequestInput(saved: Record<string, unknown>, termsVersion: string): NewRequestInput | null {
  if (!str(saved.aptName) || (saved.tradeType !== '매매' && saved.tradeType !== '전세')) return null;
  const pyeong = str(saved.pyeongName).split(' ')[0];
  const type = str(saved.pyeongTypeName);
  const area = typeof saved.pyeongExclusiveArea === 'number' ? ` · 전용 ${Math.round(saved.pyeongExclusiveArea)}㎡` : '';
  const occ = saved.occupancy;
  const recommendation = readRecommendationSnapshot(saved.recommendation);
  return {
    blind: {
      aptId: typeof saved.aptId === 'string' || typeof saved.aptId === 'number' ? String(saved.aptId) : null,
      complexName: str(saved.aptName),
      tradeType: saved.tradeType,
      pyeongLabel: `${pyeong}${type ? ` ${type}` : ''}${area}`,
      floorLabel: str(saved.floorLabel),
      maskedDongHo: `${str(saved.maskedDong)} ${str(saved.maskedHo) || '***호'}`.trim(),
      askingPriceManwon: num(saved.askingPriceTenThousand),
      commissionWon: num(saved.finalCommissionWon),
      legalMaxWon: num(saved.legalMaxWon),
      occupancy: occ === 'VACANT' || occ === 'TENANT' ? occ : 'OWNER',
      details: detailsFromSummary(saved),
      showing: defaultAvailability(),
      // 의뢰 시점 추천 기준 버전·추천·실제 할인 (로직 기록장)
      ...(recommendation ? { recommendation: { ...recommendation } } : {}),
    },
    secret: {
      dongHo: formatDongHo(str(saved.dongInput), str(saved.hoInput)),
      ownerName: str(saved.ownerName),
      tenantPhone: str(saved.tenantPhone),
      visitMemo: str(saved.visitNoticeMemo),
      optionMemo: str(saved.customOptionMemo),
    },
    termsVersion,
  };
}

/** 요약에서 비밀 칸을 뺀다. 옵션 요약 끝에 붙은 자유 메모도 뺌 */
export function stripSecrets(saved: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...saved };
  for (const k of SUMMARY_SECRET_KEYS) delete out[k];
  const memo = str(saved.customOptionMemo).trim();
  const opts = str(saved.selectedOptionsSummary);
  if (memo && opts.endsWith(memo)) out.selectedOptionsSummary = opts.slice(0, opts.length - memo.length).replace(/,\s*$/, '');
  return out;
}

/** 다시 요청: 열람한 동·호수·연락처로 요청서 비밀 칸을 채운다 (요청서에 이미 있으면 그대로 — local 모드) */
export function fillSecrets(d: SavedRequest, revealed: { dongHo: string; contact: OwnerContact | null }): SavedRequest {
  if (d.dongInput || d.hoInput) return d;
  const c = revealed.contact;
  const memo = c?.optionMemo ?? '';
  return {
    ...d,
    ...splitDongHo(revealed.dongHo),
    ownerName: c?.ownerName ?? '',
    ownerPhone: c?.ownerPhone || d.ownerPhone,
    tenantPhone: c?.tenantPhone ?? '',
    visitNoticeMemo: c?.visitMemo ?? '',
    customOptionMemo: memo,
    selectedOptionsSummary: memo ? [d.selectedOptionsSummary, memo].filter(Boolean).join(', ') : d.selectedOptionsSummary,
  };
}
