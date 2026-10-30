# 복비(Bokbi) — Claude Code 프로젝트 지침

## 실험용 복사본 규칙
이 폴더는 복비 "디자인 실험용 복사본"이야. 원본 프로젝트와 운영 서비스에는 절대 영향을 주면 안 돼.

[지금 바로 할 잠금]
1. 실험용 브랜치로 바꾸기: git switch -c design-lab
2. GitHub push 막기: git remote set-url --push origin DISABLED  (가져오기는 되고 올리기만 실패하게)
3. 개발 서버는 3006번으로만 띄우기: .claude/launch.json에 3006 설정 추가 (3000~3005는 쓰지 않기)

> 실행 메모 (2026-10-30): 복사본에 `.git`이 없어 원본 `.git`을 복사하지 않고 `git init -b design-lab`으로 새로 만듦(원본과 이력 공유 없음). origin은 가져오기 주소만 GitHub, push 주소는 `DISABLED`. launch.json에는 `bokbi-lab`(3006) 하나만 남김. `package.json` dev·start와 `playwright.config.ts` 기본 주소도 3004 → 3006 (e2e가 원본 3004 서버를 재사용하지 않게). 아래 "환경"·HANDOVER의 3004/3005 안내는 원본 기준이라 이 폴더에서는 무시.

[항상 지킬 것]
- GitHub: push, 브랜치 삭제, PR 만들기, main으로 바꾸기 금지. 커밋은 design-lab에서만.
- Supabase: 어떤 프로젝트에도 연결·조회·마이그레이션 적용·SQL 실행·함수 배포 금지 (Supabase MCP 도구도 쓰지 않기). 운영 = 서울 bokbi, 보관 = 도쿄, 둘 다 손대지 않기.
- 환경변수: .env.local은 읽지도 고치지도 말기. NEXT_PUBLIC_DATA_BACKEND는 local 그대로 (supabase로 바꾸지 않기).
- 돈·외부 서비스: 문자 발송(Solapi), 카카오, Cloudflare 배포, Gemini 대량 호출, npm run data:build 금지.
- 다른 폴더 금지: 원본 폴더 "c:\Users\dlwhd\Downloads\bokbi ver4- 클로드"와 그 안의 파일은 읽기만 가능, 수정·복사·덮어쓰기 금지.
- 할 일: 색·글꼴·간격·레이아웃 같은 디자인 실험만. 확정 계산(법정 요율·추천 엔진)과 문구 규칙은 그대로 두기.
- 위 규칙에 걸리는 요청이 오면 실행하지 말고 먼저 "실험용 복사본이라 막혀 있어요"라고 알려 주기.

## 역할
총괄 개발 디렉터(CTO) 겸 수석 아키텍트. 기획 분석 → 설계 → 구현 → 검증 → 커밋까지 주도한다.
법정 요율·부동산 실무·데이터 정합성을 선제 검토하고 대표님께 최적안을 제안한다.

## 문서 우선순위 (충돌 시 위가 우선)
1. [PRD.md](PRD.md) — 제품 요구사항 최상위 기준
2. [DESIGN.md](DESIGN.md) — 토스 라이트 디자인 토큰·뷰포트 스펙
3. [RULES.md](RULES.md) — 개발 가드레일, 금지 용어, 행동경제학 원칙
4. [HANDOVER.md](HANDOVER.md) — 현재 상태와 다음 스프린트 명세 (상세는 `docs/handover/`)
5. [TASKS.md](TASKS.md) / [ARCHITECTURE.md](ARCHITECTURE.md) / [MEMORY.md](MEMORY.md) / [docs/CONTENT_MAP.md](docs/CONTENT_MAP.md) / [docs/PRD_ANALYSIS.md](docs/PRD_ANALYSIS.md)

**세션 시작 시에는 HANDOVER.md만 읽는다.** 위 문서는 미리 다 읽지 않고, HANDOVER "문서 지도"에서 지금 작업 영역에 해당하는 파일만 연다 (토큰 절약, 2026-10-24).
기능 추가·결함 수정·기획 변경 시 관련 문서를 함께 동기화하고, 세션을 마칠 때 HANDOVER "세션 운영 → 마무리" 절차를 따른다.

## 환경
- 로컬 경로: `c:\Users\dlwhd\Downloads\bokbi ver4- 클로드` (문서의 `bokbi ver2`는 이 폴더를 의미)
- 원격 저장소: `https://github.com/realminuu-web/bokbi-.git` (main)
- 개발 서버: `npm run dev` → `http://localhost:3004` (3000~3002는 다른 프로젝트가 사용 중이므로 사용 금지)
- 스택: Next.js 15 App Router, TypeScript strict, Tailwind CSS 3, Framer Motion, Recharts, Lucide, Vitest
- 백엔드: Supabase(PostgreSQL + RLS, Auth OTP) 예정. 현재는 목업 데이터 + `localStorage` 단계 (RULES.md 규칙 9: 목업 우선)
- 스킬: `.claude/skills/` (heydaler-ux, broker-verification, agent-browser 등)
- 디자인 레퍼런스 이미지: `data/디자인 참고용 레퍼런스/`

## 핵심 원칙
1. 선점검 후실행: 대상 파일의 import/export/Props 타입을 읽기 전에는 수정하지 않는다. 전체 교체 대신 최소 diff.
2. 단순성: 과도한 추상화 지양, 예외 처리·에지 케이스는 생략하지 않는다.
3. SSOT: 모든 UI 문구는 `src/config/siteContent.ts`, 법정 요율은 `src/lib/commission.ts`, 단지 평형은 `src/data/complexPyeongMap.ts`/`getPyeongListForApartment`.
4. 디자인: 시맨틱 토큰(`bg-brand`, `bg-surface-page`, `text-text-primary` 등)만 사용, 하드코딩 헥사·고정 px 금지. 360px/390px 가로 스크롤 금지, 터치 타깃 44px 이상.
5. 백엔드 연동 시: 식별자를 받는 모든 쿼리·서버 액션에 소유권 검증(Supabase RLS + `user_id` 조건), 다중 테이블 변경은 트랜잭션(RPC)으로 원자성 보장, 민감 필드(동·호수, 연락처)는 매칭 확정 전 응답에서 제외.

## 검증 및 커밋
- 코드 수정 후 `npm run typecheck`, `npm test` 통과 필수. UI 변경 시 `npm run build` 및 360/390px 뷰포트 확인.
- 검증 통과 후 이유와 맥락이 담긴 conventional commit 메시지로 커밋. push는 대표님 확인 후.

## 소통
극도로 간결하고 전문적으로. 인사·서론·감정 표현 없이 결정 사항, 수행 결과, 해결 불가 장애물만 보고한다.

## Core Engineering & Workflow Rules (대표님 확정 2026-10-24)

### 1. Research & Plan First (선 리서치 및 설계 검증)
- 새 기능이나 첫 세션 시작 시 즉시 코드를 작성하지 말고 Plan Mode로 시작할 것.
- 문제의 정량적 근거(성능 병목 수치, 데이터 크기, 비즈니스 지표)를 먼저 확인하거나 요구할 것.
- 구현 전 동일 포지셔닝의 SOTA(최고 수준) 오픈소스나 프로덕트의 아키텍처, 시스템 설계, UI/UX 패턴을 분석해 기준점(Baseline)으로 제시할 것.

### 2. Decomposition: Deterministic vs. Probabilistic (문제 분해 및 분리)
- 복합 문제는 가장 큰 근본 원인(Root Cause)부터 식별하고 하위 작업으로 쪼갤 것.
- 작업을 **[결정론적 로직(코드/수식/규칙)]**과 **[확률적 로직(LLM 추론)]**으로 엄격히 분리할 것.
- 계산, 데이터 파싱, 상태 관리, 명확한 조건 분기는 절대 LLM 호출(Wrapper)로 처리하지 말고 순수 코드와 알고리즘으로 구현할 것.

### 3. Scientific & Automated Evaluation (자동화된 평가 기준)
- 모든 기능 구현 및 LLM 프롬프트 설계 시, 동일한 조건에서 자동 채점(Auto-Eval)이 가능한 테스트 스크립트나 검증 루브릭을 함께 작성할 것.
- 정성적 결과물이라도 정답에 수렴하는 대리 지표(Proxy Metric: 응답 속도, 스키마 일치율, 엣지 케이스 통과율 등)를 정의하고 실행하여 통과 여부를 숫자로 증명할 것.

### 4. High-Agency & Complete Execution (대규모 작업의 완결성)
- 범위가 큰 작업이 주어져도 임의로 축약하거나 `// TODO`, `// 생략`으로 남겨두지 말 것.
- 파일 탐색 → 아키텍처 설계 → 전체 구현 → 테스트 실행 및 수정까지 자율적으로 끝까지 완수할 것.

### 5. Architecture Co-Design (아키텍처 주도 및 통섭)
- 사용자가 제안한 아키텍처 의도를 최우선으로 반영하되, 단순 보일러플레이트 생성을 지양할 것.
- 성능, 비용, UX를 극대화할 수 있는 창의적 접근법이나 타 도메인의 설계 패턴이 있다면 구현 전 대안 옵션으로 역제안할 것.

### 6. 작업은 단계별로 진행
- 하나의 작업이 완료된 뒤 다음 작업으로 진행할 것.
- 만약 뒷작업까지 함께 해야 할 경우, 그 이유를 설명하고 반드시 컨펌을 받을 것.
- 단계별 컨펌 이후 다음 작업으로 진행할 것.
