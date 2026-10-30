'use client';

import React from 'react';
import { Eye, Crown } from 'lucide-react';
import { ApartmentStat } from '@/types';
import { isLeaderApartment } from '@/lib/mock-analysis-data';
import { SITE_CONTENT } from '@/config/siteContent';
import type { ComplexInfo } from '@/lib/market/repository';

interface ApartmentHeroBadgeProps {
  apartment: ApartmentStat;
  /** 학군·주차 (네이버 단지 정보) */
  complexInfo?: ComplexInfo | null;
  viewCount?: number;
}

export default function ApartmentHeroBadge({
  apartment,
  complexInfo = null,
  viewCount,
}: ApartmentHeroBadgeProps) {
  // 한 줄로 이어 쓴다: "다산동 · 967세대 · 2021년 입주 · 다산하늘초 도보 9분 · 주차 세대당 1.45대"
  // (맨 위 줄이기 2026-10-27 대표님 승인 — 예전엔 동·세대와 학교·주차가 두 줄로 나뉨)
  const infoParts = [
    `${apartment.dong_name}${apartment.sub_region ? ` ${apartment.sub_region}` : ''}`,
    `${apartment.total_households.toLocaleString()}세대`,
    apartment.built_year ? `${apartment.built_year}년 입주` : null,
    complexInfo?.elementarySchool
      ? `${complexInfo.elementarySchool.replace(/등학교$/, '')}${complexInfo.elementarySchoolWalkMin ? ` 도보 ${complexInfo.elementarySchoolWalkMin}분` : ''}`
      : null,
    complexInfo?.parkingPerHousehold ? `주차 세대당 ${complexInfo.parkingPerHousehold}대` : null,
  ].filter(Boolean);
  const isLeader = isLeaderApartment(apartment.apt_name);
  const { heroBadge } = SITE_CONTENT.analysis;

  return (
    <section className="bg-surface-card rounded-2xl px-4 py-4 border border-border-default shadow-xs space-y-1">
      {/* 상단: 단지 이름 + 대장 뱃지 + 오늘 실제 조회수. 번호판 상자는 맨 위 제목 줄과 겹쳐 글자로만 (2026-10-27) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-extrabold text-[17px] text-text-primary tracking-tight break-keep">
            {apartment.apt_name}
          </h1>

          {/* 대장 아파트 단독 뱃지 (심플하게 👑 대장 하나만 표기) */}
          {isLeader && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-status-caution-light border border-status-caution-line text-[var(--status-caution-strong)] text-[12px] font-extrabold tracking-tight">
              <Crown className="w-3.5 h-3.5 text-status-caution" fill="currentColor" />
              <span>{heroBadge.leaderBadge}</span>
            </span>
          )}
        </div>

        {/* 조회수는 실제 집계가 생기기 전까지 표시하지 않는다 (RULES 규칙 12) */}
        {viewCount !== undefined && (
          <div className="flex items-center gap-1 text-[12px] font-medium text-text-tertiary bg-surface-subtle px-3 py-1 rounded-full border border-border-light">
            <Eye className="w-3.5 h-3.5 text-brand" />
            <span>{heroBadge.viewCounterPrefix} <strong>{viewCount}{heroBadge.viewCounterSuffix}</strong></span>
          </div>
        )}
      </div>

      {/* 줄은 항목 사이(" · ")에서만 넘어간다 ("주차 / 세대당 1.45대"처럼 항목 중간에서 끊기지 않게) */}
      <p className="text-[12px] font-medium text-text-secondary text-pretty" data-testid="complex-info">
        {infoParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && ' · '}
            <span className="whitespace-nowrap">{part}</span>
          </React.Fragment>
        ))}
      </p>
      {/* "선택 평형" 줄은 바로 아래 평형 칩과 같은 내용이라 삭제 (대표님 승인 2026-10-24) */}
    </section>
  );
}
