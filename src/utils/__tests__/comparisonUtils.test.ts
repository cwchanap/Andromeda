// Unit tests for comparison utilities
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    parseDiameter,
    parseDistance,
    parseTemperature,
    parseOrbitalPeriod,
    calculateSizeRatios,
    formatSizeRatio,
    getComparisonValue,
    getAllBodiesFromAllSystems,
    searchBodies,
    filterByType,
    COMPARISON_ATTRIBUTES,
    type SelectableBody,
} from "../comparisonUtils";
import type { CelestialBodyData } from "../../types/game";
import * as THREE from "three";

// Mock the planetary system registry
vi.mock("../../lib/planetary-system", () => ({
    planetarySystemRegistry: {
        getAllSystems: vi.fn(() => [
            {
                id: "solar",
                systemData: {
                    name: "Solar System",
                    star: {
                        id: "sun",
                        name: "Sun",
                        type: "star",
                        description: "Our star",
                        keyFacts: {
                            diameter: "1,392,700 km",
                            orbitalPeriod: "N/A",
                            composition: ["Hydrogen", "Helium"],
                            temperature: "5,778 K",
                        },
                        images: [],
                        position: new THREE.Vector3(0, 0, 0),
                        scale: 1,
                        material: { color: "#FFD700" },
                    },
                    celestialBodies: [
                        {
                            id: "earth",
                            name: "Earth",
                            type: "planet",
                            description: "Our home planet",
                            keyFacts: {
                                diameter: "12,742 km",
                                distanceFromSun: "150 million km",
                                orbitalPeriod: "365.25 days",
                                composition: ["Rock", "Iron"],
                                temperature: "15°C",
                                moons: 1,
                            },
                            images: [],
                            position: new THREE.Vector3(5, 0, 0),
                            scale: 1,
                            material: { color: "#6B93D6" },
                        },
                        {
                            id: "mars",
                            name: "Mars",
                            type: "planet",
                            description: "The red planet",
                            keyFacts: {
                                diameter: "6,779 km",
                                distanceFromSun: "228 million km",
                                orbitalPeriod: "687 days",
                                composition: ["Rock", "Iron oxide"],
                                temperature: "-65°C",
                                moons: 2,
                            },
                            images: [],
                            position: new THREE.Vector3(8, 0, 0),
                            scale: 0.53,
                            material: { color: "#CD5C5C" },
                        },
                        {
                            id: "luna",
                            name: "Moon",
                            type: "moon",
                            parentId: "earth",
                            description: "Earth's moon",
                            keyFacts: {
                                diameter: "3,474 km",
                                orbitalPeriod: "27.3 days",
                                composition: ["Silicate rocks"],
                                temperature: "-173°C to 127°C",
                            },
                            distanceFromParent: {
                                kilometers: 384400,
                                formattedString: "384,400 km",
                            },
                            images: [],
                            position: new THREE.Vector3(5.4, 0, 0),
                            scale: 0.27,
                            material: { color: "#C0C0C0" },
                        },
                    ],
                },
            },
        ]),
    },
}));

describe("Comparison Utilities", () => {
    describe("parseDiameter", () => {
        it("should parse simple diameter with commas", () => {
            expect(parseDiameter("12,742 km")).toBe(12742);
        });

        it("should parse large diameter with multiple commas", () => {
            expect(parseDiameter("1,392,700 km")).toBe(1392700);
        });

        it("should parse small diameter", () => {
            expect(parseDiameter("4,879 km")).toBe(4879);
        });

        it("should return 0 for invalid input", () => {
            expect(parseDiameter("unknown")).toBe(0);
        });

        it("should return 0 for empty string", () => {
            expect(parseDiameter("")).toBe(0);
        });

        it("should handle diameter without commas", () => {
            expect(parseDiameter("500 km")).toBe(500);
        });
    });

    describe("parseDistance", () => {
        it("should parse distance with million km format", () => {
            expect(parseDistance("150 million km")).toBe(150_000_000);
        });

        it("should parse distance with decimal million km format", () => {
            expect(parseDistance("57.9 million km")).toBe(57_900_000);
        });

        it("should parse plain km format with commas", () => {
            expect(parseDistance("384,400 km")).toBe(384400);
        });

        it("should return 0 for empty string", () => {
            expect(parseDistance("")).toBe(0);
        });

        it("should return 0 for null/undefined input", () => {
            expect(parseDistance(null as unknown as string)).toBe(0);
            expect(parseDistance(undefined as unknown as string)).toBe(0);
        });

        it("should handle case insensitive million", () => {
            expect(parseDistance("150 Million km")).toBe(150_000_000);
        });
    });

    describe("parseTemperature", () => {
        it("should parse single temperature in Celsius", () => {
            const result = parseTemperature("15°C");
            expect(result).toEqual({ value: 15, unit: "C" });
        });

        it("should parse single temperature in Kelvin", () => {
            const result = parseTemperature("5,778 K");
            expect(result).toEqual({ value: 5778, unit: "K" });
        });

        it("should parse temperature range and return average", () => {
            const result = parseTemperature("-173°C to 127°C");
            expect(result).toEqual({ value: -23, unit: "C" });
        });

        it("should infer unit from first value in range", () => {
            const result = parseTemperature("-173K to 427");
            expect(result).toEqual({ value: 127, unit: "K" });
        });

        it("should handle negative temperatures", () => {
            const result = parseTemperature("-65°C");
            expect(result).toEqual({ value: -65, unit: "C" });
        });

        it("should return null for empty string", () => {
            expect(parseTemperature("")).toBeNull();
        });

        it("should return null for invalid format", () => {
            expect(parseTemperature("unknown")).toBeNull();
        });
    });

    describe("parseOrbitalPeriod", () => {
        it("should parse days format", () => {
            expect(parseOrbitalPeriod("365.25 days")).toBe(365.25);
        });

        it("should parse years format", () => {
            // 11.86 * 365.25 = 4331.865
            expect(parseOrbitalPeriod("11.86 years")).toBeCloseTo(4331.865, 1);
        });

        it("should parse single day", () => {
            expect(parseOrbitalPeriod("1 day")).toBe(1);
        });

        it("should return 0 for N/A", () => {
            expect(parseOrbitalPeriod("N/A")).toBe(0);
        });

        it("should return 0 for empty string", () => {
            expect(parseOrbitalPeriod("")).toBe(0);
        });

        it("should handle year singular", () => {
            expect(parseOrbitalPeriod("1 year")).toBeCloseTo(365.25, 1);
        });
    });

    describe("calculateSizeRatios", () => {
        const createMockBody = (diameter: string): CelestialBodyData => ({
            id: "test",
            name: "Test",
            type: "planet",
            description: "Test body",
            keyFacts: {
                diameter,
                orbitalPeriod: "1 day",
                composition: ["Rock"],
                temperature: "0°C",
            },
            images: [],
            position: new THREE.Vector3(0, 0, 0),
            scale: 1,
            material: { color: "#FFFFFF" },
        });

        it("should return empty array for empty input", () => {
            expect(calculateSizeRatios([])).toEqual([]);
        });

        it("should return 1.0 for single body", () => {
            const bodies = [createMockBody("12,742 km")];
            expect(calculateSizeRatios(bodies)).toEqual([1]);
        });

        it("should calculate correct ratios for multiple bodies", () => {
            const bodies = [
                createMockBody("12,742 km"), // Earth
                createMockBody("6,371 km"), // Half of Earth
            ];
            const ratios = calculateSizeRatios(bodies);
            expect(ratios[0]).toBe(1); // Largest is 1
            expect(ratios[1]).toBeCloseTo(0.5, 1);
        });

        it("should handle bodies with same size", () => {
            const bodies = [
                createMockBody("10,000 km"),
                createMockBody("10,000 km"),
            ];
            const ratios = calculateSizeRatios(bodies);
            expect(ratios).toEqual([1, 1]);
        });

        it("should handle invalid diameter by returning 1 for all", () => {
            const bodies = [
                createMockBody("unknown"),
                createMockBody("unknown"),
            ];
            const ratios = calculateSizeRatios(bodies);
            expect(ratios).toEqual([1, 1]);
        });

        it("should calculate Sun vs Earth ratio correctly", () => {
            const bodies = [
                createMockBody("1,392,700 km"), // Sun
                createMockBody("12,742 km"), // Earth
            ];
            const ratios = calculateSizeRatios(bodies);
            expect(ratios[0]).toBe(1);
            expect(ratios[1]).toBeCloseTo(0.00915, 3); // Earth is ~0.9% of Sun's diameter
        });
    });

    describe("formatSizeRatio", () => {
        it("should format 1.0 ratio as 100%", () => {
            expect(formatSizeRatio(1)).toBe("100%");
        });

        it("should format 0.5 ratio as 50.0%", () => {
            expect(formatSizeRatio(0.5)).toBe("50.0%");
        });

        it("should format small ratio with one decimal", () => {
            expect(formatSizeRatio(0.009)).toBe("0.9%");
        });

        it("should handle values greater than 1", () => {
            expect(formatSizeRatio(1.5)).toBe("100%");
        });

        it("should handle zero", () => {
            expect(formatSizeRatio(0)).toBe("0.0%");
        });
    });

    describe("getComparisonValue", () => {
        const mockPlanet: CelestialBodyData = {
            id: "earth",
            name: "Earth",
            type: "planet",
            description: "Our home planet",
            keyFacts: {
                diameter: "12,742 km",
                distanceFromSun: "150 million km",
                orbitalPeriod: "365.25 days",
                composition: ["Rock", "Iron", "Water", "Oxygen"],
                temperature: "15°C",
                moons: 1,
            },
            images: [],
            position: new THREE.Vector3(5, 0, 0),
            scale: 1,
            material: { color: "#6B93D6" },
        };

        const mockMoon: CelestialBodyData = {
            id: "luna",
            name: "Moon",
            type: "moon",
            parentId: "earth",
            description: "Earth's moon",
            keyFacts: {
                diameter: "3,474 km",
                orbitalPeriod: "27.3 days",
                composition: ["Silicate rocks"],
                temperature: "-173°C to 127°C",
            },
            distanceFromParent: {
                kilometers: 384400,
                formattedString: "384,400 km",
            },
            images: [],
            position: new THREE.Vector3(5.4, 0, 0),
            scale: 0.27,
            material: { color: "#C0C0C0" },
        };

        it("should get diameter value", () => {
            expect(getComparisonValue(mockPlanet, "diameter")).toBe(
                "12,742 km",
            );
        });

        it("should get distance from sun for planet", () => {
            expect(getComparisonValue(mockPlanet, "distance")).toBe(
                "150 million km",
            );
        });

        it("should get distance from parent for moon", () => {
            expect(getComparisonValue(mockMoon, "distance")).toBe("384,400 km");
        });

        it("should get temperature value", () => {
            expect(getComparisonValue(mockPlanet, "temperature")).toBe("15°C");
        });

        it("should get orbital period value", () => {
            expect(getComparisonValue(mockPlanet, "orbitalPeriod")).toBe(
                "365.25 days",
            );
        });

        it("should get moons count", () => {
            expect(getComparisonValue(mockPlanet, "moons")).toBe("1");
        });

        it("should get type value", () => {
            expect(getComparisonValue(mockPlanet, "type")).toBe("planet");
        });

        it("should get first 3 composition items", () => {
            expect(getComparisonValue(mockPlanet, "composition")).toBe(
                "Rock, Iron, Water",
            );
        });

        it("should return dash for unknown attribute", () => {
            expect(getComparisonValue(mockPlanet, "unknown")).toBe("-");
        });

        it("should return dash for moons when not defined", () => {
            const bodyWithoutMoons = { ...mockMoon };
            expect(getComparisonValue(bodyWithoutMoons, "moons")).toBe("-");
        });

        it("should handle missing composition safely", () => {
            const bodyWithoutComposition = {
                ...mockPlanet,
                keyFacts: {
                    ...mockPlanet.keyFacts,
                    composition: undefined as unknown as string[],
                },
            };
            expect(
                getComparisonValue(bodyWithoutComposition, "composition"),
            ).toBe("");
        });
    });

    describe("getAllBodiesFromAllSystems", () => {
        it("should return all bodies from all systems", () => {
            const bodies = getAllBodiesFromAllSystems();

            expect(bodies.length).toBe(4); // Sun, Earth, Mars, Moon
        });

        it("should include star in results", () => {
            const bodies = getAllBodiesFromAllSystems();
            const sun = bodies.find((b) => b.body.id === "sun");

            expect(sun).toBeDefined();
            expect(sun?.body.type).toBe("star");
            expect(sun?.systemName).toBe("Solar System");
        });

        it("should include planets in results", () => {
            const bodies = getAllBodiesFromAllSystems();
            const earth = bodies.find((b) => b.body.id === "earth");

            expect(earth).toBeDefined();
            expect(earth?.body.type).toBe("planet");
        });

        it("should include moons in results", () => {
            const bodies = getAllBodiesFromAllSystems();
            const moon = bodies.find((b) => b.body.id === "luna");

            expect(moon).toBeDefined();
            expect(moon?.body.type).toBe("moon");
        });

        it("should include system context", () => {
            const bodies = getAllBodiesFromAllSystems();

            bodies.forEach((b) => {
                expect(b.systemName).toBe("Solar System");
                expect(b.systemId).toBe("solar");
            });
        });
    });

    describe("searchBodies", () => {
        let allBodies: SelectableBody[];

        beforeEach(() => {
            allBodies = getAllBodiesFromAllSystems();
        });

        it("should return all bodies for empty query", () => {
            const result = searchBodies(allBodies, "");
            expect(result).toEqual(allBodies);
        });

        it("should return all bodies for whitespace query", () => {
            const result = searchBodies(allBodies, "   ");
            expect(result).toEqual(allBodies);
        });

        it("should find body by name", () => {
            const result = searchBodies(allBodies, "Earth");
            expect(result.length).toBe(1);
            expect(result[0].body.name).toBe("Earth");
        });

        it("should be case insensitive", () => {
            const result = searchBodies(allBodies, "earth");
            expect(result.length).toBe(1);
            expect(result[0].body.name).toBe("Earth");
        });

        it("should find partial matches", () => {
            // "ar" matches: Earth (e-ar-th), Mars (m-ar-s), and all bodies via "Sol-ar System"
            const result = searchBodies(allBodies, "ar");
            expect(result.length).toBe(4); // All bodies match via "Solar" in systemName
        });

        it("should find body by system name", () => {
            const result = searchBodies(allBodies, "Solar");
            expect(result.length).toBe(4); // All bodies in Solar System
        });

        it("should return empty array when no matches", () => {
            const result = searchBodies(allBodies, "Proxima");
            expect(result.length).toBe(0);
        });
    });

    describe("filterByType", () => {
        let allBodies: SelectableBody[];

        beforeEach(() => {
            allBodies = getAllBodiesFromAllSystems();
        });

        it("should return all bodies for 'all' type", () => {
            const result = filterByType(allBodies, "all");
            expect(result).toEqual(allBodies);
        });

        it("should filter stars only", () => {
            const result = filterByType(allBodies, "star");
            expect(result.length).toBe(1);
            expect(result[0].body.type).toBe("star");
        });

        it("should filter planets only", () => {
            const result = filterByType(allBodies, "planet");
            expect(result.length).toBe(2); // Earth, Mars
            result.forEach((b) => expect(b.body.type).toBe("planet"));
        });

        it("should filter moons only", () => {
            const result = filterByType(allBodies, "moon");
            expect(result.length).toBe(1);
            expect(result[0].body.type).toBe("moon");
        });
    });

    describe("COMPARISON_ATTRIBUTES", () => {
        it("should have at least 8 attributes", () => {
            expect(COMPARISON_ATTRIBUTES.length).toBeGreaterThanOrEqual(8);
        });

        it("should have type attribute", () => {
            const typeAttr = COMPARISON_ATTRIBUTES.find(
                (a) => a.key === "type",
            );
            expect(typeAttr).toBeDefined();
            expect(typeAttr?.labelKey).toBe("comparison.type");
        });

        it("should have diameter attribute", () => {
            const diameterAttr = COMPARISON_ATTRIBUTES.find(
                (a) => a.key === "diameter",
            );
            expect(diameterAttr).toBeDefined();
            expect(diameterAttr?.labelKey).toBe("modal.diameter");
        });

        it("should have sizeRatio attribute", () => {
            const sizeRatioAttr = COMPARISON_ATTRIBUTES.find(
                (a) => a.key === "sizeRatio",
            );
            expect(sizeRatioAttr).toBeDefined();
            expect(sizeRatioAttr?.labelKey).toBe("comparison.sizeRatio");
        });

        it("should have getValue function for each attribute", () => {
            COMPARISON_ATTRIBUTES.forEach((attr) => {
                expect(typeof attr.getValue).toBe("function");
            });
        });

        it("should return uppercase type from getValue", () => {
            const typeAttr = COMPARISON_ATTRIBUTES.find(
                (a) => a.key === "type",
            );
            const mockBody: CelestialBodyData = {
                id: "test",
                name: "Test",
                type: "planet",
                description: "Test",
                keyFacts: {
                    diameter: "1000 km",
                    orbitalPeriod: "1 day",
                    composition: ["Rock"],
                    temperature: "0°C",
                },
                images: [],
                position: new THREE.Vector3(0, 0, 0),
                scale: 1,
                material: { color: "#FFFFFF" },
            };

            expect(typeAttr?.getValue(mockBody)).toBe("PLANET");
        });

        it("should handle missing composition in getValue", () => {
            const compositionAttr = COMPARISON_ATTRIBUTES.find(
                (a) => a.key === "composition",
            );
            const mockBody: CelestialBodyData = {
                id: "test",
                name: "Test",
                type: "planet",
                description: "Test",
                keyFacts: {
                    diameter: "1000 km",
                    orbitalPeriod: "1 day",
                    composition: undefined as unknown as string[],
                    temperature: "0°C",
                },
                images: [],
                position: new THREE.Vector3(0, 0, 0),
                scale: 1,
                material: { color: "#FFFFFF" },
            };

            expect(compositionAttr?.getValue(mockBody)).toBe("");
        });
    });
});
