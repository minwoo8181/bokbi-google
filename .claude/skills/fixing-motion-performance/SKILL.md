---
name: fixing-motion-performance
description: Audit and fix animation performance issues including layout thrashing, GPU compositor properties, scroll-linked motion, and blur effects. Use when animations stutter, transitions jank, or when optimizing 60fps interaction performance.
---

# Fixing Motion Performance

Technical rules for 60fps hardware-accelerated animations and buttery-smooth transitions.

---

## 1. The Rendering Pipeline
1. **Composite (GPU Cheap)**: `transform` (`translate`, `scale`, `rotate`), `opacity`. Animations on these properties skip layout and paint entirely.
2. **Paint (Moderate)**: `background-color`, `box-shadow`, `border-color`, `filter`.
3. **Layout (Expensive - Avoid animating!)**: `width`, `height`, `margin`, `padding`, `top`, `left`, `bottom`, `right`. Animating these forces browser reflow of surrounding elements.

---

## 2. Hard Invariants
- **NEVER animate layout properties** (`width`, `height`, `top`, `left`, `margin`) during continuous user transitions. Use `transform: scale()` or `transform: translate3d()` instead.
- **NEVER interleave DOM reads and writes in the same animation frame** (prevents Layout Thrashing).
- **Limit backdrop-filter blur on mobile**: Extensive `backdrop-blur-xl` on large scrolling surfaces degrades mobile GPU performance. Use subtle solid or semi-transparent backgrounds with moderate blur (`backdrop-blur-md`).
- **Always respect reduced motion**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Context-Appropriate Timings**:
  - Micro-interactions (hover, tap, toggle): `150ms – 200ms`
  - Modal entrances, drawer slides: `250ms – 300ms`
  - Page transitions: `300ms – 400ms` with ease-out or spring physics.
