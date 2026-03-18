import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
    solarSystemData,
    solarSystem,
    validatePlanetarySystemData,
    validateCurrentSolarSystemData,
    getCelestialBodyById,
    getAllCelestialBodies,
    getCelestialBodiesByType,
    sortByDistanceFromSun,
    calculateOrbitPosition,
    getRelativeScale,
    formatDistance,
    formatTemperature,
    getRealDistanceKm,
    getScaledPosition,
    getFormattedDistance,
    kmToAU,
    updatePositionsFromRealDistance,
    validateCelestialBodyData,
} from "@/lib/planetary-system/SolarSystem";
import type { CelestialBodyData } from "@/types/game";

describe("solarSystemData", () => {
    it("has expected id and name", () => {
        expect(solarSystemData.id).toBe("solar-system");
        expect(solarSystemData.name).toBe("Solar System");
    });

    it("contains a star with id 'sun'", () => {
        expect(solarSystemData.star).toBeDefined();
        expect(solarSystemData.star.id).toBe("sun");
        expect(solarSystemData.star.type).toBe("star");
    });

    it("contains celestial bodies array", () => {
        expect(Array.isArray(solarSystemData.celestialBodies)).toBe(true);
        expect(solarSystemData.celestialBodies.length).toBeGreaterThan(0);
    });

    it("has valid systemScale", () => {
        expect(typeof solarSystemData.systemScale).toBe("number");
        expect(solarSystemData.systemScale).toBeGreaterThan(0);
    });

    it("has systemCenter with x, y, z properties", () => {
        const center = solarSystemData.systemCenter;
        expect(typeof center.x).toBe("number");
        expect(typeof center.y).toBe("number");
        expect(typeof center.z).toBe("number");
    });
});

describe("solarSystem", () => {
    it("has expected id and name", () => {
        expect(solarSystem.id).toBe("solar");
        expect(solarSystem.name).toBe("Solar System");
    });

    it("has systemData referencing solarSystemData", () => {
        expect(solarSystem.systemData).toBe(solarSystemData);
    });

    it("initialize() resolves without error", async () => {
        await expect(solarSystem.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(solarSystem.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("validatePlanetarySystemData", () => {
    it("returns true for the real solarSystemData", () => {
        expect(validatePlanetarySystemData(solarSystemData)).toBe(true);
    });

    it("returns false for null input", () => {
        expect(validatePlanetarySystemData(null)).toBe(false);
    });

    it("returns false for non-object input", () => {
        expect(validatePlanetarySystemData("string")).toBe(false);
        expect(validatePlanetarySystemData(42)).toBe(false);
    });

    it("returns false when id is missing", () => {
        const bad = { ...solarSystemData, id: undefined } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when name is missing", () => {
        const bad = { ...solarSystemData, name: undefined } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when description is missing", () => {
        const bad = { ...solarSystemData, description: undefined } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false for invalid systemType", () => {
        const bad = { ...solarSystemData, systemType: "invalid" } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when systemScale is not a positive number", () => {
        const bad = { ...solarSystemData, systemScale: -1 } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when systemCenter is missing", () => {
        const bad = { ...solarSystemData, systemCenter: null } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when celestialBodies is not an array", () => {
        const bad = {
            ...solarSystemData,
            celestialBodies: "not-an-array",
        } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });
});

describe("validateCurrentSolarSystemData", () => {
    it("returns true for the bundled solar system data", () => {
        expect(validateCurrentSolarSystemData()).toBe(true);
    });
});

// ─── Utility function tests ──────────────────────────────────────────────────

const makePlanet = (
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData => ({
    id: "test-planet",
    name: "Test Planet",
    type: "planet",
    description: "A test planet",
    keyFacts: {
        diameter: "12,756 km",
        distanceFromSun: "1 AU",
        orbitalPeriod: "365 days",
        composition: ["Rock"],
        temperature: "15°C",
    },
    images: [],
    position: new THREE.Vector3(5, 0, 0),
    scale: 1,
    material: { color: "#0000ff" },
    orbitRadius: 5,
    ...overrides,
});

describe("getCelestialBodyById", () => {
    it("returns the star when queried by sun id", () => {
        const sun = getCelestialBodyById("sun");
        expect(sun).toBeDefined();
        expect(sun?.type).toBe("star");
    });

    it("returns a planet by id", () => {
        const earth = getCelestialBodyById("earth");
        expect(earth).toBeDefined();
        expect(earth?.name).toBe("Earth");
    });

    it("returns undefined for unknown id", () => {
        expect(getCelestialBodyById("nonexistent-id-xyz")).toBeUndefined();
    });
});

describe("getAllCelestialBodies", () => {
    it("includes the star and all celestial bodies", () => {
        const all = getAllCelestialBodies();
        expect(all.length).toBeGreaterThan(1);
        expect(all.some((b) => b.type === "star")).toBe(true);
        expect(all.some((b) => b.type === "planet")).toBe(true);
    });

    it("has the star as the first element", () => {
        const all = getAllCelestialBodies();
        expect(all[0].type).toBe("star");
    });
});

describe("getCelestialBodiesByType", () => {
    it("returns only stars", () => {
        const stars = getCelestialBodiesByType("star");
        expect(stars.length).toBeGreaterThan(0);
        expect(stars.every((b) => b.type === "star")).toBe(true);
    });

    it("returns only planets", () => {
        const planets = getCelestialBodiesByType("planet");
        expect(planets.length).toBeGreaterThan(0);
        expect(planets.every((b) => b.type === "planet")).toBe(true);
    });

    it("returns only moons", () => {
        const moons = getCelestialBodiesByType("moon");
        expect(moons.length).toBeGreaterThan(0);
        expect(moons.every((b) => b.type === "moon")).toBe(true);
    });
});

describe("sortByDistanceFromSun", () => {
    it("places the star first", () => {
        const bodies = getAllCelestialBodies();
        const sorted = sortByDistanceFromSun(bodies);
        expect(sorted[0].type).toBe("star");
    });

    it("orders planets by orbit radius ascending", () => {
        const planet1 = makePlanet({ id: "p1", orbitRadius: 10 });
        const planet2 = makePlanet({ id: "p2", orbitRadius: 3 });
        const planet3 = makePlanet({ id: "p3", orbitRadius: 7 });
        const sorted = sortByDistanceFromSun([planet1, planet2, planet3]);
        expect(sorted[0].id).toBe("p2");
        expect(sorted[1].id).toBe("p3");
        expect(sorted[2].id).toBe("p1");
    });

    it("handles bodies without orbitRadius (treated as 0)", () => {
        const planet1 = makePlanet({ id: "p1", orbitRadius: 5 });
        const planet2 = makePlanet({ id: "p2", orbitRadius: undefined });
        const sorted = sortByDistanceFromSun([planet1, planet2]);
        expect(sorted[0].id).toBe("p2");
    });

    it("places star before non-star when star is not first", () => {
        const star = makePlanet({ id: "star1", type: "star", orbitRadius: 0 });
        const planet = makePlanet({ id: "p1", orbitRadius: 5 });
        const sorted = sortByDistanceFromSun([planet, star]);
        expect(sorted[0].type).toBe("star");
    });
});

describe("calculateOrbitPosition", () => {
    it("returns an object with x, y, z properties", () => {
        const pos = calculateOrbitPosition(5, 0);
        expect(typeof pos.x).toBe("number");
        expect(typeof pos.y).toBe("number");
        expect(typeof pos.z).toBe("number");
    });

    it("returns correct position at angle 0 (on positive x-axis)", () => {
        const pos = calculateOrbitPosition(10, 0, 1);
        expect(pos.x).toBeCloseTo(10);
        expect(pos.y).toBe(0);
        expect(pos.z).toBeCloseTo(0);
    });

    it("returns correct position at angle PI/2", () => {
        const pos = calculateOrbitPosition(10, Math.PI / 2, 1);
        expect(pos.x).toBeCloseTo(0);
        expect(pos.z).toBeCloseTo(10);
    });

    it("applies systemScale to orbit radius", () => {
        const pos1 = calculateOrbitPosition(5, 0, 1);
        const pos2 = calculateOrbitPosition(5, 0, 2);
        expect(pos2.x).toBeCloseTo(pos1.x * 2);
    });

    it("uses default systemScale when not provided", () => {
        const pos = calculateOrbitPosition(5, 0);
        expect(pos.x).toBeCloseTo(5 * solarSystemData.systemScale);
        expect(pos.z).toBeCloseTo(0);
    });
});

describe("getRelativeScale", () => {
    it("returns 1 for Earth diameter (default reference)", () => {
        expect(getRelativeScale(12756)).toBeCloseTo(1);
    });

    it("returns less than 1 for smaller bodies", () => {
        expect(getRelativeScale(3000)).toBeLessThan(1);
    });

    it("returns greater than 1 for larger bodies", () => {
        expect(getRelativeScale(100000)).toBeGreaterThan(1);
    });

    it("enforces minimum of 0.1", () => {
        expect(getRelativeScale(1)).toBeGreaterThanOrEqual(0.1);
    });

    it("accepts custom reference diameter", () => {
        expect(getRelativeScale(1000, 1000)).toBeCloseTo(1);
    });
});

describe("formatDistance", () => {
    it("returns 'Invalid distance' for NaN", () => {
        expect(formatDistance(NaN)).toBe("Invalid distance");
    });

    it("returns '0 km' for zero", () => {
        expect(formatDistance(0)).toBe("0 km");
    });

    it("returns AU format for distances >= 1 AU", () => {
        const AU = 149597870.7;
        const result = formatDistance(AU * 2);
        expect(result).toContain("AU");
    });

    it("returns km format for small distances", () => {
        const result = formatDistance(50000);
        expect(result).toContain("km");
        expect(result).not.toContain("AU");
    });
});

describe("formatTemperature", () => {
    it("returns Celsius/Fahrenheit/Kelvin for normal temperatures", () => {
        const result = formatTemperature(100);
        expect(result).toContain("°C");
        expect(result).toContain("°F");
        expect(result).toContain("K");
    });

    it("returns Celsius/Kelvin for very hot temperatures (>= 1000°C)", () => {
        const result = formatTemperature(5500);
        expect(result).toContain("°C");
        expect(result).toContain("K");
        expect(result).not.toContain("°F");
    });

    it("handles negative temperatures", () => {
        const result = formatTemperature(-65);
        expect(result).toContain("-65°C");
    });

    it("converts to Kelvin correctly (0°C = 273K)", () => {
        const result = formatTemperature(0);
        expect(result).toContain("273K");
    });
});

describe("getRealDistanceKm", () => {
    it("returns 0 when realDistance is not set", () => {
        const planet = makePlanet();
        expect(getRealDistanceKm(planet)).toBe(0);
    });

    it("returns the kilometers value when set", () => {
        const planet = makePlanet({
            realDistance: {
                kilometers: 149597870,
                formattedString: "149.6M km",
            },
        });
        expect(getRealDistanceKm(planet)).toBe(149597870);
    });
});

describe("getScaledPosition", () => {
    it("returns Vector3(0,0,0) when realDistance is 0", () => {
        const planet = makePlanet();
        const pos = getScaledPosition(planet);
        expect(pos.x).toBe(0);
        expect(pos.y).toBe(0);
        expect(pos.z).toBe(0);
    });

    it("returns scaled position when realDistance is set", () => {
        const planet = makePlanet({
            realDistance: {
                kilometers: 10000000,
                formattedString: "10M km",
            },
        });
        const pos = getScaledPosition(planet, 1);
        expect(pos.x).toBeCloseTo(1);
        expect(pos.y).toBe(0);
    });
});

describe("getFormattedDistance", () => {
    it("returns 'Unknown distance' when realDistance is not set", () => {
        const planet = makePlanet();
        expect(getFormattedDistance(planet)).toBe("Unknown distance");
    });

    it("returns the formattedString when realDistance is set", () => {
        const planet = makePlanet({
            realDistance: {
                kilometers: 149597870,
                formattedString: "149.6 million km from Sun",
            },
        });
        expect(getFormattedDistance(planet)).toBe("149.6 million km from Sun");
    });
});

describe("kmToAU", () => {
    it("converts 1 AU in km to approximately 1", () => {
        const AU = 149597870.7;
        expect(kmToAU(AU)).toBeCloseTo(1);
    });

    it("converts 0 km to 0 AU", () => {
        expect(kmToAU(0)).toBe(0);
    });

    it("converts half AU correctly", () => {
        const AU = 149597870.7;
        expect(kmToAU(AU / 2)).toBeCloseTo(0.5);
    });
});

describe("updatePositionsFromRealDistance", () => {
    it("returns a new system data object", () => {
        const result = updatePositionsFromRealDistance(solarSystemData);
        expect(result).not.toBe(solarSystemData);
    });

    it("updates positions for bodies that have realDistance set", () => {
        const bodyWithRealDistance = solarSystemData.celestialBodies.find(
            (b) => b.realDistance,
        );
        expect(bodyWithRealDistance).toBeDefined();
        const expected = getScaledPosition(
            bodyWithRealDistance!,
            solarSystemData.systemScale,
        );
        const result = updatePositionsFromRealDistance(solarSystemData);
        const updatedBody = result.celestialBodies.find(
            (b) => b.id === bodyWithRealDistance!.id,
        )!;
        expect(updatedBody.position).toMatchObject({
            x: expected.x,
            y: expected.y,
            z: expected.z,
        });
    });

    it("updates orbitRadius from realDistance when present", () => {
        const testSystem = {
            ...solarSystemData,
            celestialBodies: [
                makePlanet({
                    id: "tp1",
                    realDistance: {
                        kilometers: 10000000,
                        formattedString: "10M km",
                    },
                }),
            ],
        };
        const result = updatePositionsFromRealDistance(testSystem);
        expect(result.celestialBodies[0].orbitRadius).toBeDefined();
    });

    it("preserves orbitRadius when realDistance is not set", () => {
        const testSystem = {
            ...solarSystemData,
            celestialBodies: [makePlanet({ id: "tp2", orbitRadius: 7 })],
        };
        const result = updatePositionsFromRealDistance(testSystem);
        expect(result.celestialBodies[0].orbitRadius).toBe(7);
    });
});

describe("validateCelestialBodyData", () => {
    it("returns true for a valid planet", () => {
        expect(validateCelestialBodyData(makePlanet())).toBe(true);
    });

    it("returns false for null", () => {
        expect(validateCelestialBodyData(null)).toBe(false);
    });

    it("returns false for non-object", () => {
        expect(validateCelestialBodyData("string")).toBe(false);
        expect(validateCelestialBodyData(42)).toBe(false);
    });

    it("returns false when id is empty string", () => {
        expect(validateCelestialBodyData(makePlanet({ id: "" }))).toBe(false);
    });

    it("returns false when name is empty string", () => {
        expect(validateCelestialBodyData(makePlanet({ name: "" }))).toBe(false);
    });

    it("returns false for invalid type", () => {
        expect(
            validateCelestialBodyData({
                ...makePlanet(),
                type: "asteroid",
            } as unknown),
        ).toBe(false);
    });

    it("returns false when keyFacts is missing", () => {
        const bad = { ...makePlanet(), keyFacts: undefined } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when keyFacts.diameter is not a string", () => {
        const bad = {
            ...makePlanet(),
            keyFacts: { ...makePlanet().keyFacts, diameter: 12756 },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when keyFacts.distanceFromSun is missing for non-moon", () => {
        const bad = {
            ...makePlanet(),
            keyFacts: { ...makePlanet().keyFacts, distanceFromSun: undefined },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("allows moon without distanceFromSun", () => {
        const moon: CelestialBodyData = {
            ...makePlanet(),
            type: "moon",
            keyFacts: {
                diameter: "3,474 km",
                orbitalPeriod: "27 days",
                composition: ["Rock"],
                temperature: "-50°C",
            },
        };
        expect(validateCelestialBodyData(moon)).toBe(true);
    });

    it("returns false when images is not an array", () => {
        const bad = { ...makePlanet(), images: "not-array" } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when position is missing", () => {
        const bad = { ...makePlanet(), position: undefined } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when scale is zero", () => {
        const bad = { ...makePlanet(), scale: 0 } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when scale is negative", () => {
        const bad = { ...makePlanet(), scale: -1 } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when material.color is not a string", () => {
        const bad = {
            ...makePlanet(),
            material: { color: 0xff0000 },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when realDistance.kilometers is not a number", () => {
        const bad = {
            ...makePlanet(),
            realDistance: { kilometers: "far", formattedString: "far" },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when realDistance.astronomicalUnits is not a number", () => {
        const bad = {
            ...makePlanet(),
            realDistance: {
                kilometers: 150000000,
                astronomicalUnits: "one",
                formattedString: "150M km",
            },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when realDistance.lightYears is not a number", () => {
        const bad = {
            ...makePlanet(),
            realDistance: {
                kilometers: 150000000,
                lightYears: "far",
                formattedString: "150M km",
            },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when realDistance.formattedString is not a string", () => {
        const bad = {
            ...makePlanet(),
            realDistance: { kilometers: 150000000, formattedString: 42 },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when material.emissive is not a string", () => {
        const bad = {
            ...makePlanet(),
            material: { color: "#fff", emissive: 0xffffff },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when material.texture is not a string", () => {
        const bad = {
            ...makePlanet(),
            material: { color: "#fff", texture: 123 },
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when orbitRadius is not a number", () => {
        const bad = {
            ...makePlanet(),
            orbitRadius: "five",
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("returns false when orbitSpeed is not a number", () => {
        const bad = {
            ...makePlanet(),
            orbitSpeed: "fast",
        } as unknown;
        expect(validateCelestialBodyData(bad)).toBe(false);
    });

    it("accepts valid optional fields", () => {
        const planet = makePlanet({
            realDistance: {
                kilometers: 150000000,
                astronomicalUnits: 1,
                lightYears: 0.0000158,
                formattedString: "150M km",
            },
            orbitSpeed: 0.02,
        });
        (planet.material as Record<string, unknown>).emissive = "#111";
        (planet.material as Record<string, unknown>).texture = "/texture.jpg";
        expect(validateCelestialBodyData(planet)).toBe(true);
    });
});
