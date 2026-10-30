import React from 'react';
import { COMPANY_INFO, SITE_CONTENT } from '@/config/siteContent';
import LegalText from '@/components/common/LegalText';

const FIELD_ORDER = [
  'legalName',
  'ceo',
  'businessNumber',
  'ecommerceNumber',
  'address',
  'phone',
  'email',
  'hostingProvider',
] as const;

/**
 * 전자상거래법 제10조 사이버몰 운영자 표시 항목. 초기화면(메인 푸터) 표시 의무가 있으므로
 * 메인 푸터에만 노출한다. 값은 COMPANY_INFO 단일 관리
 */
export default function BusinessInfoList({ className = '' }: { className?: string }) {
  const { businessInfoLabels, placeholderBadge } = SITE_CONTENT.home.footer;

  return (
    <div className={`text-left ${className}`}>
      {COMPANY_INFO.isPlaceholder && (
        <span className="inline-block mb-2 px-2 py-1 rounded bg-border-light text-[12px] font-bold text-text-secondary">
          {placeholderBadge}
        </span>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-left">
        {FIELD_ORDER.map((key) => (
          <React.Fragment key={key}>
            <dt className="text-text-tertiary whitespace-nowrap">{businessInfoLabels[key]}</dt>
            {/* 배포 전 교체 항목은 LegalText가 빨간 글씨 + "수정 필요"로 표시 */}
            <dd className="text-text-secondary break-keep">
              <LegalText text={`{company.${key}}`} />
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}
