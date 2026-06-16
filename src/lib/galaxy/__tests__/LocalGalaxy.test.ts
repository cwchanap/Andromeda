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
        // Alpha Centauri is a trinary system (A, B, Proxima); all three
        // stars must be present so the "Number of Stars" stat is correct.
        expect(alphaCentauri!.stars.length).toBe(3);
    });

    it("multi-star systems include companion stars in stars array", () => {
        // Binary systems must carry both stars — the galaxy stat panel
        // displays stars.length as "Number of Stars".
        const gliese725 = localGalaxyData.starSystems.find(
            (s) => s.id === "gliese-725",
        );
        expect(gliese725).toBeDefined();
        expect(gliese725!.systemType).toBe("binary");
        expect(gliese725!.stars.length).toBe(2);

        const groombridge34 = localGalaxyData.starSystems.find(
            (s) => s.id === "groombridge-34",
        );
        expect(groombridge34).toBeDefined();
        expect(groombridge34!.systemType).toBe("binary");
        expect(groombridge34!.stars.length).toBe(2);
    });

    it("solar-type systems have exactly one star", () => {
        const barnard = localGalaxyData.starSystems.find(
            (s) => s.id === "barnard-s-star",
        );
        expect(barnard).toBeDefined();
        expect(barnard!.systemType).toBe("solar");
        expect(barnard!.stars.length).toBe(1);
    });

    it("every star in stars array has type 'star' and a unique id", () => {
        for (const system of localGalaxyData.starSystems) {
            const ids = system.stars.map((s) => s.id);
            expect(new Set(ids).size).toBe(ids.length); // no duplicates
            for (const star of system.stars) {
                expect(star.type).toBe("star");
            }
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
                // keyFacts is required by the info modal
                expect(star.keyFacts).toBeDefined();
                expect(Object.keys(star.keyFacts).length).toBeGreaterThan(0);
            }
        }
    });

    it("stars cluster compactly at their system (no AU-scale offsets)", () => {
        // StarSystemManager copies each star.position into a mesh inside the
        // system group (light-year units, bounding radius ~22 ly). Companion
        // stars must not carry planetary-AU positions (e.g. Proxima at x≈58),
        // or they render tens of light-years from their system and overlap
        // unrelated systems.
        for (const system of localGalaxyData.starSystems) {
            for (const star of system.stars) {
                expect(star.position.length()).toBeLessThan(1);
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
