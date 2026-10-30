/**
 * 데이터 갱신 날짜 (결정론·순수 함수). 서버가 data/market 폴더의 "파일 이름"만 읽어 넘긴다 (내용은 읽지 않음).
 * - 화면 반영 기준일: src/data/market/dasan-market.json meta.observedAt (npm run data:build 때 정해짐)
 * - 매물(네이버): naver_complexes_YYYYMMDD.csv 중 최신. 기준일보다 새 파일이 있으면 "반영 전" (data:build는 배포 직전에만)
 * - 국토부 실거래·R-ONE·건축물대장: 파일 이름의 날짜. 월 단위(YYYYMM)는 그 달 마지막 날까지 담긴 것으로 본다
 * 7일 넘으면 빨강 (운영 명세: 시장 데이터 주 1회 갱신)
 */

export const STALE_DAYS = 7;

export type SourceId = 'SCREEN' | 'LISTINGS' | 'TRADES' | 'RONE' | 'UNITS';
export const SOURCE_ORDER: SourceId[] = ['SCREEN', 'LISTINGS', 'TRADES', 'RONE', 'UNITS'];

/** 폴더별 파일 이름 (서버가 readdir로 채움) */
export interface DataFiles {
  observedAt: string | null;
  naver: string[];
  trades: string[];
  index: string[];
  units: string[];
}

export interface FreshnessRow {
  id: SourceId;
  /** 'YYYY-MM-DD' (월 단위는 그 달 마지막 날), 못 찾으면 null */
  date: string | null;
  /** 오늘까지 지난 날 수 (날짜 없으면 null) */
  days: number | null;
  stale: boolean;
  /** 매물만: 화면 기준일보다 새 CSV가 있어 아직 화면에 반영 안 됨 */
  pending?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYYMMDD' → 'YYYY-MM-DD', 'YYYYMM' → 그 달 마지막 날. 잘못된 값은 null */
export function toDate(token: string): string | null {
  if (/^\d{8}$/.test(token)) {
    const y = Number(token.slice(0, 4));
    const m = Number(token.slice(4, 6));
    const d = Number(token.slice(6, 8));
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
  }
  if (/^\d{6}$/.test(token)) {
    const y = Number(token.slice(0, 4));
    const m = Number(token.slice(4, 6));
    if (m < 1 || m > 12) return null;
    return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
  }
  return null;
}

/** 파일 이름에서 날짜 찾기: pattern의 마지막 캡처 그룹이 날짜 (YYYYMMDD 또는 YYYYMM). 여러 파일이면 가장 최근 */
export function latestDate(files: string[], pattern: RegExp): string | null {
  let best: string | null = null;
  for (const f of files) {
    const m = f.match(pattern);
    const d = m ? toDate(m[m.length - 1]) : null;
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

const PATTERNS = {
  naver: /^naver_complexes_(\d{8})\.csv$/,
  trades: /^molit-apt-trades-\d{6}-(\d{6})\.json$/,
  index: /^rone-indices-(\d{6})\.json$/,
  units: /^building-units-(\d{8})\.json$/,
};

/** 한국 날짜 'YYYY-MM-DD' */
export function kstToday(now: Date): string {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

/** 두 날짜 사이 날 수 (미래 날짜면 0) */
export function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000));
}

export function freshness(files: DataFiles, now: Date): FreshnessRow[] {
  const today = kstToday(now);
  const row = (id: SourceId, date: string | null): FreshnessRow => {
    const days = date ? daysBetween(date, today) : null;
    return { id, date, days, stale: days === null || days > STALE_DAYS };
  };
  const screen = files.observedAt && /^\d{4}-\d{2}-\d{2}$/.test(files.observedAt) ? files.observedAt : null;
  const listings = latestDate(files.naver, PATTERNS.naver);
  return [
    row('SCREEN', screen),
    { ...row('LISTINGS', listings), pending: !!listings && !!screen && listings > screen },
    row('TRADES', latestDate(files.trades, PATTERNS.trades)),
    row('RONE', latestDate(files.index, PATTERNS.index)),
    row('UNITS', latestDate(files.units, PATTERNS.units)),
  ];
}
