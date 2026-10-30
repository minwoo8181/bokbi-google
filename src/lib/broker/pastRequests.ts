/**
 * 보낸 요청을 어디에 보일지 (대표님 2026-10-27): 내 매물에는 진행 중·결과 기다리는 요청만, 끝난 요청은 내 사무소 "지난 요청".
 * 지난 요청은 보낸 날부터 30일 동안만 화면에 보인다 (기록은 지우지 않음 — 크레딧 내역이 어느 의뢰였는지 쓴다).
 * 새 규칙 없음 — sentStatus·cardStrip 결과만 나눈다
 */
import type { SentStatus } from './feed';
import type { StripTone } from '@/lib/deal/deal';

export const PAST_VISIBLE_DAYS = 30;
const DAY_MS = 86_400_000;

export type ListingBucket = 'PROGRESS' | 'WAITING' | 'PAST' | 'HIDDEN';

/**
 * PROGRESS = 선택됨, 또는 아직 할 일이 남은 거래(끝남 아닌 색 띠: 광고 내림 등)
 * WAITING = 집주인이 고르는 중
 * PAST = 끝남(선택 안 됨·마감·허위 매물 멈춤·해제)이고 보낸 지 30일 이내 / HIDDEN = 30일 지남
 */
export function listingBucket(status: SentStatus, stripTone: StripTone | null, sentAt: string, now: number): ListingBucket {
  if (status === 'SELECTED') return 'PROGRESS';
  if (stripTone && stripTone !== 'DONE') return 'PROGRESS';
  if (status === 'WAITING') return 'WAITING';
  return now - Date.parse(sentAt) <= PAST_VISIBLE_DAYS * DAY_MS ? 'PAST' : 'HIDDEN';
}
