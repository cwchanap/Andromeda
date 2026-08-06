<script lang="ts">
  import HudButton from "@/components/hud/HudButton.svelte";
  import HudPanel from "@/components/hud/HudPanel.svelte";
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
    { label: t ? t('main.solar') : 'Solar System', action: handleStartGame, bracket: true },
    { label: t ? t('main.explore') : 'Explore Systems', action: handleSystemSelector, bracket: false },
    { label: t ? t('main.galaxy') : 'Galaxy View', action: handleGalaxyView, bracket: false },
    { label: t ? t('constellation.title') : 'Constellation View', action: handleConstellationView, bracket: false },
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
      
      case 'Enter':
      case ' ':
        if (!document.activeElement?.classList.contains('menu-button')) break;
        event.preventDefault();
        menuItems[focusedIndex].action();
        break;
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

<div class="relative flex min-h-screen items-center justify-center overflow-hidden p-8">
  <!-- Enhanced cosmic background with multiple gradients and animations -->
  <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900"></div>
  <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-violet-900/20 to-cyan-900/30"></div>
  <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-purple-800/10 to-transparent"></div>
  
  <!-- Animated stars background -->
  <div class="stars-container absolute inset-0">
    <div class="stars"></div>
    <div class="stars2"></div>
    <div class="stars3"></div>
  </div>
  
  <!-- Floating cosmic elements -->
  <div class="floating-elements absolute inset-0 pointer-events-none">
    <div class="planet planet-1"></div>
    <div class="planet planet-2"></div>
    <div class="planet planet-3"></div>
    <div class="planet planet-4"></div>
    <div class="nebula nebula-1"></div>
    <div class="nebula nebula-2"></div>
  </div>
  
  <!-- Content Container with enhanced styling -->
  <div class="relative z-20 mx-auto max-w-3xl text-center">
    <!-- Enhanced Title with multiple effects -->
    <div class="mb-8 relative">
      <h1 class="mb-4 text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 drop-shadow-2xl animate-pulse-glow menu-title">
        {t ? t('main.title') : 'ANDROMEDA'}
      </h1>
      <!-- Subtitle with glow effect -->
      <div class="relative">
        <h2 class="text-xl md:text-2xl font-light text-cyan-100/80 uppercase menu-subtitle">
          {t ? t('main.subtitle') : 'Space Explorer'}
        </h2>
        <div class="absolute inset-0 text-xl md:text-2xl font-light text-cyan-400/40 uppercase blur-sm menu-subtitle">
          {t ? t('main.subtitle') : 'Space Explorer'}
        </div>
      </div>
    </div>

    <!-- Enhanced description with cosmic styling -->
    <div class="mb-16 relative">
      <p class="text-lg md:text-xl leading-relaxed text-slate-200/90 max-w-2xl mx-auto backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 shadow-2xl menu-description">
        {t ? t('main.description') : 'Embark on an epic journey through multiple planetary systems and discover exoplanets through immersive 3D visualization. From our Solar System to Alpha Centauri and beyond the stars!'}
      </p>
    </div>

    <!-- HUD command hub -->
    <div class="home-command-hub mx-auto mb-16 max-w-lg">
      <HudPanel title="COMMAND">
        <div class="hud-rail">
          {#each menuItems as item, index}
            <HudButton
              class="menu-button"
              bracket={item.bracket}
              aria-describedby={[
                "start-game-desc",
                "systems-desc",
                "galaxy-desc",
                "constellation-desc",
              ][index]}
              on:click={item.action}
            >{item.label}</HudButton>
          {/each}
        </div>
      </HudPanel>
    </div>

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

  </div>

  <!-- Settings -->
  <div class="home-settings-control absolute right-4 top-4 z-30">
    <HudButton aria-describedby="settings-desc" on:click={handleOpenSettings}>
      {t ? t('main.settings') : 'Settings'}
    </HudButton>
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
  
  /* Enhanced Cosmic Background */
  .stars-container {
    background: transparent;
  }

  .stars, .stars2, .stars3 {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
  }

  .stars {
    background-image: 
      radial-gradient(2px 2px at 20px 30px, #eee, transparent),
      radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
      radial-gradient(1px 1px at 90px 40px, #fff, transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
      radial-gradient(2px 2px at 160px 30px, #ddd, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    animation: stars-move 20s linear infinite;
  }

  .stars2 {
    background-image: 
      radial-gradient(1px 1px at 10px 10px, rgba(147, 51, 234, 0.8), transparent),
      radial-gradient(1px 1px at 50px 50px, rgba(59, 130, 246, 0.8), transparent),
      radial-gradient(1px 1px at 80px 20px, rgba(236, 72, 153, 0.8), transparent),
      radial-gradient(1px 1px at 120px 60px, rgba(139, 92, 246, 0.8), transparent);
    background-repeat: repeat;
    background-size: 150px 80px;
    animation: stars-move 15s linear infinite reverse;
  }

  .stars3 {
    background-image: 
      radial-gradient(1px 1px at 30px 20px, rgba(34, 197, 94, 0.6), transparent),
      radial-gradient(1px 1px at 70px 70px, rgba(251, 146, 60, 0.6), transparent),
      radial-gradient(1px 1px at 100px 40px, rgba(229, 62, 62, 0.6), transparent);
    background-repeat: repeat;
    background-size: 120px 60px;
    animation: stars-move 25s linear infinite;
  }

  @keyframes stars-move {
    from {
      transform: translateY(0px);
    }
    to {
      transform: translateY(-100px);
    }
  }

  /* Floating Planets */
  .planet {
    position: absolute;
    border-radius: 50%;
    animation: planet-float 8s ease-in-out infinite;
    opacity: 0.7;
    filter: blur(0.5px);
  }

  .planet-1 {
    width: 60px;
    height: 60px;
    background: radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b, #d97706);
    top: 10%;
    left: 10%;
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
    animation-delay: -1s;
  }

  .planet-2 {
    width: 80px;
    height: 80px;
    background: radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8, #1e40af);
    top: 20%;
    right: 15%;
    box-shadow: 0 0 40px rgba(59, 130, 246, 0.3);
    animation-delay: -3s;
  }

  .planet-3 {
    width: 45px;
    height: 45px;
    background: radial-gradient(circle at 30% 30%, #ef4444, #dc2626, #b91c1c);
    bottom: 25%;
    left: 20%;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.3);
    animation-delay: -5s;
  }

  .planet-4 {
    width: 70px;
    height: 70px;
    background: radial-gradient(circle at 30% 30%, #8b5cf6, #7c3aed, #6d28d9);
    bottom: 15%;
    right: 25%;
    box-shadow: 0 0 35px rgba(139, 92, 246, 0.3);
    animation-delay: -7s;
  }

  @keyframes planet-float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-20px) rotate(120deg);
    }
    66% {
      transform: translateY(-10px) rotate(240deg);
    }
  }

  /* Nebula Effects */
  .nebula {
    position: absolute;
    border-radius: 50%;
    filter: blur(40px);
    opacity: 0.2;
    animation: nebula-drift 15s ease-in-out infinite;
  }

  .nebula-1 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(147, 51, 234, 0.4), rgba(59, 130, 246, 0.3), transparent);
    top: 5%;
    left: 5%;
    animation-delay: -2s;
  }

  .nebula-2 {
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(236, 72, 153, 0.4), rgba(139, 92, 246, 0.3), transparent);
    bottom: 10%;
    right: 10%;
    animation-delay: -8s;
  }

  @keyframes nebula-drift {
    0%, 100% {
      transform: translateX(0px) translateY(0px) scale(1);
    }
    25% {
      transform: translateX(30px) translateY(-20px) scale(1.1);
    }
    50% {
      transform: translateX(-20px) translateY(-40px) scale(0.9);
    }
    75% {
      transform: translateX(-40px) translateY(-10px) scale(1.05);
    }
  }

  /* Title Glow Animation */
  @keyframes title-glow {
    0%, 100% {
      text-shadow: 
        0 0 5px rgba(59, 130, 246, 0.3),
        0 0 10px rgba(139, 92, 246, 0.2),
        0 0 15px rgba(236, 72, 153, 0.1);
    }
    50% {
      text-shadow: 
        0 0 10px rgba(59, 130, 246, 0.5),
        0 0 20px rgba(139, 92, 246, 0.4),
        0 0 30px rgba(236, 72, 153, 0.3);
    }
  }

  h1 {
    animation: title-glow 3s ease-in-out infinite;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .planet {
      opacity: 0.5;
      filter: blur(1px);
    }
    
    .nebula {
      opacity: 0.1;
    }
    
    .stars, .stars2, .stars3 {
      animation-duration: 30s;
    }
  }
  
  /* Language-specific adjustments for CJK */
  :global(:root[lang="zh"] .menu-title),
  :global(:root[lang="ja"] .menu-title) {
    line-height: 1.2;
  }
  
  :global(:root[lang="zh"] .menu-subtitle),
  :global(:root[lang="ja"] .menu-subtitle) {
    line-height: 1.4;
    letter-spacing: normal !important;
  }
  
  :global(:root[lang="zh"] .menu-description),
  :global(:root[lang="ja"] .menu-description) {
    line-height: 1.6;
    padding: 1.5rem;
  }
</style>
