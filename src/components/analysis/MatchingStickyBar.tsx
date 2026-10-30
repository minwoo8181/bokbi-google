'use client';

import React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { formatWon } from '@/lib/utils';
import { SITE_CONTENT } from '@/config/siteContent';

interface MatchingStickyBarProps {
  /** 법정 상한 (원) — 취소선 기준점 */
  legalMaxWon: number;
  savedWon: number;
  totalCommissionWon: number;
  onOpenModal: () => void;
}

/**
 * 하단 고정 CTA (B안, 대표님 확정 2026-10-23): 법정 상한 취소선 → 내 복비 대비로 할인을 바로 체감하게 한다
 * (기준점 효과·손실 회피, RULES 행동경제학 2). 평형·층은 화면 위 칩에 있어 바에서 뺐다 (360px 잘림 해결)
 */
export default function MatchingStickyBar({
  legalMaxWon,
  savedWon,
  totalCommissionWon,
  onOpenModal,
}: MatchingStickyBarProps) {
  const { stickyBar } = SITE_CONTENT.analysis;
  // "약 ○○ 절약"은 어림값이라 만 원 단위로 내림 (정확한 금액은 복비 카드에). 360px에서 CTA가 넘치지 않게 한다
  const savedApprox = formatWon(Math.floor(savedWon / 10000) * 10000);
  // 할인율은 복비 카드 "{rate}%↓"와 같은 반올림 (CommissionCustomizerCard)
  const discountRate = legalMaxWon > 0 ? Math.round((savedWon / legalMaxWon) * 100) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-border-default z-40 shadow-[0_-6px_24px_rgba(0,0,0,0.08)]">
      {/* ── CTA 바로 윗부분: 개인정보 안심 가드레일 ── */}
      <div className="bg-brand-light border-b border-brand-light py-2 px-4 text-center">
        <div className="max-w-[440px] mx-auto flex items-center justify-center gap-2 text-[12px] font-extrabold text-brand-hover tracking-tight">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-hover flex-shrink-0" aria-hidden />
          <span>{stickyBar.securityGuarantee}</span>
        </div>
      </div>

      {/* ── 메인 바 액션 ── */}
      <div className="py-3 px-4 sm:px-5">
        <div className="max-w-[440px] mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-text-tertiary flex items-center gap-1 truncate tabular-nums">
              {/* 360px 같은 좁은 폭에선 라벨을 숨겨 금액·할인율이 잘리지 않게 (빨간 취소선이 "원래 값"을 말해 줌) */}
              <span className={savedWon > 0 ? 'max-[374px]:hidden' : ''}>{stickyBar.legalMaxLabel}</span>
              {/* 앵커링 (대표님 2026-10-29): 글씨는 회색 그대로, 취소선과 옆 할인율은 빨강 — "빨강은 할 일만" 규칙의 예외로 대표님이 정함 */}
              {savedWon > 0 ? (
                <>
                  <s className="text-text-tertiary decoration-[var(--status-risk-strong)] decoration-2">{formatWon(legalMaxWon)}</s>
                  <span className="font-bold text-[var(--status-risk-strong)]">{stickyBar.discountRate.replace('{rate}', String(discountRate))}</span>
                </>
              ) : (
                <span>{stickyBar.legalMaxSameText}</span>
              )}
            </div>
            <div className="text-[17px] sm:text-[17px] font-extrabold text-text-primary truncate tabular-nums">
              {formatWon(totalCommissionWon)}
            </div>
          </div>

          {/* 핵심 CTA 버튼 (직관적 절약 혜택 반영) */}
          <button
            type="button"
            data-testid="matching-sticky-cta"
            onClick={onOpenModal}
            className="h-12 px-4 sm:px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-extrabold text-[13px] sm:text-[15px] flex items-center justify-center gap-1 shadow-md shadow-brand-glow active:scale-95 transition-all flex-shrink-0 whitespace-nowrap"
          >
            {savedWon > 0 ? (
              <span>{stickyBar.ctaWithSavingsText.replace('{amount}', savedApprox)}</span>
            ) : (
              <span>{stickyBar.ctaDefaultText}</span>
            )}
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
