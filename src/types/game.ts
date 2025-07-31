// Core type definitions for the space exploration game
import type { Vector3 } from "three";
import type { GamePlugin } from "./universe";

export interface ModalTheme {
    primary: string;
    secondary: string;
    accent: string;
    background?: string;
    textColor?: string;
}

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
    // Real astronomical distance data
    realDistance?: {
        kilometers: number; // Actual distance in kilometers
        astronomicalUnits?: number; // Distance in AU (optional, calculated if not provided)
        lightYears?: number; // Distance in light-years (for extrasolar systems)
        formattedString: string; // Human-readable formatted distance
    };
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
    modalTheme?: ModalTheme;
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
        // Rotation angles for ring orientation (in radians)
        rotationX?: number; // Rotation around X-axis (tilt up/down)
        rotationY?: number; // Rotation around Y-axis (rotate left/right)
        rotationZ?: number; // Rotation around Z-axis (roll)
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
