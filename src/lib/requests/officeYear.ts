/**
 * 중개사무소 개설등록 연도 (등록번호에서 계산, 검증된 숫자)
 *
 * 등록번호 형식 (data/brokers/다산동 부동산_20261024.xls, 336곳):
 * - 신형 `41360-2021-60064` → 2021
 * - 구형 `41360-09-…` (두 자리 연도) → 2009
 * - 그 밖의 형식(`41360-0077-…` 등 약 5곳)은 확인 불가 → null (화면에 표시하지 않음)
 *
 * "경력"이 아니라 "이 사무소를 연 해"다. 대표가 사무소를 옮겨 다시 개설하면 연도가 바뀐다.
 */
export function officeOpenYear(registrationNo: string, currentYear: number): number | null {
  const parts = registrationNo.trim().split('-');
  if (parts.length < 3) return null;
  const y = parts[1];
  let year: number | null = null;
  if (/^(19|20)\d{2}$/.test(y)) year = Number(y);
  else if (/^\d{2}$/.test(y)) year = 2000 + Number(y);
  if (year === null || year < 1984 || year > currentYear) return null; // 1984 공인중개사 제도 도입
  return year;
}
