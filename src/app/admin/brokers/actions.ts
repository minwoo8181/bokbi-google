'use server';

/**
 * 관리자 확인 전화용 명단 정보 (대표자·전화 포함). 관리자 화면과 같은 관문(A5)을 통과해야 준다 — 목업 단계 배포 빌드는 막힘
 */
import registryJson from '@/data/brokers/dasan-offices.json';
import { type BrokerRegistryEntry, normalizeRegNo } from '@/lib/broker/registry';
import { currentAdminGate } from '../adminGate';

const registry = registryJson.offices as BrokerRegistryEntry[];

export type AdminCallInfo = Pick<BrokerRegistryEntry, 'regNo' | 'ceo' | 'office' | 'address' | 'phone' | 'altPhones' | 'phoneSource' | 'openYear'>;

export async function getAdminCallInfo(regNo: string): Promise<AdminCallInfo | null> {
  if ((await currentAdminGate()) !== 'OPEN') return null;
  const e = registry.find((x) => normalizeRegNo(x.regNo) === normalizeRegNo(String(regNo ?? '')));
  if (!e) return null;
  return { regNo: e.regNo, ceo: e.ceo, office: e.office, address: e.address, phone: e.phone, altPhones: e.altPhones, phoneSource: e.phoneSource, openYear: e.openYear };
}
