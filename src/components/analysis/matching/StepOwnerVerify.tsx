'use client';

/** 4단계: 소유주 이름·통신사·동의 묶음·휴대폰 인증 */
import { ArrowRight, ArrowLeft, Phone, AlertTriangle, Clock, BadgeCheck } from 'lucide-react';
import { countdown } from '@/lib/auth/phone';
import { SITE_CONTENT } from '@/config/siteContent';
import ConsentGroup, { allConsented } from '../ConsentGroup';
import { CARRIERS } from './carriers';
import type { MatchingForm } from './useMatchingForm';
import { FieldError, MissingCount, errorRing, useMissingGuard } from './missingGuard';

export default function StepOwnerVerify({ form }: { form: MatchingForm }) {
  const { ownerName, setOwnerName, ownerTelecom, setOwnerTelecom, consents, setConsents, sms, ownerPhone, setOwnerPhone, isSmsSent, isSmsVerified, smsError, handleSendSms, handleVerifySms, handleAutoFillSms, missing4, goNext, goPrev } = form;
  const guard = useMissingGuard(missing4);
  const miss = SITE_CONTENT.matchingModal.missing;

  return (
    <div className="space-y-4" data-testid="modal-step-4">
      <div>
        <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug">
          {SITE_CONTENT.matchingModal.step4.title}
        </h3>
        <p className="text-[12px] font-medium text-text-tertiary mt-1">
          {SITE_CONTENT.matchingModal.step4.subTitle}
        </p>
      </div>

      <div className="space-y-3">
        {/* 소유주 성명 */}
        <div data-field="OWNER_NAME">
          <label className="text-[12px] font-bold text-text-secondary block mb-1">
            {SITE_CONTENT.matchingModal.step4.ownerNameLabel} *
          </label>
          <input
            type="text"
            data-testid="input-owner-name"
            value={ownerName}
            disabled={isSmsVerified}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder={SITE_CONTENT.matchingModal.step4.ownerNamePlaceholder}
            className={`w-full h-12 rounded-xl bg-surface-subtle border border-border-default px-4 font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand disabled:opacity-75 ${errorRing(guard.shown('OWNER_NAME'))}`}
          />
          <FieldError show={guard.shown('OWNER_NAME')} text={miss.OWNER_NAME} />
        </div>

        {/* 통신사 선택 (6종) */}
        <div>
          <label className="text-[12px] font-bold text-text-secondary block mb-1">
            {SITE_CONTENT.matchingModal.step4.carrierSectionTitle} *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CARRIERS.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={isSmsVerified}
                onClick={() => setOwnerTelecom(c.id)}
                className={`min-h-[44px] py-2 px-1 rounded-xl border text-[12px] font-bold transition-all cursor-pointer ${
                  ownerTelecom === c.id
                    ? 'border-brand bg-brand-light text-brand-hover shadow-xs'
                    : 'border-border-default bg-surface-subtle text-text-secondary'
                } ${isSmsVerified ? 'opacity-75' : ''}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 동의 묶음: 휴대폰 번호가 문자 발송 업체로 넘어가기 전에 */}
        <ConsentGroup value={consents} onChange={setConsents} locked={isSmsVerified} />

        {/* 휴대폰 번호 & SMS 인증 인터랙션 */}
        <div data-field="SMS_VERIFY">
          <label className="text-[12px] font-bold text-text-secondary block mb-1">
            {SITE_CONTENT.matchingModal.step4.phoneLabel} *
          </label>
          <div className="flex gap-2">
            <div className={`h-12 flex-1 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 gap-2 focus-within:border-brand ${errorRing(guard.shown('SMS_VERIFY'))}`}>
              <Phone className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <input
                type="tel"
                data-testid="input-owner-phone"
                value={ownerPhone}
                disabled={isSmsVerified}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder={SITE_CONTENT.matchingModal.step4.phonePlaceholder}
                className="w-full bg-transparent font-bold text-[15px] text-text-primary focus:outline-none disabled:opacity-75"
              />
            </div>
            {!isSmsVerified && (
              <button
                type="button"
                data-testid="btn-send-sms"
                disabled={!allConsented(consents) || !sms.phoneOk || sms.busy}
                onClick={handleSendSms}
                className="h-12 px-4 rounded-xl bg-brand text-white font-extrabold text-[13px] hover:bg-brand-hover active:scale-95 transition-all flex-shrink-0 cursor-pointer disabled:bg-border-default disabled:text-text-tertiary disabled:cursor-not-allowed"
              >
                {isSmsSent
                  ? SITE_CONTENT.matchingModal.step4.resendCodeButton
                  : SITE_CONTENT.matchingModal.step4.sendCodeButton}
              </button>
            )}
          </div>
          <FieldError show={guard.shown('SMS_VERIFY')} text={miss.SMS_VERIFY} />
        </div>

        {/* SMS 6자리 인증번호 입력창 (발송 후 노출) */}
        {isSmsSent && !isSmsVerified && (
          <div
            data-testid="sms-verification-box"
            className="p-4 rounded-xl bg-surface-subtle border border-brand-line-strong space-y-3 animate-slide-up"
          >
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-text-secondary">
                {SITE_CONTENT.matchingModal.step4.codeSentNotice}
              </span>
              <span className="font-bold text-brand flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {countdown(sms.secondsLeft)}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                data-testid="input-sms-code"
                inputMode="numeric"
                value={sms.code}
                onChange={(e) => sms.setCode(e.target.value)}
                placeholder={SITE_CONTENT.matchingModal.step4.codePlaceholder}
                className="h-11 flex-1 rounded-lg bg-surface-card border border-border-default px-3 font-extrabold text-[17px] text-text-primary tracking-wider focus:outline-none focus:border-brand"
              />
              <button
                type="button"
                data-testid="btn-confirm-sms"
                onClick={handleVerifySms}
                className="h-11 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white font-extrabold text-[13px] active:scale-95 transition-all cursor-pointer"
              >
                {SITE_CONTENT.matchingModal.step4.confirmCodeButton}
              </button>
            </div>

            {smsError && (
              <div className="text-[12px] font-bold text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{smsError}</span>
              </div>
            )}

            {/* 테스트 원클릭 편의 버튼 */}
            <button
              type="button"
              data-testid="btn-autofill-sms"
              onClick={handleAutoFillSms}
              className="w-full py-2 rounded-lg bg-brand-subtle hover:bg-brand-light text-brand-hover font-bold text-[12px] text-center transition-colors cursor-pointer"
            >
              {SITE_CONTENT.matchingModal.step4.testAutoFillButton}
            </button>
          </div>
        )}

        {/* 인증 성공 배지 */}
        {isSmsVerified && (
          <div
            data-testid="sms-verified-badge"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between animate-fade-in"
          >
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-[13px]">
              <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{SITE_CONTENT.matchingModal.step4.verifiedBadge}</span>
            </div>
            <button
              type="button"
              onClick={sms.reset}
              className="text-[12px] font-bold text-text-tertiary underline hover:text-text-primary"
            >
              변경
            </button>
          </div>
        )}
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
          data-testid="modal-step4-next"
          onClick={() => guard.attempt(goNext)}
          className="flex-1 h-13 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all bg-brand hover:bg-brand-hover text-white shadow-brand-glow cursor-pointer"
        >
          <span>{SITE_CONTENT.matchingModal.step4.nextStepButton}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
