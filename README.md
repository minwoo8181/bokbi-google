# 🏢 복비 (Bokbi) V2

> **"계약 날 어색한 흥정 대신, 데이터로 합의하는 새로운 복비"**  
> 경기도 남양주시 다산동 아파트 단지 특화 부동산 상생형 복비 사전 합의 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-SSR-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)

---

## 📌 1. 서비스 개요

**복비(Bokbi)**는 부동산 계약 당일 현장에서 발생하는 어색한 복비 흥정을 원천적으로 없애고, 국토교통부 실거래가·수급·층수 데이터를 기반으로 집주인이 적정 복비를 먼저 제안하여 검증된 다산동 공인중개사와 선착순 매칭하는 **부동산 상생형 복비 사전 합의 플랫폼**입니다.

### 💡 핵심 가치 (Value Proposition)
* **집주인 (매도/임대인)**: 계약 날 감정 소모 없이, 객관적 AI 데이터로 적정 복비를 미리 정하고 검증된 중개사와 매칭. 매칭 성사 전까지 동·호수와 전화번호는 100% 비공개(블라인드) 보호됩니다.
* **공인중개사**: 네이버 부동산 광고비 0원, 직접 유입된 다산동 아파트 진성 매물을 크레딧으로 매칭 요청 가능(요청 1번에 1개, 매주 3개). 단지 외곽 부동산도 동등하게 기회를 얻습니다.

---

## 🚀 2. 주요 기능 및 진행 현황

> 상세 요구사항은 [PRD.md](PRD.md), 진행 현황은 [TASKS.md](TASKS.md)를 기준으로 합니다.

| Phase | 화면 | 상태 |
|---|---|:---:|
| 1 | 메인 랜딩 & 초성 검색 (`/`) | ✅ |
| 2 | AI 정밀 분석 (`/analysis/[id]`) — 단일 수직 플로우, 호갱노노식 차트, 복비 시뮬레이터, 5대 끝장 투표 | ✅ |
| 3 | 토스식 6단계 매칭 바텀시트 모달 | ✅ |
| 4 | 내 의뢰 확인 & 언마스킹 (`/my-requests`), 중개사 등록 (`/agent/register`) | ✅ |
| 5 | 중개사 블라인드 피드 (`/agent/feed`) | ⏳ 다음 |
| 6 | 관리자 심사 대시보드 (`/admin`) | 📋 예정 |

* 법정 중개보수 상한: `src/lib/commission.ts` (공인중개사법 시행규칙 [별표 1] 구간별 요율)
* 단지별 실거래 평형: `src/data/complexPyeongMap.ts` (국토부 5,505건, 54개 단지 100% 매핑)
* 전역 카피라이팅 SSOT: `src/config/siteContent.ts`

---

## 🎨 3. 디자인 시스템

* **토스 라이트(Toss Light) 단일 디자인 영구 확정** (테마 전환 시스템 폐기). 상세 토큰은 [DESIGN.md](DESIGN.md).
* 모든 컬러는 CSS 변수(`var(--brand-primary)`) 기반 Tailwind 시맨틱 토큰으로 사용.
* 360px / 390px 모바일 퍼스트 (가로 스크롤 0px 보장).

---
## 🛠️ 4. 기술 스택 (Tech Stack)

| 계층 | 기술 |
| :--- | :--- |
| **Framework** | Next.js 15.1.7 (App Router, Server & Client Components) |
| **Language** | TypeScript 5.7.3 (Strict Type Checking, Zero-Any) |
| **Styling** | Tailwind CSS v3.4.17 + PostCSS + CSS Variables |
| **Icons & UI** | Lucide React, Framer Motion, Vaul (Drawer) |
| **Backend & DB** | Supabase (PostgreSQL, SSR Cookie Auth, Storage) |
| **Data Engine** | 국토교통부 실거래가 공개시스템 데이터셋 (다산동 5,505건 실거래 데이터 클렌징) |

---

## 💻 5. 로컬 개발 환경 실행 방법

### 1) 저장소 클론 및 패키지 설치
```bash
git clone https://github.com/realminuu-web/bokbi-.git
cd bokbi-
npm install
```

### 2) 환경 변수 설정
`.env.example` 파일을 복사하여 `.env.local`을 생성하고 필요한 키를 입력합니다:
```bash
cp .env.example .env.local
```

### 3) 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3004` 접속 (포트는 `package.json`에 3004로 고정).

### 4) TypeScript 정적 타입 검사
```bash
npm run typecheck
npm test
npm run build
```

---

## 📂 6. 프로젝트 디렉토리 구조

```
bokbi-/
├── .claude/skills/          # Claude Code 프로젝트 스킬
├── scripts/                 # 국토교통부 실거래가 데이터 파싱 및 통계 분석 스크립트
├── src/
│   ├── app/
│   │   ├── agent/
│   │   │   └── register/    # [중개사] 3종 서류 제출 및 가입 화면
│   │   ├── analysis/[id]/   # [집주인] Step 2 AI 정밀 분석 & 블라인드 프리뷰
│   │   ├── globals.css      # 전역 토큰, 테마 변수, 390px 모바일 프레임
│   │   ├── layout.tsx       # RootLayout (테마 연동, 웹폰트)
│   │   └── page.tsx         # [집주인] Step 1 메인 랜딩 & 60px 초성 검색
│   ├── components/
│   │   ├── agent/           # 공인중개사 전용 컴포넌트
│   │   ├── analysis/        # AI 정밀 분석 모듈형 컴포넌트 (차트, 복비 계산기, 모달 등)
│   │   └── home/            # 메인 랜딩 모듈형 컴포넌트 (검색창, 히어로, 통계 등)
│   ├── data/                # 다산동 54개 아파트 단지 메타데이터 (초성 인덱스)
│   ├── lib/                 # 호갱노노 스타일 분석 데이터 및 헬퍼 함수
│   └── theme/               # 토스 라이트 단일 테마 설정
├── supabase/                # 국토교통부 실거래가 원본 데이터 및 SQL 스키마
├── ARCHITECTURE.md          # 시스템 아키텍처 및 데이터 파이프라인
├── CLAUDE.md                # Claude Code 프로젝트 지침
├── DESIGN.md                # 토스 라이트 디자인 가이드
├── HANDOVER.md              # 프로젝트 종합 인수인계서
├── MEMORY.md                # 의사결정 히스토리
├── PRD.md                   # 프로덕트 요구사항 명세서
├── RULES.md                 # 비즈니스 도메인 룰 및 개발 행동 강령
└── TASKS.md                 # 마일스톤 및 로드맵 작업 목록
```

---

## 📄 7. 라이선스

본 프로젝트의 저작권은 **Bokbi Platform 팀**에 있습니다.
