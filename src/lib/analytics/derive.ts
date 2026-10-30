/**
 * 화면 값 → 행동 기록 칸 (결정론·순수 함수). 화면은 원래 값을 넘기고, 여기서 구간·종류로만 바꾼다 (개인정보 없이)
 */
import type { DEVICES, PAGES } from './events';

export type PageKind = (typeof PAGES)[number];
export type DeviceKind = (typeof DEVICES)[number];

/** 주소 → 화면 종류. 관리자 화면은 null (기록하지 않음) */
export function pageOf(pathname: string): PageKind | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/admin' || p.startsWith('/admin/')) return null;
  if (p === '/') return 'HOME';
  if (p.startsWith('/analysis/')) return 'ANALYSIS';
  if (p === '/my-requests') return 'MY_REQUESTS';
  if (p === '/my-info') return 'MY_INFO';
  if (p === '/login') return 'LOGIN';
  if (p === '/agent/register') return 'AGENT_REGISTER';
  if (p === '/agent/terms') return 'AGENT_TERMS';
  if (p === '/agent') return 'AGENT';
  return 'OTHER';
}

/** 중개사 화면이면 중개사, 나머지는 집주인 쪽 기록 */
export const pageRole = (page: PageKind): 'owner' | 'broker' => (page.startsWith('AGENT') ? 'broker' : 'owner');

/** 화면 폭(CSS px) → 기기. 태블릿 768부터, PC 1024부터 (Tailwind md·lg와 같은 경계) */
export function deviceOf(widthPx: number): DeviceKind {
  if (widthPx >= 1024) return 'DESKTOP';
  if (widthPx >= 768) return 'TABLET';
  return 'PHONE';
}

/** 희망가(만 원) → 억 원 구간 (아래 경계 포함) */
export function priceBand(manwon: number): 'UNDER_3' | '3_TO_6' | '6_TO_9' | '9_TO_12' | 'OVER_12' {
  const eok = manwon / 10_000;
  if (eok < 3) return 'UNDER_3';
  if (eok < 6) return '3_TO_6';
  if (eok < 9) return '6_TO_9';
  if (eok < 12) return '9_TO_12';
  return 'OVER_12';
}

/** 법정 상한 대비 낮춘 비율 (%, 소수 첫째 자리, 0~100). 상한을 모르면 null */
export function discountPctOf(feeWon: number, legalMaxWon: number): number | null {
  if (!(legalMaxWon > 0) || !Number.isFinite(feeWon)) return null;
  const pct = (1 - feeWon / legalMaxWon) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10;
}

/** 두 시각 사이 시간 (시간, 소수 첫째 자리, 음수면 0). 시작을 모르면 null */
export function hoursSince(fromIso: string | null | undefined, to: Date): number | null {
  if (!fromIso) return null;
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return null;
  return Math.round(Math.max(0, to.getTime() - t) / 360_000) / 10;
}

/** 법정 상한 대비 아낀 복비 (만 원, 반올림, 0 이상) */
export const savedManwonOf = (legalMaxWon: number, feeWon: number): number => Math.max(0, Math.round((legalMaxWon - feeWon) / 10_000));
