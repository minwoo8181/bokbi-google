import { describe, expect, it } from 'vitest';
import { type BrokerApplication, approveApplication, parseApplication, rejectApplication, resolveOpenYear, sortApplications } from '../application';

const now = new Date('2026-10-25T12:00:00+09:00');
const app: BrokerApplication = {
  regNo: '41360-2024-60048',
  office: '1등이편한공인중개사사무소',
  code: '3180',
  strengths: [],
  phone: '010-1234-5678',
  submittedAt: '2026-10-25T10:00:00+09:00',
  status: 'PENDING',
  reviewedAt: null,
  rejectReason: null,
  openYear: null,
};

describe('approveApplication', () => {
  it('불러 준 코드가 같으면 승인 (띄어쓰기·하이픈 무시), 명단 연도를 쓴다', () => {
    const r = approveApplication(app, { spokenCode: '3 1-8 0', registryOpenYear: 2024, enteredYear: '', now });
    expect(r.ok && r.app.status).toBe('APPROVED');
    expect(r.ok && r.app.openYear).toBe(2024);
  });

  it('코드가 다르면 거절', () => {
    expect(approveApplication(app, { spokenCode: '3181', registryOpenYear: 2024, enteredYear: '', now })).toEqual({ ok: false, error: 'CODE_MISMATCH' });
  });

  it('명단에 연도가 없으면 입력이 필요하고, 1980~올해만 받는다', () => {
    const base = { spokenCode: '3180', registryOpenYear: null, now };
    expect(approveApplication(app, { ...base, enteredYear: '' })).toEqual({ ok: false, error: 'YEAR_REQUIRED' });
    expect(approveApplication(app, { ...base, enteredYear: '2027' })).toEqual({ ok: false, error: 'YEAR_INVALID' });
    expect(approveApplication(app, { ...base, enteredYear: '08' })).toEqual({ ok: false, error: 'YEAR_INVALID' });
    const r = approveApplication(app, { ...base, enteredYear: '2008' });
    expect(r.ok && r.app.openYear).toBe(2008);
  });

  it('이미 처리한 신청은 다시 승인하지 않는다', () => {
    const done = { ...app, status: 'APPROVED' as const };
    expect(approveApplication(done, { spokenCode: '3180', registryOpenYear: 2024, enteredYear: '', now })).toEqual({ ok: false, error: 'NOT_PENDING' });
  });
});

describe('관리자 가입 목록 순서·개설 연도', () => {
  const a = (status: BrokerApplication['status'], submittedAt: string) => ({ status, submittedAt });
  it('확인 대기 먼저(오래 기다린 순), 처리한 신청은 최근 순', () => {
    const list = [a('APPROVED', '2026-10-01'), a('PENDING', '2026-10-05'), a('REJECTED', '2026-10-09'), a('PENDING', '2026-10-02')];
    expect(sortApplications(list)).toEqual([a('PENDING', '2026-10-02'), a('PENDING', '2026-10-05'), a('REJECTED', '2026-10-09'), a('APPROVED', '2026-10-01')]);
  });
  it('명단 연도가 있으면 그대로, 없으면 1980~올해 입력', () => {
    const now = new Date('2026-11-02T00:00:00Z');
    expect(resolveOpenYear(2019, '', now)).toEqual({ ok: true, year: 2019 });
    expect(resolveOpenYear(null, ' ', now)).toEqual({ ok: false, error: 'YEAR_REQUIRED' });
    expect(resolveOpenYear(null, '1979', now)).toEqual({ ok: false, error: 'YEAR_INVALID' });
    expect(resolveOpenYear(null, '2027', now)).toEqual({ ok: false, error: 'YEAR_INVALID' });
    expect(resolveOpenYear(null, '2026', now)).toEqual({ ok: true, year: 2026 });
  });
});

describe('rejectApplication', () => {
  it('사유가 있어야 반려, 대기 중일 때만', () => {
    expect(rejectApplication(app, '', now)).toBeNull();
    expect(rejectApplication(app, '전화 연결 안 됨', now)?.status).toBe('REJECTED');
    expect(rejectApplication({ ...app, status: 'REJECTED' }, '코드 불일치', now)).toBeNull();
  });
});

describe('parseApplication', () => {
  it('예전 저장분(상태 없음)은 대기 중으로, 깨진 값은 null', () => {
    const old = { regNo: app.regNo, office: app.office, code: '3180', strengths: [], phone: '', submittedAt: '' };
    expect(parseApplication(JSON.stringify(old))?.status).toBe('PENDING');
    expect(parseApplication('{')).toBeNull();
    expect(parseApplication(JSON.stringify({ office: 'x' }))).toBeNull();
    expect(parseApplication(null)).toBeNull();
  });
});
