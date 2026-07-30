# HPA-432 Observer Query State and Galaxy Entry Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the complete HPA-432 observer URL contract, canonical explicit-Sol redirect, locale-safe route helpers, and accessible Galaxy **View sky from here** action without implementing alternate-sky rendering.

**Architecture:** A DOM-free `observerRouteState.ts` module owns parsing, serialization, candidate eligibility, and typed resolution. `routes.ts` composes localized observer URLs and centralizes locale switching, while `constellation.astro` is the only page-level consumer in this slice and canonicalizes exactly one `observer=sol` parameter. `GalaxyWrapper.svelte` consumes the shared eligibility helper, keeps the existing Explore path untouched, and adds a separate secondary View Sky action.

**Tech Stack:** TypeScript 5.8, Astro 5 server output, Svelte 5, Vitest 3, Testing Library, Playwright 1.54, existing `localGalaxyData`, and existing i18n catalogs (`en`, `zh`, `ja`).

## Global Constraints

- Implement against the approved design in `docs/superpowers/specs/2026-07-30-observer-query-state-and-galaxy-entry-action-design.md`.
- Do not commit directly to `main`; execute from an isolated worktree and feature branch created from the latest merged design/plan base.
- Do not depend on HPA-431 astronomy transforms, tolerances, Three.js helpers, Svelte stores, DOM APIs, or renderer code from the route-state module.
- Observer IDs are exact and case-sensitive. Do not trim, lowercase, alias, or pass IDs through `resolveRouteSystemId()`.
- Preserve the existing full-page navigation model using real URLs and `window.location.href`.
- Leave the existing `canExplore` calculation, primary Explore styling, route mapping, and Coming Soon notice behavior untouched.
- Keep `invalid-coordinates` and `origin-collision` distinct in the typed domain result, but expose one generic Galaxy message: `galaxy.skyUnavailable`.
- Use focusable `aria-disabled="true"` for an unavailable View Sky action; do not use the native `disabled` attribute.
- Exactly one `observer=sol` parameter redirects server-side to the matching query-free localized URL with HTTP 308; duplicate observer parameters do not redirect.
- `resolveObserverState()` remains a module contract in HPA-432. Do not wire observer rendering or fallback notices into `ConstellationWrapper.svelte`.
- Full query-bearing localized deployment coverage remains in HPA-436; HPA-432 adds only the focused explicit-Sol redirect test.

---

## File Responsibility Map

- `src/lib/constellation/observerRouteState.ts`: pure observer query parsing, serialization, structural candidate eligibility, and typed resolution.
- `src/lib/constellation/__tests__/observerRouteState.test.ts`: exhaustive contract coverage for parser, serializer, eligibility, and resolver provenance.
- `src/i18n/routes.ts`: localized route builders, observer query composition, and locale-switch URL preservation.
- `src/i18n/__tests__/routes.test.ts`: route and locale helper matrix, including nullish observer options and encoding.
- `src/pages/constellation.astro`: server-side canonical redirect for exactly one explicit Sol observer request.
- `e2e/observer-routing.spec.ts`: focused HTTP redirect behavior independent of WebGL and Constellation rendering.
- `src/components/LanguageSelector.svelte`: switch locale through the shared URL helper.
- `src/components/hud/SettingsPanel.svelte`: switch locale through the shared URL helper.
- `src/components/hud/__tests__/SettingsPanel.test.ts`: strengthen the existing navigation test with observer query and hash preservation.
- `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/ja.ts`: add exactly two HPA-432 UI strings.
- `src/i18n/__tests__/observerUiI18nSync.test.ts`: enforce non-empty HPA-432 keys across all supported locales.
- `src/components/GalaxyWrapper.svelte`: independent observer eligibility, View Sky navigation, action hierarchy, and focusable unavailable state.
- `src/components/__tests__/GalaxyWrapper.test.ts`: component contract for action order, navigation, shared helper use, generic unavailable state, and Explore regressions.

---

### Task 1: Add observer query parsing and suffix serialization

**Files:**
- Create: `src/lib/constellation/observerRouteState.ts`
- Create: `src/lib/constellation/__tests__/observerRouteState.test.ts`

**Interfaces:**
- Consumes: standard `URLSearchParams` only.
- Produces:

```ts
export type ParsedObserverQuery =
    | { kind: "missing" }
    | { kind: "explicit-sol" }
    | { kind: "candidate"; observerId: string }
    | { kind: "malformed"; reason: "empty"; requestedObserver: "" }
    | { kind: "malformed"; reason: "duplicate"; requestedObserver: null };

export function parseObserverQuery(
    searchParams: URLSearchParams,
): ParsedObserverQuery;

export function serializeObserverQuery(
    observerId: string | "sol" | null | undefined,
): string;
```

- [ ] **Step 1: Create the failing parser and serializer tests**

Create `src/lib/constellation/__tests__/observerRouteState.test.ts` with the parser and serializer sections below:

```ts
import { describe, expect, it } from "vitest";
import {
    parseObserverQuery,
    serializeObserverQuery,
} from "../observerRouteState";

describe("parseObserverQuery", () => {
    it("returns missing when observer is absent", () => {
        expect(parseObserverQuery(new URLSearchParams("foo=bar"))).toEqual({
            kind: "missing",
        });
    });

    it("returns explicit-sol for exactly one observer=sol", () => {
        expect(
            parseObserverQuery(new URLSearchParams("observer=sol")),
        ).toEqual({ kind: "explicit-sol" });
    });

    it("returns a candidate for one non-empty exact value", () => {
        expect(
            parseObserverQuery(
                new URLSearchParams("observer=alpha-centauri"),
            ),
        ).toEqual({
            kind: "candidate",
            observerId: "alpha-centauri",
        });
    });

    it("preserves whitespace and case in candidate ids", () => {
        expect(
            parseObserverQuery(
                new URLSearchParams("observer=%20Alpha-Centauri%20"),
            ),
        ).toEqual({
            kind: "candidate",
            observerId: " Alpha-Centauri ",
        });
    });

    it("returns an empty malformed result with an empty requested value", () => {
        expect(parseObserverQuery(new URLSearchParams("observer="))).toEqual({
            kind: "malformed",
            reason: "empty",
            requestedObserver: "",
        });
    });

    it("returns a duplicate malformed result without choosing a value", () => {
        expect(
            parseObserverQuery(
                new URLSearchParams(
                    "observer=sol&observer=alpha-centauri",
                ),
            ),
        ).toEqual({
            kind: "malformed",
            reason: "duplicate",
            requestedObserver: null,
        });
    });
});

describe("serializeObserverQuery", () => {
    it.each(["sol", null, undefined])(
        "omits the observer parameter for %s",
        (observerId) => {
            expect(serializeObserverQuery(observerId)).toBe("");
        },
    );

    it("returns a leading-question-mark suffix for a system observer", () => {
        expect(serializeObserverQuery("alpha-centauri")).toBe(
            "?observer=alpha-centauri",
        );
    });

    it("encodes observer ids with URLSearchParams semantics", () => {
        expect(serializeObserverQuery("alpha centauri/β")).toBe(
            "?observer=alpha+centauri%2F%CE%B2",
        );
    });
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerRouteState.test.ts
```

Expected: FAIL because `../observerRouteState` does not exist.

- [ ] **Step 3: Implement parser types and query parsing**

Create `src/lib/constellation/observerRouteState.ts` with:

```ts
export type ParsedObserverQuery =
    | { kind: "missing" }
    | { kind: "explicit-sol" }
    | { kind: "candidate"; observerId: string }
    | { kind: "malformed"; reason: "empty"; requestedObserver: "" }
    | { kind: "malformed"; reason: "duplicate"; requestedObserver: null };

export function parseObserverQuery(
    searchParams: URLSearchParams,
): ParsedObserverQuery {
    const values = searchParams.getAll("observer");

    if (values.length === 0) {
        return { kind: "missing" };
    }

    if (values.length > 1) {
        return {
            kind: "malformed",
            reason: "duplicate",
            requestedObserver: null,
        };
    }

    const [observerId] = values;

    if (observerId === "") {
        return {
            kind: "malformed",
            reason: "empty",
            requestedObserver: "",
        };
    }

    if (observerId === "sol") {
        return { kind: "explicit-sol" };
    }

    return { kind: "candidate", observerId };
}
```

- [ ] **Step 4: Implement query-suffix serialization**

Append to `src/lib/constellation/observerRouteState.ts`:

```ts
export function serializeObserverQuery(
    observerId: string | "sol" | null | undefined,
): string {
    if (observerId == null || observerId === "sol") {
        return "";
    }

    const params = new URLSearchParams();
    params.set("observer", observerId);
    return `?${params.toString()}`;
}
```

- [ ] **Step 5: Run the focused test and verify the green state**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerRouteState.test.ts
```

Expected: PASS with all parser and serializer tests green.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/lib/constellation/observerRouteState.ts \
  src/lib/constellation/__tests__/observerRouteState.test.ts
git commit -m "feat: add observer query parsing"
```

---

### Task 2: Add shared candidate eligibility and typed resolution

**Files:**
- Modify: `src/lib/constellation/observerRouteState.ts`
- Modify: `src/lib/constellation/__tests__/observerRouteState.test.ts`

**Interfaces:**
- Consumes: `ParsedObserverQuery` from Task 1 and structural observer candidates.
- Produces:

```ts
export interface ObserverCandidate {
    id: string;
    position: { x: number; y: number; z: number };
}

export type ObserverEligibility =
    | { eligible: true }
    | {
          eligible: false;
          reason: "invalid-coordinates" | "origin-collision";
      };

export type ResolvedObserverState =
    | {
          kind: "sol";
          observerId: "sol";
          source: "missing" | "explicit-sol";
      }
    | { kind: "system"; observerId: string }
    | {
          kind: "fallback";
          observerId: "sol";
          requestedObserver: string | null;
          reason:
              | "empty"
              | "duplicate"
              | "unknown-system"
              | "invalid-coordinates"
              | "origin-collision";
      };

export function isObserverCandidateEligible(
    candidate: ObserverCandidate,
): ObserverEligibility;

export function resolveObserverState(
    parsed: ParsedObserverQuery,
    candidates: readonly ObserverCandidate[],
): ResolvedObserverState;
```

- [ ] **Step 1: Add failing eligibility tests**

Append to `observerRouteState.test.ts` imports and tests:

```ts
import {
    isObserverCandidateEligible,
    parseObserverQuery,
    resolveObserverState,
    serializeObserverQuery,
    type ObserverCandidate,
} from "../observerRouteState";

const eligibleCandidate: ObserverCandidate = {
    id: "alpha-centauri",
    position: { x: -1.58, y: -3.7, z: -1.32 },
};

describe("isObserverCandidateEligible", () => {
    it("accepts finite non-origin coordinates", () => {
        expect(isObserverCandidateEligible(eligibleCandidate)).toEqual({
            eligible: true,
        });
    });

    it.each([
        { x: Number.NaN, y: 1, z: 1 },
        { x: 1, y: Number.POSITIVE_INFINITY, z: 1 },
        { x: 1, y: 1, z: Number.NEGATIVE_INFINITY },
    ])("rejects non-finite coordinates: %j", (position) => {
        expect(
            isObserverCandidateEligible({ id: "broken", position }),
        ).toEqual({
            eligible: false,
            reason: "invalid-coordinates",
        });
    });

    it("rejects an exact origin position", () => {
        expect(
            isObserverCandidateEligible({
                id: "origin",
                position: { x: 0, y: 0, z: 0 },
            }),
        ).toEqual({
            eligible: false,
            reason: "origin-collision",
        });
    });
});
```

- [ ] **Step 2: Add failing resolver tests**

Append:

```ts
describe("resolveObserverState", () => {
    it("resolves missing and explicit Sol separately", () => {
        expect(resolveObserverState({ kind: "missing" }, [])).toEqual({
            kind: "sol",
            observerId: "sol",
            source: "missing",
        });
        expect(resolveObserverState({ kind: "explicit-sol" }, [])).toEqual({
            kind: "sol",
            observerId: "sol",
            source: "explicit-sol",
        });
    });

    it("passes malformed provenance through to fallback", () => {
        expect(
            resolveObserverState(
                {
                    kind: "malformed",
                    reason: "empty",
                    requestedObserver: "",
                },
                [],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: "",
            reason: "empty",
        });

        expect(
            resolveObserverState(
                {
                    kind: "malformed",
                    reason: "duplicate",
                    requestedObserver: null,
                },
                [],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: null,
            reason: "duplicate",
        });
    });

    it("preserves the exact unknown candidate id", () => {
        expect(
            resolveObserverState(
                { kind: "candidate", observerId: " Alpha-Centauri " },
                [eligibleCandidate],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: " Alpha-Centauri ",
            reason: "unknown-system",
        });
    });

    it("returns system state for a known eligible candidate", () => {
        expect(
            resolveObserverState(
                { kind: "candidate", observerId: "alpha-centauri" },
                [eligibleCandidate],
            ),
        ).toEqual({
            kind: "system",
            observerId: "alpha-centauri",
        });
    });

    it.each([
        {
            candidate: {
                id: "broken",
                position: { x: Number.NaN, y: 1, z: 1 },
            },
            reason: "invalid-coordinates" as const,
        },
        {
            candidate: {
                id: "origin",
                position: { x: 0, y: 0, z: 0 },
            },
            reason: "origin-collision" as const,
        },
    ])(
        "uses shared eligibility result for $reason",
        ({ candidate, reason }) => {
            expect(
                resolveObserverState(
                    { kind: "candidate", observerId: candidate.id },
                    [candidate],
                ),
            ).toEqual({
                kind: "fallback",
                observerId: "sol",
                requestedObserver: candidate.id,
                reason,
            });
            expect(isObserverCandidateEligible(candidate)).toEqual({
                eligible: false,
                reason,
            });
        },
    );
});
```

- [ ] **Step 3: Run the focused test and verify the red state**

```bash
bunx vitest run src/lib/constellation/__tests__/observerRouteState.test.ts
```

Expected: FAIL because eligibility and resolver exports do not exist.

- [ ] **Step 4: Implement structural types and shared eligibility**

Append to `observerRouteState.ts`:

```ts
export interface ObserverCandidate {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
}

export type ObserverEligibility =
    | { eligible: true }
    | {
          eligible: false;
          reason: "invalid-coordinates" | "origin-collision";
      };

export function isObserverCandidateEligible(
    candidate: ObserverCandidate,
): ObserverEligibility {
    const { x, y, z } = candidate.position;

    if (![x, y, z].every(Number.isFinite)) {
        return { eligible: false, reason: "invalid-coordinates" };
    }

    if (x === 0 && y === 0 && z === 0) {
        return { eligible: false, reason: "origin-collision" };
    }

    return { eligible: true };
}
```

- [ ] **Step 5: Implement typed resolution using the shared helper**

Append:

```ts
export type ResolvedObserverState =
    | {
          kind: "sol";
          observerId: "sol";
          source: "missing" | "explicit-sol";
      }
    | { kind: "system"; observerId: string }
    | {
          kind: "fallback";
          observerId: "sol";
          requestedObserver: string | null;
          reason:
              | "empty"
              | "duplicate"
              | "unknown-system"
              | "invalid-coordinates"
              | "origin-collision";
      };

export function resolveObserverState(
    parsed: ParsedObserverQuery,
    candidates: readonly ObserverCandidate[],
): ResolvedObserverState {
    if (parsed.kind === "missing" || parsed.kind === "explicit-sol") {
        return {
            kind: "sol",
            observerId: "sol",
            source: parsed.kind,
        };
    }

    if (parsed.kind === "malformed") {
        return {
            kind: "fallback",
            observerId: "sol",
            requestedObserver: parsed.requestedObserver,
            reason: parsed.reason,
        };
    }

    const candidate = candidates.find(({ id }) => id === parsed.observerId);
    if (!candidate) {
        return {
            kind: "fallback",
            observerId: "sol",
            requestedObserver: parsed.observerId,
            reason: "unknown-system",
        };
    }

    const eligibility = isObserverCandidateEligible(candidate);
    if (!eligibility.eligible) {
        return {
            kind: "fallback",
            observerId: "sol",
            requestedObserver: parsed.observerId,
            reason: eligibility.reason,
        };
    }

    return { kind: "system", observerId: parsed.observerId };
}
```

- [ ] **Step 6: Run the focused tests and verify the green state**

```bash
bunx vitest run src/lib/constellation/__tests__/observerRouteState.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/lib/constellation/observerRouteState.ts \
  src/lib/constellation/__tests__/observerRouteState.test.ts
git commit -m "feat: resolve observer route state"
```

---

### Task 3: Extend localized route helpers

**Files:**
- Modify: `src/i18n/routes.ts`
- Modify: `src/i18n/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `serializeObserverQuery()` from Task 1.
- Produces:

```ts
export interface ConstellationRouteOptions {
    observerId?: string | "sol" | null;
}

export function switchLocaleUrl(url: URL, locale: AppLocale): string;

routes.constellation(
    locale: AppLocale,
    options?: ConstellationRouteOptions,
): string;
```

- [ ] **Step 1: Add failing route-helper tests**

Update imports in `routes.test.ts` to include `switchLocaleUrl`, then add:

```ts
it("builds localized observer routes and canonical Sol routes", () => {
    expect(routes.constellation("en")).toBe("/constellation");
    expect(routes.constellation("en", { observerId: undefined })).toBe(
        "/constellation",
    );
    expect(routes.constellation("en", { observerId: null })).toBe(
        "/constellation",
    );
    expect(routes.constellation("zh", { observerId: "sol" })).toBe(
        "/zh/constellation",
    );
    expect(
        routes.constellation("ja", { observerId: "alpha-centauri" }),
    ).toBe("/ja/constellation?observer=alpha-centauri");
    expect(
        routes.constellation("en", { observerId: "alpha centauri/β" }),
    ).toBe("/constellation?observer=alpha+centauri%2F%CE%B2");
});

it("switches locale while preserving search and hash", () => {
    expect(
        switchLocaleUrl(
            new URL(
                "https://example.test/constellation?observer=alpha-centauri&ref=earth#details",
            ),
            "ja",
        ),
    ).toBe(
        "/ja/constellation?observer=alpha-centauri&ref=earth#details",
    );
});

it("switches locale without duplicating an existing prefix", () => {
    expect(
        switchLocaleUrl(
            new URL(
                "https://example.test/zh/constellation?observer=alpha-centauri",
            ),
            "en",
        ),
    ).toBe("/constellation?observer=alpha-centauri");
});
```

- [ ] **Step 2: Run the route tests and verify the red state**

```bash
bunx vitest run src/i18n/__tests__/routes.test.ts
```

Expected: FAIL because `switchLocaleUrl` and the constellation options argument do not exist.

- [ ] **Step 3: Implement route options and URL switching**

Modify `src/i18n/routes.ts`:

```ts
import { serializeObserverQuery } from "@/lib/constellation/observerRouteState";
import { defaultLang, languages, showDefaultLang } from "./ui";

export interface ConstellationRouteOptions {
    observerId?: string | "sol" | null;
}

export function switchLocaleUrl(url: URL, locale: AppLocale): string {
    return `${switchLocalePath(url.pathname, locale)}${url.search}${url.hash}`;
}
```

Replace the existing constellation route entry with:

```ts
constellation: (
    locale: AppLocale,
    options: ConstellationRouteOptions = {},
) =>
    `${localizePath("/constellation", locale)}${serializeObserverQuery(
        options.observerId,
    )}`,
```

- [ ] **Step 4: Run route tests and verify the green state**

```bash
bunx vitest run src/i18n/__tests__/routes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run type-check to catch path-alias or signature errors**

```bash
bun run type-check
```

Expected: exit 0.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/i18n/routes.ts src/i18n/__tests__/routes.test.ts
git commit -m "feat: add observer route helpers"
```

---

### Task 4: Canonicalize explicit Sol requests server-side

**Files:**
- Modify: `src/pages/constellation.astro`
- Create: `e2e/observer-routing.spec.ts`

**Interfaces:**
- Consumes: `parseObserverQuery()` from Task 1.
- Produces: HTTP 308 for exactly one `observer=sol`, preserving pathname locale and unrelated query parameters.

- [ ] **Step 1: Add the focused failing Playwright redirect tests**

Create `e2e/observer-routing.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("observer route canonicalization", () => {
    test.each([
        {
            requestUrl: "/constellation?observer=sol&ref=earth",
            location: "/constellation?ref=earth",
        },
        {
            requestUrl: "/ja/constellation?observer=sol&ref=earth",
            location: "/ja/constellation?ref=earth",
        },
    ])(
        "redirects $requestUrl to the query-free Sol route",
        async ({ request }, { requestUrl, location }) => {
            const response = await request.get(requestUrl, {
                maxRedirects: 0,
            });

            expect(response.status()).toBe(308);
            expect(response.headers().location).toBe(location);
        },
    );

    test("does not canonicalize duplicate observer parameters", async ({
        request,
    }) => {
        const response = await request.get(
            "/constellation?observer=sol&observer=alpha-centauri",
            { maxRedirects: 0 },
        );

        expect(response.status()).not.toBe(308);
        expect(response.headers().location).toBeUndefined();
    });
});
```

If the installed Playwright version rejects `test.each`, use a normal `for (const testCase of [...])` loop at module scope that registers one `test()` per case. Do not change the assertions or coverage.

- [ ] **Step 2: Run the focused E2E test and verify the red state**

```bash
bunx playwright test e2e/observer-routing.spec.ts
```

Expected: FAIL because `constellation.astro` does not redirect explicit Sol requests.

- [ ] **Step 3: Add server-side explicit-Sol canonicalization**

In `src/pages/constellation.astro`, add:

```astro
---
import ConstellationWrapper from "../components/ConstellationWrapper.svelte";
import GlobalStyles from "../components/GlobalStyles.astro";
import { getLangFromUrl, useTranslations } from "../i18n/utils";
import { ui } from "../i18n/ui";
import { parseObserverQuery } from "../lib/constellation/observerRouteState";

const observerQuery = parseObserverQuery(Astro.url.searchParams);

if (observerQuery.kind === "explicit-sol") {
  const canonicalUrl = new URL(Astro.url);
  canonicalUrl.searchParams.delete("observer");

  return Astro.redirect(
    `${canonicalUrl.pathname}${canonicalUrl.search}`,
    308,
  );
}

const lang = getLangFromUrl(Astro.url, Astro.currentLocale);
const t = useTranslations(lang);
const translations = ui[lang] || ui.en;
---
```

Keep the existing page HTML and styles unchanged.

- [ ] **Step 4: Run the focused E2E test and verify the green state**

```bash
bunx playwright test e2e/observer-routing.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run the existing constellation smoke coverage**

```bash
bunx playwright test e2e/position-indicators.spec.ts --grep "constellation view"
```

Expected: PASS; the query-free page still loads.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/pages/constellation.astro e2e/observer-routing.spec.ts
git commit -m "feat: canonicalize explicit Sol routes"
```

---

### Task 5: Centralize locale switching without adding duplicate coverage

**Files:**
- Modify: `src/components/LanguageSelector.svelte`
- Modify: `src/components/hud/SettingsPanel.svelte`
- Modify: `src/components/hud/__tests__/SettingsPanel.test.ts`

**Interfaces:**
- Consumes: `switchLocaleUrl(url, locale)` from Task 3.
- Produces: both locale controls use the same tested URL composition.

- [ ] **Step 1: Strengthen the existing SettingsPanel navigation fixture**

Change the `beforeEach()` location stub in `SettingsPanel.test.ts` to:

```ts
Object.defineProperty(window, "location", {
    value: {
        href: "http://localhost/constellation?observer=alpha-centauri#details",
        pathname: "/constellation",
        search: "?observer=alpha-centauri",
        hash: "#details",
    },
    writable: true,
    configurable: true,
});
```

Replace the existing navigation assertion with:

```ts
it("preserves observer query and hash while switching locale", async () => {
    const { container } = render(SettingsPanel, {
        props: { isOpen: true, lang: "en", translations },
    });
    const jaBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".lang-btn"),
    ).find((button) => button.textContent?.trim() === "日本語") as HTMLElement;

    await fireEvent.click(jaBtn);

    expect(window.location.href).toBe(
        "/ja/constellation?observer=alpha-centauri#details",
    );
});
```

- [ ] **Step 2: Run the SettingsPanel test before implementation**

```bash
bunx vitest run src/components/hud/__tests__/SettingsPanel.test.ts
```

Expected: the strengthened test may already pass with the duplicated inline implementation. This is an approved characterization test; the next step removes duplication without changing behavior.

- [ ] **Step 3: Migrate SettingsPanel to `switchLocaleUrl`**

Change the import:

```ts
import { switchLocaleUrl, type AppLocale } from "@/i18n/routes";
```

Replace `changeLanguage()` with:

```ts
function changeLanguage(newLang: AppLocale) {
  if (typeof window === "undefined") return;
  window.location.href = switchLocaleUrl(
    new URL(window.location.href),
    newLang,
  );
}
```

- [ ] **Step 4: Migrate LanguageSelector to `switchLocaleUrl`**

Change the import:

```ts
import { switchLocaleUrl, type AppLocale } from '../i18n/routes';
```

Replace its URL composition with:

```ts
function handleLanguageChange(newLang: AppLocale) {
  if (typeof window !== 'undefined') {
    window.location.href = switchLocaleUrl(
      new URL(window.location.href),
      newLang,
    );
  }
  showLanguageSelector = false;
}
```

- [ ] **Step 5: Run focused locale component and route tests**

```bash
bunx vitest run src/components/hud/__tests__/SettingsPanel.test.ts \
  src/components/__tests__/LanguageSelector.test.ts \
  src/i18n/__tests__/routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/components/LanguageSelector.svelte \
  src/components/hud/SettingsPanel.svelte \
  src/components/hud/__tests__/SettingsPanel.test.ts
git commit -m "refactor: centralize locale URL switching"
```

---

### Task 6: Add localized View Sky copy and parity coverage

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/ja.ts`
- Create: `src/i18n/__tests__/observerUiI18nSync.test.ts`

**Interfaces:**
- Produces exactly two shared UI keys:

```text
action.viewSkyFromHere
galaxy.skyUnavailable
```

- [ ] **Step 1: Add the failing locale parity test**

Create `src/i18n/__tests__/observerUiI18nSync.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ui } from "../ui";

const observerUiKeys = [
    "action.viewSkyFromHere",
    "galaxy.skyUnavailable",
] as const;

describe("HPA-432 observer UI i18n coverage", () => {
    for (const [locale, catalog] of Object.entries(ui)) {
        it.each(observerUiKeys)(`has %s in ${locale}`, (key) => {
            const value = (catalog as Record<string, string>)[key];
            expect(value, `missing ${key} for locale ${locale}`).toBeTypeOf(
                "string",
            );
            expect(value.trim(), `empty ${key} for locale ${locale}`).not.toBe(
                "",
            );
        });
    }
});
```

- [ ] **Step 2: Run the parity test and verify the red state**

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: FAIL because both keys are absent.

- [ ] **Step 3: Add the exact English strings**

Add near the existing common actions/Galaxy keys in `src/i18n/en.ts`:

```ts
"action.viewSkyFromHere": "View sky from here",
"galaxy.skyUnavailable": "Sky view is unavailable for this system.",
```

- [ ] **Step 4: Add the exact Traditional Chinese strings**

Add in `src/i18n/zh.ts`:

```ts
"action.viewSkyFromHere": "從這裡觀看星空",
"galaxy.skyUnavailable": "目前無法從此恆星系統觀看星空。",
```

- [ ] **Step 5: Add the exact Japanese strings**

Add in `src/i18n/ja.ts`:

```ts
"action.viewSkyFromHere": "ここから星空を見る",
"galaxy.skyUnavailable": "この恒星系からの星空は現在表示できません。",
```

- [ ] **Step 6: Run the parity and existing i18n tests**

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts \
  src/i18n/__tests__/systemI18nSync.test.ts \
  src/i18n/__tests__/routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
git commit -m "feat: localize observer sky action"
```

---

### Task 7: Add the independent Galaxy View Sky action

**Files:**
- Modify: `src/components/GalaxyWrapper.svelte`
- Modify: `src/components/__tests__/GalaxyWrapper.test.ts`

**Interfaces:**
- Consumes:

```ts
isObserverCandidateEligible(selectedSystemData)
routes.constellation(lang, { observerId: selectedSystemData.id })
```

- Produces:
  - action order `Close · View sky from here · Explore/Coming Soon`;
  - View Sky as a secondary action;
  - generic focusable `aria-disabled` behavior for either typed eligibility failure;
  - no changes to `canExplore` or Explore navigation.

- [ ] **Step 1: Refactor the Galaxy test mock into a mutable harness**

At the top of `GalaxyWrapper.test.ts`, replace the inaccessible mock closure with a hoisted harness:

```ts
const galaxyHarness = vi.hoisted(() => ({
    capturedEvents: null as any,
    starSystems: [] as any[],
    eligibility: vi.fn(),
}));

vi.mock("@/lib/constellation/observerRouteState", async () => {
    const actual = await vi.importActual<
        typeof import("@/lib/constellation/observerRouteState")
    >("@/lib/constellation/observerRouteState");

    return {
        ...actual,
        isObserverCandidateEligible: galaxyHarness.eligibility,
    };
});

vi.mock("@/lib/galaxy", () => {
    const mockRenderer = {
        initialize: vi.fn().mockImplementation(async () => {
            await Promise.resolve();
            galaxyHarness.capturedEvents?.onSystemLoad?.();
        }),
        dispose: vi.fn(),
        onResize: vi.fn(),
        focusOnStarSystem: vi.fn(),
        highlightStarSystem: vi.fn(),
        getCameraState: vi.fn(() => ({ zoom: 1 })),
        getStats: vi.fn(() => ({ fps: 60 })),
        updateConfig: vi.fn(),
        setDistanceLinesVisible: vi.fn(),
        setSolLabelVisible: vi.fn(),
        setStarGlowVisible: vi.fn(),
        setReducedMotion: vi.fn(),
    };

    return {
        GalaxyRenderer: vi.fn().mockImplementation(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                galaxyHarness.capturedEvents = events;
                return mockRenderer;
            },
        ),
        localGalaxyData: {
            starSystems: galaxyHarness.starSystems,
            metadata: { name: "Test Galaxy" },
        },
    };
});
```

In the file-level `beforeEach()` blocks, add:

```ts
galaxyHarness.starSystems.splice(0);
galaxyHarness.capturedEvents = null;
galaxyHarness.eligibility.mockReset();
galaxyHarness.eligibility.mockReturnValue({ eligible: true });
```

- [ ] **Step 2: Add a reusable dialog fixture helper**

Add to the test file:

```ts
const baseSystem = {
    id: "barnards-star",
    name: "Barnard's Star System",
    description: "Barnard's Star system",
    distanceFromEarth: 5.9629,
    systemType: "solar" as const,
    position: { x: -0.05, y: 0.48, z: -5.94 },
    metadata: {
        spectralClass: "M4V",
        constellation: "Ophiuchus",
        hasExoplanets: true,
        numberOfPlanets: 4,
    },
    stars: [],
};

const galaxyTranslations = {
    "action.close": "Close",
    "action.explore": "Explore",
    "action.viewSkyFromHere": "View sky from here",
    "common.comingSoon": "Coming Soon",
    "galaxy.skyUnavailable": "Sky view is unavailable for this system.",
    "galaxy.comingSoonNotice": "This planetary experience is coming soon.",
};

async function openSystemDialog(
    system = baseSystem,
    props: Record<string, unknown> = {},
) {
    galaxyHarness.starSystems.splice(0, galaxyHarness.starSystems.length, system);
    const result = render(GalaxyWrapper, {
        props: { translations: galaxyTranslations, ...props },
    });

    await waitFor(() => expect(GalaxyRenderer).toHaveBeenCalled());
    galaxyHarness.capturedEvents?.onSystemLoad?.();
    galaxyHarness.capturedEvents?.onStarSystemSelect?.(system);
    await waitFor(() =>
        expect(result.container.querySelector(".system-dialog")).not.toBeNull(),
    );

    return result;
}
```

If TypeScript rejects the plain `position` object because the test mock type is inferred from production `StarSystemData`, cast the fixture at the helper boundary with `as any`; do not change production types or import Three.js into the test fixture.

- [ ] **Step 3: Add failing action hierarchy and navigation tests**

Add:

```ts
describe("GalaxyWrapper — observer sky action", () => {
    beforeEach(() => {
        Object.defineProperty(window, "location", {
            value: {
                href: "http://localhost/galaxy",
                pathname: "/galaxy",
                search: "",
                hash: "",
            },
            writable: true,
            configurable: true,
        });
    });

    it("renders Close, View Sky, and Explore/Coming Soon in order", async () => {
        const { container } = await openSystemDialog();
        const actions = Array.from(
            container.querySelectorAll<HTMLButtonElement>(
                ".system-dialog .dialog-actions button",
            ),
        );

        expect(actions.map((button) => button.textContent?.trim())).toEqual([
            "Close",
            "View sky from here",
            "Coming Soon",
        ]);
        expect(actions[1].classList.contains("secondary")).toBe(true);
        expect(actions[2].classList.contains("primary")).toBe(true);
    });

    it("navigates an eligible non-explorable system to observer mode", async () => {
        const { container } = await openSystemDialog();
        const viewSky = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".dialog-actions button"),
        ).find((button) => button.textContent?.trim() === "View sky from here")!;

        await fireEvent.click(viewSky);

        expect(window.location.href).toBe(
            "/constellation?observer=barnards-star",
        );
        expect(galaxyHarness.eligibility).toHaveBeenCalledWith(baseSystem);
    });

    it("uses the localized observer route", async () => {
        const { container } = await openSystemDialog(baseSystem, { lang: "ja" });
        const viewSky = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".dialog-actions button"),
        ).find((button) => button.textContent?.trim() === "View sky from here")!;

        await fireEvent.click(viewSky);

        expect(window.location.href).toBe(
            "/ja/constellation?observer=barnards-star",
        );
    });
});
```

- [ ] **Step 4: Add failing generic unavailable-state tests**

Append inside the same describe:

```ts
it.each(["invalid-coordinates", "origin-collision"] as const)(
    "maps %s to one focusable aria-disabled state",
    async (reason) => {
        galaxyHarness.eligibility.mockReturnValue({
            eligible: false,
            reason,
        });
        const originalHref = window.location.href;
        const { container } = await openSystemDialog();
        const viewSky = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".dialog-actions button"),
        ).find((button) => button.textContent?.trim() === "View sky from here")!;

        expect(viewSky.disabled).toBe(false);
        expect(viewSky.getAttribute("aria-disabled")).toBe("true");

        const descriptionId = viewSky.getAttribute("aria-describedby");
        expect(descriptionId).toBeTruthy();
        expect(container.querySelector(`#${descriptionId}`)?.textContent).toContain(
            "Sky view is unavailable for this system.",
        );

        viewSky.focus();
        expect(document.activeElement).toBe(viewSky);

        await fireEvent.click(viewSky);
        expect(window.location.href).toBe(originalHref);
    },
);
```

- [ ] **Step 5: Add the Explore independence regression**

Append:

```ts
it("keeps Coming Soon Explore behavior while View Sky remains enabled", async () => {
    const { container } = await openSystemDialog();
    const actions = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".dialog-actions button"),
    );
    const viewSky = actions.find(
        (button) => button.textContent?.trim() === "View sky from here",
    )!;
    const explore = actions.find(
        (button) => button.textContent?.trim() === "Coming Soon",
    )!;

    expect(viewSky.getAttribute("aria-disabled")).not.toBe("true");
    await fireEvent.click(explore);

    expect(container.querySelector(".coming-soon-notice")?.textContent).toContain(
        "This planetary experience is coming soon.",
    );
    expect(window.location.href).toBe("http://localhost/galaxy");
});
```

- [ ] **Step 6: Run the focused component test and verify the red state**

```bash
bunx vitest run src/components/__tests__/GalaxyWrapper.test.ts
```

Expected: new observer-action tests fail because the component has no View Sky behavior.

- [ ] **Step 7: Import and compute shared observer eligibility**

In `GalaxyWrapper.svelte`, add:

```ts
import { isObserverCandidateEligible } from '@/lib/constellation/observerRouteState';
```

Immediately after the existing `canExplore` reactive declaration, add:

```ts
$: observerEligibility = selectedSystemData
    ? isObserverCandidateEligible(selectedSystemData)
    : null;
```

Do not rename or rewrite `canExplore`.

- [ ] **Step 8: Add guarded observer navigation**

Add:

```ts
const navigateToObserverSky = () => {
    if (!selectedSystemData || observerEligibility?.eligible !== true) return;

    window.location.href = routes.constellation(lang, {
        observerId: selectedSystemData.id,
    });
};
```

- [ ] **Step 9: Add the ordered View Sky action and generic explanation**

Replace the dialog actions block with:

```svelte
<div class="dialog-actions">
    <button class="action-button secondary" on:click={closeSystemDialog}>
        {t('action.close')}
    </button>
    <button
        type="button"
        class="action-button secondary"
        aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}
        aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}
        on:click={navigateToObserverSky}
    >
        {t('action.viewSkyFromHere')}
    </button>
    <button
        class="action-button primary"
        on:click={() => navigateToSystem(selectedSystemId!)}
    >
        {canExplore ? t('action.explore') : t('common.comingSoon')}
    </button>
</div>
{#if observerEligibility?.eligible === false}
    <div id="galaxy-sky-unavailable" class="sky-unavailable-notice" role="status">
        {t('galaxy.skyUnavailable')}
    </div>
{/if}
```

Keep the existing `comingSoonNotice` block after this new explanation.

- [ ] **Step 10: Style the focusable unavailable state**

Add to the existing component styles:

```css
.action-button[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
}

.sky-unavailable-notice {
    margin-top: 12px;
    padding: 10px 14px;
    border: 1px solid rgba(0, 240, 255, 0.45);
    border-radius: 6px;
    background: rgba(0, 240, 255, 0.06);
    color: rgba(224, 247, 255, 0.85);
    font-size: 13px;
    text-align: center;
}
```

Do not use `pointer-events: none`; the guarded click handler is the single activation gate for pointer, Enter, and Space-generated clicks.

- [ ] **Step 11: Run focused component tests and verify the green state**

```bash
bunx vitest run src/components/__tests__/GalaxyWrapper.test.ts
```

Expected: PASS, including all pre-existing dialog and reduced-motion tests.

- [ ] **Step 12: Run the related route and i18n tests**

```bash
bunx vitest run src/lib/constellation/__tests__/observerRouteState.test.ts \
  src/i18n/__tests__/routes.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts \
  src/components/hud/__tests__/SettingsPanel.test.ts \
  src/components/__tests__/GalaxyWrapper.test.ts
```

Expected: PASS.

- [ ] **Step 13: Commit Task 7**

```bash
git add src/components/GalaxyWrapper.svelte \
  src/components/__tests__/GalaxyWrapper.test.ts
git commit -m "feat: add Galaxy observer sky action"
```

---

## Final Verification Gate

- [ ] **Step 1: Run formatting and inspect the diff**

```bash
bun run format
git status --short
git diff --check
```

Expected: no whitespace errors. If formatting changes tracked files, commit them with:

```bash
git add -u
git commit -m "style: format observer route changes"
```

- [ ] **Step 2: Run the complete focused test set**

```bash
bunx vitest run src/lib/constellation/__tests__/observerRouteState.test.ts \
  src/i18n/__tests__/routes.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts \
  src/components/hud/__tests__/SettingsPanel.test.ts \
  src/components/__tests__/LanguageSelector.test.ts \
  src/components/__tests__/GalaxyWrapper.test.ts
bunx playwright test e2e/observer-routing.spec.ts
```

Expected: all tests pass with zero failures.

- [ ] **Step 3: Run repository quality gates**

```bash
bun run lint
bun run type-check
bun run test:run
bun run build
```

Expected: all commands exit 0.

- [ ] **Step 4: Run the relevant existing browser regression**

```bash
bunx playwright test e2e/position-indicators.spec.ts --grep "constellation view"
```

Expected: PASS, or the existing WebGL fallback assertion passes in environments without WebGL.

- [ ] **Step 5: Verify scope before publishing**

```bash
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected changed paths are limited to the files listed in this plan. There must be no changes to `ConstellationWrapper.svelte`, `ConstellationRenderer`, HPA-431 astronomy code, or generated catalog files.

- [ ] **Step 6: Publish the implementation PR**

Push the implementation branch and open a draft PR referencing HPA-432 and the merged design/plan documents. The PR body must report the exact commands run and their results, and must state that HPA-435 still owns alternate-observer rendering and fallback UI.
