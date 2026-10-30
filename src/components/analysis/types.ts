import type { AskingMonth, AskingRange, AskingTab } from '@/lib/market/askingPrice';

export type TradeType = '매매' | '전세';
export type FloorCategory = 'low' | 'mid' | 'high';
export type ActiveTab = 'ANALYSIS' | 'COMMUNITY';

export interface FloorCalculationResult {
  priceAdjustmentWon: number;
  adjustedAvgPriceTenThousand: number;
  priceMinTenThousand: number;
  priceMaxTenThousand: number;
  floorLabel: string;
  floorBadge: string;
  legalCommissionWon: number;
  recommendedCommissionWon: number;
  savedWon: number;
  recommendRateText: string;
}

export type TelecomCarrier = 
  | 'SKT' 
  | 'KT' 
  | 'LGU+' 
  | 'SKT_MVNO' 
  | 'KT_MVNO' 
  | 'LGU_MVNO';

export interface ContractRecord {
  date: string; // "26.09.21"
  type: string; // "84A"
  exclusiveArea: number; // 84.92
  priceTenThousand: number; // 98000
  floor: number; // 18
}

export interface PyeongDetailStat {
  id: string; // '24', '30', '34', '38'
  name: string; // '34평'
  supplyArea: number; // 112.5
  exclusiveArea: number; // 84.92
  households: number; // 480
  recentTradeAvgPrice: number; // 99000 (만원)
  recentJeonseAvgPrice: number; // 62000 (만원)
  tradePriceMin: number; // 97000
  tradePriceMax: number; // 101000
  jeonsePriceMin: number; // 60000
  jeonsePriceMax: number; // 64000
  contracts: ContractRecord[];
  /** 실데이터 시장 정보 (국토부 실거래 + 네이버 매물). 없으면 목업 */
  market?: { sale: PyeongMarketSide; jeonse: PyeongMarketSide };
  /** 같은 평형 안의 구조 타입 (네이버 33A·33B 등). 2개 이상일 때만 채운다. 가격은 평형 단위로 같다 */
  types?: PyeongType[];
}

export interface PyeongType {
  name: string;
  supplyArea: number;
  exclusiveArea: number;
}

/** 가격 산출 근거: 평형 6개월 → 평형 12개월 → 단지 ㎡당 → 다산동 ㎡당 */
export type PriceBasis = 'PYEONG_6M' | 'PYEONG_12M' | 'COMPLEX_M2' | 'DONG_M2' | 'NONE';

/**
 * 기준 실거래 출처: 선택 층 구간의 가장 최근 거래 → (구간에 12개월 거래가 없으면) 이 평형 가장 최근 거래
 * → 단지 ㎡당 → 다산동 ㎡당 환산
 */
export type ReferenceSource = 'FLOOR' | 'OTHER_FLOOR' | 'COMPLEX_M2' | 'DONG_M2';

/** 층 구간별 기준 실거래 (예상가를 만들지 않는다 — 대표님 결정 2026-10-23). 칩·복비 카드·추천 이유가 모두 이 값을 쓴다 */
export interface ReferencePrice {
  priceManwon: number;
  source: ReferenceSource;
  /** 계약일 'YY.MM.DD' (㎡당 환산이면 null) */
  date: string | null;
  floor: number | null;
  /** 같은 층 구간 최근 거래(최대 3건, 12개월) 가격 범위 — 1건이 급매·특수거래인지 가늠하는 보조 정보. 2건 미만이면 null */
  bandRecent: { count: number; minManwon: number; maxManwon: number } | null;
  /** 이 층 구간의 12개월 기준 실거래 수 (다른 층 값을 쓰거나 ㎡당 환산이면 0) */
  bandCount: number;
  recommendation: RecommendationView;
}

export interface PyeongMarketSide {
  medianPrice: number | null; // 만원
  basis: PriceBasis;
  sampleSize: number;
  min: number | null;
  max: number | null;
  /** 층 구간별 기준 실거래. 가격을 어떤 방법으로도 못 구하면 null */
  reference: Record<FloorCategory, ReferencePrice | null>;
  /** 이 평형 가장 최근 거래의 층 구간 (첫 화면 기본 선택). 거래가 없으면 null */
  latestFloor: FloorCategory | null;
  /** 월별 그달 마지막 실거래 1건·거래량 (24개월, 거래 있는 달만). 중간값은 실제 거래가가 아니라 쓰지 않는다 (대표님 결정 2026-10-27) */
  series: TradeSeriesPoint[];
  contracts: ContractRecord[];
  /** 층 탭(저·중·고) 그래프와 계약 최근 3건 — 같은 규칙을 그 층 구간 거래에만 적용 (2026-10-27) */
  byFloor: Record<FloorCategory, { series: TradeSeriesPoint[]; contracts: ContractRecord[] }>;
  /**
   * 지금 나온 매물 호가 (매매만, lib/market/askingPrice.ts). 탭(전체·저·중·고)별 최근 수집일 최저~최고·매물 수 + 달마다 최저~최고(그래프 노랑 띠).
   * 호가 파일이 없거나 전세면 null
   */
  asking: { latest: Record<AskingTab, AskingRange | null>; monthly: Record<AskingTab, AskingMonth[]> } | null;
}

/** 그래프 한 달: 그달 마지막 실거래 1건과 그달 거래 수 */
export interface TradeSeriesPoint {
  ym: string;
  last: { priceManwon: number; date: string; floor: number | null };
  count: number;
}

/** 건축물대장(전유부) 기준 주택 동 하나: 동 이름('6501동', 이름 없는 단일 건물은 ''), 지상 층수, 호 목록('1306') */
export interface UnitDong {
  name: string;
  floors: number;
  hos: string[];
}

/** 선택 단지의 동·호 목록 (매칭 모달 동·호수 실존 확인). 수집 안 된 단지는 null */
export interface ComplexUnits {
  fetchedAt: string;
  dongs: UnitDong[];
}

/** 서버 엔진 결과 중 화면에 필요한 값만 (직렬화 가능) */
export interface RecommendationView {
  grade: 'FAST' | 'BALANCED' | 'SLOW' | 'UNKNOWN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isGeneric: boolean;
  discount: number;
  band: { min: number; max: number };
  /** 추천 범위 끝(20%/50%)에 닿았는지 */
  atLimit: 'MIN' | 'MAX' | null;
  /** 30%를 준 이유 (데이터 부족만, 아니면 null) */
  defaultReason: 'NO_DATA' | null;
  /** 판단한 면적대 (소형 ≤60㎡ · 중형 60~86㎡ · 대형 >86㎡) */
  areaBand: 'SMALL' | 'MEDIUM' | 'LARGE';
  /** 다산동 중앙 단지 대비 매물 소화 속도. 데이터 부족이면 null */
  speedRatio: number | null;
  /** 같은 면적대 안 다산동 순위 (1위 = 가장 빨리 소화). 데이터 부족이거나 면적대 매물·거래가 없으면(단지 값 사용) null */
  rank: { position: number; total: number } | null;
  /** 단지 최근 12개월 거래 수 (데이터 부족 문구용) */
  complexSales12m: number;
  /** 면적대 현재 매물 · 6개월 중개거래 */
  listings: number;
  recentDeals: number;
  monthsOfInventory: number | null;
  momentum: number | null;
  windowStart: string;
  windowEnd: string;
}

/**
 * 매칭 사례 한 건 (화면 계약). 실데이터 전환 시 Supabase `match_cases` 뷰가 같은 모양으로 내려준다.
 * 동·호수·연락처 등 민감 필드는 넣지 않는다.
 */
export interface MatchCase {
  id: string;
  complexName: string;
  pyeongLabel: string;
  tradeType: TradeType;
  dealPriceManwon: number;
  /** 법정 상한 중개보수 (원) */
  legalCapWon: number;
  /** 합의된 중개보수 (원) */
  agreedFeeWon: number;
  savedWon: number;
  /** 법정 상한 대비 할인율 (0~1) */
  discount: number;
  /** 매칭 확정 시각 (ISO). 예시는 null */
  matchedAt: string | null;
}

export interface MatchCaseFeed {
  /** EXAMPLE: 실제 매칭 전 예시 (화면에 '예시' 배지), LIVE: 실제 매칭 기록 */
  source: 'EXAMPLE' | 'LIVE';
  items: MatchCase[];
}

export interface CommissionCalculation {
  tradeType: TradeType;
  dealPriceTenThousand: number; // 실거래가 (만원)
  legalMaxWon: number; // 법정 최고 복비 (원)
  legalRateText: string; // "0.50%" or "0.40%"
  aiRecommendedWon: number; // AI 추천 복비 (원)
  aiRateText: string; // "0.30%" or "0.25%"
  customCommissionWon: number; // 사용자가 슬라이더/버튼으로 조절한 복비 (원)
  savedWon: number; // 법정 대비 절약액 (원)
  discountPercentOfLegal: number; // 법정보수 대비 몇 % 금액인지 (예: 60%)
  acceptanceRate: number; // 중개사 수락률 (50 ~ 98)
  acceptanceStatus: 'FAST' | 'NORMAL' | 'SLOW';
  isBelowFiftyPercent: boolean; // 법정보수 대비 50% 미만 주의 구간
  isAtThirtyPercentFloor: boolean; // 법정보수 대비 30% 최종 락
  isAtLegalMax: boolean; // 법정 최고액 상한 락
}

export interface SpecialBonusOption {
  id: string;
  title: string;
  description: string;
  amountWon: number;
  checked: boolean;
  isCustom?: boolean;
  customConditionText?: string;
}

export interface CommunityVoteTopic {
  id: string;
  title: string;
  description?: string;
  options: { label: string; count: number; percent: number }[];
  userVotedIndex?: number;
  totalVotes: number;
}

export interface CommunityCommentItem {
  id: string;
  author: string;
  authorTag: string; // "입주민" or "집주인" or "이웃"
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

export type ModalStep = 
  | 'TRADE_PYEONG' 
  | 'PRICE_MOVEIN'
  | 'FEE'
  | 'DONG_HO'
  | 'OWNER_VERIFY' 
  | 'FINAL_PLEDGE' 
  | 'COMPLETE';

export type OccupancyStatus = 'VACANT' | 'OWNER' | 'TENANT';

export interface ListingSubmissionForm {
  aptId: number;
  tradeType: TradeType;
  pyeongId: string;
  floorCategory: FloorCategory;
  askingPriceWon: number;
  targetCommissionWon: number;
  occupancy: OccupancyStatus;
  tenantPhone?: string;
  isTenantNotifiedChecked?: boolean;
  visitNoticeMemo?: string;
  moveInType: 'IMMEDIATE' | 'NEGOTIABLE' | 'DATE';
  moveInDate?: string;
  dong: string;
  ho: string;
  ownerName: string;
  ownerPhone: string;
  ownerTelecom: TelecomCarrier;
  isSoleOrHalfOwnerChecked: boolean;
  isLegalPledgeChecked: boolean;
  specialBonusIds: string[];
}
