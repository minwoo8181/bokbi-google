# 디자인 실험실 진행 상황 (design-lab)

> 대화를 압축하거나 새 세션으로 넘어가면 이 파일부터 읽는다. 규칙은 CLAUDE.md 맨 위 "실험용 복사본 규칙", 킵은 [KEEPS.md](KEEPS.md).

## 지금 상태 (2026-10-30, 최종 커밋 `99e7e10`, push 막힘)
- 서버: `bokbi-lab` 3006번 (`.claude/launch.json`). 테마는 브라우저 저장값 `bokbi_lab_theme` — 새 세션에 비면 토스로 열리니 왼쪽 아래 버튼으로 "삼쩜삼 레퍼런스" 선택
- 테마: `toss`(원본, 기본값) · `samjeom`(삼쩜삼 레퍼런스, 화면 구성까지 바뀜). 당근·현대는 대표님 지시로 지움
- 레퍼런스 화면 부품: `src/components/lab/samjeom/`, 킵 부품: `src/components/lab/keeps/` (K1 머리 띠·근거 목록, K2 평균 vs 이 단지 막대, K3 진행 단계 막대), 문구: `src/config/labContent.ts`
- 테마 분기: `useLabTheme()` / `LabThemeView`, 삼쩜삼 전용 CSS는 `globals.css` `[data-theme="samjeom"]`, Tailwind `samjeom:` 표기

## 삼쩜삼으로 구성까지 바꾼 화면
| 화면 | 상태 | 핵심 |
|---|---|---|
| 홈 | 완료 | 구획 제목 → 흰 카드, K3 진행 막대, 예시 단지 두 막대 카드, 탭 바. 알림 줄·단지 목록은 대표님이 뺌 |
| 분석 | 완료 | K1 머리 띠(조건 칩 → "내 집 조건" 시트) → K2 → 추천 할인 계산 → 실거래 → 투표, 바닥 바 주 버튼 하나(금액은 머리 띠가 안 보일 때만) |
| 매칭 요청 창 | 완료 (`99e7e10`) | 전체 화면 신고 흐름 `SamjeomFlowShell`, 진행 막대, 질문 26px, 이전·다음 바닥 고정 |

## 삼쩜삼 심화 `samjeom2` (2026-10-30, 대표님 "3.3이 더 맞다, 더 심화 — 매칭 요청·중개사 가입이 중요")
- 다시 본 삼쩜삼 핵심: 결과 리포트가 **내 질문 말풍선 → 답 카드**를 쌓아 의문을 차례로 풀고 맨 끝에 "다음" (종합소득세 결과 36번), 온보딩은 **휴대폰 틀 속 결과 미리 보기**, 홈은 개인사업자용 **별도 구획**
- 복비 정의(PRD 1.1) = 집주인·중개사 **사전 합의** 플랫폼. 집주인 의문 = ①중개사가 그 금액에 해 주나 ②동·호수 새나 ③누가 오나 / 중개사 = 의뢰가 진짜인가·복비 흥정 없나·주변이 아나
- 홈(논증 순서 = 화면 순서, taste copy §1): 주장 두 줄 + 무엇인지 한 문장 + 검색 + K3 → 이런 리포트를 받아요(실제 예시) → 집주인이 먼저 묻는 것 3개 → 같은 행동 버튼 → 중개사 구획(검정 버튼 = 다른 사람용). 중개사 입구는 머리줄 오른쪽 + 구획 두 곳
- 분석: K1 → 말풍선 5개(왜 이 금액 K2 · 할인율 · 실거래 · 중개사가 받아 줄까 · 내 정보) → 요약 카드(파랑 칸 + 매칭 요청) → 투표 → 중개사 링크. 바닥 바는 요약 카드가 보이면 내려감(같은 버튼 두 개 금지)
- 시선: 말풍선이 왼쪽 세로 축(F 패턴), 답 카드는 굵은 결론 첫 줄 → 오른쪽 값 칸, 화면마다 가장 큰 것 하나(홈 26px 주장, 분석 40px 금액)
- 부품 `src/components/lab/samjeom2/`, 삼쩜삼 CSS·`samjeom:` 표기는 두 테마 공용, K1+조건 칩은 `samjeom/SamjeomReportHero.tsx` 공용. 분석 테마 고르기는 `components/lab/LabAnalysisBody.tsx`
- e2e: `npx playwright test --config playwright.samjeom2.config.ts`

## 헤이딜러 레퍼런스 (2026-10-30, 대표님 "홈·분석 먼저")
- 테마 `heydealer` (파랑 #3366F5 = 캡처 #3B6DFF를 흰 글씨 4.5:1로 한 단계 진하게, 먹색 #101219). 부품 `src/components/lab/heydealer/`, 문구 `LAB_CONTENT.heydealer`
- 홈: 먹색 머리줄(글자 탭 "집 내놓을 때 | 중개사라면" + 메뉴 판) → 둥근 판 위 큰 질문 + 번호판 명패 검색 → 전광판(사실 숫자) → 단지별 복비 예시(펼침 견적 카드) → 진행 순서(점선 타임라인). 탭 바 없음
- 분석: 번호판 배지(단지 이름) → 제원 목록(거래·평형·층 옆 파란 "수정" → 내 집 조건 시트, 처음 한 번 검은 말풍선) → 적정 복비 40px + 할인율 곡선(핀, commissionFromDiscount 그대로) → 근거 구획 → 바닥 바(안심 글 + 버튼, 금액이 화면 밖이면 버튼 위 검은 꼬리표)
- 매칭 요청 창 이후 화면은 아직 원래 화면 (헤이딜러는 다음 단계에서)
- e2e: `npx playwright test --config playwright.heydealer.config.ts`
- 내 집 조건 시트는 두 테마 공용 `src/components/lab/LabConditionSheet.tsx`

## 남은 순서 (한 단계씩 끝내고 대표님 확인)
2. **내 의뢰 + 거래 페이지** (집주인 쪽) ← 다음. 공통 부품(머리줄·카드·시트·버튼)도 여기서 같이 정리
3. 중개사 화면 (새 의뢰 · 내 매물 · 내 사무소 · 복비 특약)
4. 중개사 가입 · 내 정보 · 로그인
5. 관리자

## 매 단계 검증 (빠뜨리지 않기)
- `npm run typecheck` · `npx vitest run` · `npx playwright test` · **`npx playwright test --config playwright.samjeom.config.ts`** · **`--config playwright.heydealer.config.ts`** (같은 e2e를 테마별로)
- 360·390px 가로 넘침, 터치 44px, 12px 미만 글자 0, 같은 숫자 한 화면 한 번
- 디자인 스킬 기준으로 점검: taste-skill `references/app-screens.md`, ui-ux-pro-max `references/pro-rules.md`, web-design-guidelines(최신본 WebFetch), impeccable `reference/critique.md`(수동 호출 전용이라 문서로)
- 커밋 메시지는 PowerShell에서 따옴표가 깨지니 임시 파일 + `git commit -F`

## 대표님 결정·선호
- 색만 바꾸는 것 말고 **구성까지** 새로 (2026-10-30)
- 킵은 대표님이 짚은 조각만 (캡처에 주석)
- 디자인 스킬을 실제로 쓰고, 어떤 기준으로 고쳤는지 보고
