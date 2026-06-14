import { describe, it, expect } from "vitest";
import { confirmedCount } from "@/lib/hud/confirmedCount";
import type { PlanetarySystem } from "@/lib/planetary-system/types";

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
            star: {
                id: "star",
                name: "Star",
                type: "star",
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
            },
            celestialBodies: [
                {
                    id: "p1",
                    name: "P1",
                    type: "planet",
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
                },
                {
                    id: "p2",
                    name: "P2",
                    type: "planet",
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
                },
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

    it("falls back to non-star body count when no confirmedExoplanetCount", () => {
        const sys = makeSystem();
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
                    {
                        id: "s1",
                        name: "S1",
                        type: "star",
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
                    },
                    {
                        id: "p1",
                        name: "P1",
                        type: "planet",
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
                    },
                ],
            },
        });
        expect(confirmedCount(sys)).toBe(1);
    });
});
