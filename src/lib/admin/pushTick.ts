/**
 * 관리자 웹 푸시 자동 발송 한 번 (15분마다, 대표님 2026-10-29 A안). 읽기·보내기·기록은 밖에서 넣어 주고(서버 경로가 Supabase·web-push로),
 * 여기는 순서만: 켜진 기기 → 보낼 것 고르기(planPushes) → 기기마다 그 종류를 켰으면 보내기 → 한 곳이라도 받으면 "보냄" 기록.
 * 아무 기기도 못 받으면 기록하지 않아 다음 확인 때 다시 시도. 브라우저가 버린 기기(404·410)는 끈다
 */
import { kstParts, planPushes, PUSH_KINDS, type PushInput, type PushMessage, type PushPrefs } from './push';

export interface PushDeviceRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  prefs: PushPrefs;
}

export type SendResult = 'OK' | 'GONE' | 'FAILED';

export interface PushTickDeps {
  now: Date;
  devices(): Promise<PushDeviceRow[]>;
  load(): Promise<Pick<PushInput, 'items' | 'issues' | 'signups' | 'yesterday'>>;
  /** 오늘(한국 날짜) 이미 보낸 알림 key */
  sentToday(day: string): Promise<string[]>;
  send(device: PushDeviceRow, message: PushMessage): Promise<SendResult>;
  markSent(day: string, keys: string[]): Promise<void>;
  deactivate(endpoint: string): Promise<void>;
}

export interface PushTickResult {
  devices: number;
  planned: number;
  delivered: number;
  failed: number;
  gone: number;
}

export async function runPushTick(d: PushTickDeps): Promise<PushTickResult> {
  const devices = await d.devices();
  const out: PushTickResult = { devices: devices.length, planned: 0, delivered: 0, failed: 0, gone: 0 };
  if (!devices.length) return out;

  // 어느 기기든 켠 종류는 고르고, 실제 보내기는 기기별 설정으로
  const anyOn = Object.fromEntries(PUSH_KINDS.map((k) => [k, devices.some((x) => x.prefs[k])])) as PushPrefs;
  const { date } = kstParts(d.now);
  const [data, sent] = await Promise.all([d.load(), d.sentToday(date)]);
  const plan = planPushes({ ...data, now: d.now, prefs: anyOn, sent: sent.map((k) => `${date}:${k}`) });
  out.planned = plan.messages.length;

  const gone = new Set<string>();
  const done: string[] = [];
  for (const m of plan.messages) {
    let delivered = false;
    for (const device of devices) {
      if (!device.prefs[m.kind] || gone.has(device.endpoint)) continue;
      const r = await d.send(device, m);
      if (r === 'OK') {
        delivered = true;
        out.delivered += 1;
      } else if (r === 'GONE') {
        gone.add(device.endpoint);
      } else {
        out.failed += 1;
      }
    }
    if (delivered) done.push(m.key);
  }

  for (const endpoint of gone) await d.deactivate(endpoint);
  out.gone = gone.size;
  if (done.length) await d.markSent(date, done);
  return out;
}
