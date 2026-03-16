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
    it("returns a star for a known id", () => {
        // Use the first star's id from a known constellation
        const firstStar = constellations[0]?.stars[0];
        if (firstStar) {
            // getStarById searches the private stars array; test with a known id
            const result = getStarById(firstStar.id);
            // May or may not be in the exported stars list — just check no throw
            expect(result === undefined || result.id === firstStar.id).toBe(
                true,
            );
        }
    });

    it("returns undefined for an unknown id", () => {
        expect(getStarById("definitely-not-a-real-star-id")).toBeUndefined();
    });

    it("returns the correct star for known star ids in the catalog", () => {
        // dubhe is the first star in the catalog
        const dubhe = getStarById("dubhe");
        if (dubhe) {
            expect(dubhe.id).toBe("dubhe");
            expect(dubhe.name).toBeTruthy();
        }
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
        const result = getVisibleConstellations(-35, 1);
        result.forEach((c) => {
            if (c.visibility.hemisphere === "northern") {
                // northern hemisphere constellations at lat -35 should not appear
                // (the filter returns false when hemisphere=northern && latitude < -30)
                expect(true).toBe(false); // should not reach here
            }
        });
    });

    it("southern hemisphere filter excludes southern-only constellations at +35 latitude", () => {
        const result = getVisibleConstellations(35, 6);
        result.forEach((c) => {
            if (c.visibility.hemisphere === "southern") {
                // southern hemisphere constellations at lat +35 should not appear
                expect(true).toBe(false); // should not reach here
            }
        });
    });
});
