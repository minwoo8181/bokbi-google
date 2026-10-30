import type { Metadata } from 'next';
import AgentWorkspace from '@/components/agent/AgentWorkspace';

export const metadata: Metadata = { title: '복비 중개사' };

/** 중개사 승인 후 화면: 새 의뢰 / 내 매물 / 내 사무소 (승인 전에는 가입 안내) */
export default function AgentPage() {
  return <AgentWorkspace />;
}
