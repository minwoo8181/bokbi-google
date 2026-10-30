/** 관리자 탭·서버가 넘기는 값의 모양 (서버 page와 클라이언트 콘솔이 같이 씀 — 'use client' 파일의 값은 서버에서 못 읽어서 따로 둠) */
export type AdminTab = 'today' | 'brokers' | 'requests' | 'metrics' | 'system';
export const ADMIN_TABS: AdminTab[] = ['today', 'brokers', 'requests', 'metrics', 'system'];

/** 서버가 정적 데이터에서 세어 넘기는 다산동 기준 숫자 (실제 값) */
export interface MarketBase {
  totalOffices: number;
  totalComplexes: number;
  trades: number;
  saleListings: number;
  jeonseListings: number;
  observedAt: string;
}
