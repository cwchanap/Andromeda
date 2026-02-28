import { describe, it, expect, vi } from "vitest";
import {
    celestialToSphere,
    celestialToScreen,
    magnitudeToOpacity,
    magnitudeToSize,
    formatCoordinates,
    isConstellationVisible,
    getCurrentLocation,
} from "../astronomy";
import type { LocationData } from "../../types/constellation";

const LONDON: LocationData = {
    latitude: 51.5,
    longitude: -0.12,
    timezone: "Europe/London",
    accuracy: 10,
};

const FIXED_DATE = new Date("2024-03-20T12:00:00Z");

describe("astronomy", () => {
    describe("celestialToSphere", () => {
        it("returns an object with x, y, z and visible=true", () => {
            const result = celestialToSphere(6, 45, LONDON, FIXED_DATE, 100);
            expect(result).toHaveProperty("x");
            expect(result).toHaveProperty("y");
            expect(result).toHaveProperty("z");
            expect(result.visible).toBe(true);
        });

        it("uses default radius of 100 when omitted", () => {
            const withDefault = celestialToSphere(6, 45, LONDON, FIXED_DATE);
            const withExplicit = celestialToSphere(
                6,
                45,
                LONDON,
                FIXED_DATE,
                100,
            );
            expect(withDefault).toEqual(withExplicit);
        });

        it("scales coordinates proportionally to radius", () => {
            const r50 = celestialToSphere(6, 45, LONDON, FIXED_DATE, 50);
            const r100 = celestialToSphere(6, 45, LONDON, FIXED_DATE, 100);
            expect(r100.x).toBeCloseTo(r50.x * 2, 5);
            expect(r100.y).toBeCloseTo(r50.y * 2, 5);
            expect(r100.z).toBeCloseTo(r50.z * 2, 5);
        });

        it("produces different positions for different RA values", () => {
            const ra0 = celestialToSphere(0, 0, LONDON, FIXED_DATE, 100);
            const ra12 = celestialToSphere(12, 0, LONDON, FIXED_DATE, 100);
            expect(ra0.x).not.toBeCloseTo(ra12.x, 3);
        });

        it("produces different positions for different declinations", () => {
            const dec0 = celestialToSphere(6, 0, LONDON, FIXED_DATE, 100);
            const dec45 = celestialToSphere(6, 45, LONDON, FIXED_DATE, 100);
            expect(dec0.y).not.toBeCloseTo(dec45.y, 3);
        });

        it("zenith star (dec=90) has maximum y component", () => {
            // At dec=90 the star is near the celestial north pole; altitude ≈ latitude
            const result = celestialToSphere(0, 90, LONDON, FIXED_DATE, 100);
            // The altitude should be close to the latitude (51.5°)
            const altRad = Math.asin(result.y / 100);
            const altDeg = (altRad * 180) / Math.PI;
            expect(altDeg).toBeGreaterThan(40); // roughly latitude
        });
    });

    describe("celestialToScreen", () => {
        it("returns x, y and visible=true", () => {
            const result = celestialToScreen(
                6,
                45,
                LONDON,
                FIXED_DATE,
                1920,
                1080,
            );
            expect(result).toHaveProperty("x");
            expect(result).toHaveProperty("y");
            expect(result.visible).toBe(true);
        });

        it("x is finite for a valid star position", () => {
            const result = celestialToScreen(
                6,
                45,
                LONDON,
                FIXED_DATE,
                1920,
                1080,
            );
            expect(isFinite(result.x)).toBe(true);
        });
    });

    describe("magnitudeToOpacity", () => {
        it("returns a value between 0 and 1", () => {
            [-1.5, 0, 3, 6].forEach((mag) => {
                const opacity = magnitudeToOpacity(mag);
                expect(opacity).toBeGreaterThanOrEqual(0);
                expect(opacity).toBeLessThanOrEqual(1);
            });
        });

        it("brighter stars (lower magnitude) have higher opacity", () => {
            const bright = magnitudeToOpacity(-1.5);
            const dim = magnitudeToOpacity(6);
            expect(bright).toBeGreaterThan(dim);
        });

        it("clamps magnitudes below -1.5 to the same as -1.5", () => {
            expect(magnitudeToOpacity(-10)).toBeCloseTo(
                magnitudeToOpacity(-1.5),
                5,
            );
        });

        it("clamps magnitudes above 6 to the same as 6", () => {
            expect(magnitudeToOpacity(100)).toBeCloseTo(
                magnitudeToOpacity(6),
                5,
            );
        });
    });

    describe("magnitudeToSize", () => {
        it("returns a value >= 1", () => {
            [-1.5, 0, 3, 6].forEach((mag) => {
                expect(magnitudeToSize(mag)).toBeGreaterThanOrEqual(1);
            });
        });

        it("brighter stars are larger", () => {
            expect(magnitudeToSize(-1.5)).toBeGreaterThan(magnitudeToSize(6));
        });

        it("returns at most 10 pixels", () => {
            expect(magnitudeToSize(-1.5)).toBeLessThanOrEqual(10);
        });
    });

    describe("formatCoordinates", () => {
        it("formats RA and Dec correctly", () => {
            const result = formatCoordinates(6, 45);
            expect(result).toMatch(
                /^RA \d+h \d+m \d+s, Dec [+-]\d+° \d+' \d+"$/,
            );
        });

        it("includes positive sign for positive declination", () => {
            expect(formatCoordinates(0, 45)).toContain("+");
        });

        it("includes negative sign for negative declination", () => {
            expect(formatCoordinates(0, -30)).toContain("-");
        });

        it("formats zero coordinates", () => {
            const result = formatCoordinates(0, 0);
            expect(result).toBe("RA 0h 0m 0s, Dec +0° 0' 0\"");
        });

        it("formats known coordinates for Orion belt (Alnitak approx)", () => {
            // Alnitak: RA ~5h 40m 46s, Dec ~-1° 56'
            const result = formatCoordinates(5.679, -1.943);
            expect(result).toContain("5h");
            expect(result).toContain("-");
        });
    });

    describe("isConstellationVisible", () => {
        it("returns true when constellation has stars (all stars are visible)", () => {
            const constellation = {
                stars: [
                    { rightAscension: 5.6, declination: -1.9 },
                    { rightAscension: 6.0, declination: 20.0 },
                ],
            };
            const result = isConstellationVisible(
                constellation,
                LONDON,
                FIXED_DATE,
            );
            expect(result).toBe(true);
        });

        it("returns false for a constellation with no stars", () => {
            const constellation = { stars: [] };
            const result = isConstellationVisible(
                constellation,
                LONDON,
                FIXED_DATE,
            );
            expect(result).toBe(false);
        });
    });

    describe("getCurrentLocation", () => {
        it("resolves with LocationData when geolocation succeeds", async () => {
            const mockPosition = {
                coords: {
                    latitude: 51.5,
                    longitude: -0.12,
                    accuracy: 10,
                },
            };
            const mockGeolocation = {
                getCurrentPosition: vi.fn((success) => success(mockPosition)),
            };
            vi.stubGlobal("navigator", {
                ...navigator,
                geolocation: mockGeolocation,
            });

            const result = await getCurrentLocation();
            expect(result.latitude).toBe(51.5);
            expect(result.longitude).toBe(-0.12);
            expect(result.accuracy).toBe(10);
            expect(typeof result.timezone).toBe("string");
        });

        it("rejects when geolocation is not supported", async () => {
            vi.stubGlobal("navigator", { geolocation: undefined });
            await expect(getCurrentLocation()).rejects.toThrow(
                "Geolocation is not supported",
            );
        });

        it("rejects when geolocation returns an error", async () => {
            const mockGeolocation = {
                getCurrentPosition: vi.fn((_success, error) =>
                    error({ message: "User denied" }),
                ),
            };
            vi.stubGlobal("navigator", {
                ...navigator,
                geolocation: mockGeolocation,
            });
            await expect(getCurrentLocation()).rejects.toThrow(
                "Geolocation error: User denied",
            );
        });
    });
});
