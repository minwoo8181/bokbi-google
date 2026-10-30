// 분석 엔진 검수 리포트 생성 → docs/analysis-validation.md
// 사용: npm run analysis:report
import { writeFileSync } from 'node:fs';
import dataset from '../src/data/market/dasan-market.json';
import {
  AREA_BANDS,
  ENGINE_PARAMS,
  bandRatios,
  buildContext,
  computeMetrics,
  discountFromRatio,
  median,
  rankAmong,
  recommend,
  type AreaBand,
  type MarketDataset,
  type Recommendation,
  type TradeTuple,
} from '../src/lib/analysis/marketEngine';

const ds = dataset as unknown as MarketDataset;
const ctx = buildContext(ds);
const P = ENGINE_PARAMS;
const BANDS = Object.keys(AREA_BANDS) as AreaBand[];
const BAND_NAME: Record<AreaBand, string> = { SMALL: '소형', MEDIUM: '중형', LARGE: '대형' };
const GRADE = { FAST: '매물 귀함', BALANCED: '보통', SLOW: '매물 많음', UNKNOWN: '데이터 부족' } as const;
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const eok = (manwon: number) => `${(manwon / 10000).toFixed(2)}억`;
const corr = (a: number[], b: number[]) => {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let n = 0, da = 0, db = 0;
  a.forEach((x, i) => { n += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; });
  return n / Math.sqrt(da * db);
};

/** 면적대 6개월 중개거래 중위가 (만 원) — 가격 상관 검사용 */
const bandPrice = (trades: TradeTuple[], b: AreaBand) => {
  const end = Date.parse(`${ds.meta.observedAt}T00:00:00Z`) / 864e5;
  const ps = trades.filter((t) => t[4] === 1 && end - Date.parse(`${t[0]}T00:00:00Z`) / 864e5 <= 182 && t[1] >= AREA_BANDS[b].min && t[1] < AREA_BANDS[b].max).map((t) => t[2]);
  return median(ps);
};

/** K(면적대 → 단지 수축 강도)만 바꿔 같은 면적대의 추천을 다시 계산 */
const withK = (r: Recommendation, k: number) => {
  const c = ds.complexes.find((x) => x.name === r.metrics.name)!;
  const a = r.complexMetrics.absorption as number;
  const m = computeMetrics(c, ctx.observedAt, ctx.prior, { kind: 'sale', exclusiveM2: { min: AREA_BANDS[r.areaBand!].min, max: AREA_BANDS[r.areaBand!].max - 1e-9 } }, { absorption: a, pseudoSales: k });
  return discountFromRatio((m.absorption as number) / ctx.a0);
};

const ratios = bandRatios(ds, ctx);
const rows = ds.complexes.flatMap((c) =>
  BANDS.map((b) => ({ c, b, r: recommend(c, ctx, b), price: bandPrice(c.trades, b) })).filter(({ r }) => r.metrics.saleListings > 0 || r.metrics.brokeredSales > 0),
);
const judged = rows.filter((x) => !x.r.isGeneric);
const discounts = judged.map((x) => x.r.discount);
const priced = judged.filter((x) => x.price !== null);
const thin = judged.filter((x) => x.r.metrics.brokeredSales <= 2);
const complexes = ds.complexes.map((c) => recommend(c, ctx));
const count = (lo: number, hi: number) => discounts.filter((d) => d >= lo - 1e-9 && d < hi - 1e-9).length;

const md = [
  '# 분석 엔진 v4 검수 리포트 (면적대별 매물 소화 속도 → 20~50%)',
  '',
  `매물 기준일 ${ds.meta.observedAt} · 집계 창 ${complexes[0].metrics.windowStart} ~ ${complexes[0].metrics.windowEnd} (신고 기한 30일 제외, 중개거래만) · 단지 ${ds.complexes.length}개 · 면적대 ${rows.length}개`,
  '',
  '## 요약',
  '',
  `- 추천 할인 (판정 가능 면적대 ${judged.length}개): 중앙값 ${pct(median(discounts) as number)} · 20% ${count(0, 0.2 + 1e-6)}곳 · 20~30% ${count(0.2 + 1e-6, 0.3)}곳 · 30~40% ${count(0.3, 0.4)}곳 · 40~50% ${count(0.4, 0.5)}곳 · 50% ${count(0.5, 1)}곳`,
  `- 데이터 부족(단지 최근 12개월 거래 3건 미만 → 30%): 단지 ${complexes.filter((r) => r.isGeneric).length}곳`,
  `- 면적대 가격과의 상관 ${corr(priced.map((x) => x.r.discount), priced.map((x) => x.price as number)).toFixed(2)} (v3는 +0.60: 비싼 집일수록 더 깎았다. v4는 가격을 쓰지 않으므로 0 근처가 정상)`,
  `- 기준값: 다산동 중앙 단지 월 흡수율 ${pct(ctx.a0, 1)}`,
  `- 면적대 → 단지 수축 K=${P.bandShrinkK}. 거래 0~2건 면적대 ${thin.length}곳`,
  `- K 민감도 (거래 0~2건 면적대의 추천 평균 |단지 대비 차이|): ${[3, 6, 12]
    .map((k) => {
      const diffs = thin.map((x) => Math.abs(withK(x.r, k) - discountFromRatio((x.r.complexMetrics.absorption as number) / ctx.a0)));
      return `K=${k}: ${pct(diffs.reduce((s, d) => s + d, 0) / Math.max(1, diffs.length), 1)}p`;
    })
    .join(' · ')}`,
  '',
  '## 계산식',
  '',
  '```',
  '면적대 흡수율 = (면적대 6개월 중개거래 + K × 단지 흡수율) ÷ (면적대 매물 × 6개월 + K)',
  '시장 위치 비율 = 면적대 흡수율 ÷ 다산동 중앙 단지 흡수율',
  `추천 할인 = 비율 ${P.slowAnchor}배 이하 ${pct(P.minRecDiscount)} · 1배 ${pct(P.midRecDiscount)} · ${P.fastAnchor}배 이상 ${pct(P.maxRecDiscount)} (사이는 log2로 연속)`,
  '```',
  '',
  '- 20%: 이보다 적으면 집주인이 따로 협의할 때와 차이가 없다. 50%: 이보다 크면 중개사가 맡기 어렵다 (중개사 부담선)',
  '- 층·가격은 쓰지 않는다. 면적대: 소형 60㎡ 이하 · 중형 60~86㎡ · 대형 86㎡ 초과',
  '- 20/30/50%와 기준점은 파일럿 매칭률(할인 구간별 중개사 요청률)로 보정할 값이다',
  '',
  '## 면적대별 결과 (추천 높은 순)',
  '',
  '| 단지 | 면적대 | 판정 | 매물 | 6개월 중개거래 | 단지 비율 | 면적대 비율 | 순위 | 추천 | K=3 | K=12 | 6개월 중위가 |',
  '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...[...rows]
    .sort((a, b) => b.r.discount - a.r.discount || (b.r.speedRatio ?? 0) - (a.r.speedRatio ?? 0))
    .map(({ c, b, r, price }) => {
      const m = r.metrics;
      const cRatio = r.complexMetrics.absorption === null ? '—' : (r.complexMetrics.absorption / ctx.a0).toFixed(2);
      const rank = r.speedRatio === null ? '—' : (({ position, total }) => `${position}/${total}`)(rankAmong(r.speedRatio, ratios[b]));
      const k3 = r.isGeneric ? '—' : pct(withK(r, 3));
      const k12 = r.isGeneric ? '—' : pct(withK(r, 12));
      return `| ${c.name} | ${BAND_NAME[b]} | ${GRADE[r.grade]} | ${m.saleListings} | ${m.brokeredSales} | ${cRatio} | ${r.speedRatio === null ? '—' : r.speedRatio.toFixed(2)} | ${rank} | ${pct(r.discount)}${r.isGeneric ? ' (부족)' : ''} | ${k3} | ${k12} | ${price === null ? '—' : eok(price)} |`;
    }),
  '',
  '## 읽는 법',
  '',
  '- 비율 = 월 흡수율(월 거래 ÷ 매물) ÷ 다산동 중앙 단지. 1보다 크면 매물이 빨리 소화된다.',
  '- 순위 = 같은 면적대 안 다산동 순위 (1위 = 가장 빨리 소화).',
  '- K=3·K=12 열: 수축 강도를 바꿨을 때의 추천. K가 클수록 면적대 값이 단지 값 쪽으로 더 당겨진다.',
  '- "—"는 계산할 수 없음(데이터 없음), 0은 실제로 0건.',
].join('\n');

writeFileSync('docs/analysis-validation.md', md + '\n');
console.log(md.split('\n').slice(0, 12).join('\n'));
