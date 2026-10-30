/**
 * 관리자 웹 푸시: 무엇을 언제 보낼지 (대표님 2026-10-29 "관리자 알림" 시안). 순수 함수 — 보내기·예약은 밖에서.
 * - 아침 요약: 한국 9시 이후 하루 한 번 (오늘 할 일 n건, 기한 지남 m, 어제 새 의뢰·매칭)
 * - 기한 지남: 생기는 대로 바로, 같은 일은 하루 한 번
 * - 서비스 확인: 키 없음·데이터 7일 지남을 하루 한 번 묶어서 (새 매물 파일 반영 전은 매주 있는 일이라 안 보냄)
 * - 새 가입 신청: 신청마다 한 번 (기본 꺼짐)
 * 밤 10시~아침 8시엔 긴급(기한 지남)만. 나머지는 미뤘다가 8시 뒤 다음 확인 때 보낸다
 */
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';
import type { OwnerRequest } from '@/lib/requests/types';
import type { ServiceIssue } from './overview';
import type { TodayItem, TodayKind } from './today';

export type PushKind = 'MORNING' | 'OVERDUE' | 'SERVICE' | 'SIGNUP';
export const PUSH_KINDS: PushKind[] = ['MORNING', 'OVERDUE', 'SERVICE', 'SIGNUP'];
export type PushPrefs = Record<PushKind, boolean>;
export const DEFAULT_PUSH_PREFS: PushPrefs = { MORNING: true, OVERDUE: true, SERVICE: true, SIGNUP: false };

export const MORNING_HOUR = 9;
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;

export interface PushMessage {
  kind: PushKind;
  /** 하루 한 번 판단용 (보낸 기록에 "날짜:key"로 남음) */
  key: string;
  title: string;
  body: string;
  /** 알림을 누르면 열 화면 */
  url: string;
}

export interface PushInput {
  now: Date;
  prefs: PushPrefs;
  items: TodayItem[];
  issues: ServiceIssue[];
  /** 확인 대기 가입 신청 */
  signups: { regNo: string; office: string }[];
  yesterday: { requests: number; matched: number };
  /** 이미 보낸 것 ("YYYY-MM-DD:key", 한국 날짜) */
  sent: string[];
}

const t = SITE_CONTENT.adminConsole.push;
const KST = 9 * 3_600_000;

export function kstParts(now: Date): { date: string; hour: number } {
  const k = new Date(now.getTime() + KST);
  return { date: k.toISOString().slice(0, 10), hour: k.getUTCHours() };
}

export function isQuietHour(hour: number): boolean {
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** 할 일 종류 → 알림을 누르면 열 탭 (콘솔의 onOpen과 같은 곳) */
const TAB_FOR: Record<TodayKind, string> = {
  SIGNUP: 'brokers',
  FAKE_REPORT: 'requests',
  FEE_OVERCHARGED: 'requests',
  INQUIRY: 'requests',
  WITHDRAW: 'today',
  REMOVE_AD_LATE: 'requests',
  NO_OFFERS: 'requests',
};

function issueText(i: ServiceIssue): string {
  const issue = SITE_CONTENT.adminConsole.today.issue;
  const name = i.kind === 'KEY_MISSING' ? SITE_CONTENT.adminConsole.system.keys[i.id] : SITE_CONTENT.adminConsole.system.sources[i.id];
  if (i.kind === 'KEY_MISSING') return fill(issue.KEY_MISSING, { name });
  if (i.kind === 'DATA_STALE') return i.days === null ? fill(issue.DATA_STALE_NONE, { name }) : fill(issue.DATA_STALE, { name, days: i.days });
  return fill(issue.DATA_PENDING, { name });
}

/** 지금 보낼 알림 + 갱신된 보낸 기록(오늘 것만 남김) */
export function planPushes(i: PushInput): { messages: PushMessage[]; sent: string[] } {
  const { date, hour } = kstParts(i.now);
  const sent = new Set(i.sent.filter((s) => s.startsWith(`${date}:`)));
  const quiet = isQuietHour(hour);
  const messages: PushMessage[] = [];
  const add = (m: PushMessage, urgent: boolean) => {
    if (!i.prefs[m.kind] || (quiet && !urgent)) return;
    const mark = `${date}:${m.key}`;
    if (sent.has(mark)) return;
    sent.add(mark);
    messages.push(m);
  };

  for (const item of i.items.filter((x) => x.overdue)) {
    add(
      {
        kind: 'OVERDUE',
        key: `OVERDUE:${item.key}`,
        title: fill(t.overdueTitle, { kind: SITE_CONTENT.adminConsole.today.kinds[item.kind] }),
        body: fill(t.overdueBody, { title: item.title }),
        url: `/admin?tab=${TAB_FOR[item.kind]}`,
      },
      true,
    );
  }

  if (hour >= MORNING_HOUR) {
    const overdue = i.items.filter((x) => x.overdue).length;
    add(
      {
        kind: 'MORNING',
        key: 'MORNING',
        title: fill(overdue ? t.morningTitleOverdue : t.morningTitle, { n: i.items.length, m: overdue }),
        body: fill(t.morningBody, i.yesterday),
        url: '/admin',
      },
      false,
    );
  }

  const issues = i.issues.filter((x) => x.kind !== 'DATA_PENDING');
  if (issues.length) {
    add({ kind: 'SERVICE', key: 'SERVICE', title: fill(t.serviceTitle, { n: issues.length }), body: issues.map(issueText).join(' · '), url: '/admin?tab=system' }, false);
  }

  for (const s of i.signups) {
    add({ kind: 'SIGNUP', key: `SIGNUP:${s.regNo}`, title: t.signupTitle, body: fill(t.signupBody, { office: s.office }), url: '/admin?tab=brokers' }, false);
  }

  return { messages, sent: [...sent] };
}

/** 어제(한국 날짜) 새 의뢰·매칭 수 */
export function yesterdayCounts(requests: OwnerRequest[], now: Date): { requests: number; matched: number } {
  const day = kstParts(new Date(now.getTime() - 24 * 3_600_000)).date;
  const on = (iso: string | null) => !!iso && kstParts(new Date(iso)).date === day;
  return { requests: requests.filter((r) => on(r.createdAt)).length, matched: requests.filter((r) => on(r.matchedAt)).length };
}
