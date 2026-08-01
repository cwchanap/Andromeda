# HPA-433: Observer Catalog Preparation and Synthetic Sol Design

**Status:** Approved for written-spec review

**Issue:** HPA-433 — `[Sky] Prepare transformed constellation catalogs and synthetic Sol`

**Parent:** HPA-426 — `Epic: Sky From Another Star`

**Dependency:** HPA-431 — observer-relative coordinate transforms, completed in PR #34

**Downstream consumer:** HPA-434 — alternate-observer and Earth-reference renderer layers

## 1. Summary

Add a pure constellation-catalog preparation module that converts the existing Sol-centered star and constellation data into an arbitrary non-origin observer frame, preserves stable star and constellation identities, repairs index-based constellation lines when invalid stars are omitted, and creates a synthetic Sol marker through the Cartesian-origin path defined by HPA-431.

The module will:

- consume only plain catalog objects and a plain Cartesian observer position;
- transform each unique source star at most once through `transformToObserver()`;
- preserve source star IDs, constellation IDs, names, magnitude, spectral class, color, visibility metadata, and any future enumerable metadata;
- retain the current constellation-local star-array and index-pair line model;
- omit only invalid stars rather than failing the whole transformed catalog;
- return deterministic, JSON-safe omitted-star diagnostics;
- rebuild affected line indices and remove only segments whose endpoints are unavailable;
- create synthetic Sol by subtracting the observer from the Sol-centered Cartesian origin and then reverse-converting the resulting vector;
- keep synthetic Sol out of every constellation and append it only to the primary catalog's top-level star list;
- optionally return an Earth/Sol reference catalog using the same successful-star inclusion mask as the transformed catalog;
- return entirely fresh output objects without mutating or sharing mutable nested objects with the source catalog; and
- remain independent of Three.js, Svelte, Astro, routes, browser globals, localization, and renderer placement.

HPA-433 is a pure data-and-test change. HPA-434 owns fixed-equatorial placement, primary/reference scene layers, synthetic-Sol rendering style, visibility toggling, focus-by-ID, and resource disposal.

## 2. Context

The current constellation source model has two properties that shape this design:

1. `Constellation.stars` is a constellation-local ordered array.
2. `Constellation.lines` contains numeric index pairs into that local array.

The renderer currently receives a separate top-level star array and constellation array. It uses the top-level star ordering for point hover lookup and each constellation's local star ordering for line construction. Synthetic Sol cannot be inserted into a fake constellation without inventing cultural membership and corrupting line semantics, so the prepared result needs both:

- a top-level primary star collection containing transformed source stars plus synthetic Sol; and
- constellation-local star collections containing only transformed source stars.

HPA-431 provides the exact coordinate API and validation semantics:

- `transformToObserver()` for positive-distance catalog stars;
- `subtractObserverPosition()` for Cartesian translation;
- `cartesianToEquatorial()` for reverse conversion; and
- typed `CoordinateTransformError` failures rather than `NaN` propagation.

HPA-432 resolves URL observer state separately and guarantees that a selected Galaxy observer has finite, non-origin Cartesian coordinates before alternate-sky integration. HPA-433 must nevertheless remain deterministic for direct unit-test inputs and must not import route state or `localGalaxyData`.

## 3. Goals

- Produce an immutable, serializable observer-relative primary catalog.
- Preserve stable source star and constellation identities for hover, selection, labels, and focus lookup.
- Preserve source metadata while replacing only right ascension, declination, and distance on transformed stars.
- Transform each canonical source star once even when it belongs to multiple constellation arrays.
- Preserve constellation-local ordering for successful stars.
- Preserve line values exactly when no star in a constellation is omitted.
- Repair line indices deterministically when a star is omitted.
- Return one structured diagnostic per omitted canonical star.
- Create synthetic Sol through the HPA-431 Cartesian-origin primitive path.
- Make synthetic Sol distinguishable by stable ID and explicit marker metadata rather than by magnitude or color inference.
- Optionally create an Earth/Sol reference catalog that can be passed independently to a second renderer layer.
- Keep all work outside animation loops and below the current-catalog one-time transformation budget.

## 4. Non-goals

- Three.js geometry, materials, sprites, labels, scene groups, or disposal.
- Fixed-equatorial or Earth-horizontal renderer placement.
- Route parsing, observer resolution, URL serialization, or Galaxy CTA behavior.
- Svelte component integration, HUD controls, Find Sol interaction, localization, or accessibility UI.
- Earth geolocation, sidereal time, altitude, azimuth, horizon, atmosphere, or exoplanet-surface orientation.
- Proper motion, epoch conversion, precession, aberration, or relativistic effects.
- Distance-adjusted apparent magnitude or publication-grade photometry.
- A full star-catalog import.
- Replacing the existing `Star` or `Constellation` types.
- Converting constellation line storage from local array indices to star IDs.
- General source-catalog validation for duplicate IDs with conflicting metadata or malformed line definitions.
- Adding a zero-distance exception to `EquatorialPosition` or `transformToObserver()`.

## 5. Design decisions

### 5.1 Shape-preserving adapter

Use a shape-preserving prepared catalog rather than normalizing the renderer contract into `starsById` and ID-based line edges.

This keeps HPA-433 focused and allows HPA-434 to consume familiar star and constellation shapes while extending renderer APIs narrowly. A normalized graph model would be reasonable for a larger catalog rewrite, but it would force HPA-434 to own an adapter or broad renderer refactor and would exceed this issue's size guardrail.

### 5.2 Separate ordinary transformation from synthetic Sol

Sol identity and synthetic Sol are different operations:

- An observer at `{ x: 0, y: 0, z: 0 }` can identity-transform every positive-distance catalog star.
- Synthetic Sol from the same origin would produce the zero Cartesian vector, whose direction is undefined and intentionally rejected by HPA-431.

Therefore the module must not expose one unconditional operation that claims both behaviors succeed for a Sol-origin observer.

The design separates:

1. ordinary catalog transformation, which supports Sol identity;
2. synthetic-Sol construction, which succeeds only when Sol has a meaningful direction from the observer; and
3. alternate-observer composition, which requires synthetic Sol and is intended for non-origin observers.

Earth/Sol mode continues to use the original catalog and renderer path. It does not call the alternate-observer composition function.

### 5.3 Synthetic Sol is not a constellation member

Synthetic Sol is appended to the primary catalog's top-level `stars` array and is absent from every `Constellation.stars` array and every line pair.

No fake constellation, fake abbreviation, mythology, visibility range, or line segment is created.

### 5.4 Reference and primary use one inclusion mask

When a transformed source star fails, it is omitted from both:

- the transformed primary catalog; and
- the optional Earth/Sol reference catalog.

Both catalogs use the same repaired constellation topology. This prevents the reference layer from containing a star or segment that has no corresponding primary-layer object and keeps comparison behavior deterministic.

### 5.5 IDs are canonical identity

A source star ID is the canonical identity across constellation memberships. The first occurrence in deterministic source traversal establishes top-level ordering and the canonical source record used for transformation.

The current catalog constructs constellation membership from one shared source-star collection, so repeated membership is expected to describe the same star. Conflicting records under one ID remain a source-catalog validation concern outside HPA-433.

## 6. Module location and dependencies

Add:

```text
src/lib/constellation/observerCatalog.ts
```

The module may import only:

- `Star` and `Constellation` types from `src/types/constellation.ts`; and
- HPA-431 types and functions from `src/lib/astronomy/observerTransform.ts`.

It must not import:

- `three` or `THREE.Vector3`;
- Svelte or Astro APIs;
- DOM or browser globals;
- `ConstellationRenderer`;
- `ConstellationWrapper.svelte`;
- `observerRouteState.ts`;
- `localGalaxyData` or Galaxy renderer modules;
- `src/utils/astronomy.ts`; or
- localization modules.

The observer argument is structurally compatible with Galaxy `position.x/y/z`, but the catalog module depends only on `CartesianLightYears`.

## 7. Public constants and data types

### 7.1 Synthetic Sol constants

```ts
export const SYNTHETIC_SOL_STAR_ID = "sol" as const;
export const SYNTHETIC_SOL_RENDER_MAGNITUDE = 0;
export const SYNTHETIC_SOL_COLOR = "#FFF4E8";
```

The finite magnitude exists only to remain compatible with current magnitude filtering and serialization. HPA-434 must use marker metadata as the authoritative synthetic-Sol rendering signal and must not present the fallback magnitude as observer-correct photometry.

### 7.2 Prepared stars

```ts
export interface SyntheticSolMarker {
    readonly kind: "synthetic-sol";
}

export type PreparedSourceStar = Readonly<Star> & {
    readonly marker?: undefined;
};

export type SyntheticSolStar = Readonly<Star> & {
    readonly id: typeof SYNTHETIC_SOL_STAR_ID;
    readonly marker: SyntheticSolMarker;
};

export type PreparedCatalogStar = PreparedSourceStar | SyntheticSolStar;
```

Source stars do not receive alternate-observer marker metadata. Their identity continues to be their original stable ID.

The synthetic record uses:

- `id: "sol"`;
- `name: "Sol"` as an untranslated fallback;
- `spectralClass: "G2V"`;
- `color: SYNTHETIC_SOL_COLOR`;
- `magnitude: SYNTHETIC_SOL_RENDER_MAGNITUDE`;
- observer-relative right ascension, declination, and distance; and
- `marker: { kind: "synthetic-sol" }`.

HPA-435 may localize the display name by stable ID without changing this pure catalog output.

### 7.3 Prepared constellations

```ts
export type PreparedConstellation = Readonly<
    Omit<Constellation, "stars" | "lines" | "visibility">
> & {
    readonly stars: readonly PreparedSourceStar[];
    readonly lines: readonly (readonly [number, number])[];
    readonly visibility: Readonly<
        Omit<Constellation["visibility"], "bestMonths">
    > & {
        readonly bestMonths: readonly number[];
    };
};
```

Every prepared constellation is a fresh object with:

- the same ID, name, abbreviation, description, mythology, and visibility values;
- a fresh local star array;
- fresh line-pair arrays; and
- a fresh visibility object and `bestMonths` array.

Constellations are retained even when every star is omitted. Such a constellation has empty `stars` and `lines`, preserving stable constellation identity without inventing data.

### 7.4 Prepared catalog

```ts
export interface PreparedConstellationCatalog {
    readonly stars: readonly PreparedCatalogStar[];
    readonly constellations: readonly PreparedConstellation[];
}
```

For a primary catalog, `stars` contains all successful transformed source stars in canonical order followed by synthetic Sol.

For a reference catalog, `stars` contains only successful cloned source stars in the same canonical source order and never contains synthetic Sol.

### 7.5 Omitted-star diagnostics

```ts
export interface OmittedStarMembership {
    readonly constellationId: string;
    readonly originalStarIndex: number;
}

export interface OmittedStarDiagnostic {
    readonly starId: string;
    readonly starName: string;
    readonly memberships: readonly OmittedStarMembership[];
    readonly error: CoordinateTransformError;
}
```

Diagnostics intentionally exclude the full source star object. HPA-431's error union identifies non-finite components without echoing `NaN` or infinity, keeping the full result JSON-safe.

There is exactly one diagnostic per canonical star ID, even when that star appears in multiple constellation arrays. Memberships are ordered by constellation traversal and local star index.

### 7.6 Result types

```ts
export interface CatalogTransformOutput {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly omittedStars: readonly OmittedStarDiagnostic[];
}

export type AlternateObserverCatalogPreparationResult =
    | {
          readonly ok: true;
          readonly value: CatalogTransformOutput;
      }
    | {
          readonly ok: false;
          readonly error: {
              readonly code: "synthetic-sol-unavailable";
              readonly cause: CoordinateTransformError;
          };
      };
```

Ordinary source-star failures are represented only in `omittedStars` and do not fail the whole catalog.

Alternate-observer composition has one fatal domain failure: synthetic Sol cannot be constructed. This normally indicates an invalid, overflowing, or origin-colliding observer. The wrapper preserves the exact HPA-431 error as `cause` for deterministic downstream fallback handling.

## 8. Public operations

### 8.1 Transform ordinary catalog stars

```ts
export function transformCatalogToObserver(
    constellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options?: {
        readonly includeReferenceCatalog?: boolean;
    },
): CatalogTransformOutput;
```

This operation:

- supports `{ x: 0, y: 0, z: 0 }` for Sol identity tests;
- does not create synthetic Sol;
- transforms every canonical source star with `transformToObserver()`;
- clones successful source stars with transformed coordinates;
- records failures as omitted-star diagnostics;
- rebuilds every constellation and its line indices;
- builds the top-level primary source-star list; and
- optionally builds a matching Earth/Sol reference catalog.

`includeReferenceCatalog` defaults to `false` to avoid unnecessary allocation for callers that do not need comparison data.

This function has no catalog-wide failure branch. HPA-432 is responsible for selecting an eligible observer before integration. Direct callers that provide an invalid observer receive deterministic per-star diagnostics from HPA-431. Product-facing alternate-observer integration must call `prepareAlternateObserverCatalog()` instead, which validates the synthetic-Sol path first and returns a useful fatal failure.

### 8.2 Create synthetic Sol

```ts
export function createSyntheticSol(
    observerPosition: CartesianLightYears,
): TransformResult<SyntheticSolStar>;
```

The implementation must use this exact sequence:

```ts
const relativeSol = subtractObserverPosition(
    { x: 0, y: 0, z: 0 },
    observerPosition,
);

if (!relativeSol.ok) return relativeSol;

const solEquatorial = cartesianToEquatorial(relativeSol.value);
if (!solEquatorial.ok) return solEquatorial;
```

The successful equatorial output is mapped into the synthetic star record.

The function must not:

- construct a zero-distance `EquatorialPosition`;
- call `transformToObserver()` for Sol;
- add a special zero-distance exception to HPA-431;
- normalize a failed zero vector into an arbitrary RA/declination; or
- infer Sol rendering behavior from source-star magnitude logic.

For a non-origin observer, the relative Cartesian vector is conceptually `-observerPosition`, and the returned distance equals the observer's distance from Sol within HPA-431 tolerances.

For a Sol-origin observer, `cartesianToEquatorial()` returns `undefined-direction`; that is correct. Earth/Sol mode does not need a marker pointing from Sol to itself.

### 8.3 Prepare the alternate-observer product catalog

```ts
export function prepareAlternateObserverCatalog(
    constellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options?: {
        readonly includeReferenceCatalog?: boolean;
    },
): AlternateObserverCatalogPreparationResult;
```

This operation is intended only for non-origin alternate observers.

Required order:

1. Call `createSyntheticSol(observerPosition)`.
2. If it fails, return `synthetic-sol-unavailable` without transforming the catalog.
3. Call `transformCatalogToObserver()` with the requested reference option.
4. Append the synthetic Sol record to a new copy of the primary top-level star array.
5. Return the primary catalog, optional reference catalog, and omitted-star diagnostics.

Synthetic Sol is appended last so the canonical ordering of successful source stars remains stable and comparison catalogs retain matching source-star ordering.

Computing synthetic Sol first prevents an invalid observer from producing a misleading list of repeated per-star omissions when the product-level observer itself cannot support alternate-sky mode.

## 9. Canonical source traversal

The implementation performs one deterministic source-indexing pass.

Traversal order is:

1. input constellation array order;
2. each constellation's local `stars` array order.

For every encountered star:

- record membership `{ constellationId, originalStarIndex }`;
- if the ID has not been seen, register this star as the canonical source record and append its ID to canonical order;
- if the ID has already been seen, append membership only.

After indexing, transform canonical stars in canonical order.

The output top-level source-star ordering is therefore independent of `Map` implementation details and stable across runs:

- successful source stars in first-appearance order;
- synthetic Sol last in alternate-observer output.

The module must not sort IDs alphabetically or reorder constellations, local stars, memberships, line segments, or diagnostics.

## 10. Source-star mapping

For each canonical source star, call:

```ts
transformToObserver(
    {
        rightAscensionHours: source.rightAscension,
        declinationDegrees: source.declination,
        distanceLightYears: source.distance,
    },
    observerPosition,
);
```

On success, create a fresh transformed source star using spread-first copying:

```ts
{
    ...source,
    rightAscension: result.value.equatorial.rightAscensionHours,
    declination: result.value.equatorial.declinationDegrees,
    distance: result.value.equatorial.distanceLightYears,
}
```

Only the three coordinate fields change.

The following remain unchanged:

- `id`;
- `name`;
- `magnitude`;
- `spectralClass`;
- `color`; and
- any future enumerable source metadata.

Magnitude remains the existing Sol-observer apparent magnitude for MVP. HPA-433 and its consumers must not claim it is observer-correct brightness.

On failure, no prepared source star is created. Record one `OmittedStarDiagnostic` containing the canonical ID, name, all memberships, and the exact HPA-431 error.

## 11. Constellation reconstruction and line remapping

Each input constellation is rebuilt independently from its original local star array.

### 11.1 Star-array reconstruction

For each original local star index:

- look up the canonical transform result by star ID;
- when successful, append the canonical prepared star to the new local array and record `oldIndex -> newIndex`;
- when omitted, do not append and do not create a mapping.

Successful local stars retain their relative order.

A canonical prepared star object may be reused across multiple output constellation arrays and the top-level source-star array because it is treated as immutable. This reuse preserves identity consistency without sharing mutable container arrays.

Reference constellations use a separately cloned canonical reference star object with original coordinates. Primary and reference star objects must not be the same object.

### 11.2 Line reconstruction

For each original line pair `[oldStart, oldEnd]` in source order:

1. look up both new indices;
2. when both exist, append a fresh pair `[newStart, newEnd]`;
3. when either endpoint was omitted, omit the entire segment.

No new segment is created to bridge across an omitted star.

Examples:

```text
Original stars: A, B, C, D
Original lines: [0,1], [1,2], [2,3], [0,3]
B omitted
Prepared stars: A, C, D
Prepared lines: [1,2], [0,2]
```

The first two original segments are removed because they touch B. `[2,3]` becomes `[1,2]`; `[0,3]` becomes `[0,2]`.

When no star is omitted from a constellation, every line pair must remain value-identical and in the same order, although the pair arrays themselves are fresh objects.

Malformed or out-of-range source line definitions are outside this issue's validation scope. Current source data is treated as satisfying the `Constellation.lines` invariant.

## 12. Reference catalog preparation

When requested, the reference catalog is built during the same reconstruction pass.

It contains:

- fresh clones of only those source stars whose primary transform succeeded;
- original right ascension, declination, distance, magnitude, and metadata;
- the same top-level successful-source-star order as the primary catalog before Sol is appended;
- the same constellation order;
- the same successful local-star inclusion mask;
- the same repaired line index pairs; and
- no synthetic Sol.

The reference catalog is a complete independent renderer input. Consumers do not need to inspect the primary catalog to interpret its star and constellation arrays.

Primary and reference catalogs may share immutable scalar and string values, but must not share mutable arrays, line-pair arrays, constellation objects, visibility objects, or star objects.

## 13. Error semantics

### 13.1 Nonfatal source-star failures

The following HPA-431 failures omit only the affected canonical source star:

- `non-finite-equatorial-input`;
- `declination-out-of-range`;
- `invalid-distance`;
- `non-finite-cartesian-input` arising during target conversion or subtraction;
- `undefined-direction`, including a catalog star whose Sol-centered position exactly collides with the observer; and
- `cartesian-distance-overflow`.

The rest of the catalog remains available.

### 13.2 Fatal synthetic-Sol failure

`prepareAlternateObserverCatalog()` fails before catalog transformation when `createSyntheticSol()` fails.

Expected causes include:

- non-finite observer coordinates;
- subtraction overflow;
- reverse-distance overflow; and
- `undefined-direction` for an origin-colliding observer.

HPA-433 does not decide the UI fallback. HPA-435 may map this failure to Sol mode with a localized notice.

### 13.3 Programming errors

Unexpected programming defects are not converted into domain diagnostics. The module does not catch arbitrary exceptions around ordinary object/array operations.

## 14. Immutability and serializability

The implementation must not mutate:

- the input constellation array;
- any input constellation;
- any input local star array;
- any source star;
- any source line array or pair;
- visibility metadata or `bestMonths`; or
- the observer object.

All output containers are fresh.

Runtime deep freezing is not required. The public API uses readonly output types, and tests verify operation on deeply frozen inputs.

Every success and failure result must be safe for `JSON.stringify()` and deterministic deep equality. Output must not contain:

- `NaN` or infinity;
- `Date`, `Map`, `Set`, class instances, or functions;
- `THREE.Vector3`; or
- cyclic object references.

The module must preserve HPA-431's positive-zero normalization in transformed coordinates and must not reintroduce signed-zero special handling.

## 15. Performance model

Catalog preparation runs once per observer selection change, not per animation frame.

Let:

- `U` be unique source stars;
- `M` be total constellation memberships; and
- `L` be total line segments.

Time complexity is `O(U + M + L)`. Space complexity is `O(U + M + L)` for the prepared primary catalog, with another proportional allocation only when the reference catalog is requested.

The implementation should use local `Map` structures for indexing and lookup, but no `Map` may escape in public output.

For the current small catalog, focused tests or a lightweight deterministic fixture should demonstrate that there is no repeated transformation per membership. A timing assertion is not required because wall-clock thresholds are flaky in CI; the architectural one-transform-per-canonical-ID invariant is the enforceable performance contract.

## 16. Test plan

Add:

```text
src/lib/constellation/__tests__/observerCatalog.fixtures.ts
src/lib/constellation/__tests__/observerCatalog.test.ts
```

Tests must be pure Vitest unit tests with no DOM or Three.js setup.

### 16.1 Sol identity

- Transform representative ordinary stars with observer `{ x: 0, y: 0, z: 0 }`.
- Assert RA, declination, and distance reproduce source values within the HPA-431 tolerances.
- Assert names, IDs, magnitude, spectral class, color, and extra fixture metadata remain unchanged.
- Assert no synthetic Sol is created by `transformCatalogToObserver()`.

### 16.2 Nearby observer

- Reuse or mirror the HPA-431 Alpha-Centauri-like observer fixture.
- Assert representative transformed directions and distances.
- Assert output RA is normalized to `[0h, 24h)`.

### 16.3 Synthetic Sol primitive path

- Assert `createSyntheticSol()` produces the direction and distance expected from the HPA-431 fixture observer.
- Assert the relative direction corresponds to `-observerPosition` through the public primitive results.
- Assert ID, fallback name, spectral class, finite magnitude, color, and marker metadata.
- Assert a Sol-origin observer returns `undefined-direction`.
- Assert zero-distance equatorial Sol is never introduced into the test or public contract.

### 16.4 Stable identity and ordering

- Assert source star IDs and constellation IDs are unchanged.
- Assert canonical top-level order follows first source appearance.
- Assert duplicate membership produces one top-level source star and multiple local memberships.
- Assert synthetic Sol is appended last.
- Assert input constellation order and successful local-star order remain unchanged.

### 16.5 Line preservation and repair

- Assert a no-omission fixture preserves line pair values and order exactly.
- Omit the middle star of a four-star fixture.
- Assert touching segments are removed.
- Assert unrelated surviving segments are correctly remapped.
- Assert no bridge segment is invented.
- Assert the same repaired topology is used by the optional reference catalog.

### 16.6 Invalid-star omission

Cover at least:

- zero distance;
- negative distance;
- non-finite RA;
- out-of-range declination;
- a source star exactly colliding with the observer; and
- a transform whose derived Cartesian distance overflows.

For each, assert:

- the catalog operation succeeds overall;
- only the canonical bad star is omitted;
- one diagnostic is returned;
- all memberships are present in deterministic order;
- the HPA-431 error is preserved; and
- unrelated constellations and stars survive.

### 16.7 Product-level fatal observer failure

- Assert `prepareAlternateObserverCatalog()` fails before catalog transformation for origin collision.
- Assert non-finite and overflow fixture observers return `synthetic-sol-unavailable` with the exact HPA-431 cause.
- Use a transformation spy or fixture contract to prove ordinary stars are not transformed after synthetic-Sol preflight fails, without changing the production API for dependency injection.

### 16.8 Reference independence

- Assert reference stars retain original source coordinates.
- Assert reference and primary stars are different objects.
- Assert reference and primary constellations, arrays, visibility objects, and line pairs are different objects.
- Assert the reference top-level list omits synthetic Sol.
- Assert both catalogs use the same successful-source inclusion mask.

### 16.9 Immutability, determinism, and serialization

- Deep-freeze the full fixture catalog and observer.
- Assert every public operation succeeds or returns its typed failure without throwing due to mutation.
- Assert inputs are deeply unchanged.
- Call preparation twice and assert deep equality.
- Assert `JSON.stringify()` succeeds and contains no `null` introduced from non-finite numeric output.

## 17. Acceptance-criteria mapping

| HPA-433 acceptance criterion | Design mechanism |
| --- | --- |
| Output is deterministic and serializable | Ordered traversal, plain readonly objects/arrays, JSON-safe HPA-431 errors |
| Input catalog objects are not mutated | Fresh container reconstruction, spread-first star copies, deep-freeze tests |
| Star/constellation identity remains stable | IDs preserved; canonical star map keyed by source ID; constellations retained |
| Synthetic Sol is correct for fixture observers | Cartesian origin subtraction followed by `cartesianToEquatorial()` |
| No zero-distance equatorial exception | Sol never enters `transformToObserver()`; origin observer correctly fails marker creation |
| Invalid stars do not fail the entire catalog | One omitted-star diagnostic per canonical failed star |
| Earth-reference preparation is independently consumable | Complete optional reference catalog with its own top-level stars and constellations |
| Preserved line indices/IDs | Value-identical no-omission lines; old-to-new remapping after omission |
| Original catalog remains immutable | Readonly inputs, no source mutation, no shared mutable nested output |
| Pure catalog/data PR | No renderer, route, Svelte, localization, or browser imports |

## 18. Risks and mitigations

### Risk: line topology silently changes after omission

**Mitigation:** use an explicit old-index-to-new-index map, remove only segments with missing endpoints, preserve segment order, and test a middle-star omission where naïve filtering would connect incorrect stars.

### Risk: synthetic Sol is accidentally represented as zero-distance equatorial data

**Mitigation:** expose a dedicated `createSyntheticSol()` primitive-path function, test the origin failure, and forbid `transformToObserver()` for Sol in the written contract.

### Risk: Sol identity and synthetic Sol requirements are conflated

**Mitigation:** ordinary catalog transformation supports Sol identity; alternate-observer composition requires a meaningful synthetic-Sol direction and is not used for Earth/Sol mode.

### Risk: duplicate constellation membership causes repeated transforms or duplicate top-level points

**Mitigation:** canonicalize by stable star ID, transform once, record all memberships, and order top-level stars by first appearance.

### Risk: reference and primary layers compare different star sets

**Mitigation:** build both from one successful-star inclusion mask and one repaired topology pass.

### Risk: marker appearance is inferred from arbitrary photometric data

**Mitigation:** make `marker.kind === "synthetic-sol"` authoritative and document the finite magnitude as renderer compatibility only.

### Risk: readonly output is cast away and mutated by a consumer

**Mitigation:** create no shared mutable source containers, keep HPA-434 renderer APIs readonly, and test primary/reference object independence. Runtime deep freeze is unnecessary for the current performance-sensitive path.

### Risk: source records with one ID disagree across constellations

**Mitigation:** treat consistent ID definitions as an existing source-catalog invariant. A future catalog-validation issue may detect conflicts; HPA-433 does not broaden its diagnostic model beyond coordinate/transform failures.

## 19. Implementation boundary

The HPA-433 implementation PR should normally change only:

```text
src/lib/constellation/observerCatalog.ts
src/lib/constellation/__tests__/observerCatalog.fixtures.ts
src/lib/constellation/__tests__/observerCatalog.test.ts
docs/superpowers/specs/2026-08-01-hpa-433-observer-catalog-and-synthetic-sol-design.md
docs/superpowers/plans/2026-08-01-hpa-433-observer-catalog-and-synthetic-sol.md
```

It must not modify:

- `ConstellationRenderer.ts`;
- `ConstellationWrapper.svelte`;
- `observerRouteState.ts`;
- `src/utils/astronomy.ts`;
- `src/data/constellations.ts`;
- global `Star` or `Constellation` interfaces;
- Galaxy data or route helpers; or
- localization files.

A narrow import-only test adjustment to reuse HPA-431 immutable fixtures is acceptable if it does not alter their coordinate contract.

## 20. Delivery sequence

After this design is reviewed:

1. write a task-by-task TDD implementation plan;
2. implement public prepared-catalog types and deterministic fixtures;
3. implement canonical source indexing and ordinary transformation;
4. implement omission diagnostics and line remapping;
5. implement synthetic Sol through Cartesian primitives;
6. implement alternate-observer composition and optional reference output;
7. finish immutability, determinism, serialization, and fatal-preflight tests; and
8. verify unit tests, type checking, lint, build, and diff scope.

HPA-434 begins only after this catalog contract is merged or otherwise treated as stable.