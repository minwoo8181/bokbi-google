'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SITE_CONTENT } from '@/config/siteContent';
import HomeGuideSheet from '@/components/home/HomeGuideSheet';

/**
 * 홈 맨 아래 중개사 카드 (대표님 2026-10-29 시안 → 캔버스에서 "토스 파랑 바탕에 흰 글씨"로): 파랑 바탕 + 작은 질문 + 큰 흰 제목 + 버튼 하나.
 * 버튼 "파트너 중개사 혜택 보기"가 처음 오는 중개사의 입구 — 중개사용 이용 방법 시트(혜택 3장)를 열고,
 * 시트 마지막 버튼이 가입 화면으로 보낸다. 장점 네 줄은 이 시트가 대신한다.
 * 약속은 가입 화면 약속 단계에서 받으므로 서약 팝업 없이 바로 가입으로 (2026-10-25)
 */
export default function BrokerPartnerBanner() {
  const { partnerBanner, brokerGuide } = SITE_CONTENT.home;
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-brand rounded-3xl px-5 py-6" data-testid="home-partner">
      {/* 흰 알약 + 파랑 글씨로 "중개사라면 여기" 강조, 제목과 한 칸 띄움 (대표님 2026-10-29) */}
      <p className="inline-flex h-8 items-center rounded-full bg-surface-card px-3 text-[13px] font-bold text-brand">{partnerBanner.badge}</p>
      <h2 className="mt-4 text-[20px] font-bold text-text-inverse leading-[1.4] tracking-tight whitespace-pre-line">{partnerBanner.title}</h2>

      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="home-partner-guide"
        className="mt-5 w-full h-12 rounded-xl bg-brand-hover text-text-inverse font-bold text-[15px] active:scale-[0.99] transition-transform duration-fast ease-out-soft"
      >
        {partnerBanner.buttonText}
      </button>

      <HomeGuideSheet
        open={open}
        guide={brokerGuide}
        testId="broker-guide"
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          router.push('/agent/register');
        }}
      />
    </section>
  );
}
