<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { type AppLocale } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import LanguageOptions from "@/components/LanguageOptions.svelte";
  import { focusTrap } from "@/lib/hud/focusTrap";
  import { gameState } from "@/stores/gameStore";
  import HudPanel from "./HudPanel.svelte";

  export let isOpen = false;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  const dispatch = createEventDispatcher<{ close: void }>();

  type Translate = (key: string) => string;

  // Effective lang: prefer the shared $gameState store (written by wrapper
  // components on mount), fall back to the prop for direct/test usage.
  $: effectiveLang = ($gameState.hudLang as AppLocale | undefined) ?? lang;

  // Reactive translation helper — recomputes when effective lang/translations change.
  let t: Translate;
  $: t =
    translations && Object.keys(translations).length
      ? (key: string) => translations[key] || key
      : (useTranslations(effectiveLang) as Translate);

  function handleKeydown(event: KeyboardEvent) {
    // Only react to Escape while the panel is open.
    if (isOpen && event.key === "Escape") dispatch("close");
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div
    class="settings-overlay"
    use:focusTrap={".close-btn"}
    on:click={(e) => {
      if (e.target === e.currentTarget) dispatch("close");
    }}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label={t("settings.title")}
    tabindex="-1"
  >
    <div class="settings-panel">
      <HudPanel title={t("settings.title")} color="var(--hud-cyan)">
        <div class="settings-body">
          <section class="settings-section">
            <h4 class="settings-heading">{t("settings.language")}</h4>
            <LanguageOptions lang={effectiveLang} {translations} />
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
    /* Re-enable pointer events: the shared Settings panel is rendered inside
       .view-hud, which sets pointer-events: none and only re-enables it for
       .hud-corner/.hud-slot children. Without this, clicks on the language
       buttons, close button, and slotted controls pass through to the scene. */
    pointer-events: auto;
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
