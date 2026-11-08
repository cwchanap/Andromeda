<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { GalaxyRenderer, localGalaxyData, type GalaxyConfig, type GalaxyEvents, type StarSystemData } from '@/lib/galaxy';
    import { planetarySystemRegistry } from '@/lib/planetary-system';
    import { isObserverCandidateEligible } from '@/lib/constellation/observerRouteState';
    import { routes, type AppLocale } from '@/i18n/routes';
    import { getCurrentView, type ViewId } from '@/lib/view/currentView';
    import { gameActions, settings } from '@/stores/gameStore';
    import LoadingAnimation from '@/components/LoadingAnimation.svelte';
    import AccessibilityManager from '@/components/AccessibilityManager.svelte';
    import ViewOverlay from '@/components/view/ViewOverlay.svelte';
    import Panel from '@/components/ui/Panel.svelte';
    import SearchInput from '@/components/ui/SearchInput.svelte';
    import Modal from '@/components/ui/Modal.svelte';
    import { addMediaQueryListener, removeMediaQueryListener } from '@/utils/mediaQuery';

    export let lang: AppLocale = 'en';
    export let translations: Record<string, string> = {};

    // Translation function
    const t = (key: string) => translations[key] || key;

    // Publish HUD view + lang to the shared store so the HUD shell
    // (ViewOverlay/ViewSwitcher/SettingsPanel) can subscribe via $gameState
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
    // Settings toggle freezes the ring — matching ViewOverlay, which reads only
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

<svelte:window on:resize={() => renderer?.onResize()} />

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
                    <button class="ui-btn ui-btn--primary" type="button" on:click={() => initializeRenderer()}>
                        {t('action.retry')}
                    </button>
                </div>
            </div>
        {/if}
    </div>

    <ViewOverlay currentView={currentView} {lang} translations={translations}>
        <div slot="info" class="galaxy-info">
            <Panel title={t('galaxy.selectedSystem')}>
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
            </Panel>
        </div>

        <div slot="controls" class="galaxy-nearby">
            <Panel title={t('galaxy.starSystems')}>
                <SearchInput bind:value={nearbyQuery} placeholder={t('explore.searchPlaceholder')} ariaLabel={t('explore.searchPlaceholder')} />
                <ul class="ui-list nearby-list">
                    {#each nearbyResults as system (system.id)}
                        <li>
                            <button type="button" class="ui-list-row" on:click={() => handleSystemSelect(system.id)}>
                                <span class="row-name">{systemName(system)}</span>
                                <span class="row-leader"></span>
                                <span class="row-count">{system.distanceFromEarth.toFixed(2)} {t('unit.lightYears')}</span>
                            </button>
                        </li>
                    {/each}
                </ul>
            </Panel>
        </div>

        <div slot="settings">
            <label class="ui-setting"><input type="checkbox" class="ui-toggle" bind:checked={enableAnimations}> {t('settings.enableAnimations')}</label>
            <label class="ui-setting"><input type="checkbox" class="ui-toggle" bind:checked={enableStarGlow}> {t('galaxy.starGlowEffects')}</label>
            <label class="ui-setting"><input type="checkbox" class="ui-toggle" bind:checked={enableSolLabel}> {t('galaxy.solLabel')}</label>
            <label class="ui-setting"><input type="checkbox" class="ui-toggle" bind:checked={enableDistanceLines}> {t('galaxy.distanceLines')}</label>
            <label class="ui-setting">
                {t('galaxy.maxRenderDistance')}
                <input type="range" min="10" max="100" bind:value={maxRenderDistance}>
                <span class="setting-value">{maxRenderDistance} {t('unit.lightYears')}</span>
            </label>
        </div>
    </ViewOverlay>

    {#if selectedSystemData}
        <Modal
            isOpen={isSceneReady && showSystemDialog && selectedSystemData !== null}
            onClose={closeSystemDialog}
            closeLabel={t("action.close")}
            ariaLabel={systemName(selectedSystemData)}
            maxWidth="700px"
        >
            <svelte:fragment slot="header">
                <span class="ui-caption">{getSystemTypeLabel(selectedSystemData.systemType)}</span>
                <h2 class="dialog-title">{systemName(selectedSystemData)}</h2>
            </svelte:fragment>

            <div class="galaxy-dialog-body">
                <p class="system-overview">{systemDescription(selectedSystemData)}</p>

                <div class="system-stats-grid">
                    <div class="ui-stat stat-card">
                        <div class="ui-stat-label">{t('galaxy.distanceFromEarth')}</div>
                        <div class="ui-stat-value">{selectedSystemData.distanceFromEarth.toFixed(2)} {t('unit.lightYears')}</div>
                    </div>

                    <div class="ui-stat stat-card">
                        <div class="ui-stat-label">{t('galaxy.systemType')}</div>
                        <div class="ui-stat-value">{getSystemTypeLabel(selectedSystemData.systemType)}</div>
                    </div>

                    <div class="ui-stat stat-card">
                        <div class="ui-stat-label">{t('galaxy.numberOfStars')}</div>
                        <div class="ui-stat-value">{selectedSystemData.stars.length}</div>
                    </div>

                    {#if selectedSystemData.metadata.hasExoplanets}
                        <div class="ui-stat stat-card">
                            <div class="ui-stat-label">{t('galaxy.knownExoplanets')}</div>
                            <div class="ui-stat-value">{selectedSystemData.metadata.numberOfPlanets ?? t('common.yes')}</div>
                        </div>
                    {/if}
                </div>

                {#if selectedSystemData.metadata.spectralClass}
                    <div class="additional-info">
                        <h4 class="ui-caption">{t('galaxy.spectralClassification')}</h4>
                        <p>{selectedSystemData.metadata.spectralClass}</p>
                    </div>
                {/if}

                {#if selectedSystemData.metadata.constellation}
                    <div class="additional-info">
                        <h4 class="ui-caption">{t('galaxy.constellation')}</h4>
                        <p>{selectedSystemData.metadata.constellation}</p>
                    </div>
                {/if}

                <div class="star-details">
                    <h4 class="ui-caption">{t('galaxy.starInformation')}</h4>
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

            <svelte:fragment slot="actions">
                <button type="button" class="ui-btn ui-btn--ghost action-button" on:click={closeSystemDialog}>
                    {t('action.close')}
                </button>
                <button
                    type="button"
                    class="ui-btn action-button"
                    aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}
                    aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}
                    on:click={navigateToObserverSky}
                >
                    {t('action.viewSkyFromHere')}
                </button>
                <button
                    type="button"
                    class="ui-btn ui-btn--primary action-button"
                    on:click={() => navigateToSystem(selectedSystemId!)}
                >
                    {canExplore ? t('action.explore') : t('common.comingSoon')}
                </button>
            </svelte:fragment>

            <svelte:fragment slot="notices">
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
            </svelte:fragment>
        </Modal>
    {/if}

    <AccessibilityManager />
</div>

<style>
    .galaxy-wrapper { position: relative; width: 100%; height: 100vh; overflow: hidden; background: var(--color-bg-deep); }
    .galaxy-container { width: 100%; height: 100%; position: relative; }
    .error-overlay { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; background: var(--color-scrim); color: var(--color-text); }
    .error-content { max-width: 400px; padding: 2rem; text-align: center; }
    .error-content h3 { margin: 0 0 0.75rem; font-family: var(--font-display); font-size: 28px; color: var(--color-danger); }
    .error-content p { margin: 0 0 1rem; color: var(--color-text-soft); }
    .galaxy-nearby { width: min(340px, 90vw); max-height: 60vh; overflow-y: auto; }
    .galaxy-info { width: min(280px, 80vw); }
    .info-system-name { margin-bottom: 8px; font-family: var(--font-display); font-size: 22px; font-weight: 600; color: var(--color-accent); }
    .info-row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; font-size: 12px; }
    .info-label { color: var(--color-text-muted); }
    .info-value { color: var(--color-text); }
    .info-empty { font-family: var(--font-display); font-style: italic; font-size: 15px; color: var(--color-text-muted); }
    .nearby-list { list-style: none; margin: 10px 0 0; padding: 0; }
    .ui-setting { display: flex; align-items: center; gap: 10px; margin: 4px 0; font-size: 13px; color: var(--color-text); }
    .ui-setting input[type="range"] { flex: 1; accent-color: var(--color-accent); }
    .setting-value { font-size: 12px; color: var(--color-text-muted); }
    .dialog-title { margin: 2px 0 0; font-family: var(--font-display); font-size: 34px; font-weight: 600; line-height: 1; color: var(--color-text); }
    .galaxy-dialog-body { display: flex; flex-direction: column; gap: 16px; }
    .system-overview { margin: 0; font-family: var(--font-display); font-style: italic; font-size: 18px; line-height: 1.45; color: var(--color-text-soft); }
    .system-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px 18px; padding: 14px 0; border-top: 1px solid var(--color-line); border-bottom: 1px solid var(--color-line); }
    .additional-info h4, .star-details h4 { margin: 0 0 6px; }
    .additional-info p { margin: 0; color: var(--color-text); }
    .stars-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
    .star-card { padding: 10px 12px; border: 1px solid var(--color-line); border-radius: var(--radius-control); font-size: 12px; color: var(--color-text-soft); }
    .star-name { margin-bottom: 4px; font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--color-text); }
    .action-button[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
    @media (max-width: 400px) {
        .action-button { width: 100%; }
    }
    .sky-unavailable-notice,
    .coming-soon-notice { margin: 0 0 12px; padding: 10px 14px; border: 1px solid var(--color-line-strong); border-radius: var(--radius-control); color: var(--color-text-soft); font-size: 13px; text-align: center; }
    .coming-soon-notice { border-color: var(--color-accent); color: var(--color-accent); }
</style>
