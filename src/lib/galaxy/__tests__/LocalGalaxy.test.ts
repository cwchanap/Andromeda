import { describe, it, expect } from "vitest";
import { localGalaxyData } from "../LocalGalaxy";
import * as galaxyIndex from "../index";

describe("localGalaxyData", () => {
    it("has correct id and name", () => {
        expect(localGalaxyData.id).toBe("local-galaxy");
        expect(localGalaxyData.name).toBe("Local Stellar Neighborhood");
    });

    it("contains at least 5 star systems", () => {
        expect(localGalaxyData.starSystems.length).toBeGreaterThanOrEqual(5);
    });

    it("is centered at the origin", () => {
        expect(localGalaxyData.center.x).toBe(0);
        expect(localGalaxyData.center.y).toBe(0);
        expect(localGalaxyData.center.z).toBe(0);
    });

    it("has a bounding radius of 10 light-years", () => {
        expect(localGalaxyData.boundingRadius).toBe(10);
    });

    it("uses 1 unit = 1 light-year scale", () => {
        expect(localGalaxyData.scale).toBe(1.0);
    });

    it("includes Solar System as first entry at distance 0", () => {
        const solar = localGalaxyData.starSystems.find(
            (s) => s.id === "solar-system",
        );
        expect(solar).toBeDefined();
        expect(solar!.distanceFromEarth).toBe(0);
        expect(solar!.position.x).toBe(0);
        expect(solar!.position.y).toBe(0);
        expect(solar!.position.z).toBe(0);
    });

    it("includes Alpha Centauri at ~4.37 light-years", () => {
        const alphaCentauri = localGalaxyData.starSystems.find(
            (s) => s.id === "alpha-centauri",
        );
        expect(alphaCentauri).toBeDefined();
        expect(alphaCentauri!.distanceFromEarth).toBe(4.37);
        expect(alphaCentauri!.systemType).toBe("trinary");
        expect(alphaCentauri!.stars.length).toBe(3);
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

    it("all stars have required CelestialBodyData fields", () => {
        for (const system of localGalaxyData.starSystems) {
            for (const star of system.stars) {
                expect(star.id).toBeTruthy();
                expect(star.name).toBeTruthy();
                expect(star.type).toBe("star");
                expect(star.material).toBeDefined();
                expect(star.material.color).toBeTruthy();
            }
        }
    });

    it("Solar System has correct metadata", () => {
        const solar = localGalaxyData.starSystems.find(
            (s) => s.id === "solar-system",
        )!;
        expect(solar.metadata.numberOfPlanets).toBe(8);
        expect(solar.metadata.spectralClass).toBe("G2V");
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
