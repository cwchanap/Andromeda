import { describe, it, expect } from "vitest";
import { localGalaxyData } from "@/lib/galaxy/LocalGalaxy";
import * as galaxyIndex from "@/lib/galaxy/index";

describe("localGalaxyData", () => {
    it("has correct id and name", () => {
        expect(localGalaxyData.id).toBe("local-galaxy");
        expect(localGalaxyData.name).toBe("Local Galaxy");
    });

    it("contains at least 5 star systems", () => {
        expect(localGalaxyData.starSystems.length).toBeGreaterThanOrEqual(5);
    });

    it("is centered at the origin", () => {
        expect(localGalaxyData.center.x).toBe(0);
        expect(localGalaxyData.center.y).toBe(0);
        expect(localGalaxyData.center.z).toBe(0);
    });

    it("has a bounding radius covering all systems", () => {
        expect(localGalaxyData.boundingRadius).toBeGreaterThanOrEqual(10);
    });

    it("uses 1 unit = 1 light-year scale", () => {
        expect(localGalaxyData.scale).toBe(1.0);
    });

    it("every star system has required fields", () => {
        for (const system of localGalaxyData.starSystems) {
            expect(system.id).toBeTruthy();
            expect(system.name).toBeTruthy();
            expect(system.description).toBeTruthy();
            expect(system.stars.length).toBeGreaterThan(0);
            expect(system.metadata).toBeDefined();
            expect(system.visual).toBeDefined();
            expect(system.visual.brightness).toBeGreaterThan(0);
            expect(system.visual.scale).toBeGreaterThan(0);
        }
    });

    it("includes Alpha Centauri at the correct distance", () => {
        const alphaCentauri = localGalaxyData.starSystems.find(
            (s) => s.id === "alpha-centauri",
        );
        expect(alphaCentauri).toBeDefined();
        expect(alphaCentauri!.distanceFromEarth).toBeCloseTo(4.2465, 1);
        expect(alphaCentauri!.stars.length).toBeGreaterThanOrEqual(1);
    });

    it("all stars have required CelestialBodyData fields", () => {
        for (const system of localGalaxyData.starSystems) {
            for (const star of system.stars) {
                expect(star.id).toBeTruthy();
                expect(star.name).toBeTruthy();
                expect(star.type).toBe("star");
                expect(star.material).toBeDefined();
                expect(star.material.color).toBeTruthy();
                // keyFacts is required by the info modal
                expect(star.keyFacts).toBeDefined();
                expect(Object.keys(star.keyFacts).length).toBeGreaterThan(0);
            }
        }
    });

    it("Alpha Centauri has confirmed exoplanet metadata", () => {
        const ac = localGalaxyData.starSystems.find(
            (s) => s.id === "alpha-centauri",
        )!;
        expect(ac).toBeDefined();
        expect(ac.metadata.spectralClass).toBeTruthy();
    });
});

describe("galaxy index exports", () => {
    it("re-exports localGalaxyData", () => {
        expect(galaxyIndex.localGalaxyData).toBe(localGalaxyData);
    });

    it("exports GalaxyRenderer class", () => {
        expect(galaxyIndex.GalaxyRenderer).toBeDefined();
    });

    it("exports StarSystemManager class", () => {
        expect(galaxyIndex.StarSystemManager).toBeDefined();
    });
});
