/**
 * 홈 숫자 카드 = 상황별 전광판 (결정론·순수 함수, 대표님 확정 2026-10-26)
 * - 1단계 (매칭 0건): 분석 사실 숫자 — 단지·실거래·매물, LIVE 없음
 * - 2단계 (매칭 1건부터): 매칭될 때마다 바로 — 한 집 평균(큰 숫자) + 현재까지 총합(아래 줄), ● LIVE
 * - 왼쪽 칸 "복비 계산 n회": 분석 화면 조회 수 (집주인 수가 아니므로 "회"). 너무 작으면 칸을 숨김
 * - 오른쪽 칸: 다산동 중개사무소 등록 명단 수 (초반 작은 숫자가 불안해 보이지 않게 — 함께하는 사무소 수는 쓰지 않음)
 * - 집 수는 숨김 (초반엔 작아 보임). 3단계(매칭 많아진 뒤) 문구는 그때 다시 정함
 */
import { formatPriceTenThousand } from '@/lib/utils';

/** 데이터 파일에서 오는 사실 숫자 */
export interface HomeFacts {
  complexes: number;
  trades: number;
  listings: number;
  offices: number;
}

/** 실시간 집계 (Supabase public_stats). 연결 전이면 매칭 0건·조회 수 모름 */
export interface LiveStats {
  matchCount: number;
  /** 매칭된 의뢰마다 (법정 상한 − 합의 복비)를 더한 원 단위 */
  feeGapTotalWon: number;
  /** 분석 화면 조회 수 (관리자·테스트·봇 제외). 모르면 null */
  calcCount: number | null;
}

export const EMPTY_LIVE: LiveStats = { matchCount: 0, feeGapTotalWon: 0, calcCount: null };

/** 조회 수가 이보다 작으면 왼쪽 칸을 숨긴다 (오픈 직후 "3회" 같은 숫자가 보이지 않게, 정책값) */
export const MIN_CALC_SHOWN = 10;

export interface StatsCopy {
  facts: { title: string; big: string; sub: string };
  live: { title: string; big: string; sub: string; badge: string };
  calcLabel: string;
  calcValue: string;
  officesLabel: string;
  officesValue: string;
  officesNote: string;
}

export interface HomeStatsView {
  stage: 'FACTS' | 'LIVE';
  /** ● LIVE 표시 (실제 실적일 때만) */
  badge: string | null;
  title: string;
  big: string;
  sub: string;
  left: { label: string; value: string } | null;
  right: { label: string; value: string; note: string };
}

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
const num = (n: number) => Math.round(n).toLocaleString('ko-KR');
/** 원 → "153만 원" (만 원 아래는 버림: 실제보다 크게 보이지 않게) */
const manwon = (won: number) => formatPriceTenThousand(Math.floor(Math.max(0, won) / 10_000));

export function homeStatsView(facts: HomeFacts, live: LiveStats, copy: StatsCopy): HomeStatsView {
  const left = live.calcCount !== null && live.calcCount >= MIN_CALC_SHOWN ? { label: copy.calcLabel, value: fill(copy.calcValue, { n: num(live.calcCount) }) } : null;
  const right = { label: copy.officesLabel, value: fill(copy.officesValue, { n: num(facts.offices) }), note: copy.officesNote };
  // 법정 상한보다 낮게 정한 금액이 있어야 실적 단계 (0원 평균은 보여 주지 않음)
  if (live.matchCount > 0 && live.feeGapTotalWon > 0) {
    return {
      stage: 'LIVE',
      badge: copy.live.badge,
      title: copy.live.title,
      big: fill(copy.live.big, { average: manwon(live.feeGapTotalWon / live.matchCount) }),
      sub: fill(copy.live.sub, { total: manwon(live.feeGapTotalWon) }),
      left,
      right,
    };
  }
  return {
    stage: 'FACTS',
    badge: null,
    title: copy.facts.title,
    big: fill(copy.facts.big, { complexes: num(facts.complexes), trades: num(facts.trades) }),
    sub: fill(copy.facts.sub, { listings: num(facts.listings) }),
    left,
    right,
  };
}

/** 공개 집계 응답 → LiveStats (모양이 틀리면 매칭 0건으로 = 1단계 사실 숫자) */
export function parseLiveStats(v: unknown): LiveStats {
  if (!v || typeof v !== 'object') return EMPTY_LIVE;
  const o = v as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
  return {
    matchCount: n(o.matchCount) ?? 0,
    feeGapTotalWon: n(o.feeGapTotalWon) ?? 0,
    calcCount: n(o.calcCount),
  };
}
