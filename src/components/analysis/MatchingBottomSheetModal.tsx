'use client';

/**
 * 매칭 모달 껍데기: 진행 바·헤더·단계 전환. 상태는 matching/useMatchingForm, 단계 화면은 matching/Step*.tsx
 */
import { SITE_CONTENT } from '@/config/siteContent';
import CloseButton from '@/components/common/CloseButton';
import ModalStepper from './matching/ModalStepper';
import { useMatchingForm, type MatchingBottomSheetModalProps } from './matching/useMatchingForm';
import StepTradePyeong from './matching/StepTradePyeong';
import StepPriceMoveIn from './matching/StepPriceMoveIn';
import StepFee from './matching/StepFee';
import StepDongHo from './matching/StepDongHo';
import StepOwnerVerify from './matching/StepOwnerVerify';
import StepFinalPledge from './matching/StepFinalPledge';
import StepComplete from './matching/StepComplete';

export default function MatchingBottomSheetModal(props: MatchingBottomSheetModalProps) {
  const form = useMatchingForm(props);
  const { isOpen, onClose, apartment, modalStep, currentTradeType, currentPyeong } = form;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="matching-modal-title"
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-[440px] bg-surface-card rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl border-t border-border-default overflow-hidden animate-slide-up">
        {/* 상단 헤더 & 조건 뱃지 (360px에서도 1줄 완벽 유지). 몇 번째 단계인지는 아래 진행 표시가 보여 줘 "3/6" 칩은 뺐다 (2026-10-27) */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 pb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <span className="text-[12px] font-extrabold text-brand-hover bg-brand-light px-3 py-1 rounded-full truncate max-w-[230px]">
              {apartment.apt_name} {currentPyeong.name}
            </span>
            <span className="text-[12px] font-bold text-text-secondary bg-surface-subtle px-2 py-1 rounded flex-shrink-0">
              {currentTradeType}
            </span>
          </div>
          {/* 닫기 X 통일 (2026-10-27): 글자 "닫기" → 다른 시트와 같은 X */}
          <CloseButton testId="modal-close-btn" onClick={() => onClose({ completed: modalStep === 'COMPLETE' })} className="-my-2 -mr-2" />
        </div>

        {/* 진행 표시: 단계 이름 동그라미 (예전 얇은 막대 대신, 2026-10-27 대표님 최종 시안). 완료 화면에서는 숨김 */}
        {modalStep !== 'COMPLETE' && (
          <div className="px-3 sm:px-4 pb-3 border-b border-border-light" data-testid="modal-stepper">
            <ModalStepper step={modalStep} />
          </div>
        )}
        {modalStep === 'COMPLETE' && <div className="border-b border-border-light" />}

        {/* 바텀시트 스크롤 본문 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 pb-8 space-y-5">
          {modalStep === 'TRADE_PYEONG' && <StepTradePyeong form={form} />}
          {modalStep === 'PRICE_MOVEIN' && <StepPriceMoveIn form={form} />}
          {modalStep === 'FEE' && <StepFee form={form} />}
          {modalStep === 'DONG_HO' && <StepDongHo form={form} />}
          {modalStep === 'OWNER_VERIFY' && <StepOwnerVerify form={form} />}
          {modalStep === 'FINAL_PLEDGE' && <StepFinalPledge form={form} />}
          {modalStep === 'COMPLETE' && <StepComplete form={form} />}
        </div>
      </div>
    </div>
  );
}
