# Constellation Page — Sci-Fi HUD Animation Enhancement

**Date:** 2026-05-23
**Scope:** Replace the static 3D constellation viewer experience with a sci-fi HUD aesthetic that adds motion to the 3D scene, introduces a new HUD overlay layer, and reskins the existing UI panels. Implementation is layered so each piece can land and be reviewed independently.

## 1. Aesthetic Foundation

### Palette (CSS variables on `.constellation-view`)

- `--hud-void: #02040a` — base
- `--hud-cyan: #00f0ff` — primary HUD / selected state
- `--hud-cyan-dim: #1b6b7a` — idle constellation lines
- `--hud-magenta: #ff2db4` — alert / active accent
- `--hud-ivory: #e8f4ff` — readable labels
- `--hud-amber: #ffb547` — warning / loss-of-signal states

### Typography (added via `GlobalStyles.astro`)

- Display: **Orbitron** 700 — section headers, constellation names. Uppercase, tracked.
- Mono UI: **JetBrains Mono** 400/600 — labels, magnitude readouts, coordinates, abbreviations.
- No serif. No "Inter".

### Motion Language (four reusable timings)

- _Snap-in_: `120ms cubic-bezier(.2,.8,.2,1)` — reticles appearing, hover frames
- _HUD glide_: `420ms cubic-bezier(.25,.1,.25,1)` — panel and list reveals, camera tween easing
- _Energy flow_: `2.6s linear infinite` — selected constellation line dash
- _Scan-line drift_: `8s linear infinite` — full-screen overlay

### Reduced motion (`prefers-reduced-motion: reduce`)

- Star twinkle amplitude → 0
- Energy flow speed → 0
- No shooting stars
- Camera tween shortens to 200ms
- All entrance animations become instant fades; glitch text snaps to final value
- 1Hz status blinks become steady fills

### Shared chrome primitives (in `src/components/hud/`)

- `HudFrame.svelte` — slotted wrapper with SVG corner brackets. Props: `color`, `bracketLength` (px), `inset`, `glow` (boolean).
- `HudReticle.svelte` — animated reticle at screen coords. Props: `x`, `y`, `state: "hover" | "locked"`, `label?`.
- `ScanLines.svelte` — fixed full-bleed overlay using two stacked `repeating-linear-gradient`s with an 8s `transform: translateY` drift.

## 2. 3D Scene Enhancements (`ConstellationRenderer.ts`)

### Star twinkling (real stars, not just the background shader)

Replace `THREE.PointsMaterial` with a small `ShaderMaterial`:

- Per-star attribute `aSeed` (random 0–1) baked at init.
- Vertex shader passes seed + size; fragment computes brightness `1.0 + 0.35 * sin(uTime * (2.0 + aSeed*3.0) + aSeed*6.28)` with a soft circular alpha falloff.
- Bright stars (`magnitude < 1.5`) get a second halo pass at 2.2× size, low alpha, for bloom.

### Constellation line "energy flow"

Replace `LineBasicMaterial` on `LineSegments` with a `ShaderMaterial`:

- Custom `aLineProgress` attribute (0→1 along each segment).
- Fragment animates a moving dashed gradient via `fract(aLineProgress * 3.0 - uTime * 0.4)`.
- Uniforms: `uColor`, `uIsSelected` (0/1), `uIsDimmed` (0/1).
- States:
  - **Selected**: hot cyan `#00f0ff` at full opacity, energy flow on.
  - **Dimmed** (something else selected): `#1b6b7a` at 0.18 alpha, no flow.
  - **Idle** (nothing selected): `#1b6b7a` at 0.5 alpha, slow gentle flow.

### Raycasting for hover + click

New `InteractionLayer` inside the renderer:

- Throttled `mousemove` (60fps cap) → raycast against star points (`THREE.Raycaster` with `params.Points.threshold = 1.5`) and against constellation line groups.
- Callbacks (passed in via the renderer constructor):
  - `onStarHover(star | null, screenPos)`
  - `onConstellationHover(id | null, screenPos)`
  - `onConstellationClick(id)`

### Camera tween on selection

New method `tweenCameraTo(targetRotX, targetRotY, duration = 900)`:

- Cancels any active drag or momentum animation.
- Cubic ease-in-out interpolation between current and target rotations.
- Target rotations derived from the constellation's average RA/Dec via the existing `celestialToSphere` math, then `atan2`'d back to rotation angles.
- Re-enables user drag at end.

### Projection helper for the HUD layer

Public method `worldToScreen(vec3): { x, y, visible }`:

- Used by the HUD layer to position reticles/callouts over the canvas.
- `visible` is false when the target is behind the camera (camera-forward dot product < 0).

### Shooting stars

Low-frequency atmosphere:

- In the animate loop, every 8–14s spawn a brief `THREE.Line` that streaks across a random part of the sphere over ~700ms, then disposes itself.
- Max 1 at a time.
- Skipped when `prefers-reduced-motion: reduce`.

### Selection state

Renderer holds:

- `selectedId: string | null`
- `hoveredId: string | null`

With setter methods `setSelected(id | null)` and `setHovered(id | null)` that update the line shaders' `uIsSelected` / `uIsDimmed` uniforms.

## 3. HUD Overlay Layer (new, `src/components/hud/`)

A new layer inside `ConstellationWrapper.svelte`, positioned `absolute inset-0` above the canvas (`z-index: 5`) and below the side panels (`z-index: 20`). `pointer-events: none` by default; specific interactive bits opt back in.

**Z-index map for the page** (single source of truth):

- `z-1`: 3D canvas (`.constellation-container`)
- `z-5`: HUD overlay layer (reticles, callouts, target-lock overlay, scan-lines, drag-instructions card)
- `z-20`: side panels, back button, controls toggle
- `z-30`: `<BootSequence>` (covers everything during load, then unmounts on completion)

### New components

- **`HudReticle.svelte`** — already listed in §1 as a shared primitive. Hover state: thin cyan ring + crosshairs, snap-in 120ms. Locked state: thicker ring + magenta inner dot + four corner brackets + slow rotating outer ticks (8s linear). Pure Svelte transitions, no external lib.
- **`HudCallout.svelte`** — small bordered card with an SVG leader-line that points from the card edge to a star's screen position. Used for star hover info (name + magnitude + spectral color swatch). Typewriter reveal at ~30ms/char, capped at ~600ms.
- **`BootSequence.svelte`** — replaces the loading spinner. Center-aligned monospaced lines printed in sequence:
  ```
  > INIT SKYMAP v2.5
  > GEO-LOCK ........... [OK]
  > STELLAR DB ......... 4,184 OBJ
  > RENDER PIPELINE .... ONLINE
  > AWAITING TARGET
  ```
  Each line glitch-flickers in over ~140ms; total ~900ms. Existing `debugInfo` strings map to these lines. A small horizontal scan-bar sweeps across the bottom while loading.
- **`TargetLockOverlay.svelte`** — renders the locked-constellation reticle in absolute coords (computed each frame from `renderer.worldToScreen(constellationCenter)`), with bracket frame, constellation name in Orbitron, and a magenta "TARGET LOCKED" badge that fades in.

### Wiring in `ConstellationWrapper.svelte`

- Replace the existing loading overlay with `<BootSequence>`.
- Add `<ScanLines>` at the top of `.constellation-view`.
- New `requestAnimationFrame` loop in the wrapper that reads `renderer.worldToScreen(...)` each frame for: selected constellation center, hovered constellation center, hovered star, and updates `{hoverPos, lockedPos, hoverStar}` reactive state.
- `handleSelectConstellation` updated to call: `renderer.setSelected(id)`, `renderer.tweenCameraTo(...)`, set local `selectedId`.
- New: `onConstellationClick` from the renderer routes through the same handler (click-in-scene = same code path as list click).

### Replaced

- The cyan spinner div → `<BootSequence>`.
- The current bottom drag-instructions card → a HUD-style "AWAITING TARGET — DRAG TO ORIENT" line inside the bottom-left of a `<HudFrame>` overlay. Fades out 5s after the first user drag.

**Boot → drag-instructions handoff:** the boot sequence ends with the line `> AWAITING TARGET`, then unmounts. The drag-instructions HUD card (`AWAITING TARGET — DRAG TO ORIENT`) mounts immediately after, continuing the same phrase as visual continuity. The card then dismisses 5s after the user's first drag, as described above.

### Motion budget

Nothing competes for attention at once.

- Idle: scan-line drift + slow line flow + star twinkle.
- Hover: reticle snap + callout typewriter.
- Lock: camera glide + line energize + lock-reticle drop-in.

## 4. Existing UI Panel Pass (`ConstellationWrapper.svelte`)

Same wiring; reskin and add motion.

### Back button (top-left) and controls toggle (top-right)

- Each wrapped in `<HudFrame color="cyan" bracketLength={12}>`.
- Background `rgba(2,4,10,0.65)` with `backdrop-blur(8px)`. Sharp corners (no `rounded-*`).
- Text in JetBrains Mono, uppercase, `letter-spacing: 0.12em`.
- Hover: cyan bracket glow intensifies, magenta 1px underline sweeps left→right (140ms).
- Back button text becomes `< RETURN`. The existing i18n key keeps the translated label as a fallback for the label portion.

### Controls panel (right side)

- Replace `bg-black/70 rounded-lg` with `<HudFrame color="cyan" bracketLength={18} glow={true}>`. Sharp corners, interior `rgba(2,4,10,0.78)`.
- Header "CONSTELLATIONS" in Orbitron 700 uppercase, followed by a 1px cyan rule and a single magenta tick.
- Section labels ("LOCATION", "TIME", "VISIBLE") in Mono uppercase, smaller, dimmed cyan.
- Entrance: slide in from right 24px + opacity fade, 420ms HUD-glide curve, on first reveal. Toggle in/out uses the same curve, reversed.

### Constellation list items

- Each row reformatted: `[ABBR] Name ················ N★` with Mono dot leaders.
- Hover: 2px magenta bar slides in from top on the left edge (120ms); row background tints cyan at 0.08 alpha.
- Selected state: full cyan border around the row, faint magenta glow, magenta bar pinned.
- Selection routes through the same `handleSelectConstellation` as the in-scene click (single code path).

### Selected constellation details block

- Separator becomes a dashed cyan rule with a centered magenta diamond.
- Name reveal: 200ms glitch-text effect (3 frames of randomized chars settling to final, cap 200ms total) — implemented as a tiny reusable `<GlitchText>` in `hud/`.
- "Best months" rendered as a 12-cell month strip; viewable months filled cyan, others stroked.
- Mythology quote in smaller mono italic, prefixed with `// `.

### Location/time block

- Coordinates formatted `40.7128°N  74.0060°W` in Mono.
- Time formatted `2026-05-23 14:32 UTC-04` in Mono. This block is a readout, so it uses fixed Mono format instead of the current locale long form. (The toggle label and other prose remain localized.)
- 1×1 px magenta dot blinks at 1Hz next to "GEO-LOCK" when permission granted; amber when fallback location.

## 5. Files Affected

### Modified

- `src/lib/constellation/ConstellationRenderer.ts` — shaders, raycasting, camera tween, projection helper, shooting stars, selection state.
- `src/components/ConstellationWrapper.svelte` — HUD layer integration, panel reskin, selection wiring.
- `src/components/GlobalStyles.astro` — Orbitron + JetBrains Mono font imports.

### New

- `src/components/hud/HudFrame.svelte`
- `src/components/hud/HudReticle.svelte`
- `src/components/hud/ScanLines.svelte`
- `src/components/hud/HudCallout.svelte`
- `src/components/hud/BootSequence.svelte`
- `src/components/hud/TargetLockOverlay.svelte`
- `src/components/hud/GlitchText.svelte`

### Tests

Unit tests follow existing patterns in `src/components/__tests__/` and `src/lib/constellation/__tests__/`:

- Renderer: shader uniforms set correctly for selected/dimmed/idle states; `worldToScreen` returns `visible: false` for points behind camera; `tweenCameraTo` reaches target within tolerance after duration.
- HUD components: snapshot + interaction tests for `HudFrame`, `HudReticle` (state transitions), `BootSequence` (debugInfo mapping), `GlitchText` (settles to final value).

## 6. Out of Scope

- No new external dependencies. Camera tween is a hand-rolled lerp.
- No changes to constellation data, astronomy math, or i18n string keys.
- No changes to the existing star/constellation visibility filtering.
- No changes to mobile touch controls beyond what already exists (drag + momentum still work).
- No accessibility audit beyond the reduced-motion gates listed in §1.
