# 배포 날 순서 안내서 (DEPLOY_DAY.md)

> 2026-10-29 작성. [FINAL_PLAN.md](FINAL_PLAN.md) 4~7단계를 **실제로 누르는 순서**로 풀어 쓴 것. 근거·이력은 [PREDEPLOY_CHECKLIST.md](PREDEPLOY_CHECKLIST.md).
> 값(키·비밀번호)은 **대표님이 직접** 넣는다. Claude는 `.env*`를 읽지 않고, 채팅에 값을 붙여 넣지 않는다.
> 한 단계가 끝나면 Claude에게 "N번 끝"이라고 말하면 다음 단계로 넘어간다.

## 0. 날짜별 큰 순서

| 언제 | 할 일 | 누가 |
|---|---|---|
| 배포 2주 전 | 카카오 비즈니스 채널 개설·알림톡 템플릿 심사 신청, Solapi 가입·발신번호 등록 신청 (둘 다 심사 며칠) | 대표님 |
| 배포 1주 전 | Supabase 조직 Pro 전환, 도메인 구입·Cloudflare 연결, VWorld 키에 도메인 등록 | 대표님 |
| 배포 2일 전 | ① 데이터 새로 만들기 → ② 브랜치 시험 → ③ 승인 → 운영 DB → ④ 비밀값 | 같이 |
| 배포 1일 전 | ⑤ 로그인·문자 켜기 → ⑥ 관리자 계정·웹 푸시 → ⑦ 걷어내기 → ⑧ 실제 휴대폰 확인 | 같이 |
| 배포 당일~1주 | ⑨ 배포 직후 확인 | 같이 |

## ① 시장 데이터 새로 만들기 (Claude, 시작 전 대표님께 여쭘)

- `npm run data:build` → `marketEngine.test.ts` 매물 총합 갱신 → 타입 검사·테스트
- 외부 호출이 많아 시간이 걸린다. 시작 전에 "지금 돌려도 될까요?" 한 번 묻는다

## ② 마이그레이션 12개 브랜치 시험 (Claude, Pro 필요)

1. Supabase 브랜치 비용 확인 → **대표님께 금액 말씀드리고 승인** → 브랜치 생성 (운영 `phwirgnogphmhscjrnfn`에서 갈라짐)
2. 마이그레이션 12개 순서대로 적용 (`supabase/migrations/`, 파일 이름 날짜순)
3. `supabase/tests/seed.sql`·`permissions.sql`·`lint.sql` 실행 → 전부 통과
4. 보안·성능 점검(advisors) **경고 0**
5. 예약 작업 **3개** 확인: `bokbi-purge-expired`(매일)·`bokbi-weekly-credits`(매주)·`bokbi-admin-push`(15분, 알림 문자 시간 알림도 여기서)

## ③ 운영 DB 적용 (대표님 승인 후 Claude)

- 대표님 "운영에 적용해" → 같은 12개를 운영 DB에 → 표 개수·예약 작업 3개 다시 확인
- 브랜치는 대표님 확인 후 삭제 (비용이 계속 나가므로)
- 도쿄 `ekzmcwqvbnnmepfhbwyf`는 **건드리지 않는다**

## ④ 비밀값 넣기 (대표님)

Cloudflare → Workers → `bokbi-mvp` → Settings. **두 군데**가 있다:
- **Variables and Secrets** (실행할 때 서버가 읽음)
- **Build → Variables** (빌드할 때 화면 코드에 박힘) — 이름이 `NEXT_PUBLIC_`으로 시작하는 값은 **여기에도** 넣어야 화면에 반영된다

| 순서 | 이름 | 어디서 받나 | 넣는 곳 | 주의 |
|---|---|---|---|---|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API (`https://phwirgnogphmhscjrnfn.supabase.co`) | 실행 + **빌드** | |
| 2 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys의 공개 키(`sb_publishable_…`) | 실행 + **빌드** | |
| 3 | `SUPABASE_SECRET_KEY` | Supabase → API Keys의 비밀 키(`sb_secret_…`) | 실행(Secret) | 채팅에 붙여 넣지 않기 |
| 4 | `CONTACT_ENC_KEY` | 직접 만들기 (아래 명령) | 실행(Secret) | **잃어버리면 연락처를 못 읽음** → 비밀번호 관리 앱에 따로 보관 |
| 5 | `EVENTS_HASH_SECRET` | 직접 만들기 (아래 명령) | 실행(Secret) | 한 번 정하면 바꾸지 않기 |
| 6 | `PUSH_TICK_SECRET` | 직접 만들기 (아래 명령) | 실행(Secret) | ⑥에서 Vault에도 같은 값 |
| 7 | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY`·`VAPID_SUBJECT` | `.env.local`에 있는 값 그대로 | 공개 키는 실행 + **빌드**, 나머지 실행(Secret) | 바꾸면 관리자 기기 다시 켜야 함 |
| 8 | `GEMINI_API_KEY`·`V_WORLD_MAP_API_KEY` | 이미 등록됨 — 남아 있는지만 확인 | 실행(Secret) | |
| 9 | `SEND_SMS_HOOK_SECRET` | ⑤-3에서 Supabase가 만들어 줌 | 실행(Secret) | ⑤ 때 넣음 |
| 10 | `SOLAPI_API_KEY`·`SOLAPI_API_SECRET`·`SOLAPI_SENDER` | Solapi 콘솔, 발신번호 | 실행(Secret) | ⑤ 때 넣음 |
| 11 | `NEXT_PUBLIC_DATA_BACKEND` = `supabase` | — | 실행 + **빌드** | **맨 마지막**(⑤-5). 이걸 켜야 실제 서버로 바뀜 |

무작위 값 만드는 명령 (4·5·6에 각각 한 번씩, 매번 다른 값이 나옴):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

로컬 `.env.local`에도 같은 이름으로 넣고, `.env.example`에는 **이름만** 추가한다 (대표님).

## ⑤ 로그인·문자 켜기 (같이)

1. Supabase → Authentication → Sign In / Providers → **Phone 켜기**, 인증번호 유효 시간 180초
2. 같은 화면 **테스트 번호**: 대표님 번호 하나 = `123456` (문자 안 나감) → 이 번호로 `/login`·매칭 요청·중개사 가입이 되는지 먼저 확인
3. Authentication → Hooks → **Send SMS hook** → HTTPS `https://<도메인>/api/auth/sms-hook` → 비밀값 생성 → ④-9 `SEND_SMS_HOOK_SECRET`
4. ④-10 Solapi 키 3개 넣기
5. 테스트 번호를 지우고 **실제 번호 1개로 인증 문자 수신 확인** → 그다음 ④-11 `NEXT_PUBLIC_DATA_BACKEND=supabase` → 다시 배포
6. Authentication → Rate Limits(문자 시간당 한도)·봇 확인(Captcha) 켜기 — 문자 폭탄 방지

## ⑥ 관리자 계정·웹 푸시 (대표님, Claude가 옆에서 안내)

1. Authentication → MFA에서 TOTP 켜져 있는지 확인 (기본 켜짐)
2. 대표님 휴대폰으로 `/login` 한 번 (계정 생김)
3. Supabase SQL에서 대표님 계정을 관리자로: `update public.profiles set role = 'admin' where id = '<대표님 user id>';` (user id는 Authentication → Users)
4. `/admin` → 인증 앱 등록 → 6자리로 들어가기
5. 웹 푸시 자동 발송 Vault 등록 (Supabase SQL):
   ```sql
   select vault.create_secret('https://<도메인>/api/admin/push-tick', 'bokbi_push_tick_url');
   select vault.create_secret('<④-6과 같은 값>', 'bokbi_push_tick_secret');
   ```
6. `/admin` 시스템 탭 → 이 기기 알림 켜기 → 시험 알림 → 15분 안에 자동 알림이 오는지
7. 휴대폰을 잃어버리면: Authentication → Users → 대표님 → MFA 인증 삭제 → 4번부터 다시

## ⑦ 목업·테스트 화면 걷어내기 (Claude)

아래 "걷어낼 목록" 참고. 대표님이 방식을 고른 뒤 코드 수정 → 타입 검사·테스트·e2e → 커밋.

## ⑧ 실제 휴대폰으로 처음부터 끝까지 (Claude + 대표님 휴대폰)

| # | 확인할 것 | 통과 기준 |
|---|---|---|
| 1 | 집주인: 홈 → 단지 검색 → 분석 → 매칭 요청(인증 문자) | 내 의뢰에 방금 의뢰만 보임 (예시 의뢰 없음) |
| 2 | 중개사: 가입 신청 → 관리자 확인 → 승인 문자 | 피드에 1번 의뢰가 보임, 동·호수·연락처는 가려짐 |
| 3 | 중개사 요청 보내기 → 집주인에게 "첫 요청" 문자 | 크레딧 1 줄어듦 |
| 4 | 집주인 선택 → 중개사에게 "매칭 확정" 문자 | 고른 곳에만 동·호수·연락처 |
| 5 | 광고 등록 → 방문 → 계약 → 잔금 → 후기 | 방패·별·인정 칩 갱신 |
| 6 | 360·390px, 콘솔 오류 0, 아이폰·안드로이드 캘린더 저장 | |

**알림 문자 6가지 실제 수신** (대표님 번호로 한 번씩, 길면 줄일지 그때 판단):

| # | 문자 | 받는 사람 | 만드는 법 |
|---|---|---|---|
| 1 | 첫 요청 도착 | 집주인 | ⑧-3 |
| 2 | 매칭 확정 | 고른 중개사 | ⑧-4 |
| 3 | 가입 승인 / 반려 | 신청자 | ⑧-2 (반려는 두 번째 신청으로) |
| 4 | 허위 매물 판정 | 신고한 중개사 | 신고 → 관리자 판정 |
| 5 | 요청 받는 시간 끝 | 집주인 | 의뢰 시간이 지난 뒤 15분 안 |
| 6 | 광고 기한 6시간 전 | 안 올린 중개사 | 매칭 뒤 광고를 안 올리고 기다림 |

마지막: 타입 검사·테스트·배포 빌드, GitHub CI 초록.

## ⑨ 배포 직후 (당일~1주)

- 관리자 웹 푸시 시험 알림 한 번
- Cloudflare 요청 수 제한 규칙 1개: `/api/events` IP당 분당 60번
- 관리자 지표 탭에 방문·복비 계산이 실제로 쌓이는지
- 실제 매칭이 생기면 홈 띠를 실데이터(LIVE)로
- 매주 매물 수집 파일 반영 `npm run data:asking`

---

## 걷어낼 목록 (⑦, 2026-10-29 조사)

**먼저 결정할 것 — 지우기 vs 숨기기.** 자동 화면 시험(e2e)이 테스트 스위처 버튼(`qa-approve`, `qa-ownerPicksOther`)으로 돌고 GitHub CI도 이걸 씀.
- 추천: **실제 서버 모드(`supabase`)에서만 숨기기.** 브라우저 저장소 모드(개발·CI)에서는 그대로. 이유: 배포 화면엔 안 보이고, 자동 시험은 계속 돈다. 코드 한 줄 조건이라 되돌리기 쉬움
- 대안: 완전히 지우기 → e2e를 실제 Supabase 시험 환경으로 다시 짜야 함 (일이 큼)

| # | 무엇 | 어디 | 실제 서버 모드에서 지금 | 할 일 |
|---|---|---|---|---|
| 1 | **내 의뢰 예시 의뢰** (`BK-DEMO-0001`) | `useOwnerRequest.ts` 63행 — 저장된 요약이 없으면 `demoRequest`로 시작 | **의뢰 없는 사람에게 예시 의뢰가 진짜처럼 보임** | 실제 서버 모드에선 빈 화면("아직 의뢰가 없어요" + 홈으로) |
| 2 | 내 의뢰 테스트 스위처 16가지 | `app/my-requests/page.tsx` 285행 `OwnerQaSwitcher` | 보임 | 숨기기 |
| 3 | 중개사 테스트 스위처 22가지 | `AgentWorkspace.tsx` 177·214행 `QaSwitcher` | 보임 | 숨기기 |
| 4 | 중개사 가입 스위처 9가지 + 관리자 링크 | `BrokerSignupFlow.tsx` 152행~ (284행 `/admin/brokers` 링크) | 보임 | 숨기기 |
| 5 | 관리자 가입 목록 예시 | `AdminBrokerReview.tsx` 179행 | 이미 `local`에서만 | 없음 |
| 6 | 중개사 피드 예시 의뢰 | `components/data/repos.ts` 28행 `demoFeedRequests` | 이미 `local`에서만 | 없음 |
| 7 | 복비 특약 만들기의 예시 의뢰 | `SpecialTermsBuilder.tsx` 120행 `demoFeedRequests` | 의뢰 id로 찾을 때 예시에서만 찾고(120행), 승인 여부도 브라우저 저장소에서 읽음(108행) → **실제 의뢰·승인 상태를 못 찾을 수 있음** | 실제 서버 모드에선 저장소(`repos`)에서 찾기 (⑦ 때 고침) |
| 8 | 홈 "실시간 복비 계산 중" 띠 목업 6건 | `matchCaseExamples.ts` → `repository.ts` | 보임 (배지 없음) | FINAL_PLAN 2-4 결정대로 (예시 배지 or 실데이터) |
| 9 | 주민 투표·댓글 초기값 | `lib/mock-analysis-data.ts` | 보임 | A8 (배포 뒤로 미룸, 2-7) |
| 10 | `mockMarket.ts` | `lib/broker/` | — | **지우지 않음**: 이름만 mock이고 브라우저 저장소 모드의 실제 저장 코드·타입 |

예시 데이터 파일(`mock-requests.ts`·`mock-feed.ts`)은 테스트 20여 개가 쓰므로 파일은 남기고 **화면에서 부르는 곳만** 막는다.
