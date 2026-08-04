# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Complete tasks in order, verify each task before moving on, and commit at task boundaries using the repository's conventional-commit style.

**Goal:** Integrate observer route state, prepared alternate catalogs, observer HUD controls, Find Sol, visible fallbacks, and `en`/`zh`/`ja` localization while preserving the current Earth/Sol experience.

**Architecture:** Keep orchestration in `ConstellationWrapper.svelte`. Add one mapping constant module, resolve observer state once per mount, and branch into the existing Earth path or the completed HPA-433/HPA-434 prepared path. Reuse current renderer APIs; add no service, store, renderer contract, route preference, or alternate 2D renderer.

**Tech Stack:** Astro 5, Svelte 5 using the component's existing legacy syntax, TypeScript 5.8, Three.js 0.178, Vitest 3.2, Testing Library Svelte, Happy DOM, Bun.

## Constraints

- Preserve query-free Earth/Sol behavior and its Earth-oriented 2D fallback.
- Alternate mode must not request geolocation or call `getVisibleConstellations()`.
- Pass the exact full exported `constellations` array to preparation.
- Pass prepared primary/reference catalogs directly; never rebuild top-level stars from membership.
- `alpha-centauri` maps to `alpha_cen` by exact stable ID.
- Keep typed fallback provenance internally, but show one generic fallback message.
- Ignore `observer-source-star-excluded`; show one static notice for any other omission.
- Reference visibility is component-local, defaults to hidden, and is offered only when `referenceCatalog` exists.
- Alternate selection uses prepared world positions, not `celestialToSphere()`.
- Keep the required explanation that constellation lines are Earth cultural references and brightness is approximate.
- Avoid non-null assertions for the post-resolution system lookup and optional reference catalog.

## Files

**Create**

- `src/lib/constellation/observerSourceStarIds.ts`
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts`
- `src/components/__tests__/ConstellationWrapper.observer.test.ts`

**Modify**

- `src/components/ConstellationWrapper.svelte`
- `src/components/__tests__/ConstellationWrapper.test.ts` only if its renderer mock needs new methods
- `src/i18n/en.ts`
- `src/i18n/zh.ts`
- `src/i18n/ja.ts`
- `src/i18n/__tests__/observerUiI18nSync.test.ts`

---

### Task 1: Add the Observer/Source-Star Mapping

**Files:** mapping module and one mapping integrity test.

**Interface:**

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
>;
```

- [ ] **Write a failing integrity test.** Iterate configured mappings and assert:
  - every observer ID exists in `localGalaxyData.starSystems`;
  - every configured observer remains eligible;
  - every source ID occurs in exported constellation membership; and
  - source IDs are unique within and across mappings.

The eligibility assertion protects against regenerated Galaxy-data drift. The cross-observer duplicate assertion is dormant with one mapping but activates without new test design when another mapping is added.

- [ ] **Verify the test fails.**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

Expected: module-not-found failure.

- [ ] **Add the minimal module.**

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
> = {
    "alpha-centauri": ["alpha_cen"],
};
```

No lookup function, empty-array singleton, aliases, normalization, proximity logic, or production catalog imports.

- [ ] **Verify the mapping suite passes.**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
```

---

### Task 2: Branch Initialization by Observer Mode

**Files:** wrapper, focused observer wrapper test, and the existing wrapper test only if its renderer mock requires updates.

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

- [ ] **Create a focused test harness.** Mock legacy/prepared renderer initialization, HPA-433 preparation, location lookup, visibility filtering, one stable full-catalog array, and one eligible Alpha Centauri system at `{ x: 1, y: 2, z: 3 }`.

- [ ] **Write failing mode tests.**

Query-free Sol must call location, visibility filtering, and `renderer.initialize()`, and must not call alternate preparation or prepared initialization.

`?observer=alpha-centauri` must:

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
```

Assert that the exact prepared primary and reference objects reach `initializePreparedCatalogs()` by identity.

- [ ] **Add the two type-boundary tests.**

  1. A resolved `kind: "system"` whose defensive second lookup returns no object falls back to Sol without a non-null assertion.
  2. A successful prepared result with `referenceCatalog: undefined` still initializes the primary catalog and does not expose the reference checkbox.

- [ ] **Verify the tests fail.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

- [ ] **Implement component-local state and mode helpers.**

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
let observerNoticeKey: string | null = null;
let hasUnexpectedOmissions = false;
let solAnnouncement = "";
```

`initializeSolMode()` moves the existing Earth path without changing its location timeout, New York fallback, sky configuration, filtering, translated membership flat-map, or `renderer.initialize()` call.

`initializeAlternateMode()` passes `OBSERVER_SOURCE_STAR_IDS[system.id] ?? []`, retains the exact prepared output, uses primary prepared constellations for display/selection, and passes the optional reference catalog through without `!`.

- [ ] **Resolve once before geolocation and select the mode.** For `kind: "system"`, repeat the exact ID lookup. If it unexpectedly misses, log the invariant mismatch in development, set the generic fallback notice, and run Sol mode.

- [ ] **Verify both wrapper suites.**

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
```

---

### Task 3: Add Fallbacks, Omission Notice, and 2D Gating

**Files:** wrapper and observer wrapper test.

- [ ] **Write failing fallback tests.** Use `it.each` for `empty`, `duplicate`, `unknown-system`, `invalid-coordinates`, and `origin-collision`. Each initializes Sol, skips prepared initialization, preserves the typed reason, and shows:

```text
Observer unavailable; showing the sky from Earth/Sol.
```

Add a fatal `synthetic-sol-unavailable` case with the same visible message and no partial prepared handoff.

- [ ] **Write failing omission tests.** Expected source-star exclusions show no notice. Any other omission shows one static notice:

```text
Some catalog stars could not be displayed.
```

Do not display a count. Keep the user-facing diagnostic because HPA-435 explicitly requires coordinate-failure omissions to surface non-blockingly.

- [ ] **Write the failing alternate WebGL test.** A valid alternate request whose WebGL path fails must not create the Earth-oriented 2D fallback and must show WebGL-required copy plus Return to Earth/Sol.

- [ ] **Implement the lean behavior.**
  - Use `constellation.observer.fallback` for every route or fatal-preparation fallback.
  - Keep typed provenance in `resolvedObserverState`.
  - Set `hasUnexpectedOmissions` with one `.some()` check excluding `observer-source-star-excluded`.
  - Create the existing 2D fallback only for Sol mode or after alternate mode has fallen back to Sol.

- [ ] **Verify the focused suite.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

---

### Task 4: Add Prepared Selection and Observer Actions

**Files:** wrapper and observer wrapper test.

- [ ] **Write failing interaction tests.** Cover:
  - reference checkbox appears only when `referenceCatalog` exists;
  - toggling it calls `setReferenceVisible(true)` without re-preparation or reinitialization;
  - Find Sol calls `focusStarById(SYNTHETIC_SOL_STAR_ID)` and announces RA/declination/distance;
  - focus failure announces unavailable copy;
  - alternate selection uses `getStarWorldPosition()` and never `celestialToSphere()`; and
  - Return navigates to `routes.constellation(lang)` without `observer=sol`.

- [ ] **Wire reference visibility.** Render a native checkbox only when the prepared output contains a reference catalog. Keep `referenceVisible = false` otherwise.

- [ ] **Implement Find Sol.** Find the synthetic record in `primaryCatalog.stars`, call `focusStarById(SYNTHETIC_SOL_STAR_ID)`, and format the localized announcement with RA/declination to two decimals, an explicit declination sign, and locale-aware distance. Do not add another reduced-motion branch.

- [ ] **Branch constellation focus by mode.** Keep the existing Earth calculation. In alternate mode, average available primary world positions returned by `getStarWorldPosition()`, then reuse the current target-lock and camera pitch/yaw logic. When none are available, retain selection details but do not move the camera.

- [ ] **Add canonical return.**

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

- [ ] **Verify the focused suite.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

---

### Task 5: Add the Localized Alternate HUD

**Files:** wrapper, observer wrapper test, three locale dictionaries, and the existing observer i18n parity test.

- [ ] **Add locale keys and exact placeholder sets.** Prefix the suffixes below with `constellation.observer.`.

| Suffix | English | Traditional Chinese | Japanese |
| --- | --- | --- | --- |
| `label` | Observer | 觀測者 | 観測者 |
| `distanceFromSol` | Distance from Sol | 距離太陽 | 太陽からの距離 |
| `frameSystemBarycenter` | Frame: System barycenter | 座標框架：系統質心 | 座標系：系の重心 |
| `viewDirection` | View direction | 視線方向 | 視線方向 |
| `referenceToggle` | Show Earth/Sol reference | 顯示地球／太陽參考層 | 地球／太陽の参照レイヤーを表示 |
| `findSol` | Find Sol | 尋找太陽 | 太陽を探す |
| `findSolAnnouncement` | Sol: right ascension {ra} h, declination {dec}°, distance {distance} ly. | 太陽：赤經 {ra} 小時，赤緯 {dec}°，距離 {distance} 光年。 | 太陽：赤経 {ra} 時、赤緯 {dec}°、距離 {distance} 光年。 |
| `findSolUnavailable` | Sol could not be focused. | 無法將視角移至太陽。 | 太陽に視点を合わせられませんでした。 |
| `returnToSol` | Return to Earth/Sol | 返回地球／太陽 | 地球／太陽へ戻る |
| `education` | Constellation lines preserve Earth cultural reference shapes; star brightness is approximate for this observer. | 星座連線保留源自地球文化的參考形狀；此觀測位置所顯示的恆星亮度僅為近似值。 | 星座線は地球文化に由来する参照形状を保っています。この観測地点での恒星の明るさは概算です。 |
| `fallback` | Observer unavailable; showing the sky from Earth/Sol. | 無法使用此觀測者；目前顯示地球／太陽視角。 | この観測者は利用できないため、地球／太陽からの空を表示しています。 |
| `omissions` | Some catalog stars could not be displayed. | 部分星表恆星無法顯示。 | 一部の星表データを表示できませんでした。 |
| `webglUnavailable` | This observer view requires WebGL. | 此觀測者視角需要 WebGL。 | この観測者表示には WebGL が必要です。 |

- [ ] **Extend parity tests before HUD work.** Check every key in all locales and verify `{ra}`, `{dec}`, and `{distance}` for `findSolAnnouncement`.

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: failure until all locale dictionaries are updated.

- [ ] **Write failing HUD assertions.** Alternate mode shows localized observer name, current system distance, the combined frame string, neutral direction, optional reference checkbox, Find Sol, Return, and education copy. It hides geolocation, UTC, cardinal wording, `View from Earth`, and the month strip. Sol mode keeps its current HUD.

- [ ] **Render the mode-specific HUD.** Reuse the existing `systems.${id}.name` fallback pattern and iterate `renderedConstellations` directly.

The visible observer readout plus the native labeled checkbox satisfy the required text summary. Do not add duplicate hidden summary, shown, or hidden strings. Keep only the polite atomic Find Sol status region for transient announcements.

- [ ] **Verify localization and wrapper tests.**

```bash
bunx vitest run \
  src/i18n/__tests__/observerUiI18nSync.test.ts \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
```

---

### Task 6: Verify the Integration

- [ ] **Run focused suites.**

```bash
bunx vitest run \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
```

- [ ] **Run the full repository checks.**

```bash
bun run test:run
bun run type-check
bun run build
bunx eslint src
```

- [ ] **Confirm the implementation boundary manually.** Production changes should remain limited to one mapping constant module, `ConstellationWrapper.svelte`, and the three locale dictionaries unless a verified existing-contract defect requires otherwise.

## Extraction threshold

Keep orchestration in the wrapper while it has one consumer and one alternate-mode behavior. Do not extract merely because another observer ID is added. Reconsider a pure coordinator only if orchestration gains a second consumer or materially divergent observer modes create duplicated branching and test setup.