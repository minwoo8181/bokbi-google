# 📘 복비(Bokbi) 인수인계서 (HANDOVER.md)

> **새 세션은 이 파일만 읽고 시작한다.** 상세는 아래 "문서 지도"에서 지금 작업과 관련된 파일만 연다 (세션 시작 토큰 절약, 2026-10-24 개편).  
> **프로젝트 루트**: `c:\Users\dlwhd\Downloads\bokbi ver4- 클로드` (개발 서버 `http://localhost:3004`)  
> **원격 저장소**: `https://github.com/realminuu-web/bokbi-.git` (main, push 계정 `realminuu-web`)  
> **스택**: Next.js 15.5 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide React, Vitest, Gemini API(서버 전용)  
> **개발 상태**: Phase 1(메인) · Phase 2(분석 — 실데이터·엔진 v4·AI 설명) · Phase 3(6단계 모달·동의) · Phase 4(내 의뢰 — 익명 선택·방문 시간·판매 상태·계약·다시 요청, 목업 저장) · Phase 5 ①~⑥(잘하는 점·후기 칩, 중개사 가입·관리자 확인, 요청 피드, 매칭 관리, 방문 일정·캘린더, 거래 페이지·후기 → 크레딧 돌려받기, 거래금액 변경 복비 재계산) 구현 완료. 디자인 정리 진행 중(내 사무소·피드 완료, 집주인 카드 남음)

---

## 🚦 현재 진행 상황 (새 세션은 여기부터 읽기)

> 세션을 마칠 때마다 이 섹션을 갱신하고 커밋한다.

- **최종 갱신**: 2026-10-29 4번 데이터·서버 준비 끝 (A7 `b1a633b` · A4 `b8af820` · A6 이 커밋, 모두 push 안 함). 이전: 3번 관리자 1차. **`aa33024`까지 push, 그 뒤 `3e1e5a0`(추천 기준 버전 저장)·`1eb61de`(관리자 A안 + PC 대시보드)·이 문서 커밋은 push 안 함**. 요약 [history.md](docs/handover/history.md) 맨 위, 결정 메모리 `admin-console-decisions`
- **중개사 화면 A 완료 `53c0c0f`** (push 안 함): 긴급 알림(`TodoFirstBanner`)이 새 의뢰·내 사무소 맨 위(내 매물은 자기 빨간 상자 + 아이콘 숫자), 내 사무소 맨 앞 "이번 달 내 성과"(보냄→고름→계약·계약 보수) + 집주인이 인정한 장점. **"우리 단지" 탭은 대표님이 MVP 성공 뒤로 미룸**
- **문의하기 완료 `d6f6fba`** (push 안 함): 시트 = 자주 묻는 질문(집주인 10·중개사 5, 3개 + 더 보기, 답 문구 2026-10-29 코드와 대조해 확정 `SITE_CONTENT.support.faq`) → 내 문의(답) → 양식(주제·의뢰 한 줄·내용, 본문 전화번호 자동 가림). 입구: 내 의뢰 아래 · 내 정보 관리 정정 줄(예전 메일 링크 대신) · 중개사 내 사무소 아래. 관리자: 오늘 할 일 `INQUIRY`(10일) + 의뢰 탭 "문의"(자주 쓰는 답, 답 1번). 목업 저장소, 답 알림은 서버 뒤. 카톡 문의는 계속 보류
- **A2'' 완료 `de84474`** (push 안 함): 저장소 `admin.applications`·`decideApplication` → 중개사 탭이 가입 신청 목록(확인 대기 먼저) → 한 건 가입 확인. Supabase는 기존 RLS + `approve_broker`(마이그레이션 추가 없음), 계약 테스트 브라우저·PGlite 통과. 오늘 할 일·배지·지표도 목록 전체로 셈. 크레딧 주기는 아직
- **A5 완료** (push 안 함, C안): `/admin` 관문 = 로그인 → 관리자 계정 → 인증 앱 등록(휴대폰은 "인증 앱에 추가하기" 버튼, PC는 QR) → 들어올 때마다 6자리. 관리자가 아니면 404, 브라우저 저장소 단계 배포 빌드는 계속 404. 시스템 탭에 개인정보 열람 기록. 개발 미리보기 `/admin?mfa=ENROLL`·`VERIFY`(123456). 켤 때 대표님 할 일은 체크리스트 A5 다음 줄
- **관리자 웹 푸시 1·2단계 완료** (push 안 함): 시스템 탭 맨 위 "알림 받기"(이 기기 켜기·끄기·알림 종류 4개·시험 알림, 아이폰은 홈 화면에 추가한 앱에서만) + 보낼 규칙 `lib/admin/push.ts` + 기기 표 마이그레이션(8번째, 미적용). 실제 크롬으로 시험 알림 표시까지 확인. 대표님 VAPID 키는 `.env.local`에 있음(시스템 탭 "설정됨")
- **웹 푸시 3단계 자동 발송 완료** (push 안 함, 대표님 A안·15분): Supabase 예약 작업 → `/api/admin/push-tick`(비밀값) → 서버 키로 읽어 관리자 화면과 같은 규칙으로 할 일 계산 → 보내기 + 하루 한 번 기록. 서버 키는 이 경로 한 곳만(테스트가 막음). 마이그레이션 9번째(미적용). 켜는 순서는 체크리스트 A "웹 푸시 자동 발송 켤 때"
- **A7 행동 기록 완료** (push 안 함, 대표님 추천안 3개 승인): 기록 27개(방문·단지 검색·FAQ·문의·크레딧 고른 항목 추가) 화면·서버 연결 → `/api/events`가 다시 검사 + HMAC 가명 해시 → 서버 키로 `events`. 검색어·문의 내용 원문 X, 개발·localhost·자동 시험·관리자 브라우저는 서버로 안 보냄. 켤 때 대표님 할 일 `EVENTS_HASH_SECRET`(체크리스트 A7). 마이그레이션 10번째(이름 목록, 미적용)
- **A4 중개사 가입 서버화 완료** (push 안 함, 대표님 추천안 3개 승인): 서버 액션이 명단 대조 다시 + 확인 코드 발급(DB엔 해시, 원문은 그 휴대폰에만) · 다른 휴대폰은 "새 확인 코드 받기"(캔버스 맨 아래 A4 A안, 테스트 스위처 `다른 휴대폰(코드 없음)`) · 잠금 DB `private.signup_fails` · 이미 가입 확인 · 반려된 신청은 새 신청이 덮어씀. 마이그레이션 11번째(미적용)
- **A6 가입 동의 서버 저장 완료** (push 안 함, 대표님 "휴대폰 인증 직후"): 동의 3개 → `consents`(BROKER_SIGNUP, 같은 약관 버전은 한 번). 마이그레이션 추가 없음
- **2026-10-29 밤 1·2단계 세션 (멈춘 자리)**: 2-5 투표 창 파란 버튼 뺌 `3aeac06` · 2-3 FAQ 확정 + **하루 3곳 제한 없앰**(대표님 "정한 적 없음", 코드·RPC·약관 9조) `805163c` · 2-2 VWorld "가능함" · 2-4 시안 4개 캔버스 맨 아래(A 추천, 선택 대기). **내일 이어서**: 2-4 고르기 → 반영 → 2-7 끝장 투표 표를 서버에 모으기(지금은 브라우저에만, 행동 기록에 한 줄 더하는 안) 결정 → 1-2 거리 구간 Supabase · 1-3 관리자 키 점검 줄(시안 먼저) · 1-5 거둬들이기·잠시 멈춤 직접 누르기 · 1-6 첫 화면 용량. 2-1·2-6은 추천대로 미룸
- **남은 작업 계획표 = [FINAL_PLAN.md](docs/FINAL_PLAN.md)** (2026-10-29, 7단계: 디테일 → 대표님 결정 → 법무 → 유료 준비 → 배포 직전 켜기 → 마지막 확인 → 배포 직후). 1-1 A10 실적 집계 끝(2026-10-29, 거래 기록 뒤 서버가 다시 셈, 마이그레이션 12번째) · 1-4 알림 문자 코드 끝(핵심 6개, Solapi 키만 꽂으면 보냄) → 남은 코드는 선택 항목(1-2·1-3·1-5·1-6), 나머지는 대표님 결정·법무·배포 날
- **배포 단계 준비 (2026-10-29)**: 배포 날짜 미정, 4단계 유료 준비(Pro·Solapi·카카오·도메인) 아직 0개 → 무료 준비만 끝냄. **배포 날 순서·비밀값 표·걷어낼 목록 = [DEPLOY_DAY.md](docs/DEPLOY_DAY.md)**. PGlite 마이그레이션·권한 시험 46/46 통과. 걷어내기 때 꼭 고칠 것: supabase 모드에서 의뢰 없는 사람에게 예시 의뢰(`BK-DEMO-0001`)가 보임(`useOwnerRequest.ts`), 복비 특약이 예시 의뢰·브라우저 승인 상태로만 찾음. 스위처는 "supabase 모드에서만 숨기기" 추천(e2e가 씀, 대표님 결정 대기). 날짜가 잡히면 DEPLOY_DAY 0번 표부터
- **5번 묶음 배포 직전** (대표님 컨펌 후): `data:build`, Supabase 전환 + 마이그레이션 12개, 비밀값(`EVENTS_HASH_SECRET`·`SUPABASE_SECRET_KEY` 등), 유료 서비스, 처리방침. 4번 묶음은 실제 Supabase로는 아직 안 돌려 봄(PGlite 시험만) 시안은 전부 캔버스 맨 아래 줄들(관리자 A안 · 다음 단계 · PC 대시보드 v2 · 중개사 화면 전체 A/B)
- **디자인 통일 규칙 (2026-10-29, 새 화면 필수)**: 글자 크기 12·13·15·17·20·26·40만, 간격 4의 배수(`typeScale.test.ts`가 막음) · 작은 글씨 색: 연파랑 위 `text-brand-hover`, 연초록 위 `text-[var(--status-good-strong)]`, 빨강 글씨 `text-[var(--status-risk-strong)]`, 연노랑 위 `--status-caution-strong`, 회색 보조 `text-text-tertiary`(#636E7B) · 큰 버튼 `rounded-xl` · 고르는 칸은 `segmentStyles`(회색 틀+흰 알약) 또는 `FLOOR_CARD`(테두리 카드) · 시안은 캔버스(위 링크)에 올려 고른다
- **후순위 할 일 — 카카오 문의 버튼 (대표님 2026-10-29 미룸)**: 홈 맨 아래·내 의뢰 아래·중개사 내 사무소 아래에 "카카오톡으로 문의하기" 한 줄(시안 3개부터). 연결 규칙은 이미 있음 `lib/support/inquiry.ts` — `COMPANY_INFO.kakaoChannelUrl`(배포 직전 입력)이 있으면 카카오, 없으면 보호책임자 메일. 내 정보 관리 "문의하기"가 같은 규칙을 씀
- **대표님 결정 대기**: 매칭 전 소유자 확인 방법(체크리스트 A 🧭, 메모리 `owner-verification-decision`) · VWorld 약관에서 거리 구간 이름만 저장해도 되는지 · 거리 구간 Supabase 연결은 서버화 때
- **마이그레이션 `20261027120000_owner_change_price.sql` 미적용** (매칭 뒤 희망가 바꾸기용). 운영 DB는 테이블 0개라 이것만 따로 적용할 수 없음 → **배포 직전 Supabase로 바꿀 때 마이그레이션 12개를 한 번에**(2026-10-29 관리자 웹 푸시 기기·자동 발송 2개 + 행동 기록 이름 1개 + 중개사 가입 서버화 1개 추가) (대표님께 설명함 2026-10-27). PGlite 시험 통과, 지금 local 모드는 정상
- **디자인 정리 방식 (계속)**: 레퍼런스 시안 → 대표님 선택 → 화면 하나씩 360·390px 전후 비교 → "확정" → 문서 갱신·커밋. 기준 = 메모리 `design-rules-calm-ui`(색 절제·**빨강 할 일만 긴급 알림 상자 예외**·이모지 금지·섹션 구조·주 버튼 하나·닫기는 X·한국어로만 설명) + `design-picks-2026-10-27`. **새 화면은 집주인·중개사 쪽 같은 역할 화면을 나란히 놓고 시안을 그린다**
  - 끝난 화면: **홈**(2026-10-28, 아래 홈 줄) · 분석 화면(호가 "팔린 값 vs 부르는 값" · **끝장 투표** G안) · 매칭 요청 창 · **내 의뢰 전체**(현황판 칩 · 긴급 알림/곧 확인할 일 · 진행 중인 부동산 · 사무소 시트 · 해제 창 · 방문 설정 · 판매 설정) · **중개사 내 매물**(긴급 알림 → 안내 → 곧 할 일 → 진행 중 매물 → 결과 기다리는 요청) · **중개사 새 의뢰**(긴급 알림 → 안내 → 요청 가능한 매물 → 요청 보낸 매물) · **중개사 내 사무소**(프로필 카드·약속 레벨 → 복비 특약 → 크레딧 → 지난 요청 30일) · **복비 특약 만들기**(머리 카드 + 전부 빼기) · **거래 페이지 집주인·중개사**(A안: 머리 카드 `DealHero` → 지금 할 일 → 합의 확인서 `AgreementReceipt` → 기록 → 자주 쓰는 것). · **중개사 가입**(2026-10-28: 사무소·본인 확인 → 잘하는 점 → 약속, 운영팀 전화·실사 안내, 예시는 칩 4개 + 세 줄 시트, 상세 [phase5-broker-signup.md](docs/handover/phase5-broker-signup.md) 8절 끝). 아직 안 한 화면: 관리자. 상세 [owner-flow.md](docs/handover/owner-flow.md) 2번 · [phase5-broker-matching.md](docs/handover/phase5-broker-matching.md) 화면 표 · [analysis.md](docs/handover/analysis.md)
  - **공용 부품 (새 화면도 이걸로)**: 상태 `common/StatusPill` · 빨강 할 일 `common/UrgentAlert` · 노랑 할 일 줄 `TodoRow` · 닫기 `common/CloseButton`(모든 시트·창 오른쪽 위 X, 아래 닫기 버튼 없음) · 카드 이동 버튼 `common/cardStyles.CARD_ACTION` · 선택 줄 `segmentStyles` · 개수 `SECTION_COUNT`. 지도 [COMPONENT_MAP.md](docs/COMPONENT_MAP.md)
  - **거래 페이지 완료 (2026-10-27 A안)**: 두 화면 같은 틀, 색 띠 → 머리 카드 제목 + 동그라미 `매칭·광고·계약·잔금·후기`(`lib/deal/dealStep.ts`), 합의 확인서 영수증(글자 14px 하나·굵기 두 가지, 대표님), 계산 변화 없음. 상세 [phase5-broker-matching.md](docs/handover/phase5-broker-matching.md) 2번 표
  - **분석 화면 호가 반영 완료 (2026-10-27)**: 카드 제목 `팔린 값 vs 부르는 값`, 줄 `지금 부르는 값` + `{층}매물 n건 · 날짜 기준`, 그래프 달마다 호가 노랑 띠, 저·중·고 표기 매물은 확실할 때만 층 탭에. **매주 매물 수집기 파일이 오면 `npm run data:asking`** (외부 호출 없음, data:build와 별개). **화면에 네이버를 출처로 쓰지 않음**(대표님, 테스트가 막음). 상세 [analysis.md](docs/handover/analysis.md) 실거래 · 호가 카드
  - **세션별 진행 순서 (대표님 확정 2026-10-27)** — 한 세션에 한 묶음, 각 화면은 시안부터:
    1. ~~분석 화면 마지막 결정~~(끝장 투표 G안 + 대장 배틀 30평대, 2026-10-27) + ~~홈 디자인 마무리~~(2026-10-28 완료)
    2. ~~중개사 화면 + 집주인 화면~~ (2026-10-28~29 완료: 가입·`PromiseLevel`·내 집 예시·후기 쓰기·인정한 장점·거리 구간·내 정보 관리. 카카오 문의 버튼만 후순위)
    2-1. ~~홈(메인) 화면 다듬기~~ (2026-10-29 완료, 아래 홈 줄)
    3. **← 진행 중** 관리자: ~~화면 디자인·탈퇴 요청 오늘 할 일~~(2026-10-29 `1eb61de`) → ~~중개사 화면 A~~(`53c0c0f`, 우리 단지 탭 제외) → ~~문의 양식·답변~~(`d6f6fba`) → ~~A2'' 가입 목록 Supabase~~(`de84474`) → ~~A5 2단계 인증~~ → ~~웹 푸시 받기·규칙~~ → ~~웹 푸시 자동 발송~~ (3번 끝)
    4. ~~데이터·서버 준비~~ (2026-10-29 끝): ~~A7 행동 기록~~(27개 연결 + `/api/events` 가명 해시 저장) → ~~A4 중개사 가입 서버화~~(코드 서버 발급·해시, 잠금 DB, 이미 가입, 다른 휴대폰 새 코드 A안) → ~~A6 가입 동의 서버 저장~~(휴대폰 인증 직후 `consents`)
    5. 배포 직전(`data:build`, Supabase 전환 + 마이그레이션 12개, 유료 서비스, 처리방침) — [PREDEPLOY_CHECKLIST.md](docs/PREDEPLOY_CHECKLIST.md)
  - **중개사 신호 세 가지 (2026-10-29 확정)** = 방패(`PromiseLevel` 약속 레벨, 거래 기록) · 별(후기 평균, 3건부터) · 인정(후기 칩 중 실어 보낸 강점의 짝) + 익명 카드 `집주인이 인정한 장점` 펼치기 · `단지에서 n 안` 거리 칩. 상세 메모리 `trust-signals`, 화면 [owner-flow.md](docs/handover/owner-flow.md). "아껴요·절약" 금지 규칙은 **2026-10-29 대표님이 없앰**(`savingCopy.test.ts` 삭제). 지금 화면은 대부분 "낮아요·낮게"이고, 홈(알약·숫자 카드)은 "절약"
  - 대기: 전세 호가(지금 138건, 더 쌓이면) · 대장 배틀 짧은 이름 표는 단지가 늘면 `complexShortNames.ts`에 추가
  - **홈 완료 (2026-10-28 → 2026-10-29 다듬기 확정, 캔버스 https://claude.ai/artifact/EMwLv6NbXxWHTMtrZpaV63)**: 머리줄 고정(페이지 회색 바탕·선 없음, 로고 `common/BrandLogo`) → 섹션마다 둥근 흰 카드 + 회색 틈 12px. ① "단지 이름만 입력하면, **적정 복비**를 알려 드릴게요" + 파랑 돋보기 명패 검색창 "단지 이름 (예: 다산자이)" + 안심 한 줄·이용 방법 + 진행 중 의뢰 이어보기 + 맨 아래 매칭 알약 "{단지} {평} {거래} · {금액} 절약"(`HomeMatchTicker`, 입력 중·동작 줄이기면 멈춤) ② "우리 단지 복비, 이만큼 아낄 수 있어요": 단지 칩 3개(아이비플레이스·힐스테이트다산·롯데캐슬, `homeComplexExamples`) → 큰 금액 + ↓ + 초록 상자 "30% 낮게 정하면 한 집 평균 이만큼 절약" + 막대 한 줄(30% 낮춘 값 / 법정 상한) + "최근 1년 실거래 n건 · 복비 엔진 기준" (107억·평균/최고·월별 막대·매매/전세/매물 칸은 대표님 승인으로 뺌) ③ "복비, 왜 다를까요?" 연파랑 네모 번호 + 제목 옆 칩(상한 안에서·안심 매칭·최대 3곳) + 자세히 보기 ④ 중개사 카드: 파랑 바탕 + 흰 알약 "다산동 공인중개사인가요?" + 버튼 하나 "파트너 중개사 혜택 보기"(→ 중개사 이용 방법 시트 → 가입) ⑤ 바닥글 4줄 왼쪽 정렬(약관·처리방침·내 정보 관리 / 사업자 정보 / 통신판매중개자 고지 / ©). **주 버튼 "우리 집 복비 얼마?"는 바닥 고정 흰 띠(`HomeFloatingCta`, 누르면 검색창으로)** — 카드 안 버튼은 뺌(단지를 고르면 바로 분석). 상세 [history.md](docs/handover/history.md) 맨 위
  - **분석 화면 (2026-10-29)**: 평형·층은 흰 카드 한 장 "평형·층 고르기"(테두리 카드, 층 칸엔 층·가격만, 건수는 아래 한 줄) · 끝장 투표 제목 "{짧은 단지명} 끝장 투표" · 고정 바 법정 상한 빨간 취소선 + 빨간 "27%↓"(대표님이 정한 빨강 예외) · "무료 매칭"은 사실 문구라 그대로
  - **전체 화면 영향**: 화면 틀 `overflow-x: hidden`이 sticky를 막고 있었음 → `clip`(globals.css). 이제 모든 화면 머리줄이 스크롤해도 붙음(e2e 통과, 내 의뢰·거래·중개사 화면은 눈으로 다 보진 않음)
  - 화면 확인은 **3005번 `bokbi-verify`**(`.next-verify`)로: 다른 세션의 3004 dev 서버는 `tailwind.config` 변경을 다시 읽지 않아 새 색 토큰이 회색으로 보임. 새 색이 필요하면 config보다 기존 토큰을 쓴다
  - 내 의뢰 테스트 스위처는 매칭된 예시를 고르면 저장소에도 매칭을 남김. 매칭 모달에서 실제로 요청을 보내 본 브라우저는 그 요청이 예시 의뢰(BK-DEMO-0001)를 가리니, 예시로 시험할 땐 `bokbi_active_request_summary`를 지운다
- **최종 목표**: 복비 시스템의 목표·정의에 맞춘 MVP 배포 → 실사용 검증 → VC 투자 제안
- **매칭 모달 분리 (2026-10-26 밤)**: 1,947줄 → 껍데기 `MatchingBottomSheetModal.tsx`(74줄) + `components/analysis/matching/`(상태 `useMatchingForm.ts`, 단계 화면 `Step*.tsx`·2단계 `OccupancySection`·`MortgageSection`, 모두 260줄 이하) + 계산 `lib/requests/{matchingMask,moveIn,modalStep}.ts`(테스트 21개). 화면·동작 변화 0: 6단계 전체를 자동으로 돌려 모달 HTML 13곳과 저장된 요청서가 분리 전과 같음을 비교(스크립트는 줄 범위를 그대로 옮김, JSX 재작성 없음). 정리 대기(LEGACY)는 4개로
- **화면 흐름 자동 확인 (E2E, 2026-10-26 밤)**: `npm run e2e` (Playwright·Chromium, 3004 dev 서버 재사용, 새 브라우저 상태라 내 저장값과 무관, 약 15초). ① 집주인 매칭 모달 6단계 → 중개사 승인·피드·요청 시트(동·호수·이름·전화 가려짐) → 요청 보내기(크레딧 3→2) → 집주인 4번 제안 확정 → 양쪽 거래 페이지에 실제 동·호수·전화 ② 다른 중개사가 선택되면 내 화면 어디에도 개인정보 없음. 검사가 진짜 잡는지: 가린 값에 실제 호수를 넣는 고장을 일부러 내면 2개 모두 실패함을 확인. 흐름에 닿는 변경은 `bokbi-component` 검증 순서대로 e2e도 돌린다
- **GitHub 자동 검사 (CI, `.github/workflows/ci.yml`)**: main push·PR마다 `check`(typecheck·test)와 `e2e`(Playwright)가 동시에 돎. 비밀 값 없이 local 모드, 같은 브랜치 새 push면 이전 실행 취소, 문서(`*.md`·`docs/`·`.claude/`)만 바뀐 push는 건너뜀(비공개 저장소 무료 월 2,000분). **e2e는 Playwright 공식 이미지(`mcr.microsoft.com/playwright:v1.56.1-noble`)에서 돎 — 브라우저 설치 단계 없음 (`86e36b7`, 2026-10-27): 1회 12분 31초 → 2분 9초** (e2e 작업 124초 = 이미지 받기 33·npm ci 28·테스트 49초, check 81초, 실행 40436261714). `@playwright/test`를 올리면 이미지 태그도 같이 — `ciPlaywrightImage.test.ts`가 어긋나면 실패시킴. 참고: GitHub가 checkout·setup-node v4의 Node 20 지원 종료 경고를 띄움(지금은 동작, 나중에 v5로). 실패하면 push한 계정에 메일, 실행 화면 맨 아래 `e2e-results` 첨부(스크린샷·trace, 7일)로 원인 확인 — trace는 `npx playwright show-trace <zip>`. GitHub에서만 재시도 1번(통과해도 flaky 표시)
- **연한 색 토큰 (2026-10-27)**: 반투명 표기 118곳(`border-brand/30` 등)은 색이 `var()`라 Tailwind가 무시해 화면에 안 그려지고 있었음(회색 테두리·투명 배경) → 대표님 결정으로 원래 의도한 색 살림. 새 토큰 `brand-line`·`brand-line-strong`·`status-caution-line`(globals.css, 브랜드색에서 계산) + 기존 `brand-subtle`·`brand-light`·`brand-glow`. 결과: 선택 칩·펼친 칸 테두리가 연한 파랑. `colorTokens.test.ts`가 `/숫자` 재발을 막음
- **검증 상태**: 타입 검사 · 테스트 876개 · E2E 2/2 통과 (2026-10-29 A10·알림 뒤, 화면 변화 없음 — 내 의뢰 360·390px 가로 스크롤·콘솔 오류 없음). 이전: 868개 (A6 뒤, 3005에서 인증 직후 동의 3줄 저장·360·390px 확인). 이전: 864개 (A4 뒤, 3005에서 가입 신청 → 서버 발급 코드 표시 · 다른 휴대폰 새 코드 360·390px 확인). 이전: 857개 (A7 뒤, 3005에서 360·390px 가로 스크롤·콘솔 오류 없음, 홈 검색 → 분석·중개사 피드 기록 쌓임 확인). 이전: 756개 (2026-10-29 홈 다듬기 확정 때도 같음, 360·390px 홈 가로 스크롤 없음. 이전: 내 정보 관리 후, 360·390px 가로 스크롤·콘솔 오류 없음, 3005 `bokbi-verify` 서버). 거리 구간 지오코딩은 2.5초 제한(늦으면 칩 없이 요청). 이전: 729개(2026-10-28 밤), 728개(홈 완료 후). 이전: 717개(2026-10-27 호가 반영 후, 사무소 시트 복사 버튼은 실기기 미확인). 이번 세션은 `npm run build`를 돌리지 않음(3004 서버와 `.next` 공유) — push 전 CI가 빌드 대신 typecheck·test·e2e를 돎. 이전: 테스트 626개(층 세그먼트까지). 빌드는 색 토큰 커밋 때 통과. 이전: 테스트 603개(A2' 19개 추가, DB 시험 PGlite·계약 18/18·SQL 172/172 포함) · 빌드 통과. A2' 브라우저 확인(360/390px, 콘솔 오류 0): 거래 페이지 동·호수·전화·열람 기록 1줄, 내 의뢰 진행중·계약 완료, 매칭 모달 제출(local), 다시 요청 채우기 성공·실패. 전체 테스트를 한꺼번에 돌릴 때 계약 테스트 1개가 PGlite 시간 초과로 가끔 실패(단독 실행 통과) — 부하 문제. 이번 밤 브라우저 확인(360/390px, 콘솔 오류 0): 홈 숫자 카드 1단계, 매칭 모달 4단계·중개사 가입 인증, `/login` → 테스트 인증 → 돌아가기. **미확인**: 실제 Supabase 로그인·문자 발송(배포 직전), 홈 카드 2단계 실데이터(테스트·임시 값으로만), 거둬들이기·잠시 멈춤 화면 직접 누르기, 실기기 .ics
- **배포 전 할 일 전체 = [docs/PREDEPLOY_CHECKLIST.md](docs/PREDEPLOY_CHECKLIST.md)** (담당·순서·체크박스). **대표님 결정: 유료(Supabase Pro·Solapi·카카오)는 전부 배포 직전** — 그 전엔 무료로 할 수 있는 것만, 키만 꽂으면 되게
- **지금 상태 한 줄**: Supabase 코드(테이블·권한·저장소·연락처 암호화·로그인·문자)는 다 있고 PC에서 시험 통과. **스위치 `NEXT_PUBLIC_DATA_BACKEND` 기본 `local`이라 화면은 여전히 브라우저 저장소 + 흉내 인증**. 운영 DB(서울)는 테이블 0개 그대로, GitHub "Deploy to production" 꺼 둠
- **A2' 화면 연결 완료 (2026-10-26 밤, `8c22040`·`d4b2271`, push 안 함)** — 스위치를 켜기 전 마지막 코드 작업:
  - 동·호수·연락처 화면 5곳 → `useContactReveal`(의뢰·목적당 1번 `contacts.reveal`, 결과는 상태). 중개사 거래 페이지는 진입 때 1번 열어 하위 카드에 prop, 집주인은 진행중·계약 완료 진입 때 1번(버튼 추가 없음). 거절은 가림, local에서 저장소에 없는 예시 의뢰만 의뢰 값 그대로 (대표님 결정)
  - 매칭 모달 제출 `components/analysis/submitRequest.ts`: local = 지금처럼 요약만(중복 없음), supabase = `requests.create` → 서버 id로 요약 id 교체 + **휴대폰 요약엔 동·호수·이름·전화·메모 없음**. 실패하면 5단계에 한 줄, 보내는 중 버튼 잠금. 다시 요청은 서버 본인 열람(OWNER_VIEW)으로 동·호수·연락처를 채우고, 실패 때만 "개인정보는 이 휴대폰에 남기지 않아요…" + 동·호수부터 본인 인증까지 다시 (대표님 결정: 서버 저장은 원래 필요하고 본인만 열람·기록되니 추가 위험 없음)
  - **실제 Supabase로는 아직 안 돌려 봄** (스위치 켜는 건 배포 직전 B). 남은 것: A2'' 관리자 콘솔 가입 목록 Supabase, 중개사 가입 동의 서버 저장(A6)
- **다음 후보 (무료)**: 없음 — A7·A4·A6 2026-10-29 끝(홈 "복비 계산 n회"는 켜면 행동 기록으로 나옴). 남은 무료 항목은 체크리스트 A8~A10
- **대표님이 하실 것**: 처리방침 `dataRegion`·국외 이전 조항 서울 기준(법무), `.env.example`에 이름 추가(`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`·`CONTACT_ENC_KEY`·`NEXT_PUBLIC_DATA_BACKEND`·`SEND_SMS_HOOK_SECRET`·`SOLAPI_API_KEY`·`SOLAPI_API_SECRET`·`SOLAPI_SENDER` — Claude는 `.env*`를 읽지 않음), 파일럿 중개사 모집 고민(배포 직전·직후)
- **주의**: zod가 브라우저 번들에 들어가 첫 화면 JS가 약 17~20kB 늘었음(`/agent` 203kB) — A9에서 서버로. `/login` 첫 화면 212kB(Supabase 로그인 라이브러리). 테스트는 PGlite가 Postgres 18, 운영은 17 → 17에 없는 문법 금지. Supabase 데이터 시험은 `supabase/tests/*.sql` + `src/lib/data/__tests__/db.test.ts`·`contract.test.ts`
- **작업 규칙**: CLAUDE.md "Core Engineering & Workflow Rules" 1~6 (선 리서치·Plan Mode, 결정론/LLM 분리, 자동 채점, **한 단계씩 컨펌 후 진행**). 선택지를 물을 때는 추천안 + 추천 이유 + **화면 위치와 지금 → 바뀐 후 예시(시안 이미지)**를 함께. **코드를 고칠 땐 [COMPONENT_MAP.md](docs/COMPONENT_MAP.md)로 파일을 찾고 스킬 `bokbi-component`를 따른다** (화면 파일 400줄 이하, 정리 대기 4개는 늘리지 않기)
- **대표님 결정 메모**: 중개사 피드 목록은 집주인 제안 금액만(합계는 요청 시트에서만), 후기 10개 칩 +1만 지금 구현(레벨·칩 색·결제 해금은 나중 — "수익화 정리해줘" 하면 정리해서 보여 주기), `siteContent.ts` 분리는 필요할 때 제안. 홈 숫자 카드 문구·단계는 메모리 `home-stats-card`·[CONTENT_MAP.md](docs/CONTENT_MAP.md)
- **Supabase 프로젝트**: 운영 = 서울 `bokbi` ref `phwirgnogphmhscjrnfn`(GitHub 연결, 자동 적용 꺼짐), 보관 = `bokbi-tokyo` ref `ekzmcwqvbnnmepfhbwyf`(건드리지 않음). 조직 무료 요금제
- **배포 (Cloudflare)**: Worker 이름은 **`bokbi-mvp`**. Worker Settings → Variables and Secrets에 `V_WORLD_MAP_API_KEY`(사무소 지도·가입 확인 지도)·`GEMINI_API_KEY` Secret 등록, VWorld 키 서비스 URL에 배포 도메인 등록 필요 ([data-ops.md](docs/handover/data-ops.md) 배포 절). 관리자 화면 `/admin`(예전 `/admin/brokers` 포함)은 배포 빌드에서 404 (관리자 인증 전)
- **데이터 폴더 (2026-10-26 정리)**: `data/raw/` 없앰. 아파트 원본만 `data/market/`(`naver/`·`trades/`·`index/`·`units/`, 넣는 법 [README](data/market/README.md)), 중개사 명단 `data/brokers/`, 특약 엑셀 `data/special-terms/`. 새 매물 CSV 2026-10-26 쌍은 커밋했지만 **`data:build`는 아직 안 함**(배포 직전)
- **작업 폴더에 커밋 안 된 것 (의도적으로 둠)**: `data/market/trades/` 실거래 CSV 3개, `data/brokers/` 전체(명단 xls·csv = 대조용 JSON 생성 원본, `다산동_중개사무소_336건.xlsx` = 대표님 전화번호 조사·아직 안 열어봄, 엑셀 임시 폴더 `.다산동_중개사무소_336건.ref/`), `data/special-terms/` 특약 엑셀 원본(변환 결과 `src/data/special-terms/terms.json`은 커밋됨, 엑셀을 고치면 `node scripts/build-special-terms.mjs`), `헤이딜러와 짐싸 모바일 버튼 레퍼런스이용자플로우/`, `22148.png`
- **시장 데이터 재생성은 배포 직전에만** (`npm run data:build`). 토큰이 많이 드는 작업은 미리 말하고 확인받기. 중개사 명단을 새로 받으면 `node scripts/build-broker-registry.mjs` → `node --env-file=.env.local scripts/check-office-geocode.mts`(좌표 변환 성공률)
- **dev 서버**: **3004번** (`.claude/launch.json`의 `bokbi-dev`. 다른 채팅이 이미 3004를 띄웠으면 `bokbi-attach`로 붙기만 — 같은 폴더에 두 개 띄우면 `.next`가 깨짐). 띄우면 Next가 `tsconfig.json`·`next-env.d.ts`를 자동 수정하니 커밋 전에 `git checkout -- tsconfig.json next-env.d.ts`. 테스트용 주소: `/my-requests`(테스트 스위처 16가지), `/agent`(테스트 스위처 21가지, 거래 페이지는 `집주인 맞아요`·`날짜를 오늘로`로 끝까지, 멈춤·끝냄은 `집주인이 잠시 멈춤`·`멈춘 지 하루 지남`·`집주인이 다시 시작`·`집주인이 다른 곳에서 팔았어요`·`집주인이 거둬들임`), `/agent/terms`(복비 특약 만들기), `/agent/register`(테스트 스위처 9가지 + 관리자 화면 링크), `/admin`(관리자 콘솔, `?tab=brokers` 등), `/analysis/16`. `/agent` 스위처에 `운영팀: 허위 매물 맞음`·`아님` 추가(22가지)
- **git push는 항상 확인**: `.claude/settings.json`의 `ask`에 `git push`를 넣어 Claude가 push 전에 매번 묻는다 (대표님 2026-10-25)

### 남은 지시사항 (대표님 순서)
- ~~4단계: 스킬 설치~~ 완료(2026-10-24): grill-me·grilling·llm-council·caveman·ultracave·caveman-review·ponytail·ponytail-review·ponytail-audit·ponytail-debt를 `.claude/skills/`에 SKILL.md만 복사(훅 없음). grilling 외에는 `/이름` 수동 호출 전용. 출처·커밋·제외 항목은 `.claude/skills/THIRD_PARTY.md`
- 선택 검토 대기: 집주인 전유부 문서 업로드로 "소유자 인증 매물" 배지(필수 아님), 건축물대장 주택가격 API(`getBrHsprcInfo`, 호별 공시가격) 활용

### 반드시 먼저 알아야 할 것
1. **복비의 정의**: 복비를 미리 협의하는 도구가 아니다. 집주인이 **중개사도 납득할 수준**을 합리적으로 제시하고, 단지 밖 중개사는 **집주인이 직접 맡긴 진성 매물**을 받는 시스템. 수요·공급·거래량·매물 분석이 양쪽 모두 납득할 수준이어야 한다
2. **매칭 흐름**: 집주인 1집 매칭 요청 → 인증 중개사 여러 곳이 크레딧을 써서 신청 → 집주인 최대 3곳 선택 → 1곳과 계약(보수는 그 1곳만) → 나머지는 크레딧 환불 없음. 중개사 요청 수는 크레딧으로만(주 3개), **하루 제한 없음**(대표님 2026-10-29). 상세: MEMORY.md §2
3. **집주인 화면 vs 중개사 화면**: 집주인 분석 화면은 "왜 이 추천 금액인가". 중개사가 받는 금액은 중개사 플로우(Phase 5)에서만
4. **화면 요소 삭제·구조 변경은 대표님 명시 승인 후에만.** 근거 문제는 문구 수정안으로 먼저 제안
5. **중개사를 깎아내리거나 중개사 수입과 비교하는 문구 금지** ("평소 이상", "할인 여력", 다산동 평균 중개보수 비교 등). 상생 관점
6. **빌드 주의**: 다른 세션 dev 서버(3004)가 떠 있을 때 같은 폴더에서 그냥 `npm run build`를 돌리면 `.next`가 덮여 그 서버가 깨진다. 같은 폴더에서는 출력 폴더를 분리해 빌드한다: `$env:NEXT_DIST_DIR='.next-build'; node node_modules/next/dist/bin/next build` → 끝나면 `.next-build` 삭제, `git checkout -- tsconfig.json next-env.d.ts`
7. **"집주인님" 호칭 금지**, 안내 문구는 짧게. **화면에 가짜 숫자 금지** (투표 표수 등 — 실제 집계 전까지 결과를 보여주지 않는다)
8. **색 토큰 주의**: `bg-brand-light/60`처럼 CSS 변수 색에 투명도(`/숫자`)를 붙이면 적용되지 않아 투명해진다(분석 컴포넌트 66곳, 미해결). 새로 쓸 때는 단색 토큰을 쓴다
9. **블라인드 원칙**: 매칭 전 중개사는 익명(상호·대표·전화·주소·사진·자유 글 없음, 개설 연도·인원은 구간만), 매칭된 중개사끼리도 서로 모른다. 동·호수·연락처는 매칭 확정 뒤 고른 곳에만
10. **사실 아닌 약속 문구 금지**: "선착순"·"100%"·"3초"·"AI 정밀" 등, 비용 표현("광고비 0원"·"무료")도 금지 → "집주인이 직접 맡긴 매물" (집주인·중개사 가입·홈 정리 완료, `brokerCopy`·`homeCopy` 테스트가 막음). 동의 없이 개인정보를 받지 않는다(매칭 모달 4단계 동의 묶음)

### 다음 작업 (예전 목록 — 지금 순서는 위 "세션별 진행 순서"가 우선)
1. **중개사 플로우 (Phase 5)** — 2026-10-25 시작 합의. 순서: ① 강점 칩·후기 칩 조사 **(완료)** → ② 가입 **(완료, 좌표는 저장하지 않고 실시간 변환)** → ③ 요청 피드·요청 보내기(강점 칩 최대 3) → ④ 매칭 후 광고 등록(매물번호/링크, 48시간) → ⑤ 방문 예약(`showing.ts`) → ⑥ 계약 보고(48시간). 블라인드 원칙 유지. 기존 명세 [phase5-agent-feed.md](docs/handover/phase5-agent-feed.md), 집주인 쪽에서 넘긴 것 [owner-flow.md](docs/handover/owner-flow.md) §4. "선착순"·"하루 3건" 문구 정리 완료
2. 데이터 계약 계층 (Repository + zod + 스키마 재설계) — 백엔드(Supabase) 연결 전 필수. 지금 내 의뢰·동의 기록은 localStorage뿐
3. 분석 화면 구조·성능 정리 (서버 컴포넌트, 지연 로딩, 모달 단계 분할, 토큰 정합)
4. 분석 화면 남은 디자인: ~~① 색 토큰 투명도~~(2026-10-27 연한 색 토큰으로 해결, 남은 곳 0) ~~② 추천 이유 회색 한 줄~~(`평균 단지(30%)보다 n%p` 반영됨) ~~③ 대장 배틀 순위 기준~~(2026-10-27 30평대 실거래 중간값으로 확정) → 분석 화면 디자인 끝. 지난 정리는 [analysis.md](docs/handover/analysis.md) "2026-10-24 디자인 정리"
5. 집주인 플로우 남은 것: [owner-flow.md](docs/handover/owner-flow.md) §3 (거리 표시, 실제 저장 등). 완료된 내용 전체도 같은 파일
6. 끝장 투표 실제 집계: Supabase 투표 테이블 → "참여가 모이면 결과 공개" 줄 자리에 실제 결과 막대(대장 배틀은 상대가 바뀌면 따로 세기). 이후 AI 주간 주제 자동화
### 미결 · 확인 필요
- 추천 범위 20/30/50%·기준점 0.5/2배·노랑 폭 10%p는 정책값 → 파일럿 매칭률로 조정 (화면에는 "정책값"이라고 쓰지 않는다)
- **운영 명세 (2026-10-24 합의, 미구현)**: ① 시장 데이터 주간 갱신(실거래·매물 CSV 주 1회, 6개월 창을 한 주씩 이동) ② 추천값은 의뢰 시점에 고정(합의 조건이 흔들리지 않게) ③ 정책값 보정은 월 1회, 할인 구간별 중개사 요청 30건 이상 쌓인 구간만
- 거래 추세 항: 주간 데이터 8주 누적 후 "작은 단지 수축 + 다산동 전체 추세로 나누기" 넣은 단지별 전후 비교표로 재판단 (예: e편한세상다산 직전 6개월 132건 → 58건, 추세 반영 시 36% → 27%)
- 중개사 인터뷰: 수용 가능한 보수 수준, 광고비, 크레딧 가격
- ~~끝장 투표 창 아래 파란 "내 아파트 복비 분석으로 돌아가기" 버튼~~ (2026-10-29 대표님 결정으로 뺌, 닫기는 X + 바깥 누르기)
- 배포 전: 홈 "다산동 실시간 복비 계산 중" 목업 사례(예시 배지 없음, 대표님 결정) → 실데이터(`docs/PREDEPLOY_CHECKLIST.md` §1-1), 회사·약관 정보(`COMPANY_INFO`)
- 대기 중인 외부 자료: Solapi(배포 전). **Supabase 운영 프로젝트 = 서울 `bokbi`** (대표님 2026-10-26, 국외 이전을 피하려고): ref `phwirgnogphmhscjrnfn` (`https://phwirgnogphmhscjrnfn.supabase.co`, ap-northeast-2, 무료 플랜, public 테이블 0개). **GitHub 연결은 대표님이 대시보드에서 다시** 해야 함. 예전 도쿄 `ekzmcwqvbnnmepfhbwyf`는 지우지 않고 보관(대표님). 설계안 v2 [supabase-schema.md](docs/handover/supabase-schema.md), 파기 = 개인정보 칸만 종료 30일 뒤 삭제·나머지 데이터 보관(확정). 처리방침 `dataRegion`·국외 이전 조항은 서울 기준으로 고쳐야 함(법무 확인). 테이블·마이그레이션은 설계안 승인 후 브랜치부터
- 환경변수: `.env.example`의 이름 구조를 따라 `.env.local`에 대표님이 직접 입력 (Claude는 `.env*` 내용 읽기 금지 — 값은 `node --env-file`로만 로드)
- 워크플로 스킬: superpowers 설치됨. 외부 스킬 10개는 `.claude/skills/THIRD_PARTY.md`

---

## 🗺️ 문서 지도 (필요할 때만 연다)

| 지금 하는 일 | 열 문서 |
|---|---|
| **화면·코드 고치기 (어느 파일을 열지)** | [docs/COMPONENT_MAP.md](docs/COMPONENT_MAP.md) + 스킬 `bokbi-component` |
| 분석 화면·추천 엔진·AI 설명·법정 중개보수 | [docs/handover/analysis.md](docs/handover/analysis.md) |
| 매칭 모달·내 의뢰·다시 요청·동의 (집주인 플로우) | [docs/handover/owner-flow.md](docs/handover/owner-flow.md) |
| 데이터 수집·매물 CSV·동호수 확인·법적 고지·배포 | [docs/handover/data-ops.md](docs/handover/data-ops.md) |
| Phase 5 중개사 승인 후 흐름 (피드·크레딧·매칭 관리·특약) | [docs/handover/phase5-broker-matching.md](docs/handover/phase5-broker-matching.md) (예전 명세 [phase5-agent-feed.md](docs/handover/phase5-agent-feed.md)) |
| Supabase 테이블·RLS·데이터 계약 계층 (SQL 정본 `supabase/migrations/`, 운영 DB 미적용) | [docs/handover/supabase-schema.md](docs/handover/supabase-schema.md) |
| 서비스 정의·비즈니스 룰·SSOT 위치·화면 목록 | [docs/handover/reference.md](docs/handover/reference.md) |
| 지난 세션 요약·오류 치유 이력 | [docs/handover/history.md](docs/handover/history.md) |
| 제품 요구사항(최상위) · 디자인 토큰 · 개발 규칙 | [PRD.md](PRD.md) · [DESIGN.md](DESIGN.md) · [RULES.md](RULES.md) |
| 구조 · 태스크·버그 로그 · 비즈니스 철학 · 문구 키 | [ARCHITECTURE.md](ARCHITECTURE.md) · [TASKS.md](TASKS.md) · [MEMORY.md](MEMORY.md) · [docs/CONTENT_MAP.md](docs/CONTENT_MAP.md) |

## 🔁 세션 운영

**시작**: 이 파일만 읽는다 → 작업 영역의 문서 지도 파일 → 대상 코드. 다른 문서를 미리 다 읽지 않는다.

**마무리** (세션을 끝내거나 새 채팅으로 넘기기 전):
1. 위 "현재 진행 상황"을 덮어쓴다: 최종 커밋·push 여부, 다음에 할 일, 커밋 안 된 것, 주의할 것. **이 절은 50줄 이내 유지** — 길어지면 지난 요약을 [history.md](docs/handover/history.md) 맨 위로 옮긴다
2. 이번 세션에서 바뀐 상세는 해당 문서 지도 파일에 반영한다 (같은 내용을 두 곳에 쓰지 않는다 — 여기서는 링크만)
3. 문서 커밋

**동기화 원칙**: 기능·결함·기획이 바뀌면 PRD · ARCHITECTURE · RULES · DESIGN · TASKS · MEMORY · CONTENT_MAP 중 관련 문서도 함께 고친다 (원문 프로토콜: [history.md](docs/handover/history.md)).

**대표님용 사용법**
| 상황 | 할 일 |
|---|---|
| 같은 작업을 계속하는데 대화가 길어짐 | `/compact` (대화를 요약해 남기고 이어감. 문서를 다시 읽지 않음) |
| 작업 하나를 끝내고 다음 작업으로 | "HANDOVER 갱신하고 커밋해줘" → 새 채팅에서 "HANDOVER.md 읽고 작업 준비" |
| 대화가 꼬였거나 처음부터 다시 | `/clear` 후 "HANDOVER.md 읽고 작업 준비" (새 채팅과 같음) |
| 다른 주제를 잠깐 물어볼 때 | 새 채팅 (지금 작업 대화를 오염시키지 않음) |
