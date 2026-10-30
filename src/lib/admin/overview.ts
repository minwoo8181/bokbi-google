/**
 * 관리자 "지금 현황"·지표 (결정론·순수 함수, 대표님 2026-10-29 A안 + PC 대시보드 v2).
 * 저장소에 있는 의뢰·가입 기록으로 셀 수 있는 것만 센다. 방문자·검색·전환율처럼 행동 기록이 있어야 하는 값은 여기서 만들지 않는다 (화면은 "—")
 */
import { effectiveStage } from '@/lib/requests/stage';
import type { OwnerRequest } from '@/lib/requests/types';
import type { FreshnessRow, SourceId } from './dataFreshness';
import type { KeyId, KeyStatus } from './keys';

export interface NowOverview {
  /** 매칭 기다리는 의뢰 (받는 중) */
  waiting: number;
  /** 매칭 뒤 계약 전 거래 */
  inDeal: number;
  /** 계약까지 간 의뢰 */
  contracted: number;
}

export function nowOverview(requests: OwnerRequest[], now: Date): NowOverview {
  const out: NowOverview = { waiting: 0, inDeal: 0, contracted: 0 };
  for (const r of requests) {
    const s = effectiveStage(r, now.getTime()).stage;
    if (s === 'RECEIVING') out.waiting += 1;
    else if (s === 'IN_PROGRESS') out.inDeal += 1;
    else if (s === 'CONTRACTED') out.contracted += 1;
  }
  return out;
}

/** 의뢰를 단지별로 묶는 키: 단지 id가 있으면 id, 없으면 이름 */
const complexKey = (r: OwnerRequest) => r.aptId ?? `name:${r.complexName}`;

/** 매칭까지 간 의뢰: 고른 중개사가 있거나 진행·계약 단계 */
export const isMatched = (r: OwnerRequest) => r.matchedOfferIds.length > 0 || r.stage === 'IN_PROGRESS' || r.stage === 'CONTRACTED';

export interface Penetration {
  joinedOffices: number;
  totalOffices: number;
  /** 0~1, 전체가 0이면 null */
  officeRate: number | null;
  complexesWithRequests: number;
  totalComplexes: number;
  complexRate: number | null;
}

/** 다산동에 얼마나 퍼졌나: 가입 중개사 / 다산동 사무소, 의뢰가 들어온 단지 / 다산동 단지 */
export function penetration(input: { joinedOffices: number; totalOffices: number; requests: OwnerRequest[]; totalComplexes: number }): Penetration {
  const complexes = new Set(input.requests.map(complexKey)).size;
  const rate = (a: number, b: number) => (b > 0 ? Math.min(1, a / b) : null);
  return {
    joinedOffices: input.joinedOffices,
    totalOffices: input.totalOffices,
    officeRate: rate(input.joinedOffices, input.totalOffices),
    complexesWithRequests: complexes,
    totalComplexes: input.totalComplexes,
    complexRate: rate(complexes, input.totalComplexes),
  };
}

export interface ComplexRank {
  name: string;
  requests: number;
  matched: number;
  /** 의뢰 중 매칭 비율 (0~1) */
  matchRate: number;
}

/** 단지 순위: 의뢰 많은 순(by 'requests') 또는 매칭 많은 순(by 'matched'). 같으면 다른 값 → 이름 순. 0건 단지는 빠짐 */
export function complexRanking(requests: OwnerRequest[], by: 'requests' | 'matched', limit = 5): ComplexRank[] {
  const m = new Map<string, ComplexRank>();
  for (const r of requests) {
    const k = complexKey(r);
    const row = m.get(k) ?? { name: r.complexName, requests: 0, matched: 0, matchRate: 0 };
    row.requests += 1;
    if (isMatched(r)) row.matched += 1;
    m.set(k, row);
  }
  const rows = [...m.values()].map((r) => ({ ...r, matchRate: r.matched / r.requests }));
  const other = by === 'requests' ? 'matched' : 'requests';
  return rows
    .filter((r) => r[by] > 0)
    .sort((a, b) => b[by] - a[by] || b[other] - a[other] || a.name.localeCompare(b.name, 'ko'))
    .slice(0, limit);
}

/** 의뢰 찾기: 단지 이름·의뢰번호에 찾는 말이 들어 있나 (띄어쓰기·대소문자 무시, 빈 말이면 모두) */
export function matchesQuery(r: Pick<OwnerRequest, 'complexName' | 'id'>, q: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const k = norm(q);
  return !k || norm(r.complexName).includes(k) || norm(r.id).includes(k);
}

export type ServiceIssue = { kind: 'KEY_MISSING'; id: KeyId } | { kind: 'DATA_STALE'; id: SourceId; days: number | null } | { kind: 'DATA_PENDING'; id: SourceId };

/** 서비스 상태: 문제 있는 것만 (키 없음 → 데이터 7일 지남 → 새 매물 파일 반영 전) */
export function serviceIssues(keys: KeyStatus[], freshness: FreshnessRow[]): ServiceIssue[] {
  return [
    ...keys.filter((k) => !k.set).map((k): ServiceIssue => ({ kind: 'KEY_MISSING', id: k.id })),
    ...freshness.filter((f) => f.stale).map((f): ServiceIssue => ({ kind: 'DATA_STALE', id: f.id, days: f.days })),
    ...freshness.filter((f) => !f.stale && f.pending).map((f): ServiceIssue => ({ kind: 'DATA_PENDING', id: f.id })),
  ];
}
