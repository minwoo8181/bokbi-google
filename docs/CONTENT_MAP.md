# 🗺️ 복비 (Bokbi) V2 - 전역 문구 & 카피라이팅 매핑 가이드 (CONTENT_MAP.md)

> **문서 버전**: v1.0.0  
> **최종 갱신**: 2026-10-20  
> **통합 설정 파일 경로**: [`src/config/siteContent.ts`](../src/config/siteContent.ts)  
> **목적**: 대표님께서 AI에게 매번 부탁하지 않고, 원하는 화면의 글씨를 `siteContent.ts` 파일에서 직접 1초 만에 찾아 수정하실 수 있도록 화면 위치와 설정 키를 1:1로 매핑한 가이드입니다.

---

## 💡 초간단 수정 3단계 요약

1. 아래 표에서 **수정하고 싶은 화면과 위치**를 찾습니다.
2. 매핑 경로(예: `SITE_CONTENT.home.hero.title`)를 확인합니다.
3. [`src/config/siteContent.ts`](../src/config/siteContent.ts) 파일을 열고 해당 키의 따옴표 안에 있는 글자를 변경 후 저장합니다.

---

## 1. 🏠 메인 랜딩 화면 (`/`)

| 위치 / 컴포넌트 | siteContent.ts 매핑 키 경로 | 기본 텍스트 (Default Text) | 설명 / 노출 위치 |
| :--- | :--- | :--- | :--- |
| **GNB 로고** | `common.brandName` | `복비` | 상단 네비게이션 좌측 서비스명 |
| **GNB 지역 배지** | `common.regionBadge` | `다산동` | 로고 옆 하늘색 알약 배지 |
| **GNB 집주인 버튼** | `common.navMyRequests` | `집주인` | 상단 우측 첫 번째 버튼 (내 의뢰) |
| **GNB 중개사 버튼** | `common.navBroker` | `중개사` | 상단 우측 두 번째 버튼 |
| **홈 첫 문구** | `home.hero.title·subTitle` | `단지 이름만 입력하면,\n**적정 복비**를 알려 드릴게요` / `복비에서 거래하지 않아도 분명 도움이 될 거예요.` | 헤이딜러 첫 화면 화법 (2026-10-28, ** = 파란 글자). 2026-10-29 대표님: "실거래·매물 흐름" 빼고 2줄로 |
| **검색창 아래 줄** | `home.hero.safeNote·guideLink` | `개인정보 없이 단지명만` / `처음이라면? 이용 방법` | 자물쇠 아이콘 + 이용 방법 시트 링크 |
| **이어보기 줄** | `home.hero.resumeLabel·resumeValue·resumeButton` | `진행 중인 의뢰` / `{apt} {pyeong} {trade}` / `이어보기` | 이 휴대폰에 의뢰 요약이 있을 때만 |
| **단지 검색창** | `home.search.placeholder·submit` | `단지 이름 (예: 다산자이)` / `우리 집 복비 얼마?` | 파랑 돋보기 명패 검색창. `submit`은 바닥 고정 버튼 `HomeFloatingCta`(누르면 검색창으로, 2026-10-29). 초성 검색 기능은 그대로 |
| **이용 방법 시트 (집주인·중개사)** | `home.guide`·`home.brokerGuide` (`pages[].title·lines·sample`) | 집주인: 복비 먼저 / 매칭된 중개사에게만 / 내가 골라요(최대 3곳까지). 중개사: 복비 합의 요청 / 집주인이 최대 3곳 / 주변 부동산도 몰라요 | 문장마다 한 줄, 칸은 설명과 같은 내용. 크레딧 얘기 없음 |
| **우리 단지 복비 (숫자 카드)** | `home.stats.sectionTitle·exampleChipsLabel·exampleArrowLabel·exampleUnit·exampleLow·exampleCap·exampleBasis` | `우리 단지 복비, 이만큼 아낄 수 있어요` / `{pct}% 낮게 정하면 한 집 평균 이만큼 절약` / `{pct}% 낮게 정하면` / `법정 상한` / `최근 1년 실거래 {n}건 · 복비 엔진 기준` | 단지 칩 3개 + 큰 금액(2026-10-29). 예전 capSum·scenario·avg·max 키는 화면에서 안 씀 |
| **매칭 1건부터 실적 줄** | `home.stats.live.title·big·sub·badge` | `집주인과 중개사가 함께 정한 복비` / `한 집 평균 {average} 낮게` / `현재까지 총 {total} · 법정 상한 기준` / `LIVE` | 매칭마다 바로 갱신 (Supabase `public_stats`, `lib/home/homeStats.ts`) |
| **복비, 왜 다를까요?** | `home.process.sectionTitle·steps[].title·desc·chip·more` | `복비부터 정하고 시작` / `내 정보는 안전하게` / `내가 직접 골라요` + 칩 `상한 안에서`·`안심 매칭`·`최대 3곳` | 2026-10-29 A안. 나머지 강점(지역 인증 대표 공인중개사·집 보는 시간)은 자세히 보기 시트 (`homeCopy.test`) |
| **중개사 카드** | `home.partnerBanner.badge·title·buttonText` | `다산동 공인중개사인가요?` / `합리적인 복비로\n다산동 집주인을 만나보세요` / `파트너 중개사 혜택 보기` | 파랑 바탕 + 흰 알약, 버튼 → 중개사 이용 방법 시트 → 가입 (2026-10-29). `items[]`·`guideLink`는 안 씀 |
| **바닥글 고지** | `home.footer.disclaimer·copyright` | `복비는 개업공인중개사가 아닌 통신판매중개자이며, 거래의 당사자가 아닙니다.` | 4줄 바닥글(2026-10-29), `legalContent.test`가 세 표현을 지킴. securityNotice 삭제 |

---

## 2. 📊 AI 정밀 분석 화면 (`/analysis/[id]`)

| 위치 / 컴포넌트 | siteContent.ts 매핑 키 경로 | 기본 텍스트 (Default Text) | 설명 / 노출 위치 |
| :--- | :--- | :--- | :--- |
| **대장 아파트 배지** | `analysis.heroBadge.leaderBadge` | `대장` | Top 3 단지 진입 시 왕관과 함께 노출되는 배지 |
| **진성 조회수 라벨** | `analysis.heroBadge.viewCounterPrefix` | `오늘 다산동 집주인 조회` | 단지 배지 밑 실제 조회수 접두사 |
| **거래유형 스위처** | `analysis.tradeType.sale` / `jeonse` | `매매` / `전세` | 매매/전세 상단 토글 버튼 라벨 |
| **평형대 선택기** | `analysis.pyeongSelector.title` | `평형대 선택` | 평형 칩 선택 영역 헤더 타이틀 |
| **층수 구간 선택기** | `analysis.floorSelector.title` | `층수 구간` | 층수 칩 선택 영역 헤더 타이틀 |
| **호갱노노 차트 배지** | `analysis.chartCard.recentTradeBadge` | `국토부 실거래가 연동` | 차트 카드 상단 우측 배지 |
| **차트 서브타이틀** | `analysis.chartCard.chartSubTitle` | `최근 2개년 실거래 추이 & 거래량` | Recharts 추세선 상단 텍스트 |
| **선택 층수 범례** | `analysis.chartCard.selectedFloorLegend`| `● 내 아파트 선택층` | 차트 상단 우측 파란 범례 |
| **실거래 테이블 제목** | `analysis.chartCard.tableHeaderTitle` | `국토부 실거래 계약 목록 (최근순)` | 차트 하단 실제 계약 내역 헤더 |
| **복비 시뮬레이터 타이틀** | `analysis.customizer.cardTitle` | `AI 추천 적정 복비 시뮬레이터` | 복비 조절 박스 헤더 타이틀 |
| **분석 카드 금액 라벨·▼** (2026-10-27) | `analysis.customizer.analysisFeeLabel` · `analysisFeeRange` · `analysisMarkerLabel` · `ctaSubLine` | `추천 {tradeType} 복비` · `할인 {min}~{max}% 구간`(초록 칸 양 끝) · ▼ 위 `추천` · 버튼 밑 `우리 집 확정 복비는 매칭 요청에서 정해요` | 분석 카드는 보여주기 전용 (부가세·조절·옵션은 요청 창 복비 정하기). `proposedFeeLabel`(`내가 제안하는 {tradeType} 복비`)은 요청 창 막대 aria-label에만 |
| **요청 창 복비 정하기** (2026-10-27) | `matchingModal.stepFee.*` | `중개사에게 제안할 복비를 정해 주세요` · `최근 실거래 {price} 기준 · 법정 상한 {max}` · 점 + `계약 날 다시 흥정하지 않아요` · 코치마크 `막대를 끌거나 아래 버튼으로 금액을 바꿀 수 있어요` · 알약 `부가세 별도 · 4~10%` + `어느 쪽인지는 매칭된 중개사가 알려 줘요` · `다음: 상세 동·호수 입력` | 3단계 (`matching/StepFee.tsx`). 막대·버튼·구간 문구·옵션은 `customizer.*` 그대로 |
| **요청 창 빠진 칸 안내** (2026-10-27) | `matchingModal.missing.*` | 버튼 위 `{n}개 더 채우면 넘어갈 수 있어요` · 칸 아래 `세입자 연락처를 입력해 주세요` 등. 임대·근저당은 `step2.leasedSale.errors`·`step2.mortgage.errors` 그대로 | 다음 버튼은 늘 켜짐, 누르면 빈칸에 빨간 점 한 줄 (`matching/missingGuard.tsx`) |
| **블라인드 넛지 축약** | `analysis.customizer.blindBrokerSentenceFallback` | `내 조건 즉시 수락 대기:` | 접속 중개사 한 자릿수일 때 축약 문장 |
| **블라인드 물음표 배지**| `analysis.customizer.blindBrokerSecretBadge` | `🔒 ?곳` | 호기심 갭 유발 잠금 뱃지 |
| **블라인드 확인 버튼** | `analysis.customizer.blindBrokerButton` | `1초 만에 확인` | 넛지 우측 파란색 CTA 버튼 |
| **슬라이더 4색 구간 문구** | `analysis.customizer.zoneText` (색 범례는 2026-10-23 삭제) | WIDE `많은 중개사의 요청을 받을 수 있어요` · RECOMMENDED `집주인과 중개사 모두 납득할 수 있는 추천 구간이에요` · CAUTION `응하는 중개사가 줄어들 수 있어요` · RISK `매칭이 어려울 수 있어요…` | 중개사 관심도 대체. 구간은 추가 보수 포함 금액 기준 |
| **데이터 부족 30% 안내** | `analysis.customizer.defaultReasonText.NO_DATA` | `최근 1년 거래가 {n}건이라 매물 소화 속도를 계산하기 어려워요. 다산동 평균 단지와 같은 30%로 매칭을 요청해 보세요` | 엔진 `defaultReason` (v4는 NO_DATA만) |
| **협의 복비 보장** | `analysis.customizer.guaranteeText` / `matchingModal.step5.feeGuaranteeTitle·Desc·Support` | `매칭이 확정되면 합의한 중개보수로 계약해요…` · Support `합의한 복비와 다르게 요구받으면 고객센터로 알려 주세요. 매칭 때 중개사가 동의한 복비 기록을 확인서로 보내드리고, 약관에 따라 조치해요.` | 복비 카드 + 모달 Step 5 (Support는 모달만) |
| **분석 화면 정리 (2026-10-24 디자인 grill)** | `customizer.guaranteeText`(금액 아래 강조 박스, "보장" 배지 삭제) · `customizer.vatSummary` · `recommendationReason.headlineFallback·summaryLine·expandButton·basisNoteAi` · `floorSelector.subTitle` | `매칭이 확정되면 이 금액으로 계약해요…` · `부가세 별도 · 최대 +{amount}` · `AI 분석 자세히 보기`(파란 강조) · 출처 끝 `복비 자체 분석 엔진 + AI 분석`(모델 이름 쓰지 않음) · `· 최근 실거래` | 평형 칩 가격·요율 배지·추천 구간 24~29%·선택 평형 줄·내 집 맞춤 진단 배너·차트 기준가 줄 삭제(반복) |
| **추천 이유 카드 제목** | `recommendationReason.titleLabel` · `titleConclusion.{FASTER,SLOWER,EQUAL,MAX,MIN,NO_DATA}` · `titleVerb` · `tileListings·tileDeals·tileSpeed` · `rangeAvgLabel` | `AI와 복비 엔진의 추천 이유`(2026-10-27) + `매물이 평균보다 천천히 팔려요` · 숫자 칸 3개 · 20~50% 범위 막대 | 흰 카드, 파랑은 막대에만. "AI 분석"은 펼침 안 헤드라인 위 출처 배지. 자세히·접기 버튼 둘 다 연한 파랑, 아이콘 없음 |
| **실거래 · 호가 카드** (2026-10-27 A안) | `chartCard.cardTitle` · `tradeRangeLabel` · `askingLabel` · `askingPending` · `floorTabAll` · `emptyBand` · `contractsCount` | `{tradeType} 실거래 · 호가` · `최근 12개월 실거래` · `지금 나온 매물 호가` · `준비 중이에요`(평형·층별 호가 수집 전, 가짜 숫자 금지) · 층 탭 `전체`+저·중·고 · `이 층 구간은 최근 2년 거래가 없어요` · `최근 {n}건` | 층 탭이 그래프·계약 3건을 함께 바꿈. 호가 수집 요청서 [asking-price-request.md](handover/asking-price-request.md) |
| **실거래 차트** | `chartCard.rangeLabel` · `chartConditionChip` · `chartLegendPrice·chartLegendVolume` · `chartTooltipTrade·chartTooltipVolume` · `tableHeaderTitle` | `최근 12개월 거래 범위` · `41평 · 전용 105㎡ · 매매 · 최근 2년` · `● 매월 마지막 거래가격 ▮ 거래량(건)` · `{date} 계약 · {floor}층` · `{month}월 거래 총 {count}건` · `국토부 실거래 계약` | 선 = 이 평형 전 층, 달마다 마지막 실거래 1건 (중간값 안 씀, 2026-10-27) |
| **보너스 합계·상한** | `customizer.bonusSumLine` · `bonusCapSliderNotice` · `bonusCapSliderNoticeNone` · `savingsZeroText` | `612만 원 + 보너스 70만 원 = 682만 원` · 빨간 점 안내 `법정 상한(…)을 넘을 수 없어 보너스는 …까지만 반영돼요` · `법정 상한 그대로 제안` | 요청 창 복비 정하기. 막대에 보너스를 연한 파랑으로 이어 그리고 ▼는 합계 자리. 하한·상한 안내는 색 점 한 줄 (`matchNudgeButton`은 2026-10-27 삭제, 카드 버튼으로) |
| **단지 카드 정보** | (데이터) `src/data/market/dasan-complex-info.json` ← `npm run data:info` | `다산동 · 967세대 · 2021년 입주` · `다산하늘초 도보 9분 · 주차 세대당 1.45대` | 시장 데이터셋과 별도 추출. 네이버 사진은 저작권 문제로 미사용 |
| **끝장 투표** (예전 주민 투표) | `analysis.debates.cardTitleSuffix`(`끝장 투표`) · `templates.{RECORD,LEADER,SUPPLY,JEONSE,UPGRADE}` · `votedNotice` · `blindResultNotice` | 단지 실데이터로 생성(`src/lib/market/debateTopics.ts`), 결과 표시 없음(가짜 표수 금지). 실데이터 비교 막대 `compareTitle`(`데이터로 보면`) + 결과 자리 한 줄 `blindResultNotice` (`DebateVisuals.tsx` `VoteFoot`, 게이지 삭제 2026-10-27) | 금지: 가격 담합 유도 · 단지·주민 비하 · 데이터에 없는 숫자. 선택 칸은 무채색 + 고르면 파란 테두리, `voteHint`(`눌러서 투표`). 대장 배틀은 `다산 {band} 대장은?`(30평대/20평대), 칸·막대는 `{aBtn}`·`{bBtn}` = 짧은 이름(`src/data/complexShortNames.ts`) |
| **매칭 타입 선택** | `matchingModal.step1.typeLabel·typeHint·typeUnknown·typeUnknownSummary·summaryType` | `타입 선택` · `잘 모르겠어요` | 모달 Step 1, 같은 평형에 네이버 타입 2개 이상일 때만 |
| **세입자 낀 매매** | `matchingModal.step2.leasedSale.*` / `step5.previewLeaseLabel·previewBuyerCashLabel·leasedSaleBadge` | `세입자 낀 매매 정보` · 임대 형태·보증금·만료일·갱신요구권 · 배지 `투자 매물 가능` · 매수 필요 금액(희망가 − 보증금) | 매매 + 세입자 거주일 때만. 계산 `src/lib/market/leasedSale.ts`. 매수 필요 금액은 중개사 화면(Step 5 미리보기·피드)에만, 이용자 입력·접수증에는 표시 안 함. "갭투자" 표현 금지 |
| **근저당(융자)** | `matchingModal.step2.mortgage.*` / `step5.previewMortgageLabel` | `근저당(융자) 설정` 없음/있음 · `채권최고액 (등기부등본 을구, 선택)` · 입력칸 안내 `모르면 비워 두셔도 돼요` · `잔금 때 처리 계획` (매매 `잔금일에 상환·말소`/`매수인 승계 협의`, 전세 `…`/`유지`) | 매매·전세 공통 필수. 라벨·요약 `src/lib/market/mortgage.ts` |
| **매칭 완료 부제** | `matchingModal.step6.subTitle` | `48시간 동안 중개사 요청을 받아요` | 모달 완료 화면 ("집주인님" 호칭 금지, RULES) |
| **슬라이더 라벨** | `analysis.customizer.sliderZeroLabel` / `.sliderFloorLabel` | `0원` / `최소 30% ({amount}) 아래는 제안할 수 없어요` | 트랙 0원~상한 |
| **추천 근거 카드** | `analysis.recommendationReason.*` | 헤드라인 위 출처 배지 `AI 분석`(템플릿이어도 같은 표기) · 부제 데이터 규모 · 시장 위치(`metricScope` = `{band} 평형({range}) 기준`, 6개월) · AI 요약 · 계산 흐름 v4: `stepRange`(`할인 범위 (다산동 전체)` 20%~50%, 2026-10-27 이름 변경) · `stepSpeed`(`다산동 평균의 {ratio}배`, 아래 `{band} 평형({range}) 다산동 {total}곳 중 {position}위`) · `stepResult`(`선택한 평형 추천 할인 구간`) + `stepResultRange`(`{min}~{max}%` = 20%~추천값, 분석 카드 초록 구간과 같음) · `stepNotes`(단지별 한 줄: FASTER/SLOWER `…평균 단지(30%)보다 {diff}%p 높아요/낮아요.` · EQUAL · MAX `…50%에서 멈췄어요.` · MIN `…20%를 추천해요.`, 데이터 부족은 `customizer.defaultReasonText.NO_DATA`) | 복비 카드 바로 아래 |
| **중개사가 받는 금액 카드** | `analysis.brokerPayout.*` | `중개사가 받는 금액` · `다산동 거래 1건 법정 상한 보수 중위 {ref}의 {pct}%` | 중개사 플로우(Phase 5) 전용, 집주인 화면 미사용 |
| **30% 하한선 하드락 고지**| `analysis.customizer.minFloorWarning` | `⛔ 최소 유지 하한선(법정보수의 30%)에 도달했습니다` | 30% 절대 하한선 도달 시 노출 안내 |
| **스텝퍼 조절 라벨** | `analysis.customizer.quickStepperLabel` | `금액 미세 조절` | 4단 스텝퍼 버튼 상단 라벨 |
| **AI 추천가 맞춤 버튼**| `analysis.customizer.aiResetButtonLabel` | `🪄 AI 추천가로 맞춤` | 한 번에 추천가로 되돌리는 알약 버튼 |
| **더 빠른 매칭 옵션** | `analysis.customizer.fasterMatchingTitle` | `더 빠른 매칭 옵션 (선택)` | 당근 보너스 접이식 메뉴 타이틀 |
| **집주인 직접 협의조건**| `analysis.customizer.customConditionLabel` | `집주인 희망 협의조건 직접 입력` | 3번째 보너스 텍스트 입력창 라벨 |
| **특별 보너스 1** | `analysis.bonuses[0].title` | `도배·장판 임차인 부담 협의 성사` (+20만 원) | 인센티브 체크리스트 1번 |
| **특별 보너스 2** | `analysis.bonuses[1].title` | `30일 이내 급매·잔금 계약 성사` (+30만 원) | 인센티브 체크리스트 2번 |
| **특별 보너스 3 (직접입력)**| `analysis.bonuses[2].title` | `집주인 특별 협의조건 및 보너스 (직접 입력)` (+20만 원) | 인센티브 체크리스트 3번 |
| **5대 끝장 투표 타이틀**| `analysis.debates.cardTitleSuffix` | `주민 끝장 투표` | 아파트명 뒤에 붙는 투표 헤더 |
| **블라인드 투표 고지** | `analysis.debates.blindResultNotice` | `🔒 투표 시 결과 공개` | 투표 전 퍼센트 가림 안내 |
| **전체 투표방 이동 버튼**| `analysis.debates.openModalButtonText` | `💬 전체 끝장 투표 ({count}개 주제) 모두 참여하기` | 풀 바텀시트 모달 여는 버튼 |
| **기준가 출처 / 법정 상한** | `analysis.customizer.dealPriceBasis.{FLOOR,OTHER_FLOOR,COMPLEX_M2,DONG_M2}` / `.legalMaxPrefix` | `{band} 가장 최근 거래 · {floor}층 · {date} 계약` / `법정 상한` | 복비 카드 기준가 아래 |
| **매칭 유도 넛지** | `analysis.customizer.matchNudgeText` / `.matchNudgeButton` | `내 집 층·희망가 기준 확정 복비는 매칭 요청 때 계산돼요` / `매칭 요청하고 확정하기` | 복비 카드, 매칭 모달 열기 |
| **층 구간 정의·세그먼트** | `analysis.floorSelector.bands` / `.subTitle` / `.badge` / `.chipCount` / `.chipNoTrade` / `.bandLine` / `.bandLineOther` | 저층 1~3층 · 중층 4~14층 · 고층 15층 이상 / `· 12개월 실거래` / `국토부 실거래 기준` / `{count}건` / `거래 없음` / `가장 최근 {date} · {floor}층 · {price}` / `다른 층 가장 최근 …` | 층 세그먼트(칸 안 = 구간·가장 최근 가격·12개월 건수, 0건이면 가격 없이 "거래 없음") + 아래 한 줄 (2026-10-27 A안, 범위 줄 삭제) |
| **차트 기준 실거래 라벨** | `analysis.chartCard.referenceLabel` | `최근 실거래` | 차트 카드 상단 |
| **보장 배지** | `analysis.customizer.guaranteeBadge` | `이 금액 그대로 계약 보장` | 제안 복비 금액 바로 아래 |
| **부가세 안내** | `analysis.customizer.vatTitle` / `.vatGeneralLabel` / `.vatSimplifiedLabel` | `부가세 별도 (중개사무소 과세 유형에 따라)` / `일반과세 사무소 10%` / `간이과세 사무소 4%` (+금액 행) | 제안 복비 아래 |
| **맞춤 진단 배너** | `analysis.precisionBanner.title` / `.desc` / `.buttonText` | `지금 결과는 최근 실거래 기준이에요` / `내 집 확인` | 복비 시뮬레이터 아래, 매칭 모달 열기 |
| **매칭 알약 (홈 검색 카드 맨 아래)** | `home.matchTicker.pill` | `{complex} {pyeong} {trade} · {amount} 절약` | 2026-10-29 띠 → 알약. 2.8초마다 바뀌고 입력 중·동작 줄이기면 멈춤 |
| **하단 고정 안심 엠블럼** | `analysis.stickyBar.securityGuarantee` | `매칭 전까지 동·호수·전화번호 비공개` | 하단 CTA 버튼 바로 윗단 상시 고정 배지 |
| **하단 바 법정 상한 대비** | `analysis.stickyBar.legalMaxLabel` / `.legalMaxSameText` | `법정 상한` (+취소선 금액) / `그대로 제안` | 하단 바 왼쪽 첫 줄 (B안) |
| **CTA 버튼 (하단 고정 바 = 복비 카드 버튼)** | `analysis.stickyBar.ctaWithSavingsText` / `.ctaDefaultText` | `약 {amount} 아끼고 무료 매칭` / `무료로 매칭 요청하기` | 두 버튼 같은 문구 (2026-10-27). "최소" 금지(희망가·복비 바꾸면 줄 수 있음), "무료"는 집주인 이용료 0원이라 사실 |

---

## 3. 📝 토스식 6단계 매칭 바텀시트 모달 (`MatchingBottomSheetModal`)

| 위치 / 단계 | siteContent.ts 매핑 키 경로 | 기본 텍스트 (Default Text) | 설명 / 노출 위치 |
| :--- | :--- | :--- | :--- |
| **모달 상단 헤더** | `matchingModal.headerTitle` | `매칭 요청` | 바텀시트 상단 타이틀 ("선착순" 삭제 2026-10-25) |
| **요청 창 진행 표시** (2026-10-27) | `matchingModal.stepperLabels` · `stepperAria` | `평형 · 희망가 · 복비 · 동·호수 · 인증 · 확인` · `{total}단계 중 {n}단계` | 헤더 아래 동그라미 6개 (예전 얇은 막대·"3/6" 칩 대신). 순서는 `modalStep.ts`와 같아야 함 (테스트) |
| **Step 1 안내** | `matchingModal.step1.summaryNotice` | `복비는 3단계에서 조절할 수 있어요` | 1단계 요약 아래 (요약의 "집주인 제안 복비" 줄은 2026-10-27 삭제) |
| **Step 2 희망가 ↔ 실거래** | `matchingModal.step2.priceVsTrade.*` | `최근 실거래(고층, 26.08.15)보다 1,000만 원 높아요` / `낮아요` / `와 같아요` | 희망가 숫자 아래, 판단 없이 사실만 (`src/lib/market/priceCompare.ts`) |
| **Step 4 동의 묶음** | `matchingModal.step4.consents.*` | `전체 동의` + `[필수] 서비스 이용약관` `[필수] 개인정보 수집·이용` `[필수] 매칭 확정 시 중개사에게 제공`, 각 `›` 시트(목적·항목·보유 기간·거부할 권리, 전문 보기) | `ConsentGroup`. 인증번호 발송 전에 필수 3개. 동의 기록은 요청서에 `consents`·`consentedAt` |
| **Step 6 취소 안내** | `matchingModal.step6.cancelNote` | `매칭 전까지 내 의뢰에서 언제든 취소할 수 있어요` | 완료 화면 진행 3줄 아래 |
| **Step 1 타이틀** | `matchingModal.step1.title` | `거래 유형과 평형을 확인해 주세요` | 1단계 안내 제목 |
| **Step 2 타이틀** | `matchingModal.step2.title` | `희망 거래 금액과 입주 가능일을 입력해 주세요` | 2단계 안내 제목 |
| **Step 3 타이틀** | `matchingModal.step3.title` | `정확한 동·호수를 입력해 주세요` | 3단계 안내 제목 |
| **Step 3 부제** | `matchingModal.step3.subTitle` | `허위 매물 없는 매칭을 위해 확인해요` | 동·호수를 받는 실제 이유 (복비 계산과 무관) |
| **Step 3 블라인드 미리보기** | `matchingModal.step3.livePreviewLabel·livePreviewNote` | `🔒 중개사에게는 이렇게 보여요` / `매칭이 확정되면 공개돼요` + `520*동 ***호` | 3단계 유일한 블라인드 안내 (안심 카드 삭제, "100%·절대" 금지) |
| **Step 3 다시 요청 채우기 실패** | `matchingModal.step3.refillFailed` | `개인정보는 이 휴대폰에 남기지 않아요. 동·호수를 다시 입력해 주세요.` | Supabase 모드 다시 요청에서 서버 열람으로 동·호수를 못 채웠을 때만 (local에선 안 보임) |
| **Step 3 실존 확인 통과** | `matchingModal.step3.unitCheck.OK` | `✓ 실제 있는 호수예요` | 통과는 체크 한 줄, 오류만 빨간 박스 |
| **Step 4 타이틀** | `matchingModal.step4.title` | `소유주 성함과 통신사를 선택해 주세요` | 4단계 네이버 확인매물 연동 안내 |
| **Step 5 타이틀** | `matchingModal.step5.title` | `중개사에게 이렇게 보여요` | 5단계 미리보기 (부제·배지·카드 아래 블라인드 문구 삭제) |
| **Step 5 가려진 값 태그** | `matchingModal.step5.previewUnlockTag` | `🔒 매칭 후 공개` | 동·호수 줄과 연락처 줄 아래에만 |
| **Step 5 소유주 서약 1** | `matchingModal.step5.soleOwnerCardTitle` | `[필수] 본인은 해당 부동산의 100% 단독 소유주이거나...` | 단독/공동 소유 확인 체크박스 |
| **Step 5 법적 책임 서약 2** | `matchingModal.step5.legalPledgeCardTitle` | `[필수] 타인 명의 도용 등 허위 매물 등록 시 발생하는...` | 허위매물 형사 책임 동의 체크박스 |
| **Step 5 최종 제출 버튼** | `matchingModal.step5.submitButtonText` | `안심 매칭 의뢰 등록 완료 ✓` | 최종 등록 파란색 CTA 버튼 |
| **Step 5 제출 실패** | `matchingModal.step5.submitError` | `요청을 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.` | Supabase 모드에서 서버 의뢰 생성 실패 시 버튼 아래 한 줄 (완료 화면으로 안 넘어감) |
| **완료 영수증** (2026-10-27) | `matchingModal.step6.receipt.*` | `접수번호 {no}` · `희망 {tradeType}가` · `법정 상한 ({rate})` · `할인 ({pct}%)` · `더 빠른 매칭 옵션`/`없음` · 점선 · `내가 제안한 복비` · `부가세 별도` | 줄 값은 `lib/requests/feeReceipt.ts` (견적 결과를 나눌 뿐, 새 계산 없음). 접수번호 = 실제 저장된 번호 |
| **Step 6 완료 (A안)** | `matchingModal.step6.title·subTitle·timelineTitle·timelineSteps` | `매칭 요청을 보냈어요` / `48시간 동안 중개사 요청을 받아요` / 진행 3줄(문자 알림 → 최대 3곳 선택 → 고른 곳에만 동·호수 공개) | 요청서 전체·도배 방지 룰·48시간 카드·안내 4줄 삭제. 상세·수정·취소는 내 의뢰 화면 몫. 취소 안내는 기능 생긴 뒤 추가 |

---

## 4. 📋 집주인 내 의뢰 화면 (`/my-requests`) — 2026-10-24 틀, 10-25 2차 디테일

한 화면 + 상태 3단계 + 종료. 데이터 모델 `src/lib/requests/types.ts`, 계산 `src/lib/requests/{stage,showing,naverListing,officeYear}.ts`.

| 위치 / 컴포넌트 | siteContent.ts 매핑 키 경로 | 기본 텍스트 (Default Text) | 설명 / 노출 위치 |
| :--- | :--- | :--- | :--- |
| **헤더** | `myRequests.headerTitle` | `내 의뢰` | `MyRequestsHeader` |
| **위쪽 큰 제목 + 진행 막대** | `myRequests.hero.*` | `중개사 3곳이 요청했어요` · `41시간 남음` / `중개사 2곳과 진행 중이에요` · `광고 1곳 진행중 · 방문 예약 1건` / `잠시 멈췄어요` / `계약을 마쳤어요` / 종료 5종 + 진행 막대 `3/5 광고·방문` | `RequestHero`. 만료 문구는 요청 0곳(`복비를 조금 올리면…`)·있음(`다시 요청하면…`)으로 나눔 |
| **나의 매칭 요청 (접기/펴기)** | `myRequests.summary.*` | `나의 매칭 요청` · 단지 / `34평 · 전용 84㎡ · 매매 · 10*동 ***호 · 중층` · 펼치면 희망가·제안 복비·절약 | `RequestSummaryCard`. 요청 받는 중엔 펼침, 그 뒤엔 접힘 |
| **거래 페이지 후기 쓰기** | `myRequests.contracted.*` | 별 5개 → `이 중개사가 잘한다고 한 것, 맞았나요?`(`claimedTitle`) + `맞았던 것만 눌러 주세요`(`claimedSub`) → `다른 좋았던 점 더 고르기`(`moreOpen`/`moreClose`, 나머지 `reviewChipGroups`) → `후기 남기기` | `ReviewForm`, 칩 나누기 `stage.reviewChipSplit` (2026-10-29 ①안, 접힌 높이 약 1,090 → 343px) |
| **① 익명 요청 카드** | `myRequests.receiving.*` | 번호 `1` + 가려진 이름 `▓▓ 공인중개사` + `🔒 매칭 후 공개` · 파랑 배지(`개설 3~10년` `중개사 2명 이상` `단지에서 1km 안`(`receiving.distanceBand` 4구간, 2026-10-29) `복비 첫 거래` `약속 레벨 n · n건`(공용 `PromiseLevel`, 글자 `brokerAgent.office.level` + `receiving.promise`, 0건은 칩 없음) `후기 ★4.8 (9) ›`) · 회색 강점 칩 최대 3 · 맨 아래 `집주인이 인정한 장점 n개 펼치기`(`endorsedTitle`·`endorsedExpand`·`endorsedCollapse`, 후기 칩 많이 고른 순 5개 + 개수, 위 강점의 짝 제외) (2026-10-29) | `AnonOfferCard`. 개설 연도·인원은 구간만 (오래된 사무소는 다산동에 1~3곳뿐이라 연도로 식별 가능) |
| **후기 요약 시트** | `myRequests.reviewSheet.*` | `후기 9건` · `평균 ★4.8` · 칩별 개수 막대 | `ReviewSheet`. 글 없음 |
| **① 확정 시트** | `myRequests.confirmSheet.*` | `확정 후 7일 동안은 취소할 수 없어요` · 마지막 줄 `feeLine` `복비는 법정 상한에서 {pct}% 할인으로 합의돼요 (희망가 기준 {fee})` (할인율은 `dealFee.discountPct`) | 약관 조항 필요 (PREDEPLOY) |
| **매칭 모달 5단계 내 집 예시** | `dealPrice.rule.personal.*` | `다른 금액에 팔려도 할인율 {pct}%는 그대로예요` · 칩(`askingChip` + 금액) 4개 이하 · 세 줄 `line1`·`line2`/`line2Asking`(매매·전세)·`line3`(`상한 {max}에서 같은 할인율로 = {fee}`) · 요율 경계 안내 `shiftDown`/`shiftUp` (희망가 ±15% 안일 때만) (2026-10-28) | 줄은 `dealFee.personalFeeScenarios`. 중개사 가입 약속 시트는 `rule.headline`·`chips`(4개, `FEE_RULE_EXAMPLES` 순서)·`agreedLine`·`actualLine`·`resultLine`·`rateLine`·`note` (2026-10-28) |
| **다시 요청 요약 시트 (A안)** | `myRequests.feeSheet.*` / `matchingModal.resumeNextButton` | `복비` ±10만·±1만 · `요청서` 희망가·점유·입주·근저당·옵션 각 `수정` · `이대로 다시 요청` / `취소하고 이대로 다시 요청` · `동·호수나 소유주가 바뀌었나요? 처음부터 새로 요청 ›` | `FeeSheet`. `수정` → `/analysis/{단지}?resume=1`, 매칭 모달이 그 단계부터 값이 채워진 채 열리고 다음 버튼은 `수정 완료 · 확인하기`(5단계로 바로). 본인 인증 재사용, 서약은 다시. 계산 `src/lib/requests/requestDraft.ts` |
| **② 매칭된 중개사** | `myRequests.inProgress.ad*·release*·detail` | `광고중 · 7일째` `내 아파트 광고 보기` / `광고 준비중 · 32시간 남음` + `기한 안에 안 올리면 매칭을 해제할 수 있어요` / `광고가 올라오지 않았어요` `[매칭 해제]` / `광고 멈춤` | `MatchedBrokerCard`. 사무소 이름을 누르면 상세 시트 |
| **② 사무소 상세 시트** | `myRequests.inProgress.officeSheet.*` | `{대표} 대표 · 개설 3~10년 · 중개사 2명 이상` · 지도 · 주소 · `전화하기` `문자 보내기` | `OfficeSheet`. 지도는 `/api/office-map`(VWorld 정적 지도, 키 숨김, 다산동 좌표만). 카카오톡 없음 |
| **② 방문 가능 시간** | `myRequests.inProgress.showing*·visits*·weekly*·blocked*` | `방문 가능 시간` → `방문 예약` → `매주 방문 시간` `평일 저녁 · 주말 오전·오후` `바꾸기`(최소 1칸) → `안 되는 날` 시작~끝(최대 7일) `기간 추가` | `ShowingScheduleCard`. 전체 끄기 스위치 없음 (언제 볼 수 있는지 항상 남게) |
| **② 판매 상태 + 계약했어요** | `myRequests.inProgress.sale*·contract*·brokerReported*` | `● 판매 중` 스위치(7일 전 잠김 `10월 31일 (토)부터 바꿀 수 있어요`) → 시트 `잠시 멈추기`/`매물 거둬들이기` + 이유 칩 · `계약했어요` → `어디서 계약하셨나요?` | `SaleStatusCard`. 중개사가 먼저 알리면 `○○가 계약을 알렸어요. 맞나요?` |
| **③ 계약** | `myRequests.contracted.*` | `○○가 계약일·잔금일을 알려 줄 거예요 · 48시간 남음` → 지나면 직접 입력 · `합의한 복비 {fee} 그대로 계약하셨나요?` · 잔금 다음 날 별점 + 칩 | `ContractCard`. 복비 금액은 질문에만 |
| **종료 + 지난 의뢰** | `myRequests.ended.*` | `복비 조절하고 다시 요청` / `같은 집 다시 요청` · `지난 의뢰` (결과 배지) | `PastRequestsList` |
| **빈 화면** | `myRequests.empty.*` | `아직 의뢰가 없어요` · `우리 아파트 복비를 데이터로 정해 보세요` · `아파트 찾기` | 한 번도 요청하지 않은 사람만 |
| **테스트 스위처** | `myRequests.qa.*` | 상태별 16가지 | 배포 전 제거 |

---

## 5. 🤝 공인중개사 가입 화면 (`/agent/register`, `BrokerSignupFlow`)

2026-10-25 서류 3종 업로드 → 명단 대조 + 확인 코드 전화로 교체 (`brokerRegister` 삭제)

| 위치 / 컴포넌트 | siteContent.ts 매핑 키 경로 | 기본 텍스트 (Default Text) | 설명 / 노출 위치 |
| :--- | :--- | :--- | :--- |
| **단계 이름** | `brokerSignup.steps` | `사무소·본인 확인` · `잘하는 점` · `약속` · `신청 완료` | 상단 진행 막대 3칸 (2026-10-28) |
| **사무소 확인** | `brokerSignup.office.*`, `brokerSignup.auditNotice` | `사무소 정보를 알려 주세요` · `이 사무소가 맞나요?` · `복비 운영팀에서 전화와 실사가 나갈 수 있어요` | 등록번호·대표자·상호 3칸, 오류 7종, 맞으면 상호·주소·지도 + 네/아니에요, 확인 전화 미리 안내 + 운영팀 안내 |
| **휴대폰 인증** | `brokerSignup.phone.*`, `brokerSignup.consents` | `휴대폰으로 인증해 주세요` | 1단계에서 `네, 맞아요` 뒤 같은 화면 아래. 동의 묶음(약관·수집·매칭 시 집주인 제공) 후 인증번호 |
| **강점 칩** | `brokerSignup.strengths.*`, `brokerStrengths.groups` | `사무소 강점을 골라 주세요` | 최대 3개 |
| **약속** | `brokerSignup.promise.*` | `복비 파트너 약속` · `거래금액이 바뀌면? 예시 보기`(`feeExamplesLink`, 시트 제목 `feeExamplesTitle`) | 4개 모두 체크해야 신청, 명의 경고는 회색 |
| **신청 완료** | `brokerSignup.done.*` | `신청을 받았어요` · `확인 코드` | 모든 신청자에게 같은 안내: 48시간 안에 `브이월드 등 공개된 사무소 번호`로 확인 전화(사무소 확인 카드 `office.callPreview`도 같은 표현, 네이버 표기 없음 2026-10-29), 승인되면 바로 이용 + 운영팀 전화·실사 안내(`auditNotice`). 승인·반려 상태 문구 포함 |
| **관리자 가입 확인** | `adminBrokers.*` | `중개사 가입 확인` | `/admin/brokers` (개발용, 배포 빌드 404). 확인 전화 번호·경과 시간·코드 입력·개설 연도·반려 사유 |

## 5-1. 🔐 내 정보 관리 (`/my-info`, 2026-10-29)

| 위치 | 키 | 문구 | 메모 |
|---|---|---|---|
| **링크** | `myInfo.link` | `내 정보 관리` | 홈 맨 아래 약관 줄 · 내 의뢰 맨 아래 · 중개사 내 사무소 맨 아래 |
| **본인 확인** | `myInfo.verifyTitle`·`verifySub` (+ `login.*` 입력칸 문구) | `본인 확인부터 할게요` | 휴대폰 인증, 다른 번호면 `noData` |
| **내 정보** | `myInfo.rows.*`·`signupStatus` | 이름 · 휴대폰(가운데 가림) · 동·호수 · 동의 n개·날짜 · 진행 중 의뢰 / 중개사는 사무소·가입 상태 | 목업: 이 휴대폰에 남은 정보만 |
| **정정·삭제 문의** | `myInfo.inquiryTitle`·`inquirySub`·`inquiryButton` | `정보를 바꾸거나 지우고 싶어요` · `문의하기` | 카카오 채널(`COMPANY_INFO.kakaoChannelUrl`, 배포 직전) 없으면 보호책임자 메일 |
| **탈퇴** | `myInfo.withdraw*`·`blocked*` | `탈퇴하기` → `탈퇴할까요?` / 진행 중 의뢰면 `의뢰를 먼저 취소해야 탈퇴할 수 있어요` | 요청만 저장(지우지 않음), 10일 안 처리·계약 기록 5년 |
