<script lang="ts">
  import { languages } from '../i18n/ui';
  import { getLangFromUrl, useTranslations } from '../i18n/utils';
  import { switchLocalePath, type AppLocale } from '../i18n/routes';
  import { onMount } from 'svelte';
  
  let showLanguageSelector = false;
  let currentLang: AppLocale = 'en';
  let t: (key: any, replacements?: Record<string, string>) => string;
  
  onMount(() => {
    if (typeof window !== 'undefined') {
      currentLang = getLangFromUrl(new URL(window.location.href));
      t = useTranslations(currentLang);
    }
  });
  
  function handleLanguageChange(newLang: AppLocale) {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const newPath = `${switchLocalePath(currentUrl.pathname, newLang)}${currentUrl.search}${currentUrl.hash}`;
      window.location.href = newPath;
    }
    showLanguageSelector = false;
  }
  
  function toggleLanguageSelector() {
    showLanguageSelector = !showLanguageSelector;
  }
  
  function closeLanguageSelector() {
    showLanguageSelector = false;
  }
  
  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeLanguageSelector();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative">
  <!-- Language Toggle Button -->
  <button
    on:click={toggleLanguageSelector}
    class="flex items-center gap-2 rounded-lg border border-white/30 bg-black/30 px-4 py-2 text-sm text-white backdrop-blur-md transition-all duration-300 hover:border-white/50 hover:bg-black/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
    aria-label={t ? t('aria.languageSelector') : 'Language selector'}
    aria-expanded={showLanguageSelector}
  >
    <span class="text-lg">🌐</span>
    <span class="hidden sm:inline font-medium">{languages[currentLang]}</span>
    <span class="text-xs opacity-60 transition-transform duration-200 {showLanguageSelector ? 'rotate-180' : ''}">▼</span>
  </button>
  
  <!-- Language Dropdown -->
  {#if showLanguageSelector}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-sm rounded-lg bg-gray-900 p-6 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">
            {t ? t('language.select') : 'Select Language'}
          </h3>
          <button
            on:click={closeLanguageSelector}
            class="text-gray-400 hover:text-white"
            aria-label={t ? t('aria.close') : 'Close'}
          >
            ✕
          </button>
        </div>
        
        <div class="space-y-2">
          {#each Object.entries(languages) as [langCode, langName]}
            <button
              on:click={() => handleLanguageChange(langCode as AppLocale)}
              class="w-full rounded-lg border border-white/20 bg-white/5 p-3 text-left transition-all duration-300 hover:border-white/40 hover:bg-white/10 {currentLang === langCode ? 'ring-2 ring-blue-400' : ''}"
            >
              <div class="flex items-center justify-between">
                <span class="text-white">{langName}</span>
                {#if currentLang === langCode}
                  <span class="text-blue-400">✓</span>
                {/if}
              </div>
              {#if currentLang === langCode}
                <div class="mt-1 text-xs text-gray-400">
                  {t ? t('language.current', { language: langName }) : `Current: ${langName}`}
                </div>
              {/if}
            </button>
          {/each}
        </div>
        
        <div class="mt-4 text-center">
          <button
            on:click={closeLanguageSelector}
            class="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            {t ? t('action.cancel') : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure proper stacking for the dropdown */
  .z-50 {
    z-index: 50;
  }
</style>
