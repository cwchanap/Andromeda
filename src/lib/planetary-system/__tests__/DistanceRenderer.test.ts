/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
    calculateRenderedPosition,
    calculateOrbitRadius,
    updateSystemForDistanceRendering,
    createAdaptiveScaleConfig,
    getDistanceInfo,
    defaultSolarSystemRenderConfig,
    type DistanceRenderingConfig,
} from "../DistanceRenderer";
import type { CelestialBodyData } from "../../../types/game";
import type { PlanetarySystemData } from "../types";

// Helper to create a mock Vector3 with length()
function makeVec3(x = 0, y = 0, z = 0) {
    const v: any = { x, y, z };
    v.length = () => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    v.clone = () => makeVec3(v.x, v.y, v.z);
    return v;
}

// Helper to create a minimal CelestialBodyData
function makeCelestialBody(
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData {
    return {
        id: "test-body",
        name: "Test Body",
        type: "planet",
        description: "A test body",
        keyFacts: {
            diameter: "1000 km",
            orbitalPeriod: "365 days",
            composition: ["Rock"],
            temperature: "300 K",
        },
        images: [],
        position: makeVec3(10, 0, 0) as any,
        scale: 1,
        material: { color: "#ff0000" },
        orbitRadius: 10,
        orbitSpeed: 1,
        ...overrides,
    };
}

function makePlanetarySystem(
    bodies: CelestialBodyData[] = [],
): PlanetarySystemData {
    return {
        id: "test-system",
        name: "Test System",
        description: "A test system",
        star: makeCelestialBody({ type: "star" }),
        celestialBodies: bodies,
        systemScale: 1,
        systemCenter: { x: 0, y: 0, z: 0 } as any,
        systemType: "solar",
    };
}

describe("calculateRenderedPosition", () => {
    it("returns cloned position when body has no realDistance", () => {
        const body = makeCelestialBody({ realDistance: undefined });
        const result = calculateRenderedPosition(body);
        expect(result).toBeDefined();
    });

    it("returns origin for body at zero distance", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 0,
                formattedString: "0 km",
            },
        });
        const result = calculateRenderedPosition(body);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(result.z).toBe(0);
    });

    it("uses logarithmic scaling by default", () => {
        const earthBody = makeCelestialBody({
            realDistance: {
                kilometers: 149_597_870,
                astronomicalUnits: 1,
                formattedString: "149,597,870 km",
            },
        });

        const result = calculateRenderedPosition(earthBody);
        expect(result.x).toBeGreaterThan(0);
        expect(result.y).toBe(0);
        expect(result.z).toBe(0);
    });

    it("clamps result to minRenderDistance", () => {
        const veryCloseBody = makeCelestialBody({
            realDistance: {
                kilometers: 1, // Extremely close
                formattedString: "1 km",
            },
        });

        const config: DistanceRenderingConfig = {
            scaleType: "logarithmic",
            minRenderDistance: 0.5,
            maxRenderDistance: 500,
            scaleFactor: 0.1,
        };

        const result = calculateRenderedPosition(veryCloseBody, config);
        expect(result.x).toBeGreaterThanOrEqual(config.minRenderDistance);
    });

    it("clamps result to maxRenderDistance", () => {
        const veryFarBody = makeCelestialBody({
            realDistance: {
                kilometers: 1e20, // Astronomically far
                formattedString: "1e20 km",
            },
        });

        const config: DistanceRenderingConfig = {
            scaleType: "linear",
            minRenderDistance: 0.1,
            maxRenderDistance: 100,
            scaleFactor: 0.1,
        };

        const result = calculateRenderedPosition(veryFarBody, config);
        expect(result.x).toBeLessThanOrEqual(config.maxRenderDistance);
    });

    it("uses linear scaling correctly", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 100_000_000, // 100 million km = 10 units with scaleFactor 0.1
                formattedString: "100,000,000 km",
            },
        });

        const config: DistanceRenderingConfig = {
            scaleType: "linear",
            minRenderDistance: 0.1,
            maxRenderDistance: 500,
            scaleFactor: 0.1,
        };

        const result = calculateRenderedPosition(body, config);
        // 100,000,000 / 10,000,000 * 0.1 = 1.0
        expect(result.x).toBeCloseTo(1.0, 5);
    });

    it("uses custom scale function when scaleType is custom", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 50_000_000,
                formattedString: "50,000,000 km",
            },
        });

        const config: DistanceRenderingConfig = {
            scaleType: "custom",
            minRenderDistance: 0.1,
            maxRenderDistance: 500,
            scaleFactor: 1,
            customScaleFunction: () => 7.5,
        };

        const result = calculateRenderedPosition(body, config);
        expect(result.x).toBeCloseTo(7.5, 5);
    });

    it("falls back to linear when custom scaleType has no function", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 100_000_000,
                formattedString: "100,000,000 km",
            },
        });

        const config: DistanceRenderingConfig = {
            scaleType: "custom",
            minRenderDistance: 0.1,
            maxRenderDistance: 500,
            scaleFactor: 0.1,
            // No customScaleFunction
        };

        const result = calculateRenderedPosition(body, config);
        expect(result.x).toBeCloseTo(1.0, 5);
    });

    it("handles unknown scaleType with linear fallback", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 100_000_000,
                formattedString: "100,000,000 km",
            },
        });

        const config = {
            scaleType: "unknown" as any,
            minRenderDistance: 0.1,
            maxRenderDistance: 500,
            scaleFactor: 0.1,
        };

        const result = calculateRenderedPosition(body, config);
        expect(result.x).toBeCloseTo(1.0, 5);
    });
});

describe("calculateOrbitRadius", () => {
    it("returns position length for body with no realDistance (uses clone of position)", () => {
        const body = makeCelestialBody({ realDistance: undefined });
        // When no realDistance, it uses position.clone() → (10, 0, 0) → length = 10
        const radius = calculateOrbitRadius(body);
        expect(radius).toBeCloseTo(10, 5);
    });

    it("returns positive radius for a body with real distance", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 149_597_870,
                formattedString: "149,597,870 km",
            },
        });

        const radius = calculateOrbitRadius(body);
        expect(radius).toBeGreaterThanOrEqual(0);
    });
});

describe("updateSystemForDistanceRendering", () => {
    it("returns updated system with re-positioned bodies", () => {
        const earth = makeCelestialBody({
            id: "earth",
            realDistance: {
                kilometers: 149_597_870,
                formattedString: "149,597,870 km",
            },
        });

        const system = makePlanetarySystem([earth]);
        const updated = updateSystemForDistanceRendering(system);

        expect(updated.celestialBodies).toHaveLength(1);
        expect(updated.celestialBodies[0].id).toBe("earth");
    });

    it("preserves all other system properties", () => {
        const system = makePlanetarySystem([makeCelestialBody()]);
        const updated = updateSystemForDistanceRendering(system);

        expect(updated.id).toBe(system.id);
        expect(updated.name).toBe(system.name);
        expect(updated.systemType).toBe(system.systemType);
    });

    it("does not mutate original system", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 100_000_000,
                formattedString: "100M km",
            },
        });
        const system = makePlanetarySystem([body]);
        const originalBodies = system.celestialBodies;

        updateSystemForDistanceRendering(system);

        expect(system.celestialBodies).toBe(originalBodies);
    });

    it("accepts custom config", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 100_000_000,
                formattedString: "100M km",
            },
        });
        const system = makePlanetarySystem([body]);

        const config: DistanceRenderingConfig = {
            scaleType: "linear",
            minRenderDistance: 0.01,
            maxRenderDistance: 1000,
            scaleFactor: 0.5,
        };

        const updated = updateSystemForDistanceRendering(system, config);
        expect(updated.celestialBodies).toHaveLength(1);
    });
});

describe("createAdaptiveScaleConfig", () => {
    it("returns a DistanceRenderingConfig", () => {
        const system = makePlanetarySystem([
            makeCelestialBody({
                realDistance: {
                    kilometers: 500_000_000,
                    formattedString: "500M km",
                },
            }),
        ]);

        const config = createAdaptiveScaleConfig(system);

        expect(config).toHaveProperty("scaleType", "linear");
        expect(config).toHaveProperty("minRenderDistance");
        expect(config).toHaveProperty("maxRenderDistance");
        expect(config).toHaveProperty("scaleFactor");
    });

    it("uses default maxRenderRadius of 10", () => {
        const system = makePlanetarySystem([
            makeCelestialBody({
                realDistance: {
                    kilometers: 100_000_000,
                    formattedString: "100M km",
                },
            }),
        ]);

        const config = createAdaptiveScaleConfig(system);
        expect(config.maxRenderDistance).toBe(10);
    });

    it("accepts custom maxRenderRadius", () => {
        const system = makePlanetarySystem([
            makeCelestialBody({
                realDistance: {
                    kilometers: 100_000_000,
                    formattedString: "100M km",
                },
            }),
        ]);

        const config = createAdaptiveScaleConfig(system, 50);
        expect(config.maxRenderDistance).toBe(50);
    });

    it("handles system with no bodies that have real distances", () => {
        const system = makePlanetarySystem([
            makeCelestialBody({ realDistance: undefined }),
        ]);

        const config = createAdaptiveScaleConfig(system);
        expect(config.scaleFactor).toBe(0.1);
    });

    it("handles empty system", () => {
        const system = makePlanetarySystem([]);

        const config = createAdaptiveScaleConfig(system);
        expect(config.scaleFactor).toBe(0.1);
    });
});

describe("getDistanceInfo", () => {
    it("returns Unknown for body without realDistance", () => {
        const body = makeCelestialBody({ realDistance: undefined });
        const info = getDistanceInfo(body);

        expect(info.real).toBe("Unknown");
        expect(info.rendered).toBe("N/A");
        expect(info.scale).toBe("N/A");
    });

    it("returns formatted info for body with realDistance", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 149_597_870,
                formattedString: "149,597,870 km",
            },
        });

        const info = getDistanceInfo(body);
        expect(info.real).toBe("149,597,870 km");
        expect(info.rendered).toMatch(/\d+\.\d+ units/);
        expect(info.scale).toMatch(/1:/);
    });

    it("handles zero kilometer distance gracefully", () => {
        const body = makeCelestialBody({
            realDistance: {
                kilometers: 0,
                formattedString: "0 km",
            },
        });

        const info = getDistanceInfo(body);
        expect(info.real).toBe("0 km");
        // scale calculation: 0 > 0 is false, so scale is "1:Infinity" or similar
        expect(info.scale).toBeDefined();
    });
});

describe("defaultSolarSystemRenderConfig", () => {
    it("is a valid DistanceRenderingConfig", () => {
        expect(defaultSolarSystemRenderConfig.scaleType).toBe("logarithmic");
        expect(
            defaultSolarSystemRenderConfig.minRenderDistance,
        ).toBeGreaterThan(0);
        expect(
            defaultSolarSystemRenderConfig.maxRenderDistance,
        ).toBeGreaterThan(defaultSolarSystemRenderConfig.minRenderDistance);
        expect(defaultSolarSystemRenderConfig.scaleFactor).toBeGreaterThan(0);
    });
});
