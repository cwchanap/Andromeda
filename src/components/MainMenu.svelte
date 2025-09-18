<script lang="ts">
  import Button from "./ui/Button.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import AccessibilityManager from "./AccessibilityManager.svelte";
  import { gameState, settings, gameActions } from "../stores/gameStore";
  import { planetarySystemRegistry } from "../lib/planetary-system";
  import { onMount, onDestroy } from "svelte";
  import { getLangFromUrl, useTranslations, useTranslatedPath } from "../i18n/utils";
  import type { GameSettings } from "../stores/gameStore";

  // Accept language as prop and pre-computed translations
  export let lang: 'en' | 'zh' | 'ja' = 'en';
  export let translations: Record<string, string> = {};

  let showSettings = false;
  let showSystemSelector = false;
  let focusedIndex = 0; // Track which button is focused for keyboard navigation
  let currentLang: 'en' | 'zh' | 'ja' = lang;
  let t: (key: any, replacements?: Record<string, string>) => string;
  let translatePath: (path: string, locale?: 'en' | 'zh' | 'ja') => string;
  
  // Get all available planetary systems
  const availableSystems = planetarySystemRegistry.getAllSystems();

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
    translatePath = useTranslatedPath(currentLang);
  }

  onMount(() => {
    // Fallback to URL-based detection if props not provided
    if (typeof window !== 'undefined' && !lang) {
      currentLang = getLangFromUrl(new URL(window.location.href));
      t = useTranslations(currentLang);
      translatePath = useTranslatedPath(currentLang);
    }
  });

  const handleStartGame = () => {
    gameActions.navigateToView("solar-system");
    // Navigate to the default solar system - redirect to en version
    const targetUrl = `/en/planetary/solar`;
    window.location.href = targetUrl;
  };

  const handleSystemSelector = () => {
    showSystemSelector = true;
  };

  const handleGalaxyView = () => {
    // Navigate to the galaxy page  
    const targetUrl = currentLang === 'en' ? '/galaxy' : `/${currentLang}/galaxy`;
    window.location.href = targetUrl;
  };

  const handleConstellationView = () => {
    // Navigate to the constellation page
    const targetUrl = currentLang === 'en' ? '/constellation' : `/${currentLang}/constellation`;
    window.location.href = targetUrl;
  };

  const handleSelectSystem = (systemId: string) => {
    gameActions.navigateToView("solar-system"); // Use existing type
    showSystemSelector = false;
    // Navigate to the selected planetary system - redirect to en version
    const targetUrl = `/en/planetary/${systemId}`;
    window.location.href = targetUrl;
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
    { label: t ? t('main.solar') : "Solar System", action: handleStartGame },
    { label: t ? t('main.explore') : "Explore Systems", action: handleSystemSelector },
    { label: t ? t('main.galaxy') : "Galaxy View", action: handleGalaxyView },
    { label: t ? t('constellation.title') : "Constellation View", action: handleConstellationView },
    { label: t ? t('main.settings') : "Settings", action: handleOpenSettings }
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

    <!-- Enhanced button grid with cosmic effects -->
    <div class="mb-16 grid gap-6 max-w-lg mx-auto">
      <Button
        size="lg"
        on:click={handleStartGame}
        className="menu-button group relative h-16 w-full transform overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-xl font-bold shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-orange-500/50 hover:shadow-2xl active:scale-95"
        aria-describedby="start-game-desc"
      >
        <span class="relative z-10 flex items-center justify-center gap-3">
          <span class="text-2xl animate-twinkle">☀️</span>
          {t ? t('main.solar') : 'Solar System'}
        </span>
        <div class="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        on:click={handleSystemSelector}
        className="menu-button group relative h-14 w-full transform overflow-hidden rounded-xl border-2 border-cyan-400/50 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 backdrop-blur-sm text-lg text-cyan-100 transition-all duration-500 hover:-translate-y-1 hover:scale-105 hover:border-cyan-300 hover:bg-gradient-to-r hover:from-cyan-800/30 hover:to-blue-800/30 hover:shadow-cyan-400/50 hover:shadow-lg active:scale-95"
        aria-describedby="systems-desc"
      >
        <span class="relative z-10 flex items-center justify-center gap-3">
          <span class="text-xl animate-cosmic-drift">🌌</span>
          {t ? t('main.explore') : 'Explore Exoplanets'}
        </span>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </Button>

      <Button
        variant="outline"
        size="lg"
        on:click={handleGalaxyView}
        className="menu-button group relative h-14 w-full transform overflow-hidden rounded-xl border-2 border-violet-400/50 bg-gradient-to-r from-violet-900/20 to-purple-900/20 backdrop-blur-sm text-lg text-violet-100 transition-all duration-500 hover:-translate-y-1 hover:scale-105 hover:border-violet-300 hover:bg-gradient-to-r hover:from-violet-800/30 hover:to-purple-800/30 hover:shadow-violet-400/50 hover:shadow-lg active:scale-95"
        aria-describedby="galaxy-desc"
      >
        <span class="relative z-10 flex items-center justify-center gap-3">
          <span class="text-xl animate-float">🌠</span>
          {t ? t('main.galaxy') : 'Galaxy View'}
        </span>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-violet-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </Button>

      <Button
        variant="outline"
        size="lg"
        on:click={handleConstellationView}
        className="menu-button group relative h-14 w-full transform overflow-hidden rounded-xl border-2 border-indigo-400/50 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 backdrop-blur-sm text-lg text-indigo-100 transition-all duration-500 hover:-translate-y-1 hover:scale-105 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-800/30 hover:to-blue-800/30 hover:shadow-indigo-400/50 hover:shadow-lg active:scale-95"
        aria-describedby="constellation-desc"
      >
        <span class="relative z-10 flex items-center justify-center gap-3">
          <span class="text-xl animate-pulse">✨</span>
          {t ? t('constellation.title') : 'Constellation View'}
        </span>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </Button>

      <Button
        variant="outline"
        size="lg"
        on:click={handleOpenSettings}
        className="menu-button group relative h-14 w-full transform overflow-hidden rounded-xl border-2 border-emerald-400/50 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 backdrop-blur-sm text-lg text-emerald-100 transition-all duration-500 hover:-translate-y-1 hover:scale-105 hover:border-emerald-300 hover:bg-gradient-to-r hover:from-emerald-800/30 hover:to-teal-800/30 hover:shadow-emerald-400/50 hover:shadow-lg active:scale-95"
        aria-describedby="settings-desc"
      >
        <span class="relative z-10 flex items-center justify-center gap-3">
          <span class="text-xl animate-pulse-glow">⚙️</span>
          {t ? t('main.settings') : 'Settings'}
        </span>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      </Button>
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

    <!-- Enhanced instructions with cosmic styling -->
    <div class="relative animate-pulse opacity-70">
      <div class="backdrop-blur-sm bg-black/20 rounded-xl p-4 border border-white/10">
        <p class="text-sm text-slate-300">
          <span class="text-cyan-300">{t ? t('instructions.mouse') : '🖱️ Mouse to rotate'}</span> • 
          <span class="text-violet-300">{t ? t('instructions.scroll') : '📜 Scroll to zoom'}</span> • 
          <span class="text-pink-300">{t ? t('instructions.click') : '🌍 Click planets to explore'}</span>
          {#if $settings.enableKeyboardNavigation}
            <br />
            <span class="text-emerald-300">{t ? t('instructions.keyboard') : '⌨️ Arrow keys to navigate'}</span> • 
            <span class="text-orange-300">{t ? t('instructions.enter') : '⏎ Enter to select'}</span>
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- Accessibility Manager -->
  <AccessibilityManager />

  <!-- Settings Modal -->
  <SettingsModal
    isOpen={showSettings}
    on:close={handleCloseSettings}
    on:save={(event) => handleSaveSettings(event.detail)}
    currentSettings={$settings}
  />

  <!-- System Selector Modal -->
  {#if showSystemSelector}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div class="w-full max-w-2xl rounded-lg bg-gray-900 p-6 shadow-2xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold text-white">{t ? t('systems.title') : 'Choose a Planetary System'}</h2>
          <button
            on:click={handleCloseSystemSelector}
            class="text-gray-400 hover:text-white"
            aria-label={t ? t('aria.close') : 'Close system selector'}
          >
            ✕
          </button>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2">
          {#each availableSystems as system}
            <button
              on:click={() => handleSelectSystem(system.id)}
              class="group rounded-lg border border-white/20 bg-white/5 p-4 text-left transition-all duration-300 hover:border-white/40 hover:bg-white/10"
            >
              <h3 class="mb-2 text-lg font-semibold text-white group-hover:text-blue-300">
                {system.name}
              </h3>
              <p class="text-sm text-gray-300 line-clamp-3">
                {system.description}
              </p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-xs uppercase tracking-wide text-blue-400">
                  {system.systemData.systemType} {t ? t('systems.system') : 'System'}
                </span>
                {#if system.systemData.metadata?.distance}
                  <span class="text-xs text-gray-400">
                    {system.systemData.metadata.distance}
                  </span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
        
        <div class="mt-6 text-center">
          <button
            on:click={handleCloseSystemSelector}
            class="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            {t ? t('action.cancel') : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
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
  
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
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

  /* Enhanced Button Animations */
  :global(.menu-button) {
    position: relative;
    overflow: hidden;
  }

  :global(.menu-button::before) {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transition: left 0.5s;
  }

  :global(.menu-button:hover::before) {
    left: 100%;
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
