<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gameState, settings } from "@/stores/gameStore";
  import { getLangFromUrl, useTranslations } from "@/i18n/utils";
  import { routes, type AppLocale } from "@/i18n/routes";
  import Button from "@/components/ui/Button.svelte";
  import { ConstellationRenderer } from "@/lib/constellation/ConstellationRenderer";
  import type { ConstellationAccessibilityText } from "@/lib/constellation/ConstellationRenderer";
  import { constellations, getVisibleConstellations } from "@/data/constellations";
  import { getCurrentLocation, isConstellationVisible, formatCoordinates, celestialToSphere, azimuthToCardinalKey } from "@/utils/astronomy";
  import type { ConstellationViewState, SkyConfiguration, LocationData, Constellation } from "@/types/constellation";
  import { parseObserverQuery, resolveObserverState, type ResolvedObserverState } from "@/lib/constellation/observerRouteState";
  import { prepareAlternateObserverCatalog, SYNTHETIC_SOL_STAR_ID, type AlternateObserverCatalogOutput, type PreparedConstellation } from "@/lib/constellation/observerCatalog";
  import { OBSERVER_SOURCE_STAR_IDS } from "@/lib/constellation/observerSourceStarIds";
  import { localGalaxyData } from "@/lib/galaxy/LocalGalaxy";
  import type { StarSystemData } from "@/lib/galaxy/types";
  import Reticle from "@/components/view/Reticle.svelte";
  import Callout from "@/components/view/Callout.svelte";
  import TargetLockOverlay from "@/components/view/TargetLockOverlay.svelte";
  import LoadingAnimation from "@/components/LoadingAnimation.svelte";
  import { cssColor, canvasFont } from "@/lib/theme/palette";
  import ViewOverlay from "./view/ViewOverlay.svelte";
  import { getCurrentView, type ViewId } from "@/lib/view/currentView";
  import { gameActions } from "@/stores/gameStore";
  import { addMediaQueryListener, removeMediaQueryListener } from "@/utils/mediaQuery";

  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  // Publish HUD lang to the shared store so the HUD shell can subscribe
  // via $gameState instead of receiving drilled props.
  gameActions.setHudLang(lang);

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
  let t: (key: string, replacements?: Record<string, string>) => string;

  // Constellation view state
  let viewState: ConstellationViewState = {
    loading: true,
    error: null,
    skyConfig: null,
    visibleConstellations: [],
    selectedConstellation: null,
    locationPermissionGranted: false
  };

  // Observer-mode state. The wrapper resolves the current observer once per
  // mount, before any geolocation request, and branches into the legacy
  // Earth/Sol initialization or the prepared alternate-observer path.
  type DisplayConstellation = Constellation | PreparedConstellation;

  let resolvedObserverState: ResolvedObserverState = {
    kind: "sol",
    observerId: "sol",
    source: "missing",
  };
  let observerSystem: StarSystemData | null = null;
  let alternateCatalog: AlternateObserverCatalogOutput | null = null;
  let renderedConstellations: readonly DisplayConstellation[] = [];
  let referenceVisible = false;
  let observerNoticeKey: string | null = null;
  let hasUnexpectedOmissions = false;
  // True only when a GENUINE alternate observer mode (preparation succeeded)
  // hits a WebGL failure. In that case the Earth-oriented 2D canvas fallback
  // must NOT be created and the observer-specific WebGL-required UI is shown.
  let observerWebglFailed = false;
  let solAnnouncement = "";

  // UI state
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

  // Compass readout — camera azimuth + elevation in degrees, updated each
  // HUD tick. Cardinal direction is localized via the compass.* i18n keys;
  // the azimuth readout is wrapped to [0,360) so 359.5°+ never shows as "360°".
  // Elevation (pitch) is shown with a sign so up/down is unambiguous even when
  // the azimuth becomes less meaningful near the pitch clamp (±~82°).
  let facingDeg = 0;
  let facingElev = 0;
  $: facingCardinal = t(azimuthToCardinalKey(facingDeg));
  $: facingDegDisplay = ((Math.round(facingDeg) % 360) + 360) % 360;
  $: facingElevDisplay = `${facingElev >= 0 ? "+" : ""}${Math.round(facingElev)}°`;

  // Initialize translations
  if (typeof window !== 'undefined') {
    currentLang = getLangFromUrl(new URL(window.location.href));
  }
  if (Object.keys(translations).length > 0) {
    // Mirror useTranslations' placeholder replacement so the prop-based
    // path supports the same {name} interpolation the i18n layer does.
    t = (key, replacements) => {
      let text = translations[key] || key;
      if (replacements) {
        for (const [placeholder, value] of Object.entries(replacements)) {
          text = text.replace(`{${placeholder}}`, value);
        }
      }
      return text;
    };
  } else {
    t = useTranslations(currentLang);
  }

  // Localized screen-reader copy for the constellation sky-map canvas and
  // its aria-live region. The renderer is framework-agnostic and never
  // imports the i18n layer, so it accepts this object as a constructor
  // option; built here from t() so non-English screen-reader users get
  // localized announcements instead of mixed-language UI.
  const constellationA11yText: ConstellationAccessibilityText = {
    canvasLabel: t("constellationA11y.canvasLabel"),
    selected: (name) => t("constellationA11y.selected", { name }),
    viewing: (name) => t("constellationA11y.viewing", { name }),
    selectionCleared: t("constellationA11y.selectionCleared"),
  };

  let currentView: ViewId = "constellation";
  if (typeof window !== 'undefined') {
    currentView = getCurrentView(window.location.pathname) ?? "constellation";
  }
  gameActions.setHudView(currentView);
  // Settings toggles wired to the renderer. Defaults match the skyConfig
  // passed to initialize() (showStarNames=true → labels on; auto-rotate off).
  let labelsOn = true;
  let autoRotateOn = false;
  // Reduced-motion preference — disables auto-rotate per WCAG §2.3.3.
  // Two sources are OR'd so EITHER the OS preference OR the in-app Settings
  // toggle disables auto-rotate — matching ViewOverlay, which reads only
  // $settings.reducedMotion. Without this, enabling Reduced Motion via the
  // settings modal (without OS pref) would style the HUD but auto-rotate
  // could still run. Both inputs are subscribed so mid-session toggles
  // apply live.
  let mqlReducedMotion = false;
  let reducedMotionMql: MediaQueryList | null = null;
  const handleReducedMotionChange = (e: MediaQueryListEvent) => {
    mqlReducedMotion = e.matches;
  };
  if (typeof window !== 'undefined') {
    reducedMotionMql = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    mqlReducedMotion = reducedMotionMql?.matches ?? false;
  }
  $: reducedMotion = $settings.reducedMotion || mqlReducedMotion;
  // Push toggle state to the renderer whenever it (or the renderer) changes.
  $: if (renderer) {
    renderer.setLabelsVisible(labelsOn);
    renderer.setAutoRotate(autoRotateOn && !reducedMotion);
    renderer.setReducedMotion(reducedMotion);
  }

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

  function resolveCurrentObserver(): ResolvedObserverState {
    const params = new URL(window.location.href).searchParams;
    const parsed = parseObserverQuery(params);
    return resolveObserverState(parsed, localGalaxyData.starSystems);
  }

  // Shared star-system lookup for the resolved observer. Returns null for
  // non-system observers or when the system id is not found in the local
  // galaxy data; both the WebGL-preflight branch and the main init branch
  // use this so the lookup behavior stays identical.
  function findObserverSystem(state: ResolvedObserverState): StarSystemData | null {
    if (state.kind !== "system") return null;
    return localGalaxyData.starSystems.find(
      (candidate) => candidate.id === state.observerId,
    ) ?? null;
  }

  // Shared renderer factory: both initialization modes create the renderer
  // with the same interaction callbacks and localized accessibility copy.
  function createRenderer(): ConstellationRenderer {
    return new ConstellationRenderer(
      container,
      {
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
      },
      constellationA11yText,
    );
  }

  // Legacy Earth/Sol path: geolocation with a 3s timeout and New York
  // fallback, sky configuration, visibility filtering, translated
  // membership flat-map, and the legacy renderer.initialize() call.
  async function initializeSolMode(): Promise<void> {
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
      renderer = createRenderer();

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
  }

  // Prepared alternate-observer path: never requests geolocation and never
  // calls getVisibleConstellations(). Prepares the exact full exported
  // constellation catalog from the observer system's position and hands the
  // prepared catalogs to the renderer BY IDENTITY. Returns "fallback-to-sol"
  // when preparation fails so the caller degrades to the legacy Earth path.
  // Returns "renderer-failed" when WebGL/renderer construction fails so the
  // caller leaves the observer-specific WebGL-required overlay in place and
  // skips the HUD animation loop (no renderer exists to drive it).
  async function initializeAlternateMode(system: StarSystemData): Promise<"ready" | "fallback-to-sol" | "renderer-failed"> {
    debugInfo = "Preparing alternate observer catalog...";

    const preparation = prepareAlternateObserverCatalog(
      constellations,
      // Plain-copy the position: StarSystemData.position is a Three.js
      // Vector3 (a mutable class instance), and the catalog preparation is
      // a deliberately pure data boundary that only reads x/y/z.
      { x: system.position.x, y: system.position.y, z: system.position.z },
      {
        includeReferenceCatalog: true,
        observerSourceStarIds: OBSERVER_SOURCE_STAR_IDS[system.id] ?? [],
      },
    );

    if (!preparation.ok) {
      return "fallback-to-sol";
    }

    alternateCatalog = preparation.value;
    renderedConstellations = preparation.value.primaryCatalog.constellations;

    // Surface omissions non-blockingly: expected observer-source-star
    // exclusions are silent, anything else (coordinate-transform-failed,
    // non-finite-metadata) shows the one static omission notice. No count.
    hasUnexpectedOmissions = alternateCatalog.omittedStars.some(
      (omitted) => omitted.reason.code !== "observer-source-star-excluded",
    );

    debugInfo = "Initializing alternate observer renderer...";

    // Split renderer construction from prepared-catalog initialization so the
    // two failure modes are classified correctly:
    //  - createRenderer() throwing is a genuine WebGL/renderer-creation
    //    failure: mark observerWebglFailed and return "renderer-failed" so
    //    the caller shows the observer-specific WebGL-required UI and does
    //    NOT start the HUD animation loop (no renderer exists to drive it).
    //  - initializePreparedCatalogs() throwing means WebGL and the renderer
    //    are fine but catalog adaptation/layer/label setup failed. That is
    //    NOT a WebGL problem, so it must not set observerWebglFailed. Dispose
    //    the renderer and rethrow so the caller's generic error/retry path
    //    surfaces the real cause instead of misreporting WebGL as unavailable.
    try {
      renderer = createRenderer();
    } catch (rendererError) {
      console.warn('WebGL renderer failed in alternate observer mode:', rendererError);
      webglSupported = false;
      // Genuine alternate mode whose WebGL path failed: no Earth-oriented 2D
      // canvas fallback and no degrade to the Sol legacy path — the
      // observer-specific WebGL-required UI (with Return to Earth/Sol) is
      // shown instead.
      observerWebglFailed = true;
      // createRenderer threw before assigning, so renderer is still null.
      return "renderer-failed";
    }

    try {
      await renderer.initializePreparedCatalogs(
        {
          primaryCatalog: preparation.value.primaryCatalog,
          referenceCatalog: preparation.value.referenceCatalog,
          // Hidden by default; the reference toggle forwards to
          // renderer.setReferenceVisible() without re-initializing.
          referenceVisible,
        },
        {
          minimumMagnitude: 4.0,
          showConstellationLines: true,
          showStarNames: true,
        },
      );
    } catch (catalogError) {
      console.warn('Prepared catalog initialization failed:', catalogError);
      // WebGL itself is fine — dispose the constructed renderer and
      // propagate so the generic error/retry path reports the real cause
      // rather than the misleading WebGL-required overlay.
      renderer.dispose();
      renderer = null;
      throw catalogError;
    }

    return "ready";
  }

  async function initConstellationView(): Promise<void> {
    try {
      // Resolve the current observer once per mount, before the WebGL gate:
      // a valid alternate observer whose WebGL is unsupported must surface
      // the observer-specific WebGL-required UI (with Return to Earth/Sol) —
      // never the generic Earth overlay or the Earth 2D canvas fallback.
      resolvedObserverState = resolveCurrentObserver();

      // Check WebGL support next
      webglSupported = checkWebGLSupport();
      if (!webglSupported) {
        // A GENUINE alternate observer (kind "system" whose system is found
        // in the local galaxy data) gets the observer-specific WebGL failure
        // UI: no geolocation, no getVisibleConstellations, no Earth 2D
        // canvas, and no degrade to the Sol legacy path. Every other case
        // (Sol mode, route fallbacks, defensive miss) keeps the existing
        // generic Earth WebGL overlay via the throw below.
        const system = findObserverSystem(resolvedObserverState);
        if (system) {
          observerSystem = system;
          observerWebglFailed = true;
          loading = false;
          viewState.loading = false;
          debugInfo = "WebGL is not supported by your browser or graphics card";
          return;
        }
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

      if (resolvedObserverState.kind === "system") {
        // Defensive second lookup: the resolver and this lookup share the
        // same starSystems source, so it should always hit. Guard anyway so
        // an unexpected mismatch degrades to Sol mode — no non-null assertion.
        const system = findObserverSystem(resolvedObserverState);

        if (!system) {
          if (import.meta.env.DEV) {
            console.warn(
              "Observer mode invariant mismatch: resolved observer system not found in localGalaxyData",
              resolvedObserverState.observerId,
            );
          }
          observerNoticeKey = "constellation.observer.fallback";
          await initializeSolMode();
        } else {
          observerSystem = system;
          if ((await initializeAlternateMode(system)) === "fallback-to-sol") {
            observerNoticeKey = "constellation.observer.fallback";
            await initializeSolMode();
          }
        }
      } else {
        if (resolvedObserverState.kind === "fallback") {
          observerNoticeKey = "constellation.observer.fallback";
        }
        await initializeSolMode();
      }

      loading = false;
      viewState.loading = false;
      debugInfo = observerWebglFailed
        ? "WebGL is required for this observer view"
        : "Constellation view ready";

      // Start HUD rAF loop for screen-coords projection. Skipped when the
      // alternate observer's renderer failed to construct: there is no
      // renderer to project from, and the static WebGL-required overlay is
      // shown instead. (Prepared-catalog failures throw before reaching here,
      // so they never start the loop either.)
      const tickHud = () => {
        if (renderer && selectedId && selectedCenter) {
          lockedPos = renderer.worldToScreen(selectedCenter);
        } else {
          lockedPos = null;
        }
        if (renderer) {
          facingDeg = renderer.getCameraAzimuth();
          facingElev = renderer.getCameraElevation();
        }
        hudRafId = requestAnimationFrame(tickHud);
      };
      if (renderer) {
        tickHud();
      }

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
    addMediaQueryListener(reducedMotionMql, "change", handleReducedMotionChange);
  });

  onDestroy(() => {
    removeMediaQueryListener(reducedMotionMql, "change", handleReducedMotionChange);
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

  // Canonical return to the Earth/Sol view from any alternate-observer
  // context: the localized constellation route carries NO observer parameter
  // (sol serializes to ""), so this single path serves every Return action.
  const returnToSol = () => {
    window.location.href = routes.constellation(currentLang);
  };

  // Return to the existing localized Galaxy selection flow so the user can
  // pick another eligible system. Observer state remains URL-only and is not
  // carried back to Galaxy.
  const chooseAnotherObserver = () => {
    window.location.href = routes.galaxy(currentLang);
  };

  // Native reference-layer visibility toggle. Rendered only when the
  // prepared output carries a reference catalog. Forwarding to the renderer
  // is the ONLY side effect — no re-preparation and no re-initialization.
  const handleReferenceToggle = (event: Event) => {
    const checkbox = event.currentTarget as HTMLInputElement;
    referenceVisible = checkbox.checked;
    renderer?.setReferenceVisible(checkbox.checked);
  };

  // Find the synthetic Sol star prepared for this observer and focus the
  // camera on it. The announcement carries RA/declination (two decimals,
  // explicit declination sign) and a locale-aware distance. Reduced-motion
  // handling lives in the renderer's tweenCameraTo — no extra branch here.
  const handleFindSol = () => {
    if (!renderer) return;
    const sol = alternateCatalog?.primaryCatalog.stars.find(
      (star) => star.id === SYNTHETIC_SOL_STAR_ID,
    );
    if (!sol || !renderer.focusStarById(SYNTHETIC_SOL_STAR_ID)) {
      solAnnouncement = t("constellation.observer.findSolUnavailable");
      return;
    }
    solAnnouncement = t("constellation.observer.findSolAnnouncement", {
      ra: sol.rightAscension.toFixed(2),
      dec: sol.declination >= 0 ? `+${sol.declination.toFixed(2)}` : sol.declination.toFixed(2),
      distance: sol.distance.toLocaleString(currentLang),
    });
  };

  const handleSelectConstellation = (constellationId: string) => {
    viewState.selectedConstellation = constellationId;
    selectedId = constellationId;
    if (!renderer) return;
    renderer.setSelected(constellationId);

    if (alternateCatalog) {
      // Alternate-observer branch: average the primary-layer world positions
      // of the selected prepared constellation's stars and lock the camera on
      // the center, reusing the Sol path's target-lock math. The
      // Earth-relative celestialToSphere projection is never used here.
      const prepared =
        alternateCatalog.primaryCatalog.constellations.find(
          (candidate) => candidate.id === constellationId,
        ) ??
        renderedConstellations.find(
          (candidate) => candidate.id === constellationId,
        ) ??
        null;
      if (!prepared || prepared.stars.length === 0) {
        selectedCenter = null;
        return;
      }
      const available: Array<{ x: number; y: number; z: number }> = [];
      for (const star of prepared.stars) {
        const position = renderer.getStarWorldPosition(star.id);
        if (position) available.push(position);
      }
      if (available.length === 0) {
        // Selection details are retained (renderer.setSelected already ran),
        // but with no resolved positions there is nothing to point at.
        selectedCenter = null;
        return;
      }
      const center = {
        x: available.reduce((sum, position) => sum + position.x, 0) / available.length,
        y: available.reduce((sum, position) => sum + position.y, 0) / available.length,
        z: available.reduce((sum, position) => sum + position.z, 0) / available.length,
      };
      // Cache the center for the HUD tick loop
      selectedCenter = center;
      const r = Math.hypot(center.x, center.y, center.z) || 1;
      const targetY = Math.atan2(center.x, center.z);
      const targetX = Math.asin(center.y / r);
      renderer.tweenCameraTo(targetX, targetY, 900);
      return;
    }

    // Sol branch: the existing Earth-relative calculation, unchanged.
    if (!viewState.skyConfig) return;

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

  // Alternate-observer HUD state (HPA-435). The HUD panel branches into the
  // observer readout only for a GENUINE alternate mode: a resolved system
  // observer whose preparation succeeded (alternateCatalog set), or a genuine
  // alternate observer whose WebGL preflight failed (observerWebglFailed —
  // no catalog exists, but the Earth readout must still not leak behind the
  // observer-specific WebGL overlay). Every fallback-to-Sol path leaves both
  // false, so the legacy Earth HUD (geoLock/UTC/compass/View from Earth/month
  // strip) stays untouched.
  $: observerHudActive =
    resolvedObserverState.kind === "system" &&
    (alternateCatalog !== null || observerWebglFailed);

  // Localized observer system name via the systems.${id}.name fallback
  // pattern used elsewhere in the codebase: if t() returns the raw key (no
  // translation), fall back to the generic unknown-system copy.
  const resolveSystemName = (system: StarSystemData): string => {
    const key = `systems.${system.id}.name`;
    const translated = t(key);
    return !translated || translated === key
      ? t("systems.unknown")
      : translated;
  };
  $: observerSystemName = observerSystem
    ? resolveSystemName(observerSystem)
    : "";

  // Locale-aware distance readout, e.g. "4.247 ly" (en) or "4.247 光年" (ja).
  $: observerDistanceReadout = observerSystem
    ? `${observerSystem.distanceFromEarth.toLocaleString(currentLang)} ${t("unit.lightYears")}`
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
    context.fillStyle = cssColor('bgDeep');
    context.fillRect(0, 0, width, height);

    // Draw star field background
    context.fillStyle = cssColor('text');
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

      // Constellation lines in brass, alternating with star blue
      const colors = [cssColor('accent'), cssColor('info')];
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
          context.fillStyle = cssColor('text');
          context.font = `12px ${canvasFont.ui}`;
          context.textAlign = 'center';
          context.fillText(starName(star), starX, starY - starSize - 8);
        }
      });

      // Draw constellation name
      context.fillStyle = colors[constellationIndex % colors.length];
      context.font = `600 18px ${canvasFont.display}`;
      context.textAlign = 'center';
      context.fillText(constellationName(constellation), centerX, centerY - constellationHeight * 0.35);
    });
  }
</script>

<div class="constellation-view">
  <ViewOverlay currentView={currentView} lang={currentLang} {translations}>
    <div slot="controls" class="ui-panel-anim">
      {#if !loading && !error}
          <section class="ui-panel constellation-panel">
            <div class="ui-panel-header">
              <h3 class="ui-panel-title">{t('constellation.title')}</h3>
            </div>

            <!-- Observer-mode notices: the generic fallback (route-level or
                 fatal preparation) and the static unexpected-omissions
                 notice. Both surface non-blockingly inside the HUD panel;
                 the omission notice never shows a count. -->
            {#if observerNoticeKey || hasUnexpectedOmissions}
              <div class="observer-notice" role="status">
                {#if observerNoticeKey}
                  <p class="observer-notice-line">{t(observerNoticeKey)}</p>
                {/if}
                {#if hasUnexpectedOmissions}
                  <p class="observer-notice-line">{t('constellation.observer.omissions')}</p>
                {/if}
              </div>
            {/if}

            <!-- Alternate observer HUD (genuine alternate mode): localized
                 observer readout (name / distance / frame / neutral
                 direction), education copy, Return to Earth/Sol, and the
                 prepared constellation catalog. The Earth-geolocated
                 readout, compass/cardinal wording, "View from Earth" note,
                 and month strip are never rendered here. -->
            {#if observerHudActive}
              <div class="ui-readout observer-readout">
                <div class="readout-row">
                  <span class="readout-label">{t('constellation.observer.label')}</span>
                  <span></span>
                  <span class="readout-value">{observerSystemName}</span>
                </div>
                <div class="readout-row">
                  <span class="readout-label">{t('constellation.observer.distanceFromSol')}</span>
                  <span></span>
                  <span class="readout-value">{observerDistanceReadout}</span>
                </div>
                <div class="readout-row">
                  <span class="readout-label">{t('constellation.observer.frameSystemBarycenter')}</span>
                  <span></span>
                  <span class="readout-value">—</span>
                </div>
                <div class="readout-row">
                  <span class="readout-label">{t('constellation.observer.viewDirection')}</span>
                  <span></span>
                  <span class="readout-value">{facingDegDisplay}° {facingElevDisplay}</span>
                </div>
              </div>
              <p class="view-from-earth">{t('constellation.observer.education')}</p>

              {#if !observerWebglFailed}
                <!-- Working alternate mode offers both observer reselection
                     through Galaxy and the direct query-free Sol reset. -->
                <div class="observer-actions">
                  <button
                    type="button"
                    class="ui-btn ui-btn--sm observer-action-btn"
                    on:click={chooseAnotherObserver}
                  >
                    {t('constellation.observer.chooseAnother')}
                  </button>
                  <button
                    type="button"
                    class="ui-btn ui-btn--sm observer-action-btn"
                    on:click={returnToSol}
                  >
                    {t('constellation.observer.returnToSol')}
                  </button>
                </div>
              {/if}

              <!-- Prepared constellation catalog for this observer.
                   Suppressed when the renderer failed: with no renderer the
                   rows can't drive selection, and they sit behind the
                   pointer-events-none WebGL-required overlay where they'd
                   otherwise be click-through reachable. -->
              {#if !observerWebglFailed}
                <div>
                  <h4 class="ui-section-label">{t('constellation.visible')}</h4>
                  <ul class="ui-list" aria-label={t('constellation.visible')}>
                    {#each renderedConstellations as constellation}
                      <li aria-selected={viewState.selectedConstellation === constellation.id ? "true" : undefined}>
                        <button
                          type="button"
                          class="ui-list-row"
                          class:is-selected={viewState.selectedConstellation === constellation.id}
                          on:click={() => handleSelectConstellation(constellation.id)}
                          data-constellation-id={constellation.id}
                        >
                          <span class="row-abbr">{constellation.abbreviation}</span>
                          <span class="row-name">{constellationName(constellation)}</span>
                          <span class="row-leader"></span>
                          <span class="row-count">{constellation.stars.length}★ <span class="sr-only">{t('constellation.stars')}</span></span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {:else}
              <!-- Location/time HUD readout -->
              <div class="ui-readout">
                <div class="readout-row">
                  <span class="readout-label">{t('constellation.geoLock')}</span>
                  <span class="readout-blink" data-state={viewState.locationPermissionGranted ? "live" : "fallback"}></span>
                  <span class="readout-value">
                    {#if viewState.skyConfig}
                      {Math.abs(viewState.skyConfig.location.latitude).toFixed(4)}°{viewState.skyConfig.location.latitude >= 0 ? "N" : "S"}
                      {Math.abs(viewState.skyConfig.location.longitude).toFixed(4)}°{viewState.skyConfig.location.longitude >= 0 ? "E" : "W"}
                    {/if}
                  </span>
                </div>
                <div class="readout-row">
                  <span class="readout-label">{t('constellation.utc')}</span>
                  <span></span>
                  <span class="readout-value">{utcReadout}</span>
                </div>
              </div>

              <!-- Compass / orientation readout -->
              <div class="compass-readout">
                <span class="compass-label">{t('constellation.compass')}</span>
                <span class="compass-value">{facingCardinal} ({facingDegDisplay}°) {facingElevDisplay}</span>
              </div>
              <p class="view-from-earth">{t('constellation.viewFromEarth')}</p>

              <!-- Visible constellations -->
              <div>
                <h4 class="ui-section-label">{t('constellation.visible')}</h4>
                <ul class="ui-list" aria-label={t('constellation.visible')}>
                  {#each viewState.visibleConstellations as constellationId}
                    {#each constellations.filter(c => c.id === constellationId) as constellation}
                      <li aria-selected={viewState.selectedConstellation === constellation.id ? "true" : undefined}>
                        <button
                          type="button"
                          class="ui-list-row"
                          class:is-selected={viewState.selectedConstellation === constellation.id}
                          on:click={() => handleSelectConstellation(constellation.id)}
                          data-constellation-id={constellation.id}
                        >
                          <span class="row-abbr">{constellation.abbreviation}</span>
                          <span class="row-name">{constellationName(constellation)}</span>
                          <span class="row-leader"></span>
                          <span class="row-count">{constellation.stars.length}★ <span class="sr-only">{t('constellation.stars')}</span></span>
                        </button>
                      </li>
                    {/each}
                  {/each}
                </ul>
              </div>
            {/if}

            <!-- Selected constellation info -->
            {#if viewState.selectedConstellation}
              {#if observerHudActive}
                <!-- Alternate mode: prepared constellation details without
                     the Earth best-viewing-months strip. -->
                {#each renderedConstellations.filter(c => c.id === viewState.selectedConstellation) as constellation}
                  <div class="ui-details">
                    <div class="ui-divider">
                      <span class="ui-divider-diamond"></span>
                    </div>
                    <h4 class="ui-details-name">
                      {constellationName(constellation)}
                    </h4>
                    <p class="ui-details-desc">{constellationDescription(constellation)}</p>
                    {#if constellation.mythology}
                      <p class="ui-details-myth">{constellationMythology(constellation)}</p>
                    {/if}
                  </div>
                {/each}
              {:else}
                {#each constellations.filter(c => c.id === viewState.selectedConstellation) as constellation}
                  <div class="ui-details">
                    <div class="ui-divider">
                      <span class="ui-divider-diamond"></span>
                    </div>
                    <h4 class="ui-details-name">
                      {constellationName(constellation)}
                    </h4>
                    <p class="ui-details-desc">{constellationDescription(constellation)}</p>
                    {#if constellation.mythology}
                      <p class="ui-details-myth">{constellationMythology(constellation)}</p>
                    {/if}
                    <div class="ui-month-strip" aria-label="{t('constellation.bestViewingMonths')}: {constellation.visibility.bestMonths.map(m => new Date(2000, m - 1).toLocaleDateString(currentLang, { month: 'long' })).join(', ')}">
                      <span class="sr-only">{t('constellation.bestViewingMonths')}: {constellation.visibility.bestMonths.map(m => new Date(2000, m - 1).toLocaleDateString(currentLang, { month: 'long' })).join(', ')}</span>
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
            {/if}
          </section>
      {/if}
    </div>

    <div slot="overlay">
      {#if hoveredConstellationId && hoverPos}
        <Reticle x={hoverPos.x} y={hoverPos.y} state="hover"
          label={constellations.find(c => c.id === hoveredConstellationId)?.abbreviation ?? ""} />
      {/if}
      {#if hoverStarPos}
        <Callout
          x={hoverStarPos.x}
          y={hoverStarPos.y}
          title={hoverStarPos.name}
          lines={[`${t('constellation.mag')} ${hoverStarPos.magnitude.toFixed(2)}`]}
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

    <div slot="settings">
      <label class="ui-setting">
        <input type="checkbox" class="ui-toggle" bind:checked={labelsOn} />
        {t('constellation.labels')}
      </label>
      <label class="ui-setting" class:is-disabled={reducedMotion}>
        <input type="checkbox" class="ui-toggle" bind:checked={autoRotateOn} disabled={reducedMotion} />
        {t('constellation.autoRotate')}
      </label>
      {#if renderer && alternateCatalog?.referenceCatalog && !error}
        <label class="ui-setting">
          <input
            type="checkbox"
            class="ui-toggle"
            checked={referenceVisible}
            on:change={handleReferenceToggle}
          />
          {t('constellation.observer.referenceToggle')}
        </label>
      {/if}
      {#if renderer && alternateCatalog && !error}
        <div class="observer-actions">
          <button
            type="button"
            class="ui-btn ui-btn--sm observer-action-btn"
            on:click={handleFindSol}
          >
            {t('constellation.observer.findSol')}
          </button>
        </div>
        {#if solAnnouncement}
          <div
            class="observer-announcement"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {solAnnouncement}
          </div>
        {/if}
      {/if}
    </div>
  </ViewOverlay>

  <!-- Loading/Error overlay -->
  {#if loading}
    <LoadingAnimation progress={null} message={t('constellation.loading')} />
  {:else if !webglSupported}
    <div class="state-overlay pointer-events-none">
      <div class="state-card pointer-events-auto">
        {#if observerWebglFailed}
          <!-- Genuine alternate mode whose WebGL path failed: no Earth 2D
               fallback — show WebGL-required copy and Return to Earth/Sol. -->
          <h2 class="state-title">{t('constellation.observer.webglUnavailable')}</h2>
          <div class="state-actions">
            <Button size="sm" on:click={chooseAnotherObserver}>
              {t('constellation.observer.chooseAnother')}
            </Button>
            <Button size="sm" on:click={returnToSol}>
              {t('constellation.observer.returnToSol')}
            </Button>
          </div>
        {:else}
          <h2 class="state-title">{t('constellation.webglNotAvailable')}</h2>
          <p class="state-body">{t('constellation.webglDescription')}</p>
          <div class="state-hints">
            <p>{t('constellation.trySolutions')}</p>
            <ul>
              <li>{t('constellation.solutionUpdateBrowser')}</li>
              <li>{t('constellation.solutionEnableHardwareAcceleration')}</li>
              <li>{t('constellation.solutionTryDifferentBrowser')}</li>
            </ul>
          </div>
          <Button size="sm" on:click={handleBackToMenu}>
            {t('constellation.return')}
          </Button>
        {/if}
      </div>
    </div>
  {:else if error}
    <div class="state-overlay is-error">
      <div class="state-card">
        <h2 class="state-title is-danger">{t('constellation.error')}</h2>
        <p class="state-body">{error}</p>
        <Button variant="primary" size="sm" on:click={() => window.location.reload()}>
          {t('action.retry')}
        </Button>
      </div>
    </div>
  {/if}

  <!-- Drag Instructions Overlay -->
  {#if !loading && !error && webglSupported && showDragInstructions}
    <div class="absolute bottom-12 left-12 z-10" style="pointer-events: none;">
      <div class="ui-drag-card">
        {t('constellation.dragInstructions')}
      </div>
    </div>
  {/if}

  <!-- Main Content Area -->
  <div class="constellation-main-content">
    <!-- 3D Container (background) -->
    <div bind:this={container} class="constellation-container"></div>
  </div>
</div>

<style>
  .constellation-view {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg-deep);
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

  .ui-drag-card {
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-text-soft);
    padding: 8px 12px;
    background: color-mix(in srgb, var(--color-surface) 85%, transparent);
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-control);
    animation: drag-fade-in var(--dur-glide) var(--ease-glide);
  }
  @keyframes drag-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ui-drag-card {
      animation: none;
    }
  }

  .ui-details { margin-top: 12px; padding-top: 12px; }
  .ui-details-name {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 600;
    color: var(--color-accent);
    margin: 0 0 6px;
  }
  .ui-details-desc {
    font-family: var(--font-ui);
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-text-soft);
    margin: 0 0 8px;
  }
  .ui-details-myth {
    font-family: var(--font-display);
    font-size: 15px;
    font-style: italic;
    line-height: 1.4;
    color: var(--color-text-muted);
    margin: 0 0 10px;
  }
  .ui-month-strip {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 2px;
  }
  .month-cell {
    height: 8px;
    border: 1px solid var(--color-line-strong);
    border-radius: 2px;
  }
  .month-cell.is-best {
    background: var(--color-accent);
    border-color: var(--color-accent);
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

  /* Alternate observer readout carries longer localized labels
     (e.g. "Frame: System barycenter"), so its label column flexes. */
  .observer-readout .readout-row {
    grid-template-columns: 1.25fr 12px 1fr;
  }

  .compass-readout {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--color-text);
    margin-top: 8px;
  }
  .compass-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .view-from-earth {
    margin: 6px 0 0;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 14px;
    color: var(--color-text-muted);
  }

  .ui-setting { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-text); margin: 4px 0; }
  .ui-setting.is-disabled { opacity: 0.5; }

  .observer-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .observer-announcement {
    margin-top: 6px;
    font-family: var(--font-ui);
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-soft);
  }

  .observer-notice {
    margin-top: 10px;
    padding: 8px 10px;
    font-family: var(--font-ui);
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-accent-strong);
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-control);
  }
  .observer-notice-line { margin: 0; }

  .constellation-panel { width: min(340px, 90vw); max-height: 70vh; overflow-y: auto; }

  .state-overlay {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .state-overlay.is-error { background: var(--color-scrim); }
  .state-card {
    max-width: 440px;
    padding: 24px;
    text-align: center;
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-panel);
  }
  .state-title {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    color: var(--color-accent);
  }
  .state-title.is-danger { color: var(--color-danger); }
  .state-body { margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: var(--color-text-soft); }
  .state-hints { margin-bottom: 16px; font-size: 12px; color: var(--color-text-muted); text-align: left; }
  .state-hints p { margin: 0 0 6px; }
  .state-hints ul { margin: 0; padding-left: 18px; }
  .state-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
</style>
