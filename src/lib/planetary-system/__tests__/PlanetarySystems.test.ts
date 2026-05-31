// Unit tests for AlphaCentauri, KeplerSystems, and NearbyExoplanets systems
// Primary goal: exercise initialize() and cleanup() methods for coverage
import { describe, it, expect } from "vitest";

import { alphaCentauriSystem } from "@/lib/planetary-system/AlphaCentauri";
import {
    kepler442System,
    kepler438System,
} from "@/lib/planetary-system/KeplerSystems";
import {
    trappist1System,
    wolf359System,
    barnardsStarSystem,
    ross128System,
} from "@/lib/planetary-system/NearbyExoplanets";

// ─── AlphaCentauri ────────────────────────────────────────────────────────────

describe("alphaCentauriSystem", () => {
    it("has the correct id", () => {
        expect(alphaCentauriSystem.id).toBe("alpha-centauri");
    });

    it("has a systemData with a star", () => {
        expect(alphaCentauriSystem.systemData.star).toBeDefined();
        expect(alphaCentauriSystem.systemData.star.type).toBe("star");
    });

    it("has celestialBodies array", () => {
        expect(
            Array.isArray(alphaCentauriSystem.systemData.celestialBodies),
        ).toBe(true);
    });

    it("initialize() resolves without error", async () => {
        await expect(
            alphaCentauriSystem.initialize?.(),
        ).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(alphaCentauriSystem.cleanup?.()).resolves.toBeUndefined();
    });

    const findAlphaBody = (id: string) =>
        [
            alphaCentauriSystem.systemData.star,
            ...alphaCentauriSystem.systemData.celestialBodies,
        ].find((body) => body.id === id);

    it("declares the Alpha Centauri AB barycenter anchor", () => {
        expect(alphaCentauriSystem.systemData.orbitAnchors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "alpha-centauri-ab-barycenter",
                    name: "Alpha Centauri AB Barycenter",
                    type: "barycenter",
                }),
            ]),
        );
    });

    it("models Alpha Centauri A and B around the AB barycenter", () => {
        const starA = alphaCentauriSystem.systemData.star;
        const starB = findAlphaBody("alpha-centauri-b");

        expect(starA.orbit).toMatchObject({
            centerId: "alpha-centauri-ab-barycenter",
            eccentricity: 0.519,
            periodYears: 79.91,
            phaseDeg: 0,
        });
        expect(starB?.orbit).toMatchObject({
            centerId: "alpha-centauri-ab-barycenter",
            eccentricity: 0.519,
            periodYears: 79.91,
            phaseDeg: 0,
        });
        expect(starA.orbit?.argumentOfPeriapsisDeg).toBeDefined();
        expect(starB?.orbit?.argumentOfPeriapsisDeg).toBeDefined();
        expect(
            (starB?.orbit?.argumentOfPeriapsisDeg ?? 0) -
                (starA.orbit?.argumentOfPeriapsisDeg ?? 0),
        ).toBeCloseTo(180, 5);
        expect(starB?.orbit?.semiMajorAxis).toBeGreaterThan(
            starA.orbit?.semiMajorAxis ?? 0,
        );
    });

    it("keeps Alpha Centauri AB orbit radii in the expected mass ratio", () => {
        const starA = alphaCentauriSystem.systemData.star;
        const starB = findAlphaBody("alpha-centauri-b");
        const expectedRatio = 1.1055 / 0.9373;
        const actualRatio =
            (starB?.orbit?.semiMajorAxis ?? 0) /
            (starA.orbit?.semiMajorAxis ?? 1);

        expect(actualRatio).toBeCloseTo(expectedRatio, 2);
    });

    it("models Proxima and its planets with orbital elements", () => {
        const proxima = findAlphaBody("proxima-centauri");
        const proximaB = findAlphaBody("proxima-b");
        const proximaC = findAlphaBody("proxima-c");

        expect(proxima?.orbit).toMatchObject({
            centerId: "alpha-centauri-ab-barycenter",
            periodYears: 547000,
        });
        expect(proxima?.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
        expect(proximaB?.orbit).toMatchObject({
            centerId: "proxima-centauri",
            periodDays: 11.2,
        });
        expect(proximaC?.orbit).toMatchObject({
            centerId: "proxima-centauri",
            periodYears: 5.2,
        });
        expect(proximaB?.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
        expect(proximaC?.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
    });

    it("does not rely on legacy orbit fields for migrated Alpha Centauri bodies", () => {
        const migratedBodyIds = [
            "alpha-centauri-b",
            "proxima-centauri",
            "proxima-b",
            "proxima-c",
        ];

        migratedBodyIds.forEach((id) => {
            const body = findAlphaBody(id);
            expect(body?.orbit).toBeDefined();
            expect(body?.orbitRadius).toBeUndefined();
            expect(body?.orbitSpeed).toBeUndefined();
            expect(body?.parentId).toBeUndefined();
        });
    });
});

// ─── KeplerSystems ────────────────────────────────────────────────────────────

describe("kepler442System", () => {
    it("has the correct id", () => {
        expect(kepler442System.id).toBe("kepler-442");
    });

    it("has a systemData with a star", () => {
        expect(kepler442System.systemData.star).toBeDefined();
        expect(kepler442System.systemData.star.type).toBe("star");
    });

    it("has celestialBodies array", () => {
        expect(Array.isArray(kepler442System.systemData.celestialBodies)).toBe(
            true,
        );
    });

    it("initialize() resolves without error", async () => {
        await expect(kepler442System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(kepler442System.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("kepler438System", () => {
    it("has the correct id", () => {
        expect(kepler438System.id).toBe("kepler-438");
    });

    it("has a systemData with a star", () => {
        expect(kepler438System.systemData.star).toBeDefined();
        expect(kepler438System.systemData.star.type).toBe("star");
    });

    it("initialize() resolves without error", async () => {
        await expect(kepler438System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(kepler438System.cleanup?.()).resolves.toBeUndefined();
    });
});

// ─── NearbyExoplanets ─────────────────────────────────────────────────────────

describe("trappist1System", () => {
    it("has the correct id", () => {
        expect(trappist1System.id).toBe("trappist-1");
    });

    it("has multiple celestial bodies", () => {
        expect(
            trappist1System.systemData.celestialBodies.length,
        ).toBeGreaterThan(0);
    });

    it("initialize() resolves without error", async () => {
        await expect(trappist1System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(trappist1System.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("wolf359System", () => {
    it("has the correct id", () => {
        expect(wolf359System.id).toBe("wolf-359");
    });

    it("has a star defined", () => {
        expect(wolf359System.systemData.star).toBeDefined();
        expect(wolf359System.systemData.star.type).toBe("star");
    });

    it("initialize() resolves without error", async () => {
        await expect(wolf359System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(wolf359System.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("barnardsStarSystem", () => {
    it("has the correct id", () => {
        expect(barnardsStarSystem.id).toBe("barnards-star");
    });

    it("has a star defined", () => {
        expect(barnardsStarSystem.systemData.star).toBeDefined();
    });

    it("initialize() resolves without error", async () => {
        await expect(
            barnardsStarSystem.initialize?.(),
        ).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(barnardsStarSystem.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("ross128System", () => {
    it("has the correct id", () => {
        expect(ross128System.id).toBe("ross-128");
    });

    it("has celestialBodies array", () => {
        expect(Array.isArray(ross128System.systemData.celestialBodies)).toBe(
            true,
        );
    });

    it("initialize() resolves without error", async () => {
        await expect(ross128System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(ross128System.cleanup?.()).resolves.toBeUndefined();
    });
});
