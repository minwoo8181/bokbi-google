'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, FileText, Lock } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import LegalText, { LegalBlocks, hasPendingCompanyFields } from '@/components/common/LegalText';

export type LegalTabType = 'terms' | 'privacy' | 'disclaimer';
export const LEGAL_TABS: readonly LegalTabType[] = ['terms', 'privacy', 'disclaimer'];

interface LegalPolicyModalProps {
  isOpen: boolean;
  initialTab?: LegalTabType;
  onClose: () => void;
  /** 탭을 바꿀 때 주소(?legal=)도 맞추기 위해 부모에 알린다 */
  onChangeTab?: (tab: LegalTabType) => void;
}

export default function LegalPolicyModal({
  isOpen,
  initialTab = 'terms',
  onClose,
  onChangeTab,
}: LegalPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);

  // 모달은 항상 마운트되어 있으므로, 열릴 때마다 요청된 탭으로 맞춘다
  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const { legal } = SITE_CONTENT;
  const ui = legal.modal;
  const currentPolicy =
    activeTab === 'terms'
      ? legal.termsOfService
      : activeTab === 'privacy'
      ? legal.privacyPolicy
      : legal.disclaimerPolicy;

  const selectTab = (tab: LegalTabType) => {
    setActiveTab(tab);
    onChangeTab?.(tab);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      {/* 바텀시트 / 모달 컨테이너 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={currentPolicy.title}
        className="w-full max-w-lg bg-surface-card rounded-t-3xl sm:rounded-3xl max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden border border-border-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 pt-5 pb-3 border-b border-border-default flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {activeTab === 'terms' && <FileText className="w-5 h-5 text-brand flex-shrink-0" aria-hidden />}
            {activeTab === 'privacy' && <Lock className="w-5 h-5 text-brand flex-shrink-0" aria-hidden />}
            {activeTab === 'disclaimer' && <ShieldAlert className="w-5 h-5 text-status-caution flex-shrink-0" aria-hidden />}
            <div className="min-w-0">
              <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight break-keep">{currentPolicy.title}</h2>
              <span className="text-[12px] font-medium text-text-tertiary">
                {ui.effectiveDatePrefix}: {currentPolicy.lastUpdated}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-surface-subtle border border-border-default hover:bg-border-light flex items-center justify-center text-text-primary transition-colors cursor-pointer flex-shrink-0"
            aria-label={ui.closeAriaLabel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3단 탭 네비게이션 */}
        <div role="tablist" className="flex border-b border-border-default bg-surface-subtle px-3 pt-2 gap-1 flex-shrink-0">
          {LEGAL_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTab(tab)}
                className={`flex-1 min-h-11 px-1 text-[12px] font-extrabold rounded-t-xl transition-all cursor-pointer break-keep ${
                  isActive ? 'bg-surface-card text-brand border-t-2 border-brand shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {ui.tabs[tab]}
              </button>
            );
          })}
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5 text-text-secondary text-[13px] leading-relaxed">
          {/* 배포 전 초안 고지 (교체할 값이 남아 있는 동안) */}
          {hasPendingCompanyFields && (
            <p className="px-3 py-2 rounded-lg bg-status-risk-light text-[var(--status-risk-strong)] text-[12px] font-bold break-keep">{ui.draftNotice}</p>
          )}

          {/* 공인중개사법상 지위 안내 배너 */}
          {activeTab === 'disclaimer' && (
            <div className="p-4 rounded-xl bg-status-caution-light border border-status-caution-line text-text-primary text-[12px] leading-snug flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-status-caution flex-shrink-0 mt-1" aria-hidden />
              <div className="break-keep">
                <strong className="font-extrabold">{ui.disclaimerBannerTitle}</strong>
                <p className="mt-1">
                  <LegalText text={ui.disclaimerBannerBody} />
                </p>
              </div>
            </div>
          )}

          {/* 조항별 렌더링 */}
          {currentPolicy.sections.map((section, idx) => (
            <section key={idx} className="space-y-2 border-b border-border-light pb-4 last:border-b-0">
              <h3 className="font-extrabold text-[15px] text-text-primary break-keep">{section.heading}</h3>
              <div className="text-[13px] leading-relaxed">
                <LegalBlocks blocks={section.blocks} />
              </div>
            </section>
          ))}
        </div>

        {/* 하단 닫기 CTA */}
        <div className="p-4 border-t border-border-default bg-surface-card flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-12 rounded-xl bg-brand hover:bg-brand-hover text-white font-extrabold text-[15px] transition-all active:scale-98 cursor-pointer shadow-xs"
          >
            {ui.closeButton}
          </button>
        </div>
      </div>
    </div>
  );
}
