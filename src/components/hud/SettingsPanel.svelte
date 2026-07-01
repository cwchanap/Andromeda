<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { languages } from "@/i18n/ui";
  import { switchLocalePath, type AppLocale } from "@/i18n/routes";
  import { getLangFromUrl, useTranslations } from "@/i18n/utils";
  import HudPanel from "./HudPanel.svelte";

  export let isOpen = false;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  const dispatch = createEventDispatcher<{ close: void }>();

  type Translate = (key: string) => string;

  const hasOverride =
    translations && Object.keys(translations).length > 0;

  const t: Translate = hasOverride
    ? (key: string) => translations[key] || key
    : (useTranslations(lang) as Translate);

  let currentLang: AppLocale = lang;
  if (typeof window !== "undefined") {
    try {
      currentLang = getLangFromUrl(new URL(window.location.href));
    } catch {
      /* keep prop fallback */
    }
  }

  function changeLanguage(newLang: AppLocale) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    window.location.href = `${switchLocalePath(
      url.pathname,
      newLang,
    )}${url.search}${url.hash}`;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div
    class="settings-overlay"
    on:click={(e) => {
      if (e.target === e.currentTarget) dispatch("close");
    }}
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
            <slot name="settings" />
          </section>

          <div class="settings-actions">
            <button
              type="button"
              class="close-btn"
              on:click={() => dispatch("close")}
            >
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
  .settings-panel {
    width: min(320px, 90vw);
  }
  .settings-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .settings-heading {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.2em;
    color: var(--hud-cyan, #00f0ff);
    text-transform: uppercase;
  }
  .lang-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
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
  .settings-actions {
    display: flex;
    justify-content: flex-end;
  }
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
