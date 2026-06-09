# Unified Tactical-HUD Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the constellation view's tactical-HUD styling into a shared design layer, apply it consistently to every subpage, and add an Explore search/pagination browser plus an in-system "JUMP TO" finder that flies the camera and pins a target-lock reticle.

**Architecture:** A shared `hud.css` + three reusable Svelte components (`HudButton`, `HudPanel`, `HudSearch`) become the single source of truth for HUD styling. Pure filter/pagination logic lives in a testable `src/lib/hud/` module. The planetary renderer gains a `worldToScreen()` projection (ported from the constellation renderer) so the wrapper can track a target-lock reticle each frame.

**Tech Stack:** Astro 5, Svelte 5, Three.js 0.178+, TailwindCSS 4, Vitest + Testing Library, bun.

**Spec:** `docs/superpowers/specs/2026-06-09-unified-tactical-hud-design.md`

---

## File Structure

**New files:**
- `src/styles/hud.css` — shared HUD classes (promoted from ConstellationWrapper), imported by `global.css`.
- `src/lib/hud/list.ts` — pure logic: `matchesQuery`, `paginate`, `pageLabel`.
- `src/lib/hud/__tests__/list.test.ts` — unit tests for the above.
- `src/components/hud/HudButton.svelte` — bracketed `hud-btn` button.
- `src/components/hud/HudPanel.svelte` — framed panel (HudFrame + header + tick + slot).
- `src/components/hud/HudSearch.svelte` — HUD search input.
- `src/components/ExploreSystems.svelte` — system browser with search + pagination.

**Modified files:**
- `src/styles/global.css` — `@import "./hud.css";`
- `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/ja.ts` — new keys.
- `src/lib/planetary-system/graphics/SolarSystemRenderer.ts` — `worldToScreen`, `getBodyWorldPosition` + expose on controls.
- `src/lib/planetary-system/graphics/types.ts` — extend `SolarSystemControls`.
- `src/lib/planetary-system/PlanetarySystemRenderer.ts` — surface `worldToScreen`, `getBodyWorldPosition`.
- `src/components/PlanetarySystemWrapper.svelte` — HUD panels/rail + finder + pin loop.
- `src/components/MainMenu.svelte` — use `ExploreSystems`, remove inline modal.
- `src/components/ConstellationWrapper.svelte` — switch to shared classes, delete duplicated CSS.
- `src/components/GalaxyWrapper.svelte` — HUD restyle (presentation only).
- `src/components/TerrainExplorer.svelte` — HUD restyle (presentation only).

**Removed:**
- `src/components/SystemSelector.svelte` (and its test) — superseded by `ExploreSystems`.

---

## Task 1: Add i18n keys (en/zh/ja)

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/ja.ts`

All later UI tasks reference these keys; add them first so nothing is undefined.

- [ ] **Step 1: Add keys to `src/i18n/en.ts`**

Insert these entries into the exported `en` object (anywhere inside it, e.g. after the `controls.*` block):

```ts
    // HUD search / explore / finder
    "explore.title": "Star Systems",
    "explore.searchPlaceholder": "SEARCH SYSTEMS…",
    "explore.empty": "NO SYSTEMS MATCH QUERY",
    "explore.bodies": "Bodies",
    "explore.distance": "Distance",
    "explore.action": "Explore",
    "explore.current": "Current System",
    "explore.prev": "Prev",
    "explore.next": "Next",
    "explore.page": "Page",
    "finder.open": "Jump to body",
    "finder.title": "Jump To",
    "finder.placeholder": "SEARCH BODIES…",
    "finder.empty": "NO BODIES MATCH QUERY",
    "finder.pinned": "Pinned",
    "finder.unpin": "Unpin",
    "finder.close": "Close",
    "type.star": "Stars",
    "type.planet": "Planets",
    "type.moon": "Moons",
```

- [ ] **Step 2: Add the same keys to `src/i18n/zh.ts`**

```ts
    "explore.title": "恒星系统",
    "explore.searchPlaceholder": "搜索系统…",
    "explore.empty": "没有匹配的系统",
    "explore.bodies": "天体",
    "explore.distance": "距离",
    "explore.action": "探索",
    "explore.current": "当前系统",
    "explore.prev": "上一页",
    "explore.next": "下一页",
    "explore.page": "页",
    "finder.open": "跳转到天体",
    "finder.title": "跳转到",
    "finder.placeholder": "搜索天体…",
    "finder.empty": "没有匹配的天体",
    "finder.pinned": "已固定",
    "finder.unpin": "取消固定",
    "finder.close": "关闭",
    "type.star": "恒星",
    "type.planet": "行星",
    "type.moon": "卫星",
```

- [ ] **Step 3: Add the same keys to `src/i18n/ja.ts`**

```ts
    "explore.title": "恒星系",
    "explore.searchPlaceholder": "システムを検索…",
    "explore.empty": "一致するシステムがありません",
    "explore.bodies": "天体",
    "explore.distance": "距離",
    "explore.action": "探索",
    "explore.current": "現在のシステム",
    "explore.prev": "前へ",
    "explore.next": "次へ",
    "explore.page": "ページ",
    "finder.open": "天体へジャンプ",
    "finder.title": "ジャンプ先",
    "finder.placeholder": "天体を検索…",
    "finder.empty": "一致する天体がありません",
    "finder.pinned": "固定中",
    "finder.unpin": "固定解除",
    "finder.close": "閉じる",
    "type.star": "恒星",
    "type.planet": "惑星",
    "type.moon": "衛星",
```

- [ ] **Step 4: Verify types compile**

Run: `bun run type-check`
Expected: PASS (no missing-key or duplicate-key errors). If `UiKey` mismatch errors appear, ensure all three files have an identical key set.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts
git commit -m "feat(i18n): add HUD explore/finder keys"
```

---

## Task 2: Create shared HUD stylesheet

**Files:**
- Create: `src/styles/hud.css`
- Modify: `src/styles/global.css`

Promote the `hud-*` classes (currently scoped inside `ConstellationWrapper.svelte:774-1010`) into a shared, un-scoped stylesheet. The HUD tokens (`--hud-cyan`, etc.) already live in `global.css:241-264` and stay there.

- [ ] **Step 1: Create `src/styles/hud.css`**

```css
/* Shared tactical-HUD classes. Tokens live in global.css (:root).
   Promoted from ConstellationWrapper so every subpage stays cohesive. */

.hud-btn {
  font-family: var(--hud-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--hud-cyan);
  background: color-mix(in srgb, var(--hud-void) 65%, transparent);
  -webkit-backdrop-filter: blur(8px);
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
.hud-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.hud-btn:disabled::after { display: none; }
.hud-btn-bracket { color: var(--hud-magenta); margin-right: 4px; }

.hud-panel {
  background: color-mix(in srgb, var(--hud-void) 82%, transparent);
  -webkit-backdrop-filter: blur(10px);
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
  text-transform: uppercase;
  flex: 1;
}
.hud-panel-tick {
  width: 8px;
  height: 8px;
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
.hud-list-row:hover { background: color-mix(in srgb, var(--hud-cyan) 8%, transparent); }
.hud-list-row:hover::before { height: 100%; }
.hud-list-row.is-selected {
  border-color: var(--hud-cyan);
  background: color-mix(in srgb, var(--hud-cyan) 6%, transparent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--hud-magenta) 25%, transparent);
}
.hud-list-row.is-selected::before { height: 100%; }
.row-abbr { color: var(--hud-cyan); }
.row-name { color: var(--hud-ivory); }
.row-leader { border-bottom: 1px dotted var(--hud-cyan-dim); align-self: end; margin-bottom: 4px; }
.row-count { color: var(--hud-magenta); }

.hud-divider { position: relative; border-top: 1px dashed var(--hud-cyan); margin-bottom: 12px; }
.hud-divider-diamond {
  position: absolute;
  top: -5px; left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px; height: 8px;
  background: var(--hud-magenta);
  box-shadow: 0 0 6px var(--hud-magenta);
}

.hud-readout {
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid var(--hud-cyan-dim);
  background: color-mix(in srgb, var(--hud-cyan) 4%, transparent);
  font-family: var(--hud-font-mono);
  font-size: 11px;
}
.readout-row {
  display: grid;
  grid-template-columns: 88px 12px 1fr;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.readout-label { color: var(--hud-cyan); letter-spacing: 0.14em; text-transform: uppercase; }
.readout-value { color: var(--hud-ivory); }
.readout-blink {
  width: 6px; height: 6px;
  background: var(--hud-magenta);
  box-shadow: 0 0 4px var(--hud-magenta);
  animation: blink-live 1s steps(2, end) infinite;
}
.readout-blink[data-state="fallback"] { background: var(--hud-amber); box-shadow: 0 0 4px var(--hud-amber); }
@keyframes blink-live { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.2; } }

/* HUD search input */
.hud-search {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--hud-cyan-dim);
  background: color-mix(in srgb, var(--hud-void) 70%, transparent);
  padding: 6px 10px;
}
.hud-search-icon { color: var(--hud-cyan); font-family: var(--hud-font-mono); }
.hud-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--hud-ivory);
  font-family: var(--hud-font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
}
.hud-search-input::placeholder { color: var(--hud-cyan-dim); letter-spacing: 0.14em; }
.hud-search:focus-within { border-color: var(--hud-cyan); box-shadow: 0 0 6px color-mix(in srgb, var(--hud-cyan) 30%, transparent); }

/* Command rail (vertical button stack on subpages) */
.hud-rail { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }

/* Pagination */
.hud-pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.hud-pager-label { font-family: var(--hud-font-mono); font-size: 11px; letter-spacing: 0.14em; color: var(--hud-cyan); }

/* Pinned target chip */
.hud-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--hud-magenta);
  background: color-mix(in srgb, var(--hud-void) 75%, transparent);
  padding: 6px 10px;
  font-family: var(--hud-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--hud-ivory);
  text-transform: uppercase;
}
.hud-chip-x { color: var(--hud-magenta); cursor: pointer; background: none; border: none; font-family: var(--hud-font-mono); }

@media (prefers-reduced-motion: reduce) {
  .hud-btn::after,
  .hud-list-row::before { transition: none; }
  .hud-panel-anim { animation: none; }
  .readout-blink { animation: none; }
}
```

- [ ] **Step 2: Import it from `src/styles/global.css`**

Add this near the other imports at the very top of `src/styles/global.css` (after any existing `@import`/`@tailwind`/font lines, before the `:root` block):

```css
@import "./hud.css";
```

- [ ] **Step 3: Verify build picks up the stylesheet**

Run: `bun run type-check`
Expected: PASS. Then visually confirm by running `bun run dev` later; no automated assertion here.

- [ ] **Step 4: Commit**

```bash
git add src/styles/hud.css src/styles/global.css
git commit -m "feat(hud): add shared HUD stylesheet"
```

---

## Task 3: Pure HUD list logic (filter + pagination) — TDD

**Files:**
- Create: `src/lib/hud/list.ts`
- Test: `src/lib/hud/__tests__/list.test.ts`

This isolates the only non-trivial logic (search filtering + pagination math) into a pure, fully-tested module reused by `ExploreSystems` and the in-system finder.

- [ ] **Step 1: Write the failing test**

Create `src/lib/hud/__tests__/list.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { matchesQuery, paginate, pageLabel } from "../list";

describe("matchesQuery", () => {
  it("matches case-insensitively across multiple fields", () => {
    expect(matchesQuery("alpha", ["Alpha Centauri", "binary"])).toBe(true);
    expect(matchesQuery("BINARY", ["Alpha Centauri", "binary"])).toBe(true);
  });

  it("ignores empty/whitespace queries (matches everything)", () => {
    expect(matchesQuery("", ["anything"])).toBe(true);
    expect(matchesQuery("   ", ["anything"])).toBe(true);
  });

  it("returns false when no field contains the query", () => {
    expect(matchesQuery("zzz", ["Alpha Centauri", "binary"])).toBe(false);
  });

  it("skips null/undefined fields", () => {
    expect(matchesQuery("alpha", [undefined, null, "Alpha"])).toBe(true);
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it("returns the requested page slice", () => {
    expect(paginate(items, 1, 3).items).toEqual([1, 2, 3]);
    expect(paginate(items, 2, 3).items).toEqual([4, 5, 6]);
    expect(paginate(items, 3, 3).items).toEqual([7]);
  });

  it("computes total pages (ceil)", () => {
    expect(paginate(items, 1, 3).totalPages).toBe(3);
    expect(paginate([], 1, 3).totalPages).toBe(1);
  });

  it("clamps page above range to the last page", () => {
    const r = paginate(items, 99, 3);
    expect(r.page).toBe(3);
    expect(r.items).toEqual([7]);
  });

  it("clamps page below 1 to the first page", () => {
    const r = paginate(items, 0, 3);
    expect(r.page).toBe(1);
    expect(r.items).toEqual([1, 2, 3]);
  });
});

describe("pageLabel", () => {
  it("zero-pads to two digits in NN / NN form", () => {
    expect(pageLabel(2, 4)).toBe("02 / 04");
    expect(pageLabel(10, 12)).toBe("10 / 12");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/lib/hud/__tests__/list.test.ts`
Expected: FAIL — cannot find module `../list`.

- [ ] **Step 3: Implement `src/lib/hud/list.ts`**

```ts
/** Pure helpers for HUD search filtering and client-side pagination. */

/** True if the trimmed query is empty or appears (case-insensitively) in any field. */
export function matchesQuery(
  query: string,
  fields: Array<string | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(q));
}

export interface PageResult<T> {
  items: T[];
  page: number;
  totalPages: number;
}

/** Slice `items` for a 1-based `page`, clamping out-of-range pages into [1, totalPages]. */
export function paginate<T>(items: T[], page: number, perPage: number): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const clamped = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  const start = (clamped - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: clamped, totalPages };
}

/** Formats a "02 / 04" page indicator. */
export function pageLabel(page: number, totalPages: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(page)} / ${pad(totalPages)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/lib/hud/__tests__/list.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hud/list.ts src/lib/hud/__tests__/list.test.ts
git commit -m "feat(hud): add filter + pagination logic with tests"
```

---

## Task 4: `HudButton` component

**Files:**
- Create: `src/components/hud/HudButton.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  /** Bracketed tactical-HUD button. Forwards clicks; styling from shared hud.css. */
  export let bracket = false;        // show leading "<" magenta bracket
  export let ariaLabel: string | undefined = undefined;
  export let ariaPressed: boolean | undefined = undefined;
  export let disabled = false;
  export let type: "button" | "submit" = "button";
</script>

<button
  {type}
  class="hud-btn"
  {disabled}
  aria-label={ariaLabel}
  aria-pressed={ariaPressed}
  on:click
>
  {#if bracket}<span class="hud-btn-bracket">&lt;</span>{/if}<slot />
</button>
```

- [ ] **Step 2: Verify type-check**

Run: `bun run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/HudButton.svelte
git commit -m "feat(hud): add HudButton component"
```

---

## Task 5: `HudPanel` component

**Files:**
- Create: `src/components/hud/HudPanel.svelte`

Wraps `HudFrame` (corner brackets) around the shared `.hud-panel` chrome with an optional title/header.

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import HudFrame from "./HudFrame.svelte";
  /** Framed HUD panel with optional title header + animated entrance. */
  export let title: string | undefined = undefined;
  export let color = "var(--hud-cyan)";
  export let bracketLength = 18;
  export let glow = true;
  export let animate = true;
</script>

<div class:hud-panel-anim={animate}>
  <HudFrame {color} {bracketLength} {glow}>
    <div class="hud-panel">
      {#if title}
        <div class="hud-panel-header">
          <h3 class="hud-panel-title">{title}</h3>
          <span class="hud-panel-tick"></span>
        </div>
      {/if}
      <slot />
    </div>
  </HudFrame>
</div>
```

- [ ] **Step 2: Verify type-check**

Run: `bun run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/HudPanel.svelte
git commit -m "feat(hud): add HudPanel component"
```

---

## Task 6: `HudSearch` component

**Files:**
- Create: `src/components/hud/HudSearch.svelte`

Controlled input bound by the parent; emits `keydown` so parents can wire ↑/↓/Enter/Esc.

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  /** HUD search input. Two-way bind `value`; forwards keydown for keyboard nav. */
  export let value = "";
  export let placeholder = "";
  export let ariaLabel = "Search";
  export let autofocus = false;

  let inputEl: HTMLInputElement;

  // Focus when mounted if requested (used by the toggle-open finder).
  import { onMount } from "svelte";
  onMount(() => {
    if (autofocus && inputEl) inputEl.focus();
  });
</script>

<div class="hud-search">
  <span class="hud-search-icon" aria-hidden="true">&gt;</span>
  <input
    bind:this={inputEl}
    class="hud-search-input"
    type="text"
    {placeholder}
    aria-label={ariaLabel}
    bind:value
    on:keydown
    on:input
  />
</div>
```

- [ ] **Step 2: Verify type-check**

Run: `bun run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/HudSearch.svelte
git commit -m "feat(hud): add HudSearch component"
```

---

## Task 7: Renderer — `worldToScreen` + `getBodyWorldPosition`

**Files:**
- Modify: `src/lib/planetary-system/graphics/SolarSystemRenderer.ts`
- Modify: `src/lib/planetary-system/graphics/types.ts`
- Modify: `src/lib/planetary-system/PlanetarySystemRenderer.ts`

Port the constellation renderer's projection (`ConstellationRenderer.ts:1044-1074`) so the wrapper can place a target-lock reticle on a body each frame.

- [ ] **Step 1: Add methods to `SolarSystemRenderer`**

In `src/lib/planetary-system/graphics/SolarSystemRenderer.ts`, add reusable scratch vectors near the other private fields (top of the class), e.g. after the existing field declarations:

```ts
    // Scratch vectors to avoid per-frame allocations in worldToScreen.
    private _wtsForward = new THREE.Vector3();
    private _wtsRel = new THREE.Vector3();
```

Then add these public methods to the class (e.g. just before `getCameraState()`):

```ts
    /** World-space position of a body's mesh, or null if unknown. */
    public getBodyWorldPosition(bodyId: string): THREE.Vector3 | null {
        const mesh = this.celestialBodyManager.getCelestialBody(bodyId);
        return mesh ? mesh.position.clone() : null;
    }

    /** Project a world point to canvas pixels. `visible:false` if behind camera. */
    public worldToScreen(point: THREE.Vector3): {
        x: number;
        y: number;
        visible: boolean;
    } {
        const canvas = this.renderer.domElement;
        const forward = this._wtsForward;
        this.camera.getWorldDirection(forward);
        const rel = this._wtsRel.copy(point).sub(this.camera.position);
        if (rel.dot(forward) <= 0) return { x: 0, y: 0, visible: false };

        const projected = point.clone().project(this.camera);
        const width = canvas.clientWidth || canvas.width;
        const height = canvas.clientHeight || canvas.height;
        return {
            x: (projected.x * 0.5 + 0.5) * width,
            y: (1 - (projected.y * 0.5 + 0.5)) * height,
            visible: true,
        };
    }
```

Then expose them on the controls object returned by `getControls()` (the object literal around `SolarSystemRenderer.ts:299-318`), adding:

```ts
            getBodyWorldPosition: (bodyId: string) =>
                this.getBodyWorldPosition(bodyId),
            worldToScreen: (point: THREE.Vector3) => this.worldToScreen(point),
```

- [ ] **Step 2: Extend the controls type**

In `src/lib/planetary-system/graphics/types.ts`, add to the `SolarSystemControls` interface (alongside `focusOnPlanet`):

```ts
    getBodyWorldPosition: (bodyId: string) => import("three").Vector3 | null;
    worldToScreen: (point: import("three").Vector3) => {
        x: number;
        y: number;
        visible: boolean;
    };
```

- [ ] **Step 3: Surface on `PlanetarySystemRenderer`**

In `src/lib/planetary-system/PlanetarySystemRenderer.ts`, add these public methods (e.g. after `focusOnBody`):

```ts
    getBodyWorldPosition(bodyId: string) {
        return this.solarSystemRenderer?.getControls()?.getBodyWorldPosition(bodyId) ?? null;
    }

    worldToScreen(point: import("three").Vector3) {
        return (
            this.solarSystemRenderer?.getControls()?.worldToScreen(point) ?? {
                x: 0,
                y: 0,
                visible: false,
            }
        );
    }
```

- [ ] **Step 4: Verify type-check + existing renderer tests**

Run: `bun run type-check`
Expected: PASS.

Run: `bunx vitest run src/lib/planetary-system`
Expected: PASS (existing renderer tests still green; Three.js is mocked).

- [ ] **Step 5: Commit**

```bash
git add src/lib/planetary-system/graphics/SolarSystemRenderer.ts src/lib/planetary-system/graphics/types.ts src/lib/planetary-system/PlanetarySystemRenderer.ts
git commit -m "feat(planetary): add worldToScreen + getBodyWorldPosition"
```

---

## Task 8: `ExploreSystems` component (search + pagination)

**Files:**
- Create: `src/components/ExploreSystems.svelte`

Replaces the inline modal in `MainMenu` and `SystemSelector.svelte`. Uses the registry shape already used by MainMenu: `planetarySystemRegistry.getAllSystems()` → items with `.id`, `.name`, `.description`, `.systemData.systemType`, `.systemData.metadata?.distance`, `.systemData.celestialBodies`.

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { planetarySystemRegistry } from "../lib/planetary-system";
  import { matchesQuery, paginate, pageLabel } from "../lib/hud/list";
  import HudPanel from "./hud/HudPanel.svelte";
  import HudButton from "./hud/HudButton.svelte";
  import HudSearch from "./hud/HudSearch.svelte";
  import GlitchText from "./hud/GlitchText.svelte";

  export let t: (key: string) => string;
  export let currentSystemId: string | null = null;
  export let onSelect: (systemId: string) => void = () => {};
  export let onClose: () => void = () => {};

  const PER_PAGE = 6;
  const allSystems = planetarySystemRegistry.getAllSystems();

  let query = "";
  let page = 1;

  // Reset to page 1 whenever the query changes.
  $: query, (page = 1);

  $: filtered = allSystems.filter((s) =>
    matchesQuery(query, [
      s.name,
      s.systemData?.systemType,
      s.systemData?.metadata?.distance,
      s.systemData?.metadata?.constellation,
    ]),
  );
  $: pageResult = paginate(filtered, page, PER_PAGE);
  $: page = pageResult.page; // keep clamped value in sync

  function bodyCount(s: (typeof allSystems)[number]): number {
    return s.systemData?.celestialBodies?.length ?? 0;
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
  <div class="w-full max-w-4xl">
    <HudPanel title={t("explore.title")}>
      <div class="mb-4 flex items-center gap-3">
        <div class="flex-1">
          <HudSearch bind:value={query} placeholder={t("explore.searchPlaceholder")} ariaLabel={t("explore.searchPlaceholder")} />
        </div>
        <HudButton bracket ariaLabel={t("finder.close")} on:click={onClose}>{t("finder.close")}</HudButton>
      </div>

      {#if pageResult.items.length === 0}
        <div class="hud-section-label" style="text-align:center; padding:2rem 0;">{t("explore.empty")}</div>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each pageResult.items as system (system.id)}
            <div class="hud-readout" style="margin-bottom:0;">
              <h4 class="hud-panel-title" style="font-size:13px;">
                <GlitchText text={system.name.toUpperCase()} />
              </h4>
              <div class="readout-row"><span class="readout-label">{t("explore.bodies")}</span><span></span><span class="readout-value">{bodyCount(system)}</span></div>
              {#if system.systemData?.metadata?.distance}
                <div class="readout-row"><span class="readout-label">{t("explore.distance")}</span><span></span><span class="readout-value">{system.systemData.metadata.distance}</span></div>
              {/if}
              <div style="margin-top:10px;">
                {#if system.id === currentSystemId}
                  <HudButton disabled>{t("explore.current")}</HudButton>
                {:else}
                  <HudButton bracket on:click={() => onSelect(system.id)}>{t("explore.action")}</HudButton>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        {#if pageResult.totalPages > 1}
          <div class="hud-pager">
            <HudButton ariaLabel={t("explore.prev")} disabled={page <= 1} on:click={() => (page = page - 1)}>{t("explore.prev")}</HudButton>
            <span class="hud-pager-label">{pageLabel(page, pageResult.totalPages)}</span>
            <HudButton ariaLabel={t("explore.next")} disabled={page >= pageResult.totalPages} on:click={() => (page = page + 1)}>{t("explore.next")}</HudButton>
          </div>
        {/if}
      {/if}
    </HudPanel>
  </div>
</div>
```

- [ ] **Step 2: Verify type-check**

Run: `bun run type-check`
Expected: PASS. If the registry item type lacks `systemData.metadata`, use optional chaining as written (already guarded).

- [ ] **Step 3: Commit**

```bash
git add src/components/ExploreSystems.svelte
git commit -m "feat(explore): add HUD system browser with search + pagination"
```

---

## Task 9: Wire `ExploreSystems` into `MainMenu`, remove old selector

**Files:**
- Modify: `src/components/MainMenu.svelte`
- Remove: `src/components/SystemSelector.svelte`, `src/components/__tests__/SystemSelector.test.ts`

- [ ] **Step 1: Replace the inline modal in `MainMenu.svelte`**

Add the import near the other component imports (top `<script>`):

```ts
  import ExploreSystems from "./ExploreSystems.svelte";
```

Replace the entire inline `{#if showSystemSelector} … {/if}` block (currently `MainMenu.svelte:306-356`) with:

```svelte
  {#if showSystemSelector}
    <ExploreSystems
      {t}
      onSelect={handleSelectSystem}
      onClose={handleCloseSystemSelector}
    />
  {/if}
```

- [ ] **Step 2: Remove the superseded selector and its test**

```bash
git rm src/components/SystemSelector.svelte src/components/__tests__/SystemSelector.test.ts
```

- [ ] **Step 3: Confirm nothing else imports `SystemSelector`**

Run: `grep -rn "SystemSelector" src --include="*.svelte" --include="*.ts" --include="*.astro"`
Expected: no remaining references (output empty).

- [ ] **Step 4: Verify type-check + unit tests**

Run: `bun run type-check && bunx vitest run src/components/__tests__/MainMenu.test.ts`
Expected: PASS. If MainMenu.test asserts on old modal markup, update those assertions to expect the menu button only (the modal is now a separate component rendered on demand).

- [ ] **Step 5: Commit**

```bash
git add src/components/MainMenu.svelte
git commit -m "feat(explore): use ExploreSystems in MainMenu, remove SystemSelector"
```

---

## Task 10: Planetary view — HUD restyle of panels + command rail

**Files:**
- Modify: `src/components/PlanetarySystemWrapper.svelte`

Replace the plain black panels (`PlanetarySystemWrapper.svelte:264-302` + the `<style>` for `.system-info-panel`, `.controls-panel`, `.back-button`, `.zoom-controls`) with HUD equivalents. Logic/handlers unchanged.

- [ ] **Step 1: Add HUD imports**

In the `<script>` block add:

```ts
  import HudPanel from './hud/HudPanel.svelte';
  import HudButton from './hud/HudButton.svelte';
```

- [ ] **Step 2: Replace the info + controls markup**

Replace the `<!-- System Info Panel -->` and `<!-- Navigation Controls -->` blocks (the two `<div class="system-info-panel">` and `<div class="controls-panel">` sections) with:

```svelte
    <!-- System readout (top-left) -->
    <div class="hud-info">
      <HudPanel title={t ? (t(`systems.${systemId}.name`) || planetarySystemRegistry.getSystem(systemId)?.name || t('systems.unknown')) : 'Unknown System'}>
        <p class="hud-details-desc" style="margin:0;">
          {t ? (t(`systems.${systemId}.description`) || planetarySystemRegistry.getSystem(systemId)?.description || '') : ''}
        </p>
      </HudPanel>
    </div>

    <!-- Command rail (top-right) -->
    <div class="hud-controls hud-rail">
      <HudButton bracket on:click={handleBackToMenu}>{t ? t('controls.backToMenu') : 'Back to Menu'}</HudButton>
      <HudButton ariaLabel={t ? t('finder.open') : 'Jump to body'} on:click={() => (showFinder = true)}>{t ? t('finder.title') : 'Jump To'}</HudButton>
      {#if zoomControls}
        <HudButton on:click={zoomControls.zoomIn}>{t ? t('controls.zoomIn') : 'Zoom In'}</HudButton>
        <HudButton on:click={zoomControls.zoomOut}>{t ? t('controls.zoomOut') : 'Zoom Out'}</HudButton>
        <HudButton on:click={zoomControls.resetView}>{t ? t('controls.resetView') : 'Reset View'}</HudButton>
      {/if}
      {#if hasBarycenterOverlay}
        <HudButton ariaPressed={showBarycenterOverlay} on:click={toggleBarycenterOverlay}>
          {showBarycenterOverlay
            ? (t ? t('controls.hideBarycenters') : 'Hide barycenters')
            : (t ? t('controls.showBarycenters') : 'Show barycenters')}
        </HudButton>
      {/if}
      {#if isSceneReady}
        <OrbitSpeedControl {lang} {translations} />
      {/if}
    </div>
```

- [ ] **Step 3: Declare the finder flag**

Add to the `<script>` state declarations (near `let currentZoom = 50;`):

```ts
  let showFinder = false;
```

(The finder panel itself is added in Task 11; this flag + its button are wired here.)

- [ ] **Step 4: Replace the obsolete panel styles**

In the `<style>` block, delete the `.system-info-panel`, `.controls-panel`, `.back-button`, `.zoom-controls` rules and replace with:

```css
  .hud-info {
    position: absolute;
    top: 20px;
    left: 20px;
    max-width: 320px;
    z-index: 10;
  }
  .hud-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10;
  }
```

- [ ] **Step 5: Verify type-check**

Run: `bun run type-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PlanetarySystemWrapper.svelte
git commit -m "feat(planetary): HUD restyle of info panel + command rail"
```

---

## Task 11: Planetary view — in-system finder + pin (fly + target lock)

**Files:**
- Modify: `src/components/PlanetarySystemWrapper.svelte`

Toggle-open finder (`/` to open, `Esc` to close), filtered body list, and a per-frame target-lock reticle on the pinned body.

- [ ] **Step 1: Add imports + state**

In the `<script>` block add imports:

```ts
  import HudSearch from './hud/HudSearch.svelte';
  import TargetLockOverlay from './hud/TargetLockOverlay.svelte';
  import { matchesQuery } from '../lib/hud/list';
  import { Vector3 } from 'three';
```

Add state (near `let showFinder = false;`):

```ts
  let finderQuery = "";
  let pinnedBodyId: string | null = null;
  let pinnedName = "";
  let lockPos: { x: number; y: number; visible: boolean } | null = null;
  let lockRafId = 0;
```

- [ ] **Step 2: Build the body list + filter**

Add these reactive/helper declarations in the `<script>`:

```ts
  // All selectable bodies in the active system (star + planets + moons present in data).
  $: allBodies = (() => {
    const data = planetarySystemRenderer?.getSystemData();
    if (!data) return [] as CelestialBodyData[];
    return [data.star, ...data.celestialBodies];
  })();

  $: finderResults = allBodies.filter((b) =>
    matchesQuery(finderQuery, [b.name, b.type]),
  );

  const bodyTypeKey = (type: string) =>
    type === "star" ? "type.star" : type === "moon" ? "type.moon" : "type.planet";
```

- [ ] **Step 3: Add the pin loop + select handler**

Add these functions in the `<script>`:

```ts
  function startLockLoop() {
    cancelAnimationFrame(lockRafId);
    const tick = () => {
      if (!pinnedBodyId || !planetarySystemRenderer) {
        lockPos = null;
        return;
      }
      const world = planetarySystemRenderer.getBodyWorldPosition(pinnedBodyId);
      lockPos = world ? planetarySystemRenderer.worldToScreen(world as Vector3) : null;
      lockRafId = requestAnimationFrame(tick);
    };
    lockRafId = requestAnimationFrame(tick);
  }

  function pinBody(body: CelestialBodyData) {
    if (!planetarySystemRenderer) return;
    pinnedBodyId = body.id;
    pinnedName = body.name;
    planetarySystemRenderer.focusOnBody(body.id);
    showFinder = false;
    finderQuery = "";
    startLockLoop();
  }

  function unpin() {
    pinnedBodyId = null;
    pinnedName = "";
    cancelAnimationFrame(lockRafId);
    lockPos = null;
  }

  function handleFinderHotkeys(event: KeyboardEvent) {
    if (event.key === "/" && !showFinder) {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      showFinder = true;
    } else if (event.key === "Escape" && showFinder) {
      showFinder = false;
    }
  }
```

- [ ] **Step 4: Register/cleanup the hotkey + raf**

Update the existing `<svelte:window>` (currently `on:resize={handleResize}`) to also handle keydown:

```svelte
<svelte:window on:resize={handleResize} on:keydown={handleFinderHotkeys} />
```

In the existing `onDestroy` (around `PlanetarySystemWrapper.svelte:230`), add before/after the renderer cleanup:

```ts
    cancelAnimationFrame(lockRafId);
```

- [ ] **Step 5: Add the finder panel + reticle markup**

Inside the `{#if isSceneReady}` block (after the command rail), add:

```svelte
    <!-- JUMP TO finder (toggle-open) -->
    {#if showFinder}
      <div class="hud-finder">
        <HudPanel title={t ? t('finder.title') : 'Jump To'}>
          <HudSearch
            bind:value={finderQuery}
            autofocus={true}
            placeholder={t ? t('finder.placeholder') : 'Search bodies…'}
            ariaLabel={t ? t('finder.placeholder') : 'Search bodies…'}
            on:keydown={(e) => { if (e.key === 'Enter' && finderResults[0]) pinBody(finderResults[0]); }}
          />
          {#if finderResults.length === 0}
            <div class="hud-section-label" style="text-align:center; padding:1rem 0;">{t ? t('finder.empty') : 'No bodies match query'}</div>
          {:else}
            <div class="hud-list" style="margin-top:8px;">
              {#each finderResults as body (body.id)}
                <button
                  type="button"
                  class="hud-list-row"
                  class:is-selected={body.id === pinnedBodyId}
                  on:click={() => pinBody(body)}
                >
                  <span class="row-abbr">[{t ? t(bodyTypeKey(body.type)) : body.type}]</span>
                  <span class="row-name">{body.name}</span>
                  <span class="row-leader"></span>
                  <span class="row-count"></span>
                </button>
              {/each}
            </div>
          {/if}
        </HudPanel>
      </div>
    {/if}

    <!-- Pinned chip -->
    {#if pinnedBodyId}
      <div class="hud-pinned">
        <span class="hud-chip">
          {t ? t('finder.pinned') : 'Pinned'}: {pinnedName}
          <button class="hud-chip-x" aria-label={t ? t('finder.unpin') : 'Unpin'} on:click={unpin}>✕</button>
        </span>
      </div>
    {/if}

    <!-- Target-lock reticle overlay -->
    {#if pinnedBodyId && lockPos && lockPos.visible}
      <div class="hud-lock-layer" aria-hidden="true">
        <TargetLockOverlay visible={true} x={lockPos.x} y={lockPos.y} name={pinnedName} />
      </div>
    {/if}
```

- [ ] **Step 6: Add finder/overlay styles**

In the `<style>` block add:

```css
  .hud-finder {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: min(420px, 90vw);
    z-index: 20;
  }
  .hud-pinned {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 20;
  }
  .hud-lock-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 15;
  }
```

- [ ] **Step 7: Verify type-check + planetary tests**

Run: `bun run type-check && bunx vitest run src/lib/planetary-system`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/PlanetarySystemWrapper.svelte
git commit -m "feat(planetary): toggle-open JUMP TO finder with camera fly + target lock"
```

---

## Task 12: Constellation — switch to shared HUD classes

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

The shared `hud.css` now defines the same classes. Remove the duplicated scoped rules so there is a single source of truth. Markup is unchanged.

- [ ] **Step 1: Delete duplicated scoped CSS**

In `src/components/ConstellationWrapper.svelte`, delete the scoped rules now living in `hud.css`: `.hud-btn`, `.hud-btn::after`, `.hud-btn:hover::after`, `.hud-btn-bracket`, `.hud-panel*`, `.hud-section-label`, `.hud-list*`, `.row-*`, `.hud-divider*`, `.hud-readout`, `.readout-*`, `blink-live`, `hud-panel-in`, and their `@media (prefers-reduced-motion)` duplicates (the block spanning roughly `:774-1010`).

Keep constellation-only rules that are NOT in `hud.css`: `.hud-details*`, `.hud-month-strip`, `.month-cell*`, `.hud-drag-card`, `.hud-drag-prefix`, `.constellation-*`, `.hud-layer`, and `.sr-only` (leave `.sr-only` as-is).

- [ ] **Step 2: Verify nothing visually depends on removed scoping**

Run: `grep -n "hud-btn\|hud-panel\|hud-readout\|hud-list" src/components/ConstellationWrapper.svelte`
Expected: class usages in markup remain; only the duplicated style rules are gone.

- [ ] **Step 3: Verify type-check + constellation tests**

Run: `bun run type-check && bunx vitest run src/components/__tests__ src/lib/constellation`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "refactor(constellation): use shared HUD classes"
```

---

## Task 13: Galaxy — HUD restyle (presentation only)

**Files:**
- Modify: `src/components/GalaxyWrapper.svelte`

Restyle the back/controls buttons and panels into the HUD language. Do NOT change handlers, state, or the renderer wiring — presentation only.

- [ ] **Step 1: Import HUD components**

In the `<script>` add:

```ts
  import HudButton from "./hud/HudButton.svelte";
  import HudPanel from "./hud/HudPanel.svelte";
```

- [ ] **Step 2: Convert the back + controls buttons**

Replace the existing `<button class="back-button" …>` and `<button class="controls-button" …>` elements (around `GalaxyWrapper.svelte:278-287`) with `HudButton`, preserving their `on:click` handlers and labels. Example for the back button:

```svelte
        <div class="galaxy-back">
          <HudButton bracket on:click={handleBackToMenu}>{t('controls.backToMenu')}</HudButton>
        </div>
```

Wrap the controls toggle similarly with `HudButton` (keep `on:click={toggleControls}` and its `aria-label`).

- [ ] **Step 3: Convert the controls panel + system tooltip chrome**

Wrap the existing controls panel content (`<div class="controls-panel"> … </div>`) and the `system-info-tooltip` body in `HudPanel` with an appropriate `title` (use existing `t('galaxy.controlsTitle')` for the controls panel; use `selectedSystemData.name` for the tooltip). Keep all inner controls, sliders, and handlers unchanged — only the outer container becomes `HudPanel`.

- [ ] **Step 4: Trim now-redundant background/border styles**

In `<style>`, remove the `background`/`border`/`border-radius` declarations from `.back-button`, `.controls-button`, `.controls-panel`, `.system-info-tooltip` that are now provided by the HUD chrome. Keep positioning rules (`position`, `top/left/right`, `z-index`, `width`).

- [ ] **Step 5: Verify type-check + galaxy tests**

Run: `bun run type-check && bunx vitest run src/components`
Expected: PASS. Update any galaxy test asserting on removed class names if present.

- [ ] **Step 6: Commit**

```bash
git add src/components/GalaxyWrapper.svelte
git commit -m "feat(galaxy): HUD restyle of controls and panels"
```

---

## Task 14: Terrain — HUD restyle (presentation only)

**Files:**
- Modify: `src/components/TerrainExplorer.svelte`

- [ ] **Step 1: Import HUD components**

```ts
  import HudButton from "./hud/HudButton.svelte";
  import HudPanel from "./hud/HudPanel.svelte";
```

- [ ] **Step 2: Convert the back button**

Replace the terrain back button element with:

```svelte
  <div class="terrain-back">
    <HudButton bracket on:click={handleBackToSolarSystem}>{t('controls.backToSolarSystemLabel')}</HudButton>
  </div>
```

(Use the existing back handler name in this file; if it differs, keep that handler.)

- [ ] **Step 3: Convert the info overlay**

Wrap the terrain info/details overlay content in `HudPanel` with the planet name as `title`. Keep all inner text/handlers; only the container chrome changes.

- [ ] **Step 4: Trim redundant chrome styles**

In `<style>`, remove `background`/`border`/`border-radius` from the converted elements; keep positioning rules.

- [ ] **Step 5: Verify type-check + terrain tests**

Run: `bun run type-check && bunx vitest run src/components/__tests__/TerrainExplorer.test.ts`
Expected: PASS. Update assertions referencing removed classes if needed.

- [ ] **Step 6: Commit**

```bash
git add src/components/TerrainExplorer.svelte
git commit -m "feat(terrain): HUD restyle of back button + info overlay"
```

---

## Task 15: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `bun run lint`
Expected: PASS (no errors). Fix any a11y/import issues surfaced.

- [ ] **Step 2: Type-check**

Run: `bun run type-check`
Expected: PASS.

- [ ] **Step 3: Unit tests + coverage gate**

Run: `bun run test:run`
Expected: PASS, coverage ≥ 70% thresholds hold.

- [ ] **Step 4: Production build**

Run: `bun run build`
Expected: build succeeds (Vercel adapter output produced).

- [ ] **Step 5: Manual smoke (dev server)**

Run: `bun run dev` and verify in browser at http://localhost:3600/:
- Explore modal: search filters systems, pagination prev/next + `NN / NN` indicator work, empty-state shows on no match.
- Planetary view: HUD info panel + command rail render; `/` opens the JUMP TO finder, `Esc` closes; selecting a body flies the camera and shows the target-lock reticle + pinned chip; unpin clears it.
- Galaxy, Terrain, Constellation: HUD chrome renders consistently; existing controls still function.

- [ ] **Step 6: Final commit (if any fixups)**

```bash
git add -A
git commit -m "chore: HUD redesign verification fixups"
```

---

## Self-Review Notes

- **Spec coverage:** Feature 1 (HUD on all subpages) → Tasks 2, 10, 12, 13, 14. Feature 2 (Explore search+pagination) → Tasks 3, 8, 9. Feature 3 (in-system finder+pin) → Tasks 7, 11. Shared components → Tasks 4, 5, 6. i18n → Task 1. Testing → Tasks 3 (logic), 15 (suite).
- **Type consistency:** `matchesQuery`, `paginate`, `pageLabel` signatures defined in Task 3 are used unchanged in Tasks 8 and 11. `worldToScreen`/`getBodyWorldPosition` defined in Task 7 are consumed in Task 11. `showFinder` declared in Task 10, used in Task 11.
- **Moons:** the finder enumerates `[star, ...celestialBodies]` (matching existing `onKeyboardNavigate` behavior at `PlanetarySystemWrapper.svelte:109`); any `type:"moon"` entries present in `celestialBodies` group under "Moons" via `bodyTypeKey`.
- **Presentation-only constraint** for Galaxy/Terrain is explicit in Tasks 13–14 to protect those large files from logic regressions.
