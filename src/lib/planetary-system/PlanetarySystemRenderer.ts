// Unified renderer for all planetary systems
import type {
    PlanetarySystemData,
    PlanetarySystemConfig,
    PlanetarySystemEvents,
} from "./types";
import type { CelestialBodyData } from "../../types/game";
import { SolarSystemRenderer } from "./graphics/SolarSystemRenderer";
import type {
    SolarSystemConfig,
    SolarSystemEvents,
    SolarSystemControls,
    CameraState,
} from "./graphics/types";

/**
 * Unified renderer that adapts the existing SolarSystemRenderer
 * for any planetary system data
 */
export class PlanetarySystemRenderer {
    private solarSystemRenderer: SolarSystemRenderer | null = null;
    private systemData: PlanetarySystemData | null = null;
    private config: PlanetarySystemConfig;
    private events: PlanetarySystemEvents;

    constructor(
        container: HTMLElement,
        config: PlanetarySystemConfig,
        events: PlanetarySystemEvents = {},
    ) {
        this.config = config;
        this.events = events;

        // Adapt planetary system config to solar system config
        const solarSystemConfig: SolarSystemConfig = {
            performanceMode: config.performanceMode,
            enableAnimations: config.enableAnimations,
            particleCount: config.particleCount,
            shadows: config.shadowsEnabled,
            orbitSpeedMultiplier: config.orbitSpeedMultiplier,
            enableControls: true,
            enableMobileOptimization: false,
            antialiasing: true,
        };

        // Adapt planetary system events to solar system events
        const solarSystemEvents: SolarSystemEvents = {
            onPlanetSelect: events.onBodySelect,
            onCameraChange: (cameraState: CameraState) => {
                // Extract zoom from camera state for backward compatibility
                events.onCameraChange?.(cameraState.zoom);
            },
            onReady: () => events.onSystemLoad?.(config.systemId),
            onError: events.onError,
        };

        this.solarSystemRenderer = new SolarSystemRenderer(
            container,
            solarSystemConfig,
            solarSystemEvents,
        );
    }

    /**
     * Initialize the renderer with planetary system data
     */
    async initialize(systemData: PlanetarySystemData): Promise<void> {
        if (!this.solarSystemRenderer) {
            throw new Error("Solar system renderer not initialized");
        }

        this.systemData = systemData;

        // Convert planetary system data to format expected by SolarSystemRenderer
        const adaptedData = this.adaptSystemData(systemData);

        try {
            // Convert PlanetarySystemData to SolarSystemData format for background stars
            const adaptedSystemData = {
                sun: systemData.star,
                planets: systemData.celestialBodies,
                systemScale: systemData.systemScale,
                systemCenter: systemData.systemCenter,
                backgroundStars: systemData.backgroundStars,
            };

            await this.solarSystemRenderer.initialize(
                adaptedData,
                adaptedSystemData,
            );
            // Don't call onSystemLoad here - it's called by onReady event
        } catch (error) {
            const err =
                error instanceof Error ? error : new Error(String(error));
            this.events.onError?.(err);
            throw err;
        }
    }

    /**
     * Adapt planetary system data to solar system data format
     */
    private adaptSystemData(
        systemData: PlanetarySystemData,
    ): CelestialBodyData[] {
        // Combine star and celestial bodies into a single array
        // The star is treated as the central body (like the Sun)
        const allBodies: CelestialBodyData[] = [
            systemData.star,
            ...systemData.celestialBodies,
        ];

        return allBodies;
    }

    /**
     * Update system configuration
     */
    updateConfig(newConfig: Partial<PlanetarySystemConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (this.solarSystemRenderer) {
            // Update the underlying renderer configuration
            const adaptedConfig: Partial<SolarSystemConfig> = {
                performanceMode: newConfig.performanceMode,
                enableAnimations: newConfig.enableAnimations,
                particleCount: newConfig.particleCount,
                shadows: newConfig.shadowsEnabled,
                orbitSpeedMultiplier: newConfig.orbitSpeedMultiplier,
            };

            this.solarSystemRenderer.updateConfig(adaptedConfig);
        }
    }

    /**
     * Select a celestial body
     */
    selectBody(bodyId: string): void {
        if (this.solarSystemRenderer) {
            this.solarSystemRenderer.selectCelestialBody(bodyId);
        }
    }

    /**
     * Get the current system data
     */
    getSystemData(): PlanetarySystemData | null {
        return this.systemData;
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        if (this.solarSystemRenderer) {
            this.solarSystemRenderer.dispose();
            this.solarSystemRenderer = null;
        }
        this.systemData = null;
    }

    /**
     * Get zoom controls
     */
    getControls(): SolarSystemControls | null {
        return this.solarSystemRenderer?.getControls() || null;
    }

    /**
     * Focus on a specific celestial body
     */
    focusOnBody(bodyId: string): void {
        if (this.solarSystemRenderer) {
            const controls = this.solarSystemRenderer.getControls();
            controls?.focusOnPlanet(bodyId);
        }
    }
}
