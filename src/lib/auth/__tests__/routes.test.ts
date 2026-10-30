import { describe, expect, it } from 'vitest';
import { needsLogin, safeNext } from '../routes';

describe('로그인이 필요한 화면', () => {
  it('내 의뢰·중개사 화면(하위 포함)은 로그인 필요', () => {
    for (const p of ['/my-requests', '/agent', '/agent/deal/1']) expect(needsLogin(p)).toBe(true);
  });

  it('홈·분석·로그인·중개사 가입·특약 만들기는 열림, 비슷한 이름은 막지 않음', () => {
    for (const p of ['/', '/analysis/16', '/login', '/agent/register', '/agent/terms', '/agents', '/my-requestsx']) expect(needsLogin(p)).toBe(false);
  });

  it('돌아갈 곳은 우리 사이트 경로만', () => {
    expect(safeNext('/agent')).toBe('/agent');
    expect(safeNext('/my-requests?tab=1')).toBe('/my-requests?tab=1');
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '', null, undefined]) expect(safeNext(bad)).toBe('/my-requests');
  });
});
