# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Track work with the checkboxes below and verify each task before committing.

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
- Reference visibility is component-local and defaults to hidden.
- Alternate selection uses prepared world positions, not `celestialToSphere()`.
- Keep the required explanation that constellation lines are Earth cultural references and brightness is approximate.

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

**Files:** mapping module and mapping test.

**Interface:**

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
>;
```

- [ ] **Write the failing integrity test.** Iterate configured mappings and assert that each observer exists and is eligible, each source ID occurs in exported constellation membership, and source IDs are unique within/across mappings.

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

- [ ] **Verify and commit.**

```bash
bunx vitest run src/lib/constellation/__tests__/observerSourceStarIds.test.ts
git add src/lib/constellation/observerSourceStarIds.ts \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts
git commit -m "feat(constellation): add observer source-star mapping"
```

---

### Task 2: Branch Initialization by Observer Mode

**Files:** wrapper, observer wrapper test, and existing wrapper test only when its renderer mock requires updates.

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

- [ ] **Create a focused test harness.** Mock the renderer's legacy and prepared initialization methods, HPA-433 preparation, location lookup, visibility filtering, one stable full-catalog array, and one eligible Alpha Centauri system at `{ x: 1, y: 2, z: 3 }`.

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

Use identity assertions for the prepared catalogs.

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

`initializeAlternateMode()` calls:

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

On success, retain the exact prepared output, use its primary constellations for display/selection, classify unexpected omissions with `.some(...)`, and pass the exact catalog objects to `initializePreparedCatalogs()`.

- [ ] **Resolve once before geolocation and select the mode.** Keep loading completion, retry handling, HUD RAF startup, and cleanup in the existing lifecycle owner.

- [ ] **Verify and commit.**

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts
git commit -m "feat(constellation): initialize observer sky mode"
```

---

### Task 3: Add Generic Fallbacks, Omission Notice, and 2D Gating

**Files:** wrapper and observer wrapper test.

- [ ] **Write failing fallback tests.** Use `it.each` for `empty`, `duplicate`, `unknown-system`, `invalid-coordinates`, and `origin-collision`. Each must initialize Sol, skip prepared initialization, preserve the resolved typed reason, and show:

```text
Observer unavailable; showing the sky from Earth/Sol.
```

Add a fatal `synthetic-sol-unavailable` case with the same visible message and no partial prepared handoff.

- [ ] **Write failing omission tests.** Expected source-star exclusions show no notice. Any other omission shows one static notice:

```text
Some catalog stars could not be displayed.
```

Do not test or display a count.

- [ ] **Write the failing alternate WebGL test.** A successful alternate request whose WebGL path fails must not create the Earth-oriented 2D fallback canvas and must show WebGL-required copy plus Return to Earth/Sol.

- [ ] **Verify failures.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

- [ ] **Implement the lean behavior.**

  - Set `observerNoticeKey = "constellation.observer.fallback"` for any HPA-432 fallback and fatal preparation failure.
  - Keep typed provenance in `resolvedObserverState`; development logging may include it.
  - Set `hasUnexpectedOmissions` with one `.some()` check excluding `observer-source-star-excluded`.
  - Render one nonblocking status notice when true.
  - Create the existing 2D fallback only for Sol mode or after alternate mode has already fallen back to Sol.

- [ ] **Verify and commit.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer fallbacks"
```

---

### Task 4: Add Prepared Selection and Observer Actions

**Files:** wrapper and observer wrapper test.

- [ ] **Write failing interaction tests.** Cover:

  - reference checkbox calls `setReferenceVisible(true)` without re-preparation/reinitialization;
  - Find Sol calls `focusStarById(SYNTHETIC_SOL_STAR_ID)` and announces RA/declination/distance;
  - focus failure announces unavailable copy;
  - alternate selection uses `getStarWorldPosition()` and never `celestialToSphere()`;
  - Return navigates to `routes.constellation(lang)` without `observer=sol`.

- [ ] **Verify failures.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
```

- [ ] **Wire reference visibility.** Use a native checkbox and:

```ts
$: if (renderer && alternateCatalog) {
    renderer.setReferenceVisible(referenceVisible);
}
```

- [ ] **Implement Find Sol.** Find the synthetic record in `primaryCatalog.stars`, call `focusStarById(SYNTHETIC_SOL_STAR_ID)`, and format the localized announcement with RA/declination to two decimals, an explicit declination sign, and locale-aware distance. Do not add another reduced-motion branch.

- [ ] **Branch constellation focus by mode.** Keep the existing Earth calculation. In alternate mode, average available primary world positions returned by `getStarWorldPosition()`, then reuse the current target-lock and camera pitch/yaw logic. When none are available, retain selection details but do not move the camera.

- [ ] **Add canonical return.**

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

- [ ] **Verify and commit.**

```bash
bunx vitest run src/components/__tests__/ConstellationWrapper.observer.test.ts
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts
git commit -m "feat(constellation): add observer sky interactions"
```

---

### Task 5: Add the Localized Alternate HUD

**Files:** wrapper, observer wrapper test, three locale dictionaries, and the existing observer i18n parity test.

- [ ] **Add locale keys and exact placeholder sets.** Prefix the suffixes below with `constellation.observer.`.

| Suffix | English | Traditional Chinese | Japanese |
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

- [ ] **Extend parity tests before HUD work.** Check every key in all locales. Check `{ra}`, `{dec}`, `{distance}` for `findSolAnnouncement` and `{observer}`, `{reference}` for `summary`.

```bash
bunx vitest run src/i18n/__tests__/observerUiI18nSync.test.ts
```

Expected: failure until all locale dictionaries are updated.

- [ ] **Write failing HUD assertions.** Alternate mode must show localized observer name, current system distance, System barycenter, neutral direction, reference checkbox, Find Sol, Return, and the combined education sentence. It must hide geolocation, UTC, cardinal wording, `View from Earth`, and the viewing-month strip. Sol mode keeps its current HUD.

- [ ] **Render the mode-specific HUD.** Reuse the existing `systems.${id}.name` fallback pattern and iterate `renderedConstellations` directly. Add a hidden summary and a polite atomic Find Sol status region.

- [ ] **Verify and commit.**

```bash
bunx vitest run \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts
git commit -m "feat(constellation): add localized observer HUD"
```

---

### Task 6: Verify the Integration and Scope

- [ ] **Run focused regression tests.**

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

- [ ] **Run full verification.**

```bash
bun run test:run
bun run type-check
bunx eslint src
bun run build
```

Every command must exit 0 before reporting success.

- [ ] **Review changed-file scope.**

```bash
git diff --stat main...HEAD
git diff --name-only main...HEAD
```

Expected production files are the wrapper, three locale dictionaries, and the mapping module. Expected tests are the focused wrapper, mapping, and i18n tests, plus the existing wrapper test only when its mock changed. Investigate any route, catalog, renderer, Galaxy, store, or broad E2E change before keeping it.

- [ ] **Commit verification fixes only when needed.**

```bash
git add src/components/ConstellationWrapper.svelte \
  src/components/__tests__/ConstellationWrapper.observer.test.ts \
  src/components/__tests__/ConstellationWrapper.test.ts \
  src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts \
  src/i18n/__tests__/observerUiI18nSync.test.ts \
  src/lib/constellation/observerSourceStarIds.ts \
  src/lib/constellation/__tests__/observerSourceStarIds.test.ts
git commit -m "fix(constellation): resolve observer integration verification"
```

Skip the commit when verification required no changes.

- [ ] **Record exact command results and the final file list in the implementation PR.**
