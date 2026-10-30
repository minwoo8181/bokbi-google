import { notFound } from 'next/navigation';
import { getAnalysisBundle } from '@/lib/market/repository';
import AnalysisClient from './AnalysisClient';

// 서버에서 실데이터·분석 엔진을 계산하고, 화면에 필요한 값만 클라이언트로 넘긴다
export default async function ApartmentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = getAnalysisBundle(Number(id));
  if (!bundle || bundle.pyeongList.length === 0) notFound();
  return <AnalysisClient {...bundle} />;
}
