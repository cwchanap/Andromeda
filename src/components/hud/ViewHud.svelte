<script lang="ts">
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";
  import { gameState, settings } from "@/stores/gameStore";
  import HudButton from "./HudButton.svelte";
  import ViewSwitcher from "./ViewSwitcher.svelte";
  import SettingsPanel from "./SettingsPanel.svelte";

  type Translate = (key: string) => string;

  // Props are kept as optional fallbacks for direct/test usage. In normal
  // app flow, wrappers write hudView/hudLang to $gameState and these store
  // values take precedence over the drilled props.
  export let currentView: ViewId = "star";
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  // Effective values: prefer the shared store, fall back to props.
  $: effectiveView = ($gameState.hudView as ViewId | undefined) ?? currentView;
  $: effectiveLang = ($gameState.hudLang as AppLocale | undefined) ?? lang;

  let t: Translate;
  // Reactive: recompute when effective lang or translations change.
  $: t =
    translations && Object.keys(translations).length
      ? (key) => translations[key] || key
      : (useTranslations(effectiveLang) as Translate);

  let showSettings = false;

  // Accessibility: read reduced-motion + high-contrast from the shared
  // settings store so the HUD shell reflects user/system preferences without
  // each child re-querying matchMedia. The settings store is kept in sync
  // with OS preferences by AccessibilityManager.
  $: reducedMotion = $settings.reducedMotion;
  $: highContrast = $settings.highContrastMode;

  // Screen-reader announcement text for the aria-live region. Updates when
  // the active view or settings panel visibility changes so SR users get a
  // spoken cue equivalent to the visual HUD chrome. View labels are sourced
  // from the existing viewSwitcher.* translations so non-English locales get
  // localized announcements matching the visible switcher.
  let announcement = "";
  $: if (showSettings) {
    announcement = t("hud.settingsOpened");
  } else {
    announcement = t(`viewSwitcher.${effectiveView}`) || effectiveView;
  }

  function goHome() {
    window.location.href = routes.home(effectiveLang);
  }
</script>

<div
  class="view-hud"
  class:high-contrast={highContrast}
  class:reduced-motion={reducedMotion}
>
  <!-- Screen-reader live region for HUD state changes (view switches,
       settings open/close). aria-atomic so each update replaces the prior
       announcement rather than appending. -->
  <div class="hud-sr-live" aria-live="polite" aria-atomic="true">
    {announcement}
  </div>

  <div class="hud-corner hud-top-left">
    <HudButton bracket ariaLabel={t("controls.backToMenu")} on:click={goHome}>
      {t("controls.backToMenu")}
    </HudButton>
  </div>

  <div class="hud-corner hud-top-center">
    <ViewSwitcher currentView={effectiveView} lang={effectiveLang} {translations} />
  </div>

  <div class="hud-corner hud-top-right">
    <HudButton ariaLabel={t("nav.settings")} on:click={() => (showSettings = true)}>
      {t("nav.settings")}
    </HudButton>
  </div>

  <div class="hud-slot hud-info"><slot name="info" /></div>
  <div class="hud-slot hud-controls"><slot name="controls" /></div>
  <div class="hud-slot hud-overlay"><slot name="overlay" /></div>
  <div class="hud-slot hud-bottom-left"><slot name="bottomLeading" /></div>
  <div class="hud-slot hud-bottom-right"><slot name="bottomTrailing" /></div>

  <slot />

  <SettingsPanel
    isOpen={showSettings}
    lang={effectiveLang}
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
  .hud-corner {
    position: absolute;
    z-index: 22;
  }
  .hud-top-left {
    top: 16px;
    left: 16px;
  }
  .hud-top-center {
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
  }
  .hud-top-right {
    top: 16px;
    right: 16px;
  }
  .hud-slot {
    position: absolute;
    z-index: 20;
    max-width: min(360px, 90vw);
  }
  .hud-info {
    top: 64px;
    left: 16px;
  }
  .hud-controls {
    top: 64px;
    right: 16px;
  }
  .hud-overlay {
    inset: 0;
    pointer-events: none !important;
    max-width: none;
  }
  .hud-bottom-left {
    bottom: 16px;
    left: 16px;
  }
  .hud-bottom-right {
    bottom: 16px;
    right: 16px;
  }

  /* Screen-reader-only live region — visually hidden but readable by AT. */
  .hud-sr-live {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Reduced-motion: disable HUD-specific transitions/animations when the
     user or OS has requested reduced motion. Mirrors the global
     [data-reduced-motion] rules but scoped to the HUD shell so child
     transitions (ViewSwitcher, HudButton hover, panel animations) are
     suppressed even when only the in-app setting is on. */
  .view-hud.reduced-motion :global(.vs-tab),
  .view-hud.reduced-motion :global(.vs-mobile-toggle),
  .view-hud.reduced-motion :global(.vs-mobile-item),
  .view-hud.reduced-motion :global(.hud-btn),
  .view-hud.reduced-motion :global(.hud-panel-anim) {
    transition: none !important;
    animation: none !important;
  }

  /* High-contrast theme hook: boost HUD element borders/focus to meet WCAG
     1.4.11 (Non-text Contrast). The global [data-high-contrast] rules cover
     generic elements; these target HUD-specific classes that use
     semi-transparent borders invisible under high-contrast. */
  .view-hud.high-contrast :global(.hud-btn) {
    border: 2px solid #ffffff !important;
    color: #ffffff !important;
  }
  .view-hud.high-contrast :global(.hud-btn:focus) {
    outline: 3px solid #ffff00 !important;
    outline-offset: 2px;
  }
  .view-hud.high-contrast :global(.vs-tab),
  .view-hud.high-contrast :global(.vs-mobile-toggle) {
    border: 2px solid #ffffff !important;
    color: #ffffff !important;
  }
  .view-hud.high-contrast :global(.vs-tab.is-active),
  .view-hud.high-contrast :global(.vs-mobile-item.is-active) {
    background: #ffff00 !important;
    color: #000000 !important;
    border-color: #ffff00 !important;
  }
  .view-hud.high-contrast :global(.vs-tab:focus),
  .view-hud.high-contrast :global(.vs-mobile-toggle:focus),
  .view-hud.high-contrast :global(.vs-mobile-item:focus) {
    outline: 3px solid #ffff00 !important;
    outline-offset: 2px;
  }
</style>
