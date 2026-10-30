'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import HomeGuideSheet from './HomeGuideSheet';

/**
 * 홈 "복비, 왜 다를까요?": 진행 3단계 + 단계마다 다른 점 한 줄 + 제목 옆 칩 (흰 띠 한 장, 대표님 2026-10-28·29).
 * 화면 조각은 길어서 "자세히 보기" → 이용 방법 시트로 (같은 부품 HomeStepSample). 예전 강점 4장을 합친 섹션
 */
export default function HomeProcessSteps() {
  const { process } = SITE_CONTENT.home;
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-surface-card rounded-3xl px-5 py-7" data-testid="home-process">
      <h2 className="text-[20px] font-bold text-text-primary tracking-tight">{process.sectionTitle}</h2>
      {/* 연파랑 네모 칸 번호 + 제목 옆 칩, 설명은 늘 보이게 (대표님 2026-10-29 A안) */}
      <ol className="mt-5 flex flex-col gap-5">
        {process.steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span
              className="w-9 h-9 flex-shrink-0 rounded-xl bg-brand-subtle text-brand flex items-center justify-center text-[17px] font-bold"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[17px] font-bold text-text-primary">{step.title}</p>
                <span className="rounded-md bg-brand-light px-2 py-1 text-[12px] font-bold text-brand-hover">{step.chip}</span>
              </div>
              <p className="mt-1 text-[15px] font-medium text-text-secondary leading-normal break-keep text-pretty">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="home-process-more"
        className="mt-3 h-11 inline-flex items-center text-[15px] font-bold text-brand"
      >
        {process.more}
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>

      <HomeGuideSheet
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          const input = document.getElementById('home-search-input');
          input?.scrollIntoView({ block: 'center' });
          input?.focus();
        }}
      />
    </section>
  );
}
