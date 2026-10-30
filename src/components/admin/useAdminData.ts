'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccessLogRow, AdminApplication } from '@/lib/data/repo';
import type { RequestDeals } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import type { AdminAction, AdminResult } from '@/lib/admin/adminLog';
import { reportRows, type ReportRow } from '@/lib/admin/reports';
import { todayItems } from '@/lib/admin/today';
import { track } from '@/lib/analytics/store';
import { parsePrivacyRequests, PRIVACY_REQUESTS_KEY, type PrivacyRequest } from '@/lib/privacy/myInfo';
import { repos } from '@/components/data/repos';
import { answerInquiry, type Inquiry } from '@/lib/support/inquiries';
import { loadInquiries, saveInquiries } from '@/components/support/inquiryStore';

/** 탈퇴 요청 (목업: 이 브라우저 저장소, 내 정보 관리가 씀). Supabase 연결 때 서버 표로 */
function readPrivacyRequests(): PrivacyRequest[] {
  try {
    return parsePrivacyRequests(JSON.parse(localStorage.getItem(PRIVACY_REQUESTS_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

/** 처리 결과 → 행동 기록 admin_action 이름 */
const ACTION_NAME = {
  FAKE_REPORT: { CONFIRMED: 'FAKE_CONFIRMED', REJECTED: 'FAKE_REJECTED', CONTACTED: 'CONTACTED' },
  FEE_OVERCHARGED: { CONFIRMED: 'FEE_CONFIRMED', REJECTED: 'FEE_REJECTED', CONTACTED: 'CONTACTED' },
} as const;

/**
 * 관리자 콘솔 저장소 상태. 읽기·쓰기는 저장소(components/data/repos → lib/data)로.
 * Supabase 연결 시 저장소 구현만 서버 액션 + 관리자 RLS로 바뀌고, 판정은 RPC 한 트랜잭션(판정 + 의뢰 종료 + 크레딧 환불 + 기록)
 */
export function useAdminData() {
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [deals, setDeals] = useState<Record<string, RequestDeals>>({});
  const [log, setLog] = useState<AdminAction[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyRequest[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const at = new Date();
    const [list, apps, actions, access] = await Promise.all([repos.requests.list(at), repos.admin.applications(), repos.admin.actions(), repos.contacts.accessLog()]);
    const entries = await Promise.all(list.map(async (r) => [r.id, await repos.deals.events(r.id)] as const));
    setRequests(list);
    setDeals(Object.fromEntries(entries));
    setApplications(apps);
    setLog(actions);
    setAccessLog(access);
    setPrivacy(readPrivacyRequests());
    setInquiries(loadInquiries());
    setNow(at.getTime());
  }, []);

  useEffect(() => {
    void reload().then(() => setLoaded(true));
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    // 다른 탭(집주인·중개사 화면)에서 바뀌면 바로 반영
    const onStorage = () => void reload();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const items = useMemo(
    () => todayItems({ application: null, applications, requests, deals, log, now: new Date(now), privacy, inquiries }),
    [applications, requests, deals, log, now, privacy, inquiries],
  );

  /** 문의 답변 (한 번만). 성공하면 true */
  const answer = (id: string, body: string): boolean => {
    const r = answerInquiry(loadInquiries(), id, body, new Date());
    if (!r.ok || !saveInquiries(r.list)) return false;
    setInquiries(r.list);
    return true;
  };
  const reports = useMemo(() => reportRows(requests, deals, log), [requests, deals, log]);

  /** 신고 처리: 허위 매물 판정은 저장소(집주인·중개사 화면이 바로 앎), 모든 처리는 관리자 기록에. 성공하면 true */
  const handle = async (row: ReportRow, result: AdminResult): Promise<boolean> => {
    const at = new Date();
    const action: AdminAction = { id: `${row.key}:${result}:${at.getTime()}`, at: at.toISOString(), target: row.kind, requestId: row.requestId, offerId: row.offerId, result };
    if (row.kind === 'FAKE_REPORT' && result !== 'CONTACTED') {
      const res = await repos.offers.decideFakeReport(row.requestId, row.offerId, result, at);
      if (!res.ok) return false;
    }
    const appended = await repos.admin.append(action);
    if (!appended.ok) return false;
    track('admin_action', { action: ACTION_NAME[row.kind][result] }, { requestId: row.requestId, offerId: row.offerId });
    await reload();
    return true;
  };

  /** 승인된 중개사 수 (가입 목록에서) */
  const approvedOffices = applications.filter((a) => a.status === 'APPROVED').length;
  const pendingOffices = applications.filter((a) => a.status === 'PENDING').length;

  return { loaded, now, requests, deals, items, reports, applications, approvedOffices, pendingOffices, inquiries, log, accessLog, reload, handle, answer };
}

export type AdminData = ReturnType<typeof useAdminData>;
