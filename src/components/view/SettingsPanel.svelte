<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { type AppLocale } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";
  import LanguageOptions from "@/components/LanguageOptions.svelte";
  import { focusTrap } from "@/lib/hud/focusTrap";
  import { gameState } from "@/stores/gameStore";
  import Panel from "@/components/ui/Panel.svelte";

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
      <Panel title={t("settings.title")}>
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
              class="ui-btn close-btn"
              on:click={() => dispatch("close")}
            >
              {t("action.close")}
            </button>
          </div>
        </div>
      </Panel>
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
    padding: 72px 16px 16px;
    background: var(--color-scrim);
    /* Re-enable pointer events: the shared Settings panel is rendered inside
       .view-hud, which sets pointer-events: none and only re-enables it for
       .ui-corner/.ui-slot children. Without this, clicks on the language
       buttons, close button, and slotted controls pass through to the scene. */
    pointer-events: auto;
  }
  .settings-panel {
    width: min(360px, 92vw);
  }
  .settings-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .settings-heading {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    color: var(--color-accent);
    text-transform: uppercase;
  }
  .settings-actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
