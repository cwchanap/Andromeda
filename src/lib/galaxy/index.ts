// Galaxy rendering system exports
export { GalaxyRenderer } from "./graphics/GalaxyRenderer";
export { GalaxySceneManager } from "./graphics/GalaxySceneManager";
export { StarSystemManager } from "./graphics/StarSystemManager";

// Data exports
export { localGalaxyData } from "./LocalGalaxy";

// Type exports
export type {
    StarSystemData,
    GalaxyConfig,
    GalaxyEvents,
    GalaxyCameraState,
    GalaxyControls,
    GalaxyRenderStats,
    GalaxyData,
} from "./types";

// Re-export for convenience
export * from "./types";
