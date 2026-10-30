import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🎨 복비 통합 브랜드 시맨틱 토큰 (테마 변경 시 '딸깍' 연동)
        brand: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          active: "var(--brand-primary-active)",
          light: "var(--brand-primary-light)",
          subtle: "var(--brand-primary-subtle)",
          glow: "var(--brand-glow)",
          line: "var(--brand-line)",
          "line-strong": "var(--brand-line-strong)",
        },
        surface: {
          page: "var(--bg-page)",
          card: "var(--bg-surface)",
          subtle: "var(--bg-subtle)",
          highlight: "var(--bg-highlight)",
        },
        border: {
          light: "var(--border-light)",
          default: "var(--border-default)",
          focused: "var(--border-focused)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
          inverse: "var(--text-inverse)",
        },
        // 🚦 상태 색 (슬라이더 구간 등 의미가 고정된 색)
        status: {
          good: "var(--status-good)",
          "good-light": "var(--status-good-light)",
          "good-line": "var(--status-good-line)",
          caution: "var(--status-caution)",
          "caution-light": "var(--status-caution-light)",
          "caution-line": "var(--status-caution-line)",
          risk: "var(--status-risk)",
          "risk-light": "var(--status-risk-light)",
        },
        // 🔄 레거시 토스 토큰 (변수 바인딩되어 테마 변경 시 동시 변경)
        toss: {
          blue: "var(--brand-primary)",
          "blue-hover": "var(--brand-primary-hover)",
          "blue-active": "var(--brand-primary-active)",
          "blue-light": "var(--brand-primary-light)",
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
          border: "var(--border-default)",
          subtle: "var(--bg-page)",
          white: "var(--bg-surface)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        // 🧪 design-lab: 테마마다 모서리를 바꿀 수 있게 기본 단계를 CSS 변수로 (없으면 Tailwind 기본값 그대로)
        sm: "var(--r-sm, 0.125rem)",
        md: "var(--r-md, 0.375rem)",
        lg: "var(--r-lg, 0.5rem)",
        xl: "var(--r-xl, 0.75rem)",
        "2xl": "var(--r-2xl, 1rem)",
        "3xl": "var(--r-3xl, 1.5rem)",
        "theme-sm": "var(--radius-sm)",
        "theme-md": "var(--radius-md)",
        "theme-lg": "var(--radius-lg)",
        "theme-xl": "var(--radius-xl)",
        "theme-2xl": "var(--radius-2xl)",
        "theme-pill": "var(--radius-pill)",
        // 레거시 호환
        "toss-sm": "8px",
        "toss-md": "12px",
        "toss-lg": "16px",
        "toss-xl": "20px",
        "toss-2xl": "24px",
      },
      // h-13(52px)·scale-98은 Tailwind 3 기본값에 없어 하단 CTA 높이가 글자 높이로 줄어들던 문제 (22곳 사용)
      spacing: {
        13: "3.25rem",
      },
      scale: {
        96: "0.96",
        98: "0.98",
      },
      // 🎞️ 모션 토큰 (DESIGN.md §6): 0.12~0.35초, 곡선은 ease-out 하나
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "check-draw": {
          from: { strokeDashoffset: "24" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "rise-in": "rise-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "check-draw": "check-draw 350ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [
    // 🧪 design-lab: 레퍼런스 테마일 때만 붙는 표기 (예: samjeom:pb-0). 색 토큰만으로 안 되는 모양 차이에 쓴다
    plugin(({ addVariant }) => {
      addVariant("samjeom", '[data-theme="samjeom"] &');
      addVariant("heydealer", '[data-theme="heydealer"] &');
    }),
  ],
};
export default config;
