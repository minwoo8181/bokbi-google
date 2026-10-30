'use client';

import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';

interface PrecisionUnlockBannerProps {
  onRequestOpenModal: () => void;
}

export default function PrecisionUnlockBanner({ onRequestOpenModal }: PrecisionUnlockBannerProps) {
  const content = SITE_CONTENT.analysis.precisionBanner;

  return (
    <section className="p-4 rounded-2xl bg-gradient-to-r from-brand-light via-brand-light to-brand-subtle border border-brand-line shadow-xs flex items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-brand tracking-tight flex items-center gap-1">
            <span>{content.badge}</span>
          </div>
          <div className="text-[15px] font-extrabold text-text-primary leading-snug mt-1">
            {content.title}
          </div>
          <div className="text-[12px] text-text-tertiary mt-1 leading-snug">
            {content.desc}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRequestOpenModal}
        className="min-h-11 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-[12px] font-extrabold shadow-xs active:scale-95 transition-all flex items-center gap-1 flex-shrink-0 whitespace-nowrap cursor-pointer"
      >
        <span>{content.buttonText}</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </section>
  );
}
