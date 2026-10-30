'use client';

import React, { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { googleCalendarUrl, icsFileName, toIcsMany, type CalendarEvent } from '@/lib/calendar';
import ActionSheet from '@/components/my-requests/ActionSheet';

const t = SITE_CONTENT.calendar;

/**
 * .ics를 이 휴대폰에서 만들어 내려받는다 (서버를 거치지 않음).
 * 아이폰 Safari는 내려받기보다 data 주소로 열어야 "캘린더에 추가" 화면이 뜬다 (실기기 확인 필요)
 */
function downloadIcs(events: CalendarEvent[]) {
  const ics = toIcsMany(events, new Date());
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIos) {
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    return;
  }
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = icsFileName(events[0]);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface AddToCalendarButtonProps {
  /** 일정 하나 또는 여러 개 (거래 날짜는 한 번에) */
  event?: CalendarEvent;
  events?: CalendarEvent[];
  /** 저장 방법을 고른 뒤 (새 일정 강조를 끄는 데 씀) */
  onSaved?: () => void;
  variant?: 'solid' | 'soft';
  label?: string;
  testId?: string;
}

/**
 * 캘린더에 저장 → 휴대폰 캘린더(.ics, 여러 개도 파일 하나) / 구글 캘린더(제목·시간만, 링크 하나에 일정 하나라 날짜마다 따로)
 */
export default function AddToCalendarButton({ event, events, onSaved, variant = 'soft', label, testId }: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);
  const list = events ?? (event ? [event] : []);
  const done = () => {
    setOpen(false);
    onSaved?.();
  };
  const pickPhone = () => {
    downloadIcs(list);
    done();
  };
  const pickGoogle = (e: CalendarEvent) => {
    window.open(googleCalendarUrl(e), '_blank', 'noopener,noreferrer');
    if (list.length === 1) done();
    else onSaved?.();
  };
  if (list.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={testId}
        className={`h-11 px-3 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1 flex-shrink-0 active:scale-96 transition-transform duration-fast ease-out-soft ${
          variant === 'solid' ? 'bg-brand text-white' : 'bg-brand-light text-brand-hover'
        }`}
      >
        <CalendarPlus className="w-4 h-4" aria-hidden />
        {label ?? t.button}
      </button>
      <ActionSheet open={open} title={t.sheetTitle} cancelLabel={t.close} onCancel={() => setOpen(false)} testId="calendar-sheet">
        <p className="text-[13px] font-medium text-text-tertiary">{list.some((e) => e.hour === undefined) ? t.sheetSubDay : t.sheetSub}</p>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={pickPhone}
            data-testid="calendar-phone"
            className="w-full min-h-13 px-4 py-3 rounded-xl bg-surface-subtle text-left"
          >
            <span className="block text-[15px] font-bold text-text-primary">{t.phone}</span>
            <span className="block text-[13px] font-medium text-text-tertiary">{t.phoneSub}</span>
          </button>
          {list.map((e) => (
            <button
              key={e.uid}
              type="button"
              onClick={() => pickGoogle(e)}
              data-testid="calendar-google"
              className="w-full min-h-13 px-4 py-3 rounded-xl bg-surface-subtle text-left text-[15px] font-bold text-text-primary"
            >
              {list.length === 1 ? t.google : `${t.google} · ${e.title}`}
            </button>
          ))}
        </div>
      </ActionSheet>
    </>
  );
}
