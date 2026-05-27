<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gameState } from "@/stores/gameStore";
  import { getLangFromUrl, useTranslations } from "@/i18n/utils";
  import { routes, type AppLocale } from "@/i18n/routes";
  import Button from "@/components/ui/Button.svelte";
  import { ConstellationRenderer } from "@/lib/constellation/ConstellationRenderer";
  import { constellations, getVisibleConstellations } from "@/data/constellations";
  import { getCurrentLocation, isConstellationVisible, formatCoordinates, celestialToSphere } from "@/utils/astronomy";
  import type { ConstellationViewState, SkyConfiguration, LocationData } from "@/types/constellation";
  import ScanLines from "@/components/hud/ScanLines.svelte";
  import HudReticle from "@/components/hud/HudReticle.svelte";
  import HudCallout from "@/components/hud/HudCallout.svelte";
  import TargetLockOverlay from "@/components/hud/TargetLockOverlay.svelte";
  import BootSequence from "@/components/hud/BootSequence.svelte";
  import HudFrame from "@/components/hud/HudFrame.svelte";
  import GlitchText from "@/components/hud/GlitchText.svelte";

  export let lang: AppLocale = "en";

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
  let currentLang: AppLocale = lang;
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
  let showDragInstructions = true;

  // HUD state
  let hoverPos: { x: number; y: number } | null = null;
  let lockedPos: { x: number; y: number; visible: boolean } | null = null;
  let hoverStarPos: { x: number; y: number; name: string; magnitude: number } | null = null;
  let hudRafId: number | null = null;
  let selectedId: string | null = null;
  let hoveredConstellationId: string | null = null;
  // Cached world-space center for selected constellation (recomputed on selection change)
  let selectedCenter: { x: number; y: number; z: number } | null = null;

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
        renderer = new ConstellationRenderer(container, {
          onConstellationHover: (id, screenPos) => {
            hoveredConstellationId = id;
            hoverPos = screenPos;
          },
          onConstellationClick: (id) => {
            handleSelectConstellation(id);
          },
          onStarHover: (star, screenPos) => {
            hoverStarPos = star && screenPos
              ? { x: screenPos.x, y: screenPos.y, name: star.name, magnitude: star.magnitude }
              : null;
          },
        });

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

      // Start HUD rAF loop for screen-coords projection
      const tickHud = () => {
        if (renderer && selectedId && selectedCenter) {
          lockedPos = renderer.worldToScreen(selectedCenter);
        } else {
          lockedPos = null;
        }
        hudRafId = requestAnimationFrame(tickHud);
      };
      tickHud();

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
    if (hudRafId !== null) cancelAnimationFrame(hudRafId);
    if (renderer) {
      renderer.dispose();
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  });

  const handleBackToMenu = () => {
    window.location.href = routes.home(currentLang);
  };

  const handleToggleControls = () => {
    showControls = !showControls;
  };

  const handleSelectConstellation = (constellationId: string) => {
    viewState.selectedConstellation = constellationId;
    selectedId = constellationId;
    if (!renderer || !viewState.skyConfig) return;
    renderer.setSelected(constellationId);

    const c = constellations.find(x => x.id === constellationId);
    if (!c || c.stars.length === 0) {
      selectedCenter = null;
      return;
    }
    // Circular mean for RA to handle 0h/24h wrap-around
    let sinSum = 0, cosSum = 0;
    let avgDec = 0;
    c.stars.forEach(s => {
      const rad = (s.rightAscension / 24) * 2 * Math.PI;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
      avgDec += s.declination;
    });
    const avgRA = (Math.atan2(sinSum, cosSum) / (2 * Math.PI) + 1) * 24;
    avgDec /= c.stars.length;

    const p = celestialToSphere(avgRA, avgDec, viewState.skyConfig.location, viewState.skyConfig.dateTime, 100);
    // Cache the center for the HUD tick loop
    selectedCenter = p;
    const r = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) || 1;
    const targetY = Math.atan2(p.x, p.z);
    const targetX = Math.asin(p.y / r);
    renderer.tweenCameraTo(targetX, targetY, 900);
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

  // UTC readout for HUD display (YYYY-MM-DD HH:MM)
  $: utcReadout = viewState.skyConfig?.dateTime
    ? viewState.skyConfig.dateTime.toISOString().slice(0, 16).replace("T", " ")
    : "";

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
    <HudFrame color="var(--hud-cyan)" bracketLength={12}>
      <button
        type="button"
        class="hud-btn"
        on:click={handleBackToMenu}
      >
        <span class="hud-btn-bracket">&lt;</span> {t('constellation.return')}
      </button>
    </HudFrame>
  </div>

  <!-- Controls toggle -->
  <div class="absolute top-4 right-4 z-20">
    <HudFrame color="var(--hud-cyan)" bracketLength={12}>
      <button
        type="button"
        class="hud-btn"
        aria-pressed={showControls}
        on:click={handleToggleControls}
      >
        {showControls ? t('constellation.panelOn') : t('constellation.panelOff')}
      </button>
    </HudFrame>
  </div>

  <!-- Loading/Error overlay -->
  {#if loading}
    <div class="absolute inset-0 z-30">
      <BootSequence debugInfo={debugInfo} />
    </div>
  {:else if !webglSupported}
    <div class="absolute inset-0 z-30 pointer-events-none" style="background: transparent;">
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-white max-w-md mx-auto px-4 pointer-events-auto">
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
        </div>
      </div>
    </div>
  {:else if error}
    <div class="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
      <div class="text-center text-white max-w-md mx-auto px-4">
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
      </div>
    </div>
  {/if}

  <!-- Drag Instructions Overlay -->
  {#if !loading && !error && webglSupported && showDragInstructions}
    <div class="absolute bottom-12 left-12 z-10" style="pointer-events: none;">
      <div class="hud-drag-card">
        <span class="hud-drag-prefix">&gt;</span>
        {t('constellation.dragInstructions')}
      </div>
    </div>
  {/if}

  <!-- Controls panel -->
  {#if showControls && !loading && !error}
    <div class="absolute top-20 right-4 z-20 w-80 hud-panel-anim">
      <HudFrame color="var(--hud-cyan)" bracketLength={18} glow={true}>
        <div class="hud-panel">
          <div class="hud-panel-header">
            <h3 class="hud-panel-title">{t('constellation.title')}</h3>
            <span class="hud-panel-tick"></span>
          </div>

          <!-- Location/time HUD readout -->
          <div class="hud-readout">
            <div class="readout-row">
              <span class="readout-label">GEO-LOCK</span>
              <span class="readout-blink" data-state={viewState.locationPermissionGranted ? "live" : "fallback"}></span>
              <span class="readout-value">
                {#if viewState.skyConfig}
                  {Math.abs(viewState.skyConfig.location.latitude).toFixed(4)}°{viewState.skyConfig.location.latitude >= 0 ? "N" : "S"}
                  {Math.abs(viewState.skyConfig.location.longitude).toFixed(4)}°{viewState.skyConfig.location.longitude >= 0 ? "E" : "W"}
                {/if}
              </span>
            </div>
            <div class="readout-row">
              <span class="readout-label">UTC</span>
              <span></span>
              <span class="readout-value">{utcReadout}</span>
            </div>
          </div>

          <!-- Visible constellations -->
          <div>
            <h4 class="hud-section-label">VISIBLE</h4>
            <div class="hud-list">
              {#each viewState.visibleConstellations as constellationId}
                {#each constellations.filter(c => c.id === constellationId) as constellation}
                  <button
                    type="button"
                    class="hud-list-row"
                    class:is-selected={viewState.selectedConstellation === constellation.id}
                    on:click={() => handleSelectConstellation(constellation.id)}
                    data-constellation-id={constellation.id}
                  >
                    <span class="row-abbr">[{constellation.abbreviation}]</span>
                    <span class="row-name">{constellation.name}</span>
                    <span class="row-leader"></span>
                    <span class="row-count">{constellation.stars.length}★</span>
                  </button>
                {/each}
              {/each}
            </div>
          </div>

          <!-- Selected constellation info -->
          {#if viewState.selectedConstellation}
            {#each constellations.filter(c => c.id === viewState.selectedConstellation) as constellation}
              <div class="hud-details">
                <div class="hud-divider">
                  <span class="hud-divider-diamond"></span>
                </div>
                <h4 class="hud-details-name">
                  <GlitchText text={constellation.name.toUpperCase()} />
                </h4>
                <p class="hud-details-desc">{constellation.description}</p>
                {#if constellation.mythology}
                  <p class="hud-details-myth">// {constellation.mythology}</p>
                {/if}
                <div class="hud-month-strip" aria-label="Best viewing months: {constellation.visibility.bestMonths.map(m => new Date(2000, m - 1).toLocaleDateString(currentLang, { month: 'long' })).join(', ')}">
                  <span class="sr-only">Best viewing months: {constellation.visibility.bestMonths.map(m => new Date(2000, m - 1).toLocaleDateString(currentLang, { month: 'long' })).join(', ')}</span>
                  {#each Array(12) as _, m}
                    <div
                      class="month-cell"
                      class:is-best={constellation.visibility.bestMonths.includes(m + 1)}
                      title={new Date(2000, m).toLocaleDateString(currentLang, { month: "short" })}
                    ></div>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </HudFrame>
    </div>
  {/if}

  <!-- Main Content Area -->
  <div class="constellation-main-content">
    <!-- 3D Container (background) -->
    <div bind:this={container} class="constellation-container"></div>

    <!-- HUD overlay layer (z-index: 5) -->
    <div class="hud-layer" aria-hidden="true">
      <ScanLines />
      {#if hoveredConstellationId && hoverPos}
        <HudReticle x={hoverPos.x} y={hoverPos.y} state="hover"
          label={constellations.find(c => c.id === hoveredConstellationId)?.abbreviation ?? ""} />
      {/if}
      {#if hoverStarPos}
        <HudCallout
          x={hoverStarPos.x}
          y={hoverStarPos.y}
          title={hoverStarPos.name}
          lines={[`MAG ${hoverStarPos.magnitude.toFixed(2)}`]}
        />
      {/if}
      {#if selectedId && lockedPos && lockedPos.visible}
        <TargetLockOverlay
          visible={true}
          x={lockedPos.x}
          y={lockedPos.y}
          name={constellations.find(c => c.id === selectedId)?.name ?? ""}
        />
      {/if}
    </div>

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

  .hud-layer {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    overflow: hidden;
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

  .hud-drag-card {
    font-family: var(--hud-font-mono);
    font-size: 11px;
    color: var(--hud-cyan);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-shadow: 0 0 4px var(--hud-cyan);
    padding: 8px 12px;
    background: color-mix(in srgb, var(--hud-void) 60%, transparent);
    border: 1px solid var(--hud-cyan);
    animation: drag-fade-in var(--hud-dur-glide) var(--hud-ease-glide);
  }
  .hud-drag-prefix {
    color: var(--hud-magenta);
    margin-right: 6px;
  }
  @keyframes drag-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hud-drag-card {
      animation: none;
    }
  }

  .hud-btn {
    font-family: var(--hud-font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--hud-cyan);
    background: color-mix(in srgb, var(--hud-void) 65%, transparent);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    border: none;
    padding: 8px 14px;
    cursor: pointer;
    position: relative;
    text-shadow: 0 0 4px var(--hud-cyan);
  }
  .hud-btn::after {
    content: "";
    position: absolute;
    left: 14px; right: 14px; bottom: 4px;
    height: 1px;
    background: var(--hud-magenta);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 140ms var(--hud-ease-snap);
  }
  .hud-btn:hover::after { transform: scaleX(1); }
  .hud-btn-bracket { color: var(--hud-magenta); margin-right: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .hud-btn::after { transition: none; }
  }

  .hud-panel {
    background: color-mix(in srgb, var(--hud-void) 82%, transparent);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    color: var(--hud-ivory);
    padding: 16px;
    font-family: var(--hud-font-mono);
    font-size: 12px;
  }
  .hud-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--hud-cyan);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .hud-panel-title {
    font-family: var(--hud-font-display);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.2em;
    color: var(--hud-cyan);
    text-shadow: 0 0 6px var(--hud-cyan);
    text-transform: uppercase;
    flex: 1;
  }
  .hud-panel-tick {
    width: 8px;
    height: 8px;
    background: var(--hud-magenta);
    box-shadow: 0 0 6px var(--hud-magenta);
  }
  .hud-panel-anim {
    animation: hud-panel-in var(--hud-dur-glide) var(--hud-ease-glide);
  }
  @keyframes hud-panel-in {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hud-panel-anim {
      animation: none;
    }
  }

  .hud-section-label {
    font-family: var(--hud-font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--hud-cyan-dim);
    margin: 8px 0 6px;
  }
  .hud-list { display: flex; flex-direction: column; gap: 1px; max-height: 11rem; overflow-y: auto; }
  .hud-list-row {
    position: relative;
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: 8px;
    align-items: baseline;
    padding: 6px 8px 6px 12px;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    font-family: var(--hud-font-mono);
    font-size: 11px;
    color: var(--hud-ivory);
    text-align: left;
  }
  .hud-list-row::before {
    content: "";
    position: absolute;
    left: 0; top: 0;
    width: 2px; height: 0;
    background: var(--hud-magenta);
    box-shadow: 0 0 4px var(--hud-magenta);
    transition: height 120ms var(--hud-ease-snap);
  }
  .hud-list-row:hover {
    background: color-mix(in srgb, var(--hud-cyan) 8%, transparent);
  }
  .hud-list-row:hover::before { height: 100%; }
  .hud-list-row.is-selected {
    border-color: var(--hud-cyan);
    background: color-mix(in srgb, var(--hud-cyan) 6%, transparent);
    box-shadow: 0 0 6px color-mix(in srgb, var(--hud-magenta) 25%, transparent);
  }
  .hud-list-row.is-selected::before { height: 100%; }
  .row-abbr { color: var(--hud-cyan); }
  .row-name { color: var(--hud-ivory); }
  .row-leader {
    border-bottom: 1px dotted var(--hud-cyan-dim);
    align-self: end;
    margin-bottom: 4px;
  }
  .row-count { color: var(--hud-magenta); }
  @media (prefers-reduced-motion: reduce) {
    .hud-list-row::before { transition: none; }
  }

  .hud-details { margin-top: 12px; padding-top: 12px; }
  .hud-divider {
    position: relative;
    border-top: 1px dashed var(--hud-cyan);
    margin-bottom: 12px;
  }
  .hud-divider-diamond {
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px; height: 8px;
    background: var(--hud-magenta);
    box-shadow: 0 0 6px var(--hud-magenta);
  }
  .hud-details-name {
    font-family: var(--hud-font-display);
    font-size: 14px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: 0 0 6px;
  }
  .hud-details-desc {
    font-family: var(--hud-font-mono);
    font-size: 11px;
    color: var(--hud-ivory);
    opacity: 0.85;
    margin: 0 0 8px;
  }
  .hud-details-myth {
    font-family: var(--hud-font-mono);
    font-size: 10px;
    font-style: italic;
    color: var(--hud-cyan-dim);
    margin: 0 0 10px;
  }
  .hud-month-strip {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 2px;
  }
  .month-cell {
    height: 8px;
    border: 1px solid var(--hud-cyan-dim);
  }
  .month-cell.is-best {
    background: var(--hud-cyan);
    border-color: var(--hud-cyan);
    box-shadow: 0 0 4px var(--hud-cyan);
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

  .hud-readout {
    margin-bottom: 12px;
    padding: 8px 10px;
    border: 1px solid var(--hud-cyan-dim);
    background: color-mix(in srgb, var(--hud-cyan) 4%, transparent);
    font-family: var(--hud-font-mono);
    font-size: 11px;
  }
  .readout-row {
    display: grid;
    grid-template-columns: 64px 12px 1fr;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }
  .readout-label {
    color: var(--hud-cyan);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .readout-blink {
    width: 6px; height: 6px;
    background: var(--hud-magenta);
    box-shadow: 0 0 4px var(--hud-magenta);
    animation: blink-live 1s steps(2, end) infinite;
  }
  .readout-blink[data-state="fallback"] {
    background: var(--hud-amber);
    box-shadow: 0 0 4px var(--hud-amber);
  }
  .readout-value {
    color: var(--hud-ivory);
  }
  @keyframes blink-live {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.2; }
  }
  @media (prefers-reduced-motion: reduce) {
    .readout-blink { animation: none; }
  }
</style>
