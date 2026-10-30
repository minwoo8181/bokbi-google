# 배포 전 할 일 (PREDEPLOY_CHECKLIST.md)

> **배포 전에 남은 일을 한 곳에 모은 목록** (2026-10-26 정리). 끝나면 `[x]`로 바꾸고 날짜·커밋을 붙인다. 새로 생긴 일은 여기에 먼저 적는다.
> 담당: **대표님**(계정·키·결정·법무) / **Claude**(코드) / **같이**. `Pro` = Supabase Pro 요금제(월 $25)가 있어야 하는 일.
> 아래 "상세" 절(1~2)은 항목별 근거와 바꿀 파일.

## 순서 한눈에

```
지금 (무료)                                         배포 일정 잡히면                  배포 직후
① Supabase 4단계 코드  ──┐                       ⑤ Pro 전환 (대표님)             ⑨ 실사용 지표 확인
② Solapi 문자 인증·알림 ─┼─→ ④ 목업 걷어내기 ──→ ⑥ 브랜치 시험·보안 점검 ──→ ⑧ 배포
③ 법무·회사 정보 (대표님)┘                       ⑦ 운영 DB 적용·데이터 갱신
```

## A. Supabase — Pro 전에 끝낼 것 (Claude, 무료로 PC 시험)

- [x] 0~2단계: 서울 프로젝트, 데이터 계약 계층, 마이그레이션·권한 테스트 160/160 (`91c6cf1`), GitHub 연결·자동 적용 꺼짐 (`0b05246`)
- [x] **A1 로그인 코드** (2026-10-26): 두 화면 공통 인증 훅·규칙(`lib/auth/*`), Supabase Auth 구현, 세션 미들웨어, `/login`(기존 회원만 — 새 계정은 동의 받는 화면에서만), 로그인 필요 경로 `/my-requests`·`/agent`(가입·특약 제외), 문자 훅 `/api/auth/sms-hook`(서명 확인 → Solapi). 실제 연결은 아래 B "배포 직전 순서"
- [x] **A2 저장소 Supabase 구현** (2026-10-26): 서버 액션 + RPC + 기능 스위치(기본 `local`), 계약 18/18 — 상세 [supabase-schema.md](handover/supabase-schema.md) §7
- [x] **A3 연락처 암호화** (A2에 합침): AES-256-GCM, 키 `CONTACT_ENC_KEY`
- [x] **A2' 스위치 켜기 전 화면 전환** (2026-10-26, `8c22040`·`d4b2271`): 연락처를 `contacts.reveal`로 — 공통 훅 `useContactReveal`, 진입당 1번 열람(DealPage·DealNextCard·VisitScheduleSection·InProgressSection·RequestSummaryCard). 매칭 모달이 supabase 모드에서 `requests.create`(블라인드/비밀 칸, 동의 3개 + 약관 버전 = 시행일) 부르고 휴대폰 요약엔 비밀 칸 없이 저장, 다시 요청은 서버 본인 열람으로 동·호수 채움. local 동작은 그대로. **실제 Supabase로는 미확인**(배포 직전 B에서)
- [x] **A2'' 관리자 콘솔 가입 목록을 Supabase에서** (2026-10-29): 저장소 `admin.applications`·`admin.decideApplication` — Supabase는 관리자 RLS로 모든 사무소 + `approve_broker` 한 트랜잭션(마이그레이션 추가 없음), 계약 테스트 브라우저·PGlite 양쪽 통과. 실제 Supabase로는 스위치를 켤 때 확인
- [ ] 관리자 시스템 탭 키 점검에 Supabase·연락처 키 추가 (`lib/admin/keys.ts`)
- [ ] **거리 구간 Supabase 연결 (2026-10-29)**: 요청 보내기 RPC에서 `offerDistanceBand`(app/agent/actions.ts)와 같은 계산 → `offers.distance_band` 칸(구간 이름만, 마이그레이션 1개 추가) → `supabase/map.ts`가 `distanceBand`로. 지금은 local 모드에서만
- [ ] ⚖️ **VWorld 약관 확인**: 좌표는 저장하지 않고 "단지에서 1km 안" 같은 구간 이름만 요청에 저장해도 되는지 (좌표 저장 금지 조항)
- [ ] 🧭 **대표님 결정: 매칭 전 소유자 확인 (2026-10-29 논의, 나중에 결정)**. 지금은 이름·소유를 매칭 전에 대조하지 않음 → 허위 의뢰도 매칭까지는 감(광고는 중개사 등기부 확인 전엔 못 올림 `OWNER_CHECK_FIRST`, 허위면 신고 → 의뢰 종료 + 크레딧 반환). 확인한 사실: 건축물대장 공개 API(표제부·전유공용면적)에는 소유자 칸 없음(실제 호출로 확인), 등기부도 공식 공개 API 없음. 선택지 — ① 정부24 건축물대장 발급 페이지 새 창 + 주소 자동 복사 버튼(무료, 이용자가 로그인·붙여넣기·발급) ② 간편인증으로 서류 자동 수집 민간 API(CODEF 등, 유료, 소유자 칸 제공 여부 견적 확인) ③ 등기부 조회 API(유료, 열람 700원 + 이용료) ④ 집주인 전유부 PDF 업로드 → 이름·동·호수 자동 비교 배지(무료, PDF가 글자형인지 실제 파일로 시험 필요). 건축물대장 소유자는 등기보다 늦게 바뀔 수 있어 보조 장치
- [x] **A4 중개사 가입 서버화** (2026-10-29, 대표님 추천안 3개 승인): 신청은 서버 액션 `submitBrokerApplication`(명단 대조를 서버에서 다시 → 확인 코드 서버 발급 → DB엔 bcrypt 해시만, 원문은 신청한 휴대폰 `bokbi_signup_code`에만) · 다른 휴대폰이면 "새 확인 코드 받기"(예전 코드 무효, 틀린 횟수 그대로, 캔버스 A안) · 실패 잠금 DB `private.signup_fails`(접속 주소는 서버 키 HMAC, 5번 10분) · 이미 가입(확인 대기·승인) = `이미 가입 신청된 사무소예요`, 반려된 신청은 새 신청이 덮어씀(예전 판정은 처리 기록에). 로그인 사용자가 `broker_offices`에 직접 넣던 권한은 회수. 규칙 `lib/broker/signupService.ts`, 마이그레이션 11번째 `20261029150000_broker_signup.sql`(미적용), PGlite 시험 6개 + 계약 테스트 `submitBroker`가 실제 길. 서버 키 클라이언트는 `lib/supabase/serviceClient.ts` 한 곳으로 모음. **실제 Supabase 휴대폰 로그인으로는 미확인**(배포 직전)
- [x] **A5 관리자 인증** (2026-10-29, C안): 서버 관문 `app/admin/adminGate.ts` → 규칙 `lib/admin/gate.ts`(로그인 → role admin → 인증 앱 등록 → 6자리 aal2, 관리자 아니면 404). 등록 화면 휴대폰 = "인증 앱에 추가하기"(otpauth) + 키 복사, lg = QR. 시스템 탭 "개인정보 열람 기록"(열람 / 관리자 처리, 기존 `access_log_list`·`admin_actions_list`). 확인 전화 명단(`getAdminCallInfo`)도 같은 관문. 브라우저 저장소 단계 배포 빌드는 계속 404. **실제 Supabase로는 미확인**
- [ ] **A5 켤 때 대표님 할 일**: ① Supabase 대시보드 Authentication → MFA에서 TOTP 켜져 있는지 확인(기본 켜짐) ② 대표님 휴대폰으로 `/login` 한 번 로그인(계정 생김) ③ SQL로 `update public.profiles set role = 'admin' where id = '<대표님 user id>'` ④ `/admin` → 인증 앱 등록. 휴대폰 분실 시 대시보드 Authentication → 사용자 → MFA 인증 삭제 후 다시 등록
- [x] **관리자 웹 푸시 1·2단계** (2026-10-29): 시스템 탭 "알림 받기"(이 기기 켜기·끄기, 알림 종류 4개, 시험 알림) + 보낼 규칙 `lib/admin/push.ts`(아침 9시 요약·기한 지남 바로·서비스 확인·새 가입, 밤 10시~8시 긴급만, 하루 한 번). 기기 표 마이그레이션 `20261029120000_admin_push.sql`(관리자 aal2 본인 기기만, 삭제 없음). 실제 크롬으로 켜기 → 시험 알림 표시 → 끄기 확인
- [x] **관리자 웹 푸시 3단계 자동 발송** (2026-10-29, 대표님 A안·15분): pg_cron `bokbi-admin-push`(15분) → `private.push_tick()`이 Vault의 주소·비밀값으로 pg_net POST → `app/api/admin/push-tick/route.ts`(비밀값 확인 → 서버 키로 의뢰·가입 신청·처리 기록 읽기 → `todayItems` → `runPushTick`: 기기별 설정대로 보내기, 한 곳이라도 받으면 `admin_push_sent`에 기록, 404·410 기기는 끔). 마이그레이션 `20261029130000_admin_push_send.sql`(9번째). 서버 키는 이 파일 하나만(테스트가 막음). 문의·탈퇴 요청·새 가입 즉시 알림은 서버로 옮긴 뒤(A4 등)
- [ ] **웹 푸시 자동 발송 켤 때 대표님 할 일**: ① Supabase → Project Settings → API Keys의 **secret key**(`sb_secret_…`)를 배포 비밀값 `SUPABASE_SECRET_KEY`에 (채팅에 붙여 넣지 않기) ② 발송 비밀값 만들기 `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` → 배포 비밀값 `PUSH_TICK_SECRET` ③ Supabase SQL에서 `select vault.create_secret('https://<배포 도메인>/api/admin/push-tick', 'bokbi_push_tick_url'); select vault.create_secret('<②와 같은 값>', 'bokbi_push_tick_secret');` ④ 15분 안에 관리자 휴대폰에 알림 오는지, `cron.job_run_details`·`net._http_response`에 200인지 확인. 새 secret key로 `admin_actions_list`가 열리는지(서버 키 = role service_role)도 이때 확인
- [ ] **대표님**: 웹 푸시 키 3개(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY`·`VAPID_SUBJECT`)를 배포 비밀값에도 (로컬 `.env.local`은 2026-10-29 넣음, 시스템 탭 "설정됨"). 키를 바꾸면 기기를 다시 켜야 함
- [ ] **배포 환경에서 웹 푸시 발송 확인**: `web-push` 라이브러리가 Node `https`로 보냄. 2026-10-29 확인: Worker `bokbi-mvp`는 `nodejs_compat` + 호환 날짜 2026-10-19라 Cloudflare 문서상 `node:https` 요청 지원(2025-08-15부터 기본). 배포 뒤 시험 알림 한 번으로 최종 확인, 안 되면 fetch + WebCrypto 발송으로
- [x] **A6 동의 기록 서버 저장** (2026-10-29, 대표님 "휴대폰 인증 직후"): 매칭 모달 4단계는 `submit_request`가 의뢰와 함께(A2'), 중개사 가입 동의 3개는 휴대폰 인증 직후 `applications.recordConsents` → `consents`(context `BROKER_SIGNUP`, 본인 user_id·RLS, 약관 버전 = `COMPANY_INFO.policyEffectiveDate`, 같은 버전·항목은 한 번). 인증만 하고 신청 안 한 사람도 번호를 받은 순간의 동의 증빙이 남음. 브라우저 저장소 단계는 `bokbi_broker_consents`. 마이그레이션 추가 없음(기존 표·권한)
- [x] **A7 행동 기록** (2026-10-29): 기록 27개(방문 `page_visit`·단지 검색 `complex_search`·FAQ `faq_view`·문의 `inquiry_send`·크레딧 고른 항목 `more_credits_answer` 추가) 모두 화면·서버에 연결(`server.test.ts`가 27/27 확인). 브라우저 → `/api/events`(최대 20개·32KB) → 같은 형식·개인정보 검사 다시 → 사람 id는 HMAC 가명 해시 → 서버 키로 `events`(`lib/analytics/serverStore.ts`, 서버 키 사용처 2곳째). 검색어·문의 내용 원문은 안 남김. 서버로 안 보냄: 개발 서버·localhost·자동 시험·관리자 관문을 통과한 브라우저(`bokbi_no_track`). AI 설명 성공·실패·외부 오류(Gemini·VWorld)는 서버가 직접 기록. 마이그레이션 10번째 `20261029140000_events_more.sql`(이름 목록 + 인덱스, 미적용)
- [ ] **대표님 (A7 켤 때)**: 배포 비밀값에 `EVENTS_HASH_SECRET`(아무 긴 무작위 글자 16자 이상, 한 번 정하면 바꾸지 않기 — 바꾸면 같은 사람이 다른 사람으로 셈) + `SUPABASE_SECRET_KEY`(웹 푸시와 같은 값). 없으면 기록은 브라우저에만 남고 서버엔 안 감
- [ ] 남은 위험(A7): `/api/events`는 로그인 없이 부를 수 있어 누가 일부러 가짜 기록을 많이 보내면 지표가 부풀 수 있음 → 배포 뒤 Cloudflare 요청 수 제한(Rate limiting) 규칙 1개(예: IP당 분당 60번)
- [ ] **A8 2차 테이블**: AI 설명 캐시 `analysis_explanations`(서버 메모리 대신), 매칭 사례 `match_cases`, 주민 투표·댓글 — 설계안 먼저 승인
- [ ] **A9 번들 줄이기**: zod 검사를 서버로 옮겨 첫 화면 JS 17~20kB 되돌리기
- [x] **A10 중개사 실적 집계** (2026-10-29): 거래 기록이 추가될 때마다(서버 액션 `deals.append` 뒤) 서버 키로 그 사무소 요청 카드들의 거래 기록을 읽어 TS 규칙 `promiseStats`(약속 이행 = 합의 복비 그대로 + 중개사가 계약·날짜 직접, total = 계약까지 간 거래)로 다시 세고 `set_office_promise`(서버 키 전용)로 저장 → 집주인 익명 카드 방패·"복비 첫 거래". 후기 별점·칩은 원래 `owner_offer_cards`가 그때그때 셈. 브라우저 저장소는 요청 보낼 때 카드에 실음. 마이그레이션 12번째 `20261029160000_office_promise.sql`(미적용), PGlite 흐름 시험(0/0 → 계약 0/1 → 복비 답 1/1, 브라우저는 못 바꿈)

## A'. Supabase — Pro 뒤 (배포 직전)

- [ ] **대표님**: 조직 Pro 전환 (매일 백업, 비활성 일시 정지 없음)
- [ ] 브랜치 생성(`get_cost` → 승인 → `confirm_cost`) → 마이그레이션 + `supabase/tests/seed·permissions·lint.sql` → `get_advisors` 경고 0
- [ ] **대표님 승인** → 운영 DB 적용 (GitHub "Deploy to production"을 켜거나 수동), pg_cron 작업 3개(`bokbi-purge-expired`·`bokbi-weekly-credits`·`bokbi-admin-push`) 등록 확인. 순서는 [DEPLOY_DAY.md](DEPLOY_DAY.md)
- [ ] **대표님**: 관리자 계정 role 지정 + TOTP 등록, Auth 요청 한도·봇 확인 켜기(문자 폭탄 방지)
- [ ] 브랜치는 대표님 확인 후 삭제

## B. Solapi (문자·알림톡)

- [ ] **대표님**: Solapi 가입·충전, **발신번호 등록**(사업자 번호), 키 이름 `SOLAPI_API_KEY`·`SOLAPI_API_SECRET` 확인
- [x] **B1 인증 문자 코드** (2026-10-26): Send SMS Hook 경로 `app/api/auth/sms-hook/route.ts` — Standard Webhooks 서명 확인(`lib/sms/webhook.ts`, 명세 공식 시험 값 통과) → Solapi 발송(`lib/sms/solapi.ts`, 공식 SDK와 같은 경로 `POST /messages/v4/send-many/detail`). 키 없으면 503
- [ ] **배포 직전 순서 (로그인·문자 켜기)** — 대표님 + Claude
  1. Supabase 대시보드 → Authentication → Sign In / Providers → **Phone 켜기**, 인증번호 유효 시간 180초
  2. 같은 화면 **테스트 번호**: 대표님 번호 하나 = `123456` (문자 안 나감) → 테스트 번호로 `/login`·매칭 모달·중개사 가입 먼저 확인
  3. Authentication → Hooks → **Send SMS hook** → HTTPS `https://<배포 도메인>/api/auth/sms-hook` → 비밀값 생성 → Cloudflare 비밀값 `SEND_SMS_HOOK_SECRET`
  4. Solapi 가입·충전·**발신번호 등록** → Cloudflare 비밀값 `SOLAPI_API_KEY`·`SOLAPI_API_SECRET`·`SOLAPI_SENDER`(등록한 발신번호)
  5. 실제 번호 1개로 문자 수신 확인 → 그다음 `NEXT_PUBLIC_DATA_BACKEND=supabase`
  6. Authentication → Rate Limits(문자 시간당 한도)·봇 확인(Captcha) 켜기
- [ ] **대표님**: 카카오 비즈니스 채널 개설 → 알림톡 템플릿 심사 (문자보다 싸고 잘 읽힘, 심사 며칠)
- [x] **B2 알림 코드** (2026-10-29, 대표님 "핵심 6개"): 일이 생길 때(서버 액션 뒤 `noticesAfter`) = 첫 요청 도착 → 집주인 · 매칭 확정 → 고른 중개사 · 가입 승인·반려 → 신청자 · 허위 매물 판정 → 신고한 중개사. 시간이 될 때(관리자 웹 푸시와 같은 15분 예약 작업 `tickNotices`) = 요청 받는 시간 끝 → 집주인(요청 1곳 이상) · 광고 기한 6시간 전 → 안 올린 중개사. 시간 알림은 "이번 15분 안에 지났는지"로 한 번만(보낸 기록 표 없음 — 예약 작업이 빠지면 그 알림은 건너뜀). 문구 `SITE_CONTENT.notify`(동·호수·이름 없음, 테스트가 막음), 전화번호는 로그인 계정에서만. 규칙 `lib/notify/*`. **Solapi 키(`SOLAPI_*`)와 서버 키를 꽂으면 바로 보냄, 없으면 조용히 건너뜀.** 카카오 알림톡으로 바꾸는 건 채널·템플릿 심사 뒤
- [ ] 알림 문자 실제 발송 확인 (배포 직전, 대표님 번호로 6가지 한 번씩) · 문구가 길면 장문 문자 요금 — 받아 보고 줄일지 판단
- [ ] 관리자 시스템 탭에 Solapi 잔액·실패 수

## C. 목업·가짜 숫자 → 실제 데이터

- [x] **홈 통계 가짜 숫자 → 상황별 전광판** (2026-10-26, 대표님 시안 확정): 매칭 0건 = 분석 사실 숫자, 1건부터 = 매칭마다 실적(한 집 평균·현재까지 총합, ● LIVE), 왼쪽 `복비 계산 n회`(조회 수, 10회 미만 숨김), 오른쪽 `다산동 중개사무소 336곳 · 등록 명단 기준`. `lib/home/homeStats.ts` + `/api/public-stats` + 마이그레이션 6 `public_stats`(로그인 전 유일하게 열린 함수, 합계·개수만)
- [ ] 홈 숫자 카드 3단계(매칭 많아진 뒤) 문구 재검토: 집 수 표시, 왼쪽을 로그인 집주인 수로, "방금 매칭됐어요" 줄, 오른쪽 후보 `매칭까지 보통 n시간`
- [x] `analysis_view` 기록이 서버로 가야 "복비 계산 n회"가 나옴 (A7, 2026-10-29 연결 — 단지·평형·거래 유형 조합마다 한 번, 관리자·개발·자동 시험 접속은 서버로 안 보냄). 켜는 건 A7 대표님 줄
- [ ] **홈 '다산동 실시간 복비 계산 중' 띠**(`HomeMatchTicker`) 목업 6건(`matchCaseExamples.ts`) → 실제 매칭이 쌓이면 `getMatchCaseFeed` 안만 바꿔 `source: 'LIVE'`. 대표님 결정(2026-10-28): 그 전엔 '예시' 배지 없이 목업을 돌림 — 표시광고법상 배포 전 실데이터 교체 또는 배지 복원을 다시 판단
- [ ] **주민 투표·댓글** `INITIAL_COMMUNITY_VOTES`·`COMMENTS`(`lib/mock-analysis-data.ts`) → 실제 집계 (A8)
- [ ] **예시 의뢰·피드** `mock-requests.ts`·`mock-feed.ts`, 공유 저장소 `mockMarket.ts` → A2와 함께 제거
- [ ] **테스트 스위처 제거**: `/my-requests` 16가지, `/agent` 22가지, `/agent/register` 9가지 + 관리자 링크
- [ ] **시장 데이터**: 배포 직전 `npm run data:build` (2026-10-26 매물 CSV 아직 미반영) + `marketEngine.test.ts` 매물 총합 갱신, 건축물대장 월 1회 `units:fetch`
- [ ] **주간 자동 갱신**(합의 2026-10-24): 실거래·매물 주 1회, 6개월 창 이동, 추천값은 의뢰 시점 고정 — 수집 방법(네이버 CSV는 대표님 수동) 정하기
- [ ] 정책값(추천 범위 20/30/50% 등) 월 1회 보정은 데이터 쌓인 뒤

## D. 법무·회사 정보 (대표님)

- [ ] `COMPANY_INFO` 9개 실제 값 → `isPlaceholder: false` (상세 §1)
- [ ] `dataRegion` 서울로, 처리방침 **국외 이전 조항 삭제**(서울 리전이라 해당 없음)
- [ ] 변호사 검토: 약관·처리방침·책임의 한계, 동의 3개 요약, 서비스 이용 규칙(7일·48시간), 제8조 제재 기간 (상세 §2)
- [ ] 보존 기간 확정 ⚖️: 계약 기록 5년, 동의 증빙(탈퇴 후 3년?), 열람 기록 2년 → 정해지면 파기 작업에 추가
- [ ] Gemini 처리 위탁 표기 여부, 통신판매업 신고

## E. 배포 설정 (Cloudflare `bokbi-mvp`)

- [ ] **대표님**: Worker 비밀값 — `GEMINI_API_KEY`, `V_WORLD_MAP_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(대시보드 → API Keys의 공개 키), `CONTACT_ENC_KEY`(32바이트 무작위 base64 — 생성 방법은 그때 안내, 잃어버리면 연락처를 못 읽음 → 안전한 곳에 따로 보관), `SOLAPI_*`, 켤 때 `NEXT_PUBLIC_DATA_BACKEND=supabase`. `.env.example`에도 이름 추가 (Claude는 `.env*`를 읽지 않음). **`NEXT_PUBLIC_`으로 시작하는 값은 빌드 때 화면 코드에 박히므로 Cloudflare Build → Variables에도 넣어야 함** (2026-10-29 확인, 표는 [DEPLOY_DAY.md](DEPLOY_DAY.md) ④)
- [ ] **대표님**: 도메인 연결, VWorld 키 서비스 URL에 배포 도메인 등록
- [ ] Gemini 모델 가용성·호출 한도 확인 (상세 §1-2)
- [ ] 키 교체 주기(분기) 달력 등록

## F. 마지막 확인 (Claude)

- [ ] 360/390px 흐름 전체(집주인 의뢰 → 중개사 요청 → 매칭 → 광고 → 방문 → 계약 → 후기), 콘솔 오류 0
- [ ] 아직 손으로 안 눌러 본 화면: 거둬들이기, 잠시 멈춤 (지금은 테스트로만)
- [ ] 아이폰·안드로이드 실기기 `.ics` 캘린더 저장
- [ ] `npm run typecheck`·`npm test`·OpenNext 빌드
- [ ] 배포할 커밋의 GitHub Actions `CI`(typecheck·test·e2e) 초록 ✓ — 저장소 Actions 탭
- [x] (디자인) 색 투명도 표기 118곳 → 연한 색 토큰 `brand-line`·`brand-line-strong`·`status-caution-line` (2026-10-27, 대표님 결정: 원래 의도한 색 살리기. `colorTokens.test.ts`가 재발 막음)

---

# 상세

목업 단계에서 임시값으로 둔 항목을 배포 직전 최소 수정으로 교체하기 위한 근거와 파일.

## 1. 회사·법적 표시 정보 — `src/config/siteContent.ts`의 `COMPANY_INFO` 한 곳만 수정
값을 바꾸면 푸터 사업자 정보, 면책 고지, 이용약관, 개인정보 처리방침, 약관 모달에 자동 반영됩니다.

| 키 | 현재(예시) | 확인처 |
|---|---|---|
| `legalName` | (주)복비 | 사업자등록증 상호 |
| `ceo` | 대표자명 | 사업자등록증 |
| `businessNumber` | 000-00-00000 | 사업자등록증 |
| `ecommerceNumber` | 제0000-경기남양주-0000호 | 통신판매업 신고증 (남양주시청) |
| `address` | 경기도 남양주시 다산동 (상세 주소) | 사업장 주소 |
| `phone` / `email` | 000-0000-0000 / help@bokbi.kr | 고객 문의 채널 |
| `hostingProvider` | Cloudflare, Inc. | 실제 배포 호스팅 (확인 완료) |
| `privacyOfficer` | 보호책임자명 / privacy@bokbi.kr | 개인정보 보호법 제31조 |
| `dataRegion` | Supabase 리전 확정 전 | 새 Supabase 프로젝트 리전 (처리방침 위탁·국외 이전 표) |
| `requestRetention` | 의뢰 종료 후 30일 | 매칭 미성사 의뢰 보관 기간 (회사 정책 결정) |
| `privacyProcessors` | Supabase, Cloudflare, 솔라피 | 실제 위탁 업체·처리 국가와 일치 여부 |
| `policyEffectiveDate` | 2026년 10월 24일 | 약관 시행일 |
| `pendingFields` | 9개 | **실제 값을 넣은 키를 이 목록에서 삭제.** 남은 키는 화면에 빨간 글씨 + "수정 필요"로 표시되고 `npm test`가 목록을 경고로 출력 |
| `isPlaceholder` | `true` | **모든 값 입력 후 `false`** ('예시 정보' 배지 제거) |

- 이용약관·개인정보 처리방침·책임의 한계 문구(`SITE_CONTENT.legal`)는 법정 조항을 갖춘 **초안**. 배포 전 변호사 검토 필수.
- 외부에 개인정보 처리방침 URL을 제출할 때(카카오 로그인 앱 검수 등)는 `https://<도메인>/?legal=privacy` 사용 (모달이 바로 열림).

## 1-1. 분석 화면 매칭 사례 피드 — 예시 데이터
- `src/data/market/matchCaseExamples.ts`의 6건은 국토부 84㎡ 중위가(2026-04~) + 할인 30~45%로 만든 **예시**.
- 실제 매칭 데이터가 쌓이면 `repository.ts`의 `getMatchCaseFeed()` 내부만 Supabase `match_cases` 조회로 교체하고 `source: 'LIVE'`로 내린다 ('예시' 배지·안내는 자동으로 사라짐).
- 교체 전까지 배포할 경우 '예시' 배지 유지 필수 (표시광고법).

## 1-2. AI 추천 이유 (Gemini)
- 배포 환경 변수에 `GEMINI_API_KEY` 등록 (서버 전용, `NEXT_PUBLIC_` 접두사 금지).
- 캐시를 서버 메모리에서 Supabase `analysis_explanations`로 교체 (서버리스는 인스턴스마다 메모리가 초기화됨).
- 모델 가용성 재확인 (`src/lib/analysis/gemini.ts`의 `MODELS`, 2026-10 기준 3.5-flash → 3.8-flash). 호출량·요금 한도 설정.
- Gemini 개인정보 처리 위탁 여부를 개인정보 처리방침 `privacyProcessors`에 반영할지 법률 검토 (현재 보내는 데이터는 단지 통계뿐, 개인정보 없음).

## 2. 약관·방침 법률 검토
- 이용약관, 개인정보 처리방침, 책임의 한계 본문(`SITE_CONTENT.legal`)은 법률 검토 후 확정.
- **매칭 모달 동의 묶음 (2026-10-25)**: 4단계 인증번호 발송 전 `[필수] 이용약관 / 개인정보 수집·이용 / 매칭 확정 시 중개사에게 제공` 3개. 요약 문구(`matchingModal.step4.consents`)가 처리방침 2·3·4항, 약관 제9조와 같은지 변호사 검토. 처리방침 수집 항목에 임대 현황·근저당·방문 일정·후기·판매 중지 사유, 제3자 제공 항목에 방문 가능 시간·세입자 연락처를 추가함. 백엔드에서는 동의 시각·항목·약관 버전을 서버에 저장해야 한다(지금은 localStorage)
- **VWorld 지도 키 (2026-10-25)**: `V_WORLD_MAP_API_KEY`를 Cloudflare Worker 환경변수에도 넣어야 사무소 지도(`/api/office-map`)가 나온다. VWorld 키의 서비스 URL에 실제 배포 도메인을 등록할 것(로컬 테스트는 통과). 사무소 좌표는 중개사 가입 때 주소로 한 번 변환해 저장(지금은 목업 좌표)
- **내 의뢰 이용 규칙 조항 (2026-10-25)**: 집주인은 법적으로 일반중개계약을 언제든 끝낼 수 있으므로, 아래는 "서비스 이용 규칙"으로 약관에 넣고 매칭 확정 때 동의를 받아야 한다. ① 매칭 확정 후 7일간 취소·멈춤·거둬들이기 불가 ② 중개사 광고 등록 기한 48시간, 넘기면 집주인이 그 중개사만 해제 가능 ③ 계약 알림 후 중개사가 48시간 안에 계약일·잔금일을 알리지 않으면 집주인 입력값으로 처리 ④ 멈추기·거둬들이기 사유 수집과 이용 목적. 7일·48시간은 파일럿 데이터로 조정
- 매칭 모달 Step 5 `feeGuaranteeSupport`("동의한 복비 기록을 확인서로 보내드려요")를 쓰려면 약관에 **합의 기록 보관·의뢰인 제공** 조항과 **합의 위반 중개사 제재** 조항이 있어야 한다 (2026-10-25 약관 제8조에 "확인서 제공 + 매칭 요청 일정 기간 제한" 초안 추가, 제한 기간과 문구는 변호사 검토). 매칭 확정 시 합의 기록(제안 복비·중개사 동의 시각) 저장도 백엔드 구현 필요.
- 공인중개사법(중개행위 해당 여부), 전자상거래법(통신판매중개자 고지), 개인정보 보호법(수집·위탁·보호책임자) 항목.
