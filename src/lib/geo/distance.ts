/**
 * 익명 카드 거리 구간 (대표님 2026-10-29 A안). 결정론 — 같은 좌표면 늘 같은 구간.
 * - 직선거리: 하버사인 공식 (지구 반지름 6,371km). 걸어서 걸리는 거리가 아니라서 화면엔 "n m·km 안"으로만
 * - 구간: 0.5km 이하 / 1km 이하 / 2km 이하 / 그 밖. 정확한 거리·좌표는 화면으로 보내지 않는다 (사무소 식별 방지, VWorld 좌표 저장 금지)
 */
export type GeoPoint = { x: number; y: number };
export type DistanceBand = 'M500' | 'KM1' | 'KM2' | 'FAR';

const EARTH_RADIUS_KM = 6371;
/** 구간 경계 (km, 이하) */
export const DISTANCE_BAND_KM = [0.5, 1, 2] as const;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표(x = 경도, y = 위도) 사이 직선거리 (km) */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.y - a.y);
  const dLon = rad(b.x - a.x);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.y)) * Math.cos(rad(b.y)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceBand(km: number): DistanceBand | null {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km <= DISTANCE_BAND_KM[0]) return 'M500';
  if (km <= DISTANCE_BAND_KM[1]) return 'KM1';
  if (km <= DISTANCE_BAND_KM[2]) return 'KM2';
  return 'FAR';
}
