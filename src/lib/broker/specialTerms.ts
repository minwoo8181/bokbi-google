/**
 * 복비 특약 만들기 (결정론·순수 함수, LLM 없음). 원본: 대표님 엑셀 → scripts/build-special-terms.mjs → src/data/special-terms/terms.json
 * 설계 (그릴링 2026-10-25): 완성본 중심 화면 · 유형은 상황 카드 · 필수와 [기본] 문구가 처음부터 들어감 ·
 * 빈칸은 형광펜으로 보여 주고 채우지 않으면 원문 그대로 복사 · 번호 1. 2. 3. + 끝에 이하여백 · 복사만
 */
import type { Occupancy } from '@/lib/requests/types';

export interface TermType {
  code: string;
  trade: '매매' | '전세';
  desc: string;
  attendees: string;
}

export interface Clause {
  id: string;
  section: string;
  topic: string;
  variant: string;
  isDefault: boolean;
  required: boolean;
  types: string[];
  text: string;
}

export interface ProvisionalLine {
  section: string;
  types: 'ALL' | string[];
  text: string;
}

export interface TermsData {
  types: TermType[];
  clauses: Clause[];
  provisional: ProvisionalLine[];
}

/** 이 유형에 쓰는 특약 (엑셀 순서) */
export function applicableClauses(data: TermsData, typeCode: string): Clause[] {
  return data.clauses.filter((c) => c.types.includes(typeCode));
}

/** 처음 화면에 들어가는 특약: 필수 + [기본] 문구 */
export function defaultSelection(data: TermsData, typeCode: string): string[] {
  return applicableClauses(data, typeCode)
    .filter((c) => c.required || c.isDefault)
    .map((c) => c.id);
}

/**
 * 3단계 버튼 누르기: 이미 담겼으면 빼고, 아니면 같은 주제(구역·주제)에 담긴 것과 자리를 바꿔 넣는다 (같은 주제는 하나만, 대표님 2026-10-25)
 */
export function toggleClause(data: TermsData, selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  const c = data.clauses.find((x) => x.id === id);
  if (!c) return selected;
  const sameTopic = new Set(data.clauses.filter((x) => x.section === c.section && x.topic === c.topic).map((x) => x.id));
  return [...selected.filter((x) => !sameTopic.has(x)), id];
}

/**
 * "추천 특약 한 번에 넣기": 추천(엑셀 필수 표시) 문구 중, 이미 그 주제에 고른 게 없는 것만 더한다.
 * [기본]만 붙은 문구(예: 공동명의 계좌)는 그 상황일 때 고르는 것이라 넣지 않는다
 */
export function addRecommended(data: TermsData, typeCode: string, selected: string[]): string[] {
  const picked = new Set(selected.map((id) => data.clauses.find((c) => c.id === id)).filter(Boolean).map((c) => `${c!.section}·${c!.topic}`));
  const extra = applicableClauses(data, typeCode)
    .filter((c) => c.required)
    .filter((c) => {
      const key = `${c.section}·${c.topic}`;
      if (picked.has(key)) return false;
      picked.add(key);
      return true;
    })
    .map((c) => c.id);
  return [...selected, ...extra];
}

/** 같은 주제의 다른 문구 ("다른 문구로 바꾸기") */
export function alternatives(data: TermsData, typeCode: string, clauseId: string): Clause[] {
  const c = data.clauses.find((x) => x.id === clauseId);
  if (!c) return [];
  return applicableClauses(data, typeCode).filter((x) => x.id !== c.id && x.section === c.section && x.topic === c.topic);
}

// ── 상황 질문 (2단계): 버튼 2~3번으로 엑셀 유형 9가지 ─────────────────

export type Trade = '매매' | '전세';
export type NowLiving = 'OWNER' | 'TENANT' | 'VACANT';
export type After = 'BUYER' | 'TENANT_STAYS' | 'NEW_TENANT' | 'SELLER_STAYS';
export interface Answers {
  trade: Trade | null;
  now: NowLiving | null;
  after: After | null;
}
export const NO_ANSWERS: Answers = { trade: null, now: null, after: null };

/** 매매의 "집주인"은 빈집 포함 (엑셀 유형 1 "매도인 실거주(공실포함)") */
export const NOW_OPTIONS: Record<Trade, NowLiving[]> = { 매매: ['OWNER', 'TENANT'], 전세: ['VACANT', 'OWNER', 'TENANT'] };
export const AFTER_OPTIONS: Record<'OWNER' | 'TENANT', After[]> = {
  OWNER: ['BUYER', 'NEW_TENANT', 'SELLER_STAYS'],
  TENANT: ['BUYER', 'TENANT_STAYS', 'NEW_TENANT'],
};

const TYPE_TABLE: Array<[Trade, NowLiving, After | null, string]> = [
  ['매매', 'OWNER', 'BUYER', '1'],
  ['매매', 'TENANT', 'BUYER', '2'],
  ['매매', 'TENANT', 'TENANT_STAYS', '3-a'],
  ['매매', 'OWNER', 'SELLER_STAYS', '3-b'],
  ['매매', 'OWNER', 'NEW_TENANT', '4-a'],
  ['매매', 'TENANT', 'NEW_TENANT', '4-b'],
  ['전세', 'VACANT', null, '5'],
  ['전세', 'OWNER', null, '6'],
  ['전세', 'TENANT', null, '7'],
];

/** 다 답했으면 유형 코드, 아니면 null */
export function typeFromAnswers(a: Answers): string | null {
  return TYPE_TABLE.find(([t, n, af]) => t === a.trade && n === a.now && af === (a.trade === '전세' ? null : a.after))?.[3] ?? null;
}

export function answersFromType(code: string): Answers {
  const row = TYPE_TABLE.find((r) => r[3] === code);
  return row ? { trade: row[0], now: row[1], after: row[2] } : NO_ANSWERS;
}

/** 다음에 물을 질문 (다 답했으면 null) */
export function nextQuestion(a: Answers): 'trade' | 'now' | 'after' | null {
  if (!a.trade) return 'trade';
  if (!a.now || !NOW_OPTIONS[a.trade].includes(a.now)) return 'now';
  if (a.trade === '매매' && (!a.after || !AFTER_OPTIONS[a.now as 'OWNER' | 'TENANT'].includes(a.after))) return 'after';
  return null;
}

/** 매칭 매물에서 열 때: 거래 종류와 지금 사는 사람까지 미리 답한다 (잔금 후는 중개사가 고름) */
export function answersFromListing(trade: Trade, occupancy: Occupancy): Answers {
  if (trade === '전세') return { trade, now: occupancy, after: null };
  return { trade, now: occupancy === 'TENANT' ? 'TENANT' : 'OWNER', after: null };
}

/** 3단계 주제 카드: 같은 구역·주제의 문구 묶음 (엑셀 순서) */
export function groupTopics(clauses: Clause[]): Array<{ key: string; topic: string; clauses: Clause[] }> {
  const map = new Map<string, Clause[]>();
  for (const c of clauses) {
    const key = `${c.section}·${c.topic}`;
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  return [...map].map(([key, cs]) => ({ key, topic: cs[0].topic, clauses: cs }));
}

// ── 빈칸 ─────────────────────────────────────────────────────

/** TEXT = 괄호 빈칸 ( ) — 이름·번호·장소 등 */
export type BlankKind = 'DATE' | 'MONEY' | 'TEXT';
export type Segment = { kind: 'text'; text: string } | { kind: 'blank'; index: number; blank: BlankKind; original: string };

/**
 * 엑셀 원문의 빈칸: 날짜(20  년 월 일 / 00년00월00일), 금액(금 원(₩ ,000,000) / 원(₩ ,000,000) / 금 원), 번호(( )번)
 * "보증금 원(₩…)"처럼 단어에 붙은 "금"은 빈칸에 넣지 않는다 (채우면 "보증"만 남지 않게).
 * 이름·회사·전화 자리의 "000", "00", "000-0000"도 괄호 빈칸과 같이 직접 입력 칸 (예: "000님의 계좌", "00신탁주식회사")
 */
const BLANK_RE =
  /(?:20\s*|00)?년\s*(?:00)?월\s*(?:00)?일|(?<![가-힣])금\s*원\s*\(₩\s*,000,000\)|원\s*\(₩\s*,000,000\)|(?<![가-힣])금\s+원|\(\s+\)|(?<![\d,₩])0{2,3}(?:-0{4})?(?![\d,])/g;

export function splitBlanks(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  let index = 0;
  for (const m of text.matchAll(BLANK_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) });
    const s = m[0];
    out.push({ kind: 'blank', index: index++, blank: /일$/.test(s) ? 'DATE' : /원/.test(s) ? 'MONEY' : 'TEXT', original: s });
    last = at + s.length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

export const blankKey = (clauseId: string, index: number) => `${clauseId}#${index}`;

/** 채운 값으로 바꾼 문장 (안 채운 빈칸은 원문 그대로) */
export function fillClause(clauseId: string, text: string, fills: Record<string, string>): string {
  return splitBlanks(text)
    .map((s) => (s.kind === 'text' ? s.text : fills[blankKey(clauseId, s.index)]?.trim() || s.original))
    .join('');
}

export function unfilledCount(data: TermsData, selected: string[], fills: Record<string, string>): number {
  let n = 0;
  for (const id of selected) {
    const c = data.clauses.find((x) => x.id === id);
    if (!c) continue;
    for (const s of splitBlanks(c.text)) if (s.kind === 'blank' && !fills[blankKey(id, s.index)]?.trim()) n++;
  }
  return n;
}

export interface BlankField {
  key: string;
  kind: BlankKind;
  /** 빈칸 앞 문장 끝부분 (어느 칸인지 알아보게) */
  label: string;
  original: string;
}

/** 라벨 안에서 앞쪽 빈칸 자리 표시 */
const PRIOR_BLANK = '○○';
const LABEL_MAX = 16;

/**
 * 4단계 빈칸 입력 목록: 문장 순서대로, 칸마다 그 칸 앞 문장 끝부분(최대 16자, 앞 빈칸은 ○○)을 라벨로.
 * 같은 값도 묶지 않는다 (문장마다 뜻이 다를 수 있어서)
 */
export function collectBlanks(items: Array<{ id: string; text: string }>): BlankField[] {
  const out: BlankField[] = [];
  for (const { id, text } of items) {
    let before = '';
    for (const s of splitBlanks(text)) {
      if (s.kind === 'text') {
        before += s.text;
        continue;
      }
      const tail = before.replace(/^\s*(\d+\.|\*)\s*/, '').replace(/\s+/g, ' ').trim();
      out.push({ key: blankKey(id, s.index), kind: s.blank, label: tail.length > LABEL_MAX ? `…${tail.slice(-LABEL_MAX)}` : tail, original: s.original });
      before += PRIOR_BLANK;
    }
  }
  return out;
}

// ── 복사 문구 ────────────────────────────────────────────────

export const END_MARK = '----이하여백----';
export const ATTACHED_MARK = '---- 이어서 별지기재 ----';

/** 고른 특약을 엑셀 순서로 → 직접 쓴 특약을 뒤에 → 1. 2. 3. 번호 → 끝에 이하여백 (별지로 이어 쓰면 맨 위에 별지기재) */
export function buildCopyText(
  data: TermsData,
  input: { selected: string[]; fills: Record<string, string>; custom: string[]; attached: boolean },
): string {
  const order = new Map(data.clauses.map((c, i) => [c.id, i]));
  const lines = input.selected
    .filter((id) => order.has(id))
    .sort((a, b) => order.get(a)! - order.get(b)!)
    .map((id) => {
      const c = data.clauses[order.get(id)!];
      return fillClause(id, c.text, input.fills);
    })
    .concat(input.custom.map((t) => t.trim()).filter(Boolean));
  const body = lines.map((l, i) => `${i + 1}. ${l}`);
  return [...(input.attached ? [ATTACHED_MARK] : []), ...body, END_MARK].join('\n');
}

// ── 가계약 문자 ──────────────────────────────────────────────

/** 엑셀 가계약 필수 특약 중 이 유형에 쓰는 줄 (3단계에서 골라 넣는 후보, 미리 담지 않음) */
export function provisionalItems(data: TermsData, type: TermType): Array<{ id: string; text: string }> {
  const section = type.trade === '전세' ? '임대차' : '매매';
  return data.provisional
    .map((p, i) => ({ ...p, id: `pv-${i}` }))
    .filter((p) => p.section === section && (p.types === 'ALL' || p.types.includes(type.code)))
    .map(({ id, text }) => ({ id, text }));
}

/** 가계약 틀 한 줄의 빈칸 키 */
export const templateLineId = (i: number) => `tpl-${i}`;
export const ADDRESS_TOKEN = '{address}';
export const TERMS_TOKEN = '{terms}';
/** 주소를 안 넣었을 때 문자에 남기는 빈칸 */
export const ADDRESS_BLANK = '(                    )';

/** 틀의 빈칸(주소·특약 자리 표시는 제외) — 4단계 입력 목록용 */
export function templateBlankItems(template: readonly string[]): Array<{ id: string; text: string }> {
  return template.map((text, i) => ({ id: templateLineId(i), text: text.replace(ADDRESS_TOKEN, '').replace(TERMS_TOKEN, '') }));
}

/**
 * 가계약 문자 (대표님 틀, 2026-10-25): 틀 줄마다 빈칸을 채우고, {address}는 붙여 넣은 등기부 소재지(없으면 빈칸),
 * {terms} 자리에는 고른 특약이 있을 때만 [특약] + 번호 목록
 */
export function buildProvisionalText(input: {
  template: readonly string[];
  address: string;
  terms: string[];
  fills: Record<string, string>;
  termsHeader: string;
}): string {
  const out: string[] = [];
  input.template.forEach((line, i) => {
    if (line === TERMS_TOKEN) {
      const ts = input.terms.map((x) => x.trim()).filter(Boolean);
      if (ts.length) out.push('', input.termsHeader, ...ts.map((x, j) => `${j + 1}. ${x}`));
      return;
    }
    const filled = fillClause(templateLineId(i), line.replace(ADDRESS_TOKEN, ''), input.fills);
    out.push(line.includes(ADDRESS_TOKEN) ? filled + (input.address.trim() || ADDRESS_BLANK) : filled);
  });
  return out.join('\n');
}
