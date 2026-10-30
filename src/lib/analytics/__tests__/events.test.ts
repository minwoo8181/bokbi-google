import { describe, expect, it } from 'vitest';
import { MORE_CREDITS_ANSWERS } from '@/lib/broker/credits';
import { INQUIRY_TOPICS } from '@/lib/support/inquiries';
import { EVENT_NAMES, EVENT_SPECS, rolesOf, validateEvent, type AnalyticsEvent, type EventName, type EventProps } from '../events';
import { findPii } from '../privacy';
import { appendCapped, buildEvent, parseEvents, track, type EventSink } from '../store';

const at = new Date('2026-11-02T03:00:00Z');
const ev = (name: EventName, props: EventProps, over: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  ...buildEvent(name, props, { id: 'e1', at, actorId: 'anon-1', sessionId: 's-1', requestId: 'R1' }),
  ...over,
});

/** 명세에서 맞는 예시 props 만들기 (필수 칸만) */
function sampleProps(name: EventName): EventProps {
  const out: EventProps = {};
  for (const [k, p] of Object.entries(EVENT_SPECS[name].props) as [string, { type: string; optional?: true; values?: readonly string[]; min?: number }][]) {
    if (p.optional) continue;
    out[k] = p.type === 'int' || p.type === 'number' ? Math.max(1, p.min ?? 1) : p.type === 'boolean' ? true : p.type === 'enum' ? p.values![0] : 'id_1';
  }
  return out;
}

describe('이벤트 27개', () => {
  it('이름 27개, 기본 보낸 쪽 집주인 13 · 중개사 10 · 시스템 3 · 관리자 1, 양쪽이 보내는 기록 3개', () => {
    expect(EVENT_NAMES).toHaveLength(27);
    const byRole = EVENT_NAMES.reduce<Record<string, number>>((m, n) => ({ ...m, [rolesOf(n)[0]]: (m[rolesOf(n)[0]] ?? 0) + 1 }), {});
    expect(byRole).toEqual({ owner: 13, broker: 10, system: 3, admin: 1 });
    expect(EVENT_NAMES.filter((n) => rolesOf(n).length > 1).sort()).toEqual(['faq_view', 'inquiry_send', 'page_visit']);
  });

  it('양쪽 기록은 중개사로도 통과, 목록 밖 쪽은 막음', () => {
    const v = ev('page_visit', { page: 'AGENT', device: 'PHONE' }, { role: 'broker' });
    expect(validateEvent(v)).toEqual([]);
    expect(validateEvent({ ...v, role: 'admin' })).toContain('role: admin ≠ owner|broker');
  });

  it('문의 주제·크레딧 고른 항목 목록은 원래 규칙과 같음', () => {
    expect(EVENT_SPECS.inquiry_send.props.topic.values).toEqual(INQUIRY_TOPICS);
    expect(EVENT_SPECS.more_credits_answer.props.answer.values).toEqual(MORE_CREDITS_ANSWERS);
  });

  it('모든 이벤트: 명세대로 만든 예시는 통과 (27/27)', () => {
    const failed = EVENT_NAMES.filter((n) => validateEvent(ev(n, sampleProps(n))).length > 0);
    expect(failed).toEqual([]);
  });

  it('형식 오류: 모르는 이름·보낸 쪽 다름·필수 빠짐·모르는 칸·타입·범위·목록 밖', () => {
    expect(validateEvent(ev('feed_view', {}, { name: 'nope' as EventName }))).toEqual(['unknown event: nope']);
    expect(validateEvent(ev('feed_view', {}, { role: 'owner' }))).toContain('role: owner ≠ broker');
    expect(validateEvent(ev('match_confirm', {}))).toContain('props.count: required');
    expect(validateEvent(ev('feed_view', { extra: 1 }))).toContain('props.extra: unknown');
    expect(validateEvent(ev('match_confirm', { count: 1.5 }))).toContain('props.count: int');
    expect(validateEvent(ev('match_confirm', { count: 4 }))).toContain('props.count: out of range');
    expect(validateEvent(ev('match_step', { step: 2, action: 'JUMP' }))).toContain('props.action: not in enum');
    expect(validateEvent(ev('deal_answer', { step: 'CONTRACT', ok: 'yes' }))).toContain('props.ok: boolean');
    expect(validateEvent(ev('broker_signup', { step: 'x'.repeat(41), result: 'OK' }))).toContain('props.step: id');
    expect(validateEvent(ev('feed_view', {}, { at: 'later' }))).toContain('at: not a date');
  });
});

describe('개인정보 차단', () => {
  it('키 이름으로 막음: 동·호수·전화·이름·주소·연락처·이메일·메모', () => {
    expect(findPii({ dongHo: '1', ownerPhone: '1', officeName: 'a', address: 'a', contact: 'a', email: 'a', visitMemo: 'a', ho: 1 })).toHaveLength(8);
    expect(findPii({ complexId: '16', pyeong: '34A', discountPct: 30, tradeType: 'SALE' })).toEqual([]);
  });

  it('값 모양으로 막음: 휴대폰·전화·동호·도로명·번지·이메일', () => {
    const bad = ['010-1234-5678', '01012345678', '031-555-1234', '205동 2301호', '2301호', '다산중앙로 123', '산 12-3번지', 'a@b.co', '1103동 '];
    for (const v of bad) expect(findPii({ errorCode: v })).toEqual(['errorCode']);
    for (const v of ['E_TIMEOUT', '34A', 'SALE', '16', 'step_3']) expect(findPii({ errorCode: v })).toEqual([]);
  });

  it('검사에서 개인정보는 오류로, 저장되지 않는다', () => {
    expect(validateEvent(ev('ai_explain', { ok: false, ms: 10, errorCode: '010-1234-5678' }))).toContain('props.errorCode: personal info');
    const saved: AnalyticsEvent[] = [];
    const sink: EventSink = { append: (e) => saved.push(e), all: () => saved };
    const errors = track('sale_change', { action: 'PAUSE', reasonChip: '205동 2301호' }, {}, sink);
    expect(errors.length).toBeGreaterThan(0);
    expect(saved).toEqual([]);
    expect(track('feed_view', {}, {}, sink)).toEqual([]);
    expect(saved.map((e) => e.name)).toEqual(['feed_view']);
  });
});

describe('저장', () => {
  it('상한을 넘으면 오래된 것부터 버림, 깨지거나 형식이 틀린 기록은 읽을 때 버림', () => {
    const list = [1, 2, 3].map((i) => ev('feed_view', {}, { id: `e${i}` }));
    expect(appendCapped(list, ev('feed_view', {}, { id: 'e4' }), 3).map((e) => e.id)).toEqual(['e2', 'e3', 'e4']);
    expect(parseEvents(JSON.stringify([list[0], { ...list[1], name: 'nope' }, null])).map((e) => e.id)).toEqual(['e1']);
    expect(parseEvents('{oops')).toEqual([]);
  });
});
