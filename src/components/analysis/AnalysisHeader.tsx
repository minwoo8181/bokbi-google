'use client';

import React from 'react';
import { ChevronLeft, Share2 } from 'lucide-react';

interface AnalysisHeaderProps {
  apartmentName: string;
  onBack: () => void;
  onShare: () => void;
}

export default function AnalysisHeader({
  apartmentName,
  onBack,
  onShare,
}: AnalysisHeaderProps) {
  return (
    <header className="h-14 px-4 flex items-center justify-between bg-surface-card backdrop-blur-md border-b border-border-default sticky top-0 z-30">
      <button
        type="button"
        onClick={onBack}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-subtle active:scale-95 transition-all"
        aria-label="뒤로가기"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      {/* 끝 괄호("(주거복합)")는 360px에서 "…"로 잘려 제목 줄에서만 뺀다. 전체 이름은 바로 아래 단지 카드에 (2026-10-27) */}
      <span className="font-bold text-[15px] text-text-primary truncate max-w-[200px]">
        {apartmentName.replace(/\s*\([^)]*\)$/, '')}
      </span>
      <button
        type="button"
        onClick={onShare}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-subtle active:scale-95 transition-all"
        aria-label="공유하기"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </header>
  );
}
