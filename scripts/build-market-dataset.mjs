// 다산동 시장 데이터셋 생성기
//   입력: data/market/trades/다산동_아파트_실거래_매물현황_YYYYMMDD.xlsx (네이버 매물 스냅샷 + 국토부 CSV 원본)
//         data/market/naver/naver_complexes_YYYYMMDD.csv + naver_pyeongs_YYYYMMDD.csv (선택: 엑셀보다 최신이면 매물 수·평형을 덮어씀)
//         data/market/trades/molit-apt-trades-*.json (국토부 실거래 API, 교차검증용), molit-apt-rent-*.json (전월세)
//         data/market/index/rone-indices-*.json (R-ONE 지수, 권역 환경 정보)
//         data/market/units/ (건축물대장 동·호, 공동 지번 동 규칙, 단지 고정 ID)
//   출력: src/data/market/dasan-market.json (서버 전용), data/reports/reconciliation.md
// 사용: node scripts/build-market-dataset.mjs [xlsx 경로]
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readWorkbook, toObjects } from './lib/xlsx-lite.mjs';

const NAVER = 'data/market/naver';
const TRADES = 'data/market/trades';
const INDEX = 'data/market/index';
const UNITS = 'data/market/units';
const latest = (dir, prefix, ext) =>
  readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(ext)).sort().at(-1);

const xlsxPath = process.argv[2] ?? join(TRADES, latest(TRADES, '다산동_아파트_실거래_매물현황_', '.xlsx'));
const apiPath = join(TRADES, latest(TRADES, 'molit-apt-trades-', '.json'));
const ronePath = join(INDEX, latest(INDEX, 'rone-indices-', '.json'));

const num = (v) => {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const normName = (s) => String(s ?? '').replace(/\(.*?\)/g, '').replace(/[\s·.]/g, '').replace(/이편한세상/g, 'e편한세상').toLowerCase();
const pad = (n) => String(n).padStart(2, '0');

// ── 1. 엑셀 ────────────────────────────────────────────────────────────
const sheets = readWorkbook(xlsxPath);
const summary = toObjects(sheets['단지별요약']);
const pyeongRows = toObjects(sheets['네이버평형별']);
const rawTrades = toObjects(sheets['실거래원본']);
const matching = toObjects(sheets['단지명매칭']);

// 엑셀 날짜는 문자열 또는 일련번호(1899-12-30 기준 일수)로 저장된다
const excelDate = (v) =>
  typeof v === 'number' ? new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);
const excelObservedAt = excelDate(pyeongRows.find((r) => r.observed_at_KST)?.observed_at_KST);
if (!/^\d{4}-\d{2}-\d{2}$/.test(excelObservedAt)) throw new Error(`매물 확인 시각을 읽지 못했습니다: ${excelObservedAt}`);

// ── 1-0. 최신 네이버 매물 수 CSV (동일매물 묶기, data/market/naver/naver_complexes_YYYYMMDD.csv + naver_pyeongs_*.csv) ──
// 엑셀보다 최신이면 매물 수·평형만 이 CSV로 덮어쓴다. 실거래는 엑셀(국토부 CSV 원본) 그대로
const parseCsv = (path) => {
  const rows = [];
  for (const line of readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)) {
    const cells = [];
    let cur = '', quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])));
};
const naverComplexFile = latest(NAVER, 'naver_complexes_', '.csv');
const naverPyeongFile = naverComplexFile?.replace('naver_complexes_', 'naver_pyeongs_');
const naverComplexes = naverComplexFile ? parseCsv(join(NAVER, naverComplexFile)) : [];
const naverObservedAt = String(naverComplexes[0]?.observed_at_KST ?? '').slice(0, 10);
const useNaverCsv = naverComplexes.length > 0 && naverObservedAt >= excelObservedAt;
if (useNaverCsv && !existsSync(join(NAVER, naverPyeongFile))) throw new Error(`${naverPyeongFile}이 없습니다 (단지·평형 CSV는 같은 날짜로 한 쌍)`);
const naverPyeongs = useNaverCsv ? parseCsv(join(NAVER, naverPyeongFile)) : [];
// 매물 확인 시각 = 화면의 "지금". 매물 CSV가 더 최신이면 그 날짜를 쓴다
const observedAt = useNaverCsv ? naverObservedAt : excelObservedAt;

const lotsByName = new Map();
for (const m of matching) {
  const lots = String(m.lot_numbers ?? '').split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  lotsByName.set(m.naver_apt_name, { lots, csvName: m.csv_apt_name, buildYear: num(String(m.csv_build_years ?? '').slice(0, 4)) });
}

const complexes = summary.map((s) => ({
  name: s.apt_name,
  households: num(s.total_households),
  buildYear: lotsByName.get(s.apt_name)?.buildYear ?? null,
  lots: lotsByName.get(s.apt_name)?.lots ?? [],
  listings: {
    sale: num(s.current_sale_listings) ?? 0,
    jeonse: num(s.current_jeonse_listings) ?? 0,
    minAskManwon: num(s.min_asking_price),
  },
  pyeongs: pyeongRows
    .filter((p) => p.apt_name === s.apt_name)
    .map((p) => ({
      typeName: String(p.pyeong_name ?? ''),
      supplyM2: num(p.supply_m2),
      exclusiveM2: num(p.exclusive_m2),
      supplyPyeong: num(p.supply_pyeong),
      sale: num(p.current_sale_listings) ?? 0,
      jeonse: num(p.current_jeonse_listings) ?? 0,
    }))
    .sort((a, b) => a.exclusiveM2 - b.exclusiveM2),
  trades: [],
}));
if (useNaverCsv) {
  const byNorm = new Map(complexes.map((c) => [normName(c.name), c]));
  const seen = new Set();
  for (const r of naverComplexes) {
    const c = byNorm.get(normName(r.apt_name));
    if (!c) throw new Error(`네이버 CSV 단지를 엑셀 단지와 맞추지 못했습니다: ${r.apt_name}`);
    seen.add(c.name);
    c.households = num(r.total_households) ?? c.households;
    c.listings = { sale: num(r.current_sale_listings) ?? 0, jeonse: num(r.current_jeonse_listings) ?? 0, minAskManwon: num(r.min_asking_price) };
    c.pyeongs = naverPyeongs
      .filter((p) => p.naver_complex_no === r.naver_complex_no)
      .map((p) => ({
        // 네이버 타입명 (33A·33B 등). 같은 평형 안 구조 구분용 — 가격 계산에는 쓰지 않는다
        typeName: String(p.pyeong_name ?? ''),
        supplyM2: num(p.supply_m2),
        exclusiveM2: num(p.exclusive_m2),
        supplyPyeong: num(p.supply_pyeong),
        sale: num(p.current_sale_listings) ?? 0,
        jeonse: num(p.current_jeonse_listings) ?? 0,
      }))
      .sort((a, b) => a.exclusiveM2 - b.exclusiveM2);
    // 단지 합계 = 평형 합계 (수집 검증과 같은 조건)
    const pyeongSale = c.pyeongs.reduce((s, p) => s + p.sale, 0);
    if (pyeongSale !== c.listings.sale) throw new Error(`${c.name} 매매 매물 수 불일치: 단지 ${c.listings.sale} vs 평형 합 ${pyeongSale}`);
  }
  const missing = complexes.filter((c) => !seen.has(c.name)).map((c) => c.name);
  if (missing.length) throw new Error(`네이버 CSV에 없는 단지: ${missing.join(', ')}`);
}
const byName = new Map(complexes.map((c) => [c.name, c]));

// 해제(cancelled)·연도 경계 중복(cross_file_duplicate_excluded) 제외
let excludedCancelled = 0, excludedDup = 0, unmatchedCsv = 0;
for (const r of rawTrades) {
  if (String(r.cancelled) === '1') { excludedCancelled++; continue; }
  if (String(r.cross_file_duplicate_excluded) === '1') { excludedDup++; continue; }
  const c = byName.get(r.apt_name);
  if (!c) { unmatchedCsv++; continue; }
  const ym = String(r['계약년월']);
  const date = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-${pad(Number(r['계약일']))}`;
  c.trades.push([date, num(r.exclusive_m2), num(r.trade_price_manwon), num(r['층']), r['거래유형'] === '중개거래' ? 1 : 0]);
}
for (const c of complexes) c.trades.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
const validCsv = complexes.reduce((s, c) => s + c.trades.length, 0);

// ── 2. 국토부 API 교차검증 (지번 우선, 같은 지번 여러 단지면 이름으로 구분) ─────
const api = JSON.parse(readFileSync(apiPath, 'utf8'));
const byLot = new Map();
for (const c of complexes) for (const lot of c.lots) byLot.set(lot, [...(byLot.get(lot) ?? []), c]);
const apiMatched = new Map();
const apiUnmatched = new Map();
for (const t of api) {
  const cands = byLot.get(String(t.jibun)) ?? [];
  let hit = cands.length === 1 ? cands[0] : null;
  if (!hit && cands.length > 1) {
    const n = normName(t.apt);
    const exact = cands.filter((c) => normName(c.name) === n || normName(lotsByName.get(c.name)?.csvName) === n);
    if (exact.length === 1) hit = exact[0];
  }
  if (!hit) { apiUnmatched.set(`${t.apt}|${t.jibun}`, (apiUnmatched.get(`${t.apt}|${t.jibun}`) ?? 0) + 1); continue; }
  const key = `${hit.name}|${t.yearMonth}`;
  apiMatched.set(key, (apiMatched.get(key) ?? 0) + 1);
}

// 두 출처가 모두 완결된 월(API 시작월 ~ 매물 확인 전월)만 비교
const apiMonths = [...new Set(api.map((t) => t.yearMonth))].sort();
const lastFullYm = (() => { const [y, m] = observedAt.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}`; })();
const cmpMonths = apiMonths.filter((ym) => ym <= lastFullYm);
const diffs = [];
let csvTotal = 0, apiTotal = 0;
for (const c of complexes) {
  let a = 0, b = 0;
  for (const ym of cmpMonths) {
    a += c.trades.filter((t) => t[0].slice(0, 7).replace('-', '') === ym).length;
    b += apiMatched.get(`${c.name}|${ym}`) ?? 0;
  }
  csvTotal += a; apiTotal += b;
  if (a !== b) diffs.push({ name: c.name, csv: a, api: b });
}

// ── 2-1. 국토부 전월세 API → 전세 거래 (월세 0원). 매칭 규칙은 매매 API와 동일 ─────────
const rentFile = latest(TRADES, 'molit-apt-rent-', '.json');
let rentStats = { total: 0, jeonse: 0, unmatched: 0 };
if (rentFile) {
  const rents = JSON.parse(readFileSync(join(TRADES, rentFile), 'utf8'));
  for (const c of complexes) c.rents = [];
  for (const t of rents) {
    rentStats.total++;
    if (t.monthlyRentManwon !== 0) continue;
    rentStats.jeonse++;
    const cands = byLot.get(String(t.jibun)) ?? [];
    let hit = cands.length === 1 ? cands[0] : null;
    if (!hit && cands.length > 1) {
      const n = normName(t.apt);
      const exact = cands.filter((c) => normName(c.name) === n || normName(lotsByName.get(c.name)?.csvName) === n);
      if (exact.length === 1) hit = exact[0];
    }
    if (!hit) { rentStats.unmatched++; continue; }
    const ym = String(t.yearMonth);
    // [계약일, 전용면적, 보증금(만원), 층, 신규계약 여부]
    hit.rents.push([`${ym.slice(0, 4)}-${ym.slice(4, 6)}-${pad(t.day)}`, t.area, t.depositManwon, t.floor, t.contractType === '갱신' ? 0 : 1]);
  }
  for (const c of complexes) c.rents.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
}

// ── 2-2. 단지 고정 ID (URL /analysis/[id]). 기존 ID는 유지하고 새 단지만 다음 번호를 받는다 ──
const idPath = join(UNITS, 'complex-ids.json');
const ids = existsSync(idPath) ? JSON.parse(readFileSync(idPath, 'utf8')) : {};
let nextId = Math.max(0, ...Object.values(ids)) + 1;
for (const c of [...complexes].sort((a, b) => (b.households ?? 0) - (a.households ?? 0))) {
  if (!(c.name in ids)) ids[c.name] = nextId++;
  c.id = ids[c.name];
}
writeFileSync(idPath, JSON.stringify(ids, null, 2) + '\n');

// ── 2-3. 건축물대장 동·호 목록 (매칭 모달 동·호수 실존 확인, npm run units:fetch 결과) ──────────
// 주택만: 표제부 주용도가 공동주택인 동(이름 없는 단일 동 포함), 상가동 제외. 한 지번 여러 단지는 shared-lot-dongs.json
const unitsFile = latest(UNITS, 'building-units-', '.json');
const unitsOut = { meta: null, complexes: {} };
const unitsReport = [];
if (unitsFile) {
  const ub = JSON.parse(readFileSync(join(UNITS, unitsFile), 'utf8'));
  const shared = existsSync(join(UNITS, 'shared-lot-dongs.json')) ? JSON.parse(readFileSync(join(UNITS, 'shared-lot-dongs.json'), 'utf8')) : {};
  const stripHo = (h) => String(h).trim().replace(/호$/, '');
  for (const c of complexes) {
    const dongs = new Map(); // 동 이름 → { floors, hos:Set }
    for (const lot of ub.complexLots[c.name] ?? []) {
      const L = ub.lots[lot];
      if (!L) continue;
      const homeTitles = L.titles.filter((t) => /공동주택/.test(t.purps) && !/상가/.test(t.dong));
      const floorsOf = new Map(homeTitles.map((t) => [t.dong, t.floors]));
      const pattern = shared[lot]?.[c.name] ? new RegExp(shared[lot][c.name]) : null;
      for (const [dong, ho] of L.units) {
        if (!floorsOf.has(dong)) continue;
        if (pattern && !pattern.test(dong)) continue;
        if (!dongs.has(dong)) dongs.set(dong, { floors: floorsOf.get(dong), hos: new Set() });
        dongs.get(dong).hos.add(stripHo(ho));
      }
    }
    const list = [...dongs]
      .map(([name, d]) => ({ name, floors: d.floors, hos: [...d.hos].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
    const total = list.reduce((s, d) => s + d.hos.length, 0);
    if (total > 0) unitsOut.complexes[c.id] = list;
    unitsReport.push({ name: c.name, households: c.households ?? 0, units: total });
  }
  unitsOut.meta = { fetchedAt: ub.meta.fetchedAt, source: ub.meta.source, file: unitsFile };
  writeFileSync('src/data/market/dasan-units.json', JSON.stringify(unitsOut));
}

// ── 3. R-ONE (권역 환경 정보: 판정 점수에는 쓰지 않음) ──────────────────────
const rone = JSON.parse(readFileSync(ronePath, 'utf8'));
const lastPoint = (series, region) => series.points.filter((p) => !region || p.region === region).at(-1) ?? null;
const region = {
  name: rone.region,
  saleSupplyDemand: lastPoint(rone.series.saleSupplyDemand),
  jeonseSupplyDemand: lastPoint(rone.series.jeonseSupplyDemand),
  salePriceIndexNamyangju: lastPoint(rone.series.salePriceIndex, `${rone.region}>남양주시`),
  statblIds: Object.fromEntries(Object.entries(rone.series).map(([k, s]) => [k, s.statblId])),
};

// ── 4. 출력 ──────────────────────────────────────────────────────────
const out = {
  meta: {
    observedAt,
    sources: {
      listings: `${useNaverCsv ? naverComplexFile : xlsxPath.split(/[\\/]/).at(-1)} (네이버부동산, 동일매물 묶기)`,
      trades: '국토교통부 실거래가 공개시스템 CSV (해제·중복 제외)',
      crossCheck: apiPath.split(/[\\/]/).at(-1),
      region: ronePath.split(/[\\/]/).at(-1),
    },
    tradeColumns: ['date', 'exclusiveM2', 'priceManwon', 'floor', 'isBrokered'],
    rentColumns: ['date', 'exclusiveM2', 'depositManwon', 'floor', 'isNewContract'],
    rent: rentFile ? { file: rentFile, ...rentStats } : null,
    counts: { complexes: complexes.length, validTrades: validCsv, saleListings: complexes.reduce((s, c) => s + c.listings.sale, 0), jeonseListings: complexes.reduce((s, c) => s + c.listings.jeonse, 0) },
  },
  region,
  complexes,
};
mkdirSync('src/data/market', { recursive: true });
writeFileSync('src/data/market/dasan-market.json', JSON.stringify(out));

const report = [
  `# 데이터 대조 리포트 (매물 기준일 ${observedAt})`,
  '',
  `- 엑셀 실거래원본 ${rawTrades.length}건 − 해제 ${excludedCancelled} − 중복 ${excludedDup} − 단지 미매칭 ${unmatchedCsv} = 유효 ${validCsv}건`,
  `- 단지 ${complexes.length}개, 매매 매물 ${out.meta.counts.saleListings}건, 전세 매물 ${out.meta.counts.jeonseListings}건`,
  `- 교차검증 기간 ${cmpMonths[0]}~${cmpMonths.at(-1)} (${cmpMonths.length}개월): CSV ${csvTotal}건 vs API ${apiTotal}건 (차이 ${csvTotal - apiTotal})`,
  `- API 미매칭: ${[...apiUnmatched.values()].reduce((s, v) => s + v, 0)}건 (${apiUnmatched.size}개 단지명·지번)`,
  rentFile ? `- 전월세 ${rentStats.total}건 중 전세 ${rentStats.jeonse}건, 단지 미매칭 ${rentStats.unmatched}건 (${rentFile})` : '- 전월세 데이터 없음',
  '',
  '| 단지 | CSV | API | 차이 |',
  '| --- | ---: | ---: | ---: |',
  ...diffs.sort((x, y) => Math.abs(y.csv - y.api) - Math.abs(x.csv - x.api)).map((d) => `| ${d.name} | ${d.csv} | ${d.api} | ${d.csv - d.api} |`),
  '',
  apiUnmatched.size ? '## API 미매칭 단지명·지번' : '',
  ...[...apiUnmatched.entries()].map(([k, v]) => `- ${k}: ${v}건`),
  '',
  ...(unitsFile
    ? (() => {
        const ok = unitsReport.filter((u) => Math.abs(u.units - u.households) <= Math.max(2, u.households * 0.02));
        return [
          `## 건축물대장 주택 호수 vs 세대수 (${unitsFile})`,
          `- 일치(±2%) ${ok.length}/${unitsReport.length}개 단지, 주택 호수 합 ${unitsReport.reduce((s, u) => s + u.units, 0)} / 세대수 합 ${unitsReport.reduce((s, u) => s + u.households, 0)}`,
          '',
          '| 단지 | 세대수 | 건축물대장 호수 | 차이 |',
          '| --- | ---: | ---: | ---: |',
          ...unitsReport.filter((u) => !ok.includes(u)).map((u) => `| ${u.name} | ${u.households} | ${u.units} | ${u.units - u.households} |`),
        ];
      })()
    : []),
].join('\n');
mkdirSync('data/reports', { recursive: true });
writeFileSync('data/reports/reconciliation.md', report + '\n');
console.log(report.split('\n').slice(0, 6).join('\n'));
console.log(`불일치 단지 ${diffs.length}개 → data/reports/reconciliation.md`);
