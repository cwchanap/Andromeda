<script lang="ts">
  import LoadingAnimation from './LoadingAnimation.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import KeyboardNavigation from './KeyboardNavigation.svelte';
  import AccessibilityManager from './AccessibilityManager.svelte';
  import CelestialBodyInfoModal from './CelestialBodyInfoModal.svelte';
  import ComparisonModal from './ComparisonModal.svelte';
  import OrbitSpeedControl from './OrbitSpeedControl.svelte';
  import HudPanel from './hud/HudPanel.svelte';
  import HudButton from './hud/HudButton.svelte';
  import HudSearch from './hud/HudSearch.svelte';
  import TargetLockOverlay from './hud/TargetLockOverlay.svelte';
  import { matchesQuery } from '../lib/hud/list';
  import { gameState, gameActions, settings } from '../stores/gameStore';
  import { onMount, onDestroy } from 'svelte';
  import { PlanetarySystemRenderer, planetarySystemRegistry } from '../lib/planetary-system';
  import { getLangFromUrl, useTranslations } from '../i18n/utils';
  import { routes, type AppLocale } from '../i18n/routes';
  import type { PlanetarySystemConfig, PlanetarySystemEvents } from '../lib/planetary-system/types';
  import type { CelestialBodyData } from '../types/game';
  
  // Props
  export let systemId: string;
  export let lang: AppLocale = 'en';
  export let translations: Record<string, string> = {};
  
  // Translation function
  let t: (key: string) => string;
  let currentLang: AppLocale = lang;
  
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
  let showFinder = false;
  let finderQuery = "";
  let pinnedBodyId: string | null = null;
  let pinnedName = "";
  let lockPos: { x: number; y: number; visible: boolean } | null = null;
  let lockRafId = 0;
  let loadingMessage = "Loading planetary system...";
  let debugInfo = "";
  let hasBarycenterOverlay = false;
  let showBarycenterOverlay = false;
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
    window.location.href = routes.home(currentLang);
  };
  
  const handleZoomChange = (zoom: number) => {
    currentZoom = zoom;
  };

  const toggleBarycenterOverlay = () => {
    showBarycenterOverlay = !showBarycenterOverlay;
    planetarySystemRenderer?.setBarycenterOverlayVisible(showBarycenterOverlay);
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
        onSystemLoad: (_loadedSystemId) => {
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
      const controls = planetarySystemRenderer?.getControls();
      if (controls) {
        zoomControls = {
          zoomIn: () => controls.zoomIn(),
          zoomOut: () => controls.zoomOut(),
          resetView: () => controls.resetView()
        };
      }

      hasBarycenterOverlay = planetarySystemRenderer?.hasOrbitAnchors() ?? false;
      showBarycenterOverlay = planetarySystemRenderer?.isBarycenterOverlayVisibleByDefault() ?? false;
      
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
    cancelAnimationFrame(lockRafId);
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

  // All selectable bodies in the active system (star + planets + moons present in data).
  $: allBodies = (() => {
    const data = planetarySystemRenderer?.getSystemData();
    if (!data) return [] as CelestialBodyData[];
    return [data.star, ...data.celestialBodies];
  })();

  $: finderResults = allBodies.filter((b) =>
    matchesQuery(finderQuery, [b.name, b.type]),
  );

  const bodyTypeKey = (type: string) => `planet.type.${type}`;

  function startLockLoop() {
    cancelAnimationFrame(lockRafId);
    const tick = () => {
      if (!pinnedBodyId || !planetarySystemRenderer) {
        lockPos = null;
        return;
      }
      const world = planetarySystemRenderer.getBodyWorldPosition(pinnedBodyId);
      lockPos = world ? planetarySystemRenderer.worldToScreen(world) : null;
      lockRafId = requestAnimationFrame(tick);
    };
    lockRafId = requestAnimationFrame(tick);
  }

  function pinBody(body: CelestialBodyData) {
    if (!planetarySystemRenderer) return;
    pinnedBodyId = body.id;
    pinnedName = body.name;
    planetarySystemRenderer.focusOnBody(body.id);
    showFinder = false;
    finderQuery = "";
    startLockLoop();
  }

  function unpin() {
    pinnedBodyId = null;
    pinnedName = "";
    cancelAnimationFrame(lockRafId);
    lockPos = null;
  }

  function handleFinderHotkeys(event: KeyboardEvent) {
    if (event.key === "/" && !showFinder) {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      showFinder = true;
    } else if (event.key === "Escape" && showFinder) {
      showFinder = false;
    }
  }
</script>

<svelte:window on:resize={handleResize} on:keydown={handleFinderHotkeys} />

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
    <!-- System readout (top-left) -->
    <div class="hud-info">
      <HudPanel title={t ? (t(`systems.${systemId}.name`) || planetarySystemRegistry.getSystem(systemId)?.name || t('systems.unknown')) : 'Unknown System'}>
        <p class="hud-details-desc" style="margin:0;">
          {t ? (t(`systems.${systemId}.description`) || planetarySystemRegistry.getSystem(systemId)?.description || '') : ''}
        </p>
      </HudPanel>
    </div>

    <!-- Command rail (top-right) -->
    <div class="hud-controls hud-rail">
      <HudButton bracket on:click={handleBackToMenu}>{t ? t('controls.backToMenu') : 'Back to Menu'}</HudButton>
      <HudButton ariaLabel={t ? t('finder.open') : 'Jump to body'} on:click={() => (showFinder = true)}>{t ? t('finder.title') : 'Jump To'}</HudButton>
      {#if zoomControls}
        <HudButton on:click={zoomControls.zoomIn}>{t ? t('controls.zoomIn') : 'Zoom In'}</HudButton>
        <HudButton on:click={zoomControls.zoomOut}>{t ? t('controls.zoomOut') : 'Zoom Out'}</HudButton>
        <HudButton on:click={zoomControls.resetView}>{t ? t('controls.resetView') : 'Reset View'}</HudButton>
      {/if}
      {#if hasBarycenterOverlay}
        <HudButton ariaPressed={showBarycenterOverlay} on:click={toggleBarycenterOverlay}>
          {showBarycenterOverlay
            ? (t ? t('controls.hideBarycenters') : 'Hide barycenters')
            : (t ? t('controls.showBarycenters') : 'Show barycenters')}
        </HudButton>
      {/if}
      {#if isSceneReady}
        <OrbitSpeedControl {lang} {translations} />
      {/if}
    </div>

    <!-- JUMP TO finder (toggle-open) -->
    {#if showFinder}
      <div class="hud-finder">
        <HudPanel title={t ? t('finder.title') : 'Jump To'}>
          <HudSearch
            bind:value={finderQuery}
            autofocus={true}
            placeholder={t ? t('finder.placeholder') : 'Search bodies…'}
            ariaLabel={t ? t('finder.placeholder') : 'Search bodies…'}
            on:keydown={(e) => { if (e.key === 'Enter' && finderResults[0]) pinBody(finderResults[0]); }}
          />
          {#if finderResults.length === 0}
            <div class="hud-section-label" style="text-align:center; padding:1rem 0;">{t ? t('finder.empty') : 'No bodies match query'}</div>
          {:else}
            <div class="hud-list" style="margin-top:8px;">
              {#each finderResults as body (body.id)}
                <button
                  type="button"
                  class="hud-list-row"
                  class:is-selected={body.id === pinnedBodyId}
                  on:click={() => pinBody(body)}
                >
                  <span class="row-abbr">[{t ? t(bodyTypeKey(body.type)) : body.type}]</span>
                  <span class="row-name">{body.name}</span>
                  <span class="row-leader"></span>
                  <span class="row-count"></span>
                </button>
              {/each}
            </div>
          {/if}
        </HudPanel>
      </div>
    {/if}

    <!-- Pinned chip -->
    {#if pinnedBodyId}
      <div class="hud-pinned">
        <span class="hud-chip">
          {t ? t('finder.pinned') : 'Pinned'}: {pinnedName}
          <button class="hud-chip-x" aria-label={t ? t('finder.unpin') : 'Unpin'} on:click={unpin}>✕</button>
        </span>
      </div>
    {/if}

    <!-- Target-lock reticle overlay -->
    {#if pinnedBodyId && lockPos && lockPos.visible}
      <div class="hud-lock-layer" aria-hidden="true">
        <TargetLockOverlay visible={true} x={lockPos.x} y={lockPos.y} name={pinnedName} />
      </div>
    {/if}

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
  
  .hud-info {
    position: absolute;
    top: 20px;
    left: 20px;
    max-width: 320px;
    z-index: 10;
  }
  .hud-controls {
    position: absolute;
    top: 64px;
    right: 20px;
    z-index: 10;
  }
  .hud-finder {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: min(420px, 90vw);
    z-index: 20;
  }
  .hud-pinned {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 20;
  }
  .hud-lock-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 15;
  }
</style>
