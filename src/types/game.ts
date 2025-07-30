// Core type definitions for the space exploration game
import type { Vector3 } from "three";
import type { GamePlugin } from "./universe";

export interface CelestialBodyData {
    id: string;
    name: string;
    type: "star" | "planet" | "moon";
    description: string;
    keyFacts: {
        diameter: string;
        distanceFromSun: string;
        orbitalPeriod: string;
        composition: string[];
        temperature: string;
        moons?: number;
    };
    images: string[];
    position: Vector3;
    scale: number;
    material: {
        color: string;
        emissive?: string;
        texture?: string;
        normalMap?: string;
        bumpMap?: string;
        specularMap?: string;
        roughnessMap?: string;
        emissiveMap?: string;
        roughness?: number;
        metalness?: number;
        shininess?: number;
        transparent?: boolean;
        opacity?: number;
        atmosphereColor?: string;
    };
    orbitRadius?: number;
    orbitSpeed?: number;
    rings?: {
        enabled: boolean;
        innerRadius: number;
        outerRadius: number;
        color: string;
        opacity: number;
        texture?: string;
        segments?: number; // Number of segments for ring geometry
        thetaSegments?: number; // Number of segments around the ring
        // Particle system properties for realistic ring appearance
        particleSystem?: {
            enabled: boolean;
            particleCount: number;
            particleSize: number;
            particleVariation: number; // Size variation (0-1)
            densityVariation: number; // Density variation for gaps (0-1)
        };
    };
}

export interface GameState {
    currentView: "menu" | "solar-system" | "system-selector";
    selectedBody: CelestialBodyData | null;
    camera: {
        position: Vector3;
        target: Vector3;
        zoom: number;
    };
    ui: {
        showInfoModal: boolean;
        showChatbot: boolean;
        showControls: boolean;
        showSystemSelector: boolean;
    };
    settings: {
        enableAnimations: boolean;
        audioEnabled: boolean;
        controlSensitivity: number;
    };
    // Multi-system support
    universe?: {
        currentSystemId: string;
        availableSystems: string[];
        systemTransition?: {
            isTransitioning: boolean;
            fromSystemId: string;
            toSystemId: string;
            progress: number;
        };
    };
}

export interface SolarSystemData {
    sun: CelestialBodyData;
    planets: CelestialBodyData[];
    systemScale: number;
    systemCenter: Vector3;
    // Background star configuration
    backgroundStars?: {
        enabled: boolean;
        density: number; // Number of background stars (multiplier for base count)
        seed: number; // Random seed for consistent star distribution
        animationSpeed: number; // Speed of star twinkling and rotation
        minRadius: number; // Minimum distance from system center
        maxRadius: number; // Maximum distance from system center
        colorVariation: boolean; // Whether to include different star colors
    };
}

/**
 * Extended system data interface for backward compatibility and future expansion
 */
export interface ExtendedSystemData extends SolarSystemData {
    id: string;
    name: string;
    description: string;
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
}

/**
 * Plugin management interfaces
 */
export interface PluginManager {
    loadedPlugins: Map<string, GamePlugin>;
    enabledPlugins: Set<string>;
    loadPlugin: (plugin: GamePlugin) => Promise<void>;
    unloadPlugin: (pluginId: string) => Promise<void>;
    enablePlugin: (pluginId: string) => Promise<void>;
    disablePlugin: (pluginId: string) => Promise<void>;
    getPlugin: (pluginId: string) => GamePlugin | null;
    getAllPlugins: () => GamePlugin[];
}
