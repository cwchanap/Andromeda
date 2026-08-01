# HPA-433: Observer Catalog Preparation and Synthetic Sol Design

**Status:** Ready for approval, revised after three design-review passes

**Issue:** HPA-433 — `[Sky] Prepare transformed constellation catalogs and synthetic Sol`

**Parent:** HPA-426 — `Epic: Sky From Another Star`

**Dependency:** HPA-431 — observer-relative coordinate transforms, completed in PR #34

**Downstream consumers:**

- HPA-434 — alternate-observer and Earth-reference renderer layers
- HPA-435 — observer resolution, source-star identity mapping, and wrapper integration
- HPA-436 — cross-system E2E and Alpha Centauri regression coverage

## 1. Summary

Add a pure constellation-catalog preparation module that converts the existing Sol-centered constellation-member stars into an arbitrary system-barycenter observer frame, preserves stable identities, repairs constellation topology when primary stars are omitted, creates a synthetic Sol marker through the HPA-431 Cartesian-origin path, and prepares an optional fixed-equatorial Sol-reference catalog.

The module will:

- consume only plain constellation objects, a plain Cartesian observer position, and optional observer-source star IDs;
- operate on the full unfiltered exported constellation array for alien mode;
- transform each canonical non-excluded source star at most once through `transformToObserver()`;
- deliberately exclude catalog stars that represent the selected observer system from the primary alien catalog;
- retain valid observer-source stars in the optional Sol-reference catalog;
- preserve stable source-star and constellation IDs and current metadata;
- retain constellation-local ordered star arrays and index-pair line storage;
- rebuild primary and reference topology independently when their inclusion masks differ;
- return ordered, JSON-safe primary-omission diagnostics;
- create synthetic Sol by subtracting the observer from the Sol-centered Cartesian origin and reverse-converting the relative vector;
- reserve `SYNTHETIC_SOL_STAR_ID` for the synthetic record;
- expose an authoritative top-level star list instead of requiring consumers to flatten constellation membership;
- return fresh output containers without mutating source data; and
- remain independent of Three.js, Svelte, Astro, routes, browser globals, localization, and renderer placement.

HPA-433 is a pure data-and-test change. It does not integrate the wrapper or renderer.

## 2. Repository context

### 2.1 Current constellation shape

The source model has two properties that determine the preparation algorithm:

1. `Constellation.stars` is a constellation-local ordered array.
2. `Constellation.lines` is typed as `number[][]` and current data uses each entry as a pair of indices into that local array.

The renderer separately accepts a top-level star array and a constellation array. Top-level order drives point-index hover lookup, while constellation-local order drives line endpoints.

### 2.2 Current wrapper behavior is Earth-specific

The current Earth/Sol wrapper:

- calls `getVisibleConstellations(latitude, month)`;
- filters by Earth latitude, hemisphere, and calendar month; and
- derives the renderer star array by flattening constellation memberships.

Neither behavior is valid for alternate-observer preparation:

- Earth latitude and month must not gate an alien fixed-equatorial sky; and
- flattening prepared constellation memberships would omit synthetic Sol and duplicate multiply referenced stars.

The legacy Earth path remains unchanged. HPA-435 must use the full exported `constellations` array for alternate mode.

### 2.3 Current renderer adds procedural points

The current renderer injects procedural stars when the explicit star-position buffer is small. Prepared primary/reference layers must not each trigger that fallback because the random scene-space points:

- are not transformed catalog objects;
- would be duplicated across primary and reference layers;
- would not participate in stable identity or diagnostics; and
- would make comparison output nondeterministic.

HPA-434 owns disabling this fallback for prepared layers. A single decorative scene-level background may remain if it is clearly outside both catalog layers, not duplicated, and not hoverable as catalog data.

### 2.4 Coordinate API

HPA-431 provides:

- `transformToObserver()` for positive-distance catalog stars;
- `subtractObserverPosition()` for Cartesian translation;
- `cartesianToEquatorial()` for reverse conversion;
- `CoordinateTransformError`; and
- `TransformResult<T>`.

The shared frame is Sol-centered, fixed equatorial, Y-up Cartesian light-years. The Galaxy observer positions already use the same axis convention.

## 3. Production collision motivating observer-source exclusions

The source constellation catalog contains:

```text
alpha_cen
RA 14.66h
Dec -60.834°
distance 4.37 ly
```

The Galaxy `alpha-centauri` observer uses the independently sourced system-barycenter vector:

```text
(-1.5873472913, -3.7083090144, -1.3272283455) ly
```

Transforming the catalog record from that observer places `alpha_cen` approximately `0.1235 ly` away rather than at the observer origin. The HPA-431 undefined-direction epsilon is intentionally `1e-12 ly`; it cannot and should not treat this data discrepancy as an exact collision.

Without an explicit identity exclusion, alien mode would render a phantom bright Alpha Centauri vertex and preserve its Centaurus line membership.

A geometric proximity threshold is rejected because it would:

- encode an arbitrary domain radius;
- risk omitting legitimate nearby neighboring stars;
- still depend on inconsistent source precision; and
- fail to represent multi-star or combined catalog identities cleanly.

The contract therefore uses caller-supplied observer-source star IDs.

## 4. Goals

- Produce deterministic, serializable prepared catalogs.
- Keep astronomy and catalog preparation outside renderer and Svelte code.
- Use the full unfiltered constellation catalog in alternate mode.
- Preserve canonical source-star and constellation identity.
- Transform each canonical non-excluded source star once.
- Exclude source stars representing the selected observer system from the primary layer by stable ID, not proximity.
- Retain valid observer-source stars in the reference layer so the Earth/Sol shape remains inspectable.
- Preserve successful local-star ordering independently in each catalog role.
- Preserve valid line values exactly when a role omits no endpoints.
- Repair indices deterministically when a role omits stars.
- Create synthetic Sol only through Cartesian-origin subtraction followed by reverse conversion.
- Provide a renderer-ready top-level primary star list containing synthetic Sol exactly once.
- Return structured primary-omission diagnostics in canonical order.
- Keep original catalog objects and observer inputs immutable.

## 5. Non-goals

- Three.js geometry, materials, points, sprites, labels, scene groups, camera behavior, or disposal.
- Modifying the current Earth geolocation/month/hemisphere filtering path.
- Route parsing, observer resolution, system-name localization, or UI controls.
- Automatic geometric matching between Galaxy systems and constellation stars.
- A general catalog validation framework for duplicate IDs or malformed lines.
- Converting line storage from local indices to star IDs.
- Exporting or transforming module-private stars that belong to no exported constellation.
- Proper motion, precession, epoch conversion, aberration, or relativistic effects.
- Exoplanet-surface horizon, atmosphere, axial tilt, local time, or seasons.
- Observer-corrected photometry in this slice.
- A zero-distance exception for Sol or any other star.

### 5.1 Why orphan stars remain out of scope

The current data module contains stars that are not members of any exported constellation. The public preparation input is the exported constellation graph, so those module-private orphan stars are unreachable by design.

This matches current wrapper behavior, which also derives explicit stars from constellation membership. HPA-433 records rather than expands that boundary. A future top-level catalog export can broaden the source model without changing observer-coordinate math.

### 5.2 Why magnitude correction remains deferred

The transformed distance and original distance are available, and a simple distance-modulus adjustment could be written as:

```text
m_new = m_old + 5 × log10(d_new / d_old)
```

HPA-433 deliberately does not apply it because doing so would also change the renderer’s magnitude-culling set and point sizing, while current magnitude values may represent combined systems and are not guaranteed to be a consistent photometric dataset.

Keeping magnitude unchanged preserves the current named-star visibility set while geometry and layer semantics are introduced. A later photometry slice must define:

- source magnitude assumptions;
- binary/combined-system handling;
- culling behavior;
- marker behavior; and
- comparison semantics.

The UI must not claim observer-correct brightness in MVP.

## 6. Design decisions

### 6.1 Shape-preserving prepared catalogs

Use familiar star and constellation shapes rather than introducing an ID-graph renderer contract. This keeps HPA-433 and HPA-434 independently scoped.

Prepared results contain:

- an authoritative top-level star array; and
- constellation-local star arrays with role-specific lines.

### 6.2 Three separate operations

The design separates:

1. ordinary catalog transformation;
2. synthetic-Sol construction; and
3. alternate-observer composition.

This preserves a valid Sol-origin identity transform for ordinary stars while keeping synthetic Sol correctly undefined at the Sol origin.

### 6.3 Full unfiltered source input

Product-facing alternate preparation must receive the full exported `constellations` array, not `getVisibleConstellations()` output.

Both alien primary and Sol-reference catalogs are all-sky fixed-equatorial data. They must compare the same source constellation set without Earth latitude, location, month, date, hour-angle, or sidereal-time gating.

The existing Earth/Sol renderer path may continue filtering visible constellations for its horizontal local-sky experience.

### 6.4 Canonical ID and first-record-wins

A source-star ID is canonical across constellation memberships.

Deterministic traversal order is:

1. input constellation order;
2. local star order.

The first occurrence establishes:

- the canonical coordinate and metadata record;
- top-level source-star ordering; and
- diagnostic name.

Later occurrences contribute membership only. Conflicting duplicate validation remains outside HPA-433, but first-record-wins is test-pinned.

### 6.5 Observer-source exclusions are identity-driven

The caller may provide source-star IDs representing the selected observer system.

Examples may include:

- `alpha-centauri` observer → `alpha_cen` source star;
- another nearby named system → its matching source-star ID where one exists; or
- multiple source IDs for a system represented by multiple catalog entries.

HPA-433 does not know Galaxy system IDs and does not own this mapping. HPA-435 owns the explicit observer-system-to-source-star-ID mapping and passes the resulting IDs.

### 6.6 Exclusions affect primary and reference differently

A valid observer-source star is:

- omitted from the transformed primary catalog;
- recorded as a primary omission with reason `observer-source-star-excluded`; and
- retained at original Sol-relative coordinates in the optional reference catalog.

This intentionally allows the reference layer to show the familiar Earth/Sol constellation vertex while the alien primary layer removes the local observer-system representation.

Coordinate-invalid source stars remain omitted from both roles.

### 6.7 Prepared top-level stars are authoritative

Alternate integration must pass matched prepared collections directly:

```ts
renderer.initialize(
    primaryCatalog.stars,
    primaryCatalog.constellations,
    skyConfig,
);
```

The optional reference layer likewise consumes:

```ts
referenceCatalog.stars
referenceCatalog.constellations
```

Consumers must not rebuild either top-level list by flat-mapping constellation memberships.

The internal preparation pass is not equivalent to consumer flat-mapping. It:

- traverses memberships deterministically;
- canonicalizes by ID;
- transforms each canonical record at most once;
- applies role-specific inclusion masks;
- preserves first-appearance order; and
- appends synthetic Sol only to the primary top-level list.

### 6.8 Synthetic Sol ID is reserved

```ts
export const SYNTHETIC_SOL_STAR_ID = "sol" as const;
```

No source star may use this ID. The implementation tests must pin that the production constellation catalog contains no source `sol` ID.

If a future source catalog needs that ID, the synthetic ID or result contract must be revised before shipping. Duplicate stable IDs in one top-level catalog are prohibited.

### 6.9 Line tuples require a defensive source guard

The source type permits arbitrary `number[]` entries, while prepared output exposes exact index tuples.

A usable source line must:

- contain exactly two entries;
- contain integer indices; and
- reference indices within the original local source-star array.

Malformed or out-of-range entries are skipped. HPA-433 does not emit line diagnostics.

## 7. Public API

Add:

```text
src/lib/constellation/observerCatalog.ts
```

### 7.1 Constants

```ts
export const SYNTHETIC_SOL_STAR_ID = "sol" as const;
export const SYNTHETIC_SOL_RENDER_MAGNITUDE = 0;
export const SYNTHETIC_SOL_COLOR = "#FFF4E8";
```

The magnitude and color are compatibility fields, not photometric or visibility guarantees.

HPA-434 must render synthetic Sol through marker-specific styling. It must not rely on ordinary `magnitudeToSize()` because magnitude `0` produces a large distance-independent source-star point.

### 7.2 Options

```ts
export interface ObserverCatalogOptions {
    readonly includeReferenceCatalog?: boolean;
    readonly observerSourceStarIds?: readonly string[];
}
```

Semantics:

- `includeReferenceCatalog` defaults to `false`.
- `observerSourceStarIds` defaults to an empty list.
- duplicate option IDs are treated as one exclusion internally;
- option order does not affect output ordering; and
- unknown option IDs have no effect.

HPA-435 must test that every configured mapping ID exists in the full source constellation catalog.

### 7.3 Prepared stars

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

The predicate must use the value discriminator:

```ts
return star.marker?.kind === "synthetic-sol";
```

Consumers must not depend on `"marker" in star`, because optional `undefined` properties are omitted by JSON serialization.

### 7.4 Prepared constellations

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

Every prepared constellation is fresh and preserves:

- ID;
- name;
- abbreviation;
- description;
- mythology;
- visibility values; and
- `bestMonths` values.

A role retains a constellation even when all of its stars are omitted. That prepared constellation has empty `stars` and `lines`.

### 7.5 Catalog roles

```ts
export interface PreparedConstellationCatalog {
    readonly stars: readonly PreparedCatalogStar[];
    readonly constellations: readonly PreparedConstellation[];
}
```

Roles:

- **Transformed catalog:** observer-relative non-excluded source stars; no synthetic Sol.
- **Alternate primary catalog:** transformed catalog stars followed by synthetic Sol.
- **Reference catalog:** original-coordinate source stars accepted by the reference mask; no synthetic Sol.

Primary and reference constellation topology may differ when observer-source stars are retained only in the reference role.

### 7.6 Omission diagnostics

```ts
export type CatalogStarOmissionReason =
    | {
          readonly code: "observer-source-star-excluded";
      }
    | {
          readonly code: "coordinate-transform-failed";
          readonly error: CoordinateTransformError;
      };

export interface OmittedStarMembership {
    readonly constellationId: string;
    readonly originalStarIndex: number;
}

export interface OmittedStarDiagnostic {
    readonly starId: string;
    readonly starName: string;
    readonly memberships: readonly OmittedStarMembership[];
    readonly reason: CatalogStarOmissionReason;
    readonly referenceDisposition: "retained" | "omitted";
}
```

`omittedStars` describes primary omissions.

Rules:

- intentional observer-source exclusion → `referenceDisposition: "retained"`;
- coordinate-transform failure → `referenceDisposition: "omitted"`; and
- one diagnostic exists per omitted canonical source ID.

Diagnostics follow canonical first-appearance order with successful primary stars skipped.

### 7.7 Result types

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

## 8. Public operations

### 8.1 Transform ordinary catalog data

```ts
export function transformCatalogToObserver(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options?: ObserverCatalogOptions,
): CatalogTransformOutput;
```

Product callers must supply the full unfiltered source constellation array.

This function:

- indexes canonical stars and memberships;
- applies observer-source exclusions;
- transforms non-excluded canonical stars;
- produces role-specific top-level stars and constellation topology;
- optionally prepares the reference catalog; and
- returns nonfatal ordered diagnostics.

It does not create synthetic Sol.

### 8.2 Validate excluded observer-source stars

An explicitly excluded canonical star is not transformed into the selected observer frame.

It is validated by running a Sol-origin identity transform:

```ts
transformToObserver(sourcePosition, { x: 0, y: 0, z: 0 });
```

- On success, omit it from primary, retain its original source record in reference when requested, and emit `observer-source-star-excluded`.
- On failure, omit it from both roles and emit `coordinate-transform-failed` with the exact HPA-431 error.

This preserves HPA-431 validation without allowing independently sourced system distance discrepancies to create phantom local stars.

### 8.3 Transform non-excluded stars

For each non-excluded canonical source star, call:

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

On success, create a fresh transformed source star:

```ts
{
    ...source,
    rightAscension: result.value.equatorial.rightAscensionHours,
    declination: result.value.equatorial.declinationDegrees,
    distance: result.value.equatorial.distanceLightYears,
}
```

On failure, omit it from both roles and preserve the exact error under `coordinate-transform-failed`.

### 8.4 Shallow-copy boundary

The current `Star` type contains scalar/string fields, so object spread creates an independent complete record today.

Object spread is shallow. If future `Star` revisions add mutable nested objects or arrays, those fields would be shared unless the preparation contract adds field-specific cloning. Such a type change must update this design and independence tests.

### 8.5 Create synthetic Sol

```ts
export function createSyntheticSol(
    observerPosition: CartesianLightYears,
): TransformResult<SyntheticSolStar>;
```

Required sequence:

```ts
const relativeSol = subtractObserverPosition(
    { x: 0, y: 0, z: 0 },
    observerPosition,
);

if (!relativeSol.ok) return relativeSol;

const equatorial = cartesianToEquatorial(relativeSol.value);
if (!equatorial.ok) return equatorial;
```

The function must not:

- construct a zero-distance equatorial Sol;
- call `transformToObserver()` for Sol;
- add a zero-vector exception; or
- infer marker appearance from magnitude.

A Sol-origin observer correctly returns `undefined-direction`.

### 8.6 Prepare alternate-observer output

```ts
export function prepareAlternateObserverCatalog(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options?: ObserverCatalogOptions,
): AlternateObserverCatalogPreparationResult;
```

Required order:

1. Create synthetic Sol.
2. On failure, return `synthetic-sol-unavailable` without partial catalogs.
3. Transform the ordinary catalog with the same options.
4. Build `primaryCatalog.stars` from transformed source stars followed by synthetic Sol.
5. Reuse the transformed primary constellations.
6. Return optional reference output and diagnostics.

For empty input and a valid non-origin observer:

- primary stars contain exactly synthetic Sol;
- primary constellations are empty;
- diagnostics are empty; and
- requested reference output is independently allocated and empty.

## 9. Canonical traversal and ordering

Index source stars by deterministic first appearance.

For each encountered local star:

- record `{ constellationId, originalStarIndex }`;
- register the record only when its ID is first seen; and
- append later memberships without replacing the canonical record.

Top-level ordering:

- successful primary source stars in canonical order;
- synthetic Sol last;
- reference source stars in canonical order under the reference mask.

Diagnostic ordering:

- append a diagnostic when a canonical source record is omitted from primary;
- append nothing when included; and
- never sort diagnostics separately.

## 10. Role-specific constellation reconstruction

Each input constellation is rebuilt twice when reference output is requested:

- primary reconstruction uses the primary inclusion map;
- reference reconstruction uses the reference inclusion map.

### 10.1 Primary inclusion

Include only canonical source stars whose selected-observer transform succeeds and whose IDs are not explicit observer-source exclusions.

### 10.2 Reference inclusion

Include:

- successful ordinary source stars at original coordinates; and
- valid explicit observer-source exclusions at original coordinates.

Exclude coordinate-invalid source stars.

### 10.3 Line reconstruction

For each role:

1. build an old-index → role-specific new-index map;
2. validate each source line as an exact two-entry integer in-range pair;
3. skip malformed lines;
4. skip segments whose endpoint is absent in that role; and
5. append a fresh remapped tuple when both endpoints exist.

No bridge segment is invented.

Primary and reference lines may therefore differ intentionally around observer-source exclusions.

### 10.4 Fully depleted constellations

A role preserves the constellation object and metadata even when its local stars and lines become empty.

## 11. Reference semantics

The reference catalog is not the current Earth-local visible sky. It is the full unfiltered Sol-observer constellation catalog placed in the same fixed-equatorial frame as the alien primary layer.

This ensures:

- comparison is independent of browser time and geolocation;
- Earth latitude/month filtering does not remove arbitrary comparison constellations;
- the observer’s own familiar source star may remain visible in the reference layer; and
- shape differences are attributable to observer translation and primary exclusions rather than Earth-local visibility rules.

The legacy Earth mode remains responsible for geolocation, month/hemisphere filtering, horizon, and sidereal-time behavior.

## 12. Error semantics

### 12.1 Nonfatal primary omissions

Primary omissions are nonfatal and return diagnostics.

Reasons:

- intentional observer-source exclusion; or
- any HPA-431 coordinate transform failure.

### 12.2 Fatal synthetic-Sol failure

Alternate composition fails before ordinary preparation when synthetic Sol cannot be created.

Expected causes include:

- non-finite observer coordinates;
- Cartesian overflow; and
- origin collision.

No partial primary or reference catalog is returned.

### 12.3 Malformed lines

Malformed line entries are skipped without diagnostics because they are source-topology defects rather than star-coordinate failures.

### 12.4 Unknown observer-source IDs

Unknown option IDs have no effect. HPA-435 mapping tests are responsible for preventing stale or mistyped production mappings.

## 13. Immutability and serializability

The implementation must not mutate:

- the input constellation array;
- any input constellation;
- local star arrays;
- source stars;
- line arrays or line entries;
- visibility objects or `bestMonths`;
- the observer position; or
- option arrays.

Output rules:

- all container arrays are fresh;
- all constellation, visibility, and line-tuple objects are fresh;
- transformed and reference star objects are distinct;
- immutable canonical star records may be shared within one catalog role;
- no `Map`, `Set`, class instance, function, `Date`, Three.js object, cycle, `NaN`, or infinity appears in output; and
- results are deterministic under deep equality and `JSON.stringify()`.

Synthetic marker discrimination must survive a stringify/parse round trip through `marker?.kind`.

## 14. Performance model

Let:

- `U` be unique canonical source stars;
- `M` be total memberships; and
- `L` be line entries.

Time complexity is `O(U + M + L)`. Reference output adds another proportional reconstruction allocation.

Preparation occurs on observer selection change, never per animation frame.

No wall-clock unit threshold is required; the enforceable contract is at most one HPA-431 transform per canonical source star for the chosen validation/transform path.

## 15. HPA-434 renderer handoff

HPA-434 must:

- accept prepared top-level stars and constellations as matched pairs;
- never flat-map prepared constellation memberships to rebuild top-level stars;
- support different primary and reference star sets and topology;
- place both prepared roles in the same fixed-equatorial frame;
- disable per-layer procedural-star fallback for prepared catalogs;
- avoid duplicating any decorative background across primary/reference layers;
- keep ambient decorative points outside catalog hover/selection semantics;
- identify synthetic Sol before ordinary magnitude culling;
- render synthetic Sol through a dedicated marker path or guaranteed culling bypass;
- avoid sizing synthetic Sol through ordinary `magnitudeToSize()` alone;
- widen APIs to readonly prepared shapes or use a narrow boundary adapter; and
- preserve existing Earth-mode behavior.

## 16. HPA-435 integration handoff

HPA-435 must:

- resolve the selected observer system through HPA-432 state;
- pass the full exported unfiltered `constellations` array in alternate mode;
- never call `getVisibleConstellations()` for alien primary/reference preparation;
- own a deterministic mapping from observer system ID to source-star IDs;
- include at least `alpha-centauri → alpha_cen`;
- support zero, one, or multiple source IDs per observer;
- validate every configured source ID exists in the full source constellation catalog;
- pass mapped IDs as `observerSourceStarIds`;
- surface primary omission diagnostics without treating intentional observer-source exclusion as a data corruption error; and
- leave the legacy Earth path unchanged.

## 17. HPA-436 E2E handoff

HPA-436 must include Alpha Centauri as a regression case and verify:

- alien primary mode contains no selectable/rendered `alpha_cen` point;
- the Centaurus primary line topology does not retain the excluded vertex;
- the optional reference layer retains the Earth/Sol `alpha_cen` vertex and appropriate reference line;
- synthetic Sol remains present and focusable;
- no duplicate catalog points arise from membership flattening; and
- prepared layers do not inject duplicated procedural stars.

## 18. Test plan

Add:

```text
src/lib/constellation/__tests__/observerCatalog.fixtures.ts
src/lib/constellation/__tests__/observerCatalog.test.ts
```

Tests are pure Vitest unit tests without DOM or renderer setup.

### 18.1 Sol identity

- Transform representative stars at `{0,0,0}` with no exclusions.
- Assert RA/declination/distance within HPA-431 tolerances.
- Preserve IDs, names, magnitude, spectral class, color, and extra flat fixture metadata.
- Preserve constellation visibility values in fresh objects.
- Return no synthetic Sol from ordinary transformation.

### 18.2 Nearby observer

- Reuse or mirror HPA-431 nearby-observer fixtures.
- Assert transformed directions, normalized RA, and distance.

### 18.3 Alpha Centauri production mismatch regression

Use:

- source star `alpha_cen` at `14.66h`, `-60.834°`, `4.37 ly`; and
- the current Galaxy Alpha Centauri observer vector.

Assert:

- without explicit exclusion, the source would transform to approximately `0.1235 ly` rather than trigger the `1e-12 ly` collision guard;
- with `observerSourceStarIds: ["alpha_cen"]`, primary top-level stars omit it;
- primary Centaurus membership and touching lines omit it;
- one diagnostic has `observer-source-star-excluded` and `referenceDisposition: "retained"`;
- reference top-level stars retain original `alpha_cen`; and
- reference Centaurus topology retains its valid source connection.

### 18.4 Multiple and unknown exclusions

- Duplicate exclusion IDs do not duplicate diagnostics.
- Multiple IDs can be excluded.
- Unknown IDs have no output effect.
- Exclusion option order does not change canonical output order.

### 18.5 Invalid excluded source star

- Explicitly exclude a coordinate-invalid source star.
- Its Sol-identity validation fails.
- Diagnostic uses `coordinate-transform-failed`.
- `referenceDisposition` is `omitted`.
- It appears in neither catalog role.

### 18.6 Synthetic Sol

- Verify Cartesian-origin subtraction and expected reverse conversion.
- Verify stable ID, fallback name, class, finite compatibility magnitude, color, and marker.
- Verify Sol-origin failure.
- Verify marker predicate and JSON round trip.

### 18.7 Canonical identity and ordering

- First occurrence wins conflicting duplicate records.
- Duplicate membership yields one top-level source star.
- Memberships and diagnostics follow deterministic order.
- Synthetic Sol is last only in primary composition.

### 18.8 Role-specific line reconstruction

- Preserve valid no-omission lines exactly by value and order.
- Skip malformed length, non-integer, and out-of-range entries.
- Remap after middle-star omission.
- Do not invent bridges.
- Verify primary/reference topology differs correctly around an observer-source exclusion.

### 18.9 Fully depleted constellations

- Retain constellation identity and metadata.
- Return empty role-local stars and lines.
- Leave unrelated constellations unchanged.

### 18.10 Full unfiltered source contract

- Fixture with constellations that would be excluded by Earth latitude/month logic still appears when passed to preparation.
- HPA-433 itself performs no visibility filtering.

### 18.11 Empty input

- Ordinary transform returns empty transformed/reference catalogs as requested.
- Alternate composition returns only synthetic Sol in primary for a valid observer.

### 18.12 Reference independence

- Reference stars retain original coordinates.
- Observer-source exclusions are reference-retained.
- Transform-invalid stars are omitted from both.
- Primary/reference objects and arrays are independent.

### 18.13 Reserved ID

- Production source constellation members contain no `SYNTHETIC_SOL_STAR_ID`.
- Synthetic Sol occurs exactly once in primary output.

### 18.14 Immutability, determinism, and serialization

- Deep-freeze all inputs.
- Assert no mutation errors.
- Assert repeated preparation deep equality.
- Assert JSON-safe output and value-based marker discrimination.

### 18.15 Dependency boundary

- Catalog module imports no Three.js, Svelte, Astro, route state, Galaxy data, Earth astronomy helper, localization, or renderer code.

## 19. Acceptance-criteria mapping

| Requirement | Mechanism |
| --- | --- |
| Deterministic, serializable output | Ordered canonical traversal and plain JSON-safe values |
| Immutable source | Fresh role containers and frozen-input tests |
| Stable identity | Canonical ID map and first-record-wins |
| Observer’s own catalog star is not rendered as a phantom neighbor | Caller-supplied `observerSourceStarIds` and primary exclusion |
| Earth/Sol comparison retains the familiar observer star | Reference-retained intentional exclusions |
| Alien mode is not Earth-season filtered | Full unfiltered constellation input contract |
| Synthetic Sol uses correct math | Origin subtraction followed by reverse conversion |
| No zero-distance exception | Sol-origin marker creation fails normally |
| Invalid source star does not fail whole catalog | Ordered primary diagnostics |
| Lines remain correct after omissions | Independent role-specific old→new maps |
| Renderer receives synthetic Sol exactly once | Authoritative primary top-level stars; no flat-map |
| Prepared comparison remains deterministic | No per-layer procedural fallback |
| Pure catalog/data PR | No renderer, route, component, or localization implementation |

## 20. Risks and mitigations

### Risk: independently sourced observer and catalog distances create phantom local stars

**Mitigation:** explicit observer-source identity mapping and primary-only exclusion. Do not use proximity thresholds.

### Risk: caller passes Earth-visible subset

**Mitigation:** product contract requires the full exported unfiltered constellation array; HPA-435 tests the call boundary.

### Risk: reference and primary masks hide meaningful comparison

**Mitigation:** valid observer-source exclusions remain in reference while disappearing from primary; role topology is reconstructed independently.

### Risk: prepared stars are rebuilt by membership flattening

**Mitigation:** top-level prepared arrays are authoritative; HPA-434 integration tests prohibit flat-map reconstruction.

### Risk: procedural points contaminate comparison

**Mitigation:** disable prepared-layer fallback; keep any decorative background as one independent non-catalog layer.

### Risk: synthetic Sol is hidden or visually misleading

**Mitigation:** marker-specific culling bypass and style; do not use compatibility magnitude or ordinary size mapping as the primary visual contract.

### Risk: unchanged Earth magnitude appears physically inaccurate

**Mitigation:** explicitly label photometry as approximate and defer distance-modulus/culling decisions to a focused follow-up.

### Risk: future nested metadata violates independence

**Mitigation:** document shallow-copy semantics and require field-specific cloning when the source type gains mutable nested fields.

### Risk: orphan stars never appear

**Mitigation:** record the constellation-member-only source boundary; future work may export a first-class top-level source catalog.

## 21. Implementation boundary

Expected implementation files:

```text
src/lib/constellation/observerCatalog.ts
src/lib/constellation/__tests__/observerCatalog.fixtures.ts
src/lib/constellation/__tests__/observerCatalog.test.ts
docs/superpowers/specs/2026-08-01-hpa-433-observer-catalog-and-synthetic-sol-design.md
docs/superpowers/plans/2026-08-01-hpa-433-observer-catalog-and-synthetic-sol.md
```

A narrow test-only import of production constellation data is allowed to pin the reserved-ID invariant.

Do not modify in HPA-433 implementation:

- `ConstellationRenderer.ts`;
- `ConstellationWrapper.svelte`;
- `observerRouteState.ts`;
- `src/utils/astronomy.ts`;
- source constellation data;
- global `Star` or `Constellation` interfaces;
- Galaxy data; or
- localization.

## 22. Delivery sequence

After design approval:

1. write the task-by-task TDD implementation plan;
2. define prepared types, options, and diagnostics;
3. implement deterministic canonical indexing;
4. implement observer-source exclusions and Sol-identity validation;
5. implement selected-observer transformation;
6. implement independent primary/reference reconstruction and line repair;
7. implement synthetic Sol and alternate composition;
8. add Alpha Centauri mismatch, full-catalog, reserved-ID, empty-input, and immutability coverage; and
9. verify tests, type checking, lint, build, and diff scope.

HPA-434 and HPA-435 must consume this contract without moving catalog math into renderer or component code.
