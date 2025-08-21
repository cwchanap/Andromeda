<script lang="ts">
  import { languages } from '../i18n/ui';
  import { getLangFromUrl, useTranslations, useTranslatedPath } from '../i18n/utils';
  import { onMount } from 'svelte';
  
  let showLanguageSelector = false;
  let currentLang: keyof typeof languages = 'en';
  let t: (key: any, replacements?: Record<string, string>) => string;
  let translatePath: (path: string, locale?: keyof typeof languages) => string;
  
  onMount(() => {
    if (typeof window !== 'undefined') {
      currentLang = getLangFromUrl(new URL(window.location.href));
      t = useTranslations(currentLang);
      translatePath = useTranslatedPath(currentLang);
    }
  });
  
  function handleLanguageChange(newLang: keyof typeof languages) {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const currentPath = currentUrl.pathname;
      
      // Remove current locale from path if it exists
      const pathSegments = currentPath.split('/');
      let cleanPath = currentPath;
      
      // Check if first segment is a locale and remove it
      if (pathSegments.length > 1 && pathSegments[1] in languages) {
        cleanPath = '/' + pathSegments.slice(2).join('/');
        // Handle root path case
        if (cleanPath === '/') {
          cleanPath = '';
        }
      }
      
      // Add new locale to path (only if not English)
      let newPath: string;
      if (newLang === 'en') {
        // For English, use the clean path without locale prefix
        newPath = cleanPath || '/';
      } else {
        // For other languages, add the locale prefix
        newPath = `/${newLang}${cleanPath || ''}`;
      }
      
      // Navigate to the new URL
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
              on:click={() => handleLanguageChange(langCode as keyof typeof languages)}
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
