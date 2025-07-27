// Unit tests for celestial bodies data and utility functions
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
    solarSystemData,
    getAllCelestialBodies,
    getCelestialBodiesByType,
    getCelestialBodyById,
    sortByDistanceFromSun,
    calculateOrbitPosition,
    formatDistance,
    formatTemperature,
    validateCelestialBodyData,
    validateSolarSystemData,
    validateCurrentSolarSystemData,
} from "../celestialBodies";
import type { CelestialBodyData } from "../../types/game";

describe("Celestial Bodies Data", () => {
    describe("Data Structure Validation", () => {
        it("should have valid solar system data structure", () => {
            expect(solarSystemData).toBeDefined();
            expect(solarSystemData.sun).toBeDefined();
            expect(solarSystemData.planets).toBeDefined();
            expect(Array.isArray(solarSystemData.planets)).toBe(true);
            expect(solarSystemData.systemScale).toBeDefined();
            expect(solarSystemData.systemCenter).toBeDefined();
        });

        it("should have correct number of planets", () => {
            expect(solarSystemData.planets).toHaveLength(8);
        });

        it("should have planets in correct order from the Sun", () => {
            const expectedOrder = [
                "mercury",
                "venus",
                "earth",
                "mars",
                "jupiter",
                "saturn",
                "uranus",
                "neptune",
            ];
            const sortedPlanets = sortByDistanceFromSun(
                solarSystemData.planets,
            );
            const planetIds = sortedPlanets.map((p) => p.id);
            expect(planetIds).toEqual(expectedOrder);
        });

        it("should have valid sun data", () => {
            const sun = solarSystemData.sun;
            expect(sun.id).toBe("sun");
            expect(sun.type).toBe("star");
            expect(sun.name).toBe("Sun");
            expect(sun.keyFacts).toBeDefined();
            expect(sun.position).toBeDefined();
            expect(sun.scale).toBeGreaterThan(0);
        });
    });

    describe("Utility Functions", () => {
        describe("getAllCelestialBodies", () => {
            it("should return all celestial bodies including sun and planets", () => {
                const allBodies = getAllCelestialBodies();
                expect(allBodies).toHaveLength(9); // 1 sun + 8 planets
                expect(allBodies[0]).toEqual(solarSystemData.sun);
            });
        });

        describe("getCelestialBodiesByType", () => {
            it('should return only stars when type is "star"', () => {
                const stars = getCelestialBodiesByType("star");
                expect(stars).toHaveLength(1);
                expect(stars[0].type).toBe("star");
                expect(stars[0].id).toBe("sun");
            });

            it('should return only planets when type is "planet"', () => {
                const planets = getCelestialBodiesByType("planet");
                expect(planets).toHaveLength(8);
                planets.forEach((planet) => {
                    expect(planet.type).toBe("planet");
                });
            });

            it('should return empty array for type "moon"', () => {
                const moons = getCelestialBodiesByType("moon");
                expect(moons).toHaveLength(0);
            });
        });

        describe("getCelestialBodyById", () => {
            it('should return sun when id is "sun"', () => {
                const sun = getCelestialBodyById("sun");
                expect(sun).toEqual(solarSystemData.sun);
            });

            it("should return correct planet by id", () => {
                const earth = getCelestialBodyById("earth");
                expect(earth?.id).toBe("earth");
                expect(earth?.name).toBe("Earth");
                expect(earth?.type).toBe("planet");
            });

            it("should return undefined for non-existent id", () => {
                const nonExistent = getCelestialBodyById("pluto");
                expect(nonExistent).toBeUndefined();
            });
        });

        describe("sortByDistanceFromSun", () => {
            it("should sort planets by orbit radius", () => {
                const planets = [...solarSystemData.planets];
                const sorted = sortByDistanceFromSun(planets);

                for (let i = 0; i < sorted.length - 1; i++) {
                    const currentRadius = sorted[i].orbitRadius || 0;
                    const nextRadius = sorted[i + 1].orbitRadius || 0;
                    expect(currentRadius).toBeLessThanOrEqual(nextRadius);
                }
            });

            it("should put star first when mixed with planets", () => {
                const mixed = [
                    solarSystemData.planets[0],
                    solarSystemData.sun,
                    solarSystemData.planets[1],
                ];
                const sorted = sortByDistanceFromSun(mixed);
                expect(sorted[0].type).toBe("star");
            });
        });

        describe("calculateOrbitPosition", () => {
            it("should calculate correct position for zero angle", () => {
                const position = calculateOrbitPosition(10, 0);
                expect(position.x).toBeCloseTo(10);
                expect(position.y).toBe(0);
                expect(position.z).toBeCloseTo(0);
            });

            it("should calculate correct position for 90 degrees", () => {
                const position = calculateOrbitPosition(10, Math.PI / 2);
                expect(position.x).toBeCloseTo(0);
                expect(position.y).toBe(0);
                expect(position.z).toBeCloseTo(10);
            });
        });

        describe("formatDistance", () => {
            it("should format kilometers correctly", () => {
                expect(formatDistance(1000)).toBe("1,000 km");
                expect(formatDistance(1500000)).toBe("1,500,000 km");
            });

            it("should format astronomical units for large distances", () => {
                expect(formatDistance(149597870.7)).toBe("1.00 AU");
                expect(formatDistance(778500000)).toContain("AU");
            });
        });

        describe("formatTemperature", () => {
            it("should format temperature with all units", () => {
                const formatted = formatTemperature(0);
                expect(formatted).toContain("°C");
                expect(formatted).toContain("°F");
                expect(formatted).toContain("K");
            });

            it("should handle high temperatures", () => {
                const formatted = formatTemperature(5778);
                expect(formatted).toContain("5,778°C");
                expect(formatted).toContain("K");
            });
        });
    });

    describe("Data Validation", () => {
        describe("validateCelestialBodyData", () => {
            const validCelestialBody: CelestialBodyData = {
                id: "test-planet",
                name: "Test Planet",
                type: "planet",
                description: "A test planet",
                keyFacts: {
                    diameter: "12,000 km",
                    distanceFromSun: "150 million km",
                    orbitalPeriod: "365 days",
                    composition: ["Rock", "Metal"],
                    temperature: "15°C",
                    moons: 1,
                },
                images: ["test.jpg"],
                position: new THREE.Vector3(1, 0, 0),
                scale: 1,
                material: {
                    color: "#BLUE",
                },
                orbitRadius: 10,
                orbitSpeed: 0.1,
            };

            it("should validate correct celestial body data", () => {
                expect(validateCelestialBodyData(validCelestialBody)).toBe(
                    true,
                );
            });

            it("should reject data with missing required fields", () => {
                const invalidData = { ...validCelestialBody };
                delete (invalidData as Partial<CelestialBodyData>).id;
                expect(validateCelestialBodyData(invalidData)).toBe(false);
            });

            it("should reject data with invalid type", () => {
                const invalidData = {
                    ...validCelestialBody,
                    type: "invalid" as string,
                };
                expect(validateCelestialBodyData(invalidData)).toBe(false);
            });

            it("should reject data with invalid position", () => {
                const invalidData = {
                    ...validCelestialBody,
                    position: "invalid" as string,
                };
                expect(validateCelestialBodyData(invalidData)).toBe(false);
            });
        });

        describe("validateSolarSystemData", () => {
            it("should validate correct solar system data", () => {
                expect(validateSolarSystemData(solarSystemData)).toBe(true);
            });

            it("should validate current solar system data", () => {
                expect(validateCurrentSolarSystemData()).toBe(true);
            });
        });
    });

    describe("Data Integrity", () => {
        it("should have valid images arrays for all bodies", () => {
            const allBodies = getAllCelestialBodies();
            allBodies.forEach((body) => {
                expect(Array.isArray(body.images)).toBe(true);
            });
        });

        it("should have valid material properties for all bodies", () => {
            const allBodies = getAllCelestialBodies();
            allBodies.forEach((body) => {
                expect(body.material).toBeDefined();
                expect(typeof body.material.color).toBe("string");
                expect(body.material.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
            });
        });

        it("should have positive scales for all bodies", () => {
            const allBodies = getAllCelestialBodies();
            allBodies.forEach((body) => {
                expect(body.scale).toBeGreaterThan(0);
            });
        });

        it("should have valid key facts for all bodies", () => {
            const allBodies = getAllCelestialBodies();
            allBodies.forEach((body) => {
                expect(body.keyFacts).toBeDefined();
                expect(typeof body.keyFacts.diameter).toBe("string");
                expect(typeof body.keyFacts.distanceFromSun).toBe("string");
                expect(typeof body.keyFacts.orbitalPeriod).toBe("string");
                expect(Array.isArray(body.keyFacts.composition)).toBe(true);
                expect(typeof body.keyFacts.temperature).toBe("string");
            });
        });

        it("should have consistent orbit data for planets", () => {
            const planets = getCelestialBodiesByType("planet");
            planets.forEach((planet) => {
                if (planet.orbitRadius !== undefined) {
                    expect(planet.orbitRadius).toBeGreaterThan(0);
                }
                if (planet.orbitSpeed !== undefined) {
                    expect(planet.orbitSpeed).toBeGreaterThan(0);
                }
            });
        });
    });
});

describe("Error Handling", () => {
    it("should handle invalid input gracefully in utility functions", () => {
        expect(() => formatDistance(NaN)).not.toThrow();
        expect(() => formatTemperature(NaN)).not.toThrow();
        expect(() => getCelestialBodyById("")).not.toThrow();
        expect(() =>
            getCelestialBodiesByType("invalid" as never),
        ).not.toThrow();
    });

    it("should validate malformed data objects", () => {
        expect(validateCelestialBodyData(null)).toBe(false);
        expect(validateCelestialBodyData(undefined)).toBe(false);
        expect(validateCelestialBodyData({})).toBe(false);
        expect(validateCelestialBodyData("string")).toBe(false);
        expect(validateCelestialBodyData(123)).toBe(false);
    });
});
