# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate observer query resolution, full alternate catalog preparation, prepared primary/reference rendering, observer HUD controls, Find Sol, visible fallbacks, and en/zh/ja localization into the constellation view while preserving the existing Earth/Sol experience.

**Architecture:** Keep orchestration local to `ConstellationWrapper.svelte`. Add one pure stable-ID mapping module, resolve the HPA-432 observer state once per mount, then branch into the untouched legacy Earth path or the HPA-433/HPA-434 prepared fixed-equatorial path. Reuse existing renderer APIs for reference visibility, star focus, prepared world positions, keyboard access, and reduced motion; add no new service, store, renderer contract, route parameter, or astronomy formula.

**Tech Stack:** Astro 5, Svelte 4, TypeScript 5.8, Three.js 0.178, Vitest 3.2, Testing Library Svelte, Happy DOM, Bun scripts.

## Global Constraints

- Query-free Earth/Sol mode must retain current geolocation, New York fallback, date/month filtering, Earth-horizontal placement, horizon/cardinal guides, compass copy, sidereal-time behavior, and current Earth 2D fallback.
- Alternate mode must not call `getCurrentLocation()` or `getVisibleConstellations()`.
- Alternate preparation must receive the exact full exported `constellations` array.
- Pass `primaryCatalog.stars + primaryCatalog.constellations` and `referenceCatalog.stars + referenceCatalog.constellations` as authoritative matched pairs.
- Never rebuild prepared top-level stars with `constellations.flatMap(...)` or any membership traversal.
- Use exact stable-ID observer/source-star mapping. Do not infer identity from names, distance, coordinates, or proximity.
- Map `alpha-centauri` to `alpha_cen`.
- Request `includeReferenceCatalog: true` for valid alternate mode.
- Use `SYNTHETIC_SOL_STAR_ID` for Find Sol; do not infer Sol from magnitude, color, or display name.
- Intentional `observer-source-star-excluded` diagnostics are expected and must not produce corruption/error copy.
- Other catalog omissions remain nonfatal and are shown only as one aggregate nonblocking count.
- Fatal `synthetic-sol-unavailable` falls back to Sol and never sends partial prepared data to the renderer.
- Earth/Sol-reference visibility is component-local and defaults to hidden on every mount. Do not add URL, store, or local-storage persistence.
- Alternate constellation selection must use prepared primary world positions, not Earth `celestialToSphere()`.
- Alternate mode must not create or show the current Earth-oriented 2D constellation grid.
- Find Sol uses the existing reduced-motion-aware renderer focus path.
- New UI copy is localized in `en`, `zh`, and `ja`; no raw localization keys may render.
- Do not modify HPA-432 route contracts, HPA-433 catalog internals, HPA-434 renderer/layer internals, Galaxy entry behavior, or HPA-436 E2E ownership.

---

## File Structure

### Create

- `src/lib/constellation/observerSourceStarIds.ts` — explicit readonly observer-system to canonical source-star mapping.
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts` — production mapping integrity and lookup behavior.
- `src/components/__tests__/ConstellationWrapper.observer.test.ts` — alternate initialization, fallback, HUD interaction, accessibility, and 2D gating.

### Modify

- `src/components/ConstellationWrapper.svelte` — observer state, two-mode initialization, prepared selection, diagnostics, HUD controls, status announcements, and canonical return.
- `src/components/__tests__/ConstellationWrapper.test.ts` — preserve legacy regression coverage and extend its renderer mock only when required by the integrated component.
- `src/i18n/en.ts` — English HPA-435 strings.
- `src/i18n/zh.ts` — Traditional Chinese HPA-435 strings.
- `src/i18n/ja.ts` — Japanese HPA-435 strings.
- `src/i18n/__tests__/observerUiI18nSync.test.ts` — parity coverage for every HPA-435 observer key.

### Explicitly unchanged

- `src/pages/constellation.astro`
- `src/lib/constellation/observerRouteState.ts`
- `src/lib/constellation/observerCatalog.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/components/GalaxyWrapper.svelte`
- Galaxy/constellation source data
- global stores and shared HUD components
- E2E suites owned by HPA-436

---

### Task 1: Add the Explicit Observer/Source-Star Mapping

**Files:**
- Create: `src/lib/constellation/observerSourceStarIds.ts`
- Create: `src/lib/constellation/__tests__/observerSourceStarIds.test.ts`

**Interfaces:**
- Consumes:
  - `localGalaxyData.starSystems` from `@/lib/galaxy`
  - `constellations` from `@/data/constellations`
  - `isObserverCandidateEligible()` from `@/lib/constellation/observerRouteState`
- Produces:

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
>;

export function getObserverSourceStarIds(
    observerId: string,
): readonly string[];
```

- [ ] **Step 1: Write failing exact lookup tests**

Create `observerSourceStarIds.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
    getObserverSourceStarIds,
    OBSERVER_SOURCE_STAR_IDS,
} from "@/lib/constellation/observerSourceStarIds";

it("maps Alpha Centauri to its canonical constellation source star", () => {
    expect(getObserverSourceStarIds("alpha-centauri")).toEqual([
        "alpha_cen",
    ]);
});

it("returns one stable empty readonly list for unmapped observers", () => {
    const first = getObserverSourceStarIds("barnards-star");
    const second = getObserverSourceStarIds("unknown-system");

    expect(first).toEqual([]);
    expect(second).toBe(first);
    expect(OBSERVER_SOURCE_STAR_IDS).not.toHaveProperty("barnards-star");
});
```

- [ ] **Step 2: Run the lookup tests and verify failure**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: FAIL because `observerSourceStarIds.ts` does not exist.

- [ ] **Step 3: Implement the minimal mapping module**

Create:

```ts
export const OBSERVER_SOURCE_STAR_IDS = {
    "alpha-centauri": ["alpha_cen"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

const EMPTY_SOURCE_STAR_IDS: readonly string[] = [];

export function getObserverSourceStarIds(
    observerId: string,
): readonly string[] {
    return OBSERVER_SOURCE_STAR_IDS[
        observerId as keyof typeof OBSERVER_SOURCE_STAR_IDS
    ] ?? EMPTY_SOURCE_STAR_IDS;
}
```

Do not import Galaxy or constellation data into the production module. The mapping remains a deterministic data declaration plus lookup.

- [ ] **Step 4: Add failing production-integrity tests**

Append:

```ts
import { constellations } from "@/data/constellations";
import {
    isObserverCandidateEligible,
} from "@/lib/constellation/observerRouteState";
import { localGalaxyData } from "@/lib/galaxy";

it("references only eligible production observer candidates", () => {
    for (const observerId of Object.keys(OBSERVER_SOURCE_STAR_IDS)) {
        const candidate = localGalaxyData.starSystems.find(
            ({ id }) => id === observerId,
        );
        expect(candidate, `missing observer ${observerId}`).toBeDefined();
        expect(isObserverCandidateEligible(candidate!)).toEqual({
            eligible: true,
        });
    }
});

it("references only canonical members of the full exported catalog", () => {
    const canonicalIds = new Set(
        constellations.flatMap((constellation) =>
            constellation.stars.map((star) => star.id),
        ),
    );

    for (const [observerId, sourceIds] of Object.entries(
        OBSERVER_SOURCE_STAR_IDS,
    )) {
        for (const sourceId of sourceIds) {
            expect(
                canonicalIds.has(sourceId),
                `${observerId} maps missing source ${sourceId}`,
            ).toBe(true);
        }
    }
});

it("contains no duplicate source IDs within or across observers", () => {
    const assigned = new Map<string, string>();

    for (const [observerId, sourceIds] of Object.entries(
        OBSERVER_SOURCE_STAR_IDS,
    )) {
        expect(new Set(sourceIds).size).toBe(sourceIds.length);
        for (const sourceId of sourceIds) {
            expect(assigned.get(sourceId)).toBeUndefined();
            assigned.set(sourceId, observerId);
        }
    }
});
```

These tests validate configured mappings only. Do not add a proximity/name scan that guesses additional mappings.

- [ ] **Step 5: Run the complete mapping suite**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the mapping contract**

```bash
git add \
  src/lib/constellation/observerSourceStarIds.ts \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts
git commit -m "feat(constellation): map observer systems to source stars"
```

---

### Task 2: Branch Constellation Initialization into Sol and Alternate Modes

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Create: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/components/__tests__/ConstellationWrapper.test.ts`

**Interfaces:**
- Consumes:
  - `parseObserverQuery()` and `resolveObserverState()` from HPA-432
  - `prepareAlternateObserverCatalog()` and prepared types from HPA-433
  - `localGalaxyData` and `StarSystemData`
  - `getObserverSourceStarIds()` from Task 1
  - `ConstellationRenderer.initialize()` and `initializePreparedCatalogs()`
- Produces local wrapper functions:

```ts
function resolveCurrentObserver(): ResolvedObserverState;
function createRenderer(): ConstellationRenderer;
async function initializeSolMode(): Promise<void>;
async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol">;
```

- Produces local state:

```ts
type DisplayConstellation = Constellation | PreparedConstellation;

let resolvedObserverState: ResolvedObserverState;
let observerSystem: StarSystemData | null;
let alternateCatalog: AlternateObserverCatalogOutput | null;
let renderedConstellations: readonly DisplayConstellation[];
let referenceVisible: boolean;
```

- [ ] **Step 1: Build a focused observer test harness**

In `ConstellationWrapper.observer.test.ts`, mock the renderer and external boundaries with reusable references:

```ts
const rendererMock = {
    initialize: vi.fn().mockResolvedValue(undefined),
    initializePreparedCatalogs: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    setSelected: vi.fn(),
    setHovered: vi.fn(),
    setLabelsVisible: vi.fn(),
    setAutoRotate: vi.fn(),
    setReducedMotion: vi.fn(),
    setReferenceVisible: vi.fn(),
    getStarWorldPosition: vi.fn(),
    focusStarById: vi.fn(() => true),
    tweenCameraTo: vi.fn(),
    worldToScreen: vi.fn(() => ({ x: 0, y: 0, visible: false })),
    getCameraAzimuth: vi.fn(() => 0),
    getCameraElevation: vi.fn(() => 0),
};

const prepareAlternateObserverCatalogMock = vi.fn();
const getCurrentLocationMock = vi.fn();
const getVisibleConstellationsMock = vi.fn();
```

Mock `@/data/constellations` with one stable `fullConstellations` array object. Include a prepared synthetic Sol only in the prepared top-level `stars` array so the handoff test detects accidental membership flattening.

Provide a helper that sets the test URL before render:

```ts
function setUrl(search = ""): void {
    window.history.replaceState({}, "", `/constellation${search}`);
}
```

Stub `HTMLCanvasElement.prototype.getContext` with the existing test-compatible WebGL shape and restore it after each test.

- [ ] **Step 2: Write the failing legacy-path regression test**

Add:

```ts
it("keeps query-free Sol mode on the existing Earth path", async () => {
    setUrl();
    getCurrentLocationMock.mockResolvedValue({
        latitude: 49.2827,
        longitude: -123.1207,
        timezone: "America/Vancouver",
    });

    render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    await waitFor(() => expect(rendererMock.initialize).toHaveBeenCalled());

    expect(getCurrentLocationMock).toHaveBeenCalledTimes(1);
    expect(getVisibleConstellationsMock).toHaveBeenCalledWith(
        49.2827,
        expect.any(Number),
    );
    expect(prepareAlternateObserverCatalogMock).not.toHaveBeenCalled();
    expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Write the failing valid alternate-path test**

Create exact prepared objects:

```ts
const primaryCatalog = {
    stars: [
        {
            id: "sol",
            name: "Sol",
            rightAscension: 1,
            declination: 2,
            magnitude: 0,
            distance: 4.2465,
            spectralClass: "G2V",
            color: "#fff",
            marker: { kind: "synthetic-sol" as const },
        },
    ],
    constellations: [],
};
const referenceCatalog = { stars: [], constellations: [] };
```

Then test:

```ts
it("prepares and renders a valid alternate observer without Earth filtering", async () => {
    setUrl("?observer=alpha-centauri");
    prepareAlternateObserverCatalogMock.mockReturnValue({
        ok: true,
        value: {
            primaryCatalog,
            referenceCatalog,
            omittedStars: [],
        },
    });

    render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    await waitFor(() =>
        expect(rendererMock.initializePreparedCatalogs).toHaveBeenCalled(),
    );

    expect(getCurrentLocationMock).not.toHaveBeenCalled();
    expect(getVisibleConstellationsMock).not.toHaveBeenCalled();
    expect(prepareAlternateObserverCatalogMock).toHaveBeenCalledWith(
        fullConstellations,
        expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            z: expect.any(Number),
        }),
        {
            includeReferenceCatalog: true,
            observerSourceStarIds: ["alpha_cen"],
        },
    );
    expect(rendererMock.initializePreparedCatalogs).toHaveBeenCalledWith(
        {
            primaryCatalog,
            referenceCatalog,
            referenceVisible: false,
        },
        {
            minimumMagnitude: 4,
            showConstellationLines: true,
            showStarNames: true,
        },
    );
    expect(rendererMock.initialize).not.toHaveBeenCalled();
});
```

The identity assertions on `primaryCatalog` and `referenceCatalog` are essential: do not use `expect.objectContaining` for those fields.

- [ ] **Step 4: Run the two path tests and verify failure**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "query-free Sol mode|valid alternate observer"
```

Expected: FAIL because the wrapper always enters the Earth path and never calls HPA-433/HPA-434 prepared APIs.

- [ ] **Step 5: Add imports, local types, and observer state**

In `ConstellationWrapper.svelte`, import:

```ts
import { localGalaxyData, type StarSystemData } from "@/lib/galaxy";
import {
    parseObserverQuery,
    resolveObserverState,
    type ResolvedObserverState,
} from "@/lib/constellation/observerRouteState";
import {
    prepareAlternateObserverCatalog,
    type AlternateObserverCatalogOutput,
    type PreparedConstellation,
} from "@/lib/constellation/observerCatalog";
import { getObserverSourceStarIds } from "@/lib/constellation/observerSourceStarIds";
import type { Constellation } from "@/types/constellation";
```

Define:

```ts
type DisplayConstellation = Constellation | PreparedConstellation;

let resolvedObserverState: ResolvedObserverState = {
    kind: "sol",
    observerId: "sol",
    source: "missing",
};
let observerSystem: StarSystemData | null = null;
let alternateCatalog: AlternateObserverCatalogOutput | null = null;
let renderedConstellations: readonly DisplayConstellation[] = [];
let referenceVisible = false;
```

If `Constellation` is already imported through the existing type import, merge the import instead of adding a duplicate.

- [ ] **Step 6: Extract shared renderer construction**

Move only renderer construction and callbacks out of the Earth-specific block:

```ts
function createRenderer(): ConstellationRenderer {
    return new ConstellationRenderer(
        container,
        {
            onConstellationHover: (id, screenPos) => {
                hoveredConstellationId = id;
                hoverPos = screenPos;
            },
            onConstellationClick: (id) => {
                handleSelectConstellation(id);
            },
            onStarHover: (star, screenPos) => {
                hoverStarPos = star && screenPos
                    ? {
                          x: screenPos.x,
                          y: screenPos.y,
                          name: starName(star),
                          magnitude: star.magnitude,
                      }
                    : null;
            },
        },
        constellationA11yText,
    );
}
```

Do not change callback behavior or create a second renderer instance for the reference layer.

- [ ] **Step 7: Extract the existing Sol path without changing its behavior**

Move the current geolocation, timeout, New York fallback, `SkyConfiguration`, `getVisibleConstellations()`, translation mapping, legacy flat-map, and `renderer.initialize()` sequence into `initializeSolMode()`.

Set:

```ts
renderedConstellations = visibleConstellations;
viewState.visibleConstellations = visibleConstellations.map(({ id }) => id);
```

Keep legacy top-level star construction exactly inside this function:

```ts
const allStars = visibleConstellations.flatMap(
    (constellation) => constellation.stars,
);
```

Do not move this flat-map into a shared helper.

- [ ] **Step 8: Implement valid alternate preparation and direct handoff**

Implement:

```ts
async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol"> {
    const result = prepareAlternateObserverCatalog(
        constellations,
        {
            x: system.position.x,
            y: system.position.y,
            z: system.position.z,
        },
        {
            includeReferenceCatalog: true,
            observerSourceStarIds: getObserverSourceStarIds(system.id),
        },
    );

    if (!result.ok) return "fallback-to-sol";

    observerSystem = system;
    alternateCatalog = result.value;
    renderedConstellations = result.value.primaryCatalog.constellations;
    viewState.visibleConstellations = renderedConstellations.map(({ id }) => id);
    viewState.skyConfig = null;
    viewState.locationPermissionGranted = false;

    await renderer!.initializePreparedCatalogs(
        {
            primaryCatalog: result.value.primaryCatalog,
            referenceCatalog: result.value.referenceCatalog,
            referenceVisible,
        },
        {
            minimumMagnitude: 4,
            showConstellationLines: true,
            showStarNames: true,
        },
    );

    return "ready";
}
```

Do not clone, translate, flatten, merge, or reconstruct either prepared catalog.

- [ ] **Step 9: Resolve the route once and choose the mode**

Add:

```ts
function resolveCurrentObserver(): ResolvedObserverState {
    return resolveObserverState(
        parseObserverQuery(new URL(window.location.href).searchParams),
        localGalaxyData.starSystems,
    );
}
```

At the start of `initConstellationView()`, before geolocation and before the WebGL failure path needs mode-specific UI:

```ts
resolvedObserverState = resolveCurrentObserver();
observerSystem =
    resolvedObserverState.kind === "system"
        ? localGalaxyData.starSystems.find(
              ({ id }) => id === resolvedObserverState.observerId,
          ) ?? null
        : null;
```

After the container/WebGL checks, create one renderer and branch:

```ts
renderer = createRenderer();

if (resolvedObserverState.kind === "system" && observerSystem) {
    const outcome = await initializeAlternateMode(observerSystem);
    if (outcome === "fallback-to-sol") {
        observerSystem = null;
        alternateCatalog = null;
        await initializeSolMode();
    }
} else {
    await initializeSolMode();
}
```

Task 3 adds the visible fallback reason; this task only makes the branch functional.

- [ ] **Step 10: Run focused initialization tests**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "query-free Sol mode|valid alternate observer"
```

Expected: PASS.

- [ ] **Step 11: Run the existing wrapper suite**

Run:

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.test.ts
```

Expected: PASS. If the shared renderer mock fails because the integrated component references a new HPA-434 method during query-free rendering, add only that exact no-op method to the existing mock.

- [ ] **Step 12: Commit two-mode initialization**

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
git commit -m "feat(constellation): initialize observer sky modes"
```

---

### Task 3: Add Typed Sol Fallbacks, Diagnostic Classification, and 2D Gating

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`

**Interfaces:**
- Consumes:
  - HPA-432 fallback reasons
  - HPA-433 `AlternateObserverCatalogPreparationResult` and `OmittedStarDiagnostic`
- Produces local presentation state:

```ts
let observerNoticeKey: string | null;
let unexpectedOmissionCount: number;

function fallbackNoticeKey(
    state: Extract<ResolvedObserverState, { kind: "fallback" }>,
): string;

function countUnexpectedOmissions(
    output: AlternateObserverCatalogOutput,
): number;
```

- [ ] **Step 1: Write failing route-fallback tests**

Add a table test:

```ts
it.each([
    ["?observer=", "constellation.observer.fallbackLink"],
    ["?observer=missing-system", "constellation.observer.fallbackLink"],
])("falls back to Sol for %s", async (search, expectedCopy) => {
    setUrl(search);

    const { findByText } = render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    await waitFor(() => expect(rendererMock.initialize).toHaveBeenCalled());

    expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
    expect(await findByText(EN_TEST_TRANSLATIONS[expectedCopy])).toBeTruthy();
});
```

For `invalid-coordinates` and `origin-collision`, mock `localGalaxyData.starSystems` with exact invalid candidates in this test file and assert `constellation.observer.fallbackPosition`.

- [ ] **Step 2: Write the failing fatal-preparation test**

```ts
it("falls back to Sol without partial prepared handoff when synthetic Sol is unavailable", async () => {
    setUrl("?observer=alpha-centauri");
    prepareAlternateObserverCatalogMock.mockReturnValue({
        ok: false,
        error: {
            code: "synthetic-sol-unavailable",
            cause: { code: "undefined-direction" },
        },
    });

    const { findByText } = render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    await waitFor(() => expect(rendererMock.initialize).toHaveBeenCalled());

    expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
    expect(
        await findByText(
            EN_TEST_TRANSLATIONS[
                "constellation.observer.fallbackPreparation"
            ],
        ),
    ).toBeTruthy();
});
```

- [ ] **Step 3: Write failing omission-classification tests**

Return a successful prepared output containing:

```ts
omittedStars: [
    {
        starId: "alpha_cen",
        starName: "Alpha Centauri",
        memberships: [],
        reason: { code: "observer-source-star-excluded" },
        referenceDisposition: "retained",
    },
    {
        starId: "broken",
        starName: "Broken Star",
        memberships: [],
        reason: {
            code: "coordinate-transform-failed",
            error: { code: "non-finite-input", field: "distance" },
        },
        referenceDisposition: "omitted",
    },
],
```

Assert that the rendered notice contains count `1`, does not contain `alpha_cen`, and does not contain `observer-source-star-excluded`.

Add a second test with only the expected exclusion and assert the omission notice is absent.

- [ ] **Step 4: Write the failing alternate 2D-gating test**

Spy on `HTMLCanvasElement.prototype.getContext` so the initial wrapper WebGL check succeeds but the renderer constructor mock throws. Render `?observer=alpha-centauri` and assert:

```ts
expect(container.querySelector("canvas[data-observer-2d]")).toBeNull();
expect(drawConstellationsOnCanvasMock).not.toHaveBeenCalled();
```

If the private draw function cannot be spied directly, assert that the wrapper appends no second canvas after renderer construction fails. Add a test-only `data-testid="constellation-2d-fallback"` to the existing fallback canvas rather than exporting private implementation.

- [ ] **Step 5: Run the fallback/diagnostic tests and verify failure**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "falls back|synthetic Sol|omission|2D"
```

Expected: FAIL because the wrapper does not classify or render observer notices and still creates the Earth 2D fallback for every mode.

- [ ] **Step 6: Implement fallback notice grouping**

Add:

```ts
let observerNoticeKey: string | null = null;
let unexpectedOmissionCount = 0;

function fallbackNoticeKey(
    state: Extract<ResolvedObserverState, { kind: "fallback" }>,
): string {
    switch (state.reason) {
        case "empty":
        case "duplicate":
        case "unknown-system":
            return "constellation.observer.fallbackLink";
        case "invalid-coordinates":
        case "origin-collision":
            return "constellation.observer.fallbackPosition";
    }
}
```

After route resolution:

```ts
if (resolvedObserverState.kind === "fallback") {
    observerNoticeKey = fallbackNoticeKey(resolvedObserverState);
}
```

On fatal alternate preparation:

```ts
observerNoticeKey = "constellation.observer.fallbackPreparation";
observerSystem = null;
alternateCatalog = null;
unexpectedOmissionCount = 0;
```

- [ ] **Step 7: Classify successful omission diagnostics**

Add:

```ts
function countUnexpectedOmissions(
    output: AlternateObserverCatalogOutput,
): number {
    return output.omittedStars.filter(
        ({ reason }) => reason.code !== "observer-source-star-excluded",
    ).length;
}
```

Set the count after successful preparation. Do not transform expected exclusions into errors or notices.

Render one temporary status paragraph near the view root so tests can pass before the final HUD styling task:

```svelte
{#if observerNoticeKey}
  <p role="status">{t(observerNoticeKey)}</p>
{:else if unexpectedOmissionCount > 0}
  <p role="status">
    {t("constellation.observer.omissions", {
      count: String(unexpectedOmissionCount),
    })}
  </p>
{/if}
```

Task 5 moves this into the HUD panel and adds final styling.

- [ ] **Step 8: Gate the existing Earth 2D fallback**

Give the existing fallback canvas a stable test ID and create/draw it only when no alternate observer is active:

```ts
if (!webglSupported && observerSystem === null) {
    canvas2D = document.createElement("canvas");
    canvas2D.dataset.testid = "constellation-2d-fallback";
    // Preserve the existing Sol fallback setup and draw call.
}
```

Do not add a prepared 2D projection. The alternate unsupported overlay will receive localized copy and Return to Sol in Task 5.

- [ ] **Step 9: Run fallback and diagnostic tests**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "falls back|synthetic Sol|omission|2D"
```

Expected: PASS.

- [ ] **Step 10: Commit fallback behavior**

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer fallbacks and diagnostics"
```

---

### Task 4: Add Prepared Selection, Reference Toggle, Find Sol, and Canonical Return

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`

**Interfaces:**
- Consumes:
  - `SYNTHETIC_SOL_STAR_ID`
  - `renderer.getStarWorldPosition()`
  - `renderer.setReferenceVisible()`
  - `renderer.focusStarById()`
  - `routes.constellation(currentLang)`
- Produces local functions:

```ts
function preparedConstellationCenter(
    constellationId: string,
): { x: number; y: number; z: number } | null;

function handleFindSol(): void;
function returnToSol(): void;
```

- [ ] **Step 1: Write the failing prepared-selection test**

Use a prepared constellation with two stars and renderer positions:

```ts
rendererMock.getStarWorldPosition
    .mockReturnValueOnce({ x: 10, y: 20, z: 30 })
    .mockReturnValueOnce({ x: 30, y: 40, z: 50 });
```

Click its HUD list button and assert:

```ts
expect(rendererMock.setSelected).toHaveBeenCalledWith("centaurus");
expect(rendererMock.getStarWorldPosition).toHaveBeenCalledWith("a");
expect(rendererMock.getStarWorldPosition).toHaveBeenCalledWith("b");
expect(celestialToSphereMock).not.toHaveBeenCalled();
expect(rendererMock.tweenCameraTo).toHaveBeenCalledWith(
    expect.any(Number),
    expect.any(Number),
    900,
);
```

Add a depleted constellation test where all lookups return `null`; selection remains, but `tweenCameraTo` is not called.

- [ ] **Step 2: Write the failing reference-toggle test**

Render valid alternate mode, find the checkbox by localized label, click it, and assert:

```ts
expect(rendererMock.setReferenceVisible).toHaveBeenLastCalledWith(true);
expect(prepareAlternateObserverCatalogMock).toHaveBeenCalledTimes(1);
expect(rendererMock.initializePreparedCatalogs).toHaveBeenCalledTimes(1);
```

The last two assertions prevent accidental re-preparation/reinitialization.

- [ ] **Step 3: Write the failing Find Sol tests**

On success:

```ts
fireEvent.click(screen.getByRole("button", { name: "Find Sol" }));

expect(rendererMock.focusStarById).toHaveBeenCalledWith("sol");
expect(screen.getByRole("status")).toHaveTextContent(
    /right ascension 1\.00 h.*declination \+2\.00°.*4\.25/i,
);
```

On `focusStarById()` returning `false`, assert the localized unavailable announcement.

Use the synthetic record from `primaryCatalog.stars`; do not read a constellation member or hardcode the observer-system distance in the handler.

- [ ] **Step 4: Write the failing canonical-return test**

Render with `lang: "ja"`, click Return to Earth/Sol, and assert the assigned URL equals the existing localized `routes.constellation("ja")` output with no query string.

Mock navigation using the repository's existing `window.location` strategy. Do not introduce client routing solely for the test.

- [ ] **Step 5: Run interaction tests and verify failure**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "prepared selection|reference|Find Sol|Return"
```

Expected: FAIL because the alternate controls and prepared selection branch do not exist.

- [ ] **Step 6: Implement prepared constellation center calculation**

Import `SYNTHETIC_SOL_STAR_ID` with the existing observer-catalog import.

Add:

```ts
function preparedConstellationCenter(
    constellationId: string,
): { x: number; y: number; z: number } | null {
    if (!renderer || !alternateCatalog) return null;

    const constellation = alternateCatalog.primaryCatalog.constellations.find(
        ({ id }) => id === constellationId,
    );
    if (!constellation) return null;

    const positions = constellation.stars.flatMap((star) => {
        const position = renderer!.getStarWorldPosition(star.id);
        return position ? [position] : [];
    });
    if (positions.length === 0) return null;

    const sum = positions.reduce(
        (acc, position) => ({
            x: acc.x + position.x,
            y: acc.y + position.y,
            z: acc.z + position.z,
        }),
        { x: 0, y: 0, z: 0 },
    );

    return {
        x: sum.x / positions.length,
        y: sum.y / positions.length,
        z: sum.z / positions.length,
    };
}
```

Refactor `handleSelectConstellation()`:

```ts
if (!renderer) return;
renderer.setSelected(constellationId);

if (alternateCatalog) {
    selectedCenter = preparedConstellationCenter(constellationId);
    if (!selectedCenter) return;
} else {
    if (!viewState.skyConfig) return;
    // Keep the existing circular-mean RA/Dec and celestialToSphere path.
}

const p = selectedCenter;
const radius = Math.hypot(p.x, p.y, p.z) || 1;
renderer.tweenCameraTo(
    Math.asin(p.y / radius),
    Math.atan2(p.x, p.z),
    900,
);
```

Avoid non-null assertions except where the local guard makes them mechanically safe.

- [ ] **Step 7: Wire reference visibility without reinitialization**

Add:

```ts
$: if (renderer && alternateCatalog) {
    renderer.setReferenceVisible(referenceVisible);
}
```

The settings checkbox is rendered in Task 5. This reactive statement must reference `referenceVisible` directly so Svelte tracks it.

- [ ] **Step 8: Implement Find Sol announcement formatting**

Add:

```ts
let solAnnouncement = "";

function signedDegrees(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}°`;
}

function handleFindSol(): void {
    const sol = alternateCatalog?.primaryCatalog.stars.find(
        ({ id }) => id === SYNTHETIC_SOL_STAR_ID,
    );
    const focused =
        renderer?.focusStarById(SYNTHETIC_SOL_STAR_ID) ?? false;

    if (!focused || !sol) {
        solAnnouncement = t(
            "constellation.observer.findSolUnavailable",
        );
        return;
    }

    const distance = new Intl.NumberFormat(currentLang, {
        maximumFractionDigits: 2,
    }).format(sol.distance);

    solAnnouncement = t(
        "constellation.observer.findSolAnnouncement",
        {
            ra: sol.rightAscension.toFixed(2),
            dec: signedDegrees(sol.declination),
            distance,
        },
    );
}
```

Do not add a second reduced-motion check. `focusStarById()` already owns it.

- [ ] **Step 9: Implement canonical Return to Earth/Sol**

Add:

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

Do not call `serializeObserverQuery("sol")`, preserve the old observer query, or route to the home page.

- [ ] **Step 10: Add temporary semantic controls and status region**

Before final HUD styling, add alternate-only native controls at the existing controls/settings slots:

```svelte
<button type="button" on:click={handleFindSol}>
  {t("constellation.observer.findSol")}
</button>
<button type="button" on:click={returnToSol}>
  {t("constellation.observer.returnToSol")}
</button>
<label>
  <input type="checkbox" bind:checked={referenceVisible} />
  {t("constellation.observer.referenceToggle")}
</label>
<div role="status" aria-live="polite" aria-atomic="true">
  {solAnnouncement}
</div>
```

Gate these on `observerSystem && alternateCatalog` so route/preparation fallbacks running Sol mode do not expose invalid controls.

- [ ] **Step 11: Run interaction tests**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "prepared selection|reference|Find Sol|Return"
```

Expected: PASS.

- [ ] **Step 12: Commit prepared interactions**

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer sky interactions"
```

---

### Task 5: Render the Localized Observer HUD and Accessibility Summary

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/ja.ts`
- Modify: `src/i18n/__tests__/observerUiI18nSync.test.ts`

**Interfaces:**
- Consumes:
  - existing `t()` placeholder replacement
  - existing `systems.${id}.name` keys and fallback naming pattern
  - observer state/controls from Tasks 2–4
- Produces exact localization keys:

```text
constellation.observer.label
constellation.observer.distanceFromSol
constellation.observer.frame
constellation.observer.systemBarycenter
constellation.observer.viewDirection
constellation.observer.referenceToggle
constellation.observer.referenceShown
constellation.observer.referenceHidden
constellation.observer.findSol
constellation.observer.findSolAnnouncement
constellation.observer.findSolUnavailable
constellation.observer.returnToSol
constellation.observer.educationLines
constellation.observer.educationBrightness
constellation.observer.summary
constellation.observer.fallbackLink
constellation.observer.fallbackPosition
constellation.observer.fallbackPreparation
constellation.observer.omissions
constellation.observer.webglUnavailable
```

- [ ] **Step 1: Extend the parity test first**

Replace the current two-key list in `observerUiI18nSync.test.ts` with:

```ts
const observerUiKeys = [
    "action.viewSkyFromHere",
    "galaxy.skyUnavailable",
    "constellation.observer.label",
    "constellation.observer.distanceFromSol",
    "constellation.observer.frame",
    "constellation.observer.systemBarycenter",
    "constellation.observer.viewDirection",
    "constellation.observer.referenceToggle",
    "constellation.observer.referenceShown",
    "constellation.observer.referenceHidden",
    "constellation.observer.findSol",
    "constellation.observer.findSolAnnouncement",
    "constellation.observer.findSolUnavailable",
    "constellation.observer.returnToSol",
    "constellation.observer.educationLines",
    "constellation.observer.educationBrightness",
    "constellation.observer.summary",
    "constellation.observer.fallbackLink",
    "constellation.observer.fallbackPosition",
    "constellation.observer.fallbackPreparation",
    "constellation.observer.omissions",
    "constellation.observer.webglUnavailable",
] as const;
```

Keep the existing nonempty-string assertions for every locale.

- [ ] **Step 2: Run the parity test and verify failure**

Run:

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: FAIL for each missing HPA-435 key.

- [ ] **Step 3: Add concrete English copy**

Add to `en.ts`:

```ts
"constellation.observer.label": "Observer",
"constellation.observer.distanceFromSol": "Distance from Sol",
"constellation.observer.frame": "Frame",
"constellation.observer.systemBarycenter": "System barycenter",
"constellation.observer.viewDirection": "View direction",
"constellation.observer.referenceToggle": "Show Earth/Sol reference",
"constellation.observer.referenceShown": "shown",
"constellation.observer.referenceHidden": "hidden",
"constellation.observer.findSol": "Find Sol",
"constellation.observer.findSolAnnouncement":
    "Sol: right ascension {ra} h, declination {dec}, distance {distance} ly.",
"constellation.observer.findSolUnavailable":
    "Sol is unavailable in this view.",
"constellation.observer.returnToSol": "Return to Earth/Sol",
"constellation.observer.educationLines":
    "Constellation lines preserve Earth cultural reference shapes.",
"constellation.observer.educationBrightness":
    "Star brightness is approximate and is not corrected for this observer.",
"constellation.observer.summary":
    "Observer {name}. Earth/Sol reference {reference}.",
"constellation.observer.fallbackLink":
    "The requested observer link is unavailable. Showing the sky from Earth/Sol.",
"constellation.observer.fallbackPosition":
    "The requested observer position is unavailable. Showing the sky from Earth/Sol.",
"constellation.observer.fallbackPreparation":
    "The alternate sky could not be prepared. Showing the sky from Earth/Sol.",
"constellation.observer.omissions":
    "{count} catalog star(s) could not be displayed in this observer frame.",
"constellation.observer.webglUnavailable":
    "This alternate sky requires WebGL. Return to Earth/Sol to use the standard fallback.",
```

- [ ] **Step 4: Add concrete Traditional Chinese and Japanese copy**

Add semantically equivalent, natural strings to `zh.ts` and `ja.ts`. Preserve the exact placeholders `{ra}`, `{dec}`, `{distance}`, `{name}`, `{reference}`, and `{count}`.

Use Traditional Chinese terminology in `zh.ts`, including `系統質心` for System barycenter and `地球／太陽參考層` for Earth/Sol reference. Use `系の重心` and `地球／太陽基準レイヤー` in `ja.ts`.

Do not leave English values in non-English dictionaries except stable proper names such as Sol where natural.

- [ ] **Step 5: Run parity tests**

Run:

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: PASS.

- [ ] **Step 6: Write failing observer HUD rendering tests**

In `ConstellationWrapper.observer.test.ts`, add:

```ts
it("renders alternate observer identity and hides Earth-only readouts", async () => {
    setUrl("?observer=alpha-centauri");
    prepareSuccessfulAlternateCatalog();

    render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    expect(await screen.findByText("Alpha Centauri System")).toBeTruthy();
    expect(screen.getByText("System barycenter")).toBeTruthy();
    expect(screen.getByText("Distance from Sol")).toBeTruthy();
    expect(screen.getByText("View direction")).toBeTruthy();
    expect(screen.queryByText("View from Earth")).toBeNull();
    expect(screen.queryByText("GEO LOCK")).toBeNull();
});
```

Add tests that:

- best-viewing-month cells are absent in alternate details;
- the observer summary includes the localized system name and reference hidden/shown state;
- fallback notice is inside a visible `role="status"` region;
- all three controls are native and keyboard reachable;
- alternate WebGL-unavailable copy and Return to Earth/Sol appear when renderer construction fails; and
- representative `zh` and `ja` renders contain no `constellation.observer.` raw key.

- [ ] **Step 7: Run HUD rendering tests and verify failure**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  -t "observer identity|summary|WebGL|raw key"
```

Expected: FAIL because the current HUD always renders Earth readouts and the temporary controls/notices are not in the final layout.

- [ ] **Step 8: Add observer name and formatted distance helpers**

Reuse the Galaxy localization pattern:

```ts
const systemName = (system: { id: string; name: string }) => {
    const key = `systems.${system.id}.name`;
    const translated = t(key);
    return !translated || translated === key ? system.name : translated;
};

$: observerDistance = observerSystem
    ? new Intl.NumberFormat(currentLang, {
          maximumFractionDigits: 2,
      }).format(observerSystem.distanceFromEarth)
    : "";
$: referenceStatus = t(
    referenceVisible
        ? "constellation.observer.referenceShown"
        : "constellation.observer.referenceHidden",
);
$: observerSummary = observerSystem
    ? t("constellation.observer.summary", {
          name: systemName(observerSystem),
          reference: referenceStatus,
      })
    : "";
```

Do not create duplicate observer-specific system-name keys.

- [ ] **Step 9: Branch the existing HUD readout by active mode**

Inside the existing `HudFrame` panel:

```svelte
{#if observerSystem && alternateCatalog}
  <div class="hud-readout observer-readout">
    <div class="readout-row">
      <span class="readout-label">
        {t("constellation.observer.label")}
      </span>
      <span></span>
      <span class="readout-value">{systemName(observerSystem)}</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">
        {t("constellation.observer.distanceFromSol")}
      </span>
      <span></span>
      <span class="readout-value">{observerDistance} ly</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">
        {t("constellation.observer.frame")}
      </span>
      <span></span>
      <span class="readout-value">
        {t("constellation.observer.systemBarycenter")}
      </span>
    </div>
  </div>

  <div class="compass-readout">
    <span class="compass-label">
      {t("constellation.observer.viewDirection")}
    </span>
    <span class="compass-value">
      {facingDegDisplay}° {facingElevDisplay}
    </span>
  </div>
{:else}
  <!-- Preserve the current GEO LOCK, UTC, compass, and View from Earth block. -->
{/if}
```

Do not show Earth cardinal text in alternate mode.

- [ ] **Step 10: Iterate the active prepared/source list directly**

Replace nested ID/filter iteration with one direct list:

```svelte
{#each renderedConstellations as constellation}
  <li aria-selected={viewState.selectedConstellation === constellation.id ? "true" : undefined}>
    <button
      type="button"
      class="hud-list-row"
      class:is-selected={viewState.selectedConstellation === constellation.id}
      on:click={() => handleSelectConstellation(constellation.id)}
      data-constellation-id={constellation.id}
    >
      <span class="row-abbr">[{constellation.abbreviation}]</span>
      <span class="row-name">{constellationName(constellation)}</span>
      <span class="row-leader"></span>
      <span class="row-count">
        {constellation.stars.length}★
        <span class="sr-only">{t("constellation.stars")}</span>
      </span>
    </button>
  </li>
{/each}
```

Use the same list for selected details. Render the month strip only when `alternateCatalog === null`.

This preserves prepared primary star counts and avoids looking up source topology after alternate preparation.

- [ ] **Step 11: Place final controls, educational copy, and summaries**

In the alternate HUD panel, add native buttons using existing `Button` styling where practical:

```svelte
<div class="observer-actions">
  <Button variant="outline" size="sm" on:click={handleFindSol}>
    {t("constellation.observer.findSol")}
  </Button>
  <Button variant="outline" size="sm" on:click={returnToSol}>
    {t("constellation.observer.returnToSol")}
  </Button>
</div>
<p class="observer-education">
  {t("constellation.observer.educationLines")}
</p>
<p class="observer-education">
  {t("constellation.observer.educationBrightness")}
</p>
<p class="sr-only">{observerSummary}</p>
```

In the settings slot, render the reference checkbox only for alternate prepared mode.

Keep one dedicated announcement region:

```svelte
<div
  class="sr-only"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {solAnnouncement}
</div>
```

Move fallback/omission notices into the HUD panel with visible styling and `role="status"`. Do not use `role="alert"`.

- [ ] **Step 12: Adapt the alternate WebGL-unavailable state**

When `!webglSupported && observerSystem !== null`, render:

- `constellation.webglNotAvailable` heading or the existing heading;
- `constellation.observer.webglUnavailable` description; and
- Return to Earth/Sol calling `returnToSol()`.

When `observerSystem === null`, preserve the existing Sol fallback copy and Back to Menu behavior.

- [ ] **Step 13: Add minimal observer HUD styles**

Reuse existing HUD variables/classes. Add only layout styles needed for:

- `.observer-readout`;
- `.observer-actions`;
- `.observer-education`; and
- the visible notice block.

Do not introduce a new design system, animation, panel component, or color semantics. Under `prefers-reduced-motion`, no new animation should exist to disable.

- [ ] **Step 14: Run HUD, interaction, and localization suites**

Run:

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: PASS.

- [ ] **Step 15: Commit localized HUD integration**

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/i18n/en.ts \
  src/i18n/zh.ts \
  src/i18n/ja.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
git commit -m "feat(constellation): add localized observer HUD"
```

---

### Task 6: Verify Integration Boundaries and Complete the PR

**Files:**
- Modify only if verification exposes a defect in files already listed above.
- Do not broaden scope to the explicitly unchanged modules.

**Interfaces:**
- Verifies the completed HPA-432/433/434 integration contract and HPA-435 acceptance criteria.

- [ ] **Step 1: Run focused mapping and wrapper suites**

```bash
bunx vitest run \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run upstream observer contract suites**

```bash
bunx vitest run \
  src/lib/constellation/__tests__/observerRouteState.test.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.test.ts
```

Expected: all tests PASS. These suites verify that HPA-435 did not regress the contracts it consumes.

- [ ] **Step 3: Run the complete test suite**

```bash
bun run test:run
```

Expected: exit code 0 and zero failed tests.

- [ ] **Step 4: Run static verification**

```bash
bun run type-check
bunx eslint src
bun run build
```

Expected:

- type-check exits 0 with no TypeScript/Svelte errors;
- ESLint exits 0 for `src`; and
- production build exits 0.

If repository-level lint includes ignored worktree artifacts, report that separately and retain the scoped `bunx eslint src` evidence used by recent Andromeda PRs.

- [ ] **Step 5: Review the final diff for YAGNI boundaries**

Run:

```bash
git diff --name-only main...HEAD
git diff --stat main...HEAD
```

The production diff should be limited to:

```text
src/lib/constellation/observerSourceStarIds.ts
src/components/ConstellationWrapper.svelte
src/i18n/en.ts
src/i18n/zh.ts
src/i18n/ja.ts
```

plus focused tests and the approved design/plan docs.

Reject or remove any accidental change to:

```text
observerRouteState.ts
observerCatalog.ts
ConstellationRenderer.ts
ConstellationCatalogLayer.ts
GalaxyWrapper.svelte
constellation.astro
stores
E2E suites
```

unless a concrete existing-contract defect is documented in the PR and separately justified.

- [ ] **Step 6: Manually inspect the acceptance matrix**

Verify each row with the named automated test or a local browser smoke check:

| Scenario | Expected |
| --- | --- |
| `/constellation` | unchanged Earth/Sol path |
| `/constellation?observer=alpha-centauri` | full unfiltered prepared path |
| Alpha Centauri primary | no phantom `alpha_cen` |
| Reference enabled | retained source topology appears without reinit |
| Find Sol | focuses `sol`, announces RA/Dec/distance |
| Empty/duplicate/unknown observer | visible Sol fallback |
| Invalid/origin observer | visible Sol fallback |
| Synthetic Sol fatal | no partial prepared handoff; Sol fallback |
| Expected source exclusion only | no corruption notice |
| Genuine omitted star | one aggregate nonblocking notice |
| Alternate WebGL unavailable | no Earth 2D grid; Return to Earth/Sol |
| en/zh/ja | no raw observer keys |
| Reduced motion | Find Sol snaps through existing renderer policy |

Do not add a broad E2E matrix in this PR; record any remaining deployment/browser hardening under HPA-436.

- [ ] **Step 7: Commit any verification-only fixes**

If verification required changes, commit them in one focused fix commit:

```bash
git add <only-the-files-fixed>
git commit -m "fix(constellation): close observer integration gaps"
```

Skip this commit when no changes were needed.

- [ ] **Step 8: Prepare the PR summary**

Use this structure:

```markdown
## Summary

Implements HPA-435 by wiring the completed observer route, prepared catalog, and renderer contracts into `ConstellationWrapper` with a localized observer HUD, Earth/Sol-reference toggle, Find Sol, canonical return, and typed visible fallbacks.

## YAGNI boundary

- one stable-ID mapping module;
- wrapper-local observer state;
- no new service/store/renderer API/URL state;
- no alternate 2D renderer;
- HPA-436 retains broad E2E/performance ownership.

## Verification

- `bun run test:run` — [paste fresh result]
- `bun run type-check` — [paste fresh result]
- `bunx eslint src` — [paste fresh result]
- `bun run build` — [paste fresh result]
```

Replace bracketed result fields with actual fresh command output before opening the PR. Do not claim a passing result without the command evidence from Steps 1–4.
