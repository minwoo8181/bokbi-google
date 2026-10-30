/**
 * 단지 위치 질의: 국토부 실거래의 지번(dasan-market.json complexes[id].lots)으로 VWorld 지번(PARCEL) 지오코딩.
 * 지번이 없는 단지는 null → 거리 칩을 그리지 않는다 (추정값 없음)
 */
export const DASAN_PARCEL_PREFIX = '경기도 남양주시 다산동';

export function complexParcelQuery(lots: readonly string[] | undefined): { type: 'PARCEL'; address: string } | null {
  const lot = lots?.find((l) => /^\d+(-\d+)?$/.test(l.trim()))?.trim();
  return lot ? { type: 'PARCEL', address: `${DASAN_PARCEL_PREFIX} ${lot}` } : null;
}
