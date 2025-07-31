// Distance-based rendering utilities
import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";
import type { PlanetarySystemData } from "./types";

/**
 * Configuration for distance-based rendering
 */
export interface DistanceRenderingConfig {
    scaleType: "logarithmic" | "linear" | "custom";
    minRenderDistance: number; // Minimum distance for rendering
    maxRenderDistance: number; // Maximum distance for rendering
    scaleFactor: number; // Base scale factor for positioning
    customScaleFunction?: (realDistance: number) => number;
}

/**
 * Default configuration for solar system rendering
 */
export const defaultSolarSystemRenderConfig: DistanceRenderingConfig = {
    scaleType: "logarithmic",
    minRenderDistance: 0.1, // 0.1 units minimum
    maxRenderDistance: 500, // 500 units maximum (enough for Neptune at ~450 units)
    scaleFactor: 0.1, // 1 unit = 10 million km
};

/**
 * Calculate the rendered position based on real astronomical distance
 */
export function calculateRenderedPosition(
    body: CelestialBodyData,
    config: DistanceRenderingConfig = defaultSolarSystemRenderConfig,
): THREE.Vector3 {
    if (!body.realDistance) {
        return body.position.clone();
    }

    const realDistanceKm = body.realDistance.kilometers;

    if (realDistanceKm === 0) {
        return new THREE.Vector3(0, 0, 0);
    }

    let renderDistance: number;

    switch (config.scaleType) {
        case "logarithmic": {
            // Use logarithmic scaling for better visualization of large distances
            const logDistance = Math.log10(realDistanceKm / 10000000); // Convert to 10 millions of km
            renderDistance = Math.max(
                config.minRenderDistance,
                Math.min(
                    config.maxRenderDistance,
                    logDistance * config.scaleFactor * 50,
                ),
            ); // Increased multiplier
            break;
        }

        case "linear": {
            // Simple linear scaling
            renderDistance = (realDistanceKm / 10000000) * config.scaleFactor;
            break;
        }

        case "custom": {
            if (config.customScaleFunction) {
                renderDistance = config.customScaleFunction(realDistanceKm);
            } else {
                renderDistance =
                    (realDistanceKm / 10000000) * config.scaleFactor;
            }
            break;
        }

        default: {
            renderDistance = (realDistanceKm / 10000000) * config.scaleFactor;
        }
    }

    // Clamp to min/max render distances
    renderDistance = Math.max(
        config.minRenderDistance,
        Math.min(config.maxRenderDistance, renderDistance),
    );

    return new THREE.Vector3(renderDistance, 0, 0);
}

/**
 * Calculate orbit radius for rendering based on real distance
 */
export function calculateOrbitRadius(
    body: CelestialBodyData,
    config: DistanceRenderingConfig = defaultSolarSystemRenderConfig,
): number {
    const position = calculateRenderedPosition(body, config);
    return position.length();
}

/**
 * Update system data to use distance-based positioning
 */
export function updateSystemForDistanceRendering(
    systemData: PlanetarySystemData,
    config: DistanceRenderingConfig = defaultSolarSystemRenderConfig,
): PlanetarySystemData {
    const updatedData = { ...systemData };

    // Update celestial body positions and orbit radii
    updatedData.celestialBodies = systemData.celestialBodies.map((body) => {
        const newPosition = calculateRenderedPosition(body, config);
        const newOrbitRadius = calculateOrbitRadius(body, config);

        return {
            ...body,
            position: newPosition,
            orbitRadius: newOrbitRadius,
        };
    });

    return updatedData;
}

/**
 * Create adaptive scale configuration based on system size
 */
export function createAdaptiveScaleConfig(
    systemData: PlanetarySystemData,
    maxRenderRadius: number = 10,
): DistanceRenderingConfig {
    // Find the maximum real distance in the system
    const maxDistance = systemData.celestialBodies.reduce((max, body) => {
        const distance = body.realDistance?.kilometers || 0;
        return Math.max(max, distance);
    }, 0);

    // Calculate scale factor to fit within render radius
    const scaleFactor =
        maxDistance > 0 ? maxRenderRadius / (maxDistance / 10000000) : 0.1;

    return {
        scaleType: "linear",
        minRenderDistance: 0.01,
        maxRenderDistance: maxRenderRadius,
        scaleFactor: scaleFactor,
    };
}

/**
 * Get distance information for UI display
 */
export function getDistanceInfo(body: CelestialBodyData): {
    real: string;
    rendered: string;
    scale: string;
} {
    if (!body.realDistance) {
        return {
            real: "Unknown",
            rendered: "N/A",
            scale: "N/A",
        };
    }

    const realKm = body.realDistance.kilometers;
    const renderedPosition = calculateRenderedPosition(body);
    const renderedDistance = renderedPosition.length();

    const scaleRatio = realKm > 0 ? renderedDistance / (realKm / 10000000) : 0;

    return {
        real: body.realDistance.formattedString,
        rendered: `${renderedDistance.toFixed(3)} units`,
        scale: `1:${(1 / scaleRatio).toExponential(2)}`,
    };
}
