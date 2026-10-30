import { PyeongDetailStat, CommunityVoteTopic, CommunityCommentItem, SpecialBonusOption } from '@/components/analysis/types';
import { COMPLEX_PYEONG_MAP, COMPLEX_NAME_ALIASES, DEFAULT_FALLBACK_PYEONGS } from '@/data/complexPyeongMap';

// ─── 다산동 대장 아파트 판별 ──────────────────────────────────────────────────
export const TOP3_LEADER_NAMES = [
  '다산자이아이비플레이스',
  '힐스테이트다산',
  '다산자이',
  '힐스테이트',
  'e편한세상다산',
  '다산e편한세상',
  '다산자연앤푸르지오',
  '다산푸르지오',
  '다산 이편한세상자이',
  'e편한세상 다산',
];

export function isLeaderApartment(aptName: string): boolean {
  return TOP3_LEADER_NAMES.some((name) => aptName.includes(name) || name.includes(aptName));
}

// ─── 단지별 고유 평형대 데이터 생성기 (국토교통부 5,505건 실거래 연동) ──────────────────────
export function getPyeongListForApartment(
  aptNameOrPrice: string | number,
  fallbackBasePrice: number = 95000
): PyeongDetailStat[] {
  let aptName = '';
  let basePrice = fallbackBasePrice;

  if (typeof aptNameOrPrice === 'string') {
    aptName = aptNameOrPrice;
  } else if (typeof aptNameOrPrice === 'number') {
    basePrice = aptNameOrPrice;
  }

  // 1. 단지명으로 국토교통부 실거래 평형 매핑 조회 (통칭 Alias 1차 변환)
  if (aptName) {
    const canonicalName = COMPLEX_NAME_ALIASES[aptName] || aptName;
    const clean = canonicalName.replace(/\s+/g, '');

    // 정확한 매칭 및 정규화 매칭 시도
    let matchedKey = Object.keys(COMPLEX_PYEONG_MAP).find(
      (k) => k === canonicalName || k.replace(/\s+/g, '') === clean
    );

    // 부분 매칭 시도
    if (!matchedKey) {
      matchedKey = Object.keys(COMPLEX_PYEONG_MAP).find(
        (k) => clean.includes(k.replace(/\s+/g, '')) || k.replace(/\s+/g, '').includes(clean)
      );
    }

    if (matchedKey && COMPLEX_PYEONG_MAP[matchedKey] && COMPLEX_PYEONG_MAP[matchedKey].length > 0) {
      return COMPLEX_PYEONG_MAP[matchedKey];
    }
  }

  // 2. 매핑되지 않은 단지의 경우 기준가 기반 비례 생성
  const p34Trade = basePrice;
  const p34Jeonse = Math.round(basePrice * 0.63 / 1000) * 1000;

  const p24Trade = Math.round(basePrice * 0.78 / 1000) * 1000;
  const p24Jeonse = Math.round(p24Trade * 0.62 / 1000) * 1000;

  const p30Trade = Math.round(basePrice * 0.90 / 1000) * 1000;
  const p30Jeonse = Math.round(p30Trade * 0.63 / 1000) * 1000;

  const p38Trade = Math.round(basePrice * 1.18 / 1000) * 1000;
  const p38Jeonse = Math.round(p38Trade * 0.64 / 1000) * 1000;

  return [
    {
      id: '24',
      name: '24평 (전용 59㎡)',
      supplyArea: 81.2,
      exclusiveArea: 59.98,
      households: 320,
      recentTradeAvgPrice: p24Trade,
      recentJeonseAvgPrice: p24Jeonse,
      tradePriceMin: p24Trade - 1500,
      tradePriceMax: p24Trade + 2000,
      jeonsePriceMin: p24Jeonse - 1000,
      jeonsePriceMax: p24Jeonse + 1500,
      contracts: [
        { date: '26.09.21', type: '59A', exclusiveArea: 59.98, priceTenThousand: p24Trade + 800, floor: 18 },
        { date: '26.09.14', type: '59B', exclusiveArea: 59.85, priceTenThousand: p24Trade - 300, floor: 9 },
        { date: '26.08.30', type: '59A', exclusiveArea: 59.98, priceTenThousand: p24Trade - 1200, floor: 3 },
      ],
    },
    {
      id: '30',
      name: '30평 (전용 74㎡)',
      supplyArea: 101.5,
      exclusiveArea: 74.95,
      households: 280,
      recentTradeAvgPrice: p30Trade,
      recentJeonseAvgPrice: p30Jeonse,
      tradePriceMin: p30Trade - 2000,
      tradePriceMax: p30Trade + 2000,
      jeonsePriceMin: p30Jeonse - 1500,
      jeonsePriceMax: p30Jeonse + 1500,
      contracts: [
        { date: '26.09.18', type: '74A', exclusiveArea: 74.95, priceTenThousand: p30Trade + 1200, floor: 22 },
        { date: '26.09.02', type: '74B', exclusiveArea: 74.88, priceTenThousand: p30Trade - 500, floor: 11 },
      ],
    },
    {
      id: '34',
      name: '34평 (전용 84㎡)',
      supplyArea: 112.8,
      exclusiveArea: 84.96,
      households: 540,
      recentTradeAvgPrice: p34Trade,
      recentJeonseAvgPrice: p34Jeonse,
      tradePriceMin: p34Trade - 2500,
      tradePriceMax: p34Trade + 2500,
      jeonsePriceMin: p34Jeonse - 2000,
      jeonsePriceMax: p34Jeonse + 2000,
      contracts: [
        { date: '26.09.28', type: '84A', exclusiveArea: 84.96, priceTenThousand: p34Trade + 2000, floor: 25 },
        { date: '26.09.15', type: '84B', exclusiveArea: 84.91, priceTenThousand: p34Trade + 500, floor: 16 },
      ],
    },
    {
      id: '38',
      name: '38평 (전용 99㎡)',
      supplyArea: 125.4,
      exclusiveArea: 99.85,
      households: 180,
      recentTradeAvgPrice: p38Trade,
      recentJeonseAvgPrice: p38Jeonse,
      tradePriceMin: p38Trade - 3000,
      tradePriceMax: p38Trade + 3000,
      jeonsePriceMin: p38Jeonse - 2500,
      jeonsePriceMax: p38Jeonse + 2500,
      contracts: [
        { date: '26.09.10', type: '99A', exclusiveArea: 99.85, priceTenThousand: p38Trade + 2500, floor: 24 },
        { date: '26.08.15', type: '99B', exclusiveArea: 99.70, priceTenThousand: p38Trade - 1000, floor: 12 },
        { date: '26.07.02', type: '99A', exclusiveArea: 99.85, priceTenThousand: p38Trade - 2800, floor: 3 },
      ],
    },
  ];
}

// ─── 특별조건 인센티브 보너스 옵션 목록 (집주인 실익 중심 당근 옵션) ───────────────────
export const INITIAL_SPECIAL_BONUS_OPTIONS: SpecialBonusOption[] = [
  {
    id: 'bonus_repair_agree',
    title: '도배·장판 임차인 부담 협의 성사',
    description: '임차인이 도배·장판 비용을 직접 부담하도록 협의 성사 시 (집주인 지출 약 150~200만 원이 줄어요)',
    amountWon: 200000,
    checked: false,
  },
  {
    id: 'bonus_quick_30d',
    title: '30일 이내 급매·잔금 계약 성사',
    description: '30일 이내에 진성 매수인과 빠른 계약 및 잔금 일정 협의 완료 시',
    amountWon: 300000,
    checked: false,
  },
  {
    id: 'bonus_custom_input',
    title: '집주인 특별 협의조건 및 보너스 (직접 입력)',
    description: '도배 지원, 입주청소 완료, 빠른 잔금 등 집주인 희망 조건을 직접 입력합니다.',
    amountWon: 200000,
    checked: false,
    isCustom: true,
    customConditionText: '',
  },
];

// ─── 단지 커뮤니티 기본 3대 투표 ────────────────────────────────────────────────
export const INITIAL_COMMUNITY_VOTES: CommunityVoteTopic[] = [
  {
    id: 'vote_noise',
    title: '우리 단지 층간소음 만족도, 어떤가요?',
    description: '실거주민 분들의 솔직한 층간소음 체감을 공유해 주세요.',
    options: [
      { label: '조용하고 만족해요', count: 184, percent: 76 },
      { label: '보통 수준이에요', count: 42, percent: 17 },
      { label: '약간 신경 쓰여요', count: 16, percent: 7 },
    ],
    totalVotes: 242,
  },
  {
    id: 'vote_move_up',
    title: '30평대에서 40평대로 갈아타기, 지금이 적기일까요?',
    description: '다산역 개통 후 대형 평수 호가 상승세를 볼 때 여러분의 생각은?',
    options: [
      { label: '지금이 갈아타기 최적기', count: 142, percent: 63 },
      { label: '조금 더 관망하는 게 유리', count: 83, percent: 37 },
    ],
    totalVotes: 225,
  },
  {
    id: 'vote_market_outlook',
    title: '다산역 8호선 개통 이후 향후 1년 시세 전망은?',
    description: '잠실 20분대 진입 호재가 매매가에 얼마나 더 반영될까요?',
    options: [
      { label: '우상향 상승 지속', count: 210, percent: 79 },
      { label: '현 시세 보합 유지', count: 45, percent: 17 },
      { label: '단기 조정 가능성', count: 11, percent: 4 },
    ],
    totalVotes: 266,
  },
];

// ─── 단지 커뮤니티 한마디 톡 목록 ──────────────────────────────────────────────
export const INITIAL_COMMUNITY_COMMENTS: CommunityCommentItem[] = [
  {
    id: 'comment_1',
    author: '다산토박이',
    authorTag: '입주민',
    content: '8호선 다산역 출퇴근 진짜 신세계입니다. 잠실역까지 20분 컷이라 강남 출근길 피로도가 절반으로 줄었네요.',
    createdAt: '12분 전',
    likes: 18,
    isLiked: false,
  },
  {
    id: 'comment_2',
    author: '아이비사랑',
    authorTag: '집주인',
    content: '상가에 소아과, 치과, 대형 학원 다 입점해서 아이 키우기엔 다산동에서 입지 원탑이라고 생각합니다.',
    createdAt: '1시간 전',
    likes: 14,
    isLiked: false,
  },
  {
    id: 'comment_3',
    author: '스마트집사',
    authorTag: '입주민',
    content: '지하주차장 2.5m 광폭이라 대형 SUV 주차하기도 너무 편하고 문콕 걱정 없어서 만족도 200%입니다.',
    createdAt: '3시간 전',
    likes: 9,
    isLiked: false,
  },
  {
    id: 'comment_4',
    author: '다산이웃',
    authorTag: '이웃',
    content: '중앙공원 산책로 연결되어 있어서 저녁마다 강아지 산책시키기 너무 좋아요. 조경 관리도 훌륭합니다.',
    createdAt: '5시간 전',
    likes: 7,
    isLiked: false,
  },
];
