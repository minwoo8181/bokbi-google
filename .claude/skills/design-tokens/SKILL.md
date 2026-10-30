---
name: design-tokens
description: Systematic design token architecture for instant theme switching and cohesive visual consistency. Covers CSS custom properties, OKLCH color math, single-variable hue driving, semantic color scales, typography scales, and Tailwind theme mapping.
---

# Design Tokens & Theming System

A systematic, maintainable design token system that empowers instant, site-wide theme swaps without brittle search-and-replace.

---

## 1. Single-Hue Token Architecture
Derive the application's entire palette from core semantic CSS variables defined in `:root`:

```css
:root {
  /* Brand Hue (e.g. 155 for Emerald, 220 for Blue, 25 for Warm Amber) */
  --brand-primary: #047857;     /* Forest Emerald Primary */
  --brand-hover: #065f46;       /* Deep Emerald Hover */
  --brand-light: #ecfdf5;       /* 5% Tint for Pills and Badges */
  --surface-ground: #FAF9F6;    /* Warm Ivory Canvas */
  --surface-card: #FFFFFF;      /* Clean White Elevation */
  --text-main: #0f172a;         /* High-Contrast Headings */
  --text-muted: #64748b;        /* Readable Secondary Text */
}
```

---

## 2. Tailwind Configuration Mapping
Map the CSS variables directly to Tailwind utility classes so developers and AI agents write standard Tailwind classes:

```typescript
// tailwind.config.ts
colors: {
  brand: {
    primary: 'var(--brand-primary)',
    hover: 'var(--brand-hover)',
    light: 'var(--brand-light)',
  },
  surface: {
    ground: 'var(--surface-ground)',
    card: 'var(--surface-card)',
  }
}
```

Usage in components:
- `bg-brand-primary text-white`
- `bg-brand-light text-brand-primary`
- `border-brand-primary/30`
- `focus:ring-brand-primary`

---

## 3. Benefits & 1-Second Theme Swapping
- **Zero hardcoded magic hexes**: Developers never type `#047857` across 50 components.
- **1-Second Brand Shift**: Modifying `--brand-primary` in `globals.css` immediately and perfectly recolors buttons, badges, charts, tickers, and navigation bars across the entire app.
- **Dark Mode Readiness**: Changing token assignments within `.dark` instantly provides a consistent dark theme without modifying component markup.
