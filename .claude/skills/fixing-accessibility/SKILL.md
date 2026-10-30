---
name: fixing-accessibility
description: Audit and fix web accessibility issues including ARIA labels, keyboard navigation, focus management, color contrast, and form errors. Use when adding interactive controls, forms, dialogs, or reviewing WCAG compliance.
---

# Fixing Accessibility (a11y)

Engineered guidelines for WCAG 2.1 AA compliance and frictionless accessibility.

---

## 1. Accessible Names & Labels (Critical)
- **Every interactive control must have an accessible name**:
  - Buttons with text have an accessible name from their text content.
  - Icon-only buttons (such as back arrows `←` or close `✕` buttons) **MUST** have an explicit `aria-label` attribute (e.g. `aria-label="뒤로 가기"` or `aria-label="창 닫기"`).
  - Every form input must have a corresponding `<label>` or `aria-label`.
- **Decorative Icons**: Purely decorative SVG icons must have `aria-hidden="true"`.
- **Meaningful Link Text**: Avoid generic "여기를 클릭하세요" ("Click here"); provide context like "다산자이 실거래가 분석 보기".

---

## 2. Keyboard Access & Focus Rings (Critical)
- **Native Elements**: Never use `<div onClick=...>` when a native `<button>` or `<a>` can be used. If a div must be interactive, attach `role="button"`, `tabIndex={0}`, and handle `onKeyDown` (Enter/Space).
- **Visible Focus States**: Never write `outline: none` without providing an alternative focus ring (e.g. `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`).
- **Focus Trapping in Modals**: Dialogs and bottom sheets must trap focus inside the modal and return focus to the trigger upon dismissal.
- **Escape Key Dismissal**: Pressing `Escape` must close any active modal or dropdown.

---

## 3. Contrast & States
- **Text Contrast**: Normal text must maintain at least a **4.5:1** contrast ratio against its background; large text (18px+ bold or 24px+) must maintain at least **3.0:1**.
- **Error States**: Form validation errors must be associated with the input using `aria-describedby="field-error-id"` and have `aria-invalid="true"`.
