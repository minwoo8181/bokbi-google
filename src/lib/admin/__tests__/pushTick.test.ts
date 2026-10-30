import { describe, expect, it } from 'vitest';
import { DEFAULT_PUSH_PREFS, type PushMessage } from '../push';
import { runPushTick, type PushDeviceRow, type PushTickDeps, type SendResult } from '../pushTick';
import type { TodayItem } from '../today';

const kst = (s: string) => new Date(`${s}+09:00`);
const overdue: TodayItem = { key: 'fake:r1:o1', kind: 'FAKE_REPORT', requestId: 'r1', offerId: 'o1', title: '힐스테이트다산', since: '', hours: 30, overdue: true };
const device = (endpoint: string, prefs = DEFAULT_PUSH_PREFS): PushDeviceRow => ({ endpoint, p256dh: 'p', auth: 'a', prefs });

function deps(over: Partial<PushTickDeps> & { results?: Record<string, SendResult> } = {}) {
  const log = { sent: [] as [string, string][], marked: [] as [string, string[]][], off: [] as string[] };
  const d: PushTickDeps = {
    now: kst('2026-10-29T14:00:00'),
    devices: async () => [device('https://a')],
    load: async () => ({ items: [overdue], issues: [], signups: [], yesterday: { requests: 1, matched: 0 } }),
    sentToday: async () => [],
    send: async (dev: PushDeviceRow, m: PushMessage) => {
      log.sent.push([dev.endpoint, m.kind]);
      return over.results?.[dev.endpoint] ?? 'OK';
    },
    markSent: async (day, keys) => void log.marked.push([day, keys]),
    deactivate: async (e) => void log.off.push(e),
    ...over,
  };
  return { d, log };
}

describe('runPushTick', () => {
  it('켜진 기기가 없으면 읽지도 보내지도 않음', async () => {
    let loaded = false;
    const { d, log } = deps({ devices: async () => [], load: async () => ((loaded = true), { items: [], issues: [], signups: [], yesterday: { requests: 0, matched: 0 } }) });
    expect(await runPushTick(d)).toEqual({ devices: 0, planned: 0, delivered: 0, failed: 0, gone: 0 });
    expect(loaded).toBe(false);
    expect(log.sent).toEqual([]);
  });

  it('보내고 한국 날짜로 보낸 기록', async () => {
    const { d, log } = deps();
    const r = await runPushTick(d);
    expect(log.sent).toEqual([
      ['https://a', 'OVERDUE'],
      ['https://a', 'MORNING'],
    ]);
    expect(log.marked).toEqual([['2026-10-29', ['OVERDUE:fake:r1:o1', 'MORNING']]]);
    expect(r).toMatchObject({ planned: 2, delivered: 2 });
  });

  it('오늘 이미 보낸 것은 다시 안 보냄', async () => {
    const { d, log } = deps({ sentToday: async () => ['OVERDUE:fake:r1:o1', 'MORNING'] });
    expect((await runPushTick(d)).planned).toBe(0);
    expect(log.sent).toEqual([]);
    expect(log.marked).toEqual([]);
  });

  it('기기마다 켠 종류만 (아침 요약을 끈 기기엔 긴급만)', async () => {
    const { d, log } = deps({ devices: async () => [device('https://a'), device('https://b', { ...DEFAULT_PUSH_PREFS, MORNING: false })] });
    await runPushTick(d);
    expect(log.sent).toEqual([
      ['https://a', 'OVERDUE'],
      ['https://b', 'OVERDUE'],
      ['https://a', 'MORNING'],
    ]);
  });

  it('브라우저가 버린 기기는 끄고 그 뒤로 안 보냄, 아무도 못 받으면 기록 안 함(다음에 다시)', async () => {
    const { d, log } = deps({ devices: async () => [device('https://gone'), device('https://down')], results: { 'https://gone': 'GONE', 'https://down': 'FAILED' } });
    const r = await runPushTick(d);
    expect(log.sent).toEqual([
      ['https://gone', 'OVERDUE'],
      ['https://down', 'OVERDUE'],
      ['https://down', 'MORNING'],
    ]);
    expect(log.off).toEqual(['https://gone']);
    expect(log.marked).toEqual([]);
    expect(r).toMatchObject({ delivered: 0, failed: 2, gone: 1 });
  });

  it('한 기기라도 받으면 보낸 것으로', async () => {
    const { d, log } = deps({ devices: async () => [device('https://ok'), device('https://down')], results: { 'https://down': 'FAILED' } });
    await runPushTick(d);
    expect(log.marked[0][1]).toEqual(['OVERDUE:fake:r1:o1', 'MORNING']);
  });
});
