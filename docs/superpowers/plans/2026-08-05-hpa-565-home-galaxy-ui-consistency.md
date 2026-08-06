# HPA-565 Home and Galaxy UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Home, Solar/Galaxy details, Comparison, and Home settings with the existing Solar HUD language while preserving all feature behavior.

**Architecture:** Extract the current scene language loop into `LanguageOptions.svelte`. Add one generic centered `ModalShell.svelte` for Solar details, Galaxy details, Comparison, and Home settings. The shell owns framing, focus, close behavior, optional precomputed decoration, sizing, and exact Solar theme variables; consumers retain all content and business rules. The compact scene `SettingsPanel` remains separate because it is an anchored `ViewHud` side panel.

**Tech Stack:** Astro 5, Svelte 5 using the repository's Svelte 4 legacy API, Tailwind 4, shared HUD CSS, Vitest + Testing Library, Playwright, en/zh/ja dictionaries.

## Global Constraints

- Deliver all runtime work in one implementation PR linked to HPA-565.
- Start from the latest `main`; if HPA-564 merged, preserve its Galaxy action order and newly added tests.
- No Three.js renderer, camera, dataset, route, registry, observer-eligibility, or store architecture changes.
- Use `export let`, `$:`, `on:click`, `createEventDispatcher`, and legacy named slots; do not introduce runes or snippets.
- Reuse `HudPanel`, `HudButton`, `HudFrame`, `hud.css`, and `focusTrap`.
- Keep Home settings as the full editor and scene settings as the compact side panel.
- `LanguageOptions` retains `.lang-row`, `.lang-btn`, and `.is-active`.
- `ModalShell` retains exact Solar custom properties:
  - `--primary-color`
  - `--secondary-color`
  - `--accent-color`
  - `--modal-background`
  - `--modal-text-color`
- Consumers pass the complete close-button accessible name.
- Decoration defaults to `none`; Solar uses `cosmic`, Comparison uses `stars`, Galaxy and Home settings use `none`.
- Preserve Comparison's nested body-selector Escape behavior.
- Exclude Terrain Explorer, `ExploreSystems`, renderers, route changes, and unrelated cleanup.
- Avoid full-page WebGL screenshot assertions.

## Risks

- **Solar CSS regression:** preserve exact variables and perform a browser check immediately after Task 3.
- **Galaxy layout regression:** perform a browser check immediately after Task 4, including a narrow viewport.
- **Home locator collisions:** scope Home E2E queries to `.home-command-hub` after emoji removal.
- **Comparison Escape regression:** test that Escape closes its nested selector before the modal.
- **Coverage movement:** deleted components/tests and new components change the global 70% threshold; run `bun run ci:test` at the end.

## File Map

**Create**

- `src/components/LanguageOptions.svelte`
- `src/components/ModalShell.svelte`
- `src/components/__tests__/LanguageOptions.test.ts`
- `src/components/__tests__/ModalShell.test.ts`
- `src/components/__tests__/fixtures/ModalShellHarness.svelte`

**Modify**

- `src/components/hud/SettingsPanel.svelte`
- `src/components/SettingsModal.svelte`
- `src/components/MainMenu.svelte`
- `src/components/CelestialBodyInfoModal.svelte`
- `src/components/GalaxyWrapper.svelte`
- `src/components/ComparisonModal.svelte`
- `src/pages/index.astro`
- `src/components/hud/__tests__/SettingsPanel.test.ts`
- `src/components/__tests__/SettingsModal.test.ts`
- `src/components/__tests__/MainMenu.test.ts`
- `src/components/__tests__/CelestialBodyInfoModal.test.ts`
- `src/components/__tests__/GalaxyWrapper.test.ts`
- `src/components/__tests__/ComparisonModal.test.ts`
- `e2e/main-user-journeys.spec.ts`
- `e2e/constellation-view.spec.ts`

**Delete after migration**

- `src/components/GlobalLanguageSelector.svelte`
- `src/components/LanguageSelector.svelte`
- `src/components/__tests__/GlobalLanguageSelector.test.ts`
- `src/components/__tests__/LanguageSelector.test.ts`
- `src/components/ui/Dialog.svelte`
- `src/components/ui/Separator.svelte`
- `src/components/ui/Badge.svelte`
- `src/components/ui/__tests__/Dialog.test.ts`

---

### Task 1: Extract shared language choices without breaking scene settings

**Files:**

- Create: `src/components/LanguageOptions.svelte`
- Create: `src/components/__tests__/LanguageOptions.test.ts`
- Modify: `src/components/hud/SettingsPanel.svelte`
- Modify: `src/components/hud/__tests__/SettingsPanel.test.ts`

**Interfaces:**

```ts
export let lang: AppLocale = "en";
export let translations: Record<string, string> = {};
```

Stable DOM contract: `.lang-row[role="group"]`, `.lang-btn`, `.lang-btn.is-active`, and `aria-pressed`.

- [ ] **Step 1: Write failing component tests**

Cover all languages, active state, translated group label, and locale switching with query/hash preservation.

```ts
expect(container.querySelectorAll(".lang-btn")).toHaveLength(3);
expect(
  container.querySelector('.lang-btn.is-active[aria-pressed="true"]')
    ?.textContent?.trim(),
).toBe("中文");
```

For `/zh/constellation?observer=alpha-centauri#details`, clicking 日本語 must assign:

```ts
"/ja/constellation?observer=alpha-centauri#details"
```

- [ ] **Step 2: Confirm the test fails because the component is missing**

```bash
bunx vitest run src/components/__tests__/LanguageOptions.test.ts
```

- [ ] **Step 3: Implement `LanguageOptions.svelte` by extracting the existing loop**

```svelte
<script lang="ts">
  import { languages } from "@/i18n/ui";
  import { switchLocaleUrl, type AppLocale } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";

  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  $: t = Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  function changeLanguage(next: AppLocale) {
    window.location.href = switchLocaleUrl(new URL(window.location.href), next);
  }
</script>

<div class="lang-row" role="group" aria-label={t("settings.language")}>
  {#each Object.entries(languages) as [code, name] (code)}
    <button
      type="button"
      class="lang-btn"
      class:is-active={lang === code}
      aria-pressed={lang === code}
      on:click={() => changeLanguage(code as AppLocale)}
    >
      {name}
    </button>
  {/each}
</div>
```

Move the existing `.lang-row`, `.lang-btn`, and active styles from `SettingsPanel`, adding a visible `:focus-visible` outline.

- [ ] **Step 4: Replace the inline scene loop**

```svelte
<LanguageOptions lang={effectiveLang} {translations} />
```

Remove only unused language imports, `changeLanguage`, and local `.lang-*` styles.

- [ ] **Step 5: Update `SettingsPanel.test.ts`**

Keep the existing button count, active state, click behavior, locale preservation, and settings-slot assertions. Add:

```ts
expect(
  container.querySelector('[role="group"][aria-label="Language"]'),
).toBeTruthy();
```

- [ ] **Step 6: Verify and commit**

```bash
bunx vitest run \
  src/components/__tests__/LanguageOptions.test.ts \
  src/components/hud/__tests__/SettingsPanel.test.ts \
  src/components/hud/__tests__/ViewHud.test.ts
bun run type-check

git add \
  src/components/LanguageOptions.svelte \
  src/components/__tests__/LanguageOptions.test.ts \
  src/components/hud/SettingsPanel.svelte \
  src/components/hud/__tests__/SettingsPanel.test.ts
git commit -m "refactor(i18n): share HUD language options"
```

---

### Task 2: Add the generic modal shell

**Files:**

- Create: `src/components/ModalShell.svelte`
- Create: `src/components/__tests__/ModalShell.test.ts`
- Create: `src/components/__tests__/fixtures/ModalShellHarness.svelte`

**Interfaces:**

```ts
export type ModalDecoration = "none" | "stars" | "cosmic";

export let isOpen = false;
export let onClose: () => void = () => {};
export let onEscape: (() => boolean) | undefined = undefined;
export let closeLabel: string;
export let ariaLabel: string | undefined = undefined;
export let ariaLabelledby: string | undefined = undefined;
export let ariaDescribedby: string | undefined = undefined;
export let maxWidth = "700px";
export let decoration: ModalDecoration = "none";
export let theme: {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  textColor?: string;
} = {};
```

Slots: `header`, default content, `actions`, `notices`.

Stable hooks: `.modal-shell-overlay`, `.modal-shell-dialog`, `.modal-shell-close`, `.modal-shell-content`, `.modal-shell-actions`, `.modal-shell-notices`.

- [ ] **Step 1: Add a harness with every slot**

The harness supplies a heading, description, action button, notice, custom theme, `maxWidth="600px"`, and selectable decoration mode.

- [ ] **Step 2: Write failing tests**

Cover:

- closed state;
- slot rendering;
- dialog semantics and passed aria attributes;
- explicit close, backdrop close, Escape close, and inside click not closing;
- focus moved into the dialog and restored on destroy;
- `onEscape` returning `true` prevents close;
- complete `closeLabel` passed unchanged;
- exact CSS variables;
- custom max width;
- zero stars for `none`, 75 stars for `stars`, and stars plus particles for `cosmic`.

```ts
const dialog = container.querySelector(".modal-shell-dialog") as HTMLElement;
expect(dialog.style.getPropertyValue("--primary-color")).toBe("#123456");
expect(dialog.style.getPropertyValue("--modal-background")).toBe("#010203");
expect(dialog.style.maxWidth).toBe("600px");
```

- [ ] **Step 3: Confirm the missing-component failure**

```bash
bunx vitest run src/components/__tests__/ModalShell.test.ts
```

- [ ] **Step 4: Precompute decoration once**

```ts
const BACKGROUND_STARS = Array.from({ length: 75 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 4,
  opacity: 0.2 + Math.random() * 0.8,
  scale: 0.3 + Math.random() * 1.2,
}));

const BACKGROUND_PARTICLES = Array.from({ length: 20 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 4,
}));
```

Do not generate random values inside the template.

- [ ] **Step 5: Implement close and Escape behavior**

```ts
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  if (onEscape?.() === true) return;
  onClose();
}

function handleBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) onClose();
}
```

Apply `use:focusTrap={".modal-shell-close"}` to the dialog overlay/root that contains all focusable content.

- [ ] **Step 6: Set exact theme variables and width**

```svelte
<div
  class="modal-shell-dialog"
  style="
    max-width: {maxWidth};
    --primary-color: {theme.primary ?? '#60a5fa'};
    --secondary-color: {theme.secondary ?? '#3b82f6'};
    --accent-color: {theme.accent ?? '#ddd6fe'};
    {theme.background ? `--modal-background: ${theme.background};` : ''}
    {theme.textColor ? `--modal-text-color: ${theme.textColor};` : ''}
  "
>
```

Render decoration only for the selected mode. The close button uses `aria-label={closeLabel}` exactly.

- [ ] **Step 7: Implement responsive and reduced-motion CSS**

The overlay is centered with viewport padding. The dialog uses `width: 100%`, `max-height: 90vh`, and internal scrolling. Actions wrap normally and stack below 480 px. Reduced motion disables shell entrance, twinkle, and particles.

- [ ] **Step 8: Verify and commit**

```bash
bunx vitest run src/components/__tests__/ModalShell.test.ts
bun run lint
bun run type-check

git add \
  src/components/ModalShell.svelte \
  src/components/__tests__/ModalShell.test.ts \
  src/components/__tests__/fixtures/ModalShellHarness.svelte
git commit -m "feat(ui): add shared modal shell"
```

---

### Task 3: Migrate Solar details and verify visually before continuing

**Files:**

- Modify: `src/components/CelestialBodyInfoModal.svelte`
- Modify: `src/components/__tests__/CelestialBodyInfoModal.test.ts`

- [ ] **Step 1: Add failing shell assertions**

```ts
expect(container.querySelector(".modal-shell-dialog")).toBeTruthy();
expect(screen.getByRole("button", { name: /close earth/i })).toBeTruthy();
```

Keep all existing content, translation, composition, comparison, and terrain tests.

- [ ] **Step 2: Compose Solar inside `ModalShell`**

```svelte
<ModalShell
  isOpen={isOpen && celestialBody !== null}
  {onClose}
  closeLabel={`${t("modal.close")} ${getTranslatedName(celestialBody)}`}
  ariaLabelledby="modal-title"
  ariaDescribedby="modal-description"
  maxWidth="600px"
  decoration="cosmic"
  theme={theme}
>
```

Place planet icon/name/type/status in `header`, current body/facts/composition/footer in default content, and comparison/terrain controls in `actions`.

- [ ] **Step 3: Delete only generic Solar shell CSS**

Remove old overlay, container, modal frame, star/particle, close-button, shell animation, and generic action-container rules. Retain every entity-specific style and all uses of the exact theme variables.

- [ ] **Step 4: Run component verification**

```bash
bunx vitest run src/components/__tests__/CelestialBodyInfoModal.test.ts
bun run type-check
```

- [ ] **Step 5: Run an immediate browser check**

```bash
bun run dev
```

Open `/planetary/solar`, select Earth, and verify:

- frame, glow, planet illustration, facts, composition, comparison, terrain, and close label;
- Escape, backdrop click, Tab cycling, and focus restoration;
- approximately 390 px width;
- reduced motion and high contrast.

Stop the dev server after recording the result in the implementation PR description.

- [ ] **Step 6: Commit**

```bash
git add \
  src/components/CelestialBodyInfoModal.svelte \
  src/components/__tests__/CelestialBodyInfoModal.test.ts
git commit -m "refactor(solar): use shared modal shell"
```

---

### Task 4: Migrate Galaxy details without adding decorative cost

**Files:**

- Modify: `src/components/GalaxyWrapper.svelte`
- Modify: `src/components/__tests__/GalaxyWrapper.test.ts`

- [ ] **Step 1: Add failing shared-shell assertions**

Replace `.system-dialog` assumptions with `.modal-shell-dialog` and accessible dialog queries. Keep tests for explicit close, Escape, backdrop, Explore/Coming Soon, View Sky, `aria-disabled`, and status notices.

- [ ] **Step 2: Compose Galaxy inside the shell**

```svelte
<ModalShell
  isOpen={isSceneReady && showSystemDialog && selectedSystemData !== null}
  onClose={closeSystemDialog}
  closeLabel={t("action.close")}
  ariaLabel={systemName(selectedSystemData)}
  maxWidth="700px"
  decoration="none"
  theme={{
    primary: "var(--hud-cyan)",
    secondary: "var(--hud-magenta)",
    accent: "var(--hud-ivory)",
  }}
>
```

Keep all registry, observer, and route logic in `GalaxyWrapper`. Use the slots for header, facts/star cards, actions, and notices.

- [ ] **Step 3: Remove obsolete local dialog infrastructure**

Remove the local `focusTrap` import, duplicate outer Escape handler, and old `.system-dialog-*`, `.dialog-*`, and `.action-button` CSS. Preserve renderer lifecycle and selection/navigation functions.

- [ ] **Step 4: Run component verification**

```bash
bunx vitest run src/components/__tests__/GalaxyWrapper.test.ts
bun run lint
bun run type-check
```

- [ ] **Step 5: Run an immediate browser check**

Run the dev server and verify `/galaxy` at desktop and 360 × 640:

- system selection opens one dialog;
- facts and star cards scroll;
- actions remain within bounds;
- Explore/Coming Soon, View Sky, unavailable notices, close, Escape, and backdrop work;
- no decorative star/particle DOM is added by the shell.

- [ ] **Step 6: Commit**

```bash
git add \
  src/components/GalaxyWrapper.svelte \
  src/components/__tests__/GalaxyWrapper.test.ts
git commit -m "refactor(galaxy): use shared modal shell"
```

---

### Task 5: Migrate Comparison without touching its renderer or content

**Files:**

- Modify: `src/components/ComparisonModal.svelte`
- Modify: `src/components/__tests__/ComparisonModal.test.ts`

- [ ] **Step 1: Update tests for the shell and nested Escape behavior**

Replace `.modal-overlay` and `.modal-close` integration assumptions with `.modal-shell-overlay`, `.modal-shell-dialog`, and `.modal-shell-close`.

Retain the assertion that 75 stars render. Add:

```ts
it("Escape closes the body selector before the modal", async () => {
  // open .body-selector, send Escape through the dialog,
  // assert selector is gone and onClose was not called
});
```

- [ ] **Step 2: Define the consumer Escape hook**

```ts
function handleShellEscape(): boolean {
  if (!showBodySelector) return false;
  showBodySelector = false;
  return true;
}
```

Remove only the old outer `handleKeydown` and `handleOverlayClick` once the shell is wired.

- [ ] **Step 3: Compose Comparison inside the shell**

```svelte
<ModalShell
  {isOpen}
  {onClose}
  onEscape={handleShellEscape}
  closeLabel={t("action.close")}
  ariaLabelledby="comparison-title"
  maxWidth="1000px"
  decoration="stars"
  theme={{
    primary: "#60a5fa",
    secondary: "#3b82f6",
    accent: "#ddd6fe",
  }}
>
```

Place the existing header/export controls in `header`. Keep export errors, body badges, selector, sphere container, table, empty state, and footer in default content. No `actions` slot is required.

- [ ] **Step 4: Delete only duplicate shell CSS and decoration data**

Remove local overlay/container/frame/star/close styles and the local `BACKGROUND_STARS`. Retain all header, export, selector, sphere, table, empty-state, and footer styles. Do not modify `ComparisonSphereRenderer` lifecycle.

- [ ] **Step 5: Verify and commit**

```bash
bunx vitest run src/components/__tests__/ComparisonModal.test.ts
bun run lint
bun run type-check

git add \
  src/components/ComparisonModal.svelte \
  src/components/__tests__/ComparisonModal.test.ts
git commit -m "refactor(comparison): use shared modal shell"
```

---

### Task 6: Revamp the Home command hub

**Files:**

- Modify: `src/components/MainMenu.svelte`
- Modify: `src/components/__tests__/MainMenu.test.ts`

- [ ] **Step 1: Add failing Home structure tests**

Assert:

- `.home-command-hub` and `.hud-panel` render;
- exactly four `.menu-button` destination actions render;
- destination order is Solar, Explore, Galaxy, Constellation;
- scene hints do not render;
- Settings is outside `.menu-button` and remains focusable by Tab;
- arrow keys cycle only the four destination buttons.

- [ ] **Step 2: Replace foreground navigation**

Keep the cosmic background and title. Use one `HudPanel` containing four `HudButton` destination actions. Keep `.menu-button` on those four buttons only. Solar uses `bracket` and remains first.

Move Settings to a top-right `HudButton` without `.menu-button`.

Remove emoji spans, rainbow per-action classes, large scale/translate hover effects, and the scene-control hint block.

- [ ] **Step 3: Preserve the existing navigation functions**

Do not change route helpers or `gameActions.navigateToView`. Keep `menuItems` as exactly four destination entries so `updateFocus()` and arrow navigation stay aligned.

- [ ] **Step 4: Verify and commit**

```bash
bunx vitest run src/components/__tests__/MainMenu.test.ts
bun run lint
bun run type-check

git add \
  src/components/MainMenu.svelte \
  src/components/__tests__/MainMenu.test.ts
git commit -m "feat(home): align command hub with HUD"
```

---

### Task 7: Compose Home settings from the shared shell and remove dead UI

**Files:**

- Modify: `src/components/SettingsModal.svelte`
- Modify: `src/pages/index.astro`
- Modify: `src/components/MainMenu.svelte`
- Modify: `src/components/__tests__/SettingsModal.test.ts`
- Modify: `src/components/__tests__/MainMenu.test.ts`
- Delete the obsolete selector and unused UI files listed in the File Map.

- [ ] **Step 1: Add failing settings-shell tests**

`SettingsModal.test.ts` asserts:

- `.modal-shell-dialog` renders with the Settings accessible label;
- `LanguageOptions` group renders and marks the active locale;
- Save, Cancel, Reset, graphics quality, ranges, and checkboxes retain behavior;
- explicit close, Escape, backdrop, and focus restoration work through `ModalShell`.

- [ ] **Step 2: Add the locale prop and compose the shell**

```ts
export let lang: AppLocale = "en";
```

```svelte
<ModalShell
  {isOpen}
  onClose={onClose}
  closeLabel={t("action.close")}
  ariaLabel={t("settings.title")}
  maxWidth="672px"
  decoration="none"
  theme={{
    primary: "var(--hud-cyan)",
    secondary: "var(--hud-magenta)",
    accent: "var(--hud-ivory)",
  }}
>
  <HudPanel title={t("settings.title")} animate={false}>
    <LanguageOptions {lang} {translations} />
    <!-- retain all existing settings sections and bindings -->
  </HudPanel>

  <svelte:fragment slot="actions">
    <!-- Reset on the leading side; Cancel and Save on the trailing side -->
  </svelte:fragment>
</ModalShell>
```

Keep `handleSave`, `handleReset`, defaults, and dispatch events unchanged.

- [ ] **Step 3: Thread the existing translation**

Add to `src/pages/index.astro`:

```ts
"settings.language": t("settings.language"),
```

Pass `lang={currentLang}` from `MainMenu` into `SettingsModal`.

- [ ] **Step 4: Remove obsolete selectors and unused UI primitives**

Remove `GlobalLanguageSelector` from `index.astro`, then delete:

```text
src/components/GlobalLanguageSelector.svelte
src/components/LanguageSelector.svelte
src/components/__tests__/GlobalLanguageSelector.test.ts
src/components/__tests__/LanguageSelector.test.ts
src/components/ui/Dialog.svelte
src/components/ui/Separator.svelte
src/components/ui/Badge.svelte
src/components/ui/__tests__/Dialog.test.ts
```

Replace separator and badge presentation inside Settings with simple HUD section borders/labels; do not add replacement components.

- [ ] **Step 5: Verify no orphan imports remain**

```bash
rg 'GlobalLanguageSelector|LanguageSelector' src
rg 'ui/(Dialog|Separator|Badge)\.svelte' src
```

Expected: no output from either command.

- [ ] **Step 6: Verify and commit**

```bash
bunx vitest run \
  src/components/__tests__/SettingsModal.test.ts \
  src/components/__tests__/MainMenu.test.ts \
  src/components/__tests__/LanguageOptions.test.ts \
  src/components/__tests__/ModalShell.test.ts
bun run lint
bun run type-check

git add src/components src/pages/index.astro
git commit -m "refactor(home): share settings modal and remove dead UI"
```

---

### Task 8: Migrate all affected E2E locators and run full validation

**Files:**

- Modify: `e2e/main-user-journeys.spec.ts`
- Modify: `e2e/constellation-view.spec.ts`

- [ ] **Step 1: Scope every Home locator**

Create a stable root in each Home test:

```ts
const home = page.locator(".home-command-hub");
await expect(home).toBeVisible();
```

Replace emoji-prefixed locators with scoped accessible names:

```ts
home.getByRole("button", { name: /Solar System/i });
home.getByRole("button", { name: /Explore Exoplanets/i });
home.getByRole("button", { name: /Galaxy View/i });
home.getByRole("button", { name: /Constellation View/i });
home.getByRole("button", { name: /Settings/i });
```

Apply the same scoping in `constellation-view.spec.ts`. Do not use unscoped `Settings` queries on Home because the Astro toolbar may match.

- [ ] **Step 2: Update modal selectors**

In `main-user-journeys.spec.ts`:

- `.system-dialog` → `.modal-shell-dialog` or accessible dialog query;
- `.dialog-actions` → `.modal-shell-actions`;
- `.action-button` → role/name queries scoped to the dialog;
- `[role="dialog"].modal-overlay` → `.modal-shell-dialog` or accessible dialog query.

Retain the Galaxy narrow-viewport bounding-box assertions using `.modal-shell-actions` and its buttons.

- [ ] **Step 3: Add Comparison flow coverage**

Open a Solar body detail, add/open comparison through the existing accessible action, assert the comparison dialog uses `.modal-shell-dialog`, then close it and verify focus returns to the prior trigger or scene control.

- [ ] **Step 4: Run the complete Playwright suite**

```bash
bunx playwright test
```

Expected: all E2E specs PASS, including `main-user-journeys.spec.ts`, `constellation-view.spec.ts`, `shared-hud.spec.ts`, and position-indicator coverage.

- [ ] **Step 5: Run the complete CI gate**

```bash
bun run ci:test
```

Expected: lint, type-check, 70% coverage thresholds, and production build PASS.

- [ ] **Step 6: Final manual matrix**

Run `bun run dev` and verify:

- `/`, `/zh/`, `/ja/` at desktop and approximately 390 px;
- `/planetary/solar` details and Comparison;
- `/galaxy` details at desktop and 360 × 640;
- keyboard-only navigation, focus return, reduced motion, and high contrast;
- Home language switching;
- Galaxy Explore/Coming Soon/View Sky/unavailable states.

- [ ] **Step 7: Commit and inspect scope**

```bash
git add e2e/main-user-journeys.spec.ts e2e/constellation-view.spec.ts
git commit -m "test(ui): migrate Home and modal journeys"

git status -sb
git diff main...HEAD --stat
git diff main...HEAD -- src/components src/pages/index.astro e2e
```

Confirm:

- no Terrain Explorer, renderer, data, route, registry, or unrelated changes;
- no obsolete selector or UI primitive references;
- no entity/settings/comparison business logic in `ModalShell`;
- exact Solar theme variables remain on `.modal-shell-dialog`;
- Galaxy and Home settings use no decorative shell nodes;
- one implementation PR contains the complete change.

The implementation PR may be opened as a draft before these checks, but it must remain draft until `bunx playwright test` and `bun run ci:test` pass.