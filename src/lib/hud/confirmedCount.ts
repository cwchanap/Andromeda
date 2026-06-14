import type { PlanetarySystem } from "@/lib/planetary-system/types";

export function confirmedCount(s: PlanetarySystem): number {
    return (
        s.systemData?.metadata?.confirmedExoplanetCount ??
        s.systemData?.celestialBodies?.filter((b) => b.type !== "star")
            .length ??
        0
    );
}
