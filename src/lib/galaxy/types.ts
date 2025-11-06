import type { CelestialBodyData, Vector3Like } from "../../types/game";

/**
 * Represents a star system in the galaxy view
 * Shows only the primary star(s) without planets for high-level overview
 */
export interface StarSystemData {
    id: string;
    name: string;
    description: string;
    systemType: "solar" | "binary" | "trinary" | "multiple";

    // Position in galaxy (light-years from origin)
    position: Vector3Like;

    // Distance from Earth in light-years
    distanceFromEarth: number;

    // Primary star(s) - only main sequence stars shown in galaxy view
    stars: CelestialBodyData[];

    // System metadata
    metadata: {
        constellation?: string;
        spectralClass: string;
        discoveredBy?: string;
        discoveryDate?: string;
        hasExoplanets: boolean;
        numberOfPlanets?: number;
        habitableZone?: boolean;
    };

    // Visual properties for galaxy view
    visual: {
        brightness: number; // Relative brightness for rendering
        colorIndex: number; // B-V color index for realistic star colors
        scale: number; // Rendering scale
        glowIntensity?: number; // Optional glow effect
    };
}

/**
 * Configuration for galaxy renderer
 */
export interface GalaxyConfig {
    // Rendering settings
    enableControls: boolean;
    enableAnimations: boolean;
    enableMobileOptimization: boolean;
    antialiasing: boolean;
    performanceMode: "low" | "medium" | "high";

    // Galaxy-specific settings
    starFieldDensity: number;
    backgroundStarCount: number;
    enableStarLabels: boolean;
    enableDistanceIndicators: boolean;
    maxRenderDistance: number; // Light-years

    // Visual effects
    enableBloom: boolean;
    enableStarGlow: boolean;
    starGlowIntensity: number;
}

/**
 * Events for galaxy renderer
 */
export interface GalaxyEvents {
    onStarSystemSelect?: (system: StarSystemData) => void;
    onCameraChange?: (position: Vector3Like, zoom: number) => void;
    onSystemLoad?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Camera state in galaxy view
 */
export interface GalaxyCameraState {
    position: Vector3Like;
    target: Vector3Like;
    zoom: number;
    fov: number;
}

/**
 * Controls for galaxy renderer
 */
export interface GalaxyControls {
    enableZoom: boolean;
    enablePan: boolean;
    enableRotate: boolean;
    minDistance: number;
    maxDistance: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
}

/**
 * Rendering statistics for galaxy view
 */
export interface GalaxyRenderStats {
    fps: number;
    frameTime: number;
    starSystemCount: number;
    backgroundStarCount: number;
    renderCalls: number;
    triangleCount: number;
    memoryUsage: number;
}

/**
 * Galaxy data structure containing all star systems
 */
export interface GalaxyData {
    id: string;
    name: string;
    description: string;
    starSystems: StarSystemData[];
    center: Vector3Like;
    scale: number; // Scale factor for rendering (1 unit = X light-years)
    boundingRadius: number; // Radius in light-years
}
