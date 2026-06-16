import { describe, it, expect } from "vitest";
import { knownCount } from "@/lib/hud/knownCount";
import type { PlanetarySystem } from "@/lib/planetary-system/types";

function makeBody(
    id: string,
    type: "planet" | "star" = "planet",
    status?: "confirmed" | "candidate" | "controversial",
) {
    return {
        id,
        name: id,
        type,
        status,
        description: "",
        keyFacts: {
            diameter: "",
            orbitalPeriod: "",
            composition: [],
            temperature: "",
        },
        images: [],
        position: undefined as never,
        scale: 1,
        material: { color: "#fff" },
    };
}

function makeSystem(overrides: Partial<PlanetarySystem> = {}): PlanetarySystem {
    return {
        id: "test",
        name: "Test",
        version: "1.0.0",
        description: "Test system",
        systemData: {
            id: "test",
            name: "Test",
            description: "Test",
            star: makeBody("star", "star", "confirmed") as never,
            celestialBodies: [
                makeBody("p1", "planet", "confirmed"),
                makeBody("p2", "planet", "confirmed"),
            ],
            systemScale: 1,
            systemCenter: undefined as never,
            systemType: "solar",
        },
        ...overrides,
    };
}

describe("knownCount", () => {
    it("uses knownExoplanetCount from metadata when present", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                metadata: { knownExoplanetCount: 2 },
            },
        });
        expect(knownCount(sys)).toBe(2);
    });

    it("falls back to known (non-candidate) non-star body count when no knownExoplanetCount", () => {
        const sys = makeSystem();
        expect(knownCount(sys)).toBe(2);
    });

    it("falls back to body count when metadata exists but knownExoplanetCount is undefined", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                metadata: {},
            },
        });
        expect(knownCount(sys)).toBe(2);
    });

    it("returns 0 when no bodies and no metadata", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: { ...base.systemData, celestialBodies: [] },
        });
        expect(knownCount(sys)).toBe(0);
    });

    it("ignores stars when falling back to body count", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                celestialBodies: [
                    makeBody("s1", "star", "confirmed"),
                    makeBody("p1", "planet", "confirmed"),
                ],
            },
        });
        expect(knownCount(sys)).toBe(1);
    });

    it("excludes candidate bodies from fallback count", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                celestialBodies: [
                    makeBody("p1", "planet", "confirmed"),
                    makeBody("p2", "planet", "candidate"),
                ],
            },
        });
        expect(knownCount(sys)).toBe(1);
    });

    it("includes controversial bodies in the known count", () => {
        // "Known" exoplanets = confirmed + controversial (non-candidate),
        // matching the CSV `number_of_known_exoplanets` column. This is the
        // regression guard for the HD 219134 semantic mismatch.
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                celestialBodies: [
                    makeBody("p1", "planet", "confirmed"),
                    makeBody("p2", "planet", "controversial"),
                ],
            },
        });
        expect(knownCount(sys)).toBe(2);
    });

    it("includes undefined-status bodies in the known count", () => {
        // Undefined status follows the project-wide "undefined ⇒ confirmed"
        // convention, so it counts as known (not candidate).
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                celestialBodies: [
                    makeBody("p1", "planet", "confirmed"),
                    makeBody("p2", "planet"),
                ],
            },
        });
        expect(knownCount(sys)).toBe(2);
    });
});
