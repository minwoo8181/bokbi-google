'use client';

import React, { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill } from '@/components/my-requests/format';
import HomeStepSample, { type GuideSample } from './HomeStepSample';

type Guide = {
  next: string;
  prev: string;
  done: string;
  close: string;
  pageOf: string;
  pages: readonly { title: string; lines: readonly string[]; sample: GuideSample }[];
};

/**
 * 홈 "처음이라면? 이용 방법" 시트: 세 장 넘기기 (대표님 2026-10-28). 집주인용(home.guide)·중개사용(home.brokerGuide) 공용.
 * 첫 방문에 저절로 뜨지 않는다 — 홈에서 할 일을 가리지 않게. 마지막 장 버튼은 onDone (집주인: 검색창 / 중개사: 가입)
 */
export default function HomeGuideSheet({
  open,
  onClose,
  onDone,
  guide = SITE_CONTENT.home.guide,
  testId = 'home-guide',
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  guide?: Guide;
  testId?: string;
}) {
  const [page, setPage] = useState(0);
  const total = guide.pages.length;
  const last = page === total - 1;
  const cur = guide.pages[page];

  const close = () => {
    setPage(0);
    onClose();
  };

  return (
    <ActionSheet
      open={open}
      testId={testId}
      title={cur.title}
      cancelLabel={guide.close}
      onCancel={close}
      confirmLabel={last ? guide.done : guide.next}
      onConfirm={() => {
        if (!last) return setPage(page + 1);
        setPage(0);
        onDone();
      }}
      secondary={page > 0 ? { label: guide.prev, onClick: () => setPage(page - 1) } : undefined}
    >
      {/* 문장마다 한 줄 (줄내림 정렬, 대표님 2026-10-28) */}
      <div className="text-[15px] font-medium text-text-secondary leading-relaxed break-keep">
        {cur.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <div className="mt-4">
        <HomeStepSample sample={cur.sample} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2" aria-label={fill(guide.pageOf, { n: page + 1, total })}>
        {guide.pages.map((p, i) => (
          <span key={p.title} className={`h-1.5 rounded-full transition-all duration-fast ${i === page ? 'w-4 bg-brand' : 'w-1.5 bg-border-default'}`} />
        ))}
      </div>
    </ActionSheet>
  );
}
