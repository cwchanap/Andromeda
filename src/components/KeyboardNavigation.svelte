<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { settings, gameActions } from '../stores/gameStore';
  import { solarSystemData } from '../lib/planetary-system/SolarSystem';
  import type { CelestialBodyData } from '../types/game';
  import { getLangFromUrl, useTranslations } from '../i18n/utils';
  import type { AppLocale } from '../i18n/routes';

  interface KeyboardNavigationProps {
    onPlanetSelect?: (planet: CelestialBodyData) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetView?: () => void;
    currentSelectedIndex?: number;
    lang?: AppLocale;
    translations?: Record<string, string>;
  }

  export let onPlanetSelect: KeyboardNavigationProps['onPlanetSelect'] = undefined;
  export let onZoomIn: KeyboardNavigationProps['onZoomIn'] = undefined;
  export let onZoomOut: KeyboardNavigationProps['onZoomOut'] = undefined;
  export let onResetView: KeyboardNavigationProps['onResetView'] = undefined;
  export let currentSelectedIndex: number = -1;
  export let lang: AppLocale = 'en';
  export let translations: Record<string, string> = {};

  // Translation function — uses prop translations if provided, otherwise
  // resolves from the URL locale.
  let t: (key: string) => string;
  $: if (Object.keys(translations).length > 0) {
    t = (key: string) => translations[key] || key;
  } else {
    let currentLang = lang;
    if (typeof window !== 'undefined') {
      currentLang = getLangFromUrl(new URL(window.location.href));
    }
    const tt = useTranslations(currentLang);
    t = (key: string) => tt(key) as string;
  }

  // Interpolate {name} and {description} placeholders in i18n strings
  const tf = (key: string, vars: Record<string, string> = {}) => {
    let s = t(key);
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, v);
    }
    return s;
  };

  let isEnabled = true;
  let celestialBodies: CelestialBodyData[] = [];
  let selectedIndex = currentSelectedIndex;
  let announceElement: HTMLElement;

  // Subscribe to settings for keyboard navigation toggle
  $: isEnabled = $settings.enableKeyboardNavigation;

  // Build list of celestial bodies for navigation
  onMount(() => {
    celestialBodies = [solarSystemData.star, ...solarSystemData.celestialBodies];
    selectedIndex = currentSelectedIndex >= 0 ? currentSelectedIndex : -1;
  });

  // Update selected index when prop changes
  $: selectedIndex = currentSelectedIndex;

  function announceToScreenReader(message: string) {
    if ($settings.announceSceneChanges && announceElement) {
      announceElement.textContent = message;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isEnabled) return;

    // Only handle if not in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        navigatePrevious();
        break;
      
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        navigateNext();
        break;
      
      case 'Enter':
      case ' ': // Space key
        event.preventDefault();
        selectCurrentPlanet();
        break;
      
      case 'Home':
        event.preventDefault();
        navigateToFirst();
        break;
      
      case 'End':
        event.preventDefault();
        navigateToLast();
        break;
      
      case '+':
      case '=':
        event.preventDefault();
        if (onZoomIn) onZoomIn();
        announceToScreenReader(t('keyboard.srZoomedIn'));
        break;
      
      case '-':
        event.preventDefault();
        if (onZoomOut) onZoomOut();
        announceToScreenReader(t('keyboard.srZoomedOut'));
        break;
      
      case '0':
        event.preventDefault();
        if (onResetView) onResetView();
        announceToScreenReader(t('keyboard.srViewReset'));
        break;
      
      case 'h':
      case 'H':
        event.preventDefault();
        showHelp();
        break;
      
      case 'Escape':
        event.preventDefault();
        clearSelection();
        break;
    }
  }

  function navigatePrevious() {
    if (celestialBodies.length === 0) return;
    
    selectedIndex = selectedIndex <= 0 
      ? celestialBodies.length - 1 
      : selectedIndex - 1;
    
    const body = celestialBodies[selectedIndex];
    announceToScreenReader(tf('keyboard.srSelected', { name: body.name, description: body.description }));
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function navigateNext() {
    if (celestialBodies.length === 0) return;
    
    selectedIndex = selectedIndex >= celestialBodies.length - 1 
      ? 0 
      : selectedIndex + 1;
    
    const body = celestialBodies[selectedIndex];
    announceToScreenReader(tf('keyboard.srSelected', { name: body.name, description: body.description }));
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function navigateToFirst() {
    if (celestialBodies.length === 0) return;
    
    selectedIndex = 0;
    const body = celestialBodies[selectedIndex];
    announceToScreenReader(tf('keyboard.srSelectedFirst', { name: body.name, description: body.description }));
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function navigateToLast() {
    if (celestialBodies.length === 0) return;
    
    selectedIndex = celestialBodies.length - 1;
    const body = celestialBodies[selectedIndex];
    announceToScreenReader(tf('keyboard.srSelectedLast', { name: body.name, description: body.description }));
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function selectCurrentPlanet() {
    if (selectedIndex >= 0 && selectedIndex < celestialBodies.length) {
      const body = celestialBodies[selectedIndex];
      announceToScreenReader(tf('keyboard.srOpenedInfo', { name: body.name }));
      gameActions.selectCelestialBody(body);
      gameActions.showInfoModal(true);
    }
  }

  function clearSelection() {
    selectedIndex = -1;
    announceToScreenReader(t('keyboard.srSelectionCleared'));
    gameActions.showInfoModal(false);
  }

  function showHelp() {
    announceToScreenReader(t('keyboard.srHelp'));
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });
</script>

<!-- Screen reader announcements -->
<div 
  bind:this={announceElement}
  aria-live="polite" 
  aria-atomic="true" 
  class="sr-only"
></div>

<!-- Keyboard navigation instructions (visible when screen reader mode is enabled) -->
{#if $settings.screenReaderMode}
  <div class="fixed bottom-4 left-4 max-w-md rounded-lg bg-black/80 p-4 text-white">
    <h3 class="mb-2 text-sm font-semibold">{t('keyboard.controls')}</h3>
    <ul class="space-y-1 text-xs">
      <li>{t('keyboard.arrowKeys')}</li>
      <li>{t('keyboard.enterSpace')}</li>
      <li>{t('keyboard.zoom')}</li>
      <li>{t('keyboard.resetView')}</li>
      <li>{t('keyboard.firstLast')}</li>
      <li>{t('keyboard.help')}</li>
      <li>{t('keyboard.escape')}</li>
    </ul>
  </div>
{/if}

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
