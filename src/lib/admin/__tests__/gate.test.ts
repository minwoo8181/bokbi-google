import { describe, expect, it } from 'vitest';
import { adminGate, cleanTotpCode, groupSecret, type AdminGateInput } from '../gate';

const admin: AdminGateInput = { backend: 'supabase', production: true, userId: 'u1', role: 'admin', verifiedTotp: 1, aal: 'aal2' };

describe('adminGate', () => {
  it('목업 단계: 개발 화면만 열고 배포 빌드는 404', () => {
    expect(adminGate({ ...admin, backend: 'local', production: false, userId: null })).toBe('OPEN');
    expect(adminGate({ ...admin, backend: 'local', production: true })).toBe('NOT_FOUND');
  });

  it('Supabase: 로그인 전 → 로그인', () => {
    expect(adminGate({ ...admin, userId: null, role: null, verifiedTotp: 0, aal: null })).toBe('LOGIN');
  });

  it('관리자가 아니면 없는 페이지 (인증 앱이 있어도, aal2여도)', () => {
    expect(adminGate({ ...admin, role: 'owner' })).toBe('NOT_FOUND');
    expect(adminGate({ ...admin, role: 'broker' })).toBe('NOT_FOUND');
    expect(adminGate({ ...admin, role: null })).toBe('NOT_FOUND');
  });

  it('관리자: 인증 앱 없음 → 등록, 있음 + aal1 → 6자리, aal2 → 열림', () => {
    expect(adminGate({ ...admin, verifiedTotp: 0, aal: 'aal1' })).toBe('ENROLL');
    expect(adminGate({ ...admin, aal: 'aal1' })).toBe('VERIFY');
    expect(adminGate({ ...admin, aal: null })).toBe('VERIFY');
    expect(adminGate(admin)).toBe('OPEN');
  });

  it('개발 서버에서도 Supabase 스위치가 켜져 있으면 관문을 거친다', () => {
    expect(adminGate({ ...admin, production: false, aal: 'aal1' })).toBe('VERIFY');
  });
});

describe('cleanTotpCode', () => {
  it('숫자만 6자리까지', () => {
    expect(cleanTotpCode('123 456')).toBe('123456');
    expect(cleanTotpCode('12a3')).toBe('123');
    expect(cleanTotpCode('12345678')).toBe('123456');
    expect(cleanTotpCode('')).toBe('');
  });
});

describe('groupSecret', () => {
  it('4자씩 띄움, 끝에 빈칸 없음', () => {
    expect(groupSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
    expect(groupSecret('ABCDEF')).toBe('ABCD EF');
    expect(groupSecret('AB CD')).toBe('ABCD');
  });
});
