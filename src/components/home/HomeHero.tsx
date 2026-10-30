'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import FormattedText from '@/components/common/FormattedText';

/** 홈 첫 문구 (헤이딜러 첫 화면 화법, 대표님 2026-10-28 A안): 무엇을 넣으면 무엇을 알려 주는지 + 문턱 낮추는 한 줄 */
export default function HomeHero() {
  const { hero } = SITE_CONTENT.home;

  return (
    <section>
      <h1 className="text-[26px] font-extrabold text-text-primary leading-[1.4] tracking-[-0.03em] break-keep text-pretty">
        <FormattedText text={hero.title} highlightClassName="text-brand" />
      </h1>
      <p className="mt-3 text-[15px] font-medium text-text-secondary leading-relaxed break-keep text-pretty">{hero.subTitle}</p>
    </section>
  );
}
