// 외부 의존성 없는 최소 xlsx 리더 (zip 중앙 디렉터리 + 시트 XML 파싱).
// 네이버 매물 스냅샷 엑셀(inlineStr 셀)을 매주 다시 읽기 위한 용도.
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

function readZipEntries(buf) {
  // End of central directory 레코드 탐색
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('xlsx: zip EOCD를 찾을 수 없습니다');
  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('xlsx: 손상된 중앙 디렉터리');
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    entries.set(name, { method, compSize, localOff });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return (name) => {
    const e = entries.get(name);
    if (!e) return null;
    const lNameLen = buf.readUInt16LE(e.localOff + 26);
    const lExtraLen = buf.readUInt16LE(e.localOff + 28);
    const start = e.localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + e.compSize);
    return (e.method === 0 ? raw : inflateRawSync(raw)).toString('utf8');
  };
}

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');

const colIndex = (ref) => {
  const letters = ref.replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

function parseSheet(xml, sharedStrings) {
  const rows = [];
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const body = cm[2] ?? '';
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      let value = null;
      if (type === 'inlineStr') {
        value = decode([...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        if (v !== undefined) {
          if (type === 's') value = sharedStrings[Number(v)] ?? null;
          else if (type === 'str' || type === 'b') value = decode(v);
          else value = Number(v);
        }
      }
      row[ref ? colIndex(ref) : row.length] = value;
    }
    rows.push(row);
  }
  return rows;
}

/** 시트명 → 행 배열(첫 행 = 헤더)을 돌려준다 */
export function readWorkbook(path) {
  const read = readZipEntries(readFileSync(path));
  const shared = [];
  const sst = read('xl/sharedStrings.xml');
  if (sst) {
    for (const si of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(decode([...si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join('')));
    }
  }
  const wb = read('xl/workbook.xml');
  const rels = read('xl/_rels/workbook.xml.rels');
  // 속성 순서가 파일마다 달라서 태그 단위로 속성을 따로 읽는다
  const attr = (tag, name) => new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1];
  const target = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], 'Id'), attr(m[0], 'Target')]),
  );
  const sheets = {};
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const file = target.get(attr(m[0], 'r:id')).replace(/^\/?(xl\/)?/, 'xl/');
    sheets[decode(attr(m[0], 'name'))] = parseSheet(read(file), shared);
  }
  return sheets;
}

/** 헤더 행 기준으로 객체 배열로 변환 */
export function toObjects(rows) {
  const [header, ...body] = rows;
  return body
    .filter((r) => r.some((v) => v !== null && v !== undefined && v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? null])));
}
