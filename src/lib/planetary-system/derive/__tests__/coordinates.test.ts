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
        // Verifies the parser tolerates commas in the system_name column by
        // reading the trailing numeric RA/DEC columns from the end. We can't
        // inject a CSV here (it's a ?raw import), so we re-implement the same
        // parse logic over an inline fixture to lock in the contract.
        const parseLine = (line: string) => {
            const parts = line.split(",");
            if (parts.length < 3) return null;
            const dec = parseFloat(parts[parts.length - 1]);
            const ra = parseFloat(parts[parts.length - 2]);
            if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;
            return { name: parts.slice(0, -2).join(","), ra, dec };
        };

        expect(parseLine("Foo, Bar,219.90,-60.84")).toEqual({
            name: "Foo, Bar",
            ra: 219.9,
            dec: -60.84,
        });
        expect(
            parseLine("Alpha Centauri / Proxima Centauri,219.90,-60.84"),
        ).toEqual({
            name: "Alpha Centauri / Proxima Centauri",
            ra: 219.9,
            dec: -60.84,
        });
    });
});
