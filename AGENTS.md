# Repository Guidelines

## Project Structure & Module Organization
Andromeda pairs Astro routes with Svelte-driven UI and domain logic. Interactive views live in `src/components` (UI atoms under `ui/`, feature widgets alongside their data). Simulation code resides in `src/lib/solar-system` and supporting utilities in `src/lib/universe` and `src/utils`. Shared state stores live in `src/stores`, while `src/pages` defines Astro page entry points. Domain data is kept under `src/data`, and localized copy under `src/i18n`. Unit-level helpers and fixtures live in `src/test`. End-to-end assets sit in `e2e`, static files in `public`, and long-form references in `docs`.

## Build, Test, and Development Commands
- `npm run dev` launches the Astro dev server on `http://localhost:4321` with hot reload.
- `npm run build` creates a production bundle in `dist/`; follow with `npm run preview` to smoke-test.
- `npm run type-check` executes `astro check` for TypeScript and Astro template safety.
- `npm run lint` runs ESLint with Astro/Svelte plugins; `npm run format` applies Prettier + Tailwind sorting.
- `npm run test:run` covers Vitest suites; append `--watch` or use `npm run test:watch` for TDD loops.
- `npm run test:e2e` executes Playwright scenarios; use `npm run test:e2e:smoke` for quick validation.
- `npm run ci:test` mirrors the GitHub Actions workflow (lint, type-check, coverage, build) before pushing.

## Coding Style & Naming Conventions
Automatic formatting is mandatory; run `npm run format` before committing. Stick to two-space indentation, TypeScript everywhere, and favor explicit return types on exported utilities. Svelte and React components use PascalCase (`OrbitPanel.svelte`), stores and util modules use kebab-case filenames, and exported constants follow SCREAMING_SNAKE_CASE for configuration. Tailwind utility classes should be grouped by layout → spacing → color to align with the Prettier Tailwind plugin.

## Testing Guidelines
Vitest targets use `*.spec.ts` and should live adjacent to the code under test or within `src/test` when heavily shared. Reach for Testing Library helpers for DOM work, and mock Three.js with the provided fixtures. Maintain coverage by running `npm run test:coverage` and keep new modules above the CI threshold (>90%). Playwright specs in `e2e/tests` must tag quick smoke flows with `@smoke` and include deterministic waits.

## Commit & Pull Request Guidelines
Follow conventional commits (`feat:`, `fix:`, `chore:`) as seen in recent history. Each PR should describe scope, link related GitHub issues, and attach before/after captures for UI or rendering changes. Note any configuration updates, list the validation commands you ran, and ensure CI passes before requesting review.
