/**
 * 매칭 모달 요청서 문구 계산 — 입주 시기, 옵션 요약, 접수 일시·번호
 */

export type MoveInType = 'IMMEDIATE' | 'NEGOTIABLE' | 'DATE';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-12-01' → '2026년 12월 1일 (화)'. 형식이 다르면 받은 그대로 */
export function formatMoveInDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const day = DAYS[new Date(y, m - 1, d).getDay()];
    if (day) return `${y}년 ${m}월 ${d}일 (${day})`;
  }
  return dateStr;
}

/** 요청서에 남기는 입주 시기 문구 */
export function moveInLabel(type: MoveInType, date: string): string {
  if (type === 'DATE' && date) return formatMoveInDateWithDay(date);
  return type === 'IMMEDIATE' ? '즉시 입주' : '입주 협의';
}

/** 선택한 옵션 요약: '시스템에어컨(3대), 중문, 붙박이장, 자유 메모' */
export function optionsSummary(o: {
  hasAircon: boolean;
  airconCount: string;
  hasMidDoor: boolean;
  hasCloset: boolean;
  customOptionMemo: string;
}): string {
  const opts: string[] = [];
  if (o.hasAircon) opts.push(`시스템에어컨(${o.airconCount})`);
  if (o.hasMidDoor) opts.push('중문');
  if (o.hasCloset) opts.push('붙박이장');
  if (o.customOptionMemo.trim()) opts.push(o.customOptionMemo.trim());
  return opts.join(', ');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 접수 일시 (기기 시각): '2026.10.26 14:05' */
export function submittedAtLabel(now: Date): string {
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** 끝 4자리 글자: 헷갈리는 0·O·1·I·L 제외 */
const SUFFIX_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** 0 이상 1 미만 난수. 브라우저는 crypto, 없으면 Math.random */
const defaultRandom = () =>
  typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
    : Math.random();

/** 브라우저 요청서 번호 'BK-20261027-7Q3M' (UTC 날짜 + 무작위 4자리, 예전엔 늘 -9842). supabase 모드에서는 서버 id로 바뀐다 */
export function localRequestNumber(now: Date, random: () => number = defaultRandom): string {
  const suffix = Array.from({ length: 4 }, () => SUFFIX_CHARS[Math.floor(random() * SUFFIX_CHARS.length)]).join('');
  return `BK-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
}
