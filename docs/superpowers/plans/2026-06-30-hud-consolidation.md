# HUD Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three divergent per-view HUD layouts with one shared, consistent HUD chrome (back button, persistent Star/Galaxy/Constellation view-switcher, unified settings panel with language) and refactor the Galaxy view onto the tactical-HUD kit.

**Architecture:** A new `ViewHud.svelte` shell owns the fixed chrome (identical on all three views) and exposes Svelte 4 legacy **named slots** (`<slot name="controls|info|overlay|settings|bottomLeading|bottomTrailing">`) — the codebase uses Svelte 4 conventions everywhere (`export let`, `on:click`, `createEventDispatcher`, `$:`; zero runes/snippets). Each of the three wrappers mounts `ViewHud` and fills only its view-specific slots. Navigation stays full-page via `routes.*` + `window.location.href` (no client router, no view store). The page-level `GlobalLanguageSelector` overlay is removed from the three view pages; language choice moves inside the unified `SettingsPanel`.

**Tech Stack:** Astro 5, Svelte 4-legacy API on Svelte ^5.36, Three.js, Tailwind 4, Vitest (jsdom + `src/test/setup.ts` three mock), Playwright (Chromium). i18n = flat dotted keys in `src/i18n/{en,zh,ja}.ts` (`en.ts` drives the `UiKey` type).

## Global Constraints

- **Svelte syntax:** Svelte 4 legacy only — `export let`, `<slot name="...">`, `on:click`, `createEventDispatcher`, `$:`. Do NOT use runes (`$props`, `$state`), `{@render}`, or `Snippet<>` — there are zero occurrences in the codebase.
- **Hydration:** wrappers use `client:only="svelte"` (CLAUDE.md gotcha #3). The new `ViewHud`/`ViewSwitcher`/`SettingsPanel` are rendered inside the wrappers, so they inherit `client:only`.
- **Shadows:** never enable (`renderer.shadowMap.enabled = false`, etc.) — not relevant here, but keep if touching renderers.
- **i18n:** add new keys to `src/i18n/en.ts` FIRST (drives typing), then mirror verbatim key set in `zh.ts` + `ja.ts`. A sync test (`src/i18n/__tests__/systemI18nSync.test.ts`) may enforce parity — run it.
- **Navigation:** `window.location.href = routes.<view>(currentLang)`; locale from `getLangFromUrl(new URL(window.location.href))`.
- **Verify after every task:** `bun run lint && bun run type-check` (must pass). Tests via `bun run test:run`. Build via `bun run build`.
- **No emojis in code** unless matching existing copy.

---

## File Structure

**New files:**
- `src/lib/view/currentView.ts` — pure util `getCurrentView(pathname): ViewId | null` (unit-tested).
- `src/lib/view/__tests__/currentView.test.ts`
- `src/components/hud/ViewSwitcher.svelte` — persistent Star · Galaxy · Constellation switcher.
- `src/components/hud/SettingsPanel.svelte` — unified settings (language + per-view `<slot name="settings">`).
- `src/components/hud/ViewHud.svelte` — shared chrome shell with named slots.

**Modified files:**
- `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/ja.ts` — new keys.
- `src/components/PlanetarySystemWrapper.svelte` — adopt `ViewHud`; move barycenter + orbit-speed into settings slot.
- `src/components/ConstellationWrapper.svelte` — adopt `ViewHud`; render side panel via slots.
- `src/components/GalaxyWrapper.svelte` — adopt `ViewHud` + tactical kit; delete legacy CSS; collapse tooltip+dialog to one dialog.
- `src/pages/galaxy.astro`, `src/pages/constellation.astro`, `src/pages/planetary/[systemId].astro` — remove `<GlobalLanguageSelector>`.

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/ja.ts`

**Interfaces:**
- Produces: keys `viewSwitcher.*`, `galaxy.solMarkerLabel`/`galaxy.distanceLines` (used by Plan 2 too — added here so the type exists), `constellation.viewFromEarth`/`constellation.compass`, `settings.language`.

- [ ] **Step 1: Add keys to `src/i18n/en.ts`**

Insert this block immediately after the `"controls.resetTitle"`/`"controls.showBarycenters"` group (after the existing `// Controls` section):

```ts
    // View switcher (shared HUD)
    "viewSwitcher.label": "VIEW",
    "viewSwitcher.star": "Star",
    "viewSwitcher.galaxy": "Galaxy",
    "viewSwitcher.constellation": "Constellation",
    "settings.language": "Language",

    // Galaxy position indicator (used by Plan 2)
    "galaxy.solMarkerLabel": "SOL · YOU ARE HERE",
    "galaxy.distanceLines": "Distance Lines",

    // Constellation orientation indicator (used by Plan 2)
    "constellation.viewFromEarth": "View from Earth",
    "constellation.compass": "FACING",
```

- [ ] **Step 2: Mirror in `src/i18n/zh.ts`** (same keys, same order, after the Controls section):

```ts
    "viewSwitcher.label": "视图",
    "viewSwitcher.star": "恒星",
    "viewSwitcher.galaxy": "星系",
    "viewSwitcher.constellation": "星座",
    "settings.language": "语言",
    "galaxy.solMarkerLabel": "太阳系 · 你在这里",
    "galaxy.distanceLines": "距离线",
    "constellation.viewFromEarth": "从地球观看",
    "constellation.compass": "朝向",
```

- [ ] **Step 3: Mirror in `src/i18n/ja.ts`**:

```ts
    "viewSwitcher.label": "表示",
    "viewSwitcher.star": "恒星",
    "viewSwitcher.galaxy": "銀河",
    "viewSwitcher.constellation": "星座",
    "settings.language": "言語",
    "galaxy.solMarkerLabel": "太陽系 · 現在地",
    "galaxy.distanceLines": "距離線",
    "constellation.viewFromEarth": "地球からの眺望",
    "constellation.compass": "方位",
```

- [ ] **Step 4: Verify the i18n sync test + type-check**

Run: `bunx vitest run src/i18n`
Expected: PASS (sync parity holds). If it fails, fix the missing/extra key in zh/ja.

Run: `bun run type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/zh.ts src/i18n/ja.ts
git commit -m "feat(i18n): add view-switcher and position-indicator keys"
```

---

### Task 2: `getCurrentView` pure util (TDD)

**Files:**
- Create: `src/lib/view/currentView.ts`
- Test: `src/lib/view/__tests__/currentView.test.ts`

**Interfaces:**
- Consumes: `stripLocaleFromPath(pathname)` from `@/i18n/routes`.
- Produces: `export type ViewId = "star" | "galaxy" | "constellation";` and `export function getCurrentView(pathname: string): ViewId | null`.

- [ ] **Step 1: Write the failing test**

`src/lib/view/__tests__/currentView.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getCurrentView } from "../currentView";

describe("getCurrentView", () => {
    it("detects galaxy from unlocalized path", () => {
        expect(getCurrentView("/galaxy")).toBe("galaxy");
    });

    it("detects galaxy from localized path", () => {
        expect(getCurrentView("/zh/galaxy")).toBe("galaxy");
    });

    it("detects constellation", () => {
        expect(getCurrentView("/constellation")).toBe("constellation");
        expect(getCurrentView("/ja/constellation")).toBe("constellation");
    });

    it("detects star (planetary) view", () => {
        expect(getCurrentView("/planetary/solar")).toBe("star");
        expect(getCurrentView("/zh/planetary/trappist-1")).toBe("star");
    });

    it("returns null for home / unknown", () => {
        expect(getCurrentView("/")).toBeNull();
        expect(getCurrentView("/zh/")).toBeNull();
        expect(getCurrentView("/unknown")).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/lib/view/__tests__/currentView.test.ts`
Expected: FAIL — module `../currentView` not found.

- [ ] **Step 3: Implement**

`src/lib/view/currentView.ts`:

```ts
import { stripLocaleFromPath } from "@/i18n/routes";

export type ViewId = "star" | "galaxy" | "constellation";

export function getCurrentView(pathname: string): ViewId | null {
    const p = stripLocaleFromPath(pathname || "/");
    if (p.startsWith("/galaxy")) return "galaxy";
    if (p.startsWith("/constellation")) return "constellation";
    if (p.startsWith("/planetary")) return "star";
    return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/lib/view/__tests__/currentView.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/view/currentView.ts src/lib/view/__tests__/currentView.test.ts
git commit -m "feat(view): add getCurrentView pathname util"
```

---

### Task 3: `ViewSwitcher.svelte`

**Files:**
- Create: `src/components/hud/ViewSwitcher.svelte`

**Interfaces:**
- Consumes: `getCurrentView` from `@/lib/view/currentView`; `routes` from `@/i18n/routes`; `getLangFromUrl`, `useTranslations` from `@/i18n/utils`; `ViewId` type.
- Produces: a presentational component (props: `currentView: ViewId`, `lang: AppLocale`, `translations: Record<string,string>`). Clicking a non-current tab navigates via `window.location.href = routes.<view>(lang)`.

- [ ] **Step 1: Implement the component**

`src/components/hud/ViewSwitcher.svelte`:

```svelte
<script lang="ts">
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";
  import HudFrame from "./HudFrame.svelte";

  export let currentView: ViewId;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  let t = translations && Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  const tabs: { view: ViewId; key: string; go: () => void }[] = [
    { view: "star", key: "viewSwitcher.star", go: () => { window.location.href = routes.planetarySystem("solar", lang); } },
    { view: "galaxy", key: "viewSwitcher.galaxy", go: () => { window.location.href = routes.galaxy(lang); } },
    { view: "constellation", key: "viewSwitcher.constellation", go: () => { window.location.href = routes.constellation(lang); } },
  ];
</script>

<div class="view-switcher" role="tablist" aria-label={t("viewSwitcher.label")}>
  <span class="vs-label">{t("viewSwitcher.label")}</span>
  {#each tabs as tab (tab.view)}
    <button
      type="button"
      role="tab"
      aria-selected={currentView === tab.view}
      class="vs-tab"
      class:is-active={currentView === tab.view}
      disabled={currentView === tab.view}
      on:click={tab.go}
    >
      {t(tab.key)}
    </button>
  {/each}
</div>

<style>
  .view-switcher {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(0, 0, 17, 0.6);
    border: 1px solid var(--hud-cyan, #00f0ff);
    border-radius: 6px;
    backdrop-filter: blur(8px);
  }
  .vs-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--hud-cyan, #00f0ff);
    opacity: 0.7;
    margin-right: 4px;
  }
  .vs-tab {
    background: transparent;
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .vs-tab:hover:not(:disabled) {
    color: var(--hud-cyan, #00f0ff);
    border-color: var(--hud-cyan, #00f0ff);
  }
  .vs-tab.is-active {
    color: #001011;
    background: var(--hud-cyan, #00f0ff);
    border-color: var(--hud-cyan, #00f0ff);
    cursor: default;
  }
</style>
```

- [ ] **Step 2: Verify type-check + lint**

Run: `bun run type-check && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/ViewSwitcher.svelte
git commit -m "feat(hud): add ViewSwitcher component"
```

---

### Task 4: `SettingsPanel.svelte` (unified, with language)

**Files:**
- Create: `src/components/hud/SettingsPanel.svelte`

**Interfaces:**
- Consumes: `languages` from `@/i18n/ui`; `switchLocalePath`, `type AppLocale` from `@/i18n/routes`; `getLangFromUrl`, `useTranslations` from `@/i18n/utils`.
- Produces: props `isOpen: boolean`, `lang: AppLocale`, `translations: Record<string,string>`; a `<slot name="settings" />` for per-view toggles; dispatches `close`. Language change navigates via `switchLocalePath`.

- [ ] **Step 1: Implement the component**

`src/components/hud/SettingsPanel.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { languages } from "@/i18n/ui";
  import type { AppLocale } from "@/i18n/routes";
  import { switchLocalePath } from "@/i18n/routes";
  import { getLangFromUrl, useTranslations } from "@/i18n/utils";
  import HudPanel from "./HudPanel.svelte";

  export let isOpen = false;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  const dispatch = createEventDispatcher<{ close: void }>();

  let t = translations && Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  let currentLang: AppLocale = lang;
  if (typeof window !== "undefined") {
    try {
      currentLang = getLangFromUrl(new URL(window.location.href));
    } catch { /* keep prop fallback */ }
  }

  function changeLanguage(newLang: AppLocale) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    window.location.href = `${switchLocalePath(url.pathname, newLang)}${url.search}${url.hash}`;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div
    class="settings-overlay"
    on:click={(e) => { if (e.target === e.currentTarget) dispatch("close"); }}
    role="dialog"
    aria-modal="true"
    aria-label={t("settings.title")}
  >
    <div class="settings-panel">
      <HudPanel title={t("settings.title")} color="var(--hud-cyan)">
        <div class="settings-body">
          <section class="settings-section">
            <h4 class="settings-heading">{t("settings.language")}</h4>
            <div class="lang-row">
              {#each Object.entries(languages) as [code, name] (code)}
                <button
                  type="button"
                  class="lang-btn"
                  class:is-active={currentLang === code}
                  aria-pressed={currentLang === code}
                  on:click={() => changeLanguage(code as AppLocale)}
                >
                  {name}
                </button>
              {/each}
            </div>
          </section>

          <section class="settings-section">
            <!-- per-view toggles injected by parent via slot -->
            <slot name="settings" />
          </section>

          <div class="settings-actions">
            <button type="button" class="close-btn" on:click={() => dispatch("close")}>
              {t("action.close")}
            </button>
          </div>
        </div>
      </HudPanel>
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 70px 20px 20px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }
  .settings-panel { width: min(320px, 90vw); }
  .settings-body { display: flex; flex-direction: column; gap: 14px; }
  .settings-section { display: flex; flex-direction: column; gap: 8px; }
  .settings-heading {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.2em;
    color: var(--hud-cyan, #00f0ff);
    text-transform: uppercase;
  }
  .lang-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .lang-btn {
    flex: 1;
    background: transparent;
    border: 1px solid rgba(0, 240, 255, 0.4);
    color: rgba(255, 255, 255, 0.8);
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  .lang-btn.is-active {
    background: var(--hud-cyan, #00f0ff);
    color: #001011;
    border-color: var(--hud-cyan, #00f0ff);
  }
  .settings-actions { display: flex; justify-content: flex-end; }
  .close-btn {
    background: transparent;
    border: 1px solid var(--hud-cyan, #00f0ff);
    color: var(--hud-cyan, #00f0ff);
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    letter-spacing: 0.08em;
  }
</style>
```

> Note: `action.close` already exists in `en.ts`. If absent in any locale, `t()` falls back to the key — acceptable. This component renders only under `client:only` wrappers, so `window` is available at init.

- [ ] **Step 2: Verify type-check + lint**

Run: `bun run type-check && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/SettingsPanel.svelte
git commit -m "feat(hud): add unified SettingsPanel with language"
```

---

### Task 5: `ViewHud.svelte` shell

**Files:**
- Create: `src/components/hud/ViewHud.svelte`

**Interfaces:**
- Consumes: `ViewSwitcher`, `SettingsPanel`, `HudButton`; `routes` + `AppLocale` from `@/i18n/routes`; `useTranslations` from `@/i18n/utils`; `ViewId` from `@/lib/view/currentView`.
- Produces: props `currentView: ViewId`, `lang: AppLocale`, `translations: Record<string,string>`. Named slots: `controls`, `info`, `overlay`, `settings`, `bottomLeading`, `bottomTrailing`, plus default. Owns Back button + settings open state.

- [ ] **Step 1: Implement the component**

`src/components/hud/ViewHud.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";
  import HudButton from "./HudButton.svelte";
  import ViewSwitcher from "./ViewSwitcher.svelte";
  import SettingsPanel from "./SettingsPanel.svelte";

  export let currentView: ViewId;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  let t = translations && Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  let showSettings = false;

  function goHome() {
    window.location.href = routes.home(lang);
  }
</script>

<div class="view-hud">
  <!-- Top-left: Back -->
  <div class="hud-corner hud-top-left">
    <HudButton bracket ariaLabel={t("controls.backToMenu")} on:click={goHome}>
      {t("controls.backToMenu")}
    </HudButton>
  </div>

  <!-- Top-center: view switcher -->
  <div class="hud-corner hud-top-center">
    <ViewSwitcher {currentView} {lang} {translations} />
  </div>

  <!-- Top-right: settings gear -->
  <div class="hud-corner hud-top-right">
    <HudButton ariaLabel={t("nav.settings")} on:click={() => (showSettings = true)}>
      {t("nav.settings")}
    </HudButton>
  </div>

  <!-- View-specific slots -->
  <div class="hud-slot hud-info"><slot name="info" /></div>
  <div class="hud-slot hud-controls"><slot name="controls" /></div>
  <div class="hud-slot hud-overlay"><slot name="overlay" /></div>
  <div class="hud-slot hud-bottom-left"><slot name="bottomLeading" /></div>
  <div class="hud-slot hud-bottom-right"><slot name="bottomTrailing" /></div>

  <slot />

  <SettingsPanel
    isOpen={showSettings}
    {lang}
    {translations}
    on:close={() => (showSettings = false)}
  >
    <svelte:fragment slot="settings"><slot name="settings" /></svelte:fragment>
  </SettingsPanel>
</div>

<style>
  .view-hud {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
  }
  .view-hud :global(.hud-corner),
  .view-hud :global(.hud-slot) {
    pointer-events: auto;
  }
  .hud-corner { position: absolute; z-index: 22; }
  .hud-top-left { top: 16px; left: 16px; }
  .hud-top-center { top: 16px; left: 50%; transform: translateX(-50%); }
  .hud-top-right { top: 16px; right: 16px; }
  .hud-slot { position: absolute; z-index: 20; max-width: min(360px, 90vw); }
  .hud-info { top: 64px; left: 16px; }
  .hud-controls { top: 64px; right: 16px; }
  .hud-overlay { inset: 0; pointer-events: none !important; max-width: none; }
  .hud-bottom-left { bottom: 16px; left: 16px; }
  .hud-bottom-right { bottom: 16px; right: 16px; }
  @media (max-width: 768px) {
    .hud-top-center { display: none; } /* switcher too wide on mobile; back+settings remain */
  }
</style>
```

> The `<svelte:fragment slot="settings">` re-forwards the parent's `settings` slot into `SettingsPanel`'s `settings` slot (Svelte 4 supports slot pass-through this way).

- [ ] **Step 2: Verify type-check + lint**

Run: `bun run type-check && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/ViewHud.svelte
git commit -m "feat(hud): add shared ViewHud shell"
```

---

### Task 6: Remove page-level language selectors

**Files:**
- Modify: `src/pages/galaxy.astro`, `src/pages/constellation.astro`, `src/pages/planetary/[systemId].astro`

- [ ] **Step 1: Edit `src/pages/galaxy.astro`**

Delete the import line `import GlobalLanguageSelector from "../components/GlobalLanguageSelector.svelte";` and the usage line `<GlobalLanguageSelector client:load />` (and its comment). Leave everything else.

- [ ] **Step 2: Edit `src/pages/constellation.astro`**

Delete `import GlobalLanguageSelector from "../components/GlobalLanguageSelector.svelte";` and `<GlobalLanguageSelector client:load />` (and comment).

- [ ] **Step 3: Edit `src/pages/planetary/[systemId].astro`**

Delete `import GlobalLanguageSelector from "@/components/GlobalLanguageSelector.svelte";` and `<GlobalLanguageSelector client:only="svelte" />`.

- [ ] **Step 4: Verify build still compiles**

Run: `bun run type-check && bun run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/galaxy.astro src/pages/constellation.astro src/pages/planetary/[systemId].astro
git commit -m "refactor(pages): remove page-level language selector (now in shared HUD)"
```

---

### Task 7: Star view adopts `ViewHud`

**Files:**
- Modify: `src/components/PlanetarySystemWrapper.svelte`

**Interfaces:**
- Consumes: `ViewHud` from `./hud/ViewHud.svelte`; `getCurrentView` (always `"star"` here, but compute from URL for consistency).

- [ ] **Step 1: Add imports + currentView**

At the top of the `<script>` import block, add:

```ts
  import ViewHud from "./hud/ViewHud.svelte";
```

Near the other `let` declarations, add:

```ts
  let currentView: "star" | "galaxy" | "constellation" = "star";
```

- [ ] **Step 2: Replace the HUD chrome with `ViewHud`**

Replace the existing `.hud-info`, `.hud-controls.hud-rail`, and the back/zoom buttons block (the System readout + Command rail) — but KEEP the finder panel, pinned chip, target-lock layer, keyboard nav, and modals. Wrap the scene-ready HUD in `ViewHud`. Concretely, inside `{#if isSceneReady}` replace the `<div class="hud-info">…</div>` and `<div class="hud-controls hud-rail">…</div>` blocks with:

```svelte
    <ViewHud currentView={currentView} {lang} {translations}>
      <div slot="info">
        <HudPanel title={t(`systems.${systemId}.name`) || systemId}>
          <p class="hud-details-desc m-0">{t(`systems.${systemId}.description`) || ""}</p>
        </HudPanel>
      </div>

      <div slot="controls" class="hud-rail">
        <HudButton ariaLabel={t('finder.open')} on:click={() => { showFinder = true; focusedFinderIndex = 0; }}>{t('finder.title')}</HudButton>
        {#if zoomControls}
          <HudButton on:click={zoomControls.zoomIn}>{t('controls.zoomIn')}</HudButton>
          <HudButton on:click={zoomControls.zoomOut}>{t('controls.zoomOut')}</HudButton>
          <HudButton on:click={zoomControls.resetView}>{t('controls.resetView')}</HudButton>
        {/if}
      </div>

      <div slot="settings">
        {#if hasBarycenterOverlay}
          <label class="hud-setting"><input type="checkbox" bind:checked={showBarycenterOverlay}> {showBarycenterOverlay ? t('controls.hideBarycenters') : t('controls.showBarycenters')}</label>
        {/if}
        {#if isSceneReady}
          <OrbitSpeedControl {lang} {translations} />
        {/if}
      </div>
    </ViewHud>
```

Keep the existing finder panel (`{#if showFinder}…`), pinned chip, target-lock layer, and `{#if enableKeyboardNav}<KeyboardNavigation …/>` blocks unchanged (they remain siblings inside `{#if isSceneReady}`).

- [ ] **Step 3: Remove the now-unused CSS**

In the `<style>` block, delete `.hud-info { … }`, `.hud-controls { … }` rules (their positioning is now owned by `ViewHud`). Keep `.hud-rail` (still used for vertical stacking), `.hud-finder`, `.hud-pinned`, `.hud-lock-layer`. Add `.hud-rail { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }` if not already present. Add `.hud-setting { display:flex; align-items:center; gap:6px; font-size:13px; color: rgba(255,255,255,0.85); }`.

- [ ] **Step 4: Verify**

Run: `bun run type-check && bun run lint`
Expected: PASS. (Manual smoke: the rail shows Finder + Zoom; Back/switcher/settings appear top-row; barycenter + orbit-speed are inside Settings.)

- [ ] **Step 5: Commit**

```bash
git add src/components/PlanetarySystemWrapper.svelte
git commit -m "refactor(star): adopt shared ViewHud; move barycenter+orbit-speed to settings"
```

---

### Task 8: Constellation view adopts `ViewHud`

**Files:**
- Modify: `src/components/ConstellationWrapper.svelte`

- [ ] **Step 1: Add import + currentView**

Add to imports:

```ts
  import ViewHud from "./hud/ViewHud.svelte";
  import { getCurrentView } from "@/lib/view/currentView";
```

After the existing `lang` handling, add:

```ts
  let currentView = getCurrentView(window.location.pathname) ?? "constellation";
```

- [ ] **Step 2: Replace the standalone Back + controls-toggle with `ViewHud`**

Remove the `<div class="absolute top-4 left-4 z-20">…<button class="hud-btn">RETURN</button>…</div>` back block and the `<div class="absolute top-16 right-4 z-20">` controls-toggle block. Keep the controls side panel content (the `<HudFrame>` with geo/UTC + constellation list + details), but move it inside a `ViewHud` `controls` slot. The Back action and panel toggle are now owned by `ViewHud` (Back) — for the panel show/hide, keep a local `showControls` and put the toggle into the `info` slot, or simply keep the side panel always rendered in the `controls` slot (recommended: render it always; remove the on/off toggle since Settings now centralizes toggles). Concretely, wrap with:

```svelte
    <ViewHud currentView={currentView} {lang} translations={translations}>
      <div slot="controls" class="hud-panel-anim">
        <!-- the existing HudFrame with geo-lock/UTC readout + constellation list + details -->
        <HudFrame color="var(--hud-cyan)" bracketLength={18} glow={true}>
          …existing side-panel content…
        </HudFrame>
      </div>
      <div slot="overlay">
        <ScanLines />
        {#if hoveredConstellationId && hoverPos}<HudReticle x={hoverPos.x} y={hoverPos.y} state="hover" label={…} />{/if}
        {#if hoverStarPos}<HudCallout … />{/if}
        {#if selectedId && lockedPos && lockedPos.visible}<TargetLockOverlay … />{/if}
      </div>
      <div slot="settings">
        <label class="hud-setting"><input type="checkbox" bind:checked={scanlinesOn}> {t('constellation.scanlines')}</label>
      </div>
    </ViewHud>
```

Notes:
- If the existing side panel used a local `showControls` toggle and a `Panel On/Off` button, remove them (the panel is always shown in the `controls` slot; settings centralizes preferences). Delete the `.hud-drag-card` drag-instructions block's positioning if it conflicts (keep it as a `bottomLeading` slot if desired: `<div slot="bottomLeading">…`).
- `scanlinesOn` is a new local boolean (default `true`) toggling whether `<ScanLines />` renders; wire it into the overlay slot: `{#if scanlinesOn}<ScanLines />{/if}`. Add `let scanlinesOn = true;`.

- [ ] **Step 3: Verify**

Run: `bun run type-check && bun run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConstellationWrapper.svelte
git commit -m "refactor(constellation): adopt shared ViewHud"
```

---

### Task 9: Galaxy view adopts `ViewHud` + tactical kit; delete legacy CSS

**Files:**
- Modify: `src/components/GalaxyWrapper.svelte`

This is the largest refactor: replace the legacy `.hamburger-button` / `.controls-button` / `.hamburger-menu` / `.controls-panel` / `.system-info-tooltip` template + the entire legacy `<style>` block, and collapse the tooltip+dialog duplication into a single details dialog.

- [ ] **Step 1: Add imports + currentView + drop legacy state**

Add imports:

```ts
  import ViewHud from "./hud/ViewHud.svelte";
  import HudPanel from "./hud/HudPanel.svelte";
  import HudButton from "./hud/HudButton.svelte";
  import HudSearch from "./hud/HudSearch.svelte";
  import { getCurrentView } from "@/lib/view/currentView";
```

Add:

```ts
  let currentView = getCurrentView(window.location.pathname) ?? "galaxy";
  let nearbyQuery = "";
  $: nearbyResults = localGalaxyData.starSystems.filter((s) =>
    systemName(s).toLowerCase().includes(nearbyQuery.toLowerCase())
  );
```

Remove the legacy UI state that `ViewHud` now owns: `showHamburgerMenu`, `showControls`, `showSystemInfo`, `toggleHamburgerMenu`, `toggleControls`, `closeSystemInfo`. Keep `showSystemDialog`, `selectedSystemId`, `selectedSystemData`, and the existing settings booleans (`enableAnimations`, `enableStarGlow`, `enableStarLabels`, `maxRenderDistance`) — these move into the settings slot. Add `let enableDistanceLines = true;` (wired in Plan 2; harmless default here).

- [ ] **Step 2: Replace the legacy template (inside `{#if isSceneReady}`)**

Delete the hamburger button, controls button, `.galaxy-back`, hamburger menu, controls panel, and system-info-tooltip blocks. Replace with:

```svelte
    <ViewHud currentView={currentView} {lang} translations={translations}>
      <div slot="controls" class="galaxy-nearby">
        <HudPanel title={t('galaxy.starSystems')}>
          <HudSearch bind:value={nearbyQuery} placeholder={t('explore.searchPlaceholder')} ariaLabel={t('explore.searchPlaceholder')} />
          <ul class="hud-list mt-2">
            {#each nearbyResults as system (system.id)}
              <li>
                <button type="button" class="hud-list-row" on:click={() => handleSystemSelect(system.id)}>
                  <span class="row-name">{systemName(system)}</span>
                  <span class="row-leader"></span>
                  <span class="row-count">{system.distanceFromEarth.toFixed(2)} {t('unit.lightYears')}</span>
                </button>
              </li>
            {/each}
          </ul>
        </HudPanel>
      </div>

      <div slot="settings">
        <label class="hud-setting"><input type="checkbox" bind:checked={enableAnimations}> {t('settings.enableAnimations')}</label>
        <label class="hud-setting"><input type="checkbox" bind:checked={enableStarGlow}> {t('galaxy.starGlowEffects')}</label>
        <label class="hud-setting"><input type="checkbox" bind:checked={enableStarLabels}> {t('galaxy.starSystemLabels')}</label>
        <label class="hud-setting"><input type="checkbox" bind:checked={enableDistanceLines}> {t('galaxy.distanceLines')}</label>
        <label class="hud-setting">
          {t('galaxy.maxRenderDistance')}
          <input type="range" min="10" max="100" bind:value={maxRenderDistance}>
          <span>{maxRenderDistance} {t('unit.lightYears')}</span>
        </label>
      </div>
    </ViewHud>

    {#if showSystemDialog && selectedSystemData}
      <div class="system-dialog-overlay" on:click={closeSystemDialog} role="dialog" aria-modal="true">
        <div class="system-dialog" on:click|stopPropagation>
          <div class="dialog-header">
            <h2>{systemName(selectedSystemData)}</h2>
            <button class="dialog-close-button" on:click={closeSystemDialog} aria-label={t('action.close')}>×</button>
          </div>
          <div class="dialog-content">
            <p class="system-overview">{systemDescription(selectedSystemData)}</p>
            <!-- keep the existing stats grid + star details markup here verbatim -->
          </div>
          <div class="dialog-actions">
            <button class="action-button secondary" on:click={closeSystemDialog}>{t('action.close')}</button>
            <button class="action-button primary" on:click={() => navigateToSystem(selectedSystemId!)}>{canExplore ? t('action.explore') : t('common.comingSoon')}</button>
          </div>
        </div>
      </div>
    {/if}
```

- [ ] **Step 3: Simplify `handleSystemSelect` (no tooltip)**

Ensure `handleSystemSelect` no longer sets `showSystemInfo` (deleted). It should now only: `renderer?.focusOnStarSystem(id, true)`, `renderer?.highlightStarSystem(id, true)`, set `selectedSystemId`/`selectedSystemData`, set `showSystemDialog = true`. The `onStarSystemSelect` event handler should do the same (drop `showSystemInfo`).

- [ ] **Step 4: Replace the entire `<style>` block**

Delete the whole legacy `<style>…</style>` (`.hamburger-*`, `.controls-*`, `.hamburger-menu`, `.controls-panel`, `.system-info-tooltip`, the legacy-blue `.system-dialog*` rules). Replace with a minimal block:

```css
  .galaxy-wrapper { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #000011; }
  .galaxy-container { width: 100%; height: 100%; position: relative; }
  .galaxy-nearby { width: min(340px, 90vw); max-height: 60vh; overflow-y: auto; }
  .hud-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .hud-list-row {
    display: flex; align-items: center; gap: 8px; width: 100%;
    background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.8);
    padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px; text-align: left;
  }
  .hud-list-row:hover { border-color: var(--hud-cyan, #00f0ff); color: var(--hud-cyan, #00f0ff); }
  .row-name { white-space: nowrap; }
  .row-leader { flex: 1; border-bottom: 1px dotted rgba(0,240,255,0.3); }
  .row-count { font-size: 11px; opacity: 0.8; }
  .hud-setting { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.85); margin: 2px 0; }
  .hud-setting input[type="range"] { flex: 1; }
  .system-dialog-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.8); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; }
  .system-dialog { background: rgba(0,0,17,0.95); border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 12px; width: min(700px, 90vw); max-height: 85vh; overflow-y: auto; padding: 20px; color: #e0f7ff; }
  .dialog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .dialog-header h2 { margin: 0; color: var(--hud-cyan, #00f0ff); }
  .dialog-close-button { background: transparent; border: none; color: var(--hud-cyan, #00f0ff); font-size: 24px; cursor: pointer; }
  .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
  .action-button { padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; letter-spacing: 0.08em; }
  .action-button.secondary { background: transparent; border: 1px solid var(--hud-cyan, #00f0ff); color: var(--hud-cyan, #00f0ff); }
  .action-button.primary { background: var(--hud-cyan, #00f0ff); border: 1px solid var(--hud-cyan, #00f0ff); color: #001011; }
  .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 5: Verify**

Run: `bun run type-check && bun run lint`
Expected: PASS. Manual smoke: galaxy shows Back/switcher/settings top-row; nearby-systems list in controls slot; selecting a system opens ONE dialog (no tooltip); legacy blue CSS gone.

- [ ] **Step 6: Commit**

```bash
git add src/components/GalaxyWrapper.svelte
git commit -m "refactor(galaxy): adopt shared ViewHud, remove legacy CSS, dedupe tooltip+dialog"
```

---

### Task 10: E2E smoke for the shared HUD + view-switcher + language-in-settings

**Files:**
- Modify: `e2e/main-user-journeys.spec.ts` (append) or create `e2e/shared-hud.spec.ts`

- [ ] **Step 1: Add smoke tests**

`e2e/shared-hud.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3600";

test.describe("Shared HUD @smoke", () => {
  test("galaxy shows shared chrome and no standalone language button", async ({ page }) => {
    await page.goto(`${BASE}/galaxy`);
    try {
      await page.waitForSelector("#galaxy-renderer canvas", { timeout: 15000 });
    } catch {
      // headless no-WebGL fallback: just assert page loaded
    }
    // Back button present (top-left)
    await expect(page.getByRole("button", { name: /back to menu/i })).toBeVisible({ timeout: 10000 });
    // Settings present (top-right)
    await expect(page.getByRole("button", { name: /settings/i })).toBeVisible();
    // The old fixed language selector overlay is gone
    await expect(page.locator(".language-selector-global")).toHaveCount(0);
  });

  test("view switcher navigates galaxy -> constellation directly", async ({ page }) => {
    await page.goto(`${BASE}/galaxy`);
    await page.waitForTimeout(500);
    await page.getByRole("tab", { name: /constellation/i }).click({ force: true });
    await page.waitForURL(/\/constellation/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/constellation/);
  });

  test("language is reachable via settings panel", async ({ page }) => {
    await page.goto(`${BASE}/galaxy`);
    await page.getByRole("button", { name: /settings/i }).click({ force: true });
    await expect(page.getByRole("dialog", { name: /settings/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "中文" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run smoke E2E**

Run: `bunx playwright test --grep="@smoke" --project=chromium`
Expected: PASS (3 tests). Note: dev server auto-starts per `playwright.config.ts`.

- [ ] **Step 3: Commit**

```bash
git add e2e/shared-hud.spec.ts
git commit -m "test(e2e): add shared HUD + view-switcher + language smoke tests"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full lint + type-check + unit tests**

Run: `bun run lint && bun run type-check && bun run test:run`
Expected: all PASS.

- [ ] **Step 2: Build**

Run: `bun run build`
Expected: completes without error.

- [ ] **Step 3: Commit any remaining changes (e.g. format)**

```bash
git add -A && git commit -m "chore: format" || echo "nothing to commit"
```

---

## Out of Scope (handled by Plan 2)
- Galaxy Sol marker / label / distance-lines rendering (the `enableDistanceLines` toggle added here is a no-op stub until Plan 2 wires it).
- Constellation horizon ring / cardinal labels / compass.
