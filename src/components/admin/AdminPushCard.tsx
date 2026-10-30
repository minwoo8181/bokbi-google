'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { PUSH_KINDS, type PushKind, type PushPrefs } from '@/lib/admin/push';
import { base64UrlToBytes, parsePushPrefs } from '@/lib/push/webPush';
import Switch from '@/components/my-requests/Switch';
import { pushPublicKey, savePushDevice, sendTestPush, updatePushDevice } from '@/app/admin/push/actions';

const t = SITE_CONTENT.adminConsole.push;
const PREFS_KEY = 'bokbi_admin_push_prefs';
const SW_URL = '/admin-sw.js';
const SCOPE = '/admin';

type Blocked = keyof typeof t.states;

function readPrefs(): PushPrefs {
  try {
    return parsePushPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null'));
  } catch {
    return parsePushPrefs(null);
  }
}

function writePrefs(p: PushPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // 저장이 막힌 브라우저: 화면 상태만
  }
}

/** 이 브라우저가 웹 푸시를 받을 수 있는지 (아이폰은 홈 화면에 추가한 앱에서만) */
function support(): Blocked | null {
  if (typeof window === 'undefined') return 'UNSUPPORTED';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'IOS_HOME';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'UNSUPPORTED';
  if (Notification.permission === 'denied') return 'DENIED';
  return null;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/**
 * 시스템 탭 "알림 받기" (대표님 2026-10-29 관리자 알림 시안): 이 기기 켜기·끄기, 알림 종류 4개, 시험 알림.
 * 자동 발송은 다음 단계 — 지금은 받기 설정과 시험 알림까지
 */
export default function AdminPushCard() {
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs>(() => parsePushPrefs(null));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    const b = support();
    setBlocked(b);
    if (b) return setReady(true);
    void currentSubscription()
      .then(setSub)
      .catch(() => setSub(null))
      .finally(() => setReady(true));
  }, []);

  const fail = useCallback((key: Blocked) => setNotice(t.states[key]), []);

  const turnOn = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const key = await pushPublicKey();
      if (!key.ok) return fail(key.error === 'NO_KEY' ? 'NO_KEY' : 'FAILED');
      if ((await Notification.requestPermission()) !== 'granted') return setBlocked('DENIED');
      await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
      const reg = await navigator.serviceWorker.ready;
      // 예전 키로 켠 기기면 새 키로 다시
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      const next = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key.key) });
      const saved = await savePushDevice(next.toJSON(), prefs);
      if (!saved.ok) {
        await next.unsubscribe();
        return fail('FAILED');
      }
      setSub(next);
    } catch {
      fail('FAILED');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!sub) return;
    setBusy(true);
    setNotice(null);
    try {
      await updatePushDevice(sub.endpoint, { active: false });
      await sub.unsubscribe();
      setSub(null);
    } catch {
      fail('FAILED');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (k: PushKind) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    writePrefs(next);
    if (sub) void updatePushDevice(sub.endpoint, { prefs: next });
  };

  const test = async () => {
    if (!sub) return;
    setBusy(true);
    setNotice(null);
    const r = await sendTestPush(sub.toJSON()).catch(() => ({ ok: false as const, error: 'FAILED' as const }));
    setBusy(false);
    if (r.ok) return setNotice(t.testSent);
    if (r.error === 'GONE') setSub(null);
    fail(r.error === 'NO_KEY' ? 'NO_KEY' : 'FAILED');
  };

  return (
    <section className="p-4 rounded-2xl bg-surface-card space-y-3" data-testid="admin-push">
      <div>
        <h2 className="text-[15px] font-bold text-text-primary">{t.cardTitle}</h2>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.cardNote}</p>
      </div>

      {ready && blocked && (
        <p className="p-3 rounded-xl bg-surface-subtle text-[13px] font-medium text-text-secondary break-keep text-pretty" data-testid="admin-push-blocked">
          {t.states[blocked]}
        </p>
      )}

      {ready && !blocked && (
        <>
          {sub ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-[var(--status-good-strong)]" data-testid="admin-push-on">
                {t.on}
              </span>
              <button type="button" onClick={() => void turnOff()} disabled={busy} className="h-11 px-2 text-[13px] font-bold text-text-tertiary" data-testid="admin-push-off">
                {t.turnOff}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void turnOn()}
              disabled={busy}
              className="w-full h-12 rounded-xl bg-brand text-white text-[15px] font-bold disabled:bg-surface-subtle disabled:text-text-tertiary active:scale-96 transition-transform duration-fast ease-out-soft"
              data-testid="admin-push-turn-on"
            >
              {t.turnOn}
            </button>
          )}

          <ul className="divide-y divide-border-light">
            {PUSH_KINDS.map((k) => (
              <li key={k} className="min-h-[52px] flex items-center justify-between gap-2">
                <span className="text-[15px] font-medium text-text-primary break-keep">{t.kinds[k]}</span>
                <Switch checked={prefs[k]} onChange={() => toggle(k)} label={t.kinds[k]} testId={`admin-push-pref-${k}`} />
              </li>
            ))}
          </ul>

          {sub && (
            <button
              type="button"
              onClick={() => void test()}
              disabled={busy}
              className="w-full h-11 rounded-xl border border-border-default text-[15px] font-bold text-text-primary"
              data-testid="admin-push-test"
            >
              {t.test}
            </button>
          )}
        </>
      )}

      {notice && (
        <p className="text-[13px] font-medium text-text-secondary break-keep" role="status" data-testid="admin-push-notice">
          {notice}
        </p>
      )}
      <p className="text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.laterNote}</p>
    </section>
  );
}
