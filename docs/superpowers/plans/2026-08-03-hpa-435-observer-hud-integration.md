# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate observer route state, prepared alternate catalogs, observer HUD controls, Find Sol, visible fallbacks, and `en`/`zh`/`ja` localization while preserving the current Earth/Sol experience.

**Architecture:** Keep orchestration in `ConstellationWrapper.svelte`. Add one mapping constant module, resolve observer state once per mount, and branch into the existing Earth path or the completed HPA-433/HPA-434 prepared path. Reuse current renderer APIs; add no new service, store, renderer contract, route preference, or alternate 2D renderer.

**Tech Stack:** Astro 5, Svelte 5 using the component's existing legacy syntax, TypeScript 5.8, Three.js 0.178, Vitest 3.2, Testing Library Svelte, Happy DOM, Bun.

## Global Constraints

- Preserve query-free Earth/Sol behavior and its Earth-oriented 2D fallback.
- Alternate mode must not request geolocation or call `getVisibleConstellations()`.
- Pass the exact full exported `constellations` array to preparation.
- Pass prepared primary/reference catalogs directly; never rebuild top-level stars from membership.
- Map observer/source identity only by exact stable IDs; `alpha-centauri` maps to `alpha_cen`.
- Keep typed fallback provenance internally, but show one generic observer fallback message.
- Ignore `observer-source-star-excluded`; show one static notice for any other omission.
- Reference visibility is component-local and defaults to hidden.
- Alternate selection uses prepared world positions, not `celestialToSphere()`.
- Keep required educational copy about Earth cultural lines and approximate brightness.
- Do not modify HPA-432/433/434 internals unless implementation exposes a contract defect.

---

## File Structure

### Create

- `src/lib/constellation/observerSourceStarIds.ts` — one exported mapping constant.
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts` — configured mapping integrity.
- `src/components/__tests__/ConstellationWrapper.observer.test.ts` — observer integration coverage.

### Modify

- `src/components/ConstellationWrapper.svelte`
- `src/components/__tests__/ConstellationWrapper.test.ts` only if its renderer mock needs newly referenced methods
- `src/i18n/en.ts`
- `src/i18n/zh.ts`
- `src/i18n/ja.ts`
- `src/i18n/__tests__/observerUiI18nSync.test.ts`

---

### Task 1: Add the Explicit Observer/Source-Star Mapping

**Files:**
- Create: `src/lib/constellation/observerSourceStarIds.ts`
- Create: `src/lib/constellation/__tests__/observerSourceStarIds.test.ts`

**Produces:**

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
>;
```

- [ ] **Step 1: Write the failing integrity test**

Use one test that validates every configured mapping without inferring new mappings:

```ts
import { describe, expect, it } from "vitest";
import { constellations } from "@/data/constellations";
import { isObserverCandidateEligible } from "@/lib/constellation/observerRouteState";
import { OBSERVER_SOURCE_STAR_IDS } from "@/lib/constellation/observerSourceStarIds";
import { localGalaxyData } from "@/lib/galaxy";

describe("OBSERVER_SOURCE_STAR_IDS", () => {
    it("contains only eligible observers, canonical source IDs, and unique assignments", () => {
        const canonicalIds = new Set(
            constellations.flatMap((constellation) =>
                constellation.stars.map((star) => star.id),
            ),
        );
        const assigned = new Set<string>();

        for (const [observerId, sourceIds] of Object.entries(
            OBSERVER_SOURCE_STAR_IDS,
        )) {
            const observer = localGalaxyData.starSystems.find(
                ({ id }) => id === observerId,
            );
            expect(observer, `missing observer ${observerId}`).toBeDefined();
            expect(isObserverCandidateEligible(observer!)).toEqual({
                eligible: true,
            });
            expect(new Set(sourceIds).size).toBe(sourceIds.length);

            for (const sourceId of sourceIds) {
                expect(canonicalIds.has(sourceId)).toBe(true);
                expect(assigned.has(sourceId)).toBe(false);
                assigned.add(sourceId);
            }
        }
    });
});
```

- [ ] **Step 2: Run the test and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: exit code 1 because the module does not exist.

- [ ] **Step 3: Add the minimal mapping module**

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
> = {
    "alpha-centauri": ["alpha_cen"],
};
```

Do not add a lookup function, empty-array singleton, normalization, aliases, or catalog imports.

- [ ] **Step 4: Run the mapping test**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/observerSourceStarIds.ts \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts
git commit -m "feat(constellation): add observer source-star mapping"
```

---

### Task 2: Branch Wrapper Initialization by Observer Mode

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Create: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/components/__tests__/ConstellationWrapper.test.ts` only if required by the shared renderer mock

**Consumes:**

```ts
OBSERVER_SOURCE_STAR_IDS[observerId] ?? [];
parseObserverQuery(searchParams);
resolveObserverState(parsed, localGalaxyData.starSystems);
prepareAlternateObserverCatalog(source, observerPosition, options);
renderer.initializePreparedCatalogs(request, settings);
```

**Produces:**

```ts
type DisplayConstellation = Constellation | PreparedConstellation;

function resolveCurrentObserver(): ResolvedObserverState;
function createRenderer(): ConstellationRenderer;
async function initializeSolMode(): Promise<void>;
async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol">;
```

- [ ] **Step 1: Add a focused observer test harness**

In `ConstellationWrapper.observer.test.ts`, mock:

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
```

Use one stable `fullConstellations` array in the data mock and one eligible `alpha-centauri` system at `{ x: 1, y: 2, z: 3 }`.

- [ ] **Step 2: Add failing Sol and alternate tests**

The Sol test must assert:

```ts
expect(getCurrentLocationMock).toHaveBeenCalledTimes(1);
expect(getVisibleConstellationsMock).toHaveBeenCalled();
expect(rendererMock.initialize).toHaveBeenCalled();
expect(prepareAlternateObserverCatalogMock).not.toHaveBeenCalled();
expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
```

The Alpha Centauri test must assert:

```ts
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
```

Use object identity assertions for `primaryCatalog` and `referenceCatalog` so a future membership rebuild fails the test.

- [ ] **Step 3: Run the focused suite and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

Expected: exit code 1 because the wrapper always follows the Earth path.

- [ ] **Step 4: Add imports and component-local observer state**

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
import { OBSERVER_SOURCE_STAR_IDS } from "@/lib/constellation/observerSourceStarIds";

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
let observerNoticeKey: string | null = null;
let hasUnexpectedOmissions = false;
let solAnnouncement = "";
```

- [ ] **Step 5: Extract renderer creation without changing callbacks**

Move the current constructor and callback object into `createRenderer()`. Keep the existing accessibility text and callback behavior unchanged.

- [ ] **Step 6: Extract the current Earth path into `initializeSolMode()`**

Move, without semantic changes:

- location timeout and New York fallback;
- current `SkyConfiguration` values;
- `getVisibleConstellations()`;
- translated legacy star membership flat-map; and
- `renderer.initialize(...)`.

Assign:

```ts
renderedConstellations = visibleConstellations;
viewState.visibleConstellations = visibleConstellations.map(({ id }) => id);
```

- [ ] **Step 7: Implement `initializeAlternateMode()`**

```ts
const prepared = prepareAlternateObserverCatalog(
    constellations,
    {
        x: system.position.x,
        y: system.position.y,
        z: system.position.z,
    },
    {
        includeReferenceCatalog: true,
        observerSourceStarIds:
            OBSERVER_SOURCE_STAR_IDS[system.id] ?? [],
    },
);
```

Return `"fallback-to-sol"` when `prepared.ok` is false. On success:

```ts
observerSystem = system;
alternateCatalog = prepared.value;
renderedConstellations = prepared.value.primaryCatalog.constellations;
hasUnexpectedOmissions = prepared.value.omittedStars.some(
    ({ reason }) => reason.code !== "observer-source-star-excluded",
);

await renderer!.initializePreparedCatalogs(
    {
        primaryCatalog: prepared.value.primaryCatalog,
        referenceCatalog: prepared.value.referenceCatalog,
        referenceVisible,
    },
    {
        minimumMagnitude: 4,
        showConstellationLines: true,
        showStarNames: true,
    },
);
```

- [ ] **Step 8: Resolve once and select the mode before geolocation**

At the start of initialization:

```ts
resolvedObserverState = resolveCurrentObserver();
renderer = createRenderer();

if (resolvedObserverState.kind === "system") {
    const system = localGalaxyData.starSystems.find(
        ({ id }) => id === resolvedObserverState.observerId,
    );
    if (system && (await initializeAlternateMode(system)) === "ready") {
        return;
    }
}

await initializeSolMode();
```

Keep loading completion, HUD RAF startup, retries, and cleanup in the existing lifecycle owner rather than returning before those shared steps.

- [ ] **Step 9: Run wrapper tests**

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
```

Expected: exit code 0.

- [ ] **Step 10: Commit**

```bash
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
git commit -m "feat(constellation): initialize observer sky mode"
```

---

### Task 3: Add Generic Fallbacks, Omission Notice, and 2D Gating

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`

**Produces:**

```ts
observerNoticeKey: string | null;
hasUnexpectedOmissions: boolean;
```

- [ ] **Step 1: Add failing fallback tests**

Use `it.each` for all HPA-432 fallback reasons and assert each case:

```ts
expect(rendererMock.initialize).toHaveBeenCalled();
expect(rendererMock.initializePreparedCatalogs).not.toHaveBeenCalled();
expect(screen.getByRole("status")).toHaveTextContent(
    "Observer unavailable; showing the sky from Earth/Sol.",
);
```

Add a fatal preparation case with `{ ok: false, error: { code: "synthetic-sol-unavailable", cause } }` and the same visible fallback assertion.

- [ ] **Step 2: Add failing omission tests**

Test one expected exclusion and one genuine omission:

```ts
expect(
    screen.queryByText("Some catalog stars could not be displayed."),
).not.toBeInTheDocument();
```

for only `observer-source-star-excluded`, and:

```ts
expect(
    screen.getByText("Some catalog stars could not be displayed."),
).toBeInTheDocument();
```

when any other omission is present. Do not assert a count.

- [ ] **Step 3: Add the failing alternate WebGL test**

Force renderer construction or initialization to fail under `?observer=alpha-centauri` and assert:

```ts
expect(container.querySelector("canvas[data-earth-fallback]")).toBeNull();
expect(screen.getByText("This observer view requires WebGL.")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Return to Earth/Sol" })).toBeInTheDocument();
```

If the current fallback canvas has no identifying attribute, add `data-earth-fallback` when it is created so the test targets behavior rather than layout classes.

- [ ] **Step 4: Run the focused suite and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

Expected: exit code 1.

- [ ] **Step 5: Implement one generic fallback path**

When `resolvedObserverState.kind === "fallback"`, set:

```ts
observerNoticeKey = "constellation.observer.fallback";
```

Log the typed result only under the project's development guard. For fatal preparation, clear alternate state, set the same key, and call `initializeSolMode()` on the current renderer.

- [ ] **Step 6: Render one static omission notice**

```svelte
{#if hasUnexpectedOmissions}
    <p role="status">{t("constellation.observer.omissions")}</p>
{/if}
```

Do not show IDs, raw transform errors, or an omission count.

- [ ] **Step 7: Gate the Earth 2D fallback by mode**

Create/draw the existing fallback canvas only when `resolvedObserverState.kind !== "system"` or alternate preparation has already fallen back to Sol. For a successful alternate request whose WebGL path fails, show WebGL-required copy and the canonical return action instead.

- [ ] **Step 8: Run the focused suite**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

Expected: exit code 0.

- [ ] **Step 9: Commit**

```bash
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer fallbacks"
```

---

### Task 4: Add Prepared Selection, Reference Toggle, Find Sol, and Return

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`

- [ ] **Step 1: Add failing interaction tests**

Cover:

1. checking the reference checkbox calls `setReferenceVisible(true)` and does not call preparation or initialization again;
2. Find Sol calls `focusStarById(SYNTHETIC_SOL_STAR_ID)`;
3. Find Sol announces localized RA, declination, and distance;
4. reduced motion adds no wrapper-side focus branch;
5. alternate constellation selection asks for prepared star world positions and does not call `celestialToSphere()`; and
6. Return sets `window.location.href` to `routes.constellation(lang)` without `observer=sol`.

Key assertions:

```ts
expect(rendererMock.focusStarById).toHaveBeenCalledWith("sol");
expect(rendererMock.getStarWorldPosition).toHaveBeenCalledWith("prepared-a");
expect(celestialToSphereMock).not.toHaveBeenCalled();
expect(prepareAlternateObserverCatalogMock).toHaveBeenCalledTimes(1);
expect(rendererMock.initializePreparedCatalogs).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the focused suite and verify failure**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

Expected: exit code 1.

- [ ] **Step 3: Wire reference visibility**

Use a native checkbox bound to `referenceVisible` and one reactive call:

```ts
$: if (renderer && alternateCatalog) {
    renderer.setReferenceVisible(referenceVisible);
}
```

- [ ] **Step 4: Implement Find Sol**

```ts
function handleFindSol(): void {
    const sol = alternateCatalog?.primaryCatalog.stars.find(
        ({ id }) => id === SYNTHETIC_SOL_STAR_ID,
    );
    const focused =
        renderer?.focusStarById(SYNTHETIC_SOL_STAR_ID) ?? false;

    if (!sol || !focused) {
        solAnnouncement = t("constellation.observer.findSolUnavailable");
        return;
    }

    solAnnouncement = t("constellation.observer.findSolAnnouncement", {
        ra: sol.rightAscension.toFixed(2),
        dec: `${sol.declination >= 0 ? "+" : ""}${sol.declination.toFixed(2)}`,
        distance: new Intl.NumberFormat(currentLang, {
            maximumFractionDigits: 2,
        }).format(sol.distance),
    });
}
```

Render `solAnnouncement` in a polite atomic status region.

- [ ] **Step 5: Branch constellation focus by mode**

Keep the current Earth calculation unchanged. In alternate mode:

```ts
const positions = constellation.stars.flatMap((star) => {
    const position = renderer?.getStarWorldPosition(star.id);
    return position ? [position] : [];
});

if (positions.length === 0) {
    selectedCenter = null;
    return;
}

selectedCenter = positions.reduce(
    (sum, position) => ({
        x: sum.x + position.x / positions.length,
        y: sum.y + position.y / positions.length,
        z: sum.z + position.z / positions.length,
    }),
    { x: 0, y: 0, z: 0 },
);
```

Reuse the current pitch/yaw calculation and `tweenCameraTo()` call.

- [ ] **Step 6: Add canonical return**

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

- [ ] **Step 7: Run the focused suite**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

Expected: exit code 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer sky interactions"
```

---

### Task 5: Add the Localized Alternate HUD and Accessibility Copy

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`
- Modify: `src/components/__tests__/ConstellationWrapper.observer.test.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/ja.ts`
- Modify: `src/i18n/__tests__/observerUiI18nSync.test.ts`

- [ ] **Step 1: Add exact locale strings**

Add the following values:

| Key suffix | English | Traditional Chinese | Japanese |
| --- | --- | --- | --- |
| `label` | Observer | 觀測者 | 観測者 |
| `distanceFromSol` | Distance from Sol | 距離太陽 | 太陽からの距離 |
| `frame` | Frame | 座標框架 | 座標系 |
| `systemBarycenter` | System barycenter | 系統質心 | 系の重心 |
| `viewDirection` | View direction | 視線方向 | 視線方向 |
| `referenceToggle` | Show Earth/Sol reference | 顯示地球／太陽參考層 | 地球／太陽の参照レイヤーを表示 |
| `referenceShown` | shown | 顯示中 | 表示中 |
| `referenceHidden` | hidden | 已隱藏 | 非表示 |
| `findSol` | Find Sol | 尋找太陽 | 太陽を探す |
| `findSolAnnouncement` | Sol: right ascension {ra} h, declination {dec}°, distance {distance} ly. | 太陽：赤經 {ra} 小時，赤緯 {dec}°，距離 {distance} 光年。 | 太陽：赤経 {ra} 時、赤緯 {dec}°、距離 {distance} 光年。 |
| `findSolUnavailable` | Sol could not be focused. | 無法將視角移至太陽。 | 太陽に視点を合わせられませんでした。 |
| `returnToSol` | Return to Earth/Sol | 返回地球／太陽 | 地球／太陽へ戻る |
| `education` | Constellation lines preserve Earth cultural reference shapes; star brightness is approximate for this observer. | 星座連線保留源自地球文化的參考形狀；此觀測位置所顯示的恆星亮度僅為近似值。 | 星座線は地球文化に由来する参照形状を保っています。この観測地点での恒星の明るさは概算です。 |
| `summary` | Observer: {observer}. Earth/Sol reference: {reference}. | 觀測者：{observer}。地球／太陽參考層：{reference}。 | 観測者：{observer}。地球／太陽の参照レイヤー：{reference}。 |
| `fallback` | Observer unavailable; showing the sky from Earth/Sol. | 無法使用此觀測者；目前顯示地球／太陽視角。 | この観測者は利用できないため、地球／太陽からの空を表示しています。 |
| `omissions` | Some catalog stars could not be displayed. | 部分星表恆星無法顯示。 | 一部の星表データを表示できませんでした。 |
| `webglUnavailable` | This observer view requires WebGL. | 此觀測者視角需要 WebGL。 | この観測者表示には WebGL が必要です。 |

Prefix each suffix with `constellation.observer.`.

- [ ] **Step 2: Extend the parity test before changing the HUD**

Add all exact keys to `observerUiKeys`. Add placeholder parity assertions for:

```text
findSolAnnouncement -> {ra}, {dec}, {distance}
summary -> {observer}, {reference}
```

Run:

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: exit code 1 until all three locale dictionaries contain the keys.

- [ ] **Step 3: Add failing HUD assertions**

For alternate mode, assert the rendered HUD contains observer name, distance, System barycenter, neutral direction, checkbox, Find Sol, Return, and the combined education sentence.

Also assert it does not contain Earth-only geo lock, UTC, `View from Earth`, cardinal compass text, or the viewing-month strip.

For Sol mode, retain the current Earth HUD assertions.

- [ ] **Step 4: Render the alternate HUD branch**

Use the existing system localization pattern:

```ts
function observerSystemName(system: StarSystemData): string {
    const key = `systems.${system.id}.name`;
    const translated = t(key);
    return translated === key ? system.name : translated;
}
```

Iterate `renderedConstellations` directly for both modes. In alternate mode, omit the month strip and use prepared constellation star counts.

Add:

```svelte
<p class="sr-only">
    {t("constellation.observer.summary", {
        observer: observerSystemName(observerSystem),
        reference: t(
            referenceVisible
                ? "constellation.observer.referenceShown"
                : "constellation.observer.referenceHidden",
        ),
    })}
</p>

<p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {solAnnouncement}
</p>
```

- [ ] **Step 5: Run focused HUD and locale tests**

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
git commit -m "feat(constellation): add localized observer HUD"
```

---

### Task 6: Verify the Integration and Scope Boundary

**Files:**
- Modify implementation files only if verification exposes a defect

- [ ] **Step 1: Run focused tests**

```bash
bunx vitest run \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts \
  src/lib/constellation/__tests__/observerRouteState.test.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.test.ts
```

Expected: exit code 0.

- [ ] **Step 2: Run the full unit suite**

```bash
bun run test:run
```

Expected: exit code 0 and zero failed tests.

- [ ] **Step 3: Run static verification**

```bash
bun run type-check
bunx eslint src
bun run build
```

Expected: every command exits 0.

- [ ] **Step 4: Review the final diff**

```bash
git diff --stat main...HEAD
git diff --name-only main...HEAD
```

Expected production scope:

```text
src/components/ConstellationWrapper.svelte
src/i18n/en.ts
src/i18n/ja.ts
src/i18n/zh.ts
src/lib/constellation/observerSourceStarIds.ts
```

Expected focused tests:

```text
src/components/__tests__/ConstellationWrapper.observer.test.ts
src/components/__tests__/ConstellationWrapper.test.ts (only if mock changes were required)
src/i18n/__tests__/observerUiI18nSync.test.ts
src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Investigate any change to route, catalog-preparation, renderer, Galaxy, store, or broad E2E files before keeping it.

- [ ] **Step 5: Commit verification fixes, when present**

```bash
git add <only-files-changed-by-verification>
git commit -m "fix(constellation): resolve observer integration verification"
```

Skip this commit when verification required no changes.

- [ ] **Step 6: Record evidence in the PR**

Report exact results for:

- focused tests;
- full unit tests;
- type check;
- ESLint;
- production build; and
- final changed-file scope.

Do not claim passing status until each command has run on the implementation branch.
