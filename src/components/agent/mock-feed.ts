/**
 * 중개사 새 의뢰 피드 목업 (배포 전 제거). 첫 의뢰는 집주인 "내 의뢰" 화면과 같은 의뢰라 공유 저장소로 양쪽 흐름이 이어진다:
 * 매칭 모달이 저장한 요약이 있으면 그 의뢰, 없으면 집주인 목업(BK-DEMO-0001). 나머지는 피드 모양 확인용 예시
 */
import { demoRequest, requestFromSummary } from '@/components/my-requests/mock-requests';
import type { OwnerRequest } from '@/lib/requests/types';

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

export function demoFeedRequests(now: Date, savedSummary: Record<string, unknown> | null): OwnerRequest[] {
  const owner = (savedSummary && requestFromSummary(savedSummary, now)) || demoRequest(now);
  const base = { ...demoRequest(now), offers: [] };
  return [
    owner,
    {
      ...base,
      id: 'BK-DEMO-0002',
      aptId: null,
      complexName: '힐스테이트다산',
      tradeType: '전세',
      pyeongLabel: '25평 · 전용 59㎡',
      floorLabel: '고층',
      maskedDongHo: '20*동 ***호',
      dongHo: '205동 2301호',
      askingPriceManwon: 45_000,
      commissionWon: 1_200_000,
      legalMaxWon: 1_350_000,
      occupancy: 'TENANT',
      details: { moveIn: { type: 'DATE', date: '2026-12-20' }, aircon: null, midDoor: true, closet: false, mortgage: { status: 'NONE', plan: null }, lease: null },
      createdAt: hoursAgo(now, 44),
    },
    {
      ...base,
      id: 'BK-DEMO-0003',
      aptId: null,
      complexName: '다산e편한세상자이',
      tradeType: '매매',
      pyeongLabel: '33평 · 전용 84㎡',
      floorLabel: '저층',
      maskedDongHo: '11*동 ***호',
      dongHo: '1103동 302호',
      askingPriceManwon: 82_000,
      commissionWon: 2_460_000,
      legalMaxWon: 4_100_000,
      occupancy: 'VACANT',
      details: { moveIn: { type: 'IMMEDIATE', date: '' }, aircon: '2대', midDoor: false, closet: true, mortgage: { status: 'NONE', plan: null }, lease: null },
      createdAt: hoursAgo(now, 20),
    },
    {
      ...base,
      id: 'BK-DEMO-0004',
      aptId: null,
      complexName: '다산신도시아이파크',
      tradeType: '매매',
      pyeongLabel: '41평 · 전용 101㎡',
      floorLabel: '중층',
      maskedDongHo: '5*동 ***호',
      dongHo: '506동 1504호',
      askingPriceManwon: 120_000,
      commissionWon: 3_840_000,
      legalMaxWon: 6_000_000,
      // 세입자 낀 매매: 갭 금액 확인용
      occupancy: 'TENANT',
      details: {
        moveIn: { type: 'NEGOTIABLE', date: '' },
        aircon: '4대',
        midDoor: true,
        closet: true,
        mortgage: { status: 'EXISTS', plan: 'REPAY_AT_CLOSING' },
        lease: { kind: 'JEONSE', depositManwon: 70_000, monthlyRentManwon: 0, leaseEndDate: '2027-08-31', renewal: 'NOT_USED' },
      },
      contact: {
        ownerName: '김예시',
        ownerPhone: '010-0000-0004',
        tenantPhone: '010-0000-0044',
        visitMemo: '세입자분께 하루 전 연락 부탁드려요',
        optionMemo: '거실 확장',
      },
      createdAt: hoursAgo(now, 2),
    },
  ];
}
