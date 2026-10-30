// 다산동 중개사무소 명단 → 가입 대조용 JSON (서버 전용: 대표자·전화가 들어 있으므로 화면 컴포넌트에서 import 금지)
//   입력: data/brokers/다산동 부동산_YYYYMMDD.csv (원본 xls를 엑셀에서 "CSV UTF-8"로 저장한 것)
//         원본 머리글이 한 칸씩 밀려 있음 → 실제 순서 등록번호|대표자|상호|주소|전화|상태 로 읽는다
//   출력: src/data/brokers/dasan-offices.json  { meta, offices: BrokerRegistryEntry[] }
// 갱신: 월 1회 새 명단을 받아 다시 실행. 설계: docs/handover/phase5-broker-signup.md
// 사용: node scripts/build-broker-registry.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'data/brokers';
const file = readdirSync(RAW).filter((f) => /^다산동 부동산_\d{8}\.csv$/.test(f)).sort().at(-1);
if (!file) throw new Error('data/brokers/다산동 부동산_YYYYMMDD.csv 가 없습니다 (xls를 CSV UTF-8로 저장)');

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
    rows.push(cells.map((c) => c.trim()));
  }
  return rows.slice(1);
}

/** 상호 안에 넣어 둔 번호 (예: 다산클터(031-555-8945)공인중개사사무소). 지역번호가 없으면 031을 붙인다 */
function phoneInName(name) {
  const m = name.match(/\((0\d{1,2}-)?(\d{3,4}-\d{4})\)/);
  return m ? `${m[1] ?? '031-'}${m[2]}` : null;
}

/**
 * 전화 칸 정리: 번호가 여러 개(`031-555-7133  031-555-7134`)·지역번호 없음(`557-8181`)·하이픈 없음(`0315921000`)·
 * `-` 섞임이 있다. 모두 0XX-XXX(X)-XXXX로 맞춰 순서대로 돌려준다 (1600 같은 대표번호도 형식만 맞춤)
 */
export function parsePhones(raw) {
  const out = [];
  for (const m of String(raw ?? '').matchAll(/(0\d{1,2})-?(\d{3,4})-?(\d{4})|(?<![\d-])(1\d{3})-(\d{4})|(?<![\d-])(\d{3,4})-(\d{4})(?![\d-])/g)) {
    if (m[1]) out.push(`${m[1]}-${m[2]}-${m[3]}`);
    else if (m[4]) out.push(`${m[4]}-${m[5]}`);
    else out.push(`031-${m[6]}-${m[7]}`);
  }
  return [...new Set(out)];
}

const offices = parseCsv(readFileSync(join(RAW, file), 'utf8')).map(([regNo, ceo, office, address, phone, status]) => {
  const year = regNo.match(/^41360-(\d{4})-\d{5}$/);
  const listed = parsePhones(phone);
  const fromName = listed.length ? null : phoneInName(office);
  return {
    regNo,
    ceo,
    office,
    address,
    /** 확인 전화 번호. 명단에 여러 개면 첫 번호, 나머지는 altPhones (관리자용) */
    phone: listed[0] ?? fromName,
    altPhones: listed.slice(1),
    phoneSource: listed.length ? 'listed' : fromName ? 'office-name' : null,
    status,
    /** 표준 형식 번호의 연도. 옛 형식은 관리자가 확인 전화 때 등록일로 채운다 */
    openYear: year ? Number(year[1]) : null,
  };
});

const dup = offices.length - new Set(offices.map((o) => o.regNo)).size;
if (dup > 0) throw new Error(`등록번호 중복 ${dup}건`);

const out = {
  meta: {
    source: file,
    builtAt: new Date().toISOString().slice(0, 10),
    count: offices.length,
    noPhone: offices.filter((o) => !o.phone).length,
    noOpenYear: offices.filter((o) => o.openYear === null).length,
  },
  offices,
};
writeFileSync('src/data/brokers/dasan-offices.json', `${JSON.stringify(out, null, 1)}\n`);
console.log(out.meta);
