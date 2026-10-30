'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';

const t = LAB_CONTENT.heydealer.menu;

/** 헤이딜러 오른쪽 메뉴 판: 위 로고(흐리게), 아래쪽에 줄 목록 + 꺾쇠 (탭 바 대신) */
export default function HeydealerMenu({
  open,
  onClose,
  onOwnerGuide,
  onBrokerGuide,
}: {
  open: boolean;
  onClose: () => void;
  onOwnerGuide: () => void;
  onBrokerGuide: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const row = 'w-full h-14 px-6 flex items-center justify-between text-[15px] font-bold text-text-primary';
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.open} data-testid="hd-menu">
      <button type="button" aria-label={t.close} onClick={onClose} className="absolute inset-0 bg-[var(--lab-ink)] opacity-60" />
      <nav className="absolute inset-y-0 right-0 w-[78%] max-w-[320px] bg-surface-card flex flex-col animate-rise-in">
        <div className="h-14 px-2 flex items-center justify-between">
          <span className="px-4 text-[17px] font-extrabold text-text-disabled">{SITE_CONTENT.common.brandName}</span>
          <button type="button" onClick={onClose} aria-label={t.close} className="w-11 h-11 flex items-center justify-center text-text-primary">
            <X className="w-6 h-6" />
          </button>
        </div>
        <ul className="mt-auto pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <li>
            <Link href="/my-requests" className={row}>
              {t.requests}
              <ChevronRight className="w-5 h-5 text-text-disabled" aria-hidden />
            </Link>
          </li>
          <li>
            <Link href="/my-info" className={row}>
              {t.me}
              <ChevronRight className="w-5 h-5 text-text-disabled" aria-hidden />
            </Link>
          </li>
          <li>
            <button type="button" onClick={onOwnerGuide} className={row}>
              {t.ownerGuide}
              <ChevronRight className="w-5 h-5 text-text-disabled" aria-hidden />
            </button>
          </li>
          <li>
            <button type="button" onClick={onBrokerGuide} className={row}>
              {t.brokerGuide}
              <ChevronRight className="w-5 h-5 text-text-disabled" aria-hidden />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
