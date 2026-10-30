'use client';

import React, { useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { reviewChipSplit } from '@/lib/requests/stage';

const press = 'active:scale-96 transition-transform duration-fast ease-out-soft';

/**
 * 후기: 별점 + 칩 (글 없음). 예전 계약 완료 카드에서 옮김 (⑥ 2026-10-25).
 * ①안 (대표님 2026-10-29): 별 → "이 중개사가 잘한다고 한 것, 맞았나요?"(실어 보낸 강점의 짝 후기 칩) → 나머지 칩은 접기.
 * 칩은 강점 칩의 "인정"으로 쓰인다 (brokerStrengths.endorsedBy). 고른 강점이 없으면 나머지를 펼쳐 둔다
 */
export default function ReviewForm({
  strengths,
  onSubmit,
}: {
  strengths: readonly string[];
  onSubmit: (review: { stars: number; chips: string[] }) => void;
}) {
  const t = SITE_CONTENT.myRequests.contracted;
  const { claimed, rest } = reviewChipSplit(strengths, SITE_CONTENT.brokerStrengths.endorsedBy, t.reviewChipGroups);
  const [stars, setStars] = useState(0);
  const [chips, setChips] = useState<string[]>([]);
  const [more, setMore] = useState(claimed.length === 0);
  const toggle = (c: string) => setChips(chips.includes(c) ? chips.filter((x) => x !== c) : [...chips, c]);
  const chip = (c: string) => {
    const on = chips.includes(c);
    return (
      <button
        key={c}
        type="button"
        aria-pressed={on}
        onClick={() => toggle(c)}
        className={`h-11 px-4 rounded-full text-[15px] font-bold transition-colors duration-base ease-out-soft ${press} ${
          on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'
        }`}
      >
        {c}
      </button>
    );
  };

  return (
    <div data-testid="review-form">
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t.reviewTitle}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n}점`}
            onClick={() => setStars(n)}
            className={`w-11 h-11 flex items-center justify-center ${press}`}
          >
            <Star className={`w-8 h-8 transition-colors duration-base ease-out-soft ${n <= stars ? 'fill-status-caution text-status-caution' : 'text-border-default'}`} />
          </button>
        ))}
      </div>

      {claimed.length > 0 && (
        <div className="mt-5" role="group" aria-label={t.claimedTitle} data-testid="review-claimed">
          <p className="text-[15px] font-bold text-text-primary break-keep text-pretty">{t.claimedTitle}</p>
          <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.claimedSub}</p>
          <div className="mt-2 flex flex-wrap gap-2">{claimed.map(chip)}</div>
        </div>
      )}

      <div className={claimed.length > 0 ? 'mt-4 border-t border-border-light' : 'mt-4'}>
        {claimed.length > 0 && (
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore(!more)}
            data-testid="review-more"
            className="w-full min-h-[44px] flex items-center justify-between text-[13px] font-bold text-text-secondary"
          >
            {t.moreOpen}
            <span className="inline-flex items-center gap-1 text-brand">
              {more && t.moreClose}
              <ChevronDown className={`w-4 h-4 transition-transform duration-fast ${more ? 'rotate-180' : ''}`} aria-hidden />
            </span>
          </button>
        )}
        {more &&
          rest.map((g) => (
            <div key={g.label} className="mt-3" role="group" aria-label={g.label}>
              <p className="text-[13px] font-medium text-text-tertiary">{g.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">{g.chips.map(chip)}</div>
            </div>
          ))}
      </div>

      <button
        type="button"
        disabled={stars === 0}
        onClick={() => onSubmit({ stars, chips })}
        data-testid="review-submit"
        className={`mt-5 w-full h-13 rounded-xl bg-brand text-white text-[15px] font-bold disabled:bg-surface-subtle disabled:text-text-tertiary ${press}`}
      >
        {t.reviewSubmit}
      </button>
    </div>
  );
}
