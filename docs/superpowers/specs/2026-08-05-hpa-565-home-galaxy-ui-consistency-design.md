# HPA-565 Home and Galaxy UI Consistency — Design

- **Date:** 2026-08-05
- **Status:** Draft for review
- **Tracking:** HPA-565
- **Reference UI:** `/planetary/solar`
- **Delivery:** One implementation PR after this design/plan PR is approved

## Problem

Andromeda already has a coherent tactical-HUD language on the Solar System, Galaxy, and Constellation scene chrome: dark translucent surfaces, cyan/magenta accents, Orbitron and JetBrains Mono typography, compact readouts, and shared HUD controls.

Visible drift remains in four connected surfaces:

1. **Home** uses rainbow gradients, emoji-heavy buttons, marketing-card styling, and scene-control hints before the user enters a 3D view.
2. **Galaxy selected-system details** use a bespoke dialog rather than the Solar detail presentation.
3. **Comparison** duplicates the Solar modal overlay, frame, decoration, close behavior, Escape handling, and backdrop behavior. It is opened directly from the Solar detail flow, so leaving it on the old shell would create an immediate visual seam.
4. **Home settings** use the generic `ui/Dialog.svelte` stack, while the project already has HUD styling and modal interaction patterns.

The current implementation therefore has multiple copies of the same modal lifecycle and foreground chrome. A CSS-only restyle would preserve that duplication and allow the surfaces to drift again.

## Goals

- Make Home feel like the command hub for the same product shown on `/planetary/solar`.
- Use one small modal shell for Solar details, Galaxy details, Comparison, and Home settings.
- Keep entity, comparison, settings, routing, and eligibility logic in their existing consumers.
- Share locale selection between Home settings and scene settings.
- Preserve current content, routes, observer behavior, comparison behavior, settings behavior, localization, and accessibility.
- Deliver the implementation as one cohesive PR with reviewable internal commits.

## Non-goals

- No Three.js renderer, camera, scene, dataset, data-model, route, registry, observer-eligibility, or store architecture changes.
- No Terrain Explorer migration.
- No `ExploreSystems.svelte` migration; its search-and-pagination dialog already uses the HUD kit and has a different interaction layout.
- No migration of the compact scene `SettingsPanel.svelte` onto the centered modal shell; it remains an anchored side panel inside `ViewHud` and only shares `LanguageOptions`.
- No general-purpose design system or replacement component library.
- No new Home features, onboarding, dashboards, or content sections.
- No compatibility shim for deleted unused components.
- No full-page pixel assertions around dynamic WebGL scenes.

## Design principles

### Reuse existing code before adding primitives

The implementation reuses:

- `HudPanel.svelte`, `HudButton.svelte`, `HudFrame.svelte`, and `hud.css`;
- the language loop currently in `SettingsPanel.svelte`;
- `focusTrap` from `src/lib/hud/focusTrap.ts`, including trigger-focus restoration;
- the precomputed background-star pattern already used by `ComparisonModal.svelte`.

Only two shared components are added:

- `LanguageOptions.svelte`
- `ModalShell.svelte`

### Keep shared components behavior-only

`ModalShell` owns modal framing and interaction. It does not know what a planet, star system, comparison, or settings form is.

`LanguageOptions` owns locale choices and URL switching. It does not open settings or mutate `GameSettings`.

### Make expensive presentation explicit

Decoration is opt-in. Solar and Comparison retain decorative backgrounds; Galaxy and Home settings remain lightweight while a live 3D scene may continue rendering behind them.

### Preserve consumer-specific behavior

Comparison currently uses Escape to close its nested body selector before closing the modal. The shell exposes one small Escape interception hook so that behavior survives migration.

## Home command hub

Keep the existing cosmic background and Andromeda identity, but replace the foreground with the established HUD language.

Desktop:

- compact Settings action at top-right;
- centered title and subtitle;
- one `HudPanel` command frame;
- four destination commands in order: Solar System, Explore Systems, Galaxy, Constellation;
- Solar System is the primary bracketed command;
- restrained description/readout;
- no rotate, zoom, scroll, or click-planet hints.

Mobile:

- one-column commands within the viewport;
- no horizontal overflow at approximately 390 px;
- Settings remains reachable without overlapping the title.

Home does **not** use `ViewHud`. `ViewHud` represents an active scene and contains a Back-to-Home action, so using it on Home would create misleading circular navigation.

Home E2E locators must be scoped to `.home-command-hub` rather than relying on emoji prefixes. This prevents strict-mode collisions with the Astro development toolbar after emoji removal.

## Shared language choices

Create `src/components/LanguageOptions.svelte` by extracting the existing language loop and styles from `SettingsPanel.svelte`.

Public interface:

```ts
export let lang: AppLocale = "en";
export let translations: Record<string, string> = {};
```

Responsibilities:

- render English, 中文, and 日本語 from the existing `languages` map;
- mark the current locale with `aria-pressed`;
- preserve query parameters and hashes through `switchLocaleUrl`;
- preserve `.lang-row`, `.lang-btn`, and `.is-active` integration hooks;
- expose a translated `settings.language` group label.

Home's precomputed translation bag must include `settings.language`. No new dictionary key is required.

## Shared `ModalShell`

Create `src/components/ModalShell.svelte`.

### Public interface

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

Slots:

- `header`
- default content
- `actions`
- `notices`

### Responsibilities

- conditional rendering;
- centered overlay, backdrop, and scroll containment;
- `role="dialog"` and `aria-modal="true"`;
- close button;
- Escape and backdrop-click handling;
- focus trapping and trigger-focus restoration;
- responsive width and action stacking;
- exact Solar theme custom properties;
- optional precomputed decoration;
- reduced-motion behavior.

Stable hooks:

- `.modal-shell-overlay`
- `.modal-shell-dialog`
- `.modal-shell-close`
- `.modal-shell-content`
- `.modal-shell-actions`
- `.modal-shell-notices`

### Escape interception

When Escape is pressed:

```ts
if (onEscape?.() === true) return;
onClose();
```

Only Comparison uses this hook. It closes `showBodySelector` and returns `true` when the nested selector is open. Other consumers omit the hook.

### Solar theme compatibility contract

The dialog root exposes these exact properties:

```css
--primary-color
--secondary-color
--accent-color
--modal-background
--modal-text-color
```

Retained Solar content CSS already consumes these names for borders, gradients, glows, illustrations, tags, and buttons. Keeping them avoids unnecessary CSS churn and visual regressions that text assertions would not catch.

### Decoration

Precompute decorative coordinates once in the module script, following `ComparisonModal.svelte` rather than calling `Math.random()` inside the template.

- `none`: no decorative DOM nodes;
- `stars`: star field only;
- `cosmic`: star field plus particles.

Consumer choices:

- Solar: `decoration="cosmic"`, `maxWidth="600px"`;
- Comparison: `decoration="stars"`, `maxWidth="1000px"`;
- Galaxy: `decoration="none"`, `maxWidth="700px"`;
- Home settings: `decoration="none"`, `maxWidth="672px"`.

This preserves existing decorated flows without adding 95 animated nodes over Galaxy's live render loop.

### Non-responsibilities

The shell does not import entity types, comparison utilities, settings stores, routes, registries, observer logic, or translation dictionaries. Consumers pass the complete close-button accessible name; the shell does not assemble or translate names.

## Consumer composition

### Solar details

`CelestialBodyInfoModal.svelte` retains:

- translated body content and type;
- fact and composition formatting;
- body theme selection;
- comparison actions and limits;
- terrain eligibility and navigation;
- status badges and footer;
- the complete `Close <translated body name>` accessible label.

Only generic overlay, frame, decoration, close, Escape, backdrop, focus, and responsive action behavior move into `ModalShell`.

Solar gains focus containment intentionally. This is an accessibility improvement, not a claim of byte-for-byte behavioral neutrality.

### Galaxy selected-system details

`GalaxyWrapper.svelte` retains:

- selected-system state;
- localized name and description;
- registry availability;
- observer eligibility;
- Explore, Coming Soon, and View Sky navigation;
- status notices.

The modal composes:

- header: system mark, localized name, translated system type;
- content: overview, distance, star count, known planets, spectral class, constellation, and star cards;
- actions: Close, View Sky, Explore/Coming Soon;
- notices: observer-unavailable and Coming Soon status regions.

Galaxy uses no decorative star/particle DOM because the Three.js scene remains active behind the overlay.

### Comparison

`ComparisonModal.svelte` retains:

- `ComparisonSphereRenderer` lifecycle;
- body search and selection;
- body removal/addition;
- export behavior and error state;
- comparison table and size ratios;
- translations and all content styling.

It migrates only the duplicate overlay, frame, star field, close button, backdrop, and outer Escape behavior.

When the body selector is open, its `onEscape` handler closes that selector and consumes the event. Otherwise the shell closes the modal.

This keeps the Compare transition inside one visual and interaction system without touching the 3D comparison renderer.

### Home settings

`SettingsModal.svelte` remains the full settings editor and retains:

- Save, Cancel, and Reset behavior;
- all `GameSettings` bindings;
- section content and descriptions;
- close/save events.

It composes `ModalShell` with a `HudPanel` inside the default slot and Save/Cancel/Reset controls in the actions slot. It does not hand-roll another overlay or focus trap.

The compact scene `SettingsPanel.svelte` remains separate because its top-right anchored placement and `ViewHud` pointer-event requirements differ from a centered modal.

## Dead-code cleanup

After Home settings leaves the old generic stack, repository search shows these components have no remaining product imports:

- `src/components/ui/Dialog.svelte`
- `src/components/ui/Separator.svelte`
- `src/components/ui/Badge.svelte`

Delete them and `src/components/ui/__tests__/Dialog.test.ts`. Other UI primitives remain because they are still used elsewhere.

Also delete the replaced Home-only language selector components and tests.

## Accessibility

- `ModalShell` owns dialog semantics, focus trap, Escape, backdrop click, and visible close control.
- Focus returns to the trigger through the existing `focusTrap` action.
- Consumers provide `ariaLabel` or `ariaLabelledby` and the complete close accessible name.
- Galaxy's unavailable View Sky action remains focusable through `aria-disabled` with an explanatory status region.
- Comparison preserves nested-selector Escape behavior.
- Reduced motion disables shell entrance, star twinkle, particles, and large Home transitions.
- High contrast continues to use global and HUD tokens.
- Home destination arrow navigation remains limited to four `.menu-button` actions; Settings is Tab-reachable and outside that list.

## Responsive behavior

- `maxWidth` is consumer-controlled while the shell enforces viewport margins and max-height.
- content scrolls inside the shell;
- action rows wrap and stack at narrow widths;
- Comparison retains its wide table layout and internal horizontal handling;
- Home commands remain one column;
- Chinese and Japanese labels may wrap without clipping primary actions.

## Risks and mitigations

### Solar visual regression

Moving a large component's outer CSS can break presentation while text tests remain green.

Mitigation: preserve exact custom-property names, keep content CSS in Solar, and perform a browser check immediately after the Solar migration before continuing.

### E2E selector churn

Emoji removal and modal-hook replacement affect many locators. Unscoped `Settings` queries can collide with the Astro toolbar.

Mitigation: scope all Home locators to `.home-command-hub`, migrate Solar and Galaxy shell hooks explicitly, update `constellation-view.spec.ts`, and run the complete Playwright suite.

### Comparison Escape regression

A generic Escape handler could close Comparison while its nested body selector is open.

Mitigation: the `onEscape` interception contract and dedicated regression test.

### Decoration cost

Adding Solar-style decoration to Galaxy or settings would add animated nodes over an active scene.

Mitigation: decoration defaults to `none`; consumers opt into only their existing decoration level.

### Coverage movement

Deleting old components/tests and adding shared components changes the global 70% coverage denominator.

Mitigation: run `bun run ci:test`, including coverage, before marking the implementation PR ready for review.

### Concurrent Galaxy work

HPA-564 may change Galaxy dialog structure before implementation begins.

Mitigation: rebase the implementation branch onto the latest `main` first and preserve any newly merged Galaxy action ordering while applying this shell migration.

## File changes

### New

- `src/components/LanguageOptions.svelte`
- `src/components/ModalShell.svelte`
- `src/components/__tests__/LanguageOptions.test.ts`
- `src/components/__tests__/ModalShell.test.ts`
- `src/components/__tests__/fixtures/ModalShellHarness.svelte`

### Modified

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

### Removed

- `src/components/GlobalLanguageSelector.svelte`
- `src/components/LanguageSelector.svelte`
- `src/components/__tests__/GlobalLanguageSelector.test.ts`
- `src/components/__tests__/LanguageSelector.test.ts`
- `src/components/ui/Dialog.svelte`
- `src/components/ui/Separator.svelte`
- `src/components/ui/Badge.svelte`
- `src/components/ui/__tests__/Dialog.test.ts`

No new i18n dictionary key is required by default. The existing `settings.language` key must be included in Home's precomputed translation object.

## Testing strategy

### Unit/component

- Language options: locale list, active state, URL preservation, stable hooks.
- Scene settings: extraction does not break current language and slot behavior.
- Modal shell: all slots, semantics, close paths, focus trap, focus restoration, Escape interception, widths, decoration modes, reduced motion, and exact theme variables.
- Solar: existing content/actions plus shell hook and entity-specific close name.
- Galaxy: all existing registry/observer/navigation states plus lightweight shell composition.
- Comparison: existing renderer/content behavior, shell hooks, 75-star preservation, and nested-selector Escape behavior.
- Home settings: language, Save, Cancel, Reset, and all bindings inside the shared shell.
- Home: destination order, routes, Explore Systems, Tab/arrow behavior, and removed scene hints.

### E2E

- Scope every Home action query to `.home-command-hub`.
- Update `main-user-journeys.spec.ts` and `constellation-view.spec.ts` for emoji removal.
- Migrate Galaxy `.system-dialog`, `.dialog-actions`, and `.action-button` selectors.
- Migrate Solar `[role="dialog"].modal-overlay` to `.modal-shell-dialog` or an accessible-role query.
- Cover comparison opening from Solar and closing back to the scene.
- Retain narrow-viewport action-bound checks.
- Run the full Playwright suite, not only selected spec files.

## Delivery and review shape

Implementation remains one PR linked to HPA-565. Use reviewable internal commits:

1. language extraction;
2. modal shell;
3. Solar migration and browser check;
4. Galaxy migration and browser check;
5. Comparison migration;
6. Home command hub;
7. Home settings and dead-code cleanup;
8. E2E migration and full validation.

The implementation PR may be opened as a draft early, but it must not be marked ready until full Playwright and `bun run ci:test` pass.

## Alternatives considered

### CSS-only restyle

Rejected because it preserves duplicated modal lifecycle code.

### Entity-specific shell

Rejected after repository review. The shared behavior is not entity-specific: Comparison and Home settings need the same centered modal lifecycle. `ModalShell` is the accurate boundary.

### Reusing the compact scene SettingsPanel for Home

Rejected because `SettingsPanel` is an anchored side panel inside `ViewHud`, while Home settings is a larger centered editor. They share `LanguageOptions` and HUD primitives, not placement.

### Separate implementation PRs

Not selected. The migrations depend on one small shell and are best validated as one complete consistency pass.