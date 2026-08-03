# HPA-434 Alternate-Observer and Earth-Reference Renderer Design

**Status:** Proposed for review  
**Linear:** HPA-434 — Render alternate-observer and Earth-reference layers  
**Depends on:** HPA-431 observer-relative transforms; HPA-433 prepared observer catalogs  
**Blocks:** HPA-435 observer HUD, Find Sol, fallbacks, and localization

## Summary

Extend `ConstellationRenderer` so it can render an immutable prepared primary catalog and an optional Earth/Sol-reference catalog in one shared Three.js scene while preserving the existing Earth-surface sky path.

The renderer will keep one camera, one canvas, one animation loop, and one input system. It will delegate role-owned star, line, marker, lookup, and disposal resources to a reusable internal `ConstellationCatalogLayer`. The existing `initialize()` method remains the backward-compatible Earth-horizontal adapter. A new `initializePreparedCatalogs()` method consumes the authoritative matched catalog pairs produced by HPA-433 and places them in a deterministic fixed-equatorial frame.

Synthetic Sol is rendered through a dedicated primary marker path identified by `marker.kind === "synthetic-sol"`. It does not enter the ordinary star buffer, does not use magnitude culling, and is not sized solely by the compatibility magnitude value. The optional reference layer uses independent geometry and non-color-only hollow/dashed styling, remains non-interactive, and can be toggled by changing its root group's visibility without rebuilding unrelated resources.

## Goals

- Preserve the current Earth/Sol constellation experience and its `celestialToSphere()` behavior.
- Render HPA-433 prepared primary and optional reference catalogs without mutation or membership flattening.
- Place prepared catalogs in a deterministic fixed-equatorial frame independent of browser time and geolocation.
- Support intentionally different primary/reference top-level stars, local constellation stars, and line topology.
- Render synthetic Sol as an unmistakable, focusable, hoverable marker.
- Keep primary as the sole interaction authority while reference remains a visual comparison layer.
- Remove per-catalog random procedural stars and retain one independent decorative background.
- Ensure reinitialization and final disposal release every new Three.js resource and stale interaction entry.

## Non-goals

- Coordinate transformation or catalog preparation logic.
- Observer-system to source-star mapping.
- Route parsing, Galaxy entry, observer HUD, localization, accessibility copy, or fallback UI.
- Earth visibility filtering for alternate-observer or reference catalogs.
- Distance-modulus brightness correction.
- Surface horizon, atmosphere, latitude, axial tilt, seasons, or local time for alien observers.
- A second WebGL canvas or synchronized renderer instance.

## Existing renderer constraints

The current `ConstellationRenderer` assumes one Earth-horizontal catalog:

- `starPoints` owns one ordinary-star buffer.
- `_stars` maps one point-buffer index space to hover records.
- `constellationLines` owns one line group.
- labels, horizon, and cardinal guides are constructed as Earth-view scene objects.
- star, line, and label coordinates all call `celestialToSphere()` with location and date.
- sparse star buffers receive 500 random procedural points.
- `clearScene()` disposes one set of catalog resources.
- `initialize()` starts the render loop after each initialization.

HPA-433 now produces immutable authoritative matched pairs:

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

Create an internal owner for the resources and index spaces of one catalog role. Instantiate it once for primary and optionally once for reference. `ConstellationRenderer` retains scene, camera, input, callbacks, public state, labels policy, orientation guides, and animation orchestration.

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
- Earth orientation guides enabled; and
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

Rules:

- `primaryCatalog.stars` and `primaryCatalog.constellations` are consumed directly as a matched pair.
- `referenceCatalog.stars` and `referenceCatalog.constellations` are consumed directly as a second matched pair.
- Neither input is mutated, sorted, deduplicated, or reconstructed.
- Primary and reference are permitted to have different star sets and topology.
- Alternate-observer callers use `"fixed-equatorial"`.
- The API retains placement mode explicitly so the renderer boundary remains testable and the Earth adapter uses the same shared initialization machinery.

### Runtime APIs

Add:

```ts
setReferenceVisible(visible: boolean): void;

focusStarById(
    id: string,
    durationMs?: number,
): boolean;

getStarWorldPosition(
    id: string,
): { x: number; y: number; z: number } | null;
```

Semantics:

- `setReferenceVisible()` stores the requested state even when no reference layer currently exists.
- When a reference layer exists, the method changes only `referenceLayer.root.visible`.
- `focusStarById()` resolves only primary rendered stars and primary markers.
- A reference-only source star is not focusable and cannot become a second interaction authority.
- `focusStarById()` returns `false` without moving the camera when the ID is absent from the primary world-position registry.
- `getStarWorldPosition()` returns a new plain object, never a mutable internal `THREE.Vector3`.

## Renderer-facing catalog boundary

Do not weaken HPA-433's output types globally. Add a narrow renderer-internal structural boundary that accepts both legacy and prepared inputs:

```ts
interface RendererCatalogStar extends Readonly<Star> {
    readonly marker?: Readonly<{
        readonly kind: "synthetic-sol";
    }>;
}

interface RendererConstellation {
    readonly id: string;
    readonly name: string;
    readonly abbreviation: string;
    readonly description: string;
    readonly mythology?: string;
    readonly stars: readonly RendererCatalogStar[];
    readonly lines: readonly (readonly number[])[];
    readonly visibility: Readonly<Constellation["visibility"]>;
}

interface RendererCatalog {
    readonly stars: readonly RendererCatalogStar[];
    readonly constellations: readonly RendererConstellation[];
}
```

The broader `readonly number[]` line boundary is intentional: prepared catalogs provide exact tuples, while legacy `Constellation.lines` is currently typed as `number[][]`. The layer continues to guard for exactly two integer in-range endpoints before reading a segment.

## Internal component model

Create `src/lib/constellation/ConstellationCatalogLayer.ts`.

```ts
export type CatalogLayerRole = "primary" | "reference";

export interface CatalogLayerBuildOptions {
    readonly role: CatalogLayerRole;
    readonly catalog: RendererCatalog;
    readonly placementMode: CatalogPlacementMode;
    readonly skyConfig: Readonly<SkyConfiguration>;
}
```

Each layer instance owns:

- one root `THREE.Group` added to the renderer scene;
- one ordinary-star `THREE.Points` object when at least one ordinary star is rendered;
- one constellation-line `THREE.Group` built only from that catalog's local stars and line indices;
- one optional marker `THREE.Group` for primary special markers;
- the exact point-buffer-index to star-record array for its ordinary-star buffer;
- stable-ID to world-position entries for rendered primary ordinary stars and markers;
- role-specific shader materials and attributes;
- marker textures, materials, sprites, and hit objects;
- disposal state preventing double disposal.

The layer exposes only the operations needed by `ConstellationRenderer`:

```ts
interface ConstellationCatalogLayer {
    readonly root: THREE.Group;
    readonly starPoints: THREE.Points | null;
    readonly lineGroup: THREE.Group;
    readonly markerHitObjects: readonly THREE.Object3D[];

    getPointStar(index: number): RendererCatalogStar | null;
    getWorldPosition(id: string): THREE.Vector3 | null;
    setSelectedConstellation(id: string | null): void;
    tick(deltaSec: number): void;
    setMarkerLabelsVisible(visible: boolean): void;
    dispose(): void;
}
```

Primary-only operations return empty/no-op results for reference. The renderer does not inspect private geometry arrays or duplicate disposal logic.

## Scene ownership

`ConstellationRenderer` continues to own:

- `THREE.Scene`, camera, WebGL renderer, and canvas;
- persistent decorative `starfield-background`;
- input listeners, raycaster, camera motion, tweening, reduced motion, and animation loop;
- current primary and optional reference layer references;
- ordinary primary star labels and primary constellation labels;
- Earth horizon/cardinal guides;
- selected and hovered constellation IDs;
- reference visibility preference;
- public callbacks.

The catalog layer owns role-specific stars, lines, special markers, and their resource disposal. The renderer owns label visibility policy; it applies that policy to renderer-owned labels and calls `primaryLayer.setMarkerLabelsVisible()` for synthetic Sol's text label.

## Placement model

Create `src/lib/constellation/rendererPlacement.ts` with a pure helper:

```ts
export function placeCatalogCoordinate(
    star: Pick<Star, "rightAscension" | "declination">,
    placementMode: CatalogPlacementMode,
    skyConfig: Readonly<SkyConfiguration>,
    radius: number,
): { x: number; y: number; z: number };
```

### Earth-horizontal placement

For `"earth-horizontal"`, delegate directly to the existing function:

```ts
celestialToSphere(
    star.rightAscension,
    star.declination,
    skyConfig.location,
    skyConfig.dateTime,
    radius,
)
```

The returned `x`, `y`, and `z` are used unchanged. This preserves latitude, longitude, date, hour angle, sidereal time, horizon, and existing axis behavior.

### Fixed-equatorial placement

For `"fixed-equatorial"`, map the already-prepared RA/declination direction directly onto the display sphere:

```ts
radialToCartesian(
    radius,
    star.rightAscension * 15,
    star.declination,
)
```

This follows the HPA-431 Y-up convention:

- declination `+90°` maps to `+Y`;
- declination `-90°` maps to `-Y`;
- RA `0h`, Dec `0°` maps to `+X`;
- RA `6h`, Dec `0°` maps to `+Z`;
- RA `12h`, Dec `0°` maps to `-X`;
- RA `18h`, Dec `0°` maps to `-Z`.

Fixed-equatorial placement ignores every Earth-local field in `skyConfig`. Two calls with different location, timezone, and date values produce the same result for the same star and radius.

No coordinate transformation is performed here. HPA-433 has already prepared the RA and declination values.

## Display radii and render ordering

Preserve current Earth radii in legacy mode. For fixed-equatorial mode, use small radial separation and render ordering to avoid line z-fighting while preserving angular direction:

| Resource | Radius | Render order |
| --- | ---: | ---: |
| Reference lines | 97 | 1 |
| Primary lines | 98 | 2 |
| Reference ordinary stars | 99 | 2 |
| Primary ordinary stars | 100 | 3 |
| Synthetic Sol marker | 100 | 4 |
| Primary star labels | 105 | 5 |
| Synthetic Sol text label | 105 | 5 |
| Primary constellation labels | 110 | 6 |

All star and marker materials remain transparent with `depthWrite: false`. The small radius differences are display-only and never written back to catalog data.

## Ordinary-star rendering

### Catalog partitioning

For each top-level `catalog.stars` entry:

1. identify synthetic Sol by the exact marker kind before magnitude filtering;
2. route recognized markers to the dedicated marker path;
3. apply `minimumMagnitude` only to ordinary stars;
4. place accepted ordinary stars with `placeCatalogCoordinate()`;
5. append the star to the role's exact point-index lookup list; and
6. register its world position only when the role is primary.

Constellation membership is not consulted when building the top-level point buffer.

### Primary point style

Retain the existing filled-disc additive point shader and magnitude-derived point size for ordinary primary stars.

### Reference point style

Use a separate hollow-ring fragment shader. The alpha mask must visibly contain a transparent center and a ring band, so the distinction survives grayscale and common color-vision deficiencies. Reference opacity and twinkle amplitude are lower than primary.

### Deterministic seeds

Remove `Math.random()` from catalog point attributes. Derive `aSeed` from a stable 32-bit FNV-1a hash of:

```text
<role>:<stable-star-id>
```

Normalize the unsigned hash to `[0, 1)`. Reinitializing the same catalog produces byte-equivalent seed attributes regardless of browser time or observer selection.

The persistent starfield background may continue using its shader-based decorative pattern because it is not catalog geometry and has no IDs or interactions.

## Procedural-star boundary

Delete the sparse-buffer branch that appends 500 random points inside `createStars()` or its replacement.

Required invariants:

- prepared primary and reference layers never inject random catalog points;
- the Earth adapter also uses the same no-injection catalog layer;
- only the persistent `starfield-background` remains as decorative ambience;
- decorative pixels never enter point lookup arrays;
- decorative content cannot be hovered, selected, focused, labelled, or counted as prepared output; and
- observer changes do not change catalog geometry through randomness.

The renderer therefore has exactly one decorative background, not one fallback per catalog role.

## Constellation-line rendering

Each layer builds lines from its own `catalog.constellations` array.

For each constellation:

1. place that constellation's local stars using the layer's placement mode and line radius;
2. accept only line entries containing exactly two integer in-range indices;
3. append a segment only when both local positions exist;
4. create one `THREE.LineSegments` object for the accepted segments;
5. attach `constellationId` and `role` to `userData`; and
6. add it to that layer's line group.

The renderer never assumes equal constellation counts, equal local star counts, or equal segment indices between roles.

Primary line materials keep current selected/dimmed uniforms and pulse behavior. Reference line materials use:

- lower base opacity;
- a repeated dash/gap alpha mask based on per-segment line progress; and
- no selection/dimming coupling.

Dash pattern, not color alone, distinguishes the reference topology.

## Primary labels

Ordinary star labels and constellation labels remain primary-only and follow current brightness/name behavior unless marker-specific rules below override it.

Every label coordinate uses the same placement mode as its primary catalog. Fixed-equatorial labels must not call Earth-local placement.

Reference receives no ordinary star labels or constellation labels.

`setLabelsVisible()` controls:

- primary ordinary-star label group;
- primary constellation label group; and
- synthetic Sol text label.

It does not hide the synthetic Sol marker shape.

## Synthetic Sol marker

### Detection

Use `isSyntheticSolStar()` from `observerCatalog.ts` or an equivalent exact value check:

```ts
star.marker?.kind === "synthetic-sol"
```

Do not infer synthetic Sol from:

- `id === "sol"` alone;
- magnitude;
- color;
- spectral class; or
- distance.

The stable ID remains `sol` for lookup, but marker behavior is selected by the marker contract.

### Rendering

Synthetic Sol never enters ordinary point geometry.

Create a primary marker root at the fixed-equatorial world position containing:

- a camera-facing marker sprite whose texture visibly draws a central ring plus eight radial rays/reticle ticks;
- a separate text-label sprite reading the star's name;
- marker `userData` containing `starId`, the source star record, and `markerKind: "synthetic-sol"`; and
- a hit-test object included in `primaryLayer.markerHitObjects`.

Use a fixed marker scale contract independent of `magnitudeToSize()`:

- marker sprite: `8 × 8` world units at radius `100`;
- text label: `10 × 2.5` world units at radius `105`.

The marker's compatibility magnitude may remain `0`, but changing `minimumMagnitude` below `0` must not remove the marker.

### Interaction and focus

Register the marker world position under stable ID `sol` in the primary world-position map.

Marker hover returns the original synthetic Sol star through `onStarHover`. Marker pointer hits participate only in the primary interaction pass.

`focusStarById("sol")` computes camera angles from the stored position:

```ts
const radius = Math.hypot(position.x, position.y, position.z);
const targetYaw = Math.atan2(position.x, position.z);
const targetPitch = Math.asin(position.y / radius);
```

It then calls the existing `tweenCameraTo(targetPitch, targetYaw, durationMs)`. Existing reduced-motion logic continues to apply.

## Reference-layer behavior

The reference layer is the full HPA-433 Sol-observer reference catalog in fixed equatorial coordinates. It is not the current Earth-local visible sky.

It may contain source stars and line segments omitted from primary. It is independently constructed and never indexed through primary arrays.

Reference rules:

- hollow ordinary-star marker shader;
- dashed, lower-opacity lines;
- no star or constellation labels;
- no hover or click raycasting;
- no stable-ID focus registry;
- no selection uniforms tied to primary;
- no synthetic Sol marker expected or created;
- no procedural fallback.

`setReferenceVisible()` changes only `referenceLayer.root.visible`. The same root object, geometries, and materials remain allocated while visibility toggles. Repeated visibility changes do not invoke placement, geometry creation, texture creation, or disposal.

## Interaction model

Primary is the sole authority.

### Constellation interaction

- line hover raycasts `primaryLayer.lineGroup.children` only;
- line click raycasts `primaryLayer.lineGroup.children` only;
- `setSelected()` delegates to `primaryLayer.setSelectedConstellation()` only;
- reference lines never emit callbacks and never dim with primary selection.

### Ordinary-star hover

Raycast `primaryLayer.starPoints` only. Map the returned point index through `primaryLayer.getPointStar(index)`, which reflects the exact filtered ordinary-star buffer.

Procedural background and marker objects never occupy this point index space.

### Marker hover

Raycast `primaryLayer.markerHitObjects`. Combine ordinary point and marker results and choose the nearest valid hit. Emit one `onStarHover` callback with the primary star record and screen position.

Reference objects are absent from all interaction collections.

### Existing controls

Preserve:

- pointer drag and touch drag;
- momentum;
- mouse-wheel field-of-view adjustment;
- auto-rotate;
- reduced-motion behavior;
- camera tweening;
- `worldToScreen()`;
- camera azimuth/elevation getters.

HPA-434 does not introduce a second camera or mode-specific navigation system.

## Orientation guides and camera setup

Create horizon and cardinal guides only when placement mode is `"earth-horizontal"`.

Fixed-equatorial mode has no surface horizon or local cardinal directions. It must not create misleading N/E/S/W sprites or a horizon ring.

Keep the current `setupSkyCamera()` behavior for both modes in this issue. HPA-434 does not redefine initial camera semantics; HPA-435 supplies product-facing Find Sol and observer controls.

## Shared initialization flow

Refactor both public initialization methods into one internal operation:

```ts
private async initializeCatalogs(
    primaryCatalog: RendererCatalog,
    referenceCatalog: RendererCatalog | undefined,
    placementMode: CatalogPlacementMode,
    skyConfig: Readonly<SkyConfiguration>,
    referenceVisible: boolean,
): Promise<void>
```

Sequence:

1. dispose and detach existing primary/reference catalog layers;
2. dispose renderer-owned primary label groups and orientation guides;
3. clear primary world-position and hit state;
4. clear selected and hovered IDs and emit null hover state where needed;
5. preserve the persistent starfield background;
6. build the new primary layer;
7. build the optional reference layer independently;
8. apply the stored reference visibility preference;
9. create primary ordinary and constellation labels using the same placement mode;
10. apply runtime label visibility, including the synthetic Sol label;
11. create Earth orientation guides only for Earth-horizontal mode;
12. run existing camera setup; and
13. start the animation loop only when no loop is already active.

The method does not mutate or clone the caller's catalog solely to change role, visibility, or ordering.

## Animation loop

Use one animation loop for the renderer lifetime.

`initializeCatalogs()` calls `animate()` only when `_rafId === null`. Each animation frame:

- advances camera tween and auto-rotate as today;
- calls `primaryLayer?.tick(deltaSec)`;
- calls `referenceLayer?.tick(deltaSec)`;
- advances shooting-star decorative behavior as today; and
- renders the shared scene once.

Reinitialization must not create concurrent loops.

## Lifecycle and disposal

### Layer disposal

`ConstellationCatalogLayer.dispose()` is idempotent and:

- removes its root group from the scene or leaves detachment to the renderer under one documented convention;
- disposes ordinary-star geometry and material;
- disposes every line geometry and material;
- disposes marker geometries, textures, sprite materials, and hit materials;
- clears point lookup and world-position maps;
- clears marker hit arrays;
- marks the layer disposed.

Choose one detachment owner and use it consistently. The recommended convention is: renderer removes `layer.root` from the scene, then calls `layer.dispose()`.

### Renderer reinitialization

Reinitialization disposes both old layers and all renderer-owned labels/guides but preserves:

- canvas;
- WebGL renderer;
- camera;
- event listeners;
- persistent starfield background;
- one active animation loop;
- runtime label/reference visibility preferences.

### Final renderer disposal

Final `dispose()` additionally:

- cancels render and momentum animation frames;
- disposes any active shooting star;
- disposes both catalog layers;
- disposes all labels and orientation guides;
- disposes starfield background geometry/material;
- removes every event listener;
- removes canvas from the DOM; and
- disposes the WebGL renderer.

No stable-ID map, point lookup, selected ID, hovered ID, or marker hit object may survive reinitialization or final disposal.

## Error handling

HPA-433 prepared catalogs are already validated, but renderer boundaries remain defensive:

- malformed local line entries are skipped rather than throwing;
- missing line endpoints skip only that segment;
- an empty catalog builds an empty layer without procedural catalog points;
- absence of a reference catalog leaves the stored visibility preference intact;
- `focusStarById()` returns `false` for an unknown or magnitude-culled ordinary star;
- recognized synthetic Sol bypasses culling and remains focusable;
- duplicate primary top-level IDs use first rendered occurrence for world-position lookup and do not rewrite input data.

WebGL construction failure and wrapper-level fallback remain existing wrapper responsibilities.

## Immutability and determinism

The renderer treats request objects, catalogs, stars, constellations, line arrays, visibility arrays, and configuration as readonly.

It may create Three.js buffers and internal plain lookup records, but it must not:

- assign to input fields;
- sort input arrays in place;
- append synthetic Sol;
- deduplicate top-level stars;
- rewrite line indices;
- toggle a caller-owned visibility field; or
- attach Three.js objects to catalog records.

For identical prepared inputs, placement geometry, role styling attributes, and deterministic seed arrays are identical across reinitialization regardless of current time, geolocation, or `Math.random()` state.

## Testing strategy

### Pure placement tests

Add focused unit tests for `rendererPlacement.ts`:

- Earth mode delegates to `celestialToSphere()` and preserves its output.
- Fixed-equatorial RA/Dec axis fixtures match HPA-431 convention.
- Fixed-equatorial output is independent of location, timezone, and date.
- Radius changes scale magnitude without changing direction.

### Layer tests

Add focused `ConstellationCatalogLayer` tests for:

- direct top-level ordinary-star consumption;
- repeated constellation membership producing one top-level point;
- malformed line guards;
- independent primary and reference star counts;
- independent line topology;
- no procedural points for empty/small catalogs;
- deterministic FNV-1a seeds by role and stable ID;
- primary filled versus reference hollow point shaders;
- primary solid/pulsing versus reference dashed line shaders;
- primary stable-ID positions and reference absence from focus registry;
- idempotent complete disposal.

### Renderer integration tests

Extend `ConstellationRenderer.test.ts` for:

- unchanged legacy Earth initialization;
- regression coverage that Earth coordinates still call `celestialToSphere()` with location/date;
- prepared catalogs consumed as authoritative matched pairs;
- primary/reference topology differences without lookup corruption;
- frozen input safety;
- fixed-equatorial independence from browser time and geolocation;
- synthetic Sol bypassing magnitude culling;
- synthetic Sol using marker-specific fixed scale/style;
- synthetic Sol hover and `focusStarById("sol")`;
- `getStarWorldPosition("sol")` returning a copy;
- reference visibility changing root identity-preservingly without reconstruction;
- reference-only stars not hoverable or focusable;
- primary-only selection uniforms;
- Earth guides present only in Earth-horizontal mode;
- one persistent decorative background;
- reinitialization disposing stale primary/reference resources;
- repeated initialization maintaining one animation loop;
- final disposal releasing all added geometry, materials, textures, sprites, groups, and event state.

### Test-mock updates

Update the shared Three.js test mock only as required to represent:

- `Points.visible`, `name`, `renderOrder`, and `userData`;
- group `visible` state;
- marker sprite/group raycasting;
- buffer attributes needed to inspect stable seeds;
- material shader fields and disposal spies.

Do not broaden unrelated graphics mocks.

## Acceptance mapping

| HPA-434 acceptance criterion | Design mechanism |
| --- | --- |
| Existing Earth/Sol mode remains compatible | `initialize()` is an Earth-horizontal adapter and delegates to unchanged `celestialToSphere()` behavior. |
| Prepared catalogs render without mutation | Readonly renderer boundary and immutable shared initialization path. |
| Authoritative top-level stars are consumed directly | Layer point buffers iterate only `catalog.stars`; no membership flattening. |
| Different topology is supported | Independent layer instances, local positions, line geometry, and lookup spaces. |
| Alien/reference directions bypass Earth transforms | Pure fixed-equatorial placement through HPA-431 `radialToCartesian()`. |
| Synthetic Sol survives ordinary culling | Marker partition occurs before minimum-magnitude filtering. |
| Synthetic Sol has dedicated size/style | Fixed ring-and-rays marker sprite and separate label contract. |
| Prepared layers do not inject random stars | Sparse procedural branch is removed; one independent starfield background remains. |
| Reference visibility does not rebuild resources | Toggle only `referenceLayer.root.visible`. |
| Stable hover/selection/focus continue | Primary-only exact point lookup, marker hit objects, line groups, and ID-to-position map. |
| All resources are disposed | Idempotent layer disposal plus renderer-owned label/guide/background teardown. |

## File boundaries

Expected implementation work after this design is approved:

### Create

- `src/lib/constellation/rendererPlacement.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- focused tests for both modules

### Modify

- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
- `src/test/setup.ts` only for narrowly required Three.js mock behavior

### Explicitly unchanged in HPA-434

- `src/components/ConstellationWrapper.svelte`
- route-state utilities
- Galaxy data and Galaxy components
- `observerCatalog.ts` transformation semantics
- `observerTransform.ts` astronomy formulas
- observer-source mapping
- localization files
- HUD and fallback UI

## Risks and mitigations

### Legacy visual regression

Risk: moving existing Earth resource creation behind a shared layer changes placement, point sizes, label coordinates, or interaction indices.

Mitigation: Earth adapter tests pin `celestialToSphere()` calls, radii, culling, labels, and interaction behavior before prepared-mode work is added.

### Cross-role index corruption

Risk: primary point or line indices are accidentally resolved through reference arrays.

Mitigation: each layer privately owns its point lookup, local line geometry, and role-tagged objects. The renderer never shares index arrays.

### Synthetic marker hidden by generic behavior

Risk: compatibility magnitude or generic label toggles remove the marker.

Mitigation: marker partition precedes culling; shape visibility and label visibility are separate; size is a fixed marker contract.

### Reference overlay harms readability

Risk: reference lines and stars obscure primary geometry.

Mitigation: hollow points, dashed lines, lower opacity, lower render order, small radial separation, and no labels/interactions.

### Resource leaks during observer changes

Risk: repeated prepared initialization accumulates textures, materials, loops, or stale hit objects.

Mitigation: idempotent per-layer disposal, renderer-owned label disposal, one-loop guard, and resource-identity tests over repeated initialization.

### Renderer file remains too coupled

Risk: prepared mode doubles branching inside an already large renderer.

Mitigation: placement and role-owned resource creation move into two focused modules; renderer branches only at shared initialization, orientation-guide policy, and primary interaction routing.

## Review decisions requested

Approval of this spec confirms the following implementation decisions:

1. one internal catalog-layer abstraction, not duplicated fields or two renderers;
2. legacy `initialize()` retained as an Earth-horizontal adapter;
3. prepared catalogs consumed directly through `initializePreparedCatalogs()`;
4. HPA-431 fixed-equatorial axis convention used for display placement;
5. primary-only hover, selection, labels, and focus authority;
6. dedicated ring-and-rays synthetic Sol marker with fixed visual scale;
7. hollow-star and dashed-line non-color-only reference styling;
8. reference toggling by root visibility only;
9. no random procedural points in catalog buffers; and
10. renderer-focused scope with wrapper/HUD integration deferred to HPA-435.
