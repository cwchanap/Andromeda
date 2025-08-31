<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gameState } from "../stores/gameStore";
  import { getLangFromUrl, useTranslations } from "../i18n/utils";
  import Button from "./ui/Button.svelte";
  import { ConstellationRenderer } from "../lib/constellation/ConstellationRenderer";
  import { constellations, getVisibleConstellations } from "../data/constellations";
  import { getCurrentLocation, isConstellationVisible, formatCoordinates } from "../utils/astronomy";
  import type { ConstellationViewState, SkyConfiguration } from "../types/constellation";

  let container: HTMLElement;
  let renderer: ConstellationRenderer | null = null;
  let loading = true;
  let error: string | null = null;
  let debugInfo = "";
  let attemptCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  
  // Current language and translations
  let currentLang: 'en' | 'zh' | 'ja' = 'en';
  let t: (key: any) => string;

  // Constellation view state
  let viewState: ConstellationViewState = {
    loading: true,
    error: null,
    skyConfig: null,
    visibleConstellations: [],
    selectedConstellation: null,
    locationPermissionGranted: false
  };

  // UI state
  let showControls = true;
  let showLocationInfo = true;

  // Initialize translations
  if (typeof window !== 'undefined') {
    currentLang = getLangFromUrl(new URL(window.location.href));
  }
  t = useTranslations(currentLang);

  onMount(async () => {
    try {
      // Wait for container to be available
      const maxAttempts = 10;
      while (!container && attemptCount < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attemptCount++;
        debugInfo = `Waiting for container... (${attemptCount}/${maxAttempts})`;
      }

      if (!container) {
        throw new Error("Container element not found");
      }

      debugInfo = "Getting user location...";
      
      // Get user's current location
      let location;
      try {
        // For testing/demo purposes, use a shorter timeout and fallback quickly
        const locationPromise = getCurrentLocation();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Location timeout")), 3000)
        );
        
        location = await Promise.race([locationPromise, timeoutPromise]);
        viewState.locationPermissionGranted = true;
        debugInfo = `Location obtained: ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
      } catch (locationError) {
        console.warn("Could not get location:", locationError);
        // Use default location (New York City for better constellation visibility)
        location = {
          latitude: 40.7128,
          longitude: -74.0060,
          timezone: "America/New_York"
        };
        viewState.locationPermissionGranted = false;
        debugInfo = "Using default location (New York City)";
      }

      const now = new Date();
      
      // Create sky configuration
      const skyConfig: SkyConfiguration = {
        location,
        dateTime: now,
        fieldOfView: 80,
        showConstellationLines: true,
        showStarNames: true,
        minimumMagnitude: 4.0 // Show stars up to magnitude 4
      };

      viewState.skyConfig = skyConfig;

      // Get visible constellations
      const visibleConstellations = getVisibleConstellations(
        location.latitude,
        now.getMonth() + 1
      );
      
      viewState.visibleConstellations = visibleConstellations.map(c => c.id);

      debugInfo = "Initializing 3D renderer...";

      // Initialize constellation renderer
      renderer = new ConstellationRenderer(container);
      
      // Get all stars from visible constellations
      const allStars = visibleConstellations.flatMap(constellation => constellation.stars);
      
      await renderer.initialize(allStars, visibleConstellations, skyConfig);

      loading = false;
      viewState.loading = false;
      debugInfo = "Constellation view ready";

    } catch (err) {
      console.error("Failed to initialize constellation view:", err);
      error = err instanceof Error ? err.message : "Unknown error occurred";
      viewState.error = error;
      loading = false;
      
      // Retry after 3 seconds
      retryTimeout = setTimeout(() => {
        if (!renderer) {
          attemptCount = 0;
          error = null;
          viewState.error = null;
          loading = true;
          viewState.loading = true;
          // Re-run onMount logic
          onMount(() => {});
        }
      }, 3000);
    }
  });

  onDestroy(() => {
    if (renderer) {
      renderer.dispose();
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  });

  const handleBackToMenu = () => {
    const targetUrl = currentLang === 'en' ? '/' : `/${currentLang}/`;
    window.location.href = targetUrl;
  };

  const handleToggleControls = () => {
    showControls = !showControls;
  };

  const handleToggleLocationInfo = () => {
    showLocationInfo = !showLocationInfo;
  };

  const handleSelectConstellation = (constellationId: string) => {
    viewState.selectedConstellation = constellationId;
    const constellation = constellations.find(c => c.id === constellationId);
    if (constellation) {
      // You could add highlighting or focusing logic here
      console.log("Selected constellation:", constellation.name);
    }
  };

  // Format current time for display
  $: currentTimeString = viewState.skyConfig?.dateTime 
    ? viewState.skyConfig.dateTime.toLocaleString(currentLang, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  // Format location for display
  $: locationString = viewState.skyConfig?.location
    ? `${viewState.skyConfig.location.latitude.toFixed(4)}°, ${viewState.skyConfig.location.longitude.toFixed(4)}°`
    : '';
</script>

<div class="constellation-view">
  <!-- Back button -->
  <div class="absolute top-4 left-4 z-20">
    <button
      type="button"
      class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border shadow-xs hover:text-accent-foreground bg-black/50 text-white border-white/30 hover:bg-white/10 h-9 rounded-md px-3"
      on:click={handleBackToMenu}
    >
      {t('constellation.backToMenu')}
    </button>
  </div>

  <!-- Controls toggle -->
  <div class="absolute top-4 right-4 z-20">
    <button
      type="button"
      class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border shadow-xs hover:text-accent-foreground bg-black/50 text-white border-white/30 hover:bg-white/10 h-9 rounded-md px-3"
      on:click={handleToggleControls}
    >
      {showControls ? '⚙️' : '📊'}
    </button>
  </div>

  <!-- Loading/Error overlay -->
  {#if loading || error}
    <div class="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
      <div class="text-center text-white">
        {#if loading}
          <div class="mb-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          </div>
          <h2 class="text-xl font-semibold mb-2">{t('constellation.loading')}</h2>
          <p class="text-sm text-gray-300">{debugInfo}</p>
          {#if !viewState.locationPermissionGranted && attemptCount > 5}
            <p class="text-xs text-yellow-300 mt-2">{t('constellation.locationPermission')}</p>
          {/if}
        {:else if error}
          <div class="mb-4">
            <div class="text-red-400 text-4xl">❌</div>
          </div>
          <h2 class="text-xl font-semibold mb-2 text-red-400">{t('constellation.error')}</h2>
          <p class="text-sm text-gray-300 mb-4">{error}</p>
          <Button
            variant="outline"
            size="sm"
            on:click={() => window.location.reload()}
            className="text-white border-white/30 hover:bg-white/10"
          >
            Retry
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Controls panel -->
  {#if showControls && !loading && !error}
    <div class="absolute top-20 right-4 z-20 w-80">
      <div class="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-white">
        <h3 class="text-lg font-semibold mb-3 text-cyan-300">{t('constellation.title')}</h3>
        
        <!-- Location info toggle -->
        <div class="mb-4">
          <button
            type="button"
            class="w-full inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border shadow-xs hover:text-accent-foreground text-white border-white/30 hover:bg-white/10 h-9 rounded-md px-3"
            on:click={handleToggleLocationInfo}
          >
            {showLocationInfo ? 'Hide' : 'Show'} Location Info
          </button>
        </div>

        <!-- Location and time info -->
        {#if showLocationInfo && viewState.skyConfig}
          <div class="mb-4 space-y-2">
            <div>
              <span class="text-sm text-gray-300">{t('constellation.currentLocation')}:</span>
              <div class="text-xs text-cyan-200">{locationString}</div>
              {#if !viewState.locationPermissionGranted}
                <div class="text-xs text-yellow-300">({t('constellation.locationPermission')})</div>
              {/if}
            </div>
            
            <div>
              <span class="text-sm text-gray-300">{t('constellation.currentTime')}:</span>
              <div class="text-xs text-cyan-200">{currentTimeString}</div>
            </div>
          </div>
        {/if}

        <!-- Visible constellations -->
        <div>
          <h4 class="text-sm font-medium mb-2 text-gray-300">{t('constellation.visibility')}:</h4>
          <div class="space-y-1 max-h-40 overflow-y-auto">
            {#each viewState.visibleConstellations as constellationId}
              {#each constellations.filter(c => c.id === constellationId) as constellation}
                <button
                  type="button"
                  class="w-full text-left px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors
                         {viewState.selectedConstellation === constellation.id ? 'bg-cyan-600/30 border border-cyan-400/50' : ''}"
                  on:click={() => handleSelectConstellation(constellation.id)}
                  data-constellation-id={constellation.id}
                >
                  <div class="font-medium">{constellation.name}</div>
                  <div class="text-gray-400 text-xs">{constellation.abbreviation} • {constellation.stars.length} stars</div>
                </button>
              {/each}
            {/each}
          </div>
        </div>

        <!-- Selected constellation info -->
        {#if viewState.selectedConstellation}
          {#each constellations.filter(c => c.id === viewState.selectedConstellation) as constellation}
            <div class="mt-4 pt-4 border-t border-white/20">
              <h4 class="text-sm font-medium text-cyan-300">{constellation.name}</h4>
              <p class="text-xs text-gray-300 mt-1">{constellation.description}</p>
              {#if constellation.mythology}
                <p class="text-xs text-gray-400 mt-2 italic">{constellation.mythology}</p>
              {/if}
              <div class="mt-2 text-xs">
                <span class="text-gray-400">Best months:</span>
                <span class="text-cyan-200">
                  {constellation.visibility.bestMonths.map(m => 
                    new Date(2000, m - 1).toLocaleDateString(currentLang, { month: 'short' })
                  ).join(', ')}
                </span>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- 3D Container -->
  <div bind:this={container} class="constellation-container"></div>
</div>

<style>
  .constellation-view {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
  }

  .constellation-container {
    width: 100%;
    height: 100%;
  }

  /* Custom scrollbar for constellation list */
  .space-y-1.max-h-40.overflow-y-auto::-webkit-scrollbar {
    width: 4px;
  }

  .space-y-1.max-h-40.overflow-y-auto::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }

  .space-y-1.max-h-40.overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(34, 197, 94, 0.5);
    border-radius: 2px;
  }

  .space-y-1.max-h-40.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(34, 197, 94, 0.7);
  }
</style>
