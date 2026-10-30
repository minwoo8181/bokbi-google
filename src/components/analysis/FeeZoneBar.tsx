'use client';

/**
 * 복비 구간 막대 + ▼ 표시 + 구간 안내 한 줄 (2026-10-27 대표님 최종 시안).
 * - 분석 카드: 보기 전용. 처음 한 번 ▼가 0원에서 추천 금액으로 미끄러져 멈추고, 멈추면 안내 문구가 나타난다 (animateIn)
 * - 매칭 요청 창 복비 정하기: 같은 막대 위에서 금액을 직접 바꾼다 (smooth=false로 끌 때 바로 따라감)
 * 경계 계산은 lib/analysis/feeZoneBar.ts, 문구는 analysis.customizer.zoneText
 */
import React, { useEffect, useRef, useState } from 'react';
import { barPercent, feeZoneBarLayout } from '@/lib/analysis/feeZoneBar';
import { feeZone, type FeeZone } from '@/lib/analysis/marketEngine';
import { formatWon } from '@/lib/utils';
import { SITE_CONTENT } from '@/config/siteContent';

interface FeeZoneBarProps {
  legalMaxWon: number;
  floorWon: number;
  /** 실제 추천 금액의 할인율 */
  recEffective: number;
  /** ▼가 가리키는 금액 */
  valueWon: number;
  /** ▼ 옆 글자 ("194만"). 없으면 ▼만 */
  markerLabel?: string;
  /** 처음 한 번 0원에서 미끄러져 들어온다 */
  animateIn?: boolean;
  /** 값이 바뀔 때 ▼를 부드럽게 옮긴다 (끌어서 조절할 땐 false. 처음 미끄러져 들어오는 것은 그대로) */
  smooth?: boolean;
  /** 구간 안내 문구를 고를 금액. 매칭 요청 창은 옵션까지 더한 합계로 판정 (예전 슬라이더와 같음). 없으면 valueWon */
  zoneValueWon?: number;
}

const ZONE_BG: Record<FeeZone, string> = {
  RISK: 'bg-status-risk',
  CAUTION: 'bg-status-caution',
  RECOMMENDED: 'bg-status-good',
  WIDE: 'bg-brand',
};

export default function FeeZoneBar({
  legalMaxWon,
  floorWon,
  recEffective,
  valueWon,
  markerLabel,
  animateIn = false,
  smooth = true,
  zoneValueWon,
}: FeeZoneBarProps) {
  const { customizer } = SITE_CONTENT.analysis;
  const { floorPct, segments } = feeZoneBarLayout(legalMaxWon, floorWon, recEffective);
  const target = barPercent(valueWon, legalMaxWon);
  const zoneWon = zoneValueWon ?? valueWon;
  const zone = feeZone(legalMaxWon > 0 ? 1 - zoneWon / legalMaxWon : 0, recEffective);

  // 처음엔 0원에 두었다가 막대가 화면에 들어오면 목표로 미끄러지게 한다 (카드가 첫 화면 아래에 있어도 이용자가 보게).
  // 동작 줄이기 설정이거나 IntersectionObserver가 없으면 바로 목표에
  const [landed, setLanded] = useState(!animateIn);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!animateIn || landed) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLanded(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // 첫 화면에 바로 보이는 경우 페이지가 자리 잡은 뒤 움직여야 눈에 띈다
          window.setTimeout(() => setLanded(true), 400);
          io.disconnect();
        }
      },
      // 아래 고정 바(약 110px)에 가려진 부분은 보이는 것으로 치지 않는다
      { threshold: 0.6, rootMargin: '0px 0px -120px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animateIn, landed]);

  const left = landed ? target : 0;
  // 처음 미끄러져 들어오는 동안만 부드럽게 (smooth=false여도). 끝나면 끌 때 바로 따라간다
  const [introDone, setIntroDone] = useState(!animateIn);
  useEffect(() => {
    if (!landed || introDone) return;
    const t = window.setTimeout(() => setIntroDone(true), 1000);
    return () => window.clearTimeout(t);
  }, [landed, introDone]);
  const moveSmoothly = smooth || !introDone;

  return (
    <div ref={rootRef} data-testid="fee-zone-bar">
      <div className={`relative ${markerLabel ? 'pt-8' : 'pt-4'}`}>
        {/* 금액 글자 위, ▼ 아래로 세로로 쌓아 ▼ 끝이 정확히 금액 위치를 가리키게 한다
            (예전엔 "▼ 437만"을 한 줄로 가운데 정렬해 ▼가 실제보다 약 20px 왼쪽을 가리켰음, 2026-10-27) */}
        <span
          aria-hidden
          data-testid="fee-zone-marker"
          className="absolute top-0 flex flex-col items-center text-brand font-extrabold tabular-nums whitespace-nowrap"
          style={{
            left: `${left}%`,
            transform: 'translateX(-50%)',
            transition: moveSmoothly ? 'left 900ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          }}
        >
          {markerLabel && <span className="text-[12px] leading-4">{markerLabel}</span>}
          <span className="text-[12px] leading-3">▼</span>
        </span>
        <div className="relative h-2 rounded-full overflow-hidden bg-surface-subtle" aria-hidden>
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${floorPct}%`, background: 'repeating-linear-gradient(45deg, var(--border-default) 0 3px, transparent 3px 6px)' }}
          />
          {segments.map((s) => (
            <div
              key={s.zone}
              className={`absolute inset-y-0 ${ZONE_BG[s.zone]} transition-opacity duration-300`}
              style={{ left: `${s.from}%`, width: `${s.to - s.from}%`, opacity: !landed || s.zone === zone ? 1 : 0.45 }}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[12px] font-medium text-text-tertiary tabular-nums">
        <span>{customizer.sliderZeroLabel}</span>
        <span>{formatWon(legalMaxWon)}</span>
      </div>
      {/* 구간 안내: 색 점 + 한 줄 (상자 없이, 2026-10-27) */}
      <p
        role="status"
        data-testid="fee-zone-hint"
        className="mt-2 flex items-start gap-2 text-[13px] font-bold text-text-secondary break-keep text-pretty transition-opacity duration-500"
        style={{ opacity: landed ? 1 : 0, transitionDelay: animateIn ? '700ms' : '0ms' }}
      >
        <span className={`mt-[6px] w-[7px] h-[7px] rounded-full flex-shrink-0 ${ZONE_BG[zone]}`} aria-hidden />
        <span>{customizer.zoneText[zone]}</span>
      </p>
    </div>
  );
}
