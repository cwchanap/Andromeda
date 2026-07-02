<script lang="ts">
  import { tick } from "svelte";
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

  // Each entry is a full-page navigation target (no client router — see spec
  // "Non-goals"). Using real <a href> links gives correct navigation semantics
  // (role="link" + aria-current="page") and works without JS, replacing the
  // earlier role="tablist" which is semantically wrong for page navigation.
  const tabs: { view: ViewId; key: UiKey; href: () => string }[] = [
    { view: "star", key: "viewSwitcher.star", href: () => routes.planetarySystem("solar", lang) },
    { view: "galaxy", key: "viewSwitcher.galaxy", href: () => routes.galaxy(lang) },
    { view: "constellation", key: "viewSwitcher.constellation", href: () => routes.constellation(lang) },
  ];

  // Mobile dropdown state. Desktop keeps the always-visible horizontal nav;
  // on narrow viewports the switcher collapses to a button that reveals the
  // links in a vertical dropdown with full WAI-ARIA menu semantics
  // (role="menu" + role="menuitem", arrow-key navigation, roving tabindex).
  let mobileOpen = false;
  $: activeTab = tabs.find((tab) => tab.view === currentView) ?? tabs[0];

  // Roving tabindex: the active (or first) item is tabbable; the rest are
  // focusable only via arrow keys. focusIndex tracks which item the menu
  // currently "rests" on.
  let focusIndex = 0;
  let triggerEl: HTMLButtonElement | null = null;
  let menuItems: HTMLAnchorElement[] = [];
  let mobileEl: HTMLElement | null = null;

  function openMenu() {
    mobileOpen = true;
    focusIndex = tabs.findIndex((tab) => tab.view === currentView);
    if (focusIndex < 0) focusIndex = 0;
    // Wait for the {#if mobileOpen} block to render the menu items, then
    // move focus to the resting item (roving tabindex entry point).
    tick().then(() => menuItems[focusIndex]?.focus());
  }

  function closeMenu() {
    mobileOpen = false;
    // Return focus to the trigger so keyboard users aren't stranded.
    triggerEl?.focus();
  }

  function toggleMobile() {
    if (mobileOpen) closeMenu();
    else openMenu();
  }

  function focusMenuItem(index: number) {
    focusIndex = ((index % tabs.length) + tabs.length) % tabs.length;
    menuItems[focusIndex]?.focus();
  }

  function onMenuKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusMenuItem(focusIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusMenuItem(focusIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusMenuItem(0);
        break;
      case "End":
        event.preventDefault();
        focusMenuItem(tabs.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
    }
  }

  // Close the mobile menu when clicking outside of it. Uses a contains()
  // check rather than stopPropagation so the toggle's own click handler
  // (which opens/closes the menu) is not interfered with.
  function onWindowClick(event: MouseEvent) {
    if (mobileOpen && mobileEl && !mobileEl.contains(event.target as Node)) {
      closeMenu();
    }
  }
</script>

<svelte:window on:click={onWindowClick} />

<!-- Desktop: horizontal navigation (always visible). -->
<nav class="view-switcher" aria-label={t("viewSwitcher.label")}>
  <span class="vs-label">{t("viewSwitcher.label")}</span>
  {#each tabs as tab (tab.view)}
    <a
      class="vs-tab"
      class:is-active={currentView === tab.view}
      href={currentView === tab.view ? undefined : tab.href()}
      aria-current={currentView === tab.view ? "page" : undefined}
    >
      {t(tab.key)}
    </a>
  {/each}
</nav>

<!-- Mobile: collapsed dropdown button + popover menu. -->
<div class="view-switcher-mobile" bind:this={mobileEl}>
  <button
    type="button"
    class="vs-mobile-toggle"
    bind:this={triggerEl}
    aria-expanded={mobileOpen}
    aria-haspopup="menu"
    aria-label={t("viewSwitcher.label")}
    on:click={toggleMobile}
    on:keydown={(e) => { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(); } }}
  >
    <span class="vs-mobile-label">{t("viewSwitcher.label")}</span>
    <span class="vs-mobile-current">{t(activeTab.key)}</span>
    <span class="vs-mobile-chevron" aria-hidden="true">{mobileOpen ? "▲" : "▼"}</span>
  </button>
  {#if mobileOpen}
    <div
      class="vs-mobile-menu"
      role="menu"
      tabindex="-1"
      aria-label={t("viewSwitcher.label")}
      on:keydown={onMenuKeydown}
    >
      {#each tabs as tab, i (tab.view)}
        <a
          class="vs-mobile-item"
          class:is-active={currentView === tab.view}
          href={tab.href()}
          role="menuitem"
          tabindex={i === focusIndex ? 0 : -1}
          aria-current={currentView === tab.view ? "page" : undefined}
          bind:this={menuItems[i]}
          on:click={() => (mobileOpen = false)}
          on:focus={() => (focusIndex = i)}
        >
          {t(tab.key)}
        </a>
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
    display: inline-block;
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
  .vs-tab:hover {
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
