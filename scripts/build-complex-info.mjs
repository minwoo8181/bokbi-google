// 단지 부가 정보(학군·주차) 추출기 — 시장 데이터셋(dasan-market.json)은 건드리지 않는다
//   입력: data/market/naver/naver_complexes_YYYYMMDD.csv (elementary_school_*, total_parking_spaces, parking_per_household)
//         src/data/market/dasan-market.json (단지 id 매칭용, 읽기만)
//   출력: src/data/market/dasan-complex-info.json  { meta, complexes: { [id]: ComplexInfo } }
// 매물·실거래 갱신은 배포 직전 data:build 한 번 (대표님 2026-10-24). 사진 URL은 저작권 문제로 쓰지 않는다
// 사용: node scripts/build-complex-info.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NAVER = 'data/market/naver';
const file = readdirSync(NAVER).filter((f) => f.startsWith('naver_complexes_') && f.endsWith('.csv')).sort().at(-1);
if (!file) throw new Error('naver_complexes_*.csv 가 없습니다');

const normName = (s) => String(s ?? '').replace(/\(.*?\)/g, '').replace(/[\s·.]/g, '').replace(/이편한세상/g, 'e편한세상').toLowerCase();
const num = (v) => (v === undefined || v === '' ? null : Number(v));

function parseCsv(text) {
  const rows = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)) {
    const cells = [];
    let cur = '';
    let quoted = false;
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
}

const market = JSON.parse(readFileSync('src/data/market/dasan-market.json', 'utf8'));
const byNorm = new Map(market.complexes.map((c) => [normName(c.name), c.id]));
const rows = parseCsv(readFileSync(join(NAVER, file), 'utf8'));

const complexes = {};
const missing = [];
for (const r of rows) {
  const id = byNorm.get(normName(r.apt_name));
  if (id === undefined) { missing.push(r.apt_name); continue; }
  const school = String(r.elementary_school_name ?? '').replace(/\s+/g, '');
  complexes[id] = {
    // 네이버 표기: 초등학교 이름 + 도보 분
    elementarySchool: school || null,
    elementarySchoolWalkMin: num(r.elementary_school_distance),
    parkingTotal: num(r.total_parking_spaces),
    parkingPerHousehold: num(r.parking_per_household),
  };
}
if (missing.length) throw new Error(`데이터셋에 없는 단지: ${missing.join(', ')}`);

const out = { meta: { source: file, extractedAt: new Date().toISOString().slice(0, 10) }, complexes };
writeFileSync('src/data/market/dasan-complex-info.json', JSON.stringify(out));
console.log(`단지 정보 ${Object.keys(complexes).length}곳 → src/data/market/dasan-complex-info.json (${file})`);
