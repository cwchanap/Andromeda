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

<div class="lang-row ui-segmented" role="group" aria-label={t("settings.language")}>
  {#each Object.entries(languages) as [code, name] (code)}
    <button
      type="button"
      class="lang-btn ui-segment"
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
    width: 100%;
  }
  .lang-btn {
    flex: 1;
  }
</style>
