<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { settings, gameActions } from '../stores/gameStore';
  import { solarSystemData } from '../lib/planetary-system/SolarSystem';
  import type { CelestialBodyData } from '../types/game';

  interface KeyboardNavigationProps {
    onPlanetSelect?: (planet: CelestialBodyData) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetView?: () => void;
    currentSelectedIndex?: number;
  }

  export let onPlanetSelect: KeyboardNavigationProps['onPlanetSelect'] = undefined;
  export let onZoomIn: KeyboardNavigationProps['onZoomIn'] = undefined;
  export let onZoomOut: KeyboardNavigationProps['onZoomOut'] = undefined;
  export let onResetView: KeyboardNavigationProps['onResetView'] = undefined;
  export let currentSelectedIndex: number = -1;

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
        announceToScreenReader('Zoomed in');
        break;
      
      case '-':
        event.preventDefault();
        if (onZoomOut) onZoomOut();
        announceToScreenReader('Zoomed out');
        break;
      
      case '0':
        event.preventDefault();
        if (onResetView) onResetView();
        announceToScreenReader('View reset to default position');
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
    announceToScreenReader(`Selected ${body.name}. ${body.description}`);
    
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
    announceToScreenReader(`Selected ${body.name}. ${body.description}`);
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function navigateToFirst() {
    if (celestialBodies.length === 0) return;
    
    selectedIndex = 0;
    const body = celestialBodies[selectedIndex];
    announceToScreenReader(`Selected first celestial body: ${body.name}. ${body.description}`);
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function navigateToLast() {
    if (celestialBodies.length === 0) return;
    
    selectedIndex = celestialBodies.length - 1;
    const body = celestialBodies[selectedIndex];
    announceToScreenReader(`Selected last celestial body: ${body.name}. ${body.description}`);
    
    if (onPlanetSelect) {
      onPlanetSelect(body);
    }
  }

  function selectCurrentPlanet() {
    if (selectedIndex >= 0 && selectedIndex < celestialBodies.length) {
      const body = celestialBodies[selectedIndex];
      announceToScreenReader(`Opened information for ${body.name}`);
      gameActions.selectCelestialBody(body);
      gameActions.showInfoModal(true);
    }
  }

  function clearSelection() {
    selectedIndex = -1;
    announceToScreenReader('Selection cleared');
    gameActions.showInfoModal(false);
  }

  function showHelp() {
    const helpMessage = `
      Keyboard controls: 
      Arrow keys to navigate between planets. 
      Enter or Space to select. 
      Plus to zoom in, Minus to zoom out. 
      Zero to reset view. 
      Home for first planet, End for last planet. 
      H for help, Escape to clear selection.
    `;
    announceToScreenReader(helpMessage);
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
    <h3 class="mb-2 text-sm font-semibold">Keyboard Controls</h3>
    <ul class="space-y-1 text-xs">
      <li>Arrow keys: Navigate planets</li>
      <li>Enter/Space: Select planet</li>
      <li>+/-: Zoom in/out</li>
      <li>0: Reset view</li>
      <li>Home/End: First/last planet</li>
      <li>H: Show help</li>
      <li>Escape: Clear selection</li>
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
