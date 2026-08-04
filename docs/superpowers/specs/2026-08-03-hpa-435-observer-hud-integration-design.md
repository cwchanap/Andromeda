# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Design

**Status:** Approved for implementation planning  
**Linear:** HPA-435 — Integrate observer HUD, Find Sol, fallbacks, and localization  
**Depends on:** HPA-432 observer query state; HPA-433 alternate-observer catalog preparation; HPA-434 prepared catalog renderer  
**Blocks:** HPA-436 cross-system E2E, accessibility, and performance hardening

## Summary

Integrate the completed observer route, catalog-preparation, and renderer contracts into `ConstellationWrapper.svelte` without adding another architecture layer.

The wrapper resolves the current `observer` query once, then follows one of two paths:

- **Sol mode** preserves the existing geolocation, month/latitude filtering, Earth-horizontal renderer initialization, horizon, compass, sidereal-time behavior, and current 2D fallback.
- **Alternate-observer mode** resolves one `localGalaxyData` system, prepares the full unfiltered constellation catalog through `prepareAlternateObserverCatalog()`, and passes the authoritative prepared primary/reference pairs directly to `ConstellationRenderer.initializePreparedCatalogs()`.

A small pure mapping module owns the explicit relationship between Galaxy observer IDs and canonical constellation source-star IDs. The initial production mapping is `alpha-centauri -> alpha_cen`. The mapping is stable-ID based and is validated by tests against the current Galaxy candidates and full exported constellation catalog.

The existing constellation HUD gains a compact alternate-mode branch for observer identity, distance from Sol, the **System barycenter** frame, Earth/Sol-reference visibility, Find Sol, Return to Earth/Sol, nonblocking fallback notices, educational copy, and screen-reader status. Earth-surface-only readouts are hidden in alternate mode rather than reinterpreted.

No new store, coordinator service, observer framework, renderer API, astronomy formula, generalized diagnostics subsystem, or alternate 2D renderer is introduced.

## Goals

- Preserve legacy query-free Earth/Sol behavior visually and behaviorally.
- Resolve observer state through the HPA-432 parser/resolver contract.
- Use the full exported `constellations` array for every alternate-observer preparation.
- Pass HPA-433 authoritative prepared top-level stars and constellations directly to HPA-434.
- Explicitly exclude mapped observer-source stars from the primary layer while retaining valid records in the optional Sol-reference layer.
- Provide a localized observer HUD with a clear system-barycenter frame label.
- Let users toggle the Earth/Sol-reference layer without reconstructing catalogs or the renderer.
- Let pointer and keyboard users Find Sol through the stable synthetic ID.
- Announce synthetic Sol equatorial direction and distance through a polite status region.
- Preserve prepared-primary constellation selection and camera focus without applying Earth-local transforms.
- Fall back visibly to Sol for invalid route state or fatal synthetic-Sol preparation failure.
- Treat coordinate/data omissions as nonfatal and intentional observer-source exclusions as expected domain behavior.
- Add English, Traditional Chinese, and Japanese localization with parity coverage.
- Keep the implementation small enough for one integration PR.

## Non-goals

- New observer-coordinate, sidereal-time, magnitude, proper-motion, epoch, atmosphere, horizon, season, axial-tilt, or photometry formulas.
- Changes to `observerRouteState.ts`, `observerCatalog.ts`, `ConstellationRenderer.ts`, or `ConstellationCatalogLayer.ts` unless an actual contract defect is discovered during implementation.
- A generic observer store, observer context, coordinator service, route-state framework, or application-wide diagnostics framework.
- Runtime inference of Galaxy/source-star identity by name, distance, coordinates, or proximity thresholds.
- Persisting the Earth/Sol-reference toggle in the URL, local storage, or global settings.
- An alternate-observer 2D renderer or reusing the existing Earth-oriented 2D grid for alien skies.
- Automatic Find Sol on entry.
- Observer-correct apparent magnitude or claims that displayed brightness is physically correct from the selected system.
- Reworking the shared HUD shell or extracting a new observer-specific component solely for this ticket.
- Full cross-browser, cross-system, performance, or localized deployment E2E coverage; HPA-436 owns that matrix.

## Existing contracts and constraints

### HPA-432 route state

`parseObserverQuery()` distinguishes missing, explicit Sol, one candidate, empty input, and duplicate input. `resolveObserverState()` resolves candidates against `localGalaxyData.starSystems` and preserves typed fallback provenance for:

- `empty`;
- `duplicate`;
- `unknown-system`;
- `invalid-coordinates`; and
- `origin-collision`.

`constellation.astro` already canonicalizes exactly one `observer=sol` to the matching query-free localized route. The client-only Svelte wrapper therefore needs no new server contract and reads the remaining query state from `window.location` on mount.

### HPA-433 prepared catalogs

`prepareAlternateObserverCatalog()` accepts:

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

A successful result contains authoritative matched pairs:

```text
primaryCatalog.stars + primaryCatalog.constellations
referenceCatalog.stars + referenceCatalog.constellations
```

The wrapper must never rebuild either top-level star array from constellation membership. Synthetic Sol is present only in `primaryCatalog.stars` with stable ID `SYNTHETIC_SOL_STAR_ID` and marker kind `synthetic-sol`.

`omittedStars` contains expected `observer-source-star-excluded` diagnostics and genuine nonfatal coordinate/metadata omissions. A fatal `synthetic-sol-unavailable` result contains no partial prepared catalogs.

### HPA-434 renderer

`ConstellationRenderer` already exposes:

```ts
initializePreparedCatalogs(request, settings): Promise<void>;
setReferenceVisible(visible: boolean): void;
focusStarById(id: string, durationMs?: number): boolean;
getStarWorldPosition(id: string): { x: number; y: number; z: number } | null;
```

Prepared mode is structurally fixed-equatorial and accepts no Earth location/date/time state. Reference styling is already non-color-only and comparison-only. `focusStarById()` delegates to the existing camera tween and short-circuits motion through the renderer's reduced-motion policy.

### Current wrapper

`ConstellationWrapper.svelte` currently:

- requests geolocation before all renderer initialization;
- falls back to New York City when location is unavailable;
- builds a `SkyConfiguration` with current date/time;
- calls `getVisibleConstellations(latitude, month)`;
- flat-maps visible constellation membership into the legacy top-level star list;
- calls `renderer.initialize(...)`;
- calculates selected constellation camera targets through Earth `celestialToSphere()`;
- shows geolocation, UTC, compass, `View from Earth`, and best-viewing-month UI; and
- creates an Earth-oriented 2D fallback canvas when WebGL initialization fails.

HPA-435 branches those responsibilities by mode. It does not replace the Sol path with a generalized abstraction.

## Approaches considered

### A. Thin wrapper branch plus one mapping module

Resolve observer state in the existing wrapper and call focused local Sol/alternate initialization functions. Add one pure module for explicit observer/source-star mapping.

Advantages:

- follows the ownership boundaries established by HPA-432/433/434;
- minimizes new files and APIs;
- keeps product-facing state next to the HUD that consumes it;
- preserves the legacy path directly; and
- makes the integration behavior visible in focused wrapper tests.

Cost:

- adds mode-specific state and branches to an already large component.

### B. New observer experience coordinator

Create a pure module that resolves route state, locates Galaxy systems, prepares catalogs, classifies diagnostics, and returns a complete wrapper view model.

Advantages:

- isolates orchestration from Svelte;
- allows narrow pure unit tests.

Costs:

- has one consumer;
- mostly wraps functions that are already pure and tested;
- introduces another domain model and error vocabulary; and
- risks duplicating HPA-432/433 ownership.

### C. Resolve and prepare catalogs in Astro

Resolve the observer and prepare catalogs in `constellation.astro`, then serialize the result into the client-only Svelte component.

Advantages:

- route state is available directly on the server;
- client wrapper receives an explicit input.

Costs:

- complicates the existing `client:only` boundary;
- serializes catalog and Galaxy data across the server/client boundary;
- spreads one integration flow across Astro and Svelte; and
- provides little value because catalog preparation is deterministic and local.

## Decision

Use approach A.

HPA-435 adds exactly one production module, `observerSourceStarIds.ts`, and otherwise integrates through `ConstellationWrapper.svelte` and existing localization/test files. No coordinator service or observer store is created.

## File structure

### Create

- `src/lib/constellation/observerSourceStarIds.ts` — explicit stable-ID mapping and readonly lookup.
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts` — mapping integrity against production Galaxy and constellation exports.
- `src/components/__tests__/ConstellationWrapper.observer.test.ts` — observer-mode orchestration, HUD, interaction, fallback, and accessibility integration tests.

### Modify

- `src/components/ConstellationWrapper.svelte` — resolve mode, branch initialization, prepared selection, HUD controls/copy, diagnostics, and canonical return.
- `src/components/__tests__/ConstellationWrapper.test.ts` — update the renderer mock with HPA-434 APIs only where the shared mock requires them; keep legacy regression assertions here.
- `src/i18n/en.ts` — English observer HUD and fallback copy.
- `src/i18n/zh.ts` — Traditional Chinese observer HUD and fallback copy.
- `src/i18n/ja.ts` — Japanese observer HUD and fallback copy.
- `src/i18n/__tests__/observerUiI18nSync.test.ts` — parity coverage for all HPA-435 keys.

### Explicitly unchanged

- `src/pages/constellation.astro`
- `src/lib/constellation/observerRouteState.ts`
- `src/lib/constellation/observerCatalog.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/components/GalaxyWrapper.svelte`
- source Galaxy and constellation datasets
- global stores and shared HUD architecture
- E2E suites owned by HPA-436

## Observer/source-star mapping

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

Rules:

- IDs are exact and case-sensitive.
- No normalization, aliases, name matching, coordinate matching, or distance thresholds.
- Zero, one, or multiple source IDs are supported by the return type.
- Unknown/unmapped observers return one shared empty readonly array.
- Production mapping initially contains only `alpha-centauri -> alpha_cen`, because it is the current Galaxy candidate with a canonical source-star identity in the exported constellation catalog.
- Tests, not production runtime scans, enforce current mapping integrity.

Integrity tests build the canonical source-ID set from the full exported `constellations` array and assert:

1. every configured observer ID resolves to a current `localGalaxyData.starSystems` candidate;
2. every configured candidate is eligible through `isObserverCandidateEligible()`;
3. every configured source-star ID exists in canonical exported constellation membership;
4. no observer entry contains duplicate source IDs;
5. no source-star ID is assigned to more than one observer system; and
6. Alpha Centauri resolves exactly to `['alpha_cen']`.

The tests do not infer additional mappings. Semantic mapping completeness remains an explicit data-maintenance responsibility when either catalog changes.

## Wrapper state model

Keep observer state local to `ConstellationWrapper.svelte`.

Use the existing HPA-432 union as the route-resolution authority and add only presentation/runtime fields needed by the component:

```ts
let resolvedObserverState: ResolvedObserverState = {
    kind: "sol",
    observerId: "sol",
    source: "missing",
};

let observerSystem: StarSystemData | null = null;
let alternateCatalog: AlternateObserverCatalogOutput | null = null;
let referenceVisible = false;
let observerNoticeKey: string | null = null;
let unexpectedOmissionCount = 0;
let solAnnouncement = "";
let renderedConstellations: readonly Constellation[] = [];
```

`renderedConstellations` is the wrapper's UI/selection list:

- Sol mode receives the existing latitude/month-filtered constellations.
- Alternate mode receives `primaryCatalog.constellations` directly.

Do not store prepared catalogs in a global store. They are deterministic per route and belong to one mounted view.

## Route resolution

Add a synchronous wrapper helper called during `initConstellationView()` before geolocation:

```ts
function resolveCurrentObserver(): ResolvedObserverState {
    const parsed = parseObserverQuery(
        new URL(window.location.href).searchParams,
    );
    return resolveObserverState(parsed, localGalaxyData.starSystems);
}
```

Behavior:

- `missing` or defensive client-side `explicit-sol` uses normal Sol mode.
- `system` resolves the exact `localGalaxyData.starSystems` record by ID.
- HPA-432 `fallback` values use normal Sol mode and set localized nonblocking notice copy.
- The resolver is called once per mount. HPA-435 does not add reactive in-place URL mutation; navigation remains full-page.

Fallback copy groups route reasons without exposing internal codes:

| Resolver reason | User copy |
| --- | --- |
| `empty`, `duplicate`, `unknown-system` | Requested observer link is unavailable; showing the sky from Earth/Sol. |
| `invalid-coordinates`, `origin-collision` | Requested observer position is unavailable; showing the sky from Earth/Sol. |

The exact requested observer ID may be logged in development but is not interpolated into user-facing copy.

## Initialization architecture

Retain one top-level `initConstellationView()` for lifecycle/retry handling and extract only the two mode-specific operations needed to avoid interleaving Earth and alternate logic:

```ts
async function initializeSolMode(): Promise<void>;

async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol">;
```

Shared renderer construction remains in the wrapper and is performed once before either renderer initialization call. The current callbacks, accessibility text, labels, auto-rotate, reduced-motion state, and HUD RAF loop remain shared.

### Sol mode

`initializeSolMode()` preserves the current order and behavior:

1. request geolocation with the current three-second timeout;
2. use the current New York fallback when unavailable;
3. build the current `SkyConfiguration`;
4. call `getVisibleConstellations(location.latitude, month)`;
5. set `viewState.skyConfig`, location permission state, and visible IDs;
6. set `renderedConstellations` to the visible source constellations;
7. preserve the current translated legacy membership flattening; and
8. call `renderer.initialize(translatedStars, translatedConstellations, skyConfig)`.

The legacy membership flattening remains allowed only in this Earth path. HPA-435 does not refactor or deduplicate it because prepared mode has a separate authoritative top-level contract.

### Alternate-observer mode

`initializeAlternateMode(system)`:

1. does not call `getCurrentLocation()`;
2. does not call `getVisibleConstellations()`;
3. does not construct Earth location/date/time placement state;
4. converts `system.position` to a plain `{ x, y, z }` input;
5. calls `prepareAlternateObserverCatalog(constellations, observerPosition, options)` with the full exported array reference;
6. sets `includeReferenceCatalog: true`;
7. passes `getObserverSourceStarIds(system.id)` as `observerSourceStarIds`;
8. returns `fallback-to-sol` on `synthetic-sol-unavailable` without calling prepared renderer initialization;
9. stores successful prepared output and the selected system;
10. sets `renderedConstellations` to `primaryCatalog.constellations`;
11. counts only diagnostics whose reason is not `observer-source-star-excluded` for the user notice; and
12. calls `renderer.initializePreparedCatalogs()` with the exact prepared catalog objects.

Prepared renderer settings reuse current product defaults:

```ts
{
    minimumMagnitude: 4.0,
    showConstellationLines: true,
    showStarNames: true,
}
```

Pass:

```ts
await renderer.initializePreparedCatalogs(
    {
        primaryCatalog: prepared.primaryCatalog,
        referenceCatalog: prepared.referenceCatalog,
        referenceVisible,
    },
    preparedSettings,
);
```

Do not map, clone, translate, flatten, merge, or reconstruct prepared top-level star arrays before the handoff. Constellation/star label localization remains the wrapper/renderer boundary already used by the existing view; source fallback names remain acceptable where no localized key exists. This ticket does not mutate HPA-433 output to localize records.

### Fatal preparation fallback

If alternate preparation returns `synthetic-sol-unavailable`:

- clear alternate catalog/system state;
- set the localized alternate-view-unavailable notice;
- run `initializeSolMode()` on the same renderer instance; and
- never pass partial or fabricated prepared data to the renderer.

## Reference visibility

`referenceVisible` defaults to `false` for every mount.

The alternate-mode settings slot renders one native checkbox. A reactive statement forwards the state only when alternate mode is active:

```ts
$: if (renderer && alternateCatalog) {
    renderer.setReferenceVisible(referenceVisible);
}
```

The toggle:

- is keyboard reachable through the native input;
- updates the renderer immediately;
- does not re-run catalog preparation;
- does not reinitialize the renderer;
- does not enter the URL, local storage, or global settings; and
- may reset after a full-page locale switch.

The existing HPA-432 locale navigation continues to preserve the observer query. Reference-toggle persistence is intentionally out of scope.

## Find Sol

Show Find Sol only after successful alternate prepared initialization.

The action calls:

```ts
const focused = renderer?.focusStarById(SYNTHETIC_SOL_STAR_ID) ?? false;
```

On success, locate the synthetic Sol record in `alternateCatalog.primaryCatalog.stars` by the same stable ID and announce fixed-equatorial direction/distance:

```text
Sol: right ascension {ra} h, declination {dec}°, distance {distance} ly.
```

Formatting rules:

- right ascension: two fractional digits;
- declination: explicit `+` or `-`, two fractional digits;
- distance: localized number formatting with at most two fractional digits; and
- no claim of observer-correct brightness.

The announcement is written to a wrapper-owned `role="status"`, `aria-live="polite"`, `aria-atomic="true"` region. Pointer click and keyboard activation use the same native button handler.

If focus unexpectedly returns `false`, announce localized “Sol is unavailable in this view” copy. Successful HPA-433 preparation should make this defensive path unreachable in normal production data.

`focusStarById()` already short-circuits camera animation when reduced motion is active. HPA-435 does not duplicate or inspect motion preferences in the Find Sol handler.

## Prepared constellation selection

Keep one `handleSelectConstellation(id)` entry point and branch only the target calculation.

Shared behavior:

1. update selected state;
2. call `renderer.setSelected(id)`; and
3. preserve the existing detail/target-lock UI.

Sol mode retains the existing Earth `celestialToSphere()` center calculation.

Alternate mode:

1. find the selected constellation in `alternateCatalog.primaryCatalog.constellations`;
2. call `renderer.getStarWorldPosition(star.id)` for each prepared local star;
3. discard `null` positions;
4. calculate the arithmetic mean of the available world-space positions;
5. store the mean as `selectedCenter` for the HUD projection loop; and
6. reuse the existing pitch/yaw calculation and `renderer.tweenCameraTo()` call.

If no rendered primary star position is available, keep selection/details but clear `selectedCenter` and do not move the camera. Do not fall back to source Earth coordinates and do not invent bridge geometry.

The list/details UI iterates `renderedConstellations`, so alternate mode uses prepared star counts and role-specific topology while retaining preserved constellation metadata.

## HUD behavior

### Sol mode

Keep the current HUD:

- geolocation lock and coordinates;
- UTC readout;
- compass/cardinal orientation;
- `View from Earth` copy;
- visible filtered constellations; and
- best-viewing-month strip.

Fallback notices may appear above this content when invalid observer state or fatal preparation redirected the experience to Sol.

### Alternate mode

Replace Earth-only readouts with:

- localized observer system name using `systems.${system.id}.name` with the existing data-name fallback;
- distance from Sol using the existing system scalar `distanceFromEarth` without recomputation;
- frame value **System barycenter**;
- neutral **View direction** label for camera azimuth/elevation;
- the full prepared primary constellation list;
- Earth/Sol-reference visibility toggle;
- Find Sol button;
- Return to Earth/Sol button;
- educational copy that constellation lines are Earth cultural reference shapes; and
- educational copy that star brightness is approximate and not observer-correct.

Hide in alternate mode:

- geolocation lock;
- latitude/longitude;
- Earth UTC/local-sky framing;
- `View from Earth`;
- Earth horizon/compass wording; and
- best-viewing-month strip.

The renderer already omits Earth horizon/cardinal guides in fixed-equatorial mode. The wrapper copy must match that visual behavior.

## Canonical Return to Earth/Sol

The alternate HUD and alternate WebGL-unavailable state expose one action:

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

This produces the localized canonical query-free constellation route. Do not serialize `observer=sol`, preserve the invalid observer query, or route through the home page.

## Diagnostics and fallback presentation

Use one compact nonblocking notice region. It is visible text and `role="status"`, not an interrupting alert or modal.

### Expected exclusions

Diagnostics with:

```ts
reason.code === "observer-source-star-excluded"
```

are expected domain behavior and do not increment the notice count or produce corruption/error copy.

### Nonfatal omissions

All other HPA-433 omission records increment one aggregate count. Show one localized message such as:

```text
{count} catalog star(s) could not be displayed in this observer frame.
```

Do not list star IDs, coordinate errors, or raw diagnostic codes in production UI. Development logging may include the structured records.

### Route/preparation fallback

The view runs Sol mode and shows one of three localized messages:

- observer link unavailable;
- observer position unavailable; or
- alternate sky unavailable.

Fallback is visible but does not block constellation interaction.

## WebGL and 2D fallback

Sol mode preserves the existing 2D fallback behavior.

Alternate mode must not call `drawConstellationsOnCanvas()` or create the existing Earth-oriented 2D grid. When WebGL is unavailable or prepared renderer construction fails:

- show the current unsupported-view presentation adapted with localized alternate-mode copy;
- provide Return to Earth/Sol; and
- do not display an inaccurate pseudo-alien sky.

This ticket does not build a second projection or 2D prepared-catalog renderer.

## Localization contract

Add these exact keys to `en`, `zh`, and `ja`:

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

`constellation.observer.summary` reports both observer identity and reference visibility for assistive technology. `findSolAnnouncement`, `summary`, and `omissions` use the existing `{placeholder}` replacement convention.

Extend `observerUiI18nSync.test.ts` rather than creating another parity framework. Tests assert every key exists and is nonempty in every locale.

System names continue to use existing `systems.<id>.name` keys and hardcoded fallback names. HPA-435 does not duplicate 30 system names under the observer namespace.

## Accessibility

- Find Sol and Return to Earth/Sol are native buttons.
- Earth/Sol-reference visibility is a native checkbox with visible text.
- The prepared canvas remains keyboard navigable through HPA-434.
- The hidden observer summary reports selected observer and reference shown/hidden state.
- Find Sol updates a polite atomic status region with direction/distance.
- Fallback/omission notices use a nonblocking status region.
- Reference visual differentiation remains non-color-only through HPA-434 hollow points/dashed lines.
- Reduced motion remains renderer-owned; Find Sol reuses `focusStarById()`.
- No control is represented only by an icon or color.

## Testing strategy

### Mapping tests

Prove exact mapping lookup and production-data integrity without inference.

### Legacy wrapper regression

Keep focused assertions that query-free mode:

- calls `getCurrentLocation()`;
- calls `getVisibleConstellations()` with latitude/month;
- calls legacy `renderer.initialize()`;
- does not call `prepareAlternateObserverCatalog()`; and
- does not call `initializePreparedCatalogs()`.

### Alternate integration

Mock only external boundaries and assert:

- valid observer route resolves the matching Galaxy system;
- geolocation and `getVisibleConstellations()` are not called;
- `prepareAlternateObserverCatalog()` receives the exact full exported `constellations` reference;
- Alpha Centauri receives `observerSourceStarIds: ['alpha_cen']`;
- `initializePreparedCatalogs()` receives the exact prepared primary/reference objects;
- a synthetic Sol record that exists only in the prepared top-level star list survives the handoff;
- prepared constellation selection uses `getStarWorldPosition()` rather than `celestialToSphere()`;
- primary/reference topology may differ without wrapper reconstruction; and
- the Earth-oriented 2D draw path is skipped.

### Interactions and accessibility

Assert:

- the reference checkbox calls `setReferenceVisible()`;
- Find Sol calls `focusStarById(SYNTHETIC_SOL_STAR_ID)`;
- Find Sol updates the status region with RA/declination/distance;
- Return to Earth/Sol navigates to the localized query-free route;
- controls are native, labeled, and keyboard activatable; and
- the observer summary reflects reference shown/hidden state.

### Fallbacks and diagnostics

Assert:

- each HPA-432 fallback group initializes Sol mode and shows the correct copy;
- fatal `synthetic-sol-unavailable` initializes Sol mode and never passes prepared data;
- expected `observer-source-star-excluded` diagnostics produce no warning copy;
- genuine omissions produce one aggregate notice; and
- no raw translation key or diagnostic code appears.

### Localization

Extend the existing observer UI parity suite for all new keys and render representative English, Traditional Chinese, and Japanese observer states.

### Out-of-scope duplication

Do not re-test HPA-433 coordinate math, catalog line reconstruction, HPA-434 marker culling, reference styles, Three.js disposal, or camera tween internals in wrapper tests.

## Acceptance criteria

1. Query-free Sol mode retains the current geolocation, month/latitude filtering, Earth-horizontal renderer, horizon/compass, and current 2D fallback behavior.
2. Valid alternate mode performs no geolocation or Earth visibility filtering and prepares the exact full exported constellation array.
3. Alpha Centauri preparation receives `observerSourceStarIds: ['alpha_cen']`.
4. Prepared primary/reference top-level stars and constellations reach `initializePreparedCatalogs()` unchanged and without membership flattening.
5. Alpha Centauri primary output omits `alpha_cen`; the optional reference output may retain it with independent topology.
6. Alternate-mode constellation selection uses prepared primary world positions and never Earth `celestialToSphere()`.
7. Observer name, distance from Sol, **System barycenter**, neutral view direction, educational copy, and controls are localized.
8. Earth/Sol-reference visibility changes immediately without re-preparation or renderer reinitialization.
9. Find Sol works from pointer and keyboard, focuses stable ID `sol`, respects existing reduced motion, and announces RA/declination/distance.
10. Return to Earth/Sol navigates to the localized query-free constellation route.
11. Empty, duplicate, unknown, invalid-coordinate, origin-collision, and fatal preparation states visibly fall back to Sol.
12. Intentional observer-source exclusions produce no alarming user copy; genuine omissions remain nonblocking.
13. Alternate mode never presents the Earth-oriented 2D fallback as an alien sky.
14. English, Traditional Chinese, and Japanese contain all new keys and no raw keys appear in rendered observer UI.
15. No new observer framework, global state, persistence mechanism, astronomy formula, photometry model, renderer layer, or E2E matrix is introduced.

## Size guardrail

One wrapper/HUD/mapping/i18n integration PR.

Expected production changes are one new small mapping module plus `ConstellationWrapper.svelte` and locale dictionaries. Focused mapping and observer-wrapper tests are required. Any proposed new service, store, renderer API, URL parameter, persistence mechanism, or alternate 2D renderer must be removed unless implementation reveals a concrete blocker in an existing approved contract.