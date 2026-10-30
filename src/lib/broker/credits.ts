/**
 * 중개사 크레딧 (결정론, 순수 함수). 설계: docs/handover/phase5-broker-matching.md §3-2·3
 * - 요청을 보낼 때 1개 차감, 선택받지 못해도 돌려주지 않는다. 허위 매물 신고로 의뢰가 멈추면 돌려준다
 * - MVP는 결제 없음: 매주 월요일(한국 시간) 3개까지 채워진다 (남은 개수에 더하지 않고 3개로 맞춤)
 * - "크레딧 더 받기"는 페이크 도어: 누르면 한 문항 투표만 받고 크레딧은 주지 않는다 (수요 측정)
 */

export const WEEKLY_CREDITS = 3;

export type CreditEventKind = 'WEEKLY' | 'SPEND' | 'REFUND';

export interface CreditEvent {
  kind: CreditEventKind;
  /** 지급·환불은 +, 사용은 - */
  amount: number;
  at: string;
  /** 사용·환불한 의뢰 */
  requestId: string | null;
  /** 돌려받은 이유: 허위 매물 확인 / 거래 완료(후기 등록). 예전 기록엔 없을 수 있음 */
  reason?: 'FAKE' | 'DEAL';
}

export interface CreditWallet {
  balance: number;
  /** 마지막으로 채운 주의 월요일 (한국 날짜 YYYY-MM-DD) */
  refilledWeek: string | null;
  events: CreditEvent[];
}

export const EMPTY_WALLET: CreditWallet = { balance: 0, refilledWeek: null, events: [] };

const KST_OFFSET = 9 * 3_600_000;

/** 한국 날짜 YYYY-MM-DD */
export function kstDateKey(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** 그 주 월요일 (한국 날짜) */
export function kstWeekKey(now: Date): string {
  const k = new Date(now.getTime() + KST_OFFSET);
  const back = (k.getUTCDay() + 6) % 7; // 월=0 … 일=6
  return new Date(k.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/** 다음 채움 시각 안내용: 다음 주 월요일 (한국 날짜) */
export function nextRefillDate(now: Date): string {
  const monday = new Date(`${kstWeekKey(now)}T00:00:00Z`);
  return new Date(monday.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
}

/** 새 주가 되었으면 3개까지 채운다. 이미 3개 이상이면 기록만 바꾸지 않고 그대로 */
export function refillWeekly(w: CreditWallet, now: Date): CreditWallet {
  const week = kstWeekKey(now);
  if (w.refilledWeek === week) return w;
  const add = Math.max(0, WEEKLY_CREDITS - w.balance);
  return {
    balance: w.balance + add,
    refilledWeek: week,
    events: add > 0 ? [...w.events, { kind: 'WEEKLY', amount: add, at: now.toISOString(), requestId: null }] : w.events,
  };
}

export function spendCredit(w: CreditWallet, requestId: string, now: Date): { ok: true; wallet: CreditWallet } | { ok: false; error: 'NO_CREDIT' } {
  if (w.balance < 1) return { ok: false, error: 'NO_CREDIT' };
  return {
    ok: true,
    wallet: { ...w, balance: w.balance - 1, events: [...w.events, { kind: 'SPEND', amount: -1, at: now.toISOString(), requestId }] },
  };
}

/** 같은 의뢰로 쓴 크레딧이 있고 아직 돌려주지 않았을 때만 1개 돌려준다 (한 의뢰에 1번, 이유와 상관없이) */
export function refundCredit(w: CreditWallet, requestId: string, now: Date, reason: 'FAKE' | 'DEAL' = 'FAKE'): CreditWallet {
  const spent = w.events.some((e) => e.kind === 'SPEND' && e.requestId === requestId);
  const refunded = w.events.some((e) => e.kind === 'REFUND' && e.requestId === requestId);
  if (!spent || refunded) return w;
  return { ...w, balance: w.balance + 1, events: [...w.events, { kind: 'REFUND', amount: 1, at: now.toISOString(), requestId, reason }] };
}

/**
 * 거래 완료로 크레딧 1개 돌려받기 (그릴링 2026-10-25): 복비 통해 계약 → 집주인 잔금 확인 → 후기 등록이면 자동.
 * 버튼 없음. 크레딧 결정 변경: 예전 "약속 지키면 +1은 안 함" → "후기가 등록되면 쓴 1개를 돌려받음"
 */
export function returnDealCredit(w: CreditWallet, requestId: string, now: Date): CreditWallet {
  return refundCredit(w, requestId, now, 'DEAL');
}

// ── 크레딧 더 받기 (페이크 도어 + 한 문항 투표) ──────────────────

export type MoreCreditsAnswer = 'WATCH_AD' | 'REFER_OFFICE' | 'ENOUGH';
export const MORE_CREDITS_ANSWERS: MoreCreditsAnswer[] = ['WATCH_AD', 'REFER_OFFICE', 'ENOUGH'];

export interface MoreCreditsTap {
  at: string;
  /** 누를 때 남아 있던 크레딧 (0일 때 누른 비율이 수요 신호) */
  balance: number;
  /** 어느 화면에서 눌렀는지 */
  from: 'FEED_EMPTY' | 'OFFICE' | 'CREDIT_SHEET';
  answer: MoreCreditsAnswer | null;
}

export function recordMoreCreditsTap(taps: MoreCreditsTap[], tap: Omit<MoreCreditsTap, 'answer'>): MoreCreditsTap[] {
  return [...taps, { ...tap, answer: null }];
}

/** 마지막으로 누른 기록에 답을 붙인다 (투표 창은 누를 때마다 뜬다) */
export function answerMoreCredits(taps: MoreCreditsTap[], answer: MoreCreditsAnswer): MoreCreditsTap[] {
  if (taps.length === 0) return taps;
  const last = taps[taps.length - 1];
  return [...taps.slice(0, -1), { ...last, answer }];
}
