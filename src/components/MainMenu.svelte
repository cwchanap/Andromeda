<script lang="ts">
  import Button from "./ui/Button.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import AccessibilityManager from "./AccessibilityManager.svelte";
  import { gameState, settings, gameActions } from "../stores/gameStore";
  import { planetarySystemRegistry } from "../lib/planetary-system";
  import { onMount, onDestroy } from "svelte";
  import type { GameSettings } from "../stores/gameStore";

  let showSettings = false;
  let showSystemSelector = false;
  let focusedIndex = 0; // Track which button is focused for keyboard navigation
  
  // Get all available planetary systems
  const availableSystems = planetarySystemRegistry.getAllSystems();

  const handleStartGame = () => {
    gameActions.navigateToView("solar-system");
    // Navigate to the default solar system
    window.location.href = '/planetary/solar';
  };

  const handleSystemSelector = () => {
    showSystemSelector = true;
  };

  const handleSelectSystem = (systemId: string) => {
    gameActions.navigateToView("solar-system"); // Use existing type
    showSystemSelector = false;
    // Navigate to the selected planetary system
    window.location.href = `/planetary/${systemId}`;
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
  
  const menuItems = [
    { label: "Solar System", action: handleStartGame },
    { label: "Explore Systems", action: handleSystemSelector },
    { label: "Settings", action: handleOpenSettings }
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

<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
  <div class="mx-auto max-w-2xl text-center">
    <h1 class="mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-5xl font-bold text-transparent drop-shadow-2xl md:text-6xl">
      Andromeda Space Explorer
    </h1>
    <p class="mb-12 text-xl leading-relaxed text-gray-200">
      Explore multiple planetary systems and discover exoplanets through
      immersive 3D visualization. Journey from our Solar System to Alpha Centauri and beyond!
    </p>

    <div class="mb-12 flex flex-col gap-4">
      <Button
        size="lg"
        on:click={handleStartGame}
        className="menu-button h-14 w-full transform border-none bg-gradient-to-r from-indigo-600 to-purple-600 text-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
        aria-describedby="start-game-desc"
      >
        Solar System
      </Button>
      <div id="start-game-desc" class="sr-only">
        Explore our home solar system with all planets and the Sun
      </div>

      <Button
        variant="outline"
        size="lg"
        on:click={handleSystemSelector}
        className="menu-button h-12 w-full transform border-2 border-white/30 bg-white/10 text-lg text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20"
        aria-describedby="systems-desc"
      >
        Explore Other Systems
      </Button>
      <div id="systems-desc" class="sr-only">
        Choose from Alpha Centauri, Kepler systems, and other exoplanet systems
      </div>

      <Button
        variant="outline"
        size="lg"
        on:click={handleOpenSettings}
        className="menu-button h-12 w-full transform border-2 border-white/30 bg-white/10 text-lg text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20"
        aria-describedby="settings-desc"
      >
        Settings
      </Button>
      <div id="settings-desc" class="sr-only">
        Adjust graphics, audio, and accessibility options
      </div>
    </div>

    <div class="animate-pulse opacity-60">
      <p class="text-sm text-gray-400">
        Use mouse to rotate • Scroll to zoom • Click planets to explore
        {#if $settings.enableKeyboardNavigation}
          <br />Arrow keys to navigate menu • Enter to select
        {/if}
      </p>
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
          <h2 class="text-2xl font-bold text-white">Choose a Planetary System</h2>
          <button
            on:click={handleCloseSystemSelector}
            class="text-gray-400 hover:text-white"
            aria-label="Close system selector"
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
                  {system.systemData.systemType} System
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Screen Reader Instructions -->
  {#if $settings.screenReaderMode}
    <div class="sr-only" aria-live="polite">
      Main menu loaded. Use Tab key to navigate between buttons, or arrow keys for quick navigation.
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
</style>
