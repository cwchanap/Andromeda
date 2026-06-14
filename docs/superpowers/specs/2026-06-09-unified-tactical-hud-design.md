# Unified Tactical-HUD Redesign

**Date:** 2026-06-09
**Status:** Approved design — ready for implementation planning

## Summary

The constellation view already ships a polished tactical-HUD aesthetic (Orbitron
display + JetBrains Mono labels, cyan primary / magenta accent / amber alert on a
near-black void, corner-bracket frames, scanline overlay, animated readouts,
reticles, glitch text). Every other subpage — Planetary System, Galaxy, Terrain —
uses generic black rounded-rectangle panels, and the rich `hud-*` CSS classes are
trapped inside `ConstellationWrapper.svelte`.

This redesign **extracts the HUD into a shared layer and applies a cohesive,
elevated version across all subpages**, plus two functional additions:

1. **Explore** gets a redesigned search box and client-side pagination so it scales
   to many planetary systems in the future.
2. **Planetary System view** gets a toggle-open "JUMP TO" finder that flies the
   camera to a chosen body and pins a persistent target-lock reticle on it.

## Goals

- One shared HUD design language; no page is the orphaned source of truth.
- Future subpages/systems inherit the HUD for free.
- Bolder, more distinctive execution than the current constellation styling, while
  staying anchored on the existing cyan/magenta/Orbitron DNA so the constellation
  view does not become inconsistent.
- Respect `prefers-reduced-motion` (tokens already exist in `global.css`).

## Non-Goals

- No change to 3D rendering of celestial bodies, orbits, or backgrounds.
- No server-side / paginated data fetching — pagination is purely client-side over
  the in-memory registry.
- No new shadow rendering (project-wide shadow ban stays).
- No redesign of the main menu hero/landing beyond updating the Explore entry point.

## Design Direction

**Visual language (elevated tactical HUD):**

- Type: `--hud-font-display` (Orbitron) for titles, `--hud-font-mono` (JetBrains
  Mono) for labels/readouts.
- Color: `--hud-cyan` primary, `--hud-magenta` accent, `--hud-amber` alerts,
  `--hud-ivory` text, `--hud-void` base. (All already defined in `global.css`.)
- Form: corner-bracket frames (`HudFrame`), layered translucency + inset glow for
  depth, a consistent top/side "command rail" pattern, scanline overlay, animated
  blink/tick readouts, staggered boot-in reveals.

### Approach (chosen)

Extract to a shared layer rather than duplicate per page:

- `src/styles/hud.css` — the elevated `hud-*` classes promoted from
  `ConstellationWrapper` (panel, button, readout, list, divider, section-label,
  list-row, etc.), imported once via `global.css`.
- Reusable Svelte HUD components:
  - `HudPanel.svelte` — framed panel with header + tick + slot.
  - `HudButton.svelte` — the `hud-btn` bracketed button.
  - `HudSearch.svelte` — search/command input used by both Explore and the
    in-system finder (controlled value, placeholder, keyboard support).
- Existing primitives reused as-is: `HudFrame`, `HudReticle`, `HudCallout`,
  `TargetLockOverlay`, `ScanLines`, `GlitchText`, `BootSequence`.

Alternatives considered: (a) per-page CSS duplication — rejected, drifts out of
sync; (b) a full from-scratch aesthetic — rejected, would orphan the constellation
view and throw away proven work. The chosen path keeps cohesion and lets us still
push the execution forward.

## Feature 1 — HUD on all subpages

- **Planetary System** (`PlanetarySystemWrapper.svelte`): replace plain
  `system-info-panel` / `controls-panel` / zoom buttons with HUD equivalents:
  - top-left **system readout panel** (`HudPanel`): system name, type, body count,
    distance.
  - right-side **command rail**: back, zoom in/out/reset, barycenter toggle (when
    present), orbit-speed control, and the new finder toggle — all `HudButton`.
- **Galaxy** (`GalaxyWrapper.svelte`): restyle hamburger menu, controls panel, and
  system-info tooltip into HUD panels; back/controls buttons become `HudButton`.
  Existing functionality and handlers unchanged.
- **Terrain** (`TerrainExplorer.svelte`): restyle back button + info overlay into
  the HUD frame language.
- **Constellation** (`ConstellationWrapper.svelte`): swap its local `hud-*` classes
  for the shared ones (delete the now-duplicated scoped CSS). No behavior change.

## Feature 2 — Explore redesign (system selector)

Replace the two ad-hoc selectors (the inline modal in `MainMenu.svelte` and
`SystemSelector.svelte`) with **one HUD-styled system browser** component
(`ExploreSystems.svelte`).

- **`HudSearch` filter** at top: case-insensitive substring match across system
  name, system type, constellation, and distance string. Filtering applies over the
  full registry.
- **Pagination**: client-side, **6 systems per page**. HUD-styled prev/next plus a
  page indicator formatted `02 / 04`. Pagination applies to the _filtered_ result
  set; changing the search resets to page 1. If results fit on one page, the
  pager is hidden.
- Each system rendered as a HUD target card (name, type, distance, body summary,
  Explore action). Selecting a system navigates to
  `routes.planetarySystem(id, lang)` — same navigation contract as today.
- Empty-state readout when the filter matches nothing.

## Feature 3 — In-system search + pin (planetary view)

A **toggle-open "JUMP TO" finder** in the planetary system view.

- **Toggle**: a search button in the command rail, plus `/` hotkey to open and
  `Esc` to close. Closed by default. Opening focuses the input.
- **Finder UI** (`HudSearch` + `hud-list`): lists every body in the active system
  (star, planets, moons), grouped by type, filterable by name. Keyboard-navigable
  (↑/↓ to move, Enter to select, Esc to close).
- **On select → pin**:
  1. `planetarySystemRenderer.focusOnBody(id)` flies the camera to frame the body
     (existing `animateToPosition` path).
  2. A persistent `TargetLockOverlay` reticle tracks the body every frame, using a
     new `worldToScreen()` projection on the renderer.
  3. A small "PINNED" chip shows the locked target name with a clear/unpin control;
     unpinning removes the reticle (camera stays put).

## Architecture & Files

**New files**

- `src/styles/hud.css` — shared HUD classes (imported by `global.css`).
- `src/components/hud/HudPanel.svelte`
- `src/components/hud/HudButton.svelte`
- `src/components/hud/HudSearch.svelte`
- `src/components/ExploreSystems.svelte` — replaces/refactors `SystemSelector.svelte`.

**Renderer additions** (`src/lib/planetary-system/`)

- `PlanetarySystemRenderer.worldToScreen(world: THREE.Vector3): { x; y; visible }`
  — camera projection to DOM pixels (mirror of constellation renderer's method).
- `PlanetarySystemRenderer.getBodyWorldPosition(id: string): THREE.Vector3 | null`
  — thin wrapper over `getCelestialBody(id).position`.
- Surface both through the renderer's public API as needed by the wrapper's rAF
  reticle loop.

**Edited files**

- `PlanetarySystemWrapper.svelte` — HUD panels/rail + finder + pin loop.
- `GalaxyWrapper.svelte` — HUD restyle of existing panels.
- `TerrainExplorer.svelte` — HUD restyle of back button + overlay.
- `ConstellationWrapper.svelte` — switch to shared classes; drop duplicated CSS.
- `MainMenu.svelte` — Explore entry uses `ExploreSystems` (remove inline modal).
- `src/styles/global.css` — `@import` the new `hud.css`.
- i18n (`src/i18n/ui.ts` or equivalent) — new keys for search placeholders,
  pagination labels, "jump to", "pinned", empty-state, across en/zh/ja.

## Testing

- Unit tests for `HudSearch` filtering and the Explore pagination logic
  (filter → reset to page 1, page math, indicator formatting, empty state).
- Unit test for the finder's body list construction (star + planets + moons,
  grouping) and keyboard selection dispatch.
- Keep existing component tests green (`SystemSelector`, `MainMenu`,
  `TerrainExplorer`, etc.); update any that assert on replaced markup.
- Manual/3D-dependent behavior (camera fly, reticle tracking) verified in-app, not
  unit-tested (Three.js is mocked).

## Accessibility

- All interactive HUD elements remain real `<button>`/`<input>` with `aria-*`
  labels and visible focus states.
- Finder and Explore are fully keyboard-operable.
- `prefers-reduced-motion` disables HUD animations via existing duration tokens.
- Maintain screen-reader announcements already present in the wrappers.

## Risks / Open Questions

- `worldToScreen` must account for canvas size/devicePixelRatio and bodies behind
  the camera (`visible:false`) — mirror the constellation implementation closely.
- Galaxy/Terrain restyles touch large files (1076 / 644 lines); keep changes
  scoped to presentation, not logic, to avoid regressions.
