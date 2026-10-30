/**
 * 관리자 신고 목록 (결정론·순수 함수): 허위 매물 신고(offer.fakeReport) + 복비 "중개사가 더 요구"(FEE_ANSWER OVERCHARGED).
 * 상태: 허위 매물은 공유 저장소의 판정, 복비는 관리자 처리 기록(확인·반려, 연락만 했으면 CONTACTED)
 */
import { dealState, type RequestDeals } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import { actionsFor, type AdminAction, type AdminTargetKind } from './adminLog';

export type ReportStatus = 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'REJECTED';

export interface ReportRow {
  key: string;
  kind: AdminTargetKind;
  requestId: string;
  offerId: string;
  complexName: string;
  officeName: string;
  at: string;
  status: ReportStatus;
  history: AdminAction[];
}

const open = (s: ReportStatus) => s === 'PENDING' || s === 'CONTACTED';

export function reportRows(requests: OwnerRequest[], deals: Record<string, RequestDeals>, log: AdminAction[]): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const r of requests) {
    for (const o of r.offers) {
      if (!o.fakeReport) continue;
      const history = actionsFor(log, 'FAKE_REPORT', r.id, o.id);
      const status: ReportStatus = o.fakeReport.status !== 'PENDING' ? o.fakeReport.status : history.length ? 'CONTACTED' : 'PENDING';
      rows.push({ key: `fake:${r.id}:${o.id}`, kind: 'FAKE_REPORT', requestId: r.id, offerId: o.id, complexName: r.complexName, officeName: o.disclosure.officeName, at: o.fakeReport.at, status, history });
    }
    for (const [offerId, evs] of Object.entries(deals[r.id] ?? {})) {
      if (dealState(evs).feeReason !== 'OVERCHARGED') continue;
      const history = actionsFor(log, 'FEE_OVERCHARGED', r.id, offerId);
      const decided = history.find((a) => a.result !== 'CONTACTED');
      const status: ReportStatus = decided ? (decided.result as 'CONFIRMED' | 'REJECTED') : history.length ? 'CONTACTED' : 'PENDING';
      const officeName = r.offers.find((o) => o.id === offerId)?.disclosure.officeName ?? '';
      const at = evs.find((e) => e.kind === 'FEE_ANSWER')?.at ?? '';
      rows.push({ key: `fee:${r.id}:${offerId}`, kind: 'FEE_OVERCHARGED', requestId: r.id, offerId, complexName: r.complexName, officeName, at, status, history });
    }
  }
  // 처리할 것 먼저, 그 안에서 오래된 것부터 / 처리한 것은 최근 것부터
  return rows.sort((a, b) => Number(open(b.status)) - Number(open(a.status)) || (open(a.status) ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)));
}

export const isOpenReport = (r: ReportRow) => open(r.status);
