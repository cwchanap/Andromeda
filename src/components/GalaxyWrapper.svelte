<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { GalaxyRenderer, localGalaxyData, type GalaxyConfig, type GalaxyEvents, type StarSystemData } from '@/lib/galaxy';
    import { planetarySystemRegistry } from '@/lib/planetary-system';
    import { isObserverCandidateEligible } from '@/lib/constellation/observerRouteState';
    import { routes, type AppLocale } from '@/i18n/routes';
    import { getCurrentView, type ViewId } from '@/lib/view/currentView';
    import { gameActions, settings } from '@/stores/gameStore';
    import LoadingAnimation from '@/components/LoadingAnimation.svelte';
    import ErrorBoundary from '@/components/ErrorBoundary.svelte';
    import AccessibilityManager from '@/components/AccessibilityManager.svelte';
    import ViewHud from '@/components/hud/ViewHud.svelte';
    import HudPanel from '@/components/hud/HudPanel.svelte';
    import HudSearch from '@/components/hud/HudSearch.svelte';
    import { focusTrap } from '@/lib/hud/focusTrap';
    import { addMediaQueryListener, removeMediaQueryListener } from '@/utils/mediaQuery';

    export let lang: AppLocale = 'en';
    export let translations: Record<string, string> = {};

    // Translation function
    const t = (key: string) => translations[key] || key;

    // Publish HUD view + lang to the shared store so the HUD shell
    // (ViewHud/ViewSwitcher/SettingsPanel) can subscribe via $gameState
    // instead of receiving drilled props.
    gameActions.setHudLang(lang);

    // Translate system type raw value
    const getSystemTypeLabel = (type: string) => {
        const key = `galaxy.systemType.${type}`;
        return t(key) !== key ? t(key) : type;
    };

    // Resolve a system's display name via i18n, falling back to the registry
    // name when no translation is available. Without this the galaxy view
    // always shows the English hardcoded name from LocalGalaxy.ts, ignoring
    // the active locale. Mirrors the pattern in ExploreSystems.svelte.
    const systemName = (system: { id: string; name: string }) => {
        const key = `systems.${system.id}.name`;
        const translated = t(key);
        return !translated || translated === key ? system.name : translated;
    };

    // Resolve a system's description via i18n, falling back to the hardcoded
    // galaxy description when no translation is available.
    const systemDescription = (system: { id: string; description: string }) => {
        const key = `systems.${system.id}.description`;
        const translated = t(key);
        return !translated || translated === key ? system.description : translated;
    };

    // Active view + nearby system search state
    let currentView: ViewId = 'galaxy';
    if (typeof window !== 'undefined') {
        currentView = getCurrentView(window.location.pathname) ?? 'galaxy';
    }
    gameActions.setHudView(currentView);
    let nearbyQuery = '';
    $: nearbyResults = localGalaxyData.starSystems.filter((s) =>
        systemName(s).toLowerCase().includes(nearbyQuery.toLowerCase())
    );

    // Component state
    let container: HTMLElement;
    let renderer: GalaxyRenderer | null = null;
    let isLoading = true;
    let loadingProgress = 0;
    let error: string | null = null;
    let isSceneReady = false;
    let loadingMessage = t('galaxy.loading');

    // Dialog state
    let showSystemDialog = false;
    let selectedSystemId: string | null = null;
    let selectedSystemData: StarSystemData | null = null;
    let comingSoonNotice = false;

    // Configuration state
    let enableAnimations = true;
    let enableStarGlow = true;
    let enableSolLabel = true;
    let enableDistanceLines = true;
    let maxRenderDistance = 50;

    // Default configuration
    const defaultConfig: Partial<GalaxyConfig> = {
        enableControls: true,
        enableAnimations: true,
        enableMobileOptimization: false,
        antialiasing: true,
        performanceMode: "medium",
        starFieldDensity: 1.0,
        backgroundStarCount: 2000,
        enableSolLabel: enableSolLabel,
        enableDistanceIndicators: enableDistanceLines,
        maxRenderDistance: 50,
        enableBloom: false,
        enableStarGlow: true,
        starGlowIntensity: 1.0,
        solMarkerLabel: t('galaxy.solMarkerLabel'),
    };

    // Event handlers
    const events: GalaxyEvents = {
        onSystemLoad: () => {
            isLoading = false;
            isSceneReady = true;
            loadingProgress = 100;
        },
        onError: (err: Error) => {
            error = err.message;
            isLoading = false;
            console.error('Galaxy renderer error:', err);
        },
        onStarSystemSelect: (system) => {
            selectedSystemId = system.id;
            selectedSystemData = system;
            showSystemDialog = true;
        },
    };

    // Initialize renderer
    async function initializeRenderer() {
        if (!container || renderer) return;

        try {
            isLoading = true;
            error = null;
            loadingMessage = t('galaxy.initializing');
            loadingProgress = 20;

            renderer = new GalaxyRenderer(container, defaultConfig, events);

            loadingMessage = t('galaxy.loadingSystems');
            loadingProgress = 60;

            await renderer.initialize(localGalaxyData);
            // Window resize is handled by <svelte:window on:resize> below,
            // so no manual addEventListener is needed here.

        } catch (err) {
            error = err instanceof Error ? err.message : t('error.unknown');
            isLoading = false;
            console.error('Failed to initialize galaxy renderer:', err);
        }
    }

    // Cleanup renderer
    function cleanup() {
        if (renderer) {
            renderer.dispose();
            renderer = null;
        }
    }

    const closeSystemDialog = () => {
        showSystemDialog = false;
        comingSoonNotice = false;
    };

    // Escape closes the system dialog (mirrors SettingsPanel's pattern).
    function handleDialogKeydown(event: KeyboardEvent) {
        if (showSystemDialog && event.key === 'Escape') closeSystemDialog();
    }

    // Resolve the route-safe id for a given galaxy system id, mirroring the
    // mapping used by navigateToSystem so the CTA label stays in sync with
    // actual navigability.
    const resolveRouteSystemId = (systemId: string | null): string | null =>
        systemId === null ? null : systemId === 'solar-system' ? 'solar' : systemId;

    // CTA label must reflect actual route availability: systems registered in
    // the planetary registry are explorable, everything else is "Coming Soon".
    $: canExplore =
        selectedSystemId !== null &&
        planetarySystemRegistry.hasSystem(resolveRouteSystemId(selectedSystemId) ?? '');

    // Shared eligibility source for the independent View Sky action. Computed
    // reactively from selectedSystemData so the button state and the guard in
    // navigateToObserverSky always agree.
    $: observerEligibility = selectedSystemData
        ? isObserverCandidateEligible(selectedSystemData)
        : null;

    const navigateToSystem = (systemId: string) => {
        const routeSystemId = resolveRouteSystemId(systemId) ?? systemId;

        if (planetarySystemRegistry.hasSystem(routeSystemId)) {
            window.location.href = routes.planetarySystem(routeSystemId, lang);
        } else {
            // Show inline notice for unimplemented systems instead of a
            // blocking native alert().
            comingSoonNotice = true;
        }
    };

    // Independent full-page navigation to the constellation view scoped to
    // the selected system as the observer. Eligible systems only; the button
    // renders aria-disabled (not native disabled) when unavailable so it
    // remains focusable and announced.
    const navigateToObserverSky = () => {
        if (!selectedSystemData || observerEligibility?.eligible !== true) return;

        window.location.href = routes.constellation(lang, {
            observerId: selectedSystemData.id,
        });
    };

    // Star system selection handlers
    const handleSystemSelect = (systemId: string) => {
        if (renderer) {
            renderer.focusOnStarSystem(systemId, true);
            renderer.highlightStarSystem(systemId, true);

            // Find system data
            const systemData = localGalaxyData.starSystems.find(s => s.id === systemId);
            if (systemData) {
                selectedSystemId = systemId;
                selectedSystemData = systemData;
                showSystemDialog = true;
            }
        }
    };

    // Reactive updates — each toggle variable is directly referenced in a
    // reactive block so Svelte's static dependency analysis re-runs the block
    // when that variable changes. (Reading a var inside a called function does
    // NOT register a dependency, so the previous combined block silently
    // no-op'd for enableAnimations / enableStarGlow / maxRenderDistance.)
    $: if (renderer) {
        renderer.updateConfig({ enableAnimations, enableStarGlow, maxRenderDistance });
        renderer.setDistanceLinesVisible(enableDistanceLines);
    }
    // Star labels toggle only the Sol marker label, not the whole marker group.
    $: if (renderer) renderer.setSolLabelVisible(enableSolLabel);
    // Reduced-motion preference freezes the Sol ring pulse per the spec.
    // Two sources are OR'd so EITHER the OS preference OR the in-app
    // Settings toggle freezes the ring — matching ViewHud, which reads only
    // $settings.reducedMotion. Without this, enabling Reduced Motion via the
    // settings modal (without OS pref) would style the HUD but leave the
    // ring pulsing. Both inputs are subscribed so mid-session toggles apply
    // live.
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
    $: if (renderer) renderer.setReducedMotion(reducedMotion);

    // Lifecycle
    onMount(() => {
        initializeRenderer();
        addMediaQueryListener(reducedMotionMql, "change", handleReducedMotionChange);
    });

    onDestroy(() => {
        removeMediaQueryListener(reducedMotionMql, "change", handleReducedMotionChange);
        cleanup();
    });

    // Handle container changes
    $: if (container && !renderer) {
        initializeRenderer();
    }
</script>

<svelte:window on:resize={() => renderer?.onResize()} on:keydown={handleDialogKeydown} />

<div class="galaxy-wrapper">
    <div id="galaxy-renderer" class="galaxy-container" bind:this={container}>
        {#if isLoading}
            <LoadingAnimation
                progress={loadingProgress}
                message={loadingMessage}
            />
        {/if}

        {#if error}
            <div class="error-overlay">
                <div class="error-content">
                    <h3>{t('galaxy.loadFailed')}</h3>
                    <p>{error}</p>
                    <button on:click={() => initializeRenderer()}>
                        {t('action.retry')}
                    </button>
                </div>
            </div>
        {/if}
    </div>

    <ViewHud currentView={currentView} {lang} translations={translations}>
        <div slot="info" class="galaxy-info">
            <HudPanel title={t('galaxy.selectedSystem')}>
                {#if selectedSystemData}
                    <div class="info-system-name">{systemName(selectedSystemData)}</div>
                    <div class="info-row">
                        <span class="info-label">{t('galaxy.distanceFromEarth')}</span>
                        <span class="info-value">{selectedSystemData.distanceFromEarth.toFixed(2)} {t('unit.lightYears')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">{t('galaxy.systemType')}</span>
                        <span class="info-value">{getSystemTypeLabel(selectedSystemData.systemType)}</span>
                    </div>
                {:else}
                    <div class="info-empty">{t('galaxy.noSelection')}</div>
                {/if}
            </HudPanel>
        </div>

        <div slot="controls" class="galaxy-nearby">
            <HudPanel title={t('galaxy.starSystems')}>
                <HudSearch bind:value={nearbyQuery} placeholder={t('explore.searchPlaceholder')} ariaLabel={t('explore.searchPlaceholder')} />
                <ul class="hud-list mt-2">
                    {#each nearbyResults as system (system.id)}
                        <li>
                            <button type="button" class="hud-list-row" on:click={() => handleSystemSelect(system.id)}>
                                <span class="row-name">{systemName(system)}</span>
                                <span class="row-leader"></span>
                                <span class="row-count">{system.distanceFromEarth.toFixed(2)} {t('unit.lightYears')}</span>
                            </button>
                        </li>
                    {/each}
                </ul>
            </HudPanel>
        </div>

        <div slot="settings">
            <label class="hud-setting"><input type="checkbox" bind:checked={enableAnimations}> {t('settings.enableAnimations')}</label>
            <label class="hud-setting"><input type="checkbox" bind:checked={enableStarGlow}> {t('galaxy.starGlowEffects')}</label>
            <label class="hud-setting"><input type="checkbox" bind:checked={enableSolLabel}> {t('galaxy.solLabel')}</label>
            <label class="hud-setting"><input type="checkbox" bind:checked={enableDistanceLines}> {t('galaxy.distanceLines')}</label>
            <label class="hud-setting">
                {t('galaxy.maxRenderDistance')}
                <input type="range" min="10" max="100" bind:value={maxRenderDistance}>
                <span>{maxRenderDistance} {t('unit.lightYears')}</span>
            </label>
        </div>
    </ViewHud>

    {#if isSceneReady && showSystemDialog && selectedSystemData}
            <div
                class="system-dialog-overlay"
                use:focusTrap={".dialog-close-button"}
                on:click={(e) => {
                    if (e.target === e.currentTarget) closeSystemDialog();
                }}
                on:keydown={handleDialogKeydown}
                role="dialog"
                aria-modal="true"
                aria-label={systemName(selectedSystemData)}
                tabindex="-1"
            >
                <div class="system-dialog">
                    <div class="dialog-header">
                        <h2>{systemName(selectedSystemData)}</h2>
                        <button class="dialog-close-button" on:click={closeSystemDialog} aria-label={t('action.close')}>×</button>
                    </div>
                    <div class="dialog-actions">
                        <button
                            type="button"
                            class="action-button secondary"
                            aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}
                            aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}
                            on:click={navigateToObserverSky}
                        >
                            {t('action.viewSkyFromHere')}
                        </button>
                        <button
                            class="action-button primary"
                            on:click={() => navigateToSystem(selectedSystemId!)}
                        >
                            {canExplore ? t('action.explore') : t('common.comingSoon')}
                        </button>
                    </div>
                    {#if observerEligibility?.eligible === false}
                        <div id="galaxy-sky-unavailable" class="sky-unavailable-notice" role="status">
                            {t('galaxy.skyUnavailable')}
                        </div>
                    {/if}
                    {#if comingSoonNotice}
                        <div class="coming-soon-notice" role="status">
                            {t('galaxy.comingSoonNotice')}
                        </div>
                    {/if}
                    <div class="dialog-content">
                        <p class="system-overview">{systemDescription(selectedSystemData)}</p>

                        <div class="system-stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">{t('galaxy.distanceFromEarth')}</div>
                                <div class="stat-value">{selectedSystemData.distanceFromEarth.toFixed(2)} {t('unit.lightYears')}</div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-label">{t('galaxy.systemType')}</div>
                                <div class="stat-value">{getSystemTypeLabel(selectedSystemData.systemType)}</div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-label">{t('galaxy.numberOfStars')}</div>
                                <div class="stat-value">{selectedSystemData.stars.length}</div>
                            </div>

                            {#if selectedSystemData.metadata.hasExoplanets}
                                <div class="stat-card">
                                    <div class="stat-label">{t('galaxy.knownExoplanets')}</div>
                                    <div class="stat-value">{selectedSystemData.metadata.numberOfPlanets ?? t('common.yes')}</div>
                                </div>
                            {/if}
                        </div>

                        {#if selectedSystemData.metadata.spectralClass}
                            <div class="additional-info">
                                <h4>{t('galaxy.spectralClassification')}</h4>
                                <p>{selectedSystemData.metadata.spectralClass}</p>
                            </div>
                        {/if}

                        {#if selectedSystemData.metadata.constellation}
                            <div class="additional-info">
                                <h4>{t('galaxy.constellation')}</h4>
                                <p>{selectedSystemData.metadata.constellation}</p>
                            </div>
                        {/if}

                        <div class="star-details">
                            <h4>{t('galaxy.starInformation')}</h4>
                            <div class="stars-grid">
                                {#each selectedSystemData.stars as star, index}
                                    <div class="star-card">
                                        <div class="star-name">{t('galaxy.star')} {index + 1}</div>
                                        <div class="star-type">{t('galaxy.starType')}: {star.stellarType}</div>
                                        {#if star.temperature}
                                            <div class="star-temp">{t('modal.temperature')}: {star.temperature} {t('unit.kelvin')}</div>
                                        {/if}
                                        {#if star.mass}
                                            <div class="star-mass">{t('galaxy.mass')}: {star.mass} M☉</div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

    <AccessibilityManager />
</div>

<style>
    .galaxy-wrapper { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #000011; }
    .galaxy-container { width: 100%; height: 100%; position: relative; }
    .error-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 17, 0.9); color: #fff; z-index: 10; }
    .error-content { text-align: center; max-width: 400px; padding: 2rem; }
    .error-content h3 { color: #ff6b6b; margin-bottom: 1rem; }
    .error-content button { background: #007acc; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 1rem; }
    .galaxy-nearby { width: min(340px, 90vw); max-height: 60vh; overflow-y: auto; }
    .galaxy-info { width: min(280px, 80vw); }
    .info-system-name { font-family: var(--hud-font-display, monospace); font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--hud-cyan, #00f0ff); margin-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 2px 0; color: rgba(255,255,255,0.85); }
    .info-label { letter-spacing: 0.08em; opacity: 0.7; }
    .info-value { color: var(--hud-cyan, #00f0ff); }
    .info-empty { font-size: 12px; color: rgba(255,255,255,0.6); font-style: italic; }
    .hud-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .hud-list-row {
        display: flex; align-items: center; gap: 8px; width: 100%;
        background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.8);
        padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px; text-align: left;
    }
    .hud-list-row:hover { border-color: var(--hud-cyan, #00f0ff); color: var(--hud-cyan, #00f0ff); }
    .row-name { white-space: nowrap; }
    .row-leader { flex: 1; border-bottom: 1px dotted rgba(0,240,255,0.3); }
    .row-count { font-size: 11px; opacity: 0.8; }
    .hud-setting { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.85); margin: 2px 0; }
    .hud-setting input[type="range"] { flex: 1; }
    .system-dialog-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.8); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; }
    .system-dialog { background: rgba(0,0,17,0.95); border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 12px; width: min(700px, 90vw); max-height: 85vh; overflow: hidden; padding: 20px; color: #e0f7ff; display: flex; flex-direction: column; box-sizing: border-box; }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .dialog-header h2 { margin: 0; color: var(--hud-cyan, #00f0ff); }
    .dialog-close-button { background: transparent; border: none; color: var(--hud-cyan, #00f0ff); font-size: 24px; cursor: pointer; }
    .dialog-content { display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 6rem; overflow-y: auto; padding-right: 4px; }
    .system-overview { margin: 0; color: rgba(255,255,255,0.85); line-height: 1.5; }
    .dialog-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin: 0 0 16px; flex: 0 0 auto; }
    .action-button { padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; letter-spacing: 0.08em; }
    @media (max-width: 400px) {
        .dialog-actions { flex-direction: column; }
        .dialog-actions .action-button { width: 100%; }
    }
    .action-button.secondary { background: transparent; border: 1px solid var(--hud-cyan, #00f0ff); color: var(--hud-cyan, #00f0ff); }
    .action-button.primary { background: var(--hud-cyan, #00f0ff); border: 1px solid var(--hud-cyan, #00f0ff); color: #001011; }
    .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-button[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
    .sky-unavailable-notice {
        margin: 0 0 12px;
        padding: 10px 14px;
        border: 1px solid rgba(0, 240, 255, 0.45);
        border-radius: 6px;
        background: rgba(0, 240, 255, 0.06);
        color: rgba(224, 247, 255, 0.85);
        font-size: 13px;
        text-align: center;
    }
    .coming-soon-notice { margin: 0 0 12px; padding: 10px 14px; border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 6px; background: rgba(0,240,255,0.08); color: var(--hud-cyan, #00f0ff); font-size: 13px; text-align: center; }
</style>
