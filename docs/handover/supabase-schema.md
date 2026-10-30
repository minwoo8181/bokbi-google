# Supabase 테이블 + 데이터 계약 계층 설계안 v2.1 (2026-10-26, 2단계 SQL 완성 · 운영 DB 미적용)

> **v2.1 (2단계, 2026-10-26)**: SQL은 [`supabase/migrations/`](../../supabase/migrations/) 4개 파일이 정본(이 문서의 표·부록보다 우선). v2 대비 바뀐 점:
> ① `vault` 스키마 → **`pii`** (Supabase에 이미 `supabase_vault` 확장의 `vault` 스키마가 있어 충돌) ② RPC 5개 추가: `submit_request`(의뢰+암호문+동의 한 번에)·`owner_sale_change`(멈춤·다시 시작·거둬들이기·팔았어요·취소 + 방문 취소)·`file_fake_report`(신고 상태를 중개사가 직접 못 쓰게)·`visit_slots`(다른 곳 방문은 시간만)·`admin_log_fee_review`(복비 확인 기록, 판정은 한 번) ③ 집주인 카드의 개설 연도·인원은 **구간으로만** 반환(`officeAgeBand`·`agentCountBand`와 같은 경계) ④ `private.is_admin()` 안에서 aal2까지 확인 ⑤ 실패는 `raise exception '<앱 오류 코드>'`(repo.ts Result 이름), `approve_broker`만 실패 횟수를 남기려고 코드를 반환 ⑥ 받는 중 기한이 지난 의뢰는 DB 단계가 RECEIVING 그대로(앱 `effectiveStage`가 EXPIRED 계산) → 파기는 `receiving_until + 30일`

> **운영 프로젝트 = 서울 `bokbi` ref `phwirgnogphmhscjrnfn`** (ap-northeast-2, Postgres 17, public 테이블 0개, 2026-10-26 생성 — §7 0단계 완료, GitHub 연결은 대표님). 예전 도쿄 `ekzmcwqvbnnmepfhbwyf`는 보관만. 마이그레이션은 승인 뒤에만 적용한다.
> **확정 (대표님 2026-10-26)**: 파기는 개인정보 칸(`vault.request_contacts`)만 의뢰 종료 30일 뒤 삭제, 나머지(의뢰 블라인드 칸·거래 기록·지표용 데이터)는 남김. 세입자 전화는 v2안대로 거래 종료 즉시.
> 예전 [ARCHITECTURE.md §5](../../ARCHITECTURE.md) 스키마는 Phase 4·5 이전 것이라 이 문서로 대체한다. v1(같은 날) 대비 바뀐 점은 §0.

## 0. v1 → v2 바뀐 점 (한 줄씩)

| # | v1 | v2 | 이유 |
|---|---|---|---|
| 1 | 도쿄 리전 그대로 | **서울 리전으로 새로 만들기** (지금 테이블 0개라 비용 0) | 도쿄 = 개인정보 **국외 이전** → 처리방침 6항 고지·거부 시 이용 불가 문구가 필요. 서울이면 이 조항 자체가 빠지고 응답도 빠름 |
| 2 | 동·호수·연락처를 RLS로 숨김 | **열람 함수로만 + 열람 기록 + 앱 암호화** | RLS 설정 한 줄 실수 = 전체 유출. 열 때마다 기록이 남아야 이상 열람(한 중개사가 연락처를 몰아서 봄)을 잡고, DB가 통째로 새도 암호문만 나감 |
| 3 | 집주인 전화를 `request_private`에 따로 저장 | **로그인 계정(auth) 전화 한 곳만** | 같은 개인정보를 두 곳에 두면 파기·정정이 두 번 → 하나만 |
| 4 | 보유 기간 없음 | **자동 파기 작업** (처리방침 약속과 같은 값) | 처리방침에 "미매칭 의뢰 30일 후 파기, 계약 기록 5년"을 이미 약속함 → DB가 지켜야 사실 |
| 5 | 관리자 = role 칸 | **관리자 = role + 2단계 인증(MFA) 필수 + 개인정보 열람은 사유 입력** | 관리자 계정이 털리면 전부 열림. 내부자 열람도 기록 |
| 6 | 집주인에게 offers 행 그대로 | **집주인용 함수가 사무소 id를 빼고** 줌 | 사무소 id가 보이면 집주인이 같은 중개사를 의뢰끼리 연결 → 블라인드가 깨짐 |
| 7 | 행동 기록 actor_id 원문 | **가명(해시) + 13개월 뒤 삭제**, IP·기기 정보 저장 안 함 | 지표엔 "같은 사람"만 알면 됨 |
| 8 | 세입자 전화 그냥 저장 | **암호화 + 거래가 끝나면 즉시 파기** | 세입자는 동의한 적 없는 제3자 — 가장 짧게 |

## 1. 지키는 것과 막을 상대 (위협 모델)

| 보호할 것 | 등급 | 누가 노리나 | 막는 방법 |
|---|---|---|---|
| 동·호수 + 집주인 이름·전화 | **최상** (집 주소 + 연락처 = 사람 특정) | 매칭 안 된 중개사의 수집, 유출된 키, 관리자 계정 탈취 | 별도 비공개 스키마 · 앱 암호화 · 열람 함수(매칭 확정 + 해제 안 됨만) · 열람 기록 |
| 세입자 전화 | **최상** (제3자, 동의 없음) | 위와 같음 | 위 + 거래 종료 즉시 파기 |
| 중개사 대표·전화·주소 | 중 (공개 명단에 있는 사업자 정보) | 집주인이 매칭 전 식별 → 직거래 우회 | 매칭 확정된 곳만 공개 (블라인드 원칙) |
| 크레딧 | 중 (돈과 같음) | 중복 차감·환불 노리기, 동시 누르기 | 장부는 함수로만, 중복 금지 제약, 행 잠금 |
| 가입 확인 코드 | 중 | 남의 사무소로 가입 | 해시만 저장, 5회 실패 잠금 |
| 행동 기록 | 하 (가명) | — | 가명·개인정보 검사(`lib/analytics/privacy.ts`)·관리자만 읽기 |

**법·약속 기준** (법무 확인 필요 표시는 ⚖️):
- 개인정보 보호법: 최소 수집, 목적 외 이용 금지, 보유 기간 뒤 지체 없이 파기, 제3자 제공 동의(매칭 모달 4단계 — 이미 있음), 국외 이전 고지
- 안전성 확보조치: 접근 권한 최소화·관리, **개인정보처리시스템 접속 기록 보관(최소 1년)** ⚖️, 비밀번호·인증 정보 암호화, 관리자 접속 2단계 인증 권장
- 처리방침에 이미 쓴 약속: 미매칭 의뢰 `의뢰 종료 후 30일`(`COMPANY_INFO.requestRetention`), 계약 기록 5년, 중개사 제공분 "중개 업무가 끝날 때까지"

## 2. 구조 (3층)

```
[브라우저]  화면 — 개인정보 원문을 오래 들고 있지 않음, localStorage엔 편의 기능만
    │  (로그인 세션 쿠키, 공개 키만)
[Next.js 서버]  서버 액션 = 규칙(TS 함수·테스트 499개) + 암호화/복호화 + 입력 검사(zod)
    │  사용자 JWT로 접속 → RLS 적용   /   서비스 키는 서버 비밀값, 배치·관리 RPC만
[Supabase Postgres]
    public 스키마   : 블라인드 칸만 (requests·offers·deal_events·visits·credit_ledger …) + RLS
    vault 스키마    : 동·호수·연락처 암호문 — Data API에 노출 안 함, 열람 함수로만
    private 스키마  : 권한 확인 함수 (is_admin·is_matched_broker) — 노출 안 함
    audit 스키마    : 열람 기록·관리자 처리 기록 — 추가만 (수정·삭제는 트리거가 거절)
```

- **규칙은 서버 TS에 하나만** (v1과 같음). DB 함수(RPC)는 돈·여러 테이블이 같이 바뀌는 일만: 요청 보내기(크레딧 1, 하루 제한 없음 2026-10-29)·매칭 확정·후기(+크레딧 돌려받기)·허위 매물 판정(+종료·환불·기록)·거래금액 확정
- **암호화**: 서버가 AES-256-GCM으로 암호화해 암호문만 저장, 키는 Cloudflare 비밀값(DB와 다른 곳). DB가 새도 원문 없음. 검색이 필요 없는 칸만 대상(동·호수·이름·세입자 전화·메모)
- **열람 = 함수 한 개** `reveal_contact(request_id, purpose)`(함수만 공개 스키마, 데이터는 `vault`): 호출자가 집주인 본인 / 매칭 확정·해제 안 된 중개사 / MFA 통과한 관리자(사유 필수)인지 확인 → 암호문 반환 + `audit.access_log`에 한 줄. 서버가 복호화해 그 화면에만 줌
- **이상 열람 알림**(관리자 오늘 할 일에 추가 가능): 한 계정이 하루 N건 넘게 연락처 열람, 해제된 뒤 열람 시도

## 3. 테이블 (첫 묶음)

| 스키마.테이블 | 무엇 | 개인정보 | 보유 기간 (자동 파기) |
|---|---|---|---|
| `public.profiles` | 역할(owner·broker·admin) — 전화는 auth에만 | 없음 | 탈퇴 시 |
| `public.broker_offices` | 사무소(등록번호·상호·대표·사무소 전화·주소·개설 연도·인원·칩), 가입 상태, 확인 코드 **해시** | 사업자 정보 | 탈퇴 후 계약 관련분 5년 ⚖️ |
| `public.requests` | 의뢰 블라인드 칸(단지·평형·층 구간·가린 동호·희망가·복비·상한·집 정보·추천값 스냅숏·단계·시각) | 없음(가린 동호만) | 계약 기록 5년, 미매칭은 30일 뒤 개인정보 칸 없음 → 행은 통계용 유지 |
| `vault.request_contacts` | **암호문**: 동·호수, 집주인 이름, 세입자 전화, 방문·옵션 메모 | **최상** | 미매칭: 종료 30일 뒤 / 거래 완료·종료: 30일 뒤 / 세입자 전화: 거래 종료 즉시 |
| `public.offers` | 요청 카드(잘하는 점≤3·매칭·해제·광고·늦은 이유·허위 매물 신고) | 없음 | 의뢰와 같이 |
| `public.deal_events` | 거래 기록 — 추가만 | 없음(금액·날짜만) | 5년 (분쟁·계약 기록) |
| `public.visits` | 방문 일정(날짜·시간·취소) | 없음 | 의뢰와 같이 |
| `public.credit_ledger` | 크레딧 장부 — 함수로만 | 없음 | 5년 |
| `public.consents` | 동의(종류·약관 버전·시각) | 계정 id | 탈퇴 후 3년 ⚖️ (동의 증빙) |
| `audit.access_log` | 개인정보 열람 기록(누가·무엇·언제·목적) — 추가만 | 계정 id | **2년** (최소 1년 기준보다 여유) ⚖️ |
| `audit.admin_actions` | 관리자 처리 기록 — 추가만 | 계정 id | 5년 |
| `public.events` | 행동 기록 22개, actor는 해시 | 가명 | 13개월 |

파기는 `pg_cron` 하루 1번 함수(`private.purge_expired()`) — 무엇을 몇 건 지웠는지만 `audit`에 남김(내용 없이). 관리자 시스템 탭에 "마지막 파기" 날짜 표시.

## 4. 권한 (RLS + 함수)

| | 집주인 | 중개사(승인) | 다른 중개사 | 관리자(MFA) | 로그인 전 |
|---|---|---|---|---|---|
| 받는 중 의뢰(블라인드) | 내 것 | 읽기 | 읽기 | 읽기 | ✗ |
| 동·호수·연락처 | 내 것 (함수) | **매칭 확정·해제 전만 (함수 + 기록)** | ✗ | 사유 입력 후 (함수 + 기록) | ✗ |
| 사무소 정보 | 매칭 확정된 곳만 (함수, 사무소 id 없이) | 내 것 | ✗ | 읽기 | ✗ |
| 요청 카드 | 내 의뢰에 온 것 (함수) | 내 것 | ✗ (서로 모름) | 읽기 | ✗ |
| 거래 기록 | 내 거래 | 내 거래 | ✗ | 읽기 | ✗ |
| 방문 일정 | 내 의뢰 | 내 것 + 다른 곳은 시간만 | ✗ | 읽기 | ✗ |
| 크레딧 | — | 내 것 (쓰기는 함수) | ✗ | 읽기 | ✗ |
| 열람·처리 기록 | — | — | — | 읽기만 | ✗ |

- 정책은 `(select auth.uid())`로 한 번만 계산, 정책에 쓰는 칸은 인덱스, 권한 함수는 `private`에 `security definer` + `search_path = ''` + 일반 역할 실행 권한 회수
- 관리자 정책은 `(select auth.jwt() ->> 'aal') = 'aal2'`(2단계 인증 통과)까지 확인
- `vault`·`private`·`audit` 스키마는 Data API(PostgREST)에 노출하지 않음 → 브라우저에서 직접 부를 길 자체가 없음
- `anon` 역할은 어떤 테이블도 못 읽음. 분석 화면은 지금처럼 JSON 파일

## 5. 운영·키 관리

| 항목 | 정함 |
|---|---|
| 환경 | 개발 = Supabase 브랜치(가짜 데이터만), 운영 = 본 프로젝트. **개발 DB에 실제 개인정보 금지** |
| 키 | 공개 키만 브라우저, 서비스 키·암호화 키는 Cloudflare 비밀값. 분기마다 교체, 퇴사·유출 의심 시 즉시 |
| 로그인 | 휴대폰 인증(Solapi를 SMS 공급자로). 문자 폭탄 막기: Auth 요청 한도 + 봇 확인 켜기(대시보드 설정 — 대표님) |
| 관리자 | 대표님이 대시보드에서 role 지정 + 앱 2단계 인증(TOTP) 등록 |
| 백업 | 운영은 유료 플랜(매일 백업 + 무료 플랜의 비활성 일시 정지 없음). 비용은 배포 직전에 확인 |
| 점검 | 마이그레이션마다 Supabase 보안 점검(`get_advisors`) 경고 0, 권한 표 전 칸 자동 테스트 |

## 6. 데이터 계약 계층 (v1과 같음)

```
src/lib/data/
  schema.ts        zod: 앱 타입 ↔ DB 행 (지금 손으로 쓴 parseMarket·isDealEvent·parseWorkspace·parseAdminLog·parseApplication 대체)
  repo.ts          RequestRepo · OfferRepo · DealRepo · VisitRepo · CreditRepo · ContactVault · AdminRepo · EventSink
  local/*.ts       지금 mockMarket·workspace를 감싼 구현
  supabase/*.ts    서버 액션 + RPC + 암호화 (3단계)
```
- `ContactVault`(동·호수·연락처)는 다른 저장소와 **분리된 인터페이스** — 화면이 연락처를 일반 데이터처럼 다루지 못하게, 열람 목적(`purpose`)을 꼭 넘김
- 계약 테스트 하나를 로컬·Supabase 구현에 모두 돌림

## 7. 진행 순서 (한 단계씩 컨펌)

| 단계 | 하는 일 | DB 변경 |
|---|---|---|
| 0 | (결정) 서울 리전 새 프로젝트 — 대표님이 대시보드에서 만들고 GitHub 다시 연결, 처리방침 `dataRegion`·국외 이전 조항 정리 | 새 프로젝트 생성만 |
| 1 | 데이터 계약 계층(zod + 저장소 + 로컬 구현), 화면 훅 연결 — **1-a 완료(2026-10-26)**: `lib/data/schema.ts`(기존 `parseMarket`·`isDealEvent`·`parseWorkspace`·`parseApplication`·`parseAdminLog`를 zod로, 깨진 항목만 버림), `repo.ts`(Requests·Offers·Deals·Visits·Credits·Applications·Admin·ContactVault), `local/index.ts`(+ 연락처 열람 기록 `bokbi_access_log`), 계약 테스트 11개·스키마 테스트 7개. **1-b 완료(2026-10-26)**: 화면이 쓰는 저장소 하나 `components/data/repos.ts`(여기만 바꾸면 Supabase로 전환), `useAgentWorkspace`·`AgentWorkspace`·`useOwnerRequest`·내 의뢰 화면·`useAdminData`·`AdminBrokerReview`·`AgentQa`가 저장소로 읽고 씀. 저장소에 `refresh`(화면이 든 의뢰에 저장 상태 붙이기)·`confirmOwner`·`answerMoreCredits` 추가. **아직 직접 저장하는 곳(의도)**: 테스트 스위처의 크레딧 0개·다음 주·오늘 3건 채우기·초기화·집주인 예시 고르기(실제 흐름에 없는 상태), 가입 화면 `BrokerSignupFlow`(가입은 Supabase Auth와 함께 바꿈), 특약 화면 읽기 | 없음 |
| 2 | 마이그레이션 SQL + RLS·열람 함수·파기 작업 + 권한 표 자동 테스트 — **완료(2026-10-26, PC에서)**: 조직이 무료 요금제라 브랜치 불가(Pro 전용, get_cost 시간당 $0.01344) → 대표님 결정으로 **PGlite**(Node 안의 Postgres)에서 `npm test`마다 실행. 파일: `migrations/20261026130000_core_tables`·`130100_rls`·`130200_rpc`·`130300_purge`, 시험 `supabase/tests/shim.sql`(Supabase 역할·auth 흉내, 시험 전용)·`seed.sql`·`permissions.sql`·`lint.sql`, Vitest `src/lib/data/__tests__/db.test.ts`, 목록 대조 `src/lib/data/dbEnums.ts`. **결과: 권한 표 48칸 + 시나리오 112개 = 160/160 통과, 점검 WARN·ERROR 0(INFO 1 = 정책 없는 `pii.request_contacts`, 의도), check 목록 24개 앱과 일치, 일부러 연 표·함수를 점검이 잡는지도 시험.** 주의: PGlite는 Postgres 18, 운영은 17 → 17에 없는 문법은 안 씀 | 없음 (PC) |
| 2-A2 | **저장소 Supabase 구현 완료(2026-10-26, 스위치 기본값 local → 화면 변화 없음)**: DB 포트 `lib/data/supabase/port.ts`(운영 `supabaseJs.ts` / 시험 `__tests__/pgliteDb.ts`), 변환 `map.ts`(집주인 카드 구간 → 같은 배지가 나오는 대표값), 구현 `index.ts`(규칙은 TS 그대로·판단 시각은 서버 시계), 연락처 암호화 `crypto.ts`(AES-256-GCM, WebCrypto, AAD = 의뢰 id:칸, 키 버전), 저장소에 `requests.create` 추가, 마이그레이션 5 `130400_read_rpcs`(의뢰 id 미리 정함·열람에 집주인 계정 전화·`access_log_list`·`admin_actions_list`), 서버 액션 `app/actions/data.ts`(세션 쿠키 → RLS, 메서드 목록 `lib/data/remoteMethods.ts`만), 브라우저 프록시 `lib/data/remote.ts`, 스위치 `NEXT_PUBLIC_DATA_BACKEND`(`components/data/repos.ts`). **결과: 계약 시나리오 9개 × 두 구현 = 18/18, SQL 167/167.** 일부러 뺀 것: 가입 저장(A4), 크레딧 더 받기 투표(A7). 환경변수 이름: `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`·`CONTACT_ENC_KEY`(base64 32바이트, 교체 시 `1:키,2:키`)·`NEXT_PUBLIC_DATA_BACKEND` | 없음 (PC) |
| 2-b | (3단계 직전) Pro 전환 → 브랜치 생성(`get_cost`→대표님 승인→`confirm_cost`) → 같은 마이그레이션 + `seed.sql`·`permissions.sql`·`lint.sql`을 `execute_sql`로 → `get_advisors` 경고 0 확인. `shim.sql`은 적용하지 않음(Supabase에 이미 있음) | 브랜치만 |
| 3 | 대표님 승인 후 운영 적용, 보안 점검 경고 0 | 처음으로 운영 |
| 4 | Supabase 구현 + 암호화, 기능 스위치로 전환, 360/390px 흐름 확인 | — |

**2단계에서 남긴 것 (4단계 Supabase 구현 때)**
- `audit`·`pii`는 Data API에 노출하지 않으므로 관리자 화면이 열람·처리 기록을 읽으려면 읽기 RPC가 하나 더 필요 (지금은 SQL 권한·RLS만 시험)
- DB가 강제하지 않는 화면 규칙(합의대로 서버 TS): 기한 지난 일 먼저(TODO_FIRST), 매칭 후 7일 보호 기간, 광고 전 소유자 확인, 거래 단계 전이 순서(`dealState`). 사용자가 RPC를 직접 불러 우회해도 본인 의뢰·본인 카드 안에서만 영향
- 방문 취소의 `canceled_by`는 쓰는 사람이 넣음(집주인·중개사가 서로 사칭 가능하지만 자기 의뢰·카드 안만). 엄격히 하려면 트리거로 덮어쓰기
- 처리방침 약속 대조: 연락처 30일·세입자 전화 즉시·행동 기록 13개월·열람 기록 2년은 `private.purge_expired()`가 지킴. 계약 기록 5년·동의 3년 파기는 아직 없음(⚖️ 기간 확정 후)

## 부록. SQL 뼈대 (v2 초안 — 정본은 supabase/migrations/)

```sql
create schema if not exists vault;   -- Data API 노출 목록에 넣지 않음
create schema if not exists private;
create schema if not exists audit;

create table vault.request_contacts (
  request_id uuid primary key references public.requests (id) on delete cascade,
  dong_ho_enc bytea not null,          -- AES-256-GCM (서버에서 암호화, 키는 DB 밖)
  owner_name_enc bytea not null,
  tenant_phone_enc bytea,
  memo_enc bytea,
  key_version smallint not null default 1,   -- 키 교체용
  purge_after timestamptz                    -- 파기 예정 시각 (단계가 바뀔 때 서버가 정함)
);
revoke all on vault.request_contacts from anon, authenticated;

create table audit.access_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('owner', 'broker', 'admin')),
  request_id uuid not null,
  purpose text not null check (purpose in ('OWNER_VIEW', 'MATCHED_BROKER', 'ADMIN_REVIEW')),
  reason text,                               -- 관리자만, 필수
  at timestamptz not null default now()
);
create index access_log_actor_at_idx on audit.access_log (actor_id, at);

-- 기록은 고치거나 지울 수 없음 (파기 작업만 기간 지난 행 삭제 — 별도 함수, 별도 역할)
create or replace function audit.block_change() returns trigger language plpgsql as $$
begin
  raise exception 'audit rows are append-only';
end $$;
create trigger access_log_no_update before update on audit.access_log for each row execute function audit.block_change();

-- 열람 함수: 권한 확인 + 기록 + 암호문 반환 (복호화는 서버).
-- 함수만 public(서버가 rpc로 부를 수 있게), 데이터는 노출 안 된 vault에. 브라우저에서 불러도 암호문뿐
create or replace function public.reveal_contact(rid uuid, why text, admin_reason text default null)
returns setof vault.request_contacts
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  v_role text;
begin
  if exists (select 1 from public.requests r where r.id = rid and r.owner_id = uid) then v_role := 'owner';
  elsif (select private.is_matched_broker(rid)) then v_role := 'broker';
  elsif (select private.is_admin()) and (select auth.jwt() ->> 'aal') = 'aal2' and coalesce(admin_reason, '') <> '' then v_role := 'admin';
  else raise exception 'not allowed';
  end if;
  insert into audit.access_log (actor_id, actor_role, request_id, purpose, reason) values (uid, v_role, rid, why, admin_reason);
  return query select * from vault.request_contacts where request_id = rid;
end $$;
revoke execute on function public.reveal_contact(uuid, text, text) from public, anon;
grant execute on function public.reveal_contact(uuid, text, text) to authenticated;
```

나머지 테이블(`profiles`·`broker_offices`·`requests`·`offers`·`deal_events`·`visits`·`credit_ledger`·`consents`·`events`)과 제약(한 의뢰에 한 번·크레딧 사용/환불 1번·주간 지급 1번·상태 목록 check)은 v1 초안과 같고, 2단계에서 SQL 파일로 완성한다. RPC: `send_request` · `confirm_match` · `release_offer` · `append_deal_event` · `submit_review` · `decide_fake_report` · `grant_weekly_credits` · `approve_broker` · `owner_offer_cards`(사무소 id 없이) · `request_disclosures` · `reveal_contact` · `private.purge_expired`
