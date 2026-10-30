import { describe, expect, it } from 'vitest';
import registryJson from '@/data/brokers/dasan-offices.json';
import {
  type BrokerRegistryEntry,
  matchBrokerOffice,
  normalizeOffice,
  normalizeRegNo,
} from '../registry';

/**
 * 가입 명단 대조 자동 채점 (2026-10-25). 실제 명단 336곳 전체로 돌린다.
 * 지표: 자기 대조 통과율 100%, 변형 입력 통과율 100%, 다른 대표자 거부율 100%
 */
const registry = registryJson.offices as BrokerRegistryEntry[];
const active = registry.filter((e) => e.status === '영업중');

describe('명단 데이터', () => {
  it('336곳, 등록번호 중복 없음, 상호 정규화 값이 비지 않음', () => {
    expect(registry).toHaveLength(336);
    expect(new Set(registry.map((e) => normalizeRegNo(e.regNo))).size).toBe(336);
    for (const e of registry) expect(normalizeOffice(e.office), e.office).not.toBe('');
  });

  it('개설 연도는 표준 형식만 채우고 범위가 맞다', () => {
    for (const e of registry) {
      if (/^41360-\d{4}-\d{5}$/.test(e.regNo)) expect(e.openYear).toBeGreaterThanOrEqual(1980);
      else expect(e.openYear).toBeNull();
    }
  });

  it('전화가 없으면 출처도 없다 (방문 확인 대상)', () => {
    for (const e of registry) expect(e.phone === null).toBe(e.phoneSource === null);
  });

  it('전화번호는 한 칸에 하나, 형식 통일 (원본 칸에 번호 여러 개·지역번호 없음·하이픈 없음 정리)', () => {
    const PHONE = /^(0\d{1,2}-\d{3,4}|1\d{3})-\d{4}$/;
    for (const e of registry) {
      if (e.phone) expect(e.phone, e.office).toMatch(PHONE);
      for (const p of e.altPhones) expect(p, e.office).toMatch(PHONE);
    }
  });
});

describe('matchBrokerOffice', () => {
  it('영업중 전체가 그대로 입력하면 MATCHED', () => {
    const results = active.map((e) => matchBrokerOffice({ regNo: e.regNo, ceo: e.ceo, office: e.office }, registry).status);
    expect(results.filter((s) => s === 'MATCHED')).toHaveLength(active.length);
  });

  it('휴업 사무소는 SUSPENDED', () => {
    for (const e of registry.filter((x) => x.status !== '영업중')) {
      expect(matchBrokerOffice({ regNo: e.regNo, ceo: e.ceo, office: e.office }, registry).status).toBe('SUSPENDED');
    }
  });

  it('변형 입력(제 접두·다른 하이픈·띄어쓰기·꼬리말 생략)도 통과', () => {
    const variants = (e: BrokerRegistryEntry) => [
      { regNo: `제${e.regNo.replace(/-/g, '–')}호`, ceo: e.ceo.split('').join(' '), office: e.office },
      { regNo: ` ${e.regNo} `, ceo: e.ceo, office: e.office.replace(/\s/g, '') },
      { regNo: e.regNo, ceo: e.ceo, office: e.office.replace(/공인중개사사무소|부동산중개법인/g, '') },
      // 하이픈 없이 숫자만
      { regNo: e.regNo.replace(/-/g, ''), ceo: e.ceo, office: e.office },
    ];
    for (const e of active) {
      for (const v of variants(e)) {
        expect(['MATCHED', 'NAME_CLOSE'], `${e.office} ← ${JSON.stringify(v)}`).toContain(matchBrokerOffice(v, registry).status);
      }
    }
  });

  it('다른 사무소 대표자 이름이면 전부 CEO_MISMATCH', () => {
    let checked = 0;
    for (let i = 0; i < registry.length; i++) {
      const e = registry[i];
      const other = registry.find((x, j) => j > i && x.ceo !== e.ceo) ?? registry.find((x) => x.ceo !== e.ceo)!;
      expect(matchBrokerOffice({ regNo: e.regNo, ceo: other.ceo, office: e.office }, registry).status).toBe('CEO_MISMATCH');
      checked++;
    }
    expect(checked).toBe(336);
  });

  it('없는 등록번호는 NOT_FOUND, 상호가 전혀 다르면 OFFICE_MISMATCH, 가입한 곳은 ALREADY_JOINED', () => {
    const e = active[0];
    expect(matchBrokerOffice({ regNo: '41360-1999-00000', ceo: e.ceo, office: e.office }, registry).status).toBe('NOT_FOUND');
    expect(matchBrokerOffice({ regNo: e.regNo, ceo: e.ceo, office: '전혀다른이름' }, registry).status).toBe('OFFICE_MISMATCH');
    expect(matchBrokerOffice({ regNo: e.regNo, ceo: e.ceo, office: e.office }, registry, new Set([normalizeRegNo(e.regNo)])).status).toBe('ALREADY_JOINED');
  });

  it('상호 일부만 쓰면 NAME_CLOSE (관리자 확인)', () => {
    const e = registry.find((x) => x.office === '1등푸르지오공인중개사사무소')!;
    expect(matchBrokerOffice({ regNo: e.regNo, ceo: e.ceo, office: '1등' }, registry).status).toBe('NAME_CLOSE');
  });
});
