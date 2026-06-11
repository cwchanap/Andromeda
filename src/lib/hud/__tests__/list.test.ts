import { describe, it, expect } from "vitest";
import { matchesQuery, paginate, pageLabel } from "../list";

describe("matchesQuery", () => {
    it("matches case-insensitively across multiple fields", () => {
        expect(matchesQuery("alpha", ["Alpha Centauri", "binary"])).toBe(true);
        expect(matchesQuery("BINARY", ["Alpha Centauri", "binary"])).toBe(true);
    });

    it("ignores empty/whitespace queries (matches everything)", () => {
        expect(matchesQuery("", ["anything"])).toBe(true);
        expect(matchesQuery("   ", ["anything"])).toBe(true);
    });

    it("returns false when no field contains the query", () => {
        expect(matchesQuery("zzz", ["Alpha Centauri", "binary"])).toBe(false);
    });

    it("skips null/undefined fields", () => {
        expect(matchesQuery("alpha", [undefined, null, "Alpha"])).toBe(true);
    });
});

describe("paginate", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];

    it("returns the requested page slice", () => {
        expect(paginate(items, 1, 3).items).toEqual([1, 2, 3]);
        expect(paginate(items, 2, 3).items).toEqual([4, 5, 6]);
        expect(paginate(items, 3, 3).items).toEqual([7]);
    });

    it("computes total pages (ceil)", () => {
        expect(paginate(items, 1, 3).totalPages).toBe(3);
        expect(paginate([], 1, 3).totalPages).toBe(1);
    });

    it("clamps page above range to the last page", () => {
        const r = paginate(items, 99, 3);
        expect(r.page).toBe(3);
        expect(r.items).toEqual([7]);
    });

    it("clamps page below 1 to the first page", () => {
        const r = paginate(items, 0, 3);
        expect(r.page).toBe(1);
        expect(r.items).toEqual([1, 2, 3]);
    });
});

describe("pageLabel", () => {
    it("zero-pads to two digits in NN / NN form", () => {
        expect(pageLabel(2, 4)).toBe("02 / 04");
        expect(pageLabel(10, 12)).toBe("10 / 12");
    });

    it("pads to match widest number for 100+ pages", () => {
        expect(pageLabel(1, 100)).toBe("001 / 100");
        expect(pageLabel(42, 100)).toBe("042 / 100");
        expect(pageLabel(100, 100)).toBe("100 / 100");
    });
});
