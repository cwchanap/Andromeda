# HPA-434 Alternate-Observer and Earth-Reference Renderer Design

**Status:** Proposed for review  
**Linear:** HPA-434 — Render alternate-observer and Earth-reference layers  
**Depends on:** HPA-431 observer-relative transforms; HPA-433 prepared observer catalogs  
**Blocks:** HPA-435 observer HUD, Find Sol, fallbacks, and localization

## Summary

Extend `ConstellationRenderer` so it can render an immutable prepared primary catalog and an optional Earth/Sol-reference catalog in one shared Three.js scene while preserving the existing Earth-surface sky path.

The renderer keeps one camera, one canvas, one animation loop, and one input system. It delegates role-owned star, line, marker, lookup, and disposal resources to a reusable internal `ConstellationCatalogLayer`. The existing `initialize()` method remains the backward-compatible Earth-horizontal adapter. A new `initializePreparedCatalogs()` method consumes the authoritative matched catalog pairs produced by HPA-433 and places them in a deterministic fixed-equatorial frame.

Synthetic Sol is rendered through a dedicated **primary-only** marker path identified by `marker.kind === "synthetic-sol"`. It does not enter the ordinary star buffer, does not use magnitude culling, and is not sized solely by the compatibility magnitude value. The optional reference layer uses independent geometry and non-color-only hollow/dashed styling, remains non-interactive, and can be toggled by changing its root group's visibility without rebuilding unrelated resources.

The current sparse-catalog procedural points are removed from catalog geometry but not simply discarded. Legacy Earth ambience is moved under the one scene-level decorative-background owner so Earth visual density can be preserved without contaminating catalog point indices or duplicating fallback points across primary/reference layers.

## Goals

- Preserve the current Earth/Sol coordinate, interaction, label, camera, and ambience behavior.
- Render HPA-433 prepared primary and optional reference catalogs without mutation or membership flattening.
- Place prepared catalogs in a deterministic fixed-equatorial frame independent of browser time and geolocation.
- Support intentionally different primary/reference top-level stars, local constellation stars, and line topology.
- Render synthetic Sol as an unmistakable, focusable, hoverable primary marker.
- Keep primary as the sole interaction authority while reference remains a visual comparison layer.
- Keep random decorative points outside catalog geometry and retain exactly one scene-level decorative background.
- Ensure reinitialization and final disposal release every new Three.js resource and stale interaction entry.
- Prevent repeated `initialize()` calls from creating concurrent animation loops.

## Non-goals

- Coordinate transformation or catalog preparation logic.
- Observer-system to source-star mapping.
- Route parsing, Galaxy entry, observer HUD, localization, accessibility copy, or fallback UI.
- Earth visibility filtering for alternate-observer or reference catalogs.
- Distance-modulus brightness correction.
- Surface horizon, atmosphere, latitude, axial tilt, seasons, or local time for alien observers.
- A second WebGL canvas or synchronized renderer instance.
- Removing the existing camera pitch clamp or redesigning camera controls.

## Existing renderer constraints

The current `ConstellationRenderer` assumes one Earth-horizontal catalog:

- `starPoints` owns one ordinary-star buffer.
- `_stars` maps one point-buffer index space to hover records.
- `constellationLines` owns one line group.
- labels, horizon, and cardinal guides are constructed as Earth-view scene objects.
- star, line, and label coordinates all call `celestialToSphere()` with location and date.
- sparse star buffers receive 500 random procedural points.
- random `aSeed` values are generated with `Math.random()`.
- `clearScene()` disposes one set of catalog resources while preserving `starfield-background`.
- `initialize()` calls `animate()` unconditionally, so repeated initialization can create concurrent RAF chains while `_rafId` remembers only the latest request.

HPA-433 produces immutable authoritative matched pairs:

```text
primaryCatalog.stars + primaryCatalog.constellations
referenceCatalog.stars + referenceCatalog.constellations
```

The renderer must consume each pair directly. It must never rebuild top-level stars from `constellations.flatMap(...)`, because flattening would omit synthetic Sol and duplicate stars that appear in more than one constellation.

## Approaches considered

### A. Duplicate primary/reference fields in `ConstellationRenderer`

Add primary and reference versions of every points group, line group, lookup array, shader update, and disposal branch.

This minimizes initial file creation but duplicates behavior and makes future fixes easy to apply to one role but not the other. It also raises the risk of using primary indices with reference topology.

### B. One reusable internal catalog-layer owner

Create an internal owner for the resources and index spaces of one catalog role. Instantiate it once for primary and optionally once for reference. `ConstellationRenderer` retains scene, camera, input, callbacks, public state, labels policy, orientation guides, decorative background, and animation orchestration.

This provides explicit role boundaries, one lifecycle implementation, independent topology, and one camera/input system.

### C. Two `ConstellationRenderer` instances

Overlay two canvases and synchronize camera state and input.

This duplicates WebGL contexts and animation loops, complicates exact alignment, and makes pointer and disposal behavior fragile.

## Decision

Use approach B: one reusable internal `ConstellationCatalogLayer` instantiated per catalog role.

## Public renderer contract

### Legacy Earth initialization

Keep the current entry point and widen only the array/config mutability boundary:

```ts
async initialize(
    stars: readonly Star[],
    constellations: readonly Constellation[],
    skyConfig: Readonly<SkyConfiguration>,
): Promise<void>
```

This method adapts the existing arrays into an internal primary catalog and calls the shared initialization path with:

- placement mode `"earth-horizontal"`;
- no reference catalog;
- Earth orientation guides enabled;
- legacy Earth decorative ambience enabled when the explicit catalog is sparse; and
- existing Earth radii, labels, magnitude behavior, and camera setup.

No Earth caller is required to construct HPA-433 prepared types.

### Prepared-catalog initialization

Add:

```ts
export type CatalogPlacementMode =
    | "earth-horizontal"
    | "fixed-equatorial";

export interface PreparedCatalogRenderRequest {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly placementMode: CatalogPlacementMode;
    readonly referenceVisible?: boolean;
}

async initializePreparedCatalogs(
    request: PreparedCatalogRenderRequest,
    skyConfig: Readonly<SkyConfiguration>,
): Promise<void>
```

HPA-435 normally passes `placementMode: "fixed-equatorial"`. The placement field remains explicit so tests and future internal callers cannot accidentally apply Earth-horizontal conversion to prepared data.

`initializePreparedCatalogs()` consumes the supplied top-level `stars` arrays directly and never derives them from constellation membership.

### Runtime APIs

Add:

```ts
setReferenceVisible(visible: boolean): void;

focusStarById(id: string, durationMs?: number): boolean;

getStarWorldPosition(
    id: string,
): { x: number; y: number; z: number } | null;
```

`focusStarById()` and `getStarWorldPosition()` resolve primary rendered objects only. A star present only in the reference catalog is intentionally not focusable and does not become a second interaction authority.

## Renderer-facing readonly boundary

Do not weaken HPA-433 output types globally. Define a narrow renderer boundary:

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
    readonly marker?: {
        readonly kind: "synthetic-sol";
    };
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
```

The prepared path already supplies readonly tuple lines. The legacy adapter converts `number[][]` to validated `RendererLine` pairs once at the boundary. The layer does not discard prepared tuple type-safety merely to accommodate the legacy mutable type.

Runtime validation remains necessary because external/deserialized values can violate TypeScript declarations.

## Internal catalog-layer model

Create `src/lib/constellation/ConstellationCatalogLayer.ts` exporting a class named `ConstellationCatalogLayer`.

```ts
export type CatalogLayerRole = "primary" | "reference";

export interface CatalogLayerBuildOptions {
    readonly role: CatalogLayerRole;
    readonly catalog: RendererCatalog;
    readonly placementMode: CatalogPlacementMode;
    readonly skyConfig: Readonly<SkyConfiguration>;
}
```

Each layer owns:

- one root `THREE.Group`;
- one ordinary-star `THREE.Points` object when ordinary rendered stars exist;
- one constellation-line `THREE.Group` built from that catalog's own local stars and line tuples;
- an optional primary marker group;
- the exact ordinary point-index-to-star list;
- primary marker hit objects;
- a stable-ID-to-world-position map;
- all geometries, materials, textures, sprites, and disposal state created by the layer.

The class exposes narrow methods/properties needed by the renderer:

```ts
class ConstellationCatalogLayer {
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

Reference implementations return no marker hit objects, ignore selection changes, and create no labels.

## Catalog partitioning and marker role guard

Partition top-level catalog stars before ordinary magnitude filtering.

For a **primary** layer:

1. `marker.kind === "synthetic-sol"` records go to the dedicated marker builder.
2. All other records go to ordinary-star filtering and point-buffer creation.

For a **reference** layer:

1. Synthetic-marker records are not built as markers.
2. They are not treated as ordinary stars.
3. They are skipped defensively with a development warning because HPA-433's reference contract forbids synthetic Sol.

This role guard prevents a malformed or future reference catalog from silently creating a non-interactive duplicate Sol marker. Tests must exercise the defensive skip even though current HPA-433 output never includes such a record.

Constellation-local stars are used only for line and constellation-label geometry. They never populate the top-level ordinary point buffer.

## Placement model

Add `src/lib/constellation/rendererPlacement.ts`.

```ts
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
    placementMode: CatalogPlacementMode,
    skyConfig: Readonly<SkyConfiguration>,
    radius: number,
): CatalogPlacementResult;
```

### Validation

The renderer relies on HPA-433 to validate and normalize prepared catalog coordinates, but it does not blindly allow `NaN` or an out-of-range declination into a Three.js buffer.

Before either placement path:

- require finite right ascension and declination;
- require declination in `[-90, 90]`;
- return a typed failure rather than creating non-finite geometry.

A failed top-level star is skipped from rendering and interaction registries with a development warning. A failed constellation-local position skips only the affected segment/label contribution. This is a defensive renderer boundary, not a second catalog-transformation system and not a replacement for HPA-433 diagnostics.

### Earth-horizontal placement

For valid coordinates, delegate exactly to:

```ts
celestialToSphere(
    star.rightAscension,
    star.declination,
    skyConfig.location,
    skyConfig.dateTime,
    radius,
)
```

Do not duplicate or alter Earth location, date, hour-angle, altitude, azimuth, or sidereal-time formulas.

### Fixed-equatorial placement

For valid prepared coordinates, use the HPA-431 Y-up convention:

```ts
radialToCartesian(
    radius,
    star.rightAscension * 15,
    star.declination,
)
```

Axis fixtures:

- Dec `+90°` -> `+Y`.
- Dec `-90°` -> `-Y`.
- RA `0h`, Dec `0°` -> `+X`.
- RA `6h`, Dec `0°` -> `+Z`.
- RA `12h`, Dec `0°` -> `-X`.
- RA `18h`, Dec `0°` -> `-Z`.

Fixed-equatorial placement ignores latitude, longitude, timezone, date, hour angle, horizon, and sidereal time. It does not call `equatorialToCartesian()` because display radius is intentionally independent of the star's physical distance; the renderer performs only validated direction-to-display-sphere placement.

Primary and reference use the same coordinate convention. Small radius differences are display-only and do not change direction from the camera at the origin.

## Display radii and render order

Use explicit constants rather than relying on insertion-order ties:

| Object | Radius | `renderOrder` | Purpose |
| --- | ---: | ---: | --- |
| Decorative background | 200 / existing ambience radii | 0 | Scene-only backdrop |
| Reference ordinary stars | 99 | 1 | Hollow comparison markers behind primary |
| Reference lines | 97 | 2 | Dashed comparison topology |
| Primary ordinary stars | 100 | 3 | Filled primary catalog stars |
| Primary constellation lines | 98 | 4 | Selectable primary topology |
| Synthetic Sol marker shape | 101 | 5 | Primary focus marker |
| Primary star/marker labels | 105 | 6 | Readable labels |
| Primary constellation labels | 110 | 7 | Constellation names |
| Shooting-star decoration | existing | 8 | Foreground decoration |

Earth orientation guides use their existing radius and an order below primary labels. They never coexist with a reference layer because guides are Earth-horizontal only.

Every primary/reference role has a distinct order. No behavior depends on equal `renderOrder` values or scene insertion order.

All catalog materials keep `depthWrite: false` as today. Role-specific shader opacity and shape provide the comparison hierarchy.

## Decorative background and procedural-star boundary

Catalog geometry must contain catalog records only.

The current renderer injects 500 random points when the explicit star-position buffer is sparse. HPA-434 removes this injection from `createStars()`/catalog-layer construction for **both** legacy and prepared catalogs so:

- point indices map exactly to `renderedOrdinaryStars`;
- prepared primary/reference layers cannot each create duplicate random stars;
- repeated prepared builds produce deterministic catalog geometry and shader attributes;
- decorative points cannot participate in hover, selection, focus, IDs, diagnostics, or comparison semantics.

To avoid an unnecessary Earth visual regression, preserve the legacy sparse-sky ambience under one scene-level decorative-background owner:

```text
decorative-background (one persistent root)
├── starfield-background (existing shader sphere)
└── ambient-star-points (optional legacy ambience)
```

Rules:

- the root is created once in the constructor and survives catalog reinitialization;
- optional ambient points are created at most once per renderer instance, not once per catalog layer;
- prepared primary/reference initialization never creates an additional ambient layer;
- ambient points contain no star records or semantic user data;
- ambient points are excluded from all raycasts;
- their randomness may remain decorative and constructor-scoped;
- final `dispose()` releases both children and the root;
- tests assert one decorative root and no random points in catalog buffers.

This preserves legacy ambience while satisfying the issue's one-independent-background and no-per-layer-fallback requirements.

## Ordinary-star rendering and determinism

Ordinary stars continue to respect `skyConfig.minimumMagnitude` and `magnitudeToSize()`.

For each role:

1. validate placement inputs;
2. skip marker records according to the role guard;
3. apply ordinary magnitude filtering;
4. place the accepted star;
5. append position, color, size, and deterministic shader seed;
6. append the same star to `renderedOrdinaryStars`;
7. register its stable-ID world position when the role is primary.

Use a stable hash such as FNV-1a over `${role}:${star.id}` to derive `aSeed` in `[0, 1)`. Do not use `Math.random()` for catalog seed attributes.

Determinism applies to catalog geometry and attributes. The persistent decorative background and shooting stars are outside catalog semantics and may retain decorative randomness.

## Constellation-line rendering

Each layer builds line positions from its own `catalog.constellations` and each constellation's own local `stars` and tuple indices.

For every segment:

- require an exact two-integer in-range tuple at the legacy runtime boundary;
- place both endpoints using that layer's placement mode and role-specific line radius;
- skip the segment when either endpoint fails placement;
- never look up an endpoint in the other role;
- never invent bridge segments;
- preserve source segment order.

Primary lines retain current selection/dimming uniforms and pointer metadata.

Reference lines use an independent lower-opacity dashed shader and do not expose selection uniforms as a public interaction surface.

## Synthetic Sol marker

Synthetic Sol is identified only by:

```ts
star.marker?.kind === "synthetic-sol"
```

Do not infer it from `id`, magnitude, color, spectral class, or distance.

The primary synthetic marker:

- bypasses ordinary minimum-magnitude filtering;
- never enters the ordinary `THREE.Points` buffer;
- uses validated fixed-equatorial placement;
- uses a dedicated marker-scale constant rather than `magnitudeToSize()` alone;
- renders a ring/reticle with radial rays so it remains distinguishable without color;
- owns a text label whose visibility follows `setLabelsVisible()`;
- keeps the marker shape visible when labels are hidden;
- stores `starId`, the star record, and role metadata in `userData`;
- contributes a primary marker hit object;
- registers stable ID `sol` in the primary position map;
- is disposed with the primary layer.

Reference layers never construct synthetic markers, even for malformed inputs.

## Reference-layer behavior

The reference layer is independently built from `referenceCatalog.stars` and `referenceCatalog.constellations`.

Styling is subdued and non-color-only:

- ordinary reference stars use a hollow-ring point shader;
- reference lines use a dashed shader and lower opacity;
- reference receives no star labels, constellation labels, marker labels, hover, click, selection, or focus behavior;
- reference does not share primary line materials or uniforms;
- reference root visibility is the only runtime toggle required by HPA-434.

Primary/reference index and topology equality is never assumed.

## Reference visibility state

Store one renderer-level preference:

```ts
private referenceVisible = false;
```

`setReferenceVisible(visible)` always performs both steps:

1. update `this.referenceVisible`, regardless of whether a reference layer exists;
2. when a reference layer exists, set `referenceLayer.root.visible = visible`.

Prepared initialization semantics:

- when `request.referenceVisible` is provided, it updates the stored preference;
- when it is omitted, preserve the existing stored preference;
- after building a reference layer, apply the stored preference to its root;
- when no reference layer exists, retain the preference for a future initialization;
- toggling visibility never rebuilds, disposes, or mutates either catalog layer.

Tests must compare primary/reference object identity before and after the toggle.

## Interaction behavior

Primary remains authoritative:

- constellation hover/click raycasts primary line objects only;
- ordinary-star hover raycasts primary ordinary points and maps the intersection index to `renderedOrdinaryStars` exactly;
- marker hover raycasts primary marker hit objects and returns synthetic Sol;
- decorative background and reference objects are excluded from pointer targets;
- `setSelected()` updates primary line uniforms only;
- label toggles affect primary ordinary labels, constellation labels, and synthetic Sol text label;
- camera drag, momentum, auto-rotate, reduced-motion, tween, and `worldToScreen()` behavior remains shared and unchanged.

If line and star/marker hits occur in the same pointer sample, preserve the existing constellation-hover callback and independently emit the primary star/marker hover callback.

## Focus behavior and pitch clamp

`focusStarById()`:

1. reads a primary world position by stable ID;
2. returns `false` when the ID is absent or reference-only;
3. computes `r = hypot(x, y, z)`;
4. computes yaw with `atan2(x, z)`;
5. computes pitch with `asin(y / r)`;
6. delegates to `tweenCameraTo(pitch, yaw, durationMs)`;
7. returns `true` when the target was resolved and a camera update/tween was requested.

The existing `tweenCameraTo()` clamp of `±MAX_ELEVATION_RAD` remains authoritative. A star at or near an equatorial pole can therefore be approached only to the existing approximately `±81.8°` camera limit, not centered at exact `±90°`. `focusStarById()` returning `true` means the target was found, not that the camera can violate its safety clamp. Tests pin this behavior so HPA-435's Find Sol integration does not assume exact pole centering.

Reduced motion continues to use the existing immediate camera-update path.

## Labels and orientation guides

Primary ordinary-star and constellation labels continue using existing label policy and localization-supplied names.

- reference creates no labels;
- synthetic Sol creates one primary marker label;
- `setLabelsVisible()` controls all primary text labels but not the Sol marker shape;
- Earth-horizontal mode creates the horizon ring and cardinal labels;
- fixed-equatorial mode creates neither because the view represents a system barycenter, not an alien surface horizon.

Reinitialization removes obsolete guides and labels before creating mode-appropriate resources.

## Shared initialization and animation-loop ownership

Both public initialization methods call one private shared path.

Shared initialization order:

1. dispose old primary/reference catalog layers;
2. dispose old Earth-only guides and primary external label groups not owned by a layer;
3. clear stale selected/hovered IDs and hit/focus registries;
4. preserve the one decorative-background root;
5. build primary from its authoritative catalog;
6. build optional reference independently;
7. apply stored reference visibility;
8. create Earth guides only for Earth-horizontal mode;
9. set camera state using the existing sky-camera policy;
10. start animation only when no RAF chain exists.

Use an explicit loop-running guard rather than treating the latest RAF ID as proof that only one chain exists:

```ts
private animationRunning = false;

private ensureAnimationRunning(): void {
    if (this.animationRunning || this._disposed) return;
    this.animationRunning = true;
    this.animate();
}
```

`animate()` schedules the next frame while `animationRunning` is true. Final `dispose()` clears the flag and cancels the outstanding request.

This is a fix for an existing latent reinitialization bug, not merely a new reference-layer safeguard.

## Lifecycle and disposal

`ConstellationCatalogLayer.dispose()` is idempotent and releases:

- ordinary points geometry and shader material;
- line geometries and materials;
- marker geometries, materials, textures, and sprites;
- label textures/materials owned by the layer;
- child groups and root attachment;
- point lookup, hit-object, and ID-position collections.

Renderer-level cleanup releases:

- both layer instances;
- Earth orientation guides;
- any renderer-owned primary labels retained outside the layer;
- active shooting-star geometry/material;
- the full decorative-background root on final disposal only;
- event listeners, RAF/momentum callbacks, canvas, and WebGL renderer as today.

Reinitialization must leave the decorative root intact and must not retain stale reference visibility objects, selected IDs, hovered IDs, world positions, or hit targets.

## Error handling

Renderer failures are local and non-transforming:

- invalid top-level coordinate: skip that rendered object and warn in development;
- invalid constellation endpoint: skip only the affected line segment;
- malformed legacy line: drop it in the legacy adapter;
- unexpected reference marker: skip it and warn in development;
- absent reference catalog: keep the stored visibility preference but build no reference root;
- missing focus ID: return `false`;
- repeated disposal: no-op after the first complete cleanup.

HPA-434 does not add user-facing fallback copy or catalog diagnostics. HPA-433 remains authoritative for transformation diagnostics, and HPA-435 owns visible fallback handling.

## Testing strategy

### Placement tests

Add `src/lib/constellation/__tests__/rendererPlacement.test.ts` covering:

- Earth-horizontal output matching `celestialToSphere()`;
- all six fixed-equatorial axis fixtures;
- fixed placement equality across different dates, locations, and timezones;
- finite-input and declination-range failures;
- no use of Earth-horizontal transforms in fixed mode.

### Catalog-layer tests

Add `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts` covering:

- direct top-level star consumption;
- one top-level point despite repeated constellation membership;
- independent primary/reference point counts and line topology;
- no random procedural entries in catalog buffers;
- deterministic per-role/per-ID shader seeds;
- readonly/frozen catalog safety;
- primary marker construction before magnitude filtering;
- primary-only marker role guard and defensive reference-marker skip;
- hollow reference stars and dashed reference lines;
- primary-only hit objects, selection, and position registration;
- malformed legacy line normalization;
- placement failure skipping;
- idempotent disposal of every owned resource.

### Renderer integration tests

Extend `ConstellationRenderer.test.ts` covering:

- legacy Earth initialization still delegates to `celestialToSphere()`;
- Earth ambience remains visible under the one decorative root while catalog point counts contain real stars only;
- exactly one decorative root survives repeated initialization;
- prepared primary and reference use authoritative matched pairs;
- primary/reference topology can differ without lookup corruption;
- fixed-equatorial output is time/geolocation independent;
- synthetic Sol remains rendered when ordinary magnitude threshold would reject magnitude `0`;
- synthetic marker uses a dedicated size/style path;
- synthetic hover and `getStarWorldPosition("sol")`;
- `focusStarById("sol")` yaw/pitch math;
- focus behavior at the camera pitch clamp;
- reference visibility always updates stored state and changes only root visibility;
- visibility toggling preserves layer/object identity;
- reference-only IDs are not hoverable or focusable;
- Earth-only horizon/cardinal guides;
- repeated initialization starts one RAF chain;
- reinitialization clears stale state and disposes old layers;
- final disposal releases layers, decorative background, listeners, and renderer.

### Regression verification

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/rendererPlacement.test.ts
bunx vitest run src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts
bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts
bun run test:run
bun run type-check
bun run lint
bun run build
```

## Risks and mitigations

### Cross-role index corruption

**Risk:** A reference point or line index is interpreted against primary arrays.

**Mitigation:** Each layer owns its exact point lookup, topology, hit objects, and world-position map. Reference never participates in primary interaction.

### Marker-role leakage

**Risk:** Generic partitioning builds a duplicate, non-interactive reference synthetic marker.

**Mitigation:** Marker construction is explicitly primary-only. Unexpected reference markers are skipped and covered by tests.

### Earth ambience regression

**Risk:** Removing 500 procedural points from sparse Earth catalog buffers visibly reduces sky density.

**Mitigation:** Move that ambience under the one persistent scene-level decorative-background owner instead of deleting it. Earth regression tests distinguish semantic catalog counts from retained decorative ambience.

### Fixed-frame contamination

**Risk:** Prepared coordinates accidentally receive Earth date/location/sidereal rotation.

**Mitigation:** Explicit placement mode, isolated placement helper, axis fixtures, and cross-date/location equality tests.

### Non-finite GPU buffers

**Risk:** A malformed/deserialized coordinate bypasses HPA-433 assumptions and writes `NaN` into geometry.

**Mitigation:** Finite/range validation at the renderer boundary and local skip behavior.

### Render-order instability

**Risk:** Equal `renderOrder` values make overlay hierarchy depend on insertion order.

**Mitigation:** Assign unique explicit orders for reference stars/lines, primary stars/lines, markers, and labels.

### Pole focus limitation

**Risk:** Find Sol appears not to center a target near `±90°` declination.

**Mitigation:** Document and test the existing `±MAX_ELEVATION_RAD` clamp; `focusStarById()` reports target resolution, not exact unclamped centering.

### Resource leaks

**Risk:** Reinitialization or visibility toggles leave stale geometries, textures, hit objects, or RAF loops.

**Mitigation:** Idempotent layer disposal, root-only visibility toggling, explicit stale-state clearing, and one-loop guard tests.

### Scope leakage into HPA-435

**Risk:** Renderer work starts owning route state, observer mapping, HUD, localization, or fallback UI.

**Mitigation:** Public APIs accept already-prepared catalogs and generic stable IDs only. No Svelte, route, Galaxy-data, or localization dependency enters the new renderer modules.

## Acceptance criteria mapping

- **Existing Earth/Sol mode remains backward compatible:** legacy adapter preserves Earth placement, interactions, guides, labels, camera policy, and moves sparse ambience to the scene-level decorative owner.
- **Prepared catalogs render without mutation:** readonly renderer boundary and frozen-input tests.
- **Authoritative top-level stars are consumed directly:** layer points use `catalog.stars`; constellation membership is line/label input only.
- **Different topology is supported:** independent role-owned layers and fixtures.
- **Prepared directions bypass Earth transforms:** fixed-equatorial helper and time/geolocation independence tests.
- **Synthetic Sol bypasses ordinary culling and sizing:** primary-only dedicated marker path.
- **Prepared layers do not inject random catalog points:** no layer fallback; one independent decorative background.
- **Reference visibility changes immediately without reconstruction:** stored preference plus root visibility toggle and identity tests.
- **Stable hover/selection/focus IDs continue to work:** exact primary lookup/hit/position registries.
- **All added resources are disposed:** idempotent layer and renderer lifecycle tests.

## File plan

Create:

- `src/lib/constellation/rendererPlacement.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/lib/constellation/__tests__/rendererPlacement.test.ts`
- `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts`

Modify:

- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
- `src/test/setup.ts` only as required to model new Three.js resources accurately.

Explicitly unchanged:

- `src/components/ConstellationWrapper.svelte`;
- route state and Galaxy entry;
- observer-system/source-star mapping;
- HPA-431 astronomy formulas;
- HPA-433 catalog preparation;
- localization and HUD copy;
- 2D fallback integration.

## Review resolution notes

The design review clarifications are resolved as follows:

1. Marker construction is explicitly primary-only; unexpected reference markers are skipped.
2. Legacy Earth procedural ambience is extracted into the one decorative-background owner rather than silently removed or left in catalog geometry.
3. `setReferenceVisible()` always stores the preference and additionally updates an existing root.
4. Every role/object category receives a unique explicit `renderOrder`.
5. Fixed-equatorial placement relies on HPA-433 normalization but still performs finite/range validation at the GPU boundary.
6. Focus semantics explicitly retain and test the existing pitch clamp.

The tuple-safety note is also incorporated: prepared tuple lines remain tuples, while only the legacy adapter normalizes mutable `number[][]` input.

## Open decisions

None. The implementation plan should be reconciled with this reviewed specification before production code begins.
