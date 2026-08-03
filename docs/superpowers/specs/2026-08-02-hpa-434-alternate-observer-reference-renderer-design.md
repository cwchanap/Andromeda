# HPA-434 Alternate-Observer and Earth-Reference Renderer Design

**Status:** Proposed for review  
**Linear:** HPA-434 — Render alternate-observer and Earth-reference layers  
**Depends on:** HPA-431 observer-relative transforms; HPA-433 prepared observer catalogs  
**Blocks:** HPA-435 observer HUD, Find Sol, fallbacks, and localization

## Summary

Extend `ConstellationRenderer` so it can render an immutable prepared primary catalog and an optional Earth/Sol-reference catalog in one shared Three.js scene while preserving the existing Earth-surface sky path.

The renderer keeps one camera, one canvas, one animation loop, and one input system. It delegates role-owned star, line, marker, label, lookup, and disposal resources to a reusable internal `ConstellationCatalogLayer`. The renderer owns scene orchestration, camera/input state, persistent visibility preferences, orientation guides, decorative background, callbacks, and animation-loop lifetime.

The existing `initialize()` and `updateSky()` methods remain backward-compatible Earth-horizontal entry points. A new `initializePreparedCatalogs()` method consumes the authoritative matched catalog pairs produced by HPA-433 and always places them in a deterministic fixed-equatorial frame.

Synthetic Sol renders through a dedicated **primary-only** marker path identified by `marker.kind === "synthetic-sol"`. It does not enter the ordinary star buffer, does not use magnitude culling, and is not sized solely by the compatibility magnitude value. The optional reference layer uses independent geometry and non-color-only hollow/dashed styling, remains non-interactive, and is toggled without rebuilding unrelated resources.

Sparse Earth ambience moves out of catalog geometry into one scene-level decorative owner. The ambient child may be created lazily by a sparse Earth initialization, but it is visible only in Earth-horizontal mode. Prepared fixed-equatorial output is therefore identical whether it is opened directly or after visiting Earth mode.

## Goals

- Preserve the current Earth/Sol coordinate, interaction, label, camera, settings, guide layering, and ambience behavior.
- Render HPA-433 prepared primary and optional reference catalogs without mutation or membership flattening.
- Place prepared catalogs in a deterministic fixed-equatorial frame independent of browser time, geolocation, and navigation history.
- Support intentionally different primary/reference top-level stars, local constellation stars, and line topology.
- Render synthetic Sol as an unmistakable, focusable, hoverable primary marker.
- Keep primary as the sole interaction authority while reference remains a visual comparison layer.
- Keep random decorative points outside catalog geometry and retain exactly one scene-level decorative background.
- Preserve lazy label creation and user-set visibility across initialization and reinitialization.
- Ensure reinitialization and final disposal release every new Three.js resource and stale interaction entry.
- Prevent repeated serialized initialization from creating concurrent animation loops.

## Non-goals

- Coordinate transformation or catalog preparation logic.
- Observer-system to source-star mapping.
- Route parsing, Galaxy entry, observer HUD, localization, accessibility copy, or fallback UI.
- Earth visibility filtering for alternate-observer or reference catalogs.
- Distance-modulus brightness correction.
- Surface horizon, atmosphere, latitude, axial tilt, seasons, or local time for alien observers.
- A second WebGL canvas or synchronized renderer instance.
- Removing the existing camera pitch clamp or redesigning camera controls.
- Making asynchronous initialization transactionally re-entrant. HPA-434 callers serialize initialization calls.
- Deciding whether alien-sky entry automatically focuses Sol. HPA-435 owns that product choice.
- Redefining compass/HUD terminology for fixed-equatorial mode. HPA-435 owns that presentation.

## Existing renderer constraints

The current `ConstellationRenderer` assumes one Earth-horizontal catalog:

- `starPoints` owns one ordinary-star buffer.
- `_stars` maps one point-buffer index space to hover records.
- `constellationLines` owns one line group.
- star and constellation labels are renderer-owned groups.
- star labels are lazily created when labels are enabled after initialization.
- `_labelsVisibleUserSet` lets a pre-initialization runtime toggle override `skyConfig.showStarNames`.
- horizon and cardinal guides are Earth-view scene objects.
- star, line, and label coordinates call `celestialToSphere()` with location and date.
- sparse star buffers receive 500 random procedural points when fewer than 100 ordinary stars survive filtering.
- random `aSeed` values are generated with `Math.random()`.
- `clearScene()` disposes one set of catalog resources while preserving `starfield-background`.
- `updateSky()` is a thin legacy wrapper over `initialize()`.
- `initialize()` calls `animate()` unconditionally, so repeated initialization can create concurrent RAF chains while `_rafId` remembers only the latest request.

HPA-433 produces immutable authoritative matched pairs:

```text
primaryCatalog.stars + primaryCatalog.constellations
referenceCatalog.stars + referenceCatalog.constellations
```

The renderer consumes each pair directly. It never rebuilds top-level stars from `constellations.flatMap(...)`, because flattening would omit synthetic Sol and duplicate stars that appear in more than one constellation.

## Approaches considered

### A. Duplicate primary/reference fields in `ConstellationRenderer`

Add primary and reference versions of every points group, line group, lookup array, label group, shader update, and disposal branch.

This minimizes initial file creation but duplicates behavior and makes future fixes easy to apply to one role but not the other. It also raises the risk of using primary indices with reference topology.

### B. One reusable internal catalog-layer owner

Create an internal owner for the resources and index spaces of one catalog role. Instantiate it once for primary and optionally once for reference. `ConstellationRenderer` retains scene, camera, input, callbacks, public preferences, orientation guides, decorative background, and animation orchestration.

The layer owns all role-specific rendering resources, including primary labels and synthetic Sol text. It caches the immutable inputs and accepted positions required to lazily create those labels later.

This provides explicit role boundaries, one lifecycle implementation, independent topology, one camera/input system, and one unambiguous label owner.

### C. Two `ConstellationRenderer` instances

Overlay two canvases and synchronize camera state and input.

This duplicates WebGL contexts and animation loops, complicates exact alignment, and makes pointer and disposal behavior fragile.

## Decision

Use approach B: one reusable internal `ConstellationCatalogLayer` instantiated per catalog role.

The renderer owns label **state**; the primary layer owns label **resources**. Reference layers create no labels.

## Public renderer contract

### Callback contract

Widen the star callback to the renderer-facing readonly type so synthetic Sol remains identifiable to HPA-435:

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
```

Legacy stars satisfy `RendererStar` structurally. Prepared synthetic Sol includes the optional marker field. Callers discriminate only through:

```ts
star.marker?.kind === "synthetic-sol"
```

The callback does not erase the marker to `Star`, and callers do not infer Sol from ID, magnitude, color, spectral class, or distance.

### Legacy Earth initialization

Keep the current entry point and widen only the array/config mutability boundary:

```ts
async initialize(
    stars: readonly Star[],
    constellations: readonly Constellation[],
    skyConfig: Readonly<SkyConfiguration>,
): Promise<void>
```

This method uses a pure legacy adapter and calls the shared initialization path with:

- Earth-horizontal placement context;
- no reference catalog;
- Earth orientation guides enabled;
- legacy ambient visibility enabled;
- line visibility governed by `skyConfig.showConstellationLines`;
- label visibility resolved through `skyConfig.showStarNames` and `_labelsVisibleUserSet`; and
- existing Earth radii and camera setup.

No Earth caller is required to construct HPA-433 prepared types.

### Prepared-catalog initialization

Prepared mode must not require fabricated Earth location, date, timezone, or field-of-view values.

Add:

```ts
export interface PreparedCatalogRenderSettings {
    readonly minimumMagnitude: number;
    readonly showConstellationLines: boolean;
    readonly showStarNames: boolean;
}

export interface PreparedCatalogRenderRequest {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly referenceVisible?: boolean;
}

async initializePreparedCatalogs(
    request: PreparedCatalogRenderRequest,
    settings: Readonly<PreparedCatalogRenderSettings>,
): Promise<void>
```

`initializePreparedCatalogs()` is structurally fixed-equatorial. It consumes supplied top-level `stars` arrays directly and never derives them from constellation membership.

Prepared settings policy:

- primary constellation lines honor `settings.showConstellationLines`;
- reference constellation lines also honor `settings.showConstellationLines` so the setting remains global and predictable;
- reference ordinary stars may remain visible when lines are disabled;
- primary ordinary/constellation/marker text labels use `settings.showStarNames` plus the existing runtime user-override policy;
- reference creates no labels under any setting.

### Legacy `updateSky()`

Keep:

```ts
async updateSky(
    stars: readonly Star[],
    constellations: readonly Constellation[],
    skyConfig: Readonly<SkyConfiguration>,
): Promise<void>
```

`updateSky()` remains legacy-only and delegates to `initialize()` with Earth-horizontal placement and no reference catalog. Prepared catalogs must use `initializePreparedCatalogs()`.

### Runtime APIs

Add:

```ts
setReferenceVisible(visible: boolean): void;

focusStarById(id: string, durationMs?: number): boolean;

getStarWorldPosition(
    id: string,
): { x: number; y: number; z: number } | null;
```

Preserve existing renderer API naming:

- renderer `setSelected(id)` forwards to `primaryLayer.setSelectedConstellation(id)` only;
- renderer `setHovered(id)` remains renderer-local interaction state and is not delegated to reference geometry.

`focusStarById()` and `getStarWorldPosition()` resolve primary rendered objects only. A star present only in the reference catalog is intentionally not focusable and does not become a second interaction authority.

## Renderer-facing readonly boundary and adapters

Create `src/lib/constellation/rendererCatalog.ts` for renderer-only types and pure adapters.

```ts
import type {
    PreparedConstellationCatalog,
    SyntheticSolMarker,
} from "@/lib/constellation/observerCatalog";

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
```

Expose pure adapters:

```ts
export function adaptPreparedCatalog(
    catalog: PreparedConstellationCatalog,
): RendererCatalog;

export function adaptLegacyCatalog(
    stars: readonly Star[],
    constellations: readonly Constellation[],
): RendererCatalog;
```

### Prepared adapter rules

`PreparedConstellationCatalog` is structurally assignable to `RendererCatalog`. `adaptPreparedCatalog()` is therefore an intentional typed identity seam:

```ts
export function adaptPreparedCatalog(
    catalog: PreparedConstellationCatalog,
): RendererCatalog {
    return catalog;
}
```

The seam documents renderer ownership and allows later renderer-only normalization without changing HPA-433. It:

- uses `catalog.stars` 1:1 as the authoritative top-level sequence;
- preserves marker data, stable IDs, local stars, and readonly tuple lines;
- ignores extra visibility metadata structurally rather than cloning it away;
- does not mutate or clone source records;
- uses no `as unknown as` cast.

### Legacy adapter rules

- use the supplied top-level `stars` array directly;
- map constellation metadata and local stars without membership flattening;
- validate each mutable `number[][]` line once and retain only exact two-integer in-range pairs as `RendererLine`;
- return fresh readonly arrays without mutating legacy source objects.

The layer still performs role-independent runtime line resolution checks because deserialized or malformed prepared values can violate TypeScript declarations.

## Internal catalog-layer model

Create `src/lib/constellation/ConstellationCatalogLayer.ts` exporting a class named `ConstellationCatalogLayer`.

```ts
export type CatalogLayerRole = "primary" | "reference";

export type CatalogPlacementContext =
    | {
          readonly mode: "earth-horizontal";
          readonly skyConfig: Readonly<SkyConfiguration>;
      }
    | {
          readonly mode: "fixed-equatorial";
      };

export interface CatalogLayerBuildOptions {
    readonly role: CatalogLayerRole;
    readonly catalog: RendererCatalog;
    readonly placement: CatalogPlacementContext;
    readonly settings: Readonly<PreparedCatalogRenderSettings>;
}
```

Legacy `SkyConfiguration` is converted to `PreparedCatalogRenderSettings` by the renderer while the complete config remains present only in the Earth placement context.

Each layer owns:

- one root `THREE.Group`;
- one ordinary-star `THREE.Points` object when ordinary rendered stars exist;
- one constellation-line `THREE.Group` when line rendering is enabled and valid segments exist;
- an optional primary marker group;
- primary ordinary-star, constellation, and marker text label groups;
- the exact ordinary point-index-to-star list;
- primary marker hit objects;
- a stable-ID-to-world-position map;
- cached immutable build inputs and accepted positions required for lazy label creation;
- all geometries, materials, textures, sprites, groups, and disposal state created by the layer.

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

Reference implementations return no marker hit objects, ignore selection changes, create no labels, and make `setLabelsVisible()` a no-op.

## Label ownership and visibility semantics

Use one owner: the primary `ConstellationCatalogLayer` owns all primary label resources.

The renderer owns only:

```ts
private labelsVisible = true;
private _labelsVisibleUserSet = false;
```

Runtime rules:

1. `setLabelsVisible(visible)` always updates renderer state and sets `_labelsVisibleUserSet = true`.
2. If a primary layer exists, the renderer forwards the state to `primaryLayer.setLabelsVisible(visible)`.
3. During initialization, when `_labelsVisibleUserSet` is false, resolve `labelsVisible` from the applicable Earth or prepared `showStarNames` setting.
4. During reinitialization, when `_labelsVisibleUserSet` is true, preserve the user's state regardless of the new initialization setting.
5. After constructing the new primary layer, forward the resolved state once.

Primary layer rules:

- ordinary star labels are built only from `renderedOrdinaryStars`, never marker records or filtered/skipped top-level records;
- constellation labels are built only from valid positions in that layer's own local constellation stars;
- synthetic Sol text is a marker label, separate from the marker shape;
- the Sol marker shape remains visible when labels are hidden;
- all primary text groups follow `setLabelsVisible()`;
- label resources are lazily created on the first `setLabelsVisible(true)` call and then toggled by group visibility;
- cached immutable inputs/accepted positions allow lazy creation after initialization without rebuilding star or line geometry;
- a pre-initialization user toggle is applied when the layer is eventually created;
- disposal clears cached label inputs and releases every created canvas texture, sprite material, and group.

The shared initialization path has no renderer-owned external star or constellation label groups.

## Catalog partitioning and marker role guard

Partition top-level catalog stars before ordinary magnitude filtering.

For a **primary** layer:

1. `marker.kind === "synthetic-sol"` records go to the dedicated marker builder.
2. All other records go to ordinary-star filtering and point-buffer creation.

For a **reference** layer:

1. synthetic-marker records are not built as markers;
2. they are not treated as ordinary stars;
3. they are skipped defensively with a development warning because HPA-433's reference contract forbids synthetic Sol.

This role guard prevents a malformed or future reference catalog from silently creating a non-interactive duplicate Sol marker. Tests exercise the defensive skip even though current HPA-433 output never includes such a record.

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
    placement: CatalogPlacementContext,
    radius: number,
): CatalogPlacementResult;
```

### Validation

Before either placement path, require finite right ascension and declination so no `NaN` reaches a GPU buffer.

For `fixed-equatorial` only, also require declination in `[-90, 90]`. HPA-433 normally guarantees this, but the renderer retains a defensive boundary for malformed/deserialized input.

For `earth-horizontal`, do not add a new declination-range rejection. After finite checks, delegate exactly to the existing `celestialToSphere()` behavior so HPA-434 does not introduce a new legacy-data compatibility rule.

Finite right ascension is intentionally **not** range-rejected. The trigonometric mapping is periodic, so values outside `[0, 24)` wrap geometrically. HPA-433 normally supplies normalized values; the renderer boundary rejects only non-finite RA.

A failed top-level star is skipped from rendering and interaction registries with a development warning. A failed constellation-local position skips only the affected segment/label contribution. This is a defensive renderer boundary, not a second catalog-transformation system and not a replacement for HPA-433 diagnostics.

### Earth-horizontal placement

For valid coordinates, delegate exactly to:

```ts
celestialToSphere(
    star.rightAscension,
    star.declination,
    placement.skyConfig.location,
    placement.skyConfig.dateTime,
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

Fixed-equatorial placement ignores latitude, longitude, timezone, date, hour angle, horizon, and sidereal time. It does not call `equatorialToCartesian()` because display radius is intentionally independent of physical distance; the renderer performs only validated direction-to-display-sphere placement.

Primary and reference use the same coordinate convention. Small radius differences are display-only and do not change direction from the camera at the origin.

## Display radii and explicit render order

Use named constants and distinct orders rather than relying on insertion order:

| Object | Radius | `renderOrder` | Purpose |
| --- | ---: | ---: | --- |
| Starfield background sphere | 200 | 0 | Scene-only shader backdrop |
| Optional Earth ambient points | existing 95–105 | 0.25 | Earth-only decorative density |
| Earth cardinal labels | 100 | 0.5 | Preserve current below-catalog guide layering |
| Reference lines | 97 | 1 | Dashed comparison topology |
| Reference ordinary stars | 99 | 2 | Hollow comparison markers |
| Primary ordinary stars | 100 | 3 | Filled primary catalog stars |
| Primary constellation lines | 98 | 4 | Selectable primary topology |
| Earth horizon ring | 100 | 4.5 | Preserve current late-added overlay behavior |
| Synthetic Sol marker shape | 101 | 5 | Primary focus marker |
| Primary star/marker labels | 105 | 6 | Readable labels |
| Primary constellation labels | 110 | 7 | Constellation names |
| Shooting-star decoration | existing | 8 | Foreground decoration |

Earth cardinal labels remain below catalog stars and lines as they are today. The horizon remains a translucent overlay above primary line geometry. Earth guides never coexist with a reference layer in the supported product flow because guides are Earth-horizontal only and prepared comparison mode is fixed-equatorial.

The two decorative children have distinct orders. No behavior depends on equal `renderOrder` values or scene insertion order.

All catalog materials keep `depthWrite: false` as today. Role-specific shader opacity and shape provide the comparison hierarchy.

## Role styling constants and shader strategy

Define initial named constants in `ConstellationCatalogLayer.ts`:

```ts
const REFERENCE_STAR_OPACITY = 0.35;
const REFERENCE_STAR_RING_INNER_RADIUS = 0.28;
const REFERENCE_STAR_RING_OUTER_RADIUS = 0.48;
const REFERENCE_LINE_OPACITY = 0.28;
const REFERENCE_LINE_DASH_PERIOD_WORLD = 6;
const REFERENCE_LINE_DASH_DUTY_CYCLE = 0.45;
const SYNTHETIC_SOL_MARKER_SCALE = 6;
```

These are renderer tuning constants, not astronomy contracts. Changes require visual regression review but no data-layer change.

Implementation strategy:

- reference stars remain one `THREE.Points` buffer and use a custom fragment shader based on `gl_PointCoord` distance to draw the hollow ring;
- reference lines remain `THREE.LineSegments`;
- each accepted reference segment writes a second per-vertex attribute, `aSegmentDistance`, with values `0` and the segment's rendered world-space chord length;
- the reference vertex shader forwards that interpolated distance;
- the reference fragment shader computes `fract(vSegmentDistance / REFERENCE_LINE_DASH_PERIOD_WORLD)` and applies `REFERENCE_LINE_DASH_DUTY_CYCLE`;
- dash size is therefore approximately constant in rendered world units instead of drawing the same number of dashes on every segment;
- do not switch reference stars to hundreds of individual meshes;
- avoid `LineDashedMaterial`/`computeLineDistances()` because the custom attribute is deterministic and local to each independent segment;
- synthetic Sol uses one primary marker group with ring/reticle geometry and radial rays at the named scale.

## Decorative background and procedural-star boundary

Catalog geometry contains catalog records only.

The current renderer injects 500 random points when the explicit star-position buffer is sparse. HPA-434 removes this injection from catalog-layer construction for **both** legacy and prepared catalogs so:

- point indices map exactly to `renderedOrdinaryStars`;
- prepared primary/reference layers cannot each create duplicate random stars;
- repeated prepared builds produce deterministic catalog geometry and shader attributes;
- decorative points cannot participate in hover, selection, focus, IDs, diagnostics, or comparison semantics.

Preserve legacy sparse-sky ambience under one scene-level decorative-background owner:

```text
decorative-background (one persistent root)
├── starfield-background (always visible)
└── ambient-star-points (optional, Earth-horizontal visibility only)
```

Use named legacy constants:

```ts
const LEGACY_AMBIENT_STAR_THRESHOLD = 100;
const LEGACY_AMBIENT_STAR_COUNT = 500;
```

The threshold is evaluated from the number of accepted ordinary legacy stars after magnitude filtering and placement validation.

Lifetime and visibility policy:

- the decorative root is created once in the constructor and survives catalog reinitialization;
- ambient points are created on the first legacy Earth initialization whose accepted ordinary-star count is below `LEGACY_AMBIENT_STAR_THRESHOLD`;
- prepared initialization never creates ambient points;
- prepared-first -> later sparse Earth creates the ambient child on that later Earth pass;
- once created, ambient points persist as one owned resource until final renderer disposal;
- Earth-horizontal initialization makes the ambient child visible when it exists;
- fixed-equatorial prepared initialization hides the ambient child when it exists;
- returning from prepared to Earth mode makes the same child visible again;
- dense-only Earth use creates no ambient child;
- ambient points contain no star records or semantic user data;
- ambient points are excluded from all raycasts;
- their randomness may remain decorative and renderer scoped;
- final `dispose()` releases both children and the root.

This policy preserves Earth ambience while making prepared output independent of whether the user previously visited a sparse Earth view.

## Ordinary-star rendering and determinism

Ordinary stars respect `settings.minimumMagnitude` and `magnitudeToSize()`.

For each role:

1. validate placement inputs;
2. skip marker records according to the role guard;
3. apply ordinary magnitude filtering;
4. place the accepted star;
5. append position, color, size, and deterministic shader seed;
6. append the same star to `renderedOrdinaryStars`;
7. register its stable-ID world position when the role is primary.

Use a stable hash such as FNV-1a over `${role}:${star.id}` to derive `aSeed` in `[0, 1)`. Do not use `Math.random()` for catalog seed attributes.

Determinism applies to catalog geometry and attributes. The starfield shader and Earth-only ambient points are outside catalog semantics. Shooting-star decoration may retain decorative randomness.

When filtering and marker extraction leave zero ordinary stars, `ordinaryStarPoints` is `null`. The layer still builds any valid marker, line, and constellation-label resources allowed by its role and settings. Hover code treats the absent points object as a no-op rather than throwing.

## Constellation-line rendering and settings

Each layer builds line positions from its own `catalog.constellations` and each constellation's own local `stars` and line tuples.

When `settings.showConstellationLines` is false, neither primary nor reference builds line geometry. Stars, primary markers, and primary labels continue according to their independent policies.

When line rendering is enabled, every role applies the same runtime guard before dereferencing endpoints:

1. require exactly two integer indices;
2. require both indices to be within that constellation's local star array;
3. resolve both local stars;
4. when either index is invalid or either star does not resolve, skip the segment and emit a development warning with `objectKind: "constellation-line"`, role, constellation ID, and line index;
5. place both resolved endpoints using that layer's placement context and role-specific line radius;
6. skip the segment when either endpoint fails placement;
7. never look up an endpoint in the other role;
8. never invent bridge segments;
9. preserve source segment order.

The legacy adapter removes malformed lines early, but the layer guard remains role-independent and protects malformed prepared/deserialized data.

Primary lines retain current selection/dimming uniforms and pointer metadata.

Reference lines use the independent lower-opacity distance-based dash shader. For each accepted segment, compute rendered chord length from its placed endpoints and write `aSegmentDistance = [0, chordLength]`. Reference lines do not expose selection uniforms as a public interaction surface.

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
- uses `SYNTHETIC_SOL_MARKER_SCALE` rather than `magnitudeToSize()` alone;
- renders a ring/reticle with radial rays so it remains distinguishable without color;
- owns a lazily created text label whose visibility follows `setLabelsVisible()`;
- keeps the marker shape visible when labels are hidden;
- stores `starId`, the full `RendererStar`, and role metadata in `userData`;
- contributes a primary marker hit object;
- registers `star.id` in the primary position map;
- is disposed with the primary layer.

Reference layers never construct synthetic markers, even for malformed inputs.

A primary catalog containing only synthetic Sol is valid: ordinary hover no-ops, marker hover/focus remains functional, and line/constellation-label resources may still exist when supplied through the catalog's constellations.

Tests and callers use `SYNTHETIC_SOL_STAR_ID` rather than the literal string `"sol"`. The marker discriminator, not the ID, determines rendering behavior.

## Reference-layer behavior

The reference layer is independently built from `referenceCatalog.stars` and `referenceCatalog.constellations`.

Styling is subdued and non-color-only:

- ordinary reference stars use the hollow-ring point shader;
- reference lines use the world-distance-based dashed shader and lower opacity;
- reference receives no star labels, constellation labels, marker labels, hover, click, selection, or focus behavior;
- reference does not share primary line materials or uniforms;
- reference root visibility is the only runtime toggle required by HPA-434.

Primary/reference index and topology equality is never assumed.

## Reference visibility state

Store one renderer-level preference:

```ts
private referenceVisible = false;
```

`setReferenceVisible(visible)` always:

1. updates `this.referenceVisible`, regardless of whether a reference layer exists;
2. when a reference layer exists, calls `referenceLayer.setVisible(visible)`.

Prepared initialization semantics:

- when `request.referenceVisible` is provided, it updates the stored preference;
- when it is omitted, preserve the existing stored preference;
- after building a reference layer, call `referenceLayer.setVisible(this.referenceVisible)`;
- when no reference layer exists, retain the preference for a future initialization;
- toggling visibility never rebuilds, disposes, or mutates either catalog.

Tests compare primary/reference object identity before and after the toggle.

## Interaction behavior

Primary remains authoritative:

- constellation hover/click raycasts primary line objects only;
- ordinary-star hover raycasts primary ordinary points and maps the intersection index to `renderedOrdinaryStars` exactly;
- marker hover raycasts primary marker hit objects and returns the complete `RendererStar`, including `marker.kind`;
- decorative background and reference objects are excluded from pointer targets;
- `setSelected()` forwards to primary line uniforms only;
- `setHovered()` remains renderer-local state;
- label toggles forward to the primary layer only;
- camera drag, momentum, auto-rotate, reduced-motion, tween, and `worldToScreen()` behavior remains shared and unchanged.

If line and star/marker hits occur in the same pointer sample, preserve the existing constellation-hover callback and independently emit the primary star/marker hover callback.

## Focus behavior and pitch derivation

The camera forward vector used by `_getCameraForward()` is:

```ts
{
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
}
```

Therefore, for a target world direction `(x, y, z)` at radius `r`:

```ts
pitch = Math.asin(y / r);
yaw = Math.atan2(x, z);
```

Do not substitute `atan2(z, x)` or an unrelated Three.js spherical convention.

`focusStarById()`:

1. reads a primary world position by stable ID;
2. returns `false` when the ID is absent or reference-only;
3. computes `r = Math.hypot(x, y, z)`;
4. returns `false` when any component or `r` is non-finite, or when `r <= 0`;
5. computes yaw with `atan2(x, z)`;
6. computes pitch with `asin(y / r)`;
7. delegates to `tweenCameraTo(pitch, yaw, durationMs)`;
8. returns `true` when the target was resolved and a camera update/tween was requested.

The existing `tweenCameraTo()` clamp of `±MAX_ELEVATION_RAD` remains authoritative. A star at or near an equatorial pole can therefore be approached only to the existing approximately `±81.8°` camera limit, not centered at exact `±90°`. `focusStarById()` returning `true` means the target was found, not that the camera can violate its safety clamp.

Tests pin inverse-direction fixtures beyond synthetic Sol, including `+X`, `+Z`, mixed quadrants, and the pitch clamp. Reduced motion continues to use the existing immediate camera-update path.

## Orientation guides and fixed-frame entry semantics

Earth-horizontal mode creates the horizon ring and cardinal labels with the explicit render orders in the table.

Fixed-equatorial mode creates neither because the view represents a system barycenter, not an alien surface horizon.

HPA-434 preserves the existing initial camera orientation and does **not** automatically focus synthetic Sol. In the fixed-equatorial HPA-431 frame, the initial orientation is a generic camera direction, not Earth-surface North. After `initializePreparedCatalogs()` resolves, HPA-435 may call:

```ts
renderer.focusStarById(SYNTHETIC_SOL_STAR_ID)
```

only when its product flow requires an initial or user-triggered Find Sol action. HPA-435 may also retain the neutral renderer orientation on entry. That choice is intentionally outside HPA-434.

`getCameraAzimuth()` and `getCameraElevation()` continue returning generic camera angles. HPA-435 presents frame-appropriate HUD terminology and must not relabel fixed-equatorial yaw as an Earth compass direction.

## Shared initialization and animation-loop ownership

Both public initialization methods call one private shared path.

Shared initialization order:

1. dispose old primary/reference catalog layers, including every layer-owned label group;
2. dispose old Earth-only orientation guides;
3. clear stale selected/hovered IDs and renderer hit/focus references;
4. preserve the decorative-background root and optional ambient child;
5. resolve renderer-level label and reference visibility preferences;
6. build primary from the adapted authoritative catalog;
7. build optional reference independently;
8. apply resolved primary label visibility and stored reference visibility;
9. create Earth guides only for Earth-horizontal mode;
10. on a sparse legacy initialization, create the ambient child if absent;
11. set ambient child visibility to `true` for Earth-horizontal and `false` for fixed-equatorial mode;
12. set camera state using the existing sky-camera policy;
13. start animation only when no RAF chain exists.

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

This is a fix for an existing latent serialized-reinitialization bug, not merely a new reference-layer safeguard.

During each animation frame, after obtaining `deltaSeconds`, the renderer calls:

```ts
this.primaryLayer?.tick(deltaSeconds);
this.referenceLayer?.tick(deltaSeconds);
```

The layer tick updates role-owned star and line shader uniforms. Renderer-level shooting-star and camera animation remain renderer-owned.

### Initialization re-entrancy boundary

HPA-434 does not make overlapping asynchronous initialization calls transactional. Callers must await/serialize `initialize()`, `updateSky()`, and `initializePreparedCatalogs()`.

The one-loop guard prevents multiple RAF chains after completed/repeated initialization. It does not define last-writer-wins behavior for two overlapping builds. A generation token or cancellation protocol is a follow-up only if a real caller requires concurrent initialization.

## Lifecycle and disposal

`ConstellationCatalogLayer.dispose()` is idempotent and releases:

- ordinary points geometry and shader material;
- line geometries, distance attributes, and materials;
- marker geometries and materials;
- every layer-owned label canvas texture, sprite material, sprite, and group;
- child groups and root attachment;
- cached lazy-label inputs and accepted positions;
- point lookup, hit-object, and ID-position collections.

Renderer-level cleanup releases:

- both layer instances;
- Earth orientation guides;
- active shooting-star geometry/material;
- the full decorative-background root on final disposal only;
- event listeners, RAF/momentum callbacks, canvas, and WebGL renderer as today.

There are no renderer-owned primary label groups after this design.

Reinitialization leaves the decorative root intact and does not retain stale layer roots, reference visibility objects, selected IDs, hovered IDs, world positions, or hit targets.

## Error handling and development observability

Renderer failures are local and non-transforming:

- invalid top-level coordinate: skip that rendered object and warn in development;
- unresolved or invalid constellation-line index: skip only that segment and warn in development;
- invalid constellation endpoint coordinate: skip only the affected segment;
- malformed legacy line: drop it in the legacy adapter;
- unexpected reference marker: skip it and warn in development;
- absent reference catalog: keep the stored visibility preference but build no reference root;
- missing/invalid focus position: return `false`;
- repeated disposal: no-op after the first complete cleanup.

Development warnings use structured context sufficient to debug independent catalogs:

```ts
interface RendererSkipWarningContext {
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
```

Warnings do not become user-facing fallback copy and do not mutate HPA-433 diagnostics. HPA-433 remains authoritative for transformation diagnostics, and HPA-435 owns visible fallback handling.

## Testing strategy

### Renderer-catalog adapter tests

Add `src/lib/constellation/__tests__/rendererCatalog.test.ts` covering:

- `adaptPreparedCatalog()` is a typed identity seam;
- prepared top-level stars pass 1:1 with `SyntheticSolMarker` preserved;
- prepared constellation visibility metadata is tolerated structurally;
- prepared readonly tuple lines remain tuples;
- legacy top-level stars are not rebuilt from memberships;
- legacy malformed/non-integer/out-of-range lines are dropped once;
- source inputs remain frozen/unmodified;
- no `as unknown as` boundary is required.

### Placement tests

Add `src/lib/constellation/__tests__/rendererPlacement.test.ts` covering:

- Earth-horizontal output matching `celestialToSphere()`;
- all six fixed-equatorial axis fixtures;
- fixed placement has no location/date parameters and is identical across external browser contexts;
- non-finite-input failures in both modes;
- fixed-equatorial declination-range failures;
- legacy Earth finite out-of-range declination retains existing delegation behavior;
- finite out-of-range RA wraps geometrically rather than failing;
- no use of Earth-horizontal transforms in fixed mode.

### Catalog-layer tests

Add `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts` covering:

- direct top-level star consumption;
- one top-level point despite repeated constellation membership;
- independent primary/reference point counts and line topology;
- no random procedural entries in catalog buffers;
- deterministic per-role/per-ID shader seeds;
- readonly/frozen catalog safety;
- `showConstellationLines: false` creates no primary or reference line geometry;
- role-independent exact-pair/integer/index-bounds checks before endpoint dereference;
- malformed prepared/out-of-range line indices skip with structured warnings rather than throwing;
- primary marker construction before magnitude filtering;
- primary-only marker role guard and defensive reference-marker skip;
- hollow reference point shader constants;
- reference `aSegmentDistance` values equal rendered chord lengths and produce length-independent dash period;
- primary-only hit objects, selection, and position registration;
- zero ordinary points with marker/lines/labels still valid;
- primary lazy label creation from rendered ordinary stars only;
- Sol marker shape visible while Sol text is hidden;
- reference label methods remain no-ops;
- placement failure skipping with structured warning context;
- both role ticks advance owned shader uniforms;
- idempotent disposal of every owned resource and cached label input.

### Renderer integration tests

Extend `ConstellationRenderer.test.ts` covering:

- legacy Earth initialization still delegates to `celestialToSphere()`;
- legacy `updateSky()` remains Earth-horizontal and cannot accept prepared requests;
- prepared initialization accepts only `PreparedCatalogRenderSettings`, with no Earth location/date fields;
- primary and reference lines both honor `showConstellationLines`;
- initial labels honor `showStarNames` when the user has not toggled them;
- pre-init/runtime label-off state survives legacy and prepared reinitialization;
- enabling labels after prepared initialization lazily creates primary labels;
- Sol marker shape remains visible while Sol text follows labels;
- Earth ambience remains under one decorative owner while catalog point counts contain real stars only;
- sparse Earth -> prepared hides the ambient child without disposing it;
- direct prepared and Earth -> prepared have identical ambient visibility;
- prepared -> Earth restores the same ambient child visibility;
- prepared first -> later sparse Earth creates one ambient child;
- dense-only Earth never creates an ambient child;
- background sphere and ambient child have distinct render orders;
- cardinal labels remain below catalog geometry and the horizon retains its overlay relationship;
- exactly one decorative root survives repeated initialization;
- prepared primary and reference use authoritative matched pairs;
- primary/reference topology can differ without lookup corruption;
- fixed-equatorial output is time/geolocation independent;
- synthetic Sol remains rendered when ordinary magnitude threshold would reject magnitude `0`;
- synthetic marker uses a dedicated size/style path;
- callback marker hover returns a `RendererStar` identifiable by `marker.kind`;
- ordinary hover no-ops when `ordinaryStarPoints` is null;
- `getStarWorldPosition(SYNTHETIC_SOL_STAR_ID)` remains available in a Sol-only ordinary buffer;
- focus inverse math reproduces `_getCameraForward()` for axis and mixed-quadrant fixtures;
- missing, zero-length, and non-finite focus positions return `false`;
- focus behavior respects the camera pitch clamp;
- prepared initialization does not auto-focus Sol;
- HPA-435 can explicitly focus `SYNTHETIC_SOL_STAR_ID` after initialization;
- reference visibility always updates stored state and calls `referenceLayer.setVisible()`;
- visibility toggling preserves layer/object identity;
- reference-only IDs are not hoverable or focusable;
- Earth-only horizon/cardinal guides use the specified relative orders;
- fixed-equatorial mode creates no Earth guides and leaves HUD naming to HPA-435;
- renderer calls `tick(delta)` on both active roles each frame;
- repeated serialized initialization starts one RAF chain;
- overlapping async initialization is not asserted as supported;
- reinitialization clears stale state and disposes old layers/labels;
- final disposal releases layers, decorative background, listeners, and renderer.

### Regression verification

Run:

```bash
bunx vitest run src/lib/constellation/__tests__/rendererCatalog.test.ts
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

**Risk:** A reference point or line index is interpreted against primary arrays, or malformed prepared indices are dereferenced before validation.

**Mitigation:** Each layer owns its exact topology and validates integer indices, bounds, and resolved endpoint records before placement. Reference never participates in primary interaction.

### Label ownership drift

**Risk:** Renderer and layer both retain partial label resources, breaking lazy visibility or leaking textures.

**Mitigation:** Renderer owns preference state only; primary layer owns every label resource and cached lazy-label input. Reference owns no labels.

### Prepared settings or Earth-state contamination

**Risk:** Prepared callers fabricate Earth configuration, or Earth and prepared modes interpret display settings differently.

**Mitigation:** Prepared initialization accepts only the three renderer settings it consumes. Primary/reference lines share the line setting; primary labels use the existing user-override policy; reference never labels.

### Marker-role leakage

**Risk:** Generic partitioning builds a duplicate, non-interactive reference synthetic marker.

**Mitigation:** Marker construction is explicitly primary-only. Unexpected reference markers are skipped and covered by tests.

### Earth ambience regression or prepared history dependence

**Risk:** Removing 500 procedural points reduces Earth density, duplicate ambient layers accumulate, or prepared visuals differ based on navigation history.

**Mitigation:** Create at most one persistent ambient child on the first sparse legacy pass. Show it only in Earth-horizontal mode and hide it in fixed-equatorial mode without rebuilding or disposal.

### Dash-density inconsistency

**Risk:** A fixed dash count per line produces visibly different dash sizes on short and long constellation segments.

**Mitigation:** Store per-segment rendered distance and use a fixed world-space dash period in the reference shader.

### Fixed-frame contamination

**Risk:** Prepared coordinates accidentally receive Earth date/location/sidereal rotation.

**Mitigation:** The public prepared API has no Earth fields, and the internal placement context is a discriminated union. Axis fixtures and fixed-mode tests pin the separation.

### Non-finite GPU buffers

**Risk:** A malformed/deserialized coordinate writes `NaN` into geometry.

**Mitigation:** Finite validation in both modes, fixed-equatorial declination validation, local skip behavior, and structured development warnings. Legacy finite declination behavior remains delegated unchanged.

### Render-order instability or Earth guide regression

**Risk:** Equal orders make hierarchy depend on insertion order, or explicit guide orders move cardinal labels above catalog geometry.

**Mitigation:** Every category has a distinct order. Cardinal labels remain below catalog geometry, and the horizon remains a late translucent overlay.

### Pole focus limitation

**Risk:** Find Sol appears not to center a target near `±90°` declination.

**Mitigation:** Document and test the inverse camera formula and existing `±MAX_ELEVATION_RAD` clamp; focus success reports target resolution, not exact unclamped centering.

### Initialization overlap

**Risk:** Two overlapping async initialization calls interleave resource construction.

**Mitigation:** Require caller serialization in HPA-434. The one-loop guard solves repeated RAF chains but does not claim transactional re-entrancy.

### Resource leaks

**Risk:** Reinitialization or visibility toggles leave stale geometries, distance attributes, textures, cached label inputs, hit objects, or RAF loops.

**Mitigation:** Idempotent layer disposal, single label owner, method-based visibility toggling, stale-state clearing, and one-loop guard tests.

### Scope leakage into HPA-435

**Risk:** Renderer work starts owning route state, initial Sol-focus policy, observer mapping, HUD compass language, localization, or fallback UI.

**Mitigation:** Public APIs accept already-prepared catalogs and generic stable IDs only. HPA-435 explicitly chooses whether and when to focus `SYNTHETIC_SOL_STAR_ID` and owns all presentation behavior.

## Acceptance criteria mapping

- **Existing Earth/Sol mode remains backward compatible:** legacy adapter preserves Earth placement, settings, interactions, guide layering, camera policy, labels, and sparse ambience.
- **Prepared catalogs render without mutation:** typed identity adapter, readonly renderer boundary, and frozen-input tests.
- **Authoritative top-level stars are consumed directly:** layer points use adapted `catalog.stars`; constellation membership is line/label input only.
- **Different topology is supported:** independent role-owned layers plus role-independent index guards.
- **Prepared directions bypass Earth transforms:** narrow prepared settings, discriminated placement context, and axis tests.
- **Synthetic Sol bypasses ordinary culling and sizing:** primary-only dedicated marker path.
- **Prepared layers do not inject random catalog points:** no layer fallback; ambient child hidden in fixed-equatorial mode.
- **Reference visibility changes immediately without reconstruction:** stored preference plus `setVisible()` and identity tests.
- **Stable hover/selection/focus IDs continue to work:** exact primary registries and marker-aware callback type.
- **All added resources are disposed:** single layer label owner plus distance-attribute and renderer lifecycle tests.

## File plan

Create:

- `src/lib/constellation/rendererCatalog.ts`
- `src/lib/constellation/rendererPlacement.ts`
- `src/lib/constellation/ConstellationCatalogLayer.ts`
- `src/lib/constellation/__tests__/rendererCatalog.test.ts`
- `src/lib/constellation/__tests__/rendererPlacement.test.ts`
- `src/lib/constellation/__tests__/ConstellationCatalogLayer.test.ts`

Modify:

- `src/lib/constellation/ConstellationRenderer.ts`
- `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
- `src/test/setup.ts` only as required to model new Three.js resources accurately.

Explicitly unchanged:

- `src/components/ConstellationWrapper.svelte` in HPA-434; HPA-435 later consumes the widened callback and prepared API;
- route state and Galaxy entry;
- observer-system/source-star mapping;
- HPA-431 astronomy formulas;
- HPA-433 catalog preparation;
- localization and HUD copy;
- 2D fallback integration.

## Open decisions

None. The implementation plan must be reconciled with this reviewed specification before production code begins.
