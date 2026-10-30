---
name: design-loop
description: Autonomous multi-page site builder and iterative refinement loop using a baton-passing pattern. Each iteration plans a task, generates or refines a page, integrates it into the application structure, verifies visually and programmatically, then tracks the next task to keep momentum alive.
---

# Design Loop — Autonomous & Iterative Design Engineering

Build and refine multi-page interfaces through structured, iterative feedback cycles.

---

## 1. Baton Loop Lifecycle

Each cycle in the design loop follows 5 disciplined steps:

1. **Inspect**: Read the current task, requirement, or user feedback.
2. **Draft / Refine**: Implement the page or component using Tailwind CSS, semantic tokens, and high-quality typography.
3. **Integrate**: Link into site structure, navigation headers, bottom navigation bars, and data stores.
4. **Verify**: Check layout integrity at 375px mobile, verify zero console errors, run TypeScript and unit tests.
5. **Log & Handoff**: Update `progress.md`, document key design decisions, and state the next milestone clearly.

---

## 2. Iteration Rules
- **Never regress**: Fix reported issues without breaking previously verified features.
- **Component isolation**: Keep UI components modular with single responsibilities.
- **Mobile First**: Design for 375px mobile screens first, then ensure fluid scaling to tablet/desktop.
- **Continuous Quality Gate**: Run linter, type checks, and tests before considering any iteration complete.
