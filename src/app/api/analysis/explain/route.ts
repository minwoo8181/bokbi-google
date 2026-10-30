import { after, NextResponse } from 'next/server';
import { recordServerEvent } from '@/lib/analytics/serverStore';
import { getAnalysisBundle } from '@/lib/market/repository';
import { buildFacts } from '@/lib/analysis/explain';
import { explainRecommendation } from '@/lib/analysis/gemini';
import { referenceOf } from '@/lib/market/floorBand';
import type { FloorCategory } from '@/components/analysis/types';

/**
 * 추천 근거 AI 설명. 클라이언트는 식별자만 보내고, 숫자는 서버가 저장소·엔진으로 다시 계산한다
 * (클라이언트가 보낸 숫자를 AI에 넘기지 않는다).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const complexId = Number(searchParams.get('complexId'));
  const pyeongId = searchParams.get('pyeongId') ?? '';
  const tradeType = searchParams.get('tradeType') === '전세' ? '전세' : '매매';
  const floorParam = searchParams.get('floor');
  const floor: FloorCategory = floorParam === 'low' || floorParam === 'high' ? floorParam : 'mid';

  const bundle = Number.isFinite(complexId) ? getAnalysisBundle(complexId) : null;
  const pyeong = bundle?.pyeongList.find((p) => p.id === pyeongId);
  // 화면과 같은 기준 실거래(선택 층 구간 가장 최근 거래)로 계산한 추천
  const ref = pyeong ? referenceOf(pyeong, tradeType, floor) : null;
  if (!bundle || !pyeong || !ref) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const kind = tradeType === '매매' ? 'sale' : 'jeonse';
  const facts = buildFacts({
    complexName: bundle.apartment.apt_name,
    pyeongName: pyeong.name,
    tradeType,
    rec: ref.recommendation,
  });
  const narrative = await explainRecommendation(`${complexId}:${pyeongId}:${kind}:${floor}:${bundle.observedAt}`, facts, (o) =>
    // 행동 기록 (A7): 응답을 보낸 뒤 저장 (화면을 기다리게 하지 않음)
    after(async () => {
      await recordServerEvent('ai_explain', { ok: o.ok, ms: o.ms, ...(o.errorCode ? { errorCode: o.errorCode } : {}) });
      if (o.status && o.status >= 400) await recordServerEvent('external_error', { service: 'GEMINI', status: o.status });
    }),
  );
  return NextResponse.json(narrative);
}
