# 복비(Bokbi) — 프로젝트 지침

## 절대 불변 규칙 (대표님 확정 2026-11-02)
1. **GitHub 저장소**: 오직 `https://github.com/minwoo8181/bokbi-google.git` (main)만 사용한다. 문서 내 다른 주소(원본 주소 등)는 절대 사용하지 않는다.
2. **디렉토리 권한 및 격리**: 오직 현재 폴더(`c:\Users\dlwhd\Desktop\bokbi-second`)만 권한을 가지며, 문서에 적힌 원본 디렉토리(`c:\Users\dlwhd\Downloads\bokbi ver4- 클로드` 등)는 절대 수정·삭제·변경하지 않는다.
3. **외부 서비스 안전**: 원본의 Supabase, Cloudflare 등은 절대 건드리지 않는다.

## 환경
- 로컬 경로: `c:\Users\dlwhd\Desktop\bokbi-second`
- 원격 저장소: `https://github.com/minwoo8181/bokbi-google.git` (main)
- 개발 서버: `npm run dev` → `http://localhost:3006`
- 스택: Next.js 15 App Router, TypeScript strict, Tailwind CSS 3, Framer Motion, Recharts, Lucide, Vitest
- 백엔드: 현재는 목업 데이터 + `localStorage` (`NEXT_PUBLIC_DATA_BACKEND=local`)
- 디자인: 토스 라이트(Toss Light) 단일 디자인 기준

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
