/**
 * 지금 나온 매물 호가 (네이버 매물 단위 CSV naver_listings_YYYYMMDD.csv, 대표님 2026-10-27).
 * - 실거래가 아니라 매물에 붙은 가격. 화면 문구는 "실제 거래가가 아니에요"
 * - 층 구간은 실거래와 같은 기준(저층 1~3 · 중층 4~14 · 고층 15 이상, floorBand.ts)
 * - 층 숫자 없이 "고/40"처럼 저·중·고 표기만 있는 매물(약 63%)은 **확실할 때만** 층 구간에 넣는다:
 *   네이버 표기 기준을 확인할 수 없어 표기 범위를 넉넉하게(절반 기준) 잡고, 그 범위 전체가 한 구간 안이면 그 구간, 아니면 "전체"에만
 */
import type { FloorCategory } from '@/components/analysis/types';
import { floorBandOf } from './floorBand';

export type FloorLabel = '저' | '중' | '고';
export type AskingTab = 'ALL' | FloorCategory;
export const ASKING_TABS: AskingTab[] = ['ALL', 'low', 'mid', 'high'];

/** 매매 매물 한 건 (동일매물 묶기 뒤 대표 매물) */
export interface AskingRow {
  /** 수집일 'YYYY-MM-DD' */
  date: string;
  exclusiveM2: number;
  priceManwon: number;
  floorNum: number | null;
  floorLabel: FloorLabel | null;
  floorTotal: number | null;
}

export interface AskingRange {
  minManwon: number;
  maxManwon: number;
  count: number;
  /** 이 범위를 만든 수집일 */
  observedAt: string;
}

export interface AskingMonth {
  /** 'YYYY-MM' */
  ym: string;
  minManwon: number;
  maxManwon: number;
}

/** 'floor_raw' 표기 → 숫자 층 또는 저·중·고 표기 + 동 전체 층수. 읽을 수 없으면 모두 null */
export function parseFloorRaw(raw: string): { floorNum: number | null; floorLabel: FloorLabel | null; floorTotal: number | null } {
  const [head, tail] = String(raw ?? '').trim().split('/');
  const total = Number(tail);
  const floorTotal = Number.isInteger(total) && total > 0 ? total : null;
  if (head === '저' || head === '중' || head === '고') return { floorNum: null, floorLabel: head, floorTotal };
  const n = Number(head);
  return { floorNum: Number.isInteger(n) && n > 0 ? n : null, floorLabel: null, floorTotal };
}

/** 저·중·고 표기가 가리킬 수 있는 층 범위 (넉넉하게: 저 = 아래 절반, 중 = 가운데 절반, 고 = 위 절반) */
export function labelFloorRange(label: FloorLabel, total: number): [number, number] {
  if (label === '저') return [1, Math.ceil(total / 2)];
  if (label === '고') return [Math.floor(total / 2) + 1, total];
  return [Math.floor(total / 4) + 1, Math.ceil((total * 3) / 4)];
}

/** 매물 한 건의 층 구간. 숫자 층이면 그대로, 표기만 있으면 범위 전체가 한 구간일 때만, 아니면 null(전체 탭에만) */
export function listingBand(r: Pick<AskingRow, 'floorNum' | 'floorLabel' | 'floorTotal'>): FloorCategory | null {
  if (r.floorNum !== null) return floorBandOf(r.floorNum);
  if (r.floorLabel === null || r.floorTotal === null) return null;
  const [lo, hi] = labelFloorRange(r.floorLabel, r.floorTotal);
  const band = floorBandOf(lo);
  return floorBandOf(hi) === band ? band : null;
}

const inTab = (r: AskingRow, tab: AskingTab) => tab === 'ALL' || listingBand(r) === tab;

/** 가장 최근 수집일의 이 탭 호가 최저~최고·매물 수. 매물이 없으면 null */
export function askingLatest(rows: AskingRow[], tab: AskingTab): AskingRange | null {
  if (rows.length === 0) return null;
  const latest = rows.reduce((d, r) => (r.date > d ? r.date : d), rows[0].date);
  const prices = rows.filter((r) => r.date === latest && inTab(r, tab)).map((r) => r.priceManwon);
  if (prices.length === 0) return null;
  return { minManwon: Math.min(...prices), maxManwon: Math.max(...prices), count: prices.length, observedAt: latest };
}

/** 달마다 그달 수집한 모든 매물의 호가 최저~최고 (그래프 노랑 띠). 수집한 달만, 오래된 달부터 */
export function askingMonthly(rows: AskingRow[], tab: AskingTab): AskingMonth[] {
  const months = new Map<string, { min: number; max: number }>();
  for (const r of rows) {
    if (!inTab(r, tab)) continue;
    const ym = r.date.slice(0, 7);
    const m = months.get(ym);
    months.set(ym, m ? { min: Math.min(m.min, r.priceManwon), max: Math.max(m.max, r.priceManwon) } : { min: r.priceManwon, max: r.priceManwon });
  }
  return [...months.keys()].sort().map((ym) => ({ ym, minManwon: months.get(ym)!.min, maxManwon: months.get(ym)!.max }));
}
