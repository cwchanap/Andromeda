import { describe, it, expect } from "vitest";
import {
    loadCoordinates,
    SYSTEM_NAMES,
} from "@/lib/planetary-system/derive/systemNames";

describe("system_coordinates.csv", () => {
    it("has exactly 30 system names", () => {
        expect(SYSTEM_NAMES).toHaveLength(30);
    });
    it("has RA/Dec for all 30 systems", () => {
        const coords = loadCoordinates();
        for (const name of SYSTEM_NAMES) {
            expect(coords[name], `missing coords for ${name}`).toBeDefined();
            const { ra, dec } = coords[name];
            expect(ra).toBeGreaterThanOrEqual(0);
            expect(ra).toBeLessThanOrEqual(360);
            expect(dec).toBeGreaterThanOrEqual(-90);
            expect(dec).toBeLessThanOrEqual(90);
        }
    });
});
