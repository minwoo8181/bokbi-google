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

## 남은 순서 (한 단계씩 끝내고 대표님 확인)
2. **내 의뢰 + 거래 페이지** (집주인 쪽) ← 다음. 공통 부품(머리줄·카드·시트·버튼)도 여기서 같이 정리
3. 중개사 화면 (새 의뢰 · 내 매물 · 내 사무소 · 복비 특약)
4. 중개사 가입 · 내 정보 · 로그인
5. 관리자

## 매 단계 검증 (빠뜨리지 않기)
- `npm run typecheck` · `npx vitest run` · `npx playwright test` · **`npx playwright test --config playwright.samjeom.config.ts`** (같은 e2e를 삼쩜삼 테마로)
- 360·390px 가로 넘침, 터치 44px, 12px 미만 글자 0, 같은 숫자 한 화면 한 번
- 디자인 스킬 기준으로 점검: taste-skill `references/app-screens.md`, ui-ux-pro-max `references/pro-rules.md`, web-design-guidelines(최신본 WebFetch), impeccable `reference/critique.md`(수동 호출 전용이라 문서로)
- 커밋 메시지는 PowerShell에서 따옴표가 깨지니 임시 파일 + `git commit -F`

## 대표님 결정·선호
- 색만 바꾸는 것 말고 **구성까지** 새로 (2026-10-30)
- 킵은 대표님이 짚은 조각만 (캡처에 주석)
- 디자인 스킬을 실제로 쓰고, 어떤 기준으로 고쳤는지 보고
