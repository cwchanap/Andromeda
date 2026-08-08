# HPA-436 shipping-gate plan

## Goal

Add focused release-confidence evidence for the existing alternate-observer sky flow, without new product behavior unless a test exposes a defect required by the ticket.

## Global constraints

- Keep this a small shipping/QA change. Do not add formulas, catalog mappings, UI features, or a visual redesign.
- Preserve HPA-564's localized happy path; extend it only with the stated keyboard evidence.
- Retain catalog/source identity assertions below the browser boundary. Do not duplicate renderer internals in Playwright.
- Prefer real supported behavior and existing test helpers. If a test exposes a production defect, first capture the defect with a focused failing test, then make the smallest in-scope fix.
- Each task must run its focused test(s); final verification runs lint, type-check, unit tests, build, and the focused Chromium observer suite.

## Task 1: Observer-routing shipping journey

Modify `e2e/observer-routing.spec.ts`.

1. Add one English Alpha Centauri journey through Galaxy selection, alternate-observer launch, Earth-reference toggle (Space), Find Sol (Enter), and Return to Earth/Sol (Enter). Assert the controls' observable results, Sol announcement, and canonical query-free final route.
2. Extend the existing Japanese reselection case: focus **Choose another observer**, assert focus, activate it with Enter, and retain the localized query-free Galaxy assertion.
3. Add a Chinese direct-load/reload case for `/zh/constellation?observer=alpha-centauri`, and an invalid-observer case that asserts a visible deterministic fallback plus normal Sol/Earth UI.
4. Run only this focused Playwright spec in Chromium and report the result. Do not introduce new Playwright projects or an observer matrix.

## Task 2: Wrapper public-boundary coverage

Modify `src/components/__tests__/ConstellationWrapper.observer.test.ts`.

1. Add a reduced-motion test for the real keyboard **Find Sol** interaction. Confirm the wrapper propagates reduced motion, invokes the Sol focus path, and produces the localized announcement.
2. Add a working alternate-observer mount → unmount → remount cleanup smoke. At the wrapper owner boundary, assert disposal of the renderer, cancellation of HUD animation work, removal of the reduced-motion listener, and exactly one fresh resource set after remount.
3. Keep renderer primitive tests unchanged unless the wrapper test identifies a genuine defect. Run this focused unit test file and report the result.

## Task 3: Targeted localization evidence

Modify `src/i18n/__tests__/observerUiI18nSync.test.ts`.

1. Add one exact, meaningful Japanese observer-copy assertion complementary to the Chinese direct-load E2E coverage.
2. Preserve the existing all-locale parity coverage; do not add another broad translation suite.
3. Run this focused test file and report the result.

## Final verification

Run:

```bash
bun run lint
bun run type-check
bun run test:run
bun run build
bunx playwright test e2e/observer-routing.spec.ts --project=chromium
```
