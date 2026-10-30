'use client';

/**
 * 더 빠른 매칭 옵션 (접이식). 2026-10-27 분석 카드에서 매칭 요청 창 "복비 정하기"로 옮김 — 화면·계산은 그대로
 */
import React, { useState } from 'react';
import { CheckSquare, Square, ChevronDown } from 'lucide-react';
import { formatWon } from '@/lib/utils';
import { SITE_CONTENT } from '@/config/siteContent';
import type { SpecialBonusOption } from '../types';

interface FeeBonusOptionsProps {
  bonusOptions: SpecialBonusOption[];
  totalBonusWon: number;
  onToggleBonus: (id: string) => void;
  onUpdateBonusAmount: (id: string, amount: number) => void;
  onUpdateBonusConditionText: (id: string, text: string) => void;
}

export default function FeeBonusOptions({
  bonusOptions,
  totalBonusWon,
  onToggleBonus,
  onUpdateBonusAmount,
  onUpdateBonusConditionText,
}: FeeBonusOptionsProps) {
  const { customizer } = SITE_CONTENT.analysis;
  const [isBonusExpanded, setIsBonusExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="bonus-accordion-btn"
        onClick={() => setIsBonusExpanded(!isBonusExpanded)}
        className="w-full p-4 rounded-xl bg-surface-subtle hover:bg-surface-card border border-border-default flex items-center justify-between text-left transition-all active:scale-98"
      >
        <div className="flex items-start gap-2">
          {/* 번개 아이콘 대신 점 (2026-10-27 대표님: 점 표시로 깔끔하게) */}
          <span className="mt-[6px] w-[7px] h-[7px] rounded-full bg-brand flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-text-primary flex items-center gap-2 flex-wrap">
              <span>{customizer.fasterMatchingTitle}</span>
              {totalBonusWon > 0 && (
                <span className="text-[12px] font-bold text-brand-hover bg-brand-light px-2 py-0.2 rounded-full border border-brand-line">
                  {customizer.appliedBonusSuffix.replace('{amount}', formatWon(totalBonusWon))}
                </span>
              )}
            </div>
            <div className="text-[12px] text-text-tertiary mt-1 truncate">{customizer.fasterMatchingSubTitle}</div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary transition-transform duration-200 flex-shrink-0 ml-1 ${isBonusExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 접이식 내부 옵션 목록 */}
      {isBonusExpanded && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-200">
          {bonusOptions.map((b) => (
            <div
              key={b.id}
              className={`p-3 rounded-xl border transition-all ${
                b.checked ? 'border-brand bg-brand-subtle shadow-2xs' : 'border-border-default bg-surface-subtle hover:border-brand-line'
              }`}
            >
              <div
                data-testid={b.isCustom ? 'bonus-custom-checkbox' : undefined}
                onClick={() => onToggleBonus(b.id)}
                className="cursor-pointer flex items-start gap-3"
              >
                {b.checked ? (
                  <CheckSquare className="w-4 h-4 text-brand flex-shrink-0 mt-1" />
                ) : (
                  <Square className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-1" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-extrabold text-text-primary">{b.title}</span>
                    <span className="text-[13px] font-extrabold text-brand tabular-nums flex-shrink-0">+{formatWon(b.amountWon)}</span>
                  </div>
                  <div className="text-[12px] text-text-tertiary mt-1 leading-snug">{b.description}</div>
                </div>
              </div>

              {/* 3번째 보너스: 집주인 협의조건 직접 입력 텍스트 필드 + 금액 버튼 (대표님 지침 반영) */}
              {b.isCustom && b.checked && (
                <div className="mt-3 pt-3 border-t border-brand-line space-y-3 pl-6">
                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-text-primary flex items-center justify-between">
                      <span>{customizer.customConditionLabel}</span>
                      <span className="text-[12px] text-text-tertiary font-medium">{customizer.customConditionSubLabel}</span>
                    </label>
                    <input
                      type="text"
                      placeholder={customizer.customConditionPlaceholder}
                      value={b.customConditionText || ''}
                      onChange={(e) => onUpdateBonusConditionText(b.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-line bg-white text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-text-secondary">{customizer.bonusAmountChoiceLabel}</span>
                      <span className="font-extrabold text-brand tabular-nums text-[13px]">+{formatWon(b.amountWon)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[100000, 200000, 300000, 500000].map((amt) => {
                        const isSelected = b.amountWon === amt;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => onUpdateBonusAmount(b.id, amt)}
                            className={`py-2 rounded-lg text-[12px] font-extrabold transition-all active:scale-95 border ${
                              isSelected
                                ? 'bg-brand text-white border-brand shadow-xs'
                                : 'bg-white text-text-secondary border-border-default hover:border-brand-line'
                            }`}
                          >
                            +{Math.round(amt / 10000)}만
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 옵션 합계 상자는 뺐다: 같은 합계가 금액 바로 아래 "기본 + 보너스 = 합계" 줄에, 상한 초과 안내는 막대 아래에 있음 (2026-10-27 정리) */}
    </div>
  );
}
