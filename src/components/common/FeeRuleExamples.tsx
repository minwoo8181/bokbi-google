'use client';

import React, { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { discountPct, FEE_RULE_EXAMPLES, feeRuleExample, personalFeeScenarios, type AgreedFee, type FeeScenario } from '@/lib/deal/dealFee';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.dealPrice.rule;

/**
 * "거래금액이 바뀌면" 규칙 + 실제 요율표 예시 (중개사 가입 약속·집주인 매칭 동의 공통, 대표님 2026-10-26).
 * 두 화면 같은 틀 (2026-10-28): 칩으로 경우를 고르고 세 줄(합의 → 실제 거래 → 같은 비율)로 본다.
 * agreed(집주인 요청)가 있으면 내 집 금액, 없으면(중개사 가입) 고정 예시. 금액은 모두 dealFee.ts 계산값
 */
export default function FeeRuleExamples({ agreed }: { agreed?: AgreedFee }) {
  const pct = agreed ? discountPct(agreed) : null;
  const personal = agreed && pct !== null ? personalFeeScenarios(agreed) : null;
  if (agreed && personal && personal.rows.length > 0) return <PersonalExample agreed={agreed} pct={pct!} {...personal} />;

  return <FixedExample />;
}

/** 칩 4개 이하 2열 같은 폭 (대표님 2026-10-28: 간격 일정하게) */
function ExampleChips({ labels, value, onChange }: { labels: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup">
      {labels.map((c, i) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={i === value}
          onClick={() => onChange(i)}
          className={`h-11 px-2 rounded-full text-[13px] font-bold transition-colors ${i === value ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/** 번호 붙은 세 줄, 마지막 줄(결과)만 파랑 굵게 */
function ExampleLines({ lines, size = 'text-[15px]' }: { lines: string[]; size?: string }) {
  return (
    <ol className="mt-4 space-y-3 tabular-nums" data-testid="fee-rule-lines">
      {lines.map((l, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-brand-light text-brand-hover text-[13px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden>
            {i + 1}
          </span>
          <span className={`${size} leading-relaxed break-keep whitespace-pre-line ${i === lines.length - 1 ? 'font-bold text-brand' : 'font-medium text-text-primary'}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

/** 중개사 가입 약속: 예시 하나를 세 줄로 (합의 → 실제 거래 → 같은 비율), 칩으로 4가지 바꿔 보기 */
function FixedExample() {
  const [idx, setIdx] = useState(0);
  const x = FEE_RULE_EXAMPLES[idx];
  const { agreed, fee, basisMaxWon, basisRateLabel } = feeRuleExample(x);
  const lines = [
    fill(t.agreedLine, { type: x.tradeType, price: formatPriceTenThousand(x.askingPriceManwon), max: formatWon(basisMaxWon), pct: x.ratioPct, fee: formatWon(agreed.commissionWon) }),
    fill(t.actualLine, { price: formatPriceTenThousand(x.priceManwon), verb: t.verb[x.tradeType] }),
    fill(t.resultLine, { max: formatWon(fee.legalMaxWon), pct: x.ratioPct, fee: formatWon(fee.feeWon) }),
  ];
  return (
    <div data-testid="fee-rule">
      <p className="text-[15px] font-bold text-text-primary break-keep">{t.headline}</p>
      <ExampleChips labels={[...t.chips]} value={idx} onChange={setIdx} />
      <ExampleLines lines={lines} />
      {basisRateLabel !== fee.rateLabel && (
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-text-secondary break-keep text-pretty" data-testid="fee-rule-rate">
          {fill(t.rateLine, { from: basisRateLabel, to: fee.rateLabel, pct: x.ratioPct })}
        </p>
      )}
      <p className="mt-2 text-[13px] font-medium text-text-tertiary">{t.note}</p>
    </div>
  );
}

/** 집주인 매칭 모달: 내 희망가·제안 복비로 계산한 금액들을 칩으로, 처음엔 희망가가 아닌 첫 금액 (희망가와 비교가 보이게) */
function PersonalExample({ agreed, pct, rows, shift }: { agreed: AgreedFee; pct: number } & ReturnType<typeof personalFeeScenarios>) {
  const p = t.personal;
  const askingRow = rows.find((r) => r.isAsking) as FeeScenario;
  const [idx, setIdx] = useState(() => Math.max(0, rows.findIndex((r) => !r.isAsking && r.priceManwon < agreed.askingPriceManwon)));
  const r = rows[Math.min(idx, rows.length - 1)];
  const price = formatPriceTenThousand(r.priceManwon);
  const lines = [
    fill(p.line1, { price: formatPriceTenThousand(agreed.askingPriceManwon), max: formatWon(askingRow.legalMaxWon), fee: formatWon(agreed.commissionWon), pct }),
    r.isAsking ? p.line2Asking[agreed.tradeType] : fill(p.line2[agreed.tradeType], { price }),
    fill(p.line3, { max: formatWon(r.legalMaxWon), fee: formatWon(r.feeWon) }),
  ];
  return (
    <div className="mt-3 p-3 rounded-xl bg-surface-card" data-testid="fee-rule-personal">
      <p className="text-[13px] font-bold text-text-primary break-keep">{fill(p.title, { pct })}</p>
      <ExampleChips labels={rows.map((x) => (x.isAsking ? p.askingChip : formatPriceTenThousand(x.priceManwon)))} value={idx} onChange={setIdx} />
      <ExampleLines lines={lines} size="text-[13px]" />
      {shift && (
        <p className="mt-3 text-[12px] font-medium leading-relaxed text-text-secondary break-keep text-pretty" data-testid="fee-rule-shift">
          {fill(shift.direction === 'DOWN' ? p.shiftDown : p.shiftUp, {
            price: formatPriceTenThousand(shift.boundaryManwon),
            from: shift.fromRate,
            to: shift.toRate,
            pct,
          })}
        </p>
      )}
      <p className="mt-1 text-[12px] font-medium text-text-tertiary">{p.note}</p>
    </div>
  );
}
