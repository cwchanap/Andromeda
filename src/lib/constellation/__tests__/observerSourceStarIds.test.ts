import { describe, expect, it } from "vitest";
import { OBSERVER_SOURCE_STAR_IDS } from "@/lib/constellation/observerSourceStarIds";
import { isObserverCandidateEligible } from "@/lib/constellation/observerRouteState";
import { localGalaxyData } from "@/lib/galaxy/LocalGalaxy";
import { constellations } from "@/data/constellations";

describe("OBSERVER_SOURCE_STAR_IDS integrity", () => {
    it("maps every configured observer to an existing star system", () => {
        const systemIds = new Set(
            localGalaxyData.starSystems.map((system) => system.id),
        );

        for (const observerId of Object.keys(OBSERVER_SOURCE_STAR_IDS)) {
            expect(systemIds.has(observerId), observerId).toBe(true);
        }
    });

    it("keeps every configured observer eligible as an observer", () => {
        for (const observerId of Object.keys(OBSERVER_SOURCE_STAR_IDS)) {
            const system = localGalaxyData.starSystems.find(
                (candidate) => candidate.id === observerId,
            );
            expect(system, observerId).toBeDefined();

            // Same resolver the route layer uses, fed the same raw
            // StarSystemData shape, so regenerated Galaxy data that moves a
            // system onto the origin or gives it invalid coordinates fails.
            expect(isObserverCandidateEligible(system!), observerId).toEqual({
                eligible: true,
            });
        }
    });

    it("references every source star in exported constellation membership", () => {
        const memberIds = new Set(
            constellations.flatMap((constellation) =>
                constellation.stars.map((star) => star.id),
            ),
        );

        for (const [observerId, sourceIds] of Object.entries(
            OBSERVER_SOURCE_STAR_IDS,
        )) {
            for (const sourceId of sourceIds) {
                expect(
                    memberIds.has(sourceId),
                    `${observerId}: ${sourceId}`,
                ).toBe(true);
            }
        }
    });

    it("keeps source ids unique within each mapping", () => {
        for (const [observerId, sourceIds] of Object.entries(
            OBSERVER_SOURCE_STAR_IDS,
        )) {
            expect(new Set(sourceIds).size, observerId).toBe(sourceIds.length);
        }
    });

    it("keeps source ids unique across mappings", () => {
        const seen = new Set<string>();

        for (const [observerId, sourceIds] of Object.entries(
            OBSERVER_SOURCE_STAR_IDS,
        )) {
            for (const sourceId of sourceIds) {
                expect(seen.has(sourceId), `${observerId}: ${sourceId}`).toBe(
                    false,
                );
                seen.add(sourceId);
            }
        }
    });
});
