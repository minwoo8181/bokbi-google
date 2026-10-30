/**
 * 사무소 위치 지도 (VWorld 정적 지도 이미지)
 * - 이미지 주소에 키가 들어가므로 브라우저에서 직접 부르지 않고 서버(/api/office-map)가 대신 받아 전달
 * - 화면은 좌표가 아니라 등록번호만 넘긴다. 서버가 명단 주소를 그때그때 VWorld 지오코더로 변환
 *   (VWorld 약관: 지오코딩 결과는 실시간으로만 쓰고 저장 금지, 하루 40,000건). 명단에 있는 사무소만 그려지므로 키 남용 통로도 없음
 * - 변환 결과도 다산동 일대 좌표만 허용, 크기·줌 고정
 * 확인 (2026-10-25): 다산중앙로82번안길 132-22 → x 127.16542, y 37.61182, 줌 17 이미지 정상
 */

/** 다산동 일대 (남양주 다산신도시 + 주변 여유) */
export const DASAN_BOUNDS = { minX: 127.12, maxX: 127.21, minY: 37.58, maxY: 37.66 };

export const OFFICE_MAP = { zoom: 17, width: 640, height: 320 } as const;

export type OfficePoint = { x: number; y: number };

export function parseOfficePoint(xRaw: unknown, yRaw: unknown): OfficePoint | null {
  if (xRaw === null || xRaw === undefined || yRaw === null || yRaw === undefined || xRaw === '' || yRaw === '') return null;
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const b = DASAN_BOUNDS;
  if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) return null;
  return { x, y };
}

/**
 * 명단 주소 → 지오코더에 넣을 주소. 도로명은 "시군구 + 도로명 + 건물번호"까지만 (호수·괄호 설명 제거)
 * 예: "경기도 남양주시 다산중앙로82번길 13 103호" → { type: 'ROAD', address: "경기도 남양주시 다산중앙로82번길 13" }
 * 도로명을 못 찾으면 지번 주소로 보고 괄호만 떼어 PARCEL로
 */
export function geocodeQuery(address: string): { type: 'ROAD' | 'PARCEL'; address: string } | null {
  const clean = address.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const road = clean.match(/^(.*?\S(?:로|길)\s?\d+(?:-\d+)?)(?=\s|,|$)/);
  if (road) return { type: 'ROAD', address: road[1].trim() };
  return { type: 'PARCEL', address: clean };
}

export function vworldGeocodeUrl(q: { type: 'ROAD' | 'PARCEL'; address: string }, key: string): string {
  const p = new URLSearchParams({
    service: 'address',
    request: 'getcoord',
    version: '2.0',
    crs: 'epsg:4326',
    type: q.type,
    address: q.address,
    format: 'json',
    refine: 'false',
    simple: 'true',
    key,
  });
  return `https://api.vworld.kr/req/address?${p}`;
}

/** 지오코더 응답에서 다산동 일대 좌표만 꺼낸다 (status OK가 아니거나 범위 밖이면 null) */
export function parseGeocodeResponse(json: unknown): OfficePoint | null {
  const r = (json as { response?: { status?: string; result?: { point?: { x?: unknown; y?: unknown } } } } | null)?.response;
  if (r?.status !== 'OK') return null;
  return parseOfficePoint(r.result?.point?.x, r.result?.point?.y);
}

export function vworldStaticMapUrl(p: OfficePoint, key: string): string {
  const q = new URLSearchParams({
    service: 'image',
    request: 'getmap',
    key,
    format: 'png',
    basemap: 'GRAPHIC',
    center: `${p.x},${p.y}`,
    crs: 'epsg:4326',
    zoom: String(OFFICE_MAP.zoom),
    size: `${OFFICE_MAP.width},${OFFICE_MAP.height}`,
    marker: `point:${p.x} ${p.y}`,
  });
  return `https://api.vworld.kr/req/image?${q}`;
}

/** 화면에서 부르는 우리 서버 주소 (키·좌표 없음, 등록번호만) */
export function officeMapSrc(regNo: string): string {
  return `/api/office-map?office=${encodeURIComponent(regNo)}`;
}
