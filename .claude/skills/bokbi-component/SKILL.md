---
name: bokbi-component
description: 복비 화면(.tsx)·규칙 코드를 고치거나 새로 만들 때 쓰는 작업 규칙. 어느 파일을 열지(컴포넌트 지도), 계산은 lib 순수 함수+테스트, 문구는 siteContent, 화면 파일 400줄 이하, 검증 순서. Use when editing or adding any Bokbi screen, component, hook, or lib rule.
---

# 복비 컴포넌트 작업 규칙

## 1. 열 파일 고르기 (토큰 절약)
- `docs/COMPONENT_MAP.md`에서 화면 → 파일 한 줄을 찾고 **그 파일만** 연다. 큰 파일은 `Grep`으로 위치를 찾고 그 부분만 `Read`.
- `src/config/siteContent.ts`(2,600줄)는 통째로 읽지 않는다. 키 이름으로 `Grep` → 그 블록만.

## 2. 어디에 쓰나
| 무엇 | 어디 | 함께 |
|---|---|---|
| 계산·판정·상태 규칙 (금액, 묶음, 단계, 칸 수) | `src/lib/<영역>/*.ts` 순수 함수 | `__tests__/*.test.ts` (경계값 전수) |
| 화면 문구 | `src/config/siteContent.ts` | 화면에 문자열 직접 쓰지 않음 |
| 법정 중개보수 | `src/lib/commission.ts`만 | 다른 곳에서 요율 계산 금지 |
| 저장소 상태·동작 | 화면별 훅 `use*.ts` (예: `useAgentWorkspace`, `useOwnerRequest`) | |
| 화면 조각 | 탭·섹션·시트별 `.tsx` | props로 값과 콜백만 받음 |
| 테스트 스위처 | `AgentQa.tsx` / `OwnerQa.tsx` | 배포 전 제거 |

## 3. 크기
- 화면 파일 400줄 이하 (`src/__tests__/fileSize.test.ts`). 300줄을 넘기 시작하면 탭·섹션·시트·훅으로 나눈다.
- 정리 대기 파일(테스트의 `LEGACY`)은 늘리지 않는다. 나누면 목록에서 지운다.
- 새 파일을 만들면 `docs/COMPONENT_MAP.md`에 한 줄.

## 4. 디자인
- 시맨틱 토큰만 (`bg-brand`, `bg-surface-card`, `text-text-secondary` …). 헥사 금지, `bg-brand-light/60` 같은 투명도 금지 — 색이 변수라 화면에 안 그려진다(`colorTokens.test.ts`가 막음). 연한 색은 토큰: 배경 `bg-brand-subtle`·`bg-brand-light`, 테두리 `border-brand-line`(펼친 칸·선택 카드)·`border-brand-line-strong`(hover·강조), 그림자 `shadow-brand-glow`, 주의 박스 `border-status-caution-line`.
- 선택된 칩·세그먼트는 `bg-brand text-white`. 터치 타깃 44px 이상(`h-11`). 360/390px 가로 스크롤 금지.
- 모션은 DESIGN.md §6 토큰만 (`active:scale-96 transition-transform duration-fast ease-out-soft` 등).

## 5. 검증 순서 (끝나면 전부)
1. `npm run typecheck`
2. `npx vitest run` (새 규칙은 테스트 먼저)
3. 화면: 미리보기에서 360·390px, 테스트 스위처로 상태 돌려 보기, 콘솔 오류 없음
4. 화면끼리 이어지는 흐름(매칭 모달·피드·요청 보내기·매칭 확정·거래 페이지·블라인드)에 닿는 변경이면 `npm run e2e` (Playwright, 약 15초, 3004 dev 서버 재사용). 시나리오는 `e2e/*.spec.ts`, 공통 단계 `e2e/steps.ts`
5. 빌드(같은 폴더에 dev 서버가 떠 있으면): `$env:NEXT_DIST_DIR='.next-build'; node node_modules/next/dist/bin/next build` → `.next-build` 삭제 → `git checkout -- tsconfig.json next-env.d.ts`
6. 커밋 (push는 대표님 확인 후)
