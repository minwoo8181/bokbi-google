/** 문구의 {키} 자리표시를 채운다 */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** 'YYYY-MM-DD' → '11월 2일 (월)' */
export function formatDateKo(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${day})`;
}

/** 섹션 제목 옆 개수 칩 (2026-10-27: 색을 줄여 무채색 하나로) */
export const SECTION_COUNT =
  'h-6 min-w-6 px-2 rounded-full bg-surface-card border border-border-default text-text-secondary text-[13px] font-bold inline-flex items-center justify-center tabular-nums';

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
