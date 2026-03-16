import { describe, it, expect } from "vitest";
import {
    constellations,
    getStarById,
    getConstellationById,
    getVisibleConstellations,
} from "../constellations";

describe("constellations data", () => {
    it("constellations array is non-empty", () => {
        expect(constellations.length).toBeGreaterThan(0);
    });

    it("each constellation has required fields", () => {
        constellations.forEach((c) => {
            expect(c.id).toBeTruthy();
            expect(c.name).toBeTruthy();
            expect(Array.isArray(c.stars)).toBe(true);
            expect(Array.isArray(c.lines)).toBe(true);
            expect(c.visibility).toBeDefined();
        });
    });
});

describe("getStarById", () => {
    it("returns a known star by id from the catalog", () => {
        // "dubhe" is the first star declared in the catalog
        const result = getStarById("dubhe");
        expect(result).toBeDefined();
        expect(result!.id).toBe("dubhe");
        expect(result!.name).toBeTruthy();
    });

    it("returns undefined for an unknown id", () => {
        expect(getStarById("definitely-not-a-real-star-id")).toBeUndefined();
    });
});

describe("getConstellationById", () => {
    it("returns a constellation for a known id", () => {
        const first = constellations[0];
        const result = getConstellationById(first.id);
        expect(result).toBeDefined();
        expect(result?.id).toBe(first.id);
    });

    it("returns undefined for an unknown id", () => {
        expect(
            getConstellationById("definitely-not-a-real-constellation"),
        ).toBeUndefined();
    });
});

describe("getVisibleConstellations", () => {
    it("returns an array for northern hemisphere in winter (Jan)", () => {
        const result = getVisibleConstellations(45, 1);
        expect(Array.isArray(result)).toBe(true);
    });

    it("returns an array for southern hemisphere (negative latitude)", () => {
        const result = getVisibleConstellations(-35, 6);
        expect(Array.isArray(result)).toBe(true);
    });

    it("filters out constellations not visible at extreme southern latitude", () => {
        // At -80 latitude many northern constellations should be filtered out
        const result = getVisibleConstellations(-80, 1);
        result.forEach((c) => {
            expect(c.visibility.maxLatitude).toBeGreaterThanOrEqual(-80);
        });
    });

    it("filters out constellations not visible at extreme northern latitude", () => {
        // At +80 latitude many southern constellations should be filtered out
        const result = getVisibleConstellations(80, 6);
        result.forEach((c) => {
            expect(c.visibility.minLatitude).toBeLessThanOrEqual(80);
        });
    });

    it("handles month boundary wraparound (December = month 12)", () => {
        const result = getVisibleConstellations(45, 12);
        expect(Array.isArray(result)).toBe(true);
    });

    it("northern hemisphere filter excludes northern-only constellations at -35 latitude", () => {
        // The filter returns false when hemisphere==="northern" && latitude < -30
        const result = getVisibleConstellations(-35, 1);
        expect(
            result.every((c) => c.visibility.hemisphere !== "northern"),
        ).toBe(true);
    });

    it("southern hemisphere filter excludes southern-only constellations at +35 latitude", () => {
        // The filter returns false when hemisphere==="southern" && latitude > 30
        const result = getVisibleConstellations(35, 6);
        expect(
            result.every((c) => c.visibility.hemisphere !== "southern"),
        ).toBe(true);
    });
});
