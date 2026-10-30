import { describe, expect, it } from 'vitest';
import { addInquiry, answerInquiry, BODY_MAX, inquiriesOf, maskPhonesInText, parseInquiries, splitInquiries, type Inquiry } from '../inquiries';
import { todayItems } from '@/lib/admin/today';

const now = new Date('2026-11-02T03:00:00Z');
const later = (h: number) => new Date(now.getTime() + h * 3_600_000);
const base = { role: 'OWNER' as const, topic: 'CORRECTION' as const, phone: '010-1234-5678', body: '희망가를 잘못 넣었어요' };

describe('문의 보내기', () => {
  it('10일 기한, 숫자만 남긴 번호, 답 없음', () => {
    const r = addInquiry([], { ...base, requestId: 'BK-1', requestLabel: '힐스테이트다산 34평 매매' }, now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inquiry).toMatchObject({ role: 'OWNER', topic: 'CORRECTION', requestId: 'BK-1', phone: '01012345678', answer: null, at: now.toISOString(), dueAt: '2026-11-12T03:00:00.000Z' });
    expect(r.list).toHaveLength(1);
  });
  it('너무 짧거나 길면, 번호가 없으면 거절', () => {
    expect(addInquiry([], { ...base, body: ' 네 ' }, now)).toEqual({ ok: false, error: 'TOO_SHORT' });
    expect(addInquiry([], { ...base, body: '가'.repeat(BODY_MAX + 1) }, now)).toEqual({ ok: false, error: 'TOO_LONG' });
    expect(addInquiry([], { ...base, phone: '010' }, now)).toEqual({ ok: false, error: 'NO_PHONE' });
  });
  it('본문의 휴대폰 번호는 가려서 저장', () => {
    expect(maskPhonesInText('연락 010-9876-5432 또는 01098765432, 010 9876 5432')).toBe('연락 010-****-**** 또는 010-****-****, 010-****-****');
    const r = addInquiry([], { ...base, body: '제 번호 010-9876-5432로 연락 주세요' }, now);
    expect(r.ok && r.inquiry.body).toBe('제 번호 010-****-****로 연락 주세요');
  });
});

describe('답변', () => {
  const first = addInquiry([], base, now);
  const list = first.ok ? first.list : [];
  const id = list[0].id;
  it('한 번만, 빈 답 거절, 없는 문의 거절', () => {
    const a = answerInquiry(list, id, ' 고쳐 드렸어요 ', later(5));
    expect(a.ok && a.list[0].answer).toEqual({ body: '고쳐 드렸어요', at: later(5).toISOString() });
    if (!a.ok) return;
    expect(answerInquiry(a.list, id, '또', later(6))).toEqual({ ok: false, error: 'ALREADY' });
    expect(answerInquiry(list, id, '  ', later(6))).toEqual({ ok: false, error: 'EMPTY' });
    expect(answerInquiry(list, 'nope', '답', later(6))).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('답할 문의는 오래된 것부터, 답한 문의는 최신부터', () => {
    const a = addInquiry([], base, now);
    const b = a.ok ? addInquiry(a.list, base, later(1)) : null;
    const c = b && b.ok ? addInquiry(b.list, base, later(2)) : null;
    const all = c && c.ok ? c.list : [];
    const answered = answerInquiry(all, all[2].id, '답', later(3));
    const s = splitInquiries(answered.ok ? answered.list : []);
    expect(s.open.map((q) => q.at)).toEqual([now.toISOString(), later(1).toISOString()]);
    expect(s.answered).toHaveLength(1);
  });
});

describe('내 문의 · 저장소 읽기 · 오늘 할 일', () => {
  const a = addInquiry([], base, now);
  const b = a.ok ? addInquiry(a.list, { ...base, phone: '01099998888' }, later(1)) : null;
  const list: Inquiry[] = b && b.ok ? b.list : [];
  it('같은 번호만, 번호가 짧으면 빈 목록', () => {
    expect(inquiriesOf(list, '010-1234-5678')).toHaveLength(1);
    expect(inquiriesOf(list, '010')).toEqual([]);
  });
  it('깨진 저장값은 버린다', () => {
    expect(parseInquiries(JSON.parse(JSON.stringify(list)))).toHaveLength(2);
    expect(parseInquiries([{ id: 'x', role: 'OWNER', topic: 'NOPE' }, null, 3])).toEqual([]);
    expect(parseInquiries('nope')).toEqual([]);
  });
  it('답 안 한 문의는 관리자 오늘 할 일 (남은 날, 10일 지나면 빨강)', () => {
    const items = todayItems({ application: null, requests: [], deals: {}, log: [], now: later(24), inquiries: list });
    expect(items).toEqual([
      expect.objectContaining({ kind: 'INQUIRY', title: '010-12**-5678', overdue: false, daysLeft: 9 }),
      expect.objectContaining({ kind: 'INQUIRY', overdue: false, daysLeft: 10 }),
    ]);
    expect(todayItems({ application: null, requests: [], deals: {}, log: [], now: later(24 * 11), inquiries: list })[0]).toMatchObject({ overdue: true, daysLeft: 0 });
    const answered = answerInquiry(list, list[0].id, '답', later(2));
    expect(todayItems({ application: null, requests: [], deals: {}, log: [], now: later(24), inquiries: answered.ok ? answered.list : [] })).toHaveLength(1);
  });
});
