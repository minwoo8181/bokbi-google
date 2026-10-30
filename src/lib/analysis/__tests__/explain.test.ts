import { describe, expect, it } from 'vitest';
import { buildFacts, buildPrompt, positionNote, templateNarrative, validateNarrative } from '../explain';
import { getAnalysisBundle } from '@/lib/market/repository';

const bundle = getAnalysisBundle(16)!; // 다산자이아이비플레이스
const pyeong = bundle.pyeongList.find((p) => p.name.startsWith('41평'))!;
const facts = buildFacts({
  complexName: bundle.apartment.apt_name,
  pyeongName: pyeong.name,
  tradeType: '매매',
  rec: pyeong.market!.sale.reference.mid!.recommendation,
});

describe('AI 설명 팩트', () => {
  it('면적대 매물 소화 속도 → 20~50% 범위의 추천 (41평 = 대형 27%)', () => {
    expect(facts.areaBand).toContain('대형');
    expect(facts.speedRatio).toBe('0.8');
    expect(facts.recommendedPct).toBe(27);
    expect([facts.rangeMinPct, facts.rangeMaxPct]).toEqual([20, 50]);
    expect(facts.atLimit).toBeNull();
    expect(facts.dataShortage).toBeNull();
  });

  it('가격·법정 요율은 AI에 넘기지 않는다 (할인 계산에 쓰지 않으므로)', () => {
    expect(JSON.stringify(facts)).not.toMatch(/basisPrice|legalRate|legalCap/);
  });

  it('프롬프트에 숫자 생성 금지·중개보수 용어·상생·범위 의미가 들어간다', () => {
    const p = buildPrompt(facts);
    expect(p).toContain('새 숫자를 계산하거나 추정하지 마세요');
    expect(p).toContain('"수수료" 대신 "중개보수"');
    expect(p).toContain('상생');
    expect(p).toContain('50%보다 크면 중개사가 중개를 맡기 어렵습니다');
  });

  it('데이터 부족 단지는 사실 그대로 + 30% 매칭 권유 (템플릿)', () => {
    const shortage = { ...facts, speedRatio: null, rank: null, recommendedPct: 30, dataShortage: '단지 최근 1년 거래가 2건이라 …' };
    const t = templateNarrative(shortage);
    expect(t.body).toContain('30%로 매칭을 요청해 보세요');
    expect(validateNarrative({ headline: t.headline, body: t.body }, shortage)).not.toBeNull();
  });
});

describe('계산표 아래 한 줄 (단지별)', () => {
  const base = { atLimit: null, defaultReason: null } as const;
  it('평균 단지 30%와 비교해 높음/낮음/같음, 차이는 화면 반올림 %끼리', () => {
    expect(positionNote({ ...base, discount: 0.36 })).toEqual({ key: 'FASTER', diffPp: 6 });
    expect(positionNote({ ...base, discount: 0.2689 })).toEqual({ key: 'SLOWER', diffPp: 3 });
    expect(positionNote({ ...base, discount: 0.3004 })).toEqual({ key: 'EQUAL', diffPp: 0 });
  });
  it('범위 끝·데이터 부족은 그 사실을 우선', () => {
    expect(positionNote({ discount: 0.5, atLimit: 'MAX', defaultReason: null }).key).toBe('MAX');
    expect(positionNote({ discount: 0.2, atLimit: 'MIN', defaultReason: null }).key).toBe('MIN');
    expect(positionNote({ discount: 0.3, atLimit: null, defaultReason: 'NO_DATA' }).key).toBe('NO_DATA');
  });
  it('실데이터: 41평(대형 27%)은 평균보다 3%p 낮음', () => {
    expect(positionNote(pyeong.market!.sale.reference.mid!.recommendation)).toEqual({ key: 'SLOWER', diffPp: 3 });
  });
});

describe('AI 출력 검증', () => {
  it('템플릿 설명은 스스로 검증을 통과한다', () => {
    const t = templateNarrative(facts);
    expect(validateNarrative({ headline: t.headline, body: t.body }, facts)).not.toBeNull();
  });

  it('데이터에 없는 숫자를 쓰면 탈락', () => {
    expect(validateNarrative({ headline: '균형 시장이에요', body: '내년에 7% 오를 수 있어요.' }, facts)).toBeNull();
    expect(validateNarrative({ headline: '균형 시장이에요', body: '추천 할인은 47%예요.' }, facts)).toBeNull();
  });

  it('매물 수집처 이름(네이버)을 쓰면 탈락, 프롬프트에도 없음 (대표님 2026-10-27)', () => {
    expect(validateNarrative({ headline: '균형 시장', body: '네이버 매물 기준이에요.' }, facts)).toBeNull();
    expect(buildPrompt(facts)).not.toContain('네이버');
  });

  it('금지어(수수료·할인 여력·평균 중개보수 비교)를 쓰면 탈락', () => {
    expect(validateNarrative({ headline: '균형 시장', body: '수수료를 50% 아낄 수 있어요.' }, facts)).toBeNull();
    expect(validateNarrative({ headline: '균형 시장', body: '할인 여력이 커요.' }, facts)).toBeNull();
    expect(validateNarrative({ headline: '균형 시장', body: '다산동 평균 중개보수보다 커요.' }, facts)).toBeNull();
  });

  it('부담선 50%를 최적값처럼 말하면 탈락 (2026-10-24 실제 AI 출력)', () => {
    const body = '중개사도 부담을 느끼지 않는 최적의 상생선인 50% 할인을 추천드려요.';
    expect(validateNarrative({ headline: '균형 시장', body }, facts)).toBeNull();
    expect(validateNarrative({ headline: '균형 시장', body: '최적의 할인이에요.' }, facts)).toBeNull();
    expect(buildPrompt(facts)).toContain('최적값이 아닙니다');
    expect(templateNarrative(facts).body).not.toMatch(/최적|상생선/);
  });

  it('중개사 수입 비교 데이터는 AI에 넘기지 않는다', () => {
    expect(JSON.stringify(facts)).not.toContain('refFee');
    expect(buildPrompt(facts)).toContain('비교하는 문장은 쓰지 마세요');
  });

  it('형식이 틀리면 탈락', () => {
    expect(validateNarrative(null, facts)).toBeNull();
    expect(validateNarrative({ headline: 1, body: 'x' }, facts)).toBeNull();
  });
});
