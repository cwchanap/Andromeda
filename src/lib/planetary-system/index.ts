// Main exports for planetary system module
export * from "./types";
export { PlanetarySystemRegistry } from "./PlanetarySystemRegistry";
export * from "./PlanetarySystemRenderer";
export * from "./DistanceRenderer";

// Export all systems
export * from "./SolarSystem";
export * from "./AlphaCentauri";
export * from "./KeplerSystems";
export * from "./NearbyExoplanets";

// Pre-configured registry with all systems
import { planetarySystemRegistry } from "./PlanetarySystemRegistry";
import { solarSystem } from "./SolarSystem";
import { alphaCentauriSystem } from "./AlphaCentauri";
import { kepler442System, kepler438System } from "./KeplerSystems";
import {
    trappist1System,
    wolf359System,
    barnardsStarSystem,
    ross128System,
} from "./NearbyExoplanets";

// Register all available systems
planetarySystemRegistry.registerSystem(solarSystem);
planetarySystemRegistry.registerSystem(alphaCentauriSystem);
planetarySystemRegistry.registerSystem(kepler442System);
planetarySystemRegistry.registerSystem(kepler438System);
planetarySystemRegistry.registerSystem(trappist1System);
planetarySystemRegistry.registerSystem(wolf359System);
planetarySystemRegistry.registerSystem(barnardsStarSystem);
planetarySystemRegistry.registerSystem(ross128System);

// Export the configured registry
export { planetarySystemRegistry };
