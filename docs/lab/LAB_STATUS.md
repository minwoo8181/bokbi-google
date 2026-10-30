# 디자인 실험실 진행 상황 (design-lab)

> 새 세션은 이 파일부터. 규칙은 CLAUDE.md 맨 위 "실험용 복사본 규칙". 원본 폴더는 읽기만.

## 지금 (2026-10-30)
- 1차 실험(삼쩜삼·삼쩜삼 심화·헤이딜러, 킵 K1~K7)은 대표님 지시로 전부 초기화 (`ff00a95`, 지운 작업은 `828d720`)
- 2차: **삼쩜삼 레퍼런스로 홈 → 분석 흐름 다시** (대표님: "직관·심플은 좋았는데 분석 이동·섹션 구성, 최상단 단지 정보, 버튼 구성이 아쉬웠다")
- 서버 `bokbi-lab` 3006. 테마 전환: 왼쪽 아래 버튼 (토스 원본 ↔ 삼쩜삼), 저장 키 `bokbi_lab_theme`

## 2차 설계 = 대표님이 짚은 이용자 순서
- 집주인: 홈 검색 → ① 단지 정보 → ② 얼마 → ③ 왜 → ④ "우리 집도 이 금액?" (실거래 한 건 기준 추정이라는 사실 + 실제 거래·매물) → ⑤ 우리 집 기준 계산 = 매칭 요청 창(희망가 → 복비 → 동·호수 → 인증 → 확인) → 요청
- 중개사: 홈 맨 위 "집주인 | 중개사" → 주장 + 등록 → 이런 의뢰가 와요(예시 표시) → 중개사가 먼저 묻는 것 → 등록 4단계 → 등록. 분석 맨 끝 줄·주소 `/#broker`로도 들어옴
- 행동 하나에 이름 하나: 분석의 주 버튼은 ⑤와 바닥 바 모두 "우리 집 복비 계산하기", ⑤가 보이면 바닥 바가 내려감. 홈 집주인 주 행동은 검색, 중개사 주 행동은 등록
- 시선: 말풍선이 왼쪽 세로 축, 답 카드는 굵은 결론 → 오른쪽 값. 화면마다 가장 큰 글자 하나(홈 26px 주장, 분석 40px 금액)

## 파일
- 부품 `src/components/lab/samjeom/` (SamjeomHome · OwnerHome · BrokerHome · Analysis · AnalysisParts · Ui), 문구 `src/config/labContent.ts`
- 원래 파일 수정은 최소: `layout.tsx`(전환 버튼), `themeConfig.ts`(테마 id), `globals.css`(삼쩜삼 블록), `page.tsx`·`AnalysisClient.tsx`(테마 분기). 검색창 모양은 CSS로만 덮음
- e2e: `npx playwright test` (원본) + `npx playwright test --config playwright.samjeom.config.ts`

## 매 단계 검증
- typecheck · vitest · e2e 두 설정 · 360/390 가로 넘침·44px·12px·가장 큰 글자 (측정 스크립트는 scratchpad)
