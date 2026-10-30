'use client';

import React, { useMemo, useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { accessLines, actionLines } from '@/lib/admin/accessLog';
import { fill } from '@/components/my-requests/format';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '@/components/analysis/segmentStyles';
import { kstLabel } from './AdminReportsTab';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.system.log;
type Segment = keyof typeof t.segments;
const SEGMENTS: Segment[] = ['ACCESS', 'ACTION'];
const PAGE = 10;

/** 시스템 탭: 개인정보 열람 기록 (A5). 열람 = 연락처를 연 사람·때·의뢰, 관리자 처리 = 신고 판정. 10줄씩 더 보기 */
export default function AdminAccessLog({ data }: { data: AdminData }) {
  const [segment, setSegment] = useState<Segment>('ACCESS');
  const [shown, setShown] = useState(PAGE);
  const access = useMemo(() => accessLines(data.accessLog, data.requests), [data.accessLog, data.requests]);
  const actions = useMemo(() => actionLines(data.log, data.requests), [data.log, data.requests]);
  const total = segment === 'ACCESS' ? access.length : actions.length;
  const place = (name: string | null) => name ?? t.unknownRequest;

  return (
    <section className="p-4 rounded-2xl bg-surface-card space-y-3" data-testid="admin-access-log">
      <div>
        <h2 className="text-[15px] font-bold text-text-primary">{t.title}</h2>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.note}</p>
      </div>
      <div className={`${SEGMENT_TRACK} grid-cols-2`} role="tablist">
        {SEGMENTS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={segment === s}
            onClick={() => {
              setSegment(s);
              setShown(PAGE);
            }}
            data-testid={`admin-log-seg-${s}`}
            className={`${SEGMENT_ITEM} text-[13px] font-bold ${segmentItemState(segment === s)}`}
          >
            {t.segments[s]}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <p className="py-4 text-center text-[13px] font-medium text-text-tertiary">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-border-light">
          {segment === 'ACCESS'
            ? access.slice(0, shown).map((l) => (
                <li key={l.key} className="py-3 space-y-1" data-testid="admin-log-row">
                  <p className="text-[15px] font-bold text-text-primary">{t.who[l.purpose]}</p>
                  <p className="text-[13px] font-medium text-text-secondary break-keep">
                    {place(l.complexName)} · {fill(t.what[l.purpose], { reason: l.reason ?? '' })}
                  </p>
                  <p className="text-[12px] font-medium text-text-tertiary tabular-nums">{kstLabel(l.at)}</p>
                </li>
              ))
            : actions.slice(0, shown).map((l) => (
                <li key={l.key} className="py-3 space-y-1" data-testid="admin-log-row">
                  <p className="text-[15px] font-bold text-text-primary">
                    {t.target[l.target]} · {t.result[l.result]}
                  </p>
                  <p className="text-[13px] font-medium text-text-secondary break-keep">{place(l.complexName)}</p>
                  <p className="text-[12px] font-medium text-text-tertiary tabular-nums">{kstLabel(l.at)}</p>
                </li>
              ))}
        </ul>
      )}

      {shown < total && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="w-full h-11 text-[15px] font-bold text-text-secondary" data-testid="admin-log-more">
          {t.more}
        </button>
      )}
    </section>
  );
}
