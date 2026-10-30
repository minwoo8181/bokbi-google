# 컴포넌트 지도 (화면 → 파일)

> 고칠 화면을 찾아 **그 줄의 파일만** 연다. 전체를 미리 읽지 않는다 (토큰 절약, 2026-10-26).
> 규칙: 계산·규칙은 `src/lib/` 순수 함수 + 테스트, 문구는 `src/config/siteContent.ts`, 화면 파일(.tsx)은 400줄 이하 (`src/__tests__/fileSize.test.ts`가 막음). 작업 방법은 `.claude/skills/bokbi-component/SKILL.md`.
> 파일을 새로 만들거나 나누면 이 표에 한 줄 추가한다.

## 중개사 `/agent`

| 화면 | 파일 | 계산·규칙 (lib) |
|---|---|---|
| 껍데기: 탭 전환·열린 시트·토스트 | `components/agent/AgentWorkspace.tsx` | — |
| 저장소 상태·동작 (요청 보내기, 거래 기록, 방문, 광고) | `components/agent/useAgentWorkspace.ts` | `broker/mockMarket.ts` |
| 새 의뢰 탭 (안내 줄, 요청 가능한 매물 + 공통 세그먼트 필터, 요청 보낸 매물, 24시간 미만 빨간 시간) | `components/agent/FeedTab.tsx` | `broker/feed.ts` `groupFeed`·`isUrgent`·`URGENT_HOURS` |
| 새 의뢰 "먼저 끝낼 일" (요청 보내기 잠금, 지금 할 일과 같은 `TodoRow`) | `components/agent/TodoFirstBanner.tsx` | `deal/deal.ts` `isBlocking`·`BLOCKING_STRIPS`, `broker/feed.ts` `sendBlock` `TODO_FIRST` |
| 집주인 내 의뢰 맨 위 "지금 확인해 주세요" | `components/my-requests/OwnerTodoBanner.tsx` | `deal/deal.ts` `cardStrip` (파랑 띠) |
| 집주인 내 의뢰 맨 위 "운영팀이 소유자 확인 중이에요" (허위 매물 신고 확인 중) | `components/my-requests/OwnerCheckBanner.tsx` | `broker/fakeReport.ts` `pendingOwnerCheck` |
| 요청 시트 (계약하면 받는 금액, 잘하는 점 칸) | `components/agent/FeedRequestSheet.tsx` | `broker/feed.ts` `dealEarnings`, `broker/strengthSlots.ts` |
| 크레딧 칩 시트 / 크레딧 더 받기 | `CreditSheet.tsx` / `MoreCreditsButton.tsx` · `MoreCreditsSheet.tsx` | `broker/credits.ts` |
| 내 매물 탭 (안내 두 줄 → 지금 할 일 → 진행 중 매물 → 보낸 요청, 새 소식) | `components/agent/ListingsTab.tsx` | `deal/deal.ts` `cardStrip` `newsSince` |
| 내 매물 빨강 긴급 알림(`AgentUrgentAlert`) + 노랑 "곧 할 일" 줄(`TodoRow`, 집주인 곧 확인할 일도 씀) | `components/agent/AgentTodoSection.tsx` | `broker/agentTodo.ts` `agentTodoItems` |
| 카드 상태 점 알약 (집주인 부동산 카드·현황판 칩·중개사 내 매물·지난 요청 공용) + 카드 상태 줄 규칙 | `components/common/StatusPill.tsx` (`CARD_HIDDEN_STRIPS`·`STATUS_DOT`) | `requests/stage.ts` `adState`, `deal/ownerTodo.ts` `heroVisit` |
| 빨강 할 일 긴급 알림 상자 (새 의뢰·내 매물·내 의뢰 공용) | `components/common/UrgentAlert.tsx` | `broker/agentTodo.ts`, `deal/ownerTodo.ts`, `deal/deal.ts` `isBlocking` |
| 모든 시트·창의 닫기 X | `components/common/CloseButton.tsx` (`ActionSheet`·매칭 요청 창·끝장 투표 창) | — |
| 카드 안 "거래 진행 상황" 버튼 모양 | `components/common/cardStyles.ts` `CARD_ACTION` | — |
| 내 사무소 프로필 카드(약속 레벨) + 복비 특약·크레딧·지난 요청 섹션 | `components/agent/OfficeTab.tsx` (`OfficeHeader`·`LevelRow`·`PastRequestsCard`) | `requests/stage.ts` `promiseTier`, `broker/pastRequests.ts` `listingBucket` |
| 복비 특약 만들기 머리 카드 (진행 동그라미·내 상황) | `components/agent/TermsHero.tsx` | `common/StepCircles` |
| 복비 특약 상황 알약·고른 특약 줄·넣기 줄 | `components/agent/SpecialTermsParts.tsx` | `broker/specialTerms.ts` |
| 거래 페이지 (중개사) | `DealPage.tsx` · `DealNextCard.tsx` · `DealTimeline.tsx` · `DealDatesSheet.tsx` · `VisitScheduleSection.tsx` | `deal/deal.ts`, `requests/showing.ts` |
| 거래 페이지 머리 카드 + 합의 확인서 (집주인·중개사 공용, 2026-10-27 A안) | `components/agent/DealHero.tsx`(`DEAL_SECTION_TITLE`) · `components/agent/AgreementReceipt.tsx` | `deal/dealStep.ts` `dealStep`, `deal/dealFee.ts` `feeForPrice`·`personalFeeScenarios` |
| 내 사무소 탭 (이름·잘하는 점·약속 레벨 `PromiseLevel`·별점·크레딧 내역) | `components/agent/OfficeTab.tsx` | `broker/strengthSlots.ts`, `requests/stage.ts` `promiseTier`, `deal/settle.ts` |
| 잘하는 점 고치기 시트 | `StrengthsEditSheet.tsx` | — |
| 테스트 스위처 (배포 전 제거) | `components/agent/AgentQa.tsx` | — |
| 가입 `/agent/register` (① 사무소·본인 확인 → ② 잘하는 점 → ③ 약속 → 완료) | `BrokerSignupFlow.tsx`(상태·테스트 스위처) → `agent/signup/OfficeStep.tsx`(세 칸·확인 카드, 맞아요 뒤 children) · `PhoneVerifySection.tsx` · `StrengthsStep.tsx` · `PromiseStep.tsx`(예시 시트) · `SignupDone.tsx` · 공용 모양 `SignupParts.tsx` | `broker/signup.ts` `registry.ts` `application.ts` |
| 복비 특약 만들기 `/agent/terms` | `SpecialTermsBuilder.tsx` (정리 대기) | `broker/specialTerms.ts` |

## 집주인 `/my-requests`

| 화면 | 파일 | 계산·규칙 (lib) |
|---|---|---|
| 껍데기: 단계별 섹션·시트·선택 | `app/my-requests/page.tsx` | — |
| 의뢰 상태·거래 기록 동작 | `components/my-requests/useOwnerRequest.ts` | `requests/stage.ts`, `deal/deal.ts` |
| ① 요청 받는 중 (익명 카드) | `ReceivingSection.tsx` · `AnonOfferCard.tsx`(약속 레벨 칩, 맨 아래 `EndorsedChips` 펼치기) · `ReviewSheet.tsx` | `requests/stage.ts`(`trustBadges`·`endorsementCount`·`ownerEndorsedChips`) · `requests/blindMask.ts`(블러 상호 길이 3종) |
| 내 정보 관리 `/my-info` (본인 확인 → 내 정보 · 정정·삭제 문의 · 탈퇴 요청, 2026-10-29) | `app/my-info/page.tsx` → `components/my-info/MyInfoPage.tsx` · `MyInfoVerify.tsx`(휴대폰 인증) · 링크: `home/HomeFooter`·`app/my-requests/page.tsx`·`agent/OfficeTab` | `privacy/myInfo.ts`(가림·같은 번호·탈퇴 막기·탈퇴 요청 10일) · 문의 연결 `support/inquiry.ts`(카카오 채널, 없으면 보호책임자 메일) |
| 익명 카드 거리 구간 (요청 보낼 때 서버 계산, 2026-10-29) | 서버 액션 `app/agent/actions.ts` `offerDistanceBand` ← `lib/data/local` `offers.send` · 표시 `AnonOfferCard` | `geo/distance.ts`(하버사인·구간) · `geo/complexLocation.ts`(단지 지번 질의) · `requests/officeMap.ts`(VWorld 지오코딩) |
| 약속 레벨 칩 (내 사무소·익명 카드·가입 약속 공용, 2026-10-29) | `components/common/PromiseLevel.tsx` (`size` sm·md, `suffix`) | `requests/stage.ts` `promiseLevel` = `promiseTier` + 1 |
| ② 진행중 (중개사 카드, 방문, 판매 상태) | `InProgressSection.tsx` · `MatchedBrokerCard.tsx` · `ShowingScheduleCard.tsx` · `SaleStatusCard.tsx` · `AdRemovalCard.tsx`(광고 내림 확인 n/m, 종료 화면도) | `requests/showing.ts` · `deal/deal.ts` `endByOwner`·`adRemoval` |
| 거래 페이지 (집주인) | `OwnerDealPage.tsx` · `ReviewForm.tsx`(별 → 실어 보낸 강점 "맞았나요?" → 나머지 칩 접기, 2026-10-29) (머리 카드·합의 확인서는 `agent/DealHero`·`agent/AgreementReceipt`) | `deal/deal.ts`, `deal/dealStep.ts`, 후기 칩 나누기 `requests/stage.ts` `reviewChipSplit` |
| 확정·취소·해제·축하 | `RequestSheets.tsx` · `FeeSheet.tsx` | — |
| 상단 요약 | `RequestHero.tsx` · `RequestSummaryCard.tsx` | — |
| 테스트 스위처 (배포 전 제거) | `components/my-requests/OwnerQa.tsx` | — |

## 공통

| 화면 | 파일 | 계산·규칙 (lib) |
|---|---|---|
| 실제 거래금액 입력 + 다시 계산한 복비 (중개사 가계약·계약 알림, 집주인 직접 알림) | `components/common/DealPriceField.tsx` | `deal/dealFee.ts` `feeForPrice` |
| 휴대폰 인증 (매칭 모달 4단계·중개사 가입 공통, A1) | `components/auth/usePhoneVerification.ts`(타이머·보내기·확인·테스트 채우기) · `authClient.ts`(스위치: 흉내 / Supabase) | `auth/phone.ts`(번호 정리·6자리·남은 시간·Supabase 오류 → 앱 오류) · `auth/port.ts` · `auth/local.ts`(흉내) · `auth/supabase.ts`(Supabase Auth) |
| 로그인 `/login` (기존 회원만, `?next=`) | `app/login/page.tsx` → `components/auth/PhoneLoginCard.tsx` | 로그인 필요 경로·돌아갈 곳 검사 `auth/routes.ts`, 막기·세션 새로 고침 `src/middleware.ts`(스위치 켜졌을 때만) |
| Supabase 연결 | `lib/supabase/env.ts`(스위치·주소·공개 키 한 곳) · `browser.ts` · `server.ts` | — |
| 인증 문자 (Supabase Send SMS Hook) | `app/api/auth/sms-hook/route.ts` | 서명 확인 `sms/webhook.ts`, Solapi 발송 `sms/solapi.ts`, 문구 `siteContent.sms` |
| "거래금액이 바뀌면" 규칙·예시 (두 화면 같은 틀 = 칩 + 세 줄: 가입 약속 `FixedExample` 고정 4개, 매칭 모달 `PersonalExample` = `agreed`로 내 집 금액) | `components/common/FeeRuleExamples.tsx` | `deal/dealFee.ts` `FEE_RULE_EXAMPLES` · `feeRuleExample`(합의·실제 상한·요율) · `personalFeeScenarios` · `discountPct`, 요율 경계 `commission.ts` `BRACKET_STARTS_WON` |

## 집주인 매칭 모달 (분석 화면 "무료 매칭", 6단계 + 완료)

> 단계 화면은 `form` 하나만 받는다 (`useMatchingForm`이 돌려주는 값·함수). 새 상태는 hook에, 화면은 단계 파일에.

| 화면 | 파일 (`components/analysis/`) | 계산·규칙 (lib) |
|---|---|---|
| 껍데기: 헤더·닫기·단계 전환 | `MatchingBottomSheetModal.tsx` | `requests/modalStep.ts` |
| 진행 표시 (단계 이름 동그라미 6개, 2026-10-27) | `matching/ModalStepper.tsx` | `requests/modalStep.ts` `STEP_INDEX` · 이름 `matchingModal.stepperLabels` |
| 상태·다시 요청 채우기·견적·제출·단계 이동 | `matching/useMatchingForm.ts` (통신사 목록 `matching/carriers.ts`) | `requests/modalStep.ts` `nextStep`·`prevStep`, `commission.ts`, 저장 `submitRequest.ts` |
| 빠진 칸 안내 (인라인 오류: 첫 칸 스크롤·빨간 링·칸 아래 한 줄·남은 개수, 2026-10-27) | `matching/missingGuard.tsx` (`useMissingGuard`·`FieldError`·`MissingCount`), 칸에 `data-field` | `requests/missingFields.ts` (단계별 빠진 칸 목록 = 넘어가는 조건) |
| 선택 버튼 모양 (회색 틀 + 고른 칸 흰 알약, 2026-10-29 홈·분석·매칭 창·중개사 피드 공용) · 테두리 카드 `FLOOR_CARD`(분석 평형·층 칸) | `segmentStyles.ts` | — |
| ① 거래 유형·평형·타입·요약 | `matching/StepTradePyeong.tsx` | — |
| ② 희망 금액·입주일 | `matching/StepPriceMoveIn.tsx` | `market/priceCompare.ts`, `requests/moveIn.ts` |
| ② 점유 상태·세입자·세입자 낀 매매·방문 메모 | `matching/OccupancySection.tsx` | `market/leasedSale.ts` |
| ② 근저당 | `matching/MortgageSection.tsx` | `market/mortgage.ts` |
| ③ 복비 정하기 (2026-10-27, 분석 카드에서 옮김): 구간 막대·조절 막대·±·추천으로 되돌리기·부가세 알약·코치마크·하한/상한 점 안내 | `matching/StepFee.tsx` · `matching/FeeBonusOptions.tsx`(더 빠른 매칭 옵션) · `FeeZoneBar.tsx` | `lib/commission.ts` `computeCommissionQuote`, `analysis/feeZoneBar.ts`, `analysis/marketEngine.ts` `feeZone`. 금액·옵션 상태는 `AnalysisClient`에 있고 `fee` prop으로 조절. 다시 요청은 이 단계를 지나지 않음 |
| ④ 동·호수·블라인드 미리보기·옵션 (testid `modal-step-3` 유지) | `matching/StepDongHo.tsx` | `market/units.ts`, `requests/matchingMask.ts`, `requests/moveIn.ts` `optionsSummary` |
| ⑤ 소유주·통신사·동의·휴대폰 인증 | `matching/StepOwnerVerify.tsx` · `ConsentGroup.tsx` | `auth/phone.ts` (`usePhoneVerification`) |
| ⑥ 중개사 미리보기·서약·보내기 | `matching/StepFinalPledge.tsx` | `requests/matchingMask.ts` |
| 내 의뢰 현황판·지금 확인할 일·카드·방문 설정 (2026-10-27 섹션 정리) | `my-requests/RequestHero.tsx`·`RequestSummaryDetail.tsx`·`OwnerTodoSection.tsx`·`MatchedBrokerCard.tsx`·`InProgressSection.tsx`·`ShowingScheduleCard.tsx`, 진행 동그라미 `common/StepCircles.tsx` | `deal/ownerTodo.ts`, `requests/showing.ts` `partHourRanges` |
| 내 의뢰 우리 집 판매 설정 (희망가 바꾸기·멈추기 vs 거둬들이기·다른 곳 거래 이유, 2026-10-27) | `my-requests/SaleStatusCard.tsx`·`PriceChangeSheet.tsx` | `deal/priceChange.ts`, `deal/dealFee.ts`, 저장 `repos.requests.changePrice`, DB `20261027120000_owner_change_price.sql`(미적용), 기록 `analytics/events.ts` `sale_change` |
| 완료 (영수증: 법정 상한 − 할인 + 옵션 = 내가 제안한 복비, 접수번호, 2026-10-27) | `matching/StepComplete.tsx` | `requests/feeReceipt.ts`, 접수번호는 `submitRequest.ts`가 돌려준 저장 번호 |

## 그 밖

| 화면 | 파일 |
|---|---|
| 홈 `/` | `app/page.tsx`(섹션 흰 띠 + 회색 틈) → `components/home/`: `HomeHeader`(고정 머리줄, 회색 바탕 + 로고 `common/BrandLogo`, 탭 아이콘 `app/icon.svg`) · `HomeHero`(첫 문구) · `HomeSearchSection`(돋보기 명패 검색창·누를 때 칩) · `HomeResumeRow`(진행 중 의뢰 이어보기) · `HomeMatchTicker`(검색 카드 맨 아래 매칭 알약, 사례 `getMatchCaseFeed`) · `HomeStatsCard`(우리 단지 복비: 단지 칩 3개·큰 금액·막대 한 줄, 예시 `homeComplexExamples` in `lib/home/homeMarket.ts` + 단계 `lib/home/homeStats.ts`, 실시간 집계 `app/api/public-stats/route.ts`) · `HomeProcessSteps`(복비, 왜 다를까요? 3줄 + 칩) · `HomeGuideSheet` + `HomeStepSample`(이용 방법 시트, 집주인 `home.guide`·중개사 `home.brokerGuide` 공용) · 중개사 카드 `agent/BrokerPartnerBanner`(파랑 바탕, 버튼 → 중개사 시트 → 가입) · `HomeFooter`(4줄 바닥글) · `HomeFloatingCta`(바닥 고정 주 버튼 → 검색창으로) |
| 분석 `/analysis/[id]` | `app/analysis/[id]/AnalysisClient.tsx`, `components/analysis/*` (매칭 모달은 아래 표) |
| 분석 "팔린 값 vs 부르는 값" 카드 (실거래 + 호가 줄·노랑 띠, 층 탭) | `components/analysis/HokimTradeChartCard.tsx` · 데이터 `lib/market/repository.ts` `marketSide().asking` · 층 판정·집계 `lib/market/askingPrice.ts` · 데이터 만들기 `npm run data:asking` (`scripts/build-asking-prices.mjs` → `src/data/market/dasan-asking.json`) |
| 관리자 콘솔 `/admin` (2026-10-29 A안 탭: 오늘·중개사·의뢰·지표·시스템, `?tab=`, 예전 `?tab=reports`는 의뢰로. 넓은 화면(lg)은 왼쪽 메뉴 + 대시보드 — `globals.css` `.mobile-app-frame:has(.admin-wide)`로 틀을 풂) | `app/admin/page.tsx`(서버: 키·데이터 날짜·다산동 사무소 336·단지 58 등 `MarketBase`) → `components/admin/AdminConsole.tsx` · `adminTabs.ts`(탭·`MarketBase`, 서버도 읽음) · `useAdminData.ts`(+ 탈퇴 요청) · `AdminTodayTab`(현황·긴급·곧 할 일·지켜볼 것·서비스 상태) · `AdminBrokersTab`(가입 현황 + 가입 신청 목록 → 한 건 가입 확인 `AdminBrokerReview`, A2'': 저장소 `admin.applications`·`decideApplication`) · `AdminRequestsTab`(신고 `AdminReportsTab` / 문의 / 모든 의뢰·거래 기록) · `AdminMetricsTab`(v2: 비교 기준·한눈에·다산동 침투·단지 순위·개선 제안) · `AdminSystemTab` |
| 화면이 쓰는 저장소 (하나) | `components/data/repos.ts` — 훅은 여기서 `repos`를 가져다 씀. Supabase 전환은 이 파일만 |
| 동·호수·연락처 열람 (A2') | `components/data/useContactReveal.ts` — (의뢰, 목적)당 1번 `contacts.reveal`, 결과는 상태로. 판정 `lib/data/revealView.ts`. 쓰는 곳: 중개사 `DealPage`(→ `DealNextCard`·`VisitScheduleSection`에 prop), 집주인 `app/my-requests/page.tsx`(→ `RequestSummaryCard`·`InProgressSection`) |
| 매칭 모달 제출·다시 요청 채우기 | `components/analysis/submitRequest.ts` (local = 요약만, supabase = `requests.create` + 비밀 칸 뺀 요약 / 다시 요청 동·호수 서버 열람) · 변환 `lib/requests/summaryRequest.ts` |
| 데이터 계약 계층 | `lib/data/schema.ts`(zod — 저장값 읽기는 모두 여기) · `repo.ts`(저장소 인터페이스) · `local/index.ts`(브라우저 저장소 구현, `createLocalRepos`) · 계약 테스트 `__tests__/contract.test.ts`(Supabase 구현도 같은 테스트) |
| 중개사 내 사무소 "이번 달 내 성과"(보냄→고름→계약·계약 보수) + 집주인이 인정한 장점(받은 후기 칩) · 긴급 알림 `TodoFirstBanner`는 새 의뢰·내 사무소 맨 위 공용 (2026-10-29 A안, "우리 단지" 탭은 MVP 뒤로) | `components/agent/OfficeTab.tsx` `PerformanceCard` · `AgentWorkspace.tsx` `todoBanner` | `broker/monthPerformance.ts` `monthPerformance`·`reviewChipCounts` |
| 문의하기 시트 (자주 묻는 질문 3개 + 더 보기 → 내 문의·답 → 양식, 2026-10-29) · 입구 한 줄(집주인 내 의뢰 아래·내 정보 관리 "정정·삭제 문의", 중개사 내 사무소 아래) · 관리자 의뢰 탭 "문의"(답할/답한 문의, 자주 쓰는 답, 답변 1번) | `components/support/InquirySheet.tsx` · `InquiryEntry.tsx`(`ownerInquiryContext`) · `inquiryStore.ts`(목업 저장소) · `components/admin/AdminInquiries.tsx` | `support/inquiries.ts`(보내기·답변·번호 가림·10일 기한) · `admin/today.ts` `INQUIRY` |
| 관리자 2단계 인증 (A5, 2026-10-29 C안: 휴대폰 = 인증 앱 열기 버튼 + 키 복사, lg = QR, 들어올 때마다 6자리) · 개발 미리보기 `/admin?mfa=ENROLL\|VERIFY`(123456) · 시스템 탭 개인정보 열람 기록(열람 / 관리자 처리, 10줄씩) | `components/admin/AdminMfa.tsx` · `mfaPreview.ts` · `AdminAccessLog.tsx` · 서버 관문 `app/admin/adminGate.ts` | `admin/gate.ts`(관문 판정·6자리 정리·키 띄움) · `auth/mfa.ts`(Supabase MFA 포트) · `admin/accessLog.ts`(기록 줄) |
| 관리자 웹 푸시 (2026-10-29: 시스템 탭 맨 위 "알림 받기" — 이 기기 켜기·끄기, 알림 종류 4개, 시험 알림) | `components/admin/AdminPushCard.tsx` · 서버 동작 `app/admin/push/actions.ts` · 서비스 워커 `public/admin-sw.js` · 아이폰용 `public/admin.webmanifest` + `app/admin/layout.tsx` | `admin/push.ts`(무엇을 언제: 아침 요약·기한 지남·서비스·가입, 밤 긴급만, 하루 한 번) · `push/webPush.ts`(기기 주소 검사·VAPID 키·설정 기본값) · `admin/pushTick.ts`(자동 발송 한 번의 순서) · 경로 `app/api/admin/push-tick/route.ts`(15분 예약 작업이 부름, 서버 키는 여기만) |
| 관리자 규칙 | `lib/admin/today.ts`(오늘 할 일 + 탈퇴 요청·`deadlineLeft`) · `overview.ts`(지금 현황·다산동 침투·단지 순위·서비스 문제·의뢰 찾기) · `reports.ts`(신고 목록) · `adminLog.ts`(처리 기록) · `gate.ts`(관문) · `accessLog.ts` · `dataFreshness.ts` · `keys.ts` |
| 행동 기록 (화면 연결 전) | `lib/analytics/events.ts`(이벤트 22개·형식 검사) · `privacy.ts`(개인정보 차단) · `metrics.ts`(지표) · `store.ts`(`track`, 브라우저 저장소 → Supabase 때 sink만 교체) |
| 화면 흐름 자동 확인 (Playwright, `npm run e2e`) | `e2e/matching-flow.spec.ts`(집주인 요청 → 피드 → 요청 보내기 → 매칭 → 양쪽 거래 페이지) · `e2e/blind-guard.spec.ts`(선택 안 된 중개사에게 개인정보 안 열림) · 공통 단계 `e2e/steps.ts` · 설정 `playwright.config.ts` (루트) |
| 법정 중개보수 (SSOT) | `lib/commission.ts` |
| 모든 문구 (SSOT) | `config/siteContent.ts` (키 위치는 `docs/CONTENT_MAP.md`) |
