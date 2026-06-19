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
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
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

  // i18n helpers for constellation and star names — fall back to the
  // hardcoded data values when no translation key exists (e.g. English).
  const constellationName = (c: { id: string; name: string }) => {
    const key = `constellations.${c.id}.name`;
    const translated = t(key);
    return !translated || translated === key ? c.name : translated;
  };
  const constellationDescription = (c: { id: string; description: string }) => {
    const key = `constellations.${c.id}.description`;
    const translated = t(key);
    return !translated || translated === key ? c.description : translated;
  };
  const constellationMythology = (c: { id: string; mythology?: string }) => {
    if (!c.mythology) return c.mythology;
    const key = `constellations.${c.id}.mythology`;
    const translated = t(key);
    return !translated || translated === key ? c.mythology : translated;
  };
  const starName = (s: { id: string; name: string }) => {
    const key = `stars.${s.id}.name`;
    const translated = t(key);
    return !translated || translated === key ? s.name : translated;
  };

  async function initConstellationView(): Promise<void> {
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
              ? { x: screenPos.x, y: screenPos.y, name: starName(star), magnitude: star.magnitude }
              : null;
          },
        });

        // Get all stars from visible constellations, with translated names
        // for 3D label rendering
        const allStars = visibleConstellations.flatMap(constellation => constellation.stars);
        const translatedStars = allStars.map(s => ({ ...s, name: starName(s) }));
        const translatedConstellations = visibleConstellations.map(c => ({
          ...c,
          name: constellationName(c),
        }));

        await renderer.initialize(translatedStars, translatedConstellations, skyConfig);
      } catch (rendererError) {
        console.warn('WebGL renderer failed, falling back to 2D canvas:', rendererError);
        webglSupported = false;
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
      
      // Retry after 3 seconds (skip if WebGL is fundamentally unsupported)
      if (webglSupported) {
        retryTimeout = setTimeout(() => {
          if (!renderer) {
            attemptCount = 0;
            error = null;
            viewState.error = null;
            loading = true;
            viewState.loading = true;
            initConstellationView();
          }
        }, 3000);
      }
    }
  }

  onMount(() => {
    initConstellationView();
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
      console.warn("WebGL support check failed:", e);
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
          context.fillText(starName(star), starX, starY - starSize - 8);
        }
      });

      // Draw constellation name
      context.fillStyle = colors[constellationIndex % colors.length];
      context.font = 'bold 16px Arial';
      context.textAlign = 'center';
      context.fillText(constellationName(constellation), centerX, centerY - constellationHeight * 0.35);
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
  <div class="absolute top-16 right-4 z-20">
    <HudFrame color="var(--hud-cyan)" bracketLength={12}>
      <button
        type="button"
        class="hud-btn"
        aria-pressed={showControls}
        on:click={handleToggleControls}
      >
        {showControls ? t('constellation.panelOff') : t('constellation.panelOn')}
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
          <h2 class="text-xl font-semibold mb-2 text-amber-400">{t('constellation.webglNotAvailable')}</h2>
          <p class="text-sm text-gray-300 mb-4">
            {t('constellation.webglDescription')}
          </p>
          <div class="text-xs text-gray-400 mb-4">
            <p class="mb-2">{t('constellation.trySolutions')}</p>
            <ul class="text-left list-disc list-inside space-y-1">
              <li>{t('constellation.solutionUpdateBrowser')}</li>
              <li>{t('constellation.solutionEnableHardwareAcceleration')}</li>
              <li>{t('constellation.solutionTryDifferentBrowser')}</li>
            </ul>
          </div>
          <Button
            variant="outline"
            size="sm"
            on:click={handleBackToMenu}
            className="text-white border-white/30 hover:bg-white/10"
          >
            {t('constellation.return')}
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
          {t('action.retry')}
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
    <div class="absolute top-28 right-4 z-20 w-80 hud-panel-anim">
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
            <ul class="hud-list" aria-label="Visible constellations">
              {#each viewState.visibleConstellations as constellationId}
                {#each constellations.filter(c => c.id === constellationId) as constellation}
                  <li aria-selected={viewState.selectedConstellation === constellation.id ? "true" : undefined}>
                    <button
                      type="button"
                      class="hud-list-row"
                      class:is-selected={viewState.selectedConstellation === constellation.id}
                      on:click={() => handleSelectConstellation(constellation.id)}
                      data-constellation-id={constellation.id}
                    >
                      <span class="row-abbr">[{constellation.abbreviation}]</span>
                      <span class="row-name">{constellationName(constellation)}</span>
                      <span class="row-leader"></span>
                      <span class="row-count">{constellation.stars.length}★ <span class="sr-only">stars</span></span>
                    </button>
                  </li>
                {/each}
              {/each}
            </ul>
          </div>

          <!-- Selected constellation info -->
          {#if viewState.selectedConstellation}
            {#each constellations.filter(c => c.id === viewState.selectedConstellation) as constellation}
              <div class="hud-details">
                <div class="hud-divider">
                  <span class="hud-divider-diamond"></span>
                </div>
                <h4 class="hud-details-name">
                  <GlitchText text={constellationName(constellation).toUpperCase()} />
                </h4>
                <p class="hud-details-desc">{constellationDescription(constellation)}</p>
                {#if constellation.mythology}
                  <p class="hud-details-myth">// {constellationMythology(constellation)}</p>
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
          x={lockedPos.x}
          y={lockedPos.y}
          name={constellations.find(c => c.id === selectedId) ? constellationName(constellations.find(c => c.id === selectedId)!) : ""}
        />
      {/if}
    </div>
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

  .hud-details { margin-top: 12px; padding-top: 12px; }
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

  .readout-row {
    display: grid;
    grid-template-columns: 64px 12px 1fr;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }
</style>
