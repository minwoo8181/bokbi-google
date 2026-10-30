import { describe, expect, it } from 'vitest';
import { HIDDEN, revealView } from '../revealView';
import type { OwnerContact } from '@/lib/requests/types';

const contact: OwnerContact = { ownerName: '홍길동', ownerPhone: '010-0000-0001', tenantPhone: '', visitMemo: '', optionMemo: '' };
const request = { dongHo: '104동 1802호', contact };

describe('revealView', () => {
  it('열람 성공이면 열람 값', () => {
    const v = revealView({ ok: true, value: { dongHo: '101동 1203호', contact: null } }, request, 'supabase');
    expect(v).toEqual({ dongHo: '101동 1203호', contact: null, status: 'ok' });
  });

  it('파기된 연락처(빈 동·호수)는 null', () => {
    expect(revealView({ ok: true, value: { dongHo: '', contact: null } }, request, 'supabase').dongHo).toBeNull();
  });

  it('local에서 저장소에 없는 의뢰는 의뢰에 든 값 (지금 화면과 같게)', () => {
    expect(revealView({ ok: false, error: 'NO_REQUEST' }, request, 'local')).toEqual({ dongHo: '104동 1802호', contact, status: 'ok' });
  });

  it('supabase에서 없는 의뢰는 가림 (의뢰에 든 값을 쓰지 않음)', () => {
    expect(revealView({ ok: false, error: 'NO_REQUEST' }, request, 'supabase')).toEqual(HIDDEN);
  });

  it('매칭 해제 등 거절은 local에서도 가림', () => {
    expect(revealView({ ok: false, error: 'NOT_ALLOWED' }, request, 'local')).toEqual(HIDDEN);
    expect(revealView({ ok: false, error: 'REASON_REQUIRED' }, request, 'local')).toEqual(HIDDEN);
  });
});
