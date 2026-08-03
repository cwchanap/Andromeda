# HPA-434 Alternate-Observer and Earth-Reference Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `ConstellationRenderer` to render authoritative alternate-observer and optional Sol-reference catalogs in a deterministic fixed-equatorial frame, with a dedicated synthetic Sol marker, primary-only interactions, and complete lifecycle cleanup while preserving the existing Earth-horizontal view.

**Architecture:** Add pure renderer catalog adapters and a placement helper, then introduce one `ConstellationCatalogLayer` per catalog role. `ConstellationRenderer` continues to own the scene, camera, input, preferences, decorative background, Earth guides, callbacks, and animation loop; each layer owns role-specific points, lines, labels, marker resources, hit registries, shader state, and disposal.

**Tech Stack:** TypeScript 5.8, Three.js 0.178, Vitest 3.2, Happy DOM, Astro/Svelte project tooling, Bun scripts.

## Global Constraints

- Consume `primaryCatalog.stars + primaryCatalog.constellations` and `referenceCatalog.stars + referenceCatalog.constellations` as authoritative matched pairs.
- Never reconstruct prepared top-level stars through `constellations.flatMap(...)`.
- Keep primary and reference top-level stars, local constellation stars, and topology independent.
- `initializePreparedCatalogs()` is structurally fixed-equatorial and accepts only `minimumMagnitude`, `showConstellationLines`, and `showStarNames`.
- Fixed-equatorial placement must not receive or read Earth location, timezone, date, hour angle, horizon, or sidereal-time state.
- Earth-horizontal placement delegates to the existing `celestialToSphere()` implementation; do not copy its astronomy formula.
- Finite-coordinate validation applies to both placement contexts; declination-range rejection applies only to fixed-equatorial placement to preserve legacy Earth behavior.
- Reuse `SyntheticSolMarker` and identify marker rendering only with `marker?.kind === "synthetic-sol"`.
- Use `SYNTHETIC_SOL_STAR_ID` in tests and integration code; do not infer rendering behavior from the ID.
- Synthetic Sol bypasses ordinary magnitude culling and does not use `magnitudeToSize()` as its sole size contract.
- Reference is comparison-only: no labels, hover, click, selection, marker construction, or focus authority.
- Catalog point buffers contain catalog records only. The optional 500-point legacy ambience remains a separate scene-level decorative child.
- Ambient points are visible only in Earth-horizontal mode and hidden in fixed-equatorial mode, making prepared output independent of navigation history.
- Reference dash spacing is based on rendered segment distance, not a fixed number of dashes per segment.
- Preserve the existing camera pitch clamp and reduced-motion behavior.
- Repeated serialized initialization must use one RAF chain. Overlapping asynchronous initialization is not supported; callers must await initialization.
- Do not modify `ConstellationWrapper.svelte`, route state, Galaxy data, observer mapping, localization, HPA-431 formulas, HPA-433 preparation logic, or the 2D fallback in this PR.

---

## File Structure

### Create

- `src/lib/constellation/rendererCatalog.ts` — renderer-only readonly types, public prepared settings, and pure prepared/legacy adapters.
- `src/lib/constellation/rendererPlacement.ts` — Earth-horizontal and fixed-equatorial display-sphere placement with typed failures.
- `src/lib/constellation/ConstellationCatalogLayer.ts` — one role-owned Three.js layer for points, lines, markers, labels, interaction registries, shader ticks, and disposal.
- `src/lib/constellation/__tests__/rendererCatalog.test.ts` — adapter and readonly-boundary tests.
- `src/lib/constellation/__tests__/rendererPlacement.test.ts` — placement axes, validation, and Earth-delegation tests.
- `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts` — independent layer geometry, styling, marker, label, warning, and disposal tests.
- `src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts` — shared prepared/legacy renderer fixtures only if duplication in the two renderer suites becomes material.

### Modify

- `src/lib/constellation/ConstellationRenderer.ts` — shared initialization, decorative background, public APIs, primary-only interaction routing, and one-loop orchestration.
- `src/lib/constellation/__tests__/ConstellationRenderer.test.ts` — Earth regressions, prepared integration, mode switching, focus, visibility, and lifecycle coverage.
- `src/test/setup.ts` — extend the Three.js mock only for resources and methods exercised by the new tests.

### Explicitly unchanged

- `src/components/ConstellationWrapper.svelte`
- `src/components/__tests__/ConstellationWrapper.test.ts`
- `src/lib/constellation/observerCatalog.ts`
- `src/lib/constellation/__tests__/observerCatalog.test.ts`
- `src/lib/astronomy/observerTransform.ts`
- source constellation data, global constellation interfaces, routes, Galaxy data, localization, E2E tests, and 2D fallback code

---

### Task 1: Define the Renderer Catalog Boundary and Pure Adapters

**Files:**
- Create: `src/lib/constellation/rendererCatalog.ts`
- Create: `src/lib/constellation/__tests__/rendererCatalog.test.ts`

**Interfaces:**
- Consumes:
  - `PreparedConstellationCatalog` and `SyntheticSolMarker` from `@/lib/constellation/observerCatalog`
  - `Star` and `Constellation` from `@/types/constellation`
- Produces:

```ts
export type RendererLine = readonly [number, number];

export interface RendererStar {
    readonly id: string;
    readonly name: string;
    readonly rightAscension: number;
    readonly declination: number;
    readonly magnitude: number;
    readonly distance: number;
    readonly spectralClass: string;
    readonly color: string;
    readonly marker?: SyntheticSolMarker;
}

export interface RendererConstellation {
    readonly id: string;
    readonly name: string;
    readonly abbreviation: string;
    readonly description: string;
    readonly mythology?: string;
    readonly stars: readonly RendererStar[];
    readonly lines: readonly RendererLine[];
}

export interface RendererCatalog {
    readonly stars: readonly RendererStar[];
    readonly constellations: readonly RendererConstellation[];
}

export interface PreparedCatalogRenderSettings {
    readonly minimumMagnitude: number;
    readonly showConstellationLines: boolean;
    readonly showStarNames: boolean;
}

export type RendererCatalogSettings = PreparedCatalogRenderSettings;

export function adaptPreparedCatalog(
    catalog: PreparedConstellationCatalog,
): RendererCatalog;

export function adaptLegacyCatalog(
    stars: readonly Star[],
    constellations: readonly Constellation[],
): RendererCatalog;
```

- [ ] **Step 1: Add test-local catalog builders and failing prepared identity tests**

Define small builders in `rendererCatalog.test.ts` so every example is concrete:

```ts
function makeLegacyStar(overrides: Partial<Star> = {}): Star;
function makeLegacyConstellation(
    overrides: Partial<Constellation> = {},
): Constellation;
function makePreparedCatalogWithSyntheticSol(): PreparedConstellationCatalog;
```

Then add tests proving that the adapter preserves the authoritative top-level sequence, marker object, local stars, and tuple lines:

```ts
it("adapts a prepared catalog as a typed identity seam", () => {
    const catalog = makePreparedCatalogWithSyntheticSol();

    const adapted = adaptPreparedCatalog(catalog);

    expect(adapted).toBe(catalog);
    expect(adapted.stars.at(-1)?.marker?.kind).toBe("synthetic-sol");
    expect(adapted.constellations[0].lines[0]).toBe(
        catalog.constellations[0].lines[0],
    );
});
```

- [ ] **Step 2: Run the prepared-adapter test and verify failure**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/rendererCatalog.test.ts -t "typed identity seam"
```

Expected: FAIL because `rendererCatalog.ts` and `adaptPreparedCatalog()` do not exist.

- [ ] **Step 3: Implement renderer types and the prepared identity adapter**

Implement:

```ts
export function adaptPreparedCatalog(
    catalog: PreparedConstellationCatalog,
): RendererCatalog {
    return catalog;
}
```

Do not clone the prepared catalog, erase markers, widen tuple lines, or cast through `unknown`.

- [ ] **Step 4: Write failing legacy-adapter tests**

Cover:

```ts
it("uses the supplied legacy top-level stars without membership flattening", () => {
    const shared = makeLegacyStar({ id: "shared" });
    const topLevelOnly = makeLegacyStar({ id: "top-level-only" });
    const constellation = makeLegacyConstellation({
        stars: [shared, shared],
        lines: [[0, 1]],
    });

    const adapted = adaptLegacyCatalog(
        [shared, topLevelOnly],
        [constellation],
    );

    expect(adapted.stars.map((star) => star.id)).toEqual([
        "shared",
        "top-level-only",
    ]);
});

it("drops malformed and out-of-range legacy lines once", () => {
    const constellation = makeLegacyConstellation({
        stars: [makeLegacyStar({ id: "a" }), makeLegacyStar({ id: "b" })],
        lines: [
            [0, 1],
            [0],
            [0, 1, 2],
            [0.5, 1],
            [-1, 1],
            [0, 2],
        ],
    });

    const adapted = adaptLegacyCatalog([], [constellation]);

    expect(adapted.constellations[0].lines).toEqual([[0, 1]]);
});
```

Also deep-freeze inputs and assert the adapter does not mutate them.

- [ ] **Step 5: Run the legacy-adapter tests and verify failure**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/rendererCatalog.test.ts -t "legacy"
```

Expected: FAIL because `adaptLegacyCatalog()` is not implemented.

- [ ] **Step 6: Implement the validating legacy adapter**

Use a local guard:

```ts
function isValidLegacyLine(
    line: readonly number[],
    starCount: number,
): line is RendererLine {
    if (line.length !== 2) return false;
    const [start, end] = line;
    return (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 0 &&
        end >= 0 &&
        start < starCount &&
        end < starCount
    );
}
```

Return fresh constellation and line arrays, but preserve star object identity and the supplied top-level star order.

- [ ] **Step 7: Run the full adapter suite**

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/rendererCatalog.test.ts
```

Expected: PASS with prepared identity, legacy validation, authoritative top-level ordering, marker preservation, and frozen-input tests.

- [ ] **Step 8: Commit the adapter boundary**

```bash
git add \
  src/lib/constellation/rendererCatalog.ts \
  src/lib/constellation/__tests__/rendererCatalog.test.ts
git commit -m "feat(constellation): define renderer catalog boundary"
```

---

### Task 2: Add Typed Earth-Horizontal and Fixed-Equatorial Placement

**Files:**
- Create: `src/lib/constellation/rendererPlacement.ts`
- Create: `src/lib/constellation/__tests__/rendererPlacement.test.ts`

**Interfaces:**
- Consumes:
  - `RendererStar` from Task 1
  - `SkyConfiguration` from `@/types/constellation`
  - `celestialToSphere()` from `@/utils/astronomy`
  - `radialToCartesian()` from `@/lib/astronomy/observerTransform`
- Produces:

```ts
export type CatalogPlacementContext =
    | {
          readonly kind: "earth-horizontal";
          readonly skyConfig: Readonly<SkyConfiguration>;
      }
    | {
          readonly kind: "fixed-equatorial";
      };

export type CatalogPlacementError =
    | {
          readonly code: "non-finite-render-coordinate";
          readonly component: "rightAscension" | "declination";
      }
    | {
          readonly code: "declination-out-of-range";
          readonly declination: number;
      };

export type CatalogPlacementResult =
    | {
          readonly ok: true;
          readonly position: {
              readonly x: number;
              readonly y: number;
              readonly z: number;
          };
      }
    | {
          readonly ok: false;
          readonly error: CatalogPlacementError;
      };

export function placeCatalogCoordinate(
    star: Pick<RendererStar, "rightAscension" | "declination">,
    context: CatalogPlacementContext,
    radius: number,
): CatalogPlacementResult;
```

- [ ] **Step 1: Write the failing Earth-delegation test**

Define a local `makeSkyConfig(overrides?: Partial<SkyConfiguration>)` builder, then spy on `celestialToSphere()` and compare exact output:

```ts
it("delegates Earth-horizontal placement to celestialToSphere", () => {
    const skyConfig = makeSkyConfig();
    const star = { rightAscension: 6.75, declination: 16.72 };

    const result = placeCatalogCoordinate(
        star,
        { kind: "earth-horizontal", skyConfig },
        100,
    );

    const expected = celestialToSphere(
        star.rightAscension,
        star.declination,
        skyConfig.location,
        skyConfig.dateTime,
        100,
    );
    expect(result).toEqual({
        ok: true,
        position: { x: expected.x, y: expected.y, z: expected.z },
    });
});
```

The helper returns only `x`, `y`, and `z`; discard `visible` without changing the Earth formula.

- [ ] **Step 2: Run the Earth test and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/rendererPlacement.test.ts -t "Earth-horizontal"
```

Expected: FAIL because `placeCatalogCoordinate()` does not exist.

- [ ] **Step 3: Implement finite validation and Earth delegation**

Reject non-finite RA/declination before calling Three.js buffer code. For Earth-horizontal context, do not reject finite declination outside `[-90, 90]`; delegate it exactly as legacy code does.

- [ ] **Step 4: Add a numeric vector matcher and all six fixed-equatorial axis fixtures**

Define the helper in `rendererPlacement.test.ts`:

```ts
function expectVectorClose(
    actual: readonly number[],
    expected: readonly number[],
): void {
    actual.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 10);
    });
}
```

Then add the fixtures:

```ts
it.each([
    [0, 0, [1, 0, 0]],
    [6, 0, [0, 0, 1]],
    [12, 0, [-1, 0, 0]],
    [18, 0, [0, 0, -1]],
    [0, 90, [0, 1, 0]],
    [0, -90, [0, -1, 0]],
])("places RA %sh Dec %s° on the HPA-431 axes", (ra, dec, expected) => {
    const result = placeCatalogCoordinate(
        { rightAscension: ra, declination: dec },
        { kind: "fixed-equatorial" },
        1,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
        expectVectorClose(
            [result.position.x, result.position.y, result.position.z],
            expected,
        );
    }
});
```

- [ ] **Step 5: Write fixed-mode validation and periodic-RA tests**

Cover:

- non-finite RA and declination fail in both contexts;
- fixed-equatorial declination `91` and `-91` fail;
- Earth-horizontal finite declination `91` delegates;
- finite RA values outside `[0, 24)` wrap geometrically;
- the fixed-equatorial function signature contains no location/date inputs.

- [ ] **Step 6: Implement fixed-equatorial placement**

Use:

```ts
const position = radialToCartesian(
    radius,
    star.rightAscension * 15,
    star.declination,
);
return { ok: true, position };
```

Do not use physical star distance and do not call `equatorialToCartesian()`.

- [ ] **Step 7: Run the placement suite**

```bash
bunx vitest run src/lib/constellation/__tests__/rendererPlacement.test.ts
```

Expected: PASS for Earth delegation, six axes, periodic RA, context-specific declination behavior, and non-finite failures.

- [ ] **Step 8: Commit placement**

```bash
git add \
  src/lib/constellation/rendererPlacement.ts \
  src/lib/constellation/__tests__/rendererPlacement.test.ts
git commit -m "feat(constellation): add renderer placement contexts"
```

---

### Task 3: Build Independent Ordinary-Star and Constellation-Line Layers

**Files:**
- Create: `src/lib/constellation/ConstellationCatalogLayer.ts`
- Create: `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts`
- Optional Create: `src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts`
- Modify: `src/test/setup.ts` only when a failing focused test demonstrates a missing Three.js mock behavior

**Interfaces:**
- Consumes:
  - `RendererCatalog`, `RendererCatalogSettings`, `RendererStar` from Task 1
  - `CatalogPlacementContext`, `CatalogPlacementError`, and `placeCatalogCoordinate()` from Task 2
- Produces:

```ts
export type CatalogLayerRole = "primary" | "reference";

export interface RendererSkipWarningContext {
    readonly role: CatalogLayerRole;
    readonly objectKind:
        | "top-level-star"
        | "constellation-star"
        | "constellation-line"
        | "marker";
    readonly starId?: string;
    readonly constellationId?: string;
    readonly lineIndex?: number;
    readonly error?: CatalogPlacementError;
}

export interface CatalogLayerBuildOptions {
    readonly role: CatalogLayerRole;
    readonly catalog: RendererCatalog;
    readonly placementContext: CatalogPlacementContext;
    readonly settings: Readonly<RendererCatalogSettings>;
    readonly warn?: (context: RendererSkipWarningContext) => void;
}

export class ConstellationCatalogLayer {
    readonly root: THREE.Group;
    readonly ordinaryStarPoints: THREE.Points | null;
    readonly renderedOrdinaryStars: readonly RendererStar[];
    readonly lineHitObjects: readonly THREE.Object3D[];
    readonly markerHitObjects: readonly THREE.Object3D[];

    setVisible(visible: boolean): void;
    setLabelsVisible(visible: boolean): void;
    setSelectedConstellation(id: string | null): void;
    getWorldPosition(id: string): THREE.Vector3 | null;
    tick(deltaSeconds: number): void;
    dispose(): void;
}
```

Initial role constants:

```ts
const REFERENCE_STAR_OPACITY = 0.35;
const REFERENCE_STAR_RING_INNER_RADIUS = 0.28;
const REFERENCE_STAR_RING_OUTER_RADIUS = 0.48;
const REFERENCE_LINE_OPACITY = 0.28;
const REFERENCE_LINE_DASH_PERIOD_WORLD = 6;
const REFERENCE_LINE_DASH_DUTY_CYCLE = 0.45;
```

Render radii/orders:

```ts
const REFERENCE_LINE_RADIUS = 97;
const REFERENCE_STAR_RADIUS = 99;
const PRIMARY_LINE_RADIUS = 98;
const PRIMARY_STAR_RADIUS = 100;

const REFERENCE_LINE_RENDER_ORDER = 1;
const REFERENCE_STAR_RENDER_ORDER = 2;
const PRIMARY_STAR_RENDER_ORDER = 3;
const PRIMARY_LINE_RENDER_ORDER = 4;
```

- [ ] **Step 1: Add concrete layer test builders and failing authoritative-point tests**

Define these test-local helpers (or place them in `ConstellationRenderer.fixtures.ts` if both renderer suites need them):

```ts
function makeRendererStar(
    overrides: Partial<RendererStar> = {},
): RendererStar;
function makeRendererConstellation(
    overrides: Partial<RendererConstellation> = {},
): RendererConstellation;
function makeRendererCatalog(
    overrides: Partial<RendererCatalog> = {},
): RendererCatalog;
function makeLayerOptions(
    overrides: Partial<CatalogLayerBuildOptions> = {},
): CatalogLayerBuildOptions;
function getPositionCount(points: THREE.Points | null): number;
```

Then cover a star repeated in two constellations:

```ts
it("creates one point from one authoritative top-level star", () => {
    const shared = makeRendererStar({ id: "shared" });
    const catalog = makeRendererCatalog({
        stars: [shared],
        constellations: [
            makeRendererConstellation({ stars: [shared] }),
            makeRendererConstellation({ stars: [shared] }),
        ],
    });

    const layer = new ConstellationCatalogLayer(
        makeLayerOptions({ catalog }),
    );

    expect(layer.renderedOrdinaryStars.map((star) => star.id)).toEqual([
        "shared",
    ]);
    expect(getPositionCount(layer.ordinaryStarPoints)).toBe(1);
});
```

Also assert an empty catalog produces `ordinaryStarPoints === null` and never creates random fallback points.

- [ ] **Step 2: Run the ordinary-point tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts -t "authoritative|procedural"
```

Expected: FAIL because the layer class does not exist.

- [ ] **Step 3: Implement deterministic ordinary-star buffers**

Algorithm:

1. Iterate `catalog.stars` only.
2. Skip marker records for Task 4.
3. Apply `settings.minimumMagnitude`.
4. Place the star.
5. Append position, color, `magnitudeToSize(star.magnitude) * 3`, and deterministic seed.
6. Append the same star to `renderedOrdinaryStars`.
7. Register the primary world position.

Use a stable FNV-1a hash over `${role}:${star.id}`; do not call `Math.random()`.

- [ ] **Step 4: Write failing independent-topology and line-guard tests**

Create primary/reference fixtures with different local stars and lines. Cover malformed prepared/deserialized lines even though the type says tuple:

```ts
it("skips an out-of-range prepared line before endpoint dereference", () => {
    const warn = vi.fn();
    const catalog = makeRendererCatalog({
        constellations: [
            makeRendererConstellation({
                id: "bad",
                stars: [makeRendererStar({ id: "a" })],
                lines: [[0, 2] as unknown as readonly [number, number]],
            }),
        ],
    });

    expect(
        () =>
            new ConstellationCatalogLayer(
                makeLayerOptions({ catalog, warn }),
            ),
    ).not.toThrow();

    expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
            objectKind: "constellation-line",
            constellationId: "bad",
            lineIndex: 0,
        }),
    );
});
```

The production implementation must not use the test's `unknown` cast.

- [ ] **Step 5: Run the line tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts -t "topology|out-of-range prepared line"
```

Expected: FAIL because line geometry and role-independent bounds checks are missing.

- [ ] **Step 6: Implement role-independent line validation before dereference**

For every role and every segment:

```ts
if (line.length !== 2) {
    warn?.({
        role,
        objectKind: "constellation-line",
        constellationId: constellation.id,
        lineIndex,
    });
    continue;
}

const [startIndex, endIndex] = line;
const startStar = Number.isInteger(startIndex)
    ? constellation.stars[startIndex]
    : undefined;
const endStar = Number.isInteger(endIndex)
    ? constellation.stars[endIndex]
    : undefined;

if (!startStar || !endStar) {
    warn?.({
        role,
        objectKind: "constellation-line",
        constellationId: constellation.id,
        lineIndex,
    });
    continue;
}
```

Then place endpoints, skip placement failures, and preserve source order. Never use top-level point indices for line endpoints.

- [ ] **Step 7: Implement primary and reference line shaders**

Primary retains current selection/dimming uniforms.

Reference uses:

```ts
aSegmentDistance = [0, chordLength]
```

where:

```ts
const chordLength = Math.hypot(
    end.x - start.x,
    end.y - start.y,
    end.z - start.z,
);
```

The fragment shader computes:

```glsl
float phase = fract(vSegmentDistance / uDashPeriodWorld);
if (phase > uDashDutyCycle) discard;
```

Use the named opacity, period, and duty-cycle constants.

- [ ] **Step 8: Add shader, distance, determinism, and frozen-input tests**

Assert:

- reference point shader contains a hollow-ring calculation using `gl_PointCoord`;
- primary and reference use independent geometries/materials;
- `aSegmentDistance` is `[0, chordLength]` for each accepted reference segment;
- short and long segments use the same `REFERENCE_LINE_DASH_PERIOD_WORLD`;
- repeated builds have identical position/color/size/seed/distance arrays;
- frozen inputs remain unchanged;
- `showConstellationLines: false` creates no line geometry in either role.

- [ ] **Step 9: Implement `setVisible()`, primary-only selection, and `tick()`**

`setVisible()` updates `root.visible`.

`setSelectedConstellation()` updates primary line uniforms only and is a no-op for reference.

`tick()` advances role-owned point and line shader time uniforms.

- [ ] **Step 10: Run the complete static-layer suite**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts
```

Expected: PASS for authoritative points, independent topology, line safety, fixed-period dashes, role styling, deterministic attributes, settings, selection, ticks, and frozen inputs.

- [ ] **Step 11: Commit static layers**

```bash
git add \
  src/lib/constellation/ConstellationCatalogLayer.ts \
  src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts \
  src/test/setup.ts
git commit -m "feat(constellation): build independent catalog layers"
```

Omit optional paths from `git add` when they were not needed.

---

### Task 4: Add Primary Synthetic Sol Markers, Lazy Labels, and Layer Disposal

**Files:**
- Modify: `src/lib/constellation/ConstellationCatalogLayer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts`
- Modify: `src/test/setup.ts` only when focused tests require additional sprite/texture/group behavior

**Interfaces:**
- Consumes:
  - `SyntheticSolMarker` and `SYNTHETIC_SOL_STAR_ID`
  - Task 3 layer APIs and renderer types
- Produces complete primary-layer marker/label/lifecycle behavior without renderer integration.

Named constants:

```ts
const SYNTHETIC_SOL_MARKER_SCALE = 6;
const SYNTHETIC_SOL_MARKER_RADIUS = 101;
const SYNTHETIC_SOL_MARKER_RENDER_ORDER = 5;
const PRIMARY_STAR_LABEL_RADIUS = 105;
const PRIMARY_STAR_LABEL_RENDER_ORDER = 6;
const PRIMARY_CONSTELLATION_LABEL_RADIUS = 110;
const PRIMARY_CONSTELLATION_LABEL_RENDER_ORDER = 7;
```

- [ ] **Step 1: Write failing marker-before-culling tests**

Add a concrete helper:

```ts
function makeSyntheticSolStar(
    overrides: Partial<RendererStar> = {},
): RendererStar {
    return {
        ...makeRendererStar({
            id: SYNTHETIC_SOL_STAR_ID,
            name: "Sol",
            magnitude: 0,
        }),
        marker: { kind: "synthetic-sol" },
        ...overrides,
    };
}
```

Use `SYNTHETIC_SOL_STAR_ID` and a marker magnitude rejected by the ordinary threshold:

```ts
it("builds synthetic Sol before ordinary magnitude culling", () => {
    const sol = makeSyntheticSolStar({ magnitude: 20 });
    const layer = new ConstellationCatalogLayer(
        makeLayerOptions({
            catalog: makeRendererCatalog({ stars: [sol] }),
            settings: {
                minimumMagnitude: -10,
                showConstellationLines: true,
                showStarNames: false,
            },
        }),
    );

    expect(layer.ordinaryStarPoints).toBeNull();
    expect(layer.markerHitObjects).toHaveLength(1);
    expect(layer.getWorldPosition(SYNTHETIC_SOL_STAR_ID)).not.toBeNull();
});
```

Also pass a malformed marker in a reference catalog and assert it is skipped with a warning.

- [ ] **Step 2: Run marker tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts -t "synthetic Sol|reference marker"
```

Expected: FAIL because marker construction is missing.

- [ ] **Step 3: Implement primary-only marker construction**

Partition marker records before magnitude filtering.

Build one marker group with ring/reticle geometry and radial rays. Keep marker shape visible regardless of label state. Store:

```ts
object.userData = {
    role: "primary",
    starId: star.id,
    star,
};
```

Register the world position under `star.id`. Do not infer marker behavior from the ID.

- [ ] **Step 4: Write failing lazy-label ownership tests**

Cover:

- labels are not allocated while visibility is false;
- first `setLabelsVisible(true)` creates labels;
- subsequent toggles reuse the same groups and only change visibility;
- ordinary labels use `renderedOrdinaryStars` only;
- marker records never enter ordinary labels;
- synthetic Sol text follows visibility while marker shape stays visible;
- reference `setLabelsVisible()` is a no-op;
- invalid local positions do not create constellation labels.

- [ ] **Step 5: Run label tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts -t "labels|marker shape"
```

Expected: FAIL because the layer does not own lazy label resources yet.

- [ ] **Step 6: Implement all primary labels inside the layer**

Cache immutable build inputs and accepted positions needed to create:

- primary ordinary-star labels;
- primary constellation labels;
- synthetic Sol marker text.

`setLabelsVisible(true)` lazily creates missing groups and sets them visible. `setLabelsVisible(false)` hides text groups only. Reference creates no text resources.

- [ ] **Step 7: Write failing idempotent-disposal tests**

Define a test helper that returns the mocked resources created by the layer:

```ts
function collectLayerDisposables(
    layer: ConstellationCatalogLayer,
): readonly { dispose: import("vitest").Mock }[];
```

Capture every created geometry, material, texture, and sprite material from the Three.js mocks, then assert their `dispose` spies explicitly:

```ts
const disposables = collectLayerDisposables(layer);

layer.dispose();
layer.dispose();

disposables.forEach((resource) => {
    expect(resource.dispose).toHaveBeenCalledTimes(1);
});
expect(layer.markerHitObjects).toHaveLength(0);
expect(layer.renderedOrdinaryStars).toHaveLength(0);
expect(layer.getWorldPosition(SYNTHETIC_SOL_STAR_ID)).toBeNull();
```

- [ ] **Step 8: Implement idempotent layer disposal**

Dispose ordinary points, line geometries/materials/distance attributes, marker geometry/materials, label textures/materials/groups, cached lazy-label inputs, hit arrays, point lookup, and position maps. Call `root.removeFromParent()` and make repeated disposal a no-op.

- [ ] **Step 9: Run the complete layer suite**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts
```

Expected: PASS for static geometry plus markers, labels, reference no-op behavior, Sol-only catalogs, warnings, and idempotent disposal.

- [ ] **Step 10: Commit marker, labels, and lifecycle**

```bash
git add \
  src/lib/constellation/ConstellationCatalogLayer.ts \
  src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts \
  src/test/setup.ts
git commit -m "feat(constellation): add Sol markers and layer labels"
```

---

### Task 5: Refactor Renderer Initialization, Decorative Background, Guides, and One RAF Loop

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
- Modify: `src/test/setup.ts` as required by focused renderer tests
- Modify/Create: `src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts` when shared fixtures are used

**Interfaces:**
- Consumes all Tasks 1–4.
- Produces public initialization APIs:

```ts
export interface PreparedCatalogRenderRequest {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly referenceVisible?: boolean;
}

export type PreparedCatalogRenderSettings = RendererCatalogSettings;

async initialize(
    stars: readonly Star[],
    constellations: readonly Constellation[],
    skyConfig: Readonly<SkyConfiguration>,
): Promise<void>;

async initializePreparedCatalogs(
    request: PreparedCatalogRenderRequest,
    settings: Readonly<PreparedCatalogRenderSettings>,
): Promise<void>;

async updateSky(
    stars: readonly Star[],
    constellations: readonly Constellation[],
    skyConfig: Readonly<SkyConfiguration>,
): Promise<void>;
```

Renderer state:

```ts
private primaryLayer: ConstellationCatalogLayer | null = null;
private referenceLayer: ConstellationCatalogLayer | null = null;
private labelsVisible = true;
private _labelsVisibleUserSet = false;
private referenceVisible = false;
private animationRunning = false;
```

Decorative constants/orders:

```ts
const STARFIELD_BACKGROUND_RENDER_ORDER = 0;
const LEGACY_AMBIENT_RENDER_ORDER = 0.25;
const EARTH_CARDINAL_RENDER_ORDER = 0.5;
const EARTH_HORIZON_RENDER_ORDER = 4.5;
const SHOOTING_STAR_RENDER_ORDER = 8;
const LEGACY_AMBIENT_STAR_THRESHOLD = 100;
const LEGACY_AMBIENT_STAR_COUNT = 500;
```

- [ ] **Step 1: Write failing public prepared-API type/integration tests**

Instantiate with:

```ts
await renderer.initializePreparedCatalogs(
    {
        primaryCatalog,
        referenceCatalog,
        referenceVisible: true,
    },
    {
        minimumMagnitude: 4,
        showConstellationLines: true,
        showStarNames: true,
    },
);
```

The test must not construct location/date/timezone/FOV values.

Also assert `updateSky()` remains legacy-only and delegates to `initialize()`.

- [ ] **Step 2: Run prepared initialization tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "prepared initialization|updateSky"
```

Expected: FAIL because the prepared API and layer state do not exist.

- [ ] **Step 3: Implement one private shared initialization path**

Use a private request internal to the renderer:

```ts
interface SharedRendererInitialization {
    readonly primaryCatalog: RendererCatalog;
    readonly referenceCatalog?: RendererCatalog;
    readonly placementContext: CatalogPlacementContext;
    readonly settings: Readonly<RendererCatalogSettings>;
    readonly isLegacyEarth: boolean;
    readonly requestedReferenceVisible?: boolean;
}
```

Order:

1. dispose old layers and Earth guides;
2. clear stale selected/hovered IDs;
3. resolve labels/reference preferences;
4. adapt/build primary;
5. adapt/build optional reference;
6. add roots to scene;
7. apply label/reference visibility;
8. create Earth guides only for legacy Earth;
9. update ambient visibility for the active context;
10. set the existing initial camera policy;
11. ensure one animation loop.

- [ ] **Step 4: Write failing Earth-regression and fixed-frame tests**

Cover:

- Earth stars, lines, and labels still use `celestialToSphere()` at current radii;
- prepared placement is fixed-equatorial and has no location/date dependency;
- Earth mode creates horizon/cardinal guides;
- prepared mode creates neither;
- cardinal labels use order `0.5`, below catalog geometry;
- horizon uses order `4.5`;
- shooting stars use order `8`.

- [ ] **Step 5: Implement guide creation and explicit render orders**

Preserve current Earth geometry and labels. Change only explicit order assignments needed to pin existing layering.

- [ ] **Step 6: Write failing decorative-background mode-switch tests**

Cover all sequences:

```text
sparse Earth -> prepared: one ambient child exists but is hidden
prepared -> sparse Earth: ambient child is created and visible
sparse Earth -> prepared -> Earth: same ambient child identity is reused
dense-only Earth: no ambient child
repeated init: exactly one decorative root
```

Assert catalog point counts never include ambient points.

- [ ] **Step 7: Implement one persistent decorative owner**

Create one root in the constructor containing the existing shader sphere and optional ambient points.

Create ambient points only on the first sparse legacy pass (`renderedOrdinaryStars.length < 100`). Keep the child until final disposal. Set:

```ts
ambientStarPoints.visible = placementContext.kind === "earth-horizontal";
```

Prepared initialization must never create ambient points.

- [ ] **Step 8: Write failing one-loop tests**

Stub `requestAnimationFrame`, initialize twice serially, and assert only one RAF chain starts. Verify final disposal clears `animationRunning` and cancels the outstanding ID.

- [ ] **Step 9: Implement `ensureAnimationRunning()`**

```ts
private ensureAnimationRunning(): void {
    if (this.animationRunning || this._disposed) return;
    this.animationRunning = true;
    this.animate();
}
```

`animate()` continues only while `animationRunning` is true. Do not claim support for overlapping async initialization.

- [ ] **Step 10: Run focused initialization tests**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "prepared|Earth|ambient|orientation|RAF|updateSky"
```

Expected: PASS for public API shape, Earth regressions, fixed frame, mode-specific ambience, explicit guide orders, and one loop.

- [ ] **Step 11: Commit renderer initialization**

```bash
git add \
  src/lib/constellation/ConstellationRenderer.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.test.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts \
  src/test/setup.ts
git commit -m "feat(constellation): initialize layered renderer catalogs"
```

Omit optional paths when unused.

---

### Task 6: Route Primary Interactions, Reference Visibility, Hover Callbacks, and Focus

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
- Modify: `src/test/setup.ts` only for focused raycaster/mock support

**Interfaces:**
- Produces:

```ts
export interface ConstellationRendererCallbacks {
    onStarHover?: (
        star: RendererStar | null,
        screenPos: { x: number; y: number } | null,
    ) => void;
    onConstellationHover?: (
        id: string | null,
        screenPos: { x: number; y: number } | null,
    ) => void;
    onConstellationClick?: (id: string) => void;
}

setReferenceVisible(visible: boolean): void;

getStarWorldPosition(
    id: string,
): { x: number; y: number; z: number } | null;

focusStarById(
    id: string,
    durationMs?: number,
): boolean;
```

- [ ] **Step 1: Write failing primary-only interaction tests**

Cover:

- line hover/click raycasts `primaryLayer.lineHitObjects` only;
- ordinary-star hover maps the point index to `primaryLayer.renderedOrdinaryStars`;
- marker hover returns the complete `RendererStar` with `marker.kind`;
- reference-only IDs and decorative objects are never hover/click targets;
- `setSelected()` forwards to primary only;
- `setHovered()` remains renderer-local.

- [ ] **Step 2: Run interaction tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "primary-only|marker hover|reference-only"
```

Expected: FAIL because interaction routing still uses legacy renderer-owned objects.

- [ ] **Step 3: Implement primary-only raycasting and callback widening**

Raycast the primary line objects, then independently raycast primary points and marker hit objects. Preserve simultaneous constellation and star/marker callbacks.

Do not erase the marker property before invoking `onStarHover`.

- [ ] **Step 4: Write failing reference-visibility state tests**

Cover:

- setter before reference construction persists;
- request value updates stored state;
- omitted request value preserves stored state;
- setter calls `referenceLayer.setVisible()`;
- primary/reference object identity remains unchanged;
- no geometry/material disposal occurs during toggles.

- [ ] **Step 5: Implement `setReferenceVisible()`**

```ts
public setReferenceVisible(visible: boolean): void {
    this.referenceVisible = visible;
    this.referenceLayer?.setVisible(visible);
}
```

Prepared initialization applies request visibility to stored state and calls `setVisible()` after building the layer.

- [ ] **Step 6: Write failing world-position and focus tests**

Use `SYNTHETIC_SOL_STAR_ID` and several direction fixtures. Create the spy before the table:

```ts
const tweenSpy = vi.spyOn(renderer, "tweenCameraTo");

it.each([
    [{ x: 100, y: 0, z: 0 }, 0, Math.PI / 2],
    [{ x: 0, y: 0, z: 100 }, 0, 0],
    [{ x: -50, y: 50, z: -50 }, Math.asin(1 / Math.sqrt(3)), -3 * Math.PI / 4],
])("inverts the camera-forward mapping", (position, pitch, yaw) => {
    const primaryLayer = {
        getWorldPosition: vi.fn(() => new THREE.Vector3(
            position.x,
            position.y,
            position.z,
        )),
    };
    (renderer as unknown as { primaryLayer: typeof primaryLayer }).primaryLayer =
        primaryLayer;

    expect(renderer.focusStarById("target", 900)).toBe(true);
    expect(tweenSpy).toHaveBeenCalledWith(pitch, yaw, 900);
});
```

Also cover absent/reference-only, zero-length, and non-finite positions returning `false`, plus the existing pitch clamp. The private-field cast above is test-only; production code must not cast through `unknown`.

- [ ] **Step 7: Implement safe position lookup and focus**

`getStarWorldPosition()` returns a plain copy.

`focusStarById()`:

```ts
const position = this.primaryLayer?.getWorldPosition(id);
if (!position) return false;

const { x, y, z } = position;
const radius = Math.hypot(x, y, z);
if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z) ||
    !Number.isFinite(radius) ||
    radius <= 0
) {
    return false;
}

const pitch = Math.asin(y / radius);
const yaw = Math.atan2(x, z);
this.tweenCameraTo(pitch, yaw, durationMs);
return true;
```

Do not automatically call focus during prepared initialization. HPA-435 owns entry and Find Sol behavior.

- [ ] **Step 8: Forward labels and tick both layers**

`setLabelsVisible()` retains renderer preference/user-override state and forwards to primary only.

Each animation frame calls:

```ts
this.primaryLayer?.tick(deltaSeconds);
this.referenceLayer?.tick(deltaSeconds);
```

Remove or replace legacy `tickUniforms()` ownership after focused tests cover both roles.

- [ ] **Step 9: Run interaction/runtime tests**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "hover|click|selected|reference visibility|focus|world position|labels|tick"
```

Expected: PASS for marker-aware callbacks, primary-only authority, visibility identity, focus inversion, invalid-position behavior, label forwarding, and both layer ticks.

- [ ] **Step 10: Commit runtime APIs**

```bash
git add \
  src/lib/constellation/ConstellationRenderer.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.test.ts \
  src/test/setup.ts
git commit -m "feat(constellation): add layered renderer interactions"
```

---

### Task 7: Harden Reinitialization, Final Disposal, Test Mocks, and Full Regression Coverage

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts`
- Modify: `src/test/setup.ts`
- Modify: focused fixture file if it exists

**Interfaces:**
- No new product surface.
- Completes lifecycle, stale-state clearing, and final acceptance coverage.

- [ ] **Step 1: Write failing reinitialization cleanup tests**

Initialize primary/reference with selected/hovered/focusable IDs, then initialize a different catalog. Assert:

- old layer roots are removed;
- every old layer resource is disposed exactly once;
- selected and hovered IDs reset;
- old point/marker hit objects are unreachable;
- old world positions return `null`;
- stored label and reference preferences survive;
- decorative root and optional ambient child identity survive;
- prepared mode hides ambient points.

- [ ] **Step 2: Run reinitialization tests and verify failure**

```bash
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "reinitialization|stale"
```

Expected: FAIL until shared cleanup releases all old layer state.

- [ ] **Step 3: Implement one idempotent dynamic cleanup path**

Create a renderer helper that:

1. removes and disposes both layers;
2. disposes Earth guides;
3. clears selected/hovered IDs and cached renderer interaction references;
4. preserves renderer preferences;
5. preserves decorative resources during reinit;
6. is safe when initialization failed before all resources were created.

- [ ] **Step 4: Write failing final-dispose tests**

After exercising Earth and prepared modes, call `dispose()` twice and assert exactly-once cleanup for:

- primary/reference layer resources;
- marker geometries/materials;
- all label textures/materials;
- line distance attributes/geometries/materials;
- Earth guides;
- ambient points and starfield sphere;
- active shooting star;
- window/canvas event listeners;
- RAF and momentum IDs;
- WebGL renderer and canvas removal.

- [ ] **Step 5: Extend the Three.js test mock only where tests fail**

Add accurate mock support for used behavior such as:

```ts
Object3D.visible
Object3D.removeFromParent()
Group.traverse()
BufferGeometry.attributes
SpriteMaterial.opacity
Points.name
Points.renderOrder
Points.visible
```

Do not broaden the mock with unrelated Three.js APIs.

- [ ] **Step 6: Implement final renderer disposal**

Final disposal:

1. marks disposed and stops animation/momentum;
2. disposes dynamic renderer state;
3. disposes the decorative root and both children;
4. removes event listeners and canvas;
5. disposes WebGL renderer;
6. remains safe on a second call.

- [ ] **Step 7: Add final acceptance tests**

Ensure the test matrix includes:

- authoritative prepared top-level stars and no membership flattening;
- different primary/reference topology;
- fixed-equatorial independence from Earth context;
- Sol-only primary with `ordinaryStarPoints === null`;
- `SYNTHETIC_SOL_STAR_ID` marker culling bypass;
- reference hollow points and distance-based dashes;
- no random catalog points;
- ambient hidden in prepared mode;
- line bounds guards for malformed prepared data;
- one RAF chain;
- readonly/frozen input safety;
- complete resource cleanup.

- [ ] **Step 8: Run all focused suites**

```bash
bunx vitest run src/lib/constellation/__tests__/rendererCatalog.test.ts
bunx vitest run src/lib/constellation/__tests__/rendererPlacement.test.ts
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts
```

Expected: all focused suites pass with zero failures.

- [ ] **Step 9: Run project verification**

```bash
bun run test:run
bun run type-check
bun run lint
bun run build
```

Expected: every command exits `0`.

- [ ] **Step 10: Audit scope**

```bash
git diff --name-only main...HEAD
```

Expected implementation files:

```text
src/lib/constellation/rendererCatalog.ts
src/lib/constellation/rendererPlacement.ts
src/lib/constellation/ConstellationCatalogLayer.ts
src/lib/constellation/ConstellationRenderer.ts
src/lib/constellation/__tests__/rendererCatalog.test.ts
src/lib/constellation/__tests__/rendererPlacement.test.ts
src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts
src/lib/constellation/__tests__/ConstellationRenderer.test.ts
src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts   # only if created
src/test/setup.ts                                                   # only if required
docs/superpowers/specs/2026-08-02-hpa-434-alternate-observer-reference-renderer-design.md
docs/superpowers/plans/2026-08-03-hpa-434-alternate-observer-reference-renderer.md
```

No wrapper, route, Galaxy-data, observer-preparation, astronomy-formula, localization, or E2E files should appear.

- [ ] **Step 11: Audit forbidden dependencies**

```bash
rg -n \
  'ConstellationWrapper|observerRouteState|localGalaxyData|from "svelte"|from "astro"|i18n' \
  src/lib/constellation/rendererCatalog.ts \
  src/lib/constellation/rendererPlacement.ts \
  src/lib/constellation/ConstellationCatalogLayer.ts
```

Expected: no matches.

- [ ] **Step 12: Commit hardening**

```bash
git add \
  src/lib/constellation/ConstellationRenderer.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.test.ts \
  src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts \
  src/lib/constellation/__tests__/ConstellationRenderer.fixtures.ts \
  src/test/setup.ts
git commit -m "test(constellation): harden layered renderer lifecycle"
```

Omit optional files when unused.

---

## Implementation Sequence and Review Gates

Use one fresh implementation context and one reviewer gate per task:

1. Renderer catalog types and adapters.
2. Placement contexts and validation.
3. Ordinary stars, independent topology, line safety, reference dash geometry.
4. Synthetic Sol, primary labels, and layer disposal.
5. Shared initialization, Earth regressions, decorative background, guides, one loop.
6. Interaction routing, callback widening, visibility, focus, and shader ticks.
7. Lifecycle hardening and full verification.

Do not start Task 5 until Tasks 1–4 expose stable tested interfaces. Do not start HPA-435 integration until this implementation passes all Task 7 verification commands.
