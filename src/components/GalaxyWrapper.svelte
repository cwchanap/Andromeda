<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { GalaxyRenderer, localGalaxyData, type GalaxyConfig, type GalaxyEvents } from '@/lib/galaxy';
    import { planetarySystemRegistry } from '@/lib/planetary-system';
    import { routes, type AppLocale } from '@/i18n/routes';
    import { getCurrentView } from '@/lib/view/currentView';
    import LoadingAnimation from '@/components/LoadingAnimation.svelte';
    import ErrorBoundary from '@/components/ErrorBoundary.svelte';
    import AccessibilityManager from '@/components/AccessibilityManager.svelte';
    import ViewHud from '@/components/hud/ViewHud.svelte';
    import HudPanel from '@/components/hud/HudPanel.svelte';
    import HudSearch from '@/components/hud/HudSearch.svelte';

    export let lang: AppLocale = 'en';
    export let translations: Record<string, string> = {};

    // Translation function
    const t = (key: string) => translations[key] || key;

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
    let currentView = getCurrentView(window.location.pathname) ?? 'galaxy';
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
    let selectedSystemData: any = null;

    // Configuration state
    let enableAnimations = true;
    let enableStarGlow = true;
    let enableStarLabels = true;
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
        enableStarLabels: enableStarLabels,
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
        onCameraChange: (position, zoom) => {
            // Handle camera changes if needed
        }
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

            // Handle window resize
            const handleResize = () => {
                renderer?.onResize();
            };
            window.addEventListener('resize', handleResize);

            // Cleanup function will remove the event listener
            return () => {
                window.removeEventListener('resize', handleResize);
            };

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

    const navigateToSystem = (systemId: string) => {
        const routeSystemId = resolveRouteSystemId(systemId) ?? systemId;

        if (planetarySystemRegistry.hasSystem(routeSystemId)) {
            window.location.href = routes.planetarySystem(routeSystemId, lang);
        } else {
            // Show placeholder message for unimplemented systems
            alert(`Detailed view for ${systemName(selectedSystemData) || systemId} is coming soon!`);
        }
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

    // Configuration change handlers
    const updateAnimations = () => {
        if (renderer) {
            renderer.updateConfig({ enableAnimations });
        }
    };

    const updateStarGlow = () => {
        if (renderer) {
            renderer.updateConfig({ enableStarGlow });
        }
    };

    const updateStarLabels = () => {
        if (renderer) {
            renderer.updateConfig({ enableStarLabels });
        }
    };

    const updateRenderDistance = () => {
        if (renderer) {
            renderer.updateConfig({ maxRenderDistance });
        }
    };

    // Reactive updates
    $: if (renderer) {
        updateAnimations();
    }

    $: if (renderer) {
        updateStarGlow();
    }

    $: if (renderer) {
        updateStarLabels();
    }

    $: if (renderer) {
        updateRenderDistance();
    }

    $: if (renderer) renderer.setDistanceLinesVisible(enableDistanceLines);
    $: if (renderer) renderer.setSolMarkerVisible(enableStarLabels);

    // Lifecycle
    onMount(async () => {
        const cleanupResize = await initializeRenderer();
        return cleanupResize;
    });

    onDestroy(() => {
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
                    <button on:click={() => initializeRenderer()}>
                        {t('action.retry')}
                    </button>
                </div>
            </div>
        {/if}
    </div>

    {#if isSceneReady}
        <ViewHud currentView={currentView} {lang} translations={translations}>
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
                <label class="hud-setting"><input type="checkbox" bind:checked={enableStarLabels}> {t('galaxy.starSystemLabels')}</label>
                <label class="hud-setting"><input type="checkbox" bind:checked={enableDistanceLines}> {t('galaxy.distanceLines')}</label>
                <label class="hud-setting">
                    {t('galaxy.maxRenderDistance')}
                    <input type="range" min="10" max="100" bind:value={maxRenderDistance}>
                    <span>{maxRenderDistance} {t('unit.lightYears')}</span>
                </label>
            </div>
        </ViewHud>

        {#if showSystemDialog && selectedSystemData}
            <div class="system-dialog-overlay" on:click={closeSystemDialog} role="dialog" aria-modal="true">
                <div class="system-dialog" on:click|stopPropagation>
                    <div class="dialog-header">
                        <h2>{systemName(selectedSystemData)}</h2>
                        <button class="dialog-close-button" on:click={closeSystemDialog} aria-label={t('action.close')}>×</button>
                    </div>
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
                    <div class="dialog-actions">
                        <button class="action-button secondary" on:click={closeSystemDialog}>{t('action.close')}</button>
                        <button class="action-button primary" on:click={() => navigateToSystem(selectedSystemId!)}>{canExplore ? t('action.explore') : t('common.comingSoon')}</button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}

    <AccessibilityManager />
</div>

<style>
    .galaxy-wrapper { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #000011; }
    .galaxy-container { width: 100%; height: 100%; position: relative; }
    .galaxy-nearby { width: min(340px, 90vw); max-height: 60vh; overflow-y: auto; }
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
    .system-dialog { background: rgba(0,0,17,0.95); border: 1px solid var(--hud-cyan, #00f0ff); border-radius: 12px; width: min(700px, 90vw); max-height: 85vh; overflow-y: auto; padding: 20px; color: #e0f7ff; }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .dialog-header h2 { margin: 0; color: var(--hud-cyan, #00f0ff); }
    .dialog-close-button { background: transparent; border: none; color: var(--hud-cyan, #00f0ff); font-size: 24px; cursor: pointer; }
    .dialog-content { display: flex; flex-direction: column; gap: 12px; }
    .system-overview { margin: 0; color: rgba(255,255,255,0.85); line-height: 1.5; }
    .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
    .action-button { padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; letter-spacing: 0.08em; }
    .action-button.secondary { background: transparent; border: 1px solid var(--hud-cyan, #00f0ff); color: var(--hud-cyan, #00f0ff); }
    .action-button.primary { background: var(--hud-cyan, #00f0ff); border: 1px solid var(--hud-cyan, #00f0ff); color: #001011; }
    .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
