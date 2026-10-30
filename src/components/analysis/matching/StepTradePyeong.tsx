'use client';

/** 1단계: 거래 유형·평형·타입 확인과 요약 */
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { TradeType } from '../types';
import { SITE_CONTENT } from '@/config/siteContent';
import type { MatchingForm } from './useMatchingForm';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '../segmentStyles';
import { FieldError, MissingCount, errorRing, useMissingGuard } from './missingGuard';

export default function StepTradePyeong({ form }: { form: MatchingForm }) {
  const { apartment, onChangeTradeType, onSelectPyeong, floorLabel, currentTradeType, setCurrentTradeType, currentPyeong, setCurrentPyeong, availablePyeongs, pyeongTypes, currentTypeName, setCurrentTypeName, selectedType, missing1, goNext } = form;
  const guard = useMissingGuard(missing1);

  return (
    <div className="space-y-4" data-testid="modal-step-1">
      <div>
        <h3
          id="matching-modal-title"
          className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug"
        >
          {SITE_CONTENT.matchingModal.step1.title}
        </h3>
        <p className="text-[13px] font-medium text-text-tertiary mt-1">
          {SITE_CONTENT.matchingModal.step1.subTitle}
        </p>
      </div>

      {/* ★ 사용자 행동 관점: 모달 내 원터치 조건 변경 스위처 (분석 화면과 같은 세그먼트, 2026-10-27) */}
      <div className="space-y-3">
        {/* 1) 거래 유형 선택 2단 세그먼트 */}
        <div>
          <label className="text-[12px] font-bold text-text-secondary block mb-2">
            {SITE_CONTENT.matchingModal.step1.tradeTypeLabel}
          </label>
          <div className={`${SEGMENT_TRACK} grid-cols-2`}>
            {(['매매', '전세'] as TradeType[]).map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`btn-select-trade-${t}`}
                aria-pressed={currentTradeType === t}
                onClick={() => {
                  setCurrentTradeType(t);
                  onChangeTradeType?.(t);
                }}
                className={`${SEGMENT_ITEM} ${segmentItemState(currentTradeType === t)} text-[13px] font-extrabold cursor-pointer`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 2) 평형대 선택 슬림 칩 */}
        <div>
          <label className="text-[12px] font-bold text-text-secondary block mb-2">
            {SITE_CONTENT.matchingModal.step1.pyeongLabel}
          </label>
          <div className={`${SEGMENT_TRACK} ${
            availablePyeongs.length === 1 ? 'grid-cols-1' :
            availablePyeongs.length === 2 ? 'grid-cols-2' :
            availablePyeongs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
          }`}>
            {availablePyeongs.map((p) => {
              const shortName = p.name.includes('평') ? `${p.name.split('평')[0]}평` : p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`btn-select-pyeong-${p.id}`}
                  aria-pressed={currentPyeong.id === p.id}
                  onClick={() => {
                    setCurrentPyeong(p);
                    onSelectPyeong?.(p.id);
                  }}
                  className={`${SEGMENT_ITEM} ${segmentItemState(currentPyeong.id === p.id)} text-[13px] font-extrabold cursor-pointer`}
                >
                  {shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3) 타입 선택 (같은 평형에 구조 타입이 2개 이상인 단지만) */}
        {pyeongTypes.length >= 2 && (
          <div data-testid="pyeong-type-selector" data-field="TYPE">
            <label className="text-[12px] font-bold text-text-secondary block mb-1">
              {SITE_CONTENT.matchingModal.step1.typeLabel} *
            </label>
            <p className="text-[12px] font-medium text-text-tertiary mb-2 leading-snug">
              {SITE_CONTENT.matchingModal.step1.typeHint}
            </p>
            <div className={`${SEGMENT_TRACK} grid-cols-3 ${errorRing(guard.shown('TYPE'))}`}>
              {[...pyeongTypes.map((t) => ({ key: t.name, label: t.name, sub: `전용 ${t.exclusiveArea}㎡` })),
                { key: '', label: SITE_CONTENT.matchingModal.step1.typeUnknown, sub: '' }].map((opt) => (
                <button
                  key={opt.key || 'unknown'}
                  type="button"
                  data-testid={`btn-select-type-${opt.key || 'unknown'}`}
                  aria-pressed={currentTypeName === opt.key}
                  onClick={() => setCurrentTypeName(opt.key)}
                  className={`${SEGMENT_ITEM} ${segmentItemState(currentTypeName === opt.key)} py-2 px-1 text-[12px] font-bold flex flex-col items-center justify-center leading-tight cursor-pointer`}
                >
                  <span>{opt.label}</span>
                  {opt.sub && (
                    <span className="text-[12px] font-medium mt-1 text-text-tertiary">
                      {opt.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <FieldError show={guard.shown('TYPE')} text={SITE_CONTENT.matchingModal.missing.TYPE} />
          </div>
        )}
      </div>

      {/* 요약 카드 */}
      <div className="p-4 rounded-2xl bg-surface-subtle border border-border-default space-y-3">
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-text-secondary font-medium">
            {SITE_CONTENT.matchingModal.step1.summaryApt}
          </span>
          <span className="font-bold text-text-primary">{apartment.apt_name}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-text-secondary font-medium">
            {SITE_CONTENT.matchingModal.step1.summaryPyeong}
          </span>
          <span className="font-bold text-text-primary">
            {currentPyeong.name} ({(selectedType?.supplyArea ?? currentPyeong.supplyArea)}㎡)
          </span>
        </div>
        {pyeongTypes.length >= 2 && (
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-text-secondary font-medium">
              {SITE_CONTENT.matchingModal.step1.summaryType}
            </span>
            <span className={`font-bold ${currentTypeName === null ? 'text-text-disabled' : 'text-text-primary'}`}>
              {selectedType
                ? selectedType.name
                : currentTypeName === ''
                ? SITE_CONTENT.matchingModal.step1.typeUnknownSummary
                : '-'}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-text-secondary font-medium">
            {SITE_CONTENT.matchingModal.step1.summaryFloor}
          </span>
          <span className="font-bold text-text-primary">{floorLabel}</span>
        </div>
        {/* "집주인 제안 복비" 줄은 삭제 — 복비는 3단계에서 정한다 (대표님 2026-10-27) */}
      </div>

      <div className="p-3 rounded-xl bg-brand-subtle border border-brand-line flex items-center gap-2 text-[12px] text-brand font-medium">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span>{SITE_CONTENT.matchingModal.step1.summaryNotice}</span>
      </div>

      <MissingCount guard={guard} />
      <button
        type="button"
        data-testid="modal-step1-next"
        onClick={() => guard.attempt(goNext)}
        className="w-full h-13 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all bg-brand hover:bg-brand-hover text-white shadow-brand-glow cursor-pointer"
      >
        <span>{SITE_CONTENT.matchingModal.step1.nextStepButton}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
