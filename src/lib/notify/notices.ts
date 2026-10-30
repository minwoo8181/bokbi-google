/**
 * 알림 문자 규칙 (B2, 대표님 2026-10-29 "핵심 6개", 결정론·순수 함수).
 * - 일이 생길 때 (서버 액션 뒤): 첫 요청 도착 → 집주인, 매칭 확정 → 고른 중개사, 가입 승인·반려 → 신청자, 허위 매물 판정 → 신고한 중개사
 * - 시간이 될 때 (15분마다, 관리자 웹 푸시와 같은 예약 작업): 요청 받는 시간 끝 → 집주인(요청 1곳 이상), 광고 기한 6시간 전 → 아직 안 올린 중개사
 * 시간 알림은 "이번 15분 사이에 그 시각을 지났는지"로 한 번만 보낸다 (보낸 기록 표 없이). 예약 작업이 한 번 빠지면 그 알림은 건너뜀
 * 문구는 SITE_CONTENT.notify (동·호수·이름·전화 없음)
 */
import { SITE_CONTENT } from '@/config/siteContent';
import { reportHoldMs } from '@/lib/broker/fakeReport';
import { AD_DEADLINE_HOURS, RECEIVING_HOURS } from '@/lib/requests/stage';
import type { OwnerRequest } from '@/lib/requests/types';

export type NoticeKind = keyof typeof SITE_CONTENT.notify;

/** 받는 사람: 의뢰의 집주인 / 요청 카드의 중개사 / 가입 신청한 사무소의 중개사 */
export type NoticeTarget = { owner: string } | { broker: string } | { office: string };

export interface Notice {
  kind: NoticeKind;
  target: NoticeTarget;
  vars: Record<string, string | number>;
}

const H = 3_600_000;
/** 예약 작업 간격 (관리자 웹 푸시와 같음) */
export const TICK_MS = 15 * 60_000;
/** 광고 기한 알림: 기한 몇 시간 전 */
export const AD_SOON_HOURS = 6;

export function noticeText(n: Pick<Notice, 'kind' | 'vars'>): string {
  return SITE_CONTENT.notify[n.kind].replace(/\{(\w+)\}/g, (m, k: string) => (k in n.vars ? String(n.vars[k]) : m));
}

/** "다산자이아이비플레이스 34평 매매" — 평형 칸의 첫 부분만 */
export const complexLabel = (r: Pick<OwnerRequest, 'complexName' | 'pyeongLabel' | 'tradeType'>) =>
  `${r.complexName} ${r.pyeongLabel.split(' · ')[0]} ${r.tradeType}`;

/** at 시각이 (now - tick, now] 안에 있으면 이번 예약 작업에서 보낼 차례 */
export const crossedNow = (atMs: number, now: number, tickMs = TICK_MS) => atMs <= now && atMs > now - tickMs;

/** 광고 올리기 기한 (화면 adState와 같은 계산: 매칭 시각 + 허위 매물 확인으로 멈춘 시간 + 48시간) */
export function adDeadlineMs(r: Pick<OwnerRequest, 'adWindowStartedAt'>, o: OwnerRequest['offers'][number], now: number): number | null {
  if (!r.adWindowStartedAt) return null;
  const start = Date.parse(r.adWindowStartedAt);
  return start + reportHoldMs(o.fakeReport, start, now) + AD_DEADLINE_HOURS * H;
}

/** 15분마다: 시간이 된 알림 */
export function tickNotices(requests: readonly OwnerRequest[], now: Date, tickMs = TICK_MS): Notice[] {
  const t = now.getTime();
  const out: Notice[] = [];
  for (const r of requests) {
    if (r.endedReason) continue;
    const complex = complexLabel(r);
    if (r.matchedOfferIds.length === 0 && r.offers.length > 0 && crossedNow(Date.parse(r.createdAt) + RECEIVING_HOURS * H, t, tickMs))
      out.push({ kind: 'RECEIVING_ENDED', target: { owner: r.id }, vars: { complex, n: r.offers.length } });
    if (r.paused) continue;
    for (const o of r.offers) {
      const live = r.matchedOfferIds.includes(o.id) && !(r.releasedOfferIds ?? []).includes(o.id);
      if (!live || o.ad || o.fakeReport?.status === 'PENDING') continue;
      const due = adDeadlineMs(r, o, t);
      if (due !== null && crossedNow(due - AD_SOON_HOURS * H, t, tickMs)) out.push({ kind: 'AD_DEADLINE_SOON', target: { broker: o.id }, vars: { complex } });
    }
  }
  return out;
}
