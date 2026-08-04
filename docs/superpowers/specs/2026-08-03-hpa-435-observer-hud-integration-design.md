# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Design

**Status:** Approved for implementation planning  
**Linear:** HPA-435 — Integrate observer HUD, Find Sol, fallbacks, and localization  
**Depends on:** HPA-432 route state; HPA-433 prepared observer catalogs; HPA-434 prepared catalog renderer  
**Blocks:** HPA-436 cross-system E2E, accessibility, and performance hardening

## Summary

Integrate the completed HPA-432, HPA-433, and HPA-434 contracts in `ConstellationWrapper.svelte` with a thin product layer.

The wrapper resolves the `observer` query once per mount and chooses one path:

- **Sol mode:** preserve the current geolocation, New York fallback, latitude/month filtering, Earth-horizontal rendering, compass, horizon, sidereal-time behavior, and Earth-oriented 2D fallback.
- **Alternate-observer mode:** resolve one `localGalaxyData` system, prepare the exact full exported `constellations` array, and pass the prepared primary/reference catalog pairs directly to `initializePreparedCatalogs()`.

Add one small module containing the explicit observer-system to source-star mapping:

```text
alpha-centauri -> alpha_cen
```

Extend the existing HUD with observer identity, distance from Sol, **Frame: System barycenter**, neutral view direction, reference visibility, Find Sol, Return to Earth/Sol, required educational copy, visible fallback/omission notices, and a screen-reader status for Find Sol.

## Goals

- Preserve query-free Earth/Sol behavior.
- Resolve observer state through HPA-432 and retain typed provenance internally.
- Use the full unfiltered constellation export in alternate mode.
- Pass prepared top-level arrays without membership flattening.
- Exclude mapped observer-source stars from primary while retaining valid records in the reference layer.
- Toggle the reference layer without catalog preparation or renderer reinitialization.
- Find synthetic Sol by stable ID and announce its direction/distance.
- Keep prepared-primary constellation selection functional without Earth-local transforms.
- Fall back visibly to Sol for invalid observer state or fatal preparation failure.
- Surface genuine catalog omissions non-blockingly while treating source-star exclusion as expected behavior.
- Add `en`, `zh`, and `ja` localization parity.

## Existing contracts

### HPA-432 route state

```ts
parseObserverQuery(searchParams): ParsedObserverQuery;
resolveObserverState(parsed, candidates): ResolvedObserverState;
```

`ResolvedObserverState` preserves `empty`, `duplicate`, `unknown-system`, `invalid-coordinates`, and `origin-collision`. The wrapper keeps that result for tests and development diagnostics, but all fallback reasons share one concise user message.

`constellation.astro` already canonicalizes one `observer=sol` query to the localized query-free route.

### HPA-433 catalog preparation

```ts
prepareAlternateObserverCatalog(
    sourceConstellations,
    observerPosition,
    {
        includeReferenceCatalog: true,
        observerSourceStarIds,
    },
);
```

A successful result owns these authoritative pairs:

```text
primaryCatalog.stars + primaryCatalog.constellations
referenceCatalog.stars + referenceCatalog.constellations
```

Synthetic Sol exists only in the primary top-level star list under `SYNTHETIC_SOL_STAR_ID`. `observer-source-star-excluded` is expected behavior. `synthetic-sol-unavailable` is fatal and returns no partial catalogs.

`referenceCatalog` remains optional in the public type even when `includeReferenceCatalog: true`. HPA-435 therefore passes it through without a non-null assertion and exposes the reference checkbox only when the value is present.

### HPA-434 renderer

```ts
initializePreparedCatalogs(request, settings): Promise<void>;
setReferenceVisible(visible: boolean): void;
focusStarById(id: string, durationMs?: number): boolean;
getStarWorldPosition(id: string): { x: number; y: number; z: number } | null;
```

Prepared initialization is fixed-equatorial and receives no Earth location/date state. Reference styling and reduced-motion focus behavior are renderer-owned.

## Approaches considered

### A. Inline the mapping in `ConstellationWrapper.svelte`

This removes one file, but makes integrity tests import or expose component internals. The mapping is product data rather than component behavior.

### B. Export one mapping constant from a small module

The wrapper performs a direct `record[id] ?? []` lookup. One focused integrity test validates configured observer IDs, source IDs, and duplicate assignments.

### C. Add an observer coordinator service

A coordinator would wrap already-pure route and catalog APIs for one consumer and create another state/error model.

## Decision

Use approach B, without a lookup function or stable-empty-array helper.

```ts
export const OBSERVER_SOURCE_STAR_IDS: Readonly<
    Record<string, readonly string[]>
> = {
    "alpha-centauri": ["alpha_cen"],
};
```

The wrapper reads:

```ts
const observerSourceStarIds =
    OBSERVER_SOURCE_STAR_IDS[system.id] ?? [];
```

A dedicated module remains worthwhile because HPA-435 owns this mapping and requires integrity checks, but the module contains only the constant.

## File changes

### Create

- `src/lib/constellation/observerSourceStarIds.ts`
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts`
- `src/components/__tests__/ConstellationWrapper.observer.test.ts`

### Modify

- `src/components/ConstellationWrapper.svelte`
- `src/components/__tests__/ConstellationWrapper.test.ts` only if its renderer mock requires added methods
- `src/i18n/en.ts`
- `src/i18n/zh.ts`
- `src/i18n/ja.ts`
- `src/i18n/__tests__/observerUiI18nSync.test.ts`

### Unchanged unless an existing contract defect is found

- `src/pages/constellation.astro`
- `src/lib/constellation/observerRouteState.ts`
- `src/lib/constellation/observerCatalog.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/components/GalaxyWrapper.svelte`
- source datasets, global stores, and HPA-436 E2E suites

## Mapping integrity

One compact test iterates the configured record and verifies:

1. each observer ID exists in `localGalaxyData.starSystems`;
2. each configured observer is eligible through `isObserverCandidateEligible()`;
3. each mapped source ID exists in canonical membership of the full exported `constellations` array; and
4. no source ID is duplicated within one mapping or assigned to multiple observers.

Checks 1–2 protect the mapping against regenerated Galaxy-data drift. Check 3 protects the production-visible exclusion behavior. The cross-observer part of check 4 is dormant with one mapping, but remains in the same small loop because the issue requires duplicate assignment rejection when the mapping grows.

The Alpha Centauri wrapper test separately verifies that `['alpha_cen']` reaches `prepareAlternateObserverCatalog()`.

## Wrapper state

Keep observer state component-local:

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

The union is read-only from the HUD's perspective. Sol mode uses filtered source constellations; alternate mode uses prepared primary constellations.

## Route resolution and system lookup

Resolve before geolocation:

```ts
function resolveCurrentObserver(): ResolvedObserverState {
    return resolveObserverState(
        parseObserverQuery(new URL(window.location.href).searchParams),
        localGalaxyData.starSystems,
    );
}
```

Behavior:

- `sol`: initialize normal Sol mode;
- `fallback`: initialize Sol mode and show `constellation.observer.fallback`;
- `system`: re-look up the exact `StarSystemData` by `observerId` before calling `initializeAlternateMode()`.

Although `resolveObserverState()` already validated the ID, `Array.find()` is typed as possibly undefined. Do not use a non-null assertion. If the second lookup unexpectedly fails, log the invariant mismatch in development, show the generic fallback notice, and initialize Sol mode.

All HPA-432 fallback reasons use the same user copy. Typed provenance remains available for tests and development logging.

A fatal `synthetic-sol-unavailable` result uses the same visible fallback message, initializes Sol mode on the existing renderer instance, and never passes partial data to the renderer.

## Initialization

Keep one lifecycle/retry owner and extract only the mode-specific work:

```ts
function createRenderer(): ConstellationRenderer;
async function initializeSolMode(): Promise<void>;
async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol">;
```

### Sol mode

Preserve the existing flow:

1. request location with the current timeout;
2. use the current New York fallback;
3. build the current `SkyConfiguration`;
4. call `getVisibleConstellations(latitude, month)`;
5. assign filtered IDs and `renderedConstellations`;
6. preserve the existing translated membership flat-map; and
7. call `renderer.initialize(...)`.

The membership flat-map remains only in the legacy Earth path.

### Alternate mode

1. Do not request geolocation.
2. Do not call `getVisibleConstellations()`.
3. Pass a plain `{ x, y, z }` copy of `system.position`.
4. Call `prepareAlternateObserverCatalog()` with the exact exported `constellations` reference.
5. Set `includeReferenceCatalog: true`.
6. Pass `OBSERVER_SOURCE_STAR_IDS[system.id] ?? []`.
7. On success, retain the exact output and assign `primaryCatalog.constellations` to `renderedConstellations`.
8. Set `hasUnexpectedOmissions` when any omission reason is not `observer-source-star-excluded`.
9. Pass `referenceCatalog` through as optional and set `referenceVisible` to `false` when it is absent.
10. Pass the exact prepared catalog objects to the renderer:

```ts
await renderer.initializePreparedCatalogs(
    {
        primaryCatalog: result.value.primaryCatalog,
        referenceCatalog: result.value.referenceCatalog,
        referenceVisible:
            result.value.referenceCatalog !== undefined && referenceVisible,
    },
    {
        minimumMagnitude: 4,
        showConstellationLines: true,
        showStarNames: true,
    },
);
```

Do not clone, translate, merge, flatten, reconstruct, or non-null assert prepared catalogs.

## Interactions

### Reference visibility

`referenceVisible` defaults to `false` per mount. Render the native checkbox only when `alternateCatalog.referenceCatalog` exists. Its checked state reports reference visibility directly to assistive technology. Toggling it calls `renderer.setReferenceVisible(referenceVisible)` without changing the URL, persisting state, re-preparing catalogs, or reinitializing the renderer.

### Find Sol

Show the action only after successful alternate initialization:

```ts
renderer?.focusStarById(SYNTHETIC_SOL_STAR_ID);
```

Read the synthetic Sol record from `alternateCatalog.primaryCatalog.stars` and announce localized RA, declination, and distance. Format RA/declination to two decimals, include an explicit declination sign, and format distance with the active locale. If focus fails, announce the localized unavailable message.

Do not add a second reduced-motion branch; the renderer already owns that policy.

### Prepared constellation selection

Sol mode retains the current circular-mean RA/declination and `celestialToSphere()` path.

Alternate mode:

1. find the prepared primary constellation;
2. request each local star's primary world position;
3. discard unavailable positions;
4. average the remaining positions; and
5. reuse the existing target-lock projection and camera pitch/yaw calculation.

If no prepared primary position is available, keep selection details but do not move the camera. Never use source Earth coordinates as a fallback.

### Return to Earth/Sol

```ts
window.location.href = routes.constellation(currentLang);
```

Use the localized query-free route; do not emit `observer=sol`.

## HUD and accessibility

### Sol mode

Keep existing geolocation, UTC, compass, `View from Earth`, filtered constellation list, month strip, and Earth-oriented 2D fallback. A generic observer fallback notice may appear above the current content.

### Alternate mode

Show:

- localized observer system name;
- existing `distanceFromEarth` value labeled Distance from Sol;
- one localized **Frame: System barycenter** string;
- neutral azimuth/elevation view direction without cardinal wording;
- prepared primary constellation list and star counts;
- reference checkbox when a reference catalog exists;
- Find Sol and Return to Earth/Sol buttons;
- one required educational sentence explaining that lines are Earth cultural references and brightness is approximate; and
- one static nonblocking omission notice when genuine omissions exist.

Hide Earth geolocation, UTC/local-sky framing, cardinal compass wording, `View from Earth`, and best-viewing-month strip.

The visible observer readout and the labeled native checkbox form the required text summary: the observer is text, while checkbox semantics report whether the reference layer is shown. Do not add duplicate hidden summary or shown/hidden localization strings.

Keep only the polite atomic status region for transient Find Sol results.

The omission notice remains user-facing even though current production data does not trigger it, because HPA-435 explicitly requires coordinate-failure omissions to surface as nonblocking diagnostics.

### WebGL fallback

- Sol mode keeps the current 2D fallback.
- Alternate mode never draws that Earth-oriented fallback.
- Alternate WebGL failure shows localized WebGL-required copy and Return to Earth/Sol.

## Localization

Add these keys to `en`, `zh`, and `ja`:

```text
constellation.observer.label
constellation.observer.distanceFromSol
constellation.observer.frameSystemBarycenter
constellation.observer.viewDirection
constellation.observer.referenceToggle
constellation.observer.findSol
constellation.observer.findSolAnnouncement
constellation.observer.findSolUnavailable
constellation.observer.returnToSol
constellation.observer.education
constellation.observer.fallback
constellation.observer.omissions
constellation.observer.webglUnavailable
```

Extend the existing observer UI parity test. Preserve interpolation placeholders exactly across locales.

## Testing

Focused tests cover:

- configured mapping integrity;
- Sol mode retaining geolocation, filtering, and legacy initialization;
- alternate mode skipping Earth inputs and using the full exported catalog;
- Alpha Centauri passing `['alpha_cen']`;
- exact prepared catalog handoff without flattening;
- absent optional reference catalog hiding the checkbox without a non-null assertion;
- a defensive post-resolution lookup miss falling back to Sol;
- every typed fallback reason returning to Sol with one generic notice;
- fatal preparation returning to Sol without prepared initialization;
- intentional exclusions staying silent and genuine omissions showing one static notice;
- alternate WebGL failure not creating the Earth 2D canvas;
- prepared constellation focus using renderer world positions;
- reference toggle, Find Sol, announcement, reduced-motion delegation, and canonical return;
- alternate HUD replacing Earth-only content; and
- `en`/`zh`/`ja` key and placeholder parity.

Broad browser/system matrices remain in HPA-436.

## Acceptance criteria

- Legacy Earth/Sol behavior is unchanged.
- Alternate mode is independent of Earth location/month filtering.
- Alpha Centauri primary omits `alpha_cen`; the reference layer retains it when available.
- Prepared top-level arrays reach the renderer directly.
- Reference visibility updates without re-preparation or reinitialization.
- Find Sol works by pointer/keyboard and announces direction/distance.
- Invalid or fatal observer state visibly falls back to Sol.
- Intentional exclusions produce no warning; genuine omissions produce one nonblocking notice.
- Alternate mode does not use the Earth-oriented 2D fallback.
- Locale switching emits no raw keys.

## Extraction threshold

Concentrating this work in the existing wrapper is the right trade while there is one orchestration consumer and one alternate-mode behavior. Do not extract merely because the mapping gains another observer. Reconsider a pure coordinator only if the orchestration gains a second consumer or materially divergent observer modes create duplicated branching and test setup.

## Non-goals

No new astronomy or photometry formulas, observer service/store/framework, renderer API, route parameter, persisted preference, automatic Find Sol, alternate 2D renderer, shared HUD redesign, or HPA-436-scale E2E/performance work.