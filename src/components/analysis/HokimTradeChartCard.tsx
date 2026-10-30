'use client';

/**
 * 실거래 · 호가 카드 "팔린 값 vs 부르는 값" (2026-10-27 대표님 A안).
 * 위: 최근 12개월 실거래 범위 + 지금 나온 매물 호가(층 탭 따라, 매물 수·수집일) → 층 탭(전체·저·중·고) →
 * 그래프(매월 마지막 실거래 실선 + 거래량 막대 + 달마다 호가 최저~최고 노랑 띠, 2026-10-27) → 국토부 계약 최근 3건 (더보기 없음)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { formatPriceTenThousand } from '@/lib/utils';
import { PyeongDetailStat, FloorCategory, ReferencePrice, TradeType } from './types';
import { SITE_CONTENT } from '@/config/siteContent';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from './segmentStyles';

interface HokimTradeChartCardProps {
  pyeong: PyeongDetailStat;
  floorCategory: FloorCategory;
  floorLabel: string;
  tradeType: TradeType;
  /** 선택 층 구간의 기준 실거래 (복비 카드와 같은 값) */
  reference: ReferencePrice | null;
}

interface MonthlyChartPoint {
  month: string;
  /** 그달 마지막 실거래 (그달 거래가 없고 호가만 있으면 없음) */
  price?: number;
  date: string;
  floor: number | null;
  volume: number;
  isTradePoint: boolean;
  /** 그달 수집한 매물 호가 [최저, 최고] (노랑 띠) */
  asking?: [number, number];
}

type FloorTab = 'ALL' | FloorCategory;
const TABS: FloorTab[] = ['ALL', 'low', 'mid', 'high'];

export default function HokimTradeChartCard({
  pyeong,
  floorCategory,
  tradeType,
}: HokimTradeChartCardProps) {
  const { chartCard, floorSelector } = SITE_CONTENT.analysis;
  const [isMounted, setIsMounted] = useState(false);
  // 층 탭: 처음엔 위에서 고른 층 구간, 위에서 바꾸면 따라간다
  const [tab, setTab] = useState<FloorTab>(floorCategory);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    setTab(floorCategory);
  }, [floorCategory]);

  // 실거래 기반 (국토부 매매·전월세)
  const side = tradeType === '매매' ? pyeong.market?.sale : pyeong.market?.jeonse;
  const hasRange = side?.min != null && side?.max != null;

  // 최근 12개월 이 평형 실거래 최저~최고 (전 층, 단축 표기)
  const minPriceClean = hasRange ? formatPriceTenThousand(side!.min as number).replace(' 원', '') : '';
  const maxPriceClean = hasRange ? formatPriceTenThousand(side!.max as number) : '';

  // 고른 탭의 그래프·계약 (전체 = 이 평형 전 층, 층 구간 = 그 구간 거래만)
  const picked = tab === 'ALL' ? side : side?.byFloor[tab];
  const series = picked?.series ?? [];
  const contracts = (picked?.contracts ?? pyeong.contracts).slice(0, 3);
  const tabLabel = (t: FloorTab) => (t === 'ALL' ? chartCard.floorTabAll : floorSelector.bands[t].label);

  // 호가: 매매만, 고른 탭 기준 (층 표기만 있어 구간을 확실히 모르는 매물은 전체 탭에만, lib/market/askingPrice.ts)
  const askingSide = side?.asking ?? null;
  const askingNow = askingSide?.latest[tab] ?? null;
  const askingMonths = askingSide?.monthly[tab];
  // 층 구간을 확실히 모르는 매물 수 (전체 − 저·중·고 합) — 층 탭에서 "없어요"라고 잘못 말하지 않게
  const askingUnknown =
    askingSide && tab !== 'ALL'
      ? (askingSide.latest.ALL?.count ?? 0) - (['low', 'mid', 'high'] as const).reduce((s, f) => s + (askingSide.latest[f]?.count ?? 0), 0)
      : 0;

  // ─── 달마다 그달 마지막 실거래 + 거래량 (24개월, 거래 있는 달만) + 그달 호가 띠 ─────────────
  const chartData: MonthlyChartPoint[] = useMemo(() => {
    const byYm = new Map<string, MonthlyChartPoint>();
    for (const m of series)
      byYm.set(m.ym, { month: `${m.ym.slice(2, 4)}.${m.ym.slice(5, 7)}`, price: m.last.priceManwon, date: m.last.date, floor: m.last.floor, volume: m.count, isTradePoint: true });
    for (const a of askingMonths ?? []) {
      const p = byYm.get(a.ym) ?? { month: `${a.ym.slice(2, 4)}.${a.ym.slice(5, 7)}`, date: '', floor: null, volume: 0, isTradePoint: false };
      byYm.set(a.ym, { ...p, asking: [a.minManwon, a.maxManwon] });
    }
    return [...byYm.keys()].sort().map((ym) => byYm.get(ym) as MonthlyChartPoint);
  }, [series, askingMonths]);
  const hasAskingBand = chartData.some((p) => p.asking);

  // ─── 실제 거래 포인트 커스텀 Dot 렌더러 ────────────────────────────────────
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (!payload || !payload.isTradePoint) {
      return <g key={`dot-empty-${index}`} />;
    }
    return (
      <circle
        key={`dot-${payload.month}`}
        cx={cx}
        cy={cy}
        r={4.5}
        fill="var(--brand-primary)"
        stroke="var(--bg-surface)"
        strokeWidth={2}
      />
    );
  };

  // ─── 토스 감성 커스텀 툴팁 ───────────────────────────────────────────────
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyChartPoint;
      const monthNum = String(Number(data.month.slice(3, 5)));
      const askingLine = data.asking ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}>
          {chartCard.chartTooltipAsking
            .replace('{month}', monthNum)
            .replace('{min}', formatPriceTenThousand(data.asking[0]).replace(' 원', ''))
            .replace('{max}', formatPriceTenThousand(data.asking[1]))}
        </div>
      ) : null;
      // 그달 거래가 없고 호가만 있는 달
      if (!data.isTradePoint || data.price === undefined)
        return askingLine ? (
          <div style={{ borderRadius: 12, backgroundColor: 'var(--bg-surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid var(--border-default)', padding: '10px 14px' }} className="text-left min-w-[130px]">
            {askingLine}
          </div>
        ) : null;
      return (
        <div
          style={{
            borderRadius: 12,
            backgroundColor: 'var(--bg-surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-default)',
            padding: '10px 14px',
          }}
          className="space-y-1 text-left min-w-[130px]"
        >
          <div style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600 }}>
            {data.floor !== null
              ? chartCard.chartTooltipTrade.replace('{date}', data.date).replace('{floor}', String(data.floor))
              : data.date}
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 800 }}>
            {formatPriceTenThousand(data.price)}
          </div>
          <div style={{ color: 'var(--brand-primary)', fontSize: 11, fontWeight: 700 }}>
            {chartCard.chartTooltipVolume
              .replace('{month}', monthNum)
              .replace('{count}', String(data.volume))}
          </div>
          {askingLine}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4" data-testid="trade-card">
      {/* ── 제목 + 실거래 범위 + 호가 자리 ── */}
      <div className="space-y-2">
        <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight">
          {chartCard.cardTitle[tradeType]}
        </h2>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-medium text-text-secondary whitespace-nowrap">{chartCard.tradeRangeLabel[tradeType]}</span>
          <span className="text-[17px] font-extrabold text-brand tracking-tight tabular-nums whitespace-nowrap">
            {hasRange ? `${minPriceClean} ~ ${maxPriceClean}` : '—'}
          </span>
        </div>
        {/* 호가: 고른 층 탭의 최근 수집일 최저~최고 (실거래 줄과 같은 모양, 색은 검정 — 파랑은 실거래). 호가 파일이 없으면(전세 등) 자리만 */}
        <div className="flex items-baseline justify-between gap-3" data-testid="asking-row">
          <span className="text-[12px] font-medium text-text-secondary whitespace-nowrap">{chartCard.askingLabel}</span>
          {!askingSide ? (
            <span className="text-[13px] font-bold text-text-tertiary whitespace-nowrap">{chartCard.askingPending}</span>
          ) : askingNow ? (
            <span className="text-[17px] font-extrabold text-text-primary tracking-tight tabular-nums whitespace-nowrap" data-testid="asking-range">
              {askingNow.minManwon === askingNow.maxManwon
                ? formatPriceTenThousand(askingNow.minManwon)
                : `${formatPriceTenThousand(askingNow.minManwon).replace(' 원', '')} ~ ${formatPriceTenThousand(askingNow.maxManwon)}`}
            </span>
          ) : (
            <span className="text-[13px] font-bold text-text-tertiary whitespace-nowrap">{askingUnknown > 0 ? chartCard.askingNoneUnknown : chartCard.askingNone}</span>
          )}
        </div>
        {(askingNow || askingUnknown > 0) && (
          <p className="text-right text-[12px] font-medium text-text-tertiary break-keep text-pretty" data-testid="asking-meta">
            {askingNow &&
              chartCard.askingMeta
                .replace('{scope}', tab === 'ALL' ? '' : `${floorSelector.bands[tab].label} `)
                .replace('{n}', String(askingNow.count))
                .replace('{date}', `${Number(askingNow.observedAt.slice(5, 7))}/${Number(askingNow.observedAt.slice(8, 10))}`)}
            {askingUnknown > 0 && (
              <span className="block" data-testid="asking-unknown">
                {chartCard.askingUnknownNote.replace('{n}', String(askingUnknown))}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-border-light space-y-2">
        {/* 층 탭 (위 선택 줄과 같은 세그먼트 모양) */}
        <div className={`${SEGMENT_TRACK} grid-cols-4`} role="tablist" data-testid="trade-floor-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`${SEGMENT_ITEM} ${segmentItemState(tab === t)} text-[13px] font-extrabold`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {/* 조건 칩 + 범례 (선 = 그달 마지막 실거래, 막대 = 월 거래량) */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <span data-testid="chart-condition" className="text-[12px] font-bold text-brand-hover bg-brand-light px-2 py-1 rounded-md whitespace-nowrap">
            {chartCard.chartConditionChip
              .replace('{pyeong}', pyeong.name.split(' ')[0])
              .replace('{area}', String(Math.round(pyeong.exclusiveArea)))
              .replace('{tradeType}', tradeType)}
          </span>
          <span className="flex items-center gap-2 text-[12px] font-medium text-text-tertiary flex-shrink-0">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand" />{chartCard.chartLegendPrice}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2.5 rounded-sm bg-brand-line-strong" />{chartCard.chartLegendVolume}</span>
            {hasAskingBand && (
              <span className="flex items-center gap-1" data-testid="legend-asking"><span className="w-2 h-2.5 rounded-sm bg-status-caution-line" />{chartCard.chartLegendAsking}</span>
            )}
          </span>
        </div>

        <div className="h-48 w-full bg-surface-subtle rounded-xl border border-border-default pt-3 pb-1 px-1 relative">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-[13px] font-medium text-text-tertiary" data-testid="trade-empty">
              {chartCard.emptyBand}
            </div>
          ) : isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--bg-page)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  interval="preserveStartEnd"
                />
                <YAxis yAxisId="price" domain={['dataMin - 1000', 'dataMax + 1000']} axisLine={false} tickLine={false} hide={true} />
                {/* 거래량 막대가 차트 아래 약 45%까지 올라오게 */}
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  domain={[0, (max: number) => Math.max(4, max * 2.2)]}
                  axisLine={false}
                  tickLine={false}
                  hide={true}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* 호가 띠: 달마다 [최저, 최고]를 떠 있는 막대로 (수집한 달만, 처음엔 오른쪽 끝 한 칸) */}
                {hasAskingBand && (
                  <Bar
                    yAxisId="price"
                    dataKey="asking"
                    barSize={14}
                    fill="color-mix(in srgb, var(--status-caution) 35%, transparent)"
                    radius={[3, 3, 3, 3]}
                    isAnimationActive={false}
                  />
                )}
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  barSize={7}
                  fill="color-mix(in srgb, var(--brand-primary) 40%, transparent)"
                  radius={[2, 2, 0, 0]}
                >
                  <LabelList
                    dataKey="volume"
                    position="top"
                    formatter={(v: number) => (v > 0 ? v : '')}
                    style={{ fontSize: 10, fill: 'var(--text-tertiary)', fontWeight: 600 }}
                  />
                </Bar>
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="var(--brand-primary)"
                  strokeWidth={3}
                  connectNulls
                  dot={renderCustomDot}
                  activeDot={{ r: 6, fill: 'var(--brand-primary)', stroke: 'var(--bg-surface)', strokeWidth: 2.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[13px] text-text-tertiary">차트 로딩 중...</div>
          )}
        </div>
      </div>

      {/* ── 국토부 실거래 계약: 고른 탭의 최근 3건 (더보기 없음, 2026-10-27) ── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[13px] font-bold text-text-primary px-1">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            {chartCard.tableHeaderTitle}
          </span>
          <span className="text-[12px] font-medium text-text-tertiary whitespace-nowrap">
            {chartCard.contractsCount.replace('{n}', String(contracts.length))} · {tabLabel(tab)}
          </span>
        </div>

        {contracts.length > 0 && (
          <div className="divide-y divide-border-light rounded-xl border border-border-default overflow-hidden bg-surface-subtle text-[13px]" data-testid="trade-contracts">
            {contracts.map((c, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-text-primary">{formatPriceTenThousand(c.priceTenThousand)}</div>
                  {/* 면적은 평형 칩에서 이미 골라 날짜만 (대표님 승인 2026-10-24) */}
                  <div className="text-[12px] text-text-tertiary mt-1">{c.date} 계약</div>
                </div>
                <span className="inline-block px-2 py-1 rounded bg-surface-card border border-border-default text-[12px] font-bold text-text-secondary">
                  {c.floor}층
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
