'use client';

import React, { useState } from 'react';
import { Copy, MessageSquare, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { agentCountBand, officeAgeBand } from '@/lib/requests/stage';
import { OFFICE_MAP, officeMapSrc } from '@/lib/requests/officeMap';
import type { BrokerOffer } from '@/lib/requests/types';
import ActionSheet from './ActionSheet';
import { fill } from './format';

/** 매칭 확정 뒤 사무소 상세: 지도(서버 경유) + 주소·전화 글자(복사) + 전화·문자. 카카오톡은 두지 않음 (대표님 결정 2026-10-25) */
export default function OfficeSheet({ offer, currentYear, onClose }: { offer: BrokerOffer | null; currentYear: number; onClose: () => void }) {
  const t = SITE_CONTENT.myRequests.inProgress.officeSheet;
  const r = SITE_CONTENT.myRequests.receiving;
  const [mapFailed, setMapFailed] = useState(false);
  /** 방금 복사한 줄 (버튼 자리에 "복사했어요") */
  const [copied, setCopied] = useState<string | null>(null);
  if (!offer) return null;
  const d = offer.disclosure;
  const age = officeAgeBand(offer.officeOpenYear, currentYear);
  const agents = agentCountBand(offer.agentCount);
  const meta = [d.ceoName && fill(t.ceo, { name: d.ceoName }), age && r.ageBand[age], agents && r.agentBand[agents]].filter(Boolean).join(' · ');

  return (
    <ActionSheet open testId="office-sheet" title={d.officeName} cancelLabel={t.close} onCancel={onClose}>
      <p className="text-[13px] font-medium text-text-secondary">{meta}</p>
      {!mapFailed && (
        // 지도 이미지는 우리 서버가 VWorld에서 받아 전달 (키 숨김). 크기 고정이라 next/image 최적화는 쓰지 않음
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={officeMapSrc(d.regNo)}
          alt={fill(t.mapAlt, { office: d.officeName })}
          width={OFFICE_MAP.width}
          height={OFFICE_MAP.height}
          onError={() => setMapFailed(true)}
          data-testid="office-map"
          className="mt-3 w-full h-auto rounded-xl bg-surface-subtle"
        />
      )}
      {mapFailed && <p className="mt-3 text-[13px] font-medium text-text-tertiary">{t.mapError}</p>}
      {/* 주소·전화를 글자로 (2026-10-27 대표님): 저장하거나 전달할 때 버튼을 거치지 않게, 줄마다 복사 */}
      <dl className="mt-2" data-testid="office-info">
        {[
          { key: 'address', label: t.addressLabel, value: d.address },
          { key: 'phone', label: t.phoneLabel, value: d.phone },
        ]
          .filter((row) => row.value)
          .map((row) => (
            <div key={row.key} className="min-h-11 flex items-center gap-3 border-b border-border-light last:border-b-0">
              <dt className="w-10 shrink-0 text-[13px] font-medium text-text-tertiary">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-[15px] font-medium text-text-primary break-keep tabular-nums" data-testid={`office-${row.key}`}>
                {row.value}
              </dd>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(row.value).then(() => setCopied(row.key), () => undefined);
                }}
                aria-label={fill(t.copy, { label: row.label })}
                className="shrink-0 h-11 min-w-11 px-2 rounded-lg text-text-tertiary inline-flex items-center justify-center gap-1 text-[12px] font-bold active:scale-96 transition-transform duration-fast ease-out-soft"
              >
                {copied === row.key ? t.copied : <Copy className="w-4 h-4" aria-hidden />}
              </button>
            </div>
          ))}
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={`tel:${d.phone}`} className="h-13 rounded-xl bg-brand text-white text-[15px] font-bold flex items-center justify-center gap-2">
          <Phone className="w-4 h-4" aria-hidden />
          {t.call}
        </a>
        <a href={`sms:${d.phone}`} className="h-13 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4" aria-hidden />
          {t.sms}
        </a>
      </div>
    </ActionSheet>
  );
}
