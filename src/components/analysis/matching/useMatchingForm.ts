'use client';

/**
 * 매칭 모달 상태·계산·제출 (단계 화면은 Step*.tsx, 껍데기는 ../MatchingBottomSheetModal.tsx).
 * 단계 화면은 이 hook이 돌려주는 form 하나만 받는다
 */
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApartmentStat } from '@/types';
import { formatPriceTenThousand } from '@/lib/utils';
import { usePhoneVerification } from '@/components/auth/usePhoneVerification';
import { computeCommissionQuote } from '@/lib/commission';
import { referenceOf } from '@/lib/market/floorBand';
import { comparePriceToTrade } from '@/lib/market/priceCompare';
import { checkUnit, isSingleBuilding } from '@/lib/market/units';
import { buyerCashManwon, leasedSaleSummary, validateLeasedSale, type LeaseKind, type LeasedSaleInput, type RenewalRight } from '@/lib/market/leasedSale';
import { mortgageSummary, validateMortgage, type MortgageInput, type MortgagePlan, type MortgageStatus } from '@/lib/market/mortgage';
import { TradeType, FloorCategory, TelecomCarrier, ModalStep, PyeongDetailStat, SpecialBonusOption, OccupancyStatus, ComplexUnits, RecommendationView } from '../types';
import { SITE_CONTENT } from '@/config/siteContent';
import { draftAppliesTo, type ResumeStep, type SavedRequest } from '@/lib/requests/requestDraft';
import { MASKED_HO, maskDong, maskPhoneDeep } from '@/lib/requests/matchingMask';
import { localRequestNumber, moveInLabel, optionsSummary, submittedAtLabel } from '@/lib/requests/moveIn';
import { STEP_INDEX, nextStep, prevStep } from '@/lib/requests/modalStep';
import { recommendationSnapshot } from '@/lib/requests/recommendationSnapshot';
import { missingDongHo, missingFinalPledge, missingOwnerVerify, missingStep1, missingStep2 } from '@/lib/requests/missingFields';
import { refillDraft, submitRequest } from '../submitRequest';
import { discountPctOf, priceBand } from '@/lib/analytics/derive';
import { track } from '@/lib/analytics/store';
import { ALL_CONSENT, allConsented, NO_CONSENT, type ConsentState } from '../ConsentGroup';
import { CARRIERS } from './carriers';

/**
 * 복비 정하기 단계가 쓰는 분석 화면 상태 (2026-10-27 분석 카드에서 옮김).
 * 금액·옵션 상태는 분석 화면(AnalysisClient)에 그대로 두고 여기서 조절만 한다 — 계산은 예전과 같다
 */
export interface FeeControls {
  tradeType: TradeType;
  /** 기준 실거래 (선택 층 구간의 가장 최근 거래, 원) */
  dealPriceWon: number;
  recommendation: RecommendationView | null;
  onCommissionChange: (won: number) => void;
  onToggleBonus: (id: string) => void;
  onUpdateBonusAmount: (id: string, amount: number) => void;
  onUpdateBonusConditionText: (id: string, text: string) => void;
}

export interface MatchingBottomSheetModalProps {
  isOpen: boolean;
  /** completed: 요청을 마치고 닫음 → 부모가 모달을 새로 만들어 다음에는 1단계부터 */
  onClose: (opts?: { completed: boolean }) => void;
  apartment: ApartmentStat;
  tradeType: TradeType;
  onChangeTradeType?: (type: TradeType) => void;
  selectedPyeong: PyeongDetailStat;
  onSelectPyeong?: (pyeongId: string) => void;
  pyeongList?: PyeongDetailStat[];
  floorCategory: FloorCategory;
  floorLabel: string;
  customCommissionWon: number;
  bonusOptions: SpecialBonusOption[];
  fee: FeeControls;
  /** 건축물대장 동·호 목록 (동·호수 실존 확인). 없으면 자유 입력 */
  units?: ComplexUnits | null;
  /**
   * 다시 요청 (내 의뢰 → 수정): 저장된 요청서로 값을 채우고 그 단계부터 연다.
   * 수정한 단계의 "다음"은 5단계(미리보기·서약)로 바로 가고, 복비는 다시 요청 시트에서 고른 값
   */
  resume?: { draft: SavedRequest; step: ResumeStep; feeWon: number } | null;
}

export function useMatchingForm({
  isOpen,
  onClose,
  apartment,
  tradeType: initialTradeType,
  onChangeTradeType,
  selectedPyeong: initialSelectedPyeong,
  onSelectPyeong,
  pyeongList = [],
  floorCategory,
  floorLabel,
  customCommissionWon,
  bonusOptions,
  fee,
  units = null,
  resume = null,
}: MatchingBottomSheetModalProps) {
  const router = useRouter();
  const [modalStep, setModalStep] = useState<ModalStep>('TRADE_PYEONG');

  // ─── Step 1: 모달 내 거래유형 & 평형대 상태 ───
  const [currentTradeType, setCurrentTradeType] = useState<TradeType>(initialTradeType);
  const [currentPyeong, setCurrentPyeong] = useState<PyeongDetailStat>(initialSelectedPyeong);

  // 부모 prop 변경 시 동기화
  useEffect(() => {
    setCurrentTradeType(initialTradeType);
  }, [initialTradeType]);

  useEffect(() => {
    setCurrentPyeong(initialSelectedPyeong);
  }, [initialSelectedPyeong]);

  // 평형 리스트 fallback (단지 마스터 정보)
  const availablePyeongs = useMemo(() => {
    if (pyeongList && pyeongList.length > 0) return pyeongList;
    return [initialSelectedPyeong];
  }, [pyeongList, initialSelectedPyeong]);

  // 같은 평형 안 구조 타입 (33A·33B 등). 2개 이상이면 선택해야 다음 단계로 간다. null = 미선택, '' = 잘 모르겠어요
  const pyeongTypes = currentPyeong.types ?? [];
  const [currentTypeName, setCurrentTypeName] = useState<string | null>(null);
  useEffect(() => {
    // 다시 요청: 저장된 평형이면 저장된 타입으로
    setCurrentTypeName(draftAppliesTo(resume?.draft ?? null, currentPyeong.name, currentTradeType) ? (resume!.draft.pyeongTypeName ?? '') : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPyeong.id]);
  const selectedType = pyeongTypes.find((t) => t.name === currentTypeName) ?? null;
  const missing1 = missingStep1({ typeCount: pyeongTypes.length, typeName: currentTypeName });
  const canPassStep1 = missing1.length === 0;
  // 화면 표기용: "· 33A" (미확인은 표기하지 않음)
  const typeSuffix = selectedType ? ` · ${selectedType.name}` : '';

  // 실제 단지 평형 리스트가 변경되거나 현재 평형이 포함되지 않은 경우 자동 동기화
  useEffect(() => {
    if (availablePyeongs.length > 0 && !availablePyeongs.some((p) => p.id === currentPyeong.id)) {
      setCurrentPyeong(availablePyeongs[0]);
    }
  }, [availablePyeongs, currentPyeong]);

  // ─── Step 2: 희망가, 점유상태, 입주일, 세입자 정보 ───
  // 희망가 기본값 = 분석 화면과 같은 기준 실거래 (선택 층 구간의 가장 최근 거래)
  const defaultAskingPrice = (p: PyeongDetailStat, t: TradeType) =>
    referenceOf(p, t, floorCategory)?.priceManwon ?? (t === '매매' ? p.recentTradeAvgPrice : p.recentJeonseAvgPrice);
  const [askingPriceTenThousand, setAskingPriceTenThousand] = useState(defaultAskingPrice(currentPyeong, currentTradeType));
  const [occupancy, setOccupancy] = useState<OccupancyStatus>('VACANT');
  const [tenantPhone, setTenantPhone] = useState('');
  const [isTenantNotifiedChecked, setIsTenantNotifiedChecked] = useState(false);
  const [visitNoticeMemo, setVisitNoticeMemo] = useState('');

  const [moveInType, setMoveInType] = useState<'IMMEDIATE' | 'NEGOTIABLE' | 'DATE'>('IMMEDIATE');
  const [moveInDate, setMoveInDate] = useState('');
  const [isDirectEditingPrice, setIsDirectEditingPrice] = useState(false);
  const [tempAskingPriceInput, setTempAskingPriceInput] = useState('');

  // 거래유형 또는 선택 평형 변경 시 기본 희망가 자동 재계산
  useEffect(() => {
    // 다시 요청: 저장된 평형·거래 유형이면 저장된 희망가 그대로
    const d = resume?.draft ?? null;
    if (draftAppliesTo(d, currentPyeong.name, currentTradeType)) {
      setAskingPriceTenThousand(d.askingPriceTenThousand);
      return;
    }
    setAskingPriceTenThousand(defaultAskingPrice(currentPyeong, currentTradeType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTradeType, currentPyeong, floorCategory]);

  // 공실 선택 시 자동으로 '즉시 입주' 스마트 매핑
  const handleSelectOccupancy = (status: OccupancyStatus) => {
    setOccupancy(status);
    if (status === 'VACANT') {
      setMoveInType('IMMEDIATE');
    }
  };

  // ─── Step 2-1: 세입자 낀 매매 (매매 + 세입자 거주) ───
  const isLeasedSale = currentTradeType === '매매' && occupancy === 'TENANT';
  const leasedCopy = SITE_CONTENT.matchingModal.step2.leasedSale;
  const [leaseKind, setLeaseKind] = useState<LeaseKind | null>(null);
  const [leaseDepositInput, setLeaseDepositInput] = useState('');
  const [leaseRentInput, setLeaseRentInput] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [leaseRenewal, setLeaseRenewal] = useState<RenewalRight | null>(null);
  const leasedSaleInput: LeasedSaleInput = {
    kind: leaseKind,
    depositManwon: parseInt(leaseDepositInput, 10) || 0,
    monthlyRentManwon: parseInt(leaseRentInput, 10) || 0,
    leaseEndDate,
    renewal: leaseRenewal,
  };
  const leasedSaleError = isLeasedSale ? validateLeasedSale(leasedSaleInput, askingPriceTenThousand) : null;
  const leasedBuyerCash = isLeasedSale ? buyerCashManwon(askingPriceTenThousand, leasedSaleInput.depositManwon) : null;

  // 세입자가 있으면 즉시 입주가 불가능하므로 입주 시기는 임대 만료일로 맞춘다
  useEffect(() => {
    if (!isLeasedSale) return;
    if (leaseEndDate) {
      setMoveInType('DATE');
      setMoveInDate(leaseEndDate);
    } else if (moveInType === 'IMMEDIATE') {
      setMoveInType('NEGOTIABLE');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeasedSale, leaseEndDate]);

  // ─── Step 2-2: 근저당(융자) — 매매·전세 공통 ───
  const mortgageCopy = SITE_CONTENT.matchingModal.step2.mortgage;
  const [mortgageStatus, setMortgageStatus] = useState<MortgageStatus | null>(null);
  const [mortgageAmountInput, setMortgageAmountInput] = useState('');
  const [mortgagePlan, setMortgagePlan] = useState<MortgagePlan | null>(null);
  const mortgageInput: MortgageInput = {
    status: mortgageStatus,
    maxClaimManwon: parseInt(mortgageAmountInput, 10) || 0,
    plan: mortgageStatus === 'EXISTS' ? mortgagePlan : null,
  };
  const mortgageError = validateMortgage(mortgageInput);

  // ─── 다시 요청: 열릴 때 저장된 요청서로 2~4단계 값을 채운다 (평형·희망가·타입은 위 효과에서) ───
  // 본인 인증은 처음 요청 때 끝났으므로 다시 받지 않고, 서약(5단계)은 다시 체크해야 한다. 동·호수 없는 요청서(supabase)는 서버 본인 열람으로 채우고, 못 채우면 동·호수부터 인증까지 평소 순서로
  const [refillFailed, setRefillFailed] = useState(false);
  const [submit, setSubmit] = useState<'IDLE' | 'SENDING' | 'FAILED'>('IDLE');
  /** 저장된 접수번호 (완료 영수증) */
  const [requestNo, setRequestNo] = useState('');
  useEffect(() => {
    if (!isOpen || !resume) return;
    let alive = true;
    setModalStep(resume.step);
    void refillDraft(resume.draft, new Date()).then(({ draft: d, refilled }) => {
      if (!alive) return;
      setRefillFailed(!refilled);
      if (!refilled) setModalStep('DONG_HO');
      setOccupancy(d.occupancy);
      setTenantPhone(d.tenantPhone);
      setIsTenantNotifiedChecked(d.isTenantNotifiedChecked);
      setVisitNoticeMemo(d.visitNoticeMemo);
      setMoveInType(d.moveInType);
      setMoveInDate(d.moveInDate);
      setLeaseKind(d.leasedSale?.kind ?? null);
      setLeaseDepositInput(d.leasedSale?.depositManwon ? String(d.leasedSale.depositManwon) : '');
      setLeaseRentInput(d.leasedSale?.monthlyRentManwon ? String(d.leasedSale.monthlyRentManwon) : '');
      setLeaseEndDate(d.leasedSale?.leaseEndDate ?? '');
      setLeaseRenewal(d.leasedSale?.renewal ?? null);
      setMortgageStatus(d.mortgage.status);
      setMortgageAmountInput(d.mortgage.maxClaimManwon ? String(d.mortgage.maxClaimManwon) : '');
      setMortgagePlan(d.mortgage.plan);
      setDongInput(d.dongInput);
      setHoInput(d.hoInput);
      setHasAircon(d.hasAircon);
      setAirconCount(d.airconCount);
      setHasMidDoor(d.hasMidDoor);
      setHasCloset(d.hasCloset);
      setCustomOptionMemo(d.customOptionMemo);
      setOwnerName(d.ownerName);
      setOwnerPhone(d.ownerPhone);
      if (CARRIERS.some((c) => c.id === d.ownerTelecom)) setOwnerTelecom(d.ownerTelecom as TelecomCarrier);
      if (refilled) void (setConsents(ALL_CONSENT), sms.markVerified());
      setIsOwnerChecked(false);
      setIsLegalPledgeChecked(false);
    });
    return () => void (alive = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resume]);
  const resumeShort = !!resume && !refillFailed;

  // 희망가 ↔ 최근 실거래 (분석 화면과 같은 기준 실거래: 선택 층 구간의 가장 최근 거래)
  const tradeRef = referenceOf(currentPyeong, currentTradeType, floorCategory);
  const priceVsTrade = (() => {
    if (!tradeRef || !tradeRef.date) return null;
    const c = comparePriceToTrade(askingPriceTenThousand, tradeRef.priceManwon);
    return SITE_CONTENT.matchingModal.step2.priceVsTrade[c.kind]
      .replace('{band}', SITE_CONTENT.analysis.floorSelector.bands[floorCategory].label)
      .replace('{date}', tradeRef.date)
      .replace('{diff}', formatPriceTenThousand(c.diffManwon));
  })();

  // 빠진 칸 목록 (lib/requests/missingFields) — 비어 있어야 다음 단계로
  const missing2 = missingStep2({
    occupancy,
    tenantPhone,
    tenantNotified: isTenantNotifiedChecked,
    leasedSale: isLeasedSale ? { input: leasedSaleInput, askingManwon: askingPriceTenThousand } : null,
    mortgage: mortgageInput,
    moveInType,
    moveInDate,
  });
  const canPassStep2 = missing2.length === 0;

  // ─── Step 3: 동·호수 및 옵션/특이사항 ───
  // 예시값 없이 빈칸에서 시작 (2026-10-27: 테스트 기본값 104동 1802호 삭제)
  const [dongInput, setDongInput] = useState('');
  const [hoInput, setHoInput] = useState('');
  const unitCheck = useMemo(() => checkUnit(units, dongInput, hoInput), [units, dongInput, hoInput]);
  const singleBuilding = isSingleBuilding(units);
  const missing3 = missingDongHo({ check: unitCheck, dong: dongInput, ho: hoInput, singleBuilding });
  const canPassStep3 = missing3.length === 0;
  const [hasAircon, setHasAircon] = useState(false);
  const [airconCount, setAirconCount] = useState('3대');
  const [hasMidDoor, setHasMidDoor] = useState(false);
  const [hasCloset, setHasCloset] = useState(false);
  const [customOptionMemo, setCustomOptionMemo] = useState('');

  // 선택된 옵션 요약 문자열
  const selectedOptionsSummary = optionsSummary({ hasAircon, airconCount, hasMidDoor, hasCloset, customOptionMemo });

  // ─── Step 4: 소유주 성함 & SMS 간편 인증 ───
  // 이름·휴대폰은 빈칸에서 시작 (2026-10-27: 테스트 기본값 홍길동·010-9876-5432 삭제)
  const [ownerName, setOwnerName] = useState('');
  const [ownerTelecom, setOwnerTelecom] = useState<TelecomCarrier>('SKT');

  // 동의 묶음: 인증번호 발송 전에 필수 3개 모두 (대표님 승인 2026-10-25)
  const [consents, setConsents] = useState<ConsentState>(NO_CONSENT);
  // 휴대폰 인증: 번호 형식·6자리·3분 만료·보내기·확인은 공통 훅 (A1 — Supabase 스위치 때 실제 로그인)
  const sms = usePhoneVerification();
  const ownerPhone = sms.phone;
  const setOwnerPhone = sms.setPhone;
  const isSmsSent = sms.sent;
  const isSmsVerified = sms.verified;
  const smsError = sms.error
    ? sms.error === 'WRONG_CODE'
      ? SITE_CONTENT.matchingModal.step4.invalidCodeError
      : SITE_CONTENT.auth.errors[sms.error]
    : null;

  // ─── Step 5: 법적 서약 체크박스 (소유권 자격 & 허위매물 책임) ───
  const [isOwnerChecked, setIsOwnerChecked] = useState(false);
  const [isLegalPledgeChecked, setIsLegalPledgeChecked] = useState(false);
  const missing4 = missingOwnerVerify({ ownerName, smsVerified: isSmsVerified });
  const missing5 = missingFinalPledge({ ownerChecked: isOwnerChecked, legalChecked: isLegalPledgeChecked });

  const handleSendSms = () => {
    if (!allConsented(consents)) return;
    void sms.send();
  };
  const handleVerifySms = () => void sms.verify();
  const handleAutoFillSms = () => void sms.autofill();

  // ─── 실시간 블라인드 마스킹 로직 ───
  const maskedDong = maskDong(dongInput, singleBuilding);
  const maskedHo = MASKED_HO;
  const maskedPhoneDeep = maskPhoneDeep(ownerPhone);

  // 보너스 총액 계산
  const totalBonusWon = bonusOptions
    .filter((b) => b.checked)
    .reduce((sum, b) => sum + b.amountWon, 0);

  // ─── Step 2: 희망가 기준 실제 절약액 — 단일 견적 엔진 (법정 상한 하드캡·하한 30%, RULES 규칙 11) ───
  const askingPriceWon = askingPriceTenThousand * 10000;
  const quote = useMemo(
    // 다시 요청: 내 의뢰에서 고른 복비 그대로 (보너스는 처음 요청 때 이미 합쳐짐)
    () =>
      computeCommissionQuote({
        basisPriceWon: askingPriceWon,
        tradeType: currentTradeType,
        proposedWon: resume ? resume.feeWon : customCommissionWon,
        bonusWon: resume ? 0 : totalBonusWon,
      }),
    [askingPriceWon, currentTradeType, customCommissionWon, totalBonusWon, resume],
  );
  const legalCommission = quote.legal;
  const legalRate = legalCommission.rate;
  const legalMaxWon = legalCommission.maxWon;
  const finalCommissionWon = quote.totalWon;
  const savedWon = quote.savedWon;

  // 단계 번호 (1 ~ 6)·이동 규칙은 lib/requests/modalStep
  const currentStepNum = STEP_INDEX[modalStep];
  // 행동 기록 (A7): 단계 이동·닫기 — 어느 단계에서 그만두는지
  const logStep = (action: 'NEXT' | 'BACK' | 'CLOSE') => modalStep !== 'COMPLETE' && track('match_step', { step: currentStepNum, action });
  const goNext = () => {
    logStep('NEXT');
    setModalStep(nextStep(modalStep, resumeShort));
  };
  const goPrev = () => {
    logStep('BACK');
    setModalStep(prevStep(modalStep, resumeShort, resume?.step ?? null));
  };
  const close = (opts?: { completed: boolean }) => {
    if (!opts?.completed) logStep('CLOSE');
    onClose(opts);
  };

  // Step 6 완료 시 14대 입력 데이터 전수 영구 보존 (유실 제로화)
  const handleFinalSubmit = async () => {
    if (submit === 'SENDING') return;
    const now = new Date();
    // 저장(supabase면 서버 의뢰 생성까지)은 submitRequest — 실패하면 완료 화면으로 넘기지 않는다
    setSubmit('SENDING');
    const savedId = await submitRequest(
          {
            id: localRequestNumber(now),
            // 접수 일시는 완료 화면 대신 내 의뢰 상세에서 보여준다
            submittedAt: submittedAtLabel(now),
            // 내 의뢰 "자세히 조절하기" → 이 단지 분석 화면
            aptId: apartment.id,
            aptName: apartment.apt_name,
            pyeongId: currentPyeong.id,
            pyeongName: currentPyeong.name,
            pyeongSupplyArea: currentPyeong.supplyArea,
            pyeongExclusiveArea: currentPyeong.exclusiveArea,
            pyeongTypeName: selectedType?.name ?? null,
            pyeongTypeSupplyArea: selectedType?.supplyArea ?? null,
            pyeongTypeExclusiveArea: selectedType?.exclusiveArea ?? null,
            tradeType: currentTradeType,
            dongInput,
            hoInput,
            maskedDong,
            maskedHo,
            floorLabel,
            floorCategory,
            askingPriceTenThousand,
            askingPriceWon,
            finalCommissionWon,
            legalMaxWon,
            legalRatePercentLabel: legalCommission.ratePercentLabel,
            // 그때 쓴 추천 기준 버전·추천·실제 할인 (로직 기록장, 화면에는 안 씀)
            recommendation: recommendationSnapshot(fee.recommendation, { commissionWon: finalCommissionWon, legalMaxWon }),
            savedWon,
            occupancy,
            tenantPhone,
            isTenantNotifiedChecked,
            leasedSale: isLeasedSale
              ? { ...leasedSaleInput, summary: leasedSaleSummary(leasedSaleInput), buyerCashManwon: leasedBuyerCash }
              : null,
            mortgage: { ...mortgageInput, summary: mortgageSummary(mortgageInput, currentTradeType) },
            visitNoticeMemo,
            moveInType,
            moveInDate,
            moveInDateFormatted: moveInLabel(moveInType, moveInDate),
            ownerName,
            ownerPhone,
            ownerTelecom,
            hasAircon,
            airconCount,
            hasMidDoor,
            hasCloset,
            customOptionMemo,
            selectedOptionsSummary,
            bonusOptions: resume ? [] : bonusOptions.filter((b) => b.checked),
            isOwnerChecked,
            isLegalPledgeChecked,
            // 동의 기록 (어떤 항목에 언제 동의했는지, 백엔드에서는 서버 시각으로 저장)
            consents,
            consentedAt: now.toISOString(),
            createdAt: now.toISOString(),
          }, now);
    setSubmit(savedId ? 'IDLE' : 'FAILED');
    if (savedId) {
      const discountPct = discountPctOf(finalCommissionWon, legalMaxWon);
      if (discountPct !== null) track('request_submit', { discountPct, priceBand: priceBand(askingPriceTenThousand) }, { requestId: savedId });
      setRequestNo(savedId);
      setModalStep('COMPLETE');
    }
  };

  return {
    isOpen, onClose: close, apartment, initialTradeType, onChangeTradeType, initialSelectedPyeong, onSelectPyeong,
    pyeongList, floorCategory, floorLabel, customCommissionWon, bonusOptions, fee, units, resume, router, modalStep,
    setModalStep, currentTradeType, setCurrentTradeType, currentPyeong, setCurrentPyeong, availablePyeongs,
    pyeongTypes, currentTypeName, setCurrentTypeName, selectedType, canPassStep1, typeSuffix,
    defaultAskingPrice, askingPriceTenThousand, setAskingPriceTenThousand, occupancy, setOccupancy,
    tenantPhone, setTenantPhone, isTenantNotifiedChecked, setIsTenantNotifiedChecked, visitNoticeMemo,
    setVisitNoticeMemo, moveInType, setMoveInType, moveInDate, setMoveInDate, isDirectEditingPrice,
    setIsDirectEditingPrice, tempAskingPriceInput, setTempAskingPriceInput, handleSelectOccupancy,
    isLeasedSale, leasedCopy, leaseKind, setLeaseKind, leaseDepositInput, setLeaseDepositInput, leaseRentInput,
    setLeaseRentInput, leaseEndDate, setLeaseEndDate, leaseRenewal, setLeaseRenewal, leasedSaleInput,
    leasedSaleError, leasedBuyerCash, mortgageCopy, mortgageStatus, setMortgageStatus, mortgageAmountInput,
    setMortgageAmountInput, mortgagePlan, setMortgagePlan, mortgageInput, mortgageError, refillFailed,
    setRefillFailed, submit, setSubmit, resumeShort, tradeRef, priceVsTrade, canPassStep2, dongInput,
    setDongInput, hoInput, setHoInput, unitCheck, singleBuilding, canPassStep3, hasAircon, setHasAircon,
    airconCount, setAirconCount, hasMidDoor, setHasMidDoor, hasCloset, setHasCloset, customOptionMemo,
    setCustomOptionMemo, selectedOptionsSummary, ownerName, setOwnerName, ownerTelecom, setOwnerTelecom,
    consents, setConsents, sms, ownerPhone, setOwnerPhone, isSmsSent, isSmsVerified, smsError, isOwnerChecked,
    setIsOwnerChecked, isLegalPledgeChecked, setIsLegalPledgeChecked, handleSendSms, handleVerifySms,
    handleAutoFillSms, maskedDong, maskedHo, maskedPhoneDeep, totalBonusWon, askingPriceWon, quote,
    legalCommission, legalRate, legalMaxWon, finalCommissionWon, savedWon, currentStepNum, goNext, goPrev,
    handleFinalSubmit, requestNo, missing1, missing2, missing3, missing4, missing5,
  };
}

export type MatchingForm = ReturnType<typeof useMatchingForm>;
