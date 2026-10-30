import type { Metadata } from 'next';
import SpecialTermsBuilder from '@/components/agent/SpecialTermsBuilder';

export const metadata: Metadata = { title: '복비 특약 만들기' };

/**
 * 복비 특약 만들기 (승인된 중개사). ?request= 매칭된 의뢰 id: 거래·지금 사는 사람을 미리 답한다.
 * 동·호수 같은 정보는 주소창에 싣지 않고 id만 넘긴다
 */
export default async function SpecialTermsPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request } = await searchParams;
  return <SpecialTermsBuilder requestId={request ?? null} />;
}
