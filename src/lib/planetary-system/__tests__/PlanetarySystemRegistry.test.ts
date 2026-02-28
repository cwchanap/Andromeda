import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    PlanetarySystemRegistry,
    planetarySystemRegistry,
} from "../PlanetarySystemRegistry";
import type { PlanetarySystem, PlanetarySystemData } from "../types";
import * as THREE from "three";

function makeMockSystemData(
    id: string,
    systemType: "solar" | "binary" = "solar",
    discoveredBy?: string,
): PlanetarySystemData {
    return {
        id,
        name: `${id} Name`,
        description: "Test system",
        star: {
            id: `${id}-star`,
            name: "Test Star",
            type: "star",
            description: "A star",
            keyFacts: {
                diameter: "1,000,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: ["Hydrogen"],
                temperature: "5,000 K",
            },
            images: [],
            position: new THREE.Vector3(0, 0, 0),
            scale: 1,
            material: { color: "#FFFF00" },
        },
        celestialBodies: [],
        systemScale: 1,
        systemCenter: new THREE.Vector3(0, 0, 0),
        systemType,
        metadata: discoveredBy ? { discoveredBy } : undefined,
    };
}

function makeMockSystem(
    id: string,
    systemType: "solar" | "binary" = "solar",
    discoveredBy?: string,
): PlanetarySystem {
    return {
        id,
        name: `${id} Name`,
        version: "1.0.0",
        description: "Test system",
        systemData: makeMockSystemData(id, systemType, discoveredBy),
    };
}

describe("PlanetarySystemRegistry", () => {
    let registry: PlanetarySystemRegistry;

    beforeEach(() => {
        registry = new PlanetarySystemRegistry();
    });

    describe("registerSystem / hasSystem / getSystem", () => {
        it("registers and retrieves a system by ID", () => {
            const sys = makeMockSystem("sol");
            registry.registerSystem(sys);
            expect(registry.hasSystem("sol")).toBe(true);
            expect(registry.getSystem("sol")).toBe(sys);
        });

        it("returns undefined for non-existent system", () => {
            expect(registry.getSystem("missing")).toBeUndefined();
        });

        it("hasSystem returns false for non-existent ID", () => {
            expect(registry.hasSystem("missing")).toBe(false);
        });

        it("overwrites a system when re-registered with same ID", () => {
            const sys1 = makeMockSystem("sol");
            const sys2 = { ...makeMockSystem("sol"), version: "2.0.0" };
            registry.registerSystem(sys1);
            registry.registerSystem(sys2);
            expect(registry.getSystem("sol")?.version).toBe("2.0.0");
        });
    });

    describe("getAllSystems", () => {
        it("returns empty array when no systems registered", () => {
            expect(registry.getAllSystems()).toHaveLength(0);
        });

        it("returns all registered systems", () => {
            registry.registerSystem(makeMockSystem("sol"));
            registry.registerSystem(makeMockSystem("alpha-centauri"));
            const all = registry.getAllSystems();
            expect(all).toHaveLength(2);
            expect(all.map((s) => s.id)).toContain("sol");
            expect(all.map((s) => s.id)).toContain("alpha-centauri");
        });
    });

    describe("systems getter", () => {
        it("returns a copy of the internal map", () => {
            registry.registerSystem(makeMockSystem("sol"));
            const map = registry.systems;
            expect(map.size).toBe(1);
            // Mutating the returned map should not affect the registry
            map.delete("sol");
            expect(registry.hasSystem("sol")).toBe(true);
        });
    });

    describe("initializeAll", () => {
        it("calls initialize on all systems that have it", async () => {
            const init1 = vi.fn().mockResolvedValue(undefined);
            const init2 = vi.fn().mockResolvedValue(undefined);
            const sys1 = { ...makeMockSystem("a"), initialize: init1 };
            const sys2 = { ...makeMockSystem("b"), initialize: init2 };
            const sys3 = makeMockSystem("c"); // no initialize
            registry.registerSystem(sys1);
            registry.registerSystem(sys2);
            registry.registerSystem(sys3);

            await registry.initializeAll();

            expect(init1).toHaveBeenCalledTimes(1);
            expect(init2).toHaveBeenCalledTimes(1);
        });

        it("resolves when no systems have initialize", async () => {
            registry.registerSystem(makeMockSystem("sol"));
            await expect(registry.initializeAll()).resolves.toBeUndefined();
        });
    });

    describe("cleanupAll", () => {
        it("calls cleanup on all systems that have it", async () => {
            const cleanup1 = vi.fn().mockResolvedValue(undefined);
            const sys1 = { ...makeMockSystem("a"), cleanup: cleanup1 };
            const sys2 = makeMockSystem("b"); // no cleanup
            registry.registerSystem(sys1);
            registry.registerSystem(sys2);

            await registry.cleanupAll();

            expect(cleanup1).toHaveBeenCalledTimes(1);
        });
    });

    describe("getSystemsByType", () => {
        it("returns systems matching the given type", () => {
            registry.registerSystem(makeMockSystem("sol", "solar"));
            registry.registerSystem(makeMockSystem("alpha", "binary"));
            registry.registerSystem(makeMockSystem("beta", "solar"));

            const solar = registry.getSystemsByType("solar");
            expect(solar).toHaveLength(2);
            expect(solar.map((s) => s.id)).toContain("sol");
            expect(solar.map((s) => s.id)).toContain("beta");
        });

        it("returns empty array when no systems match the type", () => {
            registry.registerSystem(makeMockSystem("sol", "solar"));
            expect(registry.getSystemsByType("binary")).toHaveLength(0);
        });
    });

    describe("getSystemsByDiscoverer", () => {
        it("returns systems discovered by the given entity", () => {
            registry.registerSystem(makeMockSystem("sol", "solar", "NASA"));
            registry.registerSystem(makeMockSystem("alpha", "solar", "ESA"));
            registry.registerSystem(makeMockSystem("beta", "solar", "NASA"));

            const nasa = registry.getSystemsByDiscoverer("NASA");
            expect(nasa).toHaveLength(2);
            expect(nasa.map((s) => s.id)).toContain("sol");
            expect(nasa.map((s) => s.id)).toContain("beta");
        });

        it("returns empty array when no metadata matches", () => {
            registry.registerSystem(makeMockSystem("sol")); // no metadata
            expect(registry.getSystemsByDiscoverer("NASA")).toHaveLength(0);
        });
    });

    describe("planetarySystemRegistry singleton", () => {
        it("is an instance of PlanetarySystemRegistry", () => {
            expect(planetarySystemRegistry).toBeInstanceOf(
                PlanetarySystemRegistry,
            );
        });
    });
});
