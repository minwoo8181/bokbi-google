/**
 * 행동 기록 개인정보 차단 (결정론). 동·호수·전화·이름·주소·이메일은 키 이름으로도, 값 모양으로도 막는다.
 * 단지·평형 id, 금액 구간, 비율·시간 같은 숫자만 남긴다 (설계 5-3)
 */

/** 이런 키 이름은 값과 상관없이 금지 */
const BLOCKED_KEY = /(dong|^ho$|unit|phone|tel|mobile|name|address|addr|contact|email|memo|note|text)/i;

/** 값 모양: 휴대폰·일반 전화, 동·호, 도로명·지번 주소, 이메일 */
const BLOCKED_VALUE: RegExp[] = [
  /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/,
  /0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}/,
  /\d+\s*동\s*\d+\s*호/,
  /\d{2,4}\s*호/,
  /\d+\s*동(?=\s|$)/,
  /[가-힣]+(로|길)\s*\d+/,
  /\d+(-\d+)?\s*번지/,
  /[^\s@]+@[^\s@]+\.[^\s@]+/,
];

/** 걸린 키 목록 (없으면 빈 배열) */
export function findPii(props: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const [k, v] of Object.entries(props)) {
    if (BLOCKED_KEY.test(k)) hits.push(k);
    else if (typeof v === 'string' && BLOCKED_VALUE.some((re) => re.test(v))) hits.push(k);
  }
  return hits;
}
