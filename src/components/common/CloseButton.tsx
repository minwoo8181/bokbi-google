'use client';

import React from 'react';
import { X } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';

/**
 * 모든 시트·창의 오른쪽 위 닫기 X (대표님 2026-10-27: 닫기는 X 하나로 통일, 눈에 잘 띄게 진하게).
 * 누르는 영역 44px + 얇은 테두리 회색 동그라미 + 진한 검정 굵은 X. 색(파랑·빨강)은 주 버튼보다 튀지 않게 쓰지 않는다.
 * ActionSheet·매칭 요청 창·주민 투표 창이 함께 쓴다
 */
export default function CloseButton({ onClick, testId, className = '' }: { onClick: () => void; testId?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={SITE_CONTENT.common.close}
      data-testid={testId}
      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-96 transition-transform duration-fast ease-out-soft ${className}`}
    >
      <span className="w-8 h-8 rounded-full bg-surface-subtle border border-border-default flex items-center justify-center text-text-primary">
        <X className="w-[18px] h-[18px]" strokeWidth={2.5} aria-hidden />
      </span>
    </button>
  );
}
