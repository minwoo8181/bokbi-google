// 서버 전용 — API 라우트에서만 import 한다 (GEMINI_API_KEY가 브라우저로 나가지 않도록)
import { buildPrompt, templateNarrative, validateNarrative, type ExplainFacts, type Narrative } from './explain';

/**
 * 모델 순서 (2026-10-22 실측): gemini-2.5-flash는 신규 사용자 종료(404).
 * 3.5-flash가 thinkingBudget 0에서 약 2.7초로 안정적, 3.8-flash는 과부하로 503까지 최대 11초 → 3.5 우선, 3.8은 보조.
 * 두 모델 모두 JSON 스키마 + thinkingBudget 0 조합이 동작한다 (flash-lite는 thinkingBudget 0에서 400)
 */
const MODELS = [
  { name: 'gemini-3.5-flash', timeoutMs: 6000 },
  { name: 'gemini-3.8-flash', timeoutMs: 5000 },
];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** 단지·평형·거래유형·기준일 단위 캐시 (같은 데이터면 하루 한 번만 호출). 배포 시 Supabase 테이블로 교체 */
const cache = new Map<string, Narrative>();

/** 실제로 AI를 불렀을 때만 결과 보고 (행동 기록 ai_explain·external_error용, 캐시·키 없음은 보고 안 함) */
export interface ExplainOutcome {
  ok: boolean;
  ms: number;
  /** 실패 종류: HTTP_503·TIMEOUT·INVALID·FAILED */
  errorCode?: string;
  /** 마지막 HTTP 상태 (응답이 있었을 때) */
  status?: number;
}

export async function explainRecommendation(cacheKey: string, facts: ExplainFacts, onOutcome?: (o: ExplainOutcome) => void): Promise<Narrative> {
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const key = process.env.GEMINI_API_KEY;
  if (!key) return templateNarrative(facts);
  const started = Date.now();
  const report = (o: Omit<ExplainOutcome, 'ms'>) => onOutcome?.({ ...o, ms: Date.now() - started });

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(facts) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { headline: { type: 'STRING' }, body: { type: 'STRING' } },
        required: ['headline', 'body'],
      },
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  try {
    let res: Response | null = null;
    for (const model of MODELS) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: AbortSignal.timeout(model.timeoutMs),
          body,
        });
      } catch (e) {
        // 모델별 시간 초과 → 다음 모델
        console.warn(`[gemini] ${model.name} ${e instanceof Error ? e.name : e} → 다음 모델`);
        res = null;
        continue;
      }
      if (res.ok || !RETRYABLE.has(res.status)) break;
      console.warn(`[gemini] ${model.name} HTTP ${res.status} → 다음 모델`);
    }
    if (!res) {
      report({ ok: false, errorCode: 'TIMEOUT' });
      return templateNarrative(facts);
    }
    if (!res.ok) {
      report({ ok: false, errorCode: `HTTP_${res.status}`, status: res.status });
      return templateNarrative(facts);
    }
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    const narrative = validateNarrative(parsed, facts);
    if (!narrative) {
      console.warn('[gemini] 검증 탈락 → 템플릿 사용', text);
      report({ ok: false, errorCode: 'INVALID', status: res.status });
      return templateNarrative(facts);
    }
    cache.set(cacheKey, narrative);
    report({ ok: true, status: res.status });
    return narrative;
  } catch (e) {
    console.warn('[gemini] 호출 실패 → 템플릿 사용', e instanceof Error ? e.message : e);
    report({ ok: false, errorCode: 'FAILED' });
    return templateNarrative(facts);
  }
}
