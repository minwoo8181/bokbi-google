---
brand: Toss
brand_ko: 토스
slug: toss
generated: 2026-05-08
source_type: product_observation
confidence: high
is_official: false

region: korea
industry:
  - fintech
  - consumer

color_tone: cool
primary_color_hex: "#0064FF"
primary_color_name: "Toss Blue"
mood:
  - 단순
  - 신뢰
  - 모던

font_category: sans-serif
font_primary: Toss Product Sans
font_korean_supported: true

density: comfortable
corner_style: round
flatness: flat

visual_style:
  - modern-minimal

theme_modes:
  - light
  - dark

released_year: 2015
last_major_revision: 2024
signature_keyword: "Pretendard와 단일 Toss Blue 강조의 한국 핀테크 표준"

card_tokens: |
  {
    "light": { "bg": "#FFFFFF", "surface": "#F2F4F6", "border": "#E5E8EB", "fg": "#191F28", "fg_muted": "#8B95A1", "accent": "#0064FF" },
    "dark":  { "bg": "#17171C", "surface": "#21232A", "border": "#2C2F37", "fg": "#F2F4F6", "fg_muted": "#B0B8C1", "accent": "#0064FF" }
  }

hero_html: |
  <div style="font-family:'Toss Product Sans',Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--card-bg);color:var(--card-fg);height:100%;overflow:hidden;display:flex;flex-direction:column;letter-spacing:-.018em;">
    <div style="height:40px;padding:0 12px;display:flex;align-items:center;border-bottom:1px solid var(--card-border);">
      <span style="width:18px;height:18px;border-radius:58% 42% 62% 38%;background:var(--card-accent);transform:rotate(-24deg);box-shadow:inset -4px -4px 0 rgba(0,0,0,.10);"></span>
      <strong style="margin-left:6px;font-size:17px;font-weight:850;letter-spacing:-.04em;">toss</strong>
      <span style="margin-left:auto;width:28px;height:28px;border-radius:50%;background:var(--card-surface);display:grid;place-items:center;color:var(--card-fg-muted);">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>
    <div style="padding:9px 12px 11px;display:flex;flex:1;flex-direction:column;">
      <div style="font-size:10px;font-weight:650;color:var(--card-fg-muted);">내 자산</div>
      <div style="margin-top:1px;font-size:24px;line-height:1.15;font-weight:850;letter-spacing:-.045em;">12,840,000원</div>
      <div style="margin-top:2px;font-size:9.5px;font-weight:650;color:var(--card-accent);">어제보다 +32,400원</div>
      <div style="margin-top:8px;padding:8px;border:1px solid var(--card-border);border-radius:12px;background:var(--card-surface);display:grid;grid-template-columns:28px 1fr auto;gap:7px;align-items:center;">
        <span style="width:28px;height:28px;border-radius:9px;background:var(--card-accent);color:#fff;display:grid;place-items:center;">
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 10h16M6 10v8m4-8v8m4-8v8m4-8v8M3 19h18L12 4 3 9v10Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span><span style="display:block;font-size:9px;color:var(--card-fg-muted);font-weight:650;">토스뱅크 통장</span><strong style="display:block;margin-top:1px;font-size:12px;font-weight:800;">8,420,000원</strong></span>
        <span style="padding:6px 8px;border-radius:8px;background:var(--card-bg);font-size:9px;font-weight:750;color:var(--card-accent);">송금</span>
      </div>
      <div style="margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;">
        <span style="padding:7px 4px;border-radius:10px;background:var(--card-surface);text-align:center;font-size:9.5px;font-weight:700;">계좌</span>
        <span style="padding:7px 4px;border-radius:10px;background:var(--card-surface);text-align:center;font-size:9.5px;font-weight:700;">카드</span>
        <span style="padding:7px 4px;border-radius:10px;background:var(--card-accent);color:#fff;text-align:center;font-size:9.5px;font-weight:750;">혜택</span>
      </div>
    </div>
  </div>

sources:
  - https://toss.im/
  - https://toss.tech/
  - https://www.tossbank.com/
---

### ① 브랜드 DNA
- **브랜드명**: Toss (토스, 비바리퍼블리카)
- **한 줄 정체성**: 한국 핀테크의 표준 — 송금부터 증권/은행/보험까지 한 슈퍼앱
- **공식 디자인 철학**: "모두가 자유롭게 — 단순함의 끝까지 다듬는다"
- **시그니처 요소 1개**: Pretendard + Toss Product Sans + 단일 Toss Blue(#0064FF) — 한 화면에 한 액션의 절제 톤

### ② 톤 & 무드
- **핵심 키워드 3개**: 단순, 신뢰, 모던
- **무드 설명**: 흰 캔버스 + 검은 본문 + 단일 Toss Blue. 한 화면에는 정확히 한 가지 행동만 강조되는 절제된 톤.
- **비주얼 스타일**: 모던 미니멀
- **밀도(Density)**: Comfortable — 모바일 우선
- **모서리 성향**: Round (12~16px)
- **평면성**: Flat — 그림자 거의 없음

### ③ 컬러 시스템 (CSS 변수)

```css
:root {
  /* Primary - Toss Blue */
  --color-primary-50:  #E8F2FF;
  --color-primary-100: #C2DCFF;
  --color-primary-200: #85B9FF;
  --color-primary-300: #4795FF;
  --color-primary-400: #1F7CFF;
  --color-primary-500: #0064FF;  /* Toss Blue */
  --color-primary-600: #0050D9;
  --color-primary-700: #003EA8;
  --color-primary-800: #002C77;
  --color-primary-900: #001A47;

  /* Secondary - Navy */
  --color-secondary-500: #191F28;

  /* Neutral - Toss gray (warm-cool middle) */
  --color-neutral-0:    #FFFFFF;
  --color-neutral-50:   #F9FAFB;
  --color-neutral-100:  #F2F4F6;     /* surface subtle */
  --color-neutral-200:  #E5E8EB;
  --color-neutral-300:  #D1D6DB;
  --color-neutral-500:  #B0B8C1;
  --color-neutral-700:  #8B95A1;     /* text tertiary */
  --color-neutral-800:  #4E5968;     /* text secondary */
  --color-neutral-900:  #191F28;     /* text primary */
  --color-neutral-1000: #0A0E14;

  /* Semantic */
  --color-success-bg: #E8F8EE;
  --color-success-fg: #00A85A;
  --color-warning-bg: #FFF4D6;
  --color-warning-fg: #FF9500;
  --color-error-bg:   #FFE8E8;
  --color-error-fg:   #FF4040;
  --color-info-bg:    #E8F2FF;
  --color-info-fg:    #0064FF;

  /* Surface */
  --bg-base:     #FFFFFF;
  --bg-subtle:   #F2F4F6;
  --bg-elevated: #FFFFFF;
  --bg-overlay:  rgba(25,31,40,0.50);

  /* Text */
  --text-primary:    #191F28;
  --text-secondary:  #4E5968;
  --text-tertiary:   #8B95A1;
  --text-on-primary: #FFFFFF;
  --text-disabled:   #B0B8C1;

  /* Border */
  --border-default: #E5E8EB;
  --border-subtle:  #F2F4F6;
  --border-strong:  #D1D6DB;
  --border-focus:   #0064FF;
}

```

### ④ 타이포그래피
- **폰트 페어링**:
  - 영문: Toss Product Sans (자체) — 폴백 -apple-system
  - 한글: **Pretendard (OFL)** — Toss가 표준화에 큰 영향
- **위계**:
  - Display: 56px / 800 / 1.05 / -0.025em
  - H1 (Title 1): 32px / 800 / 1.15 / -0.02em
  - H2 (Title 2): 24px / 700 / 1.25 / -0.015em
  - H3 (Title 3): 19px / 700 / 1.3 / -0.01em
  - Body Large (Body 1): 17px / 500 / 1.5 / -0.01em
  - Body (Body 2): 15px / 500 / 1.5 / -0.01em
  - Body Small (Body 3): 13px / 500 / 1.43 / -0.005em
  - Caption: 11px / 600 / 1.27 / 0

### ⑤ 스페이싱
- **Base unit**: 4px
- **토큰**:
  ```css
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 40px;
  --space-3xl: 64px;
  ```
- **Container**: max-width 480px (모바일 우선), 좌우 패딩 20px

### ⑥ Border Radius
```css
--radius-none: 0;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-full: 9999px;
```

### ⑦ Shadow / Elevation
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.06);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
--shadow-xl: 0 16px 32px rgba(0,100,255,0.20);
```

### ⑧ Iconography
- **스타일**: Outline (Toss 자체)
- **Stroke 굵기**: 1.5~2px
- **모서리 처리**: Round
- **추천 라이브러리**: Toss Icons / Phosphor

### ⑨ 컴포넌트 가이드

**Button**
```css
.btn {
  font: 700 16px/1 'Toss Product Sans', Pretendard, -apple-system, sans-serif;
  letter-spacing: -0.01em;
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 0;
  transition: background 100ms ease;
}
.btn-primary { background: var(--color-primary-500); color: #fff; }
.btn-primary:hover { background: var(--color-primary-600); }
.btn-primary:active { background: var(--color-primary-700); }
.btn-primary:disabled { background: var(--color-neutral-100); color: var(--text-disabled); }
.btn-secondary { background: var(--bg-subtle); color: var(--text-primary); }
.btn-secondary:hover { background: var(--color-neutral-200); }
.btn-ghost { background: transparent; color: var(--color-primary-500); }
.btn-danger { background: var(--color-error-fg); color: #fff; }
```

**Input**
```css
.input { background: var(--bg-subtle); border: 0; border-radius: var(--radius-md); padding: 14px 16px; font-size: 16px; font-family: inherit; }
.input:focus { outline: 2px solid var(--border-focus); outline-offset: -2px; }
```

**Card**
```css
.card { background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; }
.card-elevated { box-shadow: var(--shadow-md); border-color: transparent; }
.card-outlined { box-shadow: none; }
```

**Badge**
```css
.tag { padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; line-height: 18px; display: inline-flex; align-items: center; gap: 4px; }
.tag-solid   { background: var(--color-primary-500); color: #fff; }
.tag-subtle  { background: var(--color-primary-50); color: var(--color-primary-700); }
.tag-outline { border: 1px solid var(--border-default); color: var(--text-primary); }
```

**Navigation (BottomNav 모바일)**
```css
.bottomnav { background: var(--bg-base); border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 0; }
.bottomnav .item { padding: 6px; text-align: center; font-size: 11px; font-weight: 600; color: var(--text-tertiary); }
.bottomnav .item.active { color: var(--color-primary-500); }
.bottomnav .item .ic { font-size: 22px; }
```

### ⑩ Motion
```css
--duration-fast: 100ms;
--duration-base: 250ms;
--duration-slow: 400ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### ⑪ Anti-patterns
1. 한 화면에 두 개 이상 primary action 동시 사용 금지 — Toss 절제 원칙
2. Toss Blue를 destructive 액션에 사용 금지
3. 그라데이션 배경 위에 본문 텍스트 직접 배치 금지
4. 버튼을 sharp 사각으로 변경 금지 — 12~14px round가 시그니처
5. 본문 폰트 weight 400 이하 사용 금지 — 500+ Bold가 한국어 가독성 핵심

### ⑫ 시그니처 적용 예시 (자산 홈)

```html
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: 'Toss Product Sans', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    letter-spacing: -0.012em;
  }
  .toss-demo { width: min(100%, 880px); min-height: 100vh; margin: 0 auto; padding: 18px 24px 24px; }
  .toss-topbar { height: 46px; display: flex; align-items: center; }
  .toss-brand { display: inline-flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 800; letter-spacing: -0.045em; }
  .toss-brand-mark { width: 22px; height: 22px; border-radius: 58% 42% 62% 38%; background: var(--color-primary-500); transform: rotate(-24deg); box-shadow: inset -5px -5px 0 rgba(0,0,0,.10); }
  .toss-top-actions { margin-left: auto; display: flex; gap: 8px; }
  .toss-icon-button { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: var(--radius-full); background: var(--bg-subtle); color: var(--text-secondary); }
  .toss-hero {
    margin-top: 16px;
    padding: 28px;
    border-radius: var(--radius-xl);
    background: var(--bg-subtle);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: end;
  }
  .toss-eyebrow { color: var(--text-secondary); font-size: 14px; font-weight: 650; }
  .toss-balance { margin: 8px 0 6px; font-size: clamp(34px, 7vw, 52px); line-height: 1.04; font-weight: 800; letter-spacing: -0.055em; }
  .toss-delta { display: inline-flex; align-items: center; gap: 5px; color: var(--color-primary-500); font-size: 13px; font-weight: 700; }
  .toss-send { min-width: 112px; min-height: 48px; cursor: pointer; }
  .toss-section-title { margin: 28px 0 12px; font-size: 18px; font-weight: 800; letter-spacing: -0.025em; }
  .toss-feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .toss-feature {
    min-height: 184px;
    padding: 18px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    background: var(--bg-elevated);
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }
  .toss-feature-head { display: flex; align-items: center; gap: 10px; }
  .toss-feature-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; background: var(--color-primary-50); color: var(--color-primary-500); }
  .toss-feature-label { color: var(--text-secondary); font-size: 13px; font-weight: 650; }
  .toss-feature-link { margin-left: auto; color: var(--text-tertiary); }
  .toss-feature-value { margin-top: 18px; font-size: 22px; font-weight: 800; letter-spacing: -0.035em; }
  .toss-feature-meta { margin-top: 6px; color: var(--text-tertiary); font-size: 12px; font-weight: 600; }
  .toss-inline-action { margin-top: auto; align-self: flex-start; border: 0; background: transparent; color: var(--color-primary-500); padding: 0; font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1; }
  .toss-progress { height: 7px; margin-top: auto; overflow: hidden; border-radius: var(--radius-full); background: var(--border-default); }
  .toss-progress > span { display: block; width: 62%; height: 100%; border-radius: inherit; background: var(--color-primary-500); }
  .toss-benefit { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
  .toss-benefit strong { color: var(--color-primary-500); font-size: 22px; letter-spacing: -0.03em; }
  .toss-bottomnav { margin-top: 22px; padding-top: 12px; border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: repeat(5, 1fr); }
  .toss-nav-item { display: grid; justify-items: center; gap: 5px; color: var(--text-tertiary); font-size: 11px; font-weight: 650; }
  .toss-nav-item.active { color: var(--color-primary-500); }
  @media (max-width: 680px) {
    .toss-demo { padding: 14px 16px 20px; }
    .toss-hero { padding: 22px 20px; grid-template-columns: 1fr; }
    .toss-send { width: 100%; }
    .toss-feature-grid { grid-template-columns: 1fr; }
    .toss-feature { min-height: 152px; }
  }
</style>

<main class="toss-demo">
  <header class="toss-topbar">
    <div class="toss-brand"><span class="toss-brand-mark" aria-hidden="true"></span>toss</div>
    <div class="toss-top-actions">
      <button class="toss-icon-button" aria-label="검색">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <button class="toss-icon-button" aria-label="알림">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </header>

  <section class="toss-hero">
    <div>
      <div class="toss-eyebrow">내 자산</div>
      <h1 class="toss-balance">12,840,000원</h1>
      <div class="toss-delta">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="m3 10 3-3 2.2 2.2L13 4.5M10 4.5h3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        어제보다 32,400원 늘었어요
      </div>
    </div>
    <button class="btn btn-primary toss-send">송금하기</button>
  </section>

  <h2 class="toss-section-title">한눈에 보기</h2>
  <section class="toss-feature-grid">
    <article class="card toss-feature">
      <div class="toss-feature-head">
        <span class="toss-feature-icon">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4 10h16M6 10v8m4-8v8m4-8v8m4-8v8M3 19h18L12 4 3 9v10Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="toss-feature-label">토스뱅크 통장</span>
        <span class="toss-feature-link">›</span>
      </div>
      <strong class="toss-feature-value">8,420,000원</strong>
      <span class="toss-feature-meta">연 2.0% · 매일 이자 받기</span>
      <button class="toss-inline-action">송금</button>
    </article>

    <article class="card toss-feature">
      <div class="toss-feature-head">
        <span class="toss-feature-icon">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M8 15h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        </span>
        <span class="toss-feature-label">이번 달 쓴 돈</span>
        <span class="toss-feature-link">›</span>
      </div>
      <strong class="toss-feature-value">1,248,900원</strong>
      <span class="toss-feature-meta">예산 200만원 중 62%</span>
      <div class="toss-progress" aria-label="예산의 62% 사용"><span></span></div>
    </article>

    <article class="card toss-feature">
      <div class="toss-feature-head">
        <span class="toss-feature-icon">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M12 21V7M5 11h14v10H5V11ZM4 7h16v4H4V7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7Zm0 0h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z" stroke="currentColor" stroke-width="1.7"/></svg>
        </span>
        <span class="toss-feature-label">받을 수 있는 혜택</span>
        <span class="tag tag-subtle">12개</span>
      </div>
      <div class="toss-benefit">
        <div><div class="toss-feature-meta">이번 달 예상</div><strong>12,800원</strong></div>
        <span class="toss-feature-link">›</span>
      </div>
    </article>
  </section>

  <nav class="toss-bottomnav" aria-label="주요 메뉴">
    <span class="toss-nav-item active"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="m4 11 8-7 8 7v9h-6v-5h-4v5H4v-9Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>홈</span>
    <span class="toss-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>혜택</span>
    <span class="toss-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M5 17 10 12l3 3 6-8M15 7h4v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>주식</span>
    <span class="toss-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M6 8h13l-1 8H8L6 4H3M9 20h.01M17 20h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>쇼핑</span>
    <span class="toss-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>전체</span>
  </nav>
</main>
```
