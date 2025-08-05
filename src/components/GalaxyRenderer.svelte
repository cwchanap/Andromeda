<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { GalaxyRenderer, localGalaxyData, type GalaxyConfig, type GalaxyEvents } from '../lib/galaxy';
    
    // Props
    export let config: Partial<GalaxyConfig> = {};
    export let autoStart = true;
    
    // Component state
    let container: HTMLElement;
    let renderer: GalaxyRenderer | null = null;
    let isLoading = true;
    let error: string | null = null;
    
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
        ...config
    };
    
    // Event handlers
    const events: GalaxyEvents = {
        onSystemLoad: () => {
            isLoading = false;
            console.log('Galaxy loaded successfully');
        },
        onError: (err: Error) => {
            error = err.message;
            isLoading = false;
            console.error('Galaxy renderer error:', err);
        },
        onStarSystemSelect: (system) => {
            console.log('Star system selected:', system.name);
            // You can dispatch custom events here for parent components
        },
        onCameraChange: (position, zoom) => {
            // Handle camera changes if needed
            console.log('Camera changed:', { position, zoom });
        }
    };
    
    // Initialize renderer
    async function initializeRenderer() {
        if (!container || renderer) return;
        
        try {
            isLoading = true;
            error = null;
            
            renderer = new GalaxyRenderer(container, defaultConfig, events);
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
    
    // Public methods (can be called from parent components)
    export function focusOnStarSystem(systemId: string, animate = true) {
        renderer?.focusOnStarSystem(systemId, animate);
    }
    
    export function highlightStarSystem(systemId: string, highlight = true) {
        renderer?.highlightStarSystem(systemId, highlight);
    }
    
    export function getCameraState() {
        return renderer?.getCameraState();
    }
    
    export function getStats() {
        return renderer?.getStats();
    }
    
    // Lifecycle
    onMount(async () => {
        if (autoStart) {
            const cleanupResize = await initializeRenderer();
            return cleanupResize;
        }
    });
    
    onDestroy(() => {
        cleanup();
    });
    
    // Reactive statement to handle container changes
    $: if (container && autoStart && !renderer) {
        initializeRenderer();
    }
</script>

<div class="galaxy-wrapper" bind:this={container}>
    {#if isLoading}
        <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <p>Loading galaxy...</p>
        </div>
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

<style>
    .galaxy-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 400px;
        background: #000011;
        overflow: hidden;
        border-radius: 8px;
    }
    
    .loading-overlay,
    .error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 17, 0.9);
        color: white;
        z-index: 10;
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .error-overlay {
        text-align: center;
    }
    
    .error-content h3 {
        color: #ff6b6b;
        margin-bottom: 8px;
        font-size: 1.2em;
    }
    
    .error-content p {
        color: #cccccc;
        margin-bottom: 16px;
        max-width: 300px;
    }
    
    .error-content button {
        background: #007acc;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    
    .error-content button:hover {
        background: #005fa3;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
        .galaxy-wrapper {
            min-height: 300px;
        }
        
        .loading-spinner {
            width: 30px;
            height: 30px;
        }
        
        .error-content h3 {
            font-size: 1.1em;
        }
        
        .error-content p {
            font-size: 0.9em;
        }
    }
</style>
