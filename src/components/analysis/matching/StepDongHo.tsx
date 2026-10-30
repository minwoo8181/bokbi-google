'use client';

/** 3단계: 동·호수 (건축물대장 확인)·블라인드 미리보기·옵션 */
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { MatchingForm } from './useMatchingForm';
import { FieldError, MissingCount, errorRing, useMissingGuard } from './missingGuard';

export default function StepDongHo({ form }: { form: MatchingForm }) {
  const { units, refillFailed, resumeShort, dongInput, setDongInput, hoInput, setHoInput, unitCheck, singleBuilding, missing3, hasAircon, setHasAircon, airconCount, setAirconCount, hasMidDoor, setHasMidDoor, hasCloset, setHasCloset, customOptionMemo, setCustomOptionMemo, maskedDong, maskedHo, goNext, goPrev } = form;
  const guard = useMissingGuard(missing3);
  const miss = SITE_CONTENT.matchingModal.missing;

  return (
    <div className="space-y-4" data-testid="modal-step-3">
      <div>
        <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug">
          {SITE_CONTENT.matchingModal.step3.title}
        </h3>
        <p className="text-[13px] font-medium text-text-tertiary mt-1">
          {SITE_CONTENT.matchingModal.step3.subTitle}
        </p>
        {refillFailed && <p role="status" className="mt-2 text-[13px] font-bold text-text-secondary text-pretty">{SITE_CONTENT.matchingModal.step3.refillFailed}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div data-field="DONG">
          <label className="text-[12px] font-bold text-text-secondary block mb-1">
            {SITE_CONTENT.matchingModal.step3.dongLabel} *
          </label>
          {/* 건축물대장 동 목록이 있으면 고르게 해 오타·없는 동을 막는다 */}
          {units && singleBuilding ? (
            <div className="h-12 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 font-bold text-[15px] text-text-secondary">
              {SITE_CONTENT.matchingModal.step3.singleBuildingLabel}
            </div>
          ) : units ? (
            <select
              data-testid="input-dong"
              value={dongInput}
              onChange={(e) => setDongInput(e.target.value)}
              className={`w-full h-12 rounded-xl bg-surface-subtle border border-border-default px-3 font-bold text-[17px] text-text-primary focus:outline-none focus:border-brand ${errorRing(guard.shown('DONG'))}`}
            >
              <option value="">{SITE_CONTENT.matchingModal.step3.dongSelectPlaceholder}</option>
              {units.dongs.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={`h-12 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 focus-within:border-brand ${errorRing(guard.shown('DONG'))}`}>
              <input
                type="text"
                data-testid="input-dong"
                value={dongInput}
                onChange={(e) => setDongInput(e.target.value)}
                placeholder={SITE_CONTENT.matchingModal.step3.dongPlaceholder}
                className="w-full bg-transparent font-bold text-[17px] text-text-primary focus:outline-none"
              />
              <span className="text-[15px] font-bold text-text-tertiary">동</span>
            </div>
          )}
          <FieldError show={guard.shown('DONG')} text={miss.DONG} />
        </div>
        <div data-field="HO">
          <label className="text-[12px] font-bold text-text-secondary block mb-1">
            {SITE_CONTENT.matchingModal.step3.hoLabel} *
          </label>
          <div className={`h-12 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 focus-within:border-brand ${errorRing(guard.shown('HO'))}`}>
            <input
              type="text"
              inputMode="numeric"
              data-testid="input-ho"
              value={hoInput}
              onChange={(e) => setHoInput(e.target.value)}
              placeholder={SITE_CONTENT.matchingModal.step3.hoPlaceholder}
              className="w-full bg-transparent font-bold text-[17px] text-text-primary focus:outline-none"
            />
            <span className="text-[15px] font-bold text-text-tertiary">호</span>
          </div>
          <FieldError show={guard.shown('HO')} text={miss.HO} />
        </div>
      </div>

      {/* 동·호수 실존 확인 (건축물대장 기준, 소유자 확인은 매칭 후 중개사 등기 확인) */}
      {/* 통과는 체크 한 줄, 오류·미지원만 박스 */}
      {unitCheck.status === 'OK' && (
        <p
          role="status"
          data-testid="unit-check"
          className="-mt-1 flex items-center gap-1 text-[13px] font-bold text-status-good"
        >
          <Check className="w-4 h-4 stroke-[3]" aria-hidden />
          {SITE_CONTENT.matchingModal.step3.unitCheck.OK}
        </p>
      )}
      {unitCheck.status !== 'EMPTY' && unitCheck.status !== 'OK' && (
        <div
          role="status"
          data-testid="unit-check"
          data-field="UNIT"
          className={`px-3 py-2 rounded-xl text-[13px] font-bold break-keep ${errorRing(guard.shown('UNIT'))} ${
            unitCheck.status === 'UNKNOWN'
              ? 'bg-surface-subtle text-text-secondary'
              : 'bg-status-risk-light text-[var(--status-risk-strong)]'
          }`}
        >
          {SITE_CONTENT.matchingModal.step3.unitCheck[unitCheck.status].replace(
            '{floors}',
            'dong' in unitCheck ? String(unitCheck.dong.floors) : '',
          )}
        </div>
      )}

      {/* 블라인드 미리보기: 이 단계의 유일한 블라인드 안내 */}
      <div
        data-testid="blind-live-preview"
        className="px-4 py-3 rounded-xl bg-surface-subtle flex items-center justify-between gap-2"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text-primary">
            {SITE_CONTENT.matchingModal.step3.livePreviewLabel}
          </p>
          <p className="text-[12px] font-medium text-text-tertiary mt-1">
            {SITE_CONTENT.matchingModal.step3.livePreviewNote}
          </p>
        </div>
        <span className="flex-shrink-0 text-[15px] font-extrabold text-brand tabular-nums">
          {maskedDong} {maskedHo}
        </span>
      </div>

      {/* 옵션 및 특이사항 선택 (선택 사항) */}
      <div className="p-4 rounded-2xl bg-surface-subtle border border-border-default space-y-3">
        <div>
          <label className="text-[12px] font-extrabold text-text-primary block">
            {SITE_CONTENT.matchingModal.step3.optionsSectionTitle}
          </label>
          <p className="text-[12px] text-text-tertiary">
            {SITE_CONTENT.matchingModal.step3.optionsSectionSubTitle}
          </p>
        </div>

        <div className="space-y-2">
          {/* 3대 보편 옵션 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. 시스템에어컨 버튼 */}
            <button
              type="button"
              data-testid="btn-option-aircon"
              onClick={() => setHasAircon((prev) => !prev)}
              className={`min-h-[44px] py-2 px-1 rounded-xl border text-[13px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                hasAircon
                  ? 'border-brand bg-brand-light text-brand-hover shadow-xs'
                  : 'border-border-default bg-surface-card text-text-secondary hover:border-brand-line-strong'
              }`}
            >
              <span>{SITE_CONTENT.matchingModal.step3.optionAirconLabel}</span>
              {hasAircon && (
                <span className="text-[12px] font-extrabold text-brand mt-1">
                  ({airconCount})
                </span>
              )}
            </button>

            {/* 2. 중문 설치 버튼 */}
            <button
              type="button"
              data-testid="btn-option-mid-door"
              onClick={() => setHasMidDoor((prev) => !prev)}
              className={`min-h-[44px] py-2 px-1 rounded-xl border text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                hasMidDoor
                  ? 'border-brand bg-brand-light text-brand-hover shadow-xs'
                  : 'border-border-default bg-surface-card text-text-secondary hover:border-brand-line-strong'
              }`}
            >
              {SITE_CONTENT.matchingModal.step3.optionMidDoorLabel}
            </button>

            {/* 3. 붙박이장 버튼 */}
            <button
              type="button"
              data-testid="btn-option-closet"
              onClick={() => setHasCloset((prev) => !prev)}
              className={`min-h-[44px] py-2 px-1 rounded-xl border text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                hasCloset
                  ? 'border-brand bg-brand-light text-brand-hover shadow-xs'
                  : 'border-border-default bg-surface-card text-text-secondary hover:border-brand-line-strong'
              }`}
            >
              {SITE_CONTENT.matchingModal.step3.optionClosetLabel}
            </button>
          </div>

          {/* 시스템에어컨 활성화 시 펼쳐지는 토스식 인라인 알약 칩 [2대] [3대] [4대] [5대 이상] */}
          {hasAircon && (
            <div className="p-3 rounded-xl bg-surface-card border border-brand-line space-y-2 animate-slide-up">
              <div className="flex items-center justify-between text-[12px] font-bold text-text-secondary px-1">
                <span>설치된 에어컨 대수를 선택해 주세요</span>
                <span className="text-brand font-extrabold">{airconCount} 선택됨</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SITE_CONTENT.matchingModal.step3.airconUnits.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    data-testid={`btn-aircon-unit-${unit}`}
                    onClick={() => setAirconCount(unit)}
                    className={`py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                      airconCount === unit
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-surface-subtle border border-border-default text-text-secondary hover:border-brand-line-strong'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 그 외 옵션 및 특이사항 직접 입력창 */}
          <div>
            <input
              type="text"
              data-testid="input-custom-option-memo"
              value={customOptionMemo}
              onChange={(e) => setCustomOptionMemo(e.target.value)}
              placeholder={SITE_CONTENT.matchingModal.step3.optionEtcPlaceholder}
              className="w-full h-11 px-4 rounded-xl bg-surface-card border border-border-default text-[13px] text-text-primary focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <MissingCount guard={guard} />
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={goPrev}
          className="h-13 px-4 rounded-xl bg-surface-subtle text-text-secondary font-bold text-[15px] hover:bg-surface-subtle flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{SITE_CONTENT.matchingModal.prevButton}</span>
        </button>
        <button
          type="button"
          data-testid="modal-step3-next"
          onClick={() => guard.attempt(goNext)}
          className="flex-1 h-13 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all bg-brand hover:bg-brand-hover text-white shadow-brand-glow cursor-pointer"
        >
          <span>{resumeShort ? SITE_CONTENT.matchingModal.resumeNextButton : SITE_CONTENT.matchingModal.step3.nextStepButton}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
