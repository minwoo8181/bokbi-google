import { notFound, redirect } from 'next/navigation';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import market from '@/data/market/dasan-market.json';
import offices from '@/data/brokers/dasan-offices.json';
import AdminConsole from '@/components/admin/AdminConsole';
import AdminMfa from '@/components/admin/AdminMfa';
import { ADMIN_TABS, type AdminTab, type MarketBase } from '@/components/admin/adminTabs';
import { freshness } from '@/lib/admin/dataFreshness';
import { keyStatus } from '@/lib/admin/keys';
import { LOGIN_PATH } from '@/lib/auth/routes';
import { supabaseEnv } from '@/lib/supabase/env';
import { currentAdminGate } from './adminGate';

export const dynamic = 'force-dynamic';

/** 예전 주소 (?tab=reports → 의뢰 탭) */
const LEGACY_TAB: Record<string, AdminTab> = { reports: 'requests' };

/** data/market 아래 폴더의 파일 이름만 (내용은 읽지 않음) */
function fileNames(dir: string): string[] {
  try {
    return readdirSync(path.join(process.cwd(), 'data', 'market', dir));
  } catch {
    return [];
  }
}

/** 개발 미리보기: 브라우저 저장소 단계에서 ?mfa=ENROLL|VERIFY로 2단계 인증 화면 보기 */
const MFA_PREVIEW = ['ENROLL', 'VERIFY'] as const;

/**
 * 관리자 콘솔. 관문(A5): 로그인 → 관리자 계정 → 인증 앱 등록 → 6자리. 관리자가 아니면 404, 목업 단계 배포 빌드도 404.
 * 키는 있는지만(값은 서버 밖으로 안 나감), 데이터 날짜는 파일 이름으로, 다산동 사무소·단지 수는 정적 데이터에서 서버가 세어 넘긴다
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; mfa?: string }> }) {
  const gate = await currentAdminGate();
  if (gate === 'NOT_FOUND') notFound();
  if (gate === 'LOGIN') redirect(`${LOGIN_PATH}?next=${encodeURIComponent('/admin')}`);
  if (gate === 'ENROLL' || gate === 'VERIFY') return <AdminMfa step={gate} />;
  const { tab, mfa } = await searchParams;
  const preview = MFA_PREVIEW.find((s) => s === mfa);
  if (preview && !supabaseEnv()) return <AdminMfa step={preview} preview />;
  const now = new Date();
  const rows = freshness(
    { observedAt: market.meta.observedAt, naver: fileNames('naver'), trades: fileNames('trades'), index: fileNames('index'), units: fileNames('units') },
    now,
  );
  const base: MarketBase = {
    totalOffices: offices.offices.length,
    totalComplexes: market.complexes.length,
    trades: market.meta.counts.validTrades ?? 0,
    saleListings: market.meta.counts.saleListings ?? 0,
    jeonseListings: market.meta.counts.jeonseListings ?? 0,
    observedAt: market.meta.observedAt,
  };
  const initial = ADMIN_TABS.includes(tab as AdminTab) ? (tab as AdminTab) : (LEGACY_TAB[tab ?? ''] ?? 'today');
  return <AdminConsole initialTab={initial} keys={keyStatus(process.env)} freshness={rows} base={base} />;
}
