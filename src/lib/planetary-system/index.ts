export * from "./types";
export { PlanetarySystemRegistry } from "./PlanetarySystemRegistry";
export * from "./PlanetarySystemRenderer";
export * from "./DistanceRenderer";
export * from "./SolarSystem";
export * from "./CuratedSystems";
export { starSystems } from "./systems";

import { planetarySystemRegistry } from "./PlanetarySystemRegistry";
import { solarSystem } from "./SolarSystem";
import { starSystems } from "./systems";
import {
    trappist1System,
    wolf359System,
    kepler442System,
    kepler438System,
} from "./CuratedSystems";

planetarySystemRegistry.registerSystem(solarSystem);
for (const s of starSystems) planetarySystemRegistry.registerSystem(s);
planetarySystemRegistry.registerSystem(trappist1System);
planetarySystemRegistry.registerSystem(wolf359System);
planetarySystemRegistry.registerSystem(kepler442System);
planetarySystemRegistry.registerSystem(kepler438System);

export { planetarySystemRegistry };
