<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { GalaxyRenderer, localGalaxyData, type GalaxyConfig, type GalaxyEvents } from '../lib/galaxy';
    import LoadingAnimation from './LoadingAnimation.svelte';
    import ErrorBoundary from './ErrorBoundary.svelte';
    import AccessibilityManager from './AccessibilityManager.svelte';
    
    // Component state
    let container: HTMLElement;
    let renderer: GalaxyRenderer | null = null;
    let isLoading = true;
    let loadingProgress = 0;
    let error: string | null = null;
    let isSceneReady = false;
    let loadingMessage = "Loading galaxy...";
    
    // UI state
    let showHamburgerMenu = false;
    let showControls = false;
    let showSystemInfo = false;
    let showSystemDialog = false;
    let selectedSystemId: string | null = null;
    let selectedSystemData: any = null;
    
    // Configuration state
    let enableAnimations = true;
    let enableStarGlow = true;
    let enableStarLabels = true;
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
        enableStarLabels: true,
        enableDistanceIndicators: true,
        maxRenderDistance: 50,
        enableBloom: false,
        enableStarGlow: true,
        starGlowIntensity: 1.0,
    };
    
    // Event handlers
    const events: GalaxyEvents = {
        onSystemLoad: () => {
            isLoading = false;
            isSceneReady = true;
            loadingProgress = 100;
            console.log('Galaxy loaded successfully');
        },
        onError: (err: Error) => {
            error = err.message;
            isLoading = false;
            console.error('Galaxy renderer error:', err);
        },
        onStarSystemSelect: (system) => {
            selectedSystemId = system.id;
            selectedSystemData = system;
            showSystemInfo = true;
            showSystemDialog = true;
            console.log('Star system selected:', system.name);
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
            loadingMessage = "Initializing 3D renderer...";
            loadingProgress = 20;
            
            renderer = new GalaxyRenderer(container, defaultConfig, events);
            
            loadingMessage = "Loading star systems...";
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
            error = err instanceof Error ? err.message : 'Unknown error occurred';
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
    
    // Navigation handlers
    const handleBackToMenu = () => {
        window.location.href = '/';
    };
    
    const toggleHamburgerMenu = () => {
        showHamburgerMenu = !showHamburgerMenu;
        if (showHamburgerMenu) {
            showControls = false;
        }
    };
    
    const toggleControls = () => {
        showControls = !showControls;
        if (showControls) {
            showHamburgerMenu = false;
        }
    };
    
    const closeSystemInfo = () => {
        showSystemInfo = false;
        selectedSystemId = null;
        selectedSystemData = null;
    };
    
    const closeSystemDialog = () => {
        showSystemDialog = false;
        // Keep selectedSystemId and selectedSystemData for tooltip
    };
    
    const navigateToSystem = (systemId: string) => {
        // Map system IDs to their routes
        const systemRoutes: Record<string, string> = {
            'solar-system': '/planetary/solar',
            'alpha-centauri': '/planetary/alpha-centauri',
            'barnards-star': '/planetary/barnards-star', // placeholder
            'wolf-359': '/planetary/wolf-359', // placeholder
            'sirius': '/planetary/sirius' // placeholder
        };
        
        const route = systemRoutes[systemId];
        if (route) {
            window.location.href = route;
        } else {
            // Show placeholder message for unimplemented systems
            alert(`Detailed view for ${selectedSystemData?.name || systemId} is coming soon!`);
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
                showSystemInfo = true;
                showSystemDialog = true;
            }
        }
        showHamburgerMenu = false;
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
                    <h3>Failed to load galaxy</h3>
                    <p>{error}</p>
                    <button on:click={() => initializeRenderer()}>
                        Retry
                    </button>
                </div>
            </div>
        {/if}
    </div>
    
    {#if isSceneReady}
        <!-- Hamburger Menu Button -->
        <button class="hamburger-button" on:click={toggleHamburgerMenu} aria-label="Menu">
            <div class="hamburger-line" class:active={showHamburgerMenu}></div>
            <div class="hamburger-line" class:active={showHamburgerMenu}></div>
            <div class="hamburger-line" class:active={showHamburgerMenu}></div>
        </button>
        
        <!-- Controls Button -->
        <button class="controls-button" on:click={toggleControls} aria-label="Controls">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
        </button>
        
        <!-- Back Button -->
        <button class="back-button" on:click={handleBackToMenu}>
            ← Back to Menu
        </button>
        
        <!-- Hamburger Menu -->
        {#if showHamburgerMenu}
            <div class="hamburger-menu">
                <div class="menu-section">
                    <h3>About Local Galaxy</h3>
                    <p>This 3D visualization shows the nearest star systems to Earth within 10 light-years.</p>
                    
                    <h4>Star Systems</h4>
                    <div class="system-list">
                        {#each localGalaxyData.starSystems as system}
                            <button class="system-item" on:click={() => handleSystemSelect(system.id)}>
                                <span class="system-name">{system.name}</span>
                                <span class="system-distance">{system.distanceFromEarth.toFixed(2)} ly</span>
                            </button>
                        {/each}
                    </div>
                    
                    <h4>Navigation Tips</h4>
                    <ul class="tips-list">
                        <li><strong>Mouse/Touch:</strong> Drag to rotate the view</li>
                        <li><strong>Scroll/Pinch:</strong> Zoom in and out</li>
                        <li><strong>Star Systems:</strong> Click on systems above to focus</li>
                        <li><strong>Controls:</strong> Use the settings panel to adjust visuals</li>
                    </ul>
                </div>
            </div>
        {/if}
        
        <!-- Controls Panel -->
        {#if showControls}
            <div class="controls-panel">
                <h3>Galaxy Controls</h3>
                
                <div class="control-group">
                    <label>
                        <input type="checkbox" bind:checked={enableAnimations}>
                        Enable Animations
                    </label>
                </div>
                
                <div class="control-group">
                    <label>
                        <input type="checkbox" bind:checked={enableStarGlow}>
                        Star Glow Effects
                    </label>
                </div>
                
                <div class="control-group">
                    <label>
                        <input type="checkbox" bind:checked={enableStarLabels}>
                        Star System Labels
                    </label>
                </div>
                
                <div class="control-group">
                    <label for="distance-slider">Max Render Distance:</label>
                    <input 
                        type="range" 
                        id="distance-slider"
                        min="10" 
                        max="100" 
                        bind:value={maxRenderDistance}
                    >
                    <span class="distance-value">{maxRenderDistance} ly</span>
                </div>
            </div>
        {/if}
        
        <!-- System Info Tooltip -->
        {#if showSystemInfo && selectedSystemData}
            <div class="system-info-tooltip">
                <button class="close-button" on:click={closeSystemInfo}>×</button>
                <h3>{selectedSystemData.name}</h3>
                <p class="system-description">{selectedSystemData.description}</p>
                
                <div class="system-details">
                    <div class="detail-item">
                        <strong>Distance:</strong> {selectedSystemData.distanceFromEarth.toFixed(2)} light-years
                    </div>
                    <div class="detail-item">
                        <strong>System Type:</strong> {selectedSystemData.systemType}
                    </div>
                    {#if selectedSystemData.metadata.spectralClass}
                        <div class="detail-item">
                            <strong>Spectral Class:</strong> {selectedSystemData.metadata.spectralClass}
                        </div>
                    {/if}
                    {#if selectedSystemData.metadata.constellation}
                        <div class="detail-item">
                            <strong>Constellation:</strong> {selectedSystemData.metadata.constellation}
                        </div>
                    {/if}
                    <div class="detail-item">
                        <strong>Stars:</strong> {selectedSystemData.stars.length}
                    </div>
                    {#if selectedSystemData.metadata.hasExoplanets}
                        <div class="detail-item">
                            <strong>Known Exoplanets:</strong> {selectedSystemData.metadata.numberOfPlanets || 'Yes'}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
        
        <!-- System Details Dialog -->
        {#if showSystemDialog && selectedSystemData}
            <div class="system-dialog-overlay" on:click={closeSystemDialog}>
                <div class="system-dialog" on:click|stopPropagation>
                    <div class="dialog-header">
                        <h2>{selectedSystemData.name}</h2>
                        <button class="dialog-close-button" on:click={closeSystemDialog}>×</button>
                    </div>
                    
                    <div class="dialog-content">
                        <div class="system-overview">
                            <p class="system-description-large">{selectedSystemData.description}</p>
                        </div>
                        
                        <div class="system-stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">Distance from Earth</div>
                                <div class="stat-value">{selectedSystemData.distanceFromEarth.toFixed(2)} light-years</div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-label">System Type</div>
                                <div class="stat-value">{selectedSystemData.systemType}</div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-label">Number of Stars</div>
                                <div class="stat-value">{selectedSystemData.stars.length}</div>
                            </div>
                            
                            {#if selectedSystemData.metadata.hasExoplanets}
                                <div class="stat-card">
                                    <div class="stat-label">Known Exoplanets</div>
                                    <div class="stat-value">{selectedSystemData.metadata.numberOfPlanets || 'Yes'}</div>
                                </div>
                            {/if}
                        </div>
                        
                        {#if selectedSystemData.metadata.spectralClass}
                            <div class="additional-info">
                                <h4>Spectral Classification</h4>
                                <p>{selectedSystemData.metadata.spectralClass}</p>
                            </div>
                        {/if}
                        
                        {#if selectedSystemData.metadata.constellation}
                            <div class="additional-info">
                                <h4>Constellation</h4>
                                <p>{selectedSystemData.metadata.constellation}</p>
                            </div>
                        {/if}
                        
                        <div class="star-details">
                            <h4>Star Information</h4>
                            <div class="stars-grid">
                                {#each selectedSystemData.stars as star, index}
                                    <div class="star-card">
                                        <div class="star-name">Star {index + 1}</div>
                                        <div class="star-type">Type: {star.stellarType}</div>
                                        {#if star.temperature}
                                            <div class="star-temp">Temperature: {star.temperature}K</div>
                                        {/if}
                                        {#if star.mass}
                                            <div class="star-mass">Mass: {star.mass} M☉</div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                    
                    <div class="dialog-actions">
                        <button class="action-button secondary" on:click={closeSystemDialog}>
                            Close
                        </button>
                        <button class="action-button primary" on:click={() => navigateToSystem(selectedSystemId)}>
                            {(selectedSystemId === 'solar-system' || selectedSystemId === 'alpha-centauri') ? 'Explore System' : 'Coming Soon'}
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
    
    <!-- Accessibility Manager -->
    <AccessibilityManager />
</div>

<style>
    .galaxy-wrapper {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: #000011;
    }
    
    .galaxy-container {
        width: 100%;
        height: 100%;
        position: relative;
    }
    
    /* Loading and Error States */
    .error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 17, 0.9);
        color: white;
        z-index: 10;
    }
    
    .error-content {
        text-align: center;
        max-width: 400px;
        padding: 2rem;
    }
    
    .error-content h3 {
        color: #ff6b6b;
        margin-bottom: 1rem;
    }
    
    .error-content button {
        background: #007acc;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
    }
    
    /* UI Buttons */
    .hamburger-button {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 50px;
        height: 50px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(100, 181, 246, 0.3);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .hamburger-button:hover {
        background: rgba(100, 181, 246, 0.2);
        border-color: #64b5f6;
    }
    
    .hamburger-line {
        width: 20px;
        height: 2px;
        background: white;
        transition: all 0.3s ease;
    }
    
    .hamburger-line.active:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger-line.active:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger-line.active:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .controls-button {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(100, 181, 246, 0.3);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .controls-button:hover {
        background: rgba(100, 181, 246, 0.2);
        border-color: #64b5f6;
    }
    
    .back-button {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(100, 181, 246, 0.3);
        border-radius: 8px;
        color: white;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .back-button:hover {
        background: rgba(100, 181, 246, 0.2);
        border-color: #64b5f6;
    }
    
    /* Hamburger Menu */
    .hamburger-menu {
        position: absolute;
        top: 80px;
        left: 20px;
        width: 350px;
        max-height: calc(100vh - 120px);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid rgba(100, 181, 246, 0.3);
        border-radius: 12px;
        padding: 1.5rem;
        overflow-y: auto;
        z-index: 999;
        color: white;
    }
    
    .menu-section h3 {
        color: #64b5f6;
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.2rem;
    }
    
    .menu-section h4 {
        color: #64b5f6;
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
        font-size: 1rem;
    }
    
    .menu-section p {
        color: #d0d0d0;
        line-height: 1.5;
        margin-bottom: 1rem;
    }
    
    .system-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .system-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #444;
        border-radius: 6px;
        padding: 0.75rem;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .system-item:hover {
        background: rgba(100, 181, 246, 0.2);
        border-color: #64b5f6;
    }
    
    .system-name {
        font-weight: 500;
    }
    
    .system-distance {
        font-size: 0.85rem;
        color: #b0b0b0;
    }
    
    .tips-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .tips-list li {
        color: #d0d0d0;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        line-height: 1.4;
    }
    
    /* Controls Panel */
    .controls-panel {
        position: absolute;
        top: 80px;
        right: 20px;
        width: 280px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid rgba(100, 181, 246, 0.3);
        border-radius: 12px;
        padding: 1.5rem;
        z-index: 999;
        color: white;
    }
    
    .controls-panel h3 {
        color: #64b5f6;
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.2rem;
    }
    
    .control-group {
        margin-bottom: 1rem;
    }
    
    .control-group label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        cursor: pointer;
        color: #d0d0d0;
    }
    
    .control-group input[type="checkbox"] {
        accent-color: #64b5f6;
    }
    
    .control-group input[type="range"] {
        width: 100%;
        margin: 0.5rem 0;
        accent-color: #64b5f6;
    }
    
    .distance-value {
        font-size: 0.8rem;
        color: #b0b0b0;
        margin-left: 0.5rem;
    }
    
    /* System Info Tooltip */
    .system-info-tooltip {
        position: absolute;
        top: 20px;
        right: 80px;
        width: 320px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid rgba(100, 181, 246, 0.5);
        border-radius: 12px;
        padding: 1.5rem;
        z-index: 1001;
        color: white;
    }
    
    .close-button {
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        color: #999;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .close-button:hover {
        color: #64b5f6;
    }
    
    .system-info-tooltip h3 {
        color: #64b5f6;
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.3rem;
        padding-right: 30px;
    }
    
    .system-description {
        color: #d0d0d0;
        line-height: 1.5;
        margin-bottom: 1rem;
        font-size: 0.95rem;
    }
    
    .system-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .detail-item {
        font-size: 0.9rem;
        color: #d0d0d0;
    }
    
    .detail-item strong {
        color: #64b5f6;
    }
    
    /* System Details Dialog */
    .system-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(2px);
    }
    
    .system-dialog {
        background: rgba(0, 0, 17, 0.95);
        border: 2px solid rgba(100, 181, 246, 0.5);
        border-radius: 16px;
        width: 90vw;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
        color: white;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    
    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        border-bottom: 1px solid rgba(100, 181, 246, 0.2);
    }
    
    .dialog-header h2 {
        color: #64b5f6;
        margin: 0;
        font-size: 1.8rem;
    }
    
    .dialog-close-button {
        background: none;
        border: none;
        color: #999;
        font-size: 2rem;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
    }
    
    .dialog-close-button:hover {
        color: #64b5f6;
        background: rgba(100, 181, 246, 0.1);
    }
    
    .dialog-content {
        padding: 2rem;
    }
    
    .system-overview {
        margin-bottom: 2rem;
    }
    
    .system-description-large {
        font-size: 1.1rem;
        line-height: 1.6;
        color: #d0d0d0;
        margin: 0;
    }
    
    .system-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .stat-card {
        background: rgba(100, 181, 246, 0.1);
        border: 1px solid rgba(100, 181, 246, 0.2);
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
    }
    
    .stat-label {
        font-size: 0.9rem;
        color: #b0b0b0;
        margin-bottom: 0.5rem;
    }
    
    .stat-value {
        font-size: 1.2rem;
        font-weight: 600;
        color: #64b5f6;
    }
    
    .additional-info {
        margin-bottom: 1.5rem;
    }
    
    .additional-info h4 {
        color: #64b5f6;
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
    }
    
    .additional-info p {
        color: #d0d0d0;
        margin: 0;
    }
    
    .star-details h4 {
        color: #64b5f6;
        margin-bottom: 1rem;
        font-size: 1.2rem;
    }
    
    .stars-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .star-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #444;
        border-radius: 8px;
        padding: 1rem;
    }
    
    .star-name {
        font-weight: 600;
        color: #64b5f6;
        margin-bottom: 0.5rem;
    }
    
    .star-type,
    .star-temp,
    .star-mass {
        font-size: 0.9rem;
        color: #d0d0d0;
        margin-bottom: 0.25rem;
    }
    
    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 1.5rem 2rem;
        border-top: 1px solid rgba(100, 181, 246, 0.2);
    }
    
    .action-button {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
    }
    
    .action-button.secondary {
        background: transparent;
        color: #d0d0d0;
        border-color: #666;
    }
    
    .action-button.secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: #64b5f6;
        color: white;
    }
    
    .action-button.primary {
        background: linear-gradient(135deg, #64b5f6, #42a5f5);
        color: white;
        border: none;
    }
    
    .action-button.primary:hover {
        background: linear-gradient(135deg, #42a5f5, #1e88e5);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
    }
    
    .action-button.primary:disabled {
        background: #666;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
        .hamburger-menu,
        .controls-panel {
            width: calc(100vw - 40px);
            left: 20px;
            right: 20px;
        }
        
        .system-info-tooltip {
            width: calc(100vw - 40px);
            left: 20px;
            right: 20px;
            top: 80px;
        }
        
        .controls-button {
            top: 80px;
            right: 20px;
        }
        
        /* Dialog responsive styles */
        .system-dialog {
            width: 95vw;
            max-height: 90vh;
        }
        
        .dialog-header {
            padding: 1rem 1.5rem;
        }
        
        .dialog-header h2 {
            font-size: 1.4rem;
        }
        
        .dialog-content {
            padding: 1.5rem;
        }
        
        .system-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.75rem;
        }
        
        .stars-grid {
            grid-template-columns: 1fr;
        }
        
        .dialog-actions {
            padding: 1rem 1.5rem;
            flex-direction: column-reverse;
        }
        
        .action-button {
            width: 100%;
            justify-content: center;
        }
    }
</style>
