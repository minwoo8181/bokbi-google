'use client';

import React, { useState } from 'react';
import { ChevronRight, MessageCircleQuestion } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { InquiryRole, InquiryTopic } from '@/lib/support/inquiries';
import { REQUEST_SUMMARY_KEY } from '@/lib/requests/requestDraft';
import InquirySheet from './InquirySheet';

const t = SITE_CONTENT.support;

export interface InquiryContext {
  phone: string;
  request: { id: string; label: string } | null;
}

/** 집주인: 이 휴대폰에 남은 지금 의뢰 요약에서 번호·의뢰 한 줄 (동·호수 없음). 목업 저장소 기준 */
export function ownerInquiryContext(): InquiryContext {
  try {
    const s = JSON.parse(localStorage.getItem(REQUEST_SUMMARY_KEY) ?? 'null') as Record<string, unknown> | null;
    const phone = localStorage.getItem('bokbi_active_owner_phone') || (typeof s?.ownerPhone === 'string' ? s.ownerPhone : '');
    const request =
      s && typeof s.id === 'string' && typeof s.aptName === 'string'
        ? { id: s.id, label: [s.aptName, String(s.pyeongName ?? '').split(' ')[0], s.tradeType].filter(Boolean).join(' ') }
        : null;
    return { phone, request };
  } catch {
    return { phone: '', request: null };
  }
}

/**
 * 문의하기 입구 한 줄 (집주인 내 의뢰 아래·내 정보 관리, 중개사 내 사무소 아래). 누르면 문의하기 시트.
 * context는 열 때 읽는다 (저장소가 그 사이 바뀌어도 최신으로)
 */
export default function InquiryEntry({ role, context, topic, testId = 'inquiry-entry' }: { role: InquiryRole; context: () => InquiryContext; topic?: InquiryTopic; testId?: string }) {
  const [open, setOpen] = useState<InquiryContext | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(context())} data-testid={testId} className="w-full p-4 rounded-2xl bg-surface-card flex items-center gap-3 text-left active:scale-[0.99] transition-transform duration-fast ease-out-soft">
        <MessageCircleQuestion className="w-6 h-6 shrink-0 text-text-tertiary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-text-primary">{t.entry}</span>
          <span className="block text-[13px] font-medium text-text-secondary break-keep text-pretty">{t.entrySub}</span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-text-tertiary" aria-hidden />
      </button>
      {open && <InquirySheet role={role} phone={open.phone} request={open.request} initialTopic={topic} onClose={() => setOpen(null)} />}
    </>
  );
}
