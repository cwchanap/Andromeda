<script lang="ts">
  import LoadingAnimation from '@/components/LoadingAnimation.svelte';
  import KeyboardNavigation from '@/components/KeyboardNavigation.svelte';
  import AccessibilityManager from '@/components/AccessibilityManager.svelte';
  import CelestialBodyInfoModal from '@/components/CelestialBodyInfoModal.svelte';
  import ComparisonModal from '@/components/ComparisonModal.svelte';
  import OrbitSpeedControl from '@/components/OrbitSpeedControl.svelte';
  import Panel from '@/components/ui/Panel.svelte';
  import Button from '@/components/ui/Button.svelte';
  import SearchInput from '@/components/ui/SearchInput.svelte';
  import TargetLockOverlay from '@/components/view/TargetLockOverlay.svelte';
  import ViewOverlay from '@/components/view/ViewOverlay.svelte';
  import { matchesQuery } from '@/lib/hud/list';
  import { gameState, gameActions, settings } from '@/stores/gameStore';
  import { onMount, onDestroy } from 'svelte';
  import { PlanetarySystemRenderer, planetarySystemRegistry } from '@/lib/planetary-system';
  import { getLangFromUrl, useTranslations } from '@/i18n/utils';
  import type { AppLocale } from '@/i18n/routes';
  import type { PlanetarySystemConfig, PlanetarySystemEvents } from '@/lib/planetary-system/types';
  import type { CelestialBodyData } from '@/types/game';
  import { getCurrentView, type ViewId } from '@/lib/view/currentView';

  // Props
  export let systemId: string;
  export let lang: AppLocale = 'en';
  export let translations: Record<string, string> = {};

  // Publish HUD lang to the shared store so the HUD shell can subscribe
  // via $gameState instead of receiving drilled props.
  gameActions.setHudLang(lang);

  // Translation function (initialized with no-op fallback; overwritten by reactive block)
  let t: (key: string) => string = (key: string) => key;
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
  let currentView: ViewId = "star";
  if (typeof window !== 'undefined') {
    currentView = getCurrentView(window.location.pathname) ?? "star";
  }
  gameActions.setHudView(currentView);
  let currentZoom = 50;
  let showFinder = false;
  let finderQuery = "";
  let pinnedBodyId: string | null = null;
  let pinnedName = "";
  let lockPos: { x: number; y: number; visible: boolean } | null = null;
  let lockRafId = 0;
  let loadingMessage = "Loading planetary system...";
  let errorMessage: string | null = null;
  let debugInfo = "";
  let hasBarycenterOverlay = false;
  let showBarycenterOverlay = false;
  let zoomControls: {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  } | null = null;
  let currentSelectedIndex = -1;
  let finderEl: HTMLElement | null = null;
  
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
        onSystemLoad: (_loadedSystemId) => {
          isSceneReady = true;
          isLoading = false;
          loadingProgress = 100;
        },
        onError: (error) => {
          console.error("Planetary system error:", error);
          isLoading = false;
          errorMessage = error instanceof Error ? error.message : String(error);
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
      // Dispose and null the failed renderer so retry can succeed
      if (planetarySystemRenderer) {
        try {
          planetarySystemRenderer.cleanup();
        } catch (cleanupErr) {
          console.error("Cleanup of failed renderer:", cleanupErr);
        }
        planetarySystemRenderer = null;
      }
      isLoading = false;
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  };
  
  onMount(async () => {
    // Wait for the container to be available (DOM may mount after this component)
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
  
  onDestroy(() => {
    cancelAnimationFrame(lockRafId);
    const renderer = planetarySystemRenderer;
    planetarySystemRenderer = null;
    if (renderer) {
      renderer.cleanup().catch((err) => console.error("Cleanup error:", err));
    }
  });
  
  // Synchronize all settings with renderer in a single reactive statement
  $: if (planetarySystemRenderer) {
    planetarySystemRenderer.updateConfig({
      enableAnimations,
      orbitSpeedMultiplier: $settings.orbitSpeedMultiplier
    });
  }

  // Mirror the settings-slot barycenter checkbox (bind:checked) to the renderer
  $: if (planetarySystemRenderer && isSceneReady) {
    planetarySystemRenderer.setBarycenterOverlayVisible(showBarycenterOverlay);
  }

  // All selectable bodies in the active system (star + planets + moons present in data).
  // Gated on isSceneReady so this re-evaluates after initialize() populates system data.
  $: allBodies = (() => {
    if (!isSceneReady) return [] as CelestialBodyData[];
    const data = planetarySystemRenderer?.getSystemData();
    if (!data) return [] as CelestialBodyData[];
    return [data.star, ...data.celestialBodies];
  })();

  $: finderResults = allBodies.filter((b) =>
    matchesQuery(finderQuery, [b.name, b.type]),
  );

  // Clamp index when results shrink
  $: if (focusedFinderIndex >= finderResults.length && finderResults.length > 0) {
    focusedFinderIndex = finderResults.length - 1;
  } else if (finderResults.length === 0) {
    focusedFinderIndex = 0;
  }

  const bodyTypeKey = (type: string) => `planet.type.${type}`;

  function startLockLoop() {
    cancelAnimationFrame(lockRafId);
    const tick = () => {
      if (!pinnedBodyId || !planetarySystemRenderer) {
        lockPos = null;
        return;
      }
      try {
        const world = planetarySystemRenderer.getBodyWorldPosition(pinnedBodyId);
        lockPos = world ? planetarySystemRenderer.worldToScreen(world) : null;
        lockRafId = requestAnimationFrame(tick);
      } catch {
        unpin();
      }
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

  let focusedFinderIndex = 0;

  function handleFinderHotkeys(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "/" && !showFinder) {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      showFinder = true;
      focusedFinderIndex = 0;
    } else if (event.key === "Escape" && showFinder) {
      showFinder = false;
    }
  }

  function handleFinderListKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      focusedFinderIndex = (focusedFinderIndex + 1) % finderResults.length;
      focusFinderRow();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      focusedFinderIndex = focusedFinderIndex <= 0 ? finderResults.length - 1 : focusedFinderIndex - 1;
      focusFinderRow();
    }
  }

  function focusFinderRow() {
    const rows = finderEl?.querySelectorAll('.ui-list-row');
    (rows?.[focusedFinderIndex] as HTMLElement | undefined)?.focus();
  }

  function handleClickOutside(event: MouseEvent) {
    if (!showFinder) return;
    const target = event.target as HTMLElement;
    // Close if click is outside the finder panel and not on the finder toggle button
    if (finderEl && !finderEl.contains(target) && !target.closest('.ui-rail')) {
      showFinder = false;
    }
  }
</script>

<svelte:window on:keydown={handleFinderHotkeys} on:click={handleClickOutside} />

<div class="planetary-system-wrapper">
  <div id="planetary-system-renderer" class="system-container">
    {#if isLoading}
      <LoadingAnimation 
        progress={loadingProgress} 
        message={loadingMessage} 
      />
    {/if}
    {#if errorMessage}
      <div class="ui-error" role="alert">
        <p class="ui-error-title">Initialization failed</p>
        <p class="ui-error-msg">{errorMessage}</p>
        <button class="ui-btn ui-btn--primary ui-error-retry" on:click={() => { errorMessage = null; isLoading = true; initializePlanetarySystem(document.getElementById('planetary-system-renderer')!); }}>Retry</button>
      </div>
    {/if}
  </div>
  
  <ViewOverlay currentView={currentView} {lang} {translations}>
    <div slot="info">
      <Panel caption={t('viewSwitcher.star')} title={t(`systems.${systemId}.name`) || planetarySystemRegistry.getSystem(systemId)?.name || t('systems.unknown')}>
        <p class="ui-details-desc">
          {t(`systems.${systemId}.description`) || planetarySystemRegistry.getSystem(systemId)?.description || ''}
        </p>
      </Panel>
    </div>

    <div slot="controls" class="ui-rail">
      <Button ariaLabel={t('finder.open')} on:click={() => { showFinder = true; focusedFinderIndex = 0; }}>{t('finder.title')}</Button>
      {#if zoomControls}
        <Button on:click={zoomControls.zoomIn}>{t('controls.zoomIn')}</Button>
        <Button on:click={zoomControls.zoomOut}>{t('controls.zoomOut')}</Button>
        <Button on:click={zoomControls.resetView}>{t('controls.resetView')}</Button>
      {/if}
    </div>

    <div slot="settings">
      {#if hasBarycenterOverlay}
        <label class="ui-setting"><input type="checkbox" bind:checked={showBarycenterOverlay}> {t('controls.showBarycenters')}</label>
      {/if}
      {#if isSceneReady}
        <OrbitSpeedControl {lang} {translations} />
      {/if}
    </div>
  </ViewOverlay>

  {#if isSceneReady}
    <!-- JUMP TO finder (toggle-open) -->
    {#if showFinder}
      <div class="ui-finder" bind:this={finderEl}>
        <Panel title={t('finder.title')}>
          <SearchInput
            bind:value={finderQuery}
            autofocus={true}
            placeholder={t('finder.placeholder')}
            ariaLabel={t('finder.placeholder')}
            on:keydown={(e) => {
              if (e.key === 'ArrowDown' && finderResults.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                const firstBtn = finderEl?.querySelector('.ui-list-row') as HTMLElement | null;
                firstBtn?.focus();
                focusedFinderIndex = 0;
              } else if (e.key === 'Enter' && finderResults[0]) {
                e.preventDefault();
                e.stopPropagation();
                pinBody(finderResults[0]);
              }
            }}
          />
          {#if finderResults.length === 0}
            <p class="finder-empty">{t('finder.empty')}</p>
          {:else}
            <ul class="ui-list mt-2" aria-label={t('finder.title')} on:keydown={handleFinderListKeydown}>
              {#each finderResults as body, i (body.id)}
                <li aria-selected={body.id === pinnedBodyId ? "true" : undefined}>
                  <button
                    type="button"
                    class="ui-list-row"
                    class:is-selected={body.id === pinnedBodyId}
                    class:focus-visible-ring={i === focusedFinderIndex}
                    aria-current={body.id === pinnedBodyId ? "true" : undefined}
                    on:click={() => pinBody(body)}
                  >
                    <span class="row-abbr">{t(bodyTypeKey(body.type))}</span>
                    <span class="row-name">{body.name}</span>
                    <span class="row-leader"></span>
                    <span class="row-count">{#if body.keyFacts?.moons != null}{body.keyFacts.moons}<span aria-hidden="true">☽</span><span class="sr-only"> moons</span>{/if}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </Panel>
      </div>
    {/if}

    <!-- Pinned chip -->
    {#if pinnedBodyId}
      <div class="ui-pinned">
        <span class="ui-chip">
          {t('finder.pinned')}: {pinnedName}
          <button class="ui-chip-x" aria-label={t('finder.unpin')} on:click={unpin}>✕</button>
        </span>
      </div>
    {/if}

    <!-- Target-lock reticle overlay -->
    {#if pinnedBodyId && lockPos && lockPos.visible}
      <div class="ui-lock-layer" aria-hidden="true">
        <TargetLockOverlay x={lockPos.x} y={lockPos.y} name={pinnedName} lockedLabel={t('finder.locked')} />
      </div>
    {/if}

    <!-- Keyboard Navigation -->
    {#if enableKeyboardNav}
      <KeyboardNavigation 
        onPlanetSelect={(planet) => handleBodySelect(planet)}
        currentSelectedIndex={currentSelectedIndex}
        {lang}
        {translations}
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
  
  .ui-rail {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    min-width: 128px;
  }
  .ui-setting {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--color-text);
  }
  .ui-details-desc {
    margin: 0;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 17px;
    line-height: 1.4;
    color: var(--color-text-soft);
  }
  .finder-empty {
    margin: 12px 0 0;
    text-align: center;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 16px;
    color: var(--color-text-muted);
  }
  .ui-finder {
    position: absolute;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    width: min(420px, 90vw);
    z-index: 20;
  }
  .ui-pinned {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 20;
  }
  .ui-lock-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 15;
  }
  .ui-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .ui-list li {
    padding: 0;
    margin: 0;
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
    border-width: 0;
  }
  .ui-error {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: var(--color-scrim);
    color: var(--color-text);
    z-index: 30;
  }
  .ui-error-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    color: var(--color-danger);
  }
  .ui-error-msg {
    margin: 0;
    max-width: 400px;
    font-size: 14px;
    text-align: center;
    color: var(--color-text-soft);
  }
  .ui-error-retry {
    margin-top: 8px;
  }
</style>
