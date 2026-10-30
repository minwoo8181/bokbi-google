/**
 * 내 의뢰 "지금 확인할 일" 섹션 (대표님 2026-10-27): 집주인이 할 일·다가오는 방문만 모아 급한 순으로.
 * 빨강 NOW = 집주인이 답해야 넘어가는 일(색 띠 ACTION: 보고 확인·복비 답·후기·캘린더 저장 등) + 24시간 안 방문
 * 노랑 SOON = 그보다 먼 방문 + 계약일·잔금일이 다가옴(색 띠 CONTRACT_DAY·BALANCE_DAY)
 * 중개사 쪽 기한(광고 48시간 등)은 집주인 할 일이 아니라 카드에만 둔다. 새 규칙 없음 — cardStrip 결과와 방문 기록만 쓴다
 */
import { VISIT_SOON_HOURS, type CardStrip } from './deal';
import { kstVisitMs } from '@/lib/broker/listing';
import { kstNow, upcomingVisits, type VisitBooking } from '@/lib/requests/showing';

export type TodoLevel = 'NOW' | 'SOON';

export interface OwnerTodoItem {
  offerId: string;
  level: TodoLevel;
  /** 띠 문구를 그대로 쓰려고 CardStrip 모양 (방문은 VISIT_SOON / VISIT_ON) */
  strip: CardStrip;
}

const HOUR_MS = 3_600_000;
const SOON_KEYS = new Set<CardStrip['key']>(['CONTRACT_DAY', 'BALANCE_DAY']);

/**
 * 현황판 방문 칩 (2026-10-27): 다가오는 방문 수 + 가장 가까운 방문. 24시간 안이면 soon(노랑), 아니면 회색.
 * 기준은 "곧 확인할 일"의 빨강 방문과 같은 VISIT_SOON_HOURS. 지난 시각은 빼고, 없으면 null
 */
export function heroVisit(visits: VisitBooking[], now: Date): { n: number; date: string; hour: number; soon: boolean } | null {
  const ahead = upcomingVisits(visits, kstNow(now).date).filter((v) => kstVisitMs(v.date, v.hour) >= now.getTime());
  if (ahead.length === 0) return null;
  const next = ahead[0];
  return { n: ahead.length, date: next.date, hour: next.hour, soon: kstVisitMs(next.date, next.hour) - now.getTime() <= VISIT_SOON_HOURS * HOUR_MS };
}

export function ownerTodoItems(
  rows: { offerId: string; strip: CardStrip }[],
  visits: VisitBooking[],
  now: Date,
  /** 바뀐 희망가를 아직 알리지 않은 곳 (priceChange.pendingPriceNotices) → 빨강. price = 화면 표기 금액 */
  priceNotices: { offerId: string; price: string }[] = [],
): OwnerTodoItem[] {
  const out: OwnerTodoItem[] = [];
  const offerIds = new Set(rows.map((r) => r.offerId));
  for (const n of priceNotices) {
    if (offerIds.has(n.offerId)) out.push({ offerId: n.offerId, level: 'NOW', strip: { tone: 'ACTION', key: 'PRICE_NOTIFY', vars: { price: n.price } } });
  }
  for (const { offerId, strip } of rows) {
    if (strip.tone === 'ACTION') out.push({ offerId, level: 'NOW', strip });
    else if (SOON_KEYS.has(strip.key)) out.push({ offerId, level: 'SOON', strip });
  }
  // 방문: 매칭된 중개사 것만, 아직 지나지 않은 것 (띠에 가려져도 따로 한 줄)
  for (const v of upcomingVisits(visits, kstNow(now).date)) {
    if (!offerIds.has(v.offerId)) continue;
    const ms = kstVisitMs(v.date, v.hour);
    if (ms < now.getTime()) continue;
    const h = Math.ceil((ms - now.getTime()) / HOUR_MS);
    const soon = h <= VISIT_SOON_HOURS;
    out.push({
      offerId: v.offerId,
      level: soon ? 'NOW' : 'SOON',
      strip: { tone: soon ? 'CAUTION' : 'GOOD', key: soon ? 'VISIT_SOON' : 'VISIT_ON', vars: { date: v.date, hour: v.hour, h } },
    });
  }
  // 빨강 먼저, 같은 색 안에서는 들어온 순서(띠 = 목록 순서, 방문 = 시간 순)
  return out.map((x, i) => ({ x, i })).sort((a, b) => (a.x.level === b.x.level ? a.i - b.i : a.x.level === 'NOW' ? -1 : 1)).map(({ x }) => x);
}
