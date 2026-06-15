import { describe, it, expect } from "vitest";
import { confirmedCount } from "@/lib/hud/confirmedCount";
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

describe("confirmedCount", () => {
    it("uses confirmedExoplanetCount from metadata when present", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                metadata: { confirmedExoplanetCount: 2 },
            },
        });
        expect(confirmedCount(sys)).toBe(2);
    });

    it("falls back to confirmed non-star body count when no confirmedExoplanetCount", () => {
        const sys = makeSystem();
        expect(confirmedCount(sys)).toBe(2);
    });

    it("falls back to body count when metadata exists but confirmedExoplanetCount is undefined", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: {
                ...base.systemData,
                metadata: {},
            },
        });
        expect(confirmedCount(sys)).toBe(2);
    });

    it("returns 0 when no bodies and no metadata", () => {
        const base = makeSystem();
        const sys = makeSystem({
            systemData: { ...base.systemData, celestialBodies: [] },
        });
        expect(confirmedCount(sys)).toBe(0);
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
        expect(confirmedCount(sys)).toBe(1);
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
        expect(confirmedCount(sys)).toBe(1);
    });

    it("excludes controversial bodies from fallback count", () => {
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
        expect(confirmedCount(sys)).toBe(1);
    });

    it("excludes bodies with undefined status from fallback count", () => {
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
        expect(confirmedCount(sys)).toBe(1);
    });
});
