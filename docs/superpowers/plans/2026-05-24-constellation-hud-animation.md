# Constellation HUD Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the constellation page with a sci-fi HUD aesthetic — animated stars/lines in the 3D scene, a new HTML overlay layer for reticles and HUD chrome, and a full UI reskin of existing panels.

**Architecture:** Layered. WebGL renderer owns motion that must run on the GPU (star twinkle, line energy-flow, shooting stars, camera tween, raycasting, world-to-screen). A new HUD overlay layer (`src/components/hud/`) owns HTML/CSS chrome: reticles tracked to projected 3D points, hover callouts, scan-lines, boot sequence, target-lock overlay. The existing controls/back-button/list panels are reskinned in place. No new runtime dependencies.

**Tech Stack:** Three.js (custom GLSL ShaderMaterials, Raycaster), Svelte 5 (existing components use Svelte 4 syntax — `export let`, `on:click`, `$:` — match that style for consistency), Tailwind 4, Vitest (jsdom + mocked three), no external animation libraries.

**Spec:** `docs/superpowers/specs/2026-05-23-constellation-hud-animation-design.md`

---

## File Structure

### New files
- `src/components/hud/HudFrame.svelte` — SVG corner-bracket wrapper
- `src/components/hud/HudReticle.svelte` — animated screen-space reticle
- `src/components/hud/ScanLines.svelte` — full-bleed scan-line overlay
- `src/components/hud/HudCallout.svelte` — bordered card with SVG leader-line
- `src/components/hud/BootSequence.svelte` — replaces loading spinner
- `src/components/hud/TargetLockOverlay.svelte` — locked-constellation reticle + name
- `src/components/hud/GlitchText.svelte` — settles to final value over ~200ms
- One `__tests__/*.test.ts` next to each new component (under `src/components/hud/__tests__/`)

### Modified files
- `src/styles/global.css` — Google Font imports, HUD palette CSS variables, four motion-language curves as `--ease-*` vars
- `src/lib/constellation/ConstellationRenderer.ts` — shader materials, `worldToScreen`, `setSelected`/`setHovered`, `tweenCameraTo`, raycasting + callbacks, shooting stars
- `src/lib/constellation/__tests__/ConstellationRenderer.test.ts` — tests for new public API
- `src/components/ConstellationWrapper.svelte` — HUD layer integration, panel reskin, selection wiring

### Z-index map (single source of truth, also in spec §3)
- `z-1`: 3D canvas
- `z-5`: HUD overlay layer (reticles, callouts, target-lock, scan-lines, drag-instructions)
- `z-20`: side panels, back button, controls toggle
- `z-30`: `<BootSequence>` (covers all during load, unmounts on completion)

---

## Phase 1 — Foundation

### Task 1: Add fonts, CSS variables, and motion-language curves

**Files:**
- Modify: `src/styles/global.css:1`

- [ ] **Step 1: Update the Google Fonts import**

Open `src/styles/global.css`. Replace line 1 with this combined import (adds Orbitron 700 and JetBrains Mono 400/600):

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;600;700&family=Orbitron:wght@700&family=JetBrains+Mono:wght@400;600&display=swap");
```

- [ ] **Step 2: Append the HUD design tokens at end of file**

Append this block to the end of `src/styles/global.css`:

```css
/* ----- HUD design tokens (constellation page) ----- */
:root {
  --hud-void: #02040a;
  --hud-cyan: #00f0ff;
  --hud-cyan-dim: #1b6b7a;
  --hud-magenta: #ff2db4;
  --hud-ivory: #e8f4ff;
  --hud-amber: #ffb547;

  --hud-font-display: "Orbitron", system-ui, sans-serif;
  --hud-font-mono: "JetBrains Mono", ui-monospace, monospace;

  --hud-ease-snap: cubic-bezier(0.2, 0.8, 0.2, 1);
  --hud-ease-glide: cubic-bezier(0.25, 0.1, 0.25, 1);
  --hud-dur-snap: 120ms;
  --hud-dur-glide: 420ms;
  --hud-dur-flow: 2600ms;
  --hud-dur-scan: 8000ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --hud-dur-snap: 0ms;
    --hud-dur-glide: 0ms;
    --hud-dur-flow: 0ms;
    --hud-dur-scan: 0ms;
  }
}
```

- [ ] **Step 3: Verify lint passes**

Run: `bun run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(constellation): add HUD palette, fonts, and motion-language tokens"
```

---

### Task 2: `HudFrame.svelte`

**Files:**
- Create: `src/components/hud/HudFrame.svelte`
- Test: `src/components/hud/__tests__/HudFrame.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/HudFrame.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudFrame from "../HudFrame.svelte";

describe("HudFrame", () => {
  it("renders four corner brackets", () => {
    const { container } = render(HudFrame, { props: {} });
    const corners = container.querySelectorAll("[data-corner]");
    expect(corners.length).toBe(4);
  });

  it("applies the color prop to brackets via stroke", () => {
    const { container } = render(HudFrame, { props: { color: "#ff2db4" } });
    const path = container.querySelector("[data-corner] line");
    expect(path?.getAttribute("stroke")).toBe("#ff2db4");
  });

  it("respects bracketLength prop", () => {
    const { container } = render(HudFrame, { props: { bracketLength: 24 } });
    const wrapper = container.querySelector(".hud-frame") as HTMLElement;
    expect(wrapper?.style.getPropertyValue("--bracket-length")).toBe("24px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/HudFrame.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/HudFrame.svelte`:

```svelte
<script lang="ts">
  export let color: string = "var(--hud-cyan)";
  export let bracketLength: number = 14;
  export let glow: boolean = false;
</script>

<div
  class="hud-frame"
  class:hud-frame-glow={glow}
  style="--bracket-length: {bracketLength}px; --bracket-color: {color};"
>
  {#each ["tl", "tr", "bl", "br"] as corner}
    <svg
      data-corner={corner}
      class="hud-corner hud-corner-{corner}"
      width={bracketLength}
      height={bracketLength}
      viewBox="0 0 {bracketLength} {bracketLength}"
      aria-hidden="true"
    >
      {#if corner === "tl"}
        <line x1="0" y1="0" x2={bracketLength} y2="0" stroke={color} stroke-width="1.5" />
        <line x1="0" y1="0" x2="0" y2={bracketLength} stroke={color} stroke-width="1.5" />
      {:else if corner === "tr"}
        <line x1="0" y1="0" x2={bracketLength} y2="0" stroke={color} stroke-width="1.5" />
        <line x1={bracketLength} y1="0" x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
      {:else if corner === "bl"}
        <line x1="0" y1={bracketLength} x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
        <line x1="0" y1="0" x2="0" y2={bracketLength} stroke={color} stroke-width="1.5" />
      {:else}
        <line x1="0" y1={bracketLength} x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
        <line x1={bracketLength} y1="0" x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
      {/if}
    </svg>
  {/each}
  <div class="hud-frame-content">
    <slot />
  </div>
</div>

<style>
  .hud-frame {
    position: relative;
    display: block;
  }
  .hud-corner {
    position: absolute;
    pointer-events: none;
  }
  .hud-corner-tl { top: 0; left: 0; }
  .hud-corner-tr { top: 0; right: 0; }
  .hud-corner-bl { bottom: 0; left: 0; }
  .hud-corner-br { bottom: 0; right: 0; }
  .hud-frame-glow {
    filter: drop-shadow(0 0 6px var(--bracket-color));
  }
  .hud-frame-content {
    position: relative;
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/HudFrame.test.ts --run`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudFrame.svelte src/components/hud/__tests__/HudFrame.test.ts
git commit -m "feat(hud): add HudFrame with SVG corner brackets"
```

---

### Task 3: `ScanLines.svelte`

**Files:**
- Create: `src/components/hud/ScanLines.svelte`
- Test: `src/components/hud/__tests__/ScanLines.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/ScanLines.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import ScanLines from "../ScanLines.svelte";

describe("ScanLines", () => {
  it("renders a non-interactive full-bleed overlay", () => {
    const { container } = render(ScanLines);
    const overlay = container.querySelector(".scan-lines") as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(getComputedStyle(overlay).pointerEvents).toBe("none");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/ScanLines.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/ScanLines.svelte`:

```svelte
<script lang="ts">
  export let opacity: number = 0.06;
</script>

<div class="scan-lines" style="--scan-opacity: {opacity};" aria-hidden="true">
  <div class="scan-lines-fine"></div>
  <div class="scan-lines-coarse"></div>
</div>

<style>
  .scan-lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 1;
    opacity: var(--scan-opacity);
  }
  .scan-lines-fine,
  .scan-lines-coarse {
    position: absolute;
    inset: -100% 0;
    will-change: transform;
  }
  .scan-lines-fine {
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 2px,
      var(--hud-cyan) 2px,
      var(--hud-cyan) 3px
    );
    opacity: 0.5;
    animation: scan-drift var(--hud-dur-scan) linear infinite;
  }
  .scan-lines-coarse {
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 7px,
      var(--hud-cyan) 7px,
      var(--hud-cyan) 9px
    );
    opacity: 0.25;
    animation: scan-drift calc(var(--hud-dur-scan) * 1.6) linear infinite reverse;
  }
  @keyframes scan-drift {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/ScanLines.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/ScanLines.svelte src/components/hud/__tests__/ScanLines.test.ts
git commit -m "feat(hud): add ScanLines full-bleed overlay"
```

---

### Task 4: `HudReticle.svelte`

**Files:**
- Create: `src/components/hud/HudReticle.svelte`
- Test: `src/components/hud/__tests__/HudReticle.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/HudReticle.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudReticle from "../HudReticle.svelte";

describe("HudReticle", () => {
  it("positions itself at the given screen coordinates", () => {
    const { container } = render(HudReticle, {
      props: { x: 150, y: 300, state: "hover" },
    });
    const el = container.querySelector(".hud-reticle") as HTMLElement;
    expect(el.style.transform).toContain("translate(150px, 300px)");
  });

  it("applies data-state attribute for styling", () => {
    const { container } = render(HudReticle, {
      props: { x: 0, y: 0, state: "locked" },
    });
    const el = container.querySelector(".hud-reticle");
    expect(el?.getAttribute("data-state")).toBe("locked");
  });

  it("renders the label when provided", () => {
    const { getByText } = render(HudReticle, {
      props: { x: 0, y: 0, state: "hover", label: "BETELGEUSE" },
    });
    expect(getByText("BETELGEUSE")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/HudReticle.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/HudReticle.svelte`:

```svelte
<script lang="ts">
  export let x: number = 0;
  export let y: number = 0;
  export let state: "hover" | "locked" = "hover";
  export let label: string | null = null;
</script>

<div
  class="hud-reticle"
  data-state={state}
  style="transform: translate(-50%, -50%) translate({x}px, {y}px);"
  aria-hidden="true"
>
  <svg class="reticle-svg" viewBox="-40 -40 80 80" width="80" height="80">
    <circle class="ring" cx="0" cy="0" r="22" fill="none" stroke-width="1" />
    <line class="cross" x1="-32" y1="0" x2="-12" y2="0" />
    <line class="cross" x1="12" y1="0" x2="32" y2="0" />
    <line class="cross" x1="0" y1="-32" x2="0" y2="-12" />
    <line class="cross" x1="0" y1="12" x2="0" y2="32" />
    {#if state === "locked"}
      <circle class="dot" cx="0" cy="0" r="2" />
      <g class="ticks">
        {#each Array(8) as _, i}
          <line
            x1="0" y1="-28" x2="0" y2="-32"
            transform={`rotate(${i * 45})`}
          />
        {/each}
      </g>
    {/if}
  </svg>
  {#if label}
    <span class="reticle-label">{label}</span>
  {/if}
</div>

<style>
  .hud-reticle {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    color: var(--hud-cyan);
    transition: opacity var(--hud-dur-snap) var(--hud-ease-snap);
  }
  .ring {
    stroke: currentColor;
    transform-origin: center;
    transition: r var(--hud-dur-snap) var(--hud-ease-snap), stroke-width var(--hud-dur-snap);
  }
  .cross {
    stroke: currentColor;
    stroke-width: 1;
  }
  .dot { fill: var(--hud-magenta); }
  .ticks line { stroke: var(--hud-cyan); stroke-width: 1.5; }
  [data-state="locked"] .ring { r: 26; stroke-width: 1.6; }
  [data-state="locked"] .ticks {
    transform-origin: center;
    animation: reticle-spin var(--hud-dur-scan) linear infinite;
  }
  .reticle-label {
    position: absolute;
    left: 48px;
    top: 50%;
    transform: translateY(-50%);
    font: 600 11px/1 var(--hud-font-mono);
    color: var(--hud-cyan);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
    text-shadow: 0 0 4px var(--hud-cyan);
  }
  @keyframes reticle-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/HudReticle.test.ts --run`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudReticle.svelte src/components/hud/__tests__/HudReticle.test.ts
git commit -m "feat(hud): add HudReticle with hover and locked states"
```

---

### Task 5: `GlitchText.svelte`

**Files:**
- Create: `src/components/hud/GlitchText.svelte`
- Test: `src/components/hud/__tests__/GlitchText.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/GlitchText.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import GlitchText from "../GlitchText.svelte";

describe("GlitchText", () => {
  it("settles to the final text after the animation completes", async () => {
    vi.useFakeTimers();
    const { getByTestId } = render(GlitchText, { props: { text: "ORION" } });
    vi.advanceTimersByTime(300);
    await tick();
    expect(getByTestId("glitch-text").textContent).toBe("ORION");
    vi.useRealTimers();
  });

  it("snaps to final text when reduced-motion is preferred", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true, media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(), removeEventListener: vi.fn(),
      }),
    });
    const { getByTestId } = render(GlitchText, { props: { text: "ORION" } });
    await tick();
    expect(getByTestId("glitch-text").textContent).toBe("ORION");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/GlitchText.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/GlitchText.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  export let text: string = "";
  export let durationMs: number = 200;

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%*+";
  let display = text;
  let timer: ReturnType<typeof setInterval> | null = null;

  function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function scramble(targetLen: number): string {
    let s = "";
    for (let i = 0; i < targetLen; i++) {
      s += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return s;
  }

  onMount(() => {
    if (prefersReducedMotion()) {
      display = text;
      return;
    }
    const start = performance.now();
    timer = setInterval(() => {
      const t = (performance.now() - start) / durationMs;
      if (t >= 1) {
        display = text;
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      const settled = Math.floor(text.length * t);
      display = text.slice(0, settled) + scramble(text.length - settled);
    }, 50);
  });

  onDestroy(() => { if (timer) clearInterval(timer); });

  $: if (text) {
    // when text changes, restart animation
    display = prefersReducedMotion() ? text : scramble(text.length);
  }
</script>

<span data-testid="glitch-text" class="glitch-text">{display}</span>

<style>
  .glitch-text {
    font-family: var(--hud-font-display);
    letter-spacing: 0.08em;
    color: var(--hud-cyan);
    text-shadow: 0 0 6px var(--hud-cyan);
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/GlitchText.test.ts --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/GlitchText.svelte src/components/hud/__tests__/GlitchText.test.ts
git commit -m "feat(hud): add GlitchText with reduced-motion gate"
```

---

### Task 6: `HudCallout.svelte`

**Files:**
- Create: `src/components/hud/HudCallout.svelte`
- Test: `src/components/hud/__tests__/HudCallout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/HudCallout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudCallout from "../HudCallout.svelte";

describe("HudCallout", () => {
  it("positions the card next to the anchor point", () => {
    const { container } = render(HudCallout, {
      props: { x: 100, y: 200, title: "Sirius", lines: ["Mag -1.46"] },
    });
    const card = container.querySelector(".callout-card") as HTMLElement;
    expect(card.style.transform).toContain("translate(132px, 200px)");
  });

  it("renders title and each body line", () => {
    const { getByText } = render(HudCallout, {
      props: { x: 0, y: 0, title: "Vega", lines: ["Mag 0.03", "Spectral A0V"] },
    });
    expect(getByText("Vega")).toBeTruthy();
    expect(getByText("Mag 0.03")).toBeTruthy();
    expect(getByText("Spectral A0V")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/HudCallout.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/HudCallout.svelte`:

```svelte
<script lang="ts">
  export let x: number = 0;
  export let y: number = 0;
  export let title: string = "";
  export let lines: string[] = [];
  export let offset: number = 32;
</script>

<div class="callout-leader" style="transform: translate({x}px, {y}px); width: {offset}px;" aria-hidden="true">
  <svg width={offset} height="2" viewBox={`0 0 ${offset} 2`}>
    <line x1="0" y1="1" x2={offset} y2="1" stroke="var(--hud-cyan)" stroke-width="1" />
  </svg>
</div>

<div
  class="callout-card"
  style="transform: translate({x + offset}px, {y}px);"
>
  <div class="callout-title">{title}</div>
  {#each lines as line}
    <div class="callout-line">{line}</div>
  {/each}
</div>

<style>
  .callout-leader {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    transform-origin: 0 0;
  }
  .callout-card {
    position: absolute;
    top: -28px;
    left: 0;
    pointer-events: none;
    background: rgba(2, 4, 10, 0.85);
    border: 1px solid var(--hud-cyan);
    padding: 6px 10px;
    min-width: 120px;
    font-family: var(--hud-font-mono);
    font-size: 11px;
    color: var(--hud-ivory);
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
    backdrop-filter: blur(6px);
  }
  .callout-title {
    color: var(--hud-cyan);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .callout-line { opacity: 0.85; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/HudCallout.test.ts --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudCallout.svelte src/components/hud/__tests__/HudCallout.test.ts
git commit -m "feat(hud): add HudCallout with leader line"
```

---

## Phase 2 — Renderer enhancements

### Task 7: Add `worldToScreen()` projection helper

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts` (add public method)
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/constellation/__tests__/ConstellationRenderer.test.ts` inside the existing `describe("ConstellationRenderer", ...)` block:

```ts
describe("worldToScreen", () => {
  it("returns visible=false when point is behind the camera", () => {
    const renderer = new ConstellationRenderer(makeContainer());
    // Camera at origin looking +Z (default). A point behind us has z < 0 (in camera space).
    const result = renderer.worldToScreen({ x: 0, y: 0, z: -50 } as any);
    expect(result.visible).toBe(false);
  });

  it("returns visible=true and screen x/y inside viewport for points in front", () => {
    const container = makeContainer();
    const renderer = new ConstellationRenderer(container);
    const result = renderer.worldToScreen({ x: 0, y: 0, z: 50 } as any);
    expect(result.visible).toBe(true);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(container.clientWidth);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(container.clientHeight);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t worldToScreen --run`
Expected: FAIL — `renderer.worldToScreen is not a function`.

- [ ] **Step 3: Implement the method**

In `src/lib/constellation/ConstellationRenderer.ts`, add this public method to the `ConstellationRenderer` class (place after `setupSkyCamera`):

```ts
/**
 * Project a world-space point to canvas pixel coordinates.
 * Returns `visible: false` if the point lies behind the camera.
 */
public worldToScreen(point: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  visible: boolean;
} {
  const vec = new THREE.Vector3(point.x, point.y, point.z);
  // Manually compute camera-space z to determine behind-camera state.
  // We use a forward vector derived from current rotation.
  const cosX = Math.cos(this.cameraRotationX);
  const sinX = Math.sin(this.cameraRotationX);
  const cosY = Math.cos(this.cameraRotationY);
  const sinY = Math.sin(this.cameraRotationY);
  const fwdX = sinY * cosX;
  const fwdY = sinX;
  const fwdZ = cosY * cosX;
  const dot = vec.x * fwdX + vec.y * fwdY + vec.z * fwdZ;
  if (dot <= 0) return { x: 0, y: 0, visible: false };

  vec.project(this.camera);
  const width = this.canvas.clientWidth || this.canvas.width;
  const height = this.canvas.clientHeight || this.canvas.height;
  return {
    x: (vec.x * 0.5 + 0.5) * width,
    y: (1 - (vec.y * 0.5 + 0.5)) * height,
    visible: true,
  };
}
```

Note: also add a `project` mock to the Three.js Vector3 mock if tests require it. Check `src/test/setup.ts` line 116 (`enhanceVector3`) and append to the helper:

```ts
v.project = vi.fn((_camera: any) => {
  // Simple deterministic mock: leaves x/y in -1..1 range proportional to original.
  v.x = Math.tanh(v.x / 100);
  v.y = Math.tanh(v.y / 100);
  return v;
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t worldToScreen --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts src/test/setup.ts
git commit -m "feat(constellation): add worldToScreen projection helper"
```

---

### Task 8: Replace star material with twinkle ShaderMaterial

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts:518-534` (the existing star material/Points block inside `createStars`)
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the existing `describe("ConstellationRenderer", ...)`:

```ts
describe("twinkle shader", () => {
  it("uses a ShaderMaterial with uTime uniform for stars", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize(
      [makeStar()],
      [makeConstellation()],
      makeSkyConfig(),
    );
    const stars = (renderer as any).starPoints;
    expect(stars.material.uniforms.uTime).toBeDefined();
    expect(stars.material.uniforms.uTime.value).toBe(0);
  });

  it("increments uTime each frame during animate()", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    const stars = (renderer as any).starPoints;
    const initial = stars.material.uniforms.uTime.value;
    // Animate is requestAnimationFrame; call its body directly:
    (renderer as any).tickUniforms(0.5);
    expect(stars.material.uniforms.uTime.value).toBeGreaterThan(initial);
  });
});
```

Make sure there's a `makeSkyConfig` helper near the top of the file (mirror the existing `makeStar`/`makeConstellation` style):

```ts
const makeSkyConfig = (overrides: Partial<SkyConfiguration> = {}): SkyConfiguration => ({
  location: { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  dateTime: new Date("2026-01-01T00:00:00Z"),
  fieldOfView: 80,
  showConstellationLines: true,
  showStarNames: false,
  minimumMagnitude: 4,
  ...overrides,
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "twinkle shader" --run`
Expected: FAIL — uniforms undefined or `tickUniforms` not defined.

- [ ] **Step 3: Implement the shader material**

In `src/lib/constellation/ConstellationRenderer.ts`, replace lines 518–534 (the `material` definition and `this.starPoints = new THREE.Points(...)` block) with:

```ts
// Per-star randomized seed for varied twinkle phase/speed.
const starSeeds: number[] = [];
for (let i = 0; i < starPositions.length / 3; i++) {
  starSeeds.push(Math.random());
}
geometry.setAttribute(
  "aSeed",
  new THREE.Float32BufferAttribute(starSeeds, 1),
);

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
  },
  vertexShader: `
    attribute float size;
    attribute float aSeed;
    varying vec3 vColor;
    varying float vSeed;
    uniform float uPixelRatio;
    void main() {
      vColor = color;
      vSeed = aSeed;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPos;
      gl_PointSize = size * 4.0 * uPixelRatio;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vColor;
    varying float vSeed;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv);
      float alpha = smoothstep(0.5, 0.1, d);
      float twinkle = 1.0 + 0.35 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 6.28318);
      vec3 col = vColor * twinkle;
      gl_FragColor = vec4(col, alpha);
    }
  `,
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

this.starPoints = new THREE.Points(geometry, material);
this.starPoints.name = "stars";
this.starPoints.renderOrder = 1;
this.scene.add(this.starPoints);
```

Also add a public helper `tickUniforms(deltaSec: number)` to the class (place near `animate`):

```ts
public tickUniforms(deltaSec: number): void {
  if (this.starPoints && (this.starPoints.material as any).uniforms?.uTime) {
    (this.starPoints.material as any).uniforms.uTime.value += deltaSec;
  }
}
```

Replace the `animate` method body with:

```ts
private animate(): void {
  requestAnimationFrame(this.animate.bind(this));
  if (this.isMouseDown) {
    this.updateCameraRotation();
  }
  this.tickUniforms(0.016);
  this.renderer.render(this.scene, this.camera);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "twinkle shader" --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): replace star material with twinkle ShaderMaterial"
```

---

### Task 9: Replace line material with energy-flow ShaderMaterial

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts:584-599` (line material/segments inside `createConstellationLines`)
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the existing describe block:

```ts
describe("energy-flow lines", () => {
  it("creates ShaderMaterial with uIsSelected and uIsDimmed uniforms per constellation", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    const group = (renderer as any).constellationLines;
    expect(group.children.length).toBe(1);
    const mat = group.children[0].material;
    expect(mat.uniforms.uIsSelected.value).toBe(0);
    expect(mat.uniforms.uIsDimmed.value).toBe(0);
    expect(mat.uniforms.uTime.value).toBe(0);
  });

  it("ticks line uTime every frame", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    const line = (renderer as any).constellationLines.children[0];
    const t0 = line.material.uniforms.uTime.value;
    (renderer as any).tickUniforms(0.25);
    expect(line.material.uniforms.uTime.value).toBeGreaterThan(t0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "energy-flow lines" --run`
Expected: FAIL — uniforms undefined.

- [ ] **Step 3: Implement the line shader**

Inside `createConstellationLines` in `ConstellationRenderer.ts`, build an `aLineProgress` attribute alongside `linePositions`. Replace the line-creation loop with:

```ts
constellations.forEach((constellation) => {
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions: number[] = [];
  const lineProgress: number[] = [];

  const starPositions = constellation.stars.map((star) =>
    celestialToSphere(
      star.rightAscension,
      star.declination,
      skyConfig.location,
      skyConfig.dateTime,
      98,
    ),
  );

  constellation.lines.forEach(([startIndex, endIndex]) => {
    const startPos = starPositions[startIndex];
    const endPos = starPositions[endIndex];
    if (startPos && endPos) {
      linePositions.push(startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z);
      lineProgress.push(0, 1); // 0 at start vertex, 1 at end vertex
    }
  });

  if (linePositions.length === 0) return;

  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute("aLineProgress", new THREE.Float32BufferAttribute(lineProgress, 1));

  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIsSelected: { value: 0 },
      uIsDimmed: { value: 0 },
      uColorIdle: { value: new THREE.Color(0x1b6b7a) },
      uColorHot: { value: new THREE.Color(0x00f0ff) },
    },
    vertexShader: `
      attribute float aLineProgress;
      varying float vProgress;
      void main() {
        vProgress = aLineProgress;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIsSelected;
      uniform float uIsDimmed;
      uniform vec3 uColorIdle;
      uniform vec3 uColorHot;
      varying float vProgress;
      void main() {
        // Energy pulse: a hot stripe rides along the segment.
        float pulse = fract(vProgress * 3.0 - uTime * 0.4);
        float pulseIntensity = smoothstep(0.85, 1.0, pulse) * (uIsSelected > 0.5 ? 1.0 : 0.35);
        vec3 base = mix(uColorIdle, uColorHot, uIsSelected);
        vec3 col = base + uColorHot * pulseIntensity;
        float alpha = uIsDimmed > 0.5 ? 0.18 : (uIsSelected > 0.5 ? 1.0 : 0.5);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.name = `constellation-${constellation.id}`;
  lines.userData.constellationId = constellation.id;
  lines.renderOrder = 2;
  this.constellationLines!.add(lines);
});
```

Extend `tickUniforms` to update all line materials too:

```ts
public tickUniforms(deltaSec: number): void {
  if (this.starPoints && (this.starPoints.material as any).uniforms?.uTime) {
    (this.starPoints.material as any).uniforms.uTime.value += deltaSec;
  }
  if (this.constellationLines) {
    this.constellationLines.children.forEach((child: any) => {
      if (child.material?.uniforms?.uTime) {
        child.material.uniforms.uTime.value += deltaSec;
      }
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "energy-flow lines" --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): replace line material with energy-flow shader"
```

---

### Task 10: Add `setSelected()` / `setHovered()` methods

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

- [ ] **Step 1: Write the failing tests**

Add inside the existing describe block:

```ts
describe("selection state", () => {
  it("setSelected highlights the chosen constellation and dims the rest", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    const c1 = makeConstellation({ id: "orion" });
    const c2 = makeConstellation({ id: "lyra" });
    await renderer.initialize([makeStar()], [c1, c2], makeSkyConfig());
    renderer.setSelected("orion");
    const children = (renderer as any).constellationLines.children;
    const orionMat = children.find((c: any) => c.userData.constellationId === "orion").material;
    const lyraMat = children.find((c: any) => c.userData.constellationId === "lyra").material;
    expect(orionMat.uniforms.uIsSelected.value).toBe(1);
    expect(orionMat.uniforms.uIsDimmed.value).toBe(0);
    expect(lyraMat.uniforms.uIsSelected.value).toBe(0);
    expect(lyraMat.uniforms.uIsDimmed.value).toBe(1);
  });

  it("setSelected(null) restores idle state on all", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    renderer.setSelected("orion");
    renderer.setSelected(null);
    const mat = (renderer as any).constellationLines.children[0].material;
    expect(mat.uniforms.uIsSelected.value).toBe(0);
    expect(mat.uniforms.uIsDimmed.value).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "selection state" --run`
Expected: FAIL — `setSelected is not a function`.

- [ ] **Step 3: Add the methods**

In `ConstellationRenderer.ts`, add class fields near the top:

```ts
private selectedId: string | null = null;
private hoveredId: string | null = null;
```

Add public methods (place after `worldToScreen`):

```ts
public setSelected(id: string | null): void {
  this.selectedId = id;
  if (!this.constellationLines) return;
  this.constellationLines.children.forEach((child: any) => {
    const mat = child.material;
    if (!mat?.uniforms) return;
    const isThisOne = child.userData?.constellationId === id;
    mat.uniforms.uIsSelected.value = isThisOne ? 1 : 0;
    mat.uniforms.uIsDimmed.value = id && !isThisOne ? 1 : 0;
  });
}

public setHovered(id: string | null): void {
  this.hoveredId = id;
}

public getSelectedId(): string | null {
  return this.selectedId;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "selection state" --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): add setSelected/setHovered with uniform updates"
```

---

### Task 11: Add `tweenCameraTo()`

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
describe("tweenCameraTo", () => {
  it("reaches the target rotation within tolerance after duration", async () => {
    vi.useFakeTimers();
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    renderer.tweenCameraTo(0.5, 1.0, 100);
    // simulate frames
    for (let i = 0; i < 12; i++) {
      (renderer as any).tickTween(performance.now() + i * 16);
    }
    expect((renderer as any).cameraRotationX).toBeCloseTo(0.5, 1);
    expect((renderer as any).cameraRotationY).toBeCloseTo(1.0, 1);
    vi.useRealTimers();
  });

  it("cancels active drag momentum on tween start", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    (renderer as any).dragVelocityX = 5;
    (renderer as any).dragVelocityY = 5;
    renderer.tweenCameraTo(0, 0, 200);
    expect((renderer as any).dragVelocityX).toBe(0);
    expect((renderer as any).dragVelocityY).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "tweenCameraTo" --run`
Expected: FAIL — `tweenCameraTo is not a function`.

- [ ] **Step 3: Implement tween**

In `ConstellationRenderer.ts`, add fields:

```ts
private tweenState: {
  startX: number; startY: number;
  targetX: number; targetY: number;
  startedAt: number; duration: number;
  active: boolean;
} = { startX: 0, startY: 0, targetX: 0, targetY: 0, startedAt: 0, duration: 0, active: false };
```

Add the public method and a per-frame ticker:

```ts
public tweenCameraTo(targetRotX: number, targetRotY: number, durationMs: number = 900): void {
  this.dragVelocityX = 0;
  this.dragVelocityY = 0;
  this.tweenState = {
    startX: this.cameraRotationX,
    startY: this.cameraRotationY,
    targetX: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotX)),
    targetY: targetRotY,
    startedAt: performance.now(),
    duration: durationMs,
    active: true,
  };
}

private easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

public tickTween(nowMs: number = performance.now()): void {
  if (!this.tweenState.active) return;
  const t = Math.min(1, (nowMs - this.tweenState.startedAt) / this.tweenState.duration);
  const k = this.easeInOutCubic(t);
  this.cameraRotationX = this.tweenState.startX + (this.tweenState.targetX - this.tweenState.startX) * k;
  this.cameraRotationY = this.tweenState.startY + (this.tweenState.targetY - this.tweenState.startY) * k;
  this.updateCameraRotation();
  if (t >= 1) this.tweenState.active = false;
}
```

Update `animate` to call `this.tickTween()` each frame, just before `this.tickUniforms(0.016)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "tweenCameraTo" --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): add tweenCameraTo with ease-in-out"
```

---

### Task 12: Raycasting + hover/click callbacks

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts` (constructor signature + raycaster wiring)
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
describe("interaction callbacks", () => {
  it("fires onConstellationClick when raycaster hits a constellation line group", async () => {
    const onConstellationClick = vi.fn();
    const renderer = new ConstellationRenderer(makeContainer(), { onConstellationClick });
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());

    // Force the raycaster mock to return a hit on the orion line group
    const group = (renderer as any).constellationLines;
    globalThis.__threeRaycasterIntersects = [
      { object: group.children[0] },
    ];

    // Simulate click
    (renderer as any).handleCanvasClick({
      clientX: 100, clientY: 100, preventDefault: () => {},
    });

    expect(onConstellationClick).toHaveBeenCalledWith("orion");
    globalThis.__threeRaycasterIntersects = undefined;
  });

  it("does not fire onConstellationClick when there are no hits", async () => {
    const onConstellationClick = vi.fn();
    const renderer = new ConstellationRenderer(makeContainer(), { onConstellationClick });
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    globalThis.__threeRaycasterIntersects = [];
    (renderer as any).handleCanvasClick({
      clientX: 100, clientY: 100, preventDefault: () => {},
    });
    expect(onConstellationClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "interaction callbacks" --run`
Expected: FAIL — constructor doesn't accept options / `handleCanvasClick` undefined.

- [ ] **Step 3: Update the constructor and add raycasting**

In `ConstellationRenderer.ts`, change the constructor signature:

```ts
public callbacks: {
  onStarHover?: (star: Star | null, screenPos: { x: number; y: number } | null) => void;
  onConstellationHover?: (id: string | null, screenPos: { x: number; y: number } | null) => void;
  onConstellationClick?: (id: string) => void;
} = {};

private raycaster: THREE.Raycaster = new THREE.Raycaster();
private mouseNDC: { x: number; y: number } = { x: 0, y: 0 };
private lastHoverEmit: number = 0;

constructor(
  container: HTMLElement,
  callbacks: typeof ConstellationRenderer.prototype.callbacks = {},
) {
  this.callbacks = callbacks;
  // ... existing constructor body unchanged
}
```

After existing `setupMouseControls()` and `setupTouchControls()` calls inside the constructor, add:

```ts
this.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
```

Add new methods:

```ts
private handleCanvasClick(event: MouseEvent): void {
  if (!this.callbacks.onConstellationClick && !this.callbacks.onStarHover) return;
  const rect = this.canvas.getBoundingClientRect();
  this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  this.raycaster.setFromCamera(this.mouseNDC as any, this.camera);

  if (this.constellationLines && this.callbacks.onConstellationClick) {
    const hits = this.raycaster.intersectObjects(
      this.constellationLines.children,
      false,
    );
    if (hits.length > 0) {
      const id = (hits[0].object as any).userData?.constellationId;
      if (id) this.callbacks.onConstellationClick(id);
    }
  }
}
```

For hover, modify the existing `onMouseMove` to additionally emit hover events at most every 16ms:

```ts
private onMouseMove(event: MouseEvent): void {
  // ... existing drag handling unchanged ...

  // Hover raycasting (throttled to ~60fps)
  const now = performance.now();
  if (
    !this.isMouseDown &&
    now - this.lastHoverEmit > 16 &&
    (this.callbacks.onConstellationHover || this.callbacks.onStarHover)
  ) {
    this.lastHoverEmit = now;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC as any, this.camera);

    let hoveredId: string | null = null;
    if (this.constellationLines) {
      const hits = this.raycaster.intersectObjects(this.constellationLines.children, false);
      if (hits.length > 0) {
        hoveredId = (hits[0].object as any).userData?.constellationId ?? null;
      }
    }
    if (this.callbacks.onConstellationHover) {
      const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.callbacks.onConstellationHover(hoveredId, hoveredId ? screen : null);
    }
    this.setHovered(hoveredId);
  }
}
```

Update `dispose()` to also remove the click listener:

```ts
this.canvas.removeEventListener("click", this.handleCanvasClick.bind(this));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "interaction callbacks" --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): add raycasting and hover/click callbacks"
```

---

### Task 13: Shooting stars (reduced-motion gated)

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
describe("shooting stars", () => {
  it("does not spawn shooting stars when reduced-motion is preferred", async () => {
    (window.matchMedia as any).mockReturnValueOnce({
      matches: true, media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    const sceneAddCalls = ((renderer as any).scene.add as any).mock.calls.length;
    for (let i = 0; i < 1000; i++) (renderer as any).maybeSpawnShootingStar(performance.now() + i * 100);
    expect(((renderer as any).scene.add as any).mock.calls.length).toBe(sceneAddCalls);
  });

  it("spawns at most one shooting star at a time", async () => {
    const renderer = new ConstellationRenderer(makeContainer());
    await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
    // Force-spawn by directly invoking
    (renderer as any).spawnShootingStar();
    (renderer as any).spawnShootingStar();
    expect((renderer as any).activeShootingStar).not.toBeNull();
    expect((renderer as any).shootingStarCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "shooting stars" --run`
Expected: FAIL — methods undefined.

- [ ] **Step 3: Implement**

Add fields:

```ts
private activeShootingStar: THREE.Line | null = null;
private shootingStarCount: number = 0;
private nextShootingStarAt: number = 0;
private shootingStarStarted: number = 0;
```

Add methods:

```ts
private prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

private maybeSpawnShootingStar(now: number): void {
  if (this.prefersReducedMotion()) return;
  if (this.shootingStarCount > 0) return;
  if (this.nextShootingStarAt === 0) {
    this.nextShootingStarAt = now + (8000 + Math.random() * 6000);
    return;
  }
  if (now < this.nextShootingStarAt) return;
  this.spawnShootingStar();
  this.nextShootingStarAt = now + (8000 + Math.random() * 6000);
}

private spawnShootingStar(): void {
  if (this.shootingStarCount > 0) return;
  const startAz = Math.random() * Math.PI * 2;
  const startEl = (Math.random() - 0.5) * Math.PI * 0.7;
  const len = 12 + Math.random() * 8;
  const dirAz = startAz + (Math.random() - 0.5) * 0.6;
  const dirEl = startEl + 0.3 + Math.random() * 0.2;

  const r = 95;
  const start = {
    x: r * Math.cos(startEl) * Math.cos(startAz),
    y: r * Math.sin(startEl),
    z: r * Math.cos(startEl) * Math.sin(startAz),
  };
  const end = {
    x: r * Math.cos(dirEl) * Math.cos(dirAz),
    y: r * Math.sin(dirEl),
    z: r * Math.cos(dirEl) * Math.sin(dirAz),
  };

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(
    [start.x, start.y, start.z, end.x, end.y, end.z], 3,
  ));
  const mat = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const line = new THREE.LineSegments(geom, mat);
  line.renderOrder = 3;
  this.scene.add(line);
  this.activeShootingStar = line as unknown as THREE.Line;
  this.shootingStarCount = 1;
  this.shootingStarStarted = performance.now();
  void len; // length unused — start/end derive their own direction
}

private tickShootingStar(now: number): void {
  if (!this.activeShootingStar) return;
  const elapsed = now - this.shootingStarStarted;
  const t = elapsed / 700;
  if (t >= 1) {
    this.scene.remove(this.activeShootingStar);
    const line = this.activeShootingStar as unknown as THREE.LineSegments;
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
    this.activeShootingStar = null;
    this.shootingStarCount = 0;
    return;
  }
  const mat = (this.activeShootingStar as unknown as THREE.LineSegments).material as THREE.LineBasicMaterial;
  mat.opacity = 0.9 * (1 - t);
}
```

Update `animate` to call:

```ts
private animate(): void {
  requestAnimationFrame(this.animate.bind(this));
  if (this.isMouseDown) this.updateCameraRotation();
  const now = performance.now();
  this.tickTween(now);
  this.tickUniforms(0.016);
  this.tickShootingStar(now);
  this.maybeSpawnShootingStar(now);
  this.renderer.render(this.scene, this.camera);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest src/lib/constellation/__tests__/ConstellationRenderer.test.ts -t "shooting stars" --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): add reduced-motion-gated shooting stars"
```

---

## Phase 3 — HUD Overlay Layer

### Task 14: `BootSequence.svelte`

**Files:**
- Create: `src/components/hud/BootSequence.svelte`
- Test: `src/components/hud/__tests__/BootSequence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/BootSequence.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import BootSequence from "../BootSequence.svelte";

describe("BootSequence", () => {
  it("prints all lines after total duration", async () => {
    vi.useFakeTimers();
    const { container } = render(BootSequence, {
      props: { debugInfo: "Constellation view ready" },
    });
    vi.advanceTimersByTime(1200);
    await tick();
    const lines = container.querySelectorAll("[data-line]");
    expect(lines.length).toBeGreaterThanOrEqual(5);
    vi.useRealTimers();
  });

  it("renders the debugInfo text as the AWAITING TARGET line content when provided", () => {
    const { container } = render(BootSequence, {
      props: { debugInfo: "Getting user location..." },
    });
    expect(container.textContent).toContain("Getting user location");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/BootSequence.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/BootSequence.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  export let debugInfo: string = "";

  const baseLines = [
    "> INIT SKYMAP v2.5",
    "> GEO-LOCK ........... [OK]",
    "> STELLAR DB ......... 4,184 OBJ",
    "> RENDER PIPELINE .... ONLINE",
    "> AWAITING TARGET",
  ];

  let revealedCount = 0;

  onMount(() => {
    const interval = setInterval(() => {
      revealedCount += 1;
      if (revealedCount >= baseLines.length) clearInterval(interval);
    }, 180);
  });

  $: lines = baseLines.map((line, i) => {
    if (i === baseLines.length - 1 && debugInfo) {
      return `> ${debugInfo.toUpperCase()}`;
    }
    return line;
  });
</script>

<div class="boot-sequence" role="status" aria-live="polite">
  <div class="boot-body">
    {#each lines as line, i}
      {#if i <= revealedCount}
        <div class="boot-line" data-line={i}>{line}</div>
      {/if}
    {/each}
  </div>
  <div class="boot-scanbar" aria-hidden="true"></div>
</div>

<style>
  .boot-sequence {
    position: absolute;
    inset: 0;
    background: var(--hud-void);
    color: var(--hud-cyan);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 0 8vw;
    font-family: var(--hud-font-mono);
    font-size: 13px;
    line-height: 1.8;
    overflow: hidden;
  }
  .boot-line {
    text-shadow: 0 0 4px var(--hud-cyan);
    animation: boot-flicker 140ms steps(3, end);
  }
  .boot-line:last-child {
    color: var(--hud-magenta);
    text-shadow: 0 0 6px var(--hud-magenta);
  }
  .boot-scanbar {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--hud-cyan), transparent);
    animation: boot-scan 1.6s linear infinite;
  }
  @keyframes boot-flicker {
    0%, 100% { opacity: 1; }
    33% { opacity: 0.3; }
    66% { opacity: 0.8; }
  }
  @keyframes boot-scan {
    from { transform: translateX(-100%); }
    to { transform: translateX(100%); }
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/BootSequence.test.ts --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/BootSequence.svelte src/components/hud/__tests__/BootSequence.test.ts
git commit -m "feat(hud): add BootSequence loading replacement"
```

---

### Task 15: `TargetLockOverlay.svelte`

**Files:**
- Create: `src/components/hud/TargetLockOverlay.svelte`
- Test: `src/components/hud/__tests__/TargetLockOverlay.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/hud/__tests__/TargetLockOverlay.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import TargetLockOverlay from "../TargetLockOverlay.svelte";

describe("TargetLockOverlay", () => {
  it("does not render when visible is false", () => {
    const { container } = render(TargetLockOverlay, {
      props: { visible: false, x: 100, y: 100, name: "Orion" },
    });
    expect(container.querySelector(".target-lock")).toBeNull();
  });

  it("renders reticle, name and TARGET LOCKED badge when visible", () => {
    const { container, getByText } = render(TargetLockOverlay, {
      props: { visible: true, x: 100, y: 100, name: "Orion" },
    });
    expect(container.querySelector(".target-lock")).not.toBeNull();
    expect(getByText("Orion")).toBeTruthy();
    expect(getByText("TARGET LOCKED")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest src/components/hud/__tests__/TargetLockOverlay.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/hud/TargetLockOverlay.svelte`:

```svelte
<script lang="ts">
  import HudReticle from "./HudReticle.svelte";
  export let visible: boolean = false;
  export let x: number = 0;
  export let y: number = 0;
  export let name: string = "";
</script>

{#if visible}
  <div class="target-lock" style="transform: translate({x}px, {y}px);">
    <HudReticle x={0} y={0} state="locked" />
    <div class="target-meta">
      <div class="target-name">{name}</div>
      <div class="target-badge">TARGET LOCKED</div>
    </div>
  </div>
{/if}

<style>
  .target-lock {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  .target-meta {
    position: absolute;
    top: 36px;
    left: 36px;
    color: var(--hud-ivory);
    font-family: var(--hud-font-display);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    text-shadow: 0 0 6px var(--hud-cyan);
  }
  .target-name {
    font-size: 14px;
    font-weight: 700;
  }
  .target-badge {
    font-family: var(--hud-font-mono);
    font-size: 10px;
    color: var(--hud-magenta);
    text-shadow: 0 0 4px var(--hud-magenta);
    margin-top: 2px;
    animation: badge-pulse 1.4s ease-in-out infinite;
  }
  @keyframes badge-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest src/components/hud/__tests__/TargetLockOverlay.test.ts --run`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/TargetLockOverlay.svelte src/components/hud/__tests__/TargetLockOverlay.test.ts
git commit -m "feat(hud): add TargetLockOverlay"
```

---

### Task 16: Wire HUD overlay layer + screen-coords rAF loop

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Add imports and reactive state**

At the top of `<script>` in `ConstellationWrapper.svelte`, add:

```ts
import ScanLines from "./hud/ScanLines.svelte";
import HudReticle from "./hud/HudReticle.svelte";
import HudCallout from "./hud/HudCallout.svelte";
import TargetLockOverlay from "./hud/TargetLockOverlay.svelte";
import { constellations } from "../data/constellations";
import { celestialToSphere } from "../utils/astronomy";

let hoverPos: { x: number; y: number } | null = null;
let lockedPos: { x: number; y: number; visible: boolean } | null = null;
let hoverStarPos: { x: number; y: number; name: string; magnitude: number } | null = null;
let hudRafId: number | null = null;
let selectedId: string | null = null;
let hoveredConstellationId: string | null = null;
```

- [ ] **Step 2: Provide renderer callbacks at instantiation**

Locate where `new ConstellationRenderer(container)` is called inside `onMount` (line 122). Replace it with:

```ts
renderer = new ConstellationRenderer(container, {
  onConstellationHover: (id, screenPos) => {
    hoveredConstellationId = id;
    hoverPos = screenPos;
  },
  onConstellationClick: (id) => {
    handleSelectConstellation(id);
  },
  onStarHover: (star, screenPos) => {
    hoverStarPos = star && screenPos
      ? { x: screenPos.x, y: screenPos.y, name: star.name, magnitude: star.magnitude }
      : null;
  },
});
```

- [ ] **Step 3: Start the screen-coords rAF loop after load**

After `loading = false;` near line 157 in `onMount`, append:

```ts
const tickHud = () => {
  if (renderer && selectedId && viewState.skyConfig) {
    const c = constellations.find(x => x.id === selectedId);
    if (c && c.stars.length) {
      let avgRA = 0, avgDec = 0;
      c.stars.forEach(s => { avgRA += s.rightAscension; avgDec += s.declination; });
      avgRA /= c.stars.length; avgDec /= c.stars.length;
      const p = celestialToSphere(avgRA, avgDec, viewState.skyConfig.location, viewState.skyConfig.dateTime, 100);
      lockedPos = renderer.worldToScreen(p);
    }
  } else {
    lockedPos = null;
  }
  hudRafId = requestAnimationFrame(tickHud);
};
tickHud();
```

In `onDestroy`, before `if (renderer) renderer.dispose()`, add:

```ts
if (hudRafId !== null) cancelAnimationFrame(hudRafId);
```

- [ ] **Step 4: Update `handleSelectConstellation` to drive the renderer**

Replace the current `handleSelectConstellation` body (line 208) with:

```ts
const handleSelectConstellation = (constellationId: string) => {
  viewState.selectedConstellation = constellationId;
  selectedId = constellationId;
  if (!renderer || !viewState.skyConfig) return;
  renderer.setSelected(constellationId);

  const c = constellations.find(x => x.id === constellationId);
  if (!c || c.stars.length === 0) return;
  let avgRA = 0, avgDec = 0;
  c.stars.forEach(s => { avgRA += s.rightAscension; avgDec += s.declination; });
  avgRA /= c.stars.length; avgDec /= c.stars.length;

  const p = celestialToSphere(avgRA, avgDec, viewState.skyConfig.location, viewState.skyConfig.dateTime, 100);
  // Convert world (sphere) coords back to camera rotation: yaw=atan2(x,z), pitch=asin(y/|p|)
  const r = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) || 1;
  const targetY = Math.atan2(p.x, p.z);
  const targetX = Math.asin(p.y / r);
  renderer.tweenCameraTo(targetX, targetY, 900);
};
```

- [ ] **Step 5: Add the HUD overlay markup**

Inside `.constellation-view`, immediately after `<div bind:this={container} class="constellation-container"></div>` (around line 538), add:

```svelte
<!-- HUD overlay layer (z-index: 5) -->
<div class="hud-layer" aria-hidden="true">
  <ScanLines />
  {#if hoveredConstellationId && hoverPos}
    <HudReticle x={hoverPos.x} y={hoverPos.y} state="hover"
      label={constellations.find(c => c.id === hoveredConstellationId)?.abbreviation ?? ""} />
  {/if}
  {#if hoverStarPos}
    <HudCallout
      x={hoverStarPos.x}
      y={hoverStarPos.y}
      title={hoverStarPos.name}
      lines={[`MAG ${hoverStarPos.magnitude.toFixed(2)}`]}
    />
  {/if}
  {#if selectedId && lockedPos && lockedPos.visible}
    <TargetLockOverlay
      visible={true}
      x={lockedPos.x}
      y={lockedPos.y}
      name={constellations.find(c => c.id === selectedId)?.name ?? ""}
    />
  {/if}
</div>
```

Add the CSS for `.hud-layer` inside the existing `<style>` block:

```css
.hud-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}
```

- [ ] **Step 6: Run wrapper tests to verify nothing regresses**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Expected: PASS (mocks already cover renderer methods; new HUD components don't make the wrapper test fail since they render with `null`/safe defaults).

If tests fail because the mocked renderer is missing new methods (`setSelected`, `tweenCameraTo`, `worldToScreen`), update the mock in `src/components/__tests__/ConstellationWrapper.test.ts:7-11`:

```ts
const mockRenderer = {
  initialize: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn(),
  resize: vi.fn(),
  setSelected: vi.fn(),
  setHovered: vi.fn(),
  tweenCameraTo: vi.fn(),
  worldToScreen: vi.fn(() => ({ x: 0, y: 0, visible: false })),
};
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ConstellationWrapper.svelte src/components/__tests__/ConstellationWrapper.test.ts
git commit -m "feat(constellation): wire HUD overlay layer and selection tween"
```

---

### Task 17: Replace loading overlay with `<BootSequence>` and drag-instructions with HUD card

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Replace the loading overlay block**

In the template, replace the entire `{#if loading}` branch (lines ~411–419) with:

```svelte
{#if loading}
  <div class="absolute inset-0 z-30">
    <BootSequence debugInfo={debugInfo} />
  </div>
{:else if error}
  <!-- existing error branch unchanged -->
```

Add the import at the top of `<script>`:

```ts
import BootSequence from "./hud/BootSequence.svelte";
```

The outer wrapper `{#if loading || error || !webglSupported}` and the WebGL-unsupported branch remain unchanged; only the inner loading content swaps to `<BootSequence>`.

- [ ] **Step 2: Replace the drag-instructions card**

Replace the entire `{#if !loading && !error && webglSupported && showDragInstructions}` block (lines ~440–453) with:

```svelte
{#if !loading && !error && webglSupported && showDragInstructions}
  <div class="absolute bottom-12 left-12 z-5" style="pointer-events: none;">
    <div class="hud-drag-card">
      <span class="hud-drag-prefix">&gt;</span>
      AWAITING TARGET — DRAG TO ORIENT
    </div>
  </div>
{/if}
```

Add to `<style>`:

```css
.hud-drag-card {
  font-family: var(--hud-font-mono);
  font-size: 11px;
  color: var(--hud-cyan);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-shadow: 0 0 4px var(--hud-cyan);
  padding: 8px 12px;
  background: rgba(2,4,10,0.6);
  border: 1px solid var(--hud-cyan);
  animation: drag-fade-in var(--hud-dur-glide) var(--hud-ease-glide);
}
.hud-drag-prefix {
  color: var(--hud-magenta);
  margin-right: 6px;
}
@keyframes drag-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 3: Run the wrapper tests**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): replace loading overlay with BootSequence and HUD drag-instructions"
```

---

## Phase 4 — UI Panel Pass

### Task 18: Reskin back button + controls toggle

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Replace the back-button markup**

In `ConstellationWrapper.svelte`, replace the back button block (lines ~362–370) with:

```svelte
<div class="absolute top-4 left-4 z-20">
  <HudFrame color="var(--hud-cyan)" bracketLength={12}>
    <button
      type="button"
      class="hud-btn"
      on:click={handleBackToMenu}
    >
      <span class="hud-btn-bracket">&lt;</span> RETURN
    </button>
  </HudFrame>
</div>
```

- [ ] **Step 2: Replace the controls-toggle markup**

Replace the controls toggle block (lines ~373–381) with:

```svelte
<div class="absolute top-4 right-4 z-20">
  <HudFrame color="var(--hud-cyan)" bracketLength={12}>
    <button
      type="button"
      class="hud-btn"
      on:click={handleToggleControls}
    >
      {showControls ? "PANEL ON" : "PANEL OFF"}
    </button>
  </HudFrame>
</div>
```

- [ ] **Step 3: Add the import and shared button styles**

Add to top of `<script>`:

```ts
import HudFrame from "./hud/HudFrame.svelte";
```

Add to `<style>`:

```css
.hud-btn {
  font-family: var(--hud-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--hud-cyan);
  background: rgba(2,4,10,0.65);
  backdrop-filter: blur(8px);
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  position: relative;
  text-shadow: 0 0 4px var(--hud-cyan);
}
.hud-btn::after {
  content: "";
  position: absolute;
  left: 14px; right: 14px; bottom: 4px;
  height: 1px;
  background: var(--hud-magenta);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 140ms var(--hud-ease-snap);
}
.hud-btn:hover::after { transform: scaleX(1); }
.hud-btn-bracket { color: var(--hud-magenta); margin-right: 4px; }
```

- [ ] **Step 4: Verify**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): reskin back button and controls toggle with HudFrame"
```

---

### Task 19: Reskin the controls panel

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Replace the outer panel wrapper**

Replace the outer controls panel (lines ~456–533) opening container `<div class="absolute top-20 right-4 z-20 w-80">` and its inner `<div class="bg-black/70 ...">` with:

```svelte
{#if showControls && !loading && !error}
  <div class="absolute top-20 right-4 z-20 w-80 hud-panel-anim">
    <HudFrame color="var(--hud-cyan)" bracketLength={18} glow={true}>
      <div class="hud-panel">
        <div class="hud-panel-header">
          <h3 class="hud-panel-title">CONSTELLATIONS</h3>
          <span class="hud-panel-tick"></span>
        </div>

        <!-- (existing inner content: location toggle, list, details — see Tasks 20–22 for re-formatting) -->
        ...existing content...
      </div>
    </HudFrame>
  </div>
{/if}
```

Keep the existing content blocks (toggle button, location/time block, list, details) as their current markup for now — Tasks 20–22 will rework them.

- [ ] **Step 2: Add styles for the panel**

Add to `<style>`:

```css
.hud-panel {
  background: rgba(2,4,10,0.82);
  backdrop-filter: blur(10px);
  color: var(--hud-ivory);
  padding: 16px;
  font-family: var(--hud-font-mono);
  font-size: 12px;
}
.hud-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--hud-cyan);
  padding-bottom: 8px;
  margin-bottom: 12px;
}
.hud-panel-title {
  font-family: var(--hud-font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.2em;
  color: var(--hud-cyan);
  text-shadow: 0 0 6px var(--hud-cyan);
  flex: 1;
}
.hud-panel-tick {
  width: 8px; height: 8px;
  background: var(--hud-magenta);
  box-shadow: 0 0 6px var(--hud-magenta);
}
.hud-panel-anim {
  animation: hud-panel-in var(--hud-dur-glide) var(--hud-ease-glide);
}
@keyframes hud-panel-in {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

- [ ] **Step 3: Verify**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): reskin controls panel with HudFrame and entrance animation"
```

---

### Task 20: Reformat constellation list rows

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Replace the list section**

Replace the visible-constellations block (lines ~491–509) with:

```svelte
<div>
  <h4 class="hud-section-label">VISIBLE</h4>
  <div class="hud-list">
    {#each viewState.visibleConstellations as constellationId}
      {#each constellations.filter(c => c.id === constellationId) as constellation}
        <button
          type="button"
          class="hud-list-row"
          class:is-selected={viewState.selectedConstellation === constellation.id}
          on:click={() => handleSelectConstellation(constellation.id)}
          data-constellation-id={constellation.id}
        >
          <span class="row-abbr">[{constellation.abbreviation}]</span>
          <span class="row-name">{constellation.name}</span>
          <span class="row-leader"></span>
          <span class="row-count">{constellation.stars.length}★</span>
        </button>
      {/each}
    {/each}
  </div>
</div>
```

- [ ] **Step 2: Add the styles**

Add to `<style>`:

```css
.hud-section-label {
  font-family: var(--hud-font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--hud-cyan-dim);
  margin: 8px 0 6px;
}
.hud-list { display: flex; flex-direction: column; gap: 1px; max-height: 11rem; overflow-y: auto; }
.hud-list-row {
  position: relative;
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 8px;
  align-items: baseline;
  padding: 6px 8px 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: var(--hud-font-mono);
  font-size: 11px;
  color: var(--hud-ivory);
  text-align: left;
}
.hud-list-row::before {
  content: "";
  position: absolute;
  left: 0; top: 0;
  width: 2px; height: 0;
  background: var(--hud-magenta);
  box-shadow: 0 0 4px var(--hud-magenta);
  transition: height 120ms var(--hud-ease-snap);
}
.hud-list-row:hover {
  background: rgba(0, 240, 255, 0.08);
}
.hud-list-row:hover::before { height: 100%; }
.hud-list-row.is-selected {
  border-color: var(--hud-cyan);
  background: rgba(0, 240, 255, 0.06);
  box-shadow: 0 0 6px rgba(255, 45, 180, 0.25);
}
.hud-list-row.is-selected::before { height: 100%; }
.row-abbr { color: var(--hud-cyan); }
.row-name { color: var(--hud-ivory); }
.row-leader {
  border-bottom: 1px dotted var(--hud-cyan-dim);
  align-self: end;
  margin-bottom: 4px;
}
.row-count { color: var(--hud-magenta); }
```

- [ ] **Step 3: Verify**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): reformat list rows with dot leaders and hover bar"
```

---

### Task 21: Reskin the selected-details block

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Add the import**

Add to top of `<script>`:

```ts
import GlitchText from "./hud/GlitchText.svelte";
```

- [ ] **Step 2: Replace the details block**

Replace the selected-constellation block (lines ~511–530) with:

```svelte
{#if viewState.selectedConstellation}
  {#each constellations.filter(c => c.id === viewState.selectedConstellation) as constellation}
    <div class="hud-details">
      <div class="hud-divider">
        <span class="hud-divider-diamond"></span>
      </div>
      <h4 class="hud-details-name">
        <GlitchText text={constellation.name.toUpperCase()} />
      </h4>
      <p class="hud-details-desc">{constellation.description}</p>
      {#if constellation.mythology}
        <p class="hud-details-myth">// {constellation.mythology}</p>
      {/if}
      <div class="hud-month-strip" aria-label="Best viewing months">
        {#each Array(12) as _, m}
          <div
            class="month-cell"
            class:is-best={constellation.visibility.bestMonths.includes(m + 1)}
            title={new Date(2000, m).toLocaleDateString(currentLang, { month: "short" })}
          ></div>
        {/each}
      </div>
    </div>
  {/each}
{/if}
```

- [ ] **Step 3: Add the styles**

Add to `<style>`:

```css
.hud-details { margin-top: 12px; padding-top: 12px; }
.hud-divider {
  position: relative;
  border-top: 1px dashed var(--hud-cyan);
  margin-bottom: 12px;
}
.hud-divider-diamond {
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px; height: 8px;
  background: var(--hud-magenta);
  box-shadow: 0 0 6px var(--hud-magenta);
}
.hud-details-name {
  font-family: var(--hud-font-display);
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0 0 6px;
}
.hud-details-desc {
  font-family: var(--hud-font-mono);
  font-size: 11px;
  color: var(--hud-ivory);
  opacity: 0.85;
  margin: 0 0 8px;
}
.hud-details-myth {
  font-family: var(--hud-font-mono);
  font-size: 10px;
  font-style: italic;
  color: var(--hud-cyan-dim);
  margin: 0 0 10px;
}
.hud-month-strip {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
}
.month-cell {
  height: 8px;
  border: 1px solid var(--hud-cyan-dim);
}
.month-cell.is-best {
  background: var(--hud-cyan);
  border-color: var(--hud-cyan);
  box-shadow: 0 0 4px var(--hud-cyan);
}
```

- [ ] **Step 4: Verify**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): reskin details block with GlitchText name and month strip"
```

---

### Task 22: Reformat location/time block

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Replace the location/time block**

Replace the location/time block (lines ~473–488, plus the toggle button above it) with:

```svelte
<div class="hud-readout">
  <div class="readout-row">
    <span class="readout-label">GEO-LOCK</span>
    <span class="readout-blink" data-state={viewState.locationPermissionGranted ? "live" : "fallback"}></span>
    <span class="readout-value">
      {#if viewState.skyConfig}
        {Math.abs(viewState.skyConfig.location.latitude).toFixed(4)}°{viewState.skyConfig.location.latitude >= 0 ? "N" : "S"}
        {Math.abs(viewState.skyConfig.location.longitude).toFixed(4)}°{viewState.skyConfig.location.longitude >= 0 ? "E" : "W"}
      {/if}
    </span>
  </div>
  <div class="readout-row">
    <span class="readout-label">UTC</span>
    <span class="readout-value">{utcReadout}</span>
  </div>
</div>
```

Add to `<script>` near the other reactive declarations:

```ts
$: utcReadout = viewState.skyConfig?.dateTime
  ? viewState.skyConfig.dateTime.toISOString().slice(0, 16).replace("T", " ")
  : "";
```

- [ ] **Step 2: Add the styles**

Add to `<style>`:

```css
.hud-readout {
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid var(--hud-cyan-dim);
  background: rgba(0, 240, 255, 0.04);
  font-family: var(--hud-font-mono);
  font-size: 11px;
}
.readout-row {
  display: grid;
  grid-template-columns: 64px 12px 1fr;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.readout-label {
  color: var(--hud-cyan);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.readout-blink {
  width: 6px; height: 6px;
  background: var(--hud-magenta);
  box-shadow: 0 0 4px var(--hud-magenta);
  animation: blink-live 1s steps(2, end) infinite;
}
.readout-blink[data-state="fallback"] {
  background: var(--hud-amber);
  box-shadow: 0 0 4px var(--hud-amber);
}
.readout-value {
  color: var(--hud-ivory);
}
@keyframes blink-live {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.2; }
}
@media (prefers-reduced-motion: reduce) {
  .readout-blink { animation: none; }
}
```

- [ ] **Step 3: Run the wrapper tests and the full unit suite**

Run: `bunx vitest src/components/__tests__/ConstellationWrapper.test.ts --run`
Then: `bun run test:run`
Expected: PASS for the wrapper tests, and the project-wide unit suite stays green.

- [ ] **Step 4: Manual smoke test**

Start the dev server and visit `http://localhost:3600/constellation`:

```bash
bun run dev
```

Verify:
- Boot sequence prints, then unmounts
- Stars twinkle, constellation lines have a slow flowing pulse
- Hovering over a line shows the cyan reticle with the abbreviation label
- Hovering over a bright star shows a callout with name + magnitude
- Clicking a list row tweens the camera and switches the lines to hot-cyan; other constellations dim; magenta "TARGET LOCKED" badge appears
- Drag-instructions card appears in bottom-left and dismisses after first drag
- Scan-lines drift across the whole view at low opacity

- [ ] **Step 5: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): reformat location/time block as HUD readout"
```

---

## Self-review

**Spec coverage check** (every spec section maps to at least one task):

| Spec §                              | Task(s)            |
|-------------------------------------|--------------------|
| §1 Palette, fonts, motion           | 1                  |
| §1 HudFrame / HudReticle / ScanLines| 2, 3, 4            |
| §1 Reduced-motion gates             | 1, 5, 13, 22       |
| §2 Star twinkling                   | 8                  |
| §2 Energy-flow lines                | 9                  |
| §2 Raycasting hover + click         | 12                 |
| §2 Camera tween                     | 11                 |
| §2 worldToScreen                    | 7                  |
| §2 Shooting stars                   | 13                 |
| §2 Selection state on renderer      | 10                 |
| §3 HudReticle / HudCallout          | 4, 6               |
| §3 BootSequence                     | 14                 |
| §3 TargetLockOverlay                | 15                 |
| §3 Wiring + rAF loop                | 16                 |
| §3 Loading/drag-instructions swap   | 17                 |
| §4 Back/toggle reskin               | 18                 |
| §4 Controls panel                   | 19                 |
| §4 List rows                        | 20                 |
| §4 Details block (GlitchText, month strip) | 5, 21       |
| §4 Location/time block              | 22                 |

All spec sections covered.

**Type/name consistency:** `setSelected`, `setHovered`, `getSelectedId`, `tweenCameraTo`, `worldToScreen`, `tickUniforms`, `tickTween`, `tickShootingStar`, `maybeSpawnShootingStar`, `spawnShootingStar`, `handleCanvasClick` are consistent across Tasks 7–13. Callback names `onConstellationHover`, `onConstellationClick`, `onStarHover` consistent across renderer constructor (Task 12) and wrapper wiring (Task 16). Z-index map (z-1 / z-5 / z-20 / z-30) consistent across Tasks 16, 17.

**Placeholder scan:** No "TBD", "TODO", "implement appropriate error handling", or vague references. Each step shows the exact code to write.
