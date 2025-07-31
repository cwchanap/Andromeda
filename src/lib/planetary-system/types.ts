// Simplified types for planetary system routing architecture
import type { Vector3 } from "three";
import type { CelestialBodyData } from "../../types/game";

/**
 * Simplified planetary system interface for router-based rendering
 */
export interface PlanetarySystemData {
    id: string;
    name: string;
    description: string;
    star: CelestialBodyData;
    celestialBodies: CelestialBodyData[];
    systemScale: number;
    systemCenter: Vector3;
    systemType: "solar" | "binary" | "multiple" | "exotic";
    metadata?: {
        discoveredBy?: string;
        discoveryDate?: string;
        distance?: string;
        constellation?: string;
        spectralClass?: string;
        habitableZone?: {
            inner: number;
            outer: number;
        };
    };
    // Background star configuration
    backgroundStars?: {
        enabled: boolean;
        density: number;
        seed: number;
        animationSpeed: number;
        minRadius: number;
        maxRadius: number;
        colorVariation: boolean;
    };
}

/**
 * Simplified planetary system interface for router-based rendering
 */
export interface PlanetarySystem {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;

    // System data
    systemData: PlanetarySystemData;

    // Optional initialization
    initialize?: () => Promise<void> | void;
    cleanup?: () => Promise<void> | void;
}

/**
 * Configuration for planetary system renderer
 */
export interface PlanetarySystemConfig {
    systemId: string;
    performanceMode: "low" | "medium" | "high";
    enableAnimations: boolean;
    enableInteractions: boolean;
    particleCount: number;
    shadowsEnabled: boolean;
    orbitSpeedMultiplier?: number; // Global multiplier for orbit speeds
}

/**
 * Events for planetary system renderer
 */
export interface PlanetarySystemEvents {
    onBodySelect?: (body: CelestialBodyData) => void;
    onCameraChange?: (zoom: number) => void;
    onSystemLoad?: (systemId: string) => void;
    onError?: (error: Error) => void;
}

/**
 * Registry for all available planetary systems
 */
export interface PlanetarySystemRegistry {
    systems: Map<string, PlanetarySystem>;
    registerSystem: (system: PlanetarySystem) => void;
    getSystem: (id: string) => PlanetarySystem | undefined;
    getAllSystems: () => PlanetarySystem[];
    hasSystem: (id: string) => boolean;
}
