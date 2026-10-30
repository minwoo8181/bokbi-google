# [시스템 아키텍처] 복비(Bokbi) V2 마스터 아키텍처 (ARCHITECTURE.md)

> **최종 갱신**: 2026-10-24 (추천 엔진 v4: 면적대별 매물 소화 속도 → 20~50%)  
> **플랫폼 스택**: Next.js 15.5 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide React, Vitest, Gemini API(서버 전용)

---

## 1. 시스템 핵심 정의 및 도메인 모델
- **서비스 본질**: "다산동 아파트 집주인이 실거래·매물 수급 데이터로 **중개사도 납득할 수준의 복비**를 사전에 제안하고, 매물이 있는 단지 밖의 검증된 중개사가 **광고 없이 진성 매물**을 받는 매칭 플랫폼"
- **매칭 흐름**: 집주인 1집 요청 → 중개사 여러 곳이 크레딧으로 신청 → 집주인 최대 3곳 선택 → 1곳과 계약(보수 1곳만) → 나머지 크레딧 환불 없음
- **핵심 목표**: 
  1. 계약 당일 현장에서 발생하는 감정 소모적 복비 흥정 원천 차단
  2. 허위 매물 없는 네이버 확인매물 연동
  3. 집주인의 연락처와 상세 동·호수는 매칭 수락 전까지 100% 비공개(블라인드) 보호

---

## 2. 검증 도구
- 정적 검사: `npm run typecheck` (`tsc --noEmit`), 단위 테스트: `npm test` (Vitest, 100개: 법정 요율표 대조·엔진·AI 출력 검증 포함)
- 엔진 검수 리포트: `npm run analysis:report` → `docs/analysis-validation.md`
- 데이터 빌드: `npm run data:build` (`data/market/` → `src/data/market/dasan-market.json`)
- 뷰포트 E2E: `scripts/run-e2e-360.bat`, `scripts/run-e2e-390.bat` (`agent-browser`, `http://localhost:3004`)
- 빌드·화면 검증은 별도 복사본에서 (3004 dev 서버와 `.next` 충돌 방지, HANDOVER 참고)

---

## 3. 디렉터리 구조 및 컴포넌트 위계 (Component Hierarchy)

```
src/
├── app/
│   ├── page.tsx                         # [메인 랜딩] 단지 검색바 + 통계 카드 + 3단계 안내
│   ├── analysis/[id]/
│   │   ├── page.tsx                     # [서버 컴포넌트] 저장소·엔진으로 AnalysisBundle 생성
│   │   └── AnalysisClient.tsx           # [분석 화면] 단일 수직 플로우 상태 컨트롤러
│   ├── api/analysis/explain/route.ts    # [AI 추천 이유] Gemini 호출 (서버 전용)
│   ├── my-requests/
│   │   └── page.tsx                     # [내 의뢰] 중개사 매칭 요청 확인 및 언마스킹
│   └── agent/
│       └── register/page.tsx            # [중개사 등록] 3종 서류 제출 및 서약
├── components/
│   ├── home/                            # 메인 화면 전용 위젯
│   ├── analysis/                        # 분석 화면 모듈러 컴포넌트
│   │   ├── ApartmentHeroBadge.tsx       # 헤이딜러 번호판 + 👑 대장 뱃지 + 오늘 조회수
│   │   ├── TradeTypeToggle.tsx          # 매매 / 전세 토스 블루 토글
│   │   ├── PyeongSelectorChips.tsx      # 단지별 고유 평형 동적 적응형 그리드 칩
│   │   ├── FloorSelectorChips.tsx       # 토스식 1줄 일체형 층수 세그먼트 컨트롤러
│   │   ├── CommissionCustomizerCard.tsx # [1스크롤 앵커] 추천 복비 + 0원~상한 슬라이더 4색 구간 + 스텝퍼 + 추가 보수
│   │   ├── PrecisionUnlockBanner.tsx    # 내 집 맞춤 진단 배너 (매칭 모달 열기)
│   │   ├── HokimTradeChartCard.tsx      # 호갱노노 스타일 Recharts ComposedChart + 국토부 표
│   │   ├── RecommendationReasonCard.tsx # AI가 분석한 추천 이유: 시장 위치(단지 6개월) → AI 요약 → 추천 할인 계산 흐름
│   │   ├── BrokerPayoutCard.tsx         # (중개사 플로우용, Phase 5) 중개사가 받는 금액 vs 다산동 1건 법정 상한 보수 중위
│   │   ├── MarketDiagnosticCard.tsx     # (화면에서 내림 2026-10-22, 파일만 유지) 매물 소화 기간·가격 흐름
│   │   ├── EndgameDebatePoll.tsx        # 단지별 5대 어그로 끝장 투표 인라인 롤링 카드
│   │   ├── DebateBottomSheetModal.tsx   # 토스식 풀 바텀시트 (댓글 없는 순수 [A] vs [B])
│   │   ├── RecentMatchesFeed.tsx        # 매칭 사례 롤링 티커 (props: MatchCaseFeed ← repository.getMatchCaseFeed, EXAMPLE이면 '예시' 배지)
│   │   ├── MatchingStickyBar.tsx        # 하단 고정 안심 바 + 절약액 반영 확정 CTA
│   │   ├── MatchingBottomSheetModal.tsx # [토스식 6단계 모달] 껍데기 (상태 matching/useMatchingForm, 단계 matching/Step*.tsx)
│   │   └── types.ts                     # 분석 화면 전용 엄격한 TypeScript 타입 인터페이스
│   ├── agent/                           # 공인중개사 등록 및 약속 모달 모듈
│   ├── my-requests/                     # 내 의뢰 확인 및 언마스킹 매칭 확정 뷰
│   ├── common/                          # 공통 UI (FormattedText, LegalPolicyModal)
│   └── shared/                          # 전역 런타임 모듈 (GlobalClientErrorGuard)
├── config/
│   └── siteContent.ts                   # 전역 카피라이팅 및 텍스트 단일 진실 공급원 (SSOT)
├── data/
│   ├── market/dasan-market.json         # 58개 단지 실데이터 (npm run data:build 산출물)
│   ├── market/matchCaseExamples.ts      # 매칭 사례 예시 (배포 전 실데이터 교체)
│   └── complexPyeongMap.ts              # (레거시) 국토부 평형 별칭 매핑
├── theme/
│   └── themeConfig.ts                   # 토스 라이트 단일 고정 디자인 토큰 시스템
└── lib/
    ├── commission.ts                    # [법정 요율 엔진] 시행규칙 [별표 1], 정수 연산·원 미만 절사, 하한 30%
    ├── analysis/
    │   ├── marketEngine.ts              # [추천 엔진 v4] recommend(면적대) · discountFromRatio · bandRatios · feeZone · ENGINE_PARAMS
    │   ├── explain.ts                   # [AI 설명] 팩트 구성 · 프롬프트 · 템플릿 · 출력 검증 (순수 함수)
    │   └── gemini.ts                    # [AI 설명] Gemini 호출·모델 대체·캐시 (서버 전용)
    ├── market/repository.ts             # [데이터 저장소] 서버 전용, 배포 시 내부만 Supabase로 교체
    ├── mock-analysis-data.ts            # (레거시) 보너스 옵션 초기값 등
    └── utils.ts                         # 원화 포맷팅(1억 미만 반올림 없음), 공통 유틸
```

---

## 4. 데이터 플로우 엔진 (Data Flow & State Architecture)

```mermaid
flowchart TD
    Raw["data/market (네이버 매물·국토부 매매/전월세·R-ONE·건축물대장)"] -->|npm run data:build| Json["src/data/market/dasan-market.json"]
    Json --> Repo["src/lib/market/repository.ts (서버 전용)"]
    Engine["src/lib/analysis/marketEngine.ts (추천 엔진 v4)"] --> Repo
    Repo --> Server["src/app/analysis/[id]/page.tsx (서버 컴포넌트)"]
    Server -->|AnalysisBundle| Page["AnalysisClient.tsx (State Orchestrator)"]
    Repo --> Explain["/api/analysis/explain → explain.ts → gemini.ts"]
    Explain -->|headline·body (검증 통과 or 템플릿)| Reason["RecommendationReasonCard"]
    LegalEngine["src/lib/commission.ts (공인중개사법 별표1 상한요율 엔진)"]
    
    subgraph State["중앙 집중 상태 (Single Source of Truth)"]
        Trade["tradeType: '매매' | '전세'"]
        Pyeong["selectedPyeongId: 단지별 실제 거래 평형"]
        Floor["floorCategory: 'low'|'mid'|'high'"]
        Commission["customCommissionWon (단위: 원, 법정상한 내 자동 계산)"]
        Bonus["bonusOptions (3개 특별 보너스 옵션)"]
        Debate["debates (5대 어그로 투표) & userVotes"]
        Modal["isModalOpen & isDebateModalOpen"]
    end
    
    Page --> State
    LegalEngine --> Customizer["CommissionCustomizerCard (구간별 상한 배지)"]
    LegalEngine --> MatchModal["MatchingBottomSheetModal (법정 대비 절감율 배지)"]
    Page --> PyeongChips["PyeongSelectorChips (실제 평형 동적 바인딩)"]
    Page --> Reason
    State --> FloorChips["FloorSelectorChips"]
    State --> Chart["HokimTradeChartCard"]
    State --> DebatePoll["EndgameDebatePoll"]
    State --> DebateModal["DebateBottomSheetModal"]
    State --> Sticky["MatchingStickyBar"]
    State -.->|컨펌 후 14개 필드 영구 저장| MatchModal
    MatchModal -->|localStorage: bokbi_active_request_summary| MyRequests["/my-requests (무손실 안전 언마스킹)"]
```

---

## 5. 향후 백엔드(Supabase) 데이터베이스 스키마 계약

```sql
-- 1. 아파트 단지 마스터
CREATE TABLE apartments (
    id SERIAL PRIMARY KEY,
    apt_name VARCHAR(100) NOT NULL,
    dong_name VARCHAR(50) DEFAULT '다산동',
    total_households INT NOT NULL,
    built_year INT NOT NULL,
    is_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 국토부 실거래 계약 내역
CREATE TABLE molit_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id INT REFERENCES apartments(id),
    trade_type VARCHAR(10) NOT NULL, -- '매매' or '전세'
    exclusive_area NUMERIC(5,2) NOT NULL,
    pyeong_name VARCHAR(20) NOT NULL,
    deal_price_won BIGINT NOT NULL,
    deal_date DATE NOT NULL,
    floor INT NOT NULL
);

-- 3. 어그로 끝장 투표 마스터
CREATE TABLE debate_topics (
    id VARCHAR(50) PRIMARY KEY,
    apartment_id INT REFERENCES apartments(id),
    badge VARCHAR(30) NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    option_a_label VARCHAR(100) NOT NULL,
    option_a_votes INT DEFAULT 0,
    option_b_label VARCHAR(100) NOT NULL,
    option_b_votes INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 집주인 매칭 의뢰 마스터 (블라인드 보호)
CREATE TABLE matching_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id INT REFERENCES apartments(id),
    trade_type VARCHAR(10) NOT NULL,
    pyeong_id VARCHAR(10) NOT NULL,
    floor_category VARCHAR(10) NOT NULL,
    asking_price_won BIGINT NOT NULL,
    proposed_commission_won BIGINT NOT NULL,
    bonus_amount_won BIGINT DEFAULT 0,
    custom_condition_text TEXT,
    masked_dong VARCHAR(20), -- '104동'
    masked_ho VARCHAR(20),   -- '1802호' (매칭 전 비밀)
    owner_phone VARCHAR(20), -- '010-****-5678' (매칭 전 비밀)
    status VARCHAR(20) DEFAULT 'WAITING', -- 'WAITING', 'REQUESTED', 'CONFIRMED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 매칭 사례 (getMatchCaseFeed가 LIVE로 읽는 뷰). 동·호수·연락처 등 민감 필드 없음
CREATE VIEW match_cases AS
SELECT id, complex_name, pyeong_label, trade_type, deal_price_manwon,
       legal_cap_won, agreed_fee_won, saved_won, discount, matched_at
FROM ...; -- matching_requests CONFIRMED 기준으로 정의 예정

-- 6. AI 추천 이유 캐시 (현재 서버 메모리 → 배포 시 교체)
CREATE TABLE analysis_explanations (
    cache_key TEXT PRIMARY KEY,           -- complexId:pyeongId:kind:observedAt
    source VARCHAR(10) NOT NULL,          -- 'AI'
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
