<script lang="ts">
  import Button from "@/components/ui/Button.svelte";
  import SettingsModal from "@/components/SettingsModal.svelte";
  import AccessibilityManager from "@/components/AccessibilityManager.svelte";
  import ExploreSystems from "@/components/ExploreSystems.svelte";
  import SkyBackdrop from "@/components/home/SkyBackdrop.svelte";
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
  <SkyBackdrop />

  <header class="home-header">
    <span class="ui-caption home-wordmark"><span class="wordmark-star" aria-hidden="true">✦</span> {t ? t('main.title') : 'Andromeda'}</span>
    <div class="home-settings-control">
      <Button aria-describedby="settings-desc" on:click={handleOpenSettings}>
        {t ? t('main.settings') : 'Settings'}
      </Button>
    </div>
  </header>

  <main class="home-main">
    <p class="ui-caption menu-subtitle">{t ? t('main.subtitle') : 'Space Explorer'}</p>
    <h1 class="menu-title">{t ? t('main.title') : 'Andromeda'}</h1>
    <div class="menu-ornament" aria-hidden="true"></div>
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
    background: var(--color-bg-deep);
    color: var(--color-text);
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
    letter-spacing: 0.28em;
  }
  .wordmark-star {
    color: var(--color-accent-strong);
    text-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 80%, transparent);
  }

  .home-main {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 600px;
    padding: 4vh clamp(16px, 4vw, 56px) 48px;
  }

  .menu-subtitle {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0;
    color: var(--color-accent);
    letter-spacing: 0.34em;
  }
  .menu-subtitle::before {
    content: "";
    width: 40px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-accent));
  }

  /* Gilded title: warm ivory at the top shading into brass. */
  .menu-title {
    /* Size to the word, so background-clip paints every glyph. */
    align-self: flex-start;
    margin: 0;
    padding-bottom: 0.04em;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(64px, 10vw, 120px);
    line-height: 1;
    letter-spacing: -0.01em;
    background: linear-gradient(
      180deg,
      var(--color-text) 12%,
      var(--color-accent-strong) 46%,
      var(--color-accent) 70%,
      color-mix(in srgb, var(--color-accent) 62%, var(--color-bg-deep)) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 22px color-mix(in srgb, var(--color-accent) 30%, transparent));
  }

  .menu-ornament {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: -6px;
  }
  .menu-ornament::before {
    content: "✦";
    font-size: 11px;
    color: var(--color-accent-strong);
    text-shadow: 0 0 8px var(--color-accent);
  }
  .menu-ornament::after {
    content: "";
    width: 180px;
    height: 1px;
    background: linear-gradient(90deg, var(--color-accent), transparent);
  }

  .menu-description {
    margin: 0;
    max-width: 480px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: 20px;
    line-height: 1.5;
    color: var(--color-text-soft);
  }
  .menu-description:lang(zh),
  .menu-description:lang(ja) {
    font-style: normal;
    font-size: 17px;
    line-height: 1.75;
  }

  .home-command-hub {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
    border-top: 1px solid var(--color-line-strong);
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-bg-deep) 55%, transparent), transparent 90%);
  }
  .menu-button {
    position: relative;
    display: grid;
    grid-template-columns: 56px 1fr 28px;
    align-items: center;
    min-height: 62px;
    padding: 0 8px 0 0;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-line);
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
    transition: background var(--dur-snap) var(--ease-snap);
  }
  /* Brass bar on the left edge marks the primary and hovered rows. */
  .menu-button::before {
    content: "";
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 2px;
    background: var(--color-accent);
    box-shadow: 0 0 10px var(--color-accent);
    transform: scaleY(0);
    transition: transform var(--dur-snap) var(--ease-snap);
  }
  .menu-button.is-first::before,
  .menu-button:hover::before,
  .menu-button:focus-visible::before {
    transform: scaleY(1);
  }
  .menu-button:hover,
  .menu-button:focus-visible {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 85%);
  }
  .menu-numeral {
    padding-left: 18px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: 19px;
    color: var(--color-accent);
  }
  .menu-label {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    transition:
      color var(--dur-snap) var(--ease-snap),
      transform var(--dur-snap) var(--ease-snap);
  }
  .menu-arrow {
    color: var(--color-text-muted);
    transition:
      color var(--dur-snap) var(--ease-snap),
      transform var(--dur-snap) var(--ease-snap);
  }
  .menu-button.is-first .menu-label,
  .menu-button.is-first .menu-arrow {
    color: var(--color-accent-strong);
  }
  .menu-button:hover .menu-label,
  .menu-button:focus-visible .menu-label {
    color: var(--color-accent-strong);
    transform: translateX(4px);
  }
  .menu-button:hover .menu-arrow,
  .menu-button:focus-visible .menu-arrow {
    color: var(--color-accent);
    transform: translateX(6px);
  }

  :global(:root[data-high-contrast="true"]) .menu-title {
    background: none;
    color: var(--color-text);
    filter: none;
  }

  @media (max-width: 640px) {
    .menu-label {
      font-size: 23px;
    }
    .menu-description {
      font-size: 18px;
    }
  }
</style>
