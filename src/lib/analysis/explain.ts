/**
 * 추천 근거 AI 설명 (Gemini) — 숫자는 엔진이 계산하고, AI는 그 숫자만으로 설명 문장을 쓴다.
 * 규칙 (HANDOVER 2026-10-22): 서버 전용 호출 · 숫자 생성 금지 · 단지/일 캐시 · 실패 시 템플릿 문구.
 * 설명 순서 (엔진 v4, 2026-10-24): 추천 범위 20~50% → 이 평형 면적대의 매물 소화 속도 → 추천.
 * 이 파일은 순수 함수만 둔다 (팩트 구성 · 프롬프트 · 템플릿 · 출력 검증). 네트워크 호출은 gemini.ts.
 */
import { SITE_CONTENT } from '@/config/siteContent';
import type { RecommendationView, TradeType } from '@/components/analysis/types';

export interface ExplainFacts {
  complexName: string;
  pyeongName: string;
  tradeType: TradeType;
  /** 화면 표기와 같은 시장 위치 라벨 (매도자 우위 시장 등) */
  marketPosition: string;
  /** 판단한 면적대 (예: "대형 평형(전용 86㎡ 초과)") */
  areaBand: string;
  /** 면적대 현재 매물 수 */
  listings: number;
  /** 면적대 최근 6개월 중개거래 수 */
  recentDeals6m: number;
  /** 다산동 평균 단지 대비 매물 소화 속도 (소수 1자리, 데이터 부족이면 null) */
  speedRatio: string | null;
  /** 같은 면적대 안 다산동 순위 */
  rank: { position: number; total: number } | null;
  rangeMinPct: number;
  rangeMaxPct: number;
  recommendedPct: number;
  /** 범위 끝에 닿았는지: 최소 20% / 최대 50% */
  atLimit: '범위 최소' | '범위 최대' | null;
  /** 데이터 부족이면 사실 문장 (그 외 null) */
  dataShortage: string | null;
  period: string;
}

export interface Narrative {
  source: 'AI' | 'TEMPLATE';
  headline: string;
  body: string;
}

const POSITION = {
  매매: { FAST: '매도자 우위 시장', BALANCED: '균형 시장', SLOW: '매수자 우위 시장', UNKNOWN: '판단 보류' },
  전세: { FAST: '임대인 우위 시장', BALANCED: '균형 시장', SLOW: '임차인 우위 시장', UNKNOWN: '판단 보류' },
} as const;
const round = (v: number) => Math.round(v * 100);

export function buildFacts(input: {
  complexName: string;
  pyeongName: string;
  tradeType: TradeType;
  rec: RecommendationView;
}): ExplainFacts {
  const { rec: r, tradeType } = input;
  const c = SITE_CONTENT.analysis.recommendationReason;
  return {
    complexName: input.complexName,
    pyeongName: input.pyeongName,
    tradeType,
    marketPosition: POSITION[tradeType][r.grade],
    areaBand: `${c.bandLabels[r.areaBand]} 평형(${c.bandRanges[r.areaBand]})`,
    listings: r.listings,
    recentDeals6m: r.recentDeals,
    speedRatio: r.speedRatio === null ? null : r.speedRatio.toFixed(1),
    rank: r.rank,
    rangeMinPct: 20,
    rangeMaxPct: 50,
    recommendedPct: round(r.discount),
    atLimit: r.atLimit === 'MIN' ? '범위 최소' : r.atLimit === 'MAX' ? '범위 최대' : null,
    dataShortage: r.defaultReason === 'NO_DATA' ? `단지 최근 1년 거래가 ${r.complexSales12m}건이라 매물 소화 속도를 계산하기 어려워 다산동 평균 단지와 같은 30%를 적용` : null,
    period: `${r.windowStart} ~ ${r.windowEnd}`,
  };
}

export type PositionNote = { key: 'FASTER' | 'SLOWER' | 'EQUAL' | 'MAX' | 'MIN' | 'NO_DATA'; diffPp: number };

/**
 * 계산표 아래 한 줄의 종류: 범위 끝 → 평균 단지(30%)와 같음/높음/낮음. 차이는 화면 표기(반올림 %)끼리 비교한다
 */
export function positionNote(r: Pick<RecommendationView, 'discount' | 'atLimit' | 'defaultReason'>): PositionNote {
  if (r.defaultReason === 'NO_DATA') return { key: 'NO_DATA', diffPp: 0 };
  if (r.atLimit) return { key: r.atLimit, diffPp: 0 };
  const diff = round(r.discount) - 30;
  return { key: diff > 0 ? 'FASTER' : diff < 0 ? 'SLOWER' : 'EQUAL', diffPp: Math.abs(diff) };
}

/** Gemini에 보내는 프롬프트. 숫자는 facts에 있는 것만 쓰도록 강하게 제한한다 */
export function buildPrompt(f: ExplainFacts): string {
  return [
    '당신은 부동산 중개보수(복비) 분석 서비스 "복비"의 분석가입니다.',
    '아래 [분석 데이터]는 복비 분석 엔진이 국토교통부 실거래와 현재 매물로 이미 계산한 결과입니다.',
    '집주인에게 "왜 이 추천 할인율이 나왔는지"를 설명하는 짧은 분석 문장을 작성하세요.',
    '',
    '[계산 방식 — 이 논리 그대로 설명하세요]',
    '- 추천 할인은 20%~50% 범위 안에서 정해집니다. 20%보다 적으면 집주인이 따로 협의할 때와 차이가 없고, 50%보다 크면 중개사가 중개를 맡기 어렵습니다.',
    '- 범위 안의 위치는 이 평형 면적대(areaBand)의 매물 소화 속도로만 정합니다: 최근 6개월 중개거래(recentDeals6m) ÷ 현재 매물(listings)을 다산동 평균 단지와 비교한 배수(speedRatio). 매물이 빨리 소화될수록 중개사가 매물을 원해 집주인 협상력이 커서 50%에 가깝고, 매물이 쌓일수록 20%에 가깝습니다.',
    '- 집값이나 법정 요율은 할인율 계산에 쓰지 않습니다.',
    '',
    '[작성 규칙]',
    '1. 숫자는 [분석 데이터]에 적힌 숫자만 그대로 쓰세요. 새 숫자를 계산하거나 추정하지 마세요. 가격 전망·투자 조언은 금지입니다.',
    '2. 순서: 이 면적대의 매물과 거래(수요·공급) → 다산동 평균 대비 소화 속도 → 추천 할인. 수요·공급을 가장 먼저, 가장 비중 있게 설명하세요.',
    '3. "수수료" 대신 "중개보수"라고 쓰세요.',
    '4. 중개사를 깎아내리거나 대립시키는 표현은 금지입니다. 예: "중개사가 더 받는다", "평소 이상", "비싸니 더 깎는다", "할인 여력". 집주인과 중개사가 모두 납득하는 상생의 관점으로 쓰세요.',
    '5. 다산동 평균 중개보수나 다른 단지의 중개보수·거래가와 비교하는 문장은 쓰지 마세요.',
    '6. atLimit이 있으면 범위 끝(20% 또는 50%)에 닿았다는 사실만 쓰세요. 20%와 50%는 범위의 끝이지 최적값이 아닙니다. "최적", "상생선", "부담 없는" 같은 표현은 쓰지 마세요.',
    '7. dataShortage가 있으면 그 사실을 그대로 밝히고, 30%로 매칭을 요청해 보라고 부드럽게 권하세요.',
    '8. 매물 정보를 어느 사이트에서 가져왔는지(포털·부동산 앱 이름)는 쓰지 마세요. "지금 매물"이라고만 쓰세요.',
    '9. 해요체 존댓말. headline은 25자 이내 한 문장, body는 3~4문장 200자 이내.',
    '10. 출력은 JSON만: {"headline": "...", "body": "..."}',
    '',
    '[분석 데이터]',
    JSON.stringify(f, null, 2),
  ].join('\n');
}

/** AI 실패·검증 탈락 시 쓰는 템플릿 설명 (같은 규칙으로 작성) */
export function templateNarrative(f: ExplainFacts): Narrative {
  if (f.dataShortage || f.speedRatio === null) {
    return {
      source: 'TEMPLATE',
      headline: `거래가 적어 다산동 평균 ${f.recommendedPct}%`,
      body: `${f.areaBand} 최근 6개월 거래가 ${f.recentDeals6m}건, 지금 매물이 ${f.listings}건이에요. 최근 거래가 적어 매물 소화 속도를 계산하기 어려워요. 다산동 평균 단지와 같은 ${f.recommendedPct}%로 매칭을 요청해 보세요.`,
    };
  }
  const limit = f.atLimit ? ` 추천 범위의 끝(${f.atLimit === '범위 최대' ? f.rangeMaxPct : f.rangeMinPct}%)이에요.` : '';
  return {
    source: 'TEMPLATE',
    headline: `${f.marketPosition}, 추천 할인 ${f.recommendedPct}%`,
    body: `${f.areaBand}은 지금 매물 ${f.listings}건, 최근 6개월 거래 ${f.recentDeals6m}건이에요. 매물이 소화되는 속도가 다산동 평균의 ${f.speedRatio}배예요. 그래서 ${f.rangeMinPct}~${f.rangeMaxPct}% 범위에서 ${f.recommendedPct}% 할인을 추천해요.${limit}`,
  };
}

// 최적·상생선·부담 없/부담을 느끼지 않: 부담선 50%(상한)를 최적값처럼 말한 사례 (2026-10-24)
// '네이버': 매물 수집처 이름은 화면에 쓰지 않는다 (대표님 2026-10-27)
const BANNED = ['수수료', '평소 이상', '할인 여력', '더 받', '전망', '오를 ', '내릴 ', '평균 중개보수', '중개보수 중위', '평균보다 낮', '평균보다 높', '최적', '상생선', '부담 없', '부담을 느끼지 않', '네이버'];

/** facts 문자열에 나온 숫자만 허용한다 (콤마 제거 후 비교) */
function allowedNumbers(f: ExplainFacts): Set<string> {
  const text = JSON.stringify(f) + ' 3 20 30 50 70 100';
  return new Set((text.replace(/,/g, '').match(/\d+(\.\d+)?/g) ?? []).map((n) => String(Number(n))));
}

/** AI 출력 검증: 형식 · 길이 · 금지어 · 데이터에 없는 숫자. 통과하면 Narrative, 아니면 null */
export function validateNarrative(raw: unknown, f: ExplainFacts): Narrative | null {
  if (!raw || typeof raw !== 'object') return null;
  const { headline, body } = raw as { headline?: unknown; body?: unknown };
  if (typeof headline !== 'string' || typeof body !== 'string') return null;
  const h = headline.trim();
  const b = body.trim();
  if (!h || !b || h.length > 40 || b.length > 320) return null;
  const all = `${h} ${b}`;
  if (BANNED.some((w) => all.includes(w))) return null;
  const allowed = allowedNumbers(f);
  const used = (all.replace(/,/g, '').match(/\d+(\.\d+)?/g) ?? []).map((n) => String(Number(n)));
  if (used.some((n) => !allowed.has(n))) return null;
  return { source: 'AI', headline: h, body: b };
}
