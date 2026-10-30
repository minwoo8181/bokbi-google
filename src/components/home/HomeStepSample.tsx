'use client';

import React from 'react';
import { Check, EyeOff } from 'lucide-react';
import { calculateLegalCommission } from '@/lib/commission';
import { formatPriceTenThousand } from '@/lib/utils';
import { fill } from '@/components/my-requests/format';

/** 예시 거래금액 (만 원). 법정 상한은 commission.ts로 계산 — 실적 숫자가 아니라 법 예시 */
const SAMPLE_PRICE_MAN = 80_000;

export type GuideRow = { label: string; value: string; icon?: string; brand?: boolean };
export type GuideSample = { caption?: string; rows: readonly GuideRow[] };

/**
 * 이용 방법 시트의 장마다 붙는 칸 (실제 화면을 줄인 모양, 가짜 실적 없음). 집주인·중개사 시트가 같이 쓴다.
 * 칸 줄은 설명 문장과 같은 내용 (대표님 2026-10-28). icon check = 됨 / hide = 매칭 전엔 가림, brand = 파란 글자
 */
export default function HomeStepSample({ sample }: { sample: GuideSample }) {
  const vars = {
    price: formatPriceTenThousand(SAMPLE_PRICE_MAN),
    cap: formatPriceTenThousand(Math.floor(calculateLegalCommission(SAMPLE_PRICE_MAN * 10_000, '매매').maxWon / 10_000)),
  };

  return (
    <div className="rounded-2xl bg-surface-subtle px-4 py-1 divide-y divide-border-light">
      {sample.caption && <p className="py-3 text-[13px] font-medium text-text-tertiary">{fill(sample.caption, vars)}</p>}
      {sample.rows.map((r) => {
        const Icon = r.icon === 'hide' ? EyeOff : r.icon === 'check' ? Check : null;
        return (
          <div key={r.label} className="flex items-center justify-between gap-3 py-3 text-[15px]">
            <span className="min-w-0 font-medium text-text-secondary break-keep">{r.label}</span>
            <span className={`inline-flex flex-shrink-0 items-center gap-1 font-bold tabular-nums ${r.brand ? 'text-brand' : 'text-text-primary'}`}>
              {Icon && <Icon className="w-4 h-4" aria-hidden />}
              {r.value && fill(r.value, vars)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
