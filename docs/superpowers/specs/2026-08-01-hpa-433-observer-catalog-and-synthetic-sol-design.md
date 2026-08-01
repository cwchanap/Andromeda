# HPA-433: Observer Catalog Preparation and Synthetic Sol Design

**Status:** Ready for approval, revised after two design-review passes

**Issue:** HPA-433 — `[Sky] Prepare transformed constellation catalogs and synthetic Sol`

**Parent:** HPA-426 — `Epic: Sky From Another Star`

**Dependency:** HPA-431 — observer-relative coordinate transforms, completed in PR #34

**Downstream consumer:** HPA-434 — alternate-observer and Earth-reference renderer layers

## 1. Summary

Add a pure constellation-catalog preparation module that converts the existing Sol-centered star and constellation data into an arbitrary observer frame, preserves stable star and constellation identities, repairs index-based constellation lines when invalid stars are omitted, and creates a synthetic Sol marker through the Cartesian-origin path defined by HPA-431.

The module will:

- consume only plain catalog objects and a plain Cartesian observer position;
- transform each unique source star at most once through `transformToObserver()`;
- preserve source-star IDs, names, magnitude, spectral class, color, and current enumerable star metadata;
- preserve constellation IDs, names, descriptions, mythology, visibility metadata, and future enumerable constellation metadata;
- retain the current constellation-local star-array and index-pair line model;
- omit only invalid stars rather than failing the whole ordinary-star transformation;
- return deterministic, JSON-safe omitted-star diagnostics;
- rebuild affected line indices and remove only segments whose endpoints are unavailable;
- defensively ignore malformed source line entries rather than misreading them as valid pairs;
- create synthetic Sol by subtracting the observer from the Sol-centered Cartesian origin and then reverse-converting the resulting vector;
- reserve `SYNTHETIC_SOL_STAR_ID` for the synthetic record and require source catalogs not to use it;
- keep synthetic Sol out of every constellation and append it only to the alternate-observer primary catalog's top-level star list;
- optionally return an Earth/Sol reference catalog using the same successful-star inclusion mask as the transformed catalog;
- return fresh output objects without mutating or retaining mutable source-catalog containers; and
- remain independent of Three.js, Svelte, Astro, routes, browser globals, localization, and renderer placement.

HPA-433 is a pure data-and-test change. HPA-434 owns fixed-equatorial placement, primary/reference scene layers, synthetic-Sol rendering style, magnitude-culling bypass, visibility toggling, focus-by-ID, and resource disposal.

## 2. Context

The current constellation source model has two properties that shape this design:

1. `Constellation.stars` is a constellation-local ordered array.
2. `Constellation.lines` is typed as `number[][]` and contains index pairs into that local array in the current data.

The renderer currently receives a separate top-level star array and constellation array. It uses top-level star ordering for point hover lookup and each constellation's local star ordering for line construction. Synthetic Sol cannot be inserted into a fake constellation without inventing cultural membership and corrupting line semantics, so the prepared result needs both:

- a top-level primary star collection containing transformed source stars plus synthetic Sol; and
- constellation-local star collections containing only transformed source stars.

The current Earth wrapper derives its top-level renderer star input by flattening constellation memberships. That behavior is not valid for prepared alternate catalogs: it would omit synthetic Sol and duplicate stars that belong to multiple constellations. HPA-434 must consume the prepared top-level star list directly.

HPA-431 provides the exact coordinate API and validation semantics:

- `transformToObserver()` for positive-distance catalog stars;
- `subtractObserverPosition()` for Cartesian translation;
- `cartesianToEquatorial()` for reverse conversion; and
- typed `CoordinateTransformError` failures rather than `NaN` propagation.

HPA-432 resolves URL observer state separately and guarantees that a selected Galaxy observer has finite, non-origin Cartesian coordinates before alternate-sky integration. HPA-433 must nevertheless remain deterministic for direct unit-test inputs and must not import route state or `localGalaxyData`.

## 3. Goals

- Produce an immutable-by-contract, serializable observer-relative catalog.
- Preserve stable source-star and constellation identities for hover, selection, labels, and focus lookup.
- Preserve source-star metadata while replacing only right ascension, declination, and distance on transformed stars.
- Preserve constellation metadata, including visibility and `bestMonths`, in fresh prepared objects.
- Transform each canonical source star once even when it belongs to multiple constellation arrays.
- Preserve constellation-local ordering for successful stars.
- Preserve line values exactly when no star is omitted and every source line is a valid pair.
- Repair line indices deterministically when a star is omitted.
- Prevent malformed source line arrays from being narrowed into incorrect prepared tuples.
- Return one structured diagnostic per omitted canonical star in failed canonical-transform order.
- Create synthetic Sol through the HPA-431 Cartesian-origin primitive path.
- Make synthetic Sol distinguishable by stable ID and explicit marker metadata rather than magnitude, color, or property-presence inference.
- Optionally create an Earth/Sol reference catalog that can be passed independently to a second renderer layer.
- Give HPA-434 an explicit handoff contract for top-level stars, constellations, and marker culling.
- Keep all work outside animation loops.

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
- Reporting diagnostics for duplicate IDs with conflicting records or malformed source line definitions.
- General source-catalog validation beyond the defensive line guard and reserved synthetic-ID invariant required for safe prepared output.
- Defining a generic deep-clone policy for future nested star metadata.
- Adding a zero-distance exception to `EquatorialPosition` or `transformToObserver()`.

## 5. Design decisions

### 5.1 Shape-preserving adapter

Use a shape-preserving prepared catalog rather than normalizing the renderer contract into `starsById` and ID-based line edges.

This keeps HPA-433 focused and allows HPA-434 to consume familiar star and constellation shapes while extending renderer APIs narrowly. A normalized graph model would be reasonable for a larger catalog rewrite, but it would force HPA-434 to own an adapter or broad renderer refactor and would exceed this issue's size guardrail.

### 5.2 Separate ordinary transformation from synthetic Sol

Sol identity and synthetic Sol are different operations:

- An observer at `{ x: 0, y: 0, z: 0 }` can identity-transform every positive-distance catalog star.
- Synthetic Sol from the same origin produces the zero Cartesian vector, whose direction is undefined and intentionally rejected by HPA-431.

Therefore the module must not expose one unconditional operation that claims both behaviors succeed for a Sol-origin observer.

The design separates:

1. ordinary catalog transformation, which supports Sol identity and excludes synthetic Sol;
2. synthetic-Sol construction, which succeeds only when Sol has a meaningful direction from the observer; and
3. alternate-observer composition, which requires synthetic Sol and is intended for non-origin observers.

Earth/Sol mode continues to use the original catalog and renderer path. It does not call the alternate-observer composition function.

### 5.3 Synthetic Sol is not a constellation member

Synthetic Sol is appended to the alternate primary catalog's top-level `stars` array and is absent from every `Constellation.stars` array and every line pair.

No fake constellation, fake abbreviation, mythology, visibility range, or line segment is created.

### 5.4 Reference and transformed catalogs use one inclusion mask

When a transformed source star fails, it is omitted from both:

- the observer-relative transformed catalog; and
- the optional Earth/Sol reference catalog.

Both catalogs use the same repaired constellation topology. This prevents the reference layer from containing a star or segment that has no corresponding transformed-layer object and keeps comparison behavior deterministic.

### 5.5 IDs are canonical identity and first occurrence wins

A source-star ID is the canonical identity across constellation memberships. The first occurrence in deterministic source traversal establishes:

- the canonical source record used for coordinates and metadata;
- top-level source-star ordering; and
- the source name included in any omission diagnostic.

Later occurrences with the same ID contribute membership only, even if their fields conflict. This first-record-wins behavior is deterministic and test-pinned, but conflicting duplicate validation remains outside HPA-433.

The current catalog constructs constellation membership from one shared source-star collection, so normal repeated membership describes the same record.

### 5.6 Prepared line tuples require a defensive source guard

The source type permits arbitrary `number[]` entries, while the prepared type intentionally exposes only exact two-index tuples. The implementation must therefore validate each source line before tuple narrowing.

A usable source line must:

- have exactly two entries;
- contain integer indices; and
- reference indices within the original constellation-local star array.

Malformed or out-of-range entries are omitted defensively and never converted into prepared tuples. HPA-433 does not add line diagnostics or fail catalog preparation for these entries.

### 5.7 Prepared top-level stars are authoritative

Alternate-sky integration must pass each prepared catalog's two collections directly to the renderer:

```ts
renderer.initialize(
    primaryCatalog.stars,
    primaryCatalog.constellations,
    skyConfig,
);
```

The optional comparison layer likewise consumes `referenceCatalog.stars` and `referenceCatalog.constellations` as one matched pair.

Consumers must not rebuild a prepared top-level star list with:

```ts
catalog.constellations.flatMap((constellation) => constellation.stars);
```

Flattening constellation membership would:

- drop synthetic Sol because it is intentionally not a constellation member;
- duplicate stars that appear in multiple constellations; and
- break stable point-index-to-star lookup.

The existing Earth path may keep its current behavior until HPA-434 introduces the prepared-catalog path. HPA-433 does not modify `ConstellationWrapper.svelte` or the renderer.

### 5.8 Synthetic Sol ID is reserved

`SYNTHETIC_SOL_STAR_ID` is reserved for the synthetic marker and must not be used by a source star. The current production constellation catalog contains no source star with ID `"sol"`.

HPA-433 does not introduce a general source-catalog validation result. Instead, the implementation test suite must pin the production-data invariant that no canonical source ID equals `SYNTHETIC_SOL_STAR_ID`. If a future catalog needs that ID, the synthetic ID or the preparation result contract must be revised before the catalog change ships; silently producing two top-level objects with one stable ID is not allowed.

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

The finite magnitude exists only to remain compatible with the current star shape and serialization. It is not a guarantee that synthetic Sol survives every renderer magnitude threshold. HPA-434 must identify marker stars before ordinary magnitude culling and either bypass that culling or render them through a dedicated marker path. HPA-434 must also use marker metadata as the authoritative synthetic-Sol rendering signal and must not present the fallback magnitude as observer-correct photometry.

### 7.2 Prepared stars and authoritative discriminator

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

export function isSyntheticSolStar(
    star: PreparedCatalogStar,
): star is SyntheticSolStar;
```

`isSyntheticSolStar()` must use the value discriminator:

```ts
return star.marker?.kind === "synthetic-sol";
```

Consumers must not use `"marker" in star` as the discriminator. Source stars normally have no own `marker` property, and JSON serialization omits optional `undefined` properties. The value-based discriminator remains correct before and after a JSON round-trip because synthetic Sol retains `marker: { kind: "synthetic-sol" }` while source stars do not.

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
- fresh validated line-pair tuples; and
- a fresh visibility object and `bestMonths` array.

Constellations are retained even when every star is omitted. Such a constellation has empty `stars` and `lines`, preserving stable constellation identity without inventing data.

### 7.4 Prepared catalog roles

```ts
export interface PreparedConstellationCatalog {
    readonly stars: readonly PreparedCatalogStar[];
    readonly constellations: readonly PreparedConstellation[];
}
```

The same structural type has three explicit roles:

- **Transformed catalog:** successful observer-relative source stars only; no synthetic Sol.
- **Alternate primary catalog:** the transformed source stars followed by synthetic Sol.
- **Reference catalog:** successful cloned source stars at original Sol-relative coordinates; no synthetic Sol.

The role is determined by the public operation and result field, not by adding a mutable catalog-mode flag.

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

Diagnostics intentionally exclude the full source-star object. HPA-431's error union identifies non-finite components without echoing `NaN` or infinity, keeping the full result JSON-safe.

There is exactly one diagnostic per canonical star ID, even when that star appears in multiple constellation arrays. Memberships are ordered by constellation traversal and local star index. The `omittedStars` array follows canonical first-appearance order with successful canonical transforms skipped; equivalently, diagnostics appear in the same order as failed canonical transform attempts.

### 7.6 Result types

```ts
export interface CatalogTransformOutput {
    readonly transformedCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly omittedStars: readonly OmittedStarDiagnostic[];
}

export interface AlternateObserverCatalogOutput {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly omittedStars: readonly OmittedStarDiagnostic[];
}

export type AlternateObserverCatalogPreparationResult =
    | {
          readonly ok: true;
          readonly value: AlternateObserverCatalogOutput;
      }
    | {
          readonly ok: false;
          readonly error: {
              readonly code: "synthetic-sol-unavailable";
              readonly cause: CoordinateTransformError;
          };
      };
```

Ordinary source-star failures are represented only in `omittedStars` and do not fail the whole catalog transformation.

Alternate-observer composition has one fatal domain failure: synthetic Sol cannot be constructed. This normally indicates a non-finite, overflowing, or origin-colliding observer. The wrapper preserves the exact HPA-431 error as `cause` for deterministic downstream fallback handling.

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
- defensively removes unusable source line entries;
- builds the top-level transformed source-star list; and
- optionally builds a matching Earth/Sol reference catalog.

`includeReferenceCatalog` defaults to `false` to avoid unnecessary allocation for callers that do not need comparison data.

For an empty input constellation array, this operation returns an empty transformed catalog, an empty `omittedStars` array, and—when requested—an independently allocated empty reference catalog.

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

This operation is intended only for non-origin alternate observers and requires the reserved synthetic ID not to occur in the source catalog.

Required order:

1. Call `createSyntheticSol(observerPosition)`.
2. If it fails, return `synthetic-sol-unavailable` without transforming ordinary stars.
3. Call `transformCatalogToObserver()` with the requested reference option.
4. Create `primaryCatalog` by copying `transformedCatalog.stars` and appending synthetic Sol; reuse the already prepared transformed constellations.
5. Return the primary catalog, optional reference catalog, and omitted-star diagnostics.

Synthetic Sol is appended last so the canonical ordering of successful source stars remains stable and comparison catalogs retain matching source-star ordering.

For an empty input constellation array and a valid non-origin observer, preparation succeeds with:

- `primaryCatalog.stars` containing exactly synthetic Sol;
- `primaryCatalog.constellations` empty;
- `omittedStars` empty; and
- an independently allocated empty reference catalog when requested.

Computing synthetic Sol first prevents an invalid observer from producing a misleading list of repeated per-star omissions when the product-level observer itself cannot support alternate-sky mode.

## 9. Canonical source traversal

The implementation performs one deterministic source-indexing pass.

Traversal order is:

1. input constellation array order;
2. each constellation's local `stars` array order.

For every encountered star:

- record membership `{ constellationId, originalStarIndex }`;
- if the ID has not been seen, register this star as the canonical source record and append its ID to canonical order;
- if the ID has already been seen, append membership only and do not replace the canonical record.

After indexing, transform canonical stars in canonical order.

The output top-level source-star ordering is therefore independent of `Map` implementation details and stable across runs:

- successful source stars in first-appearance order;
- synthetic Sol last in alternate-observer output.

The diagnostic ordering follows the same canonical traversal: append a diagnostic when that canonical transform fails and append nothing when it succeeds.

The module must not sort IDs alphabetically or reorder constellations, local stars, memberships, line segments, diagnostics, or output catalogs.

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

The following source-star fields remain unchanged:

- `id`;
- `name`;
- `magnitude`;
- `spectralClass`;
- `color`; and
- current enumerable source-star metadata.

Constellation-level visibility metadata is preserved separately during constellation reconstruction.

The current `Star` type contains flat scalar/string fields, so spread-first copying creates an independent complete star record. Object spread is shallow: if future `Star` revisions add mutable nested objects or arrays, those nested values would remain shared with the source and potentially across catalog roles unless the preparation contract is extended with field-specific cloning. Such a type change must update this design and its independence tests before consumers rely on nested metadata mutability isolation.

Magnitude remains the existing Sol-observer apparent magnitude for MVP. HPA-433 and its consumers must not claim it is observer-correct brightness.

On failure, no prepared source star is created. Record one `OmittedStarDiagnostic` containing the canonical ID, canonical name, all memberships, and the exact HPA-431 error.

## 11. Constellation reconstruction and line remapping

Each input constellation is rebuilt independently from its original local star array.

### 11.1 Star-array reconstruction

For each original local star index:

- look up the canonical transform result by star ID;
- when successful, append the canonical prepared star to the new local array and record `oldIndex -> newIndex`;
- when omitted, do not append and do not create a mapping.

Successful local stars retain their relative order.

A canonical prepared star object may be reused across the top-level list and multiple local arrays within the same catalog because the record is immutable by contract. All arrays remain fresh, and no prepared star object is shared with the source catalog or between primary/transformed and reference roles.

Reference constellations use separately cloned canonical reference-star objects with original coordinates.

### 11.2 Line reconstruction

For each source line entry in source order:

1. verify it is an exact two-entry integer pair whose indices are in range for the original local star array;
2. if it is unusable, omit it defensively;
3. otherwise look up both remapped indices;
4. when both remapped indices exist, append a fresh tuple `[newStart, newEnd]`; and
5. when either endpoint was omitted, omit the entire segment.

No new segment is created to bridge across an omitted star.

Example:

```text
Original stars: A, B, C, D
Original lines: [0,1], [1,2], [2,3], [0,3]
B omitted
Prepared stars: A, C, D
Prepared lines: [1,2], [0,2]
```

The first two original segments are removed because they touch B. `[2,3]` becomes `[1,2]`; `[0,3]` becomes `[0,2]`.

When no star is omitted from a constellation and every source line is usable, every line pair remains value-identical and in the same order, although the pair arrays themselves are fresh objects.

Malformed-line diagnostic reporting remains outside this issue. The guard exists solely to prevent a `number[]` of the wrong shape from being destructured and incorrectly narrowed into a prepared tuple.

### 11.3 Fully depleted constellations

A constellation remains in output even when all of its source stars are omitted. Its prepared form preserves constellation identity and metadata while returning:

```ts
{
    stars: [],
    lines: [],
}
```

No surviving or malformed source line may remain when the local prepared star array is empty.

## 12. Reference catalog preparation

When requested, the reference catalog is built during the same reconstruction pass.

It contains:

- fresh clones of only those source stars whose observer-relative transform succeeded;
- original right ascension, declination, distance, magnitude, and source-star metadata;
- preserved constellation metadata, including visibility and `bestMonths`;
- the same top-level successful-source-star order as the transformed catalog;
- the same constellation order;
- the same successful local-star inclusion mask;
- the same repaired and guarded line tuples; and
- no synthetic Sol.

The reference catalog is a complete independent renderer input. Consumers do not need to inspect the transformed or primary catalog to interpret its star and constellation arrays, and must not reconstruct its top-level stars from constellation membership.

Transformed/primary and reference roles may share immutable scalar and string values, but must not share star objects, constellation objects, arrays, visibility objects, or line-pair arrays. The shallow-copy limitation for any future nested star metadata is defined in §10.

## 13. Error semantics

### 13.1 Nonfatal source-star failures

The following HPA-431 failures omit only the affected canonical source star:

- `non-finite-equatorial-input`;
- `declination-out-of-range`;
- `invalid-distance`;
- `non-finite-cartesian-input` arising during target conversion or subtraction;
- `undefined-direction`, including a catalog star whose Sol-centered position exactly collides with the observer; and
- `cartesian-distance-overflow`.

The rest of the ordinary-star catalog remains available.

### 13.2 Fatal synthetic-Sol failure

`prepareAlternateObserverCatalog()` fails before ordinary catalog transformation when `createSyntheticSol()` fails.

Expected causes include:

- non-finite observer coordinates;
- reverse-distance overflow for extremely large finite observer coordinates; and
- `undefined-direction` for an origin-colliding observer.

HPA-433 does not decide the UI fallback. HPA-435 may map this failure to Sol mode with a localized notice.

### 13.3 Malformed source lines

Malformed or out-of-range line entries are not coordinate errors and do not produce `OmittedStarDiagnostic` records. They are skipped by the defensive pair guard so they cannot corrupt prepared topology.

### 13.4 Reserved synthetic ID

A source star with `id === SYNTHETIC_SOL_STAR_ID` violates the prepared-catalog input invariant. The production-data test must catch this before release. HPA-433 does not silently allow duplicate primary IDs and does not reinterpret a source record as synthetic Sol.

### 13.5 Programming errors

Unexpected programming defects are not converted into domain diagnostics. The module does not catch arbitrary exceptions around ordinary object/array operations.

## 14. Immutability and serializability

The implementation must not mutate:

- the input constellation array;
- any input constellation;
- any input local star array;
- any source star;
- any source line array or pair;
- constellation visibility metadata or `bestMonths`; or
- the observer object.

All output container arrays and constellation/visibility/line objects are fresh relative to input. Immutable prepared-star records may be shared within one catalog role to keep top-level and local membership identity consistent; they are never shared with source records or between transformed/primary and reference roles, subject to the future nested-metadata limitation in §10.

Runtime deep freezing is not required. The public API uses readonly output types, and tests verify operation on deeply frozen inputs.

Every success and failure result must be safe for `JSON.stringify()` and deterministic deep equality. Output must not contain:

- `NaN` or infinity;
- `Date`, `Map`, `Set`, class instances, or functions;
- `THREE.Vector3`; or
- cyclic object references.

Serialization may omit the optional `marker` key on prepared source stars. Synthetic Sol's marker object must survive a stringify/parse round-trip, and the authoritative value predicate `star.marker?.kind === "synthetic-sol"` must continue to distinguish it. Consumers must not depend on marker-key presence.

The module must preserve HPA-431's positive-zero normalization in transformed coordinates and must not reintroduce signed-zero special handling.

## 15. Performance model

Catalog preparation runs once per observer selection change, not per animation frame.

Let:

- `U` be unique source stars;
- `M` be total constellation memberships; and
- `L` be total source line entries.

Time complexity is `O(U + M + L)`. Space complexity is `O(U + M + L)` for the prepared transformed/primary catalog, with another proportional allocation only when the reference catalog is requested.

The implementation should use local `Map` structures for indexing and lookup, but no `Map` may escape in public output.

A wall-clock unit-test threshold is not required because it would be flaky in CI. The enforceable performance contract is one transformation per canonical source ID and no work in the renderer animation loop.

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
- Assert source-star names, IDs, magnitude, spectral class, color, and extra fixture metadata remain unchanged.
- Assert constellation visibility metadata and `bestMonths` remain value-identical in fresh objects.
- Assert `transformCatalogToObserver()` returns `transformedCatalog` without synthetic Sol.

### 16.2 Nearby observer

- Reuse or mirror the HPA-431 Alpha-Centauri-like observer fixture.
- Assert representative transformed directions and distances.
- Assert output RA is normalized to `[0h, 24h)`.

### 16.3 Synthetic Sol primitive path

- Assert `createSyntheticSol()` produces the direction and distance expected from the HPA-431 fixture observer.
- Assert the result is consistent with subtracting the observer from the Cartesian origin.
- Assert ID, fallback name, spectral class, finite magnitude, color, and marker metadata.
- Assert `isSyntheticSolStar()` recognizes the result.
- Assert a Sol-origin observer returns `undefined-direction`.
- Assert zero-distance equatorial Sol is never introduced into the public contract.

### 16.4 Stable identity, reserved ID, first-wins behavior, and ordering

- Assert source-star IDs and constellation IDs are unchanged.
- Assert canonical top-level order follows first source appearance.
- Assert duplicate membership produces one top-level source star and multiple local memberships.
- Supply two records with one ID but conflicting coordinates/metadata and assert the first record is canonical while both memberships are retained.
- Assert the production source catalog contains no canonical star with `id === SYNTHETIC_SOL_STAR_ID`.
- Assert synthetic Sol is appended last only by `prepareAlternateObserverCatalog()`.
- Assert input constellation order and successful local-star order remain unchanged.
- Assert multiple failed canonical transforms produce `omittedStars` in failed first-appearance order.

### 16.5 Line preservation, guard, and repair

- Assert a no-omission fixture with valid pairs preserves line pair values and order exactly.
- Include malformed source entries with the wrong length, non-integer indices, and out-of-range indices; assert they are omitted and never appear as prepared tuples.
- Omit the middle star of a four-star fixture.
- Assert touching segments are removed.
- Assert unrelated surviving segments are correctly remapped.
- Assert no bridge segment is invented.
- Assert the same guarded, repaired topology is used by the optional reference catalog.

### 16.6 Invalid-star omission and fully depleted constellation

Cover at least:

- zero distance;
- negative distance;
- non-finite RA;
- out-of-range declination;
- a source star exactly colliding with the observer; and
- a transform whose derived Cartesian distance overflows.

For each, assert:

- the ordinary catalog operation succeeds overall;
- only the canonical bad star is omitted;
- one diagnostic is returned;
- all memberships are present in deterministic order;
- the HPA-431 error is preserved; and
- unrelated constellations and stars survive.

Also include one constellation whose every star is omitted and assert:

- the constellation ID and metadata remain present;
- its prepared `stars` and `lines` arrays are empty; and
- other constellations remain unaffected.

### 16.7 Product-level fatal observer and empty-input behavior

- Assert `prepareAlternateObserverCatalog()` returns `synthetic-sol-unavailable` for origin collision.
- Assert non-finite and overflow fixture observers preserve the exact HPA-431 cause.
- Assert no partial primary or reference catalog is returned on failure.
- Assert empty input with a valid non-origin observer produces a primary catalog containing only synthetic Sol and no constellations.
- Assert the optional empty reference catalog is independently allocated.

### 16.8 Reference independence

- Assert reference stars retain original source coordinates.
- Assert reference and transformed/primary stars are different objects.
- Assert reference and transformed/primary constellations, arrays, visibility objects, and line pairs are different objects.
- Assert the reference top-level list omits synthetic Sol.
- Assert both roles use the same successful-source inclusion mask.

### 16.9 Immutability, determinism, and serialization

- Deep-freeze the full fixture catalog and observer.
- Assert every public operation succeeds or returns its typed failure without mutation errors.
- Assert inputs are deeply unchanged.
- Call preparation twice and assert deep equality.
- Assert `JSON.stringify()` succeeds and contains no `null` introduced by non-finite numeric output.
- Parse serialized output and assert synthetic Sol still satisfies the marker-kind predicate while source stars do not.
- Assert discrimination does not depend on `"marker" in star`.

### 16.10 HPA-434 handoff contract

The HPA-433 unit suite does not test the renderer, but its output tests must make the downstream contract unambiguous:

- `primaryCatalog.stars` includes synthetic Sol exactly once;
- no primary constellation contains synthetic Sol;
- duplicate constellation membership does not duplicate top-level primary stars; and
- reference top-level stars are supplied independently rather than reconstructed from memberships.

HPA-434 owns integration tests proving its wrapper/renderer path passes the prepared top-level star list directly and bypasses ordinary magnitude filtering for synthetic markers.

## 17. Acceptance-criteria mapping

| HPA-433 acceptance criterion | Design mechanism |
| --- | --- |
| Output is deterministic and serializable | Ordered traversal, plain readonly objects/arrays, JSON-safe HPA-431 errors, marker round-trip test |
| Input catalog objects are not mutated | Fresh container reconstruction, spread-first star copies, deep-freeze tests |
| Star/constellation identity remains stable | IDs preserved; canonical star map keyed by source ID; reserved Sol ID; constellations retained, including depleted constellations |
| Synthetic Sol is correct for fixture observers | Cartesian origin subtraction followed by `cartesianToEquatorial()` |
| No zero-distance equatorial exception | Sol never enters `transformToObserver()`; origin observer correctly fails marker creation |
| Invalid stars do not fail the entire catalog | One omitted-star diagnostic per canonical failed star, ordered by failed canonical traversal |
| Earth-reference preparation is independently consumable | Complete optional reference catalog with its own top-level stars and constellations |
| Preserved line indices/IDs | Value-identical valid no-omission lines; exact-pair guard; old-to-new remapping after omission |
| Original catalog remains immutable | Readonly inputs, no source mutation, no shared mutable source containers under the current flat `Star` shape |
| Renderer receives synthetic Sol | Prepared top-level stars are authoritative; HPA-434 must not flat-map constellation membership |
| Pure catalog/data PR | No renderer, route, Svelte, localization, or browser imports |

## 18. Risks and mitigations

### Risk: line topology silently changes after omission

**Mitigation:** use an explicit old-index-to-new-index map, remove only segments with missing endpoints, preserve segment order, and test a middle-star omission where naïve filtering would connect incorrect stars.

### Risk: source `number[][]` contains a non-pair entry

**Mitigation:** require an exact two-entry, integer, in-range guard before tuple narrowing; omit unusable entries; test malformed length, non-integer, and out-of-range cases.

### Risk: HPA-434 reconstructs top-level stars by flattening constellation membership

**Mitigation:** define `catalog.stars` as the authoritative renderer input, prohibit flat-mapping prepared constellations, and require HPA-434 integration coverage. This preserves synthetic Sol and prevents duplicate points for multiply referenced stars.

### Risk: ordinary magnitude filtering hides synthetic Sol

**Mitigation:** HPA-434 must identify synthetic markers before applying source-star magnitude culling and bypass the filter or use a dedicated marker-rendering path. `SYNTHETIC_SOL_RENDER_MAGNITUDE` is compatibility data, not a visibility guarantee.

### Risk: a source star collides with the reserved synthetic ID

**Mitigation:** reserve `SYNTHETIC_SOL_STAR_ID`, pin the current production catalog with a test, and require an explicit contract revision before any source catalog may adopt that ID.

### Risk: synthetic Sol is accidentally represented as zero-distance equatorial data

**Mitigation:** expose a dedicated `createSyntheticSol()` primitive-path function, test the origin failure, and forbid `transformToObserver()` for Sol in the written contract.

### Risk: Sol identity and synthetic Sol requirements are conflated

**Mitigation:** ordinary catalog transformation supports Sol identity; alternate-observer composition requires a meaningful synthetic-Sol direction and is not used for Earth/Sol mode.

### Risk: duplicate constellation membership causes repeated transforms or duplicate top-level points

**Mitigation:** canonicalize by stable star ID, transform once, record all memberships, order top-level stars by first appearance, and test conflicting duplicates to pin first-record-wins behavior.

### Risk: reference and transformed layers compare different star sets

**Mitigation:** build both from one successful-star inclusion mask and one repaired topology pass.

### Risk: marker appearance or identity is inferred incorrectly

**Mitigation:** make `marker.kind === "synthetic-sol"` authoritative, expose `isSyntheticSolStar()`, document the finite magnitude as renderer compatibility only, and test serialization round-trip discrimination.

### Risk: future nested metadata violates object-independence assumptions

**Mitigation:** document that the current flat `Star` shape is fully copied but object spread is shallow. Any future mutable nested field requires field-specific cloning and revised independence tests before it can be treated as isolated output metadata.

### Risk: readonly output is cast away and mutated by a consumer

**Mitigation:** create no shared mutable source containers under the current flat source model, keep HPA-434 renderer APIs readonly, and test transformed/reference object independence. Runtime deep freeze is unnecessary for the current one-time preparation path.

### Risk: source records with one ID disagree across constellations

**Mitigation:** deterministically use the first occurrence as canonical and test that rule. A future catalog-validation issue may report conflicts; HPA-433 does not broaden its diagnostic model beyond coordinate/transform failures.

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

A narrow test import of the production constellation data is acceptable solely to pin the reserved synthetic-ID invariant. A narrow import-only test adjustment to reuse HPA-431 immutable fixtures is acceptable if it does not alter their coordinate contract.

### HPA-434 handoff

HPA-434 must:

- consume `primaryCatalog.stars` and `primaryCatalog.constellations` directly as a matched input pair;
- consume reference top-level stars and constellations directly when the comparison layer is enabled;
- never reconstruct either top-level list by flattening constellation membership;
- widen renderer inputs to readonly prepared shapes or use a narrow boundary adapter rather than weakening HPA-433 output types; and
- render synthetic markers independently of ordinary magnitude culling.

These requirements are downstream integration constraints, not implementation work for HPA-433.

## 20. Delivery sequence

After this design is approved:

1. write a task-by-task TDD implementation plan;
2. implement public prepared-catalog types, marker discriminator, and deterministic fixtures;
3. implement canonical source indexing and ordinary transformation;
4. implement omission diagnostics, defensive line guarding, and line remapping;
5. implement synthetic Sol through Cartesian primitives;
6. implement alternate-observer composition and optional reference output;
7. finish reserved-ID, empty-input, depleted-constellation, conflicting-duplicate, ordering, immutability, determinism, serialization, and fatal-preflight tests; and
8. verify unit tests, type checking, lint, build, and diff scope.

HPA-434 begins only after this catalog contract is merged or otherwise treated as stable.
