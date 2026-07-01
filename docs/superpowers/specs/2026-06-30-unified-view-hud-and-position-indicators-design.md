# Unified View HUD & Position Indicators — Design

- **Date:** 2026-06-30
- **Status:** Approved (pending implementation plan)
- **Scope:** Star (Solar System), Galaxy, and Constellation views

## Problem

Two related usability issues across the three main 3D views:

1. **Scattered, overlapping HUD controls.** Each view has a completely different HUD layout and styling system. The Galaxy view is the worst offender: it still uses legacy bespoke CSS, its top-right gear button literally overlaps the global language selector, and selecting a star opens both a corner tooltip *and* a full-screen dialog showing the same data. "Back to Menu" lives in a different corner on every view, settings are reimplemented three different ways, and switching views always requires bouncing through the Home hub.
2. **No position indication in Galaxy/Constellation.** Earth/Sol is implicitly at the origin `(0,0,0)` in galaxy space, but there is no marker, label, or highlight anywhere. The Solar System is not even in the galaxy dataset. The config flags `enableStarLabels` and `enableDistanceIndicators` were scaffolded but never implemented. In the Constellation view, Earth *is* the camera (observer-centric), so "you are here" means something different there, and orientation is not legible.

## Goals

- Establish one consistent HUD chrome across all three views (unified shared shell).
- Add a persistent view-switcher so users can jump Star ↔ Galaxy ↔ Constellation directly.
- Kill the top-right language-selector collision on every view.
- Refactor the Galaxy view onto the existing tactical-HUD kit so all three views share one visual language.
- Add a clear "you are here" indicator in the Galaxy view (Sol marker + label + distance lines).
- Add an orientation indicator in the Constellation view (horizon ring + cardinal compass).

## Non-goals

- No client-side router; navigation stays full-page navigation via `routes.*`.
- No changes to the Solar System (star) view's 3D rendering pipeline.
- No new datasets. Sol is **not** added to `localGalaxyData.starSystems`; it remains a renderer-managed marker.
- No 3D marker for Earth in the Constellation view (the observer is standing on Earth).
- No unrelated refactoring beyond what serves these two issues.

## Key Design Decisions (approved)

| Decision | Choice |
|----------|--------|
| HUD consolidation philosophy | **Unified shared chrome** — one consistent frame/layout on all three views |
| Cross-view navigation | **Persistent view-switcher** in the HUD (Star · Galaxy · Constellation) |
| Galaxy position indicator | **Marker + label + distance lines** |
| Constellation position indicator | **Horizon ring + compass** |
| Implementation approach | **A — Shared HUD shell component with slots** |

---

## Section 1 — Shared HUD shell & corner conventions

A new `ViewHud.svelte` becomes the single owner of the consistent chrome. It wraps each page's 3D canvas and exposes **named slots** (Svelte 4 legacy `<slot name="...">` syntax — the codebase uses Svelte 4 conventions throughout: `export let`, `on:click`, `createEventDispatcher`, `$:`) for view-specific content. The three wrappers stop hand-rolling their own corners and instead mount inside this shell.

### Fixed chrome owned by `ViewHud.svelte` (identical on all 3 views)

| Corner | Element |
|--------|---------|
| **Top-left** | `Back` button → Home |
| **Top-center** | Persistent view-switcher: **Star · Galaxy · Constellation** (highlights current view) |
| **Top-right** | Settings gear → opens unified `SettingsPanel`; language selector (🌐) moves *inside* this panel |
| **Bottom-left** | reserved snippet slot (pinned-body chip / drag-hint) |
| **Bottom-right** | reserved snippet slot |

### Snippet slots each wrapper provides

- `controls` — the view's primary control rail/panel
- `overlay` — non-interactive full-screen layers (scan lines, target-lock reticle)
- `info` — context readout (system name, geo-lock readout, selected-system details)
- `bottomLeading` / `bottomTrailing` — optional chips

### Language selector relocation

The `GlobalLanguageSelector.svelte` page-level overlay is **removed** from the three pages; its function moves into the settings panel inside the shell. This eliminates the top-right collision on every view for good.

### Galaxy refactor

Galaxy's legacy `.hamburger-button` / `.controls-button` / blue `#64b5f6` CSS is replaced wholesale. It adopts `ViewHud` + the existing tactical-HUD kit (`HudPanel`, `HudButton`, `HudFrame`). The duplicated tooltip+dialog-on-select collapses into a single info snippet + one details dialog.

---

## Section 2 — Unified settings panel & per-view control contents

### Unified `SettingsPanel` (top-right gear, same component on all views)

Always contains:
- **Language** selector (en/zh/ja) — the relocated 🌐 function
- **View-specific toggles**, injected via a `settings` snippet so each view owns its own options without reinventing the panel

| View | Settings options |
|------|------------------|
| Star | Toggle Barycenters; Orbit-speed slider (with Reset) |
| Galaxy | Animations; Star Glow; Star Labels; **Distance Lines** (new); max render distance |
| Constellation | Scan lines; star/constellation labels; auto-rotate |

This replaces the three different settings implementations with one shared component + a per-view snippet.

### Per-view `controls` snippet (primary panel)

- **Star** — vertical command rail: Zoom In / Out / Reset View, JUMP-TO Finder (unchanged). Barycenter + orbit-speed move into Settings, decluttering the rail.
- **Galaxy** — the old hamburger panel becomes a single `HudPanel` "Nearby Systems" list (name + distance), replacing both the hamburger menu and the redundant tooltip. Selecting a system opens **one** details dialog (the duplicate tooltip is deleted).
- **Constellation** — keeps its current side panel (geo-lock + UTC readout, constellation list, selected-constellation details), now rendered via the `info`/`controls` snippets.

### Per-view `info` snippet

- Star — system name + description readout
- Galaxy — selected-system details (replaces tooltip)
- Constellation — geo-lock + UTC readout

### Net effect

The Star rail gets leaner (zoom only), Galaxy drops two overlapping panels + a duplicate dialog, and all settings share one home.

---

## Section 3 — Galaxy "you are here" indicator (marker + label + distance lines)

Implemented in the framework-agnostic `GalaxyRenderer` / `StarSystemManager`, reusing existing patterns.

### Sol marker at the origin `(0,0,0)`

A `THREE.Group` + `MeshBasicMaterial` sphere mirroring `CelestialBodyManager.registerOrbitAnchors()` (`CelestialBodyManager.ts:42`) — the cleanest "drop a marker at a 3D position" pattern already in the codebase. A pulsing emissive ring around it distinguishes Sol from the nearby-star meshes. This gives the implicit origin an explicit presence.

### Label "Sol · You are here"

A `CanvasTexture` `THREE.Sprite` using the exact pattern from `ConstellationRenderer.createConstellationLabels()` (`ConstellationRenderer.ts:889`). The galaxy renderer currently draws zero labels, so this also begins using the long-dead `enableStarLabels` flag.

### Distance lines

Wireframe lines from Sol to each of the 30 nearby systems, gated behind the `enableDistanceIndicators` flag (currently dead config, defaulted `true` but never read). Controlled by the new **Distance Lines** toggle in Settings. Each line uses the existing `distanceFromEarth` data already on every `StarSystemData`. On hover/select of a system, the distance readout surfaces in the `info` snippet.

### Camera framing on entry

Adjust `GalaxyRenderer.initialize()` so the camera starts aimed at — and close enough to clearly see — the Sol marker, instead of the current generic `(10,10,10)` offset where a tiny origin marker would be lost. A brief "focus Sol" framing on load makes the position immediately obvious.

### No data model change

Sol is *not* added to `localGalaxyData.starSystems` (which is explicitly "30 nearest systems to Earth"); it stays a standalone renderer-managed marker, keeping the dataset semantics clean.

---

## Section 4 — Constellation orientation indicator (horizon ring + compass)

Here Earth *is* the camera (observer at origin looking up `+y`), so the indicator is about **orientation**, not a point. Built in `ConstellationRenderer.ts`.

### Horizon ring

A circle on the `y=0` plane (altitude 0°) at radius ~100, matching the star sphere. Stars above the ring are above the horizon; below it are below. Reuses the `THREE.LineLoop` / line-segment approach from `createConstellationLines()` (`ConstellationRenderer.ts:790`). It stays **fixed in world space** while the camera rotates in place, giving a stable reference as the user looks around.

### Cardinal direction labels (N/E/S/W)

`CanvasTexture` sprites placed on the ring at the four azimuth points using the existing `celestialToSphere` mapping (`astronomy.ts:12`): `az=0 → +z` (N), `az=90° → +x` (E), etc. Subtle, depth-written so they sit naturally among the stars.

### "View from Earth" label

A small fixed label confirming the observer frame, paired with the existing geolocation lat/long readout in the `info` snippet.

### Compass strip (HUD)

A slim N/E/S/W strip in the `info` panel showing the observer's current facing azimuth, derived live from `cameraRotationY`. This is the 2D complement to the 3D ring — glance-able without scanning the sky.

### Explicitly not done

- No marker for Earth itself (the observer is standing on it).
- No Sun mesh (this is a night-sky viewer).

The ring + cardinal labels + compass together make "where am I and which way am I looking" immediately legible.

---

## Architecture & File Changes

### New files

- `src/components/hud/ViewHud.svelte` — shared HUD shell (fixed chrome + named snippet slots)
- `src/components/hud/SettingsPanel.svelte` — unified settings panel (language + per-view `settings` snippet)
- `src/components/hud/ViewSwitcher.svelte` — persistent Star · Galaxy · Constellation switcher (uses `routes.*`)
- Galaxy renderer additions: Sol marker + distance-line helpers inside `StarSystemManager.ts` / `GalaxyRenderer.ts`
- Constellation renderer additions: horizon ring + cardinal labels inside `ConstellationRenderer.ts`

### Modified files

- `src/components/PlanetarySystemWrapper.svelte` — adopt `ViewHud`; move barycenter/orbit-speed into `SettingsPanel`; rail becomes zoom+finder only
- `src/components/GalaxyWrapper.svelte` — adopt `ViewHud` + tactical-HUD kit; delete `.hamburger-button`/`.controls-button` legacy CSS and the redundant tooltip; collapse to single details dialog
- `src/components/ConstellationWrapper.svelte` — adopt `ViewHud`; render side panel via snippets; add compass strip to `info`
- `src/pages/galaxy.astro`, `src/pages/constellation.astro`, `src/pages/planetary/[systemId].astro` — remove `GlobalLanguageSelector` overlay (now inside shell)
- `src/lib/galaxy/graphics/StarSystemManager.ts` — implement Sol marker + label; consume `enableStarLabels`
- `src/lib/galaxy/graphics/GalaxyRenderer.ts` — implement distance lines; consume `enableDistanceIndicators`; adjust initial camera framing
- `src/i18n/` — add keys for "Sol · You are here", "View from Earth", "Distance Lines" toggle, compass directions (en/zh/ja)

### Removed

- Legacy Galaxy CSS (`.hamburger-button`, `.controls-button`, `.hamburger-menu`, `.controls-panel`, `.system-info-tooltip`)
- Page-level `GlobalLanguageSelector.svelte` overlay on the three view pages. Its language-picker logic is absorbed into `SettingsPanel.svelte`; the `GlobalLanguageSelector`/`LanguageSelector` component is then used only on the Home page (`index.astro`) and is deleted from the three view pages.

## Testing

- **Unit (Vitest):**
  - `StarSystemManager` adds a Sol marker group at `(0,0,0)`; distance lines respect `enableDistanceIndicators` toggle and connect to all 30 systems using their `distanceFromEarth`.
  - `GalaxyRenderer` initial camera frames the origin.
  - `ConstellationRenderer` horizon ring lies on `y=0` at radius ~100; cardinal sprites at the four azimuth points.
  - `ViewHud`/`ViewSwitcher` render the correct highlighted view and emit the correct route.
  - `SettingsPanel` shows the per-view snippet options.
- **E2E (Playwright):**
  - Each view shows the shared chrome (Back top-left, switcher top-center, gear top-right).
  - Language selector is reachable via the gear and no longer overlaps any control.
  - Galaxy: Sol marker + label visible on load; toggling Distance Lines adds/removes lines; selecting a system shows exactly one details dialog (no tooltip).
  - Constellation: horizon ring + cardinal labels visible; compass strip updates when dragging to look around.
  - View-switcher navigates Star → Galaxy → Constellation directly without going Home.
- **Accessibility:** new controls have aria-labels; compass/ring do not break reduced-motion (ring does not pulse when reduced motion is on); keyboard nav still works.

## Out of Scope

- Camera tween/animation in the galaxy view (the existing `TODO` at `GalaxyRenderer.ts:418` is not part of this work beyond the initial framing nudge).
- Adding Sol as a navigable star system in the galaxy dataset.
- Refactoring the Solar System (star) 3D renderer.
- Mobile-specific layout tuning beyond what the shared shell naturally provides.
