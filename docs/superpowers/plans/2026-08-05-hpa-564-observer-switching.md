# HPA-564 Observer Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing alien-sky flow discoverable from Galaxy and let alternate-observer users return to Galaxy to choose another observer.

**Architecture:** Keep URL-driven full-page navigation as the only observer state. Restructure the existing Galaxy dialog so its product actions remain visible above a scrollable details body, and extend the existing Constellation observer action group with a localized Galaxy route. Reuse the current eligibility helper, route helpers, HUD styling, and component boundaries. ViewSwitcher already links to Galaxy; the dedicated **Choose another observer** action remains intentional because it exposes a labeled reselection exit beside **Return to Earth/Sol** without teaching users to reinterpret generic view navigation.

**Tech Stack:** Astro, Svelte 5, TypeScript, Vitest, Testing Library, Playwright, existing i18n dictionaries and route helpers.

## Global Constraints

- No global observer store, persistence, history, or observer dropdown.
- No astronomy, catalog transformation, renderer, photometry, or route-state changes.
- Preserve focusable `aria-disabled` behavior for ineligible Galaxy systems.
- Preserve the HPA-432 product hierarchy: **View sky from here** remains secondary and **Explore / Coming Soon** remains primary. HPA-564 changes placement only: the header close control stays separate while the two product actions move above the scrollable details body.
- Keep `Return to Earth/Sol` as the canonical query-free reset.
- HPA-436 owns the cross-view Playwright journey and shipping cleanup coverage.

## Risks and Exit Dependencies

- **Cross-view loop:** HPA-564 verifies each component boundary, but the complete Galaxy → observer sky → Choose another observer → Galaxy journey remains unproven until HPA-436. HPA-436 must assert that the keyboard-reachable action returns to the localized Galaxy route without an `observer` query.
- **Dialog prominence regression:** Future flex or overflow edits could hide the fixed action row again. The existing narrow-viewport Galaxy dialog Playwright test is the regression net and must keep targeting the header close control plus `.dialog-primary-actions`.

---

### Task 1: Lock the Galaxy action hierarchy

**Files:**
- Modify: `src/components/__tests__/GalaxyWrapper.test.ts`
- Modify: `src/components/GalaxyWrapper.svelte`

**Interfaces:**
- Consumes: `observerEligibility`, `navigateToObserverSky()`, `navigateToSystem()`, and existing `.action-button` styles.
- Produces: `.dialog-primary-actions` before `.dialog-content`, with View Sky first but secondary and Explore / Coming Soon second but primary, preserving HPA-432 product priority.

- [x] Write a failing component test asserting the fixed action row precedes the details body and preserves the HPA-432 hierarchy.
- [x] Restructure the dialog with fixed header/actions and a scrollable details body.
- [x] Verify the Galaxy wrapper behavior through the full unit-test suite.

### Task 2: Add observer reselection navigation

**Files:**
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/components/ConstellationWrapper.svelte`

**Interfaces:**
- Consumes: `routes.galaxy(currentLang)` and the existing `.observer-actions` / `.observer-action-btn` styles.
- Produces: `chooseAnotherObserver(): void` and visible action pairs in working alternate mode and the observer WebGL fallback.

- [x] Write failing component tests for localized Galaxy navigation and fallback visibility.
- [x] Implement the route callback and render the new action beside Return to Earth/Sol.
- [x] Verify the observer wrapper behavior through the full unit-test suite.

### Task 3: Add locale parity

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/ja.ts`
- Modify: `src/i18n/__tests__/observerUiI18nSync.test.ts`

**Interfaces:**
- Produces: `constellation.observer.chooseAnother` in all supported locales.

- [x] Add the failing parity assertion.
- [x] Add concise English, Simplified Chinese, and Japanese copy.
- [x] Verify locale parity through the full unit-test suite.

### Task 4: Verify the focused PR

- [x] Run the full Vitest suite and coverage gate in GitHub Actions.
- [x] Run `bun run type-check` in GitHub Actions.
- [x] Run `bun run lint` in GitHub Actions.
- [x] Run `bun run build` in GitHub Actions.
- [x] Update the existing narrow-viewport Galaxy dialog Playwright selectors for the separate header close control and two-button fixed action row, then run the full Playwright suite in GitHub Actions.
- [x] Review the final diff for unrelated redesign or duplicated HPA-436 scope.
