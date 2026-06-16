import { describe, it, expect } from "vitest";
import {
    buildAllPlanetarySystems,
    buildLocalGalaxy,
} from "@/lib/planetary-system/derive/buildAll";

describe("buildAllPlanetarySystems", () => {
    const all = buildAllPlanetarySystems();
    it("returns 30 systems", () => expect(all).toHaveLength(30));
    it("ids are unique", () => {
        expect(new Set(all.map((s) => s.id)).size).toBe(30);
    });
    it("alpha-centauri knownExoplanetCount is 2", () => {
        const ac = all.find((s) => s.id === "alpha-centauri")!;
        expect(ac.systemData.metadata?.knownExoplanetCount).toBe(2);
    });
    it("every system has a star and valid systemType", () => {
        for (const s of all) {
            expect(s.systemData.star.type).toBe("star");
            expect(["solar", "binary", "multiple"]).toContain(
                s.systemData.systemType,
            );
        }
    });
    it("Proxima Centauri c is marked as candidate, not confirmed", () => {
        const ac = all.find((s) => s.id === "alpha-centauri")!;
        const proximaC = ac.systemData.celestialBodies.find(
            (b) => b.id === "proxima-centauri-c",
        );
        expect(proximaC).toBeDefined();
        expect(proximaC!.status).toBe("candidate");
    });
    // Regression: Proxima Centauri orbits the AB barycenter (the system's
    // center of mass), not Alpha Centauri A. Proxima is bound to the AB pair;
    // centering it on A would make it ride A's tight ~11.5 AU binary loop and
    // drag its planets along that loop instead of its own wide orbit.
    it("Proxima Centauri orbits the AB barycenter", () => {
        const ac = all.find((s) => s.id === "alpha-centauri")!;
        const proxima = ac.systemData.celestialBodies.find(
            (b) => b.id === "proxima-centauri",
        )!;
        expect(proxima.orbit?.centerId).toBe("alpha-centauri-ab-barycenter");
        expect(proxima.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
    });
    it("Gliese 338 B orbits the Gliese 338 primary", () => {
        const g = all.find((s) => s.id === "gliese-338")!;
        const b = g.systemData.celestialBodies.find(
            (x) => x.id === "gliese-338-b",
        )!;
        expect(b.orbit?.centerId).toBe("gliese-338-a");
        expect(b.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
    });
    // Regression: secondary stars must report their real separation, not
    // "0 (system center)".
    it("secondary stars report their projected separation", () => {
        const g725 = all.find((s) => s.id === "gliese-725")!;
        const b = g725.systemData.celestialBodies.find(
            (x) => x.id === "gliese-725-b",
        )!;
        expect(b.keyFacts.distanceFromSun).toBe("36 AU from system center");
    });
    // Guards against id drift: these ids must match the planet.*/facts.* keys
    // in src/i18n/{en,zh,ja}.ts. If slug() changes, translations break.
    it("Proxima planet ids match the locale translation keys", () => {
        const ac = all.find((s) => s.id === "alpha-centauri")!;
        const ids = ac.systemData.celestialBodies
            .filter((b) => b.type !== "star")
            .map((b) => b.id);
        expect(ids).toEqual(
            expect.arrayContaining([
                "proxima-centauri-b",
                "proxima-centauri-c",
                "proxima-centauri-d",
            ]),
        );
    });
});
describe("buildLocalGalaxy", () => {
    it("has 30 star systems, Solar not included", () => {
        const galaxy = buildLocalGalaxy();
        expect(galaxy.starSystems).toHaveLength(30);
        expect(
            galaxy.starSystems.find((s) => s.id === "solar"),
        ).toBeUndefined();
    });
    it("classifies Alpha Centauri (3 stars) as trinary", () => {
        const galaxy = buildLocalGalaxy();
        const ac = galaxy.starSystems.find((s) => s.id === "alpha-centauri");
        expect(ac?.systemType).toBe("trinary");
    });
    it("systems with coordinates produce valid non-origin 3D positions", () => {
        const galaxy = buildLocalGalaxy();
        // Alpha Centauri has coordinates in the CSV and is 4.2465 ly away,
        // so its position must not be the (0,0,0) fallback
        const ac = galaxy.starSystems.find((s) => s.id === "alpha-centauri");
        expect(ac).toBeDefined();
        const mag = Math.sqrt(
            ac!.position.x ** 2 + ac!.position.y ** 2 + ac!.position.z ** 2,
        );
        expect(mag).toBeCloseTo(ac!.distanceFromEarth, 1);
        expect(mag).toBeGreaterThan(0);
    });
    it("Alpha Centauri position magnitude matches known real distance (~4.2 ly)", () => {
        const galaxy = buildLocalGalaxy();
        const ac = galaxy.starSystems.find((s) => s.id === "alpha-centauri");
        expect(ac).toBeDefined();
        const mag = Math.sqrt(
            ac!.position.x ** 2 + ac!.position.y ** 2 + ac!.position.z ** 2,
        );
        // Alpha Centauri / Proxima is ~4.2465 ly from Earth — guard against a
        // broken coordinate transform that would silently produce wrong units.
        expect(mag).toBeCloseTo(4.2, 0);
    });
    it("galaxy stars cluster compactly at their system (no AU-scale offsets)", () => {
        // StarSystemManager copies each star.position into a mesh inside the
        // system group, which is positioned in light-years. Companion stars
        // must not carry planetary-AU positions (e.g. Proxima at x≈58 or
        // Alpha Centauri B at x≈35), or they render tens of light-years from
        // their system and overlap unrelated systems in a ~22 ly galaxy.
        const galaxy = buildLocalGalaxy();
        for (const system of galaxy.starSystems) {
            for (const star of system.stars) {
                expect(star.position.length()).toBeLessThan(1);
            }
        }
    });
    it("galaxy stars are decoupled from planetary-system star objects", () => {
        // Mutating a galaxy star's position must not bleed into the planetary
        // system data (the AU offsets are still needed by the planetary view).
        const galaxy = buildLocalGalaxy();
        const ac = galaxy.starSystems.find((s) => s.id === "alpha-centauri")!;
        const proxima = ac.stars.find((s) => s.id === "proxima-centauri")!;
        proxima.position.set(999, 999, 999);
        const planet = buildAllPlanetarySystems().find(
            (s) => s.id === "alpha-centauri",
        )!;
        const planetProxima = planet.systemData.celestialBodies.find(
            (b) => b.id === "proxima-centauri",
        )!;
        expect(planetProxima.position.x).not.toBe(999);
    });
});
