import type { ComplexUnits, UnitDong } from '@/components/analysis/types';

/**
 * 동·호수 실존 확인 (건축물대장 전유부 기준, 결정론 순수 함수).
 * 등기 소유자 확인이 아니라 "이 단지에 실제로 있는 집인가"만 본다 — 소유자 확인은 매칭 후 중개사 등기 확인(B안).
 */
export type UnitCheck =
  | { status: 'UNKNOWN' } // 이 단지는 건축물대장 데이터가 없음 → 막지 않는다
  | { status: 'EMPTY' }
  | { status: 'NO_DONG' }
  | { status: 'FLOOR_OVER'; dong: UnitDong } // 그 동의 지상 층수보다 높은 호
  | { status: 'NO_HO'; dong: UnitDong }
  | { status: 'OK'; dong: UnitDong; ho: string };

/** '101동', ' 101 ', '제101동' → '101' / '다산엘리시아A동' → '다산엘리시아A' */
export const normalizeDong = (s: string) => s.replace(/\s/g, '').replace(/^제/, '').replace(/동$/, '');
/** '1306호', ' 1306 ' → '1306', 앞자리 0 제거 */
export const normalizeHo = (s: string) => s.replace(/\s/g, '').replace(/호$/, '').replace(/^0+(?=\d)/, '');

/** 이름 없는 단일 건물 단지(동 입력이 필요 없음) */
export const isSingleBuilding = (units: ComplexUnits | null) => !!units && units.dongs.length === 1 && units.dongs[0].name === '';

export function findDong(units: ComplexUnits, dongInput: string): UnitDong | undefined {
  if (isSingleBuilding(units)) return units.dongs[0];
  const key = normalizeDong(dongInput);
  return key ? units.dongs.find((d) => normalizeDong(d.name) === key) : undefined;
}

/** 호수 앞자리 = 층 ('1306' → 13, '205' → 2). 숫자가 아니면 null */
export const floorOfHo = (ho: string) => (/^\d{3,}$/.test(ho) ? Number(ho.slice(0, -2)) : null);

export function checkUnit(units: ComplexUnits | null, dongInput: string, hoInput: string): UnitCheck {
  if (!units || units.dongs.length === 0) return { status: 'UNKNOWN' };
  const ho = normalizeHo(hoInput);
  if ((!isSingleBuilding(units) && !normalizeDong(dongInput)) || !ho) return { status: 'EMPTY' };
  const dong = findDong(units, dongInput);
  if (!dong) return { status: 'NO_DONG' };
  if (dong.hos.includes(ho)) return { status: 'OK', dong, ho };
  const floor = floorOfHo(ho);
  if (floor !== null && dong.floors > 0 && floor > dong.floors) return { status: 'FLOOR_OVER', dong };
  return { status: 'NO_HO', dong };
}
