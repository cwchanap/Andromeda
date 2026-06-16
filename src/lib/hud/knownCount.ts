import type { PlanetarySystem } from "@/lib/planetary-system/types";

/**
 * Number of known exoplanets in a system.
 *
 * Mirrors the CSV `number_of_known_exoplanets` column semantics: every
 * non-star body that is NOT an unconfirmed candidate (i.e. confirmed or
 * controversial). A body whose `status` is undefined is treated as known,
 * matching the project-wide "undefined ⇒ confirmed" convention. Used by the
 * Explore HUD, which labels this value "Known Planets".
 */
export function knownCount(s: PlanetarySystem): number {
    return (
        s.systemData?.metadata?.knownExoplanetCount ??
        s.systemData?.celestialBodies?.filter(
            (b) => b.type !== "star" && b.status !== "candidate",
        ).length ??
        0
    );
}
