import React from 'react';

/**
 * 복비 로고 = 한 지붕 ㅂㅂ (대표님 2026-10-28, 시안 16번 파랑): 지붕 하나 아래 "복비" 초성 ㅂ 두 채.
 * 파란 칸 + 흰 선. 색은 브랜드 토큰(--brand-primary)을 따른다. 파비콘은 src/app/icon.svg (같은 모양, 선만 굵게)
 */
export default function BrandLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <rect width="48" height="48" rx="12" style={{ fill: 'var(--brand-primary)' }} />
      <path
        d="M8 21 24 9 40 21M11 24v12h9.5V24M11 30h9.5M27.5 24v12H37V24M27.5 30H37"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
