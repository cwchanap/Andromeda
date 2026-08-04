# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate observer query resolution, full alternate catalog preparation, prepared primary/reference rendering, observer HUD controls, Find Sol, visible fallbacks, and `en`/`zh`/`ja` localization into the constellation view while preserving the existing Earth/Sol experience.

**Architecture:** Keep orchestration local to `ConstellationWrapper.svelte`. Add one pure stable-ID mapping module, resolve HPA-432 observer state once per mount, and branch into either the existing Earth path or the HPA-433/HPA-434 prepared fixed-equatorial path. Reuse current renderer APIs for reference visibility, focus, prepared world positions, keyboard access, and reduced motion.

**Tech Stack:** Astro 5, Svelte 4, TypeScript 5.8, Three.js 0.178, Vitest 3.2, Testing Library Svelte, Happy DOM, Bun.

## Global Constraints

- Preserve query-free Earth/Sol geolocation, New York fallback, date/month filtering, Earth-horizontal placement, horizon/cardinal guides, compass copy, sidereal-time behavior, and Earth-oriented 2D fallback.
- Alternate mode must not call `getCurrentLocation()` or `getVisibleConstellations()`.
- Pass the exact full exported `constellations` array to alternate preparation.
- Treat `primaryCatalog.stars + primaryCatalog.constellations` and `referenceCatalog.stars + referenceCatalog.constellations` as authoritative pairs.
- Never rebuild prepared top-level stars through constellation membership.
- Map observer/source identity only by exact stable IDs; map `alpha-centauri` to `alpha_cen`.
- Request `includeReferenceCatalog: true`.
- Use `SYNTHETIC_SOL_STAR_ID` for Find Sol.
- Ignore intentional `observer-source-star-excluded` diagnostics in user-facing notices.
- Aggregate all other omissions into one nonblocking count.
- On `synthetic-sol-unavailable`, initialize Sol mode and never pass partial prepared data.
- Reference visibility is component-local, defaults to hidden, and is not persisted.
- Alternate selection uses prepared primary world positions, not `celestialToSphere()`.
- Alternate mode never creates the current Earth-oriented 2D grid.
- Find Sol reuses the renderer's reduced-motion-aware focus path.
- Add every new string to `en`, `zh`, and `ja`; no raw keys may render.
- Do not modify HPA-432 route contracts, HPA-433 preparation internals, HPA-434 renderer/layer internals, Galaxy entry, global stores, or HPA-436 E2E scope.

---

## File Structure

### Create

- `src/lib/constellation/observerSourceStarIds.ts` — exact readonly mapping and lookup.
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts` — mapping integrity.
- `src/components/__tests__/ConstellationWrapper.observer.test.ts` — observer-mode integration.

### Modify

- `src/components/ConstellationWrapper.svelte`
- `src/components/__tests__/ConstellationWrapper.test.ts` only if its renderer mock needs newly referenced methods
- `src/i18n/en.ts`
- `src/i18n/zh.ts`
- `src/i18n/ja.ts`
- `src/i18n/__tests__/observerUiI18nSync.test.ts`

### Explicitly Unchanged

- `src/pages/constellation.astro`
- `src/lib/constellation/observerRouteState.ts`
- `src/lib/constellation/observerCatalog.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/components/GalaxyWrapper.svelte`
- source Galaxy/constellation data
- global stores
- broad E2E suites

---

### Task 1: Add Exact Observer/Source-Star Mapping

**Files:**
- Create: `src/lib/constellation/observerSourceStarIds.ts`
- Create: `src/lib/constellation/__tests__/observerSourceStarIds.test.ts`

**Interfaces:**

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
>;

export function getObserverSourceStarIds(
    observerId: string,
): readonly string[];
```

- [ ] **Step 1: Write failing lookup tests**

```ts
import { describe, expect, it } from "vitest";
import {
    getObserverSourceStarIds,
    OBSERVER_SOURCE_STAR_IDS,
} from "@/lib/constellation/observerSourceStarIds";

it("maps Alpha Centauri to alpha_cen", () => {
    expect(getObserverSourceStarIds("alpha-centauri")).toEqual([
        "alpha_cen",
    ]);
});

it("returns one stable empty list for unmapped observers", () => {
    const first = getObserverSourceStarIds("barnards-star");
    const second = getObserverSourceStarIds("unknown-system");

    expect(first).toEqual([]);
    expect(second).toBe(first);
    expect(OBSERVER_SOURCE_STAR_IDS).not.toHaveProperty("barnards-star");
});
```

- [ ] **Step 2: Run the tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: exit code 1 because the module does not exist.

- [ ] **Step 3: Implement the mapping**

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

Do not import production catalogs into this module.

- [ ] **Step 4: Add production-integrity tests**

```ts
import { constellations } from "@/data/constellations";
import { localGalaxyData } from "@/lib/galaxy";
import { isObserverCandidateEligible } from "@/lib/constellation/observerRouteState";

it("references only eligible production observers", () => {
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

it("references only canonical exported constellation members", () => {
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

it("contains no duplicate source IDs", () => {
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

Do not add name/proximity inference.

- [ ] **Step 5: Run the complete mapping suite**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: exit code 0 and zero failed tests.

- [ ] **Step 6: Commit**

```bash
git add \
  src/lib/constellation/observerSourceStarIds.ts \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts
git commit -m "feat(constellation): map observer systems to source stars"
```

---

### Task 2: Add Sol/Alternate Initialization Branches

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Create: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/components/__tests__/ConstellationWrapper.test.ts`

**Interfaces:**

```ts
type DisplayConstellation = Constellation | PreparedConstellation;

function resolveCurrentObserver(): ResolvedObserverState;
function createRenderer(): ConstellationRenderer;
async function initializeSolMode(): Promise<void>;
async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol">;
```

- [ ] **Step 1: Create a deterministic observer test harness**

In `ConstellationWrapper.observer.test.ts`, define reusable mocks:

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

Mock `@/data/constellations` with one stable `fullConstellations` array reference. Mock `@/lib/galaxy` with a valid `alpha-centauri` candidate whose position is `{ x: 1, y: 2, z: 3 }` and `distanceFromEarth` is `4.2465`.

Use:

```ts
function setUrl(search = ""): void {
    window.history.replaceState({}, "", `/constellation${search}`);
}
```

Stub WebGL with the same `createShader()` shape used by the current wrapper tests.

- [ ] **Step 2: Write the failing Sol regression**

```ts
it("keeps query-free Sol mode on the Earth path", async () => {
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

- [ ] **Step 3: Write the failing alternate regression**

Define exact prepared objects. Synthetic Sol must exist only in `primaryCatalog.stars`:

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

```ts
it("uses full prepared catalogs for Alpha Centauri", async () => {
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
        { x: 1, y: 2, z: 3 },
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

- [ ] **Step 4: Run the two tests and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "query-free Sol|full prepared catalogs"
```

Expected: exit code 1 because the wrapper always executes the Earth path.

- [ ] **Step 5: Add imports and local state**

Import:

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

- [ ] **Step 6: Extract renderer creation without changing callbacks**

```ts
function createRenderer(): ConstellationRenderer {
    return new ConstellationRenderer(
        container,
        {
            onConstellationHover: (id, screenPos) => {
                hoveredConstellationId = id;
                hoverPos = screenPos;
            },
            onConstellationClick: handleSelectConstellation,
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

- [ ] **Step 7: Extract the current Earth path into `initializeSolMode()`**

Move the existing location timeout, New York fallback, `SkyConfiguration`, `getVisibleConstellations()`, translated membership flat-map, and `renderer.initialize()` unchanged.

Add only:

```ts
renderedConstellations = visibleConstellations;
viewState.visibleConstellations = visibleConstellations.map(({ id }) => id);
```

Keep this legacy flat-map inside Sol mode:

```ts
const allStars = visibleConstellations.flatMap(
    (constellation) => constellation.stars,
);
```

- [ ] **Step 8: Implement valid alternate initialization**

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

Do not copy or transform prepared catalogs.

- [ ] **Step 9: Resolve once and choose a path**

```ts
function resolveCurrentObserver(): ResolvedObserverState {
    return resolveObserverState(
        parseObserverQuery(new URL(window.location.href).searchParams),
        localGalaxyData.starSystems,
    );
}
```

At the start of `initConstellationView()`, before WebGL/geolocation work:

```ts
resolvedObserverState = resolveCurrentObserver();
observerSystem =
    resolvedObserverState.kind === "system"
        ? localGalaxyData.starSystems.find(
              ({ id }) => id === resolvedObserverState.observerId,
          ) ?? null
        : null;
```

After container/WebGL checks:

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

- [ ] **Step 10: Run focused and legacy tests**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "query-free Sol|full prepared catalogs"
bunx vitest run src/components/__tests__/ConstellationWrapper.test.ts
```

Expected: both commands exit 0 with zero failures.

- [ ] **Step 11: Commit**

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
git commit -m "feat(constellation): initialize observer sky modes"
```

---

### Task 3: Add Typed Fallbacks, Omission Classification, and 2D Gating

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`

**Interfaces:**

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

- [ ] **Step 1: Write failing route fallback tests**

```ts
it.each([
    ["?observer=", "observer link unavailable"],
    ["?observer=missing-system", "observer link unavailable"],
])("falls back to Sol for %s", async (search, expectedText) => {
    setUrl(search);

    render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    await waitFor(() => expect(rendererMock.initialize).toHaveBeenCalled());

    expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(expectedText);
});
```

Add two deterministic mocked candidates, one with `NaN` position and one at `{ x: 0, y: 0, z: 0 }`. Assert both use the localized observer-position fallback text and legacy `initialize()`.

- [ ] **Step 2: Write the fatal preparation test**

```ts
it("falls back without partial handoff when synthetic Sol is unavailable", async () => {
    setUrl("?observer=alpha-centauri");
    prepareAlternateObserverCatalogMock.mockReturnValue({
        ok: false,
        error: {
            code: "synthetic-sol-unavailable",
            cause: { code: "undefined-direction" },
        },
    });

    render(ConstellationWrapper, {
        props: { lang: "en", translations: EN_TEST_TRANSLATIONS },
    });

    await waitFor(() => expect(rendererMock.initialize).toHaveBeenCalled());

    expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
        "alternate sky could not be prepared",
    );
});
```

- [ ] **Step 3: Write omission classification tests**

Use one expected exclusion and one transform failure. Assert the notice count is `1`, and rendered text contains neither `alpha_cen` nor `observer-source-star-excluded`.

Use a second successful result containing only the expected exclusion and assert no omission message exists.

- [ ] **Step 4: Write alternate 2D-gating test**

Make the wrapper WebGL pre-check succeed and the mocked renderer constructor throw. Render `?observer=alpha-centauri` and assert:

```ts
expect(
    screen.queryByTestId("constellation-2d-fallback"),
).toBeNull();
```

Render query-free Sol with the same renderer failure and assert the test ID exists.

- [ ] **Step 5: Run and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "falls back|partial handoff|omission|2D"
```

Expected: exit code 1 because notices/classification/gating do not exist.

- [ ] **Step 6: Implement fallback grouping**

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

After resolution:

```ts
if (resolvedObserverState.kind === "fallback") {
    observerNoticeKey = fallbackNoticeKey(resolvedObserverState);
}
```

When alternate preparation fails:

```ts
observerNoticeKey = "constellation.observer.fallbackPreparation";
observerSystem = null;
alternateCatalog = null;
unexpectedOmissionCount = 0;
```

- [ ] **Step 7: Count only genuine omissions**

```ts
function countUnexpectedOmissions(
    output: AlternateObserverCatalogOutput,
): number {
    return output.omittedStars.filter(
        ({ reason }) => reason.code !== "observer-source-star-excluded",
    ).length;
}
```

Set the count after successful preparation.

Render one semantic status block:

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

Task 5 places it in the final HUD layout.

- [ ] **Step 8: Gate the existing 2D fallback**

Add a test ID and preserve its current creation/draw logic only for Sol:

```ts
if (!webglSupported && observerSystem === null) {
    canvas2D = document.createElement("canvas");
    canvas2D.dataset.testid = "constellation-2d-fallback";
    // existing dimensions, context, append, and draw call
}
```

Do not create another canvas in alternate mode.

- [ ] **Step 9: Run tests and commit**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "falls back|partial handoff|omission|2D"
```

Expected: exit code 0 and zero failures.

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer fallbacks and diagnostics"
```

---

### Task 4: Add Prepared Selection and Observer Actions

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`

**Interfaces:**

```ts
function preparedConstellationCenter(
    constellationId: string,
): { x: number; y: number; z: number } | null;

function handleFindSol(): void;
function returnToSol(): void;
```

- [ ] **Step 1: Write prepared selection tests**

Create a prepared constellation with stars `a` and `b`. Return positions `{ x: 10, y: 20, z: 30 }` and `{ x: 30, y: 40, z: 50 }`.

After clicking its list row, assert:

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

When all positions are `null`, assert selection remains and tween is not called.

- [ ] **Step 2: Write reference toggle test**

Click the localized checkbox and assert:

```ts
expect(rendererMock.setReferenceVisible).toHaveBeenLastCalledWith(true);
expect(prepareAlternateObserverCatalogMock).toHaveBeenCalledTimes(1);
expect(rendererMock.initializePreparedCatalogs).toHaveBeenCalledTimes(1);
```

- [ ] **Step 3: Write Find Sol tests**

On success:

```ts
fireEvent.click(screen.getByRole("button", { name: "Find Sol" }));
expect(rendererMock.focusStarById).toHaveBeenCalledWith("sol");
expect(screen.getByTestId("sol-announcement")).toHaveTextContent(
    /right ascension 1\.00 h.*declination \+2\.00°.*4\.25/i,
);
```

When `focusStarById()` returns `false`, assert localized unavailable copy.

- [ ] **Step 4: Write canonical return test**

Mock `routes.constellation("ja")` to return `/ja/constellation`. Render Japanese alternate mode, click Return to Earth/Sol, and assert `window.location.href` ends with `/ja/constellation` and contains no `?observer=`.

Use the existing Happy DOM location replacement pattern from the repository tests; restore the original location object after the test.

- [ ] **Step 5: Run and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "prepared selection|reference toggle|Find Sol|canonical return"
```

Expected: exit code 1.

- [ ] **Step 6: Implement prepared center calculation**

Import `SYNTHETIC_SOL_STAR_ID` and add:

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

    const total = positions.reduce(
        (sum, position) => ({
            x: sum.x + position.x,
            y: sum.y + position.y,
            z: sum.z + position.z,
        }),
        { x: 0, y: 0, z: 0 },
    );

    return {
        x: total.x / positions.length,
        y: total.y / positions.length,
        z: total.z / positions.length,
    };
}
```

Branch `handleSelectConstellation()`:

```ts
if (!renderer) return;
renderer.setSelected(constellationId);

if (alternateCatalog) {
    selectedCenter = preparedConstellationCenter(constellationId);
    if (!selectedCenter) return;
} else {
    if (!viewState.skyConfig) return;
    // preserve current circular mean + celestialToSphere implementation
}

const radius = Math.hypot(
    selectedCenter.x,
    selectedCenter.y,
    selectedCenter.z,
) || 1;
renderer.tweenCameraTo(
    Math.asin(selectedCenter.y / radius),
    Math.atan2(selectedCenter.x, selectedCenter.z),
    900,
);
```

- [ ] **Step 7: Wire reference visibility**

```ts
$: if (renderer && alternateCatalog) {
    renderer.setReferenceVisible(referenceVisible);
}
```

- [ ] **Step 8: Implement Find Sol**

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

    solAnnouncement = t(
        "constellation.observer.findSolAnnouncement",
        {
            ra: sol.rightAscension.toFixed(2),
            dec: signedDegrees(sol.declination),
            distance: new Intl.NumberFormat(currentLang, {
                maximumFractionDigits: 2,
            }).format(sol.distance),
        },
    );
}
```

- [ ] **Step 9: Implement canonical return**

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

- [ ] **Step 10: Add semantic controls before final styling**

Gate on `observerSystem && alternateCatalog`:

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
<div
  data-testid="sol-announcement"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {solAnnouncement}
</div>
```

- [ ] **Step 11: Run tests and commit**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "prepared selection|reference toggle|Find Sol|canonical return"
```

Expected: exit code 0 and zero failures.

```bash
git add \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer sky interactions"
```

---

### Task 5: Add Localized HUD and Accessibility Copy

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/ja.ts`
- Modify: `src/i18n/__tests__/observerUiI18nSync.test.ts`

**Localization Keys:**

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

- [ ] **Step 1: Extend the parity test and verify failure**

Add all keys above to the existing `observerUiKeys` tuple, retaining `action.viewSkyFromHere` and `galaxy.skyUnavailable`.

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: exit code 1 with missing-key assertions.

- [ ] **Step 2: Add exact English copy**

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

- [ ] **Step 3: Add exact Traditional Chinese copy**

```ts
"constellation.observer.label": "觀測位置",
"constellation.observer.distanceFromSol": "與太陽的距離",
"constellation.observer.frame": "參考框架",
"constellation.observer.systemBarycenter": "系統質心",
"constellation.observer.viewDirection": "視線方向",
"constellation.observer.referenceToggle": "顯示地球／太陽參考層",
"constellation.observer.referenceShown": "已顯示",
"constellation.observer.referenceHidden": "已隱藏",
"constellation.observer.findSol": "尋找太陽",
"constellation.observer.findSolAnnouncement":
    "太陽：赤經 {ra} 小時，赤緯 {dec}，距離 {distance} 光年。",
"constellation.observer.findSolUnavailable":
    "此視圖中無法定位太陽。",
"constellation.observer.returnToSol": "返回地球／太陽",
"constellation.observer.educationLines":
    "星座連線保留源自地球文化傳統的參考形狀。",
"constellation.observer.educationBrightness":
    "恆星亮度為近似值，未依此觀測位置校正。",
"constellation.observer.summary":
    "觀測位置：{name}。地球／太陽參考層：{reference}。",
"constellation.observer.fallbackLink":
    "要求的觀測連結無法使用，現正顯示從地球／太陽觀看的星空。",
"constellation.observer.fallbackPosition":
    "要求的觀測位置無法使用，現正顯示從地球／太陽觀看的星空。",
"constellation.observer.fallbackPreparation":
    "無法準備其他恆星系的星空，現正顯示從地球／太陽觀看的星空。",
"constellation.observer.omissions":
    "此觀測框架中有 {count} 顆星表恆星無法顯示。",
"constellation.observer.webglUnavailable":
    "此星空視圖需要 WebGL。請返回地球／太陽以使用標準備援視圖。",
```

- [ ] **Step 4: Add exact Japanese copy**

```ts
"constellation.observer.label": "観測地点",
"constellation.observer.distanceFromSol": "太陽からの距離",
"constellation.observer.frame": "基準座標系",
"constellation.observer.systemBarycenter": "系の重心",
"constellation.observer.viewDirection": "視線方向",
"constellation.observer.referenceToggle": "地球／太陽基準レイヤーを表示",
"constellation.observer.referenceShown": "表示中",
"constellation.observer.referenceHidden": "非表示",
"constellation.observer.findSol": "太陽を探す",
"constellation.observer.findSolAnnouncement":
    "太陽：赤経 {ra} 時、赤緯 {dec}、距離 {distance} 光年。",
"constellation.observer.findSolUnavailable":
    "このビューでは太陽を特定できません。",
"constellation.observer.returnToSol": "地球／太陽へ戻る",
"constellation.observer.educationLines":
    "星座線は地球文化に由来する基準形状を保持しています。",
"constellation.observer.educationBrightness":
    "星の明るさは概算であり、この観測地点向けには補正されていません。",
"constellation.observer.summary":
    "観測地点：{name}。地球／太陽基準レイヤー：{reference}。",
"constellation.observer.fallbackLink":
    "指定された観測リンクは利用できません。地球／太陽からの星空を表示します。",
"constellation.observer.fallbackPosition":
    "指定された観測位置は利用できません。地球／太陽からの星空を表示します。",
"constellation.observer.fallbackPreparation":
    "別の恒星系からの星空を準備できませんでした。地球／太陽からの星空を表示します。",
"constellation.observer.omissions":
    "この観測座標系では星表の恒星 {count} 個を表示できませんでした。",
"constellation.observer.webglUnavailable":
    "この星空ビューには WebGL が必要です。標準のフォールバックを使用するには地球／太陽へ戻ってください。",
```

- [ ] **Step 5: Run parity tests**

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: exit code 0 and zero failures.

- [ ] **Step 6: Write HUD rendering tests**

```ts
it("shows observer identity and hides Earth-only readouts", async () => {
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

Add exact assertions:

```ts
expect(screen.queryByLabelText(/best viewing months/i)).toBeNull();
expect(screen.getByTestId("observer-summary")).toHaveTextContent(
    "Observer Alpha Centauri System. Earth/Sol reference hidden.",
);
```

After checking the reference checkbox:

```ts
expect(screen.getByTestId("observer-summary")).toHaveTextContent(
    "Earth/Sol reference shown.",
);
```

Render `zh` and `ja` with their actual dictionaries and assert:

```ts
expect(document.body.textContent).not.toContain("constellation.observer.");
```

When renderer construction fails in alternate mode, assert the WebGL requirement copy and Return to Earth/Sol button are visible, while the Earth 2D test ID is absent.

- [ ] **Step 7: Run HUD tests and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts -t "observer identity|Earth-only|observer-summary|WebGL requirement|raw keys"
```

Expected: exit code 1 because the final HUD branch does not exist.

- [ ] **Step 8: Add localized system/distance/summary helpers**

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

- [ ] **Step 9: Branch the HUD readout**

For alternate prepared mode, render observer name, distance, frame, and neutral direction:

```svelte
{#if observerSystem && alternateCatalog}
  <div class="hud-readout observer-readout">
    <div class="readout-row">
      <span class="readout-label">{t("constellation.observer.label")}</span>
      <span></span>
      <span class="readout-value">{systemName(observerSystem)}</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">{t("constellation.observer.distanceFromSol")}</span>
      <span></span>
      <span class="readout-value">{observerDistance} ly</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">{t("constellation.observer.frame")}</span>
      <span></span>
      <span class="readout-value">{t("constellation.observer.systemBarycenter")}</span>
    </div>
  </div>
  <div class="compass-readout">
    <span class="compass-label">{t("constellation.observer.viewDirection")}</span>
    <span class="compass-value">{facingDegDisplay}° {facingElevDisplay}</span>
  </div>
{:else}
  <!-- keep the current GEO LOCK, UTC, cardinal compass, and View from Earth markup unchanged -->
{/if}
```

- [ ] **Step 10: Iterate `renderedConstellations` directly**

Replace the current nested ID/filter list with:

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

Use the same list for selected details. Render the viewing-month strip only when `alternateCatalog === null`.

- [ ] **Step 11: Finalize controls, copy, notices, and summaries**

Use existing `Button` styling for the two actions. Keep the reference input in the settings slot.

```svelte
<p class="observer-education">
  {t("constellation.observer.educationLines")}
</p>
<p class="observer-education">
  {t("constellation.observer.educationBrightness")}
</p>
<p id="observer-summary" data-testid="observer-summary" class="sr-only">
  {observerSummary}
</p>
```

Keep the Sol announcement region polite and atomic. Place fallback/omission copy visibly inside the HUD with `role="status"`, never `role="alert"`.

For alternate WebGL failure, show `constellation.observer.webglUnavailable` and Return to Earth/Sol. For Sol failure, keep current copy and Back to Menu behavior.

Add only minimal layout classes for observer readout, actions, education, and notice; reuse existing HUD variables and add no animations.

- [ ] **Step 12: Run all focused suites and commit**

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: exit code 0 and zero failures.

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

### Task 6: Verify Integration and Prepare the PR

**Files:**
- Change only files already listed when verification exposes a defect.

- [ ] **Step 1: Run focused HPA-435 suites**

```bash
bunx vitest run \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: exit code 0 and zero failures.

- [ ] **Step 2: Run consumed contract suites**

```bash
bunx vitest run \
  src/lib/constellation/__tests__/observerRouteState.test.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.test.ts
```

Expected: exit code 0 and zero failures.

- [ ] **Step 3: Run complete verification**

```bash
bun run test:run
bun run type-check
bunx eslint src
bun run build
```

Expected: every command exits 0. Record exact test totals and command output in the PR description after running them; do not predict totals in advance.

- [ ] **Step 4: Review the diff boundary**

```bash
git diff --name-only main...HEAD
git diff --stat main...HEAD
```

Production changes should be limited to:

```text
src/lib/constellation/observerSourceStarIds.ts
src/components/ConstellationWrapper.svelte
src/i18n/en.ts
src/i18n/zh.ts
src/i18n/ja.ts
```

plus focused tests and the approved docs.

Remove accidental changes to route state, catalog preparation, renderer/layer internals, Galaxy entry, stores, source data, or broad E2E suites unless a concrete dependency defect is documented.

- [ ] **Step 5: Check the acceptance matrix**

| Scenario | Required result |
| --- | --- |
| query-free constellation route | unchanged Earth path |
| `?observer=alpha-centauri` | full unfiltered prepared path |
| Alpha Centauri primary | no phantom `alpha_cen` |
| reference enabled | immediate display; no preparation/reinit |
| Find Sol | focuses `sol`; announces RA/Dec/distance |
| invalid route state | visible Sol fallback |
| synthetic Sol fatal | Sol fallback; no partial handoff |
| expected exclusion only | no corruption notice |
| genuine omission | one aggregate status notice |
| alternate WebGL failure | no Earth 2D grid; Return to Earth/Sol |
| `en`/`zh`/`ja` | no raw observer keys |
| reduced motion | existing renderer focus policy applies |

Use automated tests for every row except the final local visual smoke check of layout.

- [ ] **Step 6: Commit verification fixes only when needed**

```bash
git add src/lib/constellation/observerSourceStarIds.ts \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts \
  src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
git commit -m "fix(constellation): close observer integration gaps"
```

Skip this commit when the worktree is clean after verification.

- [ ] **Step 7: Write the PR description from fresh evidence**

Use these headings and fill each verification bullet with the exact output from Step 3:

```markdown
## Summary

Implements HPA-435 by wiring observer route state, prepared catalogs, and renderer layers into `ConstellationWrapper`, with a localized observer HUD, Earth/Sol-reference toggle, Find Sol, canonical return, and visible typed fallbacks.

## YAGNI Boundary

- one stable-ID mapping module;
- wrapper-local state;
- no new service, store, renderer API, URL preference, or persistence;
- no alternate 2D renderer;
- HPA-436 retains broad E2E/performance ownership.

## Verification

- complete test suite: exact command and result
- type-check: exact command and result
- scoped ESLint: exact command and result
- production build: exact command and result
```

Do not write passing claims until those commands have run in the implementation branch.