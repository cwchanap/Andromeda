# HPA-564 Observer Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing alien-sky flow discoverable from Galaxy and let alternate-observer users return to Galaxy to choose another observer.

**Architecture:** Keep URL-driven full-page navigation as the only observer state. Restructure the existing Galaxy dialog so its primary actions remain visible above a scrollable details body, and extend the existing Constellation observer action group with a localized Galaxy route. Reuse the current eligibility helper, route helpers, HUD styling, and component boundaries.

**Tech Stack:** Astro, Svelte 5, TypeScript, Vitest, Testing Library, existing i18n dictionaries and route helpers.

## Global Constraints

- No global observer store, persistence, history, or observer dropdown.
- No astronomy, catalog transformation, renderer, photometry, or route-state changes.
- Preserve focusable `aria-disabled` behavior for ineligible Galaxy systems.
- Keep `Return to Earth/Sol` as the canonical query-free reset.
- HPA-436 owns the cross-view Playwright journey and shipping cleanup coverage.

---

### Task 1: Lock the Galaxy action hierarchy

**Files:**
- Modify: `src/components/__tests__/GalaxyWrapper.test.ts`
- Modify: `src/components/GalaxyWrapper.svelte`

**Interfaces:**
- Consumes: `observerEligibility`, `navigateToObserverSky()`, `navigateToSystem()`, and existing `.action-button` styles.
- Produces: `.dialog-primary-actions` before `.dialog-content`, with View Sky primary and Explore secondary.

- [x] Write a failing component test asserting the fixed action row precedes the details body and has the desired hierarchy.
- [ ] Restructure the dialog with fixed header/actions and a scrollable details body.
- [ ] Run the focused Galaxy wrapper tests.

### Task 2: Add observer reselection navigation

**Files:**
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/components/ConstellationWrapper.svelte`

**Interfaces:**
- Consumes: `routes.galaxy(currentLang)` and the existing `.observer-actions` / `.observer-action-btn` styles.
- Produces: `chooseAnotherObserver(): void` and visible action pairs in working alternate mode and the observer WebGL fallback.

- [x] Write failing component tests for localized Galaxy navigation and fallback visibility.
- [ ] Implement the route callback and render the new action beside Return to Earth/Sol.
- [ ] Run focused observer wrapper tests.

### Task 3: Add locale parity

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/ja.ts`
- Modify: `src/i18n/__tests__/observerUiI18nSync.test.ts`

**Interfaces:**
- Produces: `constellation.observer.chooseAnother` in all supported locales.

- [x] Add the failing parity assertion.
- [ ] Add concise English, Simplified Chinese, and Japanese copy.
- [ ] Run the observer i18n parity test.

### Task 4: Verify the focused PR

- [ ] Run `bun run test:run -- src/components/__tests__/GalaxyWrapper.test.ts src/components/__tests__/ConstellationWrapper.observer.test.ts src/i18n/__tests__/observerUiI18nSync.test.ts`.
- [ ] Run `bun run type-check`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run build`.
- [ ] Review the final diff for unrelated redesign or duplicated HPA-436 scope.
