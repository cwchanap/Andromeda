<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gameState } from "../stores/gameStore";
  import { getLangFromUrl, useTranslations } from "../i18n/utils";
  import Button from "./ui/Button.svelte";
  import { ConstellationRenderer } from "../lib/constellation/ConstellationRenderer";
  import { constellations, getVisibleConstellations } from "../data/constellations";
  import { getCurrentLocation, isConstellationVisible, formatCoordinates } from "../utils/astronomy";
  import type { ConstellationViewState, SkyConfiguration, LocationData } from "../types/constellation";

  let container: HTMLElement;
  let renderer: ConstellationRenderer | null = null;
  let canvas2D: HTMLCanvasElement;
  let ctx2D: CanvasRenderingContext2D | null = null;
  let loading = true;
  let error: string | null = null;
  let debugInfo = "";
  let attemptCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  let webglSupported = true;
  
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
  let showDragInstructions = true;

  // Initialize translations
  if (typeof window !== 'undefined') {
    currentLang = getLangFromUrl(new URL(window.location.href));
  }
  t = useTranslations(currentLang);

  onMount(async () => {
    try {
      // Check WebGL support first
      webglSupported = checkWebGLSupport();
      if (!webglSupported) {
        throw new Error("WebGL is not supported by your browser or graphics card");
      }

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
      let location: LocationData;
      try {
        // For testing/demo purposes, use a shorter timeout and fallback quickly
        const locationPromise = getCurrentLocation();
        const timeoutPromise = new Promise<never>((_, reject) =>
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
      try {
        renderer = new ConstellationRenderer(container);

        // Get all stars from visible constellations
        const allStars = visibleConstellations.flatMap(constellation => constellation.stars);

        await renderer.initialize(allStars, visibleConstellations, skyConfig);
      } catch (rendererError) {
        console.warn('WebGL renderer failed, falling back to text display:', rendererError);
        webglSupported = false;
        // Don't re-throw, just continue with text display
      }

      // Only create 2D canvas if WebGL failed
      if (!webglSupported) {
        try {
          canvas2D = document.createElement('canvas');
          canvas2D.width = container.clientWidth;
          canvas2D.height = container.clientHeight;
          canvas2D.style.position = 'absolute';
          canvas2D.style.top = '0';
          canvas2D.style.left = '0';
          canvas2D.style.width = '100%';
          canvas2D.style.height = '100%';
          canvas2D.style.zIndex = '2';

          ctx2D = canvas2D.getContext('2d');
          if (ctx2D) {
            container.appendChild(canvas2D);
            drawConstellationsOnCanvas();
          }
        } catch (canvasError) {
          console.warn('Failed to create 2D canvas:', canvasError);
        }
      }

      loading = false;
      viewState.loading = false;
      debugInfo = "Constellation view ready";

      // Hide drag instructions after 5 seconds
      setTimeout(() => {
        showDragInstructions = false;
      }, 5000);

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
      // Highlighting or focusing logic placeholder
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

  // Check WebGL support
  function checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return false;

      // Cast to WebGL context to access WebGL-specific methods
      const webgl = gl as WebGLRenderingContext;

      // Try to create a simple WebGL shader to ensure it actually works
      const vertexShader = webgl.createShader(webgl.VERTEX_SHADER);
      const fragmentShader = webgl.createShader(webgl.FRAGMENT_SHADER);
      if (!vertexShader || !fragmentShader) return false;

      return true;
    } catch (e) {
      return false;
    }
  }

  // Draw constellations on 2D canvas
  function drawConstellationsOnCanvas() {
    if (!ctx2D || !canvas2D) return;

    const width = canvas2D.width;
    const height = canvas2D.height;

    // Ensure ctx2D is not null for the rest of the function
    const context = ctx2D;

    // Clear canvas with dark background
    context.fillStyle = '#000011';
    context.fillRect(0, 0, width, height);

    // Draw star field background
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 1.5;
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
    }

    // Draw all constellations, not just visible ones
    constellations.forEach((constellation, constellationIndex) => {

      // Calculate constellation position (arrange them in a grid)
      const totalConstellations = constellations.length;
      const constellationsPerRow = Math.ceil(Math.sqrt(totalConstellations));
      const constellationWidth = width / constellationsPerRow;
      const constellationHeight = height / Math.ceil(totalConstellations / constellationsPerRow);

      const row = Math.floor(constellationIndex / constellationsPerRow);
      const col = constellationIndex % constellationsPerRow;

      const centerX = col * constellationWidth + constellationWidth / 2;
      const centerY = row * constellationHeight + constellationHeight / 2;
      const scale = Math.min(constellationWidth, constellationHeight) * 0.3;

      // Draw constellation lines with different colors
      const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#F48FB1', '#CE93D8', '#90CAF9', '#A5D6A7', '#FFE082', '#F8BBD9', '#B39DDB'];
      context.strokeStyle = colors[constellationIndex % colors.length];
      context.lineWidth = 2;
      context.beginPath();

      constellation.lines.forEach(([startIndex, endIndex]) => {
        const startStar = constellation.stars[startIndex];
        const endStar = constellation.stars[endIndex];

        if (startStar && endStar) {
          // Convert RA/Dec to canvas coordinates (simplified projection)
          const startX = centerX + (startStar.rightAscension - 12) * scale * 0.5;
          const startY = centerY + (startStar.declination - 30) * scale * 0.3;
          const endX = centerX + (endStar.rightAscension - 12) * scale * 0.5;
          const endY = centerY + (endStar.declination - 30) * scale * 0.3;

          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
        }
      });
      context.stroke();

      // Draw stars
      constellation.stars.forEach((star, starIndex) => {
        const starX = centerX + (star.rightAscension - 12) * scale * 0.5;
        const starY = centerY + (star.declination - 30) * scale * 0.3;

        // Star size based on magnitude (brighter = larger)
        const starSize = Math.max(2, (6 - star.magnitude) * 2);

        // Draw star
        context.fillStyle = star.color;
        context.beginPath();
        context.arc(starX, starY, starSize, 0, Math.PI * 2);
        context.fill();

        // Add glow effect for brighter stars
        if (star.magnitude < 2) {
          context.shadowColor = star.color;
          context.shadowBlur = starSize * 2;
          context.beginPath();
          context.arc(starX, starY, starSize, 0, Math.PI * 2);
          context.fill();
          context.shadowBlur = 0;
        }

        // Draw star name for brightest stars
        if (star.magnitude < 1.5) {
          context.fillStyle = '#FFFFFF';
          context.font = '12px Arial';
          context.textAlign = 'center';
          context.fillText(star.name, starX, starY - starSize - 8);
        }
      });

      // Draw constellation name
      context.fillStyle = colors[constellationIndex % colors.length];
      context.font = 'bold 16px Arial';
      context.textAlign = 'center';
      context.fillText(constellation.name, centerX, centerY - constellationHeight * 0.35);
    });
  }
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
  {#if loading || error || !webglSupported}
    <div class="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
      <div class="text-center text-white max-w-md mx-auto px-4">
        {#if !webglSupported}
          <div class="mb-4">
            <div class="text-amber-400 text-4xl">⚠️</div>
          </div>
          <h2 class="text-xl font-semibold mb-2 text-amber-400">3D Graphics Not Available</h2>
          <p class="text-sm text-gray-300 mb-4">
            Your browser doesn't support WebGL, which is required for the constellation view.
          </p>
          <div class="text-xs text-gray-400 mb-4">
            <p class="mb-2">Try these solutions:</p>
            <ul class="text-left list-disc list-inside space-y-1">
              <li>Update to the latest browser version</li>
              <li>Enable hardware acceleration in settings</li>
              <li>Try a different browser (Chrome, Firefox, Edge)</li>
            </ul>
          </div>
          <Button
            variant="outline"
            size="sm"
            on:click={handleBackToMenu}
            className="text-white border-white/30 hover:bg-white/10"
          >
            Back to Menu
          </Button>
        {:else if loading}
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

  <!-- Drag Instructions Overlay -->
  {#if !loading && !error && webglSupported && showDragInstructions}
    <div class="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
      <div class="bg-black/70 backdrop-blur-sm rounded-lg border border-cyan-400/30 p-4 text-white text-center">
        <div class="flex items-center justify-center space-x-2 mb-2">
          <span class="text-cyan-400">🖱️</span>
          <span class="text-sm font-medium">Drag to explore the 360° sky</span>
          <span class="text-cyan-400">🖱️</span>
        </div>
        <div class="text-xs text-gray-300">
          Click and drag to look around • Scroll to zoom
        </div>
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

  <!-- Main Content Area -->
  <div class="constellation-main-content">
    <!-- 3D Container (background) -->
    <div bind:this={container} class="constellation-container"></div>

    <!-- Text-based constellation display (always visible) -->
    <!-- <div class="text-constellation-display">
      <h3 class="text-xl font-bold text-white mb-4">All Constellations</h3>
      <div class="grid gap-4 md:grid-cols-3 max-w-6xl mx-auto">
        {#each constellations as constellation}
          <div class="bg-black/30 rounded-lg p-4 border border-white/20 hover:border-cyan-400/50 transition-colors">
            <h4 class="text-lg font-semibold text-cyan-300 mb-2">{constellation.name}</h4>
            <p class="text-sm text-gray-300 mb-2">{constellation.abbreviation}</p>
            <p class="text-xs text-gray-400 mb-3">{constellation.description}</p>
            <div class="text-xs">
              <span class="text-gray-400">Stars:</span>
              <span class="text-cyan-200 ml-1">{constellation.stars.length}</span>
            </div>
            <div class="text-xs mt-1">
              <span class="text-gray-400">Best viewing:</span>
              <span class="text-cyan-200 ml-1">
                {constellation.visibility.bestMonths.map(m =>
                  new Date(2000, m - 1).toLocaleDateString(currentLang, { month: 'short' })
                ).join(', ')}
              </span>
            </div>
            {#if constellation.mythology}
              <div class="text-xs mt-2 italic text-gray-400">
                "{constellation.mythology}"
              </div>
            {/if}
          </div>
        {/each}
      </div>
      {#if !webglSupported}
        <div class="mt-6 text-center">
          <p class="text-sm text-amber-400">
            ⚠️ WebGL not available - constellation information shown above
          </p>
          <p class="text-xs text-gray-400 mt-2">
            Enable WebGL in your browser to see the interactive 3D star field
          </p>
        </div>
      {:else}
        <div class="mt-6 text-center">
          <p class="text-sm text-cyan-400">
            ✨ 3D star field active - use mouse to explore the sky
          </p>
        </div>
      {/if}
    </div> -->
  </div>
</div>

<style>
  .constellation-view {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000; /* Pure black background for space */
  }

  .constellation-main-content {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .constellation-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    cursor: grab;
  }

  .constellation-container:active {
    cursor: grabbing;
  }

  /* .text-constellation-display {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 320px;
    max-height: 60vh;
    overflow-y: auto;
    z-index: 10;
    background: rgba(0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  } */

  /* Responsive adjustments */
  /* @media (max-width: 1024px) {
    .text-constellation-display {
      right: 20px;
      left: 20px;
      bottom: 20px;
      max-height: 40vh;
    }
  } */

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
