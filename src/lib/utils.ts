import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 만원 단위 숫자를 '9억 5,000만 원' 형태로 포맷팅
 */
export function formatPriceTenThousand(tenThousand: number): string {
  if (tenThousand <= 0) return "0원";
  const eok = Math.floor(tenThousand / 10000);
  const remainder = tenThousand % 10000;

  if (eok > 0 && remainder > 0) {
    return `${eok}억 ${remainder.toLocaleString()}만 원`;
  } else if (eok > 0) {
    return `${eok}억 원`;
  } else {
    return `${remainder.toLocaleString()}만 원`;
  }
}

/**
 * 원 단위 숫자를 한국 통화 단위로 포맷팅 (e.g. 2,375,000원 -> 237만 5,000원 또는 237.5만 원)
 */
export function formatWon(won: number): string {
  if (won <= 0) return "0원";
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const man = Math.round((won % 100000000) / 10000);
    if (man > 0) return `${eok}억 ${man.toLocaleString()}만 원`;
    return `${eok}억 원`;
  }
  if (won >= 10000) {
    // 1억 미만(복비 금액대)은 반올림하지 않는다 — 법정 상한 775만 5,000원을 776만 원으로 올려 보이면 상한을 넘겨 표시하게 된다
    const man = Math.floor(won / 10000);
    const rest = Math.round(won % 10000);
    return rest > 0 ? `${man.toLocaleString()}만 ${rest.toLocaleString()}원` : `${man.toLocaleString()}만 원`;
  }
  return `${won.toLocaleString()}원`;
}

/**
 * 정확한 원 단위 콤마 포맷 (e.g. 2,375,000원)
 */
export function formatExactWon(won: number): string {
  return `${Math.round(won).toLocaleString()}원`;
}

/**
 * 요율 포맷 (e.g. 0.25 -> 0.25%)
 */
export function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * 첫 수락 시각(first_accepted_at)으로부터 24시간 남은 시간 계산
 */
export function calculateRemainingSeconds(firstAcceptedAtIso: string | null | undefined): {
  remainingSeconds: number;
  formatted: string;
  isExpired: boolean;
} {
  if (!firstAcceptedAtIso) {
    return { remainingSeconds: 86400, formatted: "24시간 00분 00초", isExpired: false };
  }

  const acceptedTime = new Date(firstAcceptedAtIso).getTime();
  const deadline = acceptedTime + 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { remainingSeconds: 0, formatted: "24시간 초과 (만료)", isExpired: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(seconds).padStart(2, '0')}초`;
  return { remainingSeconds: totalSeconds, formatted, isExpired: false };
}
