# HPA-435 Observer HUD, Find Sol, Fallbacks, and Localization Design

**Status:** Approved for implementation planning  
**Linear:** HPA-435 — Integrate observer HUD, Find Sol, fallbacks, and localization  
**Depends on:** HPA-432 observer query state; HPA-433 alternate-observer catalog preparation; HPA-434 prepared catalog renderer  
**Blocks:** HPA-436 cross-system E2E, accessibility, and performance hardening

## Summary

Integrate the completed HPA-432, HPA-433, and HPA-434 contracts into `ConstellationWrapper.svelte` with a deliberately thin product layer.

The wrapper resolves the current `observer` query once per mount and selects one path:

- **Sol mode:** preserve the existing geolocation, New York fallback, month/latitude filtering, Earth-horizontal renderer initialization, horizon/cardinal guides, compass, sidereal-time behavior, and current Earth-oriented 2D fallback.
- **Alternate-observer mode:** resolve one `localGalaxyData` system, prepare the exact full exported `constellations` array through `prepareAlternateObserverCatalog()`, and pass the authoritative primary/reference catalog pairs directly to `initializePreparedCatalogs()`.

Add one small pure module for explicit observer-system to source-star identity mapping. The initial production mapping is:

```text
alpha-centauri -> alpha_cen
```

Extend the existing constellation HUD with observer identity, distance from Sol, **System barycenter**, neutral view direction, Earth/Sol-reference visibility, Find Sol, Return to Earth/Sol, educational copy, nonblocking diagnostics, and screen-reader status.

Do not add a coordinator service, global store, observer framework, renderer API, URL preference, persistence mechanism, astronomy formula, photometry model, or alternate-observer 2D renderer.

## Goals

- Preserve query-free Earth/Sol behavior.
- Resolve observer state through HPA-432's parser/resolver and typed fallback provenance.
- Use the full unfiltered constellation export in alternate mode.
- Pass prepared top-level arrays directly to HPA-434 without membership flattening.
- Exclude mapped observer-source stars from primary while retaining valid records in the optional reference layer.
- Show a localized observer HUD and clear system-barycenter frame label.
- Toggle the reference layer without re-preparing catalogs or reinitializing the renderer.
- Find synthetic Sol by stable ID from pointer or keyboard.
- Announce Sol's fixed-equatorial direction and distance.
- Keep prepared-primary constellation selection functional without Earth-local transforms.
- Fall back visibly to Sol for route-resolution or fatal preparation failure.
- Keep genuine catalog omissions nonfatal and intentional source exclusions silent.
- Add complete `en`, `zh`, and `ja` parity for new copy.

## Non-goals

- New coordinate, sidereal-time, magnitude, proper-motion, epoch, horizon, atmosphere, season, axial-tilt, or photometry formulas.
- Changes to `observerRouteState.ts`, `observerCatalog.ts`, `ConstellationRenderer.ts`, or `ConstellationCatalogLayer.ts` unless implementation reveals an actual contract defect.
- Runtime identity inference by names, distance, coordinates, or proximity.
- A generic observer state service, context, store, or route framework.
- Persisting reference visibility in URL, local storage, or global settings.
- Automatic Find Sol on entry.
- Observer-correct apparent magnitude claims.
- A new observer HUD component solely for this ticket.
- Broad E2E/performance/browser hardening owned by HPA-436.

## Existing contracts

### Route state

HPA-432 provides:

```ts
parseObserverQuery(searchParams): ParsedObserverQuery;
resolveObserverState(parsed, candidates): ResolvedObserverState;
```

`ResolvedObserverState` preserves typed reasons for:

- `empty`;
- `duplicate`;
- `unknown-system`;
- `invalid-coordinates`; and
- `origin-collision`.

`constellation.astro` already redirects exactly one `observer=sol` to the matching query-free localized route. The client-only wrapper reads remaining query state from `window.location`.

### Prepared catalog

HPA-433 provides:

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

A successful output owns these matched pairs:

```text
primaryCatalog.stars + primaryCatalog.constellations
referenceCatalog.stars + referenceCatalog.constellations
```

Synthetic Sol exists only in the primary top-level stars with stable ID `SYNTHETIC_SOL_STAR_ID`. `observer-source-star-excluded` is expected domain behavior. Fatal `synthetic-sol-unavailable` returns no partial catalogs.

### Renderer

HPA-434 provides:

```ts
initializePreparedCatalogs(request, settings): Promise<void>;
setReferenceVisible(visible: boolean): void;
focusStarById(id: string, durationMs?: number): boolean;
getStarWorldPosition(id: string): { x: number; y: number; z: number } | null;
```

Prepared initialization is fixed-equatorial and accepts no Earth location/date/time state. Reference styling and reduced-motion camera behavior are already renderer-owned.

## Approaches considered

### A. Wrapper branch plus one mapping module

Resolve the route and orchestrate existing contracts in the current wrapper. Add one pure mapping file.

This follows current ownership, minimizes new files, and keeps product state next to the HUD that consumes it.

### B. New observer coordinator service

Return a wrapper-specific view model from a new orchestration module.

This creates another domain/error model around already-pure APIs and has one consumer. It is unnecessary now.

### C. Server-side preparation in Astro

Resolve and serialize prepared catalogs through `constellation.astro`.

This complicates the current `client:only` boundary and spreads one integration flow across server and client without a product benefit.

## Decision

Use approach A.

Expected production changes:

- one new mapping module;
- `ConstellationWrapper.svelte`;
- three locale dictionaries.

Focused mapping, wrapper, and localization tests accompany them.

## File structure

### Create

- `src/lib/constellation/observerSourceStarIds.ts`
- `src/lib/constellation/__tests__/observerSourceStarIds.test.ts`
- `src/components/__tests__/ConstellationWrapper.observer.test.ts`

### Modify

- `src/components/ConstellationWrapper.svelte`
- `src/components/__tests__/ConstellationWrapper.test.ts` only when its shared mock requires new HPA-434 methods
- `src/i18n/en.ts`
- `src/i18n/zh.ts`
- `src/i18n/ja.ts`
- `src/i18n/__tests__/observerUiI18nSync.test.ts`

### Explicitly unchanged

- `src/pages/constellation.astro`
- `src/lib/constellation/observerRouteState.ts`
- `src/lib/constellation/observerCatalog.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/components/GalaxyWrapper.svelte`
- Galaxy/constellation source data
- global stores
- HPA-436 E2E suites

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

- exact case-sensitive IDs only;
- zero, one, or multiple source IDs supported;
- one stable empty array for unmapped observers;
- no runtime data scans or inferred identities.

Tests assert:

1. every configured observer exists in `localGalaxyData.starSystems`;
2. every configured observer is eligible through `isObserverCandidateEligible()`;
3. every configured source ID exists in canonical membership of the full exported `constellations` array;
4. no duplicate source IDs exist within or across mappings; and
5. Alpha Centauri maps exactly to `['alpha_cen']`.

Tests validate configured mappings; they do not guess additional mappings.

## Wrapper state

Keep all observer state component-local:

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
let unexpectedOmissionCount = 0;
let solAnnouncement = "";
```

The union is intentional: Sol mode uses mutable source `Constellation` records while alternate mode uses readonly `PreparedConstellation` records. UI code only reads their common fields.

`renderedConstellations` is the direct list used for selection and HUD display:

- Sol mode: current filtered source constellations.
- Alternate mode: `primaryCatalog.constellations`.

Do not store prepared catalogs globally.

## Route resolution

Add:

```ts
function resolveCurrentObserver(): ResolvedObserverState {
    return resolveObserverState(
        parseObserverQuery(new URL(window.location.href).searchParams),
        localGalaxyData.starSystems,
    );
}
```

Resolve once at the start of initialization, before geolocation and before mode-specific WebGL fallback presentation.

Behavior:

- `sol`: normal Sol mode;
- `system`: exact matching Galaxy record;
- `fallback`: normal Sol mode plus grouped localized notice.

Notice grouping:

| Reasons | Copy |
| --- | --- |
| `empty`, `duplicate`, `unknown-system` | observer link unavailable |
| `invalid-coordinates`, `origin-collision` | observer position unavailable |

Do not expose raw reason codes or requested IDs in production UI.

## Initialization

Keep one lifecycle/retry owner and extract only:

```ts
function createRenderer(): ConstellationRenderer;
async function initializeSolMode(): Promise<void>;
async function initializeAlternateMode(
    system: StarSystemData,
): Promise<"ready" | "fallback-to-sol">;
```

### Sol mode

Preserve current behavior:

1. request location with current timeout;
2. use current New York fallback;
3. create current `SkyConfiguration`;
4. call `getVisibleConstellations(latitude, month)`;
5. assign filtered IDs and `renderedConstellations`;
6. preserve current translated legacy membership flat-map; and
7. call `renderer.initialize(...)`.

The membership flat-map remains allowed only inside this legacy Earth path.

### Alternate mode

1. Do not request location.
2. Do not call `getVisibleConstellations()`.
3. Do not create Earth placement state.
4. Pass a plain `{ x, y, z }` copy of `system.position`.
5. Call `prepareAlternateObserverCatalog()` with the exact exported `constellations` reference.
6. Set `includeReferenceCatalog: true`.
7. Pass `getObserverSourceStarIds(system.id)`.
8. On success, store the exact result and set `renderedConstellations = primaryCatalog.constellations`.
9. Call:

```ts
await renderer.initializePreparedCatalogs(
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
```

Do not clone, translate, merge, flatten, or reconstruct prepared catalogs before handoff.

### Fatal preparation fallback

On `synthetic-sol-unavailable`:

- clear alternate state;
- set the localized preparation fallback notice;
- initialize Sol mode on the same renderer instance; and
- never call `initializePreparedCatalogs()` with fabricated or partial data.

## Reference visibility

`referenceVisible` defaults to `false` each mount.

Use one reactive call:

```ts
$: if (renderer && alternateCatalog) {
    renderer.setReferenceVisible(referenceVisible);
}
```

The native checkbox changes visibility immediately. It does not re-prepare, reinitialize, persist, or change the URL.

## Find Sol

Show the action only after successful alternate initialization.

```ts
const focused = renderer?.focusStarById(SYNTHETIC_SOL_STAR_ID) ?? false;
```

Read the synthetic Sol record from `alternateCatalog.primaryCatalog.stars` and announce:

```text
Sol: right ascension {ra} h, declination {dec}, distance {distance} ly.
```

Formatting:

- RA: two decimals;
- declination: explicit sign and two decimals;
- distance: locale-aware, maximum two decimals.

Use a wrapper-owned polite atomic status region. On unexpected focus failure, announce localized unavailable copy. Do not add another reduced-motion check.

## Prepared constellation selection

Keep one selection handler.

Shared behavior:

- update selected state;
- call `renderer.setSelected(id)`;
- preserve details and target-lock state.

Sol mode retains current circular-mean RA/declination plus `celestialToSphere()`.

Alternate mode:

1. find the prepared primary constellation;
2. request each local star's primary world position through `getStarWorldPosition()`;
3. discard missing positions;
4. average remaining positions;
5. use the average for HUD projection and the existing pitch/yaw camera target; and
6. do not move the camera when no primary position is available.

Never fall back to source Earth coordinates.

## HUD behavior

### Sol mode

Keep:

- geolocation lock/coordinates;
- UTC;
- cardinal compass;
- `View from Earth`;
- filtered list;
- viewing-month strip.

Typed fallback notices may appear above the existing content.

### Alternate mode

Show:

- localized system name through `systems.${id}.name` with data fallback;
- current system scalar `distanceFromEarth`, labeled Distance from Sol, without recomputation;
- **System barycenter**;
- neutral View direction using azimuth/elevation without cardinal labels;
- prepared primary constellation list and star counts;
- reference checkbox;
- Find Sol;
- Return to Earth/Sol;
- Earth-cultural-reference explanation for constellation lines;
- approximate-brightness explanation; and
- hidden observer/reference summary.

Hide:

- geolocation;
- latitude/longitude;
- UTC/local-sky framing;
- Earth cardinal wording;
- `View from Earth`;
- viewing-month strip.

Iterate `renderedConstellations` directly so alternate UI uses prepared primary topology.

## Return to Earth/Sol

```ts
function returnToSol(): void {
    window.location.href = routes.constellation(currentLang);
}
```

Use the localized query-free route. Do not emit `observer=sol` or route through home.

## Diagnostics

Use one visible nonblocking `role="status"` region.

- Ignore `observer-source-star-excluded` for user notices.
- Count all other omissions and show one aggregate localized message.
- Do not list star IDs or raw transform errors.
- Group route/preparation fallback copy into link, position, or preparation messages.

Development logging may preserve structured details.

## WebGL and 2D fallback

- Sol mode keeps the existing Earth-oriented 2D fallback.
- Alternate mode never creates or draws that fallback.
- Alternate WebGL failure shows localized requirement copy plus Return to Earth/Sol.
- Do not build a prepared 2D projection.

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

Preserve placeholders exactly across locales. Extend `observerUiI18nSync.test.ts`; do not create another parity mechanism.

## Accessibility

- Native buttons for Find Sol and Return.
- Native checkbox for reference visibility.
- Existing HPA-434 keyboard canvas remains unchanged.
- Hidden summary reports observer and reference shown/hidden state.
- Find Sol uses a polite atomic status region.
- Fallback/omission copy uses nonblocking status semantics.
- Reference differentiation remains non-color-only through HPA-434.
- Find Sol inherits renderer reduced-motion behavior.
- No icon-only or color-only controls.

## Testing

### Mapping

Assert exact lookup, current candidate/source integrity, and duplicate rejection.

### Sol regression

Assert query-free mode:

- calls location;
- calls Earth visibility filtering;
- calls legacy `initialize()`;
- never prepares or initializes prepared catalogs.

### Alternate integration

Assert valid alternate mode:

- skips location/filtering;
- passes the exact full constellation export;
- passes `['alpha_cen']` for Alpha Centauri;
- forwards exact prepared primary/reference objects;
- preserves a synthetic Sol that exists only at top level;
- uses prepared world positions for selection; and
- skips Earth 2D drawing.

### Fallbacks and diagnostics

Assert grouped route fallback, fatal preparation fallback without partial handoff, silent expected exclusions, and one aggregate genuine-omission notice.

### Interactions/accessibility

Assert reference toggle does not reinitialize, Find Sol focuses stable ID and announces RA/declination/distance, canonical return has no query, controls are native/labeled, and summary reflects reference state.

### Localization

Assert every exact key exists and is nonempty in all locales and representative non-English renders contain no raw observer keys.

Do not duplicate HPA-433 math/topology tests or HPA-434 rendering/disposal/tween tests.

## Acceptance criteria

1. Query-free Sol behavior remains unchanged.
2. Alternate mode performs no Earth geolocation or visibility filtering.
3. Full exported constellations reach preparation unchanged.
4. Alpha Centauri receives `observerSourceStarIds: ['alpha_cen']`.
5. Prepared matched pairs reach the renderer without flattening.
6. Alternate selection uses prepared primary world positions.
7. Observer HUD and educational copy are localized.
8. Reference visibility updates without preparation/reinitialization.
9. Find Sol focuses `sol`, respects existing reduced motion, and announces direction/distance.
10. Return uses the localized query-free constellation route.
11. Invalid/fatal observer state visibly falls back to Sol.
12. Expected exclusions remain silent; genuine omissions are nonblocking.
13. Alternate mode never shows the Earth 2D grid.
14. All new keys exist in `en`, `zh`, and `ja`; no raw keys render.
15. No new observer framework, store, service, renderer API, persistence, astronomy formula, photometry model, or broad E2E suite is added.

## Size guardrail

One wrapper/HUD/mapping/i18n integration PR. Any proposed new service, store, URL parameter, renderer API, persistence mechanism, or alternate 2D renderer must be removed unless a concrete defect in an approved dependency contract makes it unavoidable.