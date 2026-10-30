# 데이터 · 법적 고지 · 배포

> [HANDOVER.md](../../HANDOVER.md)에서 옮긴 상세 (2026-10-24 개편, 내용은 원문 그대로). 현재 상태·다음 작업은 HANDOVER가 우선한다.

### 데이터 계층
- 폴더 (2026-10-26 정리): 아파트 원본은 `data/market/` 아래 `naver/`(매물 CSV)·`trades/`(실거래 엑셀·CSV, 국토부 매매·전월세 API)·`index/`(R-ONE)·`units/`(건축물대장 동·호, 공동 지번 규칙, 단지 고정 ID). 중개사 명단은 `data/brokers/`, 특약 엑셀은 `data/special-terms/`(둘 다 커밋 안 함). 넣는 법은 [data/market/README.md](../../data/market/README.md)
- 원본 `data/market/`(네이버 매물 엑셀 2026-10-18, 국토부 매매·전월세 API, R-ONE) → `npm run data:build` → `src/data/market/dasan-market.json` (58개 단지, 유효 거래 5,509건, 매물 1,762/128건 — 네이버 CSV 2026-10-24)
- `src/lib/market/repository.ts` (서버 전용). 배포 시 내부만 Supabase로 교체: `getAnalysisBundle`, `getMatchCaseFeed`(현재 예시, `source: 'LIVE'`로 전환 시 예시 배지 자동 제거)
- 전세 수집: `node --env-file=.env.local scripts/fetch-molit-rent.mjs`

### 법적 고지 (메인 하단 → 모달, 2026-10-24)
- 문구 SSOT `SITE_CONTENT.legal` (블록 구조 `p`/`ul`/`table`), 렌더러 `src/components/common/LegalText.tsx`, 모달 `LegalPolicyModal`
- 회사 값은 문구에 `{company.키}`로 쓰고, `COMPANY_INFO.pendingFields`에 남은 키는 화면에 빨간 글씨 + "수정 필요" (배포 전 교체 목록)
- 별도 페이지 대신 모달 주소 연동: `/?legal=terms|privacy|disclaimer` 직접 진입 시 열림, 뒤로가기는 모달만 닫음 (외부 제출용 URL)
- 처리방침 조항은 korean-privacy-terms(Apache-2.0) 한국 템플릿 조항 구성을 체크리스트로 직접 작성(스킬 미설치: MDX·shadcn 의존성 충돌, 한국어 약관 템플릿 비어 있음). 자동 점검 `src/config/__tests__/legalContent.test.ts`
- **배포 전 변호사 검토 필수**

### 매물 데이터 수집 결정 (2026-10-24)
- 당근 부동산 스킬: 사용 안 함 (단지명 없음, 근처 동·상가 혼재, 스킬 자체가 DB 구축 금지)
- 네이버 비공식 API(naver-land-mcp): Claude Code에서는 429 차단 + 자동 권한 검사 "접근 제한 우회"로 실행 불가. 매물 수는 대표님이 다른 AI로 받은 동일매물 묶기 CSV를 반영 (그 AI는 서버 IP 429 차단을 브라우저 환경 호출로 우회했다고 보고 — 약관 위험은 대표님 판단으로 감수, 상세 매물 정보는 저장하지 않고 집계 숫자만)
- 갱신 방법: `data/market/naver/naver_complexes_YYYYMMDD.csv` + `naver_pyeongs_YYYYMMDD.csv`를 넣고 `npm run data:build` → 엑셀보다 최신이면 매물 수·평형·세대수를 덮어쓰고 매물 기준일(observedAt)도 그 날짜로. 단지명 불일치·단지/평형 합계 불일치 시 빌드 실패. 이후 `marketEngine.test.ts`의 매물 총합 숫자 갱신
- 2026-10-24 스냅샷: 매매 1,762 / 전세 128 (묶기 미적용 10,531 / 492, 중복률 83% / 74%). 10/18 엑셀 대비 매매 +84, 58개 단지 이름 전부 일치. 주상복합 3곳(다산유보라마크뷰·부영애시앙·다산자이아이비플레이스)은 네이버 APT 분류라 포함
- 2026-10-26 스냅샷(09:55): 단지 58·평형 243 구성 같음, 매매 1,758 / 전세 127. 바뀐 곳 8단지(매물 수 ±1~2, e편한세상다산·다산e편한세상자이 최저 호가 상승). **아직 `data:build` 안 함** (배포 직전에 반영 — 그때 `marketEngine.test.ts` 매물 총합도 갱신)

### 허위매물 1차 방어: 동·호수 실존 확인 (A안, 2026-10-24)
- 등기부 이름 대조는 불가(인터넷등기소 로그인·보안 프로그램·결제 필수). 대신 건축물대장 전유부로 "실제로 있는 집인가"를 확인하고, 소유자 확인은 매칭 후 중개사 등기 확인(B안, Phase 5)
- API: data.go.kr 15134735 건축HUB 건축물대장정보 (`BUILDING_REGISTER_API_KEY`, 서버·빌드 전용). 전유부는 동·호 조건을 무시하고 지번 전체를 주므로 **미리 전체 수집**
- 갱신(월 1회): `npm run units:fetch` (지번 56개, 446회 호출, 약 3분) → `npm run data:build` → `src/data/market/dasan-units.json`(서버 전용 246KB, 단지 것만 화면으로)
- 규칙: 공동주택 용도 동만, 상가동 제외, 한 지번 여러 단지는 `data/market/units/shared-lot-dongs.json`(플루리움 동 번호 앞자리 = 단지)
- 결과: 58/58 수집, 세대수 ±2% 일치 53/58. 차이 5곳(해링턴타워·충일 1층 상가 포함, 신우가든·제일 이름 없는 여러 건물의 호수 중복, 양지 대장 일부)은 `data/reports/reconciliation.md`
- 판정 `src/lib/market/units.ts` `checkUnit` (OK / NO_DONG / FLOOR_OVER / NO_HO / UNKNOWN). 매칭 모달 3단계: 동은 목록에서 선택, 호수 즉시 확인, 확인된 호만 다음 단계. 데이터 없는 단지는 막지 않고 안내

### 배포 (Cloudflare Workers + OpenNext)
- 설정은 저장소에: `wrangler.jsonc`(Worker 이름·자기 참조 모두 **`bokbi-mvp`**, 2026-10-25부터), `open-next.config.ts`. **둘 다 대시보드 Worker 이름과 같아야 한다**
  - 2026-10-23: Worker가 `bokbi`일 때 자기 참조가 `bokbi-mvp`라 실패(code 10143) → 둘 다 `bokbi`로
  - 2026-10-25: 대시보드 Worker가 `bokbi-mvp`로 바뀌어 "Service binding 'WORKER_SELF_REFERENCE' references Worker 'bokbi' which was not found"로 배포 실패(빌드는 통과) → 둘 다 `bokbi-mvp`로
- Cloudflare 대시보드 Build 설정: Build command `npx opennextjs-cloudflare build`, Deploy command `npx opennextjs-cloudflare deploy`
- 비밀값: `GEMINI_API_KEY`, `V_WORLD_MAP_API_KEY`를 Worker `bokbi-mvp` → Settings → Variables and Secrets에 Secret으로 등록 (없으면 AI 설명 대신 템플릿 문구, 사무소 지도 대신 주소만)
- 로컬 Windows에서도 OpenNext 빌드가 통과한다(2026-10-25, 별도 worktree에서 `npm ci` 후 `npx opennextjs-cloudflare build` 확인). 실행 중인 dev 서버의 `.next`를 덮어쓰므로 반드시 별도 폴더에서
- 캐시(R2/KV) 미설정 — 필요해지면 https://opennext.js.org/cloudflare/caching

