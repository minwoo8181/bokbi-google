// 지금 나온 매물 호가 데이터 (분석 화면 실거래 · 호가 카드, 대표님 2026-10-27)
//   입력: data/market/naver/naver_listings_YYYYMMDD.csv 전부 (매주 쌓임, 지우지 않음) + src/data/market/dasan-market.json (단지 id)
//   출력: src/data/market/dasan-asking.json (서버 전용) — 단지 id별 매매 매물 [수집일 번호, 전용㎡, 호가(만 원), 층 표기 원문]
//   층 판정(저·중·고 표기 포함)은 화면 쪽 src/lib/market/askingPrice.ts가 한다 (여기서는 원문 그대로)
//   외부 API 호출 없음 — 시장 데이터 재생성(data:build)과 별개로 매주 돌려도 된다
// 사용: node scripts/build-asking-prices.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NAVER = 'data/market/naver';
const OUT = 'src/data/market/dasan-asking.json';

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
// build-market-dataset.mjs와 같은 단지 이름 맞추기
const normName = (s) => String(s ?? '').replace(/\(.*?\)/g, '').replace(/[\s·.]/g, '').replace(/이편한세상/g, 'e편한세상').toLowerCase();

const market = JSON.parse(readFileSync('src/data/market/dasan-market.json', 'utf8'));
const idByName = new Map(market.complexes.map((c) => [normName(c.name), c.id]));

const files = readdirSync(NAVER).filter((f) => /^naver_listings_\d{8}\.csv$/.test(f)).sort();
if (files.length === 0) throw new Error('naver_listings_*.csv 가 없습니다');

const dates = [];
const complexes = {};
const report = [];
for (const f of files) {
  const rows = parseCsv(join(NAVER, f));
  const date = String(rows[0]?.observed_at_KST ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${f}: 수집 시각을 읽지 못했습니다`);
  if (dates.includes(date)) throw new Error(`${f}: 같은 수집일 파일이 둘입니다 (${date})`);
  const di = dates.push(date) - 1;
  let kept = 0;
  const skipped = { notSale: 0, badPrice: 0 };
  for (const r of rows) {
    if (r.trade_type !== '매매') { skipped.notSale++; continue; }
    const id = idByName.get(normName(r.apt_name));
    if (id === undefined) throw new Error(`${f}: 단지를 맞추지 못했습니다 — ${r.apt_name}`);
    const price = Number(r.price_manwon);
    const m2 = Number(r.exclusive_m2);
    if (!(price > 0) || !(m2 > 0)) { skipped.badPrice++; continue; }
    (complexes[id] ??= []).push([di, m2, price, String(r.floor_raw ?? '')]);
    kept++;
  }
  report.push(`${f}: 매매 ${kept}건 (전세·월세 ${skipped.notSale}건 제외, 가격·면적 없음 ${skipped.badPrice}건)`);
}

writeFileSync(OUT, JSON.stringify({ meta: { sources: files, columns: ['dateIndex', 'exclusiveM2', 'priceManwon', 'floorRaw'] }, dates, complexes }));
console.log(report.join('\n'));
console.log(`→ ${OUT} (단지 ${Object.keys(complexes).length}곳)`);
