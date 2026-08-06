<script lang="ts">
  import { languages } from "@/i18n/ui";
  import { switchLocaleUrl, type AppLocale } from "@/i18n/routes";
  import { useTranslations } from "@/i18n/utils";

  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  $: t = Object.keys(translations).length
    ? (key: string) => translations[key] || key
    : useTranslations(lang);

  function changeLanguage(next: AppLocale) {
    window.location.href = switchLocaleUrl(new URL(window.location.href), next);
  }
</script>

<div class="lang-row" role="group" aria-label={t("settings.language")}>
  {#each Object.entries(languages) as [code, name] (code)}
    <button
      type="button"
      class="lang-btn"
      class:is-active={lang === code}
      aria-pressed={lang === code}
      on:click={() => changeLanguage(code as AppLocale)}
    >
      {name}
    </button>
  {/each}
</div>

<style>
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
  .lang-btn:focus-visible {
    outline: 2px solid var(--hud-cyan, #00f0ff);
    outline-offset: 2px;
  }
  .lang-btn.is-active {
    background: var(--hud-cyan, #00f0ff);
    color: #001011;
    border-color: var(--hud-cyan, #00f0ff);
  }
</style>
