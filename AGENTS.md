# Repository Guidelines

## Project Structure & Module Organization
Source pages live in `src/pages`, while interactive Svelte UI sits in `src/components` (`ui/` for atoms, feature widgets beside their data). Physics and simulation logic is split between `src/lib/solar-system` and shared utilities under `src/lib/universe` and `src/utils`. Global stores reside in `src/stores`, domain fixtures in `src/data`, and localized copy in `src/i18n`. Tests and helpers live near their targets or in `src/test`, end-to-end assets in `e2e`, public assets in `public`, and longer references in `docs`.

## Build, Test, and Development Commands
Run `npm run dev` to launch the Astro dev server at `http://localhost:4321` with hot reload. Use `npm run build` to produce `dist/`, followed by `npm run preview` for a production smoke check. Execute `npm run lint`, `npm run format`, and `npm run type-check` before pushing to keep lint, formatting, and TypeScript in sync. `npm run test:run` drives Vitest suites; add `--watch` or run `npm run test:watch` for TDD loops. For Playwright coverage, rely on `npm run test:e2e` or the lighter `npm run test:e2e:smoke`. CI parity lives in `npm run ci:test`.

## Coding Style & Naming Conventions
Default to TypeScript with two-space indentation. Automatic formatting is mandatory; run `npm run format` prior to commits. Components use PascalCase (`OrbitPanel.svelte`), stores and utilities use kebab-case filenames, and configuration constants are SCREAMING_SNAKE_CASE. Group Tailwind classes layout → spacing → color to match the Prettier plugin.

## Testing Guidelines
Vitest specs use the `*.spec.ts` suffix and sit beside implementation files or in `src/test` for shared helpers. Favor Testing Library utilities for DOM work and the provided Three.js mocks for simulations. Maintain coverage above 90% via `npm run test:coverage`; investigate regressions immediately.

## Commit & Pull Request Guidelines
Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.) consistent with recent history. Summaries should explain scope, link related GitHub issues, and mention configuration updates. Attach before/after captures for UI changes and list validation commands (lint, tests, build) run locally. Ensure CI passes ahead of review requests.

## Security & Configuration Tips
Keep Playwright secrets and API keys out of source control; prefer `.env` files ignored by Git. Review three.js dependency updates cautiously and re-run `npm run test:e2e:smoke` after dependency bumps touching rendering or physics.
