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

describe("loadCoordinates parsing robustness", () => {
    it("parses a name containing a comma correctly (parse-from-end)", () => {
        // Exercise the REAL loadCoordinates (with a synthetic CSV) rather than a
        // local re-implementation of its parse logic, so the test actually
        // guards the production code path.
        const coords = loadCoordinates("name,ra,dec\nFoo, Bar,219.90,-60.84\n");
        expect(coords["Foo, Bar"]).toEqual({ ra: 219.9, dec: -60.84 });
    });

    it("parses a slash-separated name without a comma", () => {
        const coords = loadCoordinates(
            "name,ra,dec\nAlpha Centauri / Proxima Centauri,219.90,-60.84\n",
        );
        expect(coords["Alpha Centauri / Proxima Centauri"]).toEqual({
            ra: 219.9,
            dec: -60.84,
        });
    });

    it("skips rows whose RA/Dec are not finite (warned, not stored)", () => {
        const coords = loadCoordinates(
            "name,ra,dec\nGarbage Row,not-a-number,-60.84\n",
        );
        expect(coords["Garbage Row"]).toBeUndefined();
    });

    it("ignores rows with fewer than 3 columns", () => {
        const coords = loadCoordinates("name,ra,dec\nStubby,12.3\n");
        expect(coords["Stubby"]).toBeUndefined();
    });
});
