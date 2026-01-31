<script lang="ts">
  import LoadingAnimation from './LoadingAnimation.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import KeyboardNavigation from './KeyboardNavigation.svelte';
  import AccessibilityManager from './AccessibilityManager.svelte';
  import CelestialBodyInfoModal from './CelestialBodyInfoModal.svelte';
  import ComparisonModal from './ComparisonModal.svelte';
  import OrbitSpeedControl from './OrbitSpeedControl.svelte';
  import { gameState, gameActions, settings } from '../stores/gameStore';
  import { onMount, onDestroy } from 'svelte';
  import { PlanetarySystemRenderer, planetarySystemRegistry } from '../lib/planetary-system';
  import { getLangFromUrl, useTranslations, useTranslatedPath } from '../i18n/utils';
  import type { PlanetarySystemConfig, PlanetarySystemEvents } from '../lib/planetary-system/types';
  import type { CelestialBodyData } from '../types/game';
  
  // Props
  export let systemId: string;
  export let lang: 'en' | 'zh' | 'ja' = 'en';
  export let translations: Record<string, string> = {};
  
  // Translation function
  let t: (key: string) => string;
  let currentLang: 'en' | 'zh' | 'ja' = lang;
  
  // Initialize translations
  $: {
    currentLang = lang;
    if (Object.keys(translations).length > 0) {
      t = (key: string) => translations[key] || key;
    } else {
      t = useTranslations(currentLang);
    }
  }
  
  onMount(() => {
    if (typeof window !== 'undefined' && !lang) {
      currentLang = getLangFromUrl(new URL(window.location.href));
      t = useTranslations(currentLang);
    }
  });
  
  let planetarySystemRenderer: PlanetarySystemRenderer | null = null;
  let isLoading = true;
  let loadingProgress = 0;
  let isSceneReady = false;
  let currentZoom = 50;
  let loadingMessage = "Loading planetary system...";
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
  $: showComparisonModal = $gameState.ui.showComparisonModal;
  $: comparisonBodies = $gameState.comparison?.selectedBodies || [];
  $: enableAnimations = $settings.enableAnimations;
  $: enableKeyboardNav = $settings.enableKeyboardNavigation;
  
  const handleBodySelect = (body: CelestialBodyData) => {
    gameActions.selectCelestialBody(body);
    gameActions.showInfoModal(true);
  };
  
  const handleCloseModal = () => {
    gameActions.showInfoModal(false);
  };

  // Comparison modal handlers
  const handleCloseComparison = () => {
    gameActions.showComparisonModal(false);
  };

  const handleRemoveFromComparison = (bodyId: string) => {
    gameActions.removeFromComparison(bodyId);
  };

  const handleAddToComparison = (body: CelestialBodyData) => {
    gameActions.addToComparison(body);
  };

  const handleBackToMenu = () => {
    gameActions.navigateToView("menu");
    const menuUrl = currentLang === 'en' ? '/' : `/${currentLang}/`;
    window.location.href = menuUrl;
  };
  
  const handleZoomChange = (zoom: number) => {
    currentZoom = zoom;
  };
  
  const onKeyboardNavigate = (direction: 'next' | 'previous') => {
    if (!planetarySystemRenderer) return;
    
    const systemData = planetarySystemRenderer.getSystemData();
    if (!systemData) return;
    
    const allBodies = [systemData.star, ...systemData.celestialBodies];
    
    if (direction === 'next') {
      currentSelectedIndex = (currentSelectedIndex + 1) % allBodies.length;
    } else {
      currentSelectedIndex = currentSelectedIndex <= 0 ? allBodies.length - 1 : currentSelectedIndex - 1;
    }
    
    const selectedBody = allBodies[currentSelectedIndex];
    if (selectedBody) {
      planetarySystemRenderer.selectBody(selectedBody.id);
      handleBodySelect(selectedBody);
    }
  };
  
  const initializePlanetarySystem = async (container: HTMLElement) => {
    // Prevent multiple initializations
    if (planetarySystemRenderer) {
      return;
    }
    
    try {
      loadingMessage = `Loading ${systemId} system...`;
      loadingProgress = 10;
      
      // Get the system plugin
      const systemPlugin = planetarySystemRegistry.getSystem(systemId);
      if (!systemPlugin) {
        throw new Error(`System ${systemId} not found`);
      }
      
      loadingProgress = 20;
      loadingMessage = "Initializing renderer...";
      
      // Create renderer configuration
      const config: PlanetarySystemConfig = {
        systemId,
        performanceMode: "medium", // Default value
        enableAnimations: enableAnimations,
        enableInteractions: true,
        particleCount: 1000, // Default value
        shadowsEnabled: false, // Default value
        orbitSpeedMultiplier: $settings.orbitSpeedMultiplier,
      };
      
      // Create renderer events
      const events: PlanetarySystemEvents = {
        onBodySelect: handleBodySelect,
        onCameraChange: handleZoomChange,
        onSystemLoad: (loadedSystemId) => {
          console.log(`Loaded system: ${loadedSystemId}`);
          isSceneReady = true;
          isLoading = false;
          loadingProgress = 100;
        },
        onError: (error) => {
          console.error("Planetary system error:", error);
          // Handle error without gameActions.handleError as it doesn't exist
          isLoading = false;
        }
      };
      
      loadingProgress = 40;
      loadingMessage = "Creating 3D scene...";
      
      // Create renderer
      planetarySystemRenderer = new PlanetarySystemRenderer(container, config, events);
      
      loadingProgress = 60;
      loadingMessage = "Loading system data...";
      
      // Initialize with system data
      await planetarySystemRenderer.initialize(systemPlugin.systemData);
      
      loadingProgress = 80;
      loadingMessage = "Setting up controls...";
      
      // Get zoom controls
      const controls = planetarySystemRenderer.getControls();
      if (controls) {
        zoomControls = {
          zoomIn: () => controls.zoomIn(),
          zoomOut: () => controls.zoomOut(),
          resetView: () => controls.resetView()
        };
      }
      
      loadingProgress = 100;
      loadingMessage = "Ready!";
      
    } catch (error) {
      console.error("Failed to initialize planetary system:", error);
      // Handle error without gameActions.handleError as it doesn't exist
      isLoading = false;
    }
  };
  
  onMount(async () => {
    // Wait for the container to be available (similar to SolarSystemWrapper)
    let attempts = 0;
    let rendererContainer: HTMLElement | null = null;

    while (!rendererContainer && attempts < 10) {
      rendererContainer = document.getElementById('planetary-system-renderer');
      
      if (!rendererContainer) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }

    if (!rendererContainer) {
      console.error('Renderer container not found after waiting');
      return;
    }

    await initializePlanetarySystem(rendererContainer);
  });
  
  onDestroy(async () => {
    if (planetarySystemRenderer) {
      await planetarySystemRenderer.cleanup();
      planetarySystemRenderer = null;
    }
  });
  
  // Handle window resize
  const handleResize = () => {
    // The resize is handled internally by the SolarSystemRenderer
    // through its private handleResize method
  };
  
  // Synchronize all settings with renderer in a single reactive statement
  $: if (planetarySystemRenderer) {
    planetarySystemRenderer.updateConfig({ 
      enableAnimations,
      orbitSpeedMultiplier: $settings.orbitSpeedMultiplier 
    });
  }
</script>

<svelte:window on:resize={handleResize} />

<div class="planetary-system-wrapper">
  <div id="planetary-system-renderer" class="system-container">
    {#if isLoading}
      <LoadingAnimation 
        progress={loadingProgress} 
        message={loadingMessage} 
      />
    {/if}
  </div>
  
  {#if isSceneReady}
    <!-- System Info Panel -->
    <div class="system-info-panel">
      <h2>
        {t ? t(`systems.${systemId}.name`) || planetarySystemRegistry.getSystem(systemId)?.name || t('systems.unknown') : 'Unknown System'}
      </h2>
      <p>{t ? t(`systems.${systemId}.description`) || planetarySystemRegistry.getSystem(systemId)?.description || '' : ''}</p>
    </div>
    
    <!-- Navigation Controls -->
    <div class="controls-panel">
      <button on:click={handleBackToMenu} class="back-button">
        {t ? t('controls.backToMenu') : '← Back to Menu'}
      </button>
      
      {#if zoomControls}
        <div class="zoom-controls">
          <button on:click={zoomControls.zoomIn}>{t ? t('controls.zoomIn') : 'Zoom In'}</button>
          <button on:click={zoomControls.zoomOut}>{t ? t('controls.zoomOut') : 'Zoom Out'}</button>
          <button on:click={zoomControls.resetView}>{t ? t('controls.resetView') : 'Reset View'}</button>
        </div>
      {/if}
    </div>
    
    <!-- Keyboard Navigation -->
    {#if enableKeyboardNav}
      <KeyboardNavigation 
        onPlanetSelect={(planet) => handleBodySelect(planet)}
        currentSelectedIndex={currentSelectedIndex}
      />
    {/if}
  {/if}
  
  <!-- Info Modal -->
  <CelestialBodyInfoModal
    isOpen={showInfoModal}
    celestialBody={selectedBody}
    onClose={handleCloseModal}
    {lang}
    {translations}
  />

  <!-- Comparison Modal -->
  <ComparisonModal
    isOpen={showComparisonModal}
    bodies={comparisonBodies}
    onClose={handleCloseComparison}
    onRemoveBody={handleRemoveFromComparison}
    onAddBody={handleAddToComparison}
    {lang}
    {translations}
  />

  <!-- Orbit Speed Control -->
  {#if isSceneReady}
    <OrbitSpeedControl {lang} {translations} />
  {/if}
  
  <!-- Accessibility Manager -->
  <AccessibilityManager />
</div>

<style>
  .planetary-system-wrapper {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
  
  .system-container {
    width: 100%;
    height: 100%;
  }
  
  .system-info-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 15px;
    border-radius: 8px;
    max-width: 300px;
    backdrop-filter: blur(10px);
  }
  
  .system-info-panel h2 {
    margin: 0 0 10px 0;
    font-size: 1.2em;
  }
  
  .system-info-panel p {
    margin: 0;
    font-size: 0.9em;
    line-height: 1.4;
  }
  
  .controls-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .back-button {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    backdrop-filter: blur(10px);
  }
  
  .back-button:hover {
    background: rgba(0, 0, 0, 0.9);
  }
  
  .zoom-controls {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .zoom-controls button {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    backdrop-filter: blur(10px);
  }
  
  .zoom-controls button:hover {
    background: rgba(0, 0, 0, 0.9);
  }
</style>
