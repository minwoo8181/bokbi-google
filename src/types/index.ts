import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    [key: `data-${string}`]: unknown;
  }
}

export type UserRole = 'landlord' | 'agent' | 'admin';

export type TradeType = '매매' | '전세';

export type RequestStatus = 'OPEN' | 'FULL' | 'MATCHED' | 'EXPIRED' | 'REPORTED' | 'CLOSED';

export type ReportType = 'FAKE_OWNER' | 'NO_SHOW_24H';

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  region_dong: string;
  agent_office_name?: string | null;
  agent_license_num?: string | null;
  success_count: number;
  is_verified: boolean;
  is_banned: boolean;
  penalty_until?: string | null;
  created_at: string;
}

export interface ApartmentStat {
  id: number;
  apt_name: string;
  dong_name: string;
  sub_region?: '진건지구' | '지금지구' | '도농/가운';
  lat: number;
  lng: number;
  pyeong_type: string;
  pyeong_category?: '소형' | '중형' | '대형';
  total_households: number;
  built_year?: number;
  recent_avg_price: number; // 단위: 만원
  recent_jeonse_avg_price: number; // 단위: 만원
  recent_trade_count: number;
  current_sale_listings: number;
  current_jeonse_listings: number;
  min_asking_price: number; // 단위: 만원
  min_jeonse_asking_price: number; // 단위: 만원
  total_saved_commission: number; // 단위: 원
  total_matched_count: number;
  waiting_brokers_count?: number; // Bento Tile 3
  safety_index?: number; // Bento Tile 4
  aliases?: string[]; // 별칭 및 검색 키워드 (예: ['다산푸르지오', '자연앤푸르지오'])
  updated_at?: string;
}

export interface BonusOption {
  id: string;
  label: string;
  rateBonus: number; // e.g. 0.05 (%)
  cashBonus: number; // e.g. 450000 (원)
  selected: boolean;
  description: string;
}

export interface MatchRequest {
  id: string;
  landlord_id: string;
  apt_stat_id: number;
  apt_name: string;
  region_dong: string;
  pyeong_type: string;
  trade_type: TradeType;
  move_in_date: string;
  desired_price: number; // 단위: 만원
  legal_max_rate: number; // e.g. 0.50 (%)
  proposed_rate: number; // e.g. 0.25 (%)
  expected_saved_amount: number; // 단위: 만원
  bonus_options: BonusOption[];
  is_exclusive: boolean;
  is_owner_pledged: boolean;
  secret_dong_ho?: string;
  secret_landlord_phone?: string;
  accepted_agent_count: number;
  first_accepted_at?: string | null;
  status: RequestStatus;
  created_at: string;
  matches?: Match[];
}

export interface Match {
  id: string;
  request_id: string;
  agent_id: string;
  appeal_message: string;
  is_selected_by_landlord: boolean;
  created_at: string;
  agent?: Profile;
}

export interface CommissionCalculationResult {
  tradeType: TradeType;
  priceTenThousand: number; // 매매가/전세가 (만원)
  legalMaxRate: number; // 법정 상한 요율 (%)
  legalMaxFeeWon: number; // 법정 상한 수수료 (원)
  minAllowedRate: number; // 하한선 요율 (50% 기준, %)
  minAllowedFeeWon: number; // 하한선 수수료 (원)
  proposedRate: number; // 집주인 제시 요율 (%)
  proposedFeeWon: number; // 집주인 제시 기본 수수료 (원)
  savedWon: number; // 법정 상한 대비 절감액 (원)
  bonusFeeWon: number; // 추가 인센티브 금액 (원)
  totalFinalFeeWon: number; // 최종 지급 중개보수 (상한 자동 캡핑 적용, 원)
  isAutoCapped: boolean; // 법정 상한을 초과하여 캡핑되었는지 여부
}
