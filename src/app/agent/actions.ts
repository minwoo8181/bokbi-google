'use server';

/**
 * 요청 보낼 때 단지 ↔ 사무소 거리 구간 (대표님 2026-10-29). 명단 주소·단지 지번 → VWorld 지오코딩(그때그때) → 직선거리 → 구간 이름만 돌려준다.
 * 좌표·정확한 거리는 저장하지도, 화면으로 보내지도 않는다 (VWorld 좌표 저장 금지, 사무소 식별 방지). 키가 없거나 실패하면 null → 칩 없음
 */
import registryJson from '@/data/brokers/dasan-offices.json';
import market from '@/data/market/dasan-market.json';
import { type BrokerRegistryEntry, normalizeRegNo } from '@/lib/broker/registry';
import { geocodeQuery, parseGeocodeResponse, vworldGeocodeUrl } from '@/lib/requests/officeMap';
import { complexParcelQuery } from '@/lib/geo/complexLocation';
import { type DistanceBand, distanceBand, haversineKm } from '@/lib/geo/distance';

const byRegNo = new Map((registryJson.offices as BrokerRegistryEntry[]).map((e) => [normalizeRegNo(e.regNo), e]));
const lotsById = new Map((market.complexes as unknown as { id: number | string; lots?: string[] }[]).map((c) => [String(c.id), c.lots]));

/** 요청 보내기를 오래 붙잡지 않게: 이 시간 안에 못 받으면 칩 없이 보낸다 (e2e에서 VWorld가 늦어 시트가 안 닫힌 적 있음, 2026-10-29) */
const GEOCODE_TIMEOUT_MS = 2500;

async function geocode(q: { type: 'ROAD' | 'PARCEL'; address: string }, key: string) {
  const res = await fetch(vworldGeocodeUrl(q, key), { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) });
  return res.ok ? parseGeocodeResponse(await res.json().catch(() => null)) : null;
}

export async function offerDistanceBand(input: { regNo: string; aptId: string | null }): Promise<DistanceBand | null> {
  const key = process.env.V_WORLD_MAP_API_KEY;
  if (!key || !input.aptId) return null;
  const office = byRegNo.get(normalizeRegNo(String(input.regNo).slice(0, 40)));
  const officeQ = office ? geocodeQuery(office.address) : null;
  const complexQ = complexParcelQuery(lotsById.get(String(input.aptId)));
  if (!officeQ || !complexQ) return null;
  try {
    const [a, b] = await Promise.all([geocode(officeQ, key), geocode(complexQ, key)]);
    return a && b ? distanceBand(haversineKm(a, b)) : null;
  } catch (e) {
    console.error('[offer-distance]', e instanceof Error ? e.message : String(e));
    return null;
  }
}
