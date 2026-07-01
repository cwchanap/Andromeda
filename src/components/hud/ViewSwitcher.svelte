<script lang="ts">
  import type { AppLocale } from "@/i18n/routes";
  import { routes } from "@/i18n/routes";
  import type { UiKey } from "@/i18n/ui";
  import { useTranslations } from "@/i18n/utils";
  import type { ViewId } from "@/lib/view/currentView";

  export let currentView: ViewId;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  let t: (key: string) => string;
  // Reactive: recompute when lang or translations change.
  $: t = translations && Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  const tabs: { view: ViewId; key: UiKey; go: () => void }[] = [
    { view: "star", key: "viewSwitcher.star", go: () => { window.location.href = routes.planetarySystem("solar", lang); } },
    { view: "galaxy", key: "viewSwitcher.galaxy", go: () => { window.location.href = routes.galaxy(lang); } },
    { view: "constellation", key: "viewSwitcher.constellation", go: () => { window.location.href = routes.constellation(lang); } },
  ];

  // Mobile dropdown state. Desktop keeps the always-visible horizontal
  // tablist; on narrow viewports the switcher collapses to a button that
  // reveals the tabs in a vertical dropdown.
  let mobileOpen = false;
  $: activeTab = tabs.find((tab) => tab.view === currentView) ?? tabs[0];

  function toggleMobile() {
    mobileOpen = !mobileOpen;
  }

  function onMobileKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") mobileOpen = false;
  }

  // WAI-ARIA Tabs keyboard model: roving tabindex + arrow-key activation.
  function onTabKeydown(event: KeyboardEvent, index: number) {
    const handled = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!handled.includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    const tablist = (event.currentTarget as HTMLElement).parentElement;
    const buttons = tablist?.querySelectorAll<HTMLButtonElement>(
      'button[role="tab"]',
    );
    buttons?.[next]?.focus();
    tabs[next].go();
  }
</script>

<!-- Desktop: horizontal tablist (always visible). -->
<div class="view-switcher" role="tablist" aria-label={t("viewSwitcher.label")}>
  <span class="vs-label">{t("viewSwitcher.label")}</span>
  {#each tabs as tab, i (tab.view)}
    <button
      type="button"
      role="tab"
      aria-selected={currentView === tab.view}
      class="vs-tab"
      class:is-active={currentView === tab.view}
      tabindex={currentView === tab.view ? 0 : -1}
      on:click={tab.go}
      on:keydown={(e) => onTabKeydown(e, i)}
    >
      {t(tab.key)}
    </button>
  {/each}
</div>

<!-- Mobile: collapsed dropdown button + popover panel. -->
<div class="view-switcher-mobile" on:keydown={onMobileKeydown}>
  <button
    type="button"
    class="vs-mobile-toggle"
    aria-expanded={mobileOpen}
    aria-haspopup="menu"
    aria-label={t("viewSwitcher.label")}
    on:click={toggleMobile}
  >
    <span class="vs-mobile-label">{t("viewSwitcher.label")}</span>
    <span class="vs-mobile-current">{t(activeTab.key)}</span>
    <span class="vs-mobile-chevron" aria-hidden="true">{mobileOpen ? "▲" : "▼"}</span>
  </button>
  {#if mobileOpen}
    <div class="vs-mobile-menu" role="menu" aria-label={t("viewSwitcher.label")}>
      {#each tabs as tab, i (tab.view)}
        <button
          type="button"
          role="menuitem"
          class="vs-mobile-item"
          class:is-active={currentView === tab.view}
          aria-current={currentView === tab.view ? "page" : undefined}
          on:click={() => { mobileOpen = false; tab.go(); }}
          on:keydown={(e) => onTabKeydown(e, i)}
        >
          {t(tab.key)}
        </button>
      {/each}
    </div>
  {/if}
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

  /* Mobile dropdown — hidden on desktop, shown on narrow viewports. */
  .view-switcher-mobile {
    display: none;
    position: relative;
  }
  .vs-mobile-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(0, 0, 17, 0.6);
    border: 1px solid var(--hud-cyan, #00f0ff);
    border-radius: 6px;
    backdrop-filter: blur(8px);
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  .vs-mobile-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--hud-cyan, #00f0ff);
    opacity: 0.7;
  }
  .vs-mobile-current {
    color: var(--hud-cyan, #00f0ff);
  }
  .vs-mobile-chevron {
    font-size: 9px;
    opacity: 0.7;
  }
  .vs-mobile-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    min-width: 140px;
    padding: 4px;
    background: rgba(0, 0, 17, 0.95);
    border: 1px solid var(--hud-cyan, #00f0ff);
    border-radius: 6px;
    backdrop-filter: blur(8px);
    z-index: 30;
  }
  .vs-mobile-item {
    background: transparent;
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    letter-spacing: 0.08em;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
  }
  .vs-mobile-item:hover {
    color: var(--hud-cyan, #00f0ff);
    border-color: var(--hud-cyan, #00f0ff);
  }
  .vs-mobile-item.is-active {
    color: #001011;
    background: var(--hud-cyan, #00f0ff);
    border-color: var(--hud-cyan, #00f0ff);
  }

  @media (max-width: 768px) {
    .view-switcher {
      display: none;
    }
    .view-switcher-mobile {
      display: block;
    }
  }
</style>
