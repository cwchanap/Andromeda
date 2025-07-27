<script lang="ts">
  import Button from "./ui/Button.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import AccessibilityManager from "./AccessibilityManager.svelte";
  import { gameState, settings, gameActions } from "../stores/gameStore";
  import { onMount, onDestroy } from "svelte";
  import type { GameSettings } from "../stores/gameStore";

  let showSettings = false;
  let focusedIndex = 0; // Track which button is focused for keyboard navigation

  const handleStartGame = () => {
    gameActions.navigateToView("solar-system");
    // Navigate to the solar-system page
    window.location.href = '/solar-system';
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
    { label: "Start Game", action: handleStartGame },
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
      Space Exploration Game
    </h1>
    <p class="mb-12 text-xl leading-relaxed text-gray-200">
      Explore our solar system and learn about celestial bodies through
      immersive 3D visualization
    </p>

    <div class="mb-12 flex flex-col gap-4">
      <Button
        size="lg"
        on:click={handleStartGame}
        className="menu-button h-14 w-full transform border-none bg-gradient-to-r from-indigo-600 to-purple-600 text-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
        aria-describedby="start-game-desc"
      >
        Start Game
      </Button>
      <div id="start-game-desc" class="sr-only">
        Begin exploring the 3D solar system visualization
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
</style>
