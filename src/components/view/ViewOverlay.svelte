<script lang="ts">
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";
  import { gameState, settings } from "@/stores/gameStore";
  import Button from "@/components/ui/Button.svelte";
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
  // settings store so the HUD shell reflects in-app user preferences without
  // each child re-querying matchMedia. OS-level preferences (when the user
  // has NOT toggled the in-app setting) are handled via @media queries in the
  // style block below, since AccessibilityManager only writes data-system-*
  // attributes and does not sync $settings.
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
  <div class="ui-sr-live" aria-live="polite" aria-atomic="true">
    {announcement}
  </div>

  <div class="ui-corner ui-top-left">
    <Button variant="ghost" ariaLabel={t("controls.backToMenu")} on:click={goHome}>
      {t("controls.backToMenu")}
    </Button>
  </div>

  <div class="ui-corner ui-top-center">
    <ViewSwitcher currentView={effectiveView} lang={effectiveLang} {translations} />
  </div>

  <div class="ui-corner ui-top-right">
    <Button ariaLabel={t("nav.settings")} on:click={() => (showSettings = true)}>
      {t("nav.settings")}
    </Button>
  </div>

  <div class="ui-slot ui-info"><slot name="info" /></div>
  <div class="ui-slot ui-controls"><slot name="controls" /></div>
  <div class="ui-slot ui-overlay"><slot name="overlay" /></div>
  <div class="ui-slot ui-bottom-left"><slot name="bottomLeading" /></div>
  <div class="ui-slot ui-bottom-right"><slot name="bottomTrailing" /></div>

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
  .view-hud :global(.ui-corner),
  .view-hud :global(.ui-slot) {
    pointer-events: auto;
  }
  .ui-corner {
    position: absolute;
    z-index: 22;
  }
  .ui-top-left {
    top: 16px;
    left: 16px;
  }
  .ui-top-center {
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
  }
  .ui-top-right {
    top: 16px;
    right: 16px;
  }
  .ui-slot {
    position: absolute;
    z-index: 20;
    max-width: min(360px, 90vw);
  }
  .ui-info {
    top: 64px;
    left: 16px;
  }
  .ui-controls {
    top: 64px;
    right: 16px;
  }
  .ui-overlay {
    inset: 0;
    pointer-events: none !important;
    max-width: none;
  }
  .ui-bottom-left {
    bottom: 16px;
    left: 16px;
  }
  .ui-bottom-right {
    bottom: 16px;
    right: 16px;
  }

  /* Screen-reader-only live region — visually hidden but readable by AT. */
  .ui-sr-live {
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

  /* Reduced motion: suppress chrome transitions when the in-app setting is
     on. OS-level prefers-reduced-motion is handled by the token durations in
     tokens.css; high contrast is handled by token overrides in
     high-contrast.css, so no per-component colour rules are needed here. */
  .view-hud.reduced-motion :global(.vs-tab),
  .view-hud.reduced-motion :global(.vs-mobile-toggle),
  .view-hud.reduced-motion :global(.vs-mobile-item),
  .view-hud.reduced-motion :global(.ui-btn),
  .view-hud.reduced-motion :global(.ui-panel-anim) {
    transition: none !important;
    animation: none !important;
  }
</style>
