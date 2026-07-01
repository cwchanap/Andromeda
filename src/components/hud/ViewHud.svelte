<script lang="ts">
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";
  import HudButton from "./HudButton.svelte";
  import ViewSwitcher from "./ViewSwitcher.svelte";
  import SettingsPanel from "./SettingsPanel.svelte";

  type Translate = (key: string) => string;

  export let currentView: ViewId;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  let t: Translate =
    translations && Object.keys(translations).length
      ? (key) => translations[key] || key
      : (useTranslations(lang) as Translate);

  let showSettings = false;

  function goHome() {
    window.location.href = routes.home(lang);
  }
</script>

<div class="view-hud">
  <div class="hud-corner hud-top-left">
    <HudButton bracket ariaLabel={t("controls.backToMenu")} on:click={goHome}>
      {t("controls.backToMenu")}
    </HudButton>
  </div>

  <div class="hud-corner hud-top-center">
    <ViewSwitcher {currentView} {lang} {translations} />
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
  @media (max-width: 768px) {
    .hud-top-center {
      display: none;
    }
  }
</style>
