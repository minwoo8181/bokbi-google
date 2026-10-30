/**
 * 문의하기 (대표님 2026-10-29): 앱 안 양식으로 받고 관리자 "오늘 할 일"에 10일 기한으로 올린다. 카카오톡 문의는 나중에 결정.
 * 결정론·순수 함수. 목업 단계는 이 브라우저 저장소(INQUIRIES_KEY), Supabase 연결 때 서버 표 + 관리자 RLS로.
 * 본문에 휴대폰 번호를 적으면 가려서 저장한다 (답은 가입한 휴대폰으로 가니 필요 없음)
 */
import { PRIVACY_DUE_DAYS, phoneDigits } from '@/lib/privacy/myInfo';

export const INQUIRIES_KEY = 'bokbi_inquiries';
/** 답변 기한 (처리방침 8조와 같은 10일) */
export const INQUIRY_DUE_DAYS = PRIVACY_DUE_DAYS;
export const BODY_MIN = 5;
export const BODY_MAX = 500;

export type InquiryRole = 'OWNER' | 'BROKER';
export type InquiryTopic = 'CORRECTION' | 'REQUEST' | 'FEE' | 'OTHER';
export const INQUIRY_TOPICS: InquiryTopic[] = ['CORRECTION', 'REQUEST', 'FEE', 'OTHER'];

export interface Inquiry {
  id: string;
  role: InquiryRole;
  topic: InquiryTopic;
  /** 같이 보낸 의뢰 (없으면 null) */
  requestId: string | null;
  /** 의뢰 한 줄 (단지·평형·거래, 동·호수 없음) */
  requestLabel: string | null;
  /** 보낸 사람 휴대폰 (숫자만) — 본인 문의 찾기·답 알림용, 관리자 화면엔 가려서 */
  phone: string;
  body: string;
  at: string;
  dueAt: string;
  answer: { body: string; at: string } | null;
}

export type InquiryError = 'TOO_SHORT' | 'TOO_LONG' | 'NO_PHONE';

/** 본문의 휴대폰 번호를 가린다 (010-1234-5678 / 01012345678 / 010 1234 5678) */
export function maskPhonesInText(text: string): string {
  return text.replace(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, '010-****-****');
}

export function validateInquiry(body: string): InquiryError | null {
  const n = body.trim().length;
  if (n < BODY_MIN) return 'TOO_SHORT';
  if (n > BODY_MAX) return 'TOO_LONG';
  return null;
}

export function addInquiry(
  list: readonly Inquiry[],
  input: { role: InquiryRole; topic: InquiryTopic; requestId?: string | null; requestLabel?: string | null; phone: string; body: string },
  now: Date,
): { ok: true; list: Inquiry[]; inquiry: Inquiry } | { ok: false; error: InquiryError } {
  const err = validateInquiry(input.body);
  if (err) return { ok: false, error: err };
  const phone = phoneDigits(input.phone);
  if (phone.length < 10) return { ok: false, error: 'NO_PHONE' };
  const inquiry: Inquiry = {
    id: `INQ-${now.getTime().toString(36)}-${list.length}`,
    role: input.role,
    topic: input.topic,
    requestId: input.requestId ?? null,
    requestLabel: input.requestLabel ?? null,
    phone,
    body: maskPhonesInText(input.body.trim()),
    at: now.toISOString(),
    dueAt: new Date(now.getTime() + INQUIRY_DUE_DAYS * 86_400_000).toISOString(),
    answer: null,
  };
  return { ok: true, list: [...list, inquiry], inquiry };
}

export type AnswerError = 'NOT_FOUND' | 'ALREADY' | 'EMPTY';

/** 답변: 한 번만 (고쳐야 하면 새 문의로). 빈 답은 거절 */
export function answerInquiry(list: readonly Inquiry[], id: string, body: string, now: Date): { ok: true; list: Inquiry[] } | { ok: false; error: AnswerError } {
  const text = body.trim();
  if (!text) return { ok: false, error: 'EMPTY' };
  const target = list.find((q) => q.id === id);
  if (!target) return { ok: false, error: 'NOT_FOUND' };
  if (target.answer) return { ok: false, error: 'ALREADY' };
  return { ok: true, list: list.map((q) => (q.id === id ? { ...q, answer: { body: text, at: now.toISOString() } } : q)) };
}

/** 내 문의: 같은 휴대폰, 최신이 위 */
export function inquiriesOf(list: readonly Inquiry[], phone: string): Inquiry[] {
  const p = phoneDigits(phone);
  return p.length < 10 ? [] : list.filter((q) => q.phone === p).sort((a, b) => b.at.localeCompare(a.at));
}

/** 관리자: 답할 문의(오래된 것부터) / 답한 문의(최신부터) */
export function splitInquiries(list: readonly Inquiry[]): { open: Inquiry[]; answered: Inquiry[] } {
  return {
    open: list.filter((q) => !q.answer).sort((a, b) => a.at.localeCompare(b.at)),
    answered: list.filter((q) => q.answer).sort((a, b) => b.answer!.at.localeCompare(a.answer!.at)),
  };
}

const TOPICS = new Set<string>(INQUIRY_TOPICS);

export function parseInquiries(raw: unknown): Inquiry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (q): q is Inquiry =>
      !!q &&
      typeof q === 'object' &&
      typeof q.id === 'string' &&
      (q.role === 'OWNER' || q.role === 'BROKER') &&
      TOPICS.has(q.topic) &&
      typeof q.phone === 'string' &&
      typeof q.body === 'string' &&
      typeof q.at === 'string' &&
      typeof q.dueAt === 'string',
  );
}
