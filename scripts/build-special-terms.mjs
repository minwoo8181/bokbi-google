// 복비 특약 만들기: 대표님 엑셀 "특약사항 자동완성" → 앱용 JSON
//   입력: data/special-terms/특약사항 자동완성*.xlsx* (시트 DB1 = 특약, 변경 = 유형 설명, 가계약필수특약)
//   출력: src/data/special-terms/terms.json  { meta, types, clauses, provisional }
//   범위(2026-10-25 대표님): 매매·임대차·기타 구역, 유형 1·2·3-a·3-b·4-a·4-b·5·6·7. 비활성 특약은 뺀다
//   엑셀을 고치면 다시 실행. 외부 라이브러리 없이 zip(xlsx)을 직접 푼다
// 사용: node scripts/build-special-terms.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const RAW = 'data/special-terms';
const file = readdirSync(RAW).filter((f) => f.startsWith('특약사항 자동완성')).sort().at(-1);
if (!file) throw new Error('data/special-terms/특약사항 자동완성*.xlsx 가 없습니다');
const buf = readFileSync(join(RAW, file));

/** zip 중앙 디렉터리를 읽어 파일 이름 → 내용(문자열) */
function unzip(b) {
  const eocd = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    const method = b.readUInt16LE(p + 10);
    const size = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const commentLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const raw = b.subarray(dataStart, dataStart + size);
    out[name] = (method === 8 ? inflateRawSync(raw) : raw).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const files = unzip(buf);
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const strings = [...files['xl/sharedStrings.xml'].matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
);

/** 시트 이름 → 행 배열 ({열 글자: 값}) */
function sheetRows(sheetName) {
  const wb = files['xl/workbook.xml'];
  const rid = wb.match(new RegExp(`<sheet[^>]*name="${sheetName}"[^>]*r:id="(rId\\d+)"`))?.[1];
  const target = files['xl/_rels/workbook.xml.rels'].match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`))?.[1]
    ?? files['xl/_rels/workbook.xml.rels'].match(new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`))?.[1];
  const xml = files[`xl/${target.replace(/^\/?xl\//, '')}`];
  const rows = [];
  for (const [, r, body] of xml.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = { _r: Number(r) };
    for (const c of body.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, col, attrs, inner = ''] = c;
      let v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (v != null && /t="s"/.test(attrs)) v = strings[Number(v)];
      const is = inner.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      if (is) v = is;
      if (v != null && String(v).trim() !== '') row[col] = unesc(String(v)).trim();
    }
    rows.push(row);
  }
  return rows;
}

/** "1.0" → "1", "3-a" 그대로 */
const typeCode = (v) => (/^\d+\.0$/.test(v) ? v.replace('.0', '') : v);
const TYPES_IN_SCOPE = ['1', '2', '3-a', '3-b', '4-a', '4-b', '5', '6', '7'];
const SECTIONS_IN_SCOPE = ['매매', '임대차', '기타'];
const TYPE_COLS = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'];

// ── 유형 (변경 시트 "변경 후") ──
const typeRows = sheetRows('변경').filter((r) => r._r >= 17 && r.B);
const types = typeRows
  .map((r) => ({ code: typeCode(r.B), trade: r.A === '전세' ? '전세' : '매매', desc: r.C, attendees: r.D }))
  .filter((t) => TYPES_IN_SCOPE.includes(t.code));

// ── 특약 (DB1) ──
const clauses = [];
let section = null;
let skippedInactive = 0;
for (const r of sheetRows('DB1')) {
  if (r._r < 7) continue;
  if (r.B && !r.D && !r.A) {
    section = r.B;
    continue;
  }
  if (!section || !r.D || !SECTIONS_IN_SCOPE.includes(section)) continue;
  if (r.W === '비활성') {
    skippedInactive++;
    continue;
  }
  const clauseTypes = TYPE_COLS.map((c) => r[c]).filter(Boolean).map(typeCode).filter((t) => TYPES_IN_SCOPE.includes(t));
  const variant = r.C ?? '';
  clauses.push({
    id: `${section}-${clauses.filter((c) => c.section === section).length + 1}`,
    section,
    topic: r.B ?? '',
    variant: variant.replace('[기본]', '').trim(),
    isDefault: variant.includes('[기본]'),
    // 기타 구역(계약갱신·대리 계약·신탁 등)의 "필수"는 그 특수 상황일 때만 필수라 일반 매매·전세에는 붙이지 않는다 (대표님 지적 2026-10-25)
    required: r.F === '필수' && section !== '기타',
    types: clauseTypes,
    // 엑셀 원문은 "- "로 시작: 복사할 때 번호를 붙이므로 뺀다.
    // "매도인 계좌 :"처럼 콜론 뒤가 비어 있는 줄은 괄호 빈칸을 붙여 빈칸 채우기에 나오게 한다 (대표님 지적 2026-10-25)
    text: r.D.replace(/^-\s*/, '').replace(/:\s*$/gm, ': (          )'),
  });
}

// ── 가계약 필수 특약 ──
const provisional = [];
let pSection = null;
for (const r of sheetRows('가계약필수특약')) {
  if (r.B && !r.A) {
    pSection = r.B;
    continue;
  }
  if (!r.B || !['매매', '임대차'].includes(pSection)) continue;
  const scope = r.A === '모든 유형' ? 'ALL' : r.A.split(/\s+/).map(typeCode);
  provisional.push({ section: pSection, types: scope, text: r.B.replace(/^-\s*/, '') });
}

const meta = { source: file, builtAt: new Date().toISOString().slice(0, 10), clauses: clauses.length, skippedInactive };
mkdirSync('src/data/special-terms', { recursive: true });
writeFileSync('src/data/special-terms/terms.json', JSON.stringify({ meta, types, clauses, provisional }, null, 2) + '\n');

const perType = Object.fromEntries(types.map((t) => [t.code, clauses.filter((c) => c.types.includes(t.code)).length]));
const noType = clauses.filter((c) => c.types.length === 0).length;
console.log(`특약 ${clauses.length}개 (비활성 제외 ${skippedInactive}) · 유형 ${types.length}개 · 가계약 ${provisional.length}줄 · 유형 없는 특약 ${noType}`);
console.log('유형별 특약 수', perType);
