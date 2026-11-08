<script lang="ts">
  import Button from "@/components/ui/Button.svelte";
  import SettingsModal from "@/components/SettingsModal.svelte";
  import AccessibilityManager from "@/components/AccessibilityManager.svelte";
  import ExploreSystems from "@/components/ExploreSystems.svelte";
  import { gameState, settings, gameActions } from "@/stores/gameStore";
  import { onMount, onDestroy } from "svelte";
  import { getLangFromUrl, useTranslations } from "@/i18n/utils";
  import { routes, type AppLocale } from "@/i18n/routes";
  import type { GameSettings } from "@/stores/gameStore";

  // Accept language as prop and pre-computed translations
  export let lang: AppLocale = 'en';
  export let translations: Record<string, string> = {};

  let showSettings = false;
  let showSystemSelector = false;
  let focusedIndex = 0; // Track which button is focused for keyboard navigation
  let currentLang: AppLocale = lang;
  let t: (key: any, replacements?: Record<string, string>) => string;

  // Initialize translations immediately with props or fallback
  $: {
    currentLang = lang;
    if (Object.keys(translations).length > 0) {
      // Use pre-computed translations
      t = (key: string) => translations[key] || key;
    } else {
      // Fallback to utility function
      t = useTranslations(currentLang);
    }
  }

  onMount(() => {
    // Fallback to URL-based detection if props not provided
    if (typeof window !== 'undefined' && !lang) {
      currentLang = getLangFromUrl(new URL(window.location.href));
      t = useTranslations(currentLang);
    }
  });

  const handleStartGame = () => {
    gameActions.navigateToView("solar-system");
    window.location.href = routes.planetarySystem("solar", currentLang);
  };

  const handleSystemSelector = () => {
    showSystemSelector = true;
  };

  const handleGalaxyView = () => {
    window.location.href = routes.galaxy(currentLang);
  };

  const handleConstellationView = () => {
    window.location.href = routes.constellation(currentLang);
  };

  const handleSelectSystem = (systemId: string) => {
    gameActions.navigateToView("solar-system"); // Use existing type
    showSystemSelector = false;
    window.location.href = routes.planetarySystem(systemId, currentLang);
  };

  const handleCloseSystemSelector = () => {
    showSystemSelector = false;
  };

  const handleOpenSettings = () => {
    showSettings = true;
  };

  const handleCloseSettings = () => {
    showSettings = false;
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    gameActions.updateSettings(newSettings);
  };
  
  $: menuItems = [
    { label: t ? t('main.solar') : 'Solar System', action: handleStartGame, numeral: 'I' },
    { label: t ? t('main.explore') : 'Explore Systems', action: handleSystemSelector, numeral: 'II' },
    { label: t ? t('main.galaxy') : 'Galaxy View', action: handleGalaxyView, numeral: 'III' },
    { label: t ? t('constellation.title') : 'Constellation View', action: handleConstellationView, numeral: 'IV' },
  ];

  function handleKeyDown(event: KeyboardEvent) {
    if (!$settings.enableKeyboardNavigation) return;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        focusedIndex = (focusedIndex + 1) % menuItems.length;
        updateFocus();
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        focusedIndex = focusedIndex === 0 ? menuItems.length - 1 : focusedIndex - 1;
        updateFocus();
        break;
      // Enter/Space are intentionally not handled here. Native <button>
      // activation invokes each destination button's own on:click, which
      // avoids dispatching a potentially stale focusedIndex action when the
      // user tabs to a non-first button instead of using arrow keys.
    }
  }

  function updateFocus() {
    const buttons = document.querySelectorAll('.menu-button');
    if (buttons[focusedIndex]) {
      (buttons[focusedIndex] as HTMLElement).focus();
    }
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

<div class="home">
  <!-- Star-chart line art (decorative) -->
  <svg class="home-chart" viewBox="0 0 760 760" aria-hidden="true">
    <g class="chart-lines">
      <circle cx="380" cy="380" r="360"></circle>
      <circle cx="380" cy="380" r="270"></circle>
      <circle cx="380" cy="380" r="180"></circle>
      <line x1="20" y1="380" x2="740" y2="380"></line>
      <line x1="380" y1="20" x2="380" y2="740"></line>
      <path d="M120 230 L210 170 L300 200 L360 120 L450 150"></path>
    </g>
    <g class="chart-stars">
      <circle cx="120" cy="230" r="2.5"></circle>
      <circle cx="210" cy="170" r="3"></circle>
      <circle cx="300" cy="200" r="2"></circle>
      <circle cx="360" cy="120" r="3.5"></circle>
      <circle cx="450" cy="150" r="2.5"></circle>
      <circle cx="560" cy="300" r="1.5"></circle>
      <circle cx="620" cy="520" r="1.5"></circle>
      <circle cx="250" cy="560" r="1.5"></circle>
    </g>
  </svg>

  <header class="home-header">
    <span class="ui-caption home-wordmark">✦ {t ? t('main.title') : 'Andromeda'}</span>
    <div class="home-settings-control">
      <Button aria-describedby="settings-desc" on:click={handleOpenSettings}>
        {t ? t('main.settings') : 'Settings'}
      </Button>
    </div>
  </header>

  <main class="home-main">
    <p class="ui-caption menu-subtitle">{t ? t('main.subtitle') : 'Space Explorer'}</p>
    <h1 class="menu-title">{t ? t('main.title') : 'Andromeda'}</h1>
    <p class="menu-description">
      {t ? t('main.description') : 'Embark on an epic journey through multiple planetary systems and discover exoplanets through immersive 3D visualization. From our Solar System to Alpha Centauri and beyond the stars!'}
    </p>

    <nav class="home-command-hub" aria-label={t ? t('main.command') : 'Navigation'}>
      {#each menuItems as item, index}
        <button
          type="button"
          class="menu-button"
          class:is-first={index === 0}
          aria-describedby={[
            "start-game-desc",
            "systems-desc",
            "galaxy-desc",
            "constellation-desc",
          ][index]}
          on:click={item.action}
        >
          <span class="menu-numeral" aria-hidden="true">{item.numeral}</span>
          <span class="menu-label">{item.label}</span>
          <span class="menu-arrow" aria-hidden="true">→</span>
        </button>
      {/each}
    </nav>
  </main>

  <!-- Hidden accessibility descriptions -->
  <div id="start-game-desc" class="sr-only">
    {t ? t('aria.startGame') : 'Explore our home solar system with all planets and the Sun'}
  </div>
  <div id="systems-desc" class="sr-only">
    {t ? t('aria.systems') : 'Choose from Alpha Centauri, Kepler systems, and other exoplanet systems'}
  </div>
  <div id="galaxy-desc" class="sr-only">
    {t ? t('aria.galaxy') : 'View nearby star systems in 3D galactic perspective'}
  </div>
  <div id="constellation-desc" class="sr-only">
    {t ? t('aria.constellation') : 'View constellations from your current location and time'}
  </div>
  <div id="settings-desc" class="sr-only">
    {t ? t('aria.settings') : 'Adjust graphics, audio, and accessibility options'}
  </div>

  <!-- Accessibility Manager -->
  <AccessibilityManager />

  <!-- Settings Modal -->
  <SettingsModal
    isOpen={showSettings}
    on:close={handleCloseSettings}
    on:save={(event) => handleSaveSettings(event.detail)}
    currentSettings={$settings}
    lang={currentLang}
    {translations}
  />

  <!-- System Selector Modal -->
  {#if showSystemSelector}
    <ExploreSystems
      {t}
      onSelect={handleSelectSystem}
      onClose={handleCloseSystemSelector}
    />
  {/if}

  <!-- Screen Reader Instructions -->
  {#if $settings.screenReaderMode}
    <div class="sr-only" aria-live="polite">
      {t ? t('sr.mainMenuLoaded') : 'Main menu loaded. Use Tab key to navigate between buttons, or arrow keys for quick navigation.'}
    </div>
  {/if}
</div>

<style>
  .home {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: radial-gradient(ellipse at 70% 40%, var(--color-surface), var(--color-bg) 60%);
    color: var(--color-text);
  }

  .home-chart {
    position: absolute;
    top: 4vh;
    right: -10vw;
    width: min(760px, 90vw);
    height: auto;
    pointer-events: none;
  }
  .chart-lines {
    fill: none;
    stroke: var(--color-line);
  }
  .chart-stars {
    fill: var(--color-text);
  }

  .home-header {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28px clamp(16px, 4vw, 56px);
  }
  .home-wordmark {
    color: var(--color-accent);
  }

  .home-main {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 560px;
    padding: 4vh clamp(16px, 4vw, 56px) 48px;
  }
  .menu-subtitle {
    margin: 0;
  }
  .menu-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(64px, 10vw, 112px);
    line-height: 0.9;
    letter-spacing: -0.01em;
    color: var(--color-text);
  }
  .menu-description {
    margin: 0;
    max-width: 470px;
    font-size: 15px;
    line-height: 1.65;
    color: var(--color-text-soft);
  }

  .home-command-hub {
    display: flex;
    flex-direction: column;
    margin-top: 6px;
    border-top: 1px solid var(--color-line-strong);
  }
  .menu-button {
    display: grid;
    grid-template-columns: 48px 1fr 24px;
    align-items: center;
    min-height: 58px;
    padding: 0 4px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-line);
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
    transition: background var(--dur-snap) var(--ease-snap);
  }
  .menu-button:hover,
  .menu-button:focus-visible {
    background: color-mix(in srgb, var(--color-surface-2) 60%, transparent);
  }
  .menu-numeral {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    color: var(--color-accent);
  }
  .menu-label {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
  }
  .menu-arrow {
    color: var(--color-text-muted);
    transition: transform var(--dur-snap) var(--ease-snap);
  }
  .menu-button.is-first .menu-label,
  .menu-button.is-first .menu-arrow,
  .menu-button:hover .menu-label,
  .menu-button:hover .menu-arrow {
    color: var(--color-accent);
  }
  .menu-button:hover .menu-arrow {
    transform: translateX(4px);
  }

  @media (max-width: 640px) {
    .home-chart {
      opacity: 0.5;
    }
    .menu-label {
      font-size: 22px;
    }
  }
</style>
