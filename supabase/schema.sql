-- ⚠ 대체됨 (2026-10-26): Phase 1 옛 초안. 실제 스키마는 supabase/migrations/ (설계 docs/handover/supabase-schema.md). 적용하지 말 것
-- ==============================================================================
-- 복비(Bokbi) MVP - Supabase PostgreSQL Schema & Seed Migration
-- 남양주시 다산동 54개 아파트 단지 실거래가 & 스마트 중개 매칭 플랫폼
-- ==============================================================================

-- 1. 아파트 단지별 실거래 및 매물 수급 통계 테이블
CREATE TABLE IF NOT EXISTS public.apt_market_stats (
    id SERIAL PRIMARY KEY,
    apt_name VARCHAR(150) NOT NULL,
    dong_name VARCHAR(50) NOT NULL DEFAULT '다산동',
    pyeong_type VARCHAR(100) NOT NULL,
    current_avg_price INTEGER NOT NULL,          -- 만 원 단위 (예: 98,000 = 9억 8천)
    active_listings_count INTEGER NOT NULL,      -- 현재 네이버/아실 기준 활성 매물 수
    six_month_traded_count INTEGER NOT NULL,     -- 최근 6개월 국토부 실거래 성사 건수
    turnover_rate NUMERIC(5,2) NOT NULL,         -- 회전율 (%)
    monthly_trades JSONB NOT NULL DEFAULT '[]',  -- 최근 6개월 월별 실거래 추이 [{month, price, count}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 검색 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_apt_market_stats_name ON public.apt_market_stats (apt_name);
CREATE INDEX IF NOT EXISTS idx_apt_market_stats_dong ON public.apt_market_stats (dong_name);

-- 2. 공인중개사 회원 정보 (브이월드 검증 완료)
CREATE TABLE IF NOT EXISTS public.brokers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    agent_office_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL DEFAULT '다산동',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(3,2) NOT NULL DEFAULT 4.9,
    success_count INTEGER NOT NULL DEFAULT 0,
    daily_quota_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 소유주 스마트 매칭 의뢰 테이블
CREATE TABLE IF NOT EXISTS public.match_requests (
    id VARCHAR(60) PRIMARY KEY,
    landlord_id VARCHAR(60) NOT NULL,
    apt_stat_id INTEGER REFERENCES public.apt_market_stats(id) ON DELETE SET NULL,
    apt_name VARCHAR(150) NOT NULL,
    region_dong VARCHAR(50) NOT NULL DEFAULT '다산동',
    pyeong_type VARCHAR(100) NOT NULL,
    trade_type VARCHAR(20) NOT NULL CHECK (trade_type IN ('매매', '전세', '월세')),
    move_in_date VARCHAR(100) NOT NULL,
    desired_price INTEGER NOT NULL,              -- 만 원 단위
    legal_max_rate NUMERIC(4,2) NOT NULL,        -- 법정 상한 요율 (%)
    proposed_rate NUMERIC(4,2) NOT NULL,         -- 소유주 선제시 요율 (%)
    expected_saved_amount INTEGER NOT NULL,      -- 만 원 단위 절감액
    bonus_options JSONB NOT NULL DEFAULT '[]',
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
    is_owner_pledged BOOLEAN NOT NULL DEFAULT TRUE,
    secret_dong_ho VARCHAR(50),                  -- 최종 매칭 전까지 블라인드
    secret_landlord_phone VARCHAR(30),           -- 최종 매칭 전까지 블라인드
    accepted_agent_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_agent_count <= 3),
    first_accepted_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULL', 'MATCHED', 'EXPIRED', 'REPORTED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_requests_region_status ON public.match_requests (region_dong, status);
CREATE INDEX IF NOT EXISTS idx_match_requests_phone ON public.match_requests (secret_landlord_phone);

-- 4. 중개사 수락 및 최종 매칭 관계 테이블
CREATE TABLE IF NOT EXISTS public.matches (
    id VARCHAR(60) PRIMARY KEY,
    request_id VARCHAR(60) NOT NULL REFERENCES public.match_requests(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
    appeal_message TEXT NOT NULL,
    is_selected_by_landlord BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_request_id ON public.matches (request_id);
CREATE INDEX IF NOT EXISTS idx_matches_agent_id ON public.matches (agent_id);

-- 5. RLS (Row Level Security) 설정 (보안 정책)
ALTER TABLE public.apt_market_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 익명/인증 사용자 읽기 권한 허용 (단지 정보 및 오픈 피드)
CREATE POLICY "Allow public read apt_market_stats" ON public.apt_market_stats
    FOR SELECT USING (true);

CREATE POLICY "Allow public read brokers" ON public.brokers
    FOR SELECT USING (true);

CREATE POLICY "Allow public read open match_requests" ON public.match_requests
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert match_requests" ON public.match_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update match_requests" ON public.match_requests
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read matches" ON public.matches
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert matches" ON public.matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update matches" ON public.matches
    FOR UPDATE USING (true);

-- 6. 다산동 주요 랜드마크 아파트 초기 Seed 데이터
INSERT INTO public.apt_market_stats (id, apt_name, dong_name, pyeong_type, current_avg_price, active_listings_count, six_month_traded_count, turnover_rate, monthly_trades)
VALUES
(1, '다산자이아이비플레이스', '다산동', '34평 (전용 84㎡)', 98000, 32, 18, 56.3, '[{"month":"2026.05","price":95000,"count":2},{"month":"2026.06","price":96000,"count":3},{"month":"2026.07","price":97000,"count":4},{"month":"2026.08","price":96500,"count":3},{"month":"2026.09","price":98000,"count":3},{"month":"2026.10","price":98000,"count":3}]'::jsonb),
(2, '다산자이폴라리스', '다산동', '30평 (전용 74㎡)', 76000, 24, 12, 50.0, '[{"month":"2026.05","price":74000,"count":1},{"month":"2026.06","price":74500,"count":2},{"month":"2026.07","price":75000,"count":3},{"month":"2026.08","price":75500,"count":2},{"month":"2026.09","price":76000,"count":2},{"month":"2026.10","price":76000,"count":2}]'::jsonb),
(3, '다산e편한세상자이', '다산동', '34평 (전용 84㎡)', 86000, 48, 15, 31.3, '[{"month":"2026.05","price":84000,"count":2},{"month":"2026.06","price":84500,"count":3},{"month":"2026.07","price":85000,"count":3},{"month":"2026.08","price":85500,"count":2},{"month":"2026.09","price":86000,"count":3},{"month":"2026.10","price":86000,"count":2}]'::jsonb),
(4, '힐스테이트다산', '다산동', '34평 (전용 84㎡)', 89000, 29, 21, 72.4, '[{"month":"2026.05","price":86000,"count":3},{"month":"2026.06","price":87000,"count":4},{"month":"2026.07","price":87500,"count":4},{"month":"2026.08","price":88500,"count":3},{"month":"2026.09","price":89000,"count":4},{"month":"2026.10","price":89000,"count":3}]'::jsonb),
(5, '유승한내들골든뷰', '다산동', '38평 (전용 91㎡)', 84000, 19, 9, 47.4, '[{"month":"2026.05","price":81000,"count":1},{"month":"2026.06","price":82000,"count":2},{"month":"2026.07","price":82500,"count":1},{"month":"2026.08","price":83000,"count":2},{"month":"2026.09","price":84000,"count":2},{"month":"2026.10","price":84000,"count":1}]'::jsonb),
(6, '반도유보라메이플타운', '다산동', '33평 (전용 82㎡)', 79000, 35, 14, 40.0, '[{"month":"2026.05","price":76000,"count":2},{"month":"2026.06","price":77000,"count":2},{"month":"2026.07","price":77500,"count":3},{"month":"2026.08","price":78000,"count":2},{"month":"2026.09","price":78500,"count":3},{"month":"2026.10","price":79000,"count":2}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. 다산동 공인중개사 초기 Seed 데이터
INSERT INTO public.brokers (id, name, phone, agent_office_name, license_number, region, is_verified, rating, success_count)
VALUES
('agent-dasan-01', '김태형', '010-8921-3412', '다산 스마트 공인중개사무소', '제41360-2022-00124호', '다산동', true, 4.95, 34),
('agent-dasan-02', '이소연', '010-7734-9012', '다산 자이 단지내 공인중개사', '제41360-2021-00089호', '다산동', true, 4.90, 28),
('agent-dasan-03', '박준영', '010-4412-8823', '다산 한강프리미엄 부동산', '제41360-2023-00045호', '다산동', true, 4.88, 19)
ON CONFLICT (id) DO NOTHING;
