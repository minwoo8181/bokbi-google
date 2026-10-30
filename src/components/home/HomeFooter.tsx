'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import LegalPolicyModal, { LEGAL_TABS, LegalTabType } from '@/components/common/LegalPolicyModal';
import BusinessInfoList from '@/components/common/BusinessInfoList';
import LegalText from '@/components/common/LegalText';

const LEGAL_LINKS = [
  { tab: 'terms', labelKey: 'termsLabel' },
  { tab: 'privacy', labelKey: 'privacyLabel' },
] as const satisfies ReadonlyArray<{ tab: LegalTabType; labelKey: string }>;

/** 모달 주소 연동: /?legal=privacy 로 직접 열 수 있고(외부 제출용 URL), 휴대폰 뒤로가기는 모달만 닫는다 */
const LEGAL_PARAM = 'legal';
const readLegalParam = (): LegalTabType | null => {
  const v = new URLSearchParams(window.location.search).get(LEGAL_PARAM);
  return LEGAL_TABS.includes(v as LegalTabType) ? (v as LegalTabType) : null;
};
const urlWithLegal = (tab: LegalTabType | null) => {
  const url = new URL(window.location.href);
  if (tab) url.searchParams.set(LEGAL_PARAM, tab);
  else url.searchParams.delete(LEGAL_PARAM);
  return url.pathname + url.search + url.hash;
};

export default function HomeFooter() {
  const { footer } = SITE_CONTENT.home;

  const [isBusinessInfoOpen, setIsBusinessInfoOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTabType | null>(null);
  // 이 화면에서 연 모달이면 닫을 때 history.back()으로 주소를 되돌린다 (직접 주소로 들어온 경우는 replace)
  const pushedRef = useRef(false);

  useEffect(() => {
    setLegalTab(readLegalParam());
    const onPop = () => {
      pushedRef.current = false;
      setLegalTab(readLegalParam());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleOpenLegal = (tab: LegalTabType) => {
    window.history.pushState(null, '', urlWithLegal(tab));
    pushedRef.current = true;
    setLegalTab(tab);
  };

  const handleChangeTab = (tab: LegalTabType) => {
    window.history.replaceState(null, '', urlWithLegal(tab));
  };

  const handleCloseLegal = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back(); // popstate에서 legalTab이 null로 바뀐다
    } else {
      window.history.replaceState(null, '', urlWithLegal(null));
      setLegalTab(null);
    }
  }, []);

  return (
    <>
      {/* 바닥글 4줄, 왼쪽 정렬 (대표님 2026-10-29 A안, 헤이딜러 바닥글): 링크 → 사업자 정보 펼치기 → 고지 한 줄 → 저작권 */}
      <footer className="px-6 pt-4 pb-12 bg-surface-page text-[12px] font-medium leading-[1.7] text-text-secondary break-keep">
        {/* ① 약관·개인정보 처리방침(굵게)·내 정보 관리. "책임의 한계"는 약관 창의 탭으로 연다 (터치 영역 44px) */}
        <nav className="flex flex-wrap items-center gap-x-4 -mx-1">
          {LEGAL_LINKS.map(({ tab, labelKey }) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleOpenLegal(tab)}
              className={`min-h-11 px-1 underline-offset-2 hover:underline cursor-pointer ${
                tab === 'privacy' ? 'font-bold text-text-primary' : 'hover:text-text-primary'
              }`}
            >
              {footer[labelKey]}
            </button>
          ))}
          {/* 내 정보 관리 (열람·정정·탈퇴, 대표님 2026-10-29) */}
          <Link href="/my-info" data-testid="footer-my-info" className="min-h-11 px-1 inline-flex items-center hover:text-text-primary underline-offset-2 hover:underline">
            {SITE_CONTENT.myInfo.link}
          </Link>
        </nav>

        {/* ② 사업자 정보 토글 + 펼친 세부 정보 */}
        <button
          type="button"
          onClick={() => setIsBusinessInfoOpen((prev) => !prev)}
          aria-expanded={isBusinessInfoOpen}
          className="-mx-1 inline-flex items-center gap-1 min-h-11 px-1 hover:text-text-primary cursor-pointer"
        >
          <span>
            <LegalText text={footer.businessInfoToggle} />
          </span>
          {isBusinessInfoOpen ? <ChevronUp className="w-3.5 h-3.5" aria-hidden /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden />}
        </button>
        {isBusinessInfoOpen && (
          <BusinessInfoList className="mb-2 p-3 rounded-xl bg-surface-card border border-border-light animate-fade-in" />
        )}

        {/* ③ 공인중개사법·전자상거래법 고지 한 줄 + ④ 저작권 */}
        <p>{footer.disclaimer}</p>
        <p>{footer.copyright}</p>
      </footer>

      {/* 약관 및 정책 모달 (주소 ?legal= 과 연동) */}
      <LegalPolicyModal
        isOpen={legalTab !== null}
        initialTab={legalTab ?? 'terms'}
        onClose={handleCloseLegal}
        onChangeTab={handleChangeTab}
      />
    </>
  );
}
