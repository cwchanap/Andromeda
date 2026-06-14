# I18n Route Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove symlinked and duplicated locale route files while preserving localized `/zh/*` and `/ja/*` URLs and unprefixed English canonical URLs.

**Architecture:** Use Astro's standard `prefixDefaultLocale: false` model: default-locale route modules live directly under `src/pages`, and non-default locale URLs are served through i18n rewrite fallback. Replace route-file duplication with one dynamic planetary route and one centralized route helper used by Astro pages and Svelte components.

**Tech Stack:** Astro 5 SSR on Vercel, Svelte 5, TypeScript, Astro i18n routing, Vitest, Playwright.

---

## Current Findings

- `src/pages/zh` and `src/pages/ja` are tracked symlinks to `src/pages/en`.
- `src/pages/en/planetary/*.astro` contains eight near-identical route files that differ mainly by title and `systemId`.
- `src/pages/galaxy.astro` and `src/pages/en/galaxy.astro` are duplicate route modules with only import-depth differences.
- `src/pages/index.astro` and `src/pages/en/index.astro` differ by one missing `aria.settings` translation entry.
- `src/pages/planetary/terrain/[planetId].astro` and `src/pages/en/planetary/terrain/[planetId].astro` are duplicate route modules, and the `en` copy redirects invalid planet IDs to `/ja/planetary/solar`.
- Client navigation is scattered across `MainMenu.svelte`, `GalaxyWrapper.svelte`, `TerrainExplorer.svelte`, `CelestialBodyInfoModal.svelte`, `PlanetarySystemWrapper.svelte`, `ConstellationWrapper.svelte`, and `LanguageSelector.svelte`.
- `src/middleware.ts` currently redirects `/planetary/*` to `/en/planetary/*`, which conflicts with `prefixDefaultLocale: false`.

## Target Route Contract

- English canonical URLs:
  - `/`
  - `/galaxy`
  - `/constellation`
  - `/planetary/solar`
  - `/planetary/alpha-centauri`
  - `/planetary/terrain/earth`
- Localized URLs:
  - `/zh/`
  - `/zh/galaxy`
  - `/zh/constellation`
  - `/zh/planetary/solar`
  - `/zh/planetary/terrain/earth`
  - `/ja/...` equivalents
- Compatibility:
  - `/en/*` should redirect permanently to the unprefixed English canonical path.
  - `/planetary/*` should no longer redirect to `/en/planetary/*`.

## File Structure

- Modify: `astro.config.mjs`
  - Set `fallbackType: "rewrite"`.
  - Remove `vite.resolve.preserveSymlinks` after symlinks are deleted.
- Modify: `src/middleware.ts`
  - Remove `/planetary/* -> /en/planetary/*`.
  - Add `/en/* -> /*` compatibility redirect if Astro's built-in i18n middleware does not already handle it in this checkout.
- Modify: `src/i18n/utils.ts`
  - Prefer `Astro.currentLocale` in Astro pages by accepting an optional locale string.
  - Keep URL parsing only as browser fallback.
- Create: `src/i18n/routes.ts`
  - Own all locale-aware URL generation for client components.
- Create: `src/pages/planetary/[systemId].astro`
  - Replace all static per-system planetary page files.
- Modify: `src/pages/index.astro`
  - Keep as canonical homepage.
  - Ensure it passes the complete translation map currently missing in `src/pages/en/index.astro`.
- Modify: `src/pages/galaxy.astro`
  - Keep as canonical galaxy page.
- Modify: `src/pages/constellation.astro`
  - Keep as canonical constellation page.
- Modify: `src/pages/planetary/terrain/[planetId].astro`
  - Keep as canonical terrain route and fix invalid-id redirect through the route helper.
- Delete: `src/pages/en/`
  - Remove duplicated default-locale route files.
- Delete: `src/pages/zh`
  - Remove symlink.
- Delete: `src/pages/ja`
  - Remove symlink.
- Modify Svelte navigation call sites:
  - `src/components/MainMenu.svelte`
  - `src/components/GalaxyWrapper.svelte`
  - `src/components/TerrainExplorer.svelte`
  - `src/components/CelestialBodyInfoModal.svelte`
  - `src/components/PlanetarySystemWrapper.svelte`
  - `src/components/ConstellationWrapper.svelte`
  - `src/components/LanguageSelector.svelte`
- Add/modify tests:
  - `src/i18n/__tests__/routes.test.ts`
  - `src/components/__tests__/MainMenu.test.ts`
  - `src/components/__tests__/LanguageSelector.test.ts`
  - Existing wrapper tests where hard-coded routes change.
  - Add one Playwright smoke check for `/zh/galaxy` CSS and `/zh/planetary/solar`.

---

### Task 1: Lock the Desired Route Contract With Tests

**Files:**

- Create: `src/i18n/routes.ts`
- Create: `src/i18n/__tests__/routes.test.ts`

- [ ] **Step 1: Create route helper API as a failing-test target**

Add an empty module so tests can import it:

```ts
// src/i18n/routes.ts
export {};
```

- [ ] **Step 2: Write failing route tests**

```ts
// src/i18n/__tests__/routes.test.ts
import { describe, expect, it } from "vitest";
import {
  getLocaleFromPath,
  localizePath,
  switchLocalePath,
  routes,
  type AppLocale,
} from "../routes";

describe("i18n routes", () => {
  it("detects supported locales from URL paths", () => {
    expect(getLocaleFromPath("/")).toBe("en");
    expect(getLocaleFromPath("/galaxy")).toBe("en");
    expect(getLocaleFromPath("/zh/galaxy")).toBe("zh");
    expect(getLocaleFromPath("/ja/planetary/solar")).toBe("ja");
  });

  it("localizes canonical paths using unprefixed English", () => {
    expect(localizePath("/galaxy", "en")).toBe("/galaxy");
    expect(localizePath("/galaxy", "zh")).toBe("/zh/galaxy");
    expect(localizePath("/planetary/solar", "ja")).toBe("/ja/planetary/solar");
  });

  it("switches locale without duplicating existing locale prefixes", () => {
    expect(switchLocalePath("/zh/galaxy", "ja")).toBe("/ja/galaxy");
    expect(switchLocalePath("/ja/planetary/solar", "en")).toBe(
      "/planetary/solar",
    );
    expect(switchLocalePath("/planetary/terrain/earth", "zh")).toBe(
      "/zh/planetary/terrain/earth",
    );
  });

  it("builds app route URLs from stable domain ids", () => {
    const locales: AppLocale[] = ["en", "zh", "ja"];
    expect(locales.map((locale) => routes.home(locale))).toEqual([
      "/",
      "/zh/",
      "/ja/",
    ]);
    expect(routes.galaxy("zh")).toBe("/zh/galaxy");
    expect(routes.constellation("ja")).toBe("/ja/constellation");
    expect(routes.planetarySystem("solar", "en")).toBe("/planetary/solar");
    expect(routes.terrain("mars", "zh")).toBe("/zh/planetary/terrain/mars");
  });
});
```

- [ ] **Step 3: Verify tests fail**

Run:

```bash
bunx vitest src/i18n/__tests__/routes.test.ts
```

Expected: FAIL because `getLocaleFromPath`, `localizePath`, `switchLocalePath`, and `routes` are not exported yet.

### Task 2: Implement Central Route Helpers

**Files:**

- Modify: `src/i18n/routes.ts`
- Modify: `src/i18n/utils.ts`

- [ ] **Step 1: Implement `routes.ts`**

```ts
// src/i18n/routes.ts
import { defaultLang, languages, showDefaultLang } from "./ui";

export type AppLocale = keyof typeof languages;

export const appLocales = Object.keys(languages) as AppLocale[];

export function isAppLocale(value: string | undefined): value is AppLocale {
  return Boolean(value && value in languages);
}

export function getLocaleFromPath(pathname: string): AppLocale {
  const [, segment] = pathname.split("/");
  return isAppLocale(segment) ? segment : defaultLang;
}

export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/");
  if (isAppLocale(segments[1])) {
    const stripped = `/${segments.slice(2).join("/")}`;
    return stripped === "/" ? "/" : stripped.replace(/\/+$/, "");
  }
  return pathname === "" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

export function localizePath(pathname: string, locale: AppLocale): string {
  const canonicalPath = stripLocaleFromPath(pathname);
  if (!showDefaultLang && locale === defaultLang) {
    return canonicalPath;
  }
  return canonicalPath === "/" ? `/${locale}/` : `/${locale}${canonicalPath}`;
}

export function switchLocalePath(pathname: string, locale: AppLocale): string {
  return localizePath(stripLocaleFromPath(pathname), locale);
}

export const routes = {
  home: (locale: AppLocale) => localizePath("/", locale),
  galaxy: (locale: AppLocale) => localizePath("/galaxy", locale),
  constellation: (locale: AppLocale) => localizePath("/constellation", locale),
  planetarySystem: (systemId: string, locale: AppLocale) =>
    localizePath(`/planetary/${systemId}`, locale),
  terrain: (planetId: string, locale: AppLocale) =>
    localizePath(`/planetary/terrain/${planetId}`, locale),
};
```

- [ ] **Step 2: Make existing utils delegate route behavior**

Keep public exports stable while removing duplicated path logic:

```ts
// src/i18n/utils.ts
import { ui, defaultLang, type UiKey } from "./ui";
import {
  getLocaleFromPath,
  localizePath,
  stripLocaleFromPath,
  isAppLocale,
  type AppLocale,
} from "./routes";

export function getLangFromUrl(url: URL, currentLocale?: string): AppLocale {
  if (isAppLocale(currentLocale)) return currentLocale;
  return getLocaleFromPath(url.pathname);
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: UiKey, replacements?: Record<string, string>): string {
    let text: string = ui[lang][key] || ui[defaultLang][key];

    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        text = text.replace(`{${placeholder}}`, value);
      });
    }

    return text;
  };
}

export function useTranslatedPath(lang: keyof typeof ui) {
  return function translatePath(path: string, l: keyof typeof ui = lang) {
    return localizePath(path, l);
  };
}

export function getStaticPaths() {
  return Object.keys(ui).map((lang) => ({ params: { lang } }));
}

export function pathHasLocale(pathname: string) {
  const [, segment] = pathname.split("/");
  return isAppLocale(segment);
}

export { stripLocaleFromPath };

export function addLocaleToPath(pathname: string, locale: keyof typeof ui) {
  return localizePath(pathname, locale);
}
```

- [ ] **Step 3: Verify route tests pass**

Run:

```bash
bunx vitest src/i18n/__tests__/routes.test.ts src/i18n/__tests__/utils.test.ts
```

Expected: PASS. If existing `utils.test.ts` has expectations for `/en/*`, update those tests to reflect that `/en/*` is compatibility-only, not canonical.

### Task 3: Move Astro i18n to Rewrite Fallbacks and Remove Symlink Dependence

**Files:**

- Modify: `astro.config.mjs`
- Modify: `src/middleware.ts`
- Delete: `src/pages/zh`
- Delete: `src/pages/ja`

- [ ] **Step 1: Update Astro i18n config**

```js
// astro.config.mjs
export default defineConfig({
  server: {
    port: 3600,
  },
  trailingSlash: "ignore",
  output: "server",
  adapter: vercel(),
  integrations: [svelte()],
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "ja"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: true,
      fallbackType: "rewrite",
    },
    fallback: {
      zh: "en",
      ja: "en",
    },
  },
});
```

- [ ] **Step 2: Replace custom middleware redirect**

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);

  if (url.pathname === "/en" || url.pathname.startsWith("/en/")) {
    const canonicalPath = url.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return context.redirect(`${canonicalPath}${url.search}`, 301);
  }

  return next();
});
```

- [ ] **Step 3: Delete symlinks**

Run:

```bash
git rm src/pages/zh src/pages/ja
```

Expected: `git status --short` shows deleted symlink entries only, not deleted real route files.

- [ ] **Step 4: Build and inspect route manifest**

Run:

```bash
bun run build
```

Then run a manifest check:

```bash
bun --eval 'const fs = await import("node:fs"); const path = await import("node:path"); const dir = ".vercel/output/_functions"; const manifestFile = fs.readdirSync(dir).find((f) => f.startsWith("manifest_") && f.endsWith(".mjs")); const { manifest } = await import(path.resolve(dir, manifestFile)); for (const route of ["/zh/galaxy", "/ja/galaxy"]) { const entry = manifest.routes.find((r) => r.routeData.route === route || r.routeData.fallbackRoutes?.some((f) => f.route === route)); const styles = entry?.styles ?? []; console.log(route, styles.length); if (!entry || styles.length === 0) process.exit(1); }'
```

Expected: each checked localized route exists through fallback routing and has nonzero styles.

### Task 4: Replace Static Per-System Pages With One Dynamic Route

**Files:**

- Create: `src/pages/planetary/[systemId].astro`
- Delete: `src/pages/en/planetary/alpha-centauri.astro`
- Delete: `src/pages/en/planetary/barnards-star.astro`
- Delete: `src/pages/en/planetary/kepler-438.astro`
- Delete: `src/pages/en/planetary/kepler-442.astro`
- Delete: `src/pages/en/planetary/ross-128.astro`
- Delete: `src/pages/en/planetary/solar.astro`
- Delete: `src/pages/en/planetary/trappist-1.astro`
- Delete: `src/pages/en/planetary/wolf-359.astro`

- [ ] **Step 1: Create the canonical dynamic route**

```astro
---
import GlobalStyles from "@/components/GlobalStyles.astro";
import PlanetarySystemWrapper from "@/components/PlanetarySystemWrapper.svelte";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector.svelte";
import { planetarySystemRegistry } from "@/lib/planetary-system";
import { getLangFromUrl, useTranslations } from "@/i18n/utils";
import { routes } from "@/i18n/routes";
import { ui } from "@/i18n/ui";

const lang = getLangFromUrl(Astro.url, Astro.currentLocale);
const t = useTranslations(lang);
const translations = ui[lang] || ui.en;
const { systemId } = Astro.params;

if (!systemId || !planetarySystemRegistry.hasSystem(systemId)) {
  return Astro.redirect(routes.home(lang));
}

const system = planetarySystemRegistry.getSystem(systemId);
const title =
  systemId === "solar" ? t("main.solar") : system?.systemData.name || systemId;
---

<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <GlobalStyles />
    <title>{title} - {t("main.title")}</title>
  </head>

  <body>
    <GlobalLanguageSelector client:load />

    <div id="planetary-system-container">
      <PlanetarySystemWrapper
        systemId={systemId}
        {lang}
        {translations}
        client:only="svelte"
      />
    </div>

    <style>
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      #planetary-system-container {
        position: relative;
        width: 100vw;
        height: 100vh;
      }
    </style>
  </body>
</html>
```

- [ ] **Step 2: Delete duplicated static system route files**

Run:

```bash
git rm src/pages/en/planetary/alpha-centauri.astro src/pages/en/planetary/barnards-star.astro src/pages/en/planetary/kepler-438.astro src/pages/en/planetary/kepler-442.astro src/pages/en/planetary/ross-128.astro src/pages/en/planetary/solar.astro src/pages/en/planetary/trappist-1.astro src/pages/en/planetary/wolf-359.astro
```

- [ ] **Step 3: Verify system routes render**

Run:

```bash
bun run build
```

Expected: build passes and Vercel handler can render `/planetary/solar`, `/zh/planetary/solar`, and `/ja/planetary/alpha-centauri`.

### Task 5: Remove Remaining Default-Locale Duplicate Pages

**Files:**

- Delete: `src/pages/en/index.astro`
- Delete: `src/pages/en/galaxy.astro`
- Delete: `src/pages/en/planetary/terrain/[planetId].astro`
- Delete empty directories under `src/pages/en/`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/galaxy.astro`
- Modify: `src/pages/planetary/terrain/[planetId].astro`

- [ ] **Step 1: Keep root pages as canonical**

Update canonical pages to derive locale through Astro's current locale when available:

```ts
const lang = getLangFromUrl(Astro.url, Astro.currentLocale);
```

Apply this to:

- `src/pages/index.astro`
- `src/pages/galaxy.astro`
- `src/pages/constellation.astro`
- `src/pages/planetary/terrain/[planetId].astro`
- `src/pages/planetary/[systemId].astro`

- [ ] **Step 2: Fix terrain invalid redirect**

In `src/pages/planetary/terrain/[planetId].astro`, replace the invalid-id redirect with:

```ts
if (!validPlanets.includes(planetId as string)) {
  return Astro.redirect(routes.planetarySystem("solar", lang));
}
```

- [ ] **Step 3: Remove duplicate default-locale files**

Run:

```bash
git rm src/pages/en/index.astro src/pages/en/galaxy.astro 'src/pages/en/planetary/terrain/[planetId].astro'
```

Then remove empty directories if Git reports them as empty.

- [ ] **Step 4: Verify no locale route directories remain**

Run:

```bash
find src/pages -maxdepth 2 -type l -print
find src/pages -maxdepth 2 -type d -name en -o -name zh -o -name ja
```

Expected: no symlinked locale folders and no `src/pages/en`, `src/pages/zh`, or `src/pages/ja` route directories.

### Task 6: Centralize Client Navigation

**Files:**

- Modify: `src/components/MainMenu.svelte`
- Modify: `src/components/GalaxyWrapper.svelte`
- Modify: `src/components/TerrainExplorer.svelte`
- Modify: `src/components/CelestialBodyInfoModal.svelte`
- Modify: `src/components/PlanetarySystemWrapper.svelte`
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/LanguageSelector.svelte`

- [ ] **Step 1: Replace `LanguageSelector` path switching**

Use `switchLocalePath`:

```ts
import { switchLocalePath, type AppLocale } from "../i18n/routes";

function handleLanguageChange(newLang: AppLocale) {
  if (typeof window !== "undefined") {
    const currentUrl = new URL(window.location.href);
    window.location.href = switchLocalePath(currentUrl.pathname, newLang);
  }
  showLanguageSelector = false;
}
```

- [ ] **Step 2: Replace `MainMenu` hard-coded URLs**

```ts
import { routes } from "../i18n/routes";

const handleStartGame = () => {
  gameActions.navigateToView("solar-system");
  window.location.href = routes.planetarySystem("solar", currentLang);
};

const handleGalaxyView = () => {
  window.location.href = routes.galaxy(currentLang);
};

const handleConstellationView = () => {
  window.location.href = routes.constellation(currentLang);
};

const handleSelectSystem = (systemId: string) => {
  gameActions.navigateToView("solar-system");
  showSystemSelector = false;
  window.location.href = routes.planetarySystem(systemId, currentLang);
};
```

- [ ] **Step 3: Replace other hard-coded routes**

Use:

```ts
routes.home(currentLang);
routes.planetarySystem("solar", lang);
routes.terrain(celestialBody.id, lang);
routes.planetarySystem(routeSystemId, currentLang);
```

Apply to:

- `PlanetarySystemWrapper.svelte`
- `TerrainExplorer.svelte`
- `CelestialBodyInfoModal.svelte`
- `ConstellationWrapper.svelte`
- `GalaxyWrapper.svelte`

- [ ] **Step 4: Normalize galaxy system IDs**

In `GalaxyWrapper.svelte`, keep only the non-identity mapping:

```ts
const galaxySystemRouteIds: Record<string, string> = {
  "solar-system": "solar",
};

const routeSystemId = galaxySystemRouteIds[systemId] ?? systemId;
window.location.href = routes.planetarySystem(routeSystemId, currentLang);
```

### Task 7: Update Tests and Add Route-Level Regression Coverage

**Files:**

- Modify: `src/components/__tests__/MainMenu.test.ts`
- Modify: `src/components/__tests__/LanguageSelector.test.ts`
- Modify: related wrapper tests that assert old `/en/*` routes.
- Add: `e2e/i18n-routes.spec.ts`

- [ ] **Step 1: Update unit route expectations**

Examples:

```ts
expect(window.location.href).toBe("/planetary/solar");
expect(window.location.href).toBe("/galaxy");
expect(window.location.href).toBe("/constellation");
```

For non-English props:

```ts
const { container } = render(MainMenu, { props: { lang: "zh" } });
// click Galaxy
expect(window.location.href).toBe("/zh/galaxy");
```

- [ ] **Step 2: Add e2e route smoke test**

```ts
// e2e/i18n-routes.spec.ts
import { expect, test } from "@playwright/test";

test.describe("i18n route rendering", () => {
  test("localized galaxy route loads stylesheet links", async ({ page }) => {
    await page.goto("/zh/galaxy");
    const stylesheets = await page
      .locator('head link[rel="stylesheet"]')
      .count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test("localized planetary route renders the 3D wrapper shell", async ({
    page,
  }) => {
    await page.goto("/zh/planetary/solar");
    await expect(page.locator("#planetary-system-container")).toBeAttached();
  });

  test("default-locale prefixed URL redirects to canonical route", async ({
    page,
  }) => {
    await page.goto("/en/planetary/solar");
    await expect(page).toHaveURL(/\/planetary\/solar\/?$/);
  });
});
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
bunx vitest src/i18n/__tests__/routes.test.ts src/i18n/__tests__/utils.test.ts src/components/__tests__/LanguageSelector.test.ts src/components/__tests__/MainMenu.test.ts
bunx playwright test e2e/i18n-routes.spec.ts
```

Expected: all focused tests pass.

### Task 8: Final Verification

**Files:**

- No new source changes expected.

- [ ] **Step 1: Run build**

```bash
bun run build
```

Expected: build exits 0. Dynamic route warnings should be reviewed; if a warning says `getStaticPaths()` is ignored for a canonical dynamic route, remove unused `getStaticPaths()` or add `export const prerender = true` only if static prerendering is intentional.

- [ ] **Step 2: Run type and lint checks**

```bash
bun run type-check
bun run lint
```

Expected: no errors. Existing hints are acceptable only if they predate the work and are not from touched files.

- [ ] **Step 3: Run focused e2e route checks**

```bash
bunx playwright test e2e/i18n-routes.spec.ts
```

Expected: all tests pass.

- [ ] **Step 4: Inspect route tree**

```bash
find src/pages -maxdepth 4 -print
```

Expected: no `src/pages/en`, `src/pages/zh`, or `src/pages/ja`; canonical route modules remain under root paths only.

---

## Self-Review

- This plan removes symlinked locale route folders instead of preserving them behind `preserveSymlinks`.
- This plan removes duplicate `/en` page files and makes unprefixed English the canonical route family.
- This plan avoids one route file per planetary system by replacing static files with `src/pages/planetary/[systemId].astro`.
- This plan keeps localized URL behavior through Astro i18n rewrite fallback and centralized client route helpers.
- This plan includes regression tests for the CSS failure mode that started this investigation.
