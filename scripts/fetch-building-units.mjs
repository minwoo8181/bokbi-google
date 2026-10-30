// 건축물대장(건축HUB, data.go.kr 15134735) 동·호 목록 수집 — 매칭 모달의 동·호수 실존 확인용
//   입력: src/data/market/dasan-market.json (단지 지번 lots) + data/market/naver/naver_complexes_*.csv (지번 보조)
//   출력: data/market/units/building-units-YYYYMMDD.json (지번별 표제부 동 + 전유부 호, 단지 배정은 data:build에서)
//   사용: npm run units:fetch  (키: .env.local BUILDING_REGISTER_API_KEY, 월 1회 갱신)
// 전유부 API는 dongNm·hoNm 조건을 무시하고 지번 전체를 돌려주므로 지번 단위로 전체 페이지를 받는다
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KEY = process.env.BUILDING_REGISTER_API_KEY;
if (!KEY) throw new Error('BUILDING_REGISTER_API_KEY가 없습니다 (node --env-file=.env.local 로 실행)');
const BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService';
const SIGUNGU = '41360'; // 경기도 남양주시
const BJDONG = '11200'; // 다산동
const NAVER = 'data/market/naver';
const UNITS = 'data/market/units';
const DELAY_MS = 200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ds = JSON.parse(readFileSync('src/data/market/dasan-market.json', 'utf8'));
const csvFile = readdirSync(NAVER).filter((f) => f.startsWith('naver_complexes_') && f.endsWith('.csv')).sort().at(-1);
const csvLots = new Map();
if (csvFile) {
  const [head, ...rows] = readFileSync(join(NAVER, csvFile), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const cols = head.split(',');
  for (const line of rows) {
    // 단지명에 쉼표가 있을 수 있어("플루리움4,5단지") 따옴표를 고려해 나눈다
    const cells = line.match(/("([^"]*)"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, ''));
    const r = Object.fromEntries(cols.map((k, i) => [k, cells[i]]));
    const lot = String(r.address ?? '').match(/다산동\s+(\d+(?:-\d+)?)/)?.[1];
    if (lot) csvLots.set(r.apt_name, lot);
  }
}

// 단지별 지번: 엑셀 단지명매칭의 지번 + 네이버 주소 지번 (둘이 다른 단지가 있어 합친다)
const norm = (s) => String(s).replace(/\(.*?\)/g, '').replace(/[\s·.]/g, '').toLowerCase();
const lotsOf = new Map(ds.complexes.map((c) => [c.name, new Set(c.lots)]));
for (const [name, lot] of csvLots) {
  const c = ds.complexes.find((x) => norm(x.name) === norm(name));
  if (c) lotsOf.get(c.name).add(lot);
}
const allLots = [...new Set([...lotsOf.values()].flatMap((s) => [...s]))].sort();

let calls = 0;
async function fetchAll(op, lot) {
  const [bun, ji = '0'] = lot.split('-');
  const out = [];
  for (let pageNo = 1; ; pageNo++) {
    await sleep(DELAY_MS);
    calls++;
    const qs = new URLSearchParams({
      sigunguCd: SIGUNGU, bjdongCd: BJDONG, platGbCd: '0',
      bun: bun.padStart(4, '0'), ji: ji.padStart(4, '0'),
      _type: 'json', numOfRows: '100', pageNo: String(pageNo),
    });
    const res = await fetch(`${BASE}/${op}?serviceKey=${encodeURIComponent(KEY)}&${qs}`);
    if (!res.ok) throw new Error(`${op} ${lot} HTTP ${res.status}`);
    const body = (await res.json()).response;
    if (body.header.resultCode !== '00') throw new Error(`${op} ${lot} ${body.header.resultCode} ${body.header.resultMsg}`);
    const it = body.body.items?.item;
    const items = Array.isArray(it) ? it : it ? [it] : [];
    out.push(...items);
    if (out.length >= Number(body.body.totalCount) || items.length === 0) break;
  }
  return out;
}

const t0 = Date.now();
const lots = {};
for (const lot of allLots) {
  const titles = await fetchAll('getBrTitleInfo', lot);
  const expos = await fetchAll('getBrExposInfo', lot);
  lots[lot] = {
    // 표제부: 동 이름 · 주용도 · 지상 층수 · 세대수
    titles: titles.map((t) => ({ dong: String(t.dongNm ?? '').trim(), purps: t.mainPurpsCdNm ?? '', etcPurps: t.etcPurps ?? '', floors: Number(t.grndFlrCnt) || 0, households: Number(t.hhldCnt) || 0 })),
    // 전유부: [동, 호, 층]
    units: expos.map((u) => [String(u.dongNm ?? '').trim(), String(u.hoNm ?? '').trim(), Number(u.flrNo) || 0]),
  };
  console.log(`${lot}: 표제부 ${titles.length}동, 전유부 ${expos.length}호`);
}

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const out = {
  meta: { fetchedAt: today, source: 'data.go.kr 15134735 건축HUB 건축물대장정보 (getBrTitleInfo, getBrExposInfo)', sigunguCd: SIGUNGU, bjdongCd: BJDONG },
  complexLots: Object.fromEntries([...lotsOf].map(([name, s]) => [name, [...s]])),
  lots,
};
const file = join(UNITS, `building-units-${today.replace(/-/g, '')}.json`);
writeFileSync(file, JSON.stringify(out));
console.log(`지번 ${allLots.length}개, 호출 ${calls}회, ${Math.round((Date.now() - t0) / 1000)}초 → ${file}`);
