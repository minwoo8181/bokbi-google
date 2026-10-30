# 환경변수 설정 가이드 (ENV_SETUP.md)

- 실제 값은 프로젝트 루트의 `.env.local`에만 입력합니다(`.gitignore`의 `.env*.local`로 커밋 제외).
- `.env.example`에는 아래 블록을 **값 없이** 그대로 복사합니다.
- `NEXT_PUBLIC_` 접두사가 붙은 값만 브라우저에 노출됩니다. API 키에는 절대 붙이지 않습니다.
- 공공 API 키도 계정 트래픽 한도·이용약관에 묶여 있으므로 유출 시 재발급합니다.

```env
# ===== 1. Supabase (Dashboard > Project Settings > API) =====
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=

# ===== 2. 국토교통부 실거래 (공공데이터포털, 일반 인증키 Decoding) =====
MOLIT_APT_TRADE_API_KEY=
# 아파트 전월세 실거래 (전세 분석용)
MOLIT_APT_RENT_API_KEY=
# 남양주시 시군구 코드
MOLIT_LAWD_CD=41360

# ===== 3. 한국부동산원 R-ONE 부동산 통계 =====
REB_RONE_API_KEY=

# ===== 4. Google Gemini (서버 전용 · 근거 설명/검증용, 숫자 산출 금지) =====
GEMINI_API_KEY=
# 모델은 코드(src/lib/analysis/gemini.ts)에서 관리: gemini-3.5-flash → gemini-3.8-flash. gemini-2.5-flash는 신규 사용자 종료(404)

# ===== 5. SMS / 알림 (배포 전 단계에 입력) =====
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_NUMBER=

# ===== 6. 앱 =====
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

## 이미 입력한 키 이름이 다를 경우
`.env.local`의 키 이름(`=` 앞부분)만 Claude에게 알려주면 코드를 그 이름에 맞춥니다. 값은 공유하지 않습니다.
