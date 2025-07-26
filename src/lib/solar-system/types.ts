import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";

export interface SolarSystemConfig {
    enableControls?: boolean;
    enableAnimations?: boolean;
    enableMobileOptimization?: boolean;
    antialiasing?: boolean;
    shadows?: boolean;
    particleCount?: number;
    performanceMode?: "low" | "medium" | "high";
}

export interface CameraState {
    position: THREE.Vector3;
    target: THREE.Vector3;
    zoom: number;
}

export interface RenderStats {
    fps: number;
    triangles: number;
    geometries: number;
    textures: number;
}

export interface SolarSystemEvents {
    onPlanetSelect?: (planet: CelestialBodyData) => void;
    onPlanetHover?: (planet: CelestialBodyData | null) => void;
    onCameraChange?: (camera: CameraState) => void;
    onZoomChange?: (zoom: number) => void;
    onRenderStats?: (stats: RenderStats) => void;
    onError?: (error: Error) => void;
    onReady?: () => void;
}

export interface SolarSystemControls {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    focusOnPlanet: (planetId: string) => void;
    setCameraPosition: (
        position: THREE.Vector3,
        target?: THREE.Vector3,
    ) => void;
    enableControls: (enabled: boolean) => void;
    dispose: () => void;
}
