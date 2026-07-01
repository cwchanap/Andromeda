<script lang="ts">
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import type { UiKey } from "@/i18n/ui";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";

  export let currentView: ViewId;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  let t = translations && Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  const tabs: { view: ViewId; key: UiKey; go: () => void }[] = [
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
