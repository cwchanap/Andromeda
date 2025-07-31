<script lang="ts">
  import LoadingAnimation from "./LoadingAnimation.svelte";
  import ErrorBoundary from "./ErrorBoundary.svelte";
  import KeyboardNavigation from "./KeyboardNavigation.svelte";
  import AccessibilityManager from "./AccessibilityManager.svelte";
  import CelestialBodyInfoModal from "./CelestialBodyInfoModal.svelte";
  import OrbitSpeedControl from "./OrbitSpeedControl.svelte";
  import { gameState, gameActions, settings } from "../stores/gameStore";
  import { onMount, onDestroy } from "svelte";
  import { SolarSystemRenderer } from "../lib/planetary-system/graphics/SolarSystemRenderer";
  import { solarSystemData } from "../lib/planetary-system/SolarSystem";
  import type { CelestialBodyData } from "../types/game";
  import type {
    SolarSystemConfig,
    SolarSystemEvents,
  } from "../lib/planetary-system/graphics/types";

  let solarSystemRenderer: SolarSystemRenderer | null = null;
  let isLoading = true;
  let loadingProgress = 0;
  let isSceneReady = false;
  let currentZoom = 50;
  let loadingMessage = "Loading solar system...";
  let debugInfo = "";
  let zoomControls: {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  } | null = null;
  let currentSelectedIndex = -1;

  // Reactive state from stores
  $: selectedBody = $gameState.selectedBody;
  $: showInfoModal = $gameState.ui.showInfoModal;
  $: enableAnimations = $settings.enableAnimations;
  $: enableKeyboardNav = $settings.enableKeyboardNavigation;

  const handlePlanetSelect = (planet: CelestialBodyData) => {
    gameActions.selectCelestialBody(planet);
    gameActions.showInfoModal(true);
  };

  const handleCloseModal = () => {
    gameActions.showInfoModal(false);
  };

  const handleBackToMenu = () => {
    gameActions.navigateToView("menu");
    window.location.href = "/";
  };

  const handleZoomChange = (zoom: number) => {
    currentZoom = zoom;
  };

  const handleZoomControlsReady = (controls: typeof zoomControls) => {
    zoomControls = controls;
  };

  // Keyboard navigation handlers
  const handleKeyboardPlanetSelect = (planet: CelestialBodyData) => {
    // Update selected index for keyboard navigation state
    const allBodies = [
      solarSystemData.star,
      ...solarSystemData.celestialBodies,
    ];
    currentSelectedIndex = allBodies.findIndex((body) => body.id === planet.id);
    handlePlanetSelect(planet);
  };

  const handleKeyboardZoomIn = () => {
    if (zoomControls) zoomControls.zoomIn();
  };

  const handleKeyboardZoomOut = () => {
    if (zoomControls) zoomControls.zoomOut();
  };

  const handleKeyboardResetView = () => {
    if (zoomControls) zoomControls.resetView();
  };

  const handleOrbitSpeedChange = (speed: number) => {
    if (solarSystemRenderer) {
      solarSystemRenderer.updateConfig({ orbitSpeedMultiplier: speed });
    }
  };

  onMount(() => {
    debugInfo = "Component mounted";

    // Simulate initial loading
    const loadingInterval = setInterval(() => {
      loadingProgress += Math.random() * 15;
      if (loadingProgress >= 80) {
        loadingProgress = 80;
        clearInterval(loadingInterval);
        loadingMessage = "Initializing 3D renderer...";
        debugInfo = "Starting 3D initialization";
        // Wait for next tick to ensure DOM is ready
        setTimeout(() => {
          initializeSolarSystem();
        }, 100);
      }
    }, 100);

    return () => {
      console.log("Cleaning up loading interval");
      clearInterval(loadingInterval);
    };
  });

  const initializeSolarSystem = async () => {
    debugInfo = "Waiting for container...";

    // Wait for the container to be available
    let attempts = 0;
    let rendererContainer: HTMLElement | null = null;

    while (!rendererContainer && attempts < 10) {
      rendererContainer = document.getElementById("solar-system-renderer");

      if (!rendererContainer) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      attempts++;
    }

    if (!rendererContainer) {
      console.error("Renderer container not found after waiting");
      debugInfo = "Error: Container not found";
      isLoading = false;
      return;
    }

    console.log("Container found:", rendererContainer);
    debugInfo = "Container found, creating renderer...";

    try {
      // Configure solar system renderer for Svelte
      const config: SolarSystemConfig = {
        enableControls: true,
        enableAnimations: enableAnimations,
        enableMobileOptimization: false,
        antialiasing: true,
        shadows: false,
        particleCount: 1000,
        performanceMode: "medium",
        orbitSpeedMultiplier: $settings.orbitSpeedMultiplier,
      };

      // Configure event handlers
      const events: SolarSystemEvents = {
        onPlanetSelect: handlePlanetSelect,
        onCameraChange: (state) => {
          handleZoomChange(state.zoom);
        },
        onError: (error) => {
          console.error("SolarSystemRenderer error:", error);
          debugInfo = `Error: ${error.message}`;
        },
        onReady: () => {
          console.log("Solar system renderer ready!");
          loadingProgress = 100;
          debugInfo = "Renderer ready!";
          setTimeout(() => {
            isLoading = false;
            isSceneReady = true;
          }, 500);
        },
      };


      // Create renderer
      solarSystemRenderer = new SolarSystemRenderer(
        rendererContainer,
        config,
        events,
      );

      debugInfo = "Converting celestial bodies data...";

      // Convert PlanetarySystemData to array of CelestialBodyData
      const celestialBodies: CelestialBodyData[] = [
        solarSystemData.star,
        ...solarSystemData.celestialBodies,
      ];

      console.log(`Found ${celestialBodies.length} celestial bodies`);

      // Initialize the solar system with background star configuration
      await solarSystemRenderer.initialize(celestialBodies, solarSystemData);

      debugInfo = "Setting up controls...";

      // Get controls interface
      const controls = solarSystemRenderer.getControls();
      handleZoomControlsReady({
        zoomIn: controls.zoomIn,
        zoomOut: controls.zoomOut,
        resetView: controls.resetView,
      });

    } catch (error) {
      console.error("Failed to initialize solar system:", error);
      debugInfo = `Initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      isLoading = false;
    }
  };

  onDestroy(() => {
    if (solarSystemRenderer) {
      solarSystemRenderer.dispose();
      solarSystemRenderer = null;
    }
  });

  // Handle selected body changes
  $: if (solarSystemRenderer && selectedBody) {
    solarSystemRenderer.selectCelestialBody(selectedBody.id);
  } else if (solarSystemRenderer && !selectedBody) {
    solarSystemRenderer.selectCelestialBody(null);
  }
</script>

<ErrorBoundary>
  <!-- 3D Solar System Renderer Container - Always present for binding -->
  <div
    id="solar-system-renderer"
    class="solar-system-container"
    style="opacity: {isSceneReady ? 1 : 0}"
  ></div>

  {#if isLoading}
    <LoadingAnimation progress={loadingProgress} message={loadingMessage} />
    <!-- Debug info for development -->
    <div class="debug-info">
      <div>Debug: {debugInfo}</div>
      <div>Component State: {isSceneReady ? "Scene Ready" : "Loading..."}</div>
      <div>Loading Progress: {loadingProgress}%</div>
    </div>
  {/if}

  {#if isSceneReady}
    <!-- UI Overlay -->
    <div class="ui-overlay">
      <!-- Top Navigation Bar -->
      <div class="top-nav">
        <button
          class="nav-button back-button"
          on:click={handleBackToMenu}
          title="Back to Main Menu"
        >
          ← Back to Menu
        </button>

        <div class="nav-title">
          <h1>Solar System Explorer</h1>
        </div>

        <div class="nav-controls">
          {#if zoomControls}
            <button
              class="control-button"
              on:click={zoomControls.zoomIn}
              title="Zoom In">🔍+</button
            >
            <button
              class="control-button"
              on:click={zoomControls.zoomOut}
              title="Zoom Out">🔍-</button
            >
            <button
              class="control-button"
              on:click={zoomControls.resetView}
              title="Reset View">🏠</button
            >
          {/if}
        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div class="bottom-status">
        <div class="status-info">
          {#if selectedBody}
            <span class="selected-body">Selected: {selectedBody.name}</span>
          {:else}
            <span class="hint">Click on a planet to explore</span>
          {/if}
        </div>

        <div class="zoom-info">
          Zoom: {Math.round(currentZoom)}x
        </div>
      </div>

      <!-- Planet Info Modal -->
      <CelestialBodyInfoModal
        isOpen={showInfoModal}
        celestialBody={selectedBody}
        onClose={handleCloseModal}
      />

      <!-- Orbit Speed Control -->
      <OrbitSpeedControl onSpeedChange={handleOrbitSpeedChange} />
    </div>
  {/if}

  <!-- Accessibility Components -->
  <AccessibilityManager />

  {#if enableKeyboardNav}
    <KeyboardNavigation
      onPlanetSelect={handleKeyboardPlanetSelect}
      onZoomIn={handleKeyboardZoomIn}
      onZoomOut={handleKeyboardZoomOut}
      onResetView={handleKeyboardResetView}
      {currentSelectedIndex}
    />
  {/if}

  <!-- Screen Reader Descriptions -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    {#if isLoading}
      Loading solar system visualization. Progress: {Math.round(
        loadingProgress,
      )}%
    {:else if selectedBody}
      Currently selected: {selectedBody.name}. {selectedBody.description}
    {:else}
      Solar system loaded. Use arrow keys to navigate between celestial bodies,
      Enter to select.
    {/if}
  </div>

  <!-- 3D Scene Description for Screen Readers -->
  <div class="sr-only">
    <h2>3D Solar System Visualization</h2>
    <p>
      This is an interactive 3D representation of our solar system. The Sun is
      at the center, surrounded by the eight planets: Mercury, Venus, Earth,
      Mars, Jupiter, Saturn, Uranus, and Neptune.
    </p>
    <p>
      You can navigate using keyboard controls: Arrow keys to select different
      planets, Enter or Space to view details, Plus and Minus keys to zoom, and
      Zero to reset the view.
    </p>
  </div>

  {#if !isLoading && !isSceneReady}
    <!-- Error State -->
    <div class="error-state">
      <h2>Unable to load solar system</h2>
      <p>There was an error initializing the 3D renderer.</p>
      <p class="debug-info">{debugInfo}</p>
      <button class="retry-button" on:click={() => window.location.reload()}>
        Retry
      </button>
    </div>
  {/if}
</ErrorBoundary>

<style>
  .solar-system-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000011;
  }

  .ui-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }

  .top-nav {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    pointer-events: auto;
  }

  .nav-button {
    background: rgba(99, 102, 241, 0.8);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .nav-button:hover {
    background: rgba(99, 102, 241, 1);
    transform: translateY(-1px);
  }

  .nav-title h1 {
    color: white;
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .nav-controls {
    display: flex;
    gap: 8px;
  }

  .control-button {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .control-button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .bottom-status {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    pointer-events: auto;
  }

  .status-info,
  .zoom-info {
    color: white;
    font-size: 14px;
  }

  .selected-body {
    color: #60a5fa;
    font-weight: 500;
  }

  .hint {
    color: #9ca3af;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    text-align: center;
    padding: 20px;
  }

  .error-state h2 {
    color: #f87171;
    margin-bottom: 16px;
  }

  .error-state p {
    color: #9ca3af;
    margin-bottom: 24px;
  }

  .retry-button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.2s ease;
  }

  .retry-button:hover {
    background: #2563eb;
  }

  .debug-info {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    pointer-events: none;
    font-family: monospace;
  }

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
