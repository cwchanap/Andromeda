# HPA-433 Observer Catalog and Synthetic Sol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the pure observer-catalog preparation layer that transforms the full exported constellation-member graph, supports explicit observer-source exclusions, prepares role-specific primary/reference topology, and creates synthetic Sol through the HPA-431 Cartesian-origin path.

**Architecture:** `observerCatalog.ts` indexes constellation-member stars once by stable ID, applies either observer-frame transformation or identity validation, then rebuilds primary and optional reference catalogs from separate inclusion maps. The module owns no route, Galaxy, renderer, browser, or localization behavior; HPA-435 supplies observer-source IDs and HPA-434 consumes the authoritative prepared star/constellation pairs.

**Tech Stack:** TypeScript 5.8, Vitest 3, Bun, Astro repository aliases (`@/`), existing HPA-431 coordinate API, existing ESLint and Prettier configuration.

## Global Constraints

- Add no Three.js, Svelte, Astro, DOM, browser-global, route-state, Galaxy-data, localization, or `src/utils/astronomy.ts` dependency to `observerCatalog.ts`.
- Import only constellation source types and HPA-431 astronomy types/functions.
- Product callers pass the full exported unfiltered `constellations` array; HPA-433 performs no latitude, hemisphere, month, date, hour-angle, horizon, or sidereal-time filtering.
- Operate only on stars reachable through exported constellation membership. Module-private orphan stars remain outside this slice.
- Treat star ID as canonical identity. First occurrence in input-constellation/local-star order wins coordinates, metadata, top-level order, and diagnostic name.
- Transform each canonical non-excluded source star at most once with `transformToObserver()`.
- Use explicit `observerSourceStarIds`; do not infer observer identity with a geometric proximity threshold.
- Validate an excluded source star with a Sol-origin identity transform. Retain a valid excluded star only in the optional reference catalog.
- Coordinate-invalid stars are omitted from both primary and reference roles with the exact HPA-431 error.
- Preserve source magnitude unchanged. Do not implement distance-modulus correction.
- Build independent primary and reference inclusion maps and line topology; they may differ around valid observer-source exclusions.
- Require each source line to contain exactly two integer, in-range source indices before tuple narrowing. Skip malformed lines without diagnostics.
- Preserve every input constellation in each requested role, including fully depleted constellations with empty `stars` and `lines`.
- Create synthetic Sol only by `subtractObserverPosition({ x: 0, y: 0, z: 0 }, observerPosition)` followed by `cartesianToEquatorial()`.
- Never represent Sol as a zero-distance `EquatorialPosition` and never pass Sol through `transformToObserver()`.
- Reserve source ID `sol` for `SYNTHETIC_SOL_STAR_ID`; production constellation members must not use it.
- Treat each prepared catalog's top-level `stars` array as authoritative. Consumers must not rebuild it by flattening constellation membership.
- Keep all output deterministic, JSON-safe, and composed only of plain objects and arrays with finite numbers.
- Do not mutate source constellations, source stars, line arrays, visibility arrays, observer coordinates, or option arrays.
- Object spread is intentionally shallow under the current flat `Star` shape. Do not add generic deep cloning.
- Do not modify renderer, wrapper, route, Galaxy, source catalog, global constellation types, or localization files in this implementation.

---

## File Structure

### Create

- `src/lib/constellation/observerCatalog.ts`
  - Public constants/types, canonical indexing, role preparation, diagnostics, line reconstruction, synthetic Sol, and alternate composition.
- `src/lib/constellation/__tests__/observerCatalog.fixtures.ts`
  - Small deterministic constellation graphs, Alpha Centauri production-mismatch fixture, invalid inputs, and fixture builders.
- `src/lib/constellation/__tests__/observerCatalog.test.ts`
  - Pure Vitest coverage for every public operation and design invariant.

### Modify only if needed for fixture reuse

- `src/lib/astronomy/__tests__/observerTransform.fixtures.ts`
  - Import-only/export-only adjustment is allowed if the implementation tests need an existing immutable HPA-431 fixture that is not already exported. Do not alter any coordinate value or tolerance.

### Explicitly unchanged

- `src/types/constellation.ts`
- `src/data/constellations.ts`
- `src/lib/astronomy/observerTransform.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/observerRouteState.ts`
- `src/components/ConstellationWrapper.svelte`
- `src/components/GalaxyWrapper.svelte`
- `src/utils/astronomy.ts`
- `src/lib/galaxy/LocalGalaxy.ts`
- `src/i18n/*`

---

### Task 1: Add the public observer-catalog contract and deterministic fixtures

**Files:**
- Create: `src/lib/constellation/observerCatalog.ts`
- Create: `src/lib/constellation/__tests__/observerCatalog.fixtures.ts`
- Create: `src/lib/constellation/__tests__/observerCatalog.test.ts`

**Interfaces:**
- Consumes:
  - `Star`, `Constellation` from `@/types/constellation`
  - `CartesianLightYears`, `CoordinateTransformError`, `TransformResult<T>` from `@/lib/astronomy/observerTransform`
- Produces:
  - `SYNTHETIC_SOL_STAR_ID`
  - `SYNTHETIC_SOL_RENDER_MAGNITUDE`
  - `SYNTHETIC_SOL_COLOR`
  - `ObserverCatalogOptions`
  - `PreparedSourceStar`
  - `SyntheticSolStar`
  - `PreparedCatalogStar`
  - `PreparedConstellation`
  - `PreparedConstellationCatalog`
  - `CatalogStarOmissionReason`
  - `OmittedStarMembership`
  - `OmittedStarDiagnostic`
  - `CatalogTransformOutput`
  - `AlternateObserverCatalogOutput`
  - `AlternateObserverCatalogPreparationResult`
  - `isSyntheticSolStar(star)`
- Consumed later by Tasks 2–6.

- [ ] **Step 1: Create deterministic fixture builders**

Create `src/lib/constellation/__tests__/observerCatalog.fixtures.ts`:

```ts
import type { Constellation, Star } from "@/types/constellation";
import type { CartesianLightYears } from "@/lib/astronomy/observerTransform";

export const SOL_OBSERVER: CartesianLightYears = Object.freeze({
    x: 0,
    y: 0,
    z: 0,
});

export const ALPHA_CENTAURI_OBSERVER: CartesianLightYears = Object.freeze({
    x: -1.5873472912565585,
    y: -3.708309014350326,
    z: -1.327228345473596,
});

export function makeStar(
    overrides: Partial<Star> & Pick<Star, "id">,
): Star {
    return {
        id: overrides.id,
        name: overrides.name ?? overrides.id,
        rightAscension: overrides.rightAscension ?? 0,
        declination: overrides.declination ?? 0,
        magnitude: overrides.magnitude ?? 2,
        distance: overrides.distance ?? 10,
        spectralClass: overrides.spectralClass ?? "G2V",
        color: overrides.color ?? "#FFF4E8",
    };
}

export function makeConstellation(input: {
    readonly id: string;
    readonly stars: readonly Star[];
    readonly lines?: readonly (readonly number[])[];
    readonly hemisphere?: "northern" | "southern" | "both";
}): Constellation {
    return {
        id: input.id,
        name: input.id,
        abbreviation: input.id.slice(0, 3),
        description: `${input.id} description`,
        mythology: `${input.id} mythology`,
        stars: [...input.stars],
        lines: (input.lines ?? []).map((line) => [...line]),
        visibility: {
            hemisphere: input.hemisphere ?? "both",
            bestMonths: [1, 2, 3],
            minLatitude: -90,
            maxLatitude: 90,
        },
    };
}

export const ALPHA_CENTAURI_CATALOG_STAR = makeStar({
    id: "alpha_cen",
    name: "Alpha Centauri",
    rightAscension: 14.66,
    declination: -60.834,
    magnitude: -0.27,
    distance: 4.37,
    spectralClass: "G2V",
});

export const BETA_CENTAURI_CATALOG_STAR = makeStar({
    id: "beta_cen",
    name: "Hadar",
    rightAscension: 14.064,
    declination: -60.373,
    magnitude: 0.61,
    distance: 390,
    spectralClass: "B1III",
});

export const CENTAURUS_FIXTURE = makeConstellation({
    id: "centaurus",
    stars: [ALPHA_CENTAURI_CATALOG_STAR, BETA_CENTAURI_CATALOG_STAR],
    lines: [[0, 1]],
    hemisphere: "southern",
});
```

- [ ] **Step 2: Write the failing public-contract test**

Create `src/lib/constellation/__tests__/observerCatalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
    SYNTHETIC_SOL_COLOR,
    SYNTHETIC_SOL_RENDER_MAGNITUDE,
    SYNTHETIC_SOL_STAR_ID,
    isSyntheticSolStar,
    type PreparedSourceStar,
    type SyntheticSolStar,
} from "@/lib/constellation/observerCatalog";
import { makeStar } from "./observerCatalog.fixtures";

describe("observerCatalog public contract", () => {
    it("uses a value-based synthetic-Sol discriminator", () => {
        const source = makeStar({ id: "source" }) as PreparedSourceStar;
        const sol: SyntheticSolStar = {
            ...makeStar({ id: SYNTHETIC_SOL_STAR_ID, name: "Sol" }),
            id: SYNTHETIC_SOL_STAR_ID,
            magnitude: SYNTHETIC_SOL_RENDER_MAGNITUDE,
            color: SYNTHETIC_SOL_COLOR,
            marker: { kind: "synthetic-sol" },
        };

        expect(isSyntheticSolStar(source)).toBe(false);
        expect(isSyntheticSolStar(sol)).toBe(true);
        expect(SYNTHETIC_SOL_STAR_ID).toBe("sol");
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "uses a value-based synthetic-Sol discriminator"
```

Expected: FAIL because `@/lib/constellation/observerCatalog` does not exist.

- [ ] **Step 4: Add the public types, constants, and predicate**

Create `src/lib/constellation/observerCatalog.ts` with this contract:

```ts
import type { Constellation, Star } from "@/types/constellation";
import type {
    CartesianLightYears,
    CoordinateTransformError,
    TransformResult,
} from "@/lib/astronomy/observerTransform";

export const SYNTHETIC_SOL_STAR_ID = "sol" as const;
export const SYNTHETIC_SOL_RENDER_MAGNITUDE = 0;
export const SYNTHETIC_SOL_COLOR = "#FFF4E8";

export interface ObserverCatalogOptions {
    readonly includeReferenceCatalog?: boolean;
    readonly observerSourceStarIds?: readonly string[];
}

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

export interface PreparedConstellationCatalog {
    readonly stars: readonly PreparedCatalogStar[];
    readonly constellations: readonly PreparedConstellation[];
}

export type CatalogStarOmissionReason =
    | { readonly code: "observer-source-star-excluded" }
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
    | { readonly ok: true; readonly value: AlternateObserverCatalogOutput }
    | {
          readonly ok: false;
          readonly error: {
              readonly code: "synthetic-sol-unavailable";
              readonly cause: CoordinateTransformError;
          };
      };

export function isSyntheticSolStar(
    star: PreparedCatalogStar,
): star is SyntheticSolStar {
    return star.marker?.kind === "synthetic-sol";
}

// Public operations are added in later tasks.
export declare function transformCatalogToObserver(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options?: ObserverCatalogOptions,
): CatalogTransformOutput;

export declare function createSyntheticSol(
    observerPosition: CartesianLightYears,
): TransformResult<SyntheticSolStar>;

export declare function prepareAlternateObserverCatalog(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options?: ObserverCatalogOptions,
): AlternateObserverCatalogPreparationResult;
```

Do not leave the `declare` stubs after Task 2 begins; they are only the red/green scaffold for this first contract commit.

- [ ] **Step 5: Run the focused test and type-check the file**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "uses a value-based synthetic-Sol discriminator"
bun run type-check
```

Expected: the focused test passes and type-check exits `0`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.fixtures.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
git commit -m "feat(constellation): define observer catalog contract"
```

---

### Task 2: Transform canonical source stars and build happy-path catalog roles

**Files:**
- Modify: `src/lib/constellation/observerCatalog.ts`
- Modify: `src/lib/constellation/__tests__/observerCatalog.test.ts`

**Interfaces:**
- Consumes: Task 1 public types and fixture builders.
- Produces:
  - `transformCatalogToObserver(sourceConstellations, observerPosition, options)`
  - Deterministic canonical first-appearance ordering.
  - Sol-origin identity behavior.
  - Optional independent reference star objects.
- Task 3 replaces the initial line-copy implementation with omission-safe remapping.

- [ ] **Step 1: Add shared test helpers and happy-path tests**

Append to `observerCatalog.test.ts`:

```ts
import {
    transformCatalogToObserver,
    type PreparedSourceStar,
} from "@/lib/constellation/observerCatalog";
import {
    ALPHA_CENTAURI_OBSERVER,
    SOL_OBSERVER,
    makeConstellation,
    makeStar,
} from "./observerCatalog.fixtures";

function starById(
    stars: readonly PreparedSourceStar[],
    id: string,
): PreparedSourceStar {
    const star = stars.find((candidate) => candidate.id === id);
    expect(star).toBeDefined();
    return star!;
}

describe("transformCatalogToObserver happy path", () => {
    it("identity-transforms ordinary stars for a Sol observer", () => {
        const source = makeStar({
            id: "identity",
            rightAscension: 23.5,
            declination: -25,
            distance: 42,
            magnitude: 1.25,
        });
        const constellation = makeConstellation({
            id: "identity-constellation",
            stars: [source],
        });

        const result = transformCatalogToObserver(
            [constellation],
            SOL_OBSERVER,
            { includeReferenceCatalog: true },
        );
        const transformed = starById(
            result.transformedCatalog.stars as readonly PreparedSourceStar[],
            "identity",
        );

        expect(transformed.rightAscension).toBeCloseTo(23.5, 10);
        expect(transformed.declination).toBeCloseTo(-25, 10);
        expect(transformed.distance).toBeCloseTo(42, 10);
        expect(transformed.magnitude).toBe(1.25);
        expect(result.omittedStars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([source]);
        expect(result.referenceCatalog?.stars[0]).not.toBe(source);
        expect(result.referenceCatalog?.stars[0]).not.toBe(transformed);
    });

    it("uses first occurrence as canonical and preserves top-level order", () => {
        const firstA = makeStar({ id: "a", distance: 10, name: "first-a" });
        const conflictingA = makeStar({
            id: "a",
            distance: 20,
            name: "second-a",
        });
        const b = makeStar({ id: "b", rightAscension: 6, distance: 12 });
        const source = [
            makeConstellation({ id: "one", stars: [firstA, b] }),
            makeConstellation({ id: "two", stars: [conflictingA] }),
        ];

        const result = transformCatalogToObserver(source, SOL_OBSERVER);

        expect(result.transformedCatalog.stars.map((star) => star.id)).toEqual([
            "a",
            "b",
        ]);
        expect(result.transformedCatalog.stars[0].name).toBe("first-a");
        expect(result.transformedCatalog.stars[0].distance).toBeCloseTo(10, 10);
        expect(result.transformedCatalog.constellations[1].stars[0]).toBe(
            result.transformedCatalog.stars[0],
        );
    });

    it("transforms a nearby observer without changing magnitude", () => {
        const source = makeStar({
            id: "target",
            rightAscension: 0,
            declination: 0,
            distance: 10,
            magnitude: -1,
        });
        const result = transformCatalogToObserver(
            [makeConstellation({ id: "nearby", stars: [source] })],
            ALPHA_CENTAURI_OBSERVER,
        );
        const transformed = result.transformedCatalog.stars[0];

        expect(transformed.distance).not.toBe(source.distance);
        expect(transformed.rightAscension).toBeGreaterThanOrEqual(0);
        expect(transformed.rightAscension).toBeLessThan(24);
        expect(transformed.magnitude).toBe(-1);
    });
});
```

- [ ] **Step 2: Run the happy-path tests to verify they fail**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "transformCatalogToObserver happy path"
```

Expected: FAIL because the Task 1 declarations have no runtime implementation.

- [ ] **Step 3: Replace declarations with canonical-indexing helpers**

Add these imports and internal helpers to `observerCatalog.ts`:

```ts
import {
    transformToObserver,
    type EquatorialPosition,
} from "@/lib/astronomy/observerTransform";

const SOL_ORIGIN: CartesianLightYears = { x: 0, y: 0, z: 0 };

interface CanonicalStarEntry {
    readonly source: Star;
    readonly memberships: OmittedStarMembership[];
}

interface CanonicalIndex {
    readonly order: readonly string[];
    readonly byId: ReadonlyMap<string, CanonicalStarEntry>;
}

function collectCanonicalStars(
    sourceConstellations: readonly Constellation[],
): CanonicalIndex {
    const order: string[] = [];
    const byId = new Map<string, CanonicalStarEntry>();

    for (const constellation of sourceConstellations) {
        constellation.stars.forEach((source, originalStarIndex) => {
            const membership = {
                constellationId: constellation.id,
                originalStarIndex,
            };
            const existing = byId.get(source.id);
            if (existing) {
                existing.memberships.push(membership);
                return;
            }
            order.push(source.id);
            byId.set(source.id, {
                source,
                memberships: [membership],
            });
        });
    }

    return { order, byId };
}

function toEquatorialPosition(source: Star): EquatorialPosition {
    return {
        rightAscensionHours: source.rightAscension,
        declinationDegrees: source.declination,
        distanceLightYears: source.distance,
    };
}

function cloneSourceStar(source: Star): PreparedSourceStar {
    return { ...source };
}

function cloneTransformedStar(
    source: Star,
    equatorial: EquatorialPosition,
): PreparedSourceStar {
    return {
        ...source,
        rightAscension: equatorial.rightAscensionHours,
        declination: equatorial.declinationDegrees,
        distance: equatorial.distanceLightYears,
    };
}
```

- [ ] **Step 4: Add the initial catalog reconstruction and transform loop**

Use this first version; Task 3 replaces line handling with role-specific remapping:

```ts
function cloneVisibility(
    visibility: Constellation["visibility"],
): PreparedConstellation["visibility"] {
    return {
        ...visibility,
        bestMonths: [...visibility.bestMonths],
    };
}

function buildCatalogWithoutOmissions(
    sourceConstellations: readonly Constellation[],
    canonicalOrder: readonly string[],
    preparedById: ReadonlyMap<string, PreparedSourceStar>,
): PreparedConstellationCatalog {
    return {
        stars: canonicalOrder.flatMap((id) => {
            const star = preparedById.get(id);
            return star ? [star] : [];
        }),
        constellations: sourceConstellations.map((source) => ({
            ...source,
            stars: source.stars.flatMap((star) => {
                const prepared = preparedById.get(star.id);
                return prepared ? [prepared] : [];
            }),
            lines: source.lines
                .filter((line) => line.length === 2)
                .map(([start, end]) => [start, end] as const),
            visibility: cloneVisibility(source.visibility),
        })),
    };
}

export function transformCatalogToObserver(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options: ObserverCatalogOptions = {},
): CatalogTransformOutput {
    const canonical = collectCanonicalStars(sourceConstellations);
    const transformedById = new Map<string, PreparedSourceStar>();
    const referenceById = new Map<string, PreparedSourceStar>();
    const omittedStars: OmittedStarDiagnostic[] = [];

    for (const id of canonical.order) {
        const entry = canonical.byId.get(id)!;
        const result = transformToObserver(
            toEquatorialPosition(entry.source),
            observerPosition,
        );
        if (!result.ok) {
            omittedStars.push({
                starId: id,
                starName: entry.source.name,
                memberships: [...entry.memberships],
                reason: {
                    code: "coordinate-transform-failed",
                    error: result.error,
                },
                referenceDisposition: "omitted",
            });
            continue;
        }

        transformedById.set(
            id,
            cloneTransformedStar(entry.source, result.value.equatorial),
        );
        if (options.includeReferenceCatalog) {
            referenceById.set(id, cloneSourceStar(entry.source));
        }
    }

    return {
        transformedCatalog: buildCatalogWithoutOmissions(
            sourceConstellations,
            canonical.order,
            transformedById,
        ),
        referenceCatalog: options.includeReferenceCatalog
            ? buildCatalogWithoutOmissions(
                  sourceConstellations,
                  canonical.order,
                  referenceById,
              )
            : undefined,
        omittedStars,
    };
}
```

Remove the Task 1 `declare function transformCatalogToObserver` declaration.

- [ ] **Step 5: Run the focused tests**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "transformCatalogToObserver happy path"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
git commit -m "feat(constellation): transform canonical observer catalog stars"
```

---

### Task 3: Add coordinate-failure diagnostics and role-safe topology reconstruction

**Files:**
- Modify: `src/lib/constellation/observerCatalog.ts`
- Modify: `src/lib/constellation/__tests__/observerCatalog.fixtures.ts`
- Modify: `src/lib/constellation/__tests__/observerCatalog.test.ts`

**Interfaces:**
- Consumes: Task 2 canonical transform maps and diagnostics.
- Produces:
  - Exact-pair line guard.
  - Old-index → role-index remapping.
  - Coordinate-invalid omission from both roles.
  - Fully depleted constellation preservation.
- Task 4 reuses this reconstruction with different primary/reference masks.

- [ ] **Step 1: Add failing omission and line-repair tests**

Append:

```ts
describe("coordinate omissions and line reconstruction", () => {
    it("remaps surviving lines without inventing a bridge", () => {
        const a = makeStar({ id: "a", distance: 10 });
        const b = makeStar({ id: "b", distance: 0 });
        const c = makeStar({ id: "c", rightAscension: 6, distance: 10 });
        const d = makeStar({ id: "d", rightAscension: 12, distance: 10 });
        const source = makeConstellation({
            id: "line-repair",
            stars: [a, b, c, d],
            lines: [
                [0, 1],
                [1, 2],
                [2, 3],
                [0, 3],
            ],
        });

        const result = transformCatalogToObserver(
            [source],
            SOL_OBSERVER,
            { includeReferenceCatalog: true },
        );

        expect(result.transformedCatalog.constellations[0].stars.map((s) => s.id))
            .toEqual(["a", "c", "d"]);
        expect(result.transformedCatalog.constellations[0].lines).toEqual([
            [1, 2],
            [0, 2],
        ]);
        expect(result.referenceCatalog?.constellations[0].lines).toEqual([
            [1, 2],
            [0, 2],
        ]);
        expect(result.omittedStars).toEqual([
            {
                starId: "b",
                starName: "b",
                memberships: [
                    { constellationId: "line-repair", originalStarIndex: 1 },
                ],
                reason: {
                    code: "coordinate-transform-failed",
                    error: { code: "invalid-distance", distanceLightYears: 0 },
                },
                referenceDisposition: "omitted",
            },
        ]);
    });

    it("skips malformed lines before narrowing them to tuples", () => {
        const stars = [makeStar({ id: "a" }), makeStar({ id: "b" })];
        const source = makeConstellation({
            id: "malformed-lines",
            stars,
            lines: [
                [0, 1],
                [0],
                [0, 1, 0],
                [0.5, 1],
                [-1, 1],
                [0, 2],
            ],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER);

        expect(result.transformedCatalog.constellations[0].lines).toEqual([
            [0, 1],
        ]);
    });

    it("retains a fully depleted constellation", () => {
        const source = makeConstellation({
            id: "depleted",
            stars: [makeStar({ id: "bad", distance: -1 })],
            lines: [[0, 0]],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER);

        expect(result.transformedCatalog.constellations).toHaveLength(1);
        expect(result.transformedCatalog.constellations[0]).toMatchObject({
            id: "depleted",
            stars: [],
            lines: [],
        });
        expect(result.transformedCatalog.constellations[0].visibility).not.toBe(
            source.visibility,
        );
    });
});
```

- [ ] **Step 2: Run the tests to verify the naïve line copy fails**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "coordinate omissions and line reconstruction"
```

Expected: FAIL because the Task 2 implementation leaves stale line indices after omission and does not enforce integer/in-range endpoints.

- [ ] **Step 3: Replace the initial builder with guarded role reconstruction**

Replace `buildCatalogWithoutOmissions()` with:

```ts
function isUsableSourceLine(
    line: readonly number[],
    sourceStarCount: number,
): line is readonly [number, number] {
    if (line.length !== 2) return false;
    const [start, end] = line;
    return (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 0 &&
        end >= 0 &&
        start < sourceStarCount &&
        end < sourceStarCount
    );
}

function buildPreparedCatalog(
    sourceConstellations: readonly Constellation[],
    canonicalOrder: readonly string[],
    preparedById: ReadonlyMap<string, PreparedSourceStar>,
): PreparedConstellationCatalog {
    return {
        stars: canonicalOrder.flatMap((id) => {
            const star = preparedById.get(id);
            return star ? [star] : [];
        }),
        constellations: sourceConstellations.map((source) => {
            const stars: PreparedSourceStar[] = [];
            const oldToNew = new Map<number, number>();

            source.stars.forEach((sourceStar, oldIndex) => {
                const prepared = preparedById.get(sourceStar.id);
                if (!prepared) return;
                oldToNew.set(oldIndex, stars.length);
                stars.push(prepared);
            });

            const lines: (readonly [number, number])[] = [];
            for (const sourceLine of source.lines) {
                if (!isUsableSourceLine(sourceLine, source.stars.length)) {
                    continue;
                }
                const [oldStart, oldEnd] = sourceLine;
                const newStart = oldToNew.get(oldStart);
                const newEnd = oldToNew.get(oldEnd);
                if (newStart === undefined || newEnd === undefined) continue;
                lines.push([newStart, newEnd]);
            }

            return {
                ...source,
                stars,
                lines,
                visibility: cloneVisibility(source.visibility),
            };
        }),
    };
}
```

Update both calls in `transformCatalogToObserver()` to use `buildPreparedCatalog()`.

- [ ] **Step 4: Run the focused and prior tests**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "coordinate omissions and line reconstruction|transformCatalogToObserver happy path"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
git commit -m "feat(constellation): repair observer catalog topology"
```

---

### Task 4: Add explicit observer-source exclusions and Alpha Centauri regression coverage

**Files:**
- Modify: `src/lib/constellation/observerCatalog.ts`
- Modify: `src/lib/constellation/__tests__/observerCatalog.test.ts`

**Interfaces:**
- Consumes:
  - `ObserverCatalogOptions.observerSourceStarIds`
  - Task 3 role reconstruction.
- Produces:
  - Identity-driven primary exclusion.
  - Reference retention for valid excluded stars.
  - `observer-source-star-excluded` diagnostics.
  - Role-specific topology around exclusions.
  - Alpha Centauri production-mismatch regression.

- [ ] **Step 1: Add failing Alpha Centauri and exclusion tests**

Append:

```ts
import {
    ALPHA_CENTAURI_CATALOG_STAR,
    ALPHA_CENTAURI_OBSERVER,
    BETA_CENTAURI_CATALOG_STAR,
    CENTAURUS_FIXTURE,
} from "./observerCatalog.fixtures";

describe("observer-source exclusions", () => {
    it("pins the production Alpha Centauri distance mismatch", () => {
        const result = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
        );
        const alpha = result.transformedCatalog.stars.find(
            (star) => star.id === "alpha_cen",
        );

        expect(alpha?.distance).toBeCloseTo(0.1235008239, 9);
    });

    it("omits a valid observer source from primary and retains it in reference", () => {
        const result = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );

        expect(result.transformedCatalog.stars.map((star) => star.id)).toEqual([
            "beta_cen",
        ]);
        expect(result.transformedCatalog.constellations[0].stars.map((star) => star.id))
            .toEqual(["beta_cen"]);
        expect(result.transformedCatalog.constellations[0].lines).toEqual([]);
        expect(result.referenceCatalog?.stars.map((star) => star.id)).toEqual([
            "alpha_cen",
            "beta_cen",
        ]);
        expect(result.referenceCatalog?.constellations[0].lines).toEqual([
            [0, 1],
        ]);
        expect(result.omittedStars).toEqual([
            {
                starId: "alpha_cen",
                starName: "Alpha Centauri",
                memberships: [
                    { constellationId: "centaurus", originalStarIndex: 0 },
                ],
                reason: { code: "observer-source-star-excluded" },
                referenceDisposition: "retained",
            },
        ]);
    });

    it("deduplicates option IDs and ignores unknown IDs", () => {
        const result = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                observerSourceStarIds: [
                    "unknown",
                    "alpha_cen",
                    "alpha_cen",
                ],
            },
        );

        expect(result.omittedStars.map((item) => item.starId)).toEqual([
            "alpha_cen",
        ]);
    });

    it("omits an invalid excluded source from both roles", () => {
        const invalid = makeStar({ id: "invalid-local", distance: 0 });
        const source = makeConstellation({
            id: "invalid-local-constellation",
            stars: [invalid],
        });

        const result = transformCatalogToObserver(
            [source],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["invalid-local"],
            },
        );

        expect(result.transformedCatalog.stars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([]);
        expect(result.omittedStars[0]).toMatchObject({
            reason: {
                code: "coordinate-transform-failed",
                error: { code: "invalid-distance", distanceLightYears: 0 },
            },
            referenceDisposition: "omitted",
        });
    });
});
```

- [ ] **Step 2: Run the exclusion tests to verify they fail**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "observer-source exclusions"
```

Expected: the mismatch test passes under the existing transform, while exclusion behavior fails because `observerSourceStarIds` is not yet applied.

- [ ] **Step 3: Apply exclusions in canonical traversal**

Replace the canonical loop inside `transformCatalogToObserver()` with this structure:

```ts
const excludedIds = new Set(options.observerSourceStarIds ?? []);

for (const id of canonical.order) {
    const entry = canonical.byId.get(id)!;

    if (excludedIds.has(id)) {
        const identity = transformToObserver(
            toEquatorialPosition(entry.source),
            SOL_ORIGIN,
        );
        if (!identity.ok) {
            omittedStars.push({
                starId: id,
                starName: entry.source.name,
                memberships: [...entry.memberships],
                reason: {
                    code: "coordinate-transform-failed",
                    error: identity.error,
                },
                referenceDisposition: "omitted",
            });
            continue;
        }

        if (options.includeReferenceCatalog) {
            referenceById.set(id, cloneSourceStar(entry.source));
        }
        omittedStars.push({
            starId: id,
            starName: entry.source.name,
            memberships: [...entry.memberships],
            reason: { code: "observer-source-star-excluded" },
            referenceDisposition: "retained",
        });
        continue;
    }

    const transformed = transformToObserver(
        toEquatorialPosition(entry.source),
        observerPosition,
    );
    if (!transformed.ok) {
        omittedStars.push({
            starId: id,
            starName: entry.source.name,
            memberships: [...entry.memberships],
            reason: {
                code: "coordinate-transform-failed",
                error: transformed.error,
            },
            referenceDisposition: "omitted",
        });
        continue;
    }

    transformedById.set(
        id,
        cloneTransformedStar(entry.source, transformed.value.equatorial),
    );
    if (options.includeReferenceCatalog) {
        referenceById.set(id, cloneSourceStar(entry.source));
    }
}
```

Do not transform an explicitly excluded star against `observerPosition`; its one HPA-431 call is the Sol-origin validation path.

- [ ] **Step 4: Run all observer-source tests and topology regression tests**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "observer-source exclusions|coordinate omissions and line reconstruction"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
git commit -m "feat(constellation): support observer source exclusions"
```

---

### Task 5: Create synthetic Sol and compose alternate-observer output

**Files:**
- Modify: `src/lib/constellation/observerCatalog.ts`
- Modify: `src/lib/constellation/__tests__/observerCatalog.test.ts`

**Interfaces:**
- Consumes:
  - `subtractObserverPosition()`
  - `cartesianToEquatorial()`
  - Task 4 `transformCatalogToObserver()`.
- Produces:
  - `createSyntheticSol(observerPosition)`
  - `prepareAlternateObserverCatalog(sourceConstellations, observerPosition, options)`
  - Fail-fast `synthetic-sol-unavailable` behavior.
  - Primary top-level synthetic Sol appended exactly once.

- [ ] **Step 1: Add failing synthetic-Sol tests**

Append:

```ts
import {
    createSyntheticSol,
    isSyntheticSolStar,
    prepareAlternateObserverCatalog,
    SYNTHETIC_SOL_STAR_ID,
} from "@/lib/constellation/observerCatalog";

describe("synthetic Sol and alternate composition", () => {
    it("creates Sol through the Cartesian-origin primitive path", () => {
        const result = createSyntheticSol(ALPHA_CENTAURI_OBSERVER);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.id).toBe(SYNTHETIC_SOL_STAR_ID);
        expect(result.value.rightAscension).toBeCloseTo(2.66, 10);
        expect(result.value.declination).toBeCloseTo(60.84, 10);
        expect(result.value.distance).toBeCloseTo(4.2465, 10);
        expect(isSyntheticSolStar(result.value)).toBe(true);
    });

    it("rejects synthetic Sol for a Sol-origin observer", () => {
        expect(createSyntheticSol(SOL_OBSERVER)).toEqual({
            ok: false,
            error: {
                code: "undefined-direction",
                distanceLightYears: 0,
                thresholdLightYears: 1e-12,
            },
        });
    });

    it("appends synthetic Sol once after canonical primary stars", () => {
        const result = prepareAlternateObserverCatalog(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.primaryCatalog.stars.map((star) => star.id)).toEqual([
            "beta_cen",
            "sol",
        ]);
        expect(
            result.value.primaryCatalog.constellations.some((constellation) =>
                constellation.stars.some((star) => star.id === "sol"),
            ),
        ).toBe(false);
        expect(result.value.referenceCatalog?.stars.map((star) => star.id)).toEqual([
            "alpha_cen",
            "beta_cen",
        ]);
    });

    it("returns no partial catalog when synthetic Sol is unavailable", () => {
        expect(
            prepareAlternateObserverCatalog([CENTAURUS_FIXTURE], SOL_OBSERVER, {
                includeReferenceCatalog: true,
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "synthetic-sol-unavailable",
                cause: {
                    code: "undefined-direction",
                    distanceLightYears: 0,
                    thresholdLightYears: 1e-12,
                },
            },
        });
    });

    it("returns only synthetic Sol for empty valid input", () => {
        const result = prepareAlternateObserverCatalog(
            [],
            ALPHA_CENTAURI_OBSERVER,
            { includeReferenceCatalog: true },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.primaryCatalog.stars.map((star) => star.id)).toEqual([
            "sol",
        ]);
        expect(result.value.primaryCatalog.constellations).toEqual([]);
        expect(result.value.referenceCatalog).toEqual({
            stars: [],
            constellations: [],
        });
        expect(result.value.omittedStars).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the synthetic-Sol tests to verify they fail**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "synthetic Sol and alternate composition"
```

Expected: FAIL because Task 1 still contains only declarations for these operations.

- [ ] **Step 3: Implement `createSyntheticSol()`**

Add imports:

```ts
import {
    cartesianToEquatorial,
    subtractObserverPosition,
    transformToObserver,
    type EquatorialPosition,
} from "@/lib/astronomy/observerTransform";
```

Replace the declaration with:

```ts
export function createSyntheticSol(
    observerPosition: CartesianLightYears,
): TransformResult<SyntheticSolStar> {
    const relative = subtractObserverPosition(SOL_ORIGIN, observerPosition);
    if (!relative.ok) return relative;

    const equatorial = cartesianToEquatorial(relative.value);
    if (!equatorial.ok) return equatorial;

    return {
        ok: true,
        value: {
            id: SYNTHETIC_SOL_STAR_ID,
            name: "Sol",
            rightAscension: equatorial.value.rightAscensionHours,
            declination: equatorial.value.declinationDegrees,
            magnitude: SYNTHETIC_SOL_RENDER_MAGNITUDE,
            distance: equatorial.value.distanceLightYears,
            spectralClass: "G2V",
            color: SYNTHETIC_SOL_COLOR,
            marker: { kind: "synthetic-sol" },
        },
    };
}
```

- [ ] **Step 4: Implement fail-fast alternate composition**

Replace the declaration with:

```ts
export function prepareAlternateObserverCatalog(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options: ObserverCatalogOptions = {},
): AlternateObserverCatalogPreparationResult {
    const syntheticSol = createSyntheticSol(observerPosition);
    if (!syntheticSol.ok) {
        return {
            ok: false,
            error: {
                code: "synthetic-sol-unavailable",
                cause: syntheticSol.error,
            },
        };
    }

    const transformed = transformCatalogToObserver(
        sourceConstellations,
        observerPosition,
        options,
    );

    return {
        ok: true,
        value: {
            primaryCatalog: {
                stars: [
                    ...transformed.transformedCatalog.stars,
                    syntheticSol.value,
                ],
                constellations: transformed.transformedCatalog.constellations,
            },
            referenceCatalog: transformed.referenceCatalog,
            omittedStars: transformed.omittedStars,
        },
    };
}
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "synthetic Sol and alternate composition"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
git commit -m "feat(constellation): add synthetic Sol catalog composition"
```

---

### Task 6: Harden production invariants, immutability, ordering, and serialization

**Files:**
- Modify: `src/lib/constellation/__tests__/observerCatalog.test.ts`
- Modify: `src/lib/constellation/__tests__/observerCatalog.fixtures.ts`
- Modify: `src/lib/constellation/observerCatalog.ts` only for defects exposed by these tests.

**Interfaces:**
- Consumes all Task 1–5 public operations.
- Produces final contract evidence for:
  - Production `sol` ID reservation.
  - Full unfiltered source behavior.
  - Canonical diagnostic ordering.
  - Frozen-input safety.
  - Primary/reference object independence.
  - JSON round-trip marker discrimination.
  - Finite serializable failure output.

- [ ] **Step 1: Add a local deep-freeze helper and invariant tests**

Append:

```ts
import { constellations as productionConstellations } from "@/data/constellations";

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
        deepFreeze(nested);
    }
    return Object.freeze(value);
}

describe("observer catalog invariants", () => {
    it("reserves the synthetic Sol ID in production constellation members", () => {
        const sourceIds = productionConstellations.flatMap((constellation) =>
            constellation.stars.map((star) => star.id),
        );
        expect(sourceIds).not.toContain(SYNTHETIC_SOL_STAR_ID);
    });

    it("does not perform Earth visibility filtering", () => {
        const southern = makeConstellation({
            id: "southern-only",
            stars: [makeStar({ id: "south", declination: -70 })],
            hemisphere: "southern",
        });

        const result = transformCatalogToObserver([southern], SOL_OBSERVER);

        expect(result.transformedCatalog.constellations.map((item) => item.id))
            .toEqual(["southern-only"]);
        expect(result.transformedCatalog.stars.map((star) => star.id)).toEqual([
            "south",
        ]);
    });

    it("keeps diagnostics in failed canonical first-appearance order", () => {
        const source = [
            makeConstellation({
                id: "first",
                stars: [
                    makeStar({ id: "valid-a" }),
                    makeStar({ id: "bad-a", distance: 0 }),
                ],
            }),
            makeConstellation({
                id: "second",
                stars: [
                    makeStar({ id: "excluded" }),
                    makeStar({ id: "bad-b", declination: 100 }),
                ],
            }),
        ];

        const result = transformCatalogToObserver(source, SOL_OBSERVER, {
            observerSourceStarIds: ["excluded"],
        });

        expect(result.omittedStars.map((item) => item.starId)).toEqual([
            "bad-a",
            "excluded",
            "bad-b",
        ]);
    });

    it("does not mutate deeply frozen inputs or option arrays", () => {
        const source = deepFreeze([
            makeConstellation({
                id: "frozen",
                stars: [makeStar({ id: "frozen-star" })],
                lines: [[0, 0]],
            }),
        ]);
        const observer = deepFreeze({ ...ALPHA_CENTAURI_OBSERVER });
        const observerSourceStarIds = deepFreeze(["frozen-star"]);

        expect(() =>
            transformCatalogToObserver(source, observer, {
                includeReferenceCatalog: true,
                observerSourceStarIds,
            }),
        ).not.toThrow();
        expect(source[0].stars[0].id).toBe("frozen-star");
        expect(observer).toEqual(ALPHA_CENTAURI_OBSERVER);
        expect(observerSourceStarIds).toEqual(["frozen-star"]);
    });

    it("returns independent primary and reference objects", () => {
        const source = makeConstellation({
            id: "independence",
            stars: [makeStar({ id: "independent" })],
            lines: [[0, 0]],
        });
        const result = transformCatalogToObserver(
            [source],
            ALPHA_CENTAURI_OBSERVER,
            { includeReferenceCatalog: true },
        );

        expect(result.referenceCatalog).toBeDefined();
        expect(result.transformedCatalog.stars[0]).not.toBe(
            result.referenceCatalog!.stars[0],
        );
        expect(result.transformedCatalog.constellations[0]).not.toBe(
            result.referenceCatalog!.constellations[0],
        );
        expect(result.transformedCatalog.constellations[0].visibility).not.toBe(
            result.referenceCatalog!.constellations[0].visibility,
        );
        expect(result.transformedCatalog.constellations[0].lines[0]).not.toBe(
            result.referenceCatalog!.constellations[0].lines[0],
        );
    });

    it("is deterministic and preserves marker discrimination after JSON round trip", () => {
        const first = prepareAlternateObserverCatalog(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );
        const second = prepareAlternateObserverCatalog(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );

        expect(second).toEqual(first);
        const parsed = JSON.parse(JSON.stringify(first)) as typeof first;
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const parsedSol = parsed.value.primaryCatalog.stars.at(-1)!;
        expect(isSyntheticSolStar(parsedSol)).toBe(true);
        expect(
            parsed.value.primaryCatalog.stars
                .slice(0, -1)
                .every((star) => !isSyntheticSolStar(star)),
        ).toBe(true);
    });

    it("serializes non-finite source failures without numeric nulls", () => {
        const result = transformCatalogToObserver(
            [
                makeConstellation({
                    id: "non-finite",
                    stars: [
                        makeStar({
                            id: "nan-ra",
                            rightAscension: Number.NaN,
                        }),
                    ],
                }),
            ],
            SOL_OBSERVER,
        );
        const json = JSON.stringify(result);

        expect(json).not.toContain('"rightAscension":null');
        expect(JSON.parse(json).omittedStars[0].reason).toEqual({
            code: "coordinate-transform-failed",
            error: {
                code: "non-finite-equatorial-input",
                component: "rightAscensionHours",
            },
        });
    });
});
```

- [ ] **Step 2: Run the invariant tests**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts -t "observer catalog invariants"
```

Expected: PASS unless an implementation detail violates immutability or object independence. Fix only the exposed HPA-433 defect; do not broaden scope.

- [ ] **Step 3: Run the entire observer-catalog test file**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 4: Format the new files and rerun the focused suite**

Run:

```bash
bunx prettier --write \
  src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.fixtures.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts
```

Expected: formatter completes and all observer-catalog tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/observerCatalog.ts \
  src/lib/constellation/__tests__/observerCatalog.fixtures.ts \
  src/lib/constellation/__tests__/observerCatalog.test.ts
git commit -m "test(constellation): harden observer catalog invariants"
```

---

## Final Verification

Run every command from a clean working tree after all six task commits.

- [ ] **Focused unit suite**

```bash
bunx vitest run src/lib/constellation/__tests__/observerCatalog.test.ts
```

Expected: all HPA-433 tests pass with zero failures.

- [ ] **Full unit suite**

```bash
bun run test:run
```

Expected: exit `0`, zero failed tests.

- [ ] **Type checking**

```bash
bun run type-check
```

Expected: exit `0`, zero Astro/TypeScript errors.

- [ ] **Lint**

```bash
bun run lint
```

Expected: exit `0`, zero ESLint errors.

- [ ] **Production build**

```bash
bun run build
```

Expected: exit `0` and successful Astro build after `gen:systems` regeneration.

- [ ] **Scope audit**

```bash
git diff --name-only main...HEAD
```

Expected implementation diff is limited to:

```text
src/lib/constellation/observerCatalog.ts
src/lib/constellation/__tests__/observerCatalog.fixtures.ts
src/lib/constellation/__tests__/observerCatalog.test.ts
docs/superpowers/specs/2026-08-01-hpa-433-observer-catalog-and-synthetic-sol-design.md
docs/superpowers/plans/2026-08-01-hpa-433-observer-catalog-and-synthetic-sol.md
```

An import/export-only change to `src/lib/astronomy/__tests__/observerTransform.fixtures.ts` is acceptable only if required for immutable fixture reuse.

- [ ] **Dependency audit**

```bash
rg -n 'from "(three|svelte|astro)|ConstellationRenderer|ConstellationWrapper|observerRouteState|localGalaxyData|utils/astronomy' \
  src/lib/constellation/observerCatalog.ts
```

Expected: no matches.

- [ ] **Contract audit**

Verify from test names and assertions that all of the following are covered:

```text
Sol identity
nearby observer transform
Alpha Centauri 0.1235 ly mismatch
explicit observer-source exclusion
reference retention of valid exclusions
coordinate-invalid omission from both roles
canonical first-record-wins ordering
ordered diagnostics
role-specific line remapping
malformed-line guard
fully depleted constellations
empty input
synthetic Sol primitive path
fatal synthetic-Sol preflight
reserved source ID sol
full unfiltered source behavior
immutability
primary/reference independence
JSON round-trip marker discrimination
finite serializable diagnostics
```

- [ ] **Working-tree audit**

```bash
git status --short
```

Expected: no uncommitted files. Do not create an empty verification commit.
