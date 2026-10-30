import { after } from 'next/server';
import registryJson from '@/data/brokers/dasan-offices.json';
import { recordServerEvent } from '@/lib/analytics/serverStore';
import { type BrokerRegistryEntry, normalizeRegNo } from '@/lib/broker/registry';
import { geocodeQuery, parseGeocodeResponse, vworldGeocodeUrl, vworldStaticMapUrl } from '@/lib/requests/officeMap';

/**
 * 사무소 위치 지도 이미지. VWorld 키를 브라우저에 노출하지 않으려고 서버가 대신 받아 전달한다.
 * 화면은 등록번호만 넘기고, 서버가 명단 주소 → VWorld 지오코더(그때그때, 저장 안 함) → 정적 지도 순으로 만든다.
 * 명단에 있는 다산동 사무소만, 변환 좌표도 다산동 일대만 허용 (src/lib/requests/officeMap.ts)
 *
 * 실패하면 이유를 응답 본문과 Workers 로그(Observability)에 남긴다 (키 값은 남기지 않음).
 * 2026-10-25 배포에서 "map unavailable"만 보여 원인을 구분할 수 없었다
 */
const byRegNo = new Map((registryJson.offices as BrokerRegistryEntry[]).map((e) => [normalizeRegNo(e.regNo), e]));

function fail(status: number, reason: string, detail = '', vworldStatus?: number) {
  console.error('[office-map]', reason, detail);
  // 행동 기록 (A7): VWorld가 실제로 오류를 돌려줬을 때만 (키 없음·주소 없음은 기록 안 함)
  if (vworldStatus !== undefined) after(() => recordServerEvent('external_error', { service: 'VWORLD', status: Math.min(999, Math.max(0, vworldStatus)) }));
  return new Response(`map unavailable: ${reason} ${detail}`.trim(), { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = byRegNo.get(normalizeRegNo(searchParams.get('office') ?? ''));
  if (!entry) return new Response('unknown office', { status: 404 });
  const query = geocodeQuery(entry.address);
  if (!query) return fail(422, 'no address', entry.regNo);

  const key = process.env.V_WORLD_MAP_API_KEY;
  if (!key) return fail(503, 'key missing');

  try {
    const geo = await fetch(vworldGeocodeUrl(query, key));
    const point = geo.ok ? parseGeocodeResponse(await geo.json().catch(() => null)) : null;
    if (!point) return fail(502, 'geocode failed', `${geo.status} ${query.type} ${query.address}`, geo.status);

    const res = await fetch(vworldStaticMapUrl(point, key));
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) {
      const body = (await res.text()).replace(/\s+/g, ' ').slice(0, 300);
      return fail(502, 'vworld image', `${res.status} ${type} ${body}`, res.status);
    }
    return new Response(await res.arrayBuffer(), {
      headers: {
        'content-type': type,
        // 지도 이미지 HTTP 캐시 하루 (좌표를 따로 저장하지는 않음)
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return fail(502, 'fetch failed', e instanceof Error ? e.message : String(e), 0);
  }
}
